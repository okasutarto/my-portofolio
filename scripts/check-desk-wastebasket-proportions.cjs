// Run: node scripts/check-desk-wastebasket-proportions.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const THREE = require('three');
const handlers = new Map();
const noop = () => {};
const scene = new THREE.Scene();
const shelf = new THREE.Group();
shelf.position.set(14.6, -7.4, -3.25);
shelf.scale.setScalar(2);
scene.add(shelf);
const camera = new THREE.OrthographicCamera(-5, 5, 4, -4, 0.1, 100);
camera.position.set(21, -2, 10);
camera.lookAt(21.2, -4, -2.6);
camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
const runtime = { core: { scene, camera, gradient: null,
  track: value => value, toon: color => new THREE.MeshToonMaterial({ color }),
  mesh: (geo, mat) => new THREE.Mesh(geo, mat).add(new THREE.Object3D()),
  rbox: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  printed: (w, h) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial()),
  register: (obj, handler) => handlers.set(obj, handler), noRaycast() {},
}, room: { FLOOR_Y: -7.4, WALL_Z: -4.9, DIORAMA: { x1: 24.5 } },
  shelf: { shelf, SHELF_W: 4.2, SHELF_D: 1.5, SHELF_H: 8.4 }, secrets: { discover() {} }, gym: { burst() {} },
};
const apply = (target, values) => {
  for (const axis of ['x', 'y', 'z']) if (axis in values) target[axis] = values[axis];
  values.onComplete?.();
};
let source = fs.readFileSync('src/features/desk3d/scene/wastebasket.js', 'utf8')
  .replace(/^import .*;\n/gm, '').replace('export function', 'function')
  .replace('    bin,\n', '    PAPER_R, binPile, binBody, shoot, SHELF_BOX, hoop, ring,\n    bin,\n');
const context = vm.createContext({ THREE, runtime, performance: { now: () => 1 },
  canvasTexture: () => ({ texture: new THREE.Texture(), ctx: {} }),
  drawRepBadge: noop, drawCrumpledPaper: noop, drawBinRibs: noop, drawBackboard: noop, drawHoopNet: noop,
  gsap: { killTweensOf() {}, fromTo: (target, from, to) => apply(target, to), to: apply },
  sfx: new Proxy({}, { get: () => noop }), setTimeout: () => 0, clearTimeout() {},
});
vm.runInContext(source + '\nvar model = createWastebasket(runtime);', context);
const { bin, binBody, binPile, PAPER_R, papers, SHELF_BOX, ring } = context.model;
scene.updateMatrixWorld(true);
const shell = new THREE.Box3().setFromObject(binBody.children[0], true);
assert.ok(Math.abs(shell.max.y - bin.position.y - 2.96) < 1e-5, 'bin is 29.6 cm tall');
const rim = new THREE.Box3().setFromObject(binBody.children[1], true).getSize(new THREE.Vector3());
assert.ok(Math.abs(rim.x - 2.34) < 0.03, 'rim is approximately 23.4 cm across');
for (const ball of [...binPile, ...papers.map(p => p.ball)]) {
  const worldScale = ball.getWorldScale(new THREE.Vector3()).x;
  const pos = ball.geometry.attributes.position;
  let maxRadius = 0;
  for (let i = 0; i < pos.count; i++) maxRadius = Math.max(maxRadius, new THREE.Vector3().fromBufferAttribute(pos, i).length() * worldScale);
  assert.ok(Math.abs(maxRadius - PAPER_R) < 1e-6, 'pile and thrown paper have the same bounded 3 cm radius');
}
assert.ok((ring.geometry.parameters.radius - ring.geometry.parameters.tube) * bin.scale.x > PAPER_R, 'paper fits through hoop');
assert.ok(Math.abs(SHELF_BOX.x0 - 10.4) < 1e-8);
assert.ok(Math.abs(SHELF_BOX.x1 - 18.8) < 1e-8);
assert.ok(Math.abs(SHELF_BOX.y1 - 9.4) < 1e-8, 'paper collider covers the full-height shelf');
// Exercise the real ballistic path: one score and one miss must both complete.
for (const swish of [true, false]) {
  const paper = papers.find(p => p.state === 'idle');
  context.model.shoot();
  paper.swish = swish;
  for (let i = 0; i < 1800 && ['flying', 'loose'].includes(paper.state); i++) context.model.updatePapers(1 / 120);
  assert.equal(paper.state, swish ? 'idle' : 'litter', 'shot reaches bin or settles on floor');
  if (!swish) {
    assert.ok(Math.abs(paper.ball.position.y - (runtime.room.FLOOR_Y + PAPER_R)) < 1e-8, 'paper rests at the collision radius');
    assert.ok(new THREE.Box3().setFromObject(paper.ball, true).min.y >= runtime.room.FLOOR_Y - 1e-6, 'resting paper does not penetrate the floor');
  }
}
console.log('Bin/rim dimensions, consistent paper radius, hoop clearance, scaled shelf collisions and score/miss paths passed.');
