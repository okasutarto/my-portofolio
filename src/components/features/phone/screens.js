// Neo-brutalist phone-screen illustrations, drawn on a 600x1280 canvas.
export const SCREEN_W = 600;
export const SCREEN_H = 1280;

const C = {
  yellow: "#ffdd00", teal: "#00e0c6", magenta: "#d946ef", blue: "#3b82f6",
  pink: "#ff6b6b", paper: "#f4f1ea", white: "#ffffff", black: "#000000", gray: "#d9d9d9",
};
const DISPLAY = "'Lexend Mega', sans-serif";
const BODY = "'Space Grotesk', sans-serif";

// ---------- primitives ----------
function box(c, x, y, w, h, fill, { shadow = 6, line = 4, r = 0 } = {}) {
  if (shadow) { c.fillStyle = C.black; rr(c, x + shadow, y + shadow, w, h, r); c.fill(); }
  c.fillStyle = fill; rr(c, x, y, w, h, r); c.fill();
  if (line) { c.lineWidth = line; c.strokeStyle = C.black; rr(c, x, y, w, h, r); c.stroke(); }
}
function rr(c, x, y, w, h, r) {
  c.beginPath();
  if (!r) { c.rect(x, y, w, h); return; }
  c.roundRect(x, y, w, h, r);
}
function text(c, s, x, y, { size = 28, font = BODY, weight = 700, color = C.black, align = "left", base = "alphabetic" } = {}) {
  c.font = `${weight} ${size}px ${font}`;
  c.fillStyle = color; c.textAlign = align; c.textBaseline = base;
  c.fillText(s, x, y);
}
function bars(c, x, y, widths, { h = 14, gap = 14, color = C.gray } = {}) {
  widths.forEach((w, i) => { c.fillStyle = color; c.fillRect(x, y + i * (h + gap), w, h); });
}
function grid(c, color = "rgba(0,0,0,.08)", step = 40) {
  c.fillStyle = color;
  for (let x = 0; x < SCREEN_W; x += step) c.fillRect(x, 0, 2, SCREEN_H);
  for (let y = 0; y < SCREEN_H; y += step) c.fillRect(0, y, SCREEN_W, 2);
}
function halftone(c, x, y, w, h, color = "rgba(0,0,0,.25)", step = 14) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = color;
  for (let i = x; i < x + w; i += step)
    for (let j = y; j < y + h; j += step) { c.beginPath(); c.arc(i, j, 2.4, 0, Math.PI * 2); c.fill(); }
  c.restore();
}
function statusBar(c, dark = false) {
  const col = dark ? C.white : C.black;
  text(c, "9:41", 46, 62, { size: 26, color: col });
  // dynamic island
  c.fillStyle = C.black; rr(c, 220, 30, 160, 46, 23); c.fill();
  // signal + battery
  c.fillStyle = col;
  [10, 16, 22, 28].forEach((h, i) => c.fillRect(440 + i * 10, 64 - h, 6, h));
  c.lineWidth = 3; c.strokeStyle = col; c.strokeRect(492, 42, 52, 24);
  c.fillRect(496, 46, 34, 16); c.fillRect(546, 49, 4, 10);
}
function appBar(c, title, fill, { y = 100, color = C.black } = {}) {
  box(c, 24, y, 552, 84, fill, { shadow: 6 });
  text(c, title, 52, y + 54, { size: 28, font: DISPLAY, weight: 800, color });
  // burger
  c.fillStyle = color;
  [0, 14, 28].forEach((o) => c.fillRect(506, y + 26 + o, 40, 6));
}
function button(c, label, x, y, w, fill, color = C.black) {
  box(c, x, y, w, 88, fill, { shadow: 7 });
  text(c, label, x + w / 2, y + 56, { size: 26, font: DISPLAY, weight: 800, color, align: "center" });
}
function chip(c, label, x, y, fill, color = C.black) {
  c.font = `700 20px ${BODY}`;
  const w = c.measureText(label).width + 28;
  box(c, x, y, w, 40, fill, { shadow: 3, line: 3 });
  text(c, label, x + 14, y + 27, { size: 20, color });
  return w;
}
function homeBar(c, dark = false) {
  c.fillStyle = dark ? C.white : C.black; rr(c, 200, SCREEN_H - 34, 200, 10, 5); c.fill();
}

