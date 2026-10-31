// Run: node scripts/check-desk-controller-bubble.cjs
const assert = require('node:assert/strict');
const vm = require('node:vm');
const THREE = require('three');
const source = require('./helpers/desk-source.cjs').readDeskSource();
const textures = require('./helpers/texture-source.cjs').readTexturesSource();
const BUBBLE_TAILS = vm.runInNewContext(textures.slice(textures.indexOf('export const BUBBLE_TAILS'), textures.indexOf('function drawMangaBubble')).replace('export ', '') + '; BUBBLE_TAILS');
// The handheld, both controllers and the robot all speak from a bubble up and to their right,
// its tail leaving the bubble's lower left and stopping just short of their top-right corner
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
const robot = new THREE.Group();
robot.position.set(0.4, -1.5, 0.1);
const nintendoSwitch = new THREE.Group();
nintendoSwitch.position.set(0.66, 2.4, 0.05);
shelf.add(robot, nintendoSwitch);
const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 100);
const sprite = new THREE.Sprite();
const print = { tail: 'down-left' };
const ctx = vm.createContext({ THREE, camera, BUBBLE_TAILS, pad1: pads[0], pad2: pads[1], robot, nintendoSwitch, trophy: new THREE.Group(),
  shelfBubbleAt: new THREE.Vector3(), shelfBubblePrint: print, shelfBubble: { sprite, say() {} },
});
const start = source.indexOf('  const shelfBubbleAnchors');
vm.runInContext(source.slice(start, source.indexOf('  function powerConsole()', start)) + '; this.shelfBubbleAnchors = shelfBubbleAnchors;', ctx);
const speakers = [[pads[0], pads[0].userData.moves], [pads[1], pads[1].userData.moves], [robot, robot], [nintendoSwitch, nintendoSwitch]];
for (const [speaker, part] of speakers) {
  ctx.speaker = speaker;
  for (const yaw of [-0.3, 0, 0.3]) {
    camera.position.set(10.5, 0, 8);
    camera.lookAt(10.5, -3, -3.75);
    camera.rotateY(yaw);
    camera.updateMatrixWorld(true);
    vm.runInContext("shelfSay(speaker, 'hello')", ctx);
    assert.equal(print.tail, 'down-left', 'shelf bubbles point down-left from their lower-left edge');
    for (const width of [0.432, 2.7, 3.1]) {
      sprite.scale.set(width, width * 1.42 / 2.7, 1);
      part.position.x += 0.04;
      part.updateMatrixWorld(true);
      vm.runInContext('placeShelfBubble()', ctx);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      const corner = part.localToWorld(ctx.shelfBubbleAnchors.get(speaker).at.clone());
      const [tipX, tipY] = BUBBLE_TAILS['down-left'].tip;
      const tip = sprite.position.clone().addScaledVector(right, (tipX - 0.5) * sprite.scale.x).addScaledVector(up, (0.5 - tipY) * sprite.scale.y);
      const gap = tip.clone().sub(corner);
      assert.ok(gap.dot(right) > 0 && gap.dot(up) > 0, 'tail stops up and to the right of the corner, not on it');
      assert.ok(gap.length() < 0.2, 'tail stays close to what is speaking');
      const offset = sprite.position.clone().sub(tip);
      assert.ok(offset.dot(right) > 0 && offset.dot(up) > 0, 'bubble sits above and to the right of its tail');
    }
  }
}
console.log('Shelf bubbles: upper-right placement with a down-left tail that stops short of the speaker passed.');
