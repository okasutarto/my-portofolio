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
  const model = vm.runInNewContext(source.slice(source.indexOf('  // Level 0: thin PS5 shells'), source.indexOf('  // A hardback,')) + '; ({ consoleBody, pad1, pad2, holder, led })', {
    THREE, toon, at, group, shelf, printed: (w,h) => new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial()), black: toon('#1a1714'), white: toon('#fffdf5'), shelfMat: toon('#f3d3b0'),
    track: (value) => value, mesh: (geometry, material) => new THREE.Mesh(geometry, material),
    rbox: (w, h, d, r = 0.08) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w,h,d)/2 - 1e-3)),
    standOn: () => 0,
    addItem: (obj, sound) => { shelf.add(obj); items.push({obj, sound}); return obj; },
  });
  shelf.updateMatrixWorld(true);
  const bounds = (obj) => new THREE.Box3().setFromObject(obj);
  const consoleBox = bounds(model.consoleBody);
  const holderBox = bounds(model.holder);
  assert.ok(Math.abs(consoleBox.min.y) < 0.005, 'console feet must rest on the shelf');
  assert.ok(consoleBox.max.x < holderBox.min.x, 'PS5 must clear the wooden holder');
  for (const obj of Object.values(model).filter((obj) => obj !== model.led)) {
    const box = bounds(obj);
    assert.ok(box.min.x > -1.99 && box.max.x < 1.99, 'props fit between shelf sides');
    assert.ok(box.min.y >= -0.005 && box.max.y < 1.88, 'props clear the shelf above');
    assert.ok(box.min.z > -0.75 && box.max.z < 0.75, 'props remain on the shelf');
  }
  assert.equal(model.pad2.children[0].material.color.getHexString(), 'fffdf5', 'upper controller is white');
  assert.ok(new THREE.Vector3(0,1,0).applyEuler(model.pad2.rotation).z > 0.95, 'controls face the visitor on their holder');
  assert.ok(bounds(model.pad2).min.y > bounds(model.pad1).max.y, 'controllers occupy separate tiers');
  assert.deepEqual(items.map(({sound}) => sound), ['console','controller','controller'], 'all three props retain their interactions');
  const trophyModel = vm.runInNewContext(source.slice(source.indexOf('  const trophyGold ='), source.indexOf('  const handheld =')) + '; ({ trophy, cup })', {
    THREE, toon, at, group, black: toon('#171717'),
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
  console.log('PS5 placement, holder clearance, controller tiers and interaction checks passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });

// Console activation dismisses old speech, then opens the game without creating a new bubble.
{
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/components/features/desk/deskScene.js'), 'utf8');
  const callbacks = [];
  let hidden = 0;
  let destination;
  let app;
  const ctx = vm.createContext({
    discover() {}, sfx: { power() {} }, led: { material: { color: { set() {} } }, scale: {} }, pad1: { rotation: {} }, pad2: { rotation: {} },
    gsap: { fromTo() {} }, shelfBubble: { hide() { hidden++; } }, shelfSay() { throw new Error('console must not show a bubble'); },
    timers: [], setTimeout(fn) { callbacks.push(fn); return callbacks.length; },
    setFocus: (name) => { destination = name; }, desktop: { launch: (name) => { app = name; } }, redrawScreen() {},
  });
  vm.runInContext(source.slice(source.indexOf('  function powerConsole()'), source.indexOf('  function buzzController(')) + '; powerConsole();', ctx);
  while (callbacks.length) callbacks.shift()();
  assert.equal(hidden, 1);
  assert.equal(destination, 'monitor');
  assert.equal(app, 'snake');
}
