// Run: node scripts/check-desk-lighting.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = require('./helpers/desk-source.cjs').readDeskSource();
const THREE = require('three');
const textures = require('./helpers/texture-source.cjs').readTexturesSource();
const skySource = textures.slice(textures.indexOf('function mixHex('), textures.indexOf('// `time` is the part of the day outside')).replace('export function', 'function');
const windowSky = vm.runInNewContext(skySource + '; windowSky');
const moodCode = source.slice(source.indexOf('  const daylightParts ='), source.indexOf('  const windowView ='));
// The room opens on the part of the day its time mode gives (auto: the visitor's clock); a
// night start waits for the page's dark theme, so a light page opens on the morning
const daylightSource = fs.readFileSync(path.join(__dirname, '../src/components/features/desk/daylight.js'), 'utf8').replace(/export /g, '');
const daylight = vm.runInNewContext(daylightSource + '; ({ TIME_MODES, partFor, partOfDay })');
for (const [hour, expected] of [[6, 'morning'], [12, 'day'], [17, 'evening'], [21, 'night'], [2, 'night']]) {
  assert.equal(daylight.partOfDay(new Date(2026, 0, 1, hour)), expected, `${hour}:00 is ${expected}`);
}
for (const [time, dark, expected] of [['morning', false, 'morning'], ['day', false, 'day'], ['evening', false, 'evening'], ['night', false, 'morning'], ['day', true, 'night']]) {
  const mood = vm.runInNewContext(moodCode + '; ({ dayPart, outside })', {
    windowSky, previewTime: null, dark, time, partFor: daylight.partFor, outside: { night: dark },
  });
  assert.equal(mood.dayPart(), expected, `${time}${dark ? ' on a dark page' : ''} opens on ${expected}`);
}
let clockPart = 'day';
let weatherChecks = 0;
let now = 0;
const material = () => ({ color: new THREE.Color() });
const sun = new THREE.DirectionalLight();
const windowLight = new THREE.SpotLight();
const lampLight = new THREE.PointLight();
const ambient = new THREE.AmbientLight();
const readabilityFill = new THREE.DirectionalLight();
const skyFill = new THREE.HemisphereLight();
const events = [];
const context = vm.createContext({
  ...vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/components/features/desk/woods.js'), 'utf8').replace(/export /g, '') + '; ({ WOODS, WOOD_PATTERNS, DEFAULT_WOODS })'),
  wallColor: '#3a3a3a', woods: {}, diorama: false, roomBackground: isDark => isDark ? '#d6d3e6' : '#ffffff',
  deskWood: {}, riserGrain: {}, frameGrainTex: {}, shelfWood: {},
  frameWood: material(), shelfMat: material(), shelfBackMat: material(), lipMat: material(),
  familyPhoto: { userData: { tex: { redraw() {} } } },
  THREE, windowSky, previewTime: null, roomLight: { night: 0 }, dark: false, outside: { night: false, rain: 0 },
  time: 'auto', TIME_MODES: daylight.TIME_MODES, partFor: (mode) => (daylight.TIME_MODES[mode] && mode !== 'auto' ? mode : clockPart),
  refreshWeather: () => weatherChecks++,
  performance: { now: () => now }, Math: Object.assign(Object.create(Math), { random: () => 0.5 }),
  deskNeons: [{ strip: {}, washMat: {} }, { strip: {}, washMat: {} }], fitSunShadow() {},
  aimWindowLight: (at) => { windowLight.userData.sky = [...at]; }, blindFabric: {}, shadowedNeons: [{}, {}, {}],
  cookieRain: 0, drawGlassCookie() {}, DESK_WASH: 0.45, monitorGlowMat: {}, updateLampGlow() {}, updateLightbar() {}, setLightbar() {}, lightbarState: { power: 0 },
  riserMat: material(), riserLegMat: material(), RISER_LEG_SHADE: 0.8,
  hoopBoardFace: { material: { emissiveIntensity: 0 } }, net: { material: material() },
  sun, windowLight, lampLight, ambient, readabilityFill, skyFill,
  jointMat: material(), floorMat: material(), backWallMat: material(),
  sideWallMat: material(), trimMat: material(), deskMat: material(), shadowFill: material(),
  scene: {}, gsap: { killTweensOf() {} }, setNeon() {}, catSettle() {}, desktop: { setTheme() {} }, redrawScreen() {},
  onEvent: (name, payload) => events.push([name, payload.dark]),
  windowView: { userData: { tex: { redraw() {} } } },
  PALETTES: { light: { desk: '#a388ee', shadow: '#000' }, dark: { desk: '#6b5bc4', shadow: '#000' } },
});
const lampCode = source.slice(source.indexOf('  const setLamp ='), source.indexOf('  // Like a desk lamp with a mind'));
const themeStart = source.indexOf('  // ---------- theme ----------');
vm.runInContext(moodCode + lampCode + source.slice(themeStart, source.indexOf('  // ---------- pointer', themeStart)), context);
const run = (code) => vm.runInContext(code, context);
const update = (at) => { now = at; run(`updateLighting(${at})`); };
update(0);
const clearDay = windowLight.intensity;
const clearAmbient = ambient.intensity;
const clearShadowRadius = windowLight.shadow.radius;
assert.equal(sun.castShadow, true, 'room bounce retains soft cast shadows on all props outside the direct window patch');
assert.equal(windowLight.castShadow, true);
assert.ok(clearDay > sun.intensity * 5, 'window is the dominant direct light');
assert.equal(lampLight.intensity, 0);
context.outside.rain = 1;
update(10);
assert.ok(windowLight.intensity < clearDay * 0.15, 'rain obscures the sun');
assert.ok(windowLight.shadow.radius > clearShadowRadius * 2, 'rain softens the exterior light shadow');
assert.ok(ambient.intensity > clearAmbient * 0.7, 'cloudy sky still provides diffuse light');
update(20);
assert.ok(Math.abs(windowLight.intensity - clearDay * 0.12) < 1e-10, 'rain attenuation must not compound every frame');
context.outside.rain = 0;
update(30);
assert.equal(windowLight.intensity, clearDay, 'clear weather restores daylight');
assert.equal(windowLight.shadow.radius, clearShadowRadius, 'clear weather restores crisp daylight shadows');
const dayColor = context.scene.background.clone();
const daySky = context.outside.sky.sun.slice();
now = 90000;
run('updateDaylight(90000)');
assert.equal(run('dayPart()'), 'day', 'the room holds while the clock stays in the same part of the day');
clockPart = 'evening';
now = 100000;
run('updateDaylight(100000)');
assert.equal(run('dayPart()'), 'day', 'the clock is only read every half minute');
now = 120000;
run('updateDaylight(120000)');
assert.equal(run('dayPart()'), 'evening', 'the room moves on when the visitor\'s clock does');
assert.equal(windowLight.intensity, clearDay, 'theme request does not jump the light');
update(121000);
assert.ok(Math.abs(windowLight.intensity - (clearDay + 1.8) / 2) < 1e-10);
assert.ok(context.outside.sky.sun[1] > daySky[1], 'sun lowers smoothly toward the evening horizon');
assert.deepEqual(windowLight.userData.sky, [...context.outside.sky.sun], 'painted sun and shadow light use the same coordinates');
update(122000);
assert.equal(windowLight.intensity, 1.8);
now = 180000;
clockPart = 'night';
run('updateDaylight(180000)');
update(181000);
assert.ok(lampLight.intensity > 0 && lampLight.intensity < 8, 'desk lamp fades in with night');
assert.ok(!context.scene.background.equals(dayColor));
const halfwayNight = windowLight.intensity;
const halfwaySky = [...context.outside.sky.sun];
run('setRoomTheme(false)');
assert.equal(windowLight.intensity, halfwayNight, 'interrupted transition starts at its current light');
assert.deepEqual([...context.outside.skyFrom.sun], halfwaySky, 'interrupted sky starts at its current position');
update(183000);
assert.equal(lampLight.intensity, 0);
assert.equal(lampLight.castShadow, false);
assert.equal(run('dayPart()'), 'morning');
now = 200000;
run('setRoomTheme(true)');
update(202000);
assert.equal(lampLight.intensity, 8);
assert.ok(ambient.intensity < clearAmbient / 2, 'night ambient must leave the desk lamp and neons in charge');
assert.ok(windowLight.intensity < clearDay / 10, 'moonlight stays subtle compared with sunlight');
assert.ok(windowLight.intensity < clearDay / 2);
assert.ok(context.shadowedNeons.every((light) => light.castShadow));
assert.deepEqual(events, [['nightShift', true]]);
// The exposed bulb uses an omnidirectional light at the filament, not a displaced cone.
{
  const lampStart = source.indexOf('  const lampLight = new THREE.');
  const lampEnd = source.indexOf('  lampHead.add(', lampStart);
  const bulb = vm.runInNewContext(source.slice(lampStart, lampEnd) + '; lampLight', { THREE, BULB_Y: -0.86 });
  assert.ok(bulb.isPointLight, 'an exposed bulb must illuminate both wall and desk');
  assert.equal(bulb.position.y, -0.86, 'light originates inside the bulb');
  assert.ok(bulb.shadow.camera.near < 0.1, 'nearby socket can occlude the bulb');
}
// The desk light spans the entire rear edge, with overlapping samples and no monitor hotspots.
{
  const scene = new THREE.Scene();
  const ctx = vm.createContext({ THREE, scene, WALL_Z: -4.58, track: (value) => value, noRaycast() {}, DESK_WASH: 0.45 });
  const start = source.indexOf('  const neonLights =');
  const end = source.indexOf('  // A framed illustration on the left wall:', start);
  vm.runInContext(source.slice(start, end), ctx);
  const lights = vm.runInContext('deskNeons.flatMap(({ lights }) => lights)', ctx);
  assert.equal(lights.length, 4);
  assert.ok(lights.every((light) => light.isSpotLight && light.castShadow && light.penumbra > 0 && light.penumbra < 0.2), 'strip samples are feathered and shadowed');
  assert.ok(lights.every((light) => light.decay === 0 && light.angle > 1.3), 'line samples must overlap without near-wall inverse-square hotspots');
  assert.ok(lights[0].position.x < -5 && lights.at(-1).position.x > 5, 'illumination spans the full fourteen-unit desk');
  for (let i = 1; i < lights.length; i++) assert.ok(Math.abs(lights[i].position.x - lights[i - 1].position.x - 3.5) < 1e-10, 'uniform spacing avoids concentrated light centres');
  assert.ok(lights.every((light) => light.position.z === -4.23 && light.position.y === -0.3), 'every source belongs to the actual rear LED strip');
  vm.runInContext('updateNeonLights(0)', ctx);
  assert.ok(lights.every((light) => light.intensity === 0), 'strip is off in daylight');
  vm.runInContext('deskNeons.forEach(({ washMat }) => washMat.opacity = DESK_WASH); updateNeonLights(100)', ctx);
  assert.ok(lights.every((light) => Math.abs(light.intensity - 1.65) < 1e-10), 'even output across the strip at night');
  const monitor = new THREE.Group();
  ctx.monitor = monitor;
  ctx.SCREEN_Y = 2.13;
  const biasStart = source.indexOf('  // The monitor has the same cyan/pink bias strip.');
  vm.runInContext(source.slice(biasStart, source.indexOf('  // Sticky notes on the right', biasStart)), ctx);
  const bias = monitor.children.filter((child) => child.isSpotLight);
  assert.equal(bias.length, 2, 'monitor has matching rear-facing strip lighting');
  assert.ok(bias.every((light) => light.position.z < -0.07 && light.target.position.z < light.position.z && light.castShadow));
  assert.deepEqual(bias.map((light) => light.color.getHex()), [0x00e0c6, 0xff90e8]);
  assert.equal(vm.runInContext('shadowedNeons.length', ctx), 6, 'desk and monitor leave sampler headroom for the task light and textured materials');
  vm.runInContext('monitorGlowMat.opacity = 0.7; updateNeonLights(200)', ctx);
  assert.ok(bias.every((light) => light.intensity === 2.2));
}
assert.ok(source.includes('const LIGHTING_TRANSITION = 2000'), 'phase fades complete in two seconds');
now = 250000;
const checksBefore = weatherChecks;
run('updateDaylight(250000)');
assert.equal(run('nextDaylightAt') - now, 30000, 'the clock is read again in half a minute, with no timed cycle');
assert.equal(weatherChecks, checksBefore + 1, 'the visitor\'s weather is checked on the same beat');
run('setTime("evening")');
assert.equal(run('dayPart()'), 'evening', 'a picked part of the day holds');
clockPart = 'morning';
now = 400000;
run('updateDaylight(400000)');
assert.equal(run('dayPart()'), 'evening', 'a picked part of the day ignores the clock');

