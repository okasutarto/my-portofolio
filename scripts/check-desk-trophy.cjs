// Run: node scripts/check-desk-trophy.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const THREE = require('three');
const { gsap } = require('gsap');
const source = require('./helpers/desk-source.cjs').readDeskSource();
const section = (a, b) => source.slice(source.indexOf(a), source.indexOf(b, source.indexOf(a)));
const tailsSource = require('./helpers/texture-source.cjs').readTexturesSource();
const BUBBLE_TAILS = vm.runInNewContext(tailsSource.slice(tailsSource.indexOf('export const BUBBLE_TAILS'), tailsSource.indexOf('function drawMangaBubble')).replace('export ', '') + '; BUBBLE_TAILS');
const trophy = new THREE.Group();
trophy.position.set(1, 2, 0);
trophy.userData.restY = 2;
const camera = new THREE.PerspectiveCamera();
const shelfBubble = { sprite: new THREE.Sprite(), hide() {} };
const ctx = vm.createContext({
  THREE, trophy, camera, shelfBubble, BUBBLE_TAILS, shelfBubbleAt: new THREE.Vector3(),
  pad1: { userData: {} }, pad2: { userData: {} }, robot: {}, nintendoSwitch: {},
});
const place = vm.runInContext(section('  const shelfBubbleAnchors', '  function shelfSay(') + '; shelfBubbleTarget = trophy; placeShelfBubble', ctx);
for (const yaw of [-0.3, 0, 0.3]) {
  camera.rotation.set(-0.1, yaw, 0);
  for (const size of [0.2, 1, 2.7]) {
    shelfBubble.sprite.scale.set(size, size * 1.42 / 2.7, 1);
    place();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const anchor = trophy.localToWorld(new THREE.Vector3(0.25, 1.12, 0.3)).addScaledVector(right, 0.06).addScaledVector(up, 0.14);
    const tip = shelfBubble.sprite.position.clone().addScaledVector(right, (BUBBLE_TAILS["down-left"].tip[0] - 0.5) * size).addScaledVector(up, (0.5 - BUBBLE_TAILS["down-left"].tip[1]) * shelfBubble.sprite.scale.y);
    assert.ok(tip.distanceTo(anchor) < 1e-9, 'tail stays on trophy while camera and bubble scale change');
    const offset = shelfBubble.sprite.position.clone().sub(anchor);
    assert.ok(offset.dot(right) > 0 && offset.dot(up) > 0, 'bubble remains above and right');
  }
}
let bursts = 0;
const burstOrigins = [];
let bubbles = 0;
const trophyHalo = new THREE.Sprite();
const trophyGold = new THREE.MeshToonMaterial();
const celebration = vm.createContext({
  SECRETS: Array.from({ length: 20 }), trophyCelebrating: false, trophyCelebration: null, trophy, trophyHalo, trophyGold, shelfBubble,
  camera, shelf: { position: { z: -3.25 }, scale: { z: 2 } }, SHELF_D: 1.5,
  shelfBubbleAt: new THREE.Vector3(), ledPartyUntil: 0, performance: { now: () => 0 }, THREE,
  burst: (x, y, z, festive) => { assert.equal(festive, true); burstOrigins.push(new THREE.Vector3(x, y, z)); bursts++; },
  shelfSay: (_, text) => { assert.ok(text.includes('20/20')); bubbles++; }, sfx: { trophyLift() {}, sparkle() {}, cheer() {}, applause() {} },
  gsap: { killTweensOf: gsap.killTweensOf, fromTo: (object, from, to) => gsap.fromTo(object, from, { ...to, paused: true }), timeline: (options) => gsap.timeline({ ...options, paused: true }) },
});
const cheer = vm.runInContext(section('  function cheerTrophy()', '  const PALETTE') + '; cheerTrophy', celebration);
cheer();
const timeline = celebration.trophyCelebration;
for (let step = 0; step <= 16; step++) {
  timeline.totalTime(step * 0.05);
  assert.ok(trophy.position.y <= trophy.userData.restY + 0.181, 'lift never overshoots into upper shelf');
}
assert.ok(trophy.position.y > trophy.userData.restY, 'trophy rises before confetti');
cheer();
assert.equal(celebration.trophyCelebration, timeline, 'repeated clicks cannot stack celebrations');
timeline.totalTime(6);
assert.equal(bursts, 1);
const intendedOrigin = new THREE.Vector3(trophy.position.x, trophy.userData.restY + 0.18 + 1.38, trophy.position.z);
const emitterOffset = burstOrigins[0].clone().sub(intendedOrigin);
assert.ok(Math.abs(emitterOffset.dot(new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion))) < 1e-6, 'emitter stays over trophy centre in screen space');
assert.ok(Math.abs(emitterOffset.dot(new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion))) < 1e-6, 'emitter keeps a 0.26-unit visual gap above the bowl');
assert.ok(burstOrigins[0].z >= -3.25 + 1.5 * 2 / 2 + 0.25, 'centred emitter stays in front of the full-size shelf');
assert.equal(bubbles, 1);
assert.equal(trophy.position.y, trophy.userData.restY);
assert.equal(trophy.rotation.y, 0);
assert.equal(trophyHalo.visible, false);
assert.equal(trophyGold.emissive.getHex(), 0);
assert.equal(celebration.trophyCelebrating, false, 'finished celebration can replay');
cheer();
assert.notEqual(celebration.trophyCelebration, timeline);
gsap.globalTimeline.clear();
gsap.ticker.sleep();
console.log('Trophy bubble anchoring, upper-right placement, celebration sequence, cleanup and replay passed.');

