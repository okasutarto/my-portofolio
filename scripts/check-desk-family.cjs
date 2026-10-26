// Run: node scripts/check-desk-family.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('three');
const source = fs.readFileSync(path.join(__dirname, '../src/components/features/desk/deskScene.js'), 'utf8');
let loaded;
let entry;
const scene = new THREE.Group();
const family = vm.runInNewContext(source.slice(source.indexOf('  // Family keepsake:'), source.indexOf('  // ---------- potted plant')) + '; ({ familyFrame, familyPhoto })', {
  THREE: { ...THREE, TextureLoader: class { load(url) { loaded = url; return new THREE.Texture(); } } },
  process: { env: { BASE_URL: '/' } }, scene,
  toon: (color) => new THREE.MeshToonMaterial({ color }), track: (value) => value,
  rbox: (w,h,d) => new THREE.BoxGeometry(w,h,d), mesh: (geometry, material) => new THREE.Mesh(geometry, material),
  hoverScale() {}, register: (object, handlers) => { entry = { object, ...handlers }; },
});
const png = fs.readFileSync(path.join(__dirname, '../public/images/family-anime.png'));
const ratio = png.readUInt32BE(16) / png.readUInt32BE(20);
const { width, height } = family.familyPhoto.geometry.parameters;
assert.ok(Math.abs(width / height - ratio) < 0.005, 'preserve supplied portrait aspect ratio');
assert.equal(loaded, '/images/family-anime.png');
assert.equal(entry.focus, 'family', 'photo is registered for camera zoom');
scene.updateMatrixWorld(true);
const bounds = new THREE.Box3().setFromObject(family.familyFrame);
assert.ok(bounds.min.x > -5.4 && bounds.max.x < -3.525, 'frame fits between lamp base and left speaker');
assert.ok(bounds.min.y > -0.06 && bounds.max.y < 1.8, 'frame stands on desk');
const shotStart = source.indexOf('    family: () => {');
const shot = vm.runInNewContext('({' + source.slice(shotStart, source.indexOf('    // Face-on to the phone', shotStart)) + '}).family()', {
  familyFrame: family.familyFrame, screenPos: new THREE.Vector3(), screenNormal: new THREE.Vector3(),
});
assert.ok(new THREE.Vector3(...shot.target).distanceTo(family.familyFrame.localToWorld(new THREE.Vector3(0,1.06,0.1))) < 1e-8);
assert.ok(shot.fit[0] >= 1.24 && shot.fit[1] >= 1.95, 'close-up fits entire frame');
// Hover must preserve the smaller resting scale after the pointer leaves.
const hoverStart = source.indexOf('  const hoverScale =');
const hover = vm.runInNewContext(source.slice(hoverStart, source.indexOf('  const shadowFill', hoverStart)) + '; hoverScale', {
  gsap: { to: (scale, values) => { for (const axis of ['x','y','z']) scale[axis] = values[axis]; } },
});
hover(family.familyFrame, 0.82, 0.8)(true);
hover(family.familyFrame, 0.82, 0.8)(false);
assert.equal(family.familyFrame.scale.x, 0.8);
assert.equal(family.familyFrame.scale.y, 0.8);
assert.equal(family.familyFrame.scale.z, 0.8);
console.log('Family artwork, aspect ratio, placement, click registration and camera checks passed.');
