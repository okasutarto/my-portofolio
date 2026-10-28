// ---------- book spines on the shelf ----------
const BOOK_TITLES = [
  ["CLEAN CODE", "R. MARTIN"], ["FLUTTER", "IN ACTION"], ["ALGORITHMS", "4TH ED."], ["VUE.JS", "UP & RUNNING"],
  ["NODE.JS", "DESIGN"], ["UX BASICS", "A PRIMER"], ["TYPESCRIPT", "DEEP DIVE"], ["NARUTO", "VOL. 01"],
  ["SKETCHBOOK", "2026"], ["COFFEE", "BREWING"], ["GIT POCKET", "GUIDE"], ["PIXEL ART", "STUDIO"],
];
// A hardback's spine (drawn upright, long side vertical), neo-brutalist: one flat colour, black
// bands top and bottom, the title on a white label with a thick black edge and a hard offset
// shadow, and a sticker near the foot that changes from book to book
export function drawBookSpine(c, w, h, { color, i = 0 }) {
  const [title, sub] = BOOK_TITLES[i % BOOK_TITLES.length];
  const ink = "#1a1714";
  const line = Math.max(3, w * 0.06);
  c.fillStyle = color;
  c.fillRect(0, 0, w, h);
  // chunky black bands, with a stripe of the cover colour left between on some
  const band = h * (0.045 + (i % 3) * 0.012);
  c.fillStyle = ink;
  c.fillRect(0, h * 0.04, w, band);
  c.fillRect(0, h * 0.96 - band, w, band);
  if (i % 2 === 0) {
    c.fillStyle = color;
    c.fillRect(0, h * 0.04 + band * 0.4, w, band * 0.2);
    c.fillRect(0, h * 0.96 - band * 0.6, w, band * 0.2);
  }
  // the label: white, black-edged, its shadow hard and offset, a touch crooked
  const labelTop = h * 0.04 + band + h * 0.05;
  const labelH = h * 0.62;
  const labelW = w * 0.74;
  c.save();
  c.translate(w / 2, labelTop + labelH / 2);
  c.rotate(((i % 3) - 1) * 0.015);
  c.fillStyle = ink;
  c.fillRect(-labelW / 2 + line, -labelH / 2 + line, labelW, labelH);
  c.fillStyle = "#fffdf5";
  c.fillRect(-labelW / 2, -labelH / 2, labelW, labelH);
  c.lineWidth = line * 0.7;
  c.strokeStyle = ink;
  c.strokeRect(-labelW / 2, -labelH / 2, labelW, labelH);
  // title up the label, the subtitle in a small black tab beside it
  c.rotate(-Math.PI / 2);
  let size = Math.round(labelW * 0.42);
  c.font = `900 ${size}px 'Lexend Mega', sans-serif`;
  while (c.measureText(title).width > labelH * 0.86 && size > 8) {
    size -= 1;
    c.font = `900 ${size}px 'Lexend Mega', sans-serif`;
  }
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = ink;
  c.fillText(title, 0, -labelW * 0.1);
  c.font = `800 ${Math.round(size * 0.5)}px 'Space Grotesk', sans-serif`;
  c.fillStyle = color;
  const subW = Math.min(labelH * 0.8, c.measureText(sub).width + size * 0.6);
  c.fillRect(-subW / 2, labelW * 0.12, subW, size * 0.62);
  c.strokeRect(-subW / 2, labelW * 0.12, subW, size * 0.62);
  c.fillStyle = ink;
  c.fillText(sub, 0, labelW * 0.12 + size * 0.33);
  c.restore();
  // the sticker: a star, a dot or a bolt, in a colour that isn't the cover's
  const STICKERS = ["#ffdd00", "#ff6b6b", "#00e0c6", "#ff90e8", "#fffdf5"];
  const sticker = STICKERS[(i + 2) % STICKERS.length] === color ? "#fffdf5" : STICKERS[(i + 2) % STICKERS.length];
  const sy = h * 0.96 - band - h * 0.085;
  const sr = w * 0.2;
  const shape = (dx) => {
    c.beginPath();
    if (i % 3 === 0) {
      for (let k = 0; k < 10; k++) {
        const r = k % 2 ? sr * 0.45 : sr;
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        c.lineTo(w / 2 + dx + Math.cos(a) * r, sy + dx + Math.sin(a) * r);
      }
    } else if (i % 3 === 1) {
      c.arc(w / 2 + dx, sy + dx, sr * 0.8, 0, Math.PI * 2);
    } else {
      c.moveTo(w / 2 + dx + sr * 0.2, sy + dx - sr);
      c.lineTo(w / 2 + dx - sr * 0.6, sy + dx + sr * 0.15);
      c.lineTo(w / 2 + dx, sy + dx + sr * 0.15);
      c.lineTo(w / 2 + dx - sr * 0.25, sy + dx + sr);
      c.lineTo(w / 2 + dx + sr * 0.6, sy + dx - sr * 0.2);
      c.lineTo(w / 2 + dx + sr * 0.05, sy + dx - sr * 0.2);
    }
    c.closePath();
  };
  shape(line * 0.6);
  c.fillStyle = ink;
  c.fill();
  shape(0);
  c.fillStyle = sticker;
  c.fill();
  c.lineWidth = line * 0.5;
  c.stroke();
  // a heavy ink edge where it meets the covers
  c.strokeStyle = ink;
  c.lineWidth = line;
  c.strokeRect(0, 0, w, h);
}

