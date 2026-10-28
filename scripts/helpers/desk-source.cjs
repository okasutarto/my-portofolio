// The legacy geometry checks evaluate small source sections in a VM. Reassemble those
// sections from the current factories so they keep testing the owned code after extraction.
// Runtime wiring is checked separately by check-desk-scene-wiring.cjs.
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const desk = path.join(__dirname, '../../src/components/features/desk');
function readDeskSource() {
  const entry = fs.readFileSync(path.join(desk, 'deskScene.js'), 'utf8');
  const ast = parse(entry, { sourceType: 'module' });
  const files = ast.program.body.filter(node => node.type === 'ImportDeclaration' && node.source.value.startsWith('./scene/'));
  const bodies = files.map(node => {
    const source = fs.readFileSync(path.join(desk, node.source.value + '.js'), 'utf8');
    const moduleAst = parse(source, { sourceType: 'module' });
    const factory = moduleAst.program.body.find(node => node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'FunctionDeclaration').declaration;
    const start = factory.body.start + 1;
    const last = factory.body.body.at(-1);
    const end = node.source.value.endsWith('/lifecycle') ? factory.body.end - 1 : last.start;
    const edits = [];
    traverse(moduleAst, { MemberExpression(p) {
      if (p.node.object.type !== 'MemberExpression' || p.node.object.object.name !== 'runtime') return;
      edits.push({ start: p.node.start, end: p.node.end, text: p.node.property.name });
      p.skip();
    } });
    let body = source.slice(start, end);
    for (const edit of edits.filter(e => e.start >= start && e.end <= end).sort((a, b) => b.start - a.start)) {
      body = body.slice(0, edit.start - start) + edit.text + body.slice(edit.end - start);
    }
    return body.replace(/ {2}\/\/ Public state used by the other scene parts\.\n\s*$/, '');
  });
  return fs.readFileSync(path.join(desk, 'sceneConfig.js'), 'utf8') + '\nexport function createDeskScene() {\n' + bodies.join('\n') + '\n}\n';
}
module.exports = { readDeskSource };
