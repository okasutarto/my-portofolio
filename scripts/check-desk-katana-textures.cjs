// Run: node scripts/check-desk-katana-textures.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/components/features/desk/textures.js', 'utf8');
const start = source.indexOf('export function drawEnmaBlade');
const end = source.indexOf('// ---------- family portrait ----------', start);
const draw = vm.runInNewContext(source.slice(start, end).replace(/export /g, '') +
  '; ({ drawEnmaBlade, drawWadoBlade, drawKitetsuBlade, drawSayaLacquer, drawTsukaWrap })');
function render(fn, options) {
  const calls = [];
  const context = new Proxy({}, {
    get: (_, key) => (...args) => {
      args.filter(value => typeof value === 'number').forEach(value => assert.ok(Number.isFinite(value)));
      calls.push([key, ...args]);
      if (key === 'createLinearGradient') return { addColorStop() {} };
    },
    set: (_, key, value) => { calls.push([key, value]); return true; },
  });
  fn(context, 1024, 256, options);
  return calls;
}
const blade = { bow: x => 0.2 * (x / 2.2) ** 2, length: 2.2, width: 2.34, yMin: -0.06, yMax: 0.28 };
for (const name of ['drawEnmaBlade', 'drawWadoBlade', 'drawKitetsuBlade']) {
  const calls = render(draw[name], blade);
  assert.equal(calls.filter(([op]) => op === 'stroke').length, 13, `${name} retains polishing lines`);
  assert.ok(calls.some(([op]) => op === 'fillRect'), 'retain original hamon colours');
}
const lacquer = render(draw.drawSayaLacquer, { color: '#c81e1e' });
assert.deepEqual(lacquer.filter(([op]) => op === 'fillRect'),
  render(draw.drawSayaLacquer, { color: '#c81e1e' }).filter(([op]) => op === 'fillRect'), 'surface grain is deterministic');
assert.ok(lacquer.some(([op]) => op === 'createLinearGradient'));
const wrap = render(draw.drawTsukaWrap, { cord: '#f8f7f2', skin: '#1a1714' });
assert.equal(wrap.filter(([op]) => op === 'clip').length, 21, 'ray skin is confined to front/back diamond openings');
assert.ok(wrap.some(([op]) => op === 'arc'), 'ray skin has pebbled detail');
console.log('Katana lacquer, silk/ray-skin wrap and three polished blade textures passed.');