const loadSecrets = section('  const secretsFound =', '  function discover(') + '; secretsFound';
const saved = new Set(vm.runInNewContext(loadSecrets, {
  previewTrophy: false, SECRETS: ['a', 'b'], localStorage: { getItem: () => '["a"]' },
}));
const preview = new Set(vm.runInNewContext(loadSecrets, {
  previewTrophy: true, SECRETS: ['a', 'b'], localStorage: { getItem() { throw new Error('preview read storage'); }, setItem() { throw new Error('preview changed storage'); } },
}));
assert.deepEqual([...saved], ['a']);
assert.deepEqual([...preview], ['a', 'b']);
console.log('Preview uses scene-only secrets and preserves stored progress.');

// Both celebration sounds use the existing WebAudio bus and bounded schedules.
const soundSource = fs.readFileSync(`${__dirname}/../src/shared/composables/useSfx.js`, 'utf8');
const scheduled = [];
const voices = [];
const bus = {};
let busConnections = 0;
const param = () => ({ value: 0, setValueAtTime(value, at) { assert.ok(Number.isFinite(value) && at >= 10); }, linearRampToValueAtTime(value, at) { assert.ok(value > 0 && at >= 10); }, exponentialRampToValueAtTime(value, at) { assert.ok(value > 0 && at >= 10); } });
const node = () => ({ connect(target) { if (target === bus) busConnections++; return target; }, frequency: param(), gain: param(), Q: param() });
const sounds = vm.runInNewContext('({' + soundSource.slice(soundSource.indexOf('  // A whole crowd shouting'), soundSource.indexOf('  // Plain UI click')) + '})', {
  Math: Object.assign(Object.create(Math), { random: () => 0.5 }),
  toHall() {}, tone: (at, options) => scheduled.push({ at, options }),
  ctx: {
    createOscillator() { const voice = { ...node(), start(at) { this.startAt = at; }, stop(at) { this.stopAt = at; } }; voices.push(voice); return voice; },
    createBiquadFilter: node, createGain: node,
  }, out: bus, vary: (value) => value, noise: (at, options) => scheduled.push({ at, options }),
});
sounds.cheer(10);
sounds.applause(10);
assert.ok(voices.length >= 8 && voices.length <= 32, 'crowd voices and vibrato oscillators stay bounded');
assert.equal(busConnections, voices.length / 2, 'each voice and its vibrato route through one shared mute bus');
assert.ok(voices.every((voice) => voice.startAt >= 10 && voice.stopAt <= 11.6));
assert.ok(scheduled.length > 100 && scheduled.length < 1000, 'applause uses a bounded crowd schedule');
assert.ok(scheduled.every(({ at, options }) => at >= 10 && at < 14 && options.peak > 0 && options.peak <= 0.16));
console.log('Cheer voice routing and bounded applause scheduling passed.');

// Trophy confetti must never cross the shelf's front plane, including at emission.
const confettiBits = Array.from({ length: 72 }, () => new THREE.Sprite());
const shelf = new THREE.Group();
// The shelf stands at its full-size 2x scale, so its front plane is SHELF_D deep in world units.
shelf.position.z = -3.25;
shelf.scale.setScalar(2);
const SHELF_D = 1.5;
const safeZ = shelf.position.z + SHELF_D * shelf.scale.z / 2 + 0.25;
const depthMoves = [];
const burst = vm.runInNewContext(section('  function burst(', '  let reps =') + '; burst', {
  confetti: confettiBits, shelf, SHELF_D,
  gsap: { killTweensOf() {}, to(target, values) { if ('z' in values) depthMoves.push(values.z); } },
});
burst(10.5, 3, shelf.position.z + 0.55, true);
assert.equal(depthMoves.length, 72);
assert.ok(confettiBits.every((bit) => bit.position.z >= safeZ && bit.material.depthTest));
assert.ok(depthMoves.every((z) => z >= safeZ), 'all flight endpoints stay outside the shelf');
depthMoves.length = 0;
burst(7, -3, 0.5);
assert.equal(depthMoves.length, 22, 'ordinary bursts keep their original particle count');
assert.ok(confettiBits.slice(0, 22).every((bit) => bit.position.z === 0.5), 'ordinary burst origin is unchanged');
console.log('Trophy confetti stays in front of shelf boards; ordinary bursts stay unchanged.');
