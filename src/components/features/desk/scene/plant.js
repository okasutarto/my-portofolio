import * as THREE from "three";
import gsap from "gsap";
import { hoverSound, sfx } from "@/composables/useSfx";
import { canvasTexture, drawPlantLeaf, drawTerracotta } from "../textures";

export function createPlant(runtime) {
  // ---------- potted plant (back-right, decor) ----------
  const plant = new THREE.Group();
  plant.position.set(5.25, 0, -3.3);
  runtime.core.scene.add(plant);
  const potProfile = [
    [0, 0],
    [0.48, 0],
    [0.58, 0.95],
    [0.66, 0.95],
    [0.66, 1.12],
    [0.52, 1.12],
    [0.5, 1.0],
    [0, 1.0],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  // The pot: speckled glazed terracotta, wheel rings up its wall, standing in a shallow saucer.
  // The lathe's uv runs one step of the profile to each seventh: its wall is the second, the
  // rim's outer face the fourth.
  const potTex = canvasTexture(256, 256);
  runtime.core.track(potTex.texture);
  drawTerracotta(potTex.ctx, 256, 256, { wall: [1 / 7, 2 / 7], rim: [3 / 7, 4 / 7] });
  potTex.texture.wrapS = THREE.RepeatWrapping;
  potTex.texture.repeat.set(3, 1);
  const potMat = runtime.core.toon("#ffffff");
  potMat.map = potTex.texture;
  const pot = runtime.core.mesh(new THREE.LatheGeometry(potProfile, 36), potMat, { outline: 0.025 });
  pot.position.y = 0.03;
  const saucerProfile = [[0, 0], [0.62, 0], [0.7, 0.12], [0.64, 0.12], [0.57, 0.035], [0, 0.035]].map(([x, y]) => new THREE.Vector2(x, y));
  const saucer = runtime.core.mesh(new THREE.LatheGeometry(saucerProfile, 36), runtime.core.toon("#e0631a"), { outline: 0.02 });
  const soil = runtime.core.mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 24), runtime.core.toon("#3b2a1a"), { outline: 0, cast: false });
  soil.position.y = 1.05;
  const foliage = new THREE.Group();
  foliage.position.y = 1.05;
  // a touch smaller than the pot would grow it, so the leaves clear the wall behind
  foliage.scale.setScalar(0.85);
  plant.add(saucer, pot, soil, foliage);
  const stemMat = runtime.core.toon("#166534");
  // Each leaf colouring is its own painted texture: [base, tip, vein]; the last is the young
  // leaves' fresh lime
  const leafMats = [
    ["#166534", "#22c55e", "#a7f3c0"], ["#15803d", "#4ade80", "#bbf7d0"], ["#2f7d43", "#8fd694", "#dcfce7"], ["#4d9c2f", "#a3e66b", "#ecfccb"],
  ].map(([base, tip, vein]) => {
    const tex = canvasTexture(256, 256);
    runtime.core.track(tex.texture);
    drawPlantLeaf(tex.ctx, 256, 256, { base, tip, vein });
    const material = runtime.core.toon("#ffffff");
    material.map = tex.texture;
    return material;
  });
  // A leaf blade as a thin solid: a teardrop outline, folded up a little either side of its
  // midrib, arching back so its tip droops. Built along +y with its
  // upper face toward -z; uv runs edge to edge across it and base to tip along it.
  const leafGeo = (length, width, { fold = 0.3, arch = 0.22 } = {}) => {
    const ROWS = 22;
    const COLS = 10;
    const THICK = 0.012;
    const halfWidth = (t) => (width / 2) * Math.sin(Math.PI * t ** 0.72);
    const position = [];
    const uv = [];
    const index = [];
    for (const side of [-1, 1]) {
      for (let j = 0; j <= ROWS; j++) {
        const t = j / ROWS;
        for (let i = 0; i <= COLS; i++) {
          const u = (i / COLS) * 2 - 1;
          const x = u * halfWidth(t);
          const z = -fold * Math.abs(x) + arch * length * t * t;
          position.push(x, t * length, z + side * THICK);
          uv.push((u + 1) / 2, t);
        }
      }
    }
    const at = (side, i, j) => (side < 0 ? 0 : (ROWS + 1) * (COLS + 1)) + j * (COLS + 1) + i;
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        // the upper face looks toward -z, the lower toward +z
        index.push(at(-1, i, j), at(-1, i, j + 1), at(-1, i + 1, j), at(-1, i + 1, j), at(-1, i, j + 1), at(-1, i + 1, j + 1));
        index.push(at(1, i, j), at(1, i + 1, j), at(1, i, j + 1), at(1, i + 1, j), at(1, i + 1, j + 1), at(1, i, j + 1));
      }
      // its thin edges either side
      index.push(at(-1, 0, j), at(1, 0, j), at(-1, 0, j + 1), at(1, 0, j), at(1, 0, j + 1), at(-1, 0, j + 1));
      index.push(at(-1, COLS, j), at(-1, COLS, j + 1), at(1, COLS, j), at(1, COLS, j), at(-1, COLS, j + 1), at(1, COLS, j + 1));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(index);
    geo.computeVertexNormals();
    return geo;
  };
  // Teardrop leaves, each on its own stem: the stem runs from the soil to the leaf's base, and the
  // leaf leans out from there toward its heading, rolled a little about its own length. The big
  // ones, then a few small young ones in the middle, more upright.
  // [heading°, base height, lean, length, width, colouring]
  [
    [20, 0.3, 0.85, 1.5, 0.62, 0], [100, 0.4, 0.8, 1.6, 0.6, 1], [170, 0.5, 0.7, 1.5, 0.58, 2], [250, 0.35, 0.85, 1.6, 0.62, 0],
    [320, 0.55, 0.65, 1.4, 0.56, 1], [60, 0.7, 0.45, 1.35, 0.52, 2], [210, 0.8, 0.4, 1.35, 0.52, 1],
    [140, 0.9, 0.3, 0.7, 0.3, 3], [290, 0.95, 0.32, 0.65, 0.28, 3], [30, 1.05, 0.22, 0.55, 0.25, 3],
  ].forEach(([heading, height, lean, length, width, colouring], i) => {
    const angle = THREE.MathUtils.degToRad(heading);
    const young = length < 1;
    const base = new THREE.Vector3(Math.sin(angle) * 0.16, height, Math.cos(angle) * 0.16);
    foliage.add(runtime.core.rod(new THREE.Vector3(0, 0, 0), base, young ? 0.024 : 0.035, stemMat, 0.015));
    const leaf = new THREE.Group();
    leaf.position.copy(base);
    leaf.rotation.set(lean, angle, (((i * 37) % 7) - 3) * 0.07, "YXZ");
    const shape = young ? { fold: 0.45, arch: 0.08 } : { fold: 0.25 + (i % 3) * 0.05, arch: 0.18 + (i % 4) * 0.03 };
    leaf.add(runtime.core.mesh(leafGeo(length, width, shape), leafMats[colouring], { outline: young ? 0.018 : 0.025 }));
    foliage.add(leaf);
  });
  // Each click wiggles it and opens one of three flowers: they stand on their own stems above the
  // leaves as closed green buds until then. With all three open, a butterfly comes over and
  // flutters round it for a while.
  const petalGeo = new THREE.SphereGeometry(1, 14, 10);
  const facing = new THREE.Vector3(0.48, 0.72, 1).normalize(); // toward the overview camera
  const flowers = [
    [-0.22, 2.5, 0.02, "#ff90e8"], [0.3, 2.25, 0.1, "#fffdf5"], [0.04, 2.0, 0.36, "#ffdd00"],
  ].map(([x, y, z, color], i) => {
    const tip = new THREE.Vector3(x, y, z);
    foliage.add(runtime.core.rod(new THREE.Vector3(0, 0, 0), tip, 0.03, stemMat, 0.015));
    const head = new THREE.Group();
    head.position.copy(tip);
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), facing);
    const bud = runtime.core.mesh(petalGeo, runtime.core.toon("#8fd694"), { outline: 0.02 });
    bud.scale.set(0.11, 0.11, 0.15);
    const bloom = new THREE.Group();
    const petalMat = runtime.core.toon(color);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const petal = runtime.core.mesh(petalGeo, petalMat, { outline: 0.018 });
      petal.scale.set(0.17, 0.1, 0.035);
      petal.position.set(Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0);
      petal.rotation.z = a;
      bloom.add(petal);
    }
    const centre = runtime.core.mesh(petalGeo, runtime.core.toon(i === 2 ? "#ff7a1a" : "#ffdd00"), { outline: 0.018 });
    centre.scale.set(0.1, 0.1, 0.06);
    centre.position.z = 0.03;
    bloom.add(centre);
    bloom.scale.setScalar(0.001);
    head.add(bud, bloom);
    foliage.add(head);
    return { bud, bloom };
  });
  let bloomed = 0;

  // The butterfly: a little body and two wings on hinges, flown along a loop by the render loop
  const butterfly = new THREE.Group();
  butterfly.visible = false;
  runtime.core.scene.add(butterfly);
  const wingGeo = new THREE.SphereGeometry(1, 14, 8);
  const wingMat = runtime.core.toon("#ff7a1a");
  const wings = [-1, 1].map((side) => {
    const hinge = new THREE.Group();
    const upper = runtime.core.mesh(wingGeo, wingMat, { outline: 0.012 });
    upper.scale.set(0.2, 0.015, 0.16);
    upper.position.set(side * 0.2, 0, -0.06);
    const lower = runtime.core.mesh(wingGeo, runtime.core.toon("#ffdd00"), { outline: 0.012 });
    lower.scale.set(0.13, 0.014, 0.11);
    lower.position.set(side * 0.13, 0, 0.13);
    hinge.add(upper, lower);
    butterfly.add(hinge);
    return { hinge, side };
  });
  const bugBody = runtime.core.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 8), runtime.core.toon("#1a1714"), { outline: 0.01 });
  bugBody.rotation.x = Math.PI / 2;
  butterfly.add(bugBody);
  const flight = { active: false, t: 0, leaving: 0 };
  const FLIGHT_TIME = 8;
  function updateButterfly(dt, now) {
    if (!flight.active) return;
    flight.t += dt;
    const t = flight.t;
    // A lazy figure-eight round the plant, dipping toward the flowers
    const p = plant.position;
    const x = p.x + Math.sin(t * 1.1) * 1.3;
    const z = p.z + Math.sin(t * 2.2) * 0.7 + 0.3;
    let y = 3.8 + Math.sin(t * 1.7) * 0.35;
    // Arriving from above, leaving up and to the right
    const arrive = Math.min(1, t / 1.2);
    const leave = Math.max(0, t - FLIGHT_TIME);
    y += (1 - arrive) * 4 + leave * leave * 2.5;
    const prev = butterfly.position.clone();
    butterfly.position.set(x + leave * leave * 2, y, z);
    const vx = butterfly.position.x - prev.x;
    const vz = butterfly.position.z - prev.z;
    if (Math.hypot(vx, vz) > 1e-4) butterfly.rotation.y = Math.atan2(-vx, -vz);
    const flap = Math.sin(now * 0.045) * 1.0;
    wings.forEach(({ hinge, side }) => (hinge.rotation.z = side * flap));
    // A tiny flutter on each downstroke, fading in as it arrives and out as it leaves
    if (flap < 0 && flight.lastFlap >= 0) sfx.wingFlap({ volume: arrive * (1 - Math.min(1, leave / 1.6)) });
    flight.lastFlap = flap;
    if (leave > 1.6) {
      flight.active = false;
      butterfly.visible = false;
    }
  }
  function callButterfly() {
    runtime.secrets.discover("butterfly");
    if (flight.active) return;
    flight.active = true;
    flight.t = 0;
    butterfly.visible = true;
    sfx.bloom({ pitch: 1.8 });
    // the cat's after it at once
    runtime.core.timers.push(setTimeout(runtime.cat.catChaseButterfly, 700));
  }

  runtime.core.register(plant, {
    onHover: (on) => {
      gsap.to(foliage.rotation, { z: on ? 0.12 : 0, duration: on ? 0.3 : 0.65, ease: "power2.out", overwrite: true });
      if (on) hoverSound(plant, (s) => s.leaves({ duration: 0.2 }));
    },
    onClick: () => {
      gsap.fromTo(foliage.rotation, { z: 0.15 }, { z: 0, duration: 1.4, ease: "elastic.out(1, 0.25)", overwrite: true });
      gsap.fromTo(pot.scale, { x: 1.12, y: 0.88, z: 1.12 }, { x: 1, y: 1, z: 1, duration: 0.6, ease: "elastic.out(1.2, 0.35)" });
      sfx.leaves();
      if (bloomed < flowers.length) {
        const { bud, bloom } = flowers[bloomed++];
        gsap.to(bud.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.2, ease: "back.in(2)" });
        gsap.to(bloom.scale, { x: 1, y: 1, z: 1, duration: 0.6, delay: 0.12, ease: "back.out(3)" });
        gsap.fromTo(bloom.rotation, { z: -1.6 }, { z: 0, duration: 0.8, delay: 0.12, ease: "power3.out" });
        sfx.bloom({ pitch: 1 + bloomed * 0.25, delay: 0.12 });
      }
      if (bloomed === flowers.length) runtime.core.timers.push(setTimeout(callButterfly, 500));
    },
  });

  // Public state used by the other scene parts.
  return {
    plant,
    butterfly,
    flight,
    FLIGHT_TIME,
    updateButterfly,
  };
}
