import { BODY, DISPLAY, fitFont } from "./base";

// ---------- game cases on the shelf ----------
// A case's spine: the platform's header band and logo at the top, the game's own colour with its
// title running up the spine, and an age rating at the foot
const RATINGS = ["E", "E10", "T", "3", "7", "12"];
export function drawGameSpine(c, w, h, { platform, art, title, ink = "#000", i = 0, system = "switch" }) {
  c.fillStyle = art;
  c.fillRect(0, 0, w, h);
  const band = h * 0.15;
  if (system === "ps5") {
    // a PS5 case: the white header band with the console's name across it
    c.fillStyle = "#fffdf5";
    c.fillRect(0, 0, w, band);
    c.fillStyle = "#000";
    c.fillRect(0, band - 3, w, 6);
    c.textAlign = "center";
    c.textBaseline = "middle";
    fitFont(c, "PS5", 900, DISPLAY, Math.round(band * 0.42), w * 0.8, 6);
    c.fillText("PS5", w / 2, band * 0.5);
  } else {
    c.fillStyle = platform;
    c.fillRect(0, 0, w, band);
    c.fillStyle = "#000";
    c.fillRect(0, band - 3, w, 6);
    // logo: a white pill with a dot
    c.fillStyle = "#fff";
    c.beginPath();
    c.roundRect(w * 0.2, band * 0.3, w * 0.6, band * 0.4, band * 0.2);
    c.fill();
    c.fillStyle = platform;
    c.beginPath();
    c.arc(w * 0.38, band * 0.5, band * 0.1, 0, Math.PI * 2);
    c.fill();
  }
  // title, reading bottom to top
  c.save();
  c.translate(w / 2 + 1, h * 0.56);
  c.rotate(-Math.PI / 2);
  c.fillStyle = ink;
  c.textAlign = "center";
  c.textBaseline = "middle";
  fitFont(c, title, 800, DISPLAY, Math.round(w * 0.5), h * 0.62);
  c.fillText(title, 0, 0);
  c.restore();
  // rating
  const r = w * 0.62;
  c.fillStyle = "#fff";
  c.fillRect((w - r) / 2, h - r - 10, r, r);
  c.lineWidth = 4;
  c.strokeStyle = "#000";
  c.strokeRect((w - r) / 2, h - r - 10, r, r);
  c.fillStyle = "#000";
  c.font = `800 ${Math.round(r * 0.5)}px ${BODY}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(RATINGS[i % RATINGS.length], w / 2, h - r / 2 - 9);
  c.lineWidth = 6;
  c.strokeRect(0, 0, w, h);
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
}

// The cover of the one case standing face-out, as box art: the platform band with its logo, a
// pixel-art race (a dithered sky, a setting sun, clouds, far mountains, mown hills, a kerbed
// road and a kart roaring off with its driver), the title on a chequered-flag block, the rating
// and player count, all under the case's clear sleeve: print grain, a scuff or two and a gloss.
export function drawGameCover(c, w, h, { platform = "#e11d48", title = "PIXEL KART" } = {}) {
  const k = w / 234; // line weights were tuned for a 234px-wide cover
  const band = h * 0.1;
  const px = w / 60; // one pixel of the box art
  let seed = 3;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const snap = (v) => Math.round(v / px) * px;
  const ink = (width) => {
    c.lineWidth = width * k;
    c.strokeStyle = "#000";
    c.lineJoin = "round";
  };
  // a disc built from whole pixels
  const pixelDisc = (cx, cy, r, color) => {
    c.fillStyle = color;
    for (let y = -r; y <= r; y += px)
      for (let x = -r; x <= r; x += px) if (x * x + y * y <= r * r) c.fillRect(snap(cx + x), snap(cy + y), px + 0.5, px + 0.5);
  };

  // sky: flat bands of blue, a checker of dither pixels where each meets the next
  const SKY = ["#3aa8f5", "#5bbcff", "#7fceff", "#a2dfff", "#c4ecff"];
  const skyBottom = h * 0.72;
  const step = (skyBottom - band) / SKY.length;
  SKY.forEach((color, i) => {
    c.fillStyle = color;
    c.fillRect(0, band + i * step, w, step + 1);
  });
  SKY.slice(1).forEach((color, i) => {
    const y = snap(band + (i + 1) * step);
    c.fillStyle = color;
    for (let x = 0; x < w; x += px * 2) {
      c.fillRect(x, y - px * 2, px, px);
      c.fillRect(x + px, y - px, px, px);
    }
  });
  // the setting sun, with a darker rim and a row of glints
  pixelDisc(w * 0.8, h * 0.52, w * 0.12, "#ff9f1c");
  pixelDisc(w * 0.8, h * 0.52, w * 0.095, "#ffdd00");
  c.fillStyle = "#fff7b0";
  [[-2, -3], [-1, -3], [-3, -2]].forEach(([x, y]) => c.fillRect(snap(w * 0.8 + x * px), snap(h * 0.52 + y * px), px, px));
  // pixel clouds: white puffs on a pale blue underside
  [[0.08, 0.15, 1], [0.6, 0.14, 0.8], [0.12, 0.5, 0.9]].forEach(([x0, y0, s]) => {
    const cx = snap(w * x0);
    const cy = snap(h * y0);
    const puffs = [[0, 2, 14, 3], [2, 0, 6, 3], [7, 1, 5, 2]];
    c.fillStyle = "#9fd2f2";
    puffs.forEach(([x, y, cw, ch]) => c.fillRect(cx + x * px * s, cy + (y + 1) * px * s, cw * px * s, ch * px * s));
    c.fillStyle = "#ffffff";
    puffs.forEach(([x, y, cw, ch]) => c.fillRect(cx + x * px * s, cy + y * px * s, cw * px * s, ch * px * s));
  });
  // far mountains, snow-capped
  c.fillStyle = "#7a86c8";
  c.beginPath();
  c.moveTo(0, h * 0.66);
  [[0.12, 0.56], [0.24, 0.63], [0.4, 0.53], [0.56, 0.64], [0.7, 0.57], [0.86, 0.65], [1, 0.6]].forEach(([x, y]) => c.lineTo(w * x, h * y));
  c.lineTo(w, h * 0.7);
  c.lineTo(0, h * 0.7);
  c.closePath();
  c.fill();
  ink(4);
  c.stroke();
  c.fillStyle = "#fffdf5";
  [[0.12, 0.56], [0.4, 0.53], [0.7, 0.57]].forEach(([x, y]) => {
    c.beginPath();
    c.moveTo(w * x, h * y);
    c.lineTo(w * x + w * 0.045, h * y + h * 0.028);
    c.lineTo(w * x + w * 0.015, h * y + h * 0.022);
    c.lineTo(w * x - w * 0.01, h * y + h * 0.03);
    c.lineTo(w * x - w * 0.045, h * y + h * 0.026);
    c.closePath();
    c.fill();
  });
  // hills: a darker back row, then the front with mown stripes, pixel trees and flowers
  const hill = (color, pts) => {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, h * pts[0]);
    c.quadraticCurveTo(w * 0.3, h * pts[1], w * 0.6, h * pts[2]);
    c.quadraticCurveTo(w * 0.85, h * pts[3], w, h * pts[4]);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();
    c.fill();
    ink(6);
    c.stroke();
  };
  hill("#4fae5c", [0.68, 0.56, 0.66, 0.6, 0.64]);
  hill("#8fd694", [0.75, 0.6, 0.72, 0.64, 0.7]);
  c.save();
  c.clip();
  c.fillStyle = "rgba(40,120,60,.18)";
  for (let x = -h; x < w; x += px * 6) {
    c.beginPath();
    c.moveTo(x, h);
    c.lineTo(x + px * 3, h);
    c.lineTo(x + px * 3 + h * 0.5, h * 0.5);
    c.lineTo(x + h * 0.5, h * 0.5);
    c.closePath();
    c.fill();
  }
  c.restore();
  [[0.1, 0.72], [0.22, 0.69], [0.88, 0.69]].forEach(([x0, y0]) => {
    const tx = snap(w * x0);
    const ty = snap(h * y0);
    c.fillStyle = "#6b3f1f";
    c.fillRect(tx, ty, px, px * 3);
    c.fillStyle = "#2f8a43";
    c.fillRect(tx - px * 2, ty - px * 2, px * 5, px * 2);
    c.fillRect(tx - px, ty - px * 4, px * 3, px * 2);
    c.fillStyle = "#56c26a";
    c.fillRect(tx - px, ty - px * 2, px, px);
    c.fillRect(tx, ty - px * 4, px, px);
  });
  [[0.06, 0.86, "#fffdf5"], [0.16, 0.8, "#ff90e8"], [0.9, 0.82, "#ffdd00"], [0.95, 0.9, "#fffdf5"], [0.24, 0.93, "#ffdd00"]].forEach(([x0, y0, color]) => {
    const fx = snap(w * x0);
    const fy = snap(h * y0);
    c.fillStyle = color;
    c.fillRect(fx - px, fy, px * 3, px);
    c.fillRect(fx, fy - px, px, px * 3);
    c.fillStyle = "#ff9f1c";
    c.fillRect(fx, fy, px, px);
  });

  // the road: speckled asphalt, red-and-white kerbs and a dashed centre line, all in perspective
  const top = h * 0.7;
  const L = (t) => [w * (0.47 - 0.15 * t), top + (h - top) * t];
  const R = (t) => [w * (0.55 + 0.27 * t), top + (h - top) * t];
  const road = () => {
    c.beginPath();
    c.moveTo(...L(1));
    c.lineTo(...L(0));
    c.lineTo(...R(0));
    c.lineTo(...R(1));
    c.closePath();
  };
  road();
  c.fillStyle = "#3a3a3a";
  c.fill();
  c.save();
  c.clip();
  for (let i = 0; i < 260; i++) {
    c.fillStyle = i % 2 ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.25)";
    c.fillRect(rand() * w, top + rand() * (h - top), px * 0.5, px * 0.5);
  }
  // kerbs: blocks that grow toward the viewer
  const ts = [0, 0.08, 0.18, 0.3, 0.45, 0.62, 0.8, 1];
  ts.slice(1).forEach((t1, i) => {
    const t0 = ts[i];
    c.fillStyle = i % 2 ? "#fffdf5" : "#e11d48";
    [[L, 0.045], [R, -0.06]].forEach(([edge, inset]) => {
      const [x0, y0] = edge(t0);
      const [x1, y1] = edge(t1);
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.lineTo(x1 + w * inset * (0.3 + t1), y1);
      c.lineTo(x0 + w * inset * (0.3 + t0), y0);
      c.closePath();
      c.fill();
    });
  });
  // dashed centre line
  c.fillStyle = "#ffdd00";
  [[0.05, 0.14], [0.26, 0.4], [0.58, 0.8]].forEach(([t0, t1]) => {
    const mid = (t) => (L(t)[0] + R(t)[0]) / 2;
    const half = (t) => w * (0.004 + 0.012 * t);
    const y = (t) => top + (h - top) * t;
    c.beginPath();
    c.moveTo(mid(t0) - half(t0), y(t0));
    c.lineTo(mid(t0) + half(t0), y(t0));
    c.lineTo(mid(t1) + half(t1), y(t1));
    c.lineTo(mid(t1) - half(t1), y(t1));
    c.closePath();
    c.fill();
  });
  c.restore();
  road();
  ink(6);
  c.stroke();

  // the kart from behind: speed lines, exhaust puffs, fat tyres, a numbered body and the driver
  const u = w / 40;
  const kx = w * 0.42;
  const ky = h * 0.79;
  c.strokeStyle = "rgba(255,255,255,.7)";
  c.lineWidth = 2 * k;
  [[-3, 0.5], [-4.5, 2], [-3.5, 3.5]].forEach(([dx, dy]) => {
    c.beginPath();
    c.moveTo(kx + dx * u, ky + dy * u);
    c.lineTo(kx + (dx - 4) * u, ky + dy * u);
    c.stroke();
  });
  [[-1.2, 5.6, 1], [-2.6, 6.4, 0.75], [-3.8, 7, 0.5]].forEach(([dx, dy, r]) => pixelDisc(kx + dx * u, ky + dy * u, r * u, "#d8d8d8"));
  ink(4);
  [kx + u * 1.5, kx + u * 8.5].forEach((x) => {
    c.fillStyle = "#111";
    c.fillRect(x - u * 1.6, ky + u * 2.4, u * 3.2, u * 3.6);
    c.fillStyle = "#555";
    c.fillRect(x - u * 1.6, ky + u * 3.2, u * 3.2, u * 0.5);
    c.fillRect(x - u * 1.6, ky + u * 4.4, u * 3.2, u * 0.5);
    c.strokeRect(x - u * 1.6, ky + u * 2.4, u * 3.2, u * 3.6);
  });
  c.fillStyle = "#ff6b6b";
  c.fillRect(kx, ky, u * 10, u * 4);
  c.fillStyle = "#c93c3c";
  c.fillRect(kx, ky + u * 3, u * 10, u);
  c.fillStyle = "#ffb3b3";
  c.fillRect(kx + u * 0.5, ky + u * 0.5, u * 9, u * 0.5);
  c.strokeRect(kx, ky, u * 10, u * 4);
  // the spoiler and the number plate
  c.fillStyle = "#1a1714";
  c.fillRect(kx - u * 0.5, ky - u * 0.8, u * 11, u * 0.9);
  c.fillStyle = "#fffdf5";
  c.fillRect(kx + u * 3.6, ky + u * 1.2, u * 2.8, u * 1.8);
  c.strokeRect(kx + u * 3.6, ky + u * 1.2, u * 2.8, u * 1.8);
  c.fillStyle = "#000";
  c.font = `800 ${Math.round(u * 1.6)}px ${BODY}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("1", kx + u * 5, ky + u * 2.15);
  // tail lights
  c.fillStyle = "#ffdd00";
  c.fillRect(kx + u * 0.6, ky + u * 1.4, u, u);
  c.fillRect(kx + u * 8.4, ky + u * 1.4, u, u);
  // the driver: a yellow helmet with a stripe, a dark visor glint and shoulders
  c.fillStyle = "#3b6fd6";
  c.fillRect(kx + u * 2.4, ky - u * 1.6, u * 5.2, u * 1.6);
  c.strokeRect(kx + u * 2.4, ky - u * 1.6, u * 5.2, u * 1.6);
  c.fillStyle = "#ffdd00";
  c.fillRect(kx + u * 3, ky - u * 5, u * 4, u * 3.6);
  c.fillStyle = "#e11d48";
  c.fillRect(kx + u * 4.6, ky - u * 5, u * 0.8, u * 3.6);
  c.fillStyle = "#fff7b0";
  c.fillRect(kx + u * 3.4, ky - u * 4.6, u * 0.8, u * 0.8);
  c.strokeRect(kx + u * 3, ky - u * 5, u * 4, u * 3.6);

  // title block: a drop shadow, the pink block, a chequered strip and a "GRAND PRIX" tag
  c.save();
  c.translate(w / 2, h * 0.31);
  c.rotate(-0.06);
  const bw = w * 0.8;
  const bh = h * 0.16;
  c.fillStyle = "#000";
  c.fillRect(-bw / 2 + 8 * k, -bh / 2 + 8 * k, bw, bh + h * 0.035);
  c.fillStyle = "#ff90e8";
  c.fillRect(-bw / 2, -bh / 2, bw, bh);
  c.fillStyle = "rgba(255,255,255,.35)";
  c.fillRect(-bw / 2, -bh / 2, bw, bh * 0.18);
  const sq = h * 0.0175;
  for (let i = 0; i * sq < bw; i++)
    for (let j = 0; j < 2; j++) {
      c.fillStyle = (i + j) % 2 ? "#000" : "#fffdf5";
      c.fillRect(-bw / 2 + i * sq, bh / 2 + j * sq, Math.min(sq, bw - i * sq), sq);
    }
  ink(6);
  c.strokeRect(-bw / 2, -bh / 2, bw, bh + sq * 2);
  c.fillStyle = "#000";
  c.textAlign = "center";
  c.textBaseline = "middle";
  fitFont(c, title, 800, DISPLAY, Math.round(h * 0.085), w * 0.7);
  c.fillStyle = "#fffdf5";
  c.fillText(title, 2.5 * k, 2.5 * k);
  c.fillStyle = "#000";
  c.fillText(title, 0, 0);
  c.rotate(0.12);
  c.translate(bw * 0.3, -bh * 0.72);
  c.fillStyle = "#ffdd00";
  c.fillRect(-w * 0.15, -h * 0.022, w * 0.3, h * 0.044);
  ink(4);
  c.strokeRect(-w * 0.15, -h * 0.022, w * 0.3, h * 0.044);
  c.fillStyle = "#000";
  c.font = `800 ${Math.round(h * 0.026)}px ${BODY}`;
  c.fillText("GRAND PRIX", 0, h * 0.002);
  c.restore();

  // platform band on top: a sheen, the console's logo in a pill and a few moulded grooves
  c.fillStyle = platform;
  c.fillRect(0, 0, w, band);
  const sheen = c.createLinearGradient(0, 0, 0, band);
  sheen.addColorStop(0, "rgba(255,255,255,.3)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0)");
  sheen.addColorStop(1, "rgba(0,0,0,.18)");
  c.fillStyle = sheen;
  c.fillRect(0, 0, w, band);
  c.fillStyle = "#000";
  c.fillRect(0, band - 3 * k, w, 6 * k);
  c.fillStyle = "#fff";
  c.beginPath();
  c.roundRect(w * 0.06, band * 0.25, w * 0.3, band * 0.5, band * 0.25);
  c.fill();
  c.fillStyle = platform;
  c.font = `800 ${Math.round(band * 0.32)}px ${DISPLAY}`;
  c.fillText("PLAY", w * 0.21, band * 0.52);
  c.fillStyle = "rgba(0,0,0,.25)";
  [0.72, 0.78, 0.84, 0.9].forEach((x) => c.fillRect(w * x, band * 0.28, w * 0.025, band * 0.44));
  // rating and player count at the foot
  const box = w * 0.14;
  c.fillStyle = "#fff";
  c.fillRect(w * 0.06, h - w * 0.2, box, box);
  ink(4);
  c.strokeRect(w * 0.06, h - w * 0.2, box, box);
  c.fillStyle = "#000";
  c.fillRect(w * 0.06, h - w * 0.2 + box * 0.72, box, box * 0.28);
  c.font = `800 ${Math.round(w * 0.07)}px ${BODY}`;
  c.fillText("E", w * 0.13, h - w * 0.2 + box * 0.38);
  c.fillStyle = "#fff";
  c.font = `800 ${Math.round(box * 0.17)}px ${BODY}`;
  c.fillText("ALL", w * 0.13, h - w * 0.2 + box * 0.87);
  c.fillStyle = "#fffdf5";
  c.beginPath();
  c.roundRect(w * 0.66, h - w * 0.16, w * 0.28, w * 0.1, w * 0.05);
  c.fill();
  c.stroke();
  c.fillStyle = "#000";
  c.font = `800 ${Math.round(w * 0.045)}px ${BODY}`;
  c.fillText("1–4 P", w * 0.8, h - w * 0.11);

  // the print and the sleeve: fine grain, faint scanlines over the art, scuffs and a gloss
  for (let i = 0; i < (w * h) / 300; i++) {
    c.fillStyle = rand() < 0.5 ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.07)";
    c.fillRect(rand() * w, rand() * h, 1 + rand() * 1.5, 1);
  }
  c.fillStyle = "rgba(0,0,0,.045)";
  for (let y = band; y < h; y += px) c.fillRect(0, y, w, px * 0.35);
  c.strokeStyle = "rgba(255,255,255,.5)";
  c.lineWidth = 1.2 * k;
  for (let i = 0; i < 14; i++) {
    const corner = i % 4;
    const x = (corner % 2 ? w - rand() * w * 0.18 : rand() * w * 0.18);
    const y = (corner < 2 ? band + rand() * h * 0.12 : h - rand() * h * 0.12);
    const a = rand() * Math.PI;
    const len = (4 + rand() * 10) * k;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    c.stroke();
  }
  const gloss = c.createLinearGradient(0, 0, w, h);
  gloss.addColorStop(0, "rgba(255,255,255,0)");
  gloss.addColorStop(0.28, "rgba(255,255,255,0)");
  gloss.addColorStop(0.33, "rgba(255,255,255,.22)");
  gloss.addColorStop(0.38, "rgba(255,255,255,.04)");
  gloss.addColorStop(0.46, "rgba(255,255,255,.12)");
  gloss.addColorStop(0.5, "rgba(255,255,255,0)");
  c.fillStyle = gloss;
  c.fillRect(0, 0, w, h);
  ink(8);
  c.strokeRect(0, 0, w, h);
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
}

