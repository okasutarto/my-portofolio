// Run: node scripts/check-desk-cat-shelf-hover.cjs
const assert = require('node:assert/strict');
const vm = require('node:vm');
const THREE = require('three');
const source = require('./helpers/desk-source.cjs').readDeskSource();
const section = (a, b) => source.slice(source.indexOf(a), source.indexOf(b, source.indexOf(a)));
const shelf = new THREE.Group();
shelf.position.set(10.5, -5.2, -3.75);
const names = ['ps5', 'pad1', 'pad2', 'robot', 'rubikItem', 'trophy', 'nintendoSwitch', 'book', 'gameCase', 'figure', 'handheld'];
const sounds = ['console', 'controller', 'controller', 'robot', 'rubik', 'trophy', 'switch', 'book', 'case', 'figure', 'console'];
const objects = Object.fromEntries(names.map((name, i) => {
  const object = new THREE.Group();
  object.position.set(i * 0.1, 1 + i * 0.2, 0.15);
  shelf.add(object);
  return [name, object];
}));
for (const name of ['pad1', 'pad2']) {
  const pad = new THREE.Group(); pad.position.set(0, 0.37, 0.04);
  objects[name].add(pad); objects[name].userData.moves = pad;
}
const switchConsole = new THREE.Group(); switchConsole.position.set(0, 0.46, 0.04); objects.nintendoSwitch.add(switchConsole);
const shelfItems = names.map((name, i) => ({ obj: objects[name], sound: sounds[i] }));
const positions = shelfItems.map(({ obj }) => obj.getWorldPosition(new THREE.Vector3()));
const local = shelfItems.map(({ obj }) => obj.position.clone());
const handlers = new Map();
let clickHit;
const interactive = new Map([[shelf, { onClick: (hit) => { clickHit = hit; } }]]);
const context = vm.createContext({
  THREE, shelfItems, ...objects, switchConsole, shelf, interactive,
  trophyCelebrating: false, botBusy: false, rubikBusy: false, switchBusy: false,
  gsap: { to: (target, values) => { for (const axis of ['x', 'y', 'z']) if (axis in values) target[axis] = values[axis]; } },
  register: (object, handler) => handlers.set(object, handler),
});
vm.runInContext(section('  const shelfHoverCarriers =', '  // ---------- gym corner:'), context);
assert.equal(handlers.size, shelfItems.length, 'every shelf item is individually interactive');
shelfItems.forEach(({ obj }, i) => {
  const handler = handlers.get(obj);
  assert.equal(handler.focus, 'shelf');
  assert.equal(handler.item, true);
  assert.ok(obj.getWorldPosition(new THREE.Vector3()).distanceTo(positions[i]) < 1e-9, 'wrapping preserves resting world position');
  handler.onHover(true);
  assert.ok(obj.position.equals(local[i]), 'hover preserves click animation coordinates');
  handler.onHover(false);
  assert.ok(obj.getWorldPosition(new THREE.Vector3()).distanceTo(positions[i]) < 1e-9, 'leave restores world position');
  const hit = { object: obj }; handler.onClick(hit); assert.equal(clickHit, hit, 'click reaches existing shelf action');
});
context.trophyCelebrating = true;
handlers.get(objects.trophy).onHover(true);
assert.ok(objects.trophy.parent.position.length() === 0, 'celebration owns trophy movement');

const cat = new THREE.Group();
cat.scale.setScalar(0.85); cat.rotation.y = 1.2;
const catBody = new THREE.Group(); catBody.position.y = 0.5; catBody.scale.y = 0.85;
const catHead = new THREE.Group();
cat.add(catBody, catHead);
const catChest = { visible: true };
const neck = vm.runInNewContext(section('  const catNeck =', '  // Tail: wrapped') + '; ({ catNeck, updateCatNeck })', {
  THREE, cat, catBody, catHead, catChest, UP: new THREE.Vector3(0, 1, 0), fur: new THREE.MeshBasicMaterial(),
  mesh: (geo, mat) => new THREE.Mesh(geo, mat),
});
const model = new THREE.Group(); model.add(...cat.children); cat.add(model);
for (const yaw of [-0.35, 0.35, 1.05]) for (const pitch of [-0.55, 0, 0.2]) {
  catHead.position.set(1.25, 1.63, 0); catHead.rotation.set(pitch, yaw, 0, 'YXZ');
  neck.updateCatNeck();
  const shoulder = catBody.localToWorld(new THREE.Vector3(0.72, 0.78, 0));
  const skullBase = catHead.localToWorld(new THREE.Vector3(0, -0.24, -0.1));
  for (const point of [shoulder, skullBase]) assert.ok(neck.catNeck.worldToLocal(point).length() < 1, 'neck overlaps both shoulder and skull through full watch range');
  assert.deepEqual(catHead.scale.toArray(), [1, 1, 1], 'head shape is never stretched');
}
catChest.visible = false; neck.updateCatNeck(); assert.equal(neck.catNeck.visible, false);
console.log('All shelf hover targets, click handoff, rest transforms and cat neck continuity passed.');

const dumbbells = [new THREE.Group(), new THREE.Group()];
dumbbells.forEach((db, i) => { db.userData.restY = 0.3 + i * 0.02; db.position.y = db.userData.restY; });
const gymHandlers = new Map();
let lifted;
const gymContext = vm.createContext({
  dumbbells, gym: new THREE.Group(), lifting: false,
  lift: (db) => { lifted = db; },
  register: (object, handler) => gymHandlers.set(object, handler),
  gsap: { to(target, values) { target.y = values.y; } },
});
vm.runInContext(section('  dumbbells.forEach((db) => register(db, {', '  // ---------- wastebasket'), gymContext);
for (const db of dumbbells) {
  const handler = gymHandlers.get(db);
  handler.onHover(true); assert.ok(db.position.y > db.userData.restY);
  handler.onHover(false); assert.equal(db.position.y, db.userData.restY);
  handler.onClick(); assert.equal(lifted, db, 'click lifts the dumbbell under the pointer');
  gymContext.lifting = true;
  handler.onHover(true); assert.equal(db.position.y, db.userData.restY, 'hover does not disturb an active rep');
  gymContext.lifting = false;
}
console.log('Both dumbbell hover targets and matching click actions passed.');
