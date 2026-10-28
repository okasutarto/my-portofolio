// Run: node scripts/check-desk-robot.cjs
const assert = require('node:assert/strict');
const vm = require('node:vm');
const THREE = require('three');
const source = require('./helpers/desk-source.cjs').readDeskSource();
const model = vm.runInNewContext(source.slice(source.indexOf('  // Brushed metal with real light-dependent'), source.indexOf('  // Blinks every few seconds')) + '; ({ robot, bot, botHead, botArms, botEyes, eyeMat, teal, botSilver, botSteel })', {
  THREE, track: value => value,
  toon: color => new THREE.MeshToonMaterial({ color }), black: new THREE.MeshToonMaterial(),
  mesh: (geometry, material) => new THREE.Mesh(geometry, material),
  rbox: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  at: (object, x, y, z = 0) => { object.position.set(x, y, z); return object; },
  rod: (a, b, radius, material) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 8), material);
    rod.position.copy(a).add(b).multiplyScalar(0.5);
    return rod;
  },
  canvasTexture: () => ({ texture: new THREE.Texture(), ctx: {} }),
  drawBrushedMetal() {}, drawSatinFinish() {}, standOn: () => 0, addItem: value => value,
});
for (const material of [model.teal, model.botSilver, model.botSteel]) {
  assert.ok(material.isMeshPhongMaterial && material.shininess >= 65, 'metal has dynamic specular highlights');
  assert.ok(material.map && material.bumpMap, 'metal has brushed grain and surface relief');
  assert.ok(material.emissiveIntensity >= 0.1, 'metal stays readable in shelf shadows');
  assert.equal(material.bumpMap.colorSpace, THREE.NoColorSpace);
}
assert.equal(model.botEyes.length, 2);
assert.ok(model.botEyes.every(eye => eye.parent === model.botHead && eye.material === model.eyeMat), 'blinking/glitch eyes stay on turning head');
assert.equal(model.botArms.length, 2);
assert.ok(model.botArms.every(arm => arm.children.length === 6), 'joints, segmented arms and grippers follow shoulder pivots');
const bounds = new THREE.Box3().setFromObject(model.robot);
assert.ok(bounds.min.y >= 0 && bounds.max.y <= 1.32 && bounds.max.x < 1.7, 'robot still fits its shelf bay');
model.botHead.rotation.y = 0.5;
model.botArms[1].rotation.z = 2.4;
model.bot.updateMatrixWorld(true);
const animated = new THREE.Box3().setFromObject(model.robot);
assert.ok(animated.min.toArray().every(Number.isFinite) && animated.max.toArray().every(Number.isFinite));
console.log('Robot metallic materials, articulated detail, eye attachment and shelf bounds passed.');
