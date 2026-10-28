// Run: node scripts/check-desk-keyboard.cjs
const assert = require('node:assert/strict');
const vm = require('node:vm');
const THREE = require('three');

(async () => {
  const source = require('./helpers/desk-source.cjs').readDeskSource();
  const { KEY_UNIT, KEY_GAP } = vm.runInNewContext(source.slice(source.indexOf('  const KEY_UNIT ='), source.indexOf('  const KEYS_W =')) + '; ({ KEY_UNIT, KEY_GAP })');
  const rows = vm.runInNewContext(source.slice(source.indexOf('  const letters ='), source.indexOf('  // Apple prints')) + '; KEY_ROWS');
  assert.equal(rows.flat().length, 84, 'preserve the original interactive key set');
  assert.equal(new Set(rows.flat().map(([code]) => code)).size, 84, 'physical codes remain unique');
  assert.deepEqual(Array.from(rows[0].slice(-3), ([code]) => code), ['PrintScreen', 'Insert', 'Delete']);
  for (const row of rows) assert.equal(row.reduce((sum, [, , width = 1]) => sum + width, 0), 16, 'no missing slots in a row');
  assert.ok(rows.flat().some(([code, , width]) => code === 'Space' && width === 6.25));
  const start = source.indexOf('  const keycapTop =');
  const end = source.indexOf('  const keyGeometries =', start);
  const { sculptKeycap, keycapTop } = vm.runInNewContext(source.slice(start, end) + '; ({ sculptKeycap, keycapTop })', {
    THREE,
  });
  for (const units of [1, 1.25, 1.5, 1.75, 2, 2.25, 6.25]) {
    const w = units * KEY_UNIT - KEY_GAP;
    const d = KEY_UNIT - KEY_GAP;
    const geo = sculptKeycap(w, d);
    for (const name of ['position', 'normal', 'uv']) {
      assert.ok([...geo.attributes[name].array].every(Number.isFinite), `${units}u: finite ${name}`);
    }
    geo.computeBoundingBox();
    assert.ok(geo.boundingBox.max.x <= w / 2 + 1e-6, 'cap stays inside its original key slot');
    assert.ok(geo.boundingBox.min.y >= -0.090001, 'bottom and key travel stay unchanged');
    const key = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    key.updateMatrixWorld();
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(key)[0];
    assert.ok(hit, `${units}u: cap remains pickable`);
    assert.ok(Math.abs(hit.point.y - keycapTop(0, 0, w, d)) < 0.002, 'legend follows the dished top');
    assert.ok(keycapTop(0, 0, w, d) < keycapTop(w * 0.3, d * 0.3, w, d), 'centre is lower than edges');
    geo.dispose();
    key.material.dispose();
  }
  const textures = require('./helpers/texture-source.cjs').readTexturesSource();
  const fit = textures.slice(textures.indexOf('function fitFont('), textures.indexOf('const DISPLAY ='));
  const labelCode = textures.slice(textures.indexOf('export function drawKeyLabel('), textures.indexOf('// ---------- speech bubble over the mug')).replace('export function', 'function');
  const drawLabel = vm.runInNewContext(fit + labelCode + '; drawKeyLabel', { BODY: 'sans-serif' });
  for (const label of ['control', 'option', 'command', 'BACKSPACE']) {
    const ctx = {
      clearRect() {}, fillRect() {},
      measureText(text) { return { width: parseFloat(this.font.split(' ')[1]) * text.length * 0.65 }; },
      fillText(text) { assert.ok(this.measureText(text).width <= 55 * 0.78, `${label}: ink fits inside cap margins`); },
    };
    drawLabel(ctx, 55, 55, label, null, { small: true, shift: '⌃' });
  }
  console.log('Keyboard: complete layout, all cap widths, finite geometry, picking, travel clearance and dished legends passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