// The page block's edge: fine lines of paper
export function drawPageEdges(c, w, h) {
  c.fillStyle = "#f4ead2";
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(150,120,80,.35)";
  c.lineWidth = 1;
  for (let y = 1; y < h; y += 3) {
    c.beginPath();
    c.moveTo(0, y + 0.5);
    c.lineTo(w, y + 0.5);
    c.stroke();
  }
}

// ---------- Naruto manga collection ----------
function drawLeafMark(c, x, y, size) {
  c.save();
  c.translate(x, y);
  c.scale(size, size);
  c.strokeStyle = "#182434";
  c.lineWidth = 0.09;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const angle = t * Math.PI * 3.7;
    const r = 0.03 + t * 0.32;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.lineTo(-0.48, 0.36);
  c.lineTo(-0.4, -0.06);
  c.stroke();
  c.restore();
}

// Original flat-colour fan illustration, drawn with the same ink as the room's other props.
function drawNarutoPortrait(c, x, y, size) {
  c.save();
  c.translate(x, y);
  c.scale(size, size);
  const ink = "#182434";
  c.lineWidth = 0.035;
  c.strokeStyle = ink;
  c.lineJoin = "round";
  // Orange jacket, dark shoulders and a high zip collar.
  c.fillStyle = "#f68026";
  c.beginPath(); c.moveTo(-0.58, 0.65); c.quadraticCurveTo(-0.55, 0.23, 0, 0.23); c.quadraticCurveTo(0.55, 0.23, 0.58, 0.65); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = ink; c.fillRect(-0.47, 0.31, 0.94, 0.16);
  c.fillStyle = "#f68026"; c.fillRect(-0.26, 0.25, 0.52, 0.24); c.strokeRect(-0.26, 0.25, 0.52, 0.24);
  c.strokeStyle = "#fff4d6"; c.lineWidth = 0.018;
  c.beginPath(); c.moveTo(0, 0.36); c.lineTo(0, 0.65); c.stroke();
  // Spiky blond silhouette and the face.
  c.strokeStyle = ink; c.lineWidth = 0.035; c.fillStyle = "#ffd438";
  c.beginPath();
  [[-0.37, 0.02], [-0.51, -0.24], [-0.35, -0.2], [-0.4, -0.47], [-0.21, -0.36], [-0.13, -0.63], [0.01, -0.43], [0.17, -0.65], [0.22, -0.4], [0.43, -0.5], [0.36, -0.22], [0.53, -0.23], [0.36, 0.07]].forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py));
  c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#ffd0a1";
  c.beginPath(); c.moveTo(-0.33, -0.21); c.lineTo(0.33, -0.21); c.lineTo(0.3, 0.14); c.quadraticCurveTo(0, 0.48, -0.3, 0.14); c.closePath(); c.fill(); c.stroke();
  // Forehead protector with a silver plate, rivets and the Leaf mark.
  c.fillStyle = ink; c.fillRect(-0.39, -0.28, 0.78, 0.19);
  c.fillStyle = "#bdc8d3"; c.fillRect(-0.29, -0.27, 0.58, 0.17); c.strokeRect(-0.29, -0.27, 0.58, 0.17);
  drawLeafMark(c, 0, -0.185, 0.17);
  c.fillStyle = ink;
  [-0.25, 0.25].forEach((px) => { c.beginPath(); c.arc(px, -0.18, 0.012, 0, Math.PI * 2); c.fill(); });
  // Blue eyes, brows and three whisker marks on each cheek.
  [-1, 1].forEach((side) => {
    c.fillStyle = "#fffdf5"; c.beginPath(); c.ellipse(side * 0.15, 0.015, 0.075, 0.035, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#268fd0"; c.beginPath(); c.arc(side * 0.15, 0.015, 0.027, 0, Math.PI * 2); c.fill();
    c.strokeStyle = ink; c.lineWidth = 0.018;
    c.beginPath(); c.moveTo(side * 0.07, -0.045); c.lineTo(side * 0.24, -0.065); c.stroke();
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(side * 0.2, 0.09 + i * 0.047); c.lineTo(side * 0.3, 0.065 + i * 0.06); c.stroke(); }
  });
  c.beginPath(); c.moveTo(-0.085, 0.23); c.quadraticCurveTo(0, 0.29, 0.085, 0.23); c.stroke();
  c.restore();
}