// Preserve texture/detail samplers when night and close-up lights compete for GPU slots.
{
  const scene = new THREE.Scene();
  const detailed = new THREE.MeshToonMaterial({ map: new THREE.Texture(), emissiveMap: new THREE.Texture(),
    gradientMap: new THREE.Texture(), bumpMap: new THREE.Texture() });
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(), detailed));
  const light = () => new THREE.SpotLight(0xffffff, 1);
  const swordSpotlight = light();
  swordSpotlight.intensity = 0;
  const windowLight = light();
  windowLight.map = new THREE.Texture();
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  const lampLight = light(), lightbarLight = light(), signLight = light(), screenLight = light();
  const shadowedNeons = [signLight, screenLight, ...Array.from({ length: 6 }, light)];
  const ctx = vm.createContext({ scene, renderer: { capabilities: { maxTextures: 16 } }, swordSpotlight,
    windowLight, sun, lampLight, lightbarLight, signLight, screenLight, shadowedNeons,
    darkNow: true, lightingBlending: false, lowPower: false, benchmark: null });
  const start = source.indexOf('  const materialMapKeys =');
  vm.runInContext(source.slice(start, source.indexOf('  let frame = null;', start)), ctx);
  const checkBudget = () => {
    vm.runInContext('updateShadowBudget()', ctx);
    const shadows = vm.runInContext('shadowLights.filter((light) => light.castShadow).length', ctx);
    assert.ok(shadows + 4 + 1 <= 16, 'shadows plus material textures and window cookie must fit the fragment limit');
    assert.equal(sun.castShadow, true, 'retain the room-wide shadow before redundant strip samples');
  };
  checkBudget();
  const shadowed = () => vm.runInContext('shadowLights.map((light) => light.castShadow).join()', ctx);
  const dark = shadowed();
  swordSpotlight.intensity = 1.25;
  checkBudget();
  assert.equal(shadowed(), dark, 'a light coming on keeps the shadowed set, so no lit shader recompiles');
  assert.equal(swordSpotlight.castShadow, true, 'focused swords retain priority without dropping printed detail');
  assert.ok(detailed.map && detailed.emissiveMap && detailed.gradientMap && detailed.bumpMap, 'keep material detail intact');
  ctx.darkNow = false;
  checkBudget();
  assert.ok(shadowedNeons.every((light) => !light.castShadow), 'daylight releases decorative shadow slots');
  ctx.lightingBlending = true;
  checkBudget();
}

