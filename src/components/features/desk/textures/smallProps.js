import { DISPLAY } from "./base";

// ---------- mug, coffee and coaster ----------
// The coffee's top, for a cylinder's cap: a ring of darker brew round the edge where it meets
// the cup, the crema in two flat tones, a layered latte-art heart and a hard-edged sheen of the
// window across it
export function drawCoffeeTop(c, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const R = w / 2;
  c.fillStyle = "#3b2412";
  c.fillRect(0, 0, w, h);
  c.beginPath();
  c.arc(cx, cy, R * 0.9, 0, Math.PI * 2);
  c.fillStyle = "#8a5428";
  c.fill();
  c.beginPath();
  c.arc(cx, cy, R * 0.74, 0, Math.PI * 2);
  c.fillStyle = "#a96b36";
  c.fill();
  // the art: a layered heart, as when milk is poured in a wobble and pulled through. Nested
  // hearts alternate milk and crema, bunched toward the point the pour came from, and a thin
  // pulled line runs down through them, dragging each ring into the point. Flat tones, the
  // outermost lightly inked.
  const milk = "#f8ecd8";
  const ring = "#b47740";
  const heart = (s, dy) => {
    const k = R * s;
    const y = cy + dy;
    c.beginPath();
    c.moveTo(cx, y + k * 0.62);
    c.bezierCurveTo(cx - k * 1.05, y + k * 0.05, cx - k * 0.62, y - k * 0.82, cx, y - k * 0.34);
    c.bezierCurveTo(cx + k * 0.62, y - k * 0.82, cx + k * 1.05, y + k * 0.05, cx, y + k * 0.62);
    c.closePath();
  };
  // mottled crema round it, darker flecks where the espresso shows through
  let seed = 7121;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  c.fillStyle = "#94592b";
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2;
    const d = R * (0.55 + rand() * 0.3);
    c.beginPath();
    c.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * (0.015 + rand() * 0.03), R * (0.01 + rand() * 0.015), a, 0, Math.PI * 2);
    c.fill();
  }
  heart(0.76, -R * 0.02);
  c.lineWidth = w * 0.012;
  c.strokeStyle = "#7a4a22";
  c.stroke();
  [[0.76, 0, milk], [0.61, 0.035, ring], [0.49, 0.065, milk], [0.37, 0.09, ring], [0.24, 0.115, milk]].forEach(([size, dy, color]) => {
    heart(size, R * (dy - 0.02));
    c.fillStyle = color;
    c.fill();
  });
  c.beginPath();
  // from the cleft at the top down to the point, no further
  c.moveTo(cx - R * 0.022, cy - R * 0.29);
  c.lineTo(cx + R * 0.022, cy - R * 0.29);
  c.lineTo(cx + R * 0.005, cy + R * 0.44);
  c.lineTo(cx - R * 0.005, cy + R * 0.44);
  c.closePath();
  c.fillStyle = milk;
  c.fill();
  // the window's sheen: a hard-edged crescent near the far rim
  c.save();
  c.beginPath();
  c.arc(cx, cy, R * 0.96, 0, Math.PI * 2);
  c.clip();
  c.beginPath();
  c.arc(cx - R * 0.15, cy - R * 0.2, R * 0.9, Math.PI * 1.08, Math.PI * 1.42);
  c.lineWidth = w * 0.035;
  c.strokeStyle = "rgba(255,255,255,.55)";
  c.stroke();
  c.restore();
}
// Cork: a warm ground packed with granules in three browns
export function drawCork(c, w, h) {
  c.fillStyle = "#c08b52";
  c.fillRect(0, 0, w, h);
  let r = 3331;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const tones = ["#a8743f", "#d9a86d", "#8a5a2e", "#e6bd85"];
  for (let i = 0; i < (w * h) / 40; i++) {
    c.fillStyle = tones[Math.floor(rand() * tones.length)];
    c.beginPath();
    c.ellipse(rand() * w, rand() * h, 1 + rand() * 3, 1 + rand() * 2.2, rand() * 3, 0, Math.PI * 2);
    c.fill();
  }
}

