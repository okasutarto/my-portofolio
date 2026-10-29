// Run: node scripts/check-desk-dumbbells.cjs
const assert = require('node:assert/strict');
const vm = require('node:vm');
const THREE = require('three');
const source = require('./helpers/desk-source.cjs').readDeskSource();
const start = source.indexOf('  const gym = new THREE.Group();');
const { gym, dumbbells } = vm.runInNewContext(
  source.slice(start, source.indexOf('  const repTex =', start)) + '; ({ gym, dumbbells })', {
    THREE, FLOOR_Y: -5.2, scene: new THREE.Scene(), track: (value) => value, shelf: { position: new THREE.Vector3(10.15, -5.2, -2.78) },
    toon: (color) => new THREE.MeshToonMaterial({ color }),
    mesh: (geometry, material) => new THREE.Mesh(geometry, material),
    canvasTexture: () => ({ texture: new THREE.Texture(), ctx: { beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} } }),
    drawSatinFinish() {}, drawBrushedMetal() {},
    printed: (w, h) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial()),
  });
gym.updateMatrixWorld(true);
for (const db of dumbbells) {
  const heads = db.children.filter((child) => child.geometry.type === 'LatheGeometry');
  assert.equal(heads.length, 2, 'each dumbbell has two round heads');
  for (const head of heads) {
    assert.ok(head.geometry.parameters.segments >= 32, 'round heads must have a smooth circumference');
    assert.ok(head.material.map && head.material.bumpMap, 'cast iron has surface texture and relief');
  }
  const clearance = new THREE.Box3().setFromObject(db, true).min.y - -5.2;
  assert.ok(clearance > 0.03 && clearance < 0.04, 'round heads rest just above the bare floor without sinking');
  assert.equal(db.userData.restY, db.position.y, 'rep and hover animations return to the new resting height');
}
console.log('Round dumbbell heads, textured cast iron and floor clearance checks passed.');
