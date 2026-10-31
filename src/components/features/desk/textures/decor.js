import { mixHex } from "./windowView";
import { WOODS } from "../woods";

// ---------- floor: wood that tiles seamlessly in both directions ----------
// In any of the woods, as long staggered planks, a herringbone of short boards or a parquet of
// squares whose strips turn from one square to the next
export function drawWoodFloor(c, w, h, { wood = "oak", layout = "planks" } = {}) {
  const look = WOODS[wood] || WOODS.oak;
  const [gr, gg, gb] = look.grain;
  const joint = `rgba(${look.glue}, 0.6)`;
  if (layout === "herringbone" || layout === "parquet") {
    // Every board is drawn wherever it reaches into the tile, and seeded by where it starts
    // (wrapped into the tile), so a board cut by one edge carries on, the same, at the other
    const board = (x, y, len, wide, upright) => {
      let seed = 1 + Math.round(((x % w) + w) % w) * 7919 + Math.round(((y % h) + h) % h) * 104729 + (upright ? 31 : 0);
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 3; i++) rand();
      c.save();
      c.translate(x, y);
      if (upright) c.transform(0, 1, 1, 0, 0, 0);
      c.fillStyle = look.tones[Math.floor(rand() * look.tones.length)];
      c.fillRect(0, 0, len, wide);
      c.fillStyle = rand() < 0.5 ? `rgba(${look.dark}, 0.1)` : `rgba(${look.light}, 0.1)`;
      c.fillRect(0, wide * rand() * 0.6, len, wide * 0.4);
      c.strokeStyle = `rgba(${gr}, ${gg}, ${gb}, 0.22)`;
      c.lineWidth = 2;
      for (let g = 0; g < 3; g++) {
        const gy = wide * (0.2 + g * 0.3 + (rand() - 0.5) * 0.12);
        const phase = rand() * Math.PI * 2;
        c.beginPath();
        for (let t = 0; t <= len; t += 8) c.lineTo(t, gy + Math.sin(t / (len * 0.3) + phase) * wide * 0.06);
        c.stroke();
      }
      c.strokeStyle = joint;
      c.lineWidth = 3;
      c.strokeRect(0, 0, len, wide);
      c.restore();
    };
    if (layout === "herringbone") {
      // Boards four times as long as they're wide, in steps of one width up and across: each
      // zigzag row is eight widths wide, so a tile of eight widths repeats cleanly
      const W = w / 16;
      const L = W * 4;
      for (let j = -4; j * 8 * W < w + L; j++) {
        for (let k = -6; k * W < h + L; k++) {
          const x = j * 8 * W + k * W;
          board(x, k * W, L, W, false);
          board(x + L, (k - 3) * W, L, W, true);
        }
      }
    } else {
      // Squares of four strips, turned a quarter from each square to the next
      const S = w / 8;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          for (let s = 0; s < 4; s++) {
            if ((i + j) % 2) board(i * S + s * (S / 4), j * S, S, S / 4, true);
            else board(i * S, j * S + s * (S / 4), S, S / 4, false);
          }
        }
      }
    }
    return;
  }
  const rows = 8;
  const rh = h / rows;
  for (let i = 0; i < rows; i++) {
    const y = i * rh;
    c.fillStyle = look.tones[i % look.tones.length];
    c.fillRect(0, y, w, rh);
    // Grain whose waves repeat a whole number of times across the tile, so it wraps cleanly
    c.strokeStyle = `rgba(${gr}, ${gg}, ${gb}, 0.2)`;
    c.lineWidth = 3;
    for (let g = 0; g < 4; g++) {
      const gy = y + rh * (0.2 + g * 0.2);
      c.beginPath();
      for (let x = 0; x <= w; x += 16) c.lineTo(x, gy + Math.sin(((x / w) * (2 + g) + i * 0.3) * Math.PI * 2) * 4);
      c.stroke();
    }
    // Two plank ends per row, staggered from row to row
    c.fillStyle = joint;
    const start = ((i * 0.37) % 1) * w;
    [start, (start + w / 2) % w].forEach((x) => c.fillRect(x, y, 5, rh));
    c.fillRect(0, y, w, 5);
  }
}