// ---------- screens ----------
function hnda(c) {
  c.fillStyle = C.paper; c.fillRect(0, 0, SCREEN_W, SCREEN_H); grid(c);
  statusBar(c);
  appBar(c, "HNDA STUDIO", C.white);

  // Hero: brutalist architecture made of blocks
  box(c, 24, 216, 552, 430, C.yellow, { shadow: 8 });
  halftone(c, 28, 220, 544, 422);
  c.fillStyle = "#c9c3b6"; c.fillRect(60, 420, 200, 200); c.fillRect(240, 330, 150, 290); c.fillRect(380, 470, 160, 150);
  c.fillStyle = "#8f877a"; c.fillRect(240, 330, 150, 26); c.fillRect(60, 420, 200, 22);
  c.fillStyle = C.black;
  [[90, 470], [170, 470], [90, 540], [170, 540]].forEach(([x, y]) => c.fillRect(x, y, 56, 50));
  [[270, 390], [270, 470], [270, 550]].forEach(([x, y]) => c.fillRect(x, y, 90, 40));
  c.fillStyle = C.yellow; c.fillRect(410, 520, 100, 100); c.lineWidth = 4; c.strokeRect(410, 520, 100, 100);
  c.fillStyle = C.black; c.fillRect(24, 618, 552, 6);
  text(c, "HONEST", 56, 290, { size: 44, font: DISPLAY, weight: 800 });
  text(c, "SPACES.", 56, 342, { size: 44, font: DISPLAY, weight: 800 });

  text(c, "SELECTED WORKS", 30, 712, { size: 24, font: DISPLAY, weight: 800 });
  [["The Haze", "Residential", C.teal], ["Kopi Atap", "Interior", C.magenta]].forEach(([t, s, col], i) => {
    const y = 740 + i * 150;
    box(c, 24, y, 552, 126, C.white, { shadow: 6 });
    box(c, 40, y + 16, 120, 94, col, { shadow: 0, line: 3 });
    halftone(c, 42, y + 18, 116, 90, "rgba(0,0,0,.3)", 12);
    text(c, t, 184, y + 56, { size: 30, font: DISPLAY, weight: 800 });
    text(c, s.toUpperCase(), 184, y + 92, { size: 20, color: "#555" });
    text(c, "→", 540, y + 76, { size: 40, align: "right" });
  });
  button(c, "START A PROJECT", 24, 1060, 380, C.black, C.yellow);
  box(c, 428, 1060, 148, 88, "#25d366", { shadow: 7 });
  text(c, "WA", 502, 1116, { size: 30, font: DISPLAY, weight: 800, align: "center" });
  homeBar(c);
}

function gelitik(c) {
  c.fillStyle = "#eef3ff"; c.fillRect(0, 0, SCREEN_W, SCREEN_H); grid(c);
  statusBar(c);
  appBar(c, "GELITIK", C.blue, { color: C.white });

  // channel chips
  let x = 24;
  [["IG", C.magenta, C.white], ["TT", C.black, C.white], ["YT", C.pink, C.white], ["X", C.white, C.black]].forEach(([l, f, t]) => {
    x += chip(c, l, x, 212, f, t) + 12;
  });

  // KPI tiles
  [["FOLLOWERS", "12.4K", "+18%", C.yellow], ["REACH", "87K", "+203%", C.teal]].forEach(([l, v, d, col], i) => {
    const bx = 24 + i * 286;
    box(c, bx, 282, 266, 200, col, { shadow: 7 });
    text(c, l, bx + 22, 326, { size: 18, weight: 700 });
    text(c, v, bx + 22, 410, { size: 54, font: DISPLAY, weight: 800 });
    box(c, bx + 22, 432, 110, 34, C.white, { shadow: 0, line: 3 });
    text(c, d, bx + 34, 457, { size: 20, weight: 700, color: "#0a8a3a" });
  });

  // Bar chart
  box(c, 24, 516, 552, 330, C.white, { shadow: 7 });
  text(c, "VIEWS / WEEK", 48, 562, { size: 20, font: DISPLAY, weight: 800 });
  const vals = [90, 140, 110, 200, 170, 250, 220];
  vals.forEach((v, i) => {
    const bx = 56 + i * 72;
    box(c, bx, 810 - v, 48, v, i === 5 ? C.magenta : C.blue, { shadow: 0, line: 3 });
  });
  c.fillStyle = C.black; c.fillRect(44, 810, 512, 4);

  // Line chart
  box(c, 24, 880, 552, 250, C.black, { shadow: 7 });
  text(c, "ENGAGEMENT", 48, 926, { size: 20, font: DISPLAY, weight: 800, color: C.yellow });
  const pts = [[60, 1080], [140, 1040], [220, 1060], [300, 990], [380, 1010], [460, 950], [540, 960]];
  c.strokeStyle = C.teal; c.lineWidth = 8; c.lineJoin = "round";
  c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.stroke();
  pts.forEach(([px, py]) => { c.fillStyle = C.yellow; c.fillRect(px - 9, py - 9, 18, 18); c.lineWidth = 3; c.strokeStyle = C.black; c.strokeRect(px - 9, py - 9, 18, 18); });
  homeBar(c);
}

