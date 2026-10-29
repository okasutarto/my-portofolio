import * as THREE from "three";
import gsap from "gsap";
import { sfx } from "@/composables/useSfx";
import { canvasTexture, drawRepBadge, drawBrushedMetal, drawSatinFinish } from "../textures";

export function createGym(runtime) {
  // ---------- gym corner: a pair of dumbbells on the floor between the desk and the shelf ----------
  // Click for a rep: one dumbbell is lifted and set down with a clank, and a counter pops up
  // over them. Ten in a row is a new PR, with confetti.
  const gym = new THREE.Group();
  // Between the desk's leg and the shelf, clear of both, resting on top of the rug
  gym.position.set(9.7, runtime.room.FLOOR_Y + 0.08, -0.2);
  gym.scale.setScalar(2);
  gym.rotation.y = -0.15;
  runtime.core.scene.add(gym);
  const HEAD_R = 0.27;
  const HEAD_BAND_R = HEAD_R + 0.005;
  const ironTexture = canvasTexture(128, 128);
  runtime.core.track(ironTexture.texture);
  drawSatinFinish(ironTexture.ctx, 128, 128, { grain: 0.22 });
  ironTexture.texture.wrapS = ironTexture.texture.wrapT = THREE.RepeatWrapping;
  ironTexture.texture.repeat.set(3, 2);
  const steelTexture = canvasTexture(128, 128);
  runtime.core.track(steelTexture.texture);
  drawBrushedMetal(steelTexture.ctx, 128, 128);
  const steel = runtime.core.toon("#d0d4d8");
  steel.map = steelTexture.texture;
  const knurlTexture = canvasTexture(128, 128);
  runtime.core.track(knurlTexture.texture);
  drawBrushedMetal(knurlTexture.ctx, 128, 128);
  knurlTexture.ctx.strokeStyle = "rgba(25,30,35,.4)";
  knurlTexture.ctx.lineWidth = 1.5;
  knurlTexture.ctx.beginPath();
  for (let x = -128; x < 256; x += 12) {
    knurlTexture.ctx.moveTo(x, 0);
    knurlTexture.ctx.lineTo(x + 128, 128);
    knurlTexture.ctx.moveTo(x, 0);
    knurlTexture.ctx.lineTo(x - 128, 128);
  }
  knurlTexture.ctx.stroke();
  knurlTexture.texture.wrapS = knurlTexture.texture.wrapT = THREE.RepeatWrapping;
  knurlTexture.texture.repeat.set(2, 2);
  const knurledSteel = runtime.core.toon("#aeb5bc");
  knurledSteel.map = knurlTexture.texture;
  knurledSteel.bumpMap = knurlTexture.texture;
  knurledSteel.bumpScale = 0.003;
  const ironRim = runtime.core.toon("#41464d");
  ironRim.map = ironTexture.texture;
  // Round cast-iron heads with bevelled rims, inset end caps and a knurled steel handle.
  const headProfile = [[0, -0.15], [HEAD_R - 0.035, -0.15], [HEAD_R, -0.115],
    [HEAD_R, 0.115], [HEAD_R - 0.035, 0.15], [0, 0.15]].map(([r, y]) => new THREE.Vector2(r, y));
  const dumbbell = (color, x, z, turn) => {
    const db = new THREE.Group();
    const headMat = runtime.core.toon(color);
    headMat.map = headMat.bumpMap = ironTexture.texture;
    headMat.bumpScale = 0.006;
    const bar = runtime.core.mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.66, 24), steel, { outline: 0.01 });
    const grip = runtime.core.mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.34, 32), knurledSteel, { outline: 0.008 });
    db.add(bar, grip);
    [-1, 1].forEach((side) => {
      const head = runtime.core.mesh(new THREE.LatheGeometry(headProfile, 48), headMat, { outline: 0.018 });
      head.position.y = side * 0.42;
      const band = runtime.core.mesh(new THREE.CylinderGeometry(HEAD_BAND_R, HEAD_BAND_R, 0.025, 48), ironRim, { outline: 0, cast: false });
      band.position.y = side * 0.42;
      const collar = runtime.core.mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.045, 24), steel, { outline: 0.006 });
      collar.position.y = side * 0.245;
      const cap = runtime.core.mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.008, 40), ironRim, { outline: 0, cast: false });
      cap.position.y = side * 0.574;
      const rim = runtime.core.mesh(new THREE.TorusGeometry(0.205, 0.008, 8, 40), steel, { outline: 0, cast: false });
      rim.rotation.x = Math.PI / 2;
      rim.position.y = side * 0.574;
      const weight = runtime.core.printed(0.24, 0.24, 900, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.fillStyle = "#d5d8d8";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.font = `800 ${w * 0.5}px 'Space Grotesk', sans-serif`;
        c.fillText("8", w / 2, h * 0.36);
        c.font = `700 ${w * 0.16}px 'Space Grotesk', sans-serif`;
        c.fillText("KG", w / 2, h * 0.76);
      });
      weight.material.transparent = true;
      weight.material.alphaTest = 0.1;
      weight.rotation.x = -side * Math.PI / 2;
      weight.rotateZ(-Math.PI / 2);
      weight.position.y = side * 0.58;
      db.add(head, band, collar, cap, rim, weight);
    });
    db.rotation.set(0, turn, Math.PI / 2, "YXZ");
    // Support the outer band, with a little clearance for its screen-space outline.
    db.position.set(x, HEAD_BAND_R + 0.0125, z);
    db.userData.restY = db.position.y;
    gym.add(db);
    return db;
  };
  // Cast iron grey, one a shade darker than the other
  const dumbbells = [dumbbell("#8b9099", -0.45, -0.3, 0.25), dumbbell("#6b7079", 0.5, 0.35, -0.15)];
  const repTex = canvasTexture(320, 160);
  runtime.core.track(repTex.texture);
  const repBadge = new THREE.Sprite(runtime.core.track(new THREE.SpriteMaterial({ map: repTex.texture, depthTest: false, transparent: true })));
  repBadge.renderOrder = 10;
  repBadge.raycast = runtime.core.noRaycast;
  repBadge.scale.set(0.001, 0.001, 1);
  repBadge.position.set(gym.position.x, runtime.room.FLOOR_Y + 2.7, gym.position.z);
  runtime.core.scene.add(repBadge);
  // Confetti for a PR: a pool of little coloured squares
  const confetti = Array.from({ length: 72 }, (_, i) => {
    const bit = new THREE.Sprite(runtime.core.track(new THREE.SpriteMaterial({ color: runtime.shelfConsole.PALETTE[i % 7], transparent: true, depthWrite: false })));
    bit.visible = false;
    bit.raycast = runtime.core.noRaycast;
    runtime.core.scene.add(bit);
    return bit;
  });
  function burst(x, y, z, celebration = false) {
    // Trophy confetti falls in front of the shelf, clear of its boards and side panels.
    const frontZ = celebration ? runtime.shelf.shelf.position.z + runtime.shelf.SHELF_D * runtime.shelf.shelf.scale.z / 2 + 0.25 : z;
    confetti.slice(0, celebration ? 72 : 22).forEach((bit, i) => {
      const delay = celebration ? i * 0.008 : 0;
      const duration = celebration ? 3.2 : 1.3;
      gsap.killTweensOf([bit.position, bit.material]);
      bit.visible = true;
      bit.position.set(x, y, celebration ? Math.max(z, frontZ) : z);
      bit.scale.setScalar(0.1 + Math.random() * 0.08);
      bit.material.opacity = 1;
      bit.material.rotation = Math.random() * Math.PI;
      const a = Math.random() * Math.PI * 2;
      const r = (0.8 + Math.random() * 1.4) * (celebration ? 1.45 : 1);
      gsap.to(bit.position, { x: x + Math.cos(a) * r, z: celebration ? frontZ + 0.15 + Math.random() * 0.35 : z + Math.sin(a) * r * 0.6, duration: duration * 0.9, delay, ease: "power2.out" });
      gsap.to(bit.position, { delay, keyframes: [{ y: y + 0.8 + Math.random() * 1.2, duration: duration * 0.35, ease: "power2.out" }, { y: y - (celebration ? 2.2 : 1.2), duration: duration * 0.65, ease: "power2.in" }] });
      gsap.to(bit.material, { rotation: bit.material.rotation + Math.PI * (celebration ? 4 : 1), duration, delay });
      gsap.to(bit.material, { opacity: 0, delay: delay + duration * 0.7, duration: duration * 0.3, onComplete: () => (bit.visible = false) });
    });
  }
  let reps = 0;
  let lifting = false;
  let repTimer = null;
  function showReps(text, fill) {
    drawRepBadge(repTex.ctx, 320, 160, text, fill);
    repTex.texture.needsUpdate = true;
    gsap.fromTo(repBadge.scale, { x: 0.6, y: 0.3 }, { x: 1.8, y: 0.9, duration: 0.35, ease: "back.out(3)", overwrite: true });
    clearTimeout(repTimer);
    repTimer = setTimeout(() => {
      reps = 0;
      gsap.to(repBadge.scale, { x: 0.001, y: 0.001, duration: 0.2, ease: "power2.in", overwrite: true });
    }, 2600);
  }
  function lift(db = dumbbells[reps % 2]) {
    if (lifting) return;
    lifting = true;
    gsap.killTweensOf(db.position);
    const y = db.userData.restY;
    gsap.timeline({ onComplete: () => (lifting = false) })
      .to(db.position, { y: y + 1.5, duration: 0.32, ease: "power2.out" })
      .to(db.rotation, { y: db.rotation.y + 0.5, duration: 0.32, ease: "power2.out" }, 0)
      .to(db.position, { y, duration: 0.3, ease: "power2.in" }, 0.42)
      .to(db.rotation, { y: db.rotation.y, duration: 0.3, ease: "power2.in" }, 0.42)
      .call(() => {
        sfx.dumbbell();
        reps++;
        if (reps >= 10) {
          showReps("NEW PR!", "#ff90e8");
          runtime.secrets.discover("gymPR");
          burst(gym.position.x, runtime.room.FLOOR_Y + 1.6, gym.position.z);
          sfx.sparkle();
          reps = 0;
        } else showReps(`REP ${reps}`);
      }, null, 0.72);
    sfx.whoosh({ duration: 0.3 });
  }
  dumbbells.forEach((db) => runtime.core.register(db, {
    onHover: (on) => {
      if (lifting) return;
      gsap.to(db.position, { y: db.userData.restY + (on ? 0.14 : 0), duration: on ? 0.25 : 0.35, ease: "power2.out", overwrite: true });
    },
    onClick: () => lift(db),
  }));
  runtime.core.register(gym, { onClick: () => lift() });

  // Public state used by the other scene parts.
  return {
    burst,
    gym,
    get repTimer() { return repTimer; },
    confetti,
  };
}
