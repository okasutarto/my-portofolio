// Run: node scripts/check-desk-layout.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('three');
const root = path.join(__dirname, '../src');
const source = require('./helpers/desk-source.cjs').readDeskSource();
const data = fs.readFileSync(path.join(root, 'data/about.js'), 'utf8').replace(/export /g, '');
const { ABOUT_NOTES } = vm.runInNewContext(data + '; ({ ABOUT_NOTES })');
const layoutStart = source.indexOf('  const noteLayout =');
const layout = vm.runInNewContext(source.slice(layoutStart, source.indexOf('  const pinGeo', layoutStart)) + '; noteLayout');
assert.deepEqual(Object.keys(layout).sort(), Array.from(ABOUT_NOTES, (note) => note.id).sort(),
  'every shared 2D note must have a pinned placement on the 3D board');

const num = (name) => Number(source.match(new RegExp(`const ${name} = ([\\d.]+)`))[1]);
const FOLDER_W = num('FOLDER_W');
const FOLDER_D = num('FOLDER_D');
const DRAWER_D = vm.runInNewContext(source.match(/const DRAWER_D = ([^;]+);/)[1], { projects: { length: 5 } });
const literal = (name) => vm.runInNewContext(`(${source.match(new RegExp(`const ${name} = ([^;]+);`))[1]})`);
const OUT = vm.runInNewContext(`(${source.match(/const OUT = ([^;]+);/)[1]})`, { DRAWER_D, FOLDER_D, FOLDER_W, FOLDERS_AT: literal('FOLDERS_AT'), OPEN_SPINE: literal('OPEN_SPINE') });
const context = { THREE, gymCalendar: { position: new THREE.Vector3(10.5, 5.8, -4.38) }, shelfLook: 1.7, shelf: { position: new THREE.Vector3(14.6, -7.4, -3.25), scale: new THREE.Vector3(2, 2, 2) }, FLOOR_Y: -7.4, WALL_Z: -4.9, screenPos: new THREE.Vector3(), screenNormal: new THREE.Vector3(), heldTicket: null, openFolder: null, selectedNote: null, OUT, FOLDER_W, FOLDER_D, container: { clientWidth: 1200, clientHeight: 800 } };
context.FOLDERS_AT = literal('FOLDERS_AT');
for (const name of ['tickets', 'folders', 'aboutBoard']) {
  context[name] = new THREE.Group();
  vm.runInNewContext(source.match(new RegExp(name + '\\.position\\.set\\([^;]+;'))[0], context);
  const turn = source.match(new RegExp(name + '\\.rotation\\.y = ([^;]+);'));
  if (turn) vm.runInNewContext(turn[0], context);
}
context.SHELF_H = num('SHELF_H');
context.SHELF_TOP_EXTRA = num('SHELF_TOP_EXTRA');
const shotStart = source.indexOf('  const SHOTS =');
const shots = vm.runInNewContext(source.slice(shotStart, source.indexOf('  const cam =', shotStart)) + '; SHOTS', context);
assert.ok(Math.abs(shots.shelf().target[0] - context.shelf.position.x) < 0.5, 'shelf should sit near the centre of its close-up');
const near = (target, object, distance = 1) => new THREE.Vector3(...target).distanceTo(object.position) < distance;
assert.ok(near(shots.experience().target, context.tickets));
const drawerShot = () => near(shots.projects().target, context.folders, 1.5);
assert.ok(drawerShot(), 'the projects shot frames the drawer');
context.openFolder = {};
const openTarget = shots.projects().target;
assert.ok(openTarget[0] > context.folders.position.x + 1.5, 'an open folder lies on the desk in front of the drawer');
assert.ok(openTarget[0] - FOLDER_W > context.folders.position.x + DRAWER_D / 2 + 0.1, 'its open cover clears the drawer front');
// Opened, it lies across the clear strip at the desk's front centre: in front of the keyboard
// mat (to z 2.25), clear of the riser behind it, and within the desk's front edge (z 4.2)
assert.ok(Math.abs(openTarget[0]) < 0.5 && openTarget[2] - FOLDER_D / 2 > 1.8 && openTarget[2] + FOLDER_D / 2 < 4.2, 'an open folder lies across the front of the desk, clear of the mat and the riser');
context.openFolder = null;
assert.ok(context.tickets.position.z > 0 && context.tickets.position.x < -3, 'tickets sit at the front-left of the desk');
assert.ok(context.folders.position.x < -5.5 && context.folders.position.z > -4.85 && context.folders.position.z < 0.5, 'the drawer stands at the left end of the desk, under the window');
assert.ok(new THREE.Vector3(...shots.about().target).distanceTo(context.aboutBoard.position) < 0.01);

// Portrait framing fits the shelf width without exposing a large empty floor area.
context.container.clientWidth = 390;
context.container.clientHeight = 844;
const portraitShelf = shots.shelf();
const portraitH = Math.max(portraitShelf.fit[1], portraitShelf.fit[0] * 844 / 390);
assert.ok(portraitShelf.target[1] - portraitH / 2 >= context.FLOOR_Y - 1.21);
context.shelfLook = 9;
assert.ok(shots.shelf().target[1] > portraitShelf.target[1], 'upper collection stays reachable');
context.shelfLook = 1.7;
context.container.clientWidth = 1200;
context.container.clientHeight = 800;

