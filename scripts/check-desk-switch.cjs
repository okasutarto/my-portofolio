// Run: node scripts/check-desk-switch.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const THREE = require('three');
const source = fs.readFileSync(`${__dirname}/../src/components/features/desk/deskScene.js`, 'utf8');
const legends = [];
const ctx = new Proxy({}, {
  get: (_, key) => (...args) => {
    args.filter(value => typeof value === 'number').forEach(value => assert.ok(Number.isFinite(value)));
    if (key === 'fillText') legends.push(args[0]);
  }, set: () => true,
});
const at = (object, x, y, z = 0) => { object.position.set(x, y, z); return object; };
const moves = [];
const timeline = { to(target, values) { moves.push({ target, values }); return this; }, fromTo() { return this; } };
const model = vm.runInNewContext(source.slice(source.indexOf('  // Clean matte plastic'), source.indexOf('  // ---------- the Infinity Gauntlet')) + '; ({ leftCon, rightCon, switchConsole, switchScreen, nintendoSwitch, joyConsOff })', {
  THREE, at, track: value => value,
  toon: color => new THREE.MeshToonMaterial({ color }), black: new THREE.MeshToonMaterial({ color: '#171717' }),
  mesh: (geometry, material) => new THREE.Mesh(geometry, material),
  rbox: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  phoneSlab: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  group: (...objects) => new THREE.Group().add(...objects),
  canvasTexture: () => ({ texture: new THREE.Texture(), ctx }), drawSatinFinish() {},
  printed: (w, h, px, draw) => {
    // Only the controller legends are drawn here; the existing screen callback stays untouched.
    if (w === 0.16) draw(ctx, w * px, h * px);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial());
  },
  standOn: () => 0, addItem: value => value,
  gsap: { timeline: () => timeline }, sfx: { slide() {}, click() {} }, shelfSay() {},
});
for (const con of [model.leftCon, model.rightCon]) {
  const shell = con.children[0];
  assert.equal(shell.geometry.type, 'ExtrudeGeometry', 'Joy-Con has an asymmetric curved shell');
  assert.equal(shell.material.map, null, 'clean plastic has no speckled colour texture');
  const points = shell.geometry.parameters.shapes.getPoints();
  assert.ok(points.length > 20, 'outer corners are smooth curves');
}
assert.deepEqual(legends.slice(4), ['X', 'B', 'A', 'Y'], 'right controller uses reference ABXY positions');
assert.deepEqual(legends.slice(0, 4), ['▴', '▾', '▸', '◂'], 'left controller has four direction buttons');
assert.equal(model.switchScreen.geometry.parameters.width, 0.98);
assert.equal(model.switchScreen.geometry.parameters.height, 0.55);
model.nintendoSwitch.updateMatrixWorld(true);
const bounds = new THREE.Box3().setFromObject(model.nintendoSwitch);
assert.ok(bounds.min.toArray().every(Number.isFinite) && bounds.max.toArray().every(Number.isFinite));
assert.ok(bounds.max.y < 0.95 && bounds.min.y >= -0.001, 'console still fits on its stand');
model.joyConsOff();
for (const [con, side] of [[model.leftCon, -1], [model.rightCon, 1]]) {
  const endpoints = moves.filter(move => move.target === con.position);
  assert.equal(endpoints.at(-1).values.x, side * 0.68, 'detached controllers return flush to tablet');
}
console.log('Switch curved shells, clean matte plastic, control layout, screen dimensions and detachment return passed.');
