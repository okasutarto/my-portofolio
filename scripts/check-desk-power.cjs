// Run: node scripts/check-desk-power.cjs
const assert = require('node:assert/strict');
const vm = require('node:vm');

const texSource = require('./helpers/texture-source.cjs').readTexturesSource();
const start = texSource.indexOf('function wholeApple(');
const end = texSource.indexOf('export function drawVentSlots', start);
const { drawPowerScreen } = vm.runInNewContext(
  texSource.slice(start, end).replace(/export /g, '') + '; ({ drawPowerScreen })'
);

// 1. Check drawPowerScreen canvas drawing
const calls = [];
const mockCtx = {
  fillStyle: '',
  fillRect(...args) { calls.push({ type: 'fillRect', args }); },
  save() { calls.push({ type: 'save' }); },
  restore() { calls.push({ type: 'restore' }); },
  translate(...args) { calls.push({ type: 'translate', args }); },
  scale(...args) { calls.push({ type: 'scale', args }); },
  beginPath() { calls.push({ type: 'beginPath' }); },
  moveTo(...args) { calls.push({ type: 'moveTo', args }); },
  bezierCurveTo(...args) { calls.push({ type: 'bezierCurveTo', args }); },
  quadraticCurveTo(...args) { calls.push({ type: 'quadraticCurveTo', args }); },
  ellipse(...args) { calls.push({ type: 'ellipse', args }); },
  fill() { calls.push({ type: 'fill' }); },
  stroke() { calls.push({ type: 'stroke' }); },
  roundRect(...args) { calls.push({ type: 'roundRect', args }); },
};

// Power off: black screen only
calls.length = 0;
drawPowerScreen(mockCtx, 800, 600, { booting: false, progress: 0 });
assert.equal(calls.length, 1, 'off screen only fills rect');
assert.deepEqual(calls[0], { type: 'fillRect', args: [0, 0, 800, 600] });

// Power booting: apple logo and progress bar
calls.length = 0;
drawPowerScreen(mockCtx, 800, 600, { booting: true, progress: 0.5 });
const roundRectCalls = calls.filter((c) => c.type === 'roundRect');
assert.equal(roundRectCalls.length, 2, 'boot screen draws slot and progress fill');
assert.ok(calls.some((c) => c.type === 'ellipse'), 'boot screen draws apple leaf');

// 2. Check deskScene.js source patterns
const sceneSource = require('./helpers/desk-source.cjs').readDeskSource();

assert.ok(sceneSource.includes('drawPowerScreen('), 'deskScene calls drawPowerScreen');
assert.ok(sceneSource.includes('toggleComputer()'), 'deskScene calls toggleComputer');
assert.ok(sceneSource.includes('bootComputer('), 'deskScene calls bootComputer');
assert.ok(sceneSource.includes('sfx.powerDown()'), 'deskScene plays powerDown');
assert.ok(sceneSource.includes('sfx.power()'), 'deskScene plays power');
assert.ok(sceneSource.includes('sfx.ding()'), 'deskScene plays ding when boot finishes');
assert.ok(!sceneSource.includes('window.__computer'), 'debug window.__computer is removed');
assert.ok(sceneSource.includes('if (!computer.on) return;'), 'startMusic and terminal interactions guard on computer.on');
assert.ok(sceneSource.includes('const computer = { on: false, booting: true, bar: 0 };'), 'starts booting on fresh load');

console.log('Mac mini power toggle and boot screen checks passed.');
