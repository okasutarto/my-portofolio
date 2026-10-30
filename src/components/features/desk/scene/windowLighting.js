import * as THREE from "three";
import gsap from "gsap";
import { sfx } from "@/composables/useSfx";
import { canvasTexture } from "../textures";
import { lowPower } from "../sceneConfig";

export function createWindowLighting(runtime) {
  // Sun (or moon) through the window: a narrow spot far outside it, its rays all but parallel,
  // aimed through the glass from wherever the sky's light stands. The wall round the glass, the
  // glazing bars and the blind's slats shadow it for real, and its map spans only the beam, so
  // slats a few centimetres apart still print as crisp stripes.
  // Far enough out that its rays through the full-size glass stay all but parallel, as the sun's
  // do: from nearer they fan out, and at noon the edge of the beam strays onto the back wall
  const WINDOW_SUN_FAR = 150;
  // the cone just takes in the glass (from its centre to a corner, in world units), at any slant
  const { GLASS } = runtime.room;
  const glassReach = Math.hypot(GLASS.x, GLASS.y) * runtime.room.windowGroup.scale.x;
  const windowLight = new THREE.SpotLight(0xffe5ad, 2.2, 0, Math.atan(glassReach * 1.84 / WINDOW_SUN_FAR), 0.12, 0);
  windowLight.castShadow = true;
  windowLight.shadow.mapSize.setScalar(lowPower ? 1024 : 2048);
  windowLight.shadow.camera.near = WINDOW_SUN_FAR - 8;
  windowLight.shadow.camera.far = WINDOW_SUN_FAR + 40;
  windowLight.shadow.bias = -0.0002;
  windowLight.shadow.normalBias = 0.02;
  windowLight.shadow.radius = 3;
  runtime.core.scene.add(windowLight, windowLight.target);
  runtime.room.windowGroup.updateWorldMatrix(true, false);
  const windowGlass = runtime.room.windowGroup.localToWorld(new THREE.Vector3(0, 0, 0.06));
  const windowRay = new THREE.Vector3();
  // The light's cookie: the glass, as the light sees it, white in black (edges a touch soft, as
  // the sun isn't a point), so it shines only through the window. Redrawn whenever it's aimed.
  const glassCookie = canvasTexture(512, 512);
  runtime.core.track(glassCookie.texture);
  windowLight.map = glassCookie.texture;
  const glassCorner = new THREE.Vector3();
  let cookieRain = -1;
  function drawGlassCookie() {
    runtime.room.windowGroup.updateWorldMatrix(true, false);
    windowLight.updateMatrixWorld();
    windowLight.shadow.updateMatrices(windowLight);
    const c = glassCookie.ctx;
    c.fillStyle = "#000";
    c.fillRect(0, 0, 512, 512);
    c.filter = `blur(${2 + runtime.room.outside.rain * 6}px)`;
    c.beginPath();
    [[-GLASS.x, -GLASS.y], [-GLASS.x, GLASS.y], [GLASS.x, GLASS.y], [GLASS.x, -GLASS.y]].forEach(([x, y], k) => {
      // the shadow matrix takes a world point to the light map's 0–1 square
      runtime.room.windowGroup.localToWorld(glassCorner.set(x, y, 0.06)).applyMatrix4(windowLight.shadow.matrix);
      const px = glassCorner.x * 512;
      const py = (1 - glassCorner.y) * 512;
      if (k) c.lineTo(px, py);
      else c.moveTo(px, py);
    });
    c.closePath();
    c.fillStyle = "#fff";
    c.fill();
    c.filter = "none";
    glassCookie.texture.needsUpdate = true;
    cookieRain = runtime.room.outside.rain;
  }
  // `from`: normalized coordinates of the sun or moon in the painted window view.
  function aimWindowLight(from) {
    // The view's horizontal axis is window-local X (world -Z): the sun's place across the sky
    // turns the beam toward the back of the room in the morning and the front in the evening.
    // Its height in the painted sky sets a real elevation: low and slanting at sunrise (25°),
    // high at noon (45°: the patch reaches across the middle of the desk instead of only the
    // crowded strip by the window, its bars' shadows on the mat), as low again at
    // sunset (25°, any lower and the beam sails over the desk to the floor); the moon (30°)
    // sits between. Heights in between blend.
    const SUN_ELEVATION = [[0.10, 45], [0.19, 30], [0.30, 25], [0.44, 25]];
    const v = THREE.MathUtils.clamp(from[1], SUN_ELEVATION[0][0], SUN_ELEVATION[SUN_ELEVATION.length - 1][0]);
    const k = SUN_ELEVATION.findIndex((_, i) => i === SUN_ELEVATION.length - 2 || v <= SUN_ELEVATION[i + 1][0]);
    const [[v0, e0], [v1, e1]] = [SUN_ELEVATION[k], SUN_ELEVATION[k + 1]];
    const elevation = THREE.MathUtils.degToRad(e0 + (e1 - e0) * (v - v0) / (v1 - v0));
    // A low sun toward the front of the room (sunset) turns the beam only a little that way,
    // so the long evening streak lies across the desk instead of past its front edge
    const setting = from[0] > 0.5 ? THREE.MathUtils.smoothstep(v, SUN_ELEVATION[2][0], SUN_ELEVATION[3][0]) : 0;
    const across = (from[0] - 0.5) * 1.4 * THREE.MathUtils.lerp(1, 0.35, setting);
    runtime.room.windowGroup.updateWorldMatrix(true, false);
    windowRay.set(across, Math.tan(elevation) * Math.hypot(1, across), -1)
      .transformDirection(runtime.room.windowGroup.matrixWorld);
    windowLight.position.copy(windowGlass).addScaledVector(windowRay, WINDOW_SUN_FAR);
    windowLight.target.position.copy(windowGlass).addScaledVector(windowRay, -1);
    windowLight.target.updateMatrixWorld();
    windowLight.shadow.needsUpdate = true;
    drawGlassCookie();
  }

  // The beam through the window: a soft shaft of light in the air, from the glass into the room
  // along the light's own path, with dust drifting in it. A fake volume (four faint additive
  // sides, bright at the glass and fading out along the beam and toward its edges) and a few
  // dozen motes cost two draws, against a raymarched one's full-screen pass. It takes the
  // window light's colour and strength, keeps to the part of the glass the blind leaves open,
  // and thins out in the rain.
  // Long enough to reach the desk or the floor from the top of the full-size window
  const SHAFT_LEN = 20;
  const shaftGeo = runtime.core.track(new THREE.BufferGeometry());
  const shaftPos = new THREE.BufferAttribute(new Float32Array(16 * 3), 3);
  const shaftUv = new Float32Array(16 * 2);
  for (let face = 0; face < 4; face++) {
    // each side: its two glass corners (u 0 and 1) at the window (v 0), then out along the beam
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([u, v], k) => shaftUv.set([u, v], (face * 4 + k) * 2));
  }
  shaftGeo.setAttribute("position", shaftPos);
  shaftGeo.setAttribute("uv", new THREE.BufferAttribute(shaftUv, 2));
  shaftGeo.setIndex([0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7, 8, 9, 10, 10, 9, 11, 12, 13, 14, 14, 13, 15]);
  const shaftMat = runtime.core.track(new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color() }, strength: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 color;
      uniform float strength;
      varying vec2 vUv;
      void main() {
        // clamped: multisampling reads the uvs a little past a triangle's edge, and pow() of a
        // negative is NaN, which comes out as a dark dashed line along the beam's edges
        float along = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.8);
        float across = sin(3.14159265 * clamp(vUv.x, 0.0, 1.0));
        gl_FragColor = vec4(color * strength * along * across * across, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }));
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  shaft.frustumCulled = false;
  shaft.raycast = runtime.core.noRaycast;
  runtime.core.scene.add(shaft);
  // dust: points scattered through the beam (across, up, along), drifting slowly down it
  const MOTES = 60;
  const moteAt = Array.from({ length: MOTES }, () => [Math.random(), Math.random(), Math.random(), Math.random() * Math.PI * 2]);
  const moteGeo = runtime.core.track(new THREE.BufferGeometry());
  const motePos = new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3);
  const moteCol = new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3);
  moteGeo.setAttribute("position", motePos);
  moteGeo.setAttribute("color", moteCol);
  const moteDot = canvasTexture(32, 32);
  runtime.core.track(moteDot.texture);
  const moteGlow = moteDot.ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  moteGlow.addColorStop(0, "rgba(255,255,255,1)");
  moteGlow.addColorStop(1, "rgba(255,255,255,0)");
  moteDot.ctx.fillStyle = moteGlow;
  moteDot.ctx.fillRect(0, 0, 32, 32);
  const motes = new THREE.Points(moteGeo, runtime.core.track(new THREE.PointsMaterial({
    size: 5, sizeAttenuation: false, map: moteDot.texture, vertexColors: true,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })));
  motes.frustumCulled = false;
  motes.raycast = runtime.core.noRaycast;
  runtime.core.scene.add(motes);
  const shaftCorner = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const shaftInto = new THREE.Vector3();
  const shaftTint = new THREE.Color();
  const shaftPoint = new THREE.Vector3();
  const shaftReach = [SHAFT_LEN, SHAFT_LEN, SHAFT_LEN, SHAFT_LEN];
  const BACK_WALL = runtime.room.WALL_Z + 0.12;
  // The desktop: 180 × 84 cm, centred on the origin
  const DESK_HALF = { x: 9, z: 4.2 };
  // How far a ray from `from` along the beam (shaftInto) goes before it meets the back wall, the
  // desk's top (within its edges) or else the floor; never further than SHAFT_LEN
  function beamReach(from) {
    let reach = SHAFT_LEN;
    if (shaftInto.z < -1e-4) reach = Math.min(reach, (BACK_WALL - from.z) / shaftInto.z);
    if (shaftInto.y < -1e-4) {
      const toDesk = -from.y / shaftInto.y;
      const x = from.x + shaftInto.x * toDesk;
      const z = from.z + shaftInto.z * toDesk;
      const onDesk = Math.abs(x) < DESK_HALF.x && Math.abs(z) < DESK_HALF.z;
      reach = Math.min(reach, onDesk ? toDesk : (runtime.room.FLOOR_Y - from.y) / shaftInto.y);
    }
    return Math.max(0, reach);
  }
  // Up close at the window the camera stands in the beam itself, its sides rising off the
  // frame's edges straight at it, and they'd lay bright bands over the wood. A real beam
  // seen from inside it, by the glass, shows nothing, so its sides fade out for the close-up
  // (the motes stay, drifting in the light).
  let shaftCloseUp = 0;
  let shaftAt = 0;
  function updateShaft(now) {
    const dt = Math.min(0.1, (now - shaftAt) / 1000);
    shaftAt = now;
    shaftCloseUp += ((runtime.camera.focus.name === "window" ? 1 : 0) - shaftCloseUp) * Math.min(1, dt * 4);
    // the open part of the glass, below the blind's bottom bar
    const top = Math.min(GLASS.y, runtime.windowBlind.bottomBar.position.y - runtime.windowBlind.BAR_H / 2);
    const strength = windowLight.intensity * 0.028 * (1 - 0.7 * runtime.room.outside.rain) * (1 - 0.75 * runtime.core.roomLight.night);
    shaft.visible = motes.visible = top > -GLASS.y + 0.1 && strength > 0.002;
    shaft.visible &&= shaftCloseUp < 0.99;
    if (!motes.visible) return;
    // glass corners, clockwise from the bottom left as seen from the room, then the beam's way in
    [[-GLASS.x, -GLASS.y], [-GLASS.x, top], [GLASS.x, top], [GLASS.x, -GLASS.y]].forEach(([x, y], k) => runtime.room.windowGroup.localToWorld(shaftCorner[k].set(x, y, 0.12)));
    shaftInto.copy(windowRay).negate();
    // Each edge of the beam stops where it meets the room: the back wall, the desk's top or the
    // floor, whichever comes first, its glow already faded to nothing there. Run on through them,
    // its sides cut across the wall as bright streaks no real beam leaves.
    shaftCorner.forEach((corner, k) => (shaftReach[k] = beamReach(corner)));
    // the four sides: left, top, right, bottom; each one corner pair, near then far
    [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(([a, b], face) => {
      const i = face * 4;
      shaftPos.setXYZ(i, shaftCorner[a].x, shaftCorner[a].y, shaftCorner[a].z);
      shaftPos.setXYZ(i + 1, shaftCorner[b].x, shaftCorner[b].y, shaftCorner[b].z);
      shaftPos.setXYZ(i + 2, shaftCorner[a].x + shaftInto.x * shaftReach[a], shaftCorner[a].y + shaftInto.y * shaftReach[a], shaftCorner[a].z + shaftInto.z * shaftReach[a]);
      shaftPos.setXYZ(i + 3, shaftCorner[b].x + shaftInto.x * shaftReach[b], shaftCorner[b].y + shaftInto.y * shaftReach[b], shaftCorner[b].z + shaftInto.z * shaftReach[b]);
    });
    shaftPos.needsUpdate = true;
    shaftTint.copy(windowLight.color);
    shaftMat.uniforms.color.value.copy(shaftTint);
    shaftMat.uniforms.strength.value = strength * (1 - shaftCloseUp);
    // motes: across the glass (u from left to right, w from bottom to top), drifting along the
    // beam and bobbing a little, brightest in its middle
    const t = now / 1000;
    moteAt.forEach(([u, w, along, phase], k) => {
      const s = (along + t * 0.012) % 1;
      const bob = Math.sin(t * 0.6 + phase) * 0.06;
      shaftPoint.copy(shaftCorner[0]).lerp(shaftCorner[3], u);
      shaftPoint.y += (top + GLASS.y) * w + bob;
      // as far in as the beam reaches at that height, short of where it lands
      const reach = THREE.MathUtils.lerp((shaftReach[0] + shaftReach[3]) / 2, (shaftReach[1] + shaftReach[2]) / 2, w);
      shaftPoint.addScaledVector(shaftInto, s * reach * 0.85);
      motePos.setXYZ(k, shaftPoint.x, shaftPoint.y, shaftPoint.z);
      const glow = Math.sin(Math.PI * s) * Math.sin(Math.PI * u) * strength * 6 * (0.6 + 0.4 * Math.sin(t * 1.3 + phase * 3));
      moteCol.setXYZ(k, shaftTint.r * glow, shaftTint.g * glow, shaftTint.b * glow);
    });
    motePos.needsUpdate = true;
    moteCol.needsUpdate = true;
  }
  // The chain (or the pull on the bottom bar) works the blind: halfway down, all the way down,
  // then back up
  const BLIND_STOPS = [1, 0.45, 0];
  let blindStop = 0;
  const workBlind = () => {
    blindStop = (blindStop + 1) % BLIND_STOPS.length;
    const lift = BLIND_STOPS[blindStop];
    const duration = 0.5 + Math.abs(lift - runtime.windowBlind.blind.lift) * 1.1;
    sfx.slide({ duration: Math.min(0.8, duration * 0.5), up: lift > runtime.windowBlind.blind.lift });
    // it travels, then the hem swings on and settles, a touch of give rather than a stop dead
    // (out into the room either way: the window stands behind it; see updateBlind)
    const swing = lift > runtime.windowBlind.blind.lift ? -0.05 : -0.07;
    gsap.killTweensOf(runtime.windowBlind.blind);
    gsap.timeline({ onUpdate: runtime.windowBlind.updateBlind })
      .to(runtime.windowBlind.blind, { lift, duration, ease: "power1.inOut" })
      .to(runtime.windowBlind.blind, { sway: swing, duration: 0.18, ease: "power1.out" }, ">-0.1")
      .to(runtime.windowBlind.blind, { sway: 0, duration: 1.3, ease: "elastic.out(1, 0.3)" });
  };

  // The window opens by its handles: click one and both turn up level, then the two leaves
  // swing right out on their hinges together, all but flat to the wall outside, clear of the
  // view; click again and they swing shut and the handles drop.
  // Leaving the window's close-up shuts it. The leaves' shadows swing with them, so the sunlit
  // patch on the desk opens up as they go.
  const LEAF_SWING = 3.05; // about 175°, back against the outside wall
  const HANDLE_OPEN = Math.PI / 2;
  const sash = { open: 0 };
  let windowOpen = false;
  const swingLeaves = () => {
    runtime.room.leaves.forEach((leaf, i) => (leaf.rotation.y = (i ? -1 : 1) * LEAF_SWING * sash.open));
    windowLight.shadow.needsUpdate = true;
  };
  function toggleWindow() {
    windowOpen = !windowOpen;
    const turn = (to) => runtime.room.windowCatches.forEach((handle, i) =>
      gsap.to(handle.rotation, { z: (i ? 1 : -1) * to, duration: 0.25, ease: "power2.out", overwrite: true }));
    gsap.killTweensOf(sash);
    sfx.click();
    if (windowOpen) {
      turn(HANDLE_OPEN);
      gsap.delayedCall(0.25, () => sfx.creak());
      gsap.to(sash, { open: 1, duration: 1.6, delay: 0.25, ease: "power2.out", onUpdate: swingLeaves });
      return;
    }
    gsap.to(sash, { open: 0, duration: 1.2, ease: "power2.in", onUpdate: swingLeaves, onComplete: () => {
      sfx.knock();
      turn(0);
    } });
  }
  runtime.room.windowHandles.forEach((grip, i) => runtime.core.register(grip, {
    focus: "window",
    item: true,
    // brushed past while shut, the handle gives a little turn
    onHover: (on) => windowOpen || gsap.to(runtime.room.windowCatches[i].rotation, { z: on ? (i ? 0.55 : -0.55) : 0, duration: on ? 0.25 : 0.4, ease: "power2.out", overwrite: true }),
    onClick: toggleWindow,
  }));
  runtime.core.register(runtime.windowBlind.blindChain, {
    // brushed past, it swings a little; let go of, a smaller sway the other way
    onHover: (on) => (on ? runtime.windowBlind.swingChain(0.05, 0.16) : runtime.windowBlind.swingChain(-0.03, -0.08)),
    // pulled, it swings out harder as the blind starts to move
    onClick: () => {
      runtime.windowBlind.swingChain(0.08, 0.26);
      workBlind();
    },
  });
  runtime.core.register(runtime.windowBlind.bottomBar, {
    onHover: (on) => gsap.to(runtime.windowBlind.pull.rotation, { x: on ? 0.35 : 0, duration: on ? 0.25 : 0.8, ease: on ? "power2.out" : "elastic.out(1, 0.3)", overwrite: true }),
    onClick: workBlind,
  });

  // Public state used by the other scene parts.
  return {
    windowLight,
    toggleWindow,
    isWindowOpen: () => windowOpen,
    aimWindowLight,
    get cookieRain() { return cookieRain; },
    drawGlassCookie,
    updateShaft,
  };
}
