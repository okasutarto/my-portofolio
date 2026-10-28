// Run: node scripts/check-desk-controller-bubble.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const THREE = require('three');
const source = fs.readFileSync(`${__dirname}/../src/components/features/desk/deskScene.js`, 'utf8');
const textures = fs.readFileSync(`${__dirname}/../src/components/features/desk/textures.js`, 'utf8');
const BUBBLE_TAILS = vm.runInNewContext(textures.slice(textures.indexOf('export const BUBBLE_TAILS'), textures.indexOf('function drawMangaBubble')).replace('export ', '') + '; BUBBLE_TAILS');
const shelf = new THREE.Group();
shelf.position.set(10.5, -5.2, -3.75);
const pads = [-0.35, 0.9].map((x) => {
  const item = new THREE.Group();
  item.position.set(x, 0.2, 0.12);
  const pad = new THREE.Group();
  pad.position.set(0, 0.37, 0.04);
  item.add(pad);
  item.userData.moves = pad;
  shelf.add(item);
  return item;
});
const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 100);
const sprite = new THREE.Sprite();
const print = { tail: 'side-left' };
const ctx = vm.createContext({ THREE, camera, BUBBLE_TAILS, pad1: pads[0], pad2: pads[1], trophy: {},
  shelfBubbleTarget: null, shelfBubbleAt: new THREE.Vector3(), SHELF_BUBBLE_W: 2.7,
  trophyBubbleRight: new THREE.Vector3(), trophyBubbleUp: new THREE.Vector3(),
  shelfBubblePrint: print, shelfBubble: { sprite, say() {} },
});
const start = source.indexOf('  function placeControllerBubble()');
vm.runInContext(source.slice(start, source.indexOf('  function powerConsole()', start)), ctx);
for (const pad of pads) {
  ctx.pad = pad;
  for (const yaw of [-0.3, 0, 0.3]) {
    camera.position.set(10.5, 0, 8);
    camera.lookAt(10.5, -3, -3.75);
    camera.rotateY(yaw);
    camera.updateMatrixWorld(true);
    vm.runInContext("shelfSay(pad, 'cheat code')", ctx);
    assert.ok(['left', 'right'].includes(print.tail), 'controller bubble uses a downward diagonal tail');
    for (const width of [0.432, 2.7, 3.1]) {
      sprite.scale.set(width, width * 1.42 / 2.7, 1);
      pad.userData.moves.position.x += 0.04;
      vm.runInContext('placeControllerBubble()', ctx);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      const anchor = pad.userData.moves.getWorldPosition(new THREE.Vector3()).addScaledVector(up, 0.32);
      const [tipX, tipY] = BUBBLE_TAILS[print.tail].tip;
      const tip = sprite.position.clone().addScaledVector(right, (tipX - 0.5) * sprite.scale.x).addScaledVector(up, (0.5 - tipY) * sprite.scale.y);
      assert.ok(tip.distanceTo(anchor) < 1e-9, 'tail follows the pad through camera changes, vibration and bubble scale animation');
      assert.ok(sprite.position.clone().sub(anchor).dot(up) > 0, 'bubble sits above the controller rather than on the floor');
    }
  }
}
console.log('Controller bubble: elevated position and exact diagonal-tail anchoring passed.');