// ---------- wall painting: a bold sunset over the hills, neo-brutal flat shapes ----------
// The painting is a little gallery: `art` picks the picture (0 sunset, 1 night city, 2 the wave)
export const PAINTING_COUNT = 3;
export function drawPainting(c, w, h, { art = 0 } = {}) {
  c.save();
  c.lineJoin = "round";
  c.lineCap = "round";
  let seed = 9173 + art * 137;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Where each picture's light comes from (a direction toward it): every shape is cel-shaded
  // from it, a hard band of shade on its far side and a thin rim of light on the near one
  const light = [[0.25, -1], [0.8, -0.6], [-0.6, -0.8]][art] || [0, -1];
  const band = (path, dx, dy, color) => {
    const edge = new Path2D(path);
    edge.addPath(path, new DOMMatrix([1, 0, 0, 1, dx, dy]));
    c.save();
    c.clip(path);
    c.fillStyle = color;
    c.fill(edge, "evenodd");
    c.restore();
  };
  // `blob` is for shapes built of overlapping parts (clouds): the ink goes down first and the
  // fill over it, so the parts merge into one silhouette with no lines inside
  const ink = (path, fill, { cel = true, shade = 0.26, blob = false } = {}) => {
    if (blob) {
      c.lineWidth = Math.max(8, w / 75);
      c.strokeStyle = "#30283a";
      c.stroke(path);
    }
    c.fillStyle = fill;
    c.fill(path);
    if (cel) {
      const s = Math.max(6, w * 0.016);
      band(path, light[0] * s, light[1] * s, mixHex(fill, "#2a1f3d", shade));
      band(path, -light[0] * s * 0.32, -light[1] * s * 0.32, mixHex(fill, "#fffbe8", 0.42));
    }
    c.save();
    c.clip(path);
    const pigment = c.createLinearGradient(0, 0, w * 0.3, h);
    pigment.addColorStop(0, "rgba(255,248,222,.18)");
    pigment.addColorStop(0.45, "rgba(255,248,222,0)");
    pigment.addColorStop(1, "rgba(35,24,45,.13)");
    c.fillStyle = pigment;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 24; i++) {
      const x = rand() * w;
      const y = rand() * h;
      c.fillStyle = rand() < 0.5 ? "rgba(255,248,222,.16)" : "rgba(35,24,45,.08)";
      c.fillRect(x, y, w * (0.008 + rand() * 0.045), h * (0.001 + rand() * 0.004));
    }
    c.restore();
    if (blob) return;
    c.lineWidth = Math.max(4, w / 150);
    c.strokeStyle = "#30283a";
    c.stroke(path);
  };
  if (art === 1) drawNightCity(c, w, h, ink, rand);
  else if (art === 2) drawWave(c, w, h, ink, rand);
  else drawSunset(c, w, h, ink, rand);
  // Broken brush marks and fine canvas fibres, stable whenever the artwork is redrawn.
  for (let i = 0; i < 320; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const length = w * (0.006 + rand() * 0.035);
    c.strokeStyle = rand() < 0.5 ? "rgba(255,253,240,.12)" : "rgba(30,25,40,.055)";
    c.lineWidth = h * (0.001 + rand() * 0.003);
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + length * 0.5, y - h * 0.003, x + length, y + h * 0.002);
    c.stroke();
  }
  for (let i = 0; i < (w * h) / 280; i++) {
    c.fillStyle = rand() < 0.5 ? "rgba(255,253,240,.09)" : "rgba(30,25,40,.06)";
    c.fillRect(rand() * w, rand() * h, Math.max(1, w * 0.0008), h * (0.001 + rand() * 0.003));
  }
  // Woven canvas catches the light between the broken paint marks.
  c.lineWidth = Math.max(0.5, w / 1400);
  c.strokeStyle = "rgba(255,248,222,.09)";
  c.beginPath();
  for (let x = 0; x < w; x += w / 190) { c.moveTo(x, 0); c.lineTo(x, h); }
  c.stroke();
  c.strokeStyle = "rgba(35,24,45,.045)";
  c.beginPath();
  for (let y = 0; y < h; y += h / 140) { c.moveTo(0, y); c.lineTo(w, y); }
  c.stroke();
  // Warm cotton mount, with a recessed inner edge and a slightly worn paper surface.
  c.lineWidth = w * 0.05;
  c.strokeStyle = "#eee5d4";
  c.strokeRect(0, 0, w, h);
  for (let i = 0; i < 700; i++) {
    const x = rand() * w;
    const y = rand() * h;
    if (x > w * 0.025 && x < w * 0.975 && y > w * 0.025 && y < h - w * 0.025) continue;
    c.fillStyle = rand() < 0.5 ? "rgba(255,255,255,.3)" : "rgba(83,65,44,.13)";
    c.fillRect(x, y, w * 0.001, h * 0.003);
  }
  c.lineWidth = Math.max(2, w / 320);
  c.strokeStyle = "#78664e";
  c.strokeRect(w * 0.025, h * 0.035, w * 0.95, h * 0.93);
  c.restore();
}

