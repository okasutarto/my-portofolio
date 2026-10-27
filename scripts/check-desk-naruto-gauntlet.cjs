// Run: node scripts/check-desk-naruto-gauntlet.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const THREE = require('three');
const source = fs.readFileSync(`${__dirname}/../src/components/features/desk/deskScene.js`, 'utf8');
let handler;
const glovePart = new THREE.Group();
const targets = [];
const sandbox = vm.createContext({
  snapping: false, glovePart, gauntlet: new THREE.Group(), stones: [], flare() {}, snapFingers() {},
  gsap: { to(target, values) { targets.push(target); target.y = values.y; } },
  register: (_, value) => { handler = value; }, sfx: { tick() {} },
});
vm.runInContext(source.slice(source.indexOf('  register(gauntlet, {'), source.indexOf('  const SHELF_SOUNDS =')), sandbox);
handler.onHover(true);
assert.ok(glovePart.position.y > 0.2 && glovePart.position.y < 0.4, 'glove rises a little above the fixed plinth');
handler.onHover(false);
assert.equal(glovePart.position.y, 0, 'leave settles on the stand');
sandbox.snapping = true;
glovePart.position.y = 0.8;
handler.onHover(false);
assert.equal(glovePart.position.y, 0.8, 'hover cannot interrupt the snap');
assert.ok(targets.every((target) => target === glovePart.position), 'plinth never floats with the glove');
const order = [];
const snapStart = source.slice(source.indexOf('  function snapFingers()'), source.indexOf('    // Hand poses:')) + '}';
vm.runInNewContext(snapStart + '; snapFingers()', {
  snapping: false, glovePart, discover() {}, setFocus() {},
  gsap: { killTweensOf(target) { assert.equal(target, glovePart.position); order.push('cancel hover'); }, timeline() { order.push('snap'); } },
});
assert.deepEqual(order, ['cancel hover', 'snap']);

const textures = fs.readFileSync(`${__dirname}/../src/components/features/desk/textures.js`, 'utf8');
const manga = textures.slice(textures.indexOf('// ---------- Naruto manga collection'), textures.indexOf('// ---------- the handheld')).replace(/export /g, '');
const text = [];
const ctx = new Proxy({
  measureText: (value) => ({ width: value.length * 20 }),
  fillText: (value) => text.push(String(value)),
}, { get(target, key) { return key in target ? target[key] : (...values) => { values.forEach((v) => { if (typeof v === 'number') assert.ok(Number.isFinite(v), `finite ${key} coordinates`); }); }; } });
vm.runInNewContext(manga + `
  for (let vol = 1; vol <= 5; vol++) {
    drawMangaSpine(ctx, 150, 1020, { vol, color: '#f68026' });
    drawNarutoCover(ctx, 700, 1000, { vol });
  }
`, { ctx });
assert.equal(text.filter((value) => value === 'NARUTO').length, 10, 'all spines and covers carry the new series');
assert.ok(!text.some((value) => value.includes('ONE PIECE')));
for (const volume of ['01', '02', '03', '04', '05']) assert.ok(text.includes(volume));
console.log('Gauntlet lift, leave, snap handoff and Naruto spine/cover rendering passed.');

// The collection stays a five-volume stack, with no standing display book.
const mangaCode = source.slice(source.indexOf('  const MANGA ='), source.indexOf('  // A 3×3 puzzle cube'));
assert.ok(!mangaCode.includes('mangaDisplay'));
const volumes = vm.runInNewContext(mangaCode.slice(0, mangaCode.indexOf('  const stackTop')) + '; MANGA');
assert.deepEqual(Array.from(volumes, (entry) => entry[0]), [1, 2, 3, 4, 5]);
console.log('Five Naruto volumes remain stacked without a standing display.');
