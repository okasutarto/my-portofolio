// Run: node scripts/check-desk-layout.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('three');
const root = path.join(__dirname, '../src');
const source = fs.readFileSync(path.join(root, 'components/features/desk/deskScene.js'), 'utf8');
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
const OUT = vm.runInNewContext(`(${source.match(/const OUT = ([^;]+);/)[1]})`, { DRAWER_D, FOLDER_D });
const context = { THREE, screenPos: new THREE.Vector3(), screenNormal: new THREE.Vector3(), heldTicket: null, openFolder: null, selectedNote: null, OUT, FOLDER_W, FOLDER_D, container: { clientWidth: 1200 } };
for (const name of ['tickets', 'folders', 'aboutBoard']) {
  context[name] = new THREE.Group();
  vm.runInNewContext(source.match(new RegExp(name + '\\.position\\.set\\([^;]+;'))[0], context);
  const turn = source.match(new RegExp(name + '\\.rotation\\.y = ([^;]+);'));
  if (turn) vm.runInNewContext(turn[0], context);
}
const shotStart = source.indexOf('  const SHOTS =');
const shots = vm.runInNewContext(source.slice(shotStart, source.indexOf('  const cam =', shotStart)) + '; SHOTS', context);
const near = (target, object, distance = 1) => new THREE.Vector3(...target).distanceTo(object.position) < distance;
assert.ok(near(shots.experience().target, context.tickets));
const drawerShot = () => near(shots.projects().target, context.folders, 1.5);
assert.ok(drawerShot(), 'the projects shot frames the drawer');
context.openFolder = {};
const openTarget = shots.projects().target;
assert.ok(openTarget[0] > context.folders.position.x + 1.5, 'an open folder lies on the desk in front of the drawer');
assert.ok(openTarget[0] - FOLDER_W > context.folders.position.x + DRAWER_D / 2 + 0.1, 'its open cover clears the drawer front');
context.openFolder = null;
assert.ok(context.tickets.position.z > 0 && context.tickets.position.x < -3, 'tickets sit at the front-left of the desk');
assert.ok(context.folders.position.x < -5.5 && context.folders.position.z > -4.85 && context.folders.position.z < -0.3, 'the drawer stands at the left end of the desk, under the window');
assert.ok(new THREE.Vector3(...shots.about().target).distanceTo(context.aboutBoard.position) < 0.01);

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
  noteDrag: null,
  lanyardDrag: null,
  finishNoteDrag() { const drag = resumeContext.noteDrag; resumeContext.noteDrag = null; return drag; },
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