// Shared bits of the paintings' toon vocabulary
// A four-pointed sparkle, for stars
function sparkle(c, x, y, r, color = "#fffdf5") {
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.fillStyle = color;
  c.fill();
}
// A crescent: the disc (cx, cy, R) less the one (ox, oy, r) biting into it, as a single shape
// with one outline, rather than a disc painted over in the sky's colour
function crescent(cx, cy, R, ox, oy, r) {
  const dx = ox - cx;
  const dy = oy - cy;
  const d = Math.hypot(dx, dy);
  const a = (R * R - r * r + d * d) / (2 * d);
  const hh = Math.sqrt(Math.max(0, R * R - a * a));
  const mx = cx + (dx * a) / d;
  const my = cy + (dy * a) / d;
  const p1 = [mx + (dy * hh) / d, my - (dx * hh) / d];
  const p2 = [mx - (dy * hh) / d, my + (dx * hh) / d];
  const ang = (x, y, px, py) => Math.atan2(py - y, px - x);
  const path = new Path2D();
  path.arc(cx, cy, R, ang(cx, cy, ...p1), ang(cx, cy, ...p2), true);
  path.arc(ox, oy, r, ang(ox, oy, ...p2), ang(ox, oy, ...p1), false);
  path.closePath();
  return path;
}
// A stylised cloud: a stack of rounded pills, the way flat-colour illustration draws them
function pillCloud(x, y, w, h) {
  const path = new Path2D();
  path.roundRect(x, y, w, h, h / 2);
  path.roundRect(x + w * 0.18, y - h * 0.8, w * 0.5, h * 1.1, h * 0.55);
  path.roundRect(x + w * 0.45, y - h * 0.45, w * 0.42, h, h / 2);
  return path;
}
// Hard horizontal brush streaks across a band of sky, lighter and darker by turns
function skyStreaks(c, w, y0, y1, rand, light, dark) {
  for (let i = 0; i < 26; i++) {
    const y = y0 + rand() * (y1 - y0);
    const x = rand() * w;
    c.fillStyle = rand() < 0.6 ? light : dark;
    c.beginPath();
    c.roundRect(x, y, w * (0.06 + rand() * 0.18), Math.max(2, (y1 - y0) * 0.012), 3);
    c.fill();
  }
}

