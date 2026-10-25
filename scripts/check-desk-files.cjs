// Run: node scripts/check-desk-files.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = (path) => fs.readFileSync(`${__dirname}/../src/${path}`, 'utf8');
const strip = (source) => source.replace(/^import .*;\n/gm, '').replace(/export /g, '');
const context = vm.createContext({ THREE: require('three') });
vm.runInContext(strip(read('data/projects.js')) + strip(read('data/projectFiles.js')) + strip(read('data/about.js')) + strip(read('components/features/desk/textures.js')), context);
const ctx = new Proxy({ font: '20px sans-serif', measureText(text) { return { width: String(text).length * (parseFloat(this.font.match(/[\d.]+px/)?.[0]) || 20) * 0.58 }; } }, { get(target, key) { return key in target ? target[key] : () => {}; } });
context.ctx = ctx;
vm.runInContext(`
  if (CASE_SHEETS.length !== 5) throw new Error('five shared 2D pages required');
  for (const [index, project] of projects.entries()) {
    drawFolderCover(ctx, 1200, 900, project, index);
    for (const kind of CASE_SHEETS) {
      const spots = drawCaseSheet(ctx, 1200, 900, project, kind, { index });
      for (const s of spots) if (s.x < 0 || s.y < 0 || s.x + s.w > 1200 || s.y + s.h > 900) throw new Error('hotspot outside sheet');
      if (spots.some(s => s.action === 'prev')) throw new Error('going back belongs on the left page');
      const back = drawCaseBack(ctx, 1200, 900, project, { index, kind });
      if (!back.some(s => s.action === 'prev')) throw new Error('previous page missing on the left page');
      for (const s of back) if (s.x < 0 || s.y < 0 || s.x + s.w > 1200 || s.y + s.h > 900) throw new Error('hotspot outside sheet');
      if ((kind !== 'results') !== spots.some(s => s.action === 'next')) throw new Error('next page missing');
    }
  }
  const ids = drawPostcardBack(ctx, 1000, 640, {name:'',email:'',message:'',errors:{},status:'idle'}).map(s => s.id);
  if (ids.join(',') !== 'message,name,email,send') throw new Error('postcard fields missing');
`, context);
const scene = read('components/features/desk/deskScene.js');
const dimension = (name) => Number(scene.match(new RegExp(`const ${name} = ([\\d.]+)`))[1]);
assert.ok(dimension('FOLDER_W') > dimension('ENV_W'));
assert.ok(dimension('FOLDER_D') > dimension('ENV_D'));
// Exercise the timeline builder without sending mail or waiting for animation time.
const start = scene.indexOf('  function openEnvelope()');
const end = scene.indexOf('  function mailOff()', start);
const targets = ['envelope', 'postcard', 'flap', 'postage', 'mail'];
const calls = [];
const timeline = new Proxy({}, {get: (_, method) => (...args) => { calls.push({method,args}); return timeline; }});
// Resting places, read from the scene so the check follows the layout
const constant = (name) => vm.runInNewContext(`(${scene.match(new RegExp(`const ${name} = (\\{[^}]*\\})`))[1]})`);
const POSTCARD_OUT = constant('POSTCARD_OUT');
const ENVELOPE_SETTLE = constant('ENVELOPE_SETTLE');
const POSTCARD_REST = constant('POSTCARD_REST');
const CARD_CLEAR_Z = -(1.15 / 2 + 1.05 / 2 + 0.06);
const state = { CARD_CLEAR_Z, gsap: { to() {}, timeline: () => timeline }, resetEnvelope() {}, applyShot() {}, sfx: {}, ENV_D: 1.15, POSTCARD_OUT, POSTCARD_REST, ENVELOPE_SETTLE, envelopeMaterials: [], cardReady: false, mailIntro: null };
for (const name of targets) state[name] = {position:{},rotation:{},scale:{}};
vm.runInNewContext(scene.slice(start, end) + ';openEnvelope()', state);
const step = (target, predicate) => calls.findIndex(c => c.method === 'to' && c.args[0] === target && predicate(c.args[1]));
const flapStep = step(state.flap.rotation, v => v.x === -Math.PI);
// The pull may be a keyframed path: use the furthest point it reaches out of the envelope
const reach = (v) => (Array.isArray(v.keyframes?.z) ? Math.min(...v.keyframes.z) : v.z);
const extractStep = step(state.postcard.position, v => reach(v) < -0.8);
const settleStep = step(state.envelope.position, v => v.z === ENVELOPE_SETTLE.z && v.y === ENVELOPE_SETTLE.y);
assert.ok(flapStep >= 0 && flapStep < extractStep && extractStep < settleStep, 'flap opens before extraction, then the envelope settles below the card');
assert.ok(calls.some(c => c.method === 'fromTo' && c.args[0] === state.postage.scale));
// The card leaves the envelope flat, through its open end, and only rises once it's fully out
const pulls = calls.filter(c => c.method === 'to' && c.args[0] === state.postcard.position);
assert.ok(pulls[0].args[1].z <= -(1.15 + 1.05) / 2 && pulls[0].args[1].y < 0.12, 'the card slides fully out before lifting');
assert.ok(Math.max(...pulls[1].args[1].keyframes.y) > 0.3, 'then it is lifted over the envelope');
// The envelope stays on the desk and in view: the card ends up above it, not on top of it
assert.ok(!calls.some(c => c.args[0] === state.envelope && c.args[1]?.visible === false), 'envelope must stay visible');
// The card is laid across the envelope: it overlaps it, but leaves its lower part showing
const card = { top: POSTCARD_OUT.z - 1.05 / 2, bottom: POSTCARD_OUT.z + 1.05 / 2 };
const env = { top: ENVELOPE_SETTLE.z - 1.15 / 2, bottom: ENVELOPE_SETTLE.z + 1.15 / 2 };
assert.ok(card.bottom > env.top && card.bottom < env.bottom, 'card should lie across the envelope, not beside it');
assert.ok(POSTCARD_OUT.y > ENVELOPE_SETTLE.y + 0.06, 'card should lie on top of the envelope');
console.log('All project sheets, navigation hotspots, postcard fields, prop sizes and envelope timeline passed (envelope stays in view).');
