import { brutalBox } from "./base";

// ---------- sword info card ----------
// Shown beside the rack while a sword is hovered in its close-up: the sword's name in a band of
// its colour, its grade as a chip, and a few lines about it. Neo-brutal like the 2D site.
export function drawSwordCard(c, w, h, { name, jp, grade, text, color, ink = "#1a1714" }) {
  c.clearRect(0, 0, w, h);
  // Laid out in fixed steps (u: a 760-wide card's pixel) so the card ends just below its
  // text: whatever's left of the canvas below it stays transparent
  const u = w / 760;
  const pad = 38 * u;
  const cardW = w - 26 * u;
  const bandH = 100 * u;
  const chipH = 46 * u;
  const chipY = 9 + bandH + 6 + 26 * u;
  const lineH = 40 * u;
  // wrap the description first, to know how tall the card must be
  c.font = `500 ${Math.round(28 * u)}px 'Space Grotesk', sans-serif`;
  const maxW = cardW - pad * 2;
  const lines = [];
  text.split(" ").forEach((word) => {
    const last = lines[lines.length - 1];
    if (last !== undefined && c.measureText(`${last} ${word}`).width <= maxW) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  });
  const textTop = chipY + chipH + 36 * u;
  const cardH = Math.min(h - 26 * u, textTop + lines.length * lineH + 18 * u);
  brutalBox(c, 6, 6, cardW - 6, cardH, "#fffdf5", { shadow: 14 * u, line: 7 * u });
  // header band: the kanji at the right, the name shrinking to fit beside it
  c.fillStyle = color;
  c.fillRect(9, 9, cardW - 12, bandH);
  c.fillStyle = "#1a1714";
  c.fillRect(9, 9 + bandH, cardW - 12, 6);
  c.fillStyle = ink;
  c.textBaseline = "middle";
  c.font = `800 ${Math.round(38 * u)}px sans-serif`;
  const jpW = c.measureText(jp).width;
  c.textAlign = "right";
  c.fillText(jp, cardW - pad, 9 + bandH / 2 + 2);
  c.textAlign = "left";
  const room = cardW - pad * 3 - jpW;
  let size = Math.round(48 * u);
  c.font = `900 ${size}px 'Lexend Mega', sans-serif`;
  while (c.measureText(name.toUpperCase()).width > room && size > 18) {
    size -= 2;
    c.font = `900 ${size}px 'Lexend Mega', sans-serif`;
  }
  c.fillText(name.toUpperCase(), pad, 9 + bandH / 2 + 2);
  // grade chip
  c.font = `800 ${Math.round(25 * u)}px 'Space Grotesk', sans-serif`;
  const label = `GRADE: ${grade}`;
  const chipW = c.measureText(label).width + pad;
  c.fillStyle = "#1a1714";
  c.fillRect(pad + 4, chipY + 4, chipW, chipH);
  c.fillStyle = "#ffdd00";
  c.fillRect(pad, chipY, chipW, chipH);
  c.lineWidth = 4;
  c.strokeStyle = "#1a1714";
  c.strokeRect(pad, chipY, chipW, chipH);
  c.fillStyle = "#1a1714";
  c.fillText(label, pad + pad / 2, chipY + chipH / 2 + 1);
  // the description
  c.font = `500 ${Math.round(28 * u)}px 'Space Grotesk', sans-serif`;
  lines.forEach((line, i) => c.fillText(line, pad, textTop + lineH / 2 + i * lineH));
}

