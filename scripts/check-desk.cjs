const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const checks = fs.readdirSync(__dirname)
  .filter(file => /^check-(desk-|audio-entry\.|window-audio\.)/.test(file) && file.endsWith('.cjs'))
  .sort();
let passed = 0;
for (const file of checks) {
  const result = spawnSync(process.execPath, [path.join(__dirname, file)], { cwd: root, stdio: 'inherit' });
  if (result.status === 0) passed++;
  else process.exitCode = 1;
}
console.log(`Desk checks: ${passed}/${checks.length} passed.`);
