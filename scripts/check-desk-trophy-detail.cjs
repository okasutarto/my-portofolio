// Run: node scripts/check-desk-trophy-detail.cjs
const assert = require('node:assert/strict');
const vm = require('node:vm');
const THREE = require('three');
const textureSource = require('./helpers/texture-source.cjs').readTexturesSource();
const textures = vm.runInNewContext(textureSource.slice(textureSource.indexOf('// Trophy metal:'), textureSource.indexOf('// ---------- katana ----------')).replace(/export /g, '') + '; ({ drawTrophyMetal, drawTrophyStone })');
const ctx = new Proxy({}, { get: (_, key) => (...args) => {
  args.filter(value => typeof value === 'number').forEach(value => assert.ok(Number.isFinite(value)));
  if (key === 'createLinearGradient') return { addColorStop() {} };
}, set: () => true });
textures.drawTrophyMetal(ctx, 256, 256);
textures.drawTrophyStone(ctx, 256, 256);
const source = require('./helpers/desk-source.cjs').readDeskSource();
const materials = [];
const trophy = vm.runInNewContext(source.slice(source.indexOf('  const trophyGold ='), source.indexOf('  const handheld =')) + '; trophy', {
  THREE, ...textures, track: value => value, scene: new THREE.Scene(),
  toon: color => { const mat = new THREE.MeshToonMaterial({ color }); materials.push(mat); return mat; },
  canvasTexture: () => ({ texture: new THREE.Texture(), ctx }),
  drawSatinFinish() {}, drawBrushedMetal() {},
  mesh: (geometry, material) => new THREE.Mesh(geometry, material),
  rbox: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  at: (object, x, y, z = 0) => { object.position.set(x, y, z); return object; },
  group: (...objects) => new THREE.Group().add(...objects),
  printed: (w, h, _, draw) => { draw(ctx, 700, 700 * h / w); return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial()); },
  neonLight: () => new THREE.Object3D(), standOn: () => 0, addItem() {},
  secretsFound: new Set(), SECRETS: Array.from({ length: 20 }),
});
assert.ok(materials[0].map && materials[0].bumpMap, 'gold has polish and relief');
assert.equal(materials[0].bumpMap.colorSpace, THREE.NoColorSpace, 'relief uses linear data');
assert.ok(materials[1].map, 'stone base retains its own mineral texture');
assert.equal(trophy.children.filter(child => child.geometry?.type === 'LatheGeometry').length, 2, 'hollow cup and turned stem');
const bounds = new THREE.Box3().setFromObject(trophy);
assert.ok(bounds.min.toArray().every(Number.isFinite) && bounds.max.toArray().every(Number.isFinite));
assert.ok(bounds.max.y < 1.16 && bounds.min.y >= 0, 'new details fit the shelf footprint');
console.log('Trophy metal/stone textures, turned stem, hollow bowl and shelf bounds passed.');
