// Legacy canvas checks exercise the assembled desktop. Production imports these modules
// normally; keep the old VM checks pointed at the same implementations after extraction.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../../src/features/desk3d');
function readDesktopSource() {
  return ['desktop/config.js', 'desktop/canvas.js', 'desktop/appearance.js', 'desktop/spotifree.js', 'desktop/code.js', 'desktop/snake.js', 'desktop.js']
    .map(file => fs.readFileSync(path.join(root, file), 'utf8')
      .replace(/^import .*;\n/gm, '')
      .replace(/^export \{[^\n]*\};?\n/gm, '')
      .replace(/^export \{[^\n]*\} from [^\n]*\n/gm, '')
      .replace(/\bexport (?=(?:const|function)\b)/g, ''))
    .join('\n');
}
module.exports = { readDesktopSource };