// Exercise the production aiming function, not a duplicate of its direction formula.
{
  const windowGroup = new THREE.Group();
  windowGroup.rotation.y = Math.PI / 2;
  const windowGlass = new THREE.Vector3(-7.3, 4.7, -1.1);
  const windowRay = new THREE.Vector3();
  const light = new THREE.SpotLight();
  const aimContext = vm.createContext({ windowGroup, windowGlass, windowRay, windowLight: light,
    sun: new THREE.DirectionalLight(), WINDOW_SUN_FAR: 30, drawGlassCookie() {} });
  const start = source.indexOf('  function aimWindowLight(');
  vm.runInContext(source.slice(start, source.indexOf('  // The beam through the window:', start)), aimContext);
  const direction = (time) => {
    aimContext.from = windowSky(time).sun;
    vm.runInContext('aimWindowLight(from)', aimContext);
    assert.ok(light.position.x < windowGlass.x, `${time}: source stays outside the window`);
    return windowRay.clone().negate();
  };
  const morning = direction('morning');
  const midday = direction('day');
  const evening = direction('evening');
  const night = direction('night');
  // The monitor face is at Z=-2.66, centred at X=-0.2, Y=3.13.
  const hitMonitor = new THREE.Ray(windowGlass, morning).intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 2.66), new THREE.Vector3());
  assert.ok(hitMonitor && Math.abs(hitMonitor.x + 0.2) < 1 && hitMonitor.y > 1.8 && hitMonitor.y < 4.4,
    'morning central ray must hit the monitor face, not the chair');
  const hitDesk = new THREE.Ray(windowGlass, midday).intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
  assert.ok(hitDesk && Math.abs(hitDesk.x) < 7 && Math.abs(hitDesk.z) < 4.2, 'noon central ray lands on the desktop');
  const morningElevation = Math.atan2(-morning.y, Math.hypot(morning.x, morning.z)) * 180 / Math.PI;
  assert.ok(morningElevation > 22 && morningElevation < 30, 'morning sun must rise enough to cast useful tabletop shadows');
  const lowerMonitor = new THREE.Vector3(-0.2, 1.9, -2.66);
  const monitorShadow = new THREE.Ray(lowerMonitor, morning).intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
  assert.ok(monitorShadow && Math.abs(monitorShadow.x) < 7 && Math.abs(monitorShadow.z) < 4.2,
    'morning shadow of the lower monitor reaches the desk instead of passing beyond its edge');
  assert.ok(morning.z < 0 && evening.z > 0, 'sunrise faces the monitor, sunset reaches toward the front');
  assert.ok(Math.abs(midday.y) > Math.abs(morning.y) && Math.abs(midday.y) > Math.abs(evening.y), 'noon gives shorter shadows');
  assert.ok(night.x > 0 && night.y < 0 && night.z > 0, 'moonlight follows the upper-right moon in the window');
}
// Rain must attenuate and recover correctly in every phase.
const hoopGlow = {};
for (const part of ['morning', 'day', 'evening', 'night']) {
  now += 10000;
  run(`daylightPart = '${part}'; setRoomTheme(${part === 'night'})`);
  update(now + 5000);
  hoopGlow[part] = [context.hoopBoardFace.material.emissiveIntensity, context.net.material.color.r];
  const clear = windowLight.intensity;
  const clearRadius = windowLight.shadow.radius;
  const localLamp = lampLight.intensity;
  context.outside.rain = 1;
  update(now + 1);
  assert.ok(Math.abs(windowLight.intensity - clear * 0.12) < 1e-10, `${part}: rain dims direct light`);
  assert.ok(windowLight.shadow.radius > clearRadius, `${part}: rain softens exterior shadows`);
  assert.equal(lampLight.intensity, localLamp, `${part}: rain does not dim the indoor lamp`);
  context.outside.rain = 0;
  update(now + 1);
  assert.equal(windowLight.intensity, clear, `${part}: clear weather restores direct light`);
  assert.equal(windowLight.shadow.radius, clearRadius, `${part}: shadow softness recovers`);
}
// The backboard's glowing print settles into the room's light from dusk on
assert.deepEqual(hoopGlow.morning, hoopGlow.day);
assert.ok(hoopGlow.day[0] > hoopGlow.evening[0] && hoopGlow.evening[0] > hoopGlow.night[0], 'backboard glow dims towards night');
assert.ok(hoopGlow.day[1] > hoopGlow.evening[1] && hoopGlow.evening[1] > hoopGlow.night[1], 'net darkens towards night');

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