function summarizer(c) {
  c.fillStyle = "#f6f0ff"; c.fillRect(0, 0, SCREEN_W, SCREEN_H); grid(c);
  statusBar(c);
  appBar(c, "SUMMARIZER", C.white);

  // dropzone
  c.setLineDash([18, 12]); c.lineWidth = 5; c.strokeStyle = C.black;
  c.fillStyle = C.white; c.fillRect(24, 216, 552, 280); c.strokeRect(24, 216, 552, 280); c.setLineDash([]);
  box(c, 250, 262, 100, 120, C.yellow, { shadow: 6 });
  c.fillStyle = C.black; c.beginPath(); c.moveTo(318, 262); c.lineTo(350, 294); c.lineTo(318, 294); c.closePath(); c.fill();
  text(c, "PDF", 300, 352, { size: 26, font: DISPLAY, weight: 800, align: "center" });
  text(c, "Drop a PDF, image, or text", 300, 450, { size: 24, align: "center", weight: 500 });

  // file chip
  box(c, 24, 530, 552, 76, C.white, { shadow: 5 });
  box(c, 44, 548, 40, 40, C.pink, { shadow: 0, line: 3 });
  text(c, "annual-report.pdf", 104, 578, { size: 24 });
  text(c, "2.4 MB", 556, 578, { size: 20, align: "right", weight: 500, color: "#555" });

  button(c, "SUMMARIZE ✦", 24, 636, 552, C.magenta, C.white);

  // result card
  box(c, 24, 760, 552, 410, C.white, { shadow: 7 });
  c.fillStyle = C.yellow; c.fillRect(24, 760, 552, 64); c.lineWidth = 4; c.strokeStyle = C.black; c.strokeRect(24, 760, 552, 64);
  text(c, "✦ KEY INSIGHTS", 48, 802, { size: 22, font: DISPLAY, weight: 800 });
  [0, 1, 2, 3].forEach((i) => {
    const y = 858 + i * 76;
    c.fillStyle = [C.teal, C.magenta, C.blue, C.yellow][i]; c.fillRect(48, y, 22, 22);
    c.lineWidth = 3; c.strokeRect(48, y, 22, 22);
    bars(c, 92, y, [[440, 360], [400, 300], [450, 260], [380, 200]][i], { h: 12, gap: 14 });
  });
  homeBar(c);
}

