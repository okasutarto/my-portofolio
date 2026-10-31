// Run: npm run check:app. No network or paid API calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const loadModule = (file) => import('data:text/javascript;base64,' + Buffer.from(source(file)).toString('base64'));

async function main() {
  const { formatMessageWithLinks: format } = await loadModule('src/features/portfolio2d/utils/formatChatMessage.js');
  assert.equal(format('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(format('**<svg onload=alert(1)>**'), '<strong class="font-bold">&lt;svg onload=alert(1)&gt;</strong>');
  for (const url of ['javascript:alert', 'JaVaScRiPt:alert', 'data:text/html,evil', 'java\nscript:alert', '/relative']) {
    assert.ok(!format(`[click](${url})`).includes('<a '), url);
  }
  assert.ok(format('[<img src=x>](https://example.com/" onmouseover="evil)').includes('&lt;img src=x&gt;</a>'));
  assert.ok(!format('[click](https://example.com/" onmouseover="evil)').includes('" onmouseover='));
  assert.ok(!format('[click](https://example.com/**" onmouseover="evil**)').includes('<strong'));
  assert.ok(format('[email](mailto:oka@example.com)').includes('href="mailto:oka@example.com"'));
  assert.ok(format('[work](https://example.com/?a=1&b=2)').includes('a=1&amp;b=2'));
  assert.equal(format('Hello **Oka**\nNext'), 'Hello <strong class="font-bold">Oka</strong><br>Next');
  assert.equal((format('- A\n- B').match(/class="flex gap-2 my-1"/g) || []).length, 2);

  const themeSource = source('src/shared/composables/useTheme.js').replace(/^import .*\n/, '').replace('export function', 'function');
  function theme(storage) {
    const classes = new Set();
    const api = vm.runInNewContext(themeSource + '; useTheme()', {
      ref: value => ({ value }), localStorage: storage,
      document: { documentElement: { classList: { add: value => classes.add(value), remove: value => classes.delete(value) } } },
    });
    return { api, classes };
  }
  const blocked = theme({ getItem() { throw Error('blocked'); }, setItem() { throw Error('full'); } });
  blocked.api.initTheme();
  assert.equal(blocked.api.isDark.value, false);
  blocked.api.toggleTheme();
  assert.ok(blocked.classes.has('dark'));
  const stored = new Map([['theme', 'dark']]);
  const normal = theme({ getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) });
  normal.api.initTheme();
  assert.ok(normal.classes.has('dark'));
  normal.api.toggleTheme();
  assert.equal(stored.get('theme'), 'light');

  // Capture the actual server's CORS middleware without starting a server or loading credentials.
  let corsOptions;
  const app = { use() {}, get() {}, listen() {} };
  const express = Object.assign(() => app, { json() {}, urlencoded() {} });
  vm.runInNewContext(source('my-portfolio-api/index.js'), {
    module: { exports: {} }, process: { env: {} }, console,
    require(name) {
      if (name === 'express') return express;
      if (name === 'cors') return options => { corsOptions = options; };
      if (name === 'dotenv') return { config() {} };
      if (name === './src/routes/api') return {};
      if (['helmet', 'express-rate-limit'].includes(name)) return () => {};
      throw Error('Unexpected dependency: ' + name);
    },
  });
  for (const origin of ['http://localhost:8080', 'https://okasp.dev', undefined]) {
    corsOptions.origin(origin, (error, allowed) => { assert.equal(error, null); assert.equal(allowed, true); });
  }
  corsOptions.origin('https://untrusted.example', error => assert.ok(error));

  const { getStreamingResponse: stream } = await loadModule('src/shared/services/chatApi.js');
  const originalFetch = global.fetch;
  let cancelled;
  const mockStream = chunks => {
    cancelled = false;
    global.fetch = async () => ({ ok: true, body: new ReadableStream({
      start(controller) { chunks.forEach(chunk => controller.enqueue(new TextEncoder().encode(chunk))); controller.close(); },
    }) });
  };
  try {
    mockStream(['data: {"content":"Hi ', 'Oka"}\n', '\ndata: [DO', 'NE]\n\n']);
    const tokens = [];
    assert.equal(await stream('hello', token => tokens.push(token)), 'Hi Oka');
    assert.deepEqual(tokens, ['Hi Oka']);
    mockStream(['data: {"content":"partial"}\n\n']);
    await assert.rejects(stream('hello', () => {}), /before completion/);
    mockStream(['data: [DONE]\r\n\r\n']);
    assert.equal(await stream('hello', () => {}), '');
    global.fetch = async () => ({ ok: true, body: new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode('data: broken\n\n')); },
      cancel() { cancelled = true; },
    }) });
    await assert.rejects(stream('hello', () => {}), SyntaxError);
    // Cancellation propagates through TextDecoderStream asynchronously.
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(cancelled);
    global.fetch = async () => ({ ok: false, status: 429 });
    await assert.rejects(stream('hello', () => {}), /429/);
  } finally {
    global.fetch = originalFetch;
  }
  console.log('App checks passed: safe chat formatting, storage fallback, CORS, and SSE completion/errors.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
