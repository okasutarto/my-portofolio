// Run: node scripts/check-desk-speakers.cjs
const assert = require('node:assert/strict');
const vm = require('node:vm');
const THREE = require('three');
const source = require('./helpers/desk-source.cjs').readDeskSource();
const start = source.indexOf('  function pump(speaker, strength = 1)');
const end = source.indexOf('  // Spotifree on the monitor', start);
const speakers = [];
const leds = [];
const handlers = [];
let toggles = 0;
const ctx = vm.createContext({
  canvasTexture: () => ({ texture: new THREE.Texture(), ctx: { fillRect() {}, beginPath() {}, moveTo() {}, bezierCurveTo() {}, stroke() {}, fillText() {} } }),
  drawWoodTop() {},
  DEFAULT_WOODS: { speakers: { wood: "oak", pattern: "planks" } },
  SPEAKER_FINISHES: { wood: { color: null, shell: '#4a4c50', baffle: '#2b2c2f' } },
  THREE, speakers, speakerLeds: leds, soundMuted: true, scene: new THREE.Group(), RISER_TOP: 0.5,
  toon: (color) => new THREE.MeshToonMaterial({ color }), track: (value) => value,
  rbox: (w,h,d) => new THREE.BoxGeometry(w,h,d), mesh: (geometry, material) => new THREE.Mesh(geometry, material),
  noRaycast() {}, register: (obj, handler) => handlers.push(handler),
  floatNote() {},
  gsap: { to: (obj, values) => { for (const axis of ['x', 'y', 'z']) if (axis in values) obj[axis] = values[axis]; }, fromTo: (obj, from, to) => { Object.keys(from).forEach((key) => { obj[key] = to[key]; }); } },
  onEvent: (name) => { assert.equal(name, 'toggleSound'); toggles++; }, sfx: { powerDown() {} },
});
vm.runInContext(source.slice(start, end), ctx);
assert.equal(speakers.length, 2);
speakers.forEach((speaker, index) => {
  const cabinet = speaker.group.getObjectByName('r1280dbs-cabinet');
  const size = new THREE.Box3().setFromObject(cabinet).getSize(new THREE.Vector3());
  for (const [axis, expected] of Object.entries({ x: 1.46, y: 2.34, z: 1.96 })) {
    assert.ok(Math.abs(size[axis] - expected) < 0.006, `cabinet ${axis} follows Edifier's millimetres: ${size[axis]}`);
  }
  const whole = new THREE.Box3().setFromObject(speaker.group).getSize(new THREE.Vector3());
  assert.ok(whole.z < 2.0 && whole.y < 2.36, 'driver trims stand barely proud of the baffle');
  const sides = cabinet.children.filter(part => part.name === 'wood-side-panel');
  assert.equal(sides.length, 2);
  assert.ok(sides.every(part => part.material === vm.runInContext('speakerWoodMat', ctx)), 'side panels use the furniture wood');
  assert.ok(sides.every(part => Math.abs(Math.abs(part.position.x) - 0.69) < 0.001), 'panels sit on both sides');
  assert.ok(cabinet.getObjectByName('front-baffle'));
  assert.ok(speaker.tweeter.position.x < 0, 'tweeter sits top left');
  assert.ok(speaker.tweeter.position.y > speaker.woofer.position.y + 0.8, 'tweeter sits above the woofer');
  const port = speaker.group.getObjectByName('front-bass-port');
  assert.ok(port.position.x > 0 && Math.abs(port.position.y - speaker.tweeter.position.y) < 1e-6 && port.position.z > 0.9, 'flared port faces front, beside the tweeter');
  assert.equal(speaker.woofer.position.x, 0, 'woofer centred in the lower half');
  assert.ok(speaker.group.getObjectByName('driver-surround'));
  assert.ok(!source.slice(start, end).includes('fillText('), 'speaker carries no printed branding');
  assert.equal(speaker.woofer.geometry.type, 'LatheGeometry');
  const normals = speaker.woofer.geometry.attributes.normal;
  assert.ok(Array.from({ length: normals.count }, (_, i) => normals.getY(i)).some(y => y > 0.5), 'cone faces listener');
  const knobs = speaker.group.children.filter(part => part.name === 'side-knob');
  const status = speaker.group.getObjectByName('speaker-power-indicator');
  if (index === 1) {
    assert.equal(knobs.length, 3, 'volume, treble and bass on the active speaker');
    assert.ok(knobs.every(knob => knob.position.x > 0.73), 'knobs stand out of its outer (right) side');
    assert.ok(status.position.x > 0.73, 'status light on the side panel');
  } else {
    assert.equal(knobs.length, 0);
    assert.equal(status, undefined, 'the passive speaker has no status light');
  }
  ctx.speaker = speaker;
  vm.runInContext('pump(speaker, 1)', ctx);
  assert.equal(speaker.dustCap.position.z, speaker.dustCap.userData.restZ);
  assert.equal(speaker.group.scale.y, 1);
});
assert.equal(leds.length, 1, 'one status light, on the active speaker');
assert.ok(leds.every((led) => led.color.getHexString() === 'e11d48'), 'initial LEDs respect mute');
handlers.forEach((handler, i) => {
  handler.onHover(true);
  assert.ok(speakers[i].group.rotation.x < 0);
  handler.onHover(false);
  assert.equal(speakers[i].group.rotation.x, 0, 'speaker settles back on its base');
  assert.equal(toggles, i, 'hover never toggles sound');
  handler.onClick();
});
assert.equal(toggles, 2, 'both speakers still toggle sound');
console.log('R1280DBs dimensions, wood sides, front drivers and port, side controls and interaction checks passed.');
