// Run: node scripts/check-desk-coffee.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/features/desk/deskScene.js'), 'utf8');
const sip = source.slice(source.indexOf('  function sip() {'), source.indexOf('  register(mug, {'));
let now = 0;
const pending = [];
const events = [];
const levels = [];
const sounds = [];
const later = (fn, delay) => pending.push({ at: now + delay, fn });
const advance = (ms) => {
  const until = now + ms;
  pending.sort((a, b) => a.at - b.at);
  while (pending[0]?.at <= until) {
    const task = pending.shift();
    now = task.at;
    task.fn();
    pending.sort((a, b) => a.at - b.at);
  }
  now = until;
};
const context = vm.createContext({
  setTimeout: later,
  gsap: { timeline({ onComplete }) {
    later(onComplete, 1350);
    return { to() { return this; } };
  } },
  mug: { position: {}, rotation: {} },
  sfx: { slurp: () => sounds.push('slurp'), thud() {}, rustle() {} },
  setCoffee: (level) => levels.push(level),
  say() {},
  onEvent: (name, payload) => events.push({ name, payload }),
});
vm.runInContext('const MUG_Y = 0.06; const SIPS = 4; let sipsLeft = SIPS; let sipping = false; let lastQuote = -1; let darkNow = false; const SIP_QUOTES = [{}]; const timers = [];\n' + sip, context);
const drink = () => vm.runInContext('sip()', context);

// Clicking during the animation must not consume another sip.
drink();
drink();
assert.equal(vm.runInContext('sipsLeft', context), 3);
advance(1400);
for (let i = 0; i < 3; i++) { drink(); advance(1400); }
assert.equal(vm.runInContext('sipsLeft', context), 0);
assert.equal(events.filter((e) => e.name === 'nightShift').length, 1);

// The animation finishes before refill: clicks in that gap must be ignored.
drink();
advance(400);
assert.equal(vm.runInContext('sipsLeft', context), 0);
assert.equal(sounds.length, 4);
assert.ok(levels.every((level) => level >= 0 && level <= 1));
advance(800);
assert.equal(vm.runInContext('sipsLeft', context), 4);
assert.equal(levels.at(-1), 1);
assert.equal(events.filter((e) => e.name === 'nightShift').length, 1);

// A refilled cup can be drunk again, and toggles back from night to day.
vm.runInContext('darkNow = true', context);
for (let i = 0; i < 4; i++) { drink(); advance(1400); }
const changes = events.filter((e) => e.name === 'nightShift');
assert.deepEqual(changes.map((e) => e.payload.dark), [true, false]);
console.log('Coffee sip, empty-cup guard, refill, and theme checks passed.');
