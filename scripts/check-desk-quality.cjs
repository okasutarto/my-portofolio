// Run: node scripts/check-desk-quality.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/features/desk/deskScene.js'), 'utf8');
const code = source.slice(source.indexOf('  const QUALITY_LEVELS ='), source.indexOf('  let frame = null;'));

function simulate(dpr = 2, hz = 60, loading = false) {
  let now = 0;
  let readoutTick;
  const readout = { style: {} };
  const document = { hidden: false, createElement: () => readout };
  const context = vm.createContext({
    performance: { now: () => now }, document, URLSearchParams,
    window: { location: { search: '?perf' } }, timers: [],
    setInterval: (fn) => { readoutTick = fn; return 1; },
    renderer: { getPixelRatio: () => dpr }, aoPass: {},
    shadowedNeons: [{ castShadow: true }, { castShadow: true }],
    container: { clientWidth: 1200, clientHeight: 800, appendChild() {} },
    composer: { setPixelRatio() {}, setSize() {} },
  });
  vm.runInContext(code, context);
  const frame = vm.runInContext('(now, ms) => adaptQuality(now, ms)', context);
  const get = vm.runInContext('() => ({ level: qualityLevel, density: postDensity(), refreshMs, ao: aoPass.enabled, shadows: shadowedNeons[0].castShadow, retryAt: [...retryAt] })', context);
  function run(seconds, ms = 1000 / hz) {
    const end = now + seconds * 1000;
    while (now < end) {
      now += ms;
      frame(now, ms);
    }
    return get();
  }
  vm.runInContext('applyQuality()', context);
  if (loading) run(3, 50);
  run(loading ? 4 : 7);
  return {
    run, get, document,
    reset(density) { dpr = density; vm.runInContext('resetQuality()', context); },
    readout() { readoutTick(); return readout.textContent; },
  };
}

// Loading, ordinary frames and isolated spikes cannot permanently reduce quality.
const normal = simulate();
assert.equal(simulate(2, 60, true).run(15).level, 0, 'initial loading must not ratchet quality down');
assert.equal(normal.run(30).level, 0);
normal.run(0.2, 50);
assert.equal(normal.run(4).level, 0);
normal.run(1, 1500);
assert.equal(normal.run(4).level, 0);

// Sustained load removes effects before sacrificing pixels, then recovers every step.
const load = simulate();
let state = load.run(5, 1000 / 30);
assert.equal(state.level, 1);
assert.equal(state.ao, false);
assert.equal(state.shadows, true);
assert.equal(state.density, 2);
state = load.run(6, 1000 / 30);
assert.equal(state.level, 2);
assert.equal(state.shadows, false);
assert.equal(state.density, 2);
state = load.run(30, 1000 / 30);
assert.equal(state.level, 6);
assert.equal(state.density, 1, 'Retina can reach the exact 1x floor');
assert.match(load.readout(), /step 6\npost 1.00× · AO off · neon shadows off/);
assert.equal(load.run(8).level, 6, 'recovery waits for ten smooth seconds');
assert.equal(load.run(7).level, 5, 'first recovery takes one step');
assert.equal(load.run(75).level, 0, 'all quality returns after load disappears');
assert.match(load.readout(), /step 0\npost 2.00× · AO on · neon shadows on/);

// A failed recovery backs off the level just attempted, without blocking other levels.
const retry = simulate();
retry.run(5, 1000 / 30);
assert.equal(retry.run(12).level, 0);
state = retry.run(5, 1000 / 30);
assert.equal(state.level, 1);
assert.ok(state.retryAt[0] > 0, 'cooldown belongs to failed step 0');
assert.equal(state.retryAt[1], undefined);
assert.equal(retry.run(15).level, 1, 'cannot immediately retry an expensive effect');
assert.equal(retry.run(25).level, 0, 'can retry after cooldown expires');

// Medium performance and hidden-tab pauses break consecutive smooth time.
const streak = simulate();
streak.run(5, 1000 / 30);
streak.run(8);
streak.run(3, 1000 / 55);
assert.equal(streak.run(6).level, 1);
streak.document.hidden = true;
streak.run(20);
streak.document.hidden = false;
assert.equal(streak.run(6).level, 1);
assert.equal(streak.run(8).level, 0);

for (const [dpr, level] of [[1, 2], [1.5, 5], [2, 6]]) {
  const screen = simulate(dpr);
  state = screen.run(45, 1000 / 30);
  assert.equal(state.level, level);
  assert.equal(state.density, 1, 'never render post passes below CSS pixel resolution');
  screen.reset(2);
  state = screen.get();
  assert.equal(state.level, 0);
  assert.equal(state.ao, true);
  assert.equal(state.shadows, true);
  assert.equal(state.density, 2);
  assert.equal(screen.run(15).level, 0);
}

const promotion = simulate(2, 120);
assert.ok(Math.abs(promotion.get().refreshMs - 1000 / 120) < 0.01);
assert.equal(promotion.run(8, 1000 / 60).level, 2, '120Hz target must not drift down to measured 60fps');
assert.equal(promotion.run(35).level, 0);
console.log('Adaptive quality: spikes, ladder, full recovery, cooldown, visibility, DPR and 120Hz checks passed.');
