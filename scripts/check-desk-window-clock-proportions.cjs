// Run: node scripts/check-desk-window-clock-proportions.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const THREE = require('three');
const source = require('./helpers/desk-source.cjs').readDeskSource();
const room = new THREE.Group();
const scene = new THREE.Scene().add(room);
const handlers = new Map();
const material = new THREE.MeshToonMaterial();
const apply = (target, values) => {
  for (const axis of ['x', 'y', 'z']) if (axis in values) target[axis] = values[axis];
  values.onComplete?.();
};
const context = vm.createContext({ THREE, room, scene, FLOOR_Y: -7.4, SIDE_X: -9.6, WALL_Z: -4.9,
  WINDOW_AT: vm.runInNewContext('(' + source.match(/const WINDOW_AT = ([^;]+);/)[1] + ')'),
  DEFAULT_WOODS: {}, dark: false, time: 'day', previewRain: 0, previewTime: null,
  partFor: () => 'day', windowSky: () => ({}),
  canvasTexture: () => ({ texture: new THREE.Texture(), ctx: new Proxy({}, {
    get: (_, key) => key.startsWith('create') ? () => ({ addColorStop() {} }) : () => {},
  }) }),
  drawWoodTop() {}, drawClockFace() {},
  track: value => value, toon: () => material, printMaterial: () => material,
  mesh: (geo, mat) => new THREE.Mesh(geo, mat),
  rbox: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  printed: (w, h) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), material),
  at: (obj, x, y, z = 0) => { obj.position.set(x, y, z); return obj; },
  noRaycast() {}, register: (obj, handler) => handlers.set(obj, handler),
  gsap: { to: apply, fromTo: (target, from, to) => apply(target, to) },
  sfx: { tick() {}, clockStrike() {} }, discover() {},
});
vm.runInContext(source.slice(source.indexOf('  const windowGroup ='), source.indexOf('  // ---------- a roller blind')) +
  '\nvar windowModel = { windowGroup, windowFrame, sill };', context);
const { windowGroup, windowFrame, sill } = context.windowModel;
scene.updateMatrixWorld(true);
const bounds = obj => new THREE.Box3().setFromObject(obj, true);
const near = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-5, label);
const frameBox = bounds(windowFrame);
near(frameBox.max.z - frameBox.min.z, 8.8, '88 cm window width');
near(frameBox.max.y - frameBox.min.y, 9, '90 cm window height');
near(context.WINDOW_AT.w, frameBox.max.z - frameBox.min.z, 'wall opening matches enlarged frame width');
near(context.WINDOW_AT.h, frameBox.max.y - frameBox.min.y, 'wall opening matches enlarged frame height');
assert.ok(frameBox.min.z > context.WALL_Z + 0.12, 'window clears the back-wall corner');
assert.ok(bounds(sill).min.y > 1.5, 'sill clears the desktop by at least 15 cm');
vm.runInContext(source.slice(source.indexOf('  const clock ='), source.indexOf('  // The rug runs')) +
  '\nvar clockModel = { clock, clockMount, clockRim };', context);
const { clock, clockMount, clockRim } = context.clockModel;
assert.equal(clockMount.parent, null, 'clock stays hidden while the sword rack hangs in its place');
// Measured where it would hang, ready for when it returns to the wall.
clockMount.updateMatrixWorld(true);
const clockBox = bounds(clockRim);
near(clockBox.max.x - clockBox.min.x, 3, '30 cm clock diameter');
near(clockBox.getCenter(new THREE.Vector3()).y + 7.4, 18, 'clock centre is 180 cm above floor');
handlers.get(clock).onClick();
clockMount.updateMatrixWorld(true);
near(bounds(clockRim).max.x - bounds(clockRim).min.x, 3, 'click animation restores the full-size clock');
const lightSource = fs.readFileSync('src/components/features/desk/scene/windowLighting.js', 'utf8').replace(/^import .*;\n/gm, '').replace('export function', 'function');
const lightContext = vm.createContext({ THREE, lowPower: false, runtime: { core: { scene }, room: { windowGroup } } });
vm.runInContext(lightSource.slice(0, lightSource.indexOf('  const windowRay =')) + '\nreturn { windowGlass, windowLight }; }\nvar result = createWindowLighting(runtime);', lightContext);
const glass = windowGroup.localToWorld(new THREE.Vector3(0, 0, 0.06));
assert.ok(lightContext.result.windowGlass.distanceTo(glass) < 1e-8, 'window light follows the scaled glass position');
// The glass is 8 × 8.2 units: 5.73 from its centre to a corner
const sun = lightContext.result.windowLight;
const sunFar = Number(lightSource.match(/const WINDOW_SUN_FAR = ([\d.]+)/)[1]);
const halfGlass = Math.atan(Math.hypot(4, 4.1) / sunFar);
assert.ok(sun.angle * (1 - sun.penumbra) > halfGlass, 'the full-strength cone covers the enlarged glass');
assert.ok(halfGlass < 0.05, 'rays through the glass stay all but parallel, so the noon beam keeps off the back wall');
assert.ok(sun.shadow.camera.near < sunFar - 4 && sun.shadow.camera.far > sunFar + 30, 'the shadow range spans the glass and the room behind it');
console.log('Window dimensions/opening, sill, light origin/cone and clock diameter/mount/click recovery passed.');
