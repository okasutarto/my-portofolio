// Run: node scripts/check-desk-console.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const THREE = require('three');
(async () => {
  const { RoundedBoxGeometry } = await import('three/examples/jsm/geometries/RoundedBoxGeometry.js');
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/components/features/desk/deskScene.js'), 'utf8');
  const items = [];
  const shelf = new THREE.Group();
  const toon = (color) => new THREE.MeshToonMaterial({ color });
  const at = (obj, x, y, z = 0, rz = 0) => { obj.position.set(x, y, z); obj.rotation.z = rz; return obj; };
  const group = (...objects) => { const g = new THREE.Group(); g.add(...objects); return g; };
  const model = vm.runInNewContext(source.slice(source.indexOf('  // Level 0: a PS5 Pro'), source.indexOf('  // A hardback,')) + '; ({ ps5, consoleBody, pad1, pad2, led })', {
    THREE, toon, at, group, shelf, printed: (w,h) => new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial()), black: toon('#1a1714'), white: toon('#fffdf5'), shelfMat: toon('#f3d3b0'),
    track: (value) => value, mesh: (geometry, material) => new THREE.Mesh(geometry, material),
    neonLight: (color, intensity) => new THREE.PointLight(color, intensity),
    canvasTexture: () => ({ ctx: {}, texture: new THREE.Texture() }), drawSatinFinish() {}, drawLeatherGrain() {},
    rbox: (w, h, d, r = 0.08) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w,h,d)/2 - 1e-3)),
    standOn: () => 0,
    addItem: (obj, sound) => { shelf.add(obj); items.push({obj, sound}); return obj; },
  });
  shelf.updateMatrixWorld(true);
  const bounds = (obj) => new THREE.Box3().setFromObject(obj);
  const consoleBox = bounds(model.ps5);
  assert.ok(Math.abs(consoleBox.min.y) < 0.005, 'console foot must rest on the shelf');
  const body = bounds(model.consoleBody);
  assert.ok(body.min.y > 0.05 && body.min.y < 0.075, 'standing console sits on its foot');
  assert.ok(body.max.y - body.min.y > body.max.x - body.min.x, 'console stands on its end');
  assert.ok(consoleBox.max.x < bounds(model.pad1).min.x, 'PS5 clears the first controller stand');
  assert.ok(bounds(model.pad1).max.x < bounds(model.pad2).min.x, 'controller stands sit side by side');
  for (const { obj } of items) {
    const box = bounds(obj);
    assert.ok(box.min.x > -1.99 && box.max.x < 1.99, 'props fit between shelf sides');
    assert.ok(box.min.y >= -0.005 && box.max.y < 1.88, 'props clear the shelf above');
    assert.ok(box.min.z > -0.75 && box.max.z < 0.75, 'props remain on the shelf');
  }
  const padBody = model.pad2.children[1].children[0];
  assert.equal(padBody.material.color.getHexString(), 'fffdf5', 'second controller is white');
  const darkPadBody = model.pad1.children[1].children[0];
  assert.equal(darkPadBody.material.color.getHexString(), '1a1714', 'first controller is black');
  assert.ok(darkPadBody.material.map && padBody.material.map, 'both controllers have a textured shell');
  for (const modelPad of [model.pad1, model.pad2]) {
    assert.ok(modelPad.children[1].children.every((part) => part.geometry?.type !== 'ShapeGeometry'),
      'controller handles remain continuous plastic without applied grip patches');
  }
  assert.ok(darkPadBody.material.emissiveIntensity > 0 && darkPadBody.material.emissiveIntensity < 0.2,
    'a small material fill keeps the black shell visible in shelf shadows');
  const face = new THREE.Vector3(0, 1, 0).applyQuaternion(model.pad2.children[1].getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(face.z > 0.75, 'controls face the visitor on their stand');
  assert.equal(model.pad1.userData.moves, model.pad1.children[1], 'a click moves the pad, not its stand');
  assert.deepEqual(items.slice(0, 3).map(({sound}) => sound), ['console','controller','controller'], 'console and controllers keep their interactions');
  const trophyModel = vm.runInNewContext(source.slice(source.indexOf('  const trophyGold ='), source.indexOf('  const handheld =')) + '; ({ trophy, cup })', {
    THREE, toon, at, group, black: toon('#171717'),
    track: value => value, canvasTexture: () => ({ texture: new THREE.Texture(), ctx: {} }),
    drawTrophyMetal() {}, drawTrophyStone() {}, drawSatinFinish() {},
    neonLight: (color, intensity) => new THREE.PointLight(color, intensity),
    mesh: (geometry, material) => new THREE.Mesh(geometry, material),
    rbox: (w,h,d) => new THREE.BoxGeometry(w,h,d),
    printed: (w,h) => new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial()),
    standOn: () => 0, addItem: (obj) => obj,
  });
  const trophyBox = bounds(trophyModel.trophy);
  assert.ok(trophyBox.max.y < 1.8 && trophyBox.min.y >= -0.001, 'trophy fits its shelf bay');
  const rim = trophyModel.cup.geometry.parameters.points.filter((point) => point.y === 1.12);
  assert.equal(rim.length, 2, 'cup has distinct inner and outer rim walls');
  assert.ok(rim[0].x > rim[1].x, 'cup wall has positive thickness');
  assert.equal(trophyModel.trophy.children.filter((obj) => obj.geometry?.type === 'TubeGeometry').length, 2, 'two continuous handle curves');
  console.log('Standing PS5, controller stands, shelf clearance and interaction checks passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });

// Console activation dismisses old speech, then opens the game without creating a new bubble.
{
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/components/features/desk/deskScene.js'), 'utf8');
  const callbacks = [];
  let hidden = 0;
  let destination;
  let app;
  const ctx = vm.createContext({
    discover() {}, sfx: { power() {} }, led: { material: { color: { set() {} } }, children: [] }, pad1: { userData: { moves: { rotation: {} } } }, pad2: { userData: { moves: { rotation: {} } } }, setNeon() {},
    gsap: { fromTo() {} }, shelfBubble: { hide() { hidden++; } }, shelfSay() { throw new Error('console must not show a bubble'); },
    timers: [], setTimeout(fn) { callbacks.push(fn); return callbacks.length; },
    setFocus: (name) => { destination = name; }, desktop: { playConsole: () => { app = 'console'; } }, redrawScreen() {},
  });
  vm.runInContext(source.slice(source.indexOf('  function powerConsole()'), source.indexOf('  function buzzController(')) + '; powerConsole();', ctx);
  while (callbacks.length) callbacks.shift()();
  assert.equal(hidden, 1);
  assert.equal(destination, 'monitor');
  assert.equal(app, 'console');
}