// A city at night: moon, stars, a skyline with lit windows over the river, and the city
// broken into wobbling bands of colour in the water
function drawNightCity(c, w, h, ink, rand) {
  c.fillStyle = "#1e2a5a";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#16204a";
  c.fillRect(0, 0, w, h * 0.12);
  c.fillStyle = "#26356b";
  c.fillRect(0, h * 0.4, w, h * 0.3);
  c.fillStyle = "#2e3f7a";
  c.fillRect(0, h * 0.55, w, h * 0.25);
  skyStreaks(c, w, 0, h * 0.55, rand, "rgba(127,178,255,.12)", "rgba(10,15,40,.18)");
  [[0.1, 0.12, 1], [0.25, 0.22, 0.7], [0.4, 0.09, 1.2], [0.6, 0.18, 0.8], [0.92, 0.32, 0.7], [0.52, 0.3, 0.6], [0.16, 0.34, 0.8], [0.68, 0.07, 0.6], [0.32, 0.17, 0.5]]
    .forEach(([x, y, k]) => sparkle(c, w * x, h * y, w * 0.012 * k));
  c.fillStyle = "#fffdf5";
  for (let i = 0; i < 30; i++) c.fillRect(rand() * w, rand() * h * 0.38, w * 0.003, w * 0.003);
  // the moon, a ring of its light round it
  c.beginPath();
  c.arc(w * 0.8, h * 0.2, h * 0.16, 0, Math.PI * 2);
  c.fillStyle = "rgba(255,221,0,.12)";
  c.fill();
  ink(crescent(w * 0.8, h * 0.2, h * 0.11, w * 0.84, h * 0.17, h * 0.1), "#ffdd00");
  ink(pillCloud(w * 0.6, h * 0.27, w * 0.2, h * 0.04), "#3b4a85", { blob: true });
  ink(pillCloud(w * 0.05, h * 0.2, w * 0.16, h * 0.035), "#34437c", { blob: true });
  const towers = [[0.04, 0.5, 0.1, "#7fb2ff"], [0.15, 0.36, 0.09, "#ff90e8"], [0.25, 0.56, 0.08, "#00e0c6"], [0.34, 0.28, 0.11, "#ffb35c"],
    [0.46, 0.48, 0.09, "#c4b5fd"], [0.56, 0.4, 0.1, "#ff6b6b"], [0.67, 0.54, 0.08, "#8fd694"], [0.76, 0.44, 0.1, "#7fb2ff"], [0.87, 0.58, 0.1, "#ff90e8"]];
  towers.forEach(([x, top, bw, color], i) => {
    // rooftop furniture first, so the tower's ink sits over its foot: an antenna, a water tank
    // or a stepped-back top storey
    c.strokeStyle = "#30283a";
    c.lineWidth = Math.max(3, w / 220);
    if (i % 3 === 0) {
      c.beginPath();
      c.moveTo(w * (x + bw * 0.5), h * top);
      c.lineTo(w * (x + bw * 0.5), h * (top - 0.09));
      c.moveTo(w * (x + bw * 0.38), h * (top - 0.05));
      c.lineTo(w * (x + bw * 0.62), h * (top - 0.05));
      c.stroke();
      sparkle(c, w * (x + bw * 0.5), h * (top - 0.095), w * 0.008, "#ff6b6b");
    } else if (i % 3 === 1) {
      const tank = new Path2D();
      tank.roundRect(w * (x + bw * 0.55), h * (top - 0.06), w * bw * 0.3, h * 0.06, 4);
      ink(tank, "#8b5a2b", { cel: false });
    } else {
      const step = new Path2D();
      step.rect(w * (x + bw * 0.2), h * (top - 0.05), w * bw * 0.6, h * 0.06);
      ink(step, mixHex(color, "#1e2a5a", 0.25));
    }
    const tower = new Path2D();
    tower.rect(w * x, h * top, w * bw, h * (0.8 - top));
    ink(tower, color);
    // windows: a grid, most lit, a few dark, each lit one with a ledge
    for (let wy = top + 0.05; wy < 0.74; wy += 0.07) {
      for (let wx = 0; wx < 3; wx++) {
        const lit = (i + wx + Math.round(wy * 20)) % 3;
        const px = w * (x + 0.015 + wx * bw * 0.3);
        const py = h * wy;
        c.fillStyle = lit ? "#ffdd00" : mixHex(color, "#1e2a5a", 0.55);
        c.fillRect(px, py, w * bw * 0.16, h * 0.035);
        if (lit) {
          c.fillStyle = "#fff6b0";
          c.fillRect(px, py, w * bw * 0.16, h * 0.008);
        }
        c.fillStyle = "rgba(48,40,58,.6)";
        c.fillRect(px, py + h * 0.035, w * bw * 0.16, h * 0.005);
      }
    }
  });
  const river = new Path2D();
  river.rect(-10, h * 0.8, w + 20, h * 0.25);
  ink(river, "#172554", { cel: false });
  // the city in the water: each tower a stack of broken bands, sliding a little side to side
  towers.forEach(([x, , bw, color], i) => {
    for (let k = 0; k < 6; k++) {
      const y = h * (0.815 + k * 0.03);
      const off = Math.sin(i * 1.7 + k * 1.3) * w * 0.012;
      c.fillStyle = mixHex(color, "#172554", 0.35 + k * 0.08);
      c.fillRect(w * x + off, y, w * bw * (0.9 - k * 0.08), h * 0.014);
    }
  });
  c.fillStyle = "#ffdd00";
  for (let i = 0; i < 8; i++) c.fillRect(w * (0.06 + i * 0.12) + Math.sin(i) * w * 0.01, h * (0.84 + (i % 3) * 0.04), w * 0.04, h * 0.01);
  c.fillStyle = "#fff6b0";
  for (let k = 0; k < 4; k++) c.fillRect(w * (0.77 + Math.sin(k * 2) * 0.01), h * (0.83 + k * 0.035), w * (0.07 - k * 0.012), h * 0.01);
}

