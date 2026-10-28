import * as THREE from "three";
import gsap from "gsap";
import { setRainLevel } from "@/composables/useSfx";
import { createToonBatch } from "../toonBatch";
import { benchmark, VIEW_W, VIEW_H } from "../sceneConfig";

export function createAnimation(runtime) {
  // ---------- sizing & loop ----------
  let viewH = VIEW_H;
  // Render at the screen's real pixel density, including browser zoom (which changes
  // devicePixelRatio) and pinch zoom (visualViewport.scale), so edges stay sharp when zoomed in.
  // Capped, so a deep pinch doesn't ask for an enormous canvas.
  const pixelRatio = () => Math.min(window.devicePixelRatio * (window.visualViewport?.scale || 1), 3);
  function resize() {
    const w = runtime.options.container.clientWidth || 1;
    const h = runtime.options.container.clientHeight || 1;
    const density = pixelRatio();
    runtime.core.renderer.setPixelRatio(density);
    const aspect = w / h;
    // Portrait screens see the room as a diorama (see DIORAMA)
    if ((aspect < 1) !== runtime.room.diorama) runtime.room.setDiorama(aspect < 1);
    else if (runtime.room.diorama) runtime.room.drawBackdrop();
    // Keep desk props large enough to tap while the room fills the rest of the screen.
    viewH = Math.max(VIEW_H, (aspect < 1 ? 18 : VIEW_W) / aspect);
    runtime.core.camera.left = (-viewH * aspect) / 2;
    runtime.core.camera.right = (viewH * aspect) / 2;
    runtime.core.camera.top = viewH / 2;
    runtime.core.camera.bottom = -viewH / 2;
    runtime.core.camera.updateProjectionMatrix();
    runtime.core.renderer.setSize(w, h, false);
    sizeComposer();
    runtime.core.outlineResolution.value.set(w, h);
    if (!intro?.isActive()) runtime.camera.applyShot(true);
    runtime.camera.clampUserView();
  }

  // Match the canvas at every zoom/density. Slow frames must never lower image sharpness.
  const refreshMs = 1000 / 60;
  let frameMs = 16;
  const postDensity = () => runtime.core.renderer.getPixelRatio();
  function sizeComposer() {
    // At 2× and up the pixels are small enough to hide stair-steps, and multisampling a Retina
    // frame costs more memory traffic than an integrated GPU can spare
    const samples = postDensity() >= 2 ? 0 : 4;
    [runtime.core.composer.renderTarget1, runtime.core.composer.renderTarget2].forEach((target) => {
      if (target.samples === samples) return;
      target.samples = samples;
      target.dispose();
    });
    runtime.core.composer.setPixelRatio(postDensity());
    runtime.core.composer.setSize(runtime.options.container.clientWidth || 1, runtime.options.container.clientHeight || 1);
  }
  // `?perf` in the address shows the frame rate and what the quality has settled on
  const perfReadout = new URLSearchParams(window.location.search).has("perf") ? document.createElement("div") : null;
  if (perfReadout) {
    perfReadout.style.cssText = "position:absolute;right:8px;bottom:8px;z-index:50;padding:4px 8px;font:12px/1.4 ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.7);border-radius:4px;pointer-events:none;white-space:pre";
    runtime.options.container.appendChild(perfReadout);
    runtime.core.timers.push(setInterval(() => {
      const neonShadows = runtime.room.shadowedNeons.some((light) => light.castShadow);
      const intervals = [...frameIntervals].sort((a, b) => a - b);
      const p95 = intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * 0.95))] || 0;
      perfReadout.textContent = `${(1000 / frameMs).toFixed(0)} fps (budget ${(1000 / refreshMs).toFixed(0)}) · resolution locked\npost ${postDensity().toFixed(2)}× · GTAO ${runtime.core.aoPass.enabled ? "on" : "off"} · neon shadows ${neonShadows ? "on" : "off"}\n${runtime.core.drawCalls.toFixed(0)} draws · ${(runtime.core.triangles / 1000).toFixed(0)}k triangles\nCPU submit ${runtime.core.renderMs.toFixed(1)}ms · GPU ${runtime.core.gpuMs === null ? "n/a" : runtime.core.gpuMs.toFixed(1) + "ms"} · frame p95 ${p95.toFixed(1)}ms${benchmark ? " · " + benchmark : ""}`;
    }, 500));
  }

  // The sun's map only has to cover what can throw a shadow: seen along the light, nothing
  // outside the casters' footprint can be shadowed by them. Fitting the map to that footprint
  // (rather than a fixed 40-unit square) packs far more texels onto the props for the same cost.
  runtime.core.scene.updateMatrixWorld(true);
  const casterBox = new THREE.Box3();
  runtime.core.scene.traverse((o) => {
    // (the window's own occluders cast for the window's light alone)
    if (!o.isMesh || !o.castShadow || o.userData.windowShadow) return;
    // pooled bits (crumble dust) wait far below the floor until they're used
    if (casterBox.setFromObject(o).max.y > runtime.room.FLOOR_Y - 5) runtime.core.sunCasters.union(casterBox);
  });
  // room for props that get dragged, knocked or jumped on a little beyond where they start
  runtime.core.sunCasters.expandByScalar(0.5);
  runtime.core.fitSunShadow();

  // Shadow samplers share the fragment-stage limit with printed textures, toon ramps and
  // bump maps. Reserve those slots before enabling shadows, including close-up-only lights.
  const materialMapKeys = ["map", "emissiveMap", "gradientMap", "bumpMap", "normalMap", "alphaMap", "aoMap", "lightMap", "roughnessMap", "metalnessMap", "envMap"];
  let materialTextureSlots = 0;
  runtime.core.scene.traverse((object) => {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (!material?.isMeshToonMaterial && !material?.isMeshStandardMaterial) return;
      materialTextureSlots = Math.max(materialTextureSlots, materialMapKeys.filter((key) => material[key]?.isTexture).length);
    });
  });
  const shadowLights = [...new Set([runtime.swordEffects.swordSpotlight, runtime.windowLighting.windowLight, runtime.core.sun, runtime.lamp.lampLight, runtime.workstation.lightbarLight, runtime.shelf.signLight, runtime.workstation.screenLight, ...runtime.room.shadowedNeons])];
  const lightTextureSlots = shadowLights.filter((light) => light.map).length;
  const shadowTextureLimit = Math.max(0, runtime.core.renderer.capabilities.maxTextures - materialTextureSlots - lightTextureSlots);
  const decorativeShadows = new Set(runtime.room.shadowedNeons);
  function updateShadowBudget() {
    let available = shadowTextureLimit;
    shadowLights.forEach((light) => {
      const active = light.intensity > 0.001 && (!decorativeShadows.has(light) || runtime.theme.darkNow || runtime.theme.lightingBlending);
      const enabled = active && available > 0;
      if (enabled) available--;
      if (enabled && !light.castShadow) light.shadow.needsUpdate = true;
      light.castShadow = enabled;
    });
  }

  let frame = null;
  let lastBlink = 0;
  const WORLD_UP = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const target = new THREE.Vector3();
  const viewRight = new THREE.Vector3();
  const viewUp = new THREE.Vector3();
  let lastTick = 0;
  let mainShadowAt = 0;
  let aoFreshAt = 0;
  const aoCamPos = new THREE.Vector3();
  const aoCamTurn = new THREE.Quaternion();
  let aoCamZoom = 0;
  const frameIntervals = [];
  const updateToonBatch = benchmark === "no-batch" ? () => {} : createToonBatch(runtime.core.scene, runtime.core.renderer, runtime.core.track);
  [runtime.core.sun, runtime.windowLighting.windowLight, runtime.lamp.lampLight, runtime.workstation.lightbarLight].forEach((light) => {
    light.shadow.autoUpdate = false;
    light.shadow.needsUpdate = true;
  });
  function tick(now) {
    frame = requestAnimationFrame(tick);
    if (document.hidden) {
      lastTick = 0;
      frameIntervals.length = 0;
      return;
    }
    const moving = runtime.theme.lightingBlending || now < runtime.core.responsiveUntil || gsap.isTweening(runtime.camera.cam) || runtime.cat.catIdleTl?.isActive() || runtime.cat.catBusy || gsap.isTweening(runtime.windowBlind.blind) || runtime.mouse.mouseRunning || runtime.lamp.lampHopping || runtime.shelfCollectibles.trophyCelebrating || runtime.pointer.lanyardDrag || runtime.pointer.hatDrag || runtime.aboutBoard.noteDrag || runtime.pointer.shelfDrag || runtime.pointer.stickyDrag || runtime.pointer.chairDrag || gsap.isTweening(runtime.workstation.screenPower);
    // Do not skip presentation frames during interaction. Idle uses a tolerant interval rather
    // than an accumulated deadline, which otherwise creates short/long frame pairs under jitter.
    if (!moving && lastTick && now - lastTick < refreshMs * 0.7) return;
    if (lastTick && perfReadout) {
      frameIntervals.push(now - lastTick);
      if (frameIntervals.length > 180) frameIntervals.shift();
    }
    // Step size for the springs, capped so a background tab doesn't fling them on return
    const dt = Math.min(0.05, lastTick ? (now - lastTick) / 1000 : 0.016);
    if (lastTick) frameMs += (now - lastTick - frameMs) * 0.05;
    lastTick = now;
    runtime.tickets.updateTicketHover(dt);
    runtime.swordRack.updateTassels(dt);
    runtime.swordEffects.updateFx(dt);
    runtime.swordEffects.updateTrail(dt);
    runtime.swordEffects.updateSpotlight(dt);
    // the chair stands between the camera and the tickets' close-up, so it's put away for it
    runtime.chair.chair.visible = runtime.camera.focus.name !== "experience";
    runtime.projectFiles.poseFolders();
    const pointerBlend = 1 - Math.pow(0.94, dt * 60);
    runtime.pointer.parallax.x += (runtime.pointer.parallax.tx - runtime.pointer.parallax.x) * pointerBlend;
    runtime.pointer.parallax.y += (runtime.pointer.parallax.ty - runtime.pointer.parallax.y) * pointerBlend;
    if (runtime.camera.focus.name === "shelf" && !runtime.pointer.shelfDrag && !gsap.isTweening(runtime.camera.cam)) {
      const shot = runtime.camera.SHOTS.shelf();
      const blend = 1 - Math.exp(-14 * dt);
      runtime.camera.cam.ty += (shot.target[1] - runtime.camera.cam.ty) * blend;
    }
    // Parallax shrinks as we zoom in so close-ups stay readable
    const sway = runtime.camera.focus.name === "about" ? 0 : 1 / Math.sqrt(runtime.camera.cam.zoom);
    dir.set(runtime.camera.cam.dx + runtime.pointer.parallax.x * 0.08 * sway, runtime.camera.cam.dy - runtime.pointer.parallax.y * 0.05 * sway, runtime.camera.cam.dz).normalize();
    target.set(runtime.camera.cam.tx, runtime.camera.cam.ty, runtime.camera.cam.tz);
    if (runtime.camera.userView.x || runtime.camera.userView.y) {
      // The pinch's pan, across the view: right is forward × up, and up is right × forward
      viewRight.crossVectors(WORLD_UP, dir).normalize();
      viewUp.crossVectors(dir, viewRight);
      target.addScaledVector(viewRight, runtime.camera.userView.x).addScaledVector(viewUp, runtime.camera.userView.y);
    }
    runtime.core.camera.position.copy(target).addScaledVector(dir, runtime.camera.CAM_DISTANCE);
    runtime.core.camera.up.copy(WORLD_UP);
    runtime.core.camera.lookAt(target);
    if (runtime.core.camera.zoom !== runtime.camera.cam.zoom * runtime.camera.userView.zoom || runtime.core.camera.near !== runtime.camera.cam.near) {
      runtime.core.camera.zoom = runtime.camera.cam.zoom * runtime.camera.userView.zoom;
      runtime.core.camera.near = runtime.camera.cam.near;
      runtime.core.camera.updateProjectionMatrix();
    }
    if (runtime.room.diorama) {
      // The backdrop fills the view from just inside the far plane; the shadow sits a few
      // pixels down and to the right of the block it's cast by
      const halfW = (runtime.core.camera.right - runtime.core.camera.left) / 2 / runtime.core.camera.zoom;
      const halfH = (runtime.core.camera.top - runtime.core.camera.bottom) / 2 / runtime.core.camera.zoom;
      runtime.room.backdrop.position.copy(runtime.core.camera.position).addScaledVector(dir, -(runtime.core.camera.far - 2));
      runtime.room.backdrop.quaternion.copy(runtime.core.camera.quaternion);
      runtime.room.backdrop.scale.set(halfW * 2.02, halfH * 2.02, 1);
      // (the outline is taken square to the view, so the camera's sway leaves it as it is)
      viewRight.crossVectors(WORLD_UP, dir).normalize();
      viewUp.crossVectors(dir, viewRight);
      if (runtime.room.dioramaShadowFor !== runtime.camera.dioramaYaw) {
        runtime.room.dioramaShadowFor = runtime.camera.dioramaYaw;
        runtime.room.shapeDioramaShadow(viewRight, viewUp);
      }
      const nudge = (halfH * 2 / (runtime.options.container.clientHeight || 1)) * 10;
      runtime.room.dioramaShadow.quaternion.copy(runtime.core.camera.quaternion);
      runtime.room.dioramaShadow.position.copy(viewRight).multiplyScalar(nudge).addScaledVector(viewUp, -nudge)
        .addScaledVector(dir, (runtime.core.camera.position.dot(dir) - runtime.core.camera.far + 3));
    }
    // the occlusion is redone when the view has shifted at all, or anything's moving, and a
    // few times a second otherwise (see aoPass.render)
    if (moving || now >= aoFreshAt || runtime.core.camera.zoom !== aoCamZoom || runtime.core.camera.position.distanceToSquared(aoCamPos) > 1e-10 || 1 - Math.abs(runtime.core.camera.quaternion.dot(aoCamTurn)) > 1e-10) {
      runtime.core.aoDue = true;
      aoFreshAt = now + 1000 / 15;
      aoCamPos.copy(runtime.core.camera.position);
      aoCamTurn.copy(runtime.core.camera.quaternion);
      aoCamZoom = runtime.core.camera.zoom;
    }
    runtime.badge.updateLanyard(dt);
    runtime.shelf.updateShelfLeds(now);
    runtime.cat.updateCatWatch(now);
    runtime.cat.updateCatLife(now);
    runtime.cat.updateCatNeck();
    runtime.wallDecor.updateSecondHand();
    runtime.theme.updateDaylight(now);
    runtime.room.outside.t += dt;
    runtime.room.outside.rain += (runtime.room.outside.rainTarget - runtime.room.outside.rain) * Math.min(1, dt * 0.35);
    runtime.theme.updateLighting(now);
    if (Math.abs(runtime.room.outside.rain - (runtime.room.outside.heard ?? -1)) > 0.02) {
      runtime.room.outside.heard = runtime.room.outside.rain;
      setRainLevel(runtime.workstation.soundMuted ? 0 : runtime.room.outside.rain);
    }
    if (now - runtime.room.outside.drawnAt >= 1000 / 30) {
      runtime.room.outside.drawnAt = now;
      runtime.room.windowView.userData.tex.redraw();
    }
    runtime.plant.plant.rotation.z = Math.sin(now / 1400) * 0.015;
    runtime.coffee.updateSteam(now);
    runtime.lamp.updateLampGlow();
    runtime.robot.updateRobot(now);
    if (runtime.handheld.switchGame.live && now - runtime.handheld.switchDrawnAt > 40) {
      runtime.handheld.switchDrawnAt = now;
      runtime.handheld.switchGame.live = now / 1000 - runtime.handheld.switchGame.start <= runtime.handheld.SWITCH_GAME;
      runtime.handheld.switchScreen.userData.tex.redraw(runtime.handheld.switchGame.live ? now / 1000 : undefined);
    }
    if (now - runtime.shelfCollectibles.handheldDrawnAt > 90) {
      runtime.shelfCollectibles.handheldDrawnAt = now;
      runtime.shelfCollectibles.handheldScreen.userData.tex.redraw(now / 1000);
    }
    runtime.plant.updateButterfly(dt, now);
    runtime.wastebasket.updatePapers(dt);
    if (!runtime.mouse.mouseRunning) {
      const blend = 1 - Math.pow(0.82, dt * 60);
      runtime.mouse.mouse.position.x += (runtime.mouse.mouseAim.x - runtime.mouse.mouse.position.x) * blend;
      runtime.mouse.mouse.position.z += (runtime.mouse.mouseAim.z - runtime.mouse.mouse.position.z) * blend;
    }
    for (const { object, plane, baseY, strength } of runtime.coffee.contactShadows) {
      const lift = Math.max(0, object.position.y - baseY);
      plane.position.x = object.position.x;
      plane.position.z = object.position.z;
      plane.rotation.z = -object.rotation.y;
      plane.scale.setScalar(1 + lift * 0.3);
      // Ambient occlusion now darkens the contact itself; this only softens it under a prop
      // and carries the shadow while the prop is lifted
      plane.material.opacity = THREE.MathUtils.lerp(0.16, 0.115, runtime.core.roomLight.night) * (1 - 0.2 * runtime.room.outside.rain) * strength / (1 + lift * 3);
      plane.visible = object.visible;
    }
    if (now - lastBlink > 530) {
      lastBlink = now;
      runtime.workstation.cursorOn = !runtime.workstation.cursorOn;
      runtime.textInput.caretOn = !runtime.textInput.caretOn;
      if (!runtime.workstation.termBusy) runtime.workstation.redrawTerminal();
      runtime.textInput.typing?.redraw();
    }
    if (runtime.gauntlet.shelfBubble.sprite.scale.x > 0.01) {
      if (runtime.gauntlet.shelfBubbleTarget === runtime.shelfCollectibles.trophy) runtime.gauntlet.placeTrophyBubble();
      else if (runtime.gauntlet.shelfBubbleTarget === runtime.shelfConsole.pad1 || runtime.gauntlet.shelfBubbleTarget === runtime.shelfConsole.pad2) runtime.gauntlet.placeControllerBubble();
    }
    if (runtime.shelfCollectibles.trophyCelebrating) runtime.shelfCollectibles.trophy.localToWorld(runtime.shelfCollectibles.trophyHalo.position.set(0, 0.9, -0.2));
    if (runtime.cat.catBubble.sprite.scale.x > 0.01) runtime.cat.placeCatBubble(1 - Math.exp(-10 * dt));
    // The desktop animates (windows, dock, the player's visualizer) at about 30 fps
    if ((runtime.workstation.desktop.busy() || runtime.workstation.lofi.playing) && now - runtime.workstation.screenDrawnAt > 33) runtime.workstation.redrawScreen();
    // The typing dots bounce while a reply hasn't started arriving
    const lastMessage = runtime.chat.chat.messages[runtime.chat.chat.messages.length - 1];
    if (lastMessage?.pending && !lastMessage.text && now - runtime.chat.chatTypingAt > 50) {
      runtime.chat.chatTypingAt = now;
      runtime.chat.chatDirty = true;
    }
    if (runtime.chat.chatDirty) {
      runtime.chat.chatDirty = false;
      runtime.chat.redrawChat();
    }
    // Moving props need primary shadows in the same frame; a still room only has slow idle
    // motion (the lanyard's breeze, the clock's hand) to keep up with
    if (moving || now >= mainShadowAt) {
      mainShadowAt = now + 1000 / 12 - 0.5;
      [runtime.core.sun, runtime.windowLighting.windowLight, runtime.lamp.lampLight, runtime.workstation.lightbarLight].forEach((light) => {
        if (light.castShadow && light.intensity > 0) light.shadow.needsUpdate = true;
      });
    }
    runtime.room.updateNeonLights(now, moving);
    runtime.windowLighting.updateShaft(now);
    runtime.core.updatePaperFlex();
    runtime.strawHat.constrainHat();
    updateToonBatch();
    updateShadowBudget();
    runtime.core.renderFrame();
    if (firstFrame) {
      firstFrame = false;
      runtime.options.onEvent("ready");
      // Wait for the boot overlay to fade out before starting the computer's boot sound and progress bar
      runtime.core.timers.push(setTimeout(() => runtime.workstation.bootComputer({ playSound: true, delay: 0.2 }), 650));
    }
  }

  // Intro: the room fades in on the overview and settles back from slightly closer
  let intro = null;
  const ro = new ResizeObserver(resize);
  // Zooming changes the pixel density without always resizing the container
  // Moving the window to a screen of another density doesn't always fire a resize
  let densityQuery = null;
  const watchDensity = () => {
    densityQuery?.removeEventListener("change", onDensityChange);
    densityQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    densityQuery.addEventListener("change", onDensityChange);
  };
  function onDensityChange() {
    resize();
    watchDensity();
  }
  let firstFrame = true;
  function start() {
    ro.observe(runtime.options.container);
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    watchDensity();
    resize();
    const settledZoom = runtime.camera.cam.zoom;
    runtime.camera.cam.zoom = settledZoom * 1.08;
    runtime.badge.swing(0.3);
    intro = gsap.to(runtime.camera.cam, { zoom: settledZoom, duration: 1.4, ease: "power2.out", delay: 0.15 });
    frame = requestAnimationFrame(tick);
    if (runtime.secrets.previewTrophy) runtime.core.timers.push(setTimeout(runtime.secrets.celebrateSecrets, 2000));
  }

  // Public state used by the other scene parts.
  return {
    start,
    get viewH() { return viewH; },
    get frame() { return frame; },
    get intro() { return intro; },
    ro,
    perfReadout,
    resize,
    get densityQuery() { return densityQuery; },
    onDensityChange,
  };
}
