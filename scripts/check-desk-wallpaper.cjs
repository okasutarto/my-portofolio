const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = `${__dirname}/../`;
const strip = (path) => fs.readFileSync(root + path, 'utf8').replace(/^import .*;\n/gm, '').replace(/export /g, '');
const saved = new Map([['dock-order', JSON.stringify(['messages', 'mail', 'notes', 'snake', 'code', 'spotifree', 'terminal', 'files', 'launchpad'])]]);
const images = [];
let time = 0;
const imageDraws = [];
let nextContext = 0;
const context2d = () => new Proxy({
  contextId: nextContext++,
  drawImage(image) { imageDraws.push({ image, contextId: this.contextId, alpha: this.globalAlpha ?? 1 }); },
  measureText: (text) => ({ width: text.length * 5 }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
}, { get: (target, key) => target[key] ?? (() => {}) });
const c = context2d();
const context = vm.createContext({
  console, Date, Math, Set, Map, WeakMap, process: { env: { BASE_URL: '/' } },
  localStorage: { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) },
  Image: class { constructor() { this.complete = false; this.naturalWidth = 0; images.push(this); } },
  document: { createElement: () => ({ width: 0, height: 0, getContext: context2d }) },
  performance: { now: () => time }, TRACKS: [],
  createStrike: () => ({ keys: new Set() }), drawStrike() {}, strikeKey() {}, STRIKE_BOOT: 1,
});
vm.runInContext(strip('src/components/features/desk/wallpapers.js') + strip('src/components/features/desk/desktop.js') + `
  globalThis.collection = createWallpapers();
  globalThis.desktop = createDesktop({ terminal: { canvas: { width: 1280, height: 768 } }, player: {}, actions: {} });
`, context);
const desktop = context.desktop;
let spots = desktop.draw(c);
assert.equal(spots.filter((s) => s.id === 'dock').length, 10);
assert.equal(spots.filter((s) => s.id === 'dock')[0].app, 'wallpaper', 'new app appended after saved order');
desktop.launch('wallpaper');
time = 2000;
spots = desktop.draw(c);
assert.equal(spots.filter((s) => s.id === 'wallpaperSelect').length, 5);
for (const spot of spots) assert.ok(spot.x >= 0 && spot.y >= 0 && spot.x + spot.w <= 640 && spot.y + spot.h <= 384);
desktop.click(spots.find((s) => s.id === 'wallpaperSelect' && s.wallpaper === 'mojave'));
assert.deepEqual(JSON.parse(saved.get('desk-wallpaper')), { id: 'mojave' });
desktop.setTheme(false);
desktop.draw(c);
assert.ok(images.some((image) => image.src === '/wallpapers/mojave-light.webp?v=toon-v3'));
desktop.setTheme(true);
desktop.draw(c);
assert.ok(images.some((image) => image.src === '/wallpapers/mojave-dark.webp?v=toon-v3'));
assert.equal(desktop.key({ key: 'ArrowRight' }), true);
assert.equal(JSON.parse(saved.get('desk-wallpaper')).id, 'monterey');
images.forEach((image) => { image.complete = true; image.naturalWidth = 1600; image.naturalHeight = 1000; image.onload(); });
assert.equal(desktop.busy(), true, 'loaded images trigger a redraw');
desktop.draw(c);
assert.equal(desktop.busy(), false, 'static wallpaper does not redraw continuously');
// A loaded appearance blends with the last visible frame over 1.6 seconds.
const lastPicture = () => imageDraws.filter((draw) => draw.image?.src && draw.contextId === 1).at(-1);
desktop.setTheme(false);
desktop.draw(c);
assert.equal(desktop.busy(), true, 'crossfade keeps screen redraws active');
assert.equal(lastPicture().alpha, 0, 'incoming picture starts transparent');
time += 800;
desktop.draw(c);
assert.ok(Math.abs(lastPicture().alpha - 0.5) < 1e-6, 'halfway through the fade both appearances mix');
desktop.setTheme(true);
desktop.draw(c);
assert.equal(lastPicture().alpha, 0, 'a reversal begins from a snapshot of the current mix');
time += 1600;
desktop.draw(c);
assert.equal(lastPicture().alpha, 1);
assert.equal(desktop.busy(), false, 'completed crossfade returns to idle');
const pending = images.find((image) => image.src.includes('monterey-light'));
pending.complete = false;
desktop.setTheme(false);
desktop.draw(c);
assert.ok(lastPicture().image.src.includes('monterey-dark'), 'keep the old image while the new appearance loads');
pending.complete = true;
pending.onload();
desktop.draw(c);
assert.equal(lastPicture().alpha, 0, 'fade begins only when the new image is ready');
time += 1600;
desktop.draw(c);

// Drag the wallpaper window by its title bar, keeping controls and content clickable.
spots = desktop.draw(c);
const before = spots.find((spot) => spot.id === 'wallpaperSelect');
assert.equal(desktop.press(52, 48), false, 'traffic lights are excluded from dragging');
assert.equal(desktop.press(120, 48), true);
assert.equal(desktop.dragTo(122, 49), false, 'a plain click is not a drag');
assert.equal(desktop.release(), false);
assert.equal(desktop.press(120, 48), true);
assert.equal(desktop.dragTo(150, 88), true);
assert.equal(desktop.release(), true, 'a drag must not also trigger a click');
spots = desktop.draw(c);
const moved = spots.find((spot) => spot.id === 'wallpaperSelect');
assert.equal(moved.x, before.x + 30);
assert.equal(moved.y, before.y + 40);
assert.equal(desktop.press(moved.x + 8, moved.y + 8), false, 'content does not start a title drag');
assert.equal(desktop.press(190, 88), true);
desktop.dragTo(2000, -2000);
desktop.release();
spots = desktop.draw(c);
const title = spots.find((spot) => spot.id === 'window' && spot.focusWin === 'wallpaper');
assert.equal(title.x, 640 - 548);
assert.equal(title.y, 24, 'title bar cannot leave the top of the desktop');
desktop.click(spots.find((spot) => spot.id === 'max' && spot.win === 'wallpaper'));
time += 300;
desktop.draw(c);
assert.equal(desktop.press(300, 38), true);
desktop.dragTo(330, 60);
assert.equal(desktop.release(), true);
spots = desktop.draw(c);
assert.equal(spots.find((spot) => spot.id === 'window' && spot.focusWin === 'wallpaper').w, 548,
  'dragging a maximized window restores its normal size');
desktop.key({ key: 'Enter' });
assert.equal(desktop.active(), null, 'preview minimizes all windows');
saved.set('desk-wallpaper', '{broken');
vm.runInContext('globalThis.invalid = createWallpapers()', context);
assert.equal(context.invalid.selection.id, 'big-sur');
context.invalid.select('unknown', 'dark');
assert.equal(context.invalid.selection.id, 'big-sur');
// Both appearances are shipped for every choice.
for (const id of ['big-sur', 'catalina', 'mojave', 'monterey', 'sonoma']) {
  for (const mode of ['light', 'dark']) assert.ok(fs.statSync(`${root}public/wallpapers/${id}-${mode}.webp`).size > 1000);
}
console.log('Wallpaper picker, crossfade/reversal/loading, window dragging/bounds/restore, persistence and ten assets passed.');
