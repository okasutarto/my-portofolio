// The wallpaper collection: the original cut-paper sheet and five landscapes cut from the same
// paper. Every layer gets the desktop's print treatment — a hard shadow, halftone on its
// shaded side, an ink outline — and the sheet gets grain and a vignette. Drawn, never loaded.
export const WALLPAPERS = [
  { id: "original", name: "Cut paper" },
  { id: "big-sur", name: "Big Sur" },
  { id: "catalina", name: "Catalina" },
  { id: "mojave", name: "Mojave" },
  { id: "monterey", name: "Monterey" },
  { id: "sonoma", name: "Sonoma" },
];

export function createWallpapers() {
  let selection = { id: "monterey" };
  try {
    const saved = JSON.parse(localStorage.getItem("desk-wallpaper"));
    if (WALLPAPERS.some((item) => item.id === saved?.id)) selection = { id: saved.id };
  } catch { /* Storage is optional. */ }
  let dirty = false;
  return {
    get selection() { return selection; },
    get dirty() { return dirty; },
    clean() { dirty = false; },
    select(id) {
      if (!WALLPAPERS.some((item) => item.id === id)) return;
      selection = { id };
      dirty = true;
      try { localStorage.setItem("desk-wallpaper", JSON.stringify(selection)); } catch { /* Storage is optional. */ }
    },
  };
}

const W = 640;
const H = 384;

