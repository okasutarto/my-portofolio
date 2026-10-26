// Run: node scripts/check-desk-speakers.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('three');
const source = fs.readFileSync(path.join(__dirname, '../src/components/features/desk/deskScene.js'), 'utf8');
const start = source.indexOf('  function pump(speaker, strength = 1)');
const end = source.indexOf('  // Spotifree on the monitor', start);
const speakers = [];
const leds = [];
const handlers = [];
let toggles = 0;
const ctx = vm.createContext({
  THREE, speakers, speakerLeds: leds, soundMuted: true, scene: new THREE.Group(),
  toon: (color) => new THREE.MeshToonMaterial({ color }), track: (value) => value,
  rbox: (w,h,d) => new THREE.BoxGeometry(w,h,d), mesh: (geometry, material) => new THREE.Mesh(geometry, material),
  noRaycast() {}, register: (obj, handler) => handlers.push(handler),
  gsap: { fromTo: (obj, from, to) => { Object.keys(from).forEach((key) => { obj[key] = to[key]; }); } },
  onEvent: (name) => { assert.equal(name, 'toggleSound'); toggles++; }, sfx: { powerDown() {} },
});
vm.runInContext(source.slice(start, end), ctx);
assert.equal(speakers.length, 2);
for (let i = 0; i < speakers.length; i++) {
  const status = speakers[i].group.children.find((obj) => obj.material === leds[i]);
  assert.equal(status.geometry.parameters.radius, 0.045, 'status indicator stays large enough to read');
  assert.equal(Math.sign(status.position.x), Math.sign(speakers[i].group.position.x), 'status sits on outer edge, clear of monitor');
}
for (const speaker of speakers) {
  assert.equal(speaker.woofer.geometry.type, 'LatheGeometry', 'woofer is a recessed cone');
  // Its face must point out towards the listener, rather than disappear through backface culling.
  const normals = speaker.woofer.geometry.attributes.normal;
  assert.ok(Array.from({length:normals.count}, (_,i) => normals.getY(i)).some((y) => y > 0.5));
  assert.ok(speaker.dustCap.scale.z < 0.5, 'dust cap is shallow instead of a protruding ball');
  ctx.speaker = speaker;
  vm.runInContext('pump(speaker, 1)', ctx);
  assert.equal(speaker.dustCap.position.z, speaker.dustCap.userData.restZ, 'beat animation returns cap to its fitted position');
  assert.equal(speaker.woofer.scale.x, 1);
  assert.equal(speaker.group.scale.y, 1);
}
assert.ok(leds.every((led) => led.color.getHexString() === 'e11d48'), 'initial LEDs respect mute');
handlers.forEach((handler) => handler.onClick());
assert.equal(toggles, 2, 'both speakers still toggle sound');
console.log('Speaker cone orientation, fitted caps, beat reset, muted LEDs and click checks passed.');