// A neo-brutalist great wave: a curling crest with foam claws, a small mountain far behind,
// the water drawn in Hokusai's bands, and a boat riding the trough
function drawWave(c, w, h, ink, rand) {
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#ffdd00";
  c.fillRect(0, 0, w, h * 0.45);
  c.fillStyle = "#ffe866";
  c.fillRect(0, h * 0.3, w, h * 0.15);
  skyStreaks(c, w, 0, h * 0.45, rand, "rgba(255,253,245,.35)", "rgba(255,150,0,.12)");
  ink(pillCloud(w * 0.6, h * 0.16, w * 0.22, h * 0.045), "#fff4b0", { blob: true });
  ink(pillCloud(w * 0.82, h * 0.3, w * 0.15, h * 0.035), "#fff4b0", { blob: true });
  const sun = new Path2D();
  sun.arc(w * 0.2, h * 0.22, h * 0.1, 0, Math.PI * 2);
  ink(sun, "#ff6b6b");
  const mountain = new Path2D();
  mountain.moveTo(w * 0.55, h * 0.7);
  mountain.lineTo(w * 0.68, h * 0.48);
  mountain.lineTo(w * 0.81, h * 0.7);
  mountain.closePath();
  ink(mountain, "#7fb2ff");
  const cap = new Path2D();
  cap.moveTo(w * 0.64, h * 0.55);
  cap.lineTo(w * 0.68, h * 0.48);
  cap.lineTo(w * 0.72, h * 0.55);
  cap.lineTo(w * 0.68, h * 0.53);
  cap.closePath();
  ink(cap, "#fffdf5");
  const sea = new Path2D();
  sea.rect(-10, h * 0.7, w + 20, h * 0.35);
  ink(sea, "#3b82f6", { cel: false });
  // a long boat down in the trough, its rowers bent to the oars
  const boat = new Path2D();
  boat.moveTo(w * 0.5, h * 0.79);
  boat.quadraticCurveTo(w * 0.62, h * 0.86, w * 0.78, h * 0.8);
  boat.lineTo(w * 0.76, h * 0.83);
  boat.quadraticCurveTo(w * 0.62, h * 0.88, w * 0.52, h * 0.82);
  boat.closePath();
  ink(boat, "#ffb35c");
  c.fillStyle = "#30283a";
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.arc(w * (0.55 + i * 0.035), h * (0.805 + Math.sin(i) * 0.004), w * 0.007, 0, Math.PI * 2);
    c.fill();
  }
  // The big wave rising from the left and curling over to the right
  const wave = new Path2D();
  wave.moveTo(-10, h);
  wave.lineTo(-10, h * 0.55);
  wave.bezierCurveTo(w * 0.05, h * 0.2, w * 0.4, h * 0.1, w * 0.5, h * 0.3);
  wave.bezierCurveTo(w * 0.42, h * 0.24, w * 0.32, h * 0.3, w * 0.36, h * 0.42);
  wave.bezierCurveTo(w * 0.42, h * 0.58, w * 0.55, h * 0.75, w * 0.62, h);
  wave.closePath();
  ink(wave, "#1e40af");
  // its water in bands: lines following the wave's sweep, pale over the dark blue
  c.save();
  c.clip(wave);
  c.strokeStyle = "#7fb2ff";
  c.lineWidth = Math.max(3, w / 260);
  for (let k = 1; k <= 7; k++) {
    const t = k / 8;
    c.beginPath();
    c.moveTo(-10, h * (0.6 + t * 0.4));
    c.bezierCurveTo(w * (0.05 + t * 0.06), h * (0.25 + t * 0.35), w * (0.36 - t * 0.04), h * (0.16 + t * 0.3), w * (0.47 - t * 0.02), h * (0.3 + t * 0.3));
    c.stroke();
  }
  c.restore();
  const inner = new Path2D();
  inner.moveTo(w * 0.04, h);
  inner.bezierCurveTo(w * 0.02, h * 0.6, w * 0.18, h * 0.38, w * 0.3, h * 0.36);
  inner.bezierCurveTo(w * 0.24, h * 0.5, w * 0.36, h * 0.8, w * 0.42, h);
  inner.closePath();
  ink(inner, "#00e0c6");
  // foam along the crest: round heads, each with a little claw curling off it, and spray
  c.lineWidth = Math.max(4, w / 140);
  [[0.38, 0.17], [0.43, 0.2], [0.47, 0.25], [0.3, 0.16], [0.22, 0.2], [0.5, 0.31], [0.14, 0.27], [0.34, 0.15]].forEach(([x, y], i) => {
    const r = h * (0.035 - (i % 2) * 0.01);
    const foam = new Path2D();
    foam.arc(w * x, h * y, r, 0, Math.PI * 2);
    ink(foam, "#fffdf5");
    c.strokeStyle = "#30283a";
    c.beginPath();
    c.arc(w * x + r * 0.9, h * y + r * 0.5, r * 0.6, Math.PI * 1.2, Math.PI * 0.2);
    c.stroke();
  });
  [[0.52, 0.14], [0.55, 0.2], [0.47, 0.1], [0.58, 0.26], [0.42, 0.08], [0.6, 0.18]].forEach(([x, y]) => {
    c.beginPath();
    c.arc(w * x, h * y, w * 0.006, 0, Math.PI * 2);
    c.fillStyle = "#fffdf5";
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = "#30283a";
    c.stroke();
  });
  // small waves in the foreground, each capped with foam
  for (let i = 0; i < 5; i++) {
    const small = new Path2D();
    const x = w * (0.55 + i * 0.1);
    small.moveTo(x - w * 0.05, h * 0.9);
    small.quadraticCurveTo(x, h * 0.8, x + w * 0.05, h * 0.9);
    small.closePath();
    ink(small, "#7fb2ff");
    c.beginPath();
    c.arc(x, h * 0.856, w * 0.009, 0, Math.PI * 2);
    c.fillStyle = "#fffdf5";
    c.fill();
  }
}