// Night is the same paper under a dim indigo light
function mix(hex, toward, k) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(toward.slice(1), 16);
  const ch = (s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

// Paints landscape `id` for the light or dark room onto `w` (a W × H context).
// `kit` lends the desktop's own print tools so the two never drift apart.
export function paintScenery(w, id, mode, { halftone, grainOver, seeded }) {
  const night = mode === "dark";
  const tone = (hex) => (night ? mix(hex, "#231e45", 0.38) : hex);
  const ink = night ? "#0b0a10" : "#1a1714";
  const cream = tone("#fffdf5");
  const puff = night ? "#5f5a8a" : "#fffdf5";
  const rnd = seeded(id.length * 97 + (night ? 5 : 1));

  w.lineJoin = "round";
  w.lineCap = "round";
  const outline = (width = 3) => {
    w.lineWidth = width;
    w.strokeStyle = ink;
    w.stroke();
  };
  // A paper cut-out: shadow, colour, halftone towards its lower right, ink
  const shape = (fill, path, box, { lift = 4, dots = 0.16 } = {}) => {
    w.save();
    w.translate(lift, lift);
    w.beginPath();
    path();
    w.fillStyle = night ? "rgba(0,0,0,.35)" : "rgba(26,23,20,.22)";
    w.fill();
    w.restore();
    w.beginPath();
    path();
    w.fillStyle = fill;
    w.fill();
    if (box && dots) {
      w.beginPath();
      path();
      halftone(w, box, `rgba(0,0,0,${dots})`);
    }
    w.beginPath();
    path();
    outline();
  };
  // A smooth closed outline through the points, rounded like scissor-cut card
  const blob = (pts) => () => {
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const start = mid(pts[pts.length - 1], pts[0]);
    w.moveTo(...start);
    pts.forEach((p, i) => w.quadraticCurveTo(p[0], p[1], ...mid(p, pts[(i + 1) % pts.length])));
    w.closePath();
  };
  const boxOf = (pts) => {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return [x, y, Math.max(...xs) - x, Math.max(...ys) - y];
  };
  const piece = (fill, pts, opts) => shape(fill, blob(pts), boxOf(pts), opts);
  // A band whose top edge rolls like a wave, filled down to `bottom`
  const band = (fill, y, amp, len, phase, bottom = H + 10, opts) => {
    const path = () => {
      w.moveTo(-10, bottom);
      for (let x = -10; x <= W + 10; x += 8) w.lineTo(x, y + Math.sin(x / len + phase) * amp + (x / W) * amp * 0.6);
      w.lineTo(W + 10, bottom);
      w.closePath();
    };
    shape(fill, path, [-10, y - amp, W + 20, bottom - y + amp], opts);
  };
  const cloud = (x, y, s) => {
    const bumps = [[16, 12], [24, 20], [20, 15], [14, 9]];
    shape(puff, () => {
      w.moveTo(x, y);
      let at = x;
      bumps.forEach(([bw, bh]) => {
        w.bezierCurveTo(at, y - bh * s, at + bw * s, y - bh * s, at + bw * s, y);
        at += bw * s;
      });
      w.closePath();
    }, null, { lift: 3 });
  };
  const sparkle = (x, y, a) => {
    const b = a * 0.3;
    shape(night ? "#e8c84a" : "#ffdd00", () => {
      w.moveTo(x, y - a);
      w.quadraticCurveTo(x + b, y - b, x + a, y);
      w.quadraticCurveTo(x + b, y + b, x, y + a);
      w.quadraticCurveTo(x - b, y + b, x - a, y);
      w.quadraticCurveTo(x - b, y - b, x, y - a);
    }, null, { lift: 2 });
  };
  // Little ink ticks for water, ripples and grass
  const ticks = (color, list, width = 2.4) => {
    w.strokeStyle = color;
    w.lineWidth = width;
    list.forEach(([x, y, len, bend = 3]) => {
      w.beginPath();
      w.moveTo(x, y);
      w.quadraticCurveTo(x + len / 2, y - bend, x + len, y);
      w.stroke();
    });
  };

  // ----- sky: the site's gradient and dot grid, then a sun or a moon and stars -----
  const sky = w.createLinearGradient(0, 0, 0, H * 0.75);
  sky.addColorStop(0, night ? "#2a2540" : "#7cc6ff");
  sky.addColorStop(1, night ? "#17151f" : "#eef8ff");
  w.fillStyle = sky;
  w.fillRect(0, 0, W, H);
  w.fillStyle = night ? "rgba(196,185,220,.08)" : "rgba(26,23,20,.08)";
  for (let y = 12; y < H; y += 16) for (let x = 12; x < W; x += 16) w.fillRect(x, y, 1.6, 1.6);
  const [orbX, orbY] = { "big-sur": [120, 70], catalina: [520, 64], mojave: [470, 92], monterey: [560, 58], sonoma: [110, 62] }[id];
  if (night) {
    shape("#f6ebc0", () => w.arc(orbX, orbY, 24, 0, Math.PI * 2), null, { lift: 3 });
    w.fillStyle = "rgba(0,0,0,.12)";
    [[-8, -5, 5], [7, 4, 6], [-3, 10, 3]].forEach(([dx, dy, r]) => {
      w.beginPath();
      w.arc(orbX + dx, orbY + dy, r, 0, Math.PI * 2);
      w.fill();
    });
    for (let i = 0; i < 9; i++) {
      const x = 30 + rnd() * 580, y = 18 + rnd() * 90, a = 4 + rnd() * 4;
      if (Math.hypot(x - orbX, y - orbY) > 40) sparkle(x, y, a);
    }
  } else {
    shape(tone("#ffdd00"), () => w.arc(orbX, orbY, 28, 0, Math.PI * 2), null, { lift: 3 });
    // the sun's orange stripes, as on the original sheet
    w.save();
    w.beginPath();
    w.arc(orbX, orbY, 26.5, 0, Math.PI * 2);
    w.clip();
    w.strokeStyle = "#ff7a1a";
    w.lineWidth = 4;
    for (let k = 0; k < 4; k++) {
      w.beginPath();
      w.moveTo(orbX - 30, orbY + 6 + k * 8);
      w.lineTo(orbX + 30, orbY + 6 + k * 8);
      w.stroke();
    }
    w.restore();
    w.beginPath();
    w.arc(orbX, orbY, 28, 0, Math.PI * 2);
    outline();
  }

  // print registration crosses, as on the original sheet
  w.strokeStyle = night ? "rgba(236,232,247,.45)" : ink;
  w.lineWidth = 2;
  [[360, 26], [600, 130], [40, 40]].forEach(([x, y]) => {
    w.beginPath();
    w.moveTo(x - 5, y);
    w.lineTo(x + 5, y);
    w.moveTo(x, y - 5);
    w.lineTo(x, y + 5);
    w.stroke();
  });

  // ----- the land -----
  if (id === "big-sur") {
    // A coast running away to the left: the sea, headlands, the cliff road and its bridge
    cloud(210, 70, 1.9);
    cloud(420, 44, 1.3);
    band(tone("#2f7bf0"), 168, 2, 60, 0, H + 10, { dots: 0.12 });
    piece(tone("#7fa8ff"), [[150, 172], [210, 150], [260, 156], [320, 128], [390, 132], [450, 108], [520, 112], [600, 86], [680, 80], [680, 190], [400, 186]]);
    piece(tone("#589f84"), [[300, 200], [350, 168], [410, 160], [470, 132], [540, 136], [610, 112], [680, 110], [680, 270], [470, 240]]);
    piece(tone("#ff9a3d"), [[330, 214], [380, 196], [440, 200], [470, 236], [520, 260], [560, 320], [560, 400], [380, 400], [360, 300]]);
    piece(tone("#8fd694"), [[420, 230], [470, 196], [540, 176], [600, 150], [680, 140], [680, 400], [560, 400], [520, 300], [470, 250]]);
    // the coast road, an ink-cased ribbon along the cliff top
    const cased = (path, width) => {
      w.beginPath();
      path();
      w.lineWidth = width + 4.5;
      w.strokeStyle = ink;
      w.stroke();
      w.lineWidth = width;
      w.strokeStyle = cream;
      w.stroke();
    };
    cased(() => {
      w.moveTo(380, 202);
      w.bezierCurveTo(430, 206, 450, 214, 504, 214);
      w.bezierCurveTo(570, 214, 610, 180, 680, 168);
    }, 5);
    // sea stacks and foam along the foot of the cliff
    piece(tone("#c9692a"), [[300, 262], [318, 236], [334, 262]]);
    piece(tone("#c9692a"), [[250, 300], [272, 270], [292, 302]]);
    piece(tone("#c9692a"), [[390, 330], [416, 296], [440, 334]]);
    ticks(cream, [[230, 270, 22], [280, 318, 26], [340, 290, 18], [360, 350, 30], [300, 214, 16]], 3.2);
    ticks(tone("#bfe3ff"), [[40, 210, 26], [100, 240, 34], [60, 290, 30], [150, 330, 38], [30, 350, 24], [180, 200, 20]]);
  } else if (id === "catalina") {
    // An island rising out of a calm sea, a smaller one behind it
    cloud(60, 120, 1.7);
    cloud(280, 70, 1.4);
    band(tone("#1fa6d6"), 214, 1.5, 70, 1, H + 10, { dots: 0.12 });
    piece(tone("#6b8fd9"), [[30, 220], [70, 196], [120, 190], [170, 204], [200, 222]]);
    piece(tone("#c9692a"), [[170, 232], [220, 200], [280, 168], [340, 126], [380, 112], [420, 130], [470, 168], [540, 200], [610, 234]]);
    piece(tone("#ff9a3d"), [[230, 232], [290, 196], [340, 160], [380, 150], [430, 176], [500, 214], [560, 236]]);
    piece(tone("#589f84"), [[300, 176], [340, 136], [380, 120], [414, 136], [400, 160], [350, 170]]);
    piece(tone("#8fd694"), [[456, 188], [500, 200], [470, 214], [430, 206]], { dots: 0 });
    // foam hugging the waterline, and ripples on the open sea
    shape(cream, () => w.ellipse(390, 236, 230, 9, 0, 0, Math.PI * 2), null, { lift: 2 });
    ticks(tone("#bfe3ff"), [[60, 270, 30], [140, 300, 40], [260, 330, 34], [420, 300, 40], [520, 340, 36], [580, 272, 26], [40, 340, 26], [340, 270, 24]]);
  } else if (id === "mojave") {
    // Two great dunes and a mesa line, one saguaro keeping watch
    cloud(90, 80, 1.8);
    cloud(260, 120, 1.1);
    piece(tone("#c9692a"), [[-10, 220], [60, 200], [70, 186], [160, 186], [170, 200], [260, 210], [330, 196], [340, 182], [420, 182], [430, 198], [650, 212], [650, 290], [-10, 290]]);
    piece(tone("#ffc94a"), [[-10, 250], [120, 214], [250, 236], [400, 280], [520, 330], [650, 360], [650, 400], [-10, 400]]);
    piece(tone("#ff9a3d"), [[260, 400], [330, 300], [400, 236], [460, 200], [500, 196], [560, 220], [650, 250], [650, 400]]);
    // the shaded lee face of the big dune
    piece(tone("#d9622b"), [[500, 196], [470, 260], [460, 330], [470, 400], [650, 400], [650, 250], [560, 220]], { dots: 0.2 });
    ticks(tone("#c9692a"), [[40, 300, 40, 5], [90, 330, 46, 5], [30, 360, 50, 5], [150, 290, 36, 4], [180, 350, 44, 5], [300, 340, 30, 4], [360, 300, 26, 4]], 2.6);
    // the saguaro
    const cactus = tone("#3f8f5a");
    shape(cactus, () => w.roundRect(112, 226, 14, 70, 7), [112, 226, 14, 70]);
    shape(cactus, () => {
      w.roundRect(94, 246, 10, 30, 5);
    }, null);
    shape(cactus, () => w.roundRect(134, 236, 10, 34, 5), null);
    shape(cactus, () => w.rect(100, 268, 14, 8), null, { lift: 0 });
    shape(cactus, () => w.rect(124, 260, 14, 8), null, { lift: 0 });
  } else if (id === "monterey") {
    // Ribbons of colour sweeping down the valley, folded like paper streamers
    const ribbons = ["#3b2a8f", "#6a3fd6", "#b26bff", "#ff90e8", "#d946ef", "#8b5cf6", "#2d1f73"];
    cloud(70, 76, 1.7);
    cloud(320, 50, 1.2);
    ribbons.forEach((hex, i) => band(tone(hex), 140 + i * 36, 18 - i, 70 + i * 6, i * 1.3, H + 10, { dots: 0.14 }));
    ticks(night ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.55)", [[60, 196, 50, 8], [260, 232, 60, 8], [420, 270, 50, 8], [120, 312, 60, 8], [480, 344, 60, 8]], 3);
  } else if (id === "sonoma") {
    // Rolling vineyard hills, a farm road and lollipop oaks
    cloud(230, 70, 1.9);
    cloud(450, 100, 1.2);
    band(tone("#7fa8ff"), 176, 14, 90, 0.5, H + 10, { dots: 0.1 });
    band(tone("#589f84"), 210, 18, 80, 2, H + 10);
    band(tone("#b8e05a"), 250, 16, 110, 4, H + 10);
    // vine rows on the near hill
    w.save();
    w.beginPath();
    w.rect(0, 270, W, H);
    w.clip();
    ticks(tone("#589f84"), Array.from({ length: 8 }, (_, k) => [-20 + k * 4, 290 + k * 13, 680, -10]), 3);
    w.restore();
    // the road curling down to the front
    w.beginPath();
    w.moveTo(360, 250);
    w.bezierCurveTo(420, 280, 300, 320, 380, 400);
    w.lineWidth = 16;
    w.strokeStyle = ink;
    w.stroke();
    w.lineWidth = 11;
    w.strokeStyle = tone("#f5d99a");
    w.stroke();
    const oak = (x, y, r) => {
      shape(tone("#8a5a3b"), () => w.rect(x - 3, y, 6, r * 1.3), null, { lift: 2 });
      shape(tone("#3f8f5a"), () => w.arc(x, y, r, 0, Math.PI * 2), [x - r, y - r, r * 2, r * 2]);
    };
    oak(120, 226, 16);
    oak(150, 236, 11);
    oak(530, 222, 14);
    oak(580, 262, 20);
    oak(470, 300, 12);
  }

  // The whole sheet gets the print grain, then a soft vignette
  w.beginPath();
  w.rect(0, 0, W, H);
  grainOver(w, 1);
  const vignette = w.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, night ? "rgba(0,0,0,.35)" : "rgba(26,23,20,.12)");
  w.fillStyle = vignette;
  w.fillRect(0, 0, W, H);
}
