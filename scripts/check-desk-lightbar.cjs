// Run: node scripts/check-desk-lightbar.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('three');
const source = fs.readFileSync(path.join(__dirname, '../src/components/features/desk/deskScene.js'), 'utf8');
const start = source.indexOf('  const lightbar =');
const end = source.indexOf('  // The monitor has the same cyan/pink', start);
const monitor = new THREE.Group();
const lampLight = new THREE.PointLight(0xffd394, 5);
const roomLight = { night: 0 };
const context = vm.createContext({ THREE, monitor, lampLight, roomLight,
  brushed: { texture: new THREE.Texture() }, noRaycast() {},
  toon: (color) => new THREE.MeshToonMaterial({ color }),
  rbox: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  mesh: (geo, material) => new THREE.Mesh(geo, material),
});
vm.runInContext(source.slice(start, end), context);
const run = (code) => vm.runInContext(code, context);
const light = run('lightbarLight');
const diffuser = run('lightbarDiffuserMat');
for (const night of [0, 0.5, 1, 0.5, 0]) {
  roomLight.night = night;
  run('updateLightbar()');
  assert.equal(light.intensity, 9 * night, 'output increases by 50 percent over the previous 6');
  assert.equal(diffuser.emissiveIntensity, 1.4 * night);
  assert.equal(light.castShadow, night > 0);
  assert.ok(light.color.equals(lampLight.color));
}
assert.ok(light.target.position.y < light.position.y && light.target.position.z > light.position.z, 'beam aims down and forward onto the desk');
assert.equal(light.shadow.mapSize.x, 512);
assert.equal(light.decay, 0, 'task beam retains useful brightness at desktop distance');
assert.equal(light.angle, Math.PI / 4, 'wider beam extends illumination along the longer lightbar');
const shell = run('lightbarBody');
shell.geometry.computeBoundingBox();
const shellSize = shell.geometry.boundingBox.getSize(new THREE.Vector3());
assert.ok(shellSize.y < 0.12 && shellSize.z < 0.25, 'rectangular housing stays slim');
assert.ok(light.position.z > shellSize.z / 2, 'emitter clears the front of its housing');
assert.ok(light.position.y < -shellSize.y / 2, 'emitter clears the underside of its housing');
assert.ok(run('lightbarMetal').isMeshToonMaterial);
assert.ok(run('lightbarMetal.map').isTexture, 'graphite shell retains brushed texture');
monitor.updateMatrixWorld(true);
const bar = monitor.getObjectByName('monitor-lightbar');
const bounds = new THREE.Box3().setFromObject(bar);
assert.ok(bounds.min.y > 3.92 - 0.5, 'clamp fits around top bezel');
assert.ok(bounds.max.x < 2 && bounds.min.x > -2, 'bar stays inside screen width');
assert.ok(bounds.max.x - bounds.min.x > 3.9, 'bar spans almost the full 4.22-unit monitor width');
assert.ok(source.includes('setLamp(isDark);\n    updateLightbar();'), 'initial theme sets lightbar state');
assert.ok(source.includes('updateLampGlow();\n    updateLightbar();'), 'lightbar follows the smooth day/night transition');
assert.ok(source.includes('register(lightbar,'), 'lightbar is registered as interactive prop');

// Day: toggle attempts do not turn on light
roomLight.night = 0;
run('toggleLightbar()');
assert.equal(light.intensity, 0, 'lightbar stays off when toggled during day');

// Night: toggles on and off
roomLight.night = 1;
run('updateLightbar()');
assert.equal(light.intensity, 9, 'lightbar is on at night');
run('toggleLightbar()');
assert.equal(light.intensity, 0, 'clicking at night turns lightbar off');
assert.equal(light.castShadow, false);
run('toggleLightbar()');
assert.equal(light.intensity, 9, 'clicking again at night turns lightbar back on');
assert.equal(light.castShadow, true);

console.log('Lightbar geometry, toon texture, beam direction, night fade and lamp colour/power checks passed.');
