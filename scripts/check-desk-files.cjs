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
      if ((kind !== 'overview') !== spots.some(s => s.action === 'prev')) throw new Error('previous page missing');
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
const state = { gsap: { to() {}, timeline: () => timeline }, resetEnvelope() {}, applyShot() {}, sfx: {}, ENV_D: 1.15, POSTCARD_OUT: {x:0,y:0.026,z:0}, envelopeMaterials: [], cardReady: false, mailIntro: null };
for (const name of targets) state[name] = {position:{},rotation:{},scale:{}};
vm.runInNewContext(scene.slice(start, end) + ';openEnvelope()', state);
const step = (target, predicate) => calls.findIndex(c => c.method === 'to' && c.args[0] === target && predicate(c.args[1]));
const flapStep = step(state.flap.rotation, v => v.x === -Math.PI);
const extractStep = step(state.postcard.position, v => v.z < -1);
const dropStep = step(state.envelope.position, v => v.y < 0);
assert.ok(flapStep >= 0 && flapStep < extractStep && extractStep < dropStep, 'flap opens before extraction and envelope drop');
assert.ok(calls.some(c => c.method === 'fromTo' && c.args[0] === state.postage.scale));
console.log('All project sheets, navigation hotspots, postcard fields, prop sizes and envelope timeline passed.');