// ---------- sakura ----------
// One cherry-blossom petal, pointing up: a rounded teardrop with the little notch at its tip,
// pink deepening to its base, a pale crease down the middle and a thin ink edge
function sakuraPetalPath(c, cx, cy, len, wid) {
  c.beginPath();
  c.moveTo(cx, cy);
  c.bezierCurveTo(cx - wid * 0.9, cy - len * 0.25, cx - wid, cy - len * 0.8, cx - wid * 0.3, cy - len);
  c.lineTo(cx, cy - len * 0.86);
  c.lineTo(cx + wid * 0.3, cy - len);
  c.bezierCurveTo(cx + wid, cy - len * 0.8, cx + wid * 0.9, cy - len * 0.25, cx, cy);
  c.closePath();
}
function paintPetal(c, cx, cy, len, wid, line) {
  sakuraPetalPath(c, cx, cy, len, wid);
  const g = c.createLinearGradient(cx, cy, cx, cy - len);
  g.addColorStop(0, "#ff7fae");
  g.addColorStop(0.55, "#ffb7d5");
  g.addColorStop(1, "#ffe4ef");
  c.fillStyle = g;
  c.fill();
  c.lineWidth = line;
  c.strokeStyle = "#1a1714";
  c.stroke();
  c.strokeStyle = "rgba(255,255,255,.75)";
  c.lineWidth = line * 0.6;
  c.beginPath();
  c.moveTo(cx, cy - len * 0.15);
  c.quadraticCurveTo(cx + wid * 0.12, cy - len * 0.5, cx, cy - len * 0.78);
  c.stroke();
}
// A spark thrown off Sandai Kitetsu: a streak pointing along +x, a round hot head and a tail
// thinning behind it, black-edged so it shows on the white wall
export function drawSparkStreak(c, w, h, { color = "#e11d48", core = "#ffdd00" } = {}) {
  c.clearRect(0, 0, w, h);
  const streak = (k) => {
    const r = h * 0.36 * k;
    const head = w - h * 0.5;
    c.beginPath();
    c.moveTo(w * (1 - k) + h * 0.1, h / 2);
    c.quadraticCurveTo(head - r * 2, h / 2 - r, head, h / 2 - r);
    c.arc(head, h / 2, r, -Math.PI / 2, Math.PI / 2);
    c.quadraticCurveTo(head - r * 2, h / 2 + r, w * (1 - k) + h * 0.1, h / 2);
    c.closePath();
  };
  streak(0.95);
  c.fillStyle = color;
  c.fill();
  c.lineWidth = h * 0.12;
  c.strokeStyle = "#1a1714";
  c.stroke();
  streak(0.5);
  c.fillStyle = core;
  c.fill();
}
// Black lightning (Haki crackling off Enma), drawn to read from across the room: a wide
// violet glow, a thick ink bolt jagging down the canvas with two forks, and a hot white-violet
// crack running down its heart
export function drawBlackBolt(c, w, h) {
  c.clearRect(0, 0, w, h);
  const pts = [[0.55, 0], [0.4, 0.16], [0.6, 0.27], [0.36, 0.45], [0.58, 0.56], [0.4, 0.74], [0.5, 0.84], [0.32, 1]];
  const forks = [
    [[0.36, 0.45], [0.24, 0.55], [0.28, 0.64], [0.19, 0.76]],
    [[0.58, 0.56], [0.72, 0.66], [0.67, 0.74], [0.8, 0.86]],
  ];
  const stroke = (list, lw, color) => {
    c.lineWidth = lw;
    c.strokeStyle = color;
    c.beginPath();
    list.forEach(([x, y], i) => (i ? c.lineTo(x * w, y * h) : c.moveTo(x * w, y * h)));
    c.stroke();
  };
  c.lineCap = "round";
  c.lineJoin = "miter";
  c.save();
  c.shadowColor = "#a855f7";
  c.shadowBlur = w * 0.18;
  stroke(pts, w * 0.2, "rgba(168,85,247,.9)");
  forks.forEach((fork) => stroke(fork, w * 0.12, "rgba(168,85,247,.9)"));
  c.restore();
  stroke(pts, w * 0.13, "#1a1714");
  forks.forEach((fork) => stroke(fork, w * 0.08, "#1a1714"));
  stroke(pts, w * 0.035, "#f5e8ff");
  forks.forEach((fork) => stroke(fork, w * 0.02, "#f5e8ff"));
}
export function drawSakuraPetal(c, w, h) {
  c.clearRect(0, 0, w, h);
  paintPetal(c, w / 2, h * 0.92, h * 0.84, w * 0.36, w * 0.05);
}
// A whole blossom: five petals round a yellow-tipped heart of stamens
export function drawSakuraBlossom(c, w, h) {
  c.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  for (let i = 0; i < 5; i++) {
    c.save();
    c.translate(cx, cy);
    c.rotate((i / 5) * Math.PI * 2);
    paintPetal(c, 0, 0, h * 0.46, w * 0.2, w * 0.03);
    c.restore();
  }
  c.strokeStyle = "#d94f86";
  c.lineWidth = w * 0.015;
  c.fillStyle = "#ffd34d";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const x = cx + Math.cos(a) * w * 0.1;
    const y = cy + Math.sin(a) * h * 0.1;
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(x, y);
    c.stroke();
    c.beginPath();
    c.arc(x, y, w * 0.022, 0, Math.PI * 2);
    c.fill();
  }
  c.beginPath();
  c.arc(cx, cy, w * 0.045, 0, Math.PI * 2);
  c.fillStyle = "#ff5c93";
  c.fill();
}

