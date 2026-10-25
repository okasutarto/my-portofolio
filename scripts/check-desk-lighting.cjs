// Run: node scripts/check-desk-lighting.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/features/desk/deskScene.js'), 'utf8');
const lampCode = source.slice(source.indexOf('  const setLamp ='), source.indexOf('  register(lamp, {'));
const themeCode = source.slice(source.indexOf('  function setTheme('), source.indexOf('  setTheme(dark);'));
const color = () => ({ set(value) { this.value = value; } });
const material = () => ({ color: color() });
const sun = { color: color(), position: { set(...xyz) { this.xyz = xyz; } } };
const windowLight = { color: color() };
const lampLight = {};
const ambient = {};
const readabilityFill = {};
const skyFill = {};
const context = vm.createContext({
  darkNow: false, roomDark: false, sun, windowLight, lampLight, ambient, readabilityFill, skyFill,
  chairFrameMat: material(), jointMat: material(),
  bulbMat: material(), floorMat: material(), backWallMat: material(),
  sideWallMat: material(), trimMat: material(), deskMat: material(), shadowFill: material(),
  scene: {}, THREE: { Color: class { constructor(value) { this.value = value; } } },
  windowView: { userData: { tex: { redraw() {} } } },
  PALETTES: { light: { desk: '#a388ee', shadow: '#000' }, dark: { desk: '#6b5bc4', shadow: '#000' } },
});
vm.runInContext(lampCode + themeCode, context);
const theme = (dark) => vm.runInContext(`setTheme(${dark})`, context);

theme(false);
const daySun = sun.intensity;
const dayWindow = windowLight.intensity;
const dayDirection = sun.position.xyz;
const dayBaseFill = ambient.intensity + skyFill.intensity + readabilityFill.intensity;
assert.equal(sun.castShadow, true);
assert.equal(windowLight.castShadow, false, 'daylight must not add divergent projector shadows to parallel sunlight');
assert.ok(windowLight.intensity > 0, 'window pane accent must remain visible during the day');
assert.equal(lampLight.intensity, 0);
assert.equal(lampLight.castShadow, false);
assert.ok(skyFill.intensity > 0 && readabilityFill.intensity > 0, 'daylight must fill areas beyond the window patch');

theme(true);
assert.ok(dayBaseFill > ambient.intensity + skyFill.intensity + readabilityFill.intensity,
  'the broad daytime fill must be stronger than the night fill');
assert.ok(readabilityFill.intensity > 0, 'front fill must reveal dark object details at night');
assert.ok(lampLight.intensity > 0, 'the real desk bulb must light the night scene');
assert.equal(lampLight.castShadow, true, 'night shadows must come from the desk lamp');
assert.equal(sun.castShadow, true, 'cool fill must preserve shadows outside the lamp cone');
assert.notDeepEqual(sun.position.xyz, dayDirection, 'night fill must make shorter shadows than window sunlight');
assert.equal(windowLight.castShadow, true, 'window panes and occluding objects must still project shadows at night');
assert.ok(sun.intensity > 0 && sun.intensity < daySun / 5, 'night fill must stay much weaker than daylight');
assert.ok(windowLight.intensity > 0, 'moonlit panes must remain visible at night');

theme(false);
assert.equal(sun.intensity, daySun);
assert.deepEqual(sun.position.xyz, dayDirection);
assert.equal(windowLight.intensity, dayWindow);
assert.equal(sun.castShadow, true);
assert.equal(windowLight.castShadow, false);
assert.equal(lampLight.intensity, 0);
assert.equal(lampLight.castShadow, false);
assert.ok(readabilityFill.intensity > 0);

// Exercise the same per-frame contact update used by the moving mouse and lifted mug.
const object = { position: { x: 5.6, y: 0, z: -0.6 }, rotation: { y: 0.2 } };
const plane = { position: {}, rotation: {}, material: {}, scale: { setScalar(value) { this.value = value; } } };
context.contactShadows = [{ object, plane, baseY: 0, strength: 1 }];
const contactUpdate = source.slice(source.indexOf('    for (const { object, plane, baseY, strength } of contactShadows)'), source.indexOf('    if (now - lastBlink'));
vm.runInContext(contactUpdate, context);
const groundedOpacity = plane.material.opacity;
assert.equal(plane.position.x, object.position.x);
assert.equal(plane.position.z, object.position.z);
object.position.y = 0.7;
object.position.x += 0.2;
vm.runInContext(contactUpdate, context);
assert.equal(plane.position.x, object.position.x);
assert.ok(plane.material.opacity > 0 && plane.material.opacity < groundedOpacity);
assert.ok(plane.scale.value > 1);
console.log('Day/night light-source and shadow switching checks passed.');
