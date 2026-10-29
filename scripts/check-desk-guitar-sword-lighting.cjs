// Run: node scripts/check-desk-guitar-sword-lighting.cjs
const assert = require('node:assert/strict');
const vm = require('node:vm');
const THREE = require('three');
const source = require('./helpers/desk-source.cjs').readDeskSource();

const stringCode = source.match(/ {2}const stringMat = .*;/)[0];
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
// The room's fill at midday, from the real daylight table
const daylight = vm.runInNewContext('(' + source.slice(source.indexOf('  const DAYLIGHT = {') + '  const DAYLIGHT = '.length, source.indexOf('  function applyDaylight')).replace(/;\s*$/, '') + ')');
const dayFill = daylight.day.ambient + daylight.day.skyPower;
const ambient = { intensity: daylight.day.ambient };
const skyFill = { intensity: daylight.day.skyPower };
const context = vm.createContext({
  THREE, scene, katanaRack, track: value => value, noRaycast() {},
  aoPass: { overrideVisibility() {} }, gauntlet: new THREE.Group(), nintendoSwitch: new THREE.Group(), focus: { name: 'swords' },
  camera: new THREE.PerspectiveCamera(), screenAxis: new THREE.Vector3(),
  DAYLIGHT: daylight, ambient, skyFill,
});
const start = source.indexOf('  const SPOT_REACH =');
const end = source.indexOf("  // The rack's own close-up:", start);
vm.runInContext(source.slice(start, end), context);
const run = code => vm.runInContext(code, context);
run('updateSpotlight(10)');
const light = run('swordSpotlight');
const key = run('SWORD_KEY');
assert.ok(light.isSpotLight);
assert.ok(Math.abs(light.intensity - key) < 1e-10);
assert.equal(light.castShadow, true, 'swords and rack occlude the focus light');
assert.equal(light.shadow.mapSize.x, 1024);
assert.equal(light.shadow.autoUpdate, false, 'inactive focus does not render a shadow map every frame');
assert.equal(light.shadow.needsUpdate, true, 'active focus refreshes shadows for sword animation');
assert.equal(light.decay, 0, 'focus light has stable output over the sword sweep');
assert.ok(light.target.position.equals(katanaRack.position));
assert.ok(light.position.equals(katanaRack.position.clone().add(new THREE.Vector3(0, 3, 6))));
const themeStart = source.indexOf('  // ---------- theme ----------');
const themeEnd = source.indexOf('  // ---------- pointer', themeStart);
assert.ok(!source.slice(themeStart, themeEnd).includes('swordSpotlight'), 'the room phase code leaves the dedicated key alone');
// Evening, night and rain thin the room's fill; the key makes up most of the gap, so the
// swords keep close to their midday light at every hour
for (const [a, sky] of [[daylight.evening.ambient, daylight.evening.skyPower], [0.16, 0.12], [daylight.day.ambient * 0.75, daylight.day.skyPower * 0.62]]) {
  ambient.intensity = a;
  skyFill.intensity = sky;
  run('updateSpotlight(10)');
  const makeup = run('SWORD_FILL_MAKEUP');
  assert.ok(makeup > 0 && makeup <= 1, 'the key makes up part or all of the lost fill');
  assert.ok(Math.abs(light.intensity - (key + (dayFill - a - sky) * makeup)) < 1e-9, 'the key grows with the room\'s lost fill');
  assert.ok(light.intensity > key, 'a dimmer room gets a stronger key');
}
ambient.intensity = daylight.day.ambient;
skyFill.intensity = daylight.day.skyPower;
run('updateSpotlight(10)');
assert.ok(Math.abs(light.intensity - key) < 1e-10, 'at midday the key is just its own strength');
context.focus.name = null;
run('updateSpotlight(0.05)');
assert.ok(light.intensity > 0 && light.intensity < key, 'light fades out on leaving the rack');
run('updateSpotlight(10)');
assert.ok(light.intensity < 1e-10);
light.shadow.needsUpdate = false;
run('updateSpotlight(0.05)');
assert.equal(light.shadow.needsUpdate, false, 'inactive focus leaves the shadow map cached');
context.focus.name = 'swords';
run('updateSpotlight(0.05)');
assert.equal(light.shadow.needsUpdate, true, 'returning to the rack refreshes the shadow map');
console.log('Guitar strings and independent sword spotlight checks passed.');