// ---------- mushroom figure ----------
// Its cap, on a hemisphere's uv (the canvas's top row is the crown, its bottom the rim): red,
// with big white spots inked round, a pale lip at the rim and a lighter band of sheen
export function drawMushroomCap(c, w, h) {
  c.fillStyle = "#e11d48";
  c.fillRect(0, 0, w, h);
  // a band of sheen high on the cap, and the rim a shade deeper
  c.fillStyle = "#f43f6a";
  c.fillRect(0, h * 0.22, w, h * 0.12);
  c.fillStyle = "#be123c";
  c.fillRect(0, h * 0.9, w, h * 0.1);
  // spots: sized on the cap, so stretched across the canvas the nearer they are to the crown
  const spot = (u, v, a) => {
    const theta = v * Math.PI / 2;
    const ry = (a / (Math.PI / 2)) * h;
    const rx = Math.min(w / 2, (a / (2 * Math.PI * Math.max(0.15, Math.sin(theta)))) * w);
    [u * w - w, u * w, u * w + w].forEach((x) => {
      c.beginPath();
      c.ellipse(x, v * h, rx, ry, 0, 0, Math.PI * 2);
      c.fillStyle = "#fffdf5";
      c.fill();
      c.lineWidth = 3;
      c.strokeStyle = "#1a1714";
      c.stroke();
      c.beginPath();
      c.ellipse(x - rx * 0.2, v * h + ry * 0.3, rx * 0.7, ry * 0.45, 0, 0, Math.PI);
      c.fillStyle = "#e9e2d4";
      c.fill();
    });
  };
  // the crown spot covers the pole: a band across the top
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, w, h * 0.17);
  c.fillStyle = "#e9e2d4";
  c.fillRect(0, h * 0.12, w, h * 0.05);
  c.fillStyle = "#1a1714";
  c.fillRect(0, h * 0.17, w, 3);
  [[0.0, 0.6, 0.3], [0.25, 0.55, 0.26], [0.5, 0.62, 0.32], [0.75, 0.58, 0.27], [0.13, 0.85, 0.14], [0.62, 0.86, 0.13], [0.88, 0.84, 0.12]].forEach(([u, v, a]) => spot(u, v, a));
}
// The stem, on a cylinder's uv (u = 0 faces front): cream, with two tall eyes and a blush
export function drawMushroomFace(c, w, h) {
  c.fillStyle = "#fff6e6";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#f1e2c6";
  c.fillRect(0, h * 0.82, w, h * 0.18);
  // the canvas squeezes the stem's width ~1.35x more than its height, so eyes are drawn wider
  [-0.06, 0.06].forEach((u) => {
    [u * w, u * w + w].forEach((x) => {
      c.beginPath();
      c.ellipse(x, h * 0.4, w * 0.018, h * 0.13, 0, 0, Math.PI * 2);
      c.fillStyle = "#1a1714";
      c.fill();
      c.beginPath();
      c.ellipse(x - w * 0.005, h * 0.33, w * 0.007, h * 0.04, 0, 0, Math.PI * 2);
      c.fillStyle = "#ffffff";
      c.fill();
    });
  });
  c.fillStyle = "rgba(255,120,150,.55)";
  [-0.11, 0.11].forEach((u) => [u * w, u * w + w].forEach((x) => {
    c.beginPath();
    c.ellipse(x, h * 0.6, w * 0.025, h * 0.06, 0, 0, Math.PI * 2);
    c.fill();
  }));
}
// The underside of the cap: gills fanning out from the stem
export function drawMushroomGills(c, w, h) {
  c.fillStyle = "#f3e2c4";
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "#c9a874";
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    c.moveTo(w / 2 + Math.cos(a) * w * 0.12, h / 2 + Math.sin(a) * h * 0.12);
    c.lineTo(w / 2 + Math.cos(a) * w * 0.49, h / 2 + Math.sin(a) * h * 0.49);
  }
  c.stroke();
}

