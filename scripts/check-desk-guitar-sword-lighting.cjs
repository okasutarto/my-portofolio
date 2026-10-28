// Run: node scripts/check-desk-guitar-sword-lighting.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const THREE = require('three');
const source = fs.readFileSync('src/components/features/desk/deskScene.js', 'utf8');

const stringCode = source.match(/  const stringMat = .*;/)[0];
const stringMat = vm.runInNewContext(`${stringCode}; stringMat`, {
  THREE, track: value => value,
  toon: color => new THREE.MeshToonMaterial({ color }),
});
assert.ok(stringMat.isMeshToonMaterial, 'strings respond to room lighting, including hover/strum colours');
assert.equal(stringMat.color.getHexString(), 'b8bec7');

const scene = new THREE.Scene();
const katanaRack = new THREE.Group();
katanaRack.position.set(2, 8, -4);
scene.add(katanaRack);
const context = vm.createContext({
  THREE, scene, katanaRack, track: value => value, noRaycast() {},
  aoPass: { overrideVisibility() {} }, gauntlet: {}, focus: { name: 'swords' },
  camera: new THREE.PerspectiveCamera(), screenAxis: new THREE.Vector3(),
});
const start = source.indexOf('  const SPOT_REACH =');
const end = source.indexOf("  // The rack's own close-up:", start);
vm.runInContext(source.slice(start, end), context);
const run = code => vm.runInContext(code, context);
run('updateSpotlight(10)');
const light = run('swordSpotlight');
assert.ok(light.isSpotLight);
assert.ok(Math.abs(light.intensity - 1.25) < 1e-10);
assert.equal(light.castShadow, true, 'swords and rack occlude the focus light');
assert.equal(light.shadow.mapSize.x, 1024);
assert.equal(light.shadow.autoUpdate, false, 'inactive focus does not render a shadow map every frame');
assert.equal(light.shadow.needsUpdate, true, 'active focus refreshes shadows for sword animation');
assert.equal(light.decay, 0, 'focus light has stable output over the sword sweep');
assert.ok(light.target.position.equals(katanaRack.position));
assert.ok(light.position.equals(katanaRack.position.clone().add(new THREE.Vector3(0, 3, 6))));
const themeStart = source.indexOf('  // ---------- theme ----------');
const themeEnd = source.indexOf('  // ---------- pointer', themeStart);
assert.ok(!source.slice(themeStart, themeEnd).includes('swordSpotlight'), 'room phase and rain never modulate the dedicated key');
context.focus.name = null;
run('updateSpotlight(0.05)');
assert.ok(light.intensity > 0 && light.intensity < 1.25, 'light fades out on leaving the rack');
run('updateSpotlight(10)');
assert.ok(light.intensity < 1e-10);
light.shadow.needsUpdate = false;
run('updateSpotlight(0.05)');
assert.equal(light.shadow.needsUpdate, false, 'inactive focus leaves the shadow map cached');
context.focus.name = 'swords';
run('updateSpotlight(0.05)');
assert.equal(light.shadow.needsUpdate, true, 'returning to the rack refreshes the shadow map');
console.log('Guitar strings and independent sword spotlight checks passed.');
