// Run: node scripts/check-desk-strike.cjs
// Plays Straw Hat Strike headless: waves, a Sea King, a stage clear, a Gatling, game over,
// drawing every frame onto a canvas that accepts anything.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/components/features/desk/strawHatStrike.js'), 'utf8')
  .replace(/^import .*;\n/gm, '')
  .replace(/^export /gm, '');
const canvas = () => new Proxy(function () {}, {
  get: (target, key) => (key === 'measureText' ? () => ({ width: 10 }) : canvas()),
  set: () => true,
  apply: () => canvas(),
});
const store = {};
const ctx = vm.createContext({
  DISPLAY: 'display', BODY: 'body',
  localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v) },
  navigator: { getGamepads: () => [] },
  // Seeded, so every run plays the same game
  Math: Object.assign(Object.create(Math), { random: ((seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(42) }),
  Number, String, Infinity,
});
vm.runInContext(source + '; this.api = { createStrike, drawStrike, strikeKey, STRIKE_BOOT };', ctx);
const { createStrike, drawStrike, strikeKey, STRIKE_BOOT } = ctx.api;
const sounds = [];
const g = createStrike((name) => sounds.push(name));
const c = canvas();
let t = 100;
const frame = () => {
  t += 1 / 60;
  g.step(t);
  const hotspots = [];
  drawStrike(c, 640, 384, g, t, 0, hotspots);
  return hotspots;
};
assert.equal(g.state, 'ready');
assert.ok(frame().some((hs) => hs.id === 'strikeStart'), 'the title screen starts on a tap');
strikeKey(g, { key: ' ' }, true);
assert.equal(g.state, 'play', 'space sets sail');
// Untouchable, the ship sweeps up and down: it should meet waves, the Sea King and a clear
g.lives = 99;
let sawBoss = false;
let cleared = false;
for (let i = 0; i < 60 * 150 && !cleared; i++) {
  g.inv = 1;
  g.ship.y = 140 + (Math.sin(i / 60) + 1) * 110;
  frame();
  if (g.boss) sawBoss = true;
  if (sawBoss && g.stage === 2) cleared = true;
}
assert.ok(sawBoss, 'a Sea King surfaces at the end of the stage');
assert.ok(cleared, 'beating it moves on to stage 2');
assert.ok(g.score > 10000, 'kills and the stage bonus add to the bounty');
// The Gatling clears the sky
g.bombs = 1;
g.bullets.push({ x: 300, y: 200, vx: 0, vy: 0, r: 5, kind: 'ball' });
g.bomb();
assert.equal(g.bullets.length, 0, 'the Gatling pops every bullet');
assert.equal(g.bombs, 0);
// Held keys sail, and stop when let go
const x0 = g.ship.x = 200;
strikeKey(g, { key: 'ArrowRight' }, true);
for (let i = 0; i < 20; i++) frame();
assert.ok(g.ship.x > x0 + 40, 'a held arrow sails the ship');
strikeKey(g, { key: 'ArrowRight' }, false);
const x1 = g.ship.x;
frame();
assert.ok(Math.abs(g.ship.x - x1) < 0.01, 'letting go stops it');
// Three hits without cover: game over, a wanted poster and a best bounty kept
g.lives = 1;
g.inv = 0;
g.gatling = 0;
g.bullets.push({ x: g.ship.x + 2, y: g.ship.y - 12, vx: 0, vy: 0, r: 5, kind: 'orb' });
frame();
assert.equal(g.state, 'over');
assert.equal(Number(store['strike-best']), g.best, 'the best bounty is saved');
for (let i = 0; i < 60; i++) frame();
g.start();
assert.equal(g.state, 'play', 'and it sails again');
assert.ok(STRIKE_BOOT > 0 && sounds.includes('stamp'), 'the game makes its noises');
console.log('Straw Hat Strike waves, Sea King, Gatling, controls and wanted poster checks passed.');