// ---------- wastebasket and hoop ----------
// Moulded plastic for the bin's lathe: upright ribs round it and a fine stipple, as a light tile
// its material tints
export function drawBinRibs(c, w, h) {
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, w, h);
  const ribs = 28;
  for (let i = 0; i < ribs; i++) {
    const x = (i / ribs) * w;
    c.fillStyle = "rgba(0,40,40,.13)";
    c.fillRect(x, 0, w / ribs * 0.28, h);
    c.fillStyle = "rgba(0,40,40,.06)";
    c.fillRect(x + w / ribs * 0.28, 0, w / ribs * 0.12, h);
  }
  let r = 1777;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < (w * h) / 60; i++) {
    c.fillStyle = rand() < 0.5 ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.4)";
    c.fillRect(rand() * w, rand() * h, 1.5, 1.5);
  }
  // the inside of the bin (the canvas's top half) a step darker
  c.fillStyle = "rgba(0,30,40,.18)";
  c.fillRect(0, 0, w, h * 0.43);
}
// The backboard's face: a yellow board with an inked border, the shooter's square over the
// ring, the league's name, bolts in the corners and the scuffs of a hundred paper balls
export function drawBackboard(c, w, h) {
  const ink = "#1a1714";
  c.fillStyle = "#ffdd00";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#ffe94d";
  c.fillRect(0, 0, w, h * 0.18);
  c.lineWidth = w * 0.03;
  c.strokeStyle = ink;
  c.strokeRect(w * 0.05, h * 0.07, w * 0.9, h * 0.86);
  c.fillStyle = "#ff7a1a";
  c.fillRect(w * 0.06, h * 0.86, w * 0.88, h * 0.05);
  c.strokeRect(w * 0.32, h * 0.42, w * 0.36, h * 0.38);
  c.fillStyle = ink;
  c.font = `800 ${Math.round(h * 0.12)}px ${DISPLAY}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("DESK LEAGUE", w / 2, h * 0.25);
  [[0.1, 0.13], [0.9, 0.13], [0.1, 0.8], [0.9, 0.8]].forEach(([x, y]) => {
    c.beginPath();
    c.arc(w * x, h * y, w * 0.018, 0, Math.PI * 2);
    c.fillStyle = "#9aa3ad";
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = ink;
    c.stroke();
  });
  c.fillStyle = "rgba(60,50,30,.18)";
  [[0.42, 0.55, 0.06], [0.6, 0.62, 0.05], [0.47, 0.7, 0.045], [0.55, 0.5, 0.035]].forEach(([x, y, s]) => {
    c.beginPath();
    c.ellipse(w * x, h * y, w * s, w * s * 0.8, 0.4, 0, Math.PI * 2);
    c.fill();
  });
}
// The net, for an open cylinder's uv: a diamond mesh of white cord, inked, on a clear ground
export function drawHoopNet(c, w, h) {
  c.clearRect(0, 0, w, h);
  const cells = 6;
  const rows = 3;
  const cord = () => {
    c.beginPath();
    for (let i = -rows; i <= cells + rows; i++) {
      const x = (i / cells) * w;
      c.moveTo(x, 0);
      c.lineTo(x + (rows / cells) * w, h);
      c.moveTo(x, 0);
      c.lineTo(x - (rows / cells) * w, h);
    }
    c.moveTo(0, 3);
    c.lineTo(w, 3);
  };
  cord();
  c.lineWidth = 7;
  c.strokeStyle = "#1a1714";
  c.stroke();
  cord();
  c.lineWidth = 3.5;
  c.strokeStyle = "#fffdf5";
  c.stroke();
}

// ---------- glossy overlays ----------
// A hard-edged gloss for glass or a vinyl sleeve: two slanted streaks of light, nothing else
export function drawGlassSheen(c, w, h, { strength = 0.22 } = {}) {
  c.clearRect(0, 0, w, h);
  c.fillStyle = `rgba(255,255,255,${strength})`;
  [[0.08, 0.16], [0.3, 0.06]].forEach(([x, wd]) => {
    c.beginPath();
    c.moveTo(w * x, h);
    c.lineTo(w * (x + wd), h);
    c.lineTo(w * (x + wd + 0.55), 0);
    c.lineTo(w * (x + 0.55), 0);
    c.closePath();
    c.fill();
  });
}
// The shine that runs along a blade as it clears the saya: a bright slanted bar between two
// thin ones, black around them (it's used as an emissive map)
export function drawBladeGlint(c, w, h) {
  c.fillStyle = "#000";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#ffffff";
  [[0.47, 0.035], [0.43, 0.008], [0.53, 0.008]].forEach(([x, wd]) => {
    c.beginPath();
    c.moveTo(w * (x - 0.03), h);
    c.lineTo(w * (x - 0.03 + wd), h);
    c.lineTo(w * (x + 0.03 + wd), 0);
    c.lineTo(w * (x + 0.03), 0);
    c.closePath();
    c.fill();
  });
}
