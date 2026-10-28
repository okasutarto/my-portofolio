import * as THREE from "three";
import gsap from "gsap";
import { sfx } from "@/composables/useSfx";
import { canvasTexture, drawGuitarTop } from "../textures";

export function createGuitar(runtime) {
  // A guitar hanging on the left wall from a hook under its headstock. Click it for a strum;
  // it swings on the hook. Built standing up in its own plane, then turned to face the room.
  const guitar = new THREE.Group();
  guitar.position.set(runtime.room.SIDE_X + 0.38, 2.9, 5.3);
  guitar.rotation.y = Math.PI / 2;
  runtime.room.room.add(guitar);
  const HOOK_Y = 3.98;
  const guitarSwing = new THREE.Group();
  guitarSwing.position.y = HOOK_Y;
  guitar.add(guitarSwing);
  const guitarParts = new THREE.Group();
  guitarParts.position.y = -HOOK_Y;
  guitarSwing.add(guitarParts);
  // Body outline: a big lower bout and a smaller upper one, pinched at the waist
  const bodyShape = new THREE.Shape();
  const halfWidth = (y) => {
    const lower = Math.abs(y) <= 0.95 ? Math.sqrt(0.95 ** 2 - y ** 2) : 0;
    const upper = Math.abs(y - 1.2) <= 0.72 ? Math.sqrt(0.72 ** 2 - (y - 1.2) ** 2) : 0;
    return Math.max(lower, upper) * (1 - 0.1 * Math.exp(-(((y - 0.75) / 0.25) ** 2)));
  };
  const outlineYs = Array.from({ length: 41 }, (_, k) => -0.95 + (k / 40) * 2.87);
  outlineYs.forEach((y, k) => (k ? bodyShape.lineTo(halfWidth(y), y) : bodyShape.moveTo(halfWidth(y), y)));
  [...outlineYs].reverse().forEach((y) => bodyShape.lineTo(-halfWidth(y), y));
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
  bodyGeo.translate(0, 0, -0.16);
  // The top carries the printed face (sunburst, grain, pickguard, rosette, binding), mapped in
  // the outline's own units; the sides and back are plain
  const guitarTop = canvasTexture(512, 740);
  runtime.core.track(guitarTop.texture);
  drawGuitarTop(guitarTop.ctx, 512, 740, { halfWidth });
  guitarTop.texture.repeat.set(0.5, 1 / 2.87);
  guitarTop.texture.offset.set(0.5, 0.95 / 2.87);
  const guitarTopMat = runtime.core.toon("#ffffff");
  guitarTopMat.map = guitarTop.texture;
  const guitarBody = runtime.core.mesh(bodyGeo, [guitarTopMat, runtime.core.toon("#1a1714")], { outline: 0.04 });
  const flat = (geo, color, x, y, z) => {
    const m = new THREE.Mesh(runtime.core.track(geo), runtime.core.track(new THREE.MeshBasicMaterial({ color })));
    m.position.set(x, y, z);
    return m;
  };
  const soundHole = flat(new THREE.CircleGeometry(0.3, 40), "#1a1714", 0, 1.15, 0.195);
  const bridge = runtime.core.mesh(runtime.core.rbox(0.7, 0.14, 0.05, 0.02), runtime.core.toon("#4a2f1f"), { outline: 0.02 });
  bridge.position.set(0, -0.15, 0.21);
  const guitarNeck = runtime.core.mesh(runtime.core.rbox(0.26, 2.3, 0.14, 0.04), runtime.core.toon("#1a1714"), { outline: 0.03 });
  guitarNeck.position.set(0, 2.85, 0.06);
  const fretboard = flat(new THREE.PlaneGeometry(0.24, 2.3), "#2b2b2b", 0, 2.85, 0.135);
  const fretY = (k) => 3.95 - k * 0.24 * (1 - k * 0.03);
  const frets = Array.from({ length: 9 }, (_, k) => flat(new THREE.PlaneGeometry(0.24, 0.02), "#d9d4c7", 0, fretY(k), 0.137));
  // Cream inlay dots on the 3rd, 5th and 7th frets
  const inlays = [2, 4, 6].map((k) => flat(new THREE.CircleGeometry(0.035, 16), "#f1e6cf", 0, (fretY(k) + fretY(k + 1)) / 2, 0.138));
  // The headstock: flared from the nut to a crowned top with a dip in the middle, a cream nut,
  // a black truss-rod cover, a star sticker, three tuners a side (gear housings and cream keys
  // out the edges, string posts through the face) and the strings running from the nut to them
  const headShape = new THREE.Shape();
  headShape.moveTo(-0.15, 0);
  headShape.lineTo(-0.24, 0.62);
  headShape.quadraticCurveTo(-0.25, 0.72, -0.15, 0.73);
  headShape.quadraticCurveTo(-0.06, 0.73, 0, 0.67);
  headShape.quadraticCurveTo(0.06, 0.73, 0.15, 0.73);
  headShape.quadraticCurveTo(0.25, 0.72, 0.24, 0.62);
  headShape.lineTo(0.15, 0);
  headShape.closePath();
  const headGeo = new THREE.ExtrudeGeometry(headShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
  const headstock = runtime.core.mesh(headGeo, runtime.core.toon("#6b4428"), { outline: 0.03 });
  headstock.position.set(0, 3.98, 0);
  const HEAD_FACE = 0.092;
  const nut = runtime.core.mesh(runtime.core.rbox(0.27, 0.035, 0.05, 0.01), runtime.core.toon("#fffdf5"), { outline: 0.01 });
  nut.position.set(0, 4.0, 0.14);
  const trussCover = runtime.core.mesh(runtime.core.rbox(0.1, 0.12, 0.012, 0.03), runtime.core.toon("#1a1714"), { outline: 0.008, cast: false });
  trussCover.position.set(0, 4.1, HEAD_FACE + 0.006);
  const headStar = runtime.core.printed(0.16, 0.16, 800, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const star = (dx) => {
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = (i % 2 ? 0.2 : 0.45) * w;
        const t = (i / 10) * Math.PI * 2 - Math.PI / 2;
        c.lineTo(w / 2 + dx + Math.cos(t) * r, h / 2 + dx + Math.sin(t) * r);
      }
      c.closePath();
    };
    star(w * 0.05);
    c.fillStyle = "#000";
    c.fill();
    star(0);
    c.fillStyle = "#ffdd00";
    c.fill();
    c.lineWidth = w * 0.05;
    c.stroke();
  });
  headStar.material.transparent = true;
  headStar.material.alphaTest = 0.1;
  headStar.position.set(0, 4.6, HEAD_FACE + 0.004);
  const pegMat = runtime.core.toon("#d9d4c7");
  const metal = runtime.core.toon("#b8bec7");
  const pegs = [];
  const posts = [];
  const strings = [];
  const stringMat = runtime.core.toon("#b8bec7");
  [-1, 1].forEach((side) => [0, 1, 2].forEach((k) => {
    const y = 4.22 + k * 0.17;
    const edge = 0.2 + k * 0.02;
    // the gear housing on the back edge, and the key sticking out the side
    const housing = runtime.core.mesh(runtime.core.rbox(0.08, 0.1, 0.07, 0.02), metal, { outline: 0.01, cast: false });
    housing.position.set(side * (edge + 0.03), y, 0.02);
    const shaft = runtime.core.mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.08, 8), metal, { outline: 0.006, cast: false });
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(side * (edge + 0.1), y, 0.02);
    const key = runtime.core.mesh(new THREE.SphereGeometry(0.06, 12, 8), pegMat, { outline: 0.012, cast: false });
    key.scale.set(0.45, 1, 0.8);
    key.position.set(side * (edge + 0.16), y, 0.02);
    pegs.push(housing, shaft, key);
    // the string post on the face, and the string from the nut to it
    const postAt = new THREE.Vector3(side * (edge - 0.07), y, HEAD_FACE + 0.035);
    const post = runtime.core.mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.06, 10), metal, { outline: 0.006, cast: false });
    post.rotation.x = Math.PI / 2;
    post.position.copy(postAt);
    posts.push(post);
    const s = 3 + side * (k + 1) - (side > 0 ? 1 : 0);
    const from = new THREE.Vector3(-0.085 + s * 0.034, 4.0, 0.23);
    const dir = postAt.clone().sub(from);
    const run = new THREE.Mesh(runtime.core.track(new THREE.BoxGeometry(0.008, dir.length(), 0.008)), stringMat);
    run.position.copy(from).addScaledVector(dir, 0.5);
    run.quaternion.setFromUnitVectors(runtime.core.UP, dir.normalize());
    strings.push(run);
  }));
  const stringGeo = runtime.core.track(new THREE.BoxGeometry(0.008, 4.15, 0.008, 1, 16, 1));
  strings.push(...Array.from({ length: 6 }, (_, k) => {
    const str = new THREE.Mesh(stringGeo, stringMat);
    str.position.set(-0.085 + k * 0.034, 1.925, 0.23);
    return str;
  }));
  // On the bridge, a bone saddle the strings break over and a cream pin for each string behind
  // it; a strap button at the foot of the body; and a yellow pick tucked under the strings
  // up by the nut, ready to hand
  const saddle = runtime.core.mesh(runtime.core.rbox(0.3, 0.025, 0.03, 0.008), runtime.core.toon("#fffdf5"), { outline: 0.008, cast: false });
  saddle.position.set(0, -0.11, 0.245);
  const bridgePins = Array.from({ length: 6 }, (_, k) => flat(new THREE.CircleGeometry(0.014, 12), "#f1e6cf", -0.085 + k * 0.034, -0.19, 0.237));
  const strapButton = runtime.core.mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.07, 14), runtime.core.toon("#f1e6cf"), { outline: 0.01, cast: false });
  strapButton.position.set(0, -1.0, 0);
  const pickShape = new THREE.Shape();
  pickShape.moveTo(0, -0.07);
  pickShape.quadraticCurveTo(0.075, 0.02, 0.06, 0.055);
  pickShape.quadraticCurveTo(0, 0.08, -0.06, 0.055);
  pickShape.quadraticCurveTo(-0.075, 0.02, 0, -0.07);
  const guitarPick = runtime.core.mesh(new THREE.ShapeGeometry(pickShape, 8), runtime.core.toon("#ffdd00"), { outline: 0.01, cast: false });
  guitarPick.position.set(0.03, 3.62, 0.215);
  guitarPick.rotation.z = -0.35;
  // A woven strap, tied on behind the nut and run down to the strap button, hanging slack in a
  // loop beside the body: red with yellow and teal bands woven down its length
  const guitarStrapTex = canvasTexture(64, 16);
  runtime.core.track(guitarStrapTex.texture);
  [["#d62828", 0, 64], ["#ffdd00", 6, 4], ["#00a99d", 14, 6], ["#ffdd00", 24, 4], ["#fffdf5", 40, 3], ["#00a99d", 50, 6]].forEach(([color, x, w]) => {
    guitarStrapTex.ctx.fillStyle = color;
    guitarStrapTex.ctx.fillRect(x, 0, w, 16);
  });
  guitarStrapTex.ctx.fillStyle = "rgba(0,0,0,.18)";
  for (let y = 0; y < 16; y += 4) guitarStrapTex.ctx.fillRect(0, y, 64, 1);
  guitarStrapTex.texture.wrapS = THREE.RepeatWrapping;
  const guitarStrapPath = new THREE.CatmullRomCurve3([
    [-0.1, 3.94, -0.06], [-0.32, 3.4, -0.1], [-0.62, 2.4, -0.12], [-1.05, 1.0, -0.12],
    [-1.12, -0.2, -0.12], [-0.85, -0.95, -0.1], [-0.35, -1.12, -0.06], [0, -1.02, 0],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  guitarStrapTex.texture.repeat.set(Math.round(guitarStrapPath.getLength() / 0.9), 1);
  const guitarStrapMat = runtime.core.toon("#ffffff");
  guitarStrapMat.map = guitarStrapTex.texture;
  const guitarStrap = runtime.core.mesh(new THREE.TubeGeometry(guitarStrapPath, 80, 0.06, 6), guitarStrapMat, { outline: 0.015, cast: false });
  // flattened into a band lying against the wall
  guitarStrap.scale.z = 0.35;
  guitarParts.add(guitarBody, soundHole, bridge, saddle, guitarStrap, ...bridgePins, strapButton, guitarNeck, fretboard, ...frets, ...inlays, headstock, nut, trussCover, headStar, ...pegs, ...posts, ...strings, guitarPick);
  // The hook: a plate on the wall and two arms the headstock rests on
  const hookMat = runtime.core.toon("#1a1714");
  const hookPlate = runtime.core.mesh(runtime.core.rbox(0.34, 0.5, 0.06, 0.02), hookMat, { outline: 0.02 });
  hookPlate.position.set(0, HOOK_Y, -0.23);
  guitar.add(hookPlate);
  [-0.2, 0.2].forEach((x) => {
    guitar.add(runtime.core.rod(new THREE.Vector3(x, HOOK_Y, -0.22), new THREE.Vector3(x, HOOK_Y, 0.12), 0.03, hookMat, 0.015));
    guitar.add(runtime.core.rod(new THREE.Vector3(x, HOOK_Y, 0.12), new THREE.Vector3(x, HOOK_Y + 0.12, 0.15), 0.03, hookMat, 0.015));
  });
  const stringRestColor = stringMat.color.clone();
  const stringRestPositions = stringGeo.attributes.position.array.slice();
  const stringVibration = { strength: 0, phase: 0 };
  const updateGuitarStrings = () => {
    const positions = stringGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = stringRestPositions[i * 3 + 1];
      // Both ends stay on the nut and bridge; only the middle of the strings moves.
      const envelope = Math.sin(Math.PI * (y / 4.15 + 0.5));
      positions.setX(i, stringRestPositions[i * 3] + envelope * Math.sin(stringVibration.phase) * stringVibration.strength);
    }
    positions.needsUpdate = true;
  };
  let guitarBusy = false;
  runtime.core.register(guitarSwing, {
    onHover: (on) => {
      if (guitarBusy) return;
      gsap.to(guitarSwing.rotation, { z: on ? 0.075 : 0, duration: on ? 0.35 : 0.8, ease: on ? "back.out(1.8)" : "elastic.out(1, 0.5)", overwrite: true });
      gsap.to(stringMat.color, { r: on ? 1 : stringRestColor.r, g: on ? 0.95 : stringRestColor.g, b: on ? 0.65 : stringRestColor.b, duration: 0.25, overwrite: true });
      if (on) gsap.fromTo(stringVibration, { strength: 0.014, phase: 0 }, { strength: 0, phase: Math.PI * 14, duration: 0.8, ease: "power1.out", onUpdate: updateGuitarStrings, overwrite: true });
      else gsap.to(stringVibration, { strength: 0, duration: 0.2, onUpdate: updateGuitarStrings, overwrite: true });
    },
    onClick: () => {
      if (guitarBusy) return;
      guitarBusy = true;
      sfx.strum();
      runtime.secrets.discover("guitar");
      gsap.fromTo(guitarSwing.rotation, { z: 0.09 * (Math.random() < 0.5 ? -1 : 1) }, { z: 0, duration: 1.6, ease: "elastic.out(1, 0.25)", overwrite: true, onComplete: () => (guitarBusy = false) });
      // The strings shimmer for a moment
      gsap.fromTo(stringMat.color, { r: 1, g: 0.87, b: 0 }, { r: stringRestColor.r, g: stringRestColor.g, b: stringRestColor.b, duration: 1.2, ease: "power2.out", overwrite: true });
      gsap.fromTo(stringVibration, { strength: 0.025, phase: 0 }, { strength: 0, phase: Math.PI * 28, duration: 1.2, onUpdate: updateGuitarStrings, overwrite: true });
    },
  });

  // Public state used by the other scene parts.
  return {
    guitarSwing,
    guitar,
    stringVibration,
    stringMat,
  };
}