function drawSunset(c, w, h, ink, rand) {
  // sky bands, with thin steps between them and hard brush streaks across
  [["#ff90e8", 0], ["#ffa3d8", 0.2], ["#ffb35c", 0.28], ["#ffc85a", 0.38], ["#ffdd00", 0.46]].forEach(([color, y]) => {
    c.fillStyle = color;
    c.fillRect(0, h * y, w, h);
  });
  skyStreaks(c, w, 0, h * 0.6, rand, "rgba(255,253,245,.22)", "rgba(200,60,120,.1)");
  // stars as sparkles
  [[0.08, 0.1, 1], [0.2, 0.2, 0.7], [0.36, 0.08, 1], [0.55, 0.16, 0.8], [0.9, 0.08, 0.9], [0.66, 0.06, 0.6], [0.28, 0.3, 0.5]].forEach(([x, y, k]) => sparkle(c, w * x, h * y, w * 0.013 * k));
  // a ringed planet: the ring's far half behind it, its near half in front
  const ring = (front) => {
    c.save();
    c.translate(w * 0.82, h * 0.2);
    c.rotate(-0.35);
    c.beginPath();
    c.ellipse(0, 0, h * 0.15, h * 0.035, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
    c.lineWidth = Math.max(9, w / 70);
    c.strokeStyle = "#30283a";
    c.stroke();
    c.lineWidth = Math.max(5, w / 130);
    c.strokeStyle = "#fffdf5";
    c.stroke();
    c.restore();
  };
  ring(false);
  const planet = new Path2D();
  planet.arc(w * 0.82, h * 0.2, h * 0.08, 0, Math.PI * 2);
  ink(planet, "#7fb2ff");
  c.save();
  c.clip(planet);
  c.fillStyle = "#6a9cf0";
  c.fillRect(w * 0.7, h * 0.17, w * 0.25, h * 0.018);
  c.fillRect(w * 0.7, h * 0.22, w * 0.25, h * 0.012);
  c.restore();
  ring(true);
  // clouds, stacked pills catching the low light on their undersides
  ink(pillCloud(w * 0.06, h * 0.26, w * 0.24, h * 0.045), "#ffc6e8", { blob: true });
  ink(pillCloud(w * 0.6, h * 0.38, w * 0.2, h * 0.04), "#ffd9a8", { blob: true });
  // big sun, half behind the hills, a ring of glow round it
  c.beginPath();
  c.arc(w * 0.42, h * 0.6, h * 0.31, 0, Math.PI * 2);
  c.fillStyle = "rgba(255,253,245,.22)";
  c.fill();
  const sun = new Path2D();
  sun.arc(w * 0.42, h * 0.6, h * 0.26, 0, Math.PI * 2);
  ink(sun, "#ff6b6b");
  c.save();
  c.clip(sun);
  c.fillStyle = "rgba(0,0,0,.14)";
  for (let i = 0; i < 4; i++) c.fillRect(w * 0.42 - h * 0.26, h * (0.52 + i * 0.05), h * 0.52, h * 0.015);
  c.restore();
  // hills, back to front
  const hill = (points, fill) => {
    const path = new Path2D();
    path.moveTo(0, h);
    path.lineTo(w * points[0][0], h * points[0][1]);
    for (let i = 1; i < points.length - 1; i++) {
      const [x, y] = points[i];
      const [nextX, nextY] = points[i + 1];
      path.quadraticCurveTo(w * x, h * y, w * (x + nextX) / 2, h * (y + nextY) / 2);
    }
    const [lastX, lastY] = points[points.length - 1];
    path.lineTo(w * lastX, h * lastY);
    path.lineTo(w, h);
    path.closePath();
    ink(path, fill);
    return path;
  };
  hill([[0, 0.7], [0.18, 0.55], [0.34, 0.68], [0.52, 0.5], [0.72, 0.66], [0.88, 0.56], [1, 0.62]], "#00e0c6");
  // a row of round trees along the middle ridge
  [[0.12, 0.66], [0.2, 0.62], [0.27, 0.66], [0.58, 0.6], [0.63, 0.63]].forEach(([x, y], i) => {
    c.fillStyle = "#30283a";
    c.fillRect(w * x - w * 0.003, h * y, w * 0.006, h * 0.05);
    const crown = new Path2D();
    crown.arc(w * x, h * y, w * (0.018 + (i % 2) * 0.006), 0, Math.PI * 2);
    ink(crown, "#16a34a");
  });
  const mid = hill([[0, 0.82], [0.22, 0.7], [0.45, 0.8], [0.66, 0.72], [0.84, 0.8], [1, 0.74]], "#3b82f6");
  // a winding path down the middle hill
  c.save();
  c.clip(mid);
  c.strokeStyle = "#ffdd00";
  c.lineWidth = Math.max(5, w / 90);
  c.beginPath();
  c.moveTo(w * 0.7, h * 0.82);
  c.bezierCurveTo(w * 0.6, h * 0.86, w * 0.78, h * 0.9, w * 0.62, h * 0.98);
  c.stroke();
  c.restore();
  hill([[0, 0.92], [0.3, 0.84], [0.55, 0.9], [0.8, 0.83], [1, 0.9]], "#8fd694");
  // grass tufts and a few flowers across the front hill
  c.strokeStyle = "#16a34a";
  c.lineWidth = Math.max(2, w / 300);
  c.beginPath();
  for (let i = 0; i < 26; i++) {
    const x = rand() * w;
    const y = h * (0.92 + rand() * 0.06);
    c.moveTo(x - w * 0.006, y - h * 0.018);
    c.lineTo(x, y);
    c.lineTo(x + w * 0.006, y - h * 0.02);
  }
  c.stroke();
  [[0.1, 0.94, "#ff6b6b"], [0.36, 0.93, "#fffdf5"], [0.48, 0.96, "#ff90e8"], [0.9, 0.93, "#ffdd00"]].forEach(([x, y, color]) => {
    const bloom = new Path2D();
    bloom.arc(w * x, h * y, w * 0.007, 0, Math.PI * 2);
    ink(bloom, color, { cel: false });
  });
  // a tiny house with a lit window, a chimney puffing and a fence beside it
  const chimney = new Path2D();
  chimney.rect(w * 0.73, h * 0.68, w * 0.012, h * 0.04);
  ink(chimney, "#8b5a2b", { cel: false });
  [[0.738, 0.655, 0.008], [0.748, 0.625, 0.011], [0.762, 0.59, 0.014]].forEach(([x, y, r]) => {
    const puff = new Path2D();
    puff.arc(w * x, h * y, w * r, 0, Math.PI * 2);
    ink(puff, "#fffdf5", { cel: false });
  });
  const house = new Path2D();
  house.rect(w * 0.68, h * 0.74, w * 0.07, h * 0.08);
  ink(house, "#fffdf5");
  const roof = new Path2D();
  roof.moveTo(w * 0.665, h * 0.745);
  roof.lineTo(w * 0.715, h * 0.68);
  roof.lineTo(w * 0.765, h * 0.745);
  roof.closePath();
  ink(roof, "#ff6b6b");
  c.fillStyle = "#ffdd00";
  c.fillRect(w * 0.7, h * 0.765, w * 0.025, h * 0.03);
  c.fillStyle = "#30283a";
  c.fillRect(w * 0.73, h * 0.78, w * 0.012, h * 0.04);
  c.strokeStyle = "#30283a";
  c.lineWidth = Math.max(2, w / 300);
  c.beginPath();
  for (let i = 0; i < 5; i++) {
    c.moveTo(w * (0.77 + i * 0.018), h * 0.82);
    c.lineTo(w * (0.77 + i * 0.018), h * 0.795);
  }
  c.moveTo(w * 0.765, h * 0.802);
  c.lineTo(w * 0.85, h * 0.802);
  c.stroke();
}

// ---------- rug under the desk: plain charcoal with a thin cream inset border ----------
export function drawRug(c, w, h, { base = "#4a4b50", border = "#f3ead8" } = {}) {
  c.fillStyle = base;
  c.fillRect(0, 0, w, h);
  let r = 2909;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  // a low pile: thousands of short fibres a shade lighter or darker than the base
  for (let i = 0; i < (w * h) / 26; i++) {
    c.fillStyle = rand() < 0.5 ? "rgba(0,0,0,.09)" : "rgba(255,255,255,.06)";
    c.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
  }
  // a twill weave: fine diagonal ribs running across it
  c.strokeStyle = "rgba(0,0,0,.07)";
  c.lineWidth = 2;
  for (let x = -h; x < w; x += 12) {
    c.beginPath();
    c.moveTo(x, h);
    c.lineTo(x + h, 0);
    c.stroke();
  }
  c.strokeStyle = "rgba(255,255,255,.035)";
  for (let x = -h + 6; x < w; x += 12) {
    c.beginPath();
    c.moveTo(x, h);
    c.lineTo(x + h, 0);
    c.stroke();
  }
  // the border: a cream line just inside the edge
  const inset = w * 0.045;
  c.lineWidth = Math.max(5, w / 200);
  c.strokeStyle = border;
  c.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  // the outer edge, bound in black
  c.lineWidth = Math.max(8, w / 80);
  c.strokeStyle = "#1a1714";
  c.strokeRect(0, 0, w, h);
}


// Shared with the other texture modules
export { crescent };