export function drawNarutoCover(c, w, h, { vol = 1, color = "#f68026" } = {}) {
  const ink = "#182434";
  c.fillStyle = "#fff4d6"; c.fillRect(0, 0, w, h);
  c.fillStyle = color; c.fillRect(w * 0.04, h * 0.18, w * 0.92, h * 0.69);
  // Graphic sun and speed rays behind the character; clear type bands above and below.
  c.save(); c.beginPath(); c.rect(w * 0.04, h * 0.18, w * 0.92, h * 0.69); c.clip();
  c.fillStyle = "#ffdb77";
  c.beginPath(); c.arc(w * 0.52, h * 0.48, w * 0.46, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "rgba(255,244,214,.6)"; c.lineWidth = w * 0.016;
  for (let i = 0; i < 18; i++) { const angle = i * Math.PI * 2 / 18; c.beginPath(); c.moveTo(w * 0.5 + Math.cos(angle) * w * 0.3, h * 0.5 + Math.sin(angle) * w * 0.3); c.lineTo(w * 0.5 + Math.cos(angle) * w, h * 0.5 + Math.sin(angle) * w); c.stroke(); }
  drawNarutoPortrait(c, w * 0.5, h * 0.53, w * 0.77);
  c.restore();
  c.textAlign = "center"; c.textBaseline = "middle";
  c.font = `italic 900 ${Math.round(w * 0.18)}px 'Space Grotesk', sans-serif`;
  c.strokeStyle = ink; c.lineWidth = w * 0.013; c.strokeText("NARUTO", w / 2, h * 0.09, w * 0.88);
  c.fillStyle = "#ff8c2b"; c.fillText("NARUTO", w / 2, h * 0.09, w * 0.88);
  c.fillStyle = ink; c.fillRect(w * 0.04, h * 0.87, w * 0.92, h * 0.09);
  c.fillStyle = "#fff4d6"; c.font = `800 ${Math.round(w * 0.045)}px 'Space Grotesk', sans-serif`;
  c.fillText("MASASHI KISHIMOTO", w * 0.5, h * 0.915, w * 0.7);
  c.fillStyle = ink; c.fillRect(w * 0.74, h * 0.19, w * 0.2, w * 0.2);
  c.fillStyle = "#fff4d6"; c.font = `900 ${Math.round(w * 0.11)}px 'Lexend Mega', sans-serif`; c.fillText(String(vol).padStart(2, "0"), w * 0.84, h * 0.19 + w * 0.1);
  c.strokeStyle = ink; c.lineWidth = w * 0.012; c.strokeRect(w * 0.02, h * 0.015, w * 0.96, h * 0.97);
  c.textAlign = "left";
}

// Consistent cream, orange and navy spines with a volume badge and a headband cameo.
export function drawMangaSpine(c, w, h, { vol, color, title = "NARUTO" }) {
  const ink = "#182434";
  c.fillStyle = "#fff4d6"; c.fillRect(0, 0, w, h);
  const block = w * 1.05;
  c.fillStyle = color; c.fillRect(0, 0, w, block);
  c.fillStyle = ink; c.fillRect(0, block, w, Math.max(2, w * 0.045));
  c.textAlign = "center"; c.textBaseline = "middle";
  c.font = `900 ${Math.round(w * 0.48)}px 'Lexend Mega', sans-serif`;
  c.fillText(String(vol).padStart(2, "0"), w / 2, block / 2);
  c.save(); c.translate(w / 2, h * 0.45); c.rotate(Math.PI / 2);
  let size = w * 0.58;
  do { c.font = `italic 900 ${Math.round(size)}px 'Space Grotesk', sans-serif`; size--; } while (c.measureText(title).width > h * 0.43 && size > 8);
  c.fillStyle = ink; c.fillText(title, 0, 0); c.restore();
  drawNarutoPortrait(c, w / 2, h * 0.8, w * 0.77);
  c.fillStyle = ink; c.fillRect(0, h * 0.93, w, h * 0.07);
  c.fillStyle = "#fff4d6"; c.font = `800 ${Math.round(w * 0.17)}px 'Space Grotesk', sans-serif`; c.fillText("JUMP", w / 2, h * 0.965);
  c.strokeStyle = ink; c.lineWidth = Math.max(2, w * 0.04); c.strokeRect(0, 0, w, h);
  c.textAlign = "left";
}

// ---------- the handheld's screen: a little space-invaders loop ----------
// In the old four-greens palette, on a 64 × 52 grid of chunky pixels: a formation of invaders
// marching side to side and stepping down, the player's ship gliding under them firing, one
// invader popping per shot, and a STAGE CLEAR before it all starts again. Pure function of
// time, so it can be redrawn at any moment.
const GB = ["#9bbc0f", "#8bac0f", "#306230", "#0f380f"];
const INVADER = [
  ["..XXXX..", ".XXXXXX.", "XX.XX.XX", "XXXXXXXX", ".X.XX.X.", "X......X"],
  ["..XXXX..", ".XXXXXX.", "XX.XX.XX", "XXXXXXXX", "..X..X..", ".X.XX.X."],
];
const SHIP = ["...X...", "..XXX..", "XXXXXXX", "XXXXXXX"];
const BURST = ["X.X.X", ".X.X.", "XX.XX", ".X.X.", "X.X.X"];
const INVADER_ORDER = [5, 0, 10, 3, 7, 1, 11, 6, 2, 9, 4, 8];
export function drawInvaders(c, w, h, t = 0) {
  const p = w / 64;
  const sprite = (rows, x, y, color) => {
    c.fillStyle = color;
    rows.forEach((row, ry) => [...row].forEach((ch, rx) => ch === "X" && c.fillRect((x + rx) * p, (y + ry) * p, p + 0.5, p + 0.5)));
  };
  c.fillStyle = GB[0];
  c.fillRect(0, 0, w, h);
  const LOOP = 15;
  const T = ((t % LOOP) + LOOP) % LOOP;
  const SHOT_EVERY = 1.1;
  const FLIGHT = 0.5;
  // formation: steps every 0.45s, bouncing over 10 pixels, dropping 2 at each turn
  const steps = Math.floor(T / 0.45);
  const RANGE = 10;
  const leg = Math.floor(steps / RANGE);
  const offset = leg % 2 ? RANGE - (steps % RANGE) : steps % RANGE;
  const drop = Math.min(leg * 2, 10);
  const pos = (i) => ({ x: 6 + (i % 4) * 11 + offset, y: 9 + Math.floor(i / 4) * 8 + drop });
  const shots = Math.min(INVADER_ORDER.length, Math.floor(T / SHOT_EVERY));
  const hitAt = new Map();
  INVADER_ORDER.slice(0, shots + 1).forEach((target, j) => hitAt.set(target, j * SHOT_EVERY + FLIGHT));
  const frame = steps % 2;
  for (let i = 0; i < 12; i++) {
    const at = hitAt.get(i);
    const { x, y } = pos(i);
    if (at === undefined || T < at) sprite(INVADER[frame], x, y, GB[3 - (Math.floor(i / 4) % 2)]);
    else if (T < at + 0.3) sprite(BURST, x + 1, y, GB[2]);
  }
  // the ship slides under its next target and fires
  const next = Math.min(INVADER_ORDER.length - 1, Math.floor(T / SHOT_EVERY));
  const aim = pos(INVADER_ORDER[next]).x + 0.5;
  const prev = next ? pos(INVADER_ORDER[next - 1]).x + 0.5 : 28;
  const k = Math.min(1, (T - next * SHOT_EVERY + SHOT_EVERY) / SHOT_EVERY);
  const shipX = T < INVADER_ORDER.length * SHOT_EVERY ? prev + (aim - prev) * Math.min(1, k * 1.6) : 28;
  sprite(SHIP, shipX, 45, GB[3]);
  // the bullet in flight
  const j = Math.floor(T / SHOT_EVERY);
  const since = T - j * SHOT_EVERY;
  if (j < INVADER_ORDER.length && since < FLIGHT) {
    const target = pos(INVADER_ORDER[j]);
    const by = 44 - (since / FLIGHT) * (44 - target.y - 5);
    c.fillStyle = GB[3];
    c.fillRect((target.x + 3.5) * p, by * p, p, p * 2.5);
  }
  // ground line, score and stage clear
  c.fillStyle = GB[2];
  c.fillRect(0, 50 * p, w, p);
  const kills = [...hitAt.values()].filter((at) => T >= at).length;
  c.fillStyle = GB[3];
  c.font = `bold ${Math.round(p * 5)}px monospace`;
  c.textBaseline = "top";
  c.fillText(`SCORE ${String(kills * 10).padStart(4, "0")}`, p * 2, p * 1);
  if (kills >= INVADER_ORDER.length) {
    c.textAlign = "center";
    c.fillText("STAGE CLEAR!", w / 2, p * 22);
    c.textAlign = "left";
  }
}

