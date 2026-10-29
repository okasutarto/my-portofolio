import * as THREE from "three";
import gsap from "gsap";
import { sfx } from "@/composables/useSfx";
import { canvasTexture, SIP_QUOTES, drawCoffeeTop, drawCork } from "../textures";

export function createCoffee(runtime) {
  // ---------- mug (decor) ----------
  const mug = new THREE.Group();
  // On a cork coaster, a little closer to the envelope
  const MUG_Y = 0.06;
  mug.position.set(5.5, MUG_Y, 0.95);
  const corkTex = canvasTexture(256, 256);
  runtime.core.track(corkTex.texture);
  drawCork(corkTex.ctx, 256, 256);
  const corkMat = runtime.core.toon("#ffffff");
  corkMat.map = corkTex.texture;
  const coaster = runtime.core.mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.06, 32), corkMat, { outline: 0.03, cast: false });
  coaster.position.set(mug.position.x, 0.03, mug.position.z);
  const coasterRing = new THREE.Mesh(runtime.core.track(new THREE.TorusGeometry(0.6, 0.02, 6, 40)), runtime.core.track(new THREE.MeshBasicMaterial({ color: "#6e4520" })));
  coasterRing.rotation.x = Math.PI / 2;
  coasterRing.position.set(mug.position.x, 0.062, mug.position.z);
  coasterRing.raycast = runtime.core.noRaycast;
  runtime.core.scene.add(coaster, coasterRing);
  runtime.core.scene.add(mug);
  // Hollow cup (lathe profile with a wall), deep enough for the coffee level to drop
  const CUP_FLOOR = 0.12;
  const mugProfile = [
    [0, 0],
    [0.45, 0],
    [0.5, 1.1],
    [0.43, 1.1],
    [0.39, CUP_FLOOR],
    [0, CUP_FLOOR],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  // Open-ended: caps on the outline shell showed as a dark ring inside the opening
  const mugShell = new THREE.CylinderGeometry(0.5, 0.45, 1.1, 32, 1, true);
  mugShell.translate(0, 0.55, 0);
  const mugMat = runtime.core.toon("#fffdf5");
  const mugBody = runtime.core.mesh(new THREE.LatheGeometry(mugProfile, 32), mugMat, { outline: 0.05, hull: mugShell });
  // The opening's edge: the outer outline only traces the silhouette
  const rimLine = new THREE.Mesh(runtime.core.track(new THREE.TorusGeometry(0.43, 0.012, 6, 48)), runtime.core.track(new THREE.MeshBasicMaterial({ color: "#000000" })));
  rimLine.rotation.x = Math.PI / 2;
  rimLine.position.y = 1.1;
  rimLine.raycast = runtime.core.noRaycast;
  // the coffee's top (drawCoffeeTop): crema in two tones with a layered latte-art heart
  const coffeeTex = canvasTexture(512, 512);
  runtime.core.track(coffeeTex.texture);
  drawCoffeeTop(coffeeTex.ctx, 512, 512);
  const coffeeMat = runtime.core.toon("#ffffff");
  coffeeMat.map = coffeeTex.texture;
  const coffee = runtime.core.mesh(new THREE.CylinderGeometry(0.405, 0.405, 0.02, 32), coffeeMat, { outline: 0, cast: false });
  coffee.position.y = 0.93;
  const handle = runtime.core.mesh(new THREE.TorusGeometry(0.28, 0.08, 10, 20, Math.PI), mugMat, { outline: 0.04 });
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(0.46, 0.58, 0);
  // Steam: little cartoon puffs rising off the coffee, inked like everything else on the desk.
  // Each puff is a lumpy cloud that buds small at the surface, swells as it climbs, leans off
  // to the right (away from the phone behind the mug) and shrinks away near the top. All the
  // ink goes down first and the fills over it, so puffs that touch merge into one outlined
  // cloud, with a grey underside for a toon shade.
  const STEAM_W = 256;
  const STEAM_H = 256;
  const STEAM_SCALE = { x: 1.9, y: 1.9 };
  const STEAM_SCALE_HOVER = { x: 2.15, y: 2.15 };
  const steamTex = canvasTexture(STEAM_W, STEAM_H);
  runtime.core.track(steamTex.texture);
  const steam = new THREE.Sprite(runtime.core.track(new THREE.SpriteMaterial({ map: steamTex.texture, transparent: true, depthWrite: false })));
  steam.raycast = runtime.core.noRaycast;
  steam.center.set(0.5, 0);
  steam.scale.set(STEAM_SCALE.x, STEAM_SCALE.y, 1);
  steam.position.set(0, 0.9, 0);
  mug.add(steam);
  const puffs = [steam];
  const STEAM_PERIOD = 5.5;
  const STEAM_PUFFS = 4;
  // where puffs bud (a share of the width), how far right they've drifted by the top, and how
  // big they get (a share of the width)
  const STEAM_FROM = 0.42;
  const STEAM_LEAN = 0.52;
  const STEAM_R = 0.1;
  const STEAM_INK = 6;
  // the lumps of one puff: offset and radius, as shares of its size
  const PUFF_LOBES = [[0, 0, 1], [-0.62, 0.22, 0.68], [0.6, 0.28, 0.62], [0.08, -0.5, 0.6]];
  let steamDrawnAt = 0;
  function updateSteam(now) {
    if (!steam.visible || now - steamDrawnAt < 33) return;
    steamDrawnAt = now;
    const c = steamTex.ctx;
    c.clearRect(0, 0, STEAM_W, STEAM_H);
    const t = now / 1000;
    const lumps = [];
    for (let i = 0; i < STEAM_PUFFS; i++) {
      const p = (t / STEAM_PERIOD + i / STEAM_PUFFS) % 1;
      // buds, swells, then shrinks away as it nears the top
      const size = STEAM_R * STEAM_W * Math.min(1, 0.35 + p / 0.25) * Math.min(1, (1 - p) / 0.4);
      if (size < 1) continue;
      // drifting off to the right more and more as it rises, a curl rather than a slant
      const x = (STEAM_FROM + p * p * STEAM_LEAN + Math.sin(p * 5 + i * 2.1) * 0.03) * STEAM_W;
      const y = STEAM_H - size - 4 - p * (STEAM_H - 2 * STEAM_R * STEAM_W);
      // each puff turns a little as it rises, so its lumps don't sit still
      const spin = i * 1.7 + p * 1.2;
      PUFF_LOBES.forEach(([dx, dy, r]) => {
        const cos = Math.cos(spin * 0.4);
        const sin = Math.sin(spin * 0.4);
        lumps.push([x + (dx * cos - dy * sin) * size, y + (dx * sin + dy * cos) * size, r * size]);
      });
    }
    const fill = (color, grow, shift) => {
      c.fillStyle = color;
      lumps.forEach(([x, y, r]) => {
        c.beginPath();
        c.arc(x + shift * r, y + shift * r, Math.max(0, r + grow * (shift ? r : 1)), 0, Math.PI * 2);
        c.fill();
      });
    };
    fill("#1a1714", STEAM_INK, 0);
    fill("#cfd6df", 0, 0);
    // the lit part, nudged up and left, leaves the grey showing on the underside
    fill("#ffffff", -0.18, -0.12);
    steamTex.texture.needsUpdate = true;
  }

  mug.add(mugBody, rimLine, coffee, handle);

  // Sipping: each click drinks a bit and a quote pops up over the mug. Finish the cup and the
  // desk switches to the night shift (or back to day), then it's refilled.
  const SIPS = 4;
  let sipsLeft = SIPS;
  let sipping = false;
  function setCoffee(level, duration = 0.5) {
    const y = CUP_FLOOR + 0.02 + level * (0.93 - CUP_FLOOR - 0.02);
    const r = 0.39 + (0.04 * (y - CUP_FLOOR)) / (1.1 - CUP_FLOOR) - 0.005;
    gsap.to(coffee.position, { y, duration });
    gsap.to(coffee.scale, { x: r / 0.405, z: r / 0.405, duration });
    // Steam only rises off a full cup
    puffs.forEach((puff) => (puff.visible = level >= 1));
  }
  // Move back as well as up: the high camera angle compresses vertical separation.
  // Just above and left of the mug as the (mostly top-down) mug shot sees it, tail to the rim
  const mugBubble = runtime.core.speechBubble(1.9, 1.0);
  mugBubble.sprite.position.set(mug.position.x - 0.5, MUG_Y + 1.85, mug.position.z - 1.1);
  const say = mugBubble.say;
  const hideBubble = mugBubble.hide;
  let lastQuote = -1;

  function sip() {
    if (sipping || sipsLeft === 0) return;
    sipping = true;
    gsap.killTweensOf(mug.position);
    // No steam while it's at your lips (nor after: it's no longer full)
    puffs.forEach((puff) => (puff.visible = false));
    // Lift and tip the rim toward you, then put it back down
    gsap
      .timeline({ onComplete: () => (sipping = false) })
      .to(mug.position, { y: MUG_Y + 0.7, duration: 0.3, ease: "power2.out" })
      .to(mug.rotation, { x: 0.55, duration: 0.3, ease: "power2.out" }, 0)
      .to(mug.rotation, { x: 0, duration: 0.3, ease: "power2.inOut" }, 0.95)
      .to(mug.position, { y: MUG_Y, duration: 0.35, ease: "bounce.out" }, 1.0);
    // The slurp starts as the rim reaches your lips; the mug is set down after the gulp
    sfx.slurp({ delay: 0.25 });
    runtime.core.timers.push(setTimeout(() => sfx.mugDown({ strength: 0.35 }), 1200));
    sipsLeft--;
    runtime.core.timers.push(setTimeout(() => setCoffee(sipsLeft / SIPS, 0.4), 350));
    if (sipsLeft > 0) {
      let i;
      do i = Math.floor(Math.random() * SIP_QUOTES.length);
      while (i === lastQuote && SIP_QUOTES.length > 1);
      lastQuote = i;
      say(SIP_QUOTES[i]);
    } else {
      const toNight = !runtime.theme.darkNow;
      say(toNight ? { text: "Cup's empty. Night shift it is.", by: "oka" } : { text: "Last sip. Good morning, world!", by: "oka" });
      runtime.core.timers.push(setTimeout(() => runtime.options.onEvent("nightShift", { dark: toNight }), 1300));
      // Refill
      runtime.core.timers.push(
        setTimeout(() => {
          sipsLeft = SIPS;
          setCoffee(1, 1.2);
          sfx.rustle({ duration: 1 });
        }, 2600),
      );
    }
    runtime.options.onEvent("mug");
  }
  runtime.core.register(mug, {
    focus: "mug",
    onHover: (on) => {
      if (sipping) return;
      gsap.to(mug.position, { y: on ? MUG_Y + 0.06 : MUG_Y, duration: 0.3, ease: "power2.out", overwrite: true });
      gsap.to(steam.scale, { ...(on ? STEAM_SCALE_HOVER : STEAM_SCALE), duration: 0.4, overwrite: true });
      if (on) gsap.fromTo(coffee.rotation, { y: -0.25 }, { y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)", overwrite: true });
    },
    onArrive: sip,
    onClick: sip,
    onLeave: () => {
      hideBubble();
      if (!sipping) {
        gsap.to(mug.position, { y: MUG_Y, duration: 0.2 });
        gsap.to(mug.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
      }
    },
  });

  // Lightweight contact-shadow approximations supplement the directional shadows.
  // Share one soft texture; lifted props get a wider, fainter footprint.
  const contactTexture = canvasTexture(128, 128);
  runtime.core.track(contactTexture.texture);
  const contactGradient = contactTexture.ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  contactGradient.addColorStop(0, "rgba(0,0,0,.55)");
  contactGradient.addColorStop(0.4, "rgba(0,0,0,.3)");
  contactGradient.addColorStop(0.75, "rgba(0,0,0,.08)");
  contactGradient.addColorStop(1, "rgba(0,0,0,0)");
  contactTexture.ctx.fillStyle = contactGradient;
  contactTexture.ctx.fillRect(0, 0, 128, 128);
  contactTexture.texture.needsUpdate = true;
  const contactShadows = [];
  const contactShadow = (object, width, depth, surfaceY = 0, strength = 1) => {
    const material = runtime.core.track(new THREE.MeshBasicMaterial({
      map: contactTexture.texture, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1,
    }));
    const plane = new THREE.Mesh(runtime.core.track(new THREE.PlaneGeometry(width, depth)), material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = surfaceY + 0.008;
    plane.raycast = runtime.core.noRaycast;
    runtime.core.scene.add(plane);
    contactShadows.push({ object, plane, baseY: object.position.y, strength });
  };
  contactShadow(mug, 1.55, 1.55);
  contactShadow(runtime.plant.plant, 1.9, 1.9);
  contactShadow(runtime.mouse.mouse, 0.85, 1.2, runtime.keyboard.MAT_TOP);
  contactShadow(runtime.workstation.monitor, 2.2, 1.5, runtime.workstation.RISER_TOP);
  contactShadow(runtime.workstation.macStudio, 1.45, 1.45, runtime.workstation.RISER_TOP, 0.8);
  contactShadow(runtime.workstation.riser, 8.0, 2.4, 0, 0.7);
  contactShadow(runtime.keyboard.keyboard, 5.8 * runtime.keyboard.KEYBOARD_SCALE, 2.5 * runtime.keyboard.KEYBOARD_SCALE, runtime.keyboard.MAT_TOP, 0.8);
  contactShadow(runtime.chat.phoneStand, 1.7, 1.5);
  contactShadow(runtime.tickets.tickets, 3.4, 1.8, 0, 0.6);
  contactShadow(runtime.projectFiles.folders, runtime.projectFiles.FOLDER_W * 1.35, runtime.projectFiles.FOLDER_D * 1.35, 0, 0.7);
  contactShadow(runtime.postcard.mail, 3.0, 2.1, 0, 0.55);
  contactShadow(runtime.chair.chair, 4.4, 4.4, runtime.room.FLOOR_Y, 0.8);

  // Public state used by the other scene parts.
  return {
    contactShadows,
    mug,
    coaster,
    MUG_Y,
    updateSteam,
  };
}
