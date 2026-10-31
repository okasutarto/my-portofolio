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
// Wide enough that every speaker has room for a full bubble up and to its right
const camera = new THREE.OrthographicCamera(-12, 12, 9, -9, 0.1, 100);
const sprite = new THREE.Sprite();
const print = { tail: 'down-left' };
let saidSize;
const ctx = vm.createContext({ THREE, camera, BUBBLE_TAILS, pad1: pads[0], pad2: pads[1], robot, nintendoSwitch, trophy: new THREE.Group(),
  SHELF_BUBBLE_W: 2.7, SHELF_BUBBLE_H: 1.42,
  shelfBubbleAt: new THREE.Vector3(), shelfBubblePrint: print, shelfBubble: { sprite, say(quote, hold, size) { saidSize = size; } },
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
    assert.equal(saidSize, 1, 'a bubble with room to spare keeps its full size');
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
// A phone-shaped view with the handheld near its right edge: the bubble moves to the speaker's
// upper left (tail on its lower right) and shrinks until it fits on screen
const narrow = new THREE.OrthographicCamera(-1.2, 1.2, 2.6, -2.6, 0.1, 100);
narrow.position.set(11.3, -2, 5);
narrow.lookAt(11.3, -2, -3.75);
ctx.camera = narrow;
ctx.speaker = nintendoSwitch;
nintendoSwitch.position.x = 0.66;
nintendoSwitch.updateMatrixWorld(true);
vm.runInContext("shelfSay(speaker, 'hello')", ctx);
assert.equal(print.tail, 'right', 'a bubble with no room on the right moves to the left');
assert.ok(saidSize < 1 && saidSize >= 0.5, 'and shrinks to the room it has');
sprite.scale.set(2.7 * saidSize, 1.42 * saidSize, 1);
vm.runInContext('placeShelfBubble()', ctx);
const inView = sprite.position.clone().applyMatrix4(narrow.matrixWorldInverse);
assert.ok(inView.x - sprite.scale.x / 2 >= narrow.left && inView.x + sprite.scale.x / 2 <= narrow.right, 'the whole bubble stays across the view');
assert.ok(inView.y + sprite.scale.y / 2 <= narrow.top, 'and below its top edge');
console.log('Shelf bubbles: upper-right placement with a down-left tail that stops short of the speaker, and narrow-view fitting passed.');
