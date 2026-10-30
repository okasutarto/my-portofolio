import * as THREE from "three";
import gsap from "gsap";
import { sfx } from "@/composables/useSfx";
import { canvasTexture, drawMangaSpine, drawMangaCover, drawBrushedMetal, drawTrophyMetal, drawTrophyStone, drawSatinFinish } from "../textures";

export function createShelfCollectibles(runtime) {
  // Middle bay: a pile of manga volumes lying down, and a trophy. Manga are
  // smaller than the hardbacks, with white covers and the series' colour on each spine, the
  // pile a little untidy.
  const MANGA = [
    [1, "#f68026", "MARUTO"], [2, "#ffc342", "MARUTO"], [3, "#ed6d37", "MARUTO"],
    [4, "#ffb15c", "MARUTO"], [5, "#e99a32", "MARUTO"],
    [1, "#66bfa7", "DRAGON BELL"], [2, "#78addb", "DRAGON BELL"],
    [3, "#f6bc4b", "DRAGON BELL"], [4, "#e98779", "DRAGON BELL"],
  ];
  const PILE_X = -0.7;
  const mangaPile = [];
  const stackTop = MANGA.reduce((y, [vol, color, title], i) => {
    const thick = 0.08;
    const lying = runtime.shelfBooks.bookMesh(thick, 0.95, "#fffdf5", i, 0.635, (c, cw, ch) => drawMangaSpine(c, cw, ch, { vol, color, title }));
    const coverArt = runtime.core.printed(0.615, 0.93, 750, (c, cw, ch) => drawMangaCover(c, cw, ch, { vol, color, title }));
    coverArt.rotation.y = Math.PI / 2;
    coverArt.position.x = thick / 2 + 0.003;
    lying.add(coverArt);
    lying.rotation.z = Math.PI / 2;
    const item = runtime.shelf.addItem(runtime.core.at(runtime.shelf.group(lying), PILE_X + (i % 2 ? 0.03 : -0.025), y + thick / 2, 0.25), "book");
    item.rotation.y = (i % 3 - 1) * 0.07;
    mangaPile.push(item);
    return y + thick;
  }, runtime.shelf.standOn(1));
  // A 3×3 puzzle cube on top of the pile: 27 little cubies, each with its stickers on the
  // outside faces, so a layer can really turn. It sits a few twists away from solved; click
  // it and it gets played with: a quick run of layer turns as it spins round.
  const CUBE = 0.28;
  const CUBIE = CUBE / 3;
  const stickerMats = { px: "#e5484d", nx: "#ff8a1f", py: "#fffdf5", ny: "#ffd400", pz: "#22a35a", nz: "#2f7cf6" };
  Object.keys(stickerMats).forEach((k) => (stickerMats[k] = runtime.core.toon(stickerMats[k])));
  const cubieGeo = runtime.core.rbox(CUBIE - 0.004, CUBIE - 0.004, CUBIE - 0.004, 0.012);
  const stickerGeo = runtime.core.rbox(CUBIE - 0.026, CUBIE - 0.026, 0.01, 0.01);
  const rubik = new THREE.Group();
  const cubies = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    const cubie = runtime.core.mesh(cubieGeo, runtime.shelfConsole.black, { outline: 0.008 });
    cubie.position.set(x * CUBIE, y * CUBIE, z * CUBIE);
    const face = (axis, sign) => {
      const sticker = runtime.core.mesh(stickerGeo, stickerMats[`${sign > 0 ? "p" : "n"}${axis}`], { outline: 0 });
      sticker.position[axis] = sign * (CUBIE / 2);
      if (axis === "x") sticker.rotation.y = Math.PI / 2;
      if (axis === "y") sticker.rotation.x = Math.PI / 2;
      cubie.add(sticker);
    };
    if (x) face("x", x);
    if (y) face("y", y);
    if (z) face("z", z);
    rubik.add(cubie);
    cubies.push(cubie);
  }
  // Turn one layer (axis "x" | "y" | "z", layer -1..1) a quarter turn either way: its cubies
  // move to a pivot, it turns, and they come back snapped to the grid
  const AXES = ["x", "y", "z"];
  const snap = (v, step) => Math.round(v / step) * step;
  function turnLayer(axis, layer, dir, duration = 0, onDone, onUpdate) {
    const pivot = new THREE.Object3D();
    rubik.add(pivot);
    const members = cubies.filter((c) => Math.round(c.position[axis] / CUBIE) === layer);
    members.forEach((c) => pivot.attach(c));
    const settle = () => {
      members.forEach((c) => {
        rubik.attach(c);
        c.position.set(snap(c.position.x, CUBIE), snap(c.position.y, CUBIE), snap(c.position.z, CUBIE));
        c.rotation.set(snap(c.rotation.x, Math.PI / 2), snap(c.rotation.y, Math.PI / 2), snap(c.rotation.z, Math.PI / 2));
      });
      rubik.remove(pivot);
      onDone?.();
    };
    if (!duration) {
      pivot.rotation[axis] = (dir * Math.PI) / 2;
      pivot.updateMatrixWorld(true);
      return settle();
    }
    gsap.to(pivot.rotation, { [axis]: (dir * Math.PI) / 2, duration, ease: "power2.inOut", onUpdate, onComplete: settle });
  }
  // a few turns from solved, as if put down mid-solve
  [["y", 1, 1], ["x", -1, -1], ["z", 1, 1], ["y", -1, -1]].forEach(([axis, layer, dir]) => turnLayer(axis, layer, dir));
  rubik.rotation.set(0, 0.6, 0);
  // Rested on its real lowest point (the stickers stand a little proud of the cubies)
  const rubikBounds = new THREE.Box3();
  rubik.updateMatrixWorld(true);
  const rubikDrop = -rubikBounds.setFromObject(rubik).min.y;
  const rubikItem = runtime.shelf.addItem(runtime.core.at(runtime.shelf.group(rubik), -0.7, stackTop + rubikDrop, 0.3), "rubik");
  // While it's played with, a tilt or a turning layer swings a corner below the cube's resting
  // face: lift the cube by that much, so it rocks on the corner instead of sinking into the pile
  const rubikAt = new THREE.Vector3();
  const rubikScale = new THREE.Vector3();
  function keepOnPile() {
    rubik.position.y = 0;
    rubikItem.updateMatrixWorld(true);
    const scale = rubikItem.getWorldScale(rubikScale).y;
    const floor = rubikItem.getWorldPosition(rubikAt).y - rubikDrop * scale;
    rubik.position.y = Math.max(0, floor - rubikBounds.setFromObject(rubik).min.y) / scale;
  }
  let rubikBusy = false;
  function playRubik() {
    if (rubikBusy) return;
    rubikBusy = true;
    const TURNS = 6;
    const turn = (n) => {
      if (n === TURNS) {
        rubikBusy = false;
        keepOnPile();
        return;
      }
      const axis = AXES[Math.floor(Math.random() * 3)];
      sfx.tick({ pitch: 1.6 + Math.random() * 0.6 });
      turnLayer(axis, Math.floor(Math.random() * 3) - 1, Math.random() < 0.5 ? 1 : -1, 0.16, () => turn(n + 1), keepOnPile);
    };
    turn(0);
    // turned over in the hands as it's played
    gsap.to(rubik.rotation, { y: rubik.rotation.y + Math.PI * 2, duration: 6 * 0.17, ease: "power1.inOut" });
    gsap.fromTo(rubik.rotation, { x: 0 }, { x: 0.35, duration: 6 * 0.085, yoyo: true, repeat: 1, ease: "sine.inOut", onUpdate: keepOnPile });
  }
  // A volume lying in the pile can't hop out of it: a click slides it a little further out of
  // the stack and pushes it back in with a slap, and the volumes above (and the cube on top)
  // ride up and settle as it goes
  function nudgeManga(item) {
    const at = mangaPile.indexOf(item);
    if (at < 0) return false;
    const z = item.userData.restZ ?? (item.userData.restZ = item.position.z);
    const turn = item.userData.restTurn ?? (item.userData.restTurn = item.rotation.y);
    gsap.timeline({ overwrite: true })
      .to(item.position, { z: z + 0.12, duration: 0.2, ease: "power2.out" })
      .to(item.rotation, { y: turn + (at % 2 ? 0.08 : -0.08), duration: 0.2, ease: "power2.out" }, 0)
      .to(item.position, { z, duration: 0.24, ease: "back.in(1.6)" }, 0.26)
      .to(item.rotation, { y: turn, duration: 0.24, ease: "power2.in" }, 0.26)
      .call(() => sfx.bookDown({ strength: 0.5 }), null, 0.5);
    [...mangaPile.slice(at + 1), rubikItem].forEach((above, i) => {
      const y = above.userData.restY;
      gsap.fromTo(above.position, { y }, { keyframes: [
        { y: y + 0.018, duration: 0.12, delay: 0.03 + i * 0.012, ease: "power2.out" },
        { y, duration: 0.18, ease: "power2.in" },
        { y: y + 0.006, duration: 0.07, delay: 0.21, ease: "power1.out" },
        { y, duration: 0.09, ease: "power1.in" },
      ], overwrite: true });
    });
    return true;
  }
  let trophyCelebrating = false;
  let trophyCelebration = null;
  const trophyHalo = new THREE.Sprite(runtime.core.track(new THREE.SpriteMaterial({
    map: runtime.lamp.radial([[0, "rgba(255,220,100,.8)"], [0.4, "rgba(255,204,60,.35)"], [1, "rgba(255,190,40,0)"]]),
    transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending,
  })));
  trophyHalo.raycast = runtime.core.noRaycast;
  trophyHalo.visible = false;
  runtime.core.scene.add(trophyHalo);
  const trophyGold = runtime.core.toon("#ffdb58");
  // Lift the shadow band locally so the gold stays bright inside the shelf recess.
  const trophyGradient = runtime.core.track(new THREE.DataTexture(new Uint8Array([140, 210, 255]), 3, 1, THREE.RedFormat));
  trophyGradient.minFilter = trophyGradient.magFilter = THREE.NearestFilter;
  trophyGradient.needsUpdate = true;
  trophyGold.gradientMap = trophyGradient;
  const trophyMetal = canvasTexture(256, 256);
  runtime.core.track(trophyMetal.texture);
  drawTrophyMetal(trophyMetal.ctx, 256, 256);
  trophyGold.map = trophyMetal.texture;
  const trophyGrain = canvasTexture(128, 128);
  runtime.core.track(trophyGrain.texture);
  drawSatinFinish(trophyGrain.ctx, 128, 128, { grain: 0.08 });
  trophyGrain.texture.colorSpace = THREE.NoColorSpace;
  trophyGold.bumpMap = trophyGrain.texture;
  trophyGold.bumpScale = 0.0015;
  const trophyStone = canvasTexture(256, 256);
  runtime.core.track(trophyStone.texture);
  drawTrophyStone(trophyStone.ctx, 256, 256);
  const trophyBaseMat = runtime.core.toon("#ffffff");
  trophyBaseMat.map = trophyStone.texture;
  const trophyProfile = [[0, 0.52], [0.12, 0.53], [0.24, 0.65], [0.34, 0.87], [0.37, 1.12], [0.32, 1.12], [0.3, 0.9], [0.2, 0.71], [0.08, 0.65], [0, 0.65]].map(([r, y]) => new THREE.Vector2(r, y));
  // A hollow bowl, rounded rim and continuous loop handles sit on a separate stem.
  const cup = runtime.core.mesh(new THREE.LatheGeometry(trophyProfile, 40), trophyGold, { outline: 0.012 });
  // While the trophy celebrates, its glow lights the shelf around it
  const trophyLight = runtime.room.neonLight("#ffc94d", 3, () => trophyGold.emissive.r / 0.6, { distance: 3 });
  trophyLight.position.set(0, 0.9, 0.4);
  cup.add(trophyLight);
  // The plate on its plinth keeps score of the room's secrets found so far
  const trophyPlate = runtime.core.printed(0.4, 0.13, 700, (c, w, h) => {
    drawBrushedMetal(c, w, h);
    c.fillStyle = "rgba(255,193,40,.6)";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#8a6416";
    c.lineWidth = h * 0.08;
    c.strokeRect(0, 0, w, h);
    c.fillStyle = "#1a1714";
    c.font = `900 ${Math.round(h * 0.62)}px 'Lexend Mega', sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(`${runtime.secrets.secretsFound.size}/${runtime.secrets.SECRETS.length}`, w / 2, h * 0.55);
  });
  trophyPlate.position.set(0, 0.11, 0.252);
  const trophy = runtime.shelf.group(
    runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.62, 0.22, 0.5, 0.035), trophyBaseMat, { outline: 0.016 }), 0, 0.11, 0), trophyPlate, cup,
    runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.53, 0.04, 0.42, 0.02), trophyGold, { outline: 0.008 }), 0, 0.24, 0),
    runtime.core.mesh(new THREE.LatheGeometry([[0, 0.26], [0.14, 0.26], [0.15, 0.28],
      [0.1, 0.31], [0.063, 0.36], [0.052, 0.43], [0.075, 0.5], [0.12, 0.53]]
      .map(([r, y]) => new THREE.Vector2(r, y)), 32), trophyGold, { outline: 0.008 }),
  );
  // Turned collars and a stepped foot give the stem a machined silhouette.
  [[0.28, 0.145, 0.012], [0.32, 0.092, 0.009], [0.49, 0.082, 0.009],
    [0.59, 0.19, 0.01], [1.07, 0.365, 0.009]].forEach(([y, radius, thickness]) => {
    const collar = runtime.core.mesh(new THREE.TorusGeometry(radius, thickness, 6, 40), trophyGold, { outline: 0 });
    collar.rotation.x = Math.PI / 2;
    collar.position.y = y;
    trophy.add(collar);
  });
  trophy.add(runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.65, 0.035, 0.53, 0.012), trophyBaseMat, { outline: 0.006 }), 0, 0.02, 0));
  // Four small recessed plaque fasteners sit clear of the live score.
  const trophyScrewGeo = runtime.core.track(new THREE.SphereGeometry(0.009, 8, 6));
  [-1, 1].forEach((x) => [-1, 1].forEach((y) => {
    const screw = new THREE.Mesh(trophyScrewGeo, trophyGold);
    screw.scale.z = 0.4;
    screw.position.set(x * 0.177, 0.11 + y * 0.043, 0.257);
    trophy.add(screw);
  }));
  const trophyRim = runtime.core.mesh(new THREE.TorusGeometry(0.345, 0.025, 10, 40), trophyGold, { outline: 0 });
  trophyRim.rotation.x = Math.PI / 2;
  trophyRim.position.y = 1.12;
  trophy.add(trophyRim);
  [-1, 1].forEach((side) => {
    const path = new THREE.CatmullRomCurve3([[0.34, 1.04], [0.49, 1.02], [0.51, 0.85], [0.42, 0.71], [0.29, 0.74]].map(([x, y]) => new THREE.Vector3(side * x, y, 0)));
    trophy.add(runtime.core.mesh(new THREE.TubeGeometry(path, 24, 0.027, 10, false), trophyGold, { outline: 0.008 }));
  });
  // A raised medallion with an engraved laurel wreath around the original star.
  const trophyMedal = runtime.core.mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.014, 32), trophyGold, { outline: 0.005 });
  trophyMedal.rotation.x = Math.PI / 2;
  trophyMedal.position.set(0, 0.9, 0.346);
  trophy.add(trophyMedal);
  const trophyStar = runtime.core.printed(0.23, 0.23, 700, (c, w, h) => {
    c.strokeStyle = "#89601f";
    c.lineWidth = w * 0.018;
    c.beginPath();
    c.arc(w / 2, h / 2, w * 0.46, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "#89601f";
    for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
      const angle = side * (0.35 + i * 0.38);
      c.beginPath();
      c.ellipse(w * 0.5 + Math.sin(angle) * w * 0.33, h * 0.5 + Math.cos(angle) * h * 0.33,
        w * 0.035, h * 0.075, -angle + side * 0.55, 0, Math.PI * 2);
      c.fill();
    }
    c.font = `900 ${w * 0.52}px sans-serif`;
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("★", w / 2, h * 0.5);
  });
  trophyStar.material.transparent = true;
  trophyStar.material.alphaTest = 0.1;
  trophyStar.position.set(0, 0.9, 0.356);
  trophy.add(trophyStar);
  runtime.shelf.addItem(runtime.core.at(trophy, 0.55, runtime.shelf.standOn(1), 0.15), "trophy");
  // End shelf collectibles.

  // Public state used by the other scene parts.
  return {
    trophyPlate,
    trophy,
    get trophyCelebrating() { return trophyCelebrating; },
    set trophyCelebrating(value) { trophyCelebrating = value; },
    trophyHalo,
    trophyGold,
    get trophyCelebration() { return trophyCelebration; },
    set trophyCelebration(value) { trophyCelebration = value; },
    rubikItem,
    playRubik,
    nudgeManga,
    get rubikBusy() { return rubikBusy; },
  };
}