// Clicking the top board centres the gauntlet/Switch display, including portrait screens.
Object.assign(context, {
  focus: { name: 'overview' }, byFocus: new Map(), arriveTimer: null,
  setHover() {}, stopTyping() {}, clearTimeout() {}, catSettle() {}, resetUserView() {}, applyShot() {}, hideLamp() {}, timers: [], setTimeout() {},
  sfx: { whoosh() {} }, onEvent() {},
});
const lookStart = source.indexOf('  function shelfLookAt(');
vm.runInNewContext(source.slice(lookStart, source.indexOf('  let arriveTimer', lookStart)), context);
const focusStart = source.indexOf('  function setFocus(');
const setFocus = vm.runInNewContext(source.slice(focusStart, source.indexOf('  function back()', focusStart)) + '; setFocus', context);
for (const [w, h] of [[1360, 960], [1440, 700], [390, 844]]) {
  context.container.clientWidth = w;
  context.container.clientHeight = h;
  context.focus.name = 'overview';
  setFocus('shelf', { point: new THREE.Vector3(10.5, context.shelf.position.y + context.SHELF_H * context.shelf.scale.y, -3.75) });
  const target = shots.shelf().target;
  assert.ok(Math.abs(target[1] - (context.shelf.position.y + context.SHELF_H * context.shelf.scale.y + 1.25)) < 1e-8,
    'top-board click frames the display centre rather than the shelf below');
  assert.ok(Math.abs(target[0] - (context.shelf.position.x + 0.1)) < 1e-8);
}
context.container.clientWidth = 1200;
context.container.clientHeight = 800;
context.shelfLook = 1.7;

// Framing must follow props if they move, rather than retaining the old coordinates.
context.tickets.position.x += 1;
context.folders.position.z += 1;
assert.ok(near(shots.experience().target, context.tickets));
assert.ok(drawerShot(), 'the projects shot follows the drawer');
// Clicking a paper must never change the board camera framing.
const boardShot = shots.about();
context.selectedNote = { paper: new THREE.Group(), w: 1, h: 1 };
assert.deepEqual(shots.about(), boardShot);
const clampStart = source.indexOf('  function clampNote(');
const clampNote = vm.runInNewContext(source.slice(clampStart, source.indexOf('  function liftNote(', clampStart)) + '; clampNote', { THREE });
const note = { w: 2.6, h: 2.15, angle: -0.06 };
const edge = clampNote(note, 100, -100);
assert.ok(edge.x + note.w / 2 < 3.275);
assert.ok(edge.y - note.h / 2 > -1.975);
assert.equal(clampNote(note, 0.3, 0.2).x, 0.3);
const overlapStart = source.indexOf('  function notesOverlap(');
const notesOverlap = vm.runInNewContext(source.slice(overlapStart, source.indexOf('  function liftNote(', overlapStart)) + '; notesOverlap');
const notes = Array.from(ABOUT_NOTES, (data) => {
  const [x, y, w, h] = layout[data.id];
  return { paper: { position: { x, y } }, w, h, angle: -THREE.MathUtils.clamp(data.rotate, -2, 2) * Math.PI / 180 };
});
for (let i = 0; i < notes.length; i++) for (let j = i + 1; j < notes.length; j++) {
  assert.equal(notesOverlap(notes[i], notes[j]), false, `initial notes ${ABOUT_NOTES[i].id}/${ABOUT_NOTES[j].id} must not overlap`);
}
const dragged = { ...notes[0], paper: { position: { ...notes[1].paper.position } } };
assert.equal(notesOverlap(dragged, notes[1]), true, 'dropping onto another note must be rejected');
const upStart = source.indexOf('  const onPointerUp =');
const opens = [];
const resumeContext = {
  shelfDrag: null,
  stickyDrag: null,
  noteDrag: null,
  lanyardDrag: null,
  chairDrag: null,
  hatDrag: null,
  finishNoteDrag() { const drag = resumeContext.noteDrag; resumeContext.noteDrag = null; return drag; },
  finishScreenDrag() {},
  runHotspot: ({ href }) => opens.push(href),
};
const onPointerUp = vm.runInNewContext(source.slice(upStart, source.indexOf('  const onPointerLeave', upStart)) + '; onPointerUp', resumeContext);
const gesture = () => ({ pointerId: 1, startX: 10, startY: 20, moved: false, note: { href: 'https://example.com/cv.pdf' } });
resumeContext.noteDrag = gesture();
onPointerUp({ pointerId: 1, clientX: 10, clientY: 20 });
assert.equal(opens.length, 1, 'a normal click must still open the resume');
resumeContext.noteDrag = gesture();
onPointerUp({ pointerId: 1, clientX: 40, clientY: 20 });
assert.equal(opens.length, 1, 'dragging the resume must not open its link');
resumeContext.noteDrag = { ...gesture(), moved: true };
onPointerUp({ pointerId: 1, clientX: 10, clientY: 20 });
assert.equal(opens.length, 1, 'dragging away and back must not count as a click');
console.log('Shared notes, fixed board camera, drag bounds and prop layout checks passed.');