// Shelf lighting stays aligned in one hue; animation is reserved for the cheat-code party.
{
  const THREE = require('three');
  const shelfLeds = Array.from({ length: 4 }, () => ({ ledMat: { color: new THREE.Color() }, glowMat: { color: new THREE.Color(), opacity: 0 } }));
  const shelfContext = vm.createContext({ shelfLeds, shelfLights: [{ color: new THREE.Color() }], ledColor: new THREE.Color(), ledPartyUntil: 0, roomLight: { night: 0 }, darkNow: false });
  const start = source.indexOf('  function updateShelfLeds(');
  vm.runInContext(source.slice(start, source.indexOf('  // A neon sign', start)), shelfContext);
  vm.runInContext('updateShelfLeds(0)', shelfContext);
  assert.ok(shelfLeds.every(({ glowMat }) => glowMat.opacity === 0), 'shelf glow off by day');
  shelfContext.darkNow = true;
  shelfContext.roomLight.night = 1;
  vm.runInContext('updateShelfLeds(100)', shelfContext);
  const hue = shelfLeds[0].ledMat.color.getHex();
  vm.runInContext('updateShelfLeds(50000)', shelfContext);
  assert.ok(shelfLeds.every(({ ledMat, glowMat }) => ledMat.color.getHex() === hue && glowMat.opacity === 0.5), 'all shelf bays keep a stable colour at night');
}