function warungUpin(c) {
  c.fillStyle = "#e9fbf8"; c.fillRect(0, 0, SCREEN_W, SCREEN_H); grid(c);
  statusBar(c);
  appBar(c, "KASIR", C.teal);
  chip(c, "SHIFT PAGI · ADMIN", 24, 212, C.white);

  // product grid
  const items = [["Kopi Susu", "18K", C.yellow], ["Teh Tarik", "12K", C.magenta], ["Roti Bakar", "15K", C.blue], ["Mie Goreng", "20K", C.pink]];
  items.forEach(([n, p, col], i) => {
    const x = 24 + (i % 2) * 286, y = 282 + Math.floor(i / 2) * 250;
    box(c, x, y, 266, 226, C.white, { shadow: 6 });
    box(c, x + 16, y + 16, 234, 110, col, { shadow: 0, line: 3 });
    halftone(c, x + 18, y + 18, 230, 106, "rgba(0,0,0,.22)", 12);
    text(c, n, x + 18, y + 166, { size: 24 });
    text(c, `Rp ${p}`, x + 18, y + 204, { size: 24, font: DISPLAY, weight: 800 });
    box(c, x + 196, y + 166, 48, 48, C.black, { shadow: 0, line: 3 });
    text(c, "+", x + 220, y + 202, { size: 36, color: C.white, align: "center" });
  });

  // cart summary
  box(c, 24, 800, 552, 230, C.white, { shadow: 7 });
  [["2× Kopi Susu", "36.000"], ["1× Roti Bakar", "15.000"], ["Pajak 10%", "5.100"]].forEach(([l, v], i) => {
    text(c, l, 48, 852 + i * 46, { size: 24, weight: 500 });
    text(c, v, 552, 852 + i * 46, { size: 24, align: "right" });
  });
  c.setLineDash([10, 8]); c.strokeStyle = C.black; c.lineWidth = 3;
  c.beginPath(); c.moveTo(48, 970); c.lineTo(552, 970); c.stroke(); c.setLineDash([]);
  text(c, "TOTAL", 48, 1010, { size: 26, font: DISPLAY, weight: 800 });
  text(c, "Rp 56.100", 552, 1010, { size: 30, font: DISPLAY, weight: 800, align: "right" });
  button(c, "BAYAR →", 24, 1064, 552, C.black, C.teal);
  homeBar(c);
}

function punyagawe(c) {
  c.fillStyle = "#fff0f3"; c.fillRect(0, 0, SCREEN_W, SCREEN_H); grid(c);
  statusBar(c);
  appBar(c, "PUNYAGAWE", C.white);

  // invitation card
  box(c, 24, 216, 552, 470, C.pink, { shadow: 8 });
  halftone(c, 28, 220, 544, 462, "rgba(255,255,255,.35)");
  box(c, 76, 262, 448, 378, C.paper, { shadow: 6 });
  c.strokeStyle = C.black; c.lineWidth = 3; c.strokeRect(96, 282, 408, 338);
  text(c, "THE WEDDING OF", 300, 340, { size: 20, align: "center", weight: 700 });
  text(c, "A & D", 300, 440, { size: 72, font: DISPLAY, weight: 800, align: "center" });
  c.fillStyle = C.pink;
  [[250, 480], [300, 470], [350, 480]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 10, 0, Math.PI * 2); c.fill(); });
  text(c, "12 · 12 · 2026", 300, 560, { size: 26, align: "center", weight: 700 });

  text(c, "SOUVENIR", 30, 752, { size: 24, font: DISPLAY, weight: 800 });
  [["Tumbler", C.teal], ["Totebag", C.yellow], ["Lilin", C.magenta]].forEach(([n, col], i) => {
    const x = 24 + i * 188;
    box(c, x, 780, 168, 220, C.white, { shadow: 6 });
    box(c, x + 14, 794, 140, 120, col, { shadow: 0, line: 3 });
    text(c, n, x + 18, 954, { size: 22 });
    text(c, "★★★★★", x + 18, 984, { size: 16, color: "#e0a800" });
  });
  button(c, "PESAN SEKARANG", 24, 1052, 552, C.black, C.pink);
  homeBar(c);
}

// Fallback for projects without a custom illustration yet
function generic(c, project) {
  c.fillStyle = C.paper; c.fillRect(0, 0, SCREEN_W, SCREEN_H); grid(c);
  statusBar(c);
  appBar(c, project.title.toUpperCase().slice(0, 14), C.white);
  box(c, 24, 216, 552, 420, C.yellow, { shadow: 8 });
  halftone(c, 28, 220, 544, 412);
  text(c, project.type.toUpperCase(), 56, 300, { size: 26, font: DISPLAY, weight: 800 });
  [0, 1, 2].forEach((i) => {
    box(c, 24, 680 + i * 140, 552, 112, C.white, { shadow: 6 });
    box(c, 40, 696 + i * 140, 80, 80, [C.teal, C.magenta, C.blue][i], { shadow: 0, line: 3 });
    bars(c, 144, 712 + i * 140, [360, 240], { h: 14, gap: 16 });
  });
  button(c, "OPEN APP →", 24, 1110, 552, C.black, C.yellow);
  homeBar(c);
}

const SCREENS = { "hnda-studio": hnda, gelitik, summarizer, "warung-upin": warungUpin, punyagawe };

export function drawScreen(ctx, project) {
  (SCREENS[project.id] || generic)(ctx, project);
}
