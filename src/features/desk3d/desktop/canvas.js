import { clamp01 } from "./config";

function surface(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * 2);
  canvas.height = Math.round(h * 2);
  const c = canvas.getContext("2d");
  c.scale(2, 2);
  return { canvas, c, w, h };
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

// ---------- texture: a fine print grain and halftone shading ----------
// The grain is printed once into a small tile and laid over surfaces as a pattern
let grainTile = null;
const grainPatterns = new WeakMap();
function seeded(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}
function grainOver(c, alpha = 1) {
  if (!grainTile) {
    grainTile = document.createElement("canvas");
    grainTile.width = grainTile.height = 96;
    const g = grainTile.getContext("2d");
    const rnd = seeded(7);
    for (let i = 0; i < 1500; i++) {
      const v = rnd() < 0.55 ? 0 : 255;
      g.fillStyle = `rgba(${v},${v},${v},${0.05 + rnd() * 0.09})`;
      g.fillRect(Math.floor(rnd() * 96), Math.floor(rnd() * 96), 1, 1);
    }
  }
  let pattern = grainPatterns.get(c);
  if (!pattern) {
    pattern = c.createPattern(grainTile, "repeat");
    grainPatterns.set(c, pattern);
  }
  // Fills the current path
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = pattern;
  c.fill();
  c.restore();
}
// Comic shading inside the current path: dots that swell towards the bottom right of `box`
function halftone(c, box, color, { gap = 7, max = 2.4 } = {}) {
  const [x0, y0, w, h] = box;
  c.save();
  c.clip();
  c.fillStyle = color;
  for (let y = y0; y < y0 + h; y += gap) {
    for (let x = x0 + (Math.round((y - y0) / gap) % 2) * (gap / 2); x < x0 + w; x += gap) {
      const k = clamp01(((x - x0) / w + (y - y0) / h) / 2);
      const r = max * k * k;
      if (r < 0.35) continue;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}
// A soft white gloss over the top of the current path, and a darker foot
function gloss(c, x, y, w, h, { top = 0.3, foot = 0.12 } = {}) {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, `rgba(255,255,255,${top})`);
  g.addColorStop(0.45, "rgba(255,255,255,0)");
  g.addColorStop(1, `rgba(0,0,0,${foot})`);
  c.fillStyle = g;
  c.fill();
}

export { surface, roundRect, seeded, grainOver, halftone, gloss };
