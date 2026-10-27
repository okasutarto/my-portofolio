// Run: node scripts/check-desk-hover.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const THREE = require('three');
const source = fs.readFileSync(`${__dirname}/../src/components/features/desk/deskScene.js`, 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const gsap = { to(target, values) {
  for (const axis of ['x', 'y', 'z']) if (axis in values) target[axis] = values[axis];
} };

// Real spring integration: fast pointer sweeps, slow frames, held tickets, and full release.
for (const dt of [1 / 120, 1 / 60, 0.05]) {
  const ticketList = Array.from({ length: 5 }, () => ({ flipper: new THREE.Group() }));
  const ctx = vm.createContext({ ticketList, heldTicket: null });
  vm.runInContext(section('  const TICKET_REVEAL', '  function holdTicket'), ctx);
  for (let sweep = 0; sweep < 10; sweep++) {
    for (const entry of ticketList) {
      ticketList.forEach((t) => { t.hoverTarget = 0; });
      entry.hoverTarget = 1;
      for (let f = 0; f < 8; f++) vm.runInContext(`updateTicketHover(${dt})`, ctx);
      for (const t of ticketList) {
        assert.ok(t.flipper.position.toArray().every(Number.isFinite));
        assert.ok(t.flipper.position.y < 0.024, 'hover never crosses the next paper layer');
      }
    }
  }
  ctx.heldTicket = ticketList[0];
  ticketList[0].flipper.position.set(0.3, 1.4, 0.8);
  for (const entry of ticketList) entry.hoverTarget = 0;
  for (let f = 0; f < Math.ceil(3 / dt); f++) vm.runInContext(`updateTicketHover(${dt})`, ctx);
  assert.deepEqual(ticketList[0].flipper.position.toArray(), [0.3, 1.4, 0.8], 'hover cannot move a held ticket');
  ticketList.slice(1).forEach((t) => assert.ok(t.flipper.position.length() < 0.00001, 'papers settle fully after release'));
}

// Ray hits arrive on key meshes/legends, not on their owning key group.
const keyboard = vm.runInNewContext(section('  let hoveredKey', '  const onKeyDown') + '; ({ hoverKey })', {
  gsap, KEY_Y: 0.34, register() {}, keyboard: new THREE.Group(), hitKey() {},
});
const keys = ['KeyA', 'KeyB'].map((code) => {
  const key = new THREE.Group();
  key.userData.code = code;
  key.position.y = 0.34;
  key.add(new THREE.Mesh());
  return key;
});
keyboard.hoverKey({ object: keys[0].children[0] });
assert.ok(keys[0].position.y > 0.34);
keyboard.hoverKey({ object: keys[1].children[0] });
assert.equal(keys[0].position.y, 0.34);
keyboard.hoverKey(null);
assert.equal(keys[1].position.y, 0.34, 'last key resets on leave/click');

// The shade was aimed with lookAt, so its resting Euler angles are not zero.
let lampHandlers;
const lampHead = new THREE.Group();
lampHead.rotation.set(-0.9, 0.2, 0.35);
const lampRest = lampHead.rotation.clone();
vm.runInNewContext(section('  const lampHeadRest', '  // Family keepsake:'), {
  lampHead, lamp: new THREE.Group(), gsap,
  register: (_, handlers) => { lampHandlers = handlers; },
});
lampHandlers.onHover(true);
lampHandlers.onHover(false);
assert.deepEqual(lampHead.rotation.toArray(), lampRest.toArray(), 'lamp returns to its aimed pose');

// Clicks clear hover before dispatching an action, even without changing the camera.
const calls = [];
const handleClick = vm.runInNewContext(section('  function handleClick', '  // ---------- sizing') + '; handleClick', {
  setHover: () => calls.push('release'), focus: { name: 'overview' }, typing: null,
});
handleClick({ onClick: () => calls.push('action') }, {});
assert.deepEqual(calls, ['release', 'action']);
const hotspotAt = vm.runInNewContext(section('  function hotspotAt', '  function runHotspot') + '; hotspotAt');
assert.equal(hotspotAt(undefined), null, 'sticky-note clicks may arrive without a surface hit');
console.log('Hover spring stability, paper clearance, held-ticket isolation, key targeting and click cleanup passed.');
