// The texture checks evaluate small source sections in a VM. The sections now live in
// separate modules under desk/textures/; join them back in the order textures.js lists them,
// without each module's imports and shared-export footer, so the old section markers still work.
const fs = require('node:fs');
const path = require('node:path');
const desk = path.join(__dirname, '../../src/components/features/desk');
function readTexturesSource() {
  const barrel = fs.readFileSync(path.join(desk, 'textures.js'), 'utf8');
  const modules = [...barrel.matchAll(/^export \* from "\.\/(textures\/\w+)";$/gm)].map(match => match[1]);
  return modules.map(name => fs.readFileSync(path.join(desk, name + '.js'), 'utf8')
    .replace(/^(import .*;\n)+\n/, '')
    .replace(/\n\/\/ Shared with the other texture modules\nexport \{[^}]*\};\n$/, ''))
    .join('');
}
module.exports = { readTexturesSource };
