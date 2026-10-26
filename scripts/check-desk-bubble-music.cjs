// Run: node scripts/check-desk-bubble-music.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = (name) => fs.readFileSync(path.join(__dirname, '../src/components/features/desk', name), 'utf8');

// Record the real drawing path for every tail direction.
const textures = read('textures.js');
const drawing = textures.slice(textures.indexOf('export const BUBBLE_TAILS'), textures.indexOf('export function drawQuoteBubble')).replace('export ', '');
const paths = [];
const context = {
  beginPath() {}, ellipse(...args) { this.oval = args; },
  lineTo(...args) { this.lines.push(args); },
  closePath() {}, fill() {}, stroke() {}, fillText() {}, lines: [],
};
vm.runInNewContext(drawing + `
  for (const tail of Object.keys(BUBBLE_TAILS)) {
    c.lines = [];
    drawMangaBubble(c, 760, 400, { text: '', by: '' }, 32, tail);
    paths.push({ tail, oval: c.oval, lines: c.lines });
  }
`, { c: context, paths, BODY: 'sans-serif', wrap: () => [] });
for (const { tail, oval, lines } of paths) {
  assert.equal(lines.length, 2, tail + ': two straight tail edges');
  const [cx, cy, rx, ry, , a1] = oval;
  const [tip, root] = lines;
  assert.ok(Math.hypot(root[0] - cx - Math.cos(a1)*rx, root[1] - cy - Math.sin(a1)*ry) < 1e-8, tail + ': closed root');
  assert.ok(((tip[0]-cx)/rx)**2 + ((tip[1]-cy)/ry)**2 > 1, tail + ': tip outside oval');
  assert.ok(tip[0] > 2 && tip[0] < 758 && tip[1] > 2 && tip[1] < 398, tail + ': outline stays inside texture');
}

// The actual tail tip must stay on the brim as the camera, chair and pop animation move.
const THREE = require('three');
const scene = read('deskScene.js');
const start = scene.indexOf('  function placeHatBubble()');
const hat = new THREE.Group();
const camera = new THREE.PerspectiveCamera();
const sprite = new THREE.Sprite();
const tails = vm.runInNewContext(drawing + '; BUBBLE_TAILS', {});
const place = vm.runInNewContext(scene.slice(start, scene.indexOf('  let luffyIndex', start)) + '; placeHatBubble', {
  strawHat: hat, camera, hatBubble: { sprite }, BUBBLE_TAILS: tails,
  hatAt: new THREE.Vector3(), hatScreenRight: new THREE.Vector3(), hatScreenUp: new THREE.Vector3(),
});
for (const amount of [0.16, 0.6, 1]) {
  hat.position.set(amount * 3, -amount, 2);
  hat.rotation.set(Math.PI/2, 0, amount);
  camera.rotation.set(-amount, amount/2, 0);
  sprite.scale.set(6.6*amount, 3.45*amount, 1);
  place();
  const tip = sprite.position.clone()
    .add(new THREE.Vector3((tails.left.tip[0]-0.5)*sprite.scale.x, (0.5-tails.left.tip[1])*sprite.scale.y, 0).applyQuaternion(camera.quaternion));
  assert.ok(tip.distanceTo(hat.localToWorld(new THREE.Vector3(0, 0, -0.65))) < 1e-8, 'tail must follow upper brim');
}

// Exercise playback against a small WebAudio fake; music must not start a noise loop.
const sources = [];
const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
const node = () => ({ connect() { return this; }, disconnect() {}, gain: param(), frequency: param(), detune: param(), Q: param(), start() {}, stop() {} });
const ctx = {
  currentTime: 0, createGain: node, createBiquadFilter: node, createOscillator: node,
  createAnalyser: () => ({ ...node(), frequencyBinCount: 64 }),
  createBufferSource: () => { const source = node(); sources.push(source); return source; },
};
let pump;
const audio = vm.createContext({
  audioBus: () => ({ ctx, out: node(), noiseBuffer: {} }),
  setInterval(fn) { pump = fn; return 1; }, clearInterval() {},
  setTimeout() { return 1; }, clearTimeout() {},
});
vm.runInContext(read('lofi.js').replace(/import .*;\n/, '').replace(/export /g, '') + '\nconst player = createLofi();', audio);
assert.equal(vm.runInContext('player.play()', audio), true);
assert.equal(sources.length, 0, 'intro must not start vinyl hiss or pops');
for (let i=1; i<100; i++) { ctx.currentTime=i*0.1; pump(); }
assert.ok(sources.length>0, 'drum noise should still play');
assert.ok(sources.every((source) => !source.loop), 'no continuous noise loop');
vm.runInContext('player.pause()', audio);
assert.equal(vm.runInContext('player.playing', audio), false);
console.log('All six bubble tails and clean music playback passed.');
