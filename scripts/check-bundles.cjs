// Run after vite build --manifest. Inspect emitted dependency graphs, not filename sizes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');
const root = path.join(__dirname, '..');

// Also follow source imports: a stray ChatBot import could be inlined into the entry
// without keeping its own manifest key, so the emitted graph alone cannot detect it.
function checkSource(file, seen = new Set()) {
  if (seen.has(file)) return;
  seen.add(file);
  assert.ok(!file.includes('/features/portfolio2d/'), `desk eagerly imports ${file}`);
  let source = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.vue')) source = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
  const ast = parse(source, { sourceType: 'module' });
  for (const node of ast.program.body) {
    if (!['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) || !node.source) continue;
    const spec = node.source.value;
    assert.ok(!['posthog-js', 'gsap/ScrollTrigger'].includes(spec), `desk eagerly imports ${spec}`);
    if (!spec.startsWith('.') && !spec.startsWith('@/')) continue;
    const target = spec.startsWith('@/') ? path.join(root, 'src', spec.slice(2)) : path.resolve(path.dirname(file), spec);
    const resolved = [target, target + '.js', target + '.vue', path.join(target, 'index.js')].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    assert.ok(resolved, `${file} resolves ${spec}`);
    if (/\.(js|vue)$/.test(resolved)) checkSource(resolved, seen);
  }
}
checkSource(path.join(root, 'src/main.js'));
checkSource(path.join(root, 'src/features/desk3d/deskScene.js'));
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../dist/.vite/manifest.json'), 'utf8'));
const shell = 'src/features/portfolio2d/PortfolioLayout.vue';
const home = 'src/features/portfolio2d/HomePage.vue';
const desk = 'src/features/desk3d/deskScene.js';
for (const name of [shell, home, desk]) assert.ok(manifest[name]?.isDynamicEntry, `${name} remains a lazy entry`);
function staticGraph(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  assert.ok(manifest[entry], `manifest contains ${entry}`);
  seen.add(entry);
  for (const dep of manifest[entry].imports || []) staticGraph(dep, seen);
  return seen;
}
for (const entry of ['index.html', desk]) {
  for (const key of staticGraph(entry)) {
    assert.ok(!key.includes('portfolio2d') && !manifest[key].name.includes('usePostHog'), `${entry} must not eagerly import ${key}`);
  }
}
assert.ok([...staticGraph(shell)].some(key => manifest[key].name === 'usePostHog'), '2D owns its PostHog bundle');
const entry = manifest['index.html'];
console.log(`Bundle boundaries passed: 2D UI and PostHog stay lazy; entry JS ${(fs.statSync(path.join(__dirname, '../dist', entry.file)).size / 1024).toFixed(1)} KiB.`);
