// Canvas textures for the desk props. A draw function may return hotspots, rectangles in
// canvas pixels ({ x, y, w, h, href | action }), which the scene makes clickable.
//
// Props: ID badge, boarding passes, case files, phone chat,
// postcard, pinned About notes and the terminal screen.
// Everything is drawn flat with thick black strokes and hard offset shadows, like the 2D site.
import * as THREE from "three";
import { ABOUT_STACK } from "@/data/about";
import { FOLDER_COLORS, FILE_PAGES } from "@/data/projectFiles";

export const TYPE_COLORS = {
  Frontend: "#ffdd00",
  Fullstack: "#3b82f6",
  Backend: "#00e0c6",
};
export const colorFor = (project) => TYPE_COLORS[project.type] || TYPE_COLORS.Fullstack;

export function canvasTexture(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, ctx: canvas.getContext("2d"), texture };
}

// Box with a hard offset shadow and a thick outline
function brutalBox(c, x, y, w, h, fill, { shadow = 10, line = 6 } = {}) {
  c.fillStyle = "#000";
  c.fillRect(x + shadow, y + shadow, w, h);
  c.fillStyle = fill;
  c.fillRect(x, y, w, h);
  c.lineWidth = line;
  c.strokeStyle = "#000";
  c.strokeRect(x, y, w, h);
}

// ---------- the real photo, as a neo-brutalist sticker ----------
// The cut-out portrait gets a thick black outline and a hard offset shadow that follow its
// silhouette, over a flat colour with halftone dots. Until it has loaded, frames show initials.
let portrait = null;
let portraitLoading = null;
const stickerCache = new Map();
export function loadPortrait(src) {
  if (!portraitLoading) {
    portraitLoading = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        portrait = img;
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }
  return portraitLoading;
}

// Silhouette of a canvas in one flat colour
function silhouette(source, color) {
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const c = out.getContext("2d");
  c.drawImage(source, 0, 0);
  c.globalCompositeOperation = "source-in";
  c.fillStyle = color;
  c.fillRect(0, 0, out.width, out.height);
  return out;
}

function portraitSticker(w, h) {
  const key = `${w}x${h}`;
  if (stickerCache.has(key)) return stickerCache.get(key);
  // The whole photo, never cropped: fit inside the frame (leaving room for the outline),
  // standing on the frame's bottom edge
  const line = Math.max(3, Math.round(w / 45));
  const pad = line * 2;
  const base = document.createElement("canvas");
  base.width = w;
  base.height = h;
  const bc = base.getContext("2d");
  const scale = Math.min((w - pad * 2) / portrait.width, (h - pad) / portrait.height);
  const dw = portrait.width * scale;
  const dh = portrait.height * scale;
  bc.drawImage(portrait, (w - dw) / 2, h - dh, dw, dh);
  const ink = silhouette(base, "#000");
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const c = out.getContext("2d");
  c.drawImage(ink, line * 1.6, line * 1.6); // hard shadow
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) c.drawImage(ink, Math.cos(a) * line, Math.sin(a) * line); // outline
  c.drawImage(base, 0, 0);
  stickerCache.set(key, out);
  return out;
}

// Fill a frame with the portrait sticker (or initials while the photo loads)
function drawPortrait(c, x, y, w, h, bg) {
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.fillStyle = bg;
  c.fillRect(x, y, w, h);
  c.fillStyle = "rgba(0,0,0,.16)";
  const step = Math.max(10, Math.round(w / 14));
  for (let yy = y + step / 2; yy < y + h; yy += step)
    for (let xx = x + step / 2; xx < x + w; xx += step) {
      c.beginPath();
      c.arc(xx, yy, step * 0.18, 0, Math.PI * 2);
      c.fill();
    }
  if (portrait) {
    c.drawImage(portraitSticker(Math.round(w), Math.round(h)), x, y);
  } else {
    c.fillStyle = "#000";
    c.font = `800 ${Math.round(h * 0.42)}px ${DISPLAY}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("OP", x + w / 2, y + h / 2 + 4);
  }
  c.restore();
  c.lineWidth = Math.max(4, w / 36);
  c.strokeStyle = "#000";
  c.strokeRect(x, y, w, h);
}

// Wrap text into lines that fit maxWidth, at most maxLines (last one ellipsised)
function wrap(c, text, maxWidth, maxLines) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (c.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "…");
  }
  return lines;
}

// Largest font size (<= max) at which text fits on one line
function fitFont(c, text, weight, family, max, width) {
  let size = max;
  do {
    c.font = `${weight} ${size}px ${family}`;
    size -= 2;
  } while (c.measureText(text).width > width && size > 16);
}


const DISPLAY = "'Lexend Mega', sans-serif";
const BODY = "'Space Grotesk', sans-serif";

// ---------- ID badge (hero) ----------
export function drawBadge(c, w, h, { back = false, now = new Date() } = {}) {
  // One print layout at any texture density; hotspot coordinates follow the same scale.
  const sx = w / 480;
  const sy = h / 780;
  c.save();
  c.scale(sx, sy);
  w = 480;
  h = 780;
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, w, h);
  stockGrain(c, w, h, { seed: back ? 21 : 20, density: 0.6, wear: 0.04 });
  guilloche(c, 0, 130, w, 300, "rgba(36,91,215,.06)", { lines: 6, waves: 3 });
  c.fillStyle = "#ffdd00";
  c.fillRect(0, 0, w, 112);
  guilloche(c, 0, 0, w, 108, "rgba(0,0,0,.08)", { lines: 6, waves: 4 });
  c.fillStyle = "#17243b";
  c.fillRect(0, 108, w, 6);
  c.textAlign = "left";
  c.textBaseline = "middle";
  c.font = `800 20px ${DISPLAY}`;
  c.fillText("THE DESK", 30, 46);
  c.font = `700 15px ${BODY}`;
  c.fillText(back ? "RETURN TO OWNER" : "DEVELOPER ACCESS PASS", 30, 80);
  c.textAlign = "right";
  c.font = `800 32px ${BODY}`;
  c.fillText("{ }", w - 30, 50);
  c.textAlign = "center";
  const hotspots = [];
  if (back) {
    c.fillStyle = "#17243b";
    c.font = `800 32px ${DISPLAY}`;
    c.fillText("IF FOUND,", w / 2, 174);
    c.fillText("PLEASE HIRE.", w / 2, 220);
    c.font = `500 20px ${BODY}`;
    c.fillText("Good things start with a conversation.", w / 2, 270);
    // Links, printed as buttons
    [
      { label: "GITHUB ↗", color: "#ffdd00", href: "https://github.com/okasutarto" },
      { label: "LINKEDIN ↗", color: "#00e0c6", href: "https://linkedin.com/in/okasutarto" },
      { label: "EMAIL ME ↗", color: "#ff90e8", href: "mailto:okasputra@gmail.com" },
    ].forEach((link, i) => {
      const box = { x: 38, y: 326 + i * 100, w: w - 76, h: 72 };
      brutalBox(c, box.x, box.y, box.w, box.h, link.color, { shadow: 6, line: 4 });
      c.fillStyle = "#17243b";
      c.font = `800 24px ${DISPLAY}`;
      c.fillText(link.label, w / 2, box.y + box.h / 2 + 2);
      hotspots.push({ ...box, href: link.href });
    });
    c.fillStyle = "#245bd7";
    c.font = `800 18px ${BODY}`;
    c.fillText("BUILD · BREAK · LEARN · REPEAT", w / 2, 676);
    c.fillStyle = "#526075";
    c.font = `500 18px ${BODY}`;
    c.fillText("property of okasp / Pontianak, ID", w / 2, 712);
  } else {
    // Framed portrait with a small staff tab, set off the warm PVC stock.
    c.fillStyle = "#17243b";
    c.fillRect(140, 150, 216, 264);
    drawPortrait(c, 132, 142, 216, 264, "#00e0c6");
    // the card's contact chip: gold, its pads cut by inked lines
    brutalBox(c, 40, 168, 66, 54, "#e2b53c", { shadow: 4, line: 3 });
    c.strokeStyle = "#8a6514";
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(73, 168);
    c.lineTo(73, 222);
    c.moveTo(40, 186);
    c.lineTo(62, 186);
    c.moveTo(84, 186);
    c.lineTo(106, 186);
    c.moveTo(40, 204);
    c.lineTo(62, 204);
    c.moveTo(84, 204);
    c.lineTo(106, 204);
    c.rect(62, 182, 22, 26);
    c.stroke();
    c.fillStyle = "rgba(255,255,255,.45)";
    c.fillRect(43, 171, 60, 5);
    c.fillStyle = "#245bd7";
    c.fillRect(310, 370, 112, 36);
    c.fillStyle = "#fff";
    c.font = `800 16px ${BODY}`;
    c.fillText("STAFF / 01", 366, 389);
    c.fillStyle = "#17243b";
    // name + role
    c.font = `800 38px ${DISPLAY}`;
    c.fillText("OKA S.", w / 2, 455);
    c.fillText("PUTRA", w / 2, 503);
    c.font = `700 22px ${BODY}`;
    c.fillText("FULL STACK DEVELOPER", w / 2, 549);
    // live status pill: green during working hours (WIB), orange otherwise
    const hour = (now.getUTCHours() + 7) % 24;
    const onDuty = hour >= 9 && hour < 19;
    brutalBox(c, 62, 585, w - 124, 52, onDuty ? "#8fd694" : "#ffb36b", { shadow: 5, line: 4 });
    c.fillStyle = "#17243b";
    c.font = `800 20px ${DISPLAY}`;
    c.fillText(onDuty ? "● ON DUTY" : "● OFF DUTY", w / 2, 612);
    // barcode
    c.fillStyle = "#17243b";
    for (let x = 90, i = 0; x < w - 90; i++) {
      const bw = [3, 6, 2, 8, 4][i % 5];
      c.fillRect(x, 679, bw, 34);
      x += bw + [4, 3, 6, 2, 5][(i * 3) % 5];
    }
    c.font = `600 14px ${BODY}`;
    c.fillStyle = "#526075";
    c.fillText("OKASP — DEV / 001", w / 2, 737);
  }
  c.lineWidth = 6;
  c.strokeStyle = "#17243b";
  c.strokeRect(3, 3, w - 6, h - 6);
  c.restore();
  return hotspots.map((box) => ({ ...box, x: box.x * sx, y: box.y * sy, w: box.w * sx, h: box.h * sy }));
}

// ---------- boarding pass (experience) ----------
// Same pass as the 2D Experience section: the company is the "airline", the route runs from
// the start month to the end month, and the stub carries the headline number in its tone
const TONE_COLORS = { primary: "#ffdd00", secondary: "#00e0c6", pink: "#ff6b6b", violet: "#c4b5fd" };
const toneFor = (exp) => TONE_COLORS[exp.metric?.tone] || TONE_COLORS.primary;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const parseMonth = (text) => {
  const [mon, year] = text.trim().split(/\s+/);
  return { month: mon.toUpperCase(), year: Number(year), index: MONTHS.findIndex((m) => m.toLowerCase() === mon.toLowerCase()) };
};
export function ticketRoute(exp) {
  const [startText, endText] = exp.period.split(/\s*-\s*/);
  const from = parseMonth(startText);
  const now = new Date();
  const isPresent = /present/i.test(endText);
  const to = isPresent ? { month: "PRESENT", year: now.getFullYear(), index: now.getMonth() } : parseMonth(endText);
  const months = (to.year - from.year) * 12 + (to.index - from.index) + 1;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return {
    from: { month: from.month, label: `${from.month} ${from.year}` },
    to: { month: to.month, label: isPresent ? "Today" : `${to.month} ${to.year}` },
    duration: [years && `${years} yr`, rest && `${rest} mo`].filter(Boolean).join(" "),
  };
}

export function drawTicket(c, w, h, exp) {
  const tone = toneFor(exp);
  const route = ticketRoute(exp);
  const stub = w - 270;
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, stub, h);
  c.fillStyle = tone;
  c.fillRect(stub, 0, w - stub, h);
  // card stock, security waves behind the route, and a big plane watermarked into the paper
  stockGrain(c, w, h, { seed: exp.company.length + 5, wear: 0.06 });
  guilloche(c, 30, 88, stub - 60, 120, "rgba(0,0,0,.07)", { lines: 8, waves: 5 });
  c.save();
  c.translate(stub * 0.55, h * 0.58);
  c.rotate(-0.25);
  c.fillStyle = "rgba(0,0,0,.045)";
  c.font = `800 ${Math.round(h * 0.55)}px ${BODY}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("✈", 0, 0);
  c.restore();
  // halftone dots down the stub
  c.fillStyle = "rgba(0,0,0,.08)";
  for (let y = 12; y < h; y += 14) for (let x = stub + 12 + ((y / 14) % 2) * 7; x < w; x += 14) c.fillRect(x, y, 3, 3);
  // a holographic seal on the stub: flat bands of rainbow foil, inked round
  c.save();
  c.translate(w - 62, 205);
  c.beginPath();
  c.roundRect(-34, -24, 68, 48, 8);
  c.clip();
  ["#ff90e8", "#c4b5fd", "#7fdfff", "#8fd694", "#ffdd00"].forEach((color, i) => {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(-60 + i * 22, 30);
    c.lineTo(-38 + i * 22, 30);
    c.lineTo(-8 + i * 22, -30);
    c.lineTo(-30 + i * 22, -30);
    c.closePath();
    c.fill();
  });
  c.fillStyle = "rgba(255,255,255,.6)";
  c.fillRect(-34, -24, 68, 6);
  c.restore();
  c.lineWidth = 3;
  c.strokeStyle = "#000";
  c.beginPath();
  c.roundRect(w - 96, 181, 68, 48, 8);
  c.stroke();
  c.textBaseline = "middle";

  // airline: initial + company
  brutalBox(c, 40, 30, 40, 40, tone, { shadow: 0, line: 4 });
  c.fillStyle = "#000";
  c.font = `800 18px ${DISPLAY}`;
  c.textAlign = "center";
  c.fillText(exp.companyInitial || exp.company[0], 60, 52);
  c.textAlign = "left";
  c.font = `700 20px ${BODY}`;
  c.fillText(exp.company.toUpperCase(), 94, 51);
  // status stamp
  c.save();
  c.translate(stub - 130, 52);
  c.rotate(-0.05);
  const stampColor = exp.current ? "#16a34a" : "rgba(0,0,0,.55)";
  c.strokeStyle = stampColor;
  c.fillStyle = stampColor;
  c.lineWidth = 4;
  c.strokeRect(-100, -20, 200, 40);
  c.font = `800 15px ${DISPLAY}`;
  c.textAlign = "center";
  c.fillText(exp.current ? "✈ BOARDING NOW" : "ARRIVED ✓", 0, 2);
  c.restore();

  // route: start month ✈ end month
  c.fillStyle = "#111";
  c.font = `800 62px ${DISPLAY}`;
  c.fillText(route.from.month, 40, 132);
  const fromW = c.measureText(route.from.month).width;
  c.textAlign = "right";
  fitFont(c, route.to.month, 800, DISPLAY, 62, 330);
  c.fillText(route.to.month, stub - 40, 132);
  const toW = c.measureText(route.to.month).width;
  c.textAlign = "left";
  const trailStart = 40 + fromW + 24;
  const trailEnd = stub - 40 - toW - 24;
  for (let x = trailStart; x < trailEnd - 40; x += 10) c.fillRect(x, 130, 5, 4);
  c.font = `800 30px ${BODY}`;
  c.fillText("✈", trailEnd - 30, 132);
  c.fillStyle = "rgba(0,0,0,.55)";
  c.font = `700 15px ${BODY}`;
  c.fillText(route.from.label, 40, 182);
  c.textAlign = "right";
  c.fillText(route.to.label, stub - 40, 182);
  c.textAlign = "left";

  // role
  c.fillStyle = "#111";
  fitFont(c, exp.role.toUpperCase(), 800, DISPLAY, 34, stub - 80);
  c.fillText(exp.role.toUpperCase(), 40, 236);

  // fields
  let x = 40;
  [
    ["DESTINATION", exp.location],
    ["DURATION", route.duration],
    ["GEAR", (exp.technologies || []).slice(0, 3).join(" · ")],
  ].forEach(([label, value]) => {
    c.fillStyle = "rgba(0,0,0,.55)";
    c.font = `700 13px ${BODY}`;
    c.fillText(label, x, 292);
    c.fillStyle = "#111";
    c.font = `700 19px ${BODY}`;
    c.fillText(value, x, 322);
    x += Math.max(c.measureText(value).width, 90) + 34;
  });

  // stub: highlight, barcode, the "tear" cue (here: flip)
  const stat = exp.stats?.[0];
  c.fillStyle = "rgba(0,0,0,.65)";
  c.font = `700 13px ${BODY}`;
  c.fillText("HIGHLIGHT", stub + 30, 44);
  if (stat) {
    c.fillStyle = "#000";
    fitFont(c, stat.value, 800, DISPLAY, 56, 210);
    c.fillText(stat.value, stub + 30, 92);
    c.font = `700 14px ${BODY}`;
    wrap(c, stat.label.toUpperCase(), 210, 2).forEach((line, i) => c.fillText(line, stub + 30, 138 + i * 18));
  }
  c.fillStyle = "#000";
  for (let bx = stub + 30, i = 0; bx < w - 30; i++) {
    const bw = [3, 6, 2, 5, 4][i % 5];
    c.fillRect(bx, 250, bw, 70);
    bx += bw + [3, 5, 2, 4][(i * 3) % 4];
  }
  c.font = `700 13px ${BODY}`;
  c.fillText("FLIP FOR DETAILS ↗", stub + 30, 350);

  // perforation with notches, and the outline
  for (let y = 20; y < h - 20; y += 16) c.fillRect(stub - 2, y, 4, 8);
  c.lineWidth = 6;
  c.strokeStyle = "#000";
  [6, h - 6].forEach((y) => {
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(stub, y, 18, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  });
  c.lineWidth = 10;
  c.strokeRect(5, 5, w - 10, h - 10);
  c.textBaseline = "alphabetic";
}

// Back of a boarding pass: the itinerary (what happened on that trip), read once flipped
export function drawTicketBack(c, w, h, exp) {
  const color = toneFor(exp);
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, w, h);
  stockGrain(c, w, h, { seed: exp.company.length + 9, wear: 0.06 });
  guilloche(c, 20, 120, w - 330, h - 200, "rgba(0,0,0,.035)", { lines: 6, waves: 7 });
  c.fillStyle = color;
  c.fillRect(0, 0, w, 64);
  c.fillStyle = "#000";
  c.fillRect(0, 60, w, 6);
  c.textBaseline = "middle";
  c.font = `800 26px ${DISPLAY}`;
  c.fillText("ITINERARY", 30, 33);
  c.font = `700 22px ${BODY}`;
  c.textAlign = "right";
  c.fillText(`${exp.role.toUpperCase()} @ ${exp.company.toUpperCase()}`, w - 30, 33);
  c.textAlign = "left";
  // what happened on the trip
  const stub = w - 290;
  c.textBaseline = "top";
  let y = 88;
  for (const item of (exp.achievements || []).slice(0, 3)) {
    c.fillStyle = "#e11d48";
    c.fillRect(30, y + 6, 12, 12);
    c.fillStyle = "#000";
    c.font = `500 21px ${BODY}`;
    const lines = wrap(c, item, stub - 90, 2);
    lines.forEach((line, i) => c.fillText(line, 56, y + i * 26));
    y += lines.length * 26 + 12;
  }
  // tech, like baggage tags
  let x = 30;
  c.font = `700 16px ${BODY}`;
  for (const tech of (exp.technologies || []).slice(0, 6)) {
    const tw = c.measureText(tech.toUpperCase()).width + 20;
    if (x + tw > stub - 30) break;
    brutalBox(c, x, h - 58, tw, 34, color, { shadow: 4, line: 3 });
    c.fillStyle = "#000";
    c.fillText(tech.toUpperCase(), x + 10, h - 49);
    x += tw + 12;
  }
  // perforation + stub with the headline numbers
  c.fillStyle = "#000";
  for (let yy = 80; yy < h - 10; yy += 20) c.fillRect(stub, yy, 4, 10);
  (exp.stats || []).slice(0, 2).forEach((st, i) => {
    fitFont(c, st.value, 800, DISPLAY, 46, 240);
    c.fillText(st.value, stub + 28, 96 + i * 140);
    c.font = `700 17px ${BODY}`;
    wrap(c, st.label.toUpperCase(), 240, 2).forEach((line, j) => c.fillText(line, stub + 28, 150 + i * 140 + j * 20));
  });
  c.textBaseline = "alphabetic";
  c.lineWidth = 10;
  c.strokeStyle = "#000";
  c.strokeRect(5, 5, w - 10, h - 10);
}

// ---------- project case files: same five sheets and palette as the 2D drawer ----------
function fileCanvas(c, w, h, draw, height = 740) {
  c.save();
  c.scale(w / 1000, h / height);
  c.textAlign = "left";
  c.textBaseline = "top";
  const hotspots = draw() || [];
  c.restore();
  return hotspots.map((spot) => ({ ...spot, x: spot.x * w / 1000, y: spot.y * h / height, w: spot.w * w / 1000, h: spot.h * h / height }));
}
function fileText(c, text, x, y, width, { size = 25, lines = 4, weight = 500, ink = "#111" } = {}) {
  c.fillStyle = ink;
  c.font = `${weight} ${size}px ${BODY}`;
  const wrapped = wrap(c, String(text || ""), width, lines);
  wrapped.forEach((line, i) => c.fillText(line, x, y + i * size * 1.35));
  return wrapped.length * size * 1.35;
}
function drawClip(c, x, y, w, h, api) {
  brutalBox(c, x, y, w, h, "#fffdf5", { shadow: 7, line: 4 });
  c.save();
  c.beginPath();
  c.rect(x + 2, y + 2, w - 4, h - 4);
  c.clip();
  c.translate(x, y);
  stockGrain(c, w, h, { seed: x + y, wear: 0 });
  c.restore();
  paperclip(c, x + 45, y - 26, 82, 0.05);
  if (api) {
    fileText(c, api.request, x + 16, y + 35, w - 32, { size: 17, weight: 800, lines: 2 });
    fileText(c, api.status, x + 16, y + 95, w - 32, { size: 16, ink: "#166534", lines: 1 });
    fileText(c, typeof api.body === "string" ? api.body : JSON.stringify(api.body, null, 2), x + 16, y + 130, w - 32, { size: 15, ink: "#7c3aed", lines: 8 });
  } else {
    brutalBox(c, x + 20, y + 28, w - 40, 25, "#fff", { shadow: 0, line: 3 });
    brutalBox(c, x + 20, y + 70, w - 40, h * 0.35, "#d9d9d9", { shadow: 0, line: 3 });
    for (let i = 0; i < 2; i++) brutalBox(c, x + 20 + i * (w / 2 - 10), y + h * 0.64, w / 2 - 30, h * 0.15, "#fff", { shadow: 0, line: 3 });
    c.fillStyle = "#111";
    c.fillRect(x + 20, y + h - 35, w * 0.55, 16);
  }
}
function drawFileMetrics(c, metrics, color, y = 630) {
  metrics.slice(0, 3).forEach((metric, i) => {
    const x = 42 + i * 310;
    brutalBox(c, x, y, 292, 78, color, { shadow: 5, line: 4 });
    c.fillStyle = "#111";
    fitFont(c, metric.value, 800, DISPLAY, 34, 266);
    c.fillText(metric.value, x + 14, y + 8);
    fileText(c, metric.label.toUpperCase(), x + 14, y + 49, 266, { size: 14, lines: 1, weight: 800 });
  });
}
// Three punched holes down a sheet's hinged edge, at `x` in the 1000-wide page
function punchHoles(c, x) {
  [190, 370, 550].forEach((y) => {
    c.beginPath();
    c.arc(x, y, 11, 0, Math.PI * 2);
    c.fillStyle = "#3a3530";
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = "#1a1714";
    c.stroke();
    c.beginPath();
    c.arc(x + 2, y + 2, 7, Math.PI * 0.9, Math.PI * 1.9);
    c.strokeStyle = "rgba(255,255,255,.25)";
    c.stroke();
  });
}
// The folder's board: coloured card with a fibre grain, a scored crease along the spine (the
// hinged left edge), a rubber stamp and the faint ring of a mug once set down on it
function folderBoard(c, color, index, creaseX = 20) {
  c.fillStyle = color;
  c.fillRect(0, 0, 1000, 740);
  stockGrain(c, 1000, 740, { seed: index + 3, density: 1.2, wear: 0.07 });
  c.fillStyle = "rgba(0,0,0,.14)";
  c.fillRect(creaseX, 0, 5, 740);
  c.fillStyle = "rgba(255,255,255,.3)";
  c.fillRect(creaseX + 5, 0, 3, 740);
}
export function drawFolderCover(c, w, h, project, index = 0) {
  return fileCanvas(c, w, h, () => {
    const color = FOLDER_COLORS[index % FOLDER_COLORS.length];
    folderBoard(c, color, index);
    rubberStamp(c, 160, 655, `CASE Nº ${String(index + 1).padStart(2, "0")}`, { color: "rgba(26,23,20,.55)", size: 26, angle: -0.08, seed: index + 1 });
    c.strokeStyle = "rgba(60,30,10,.16)";
    c.lineWidth = 7;
    c.beginPath();
    c.arc(560, 640, 62, 0.5, Math.PI * 1.75);
    c.stroke();
    brutalBox(c, 42, 42, 245, 46, "#fff", { shadow: 5, line: 4 });
    fileText(c, project.type.toUpperCase(), 58, 53, 220, { size: 20, weight: 800, lines: 1 });
    const longestWord = project.title.toUpperCase().split(/\s+/).sort((a, b) => b.length - a.length)[0];
    fitFont(c, longestWord, 800, DISPLAY, 61, 560);
    const title = wrap(c, project.title.toUpperCase(), 560, 3);
    title.forEach((line, i) => c.fillText(line, 42, 122 + i * 76));
    fileText(c, project.description, 42, 142 + title.length * 76, 550, { size: 25, lines: 3 });
    drawClip(c, 660, 140, 290, 330, project.caseFile?.api);
    c.strokeStyle = "#000";
    c.lineWidth = 7;
    c.strokeRect(4, 4, 992, 732);
  });
}
export const CASE_SHEETS = FILE_PAGES.map((page) => page.id);
export function drawCaseSheet(c, w, h, project, kind, { index = 0 } = {}) {
  return fileCanvas(c, w, h, () => {
    const page = CASE_SHEETS.indexOf(kind);
    const color = FOLDER_COLORS[index % FOLDER_COLORS.length];
    const metrics = (project.results?.metrics || []).slice(0, 3);
    const cf = project.caseFile || {};
    c.fillStyle = "#fffdf5";
    c.fillRect(0, 0, 1000, 740);
    stockGrain(c, 1000, 740, { seed: index * 7 + page + 1, wear: 0.05 });
    punchHoles(c, 17);
    brutalBox(c, 35, 28, 58, 40, "#111", { shadow: 0, line: 0 });
    fileText(c, String(page + 1).padStart(2, "0"), 46, 36, 45, { size: 23, weight: 800, lines: 1, ink: "#ffdd00" });
    fileText(c, FILE_PAGES[page].title.toUpperCase(), 110, 34, 840, { size: 31, weight: 800, lines: 1 });
    fileText(c, `NO. ${String(index + 1).padStart(2, "0")} · ${project.title.toUpperCase()}`, 38, 84, 920, { size: 16, weight: 700, lines: 1, ink: "#666" });
    const hotspots = [];
    if (kind === "overview") {
      const storyH = fileText(c, project.overview || project.description, 38, 135, 540, { size: 25, lines: 8 });
      if (cf.quote) fileText(c, `“${cf.quote}.”`, 38, Math.min(450, 160 + storyH), 540, { size: 24, weight: 700, ink: "#555", lines: 2 });
      brutalBox(c, 620, 135, 340, 370, "#fff", { shadow: 5, line: 4 });
      [["CLIENT", cf.client || "Personal project"], ["TYPE", project.type], ["YEAR", project.year], ["BUILT IN", project.duration], ["ROLE", project.role]].forEach(([label, value], i) => {
        fileText(c, label, 638, 151 + i * 67, 295, { size: 15, weight: 800, ink: "#666", lines: 1 });
        fileText(c, value, 638, 174 + i * 67, 295, { size: 22, weight: 700, lines: 1 });
      });
      drawFileMetrics(c, metrics, color, 555);
    } else if (kind === "challenge") {
      fileText(c, "THE PROBLEM", 38, 130, 400, { size: 22, weight: 800, lines: 1 });
      fileText(c, "WHAT I BUILT", 565, 130, 400, { size: 22, weight: 800, lines: 1 });
      (project.problem?.points || []).slice(0, 4).forEach((point, i) => {
        const y = 175 + i * 115;
        brutalBox(c, 38, y, 410, 100, "#fecaca", { shadow: 4, line: 3 });
        brutalBox(c, 555, y, 410, 100, "#bbf7d0", { shadow: 4, line: 3 });
        fileText(c, point, 51, y + 12, 384, { size: 20, lines: 3 });
        fileText(c, "→", 477, y + 28, 65, { size: 38, weight: 800, lines: 1 });
        fileText(c, project.solution?.points?.[i], 568, y + 12, 384, { size: 20, lines: 3 });
      });
    } else if (kind === "features") {
      (project.features || []).slice(0, 9).forEach((feature, i) => {
        const x = 40 + (i % 3) * 317;
        const y = 140 + Math.floor(i / 3) * 170;
        brutalBox(c, x, y, 297, 148, ["#fff", color, "#ffdd00", "#bfdbfe"][i % 4], { shadow: 5, line: 4 });
        fileText(c, String(i + 1).padStart(2, "0"), x + 14, y + 12, 60, { size: 17, weight: 800, lines: 1 });
        fileText(c, feature, x + 14, y + 42, 270, { size: 22, weight: 700, lines: 3 });
      });
    } else if (kind === "how") {
      let y = 142;
      (cf.flows || []).forEach((flow) => {
        fileText(c, flow.label.toUpperCase(), 38, y, 545, { size: 20, weight: 800, lines: 1 });
        y += 40;
        y += fileText(c, flow.nodes.join(" → "), 38, y, 550, { size: 27, weight: 700, lines: 3 }) + 50;
      });
      drawClip(c, 645, 155, 310, 390, cf.api);
    } else {
      let x = 38;
      let y = 140;
      for (const tech of project.technologies || []) {
        c.font = `700 21px ${BODY}`;
        const width = c.measureText(tech).width + 28;
        if (x + width > 605) { x = 38; y += 58; }
        brutalBox(c, x, y, width, 42, "#fff", { shadow: 4, line: 3 });
        fileText(c, tech, x + 12, y + 8, width - 24, { size: 21, weight: 700, lines: 1 });
        x += width + 14;
      }
      y += 80;
      if (project.learnings?.length) {
        fileText(c, "WHAT I LEARNED", 38, y, 550, { size: 18, weight: 800, lines: 1 });
        project.learnings.slice(0, 3).forEach((item, i) => fileText(c, `• ${item}`, 38, y + 36 + i * 70, 550, { size: 22, lines: 2 }));
      }
      metrics.forEach((metric, i) => {
        brutalBox(c, 650, 140 + i * 155, 305, 130, color, { shadow: 5, line: 4 });
        fileText(c, metric.value, 670, 158 + i * 155, 265, { size: 42, weight: 800, lines: 1 });
        fileText(c, metric.label.toUpperCase(), 670, 214 + i * 155, 265, { size: 18, weight: 800, lines: 2 });
      });
      const links = [{ label: "OPEN LIVE ↗", href: project.demoLink }, { label: "CODE ↗", href: project.codeLink }].filter((link) => link.href && link.href !== "#");
      links.forEach((link, i) => {
        const box = { x: 38 + i * 255, y: 580, w: 235, h: 58 };
        brutalBox(c, box.x, box.y, box.w, box.h, i ? "#fff" : "#00e0c6", { shadow: 5, line: 4 });
        fileText(c, link.label, box.x + 13, box.y + 16, box.w - 26, { size: 23, weight: 800, lines: 1 });
        hotspots.push({ ...box, href: link.href });
      });
      if (!links.length) fileText(c, "PRIVATE BUILD", 38, 595, 540, { size: 22, weight: 800, ink: "#666", lines: 1 });
    }
    // Going back lives on the left page (the back of the sheet just turned)
    fileText(c, page < CASE_SHEETS.length - 1 ? "NEXT →" : "END", 820, 684, 150, { size: 19, weight: 800, lines: 1 });
    if (page < CASE_SHEETS.length - 1) hotspots.push({ x: 760, y: 660, w: 230, h: 70, action: "next" });
    c.strokeStyle = "#000";
    c.lineWidth = 6;
    c.strokeRect(3, 3, 994, 734);
    return hotspots;
  });
}
// Back of a turned sheet / inside of the cover: drawn upside down so they read once flipped.
// A turned sheet's back is the left page of the spread, in the same paper as the right page,
// and carries the way back to the page it belongs to (`kind`).
export function drawCaseBack(c, w, h, project, { inside = false, index = 0, kind } = {}) {
  c.save();
  c.translate(w, h);
  c.rotate(Math.PI);
  let hotspots = [];
  if (inside) {
    c.save();
    c.scale(w / 1000, h / 740);
    // drawn turned round, so the spine's crease is on the far side here
    folderBoard(c, FOLDER_COLORS[index % FOLDER_COLORS.length], index + 11, 972);
    c.restore();
    c.fillStyle = "#000";
    c.font = `800 30px ${DISPLAY}`;
    c.fillText(`CASE FILE #${String(index + 1).padStart(3, "0")}`, 30, 70);
    c.font = `600 30px 'Caveat', cursive`;
    c.fillText(`re: ${project.title}`, 30, 120);
    c.fillText("handle with care ✦", 30, 160);
    // a sticky note slapped on the inside, a little crooked, with a hard shadow
    c.save();
    c.translate(w * 0.62, h * 0.1);
    c.rotate(0.06);
    const note = h * 0.38;
    c.fillStyle = "#000";
    c.fillRect(7, 7, note, note);
    c.fillStyle = "#ffdd00";
    c.fillRect(0, 0, note, note);
    c.lineWidth = 3;
    c.strokeRect(0, 0, note, note);
    c.fillStyle = "rgba(0,0,0,.08)";
    c.fillRect(0, 0, note, note * 0.14);
    c.fillStyle = "#111";
    c.font = `700 ${Math.round(note * 0.2)}px 'Caveat', cursive`;
    c.fillText("notes:", note * 0.1, note * 0.36);
    c.fillText("ship it! ✓", note * 0.1, note * 0.6);
    c.fillText("— O.", note * 0.45, note * 0.85);
    c.restore();
    // a rubber stamp, inked a bit unevenly
    c.save();
    c.translate(w * 0.24, h * 0.72);
    c.rotate(-0.14);
    c.globalAlpha = 0.8;
    c.strokeStyle = "#d62828";
    c.lineWidth = 6;
    c.beginPath();
    c.roundRect(-w * 0.17, -h * 0.08, w * 0.34, h * 0.16, 10);
    c.stroke();
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(-w * 0.155, -h * 0.065, w * 0.31, h * 0.13, 7);
    c.stroke();
    c.fillStyle = "#d62828";
    c.font = `800 ${Math.round(h * 0.075)}px ${DISPLAY}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("ON FILE", 0, 2);
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
    c.restore();
    // a coffee ring, and a marker doodle by the signature line
    c.globalAlpha = 1;
    c.strokeStyle = "rgba(90,50,20,.22)";
    c.lineWidth = 7;
    c.beginPath();
    c.arc(w * 0.78, h * 0.78, h * 0.12, 0.4, Math.PI * 1.8);
    c.stroke();
    c.strokeStyle = "#111";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(30, h * 0.92);
    c.lineTo(w * 0.42, h * 0.92);
    c.stroke();
    c.font = `600 26px 'Caveat', cursive`;
    c.fillStyle = "#111";
    c.fillText("signed:", 30, h * 0.9);
    c.beginPath();
    c.moveTo(120, h * 0.9);
    c.bezierCurveTo(150, h * 0.83, 165, h * 0.95, 190, h * 0.88);
    c.bezierCurveTo(205, h * 0.84, 215, h * 0.92, 245, h * 0.87);
    c.stroke();
    c.lineWidth = 6;
    c.strokeStyle = "#000";
    c.strokeRect(3, 3, w - 6, h - 6);
  } else {
    const page = Math.max(0, CASE_SHEETS.indexOf(kind));
    hotspots = fileCanvas(c, w, h, () => {
      c.fillStyle = "#fffdf5";
      c.fillRect(0, 0, 1000, 740);
      stockGrain(c, 1000, 740, { seed: index * 7 + page + 40, wear: 0.05 });
      // the holes go through: here they sit on the far side, which turns to the hinge
      punchHoles(c, 983);
      // Same header as the right page, for the page this sheet holds
      brutalBox(c, 35, 28, 58, 40, "#111", { shadow: 0, line: 0 });
      fileText(c, String(page + 1).padStart(2, "0"), 46, 36, 45, { size: 23, weight: 800, lines: 1, ink: "#ffdd00" });
      fileText(c, FILE_PAGES[page].title.toUpperCase(), 110, 34, 840, { size: 31, weight: 800, lines: 1 });
      fileText(c, `NO. ${String(index + 1).padStart(2, "0")} · ${project.title.toUpperCase()}`, 38, 84, 920, { size: 16, weight: 700, lines: 1, ink: "#666" });
      // Notes page: a few ruled lines and the page number, large and faint
      c.fillStyle = "rgba(0,0,0,.07)";
      for (let y = 160; y < 640; y += 48) c.fillRect(38, y, 924, 3);
      c.fillStyle = "rgba(0,0,0,.06)";
      c.font = `800 260px ${DISPLAY}`;
      c.textAlign = "center";
      c.fillText(String(page + 1).padStart(2, "0"), 500, 250);
      c.textAlign = "left";
      fileText(c, "← BACK", 38, 684, 250, { size: 19, weight: 800, lines: 1 });
      c.strokeStyle = "#000";
      c.lineWidth = 6;
      c.strokeRect(3, 3, 994, 734);
      return [{ x: 20, y: 660, w: 260, h: 70, action: "prev" }];
    });
  }
  c.restore();
  // Hotspots were laid out in the upside-down frame; turn them into canvas coordinates
  return hotspots.map((hs) => ({ ...hs, x: w - hs.x - hs.w, y: h - hs.y - hs.h }));
}

// ---------- phone: a chat with the desk's AI assistant ----------
// `chat` is the scene's live state ({ messages, input, active, waiting, scroll }); the
// renderer writes chat.maxScroll back so the wheel can clamp.
export const CHAT_QUESTIONS = [
  { label: "Experience", color: "#ffdd00", text: "What is Oka's work experience?" },
  { label: "Tech stack", color: "#00e0c6", text: "What is Oka's tech stack?" },
  { label: "Projects", color: "#ff6b6b", text: "What projects has Oka built?" },
  { label: "Hire Oka", color: "#3b82f6", text: "How can I contact Oka to hire him?" },
];
// Markdown down to plain text. A reply still streaming in can hold an unclosed "**": drop it too.
const plain = (text) => text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

export function drawChatScreen(c, w, h, chat, { unread = false, caret = false, now = new Date() } = {}) {
  const hotspots = [];
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(0,0,0,.08)";
  for (let y = 12; y < h; y += 30) for (let x = 12; x < w; x += 30) c.fillRect(x, y, 4, 4);

  // messages between the header and the input bar: from the top while they fit, then laid out
  // bottom-up from the newest (scrolling back through the older ones)
  const top = 180;
  // Laid out clear of the input panel (h - 182), with room for the bubbles' outline and shadow
  const bottom = h - 202;
  const maxW = w * 0.78;
  c.font = `500 25px ${BODY}`;
  const laid = chat.messages.map((m) => {
    // A reply that hasn't started yet shows as a "typing" bubble of three bouncing dots
    if (m.pending && !m.text) return { m, typing: true, lines: [], height: 63 };
    const text = plain(m.text);
    const lines = text.split("\n").flatMap((para) => wrap(c, para, maxW - 40, 40));
    return { m, lines, height: lines.length * 33 + 30 };
  });
  const total = laid.reduce((sum, l) => sum + l.height + 18, 0);
  chat.maxScroll = Math.max(0, total - (bottom - top));
  chat.scroll = Math.min(chat.scroll || 0, chat.maxScroll);
  c.save();
  c.beginPath();
  c.rect(0, top, w, h - 182 - top);
  c.clip();
  let y = bottom + chat.scroll - Math.max(0, bottom - top - total);
  for (let i = laid.length - 1; i >= 0; i--) {
    const { m, lines, height, typing } = laid[i];
    y -= height;
    if (y > bottom || y + height < top) {
      y -= 18;
      continue;
    }
    const mine = m.sender === "user";
    if (typing) {
      brutalBox(c, 26, y, 120, height, "#fff", { shadow: 6, line: 4 });
      const t = Date.now() / 1000;
      c.fillStyle = "#000";
      for (let k = 0; k < 3; k++) {
        const lift = Math.max(0, Math.sin(t * 7 - k * 0.9)) * 9;
        c.beginPath();
        c.arc(56 + k * 30, y + height / 2 + 2 - lift, 7, 0, Math.PI * 2);
        c.fill();
      }
      y -= 18;
      continue;
    }
    const bw = Math.min(maxW, Math.max(...lines.map((l) => c.measureText(l).width)) + 40);
    const x = mine ? w - bw - 26 : 26;
    brutalBox(c, x, y, bw, height, mine ? "#00e0c6" : "#fff", { shadow: 6, line: 4 });
    c.fillStyle = "#000";
    c.textBaseline = "top";
    lines.forEach((line, j) => c.fillText(line, x + 20, y + 16 + j * 33));
    y -= 18;
  }
  // empty chat: a hello and quick questions
  if (!chat.messages.length) {
    brutalBox(c, 26, top + 20, w - 120, 100, "#fff", { shadow: 6, line: 4 });
    c.fillStyle = "#000";
    c.textBaseline = "top";
    c.font = `500 25px ${BODY}`;
    c.fillText("hey! i'm the desk's AI.", 46, top + 40);
    c.fillText("ask me anything about oka", 46, top + 74);
    c.font = `700 20px ${BODY}`;
    c.fillText("TRY ONE:", 30, top + 160);
    CHAT_QUESTIONS.forEach((q, i) => {
      const box = { x: 26 + (i % 2) * ((w - 70) / 2 + 18), y: top + 200 + Math.floor(i / 2) * 100, w: (w - 70) / 2, h: 76 };
      brutalBox(c, box.x, box.y, box.w, box.h, q.color, { shadow: 6, line: 4 });
      c.fillStyle = q.color === "#3b82f6" ? "#fff" : "#000";
      c.font = `800 22px ${DISPLAY}`;
      c.textBaseline = "middle";
      c.fillText(q.label.toUpperCase(), box.x + 16, box.y + box.h / 2 + 2);
      hotspots.push({ ...box, id: "ask", text: q.text });
    });
  }
  c.restore();

  // header
  c.fillStyle = "#ffdd00";
  c.fillRect(0, 0, w, 160);
  c.fillStyle = "#000";
  c.fillRect(0, 156, w, 6);
  c.textBaseline = "middle";
  c.font = `700 24px ${BODY}`;
  c.fillText(now.toTimeString().slice(0, 5), 44, 36);
  // Signal bars, wi-fi and battery on the right of the status bar
  c.fillStyle = "#000";
  [8, 12, 16, 20].forEach((bh, i) => c.fillRect(w - 182 + i * 9, 46 - bh, 6, bh));
  c.beginPath();
  c.moveTo(w - 128, 34);
  c.arc(w - 128, 46, 14, -Math.PI * 0.75, -Math.PI * 0.25);
  c.closePath();
  c.fill();
  c.lineWidth = 3;
  c.strokeStyle = "#000";
  c.beginPath();
  c.roundRect(w - 100, 25, 46, 22, 6);
  c.stroke();
  c.fillRect(w - 96, 29, 32, 14);
  c.fillRect(w - 52, 32, 4, 8);
  // Dynamic Island
  c.fillStyle = "#000";
  c.beginPath();
  c.roundRect(w / 2 - 75, 16, 150, 40, 20);
  c.fill();
  brutalBox(c, 28, 68, 72, 72, "#fff", { shadow: 5, line: 4 });
  c.fillStyle = "#000";
  c.fillRect(48, 92, 10, 10);
  c.fillRect(72, 92, 10, 10);
  c.fillRect(50, 116, 30, 6);
  c.font = `800 28px ${DISPLAY}`;
  c.fillText("DESK AI", 122, 92);
  c.font = `700 20px ${BODY}`;
  c.fillStyle = chat.waiting ? "#b45309" : "#166534";
  c.fillText(chat.waiting ? "● typing…" : "● online", 122, 124);
  if (unread) {
    c.fillStyle = "#ff5c8a";
    c.beginPath();
    c.arc(w - 60, 92, 34, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 5;
    c.strokeStyle = "#000";
    c.stroke();
    c.fillStyle = "#000";
    c.font = `800 30px ${DISPLAY}`;
    c.textAlign = "center";
    c.fillText("1", w - 60, 95);
    c.textAlign = "left";
  }

  // input bar + send
  const bar = { x: 26, y: h - 160, w: w - 150, h: 96 };
  c.fillStyle = "#fffdf5";
  c.fillRect(0, h - 182, w, 182);
  c.fillStyle = "#000";
  c.fillRect(0, h - 182, w, 5);
  brutalBox(c, bar.x, bar.y, bar.w, bar.h, chat.active ? "#fff" : "#f4f1ea", { shadow: 5, line: chat.active ? 6 : 4 });
  c.font = `500 25px ${BODY}`;
  c.textBaseline = "middle";
  // Show the end of a long draft
  let shown = chat.input;
  while (shown && c.measureText(shown).width > bar.w - 50) shown = shown.slice(1);
  c.fillStyle = chat.input ? "#000" : "rgba(0,0,0,.4)";
  c.fillText(chat.input ? shown : "Ask anything…", bar.x + 20, bar.y + bar.h / 2);
  if (caret) c.fillRect(bar.x + 22 + (chat.input ? c.measureText(shown).width : 0), bar.y + 26, 4, 44);
  hotspots.push({ ...bar, id: "input" });
  const send = { x: w - 110, y: h - 160, w: 84, h: 96 };
  brutalBox(c, send.x, send.y, send.w, send.h, chat.input.trim() && !chat.waiting ? "#ffdd00" : "#ddd", { shadow: 5, line: 4 });
  c.fillStyle = "#000";
  c.font = `800 38px ${BODY}`;
  c.textAlign = "center";
  c.fillText("➤", send.x + send.w / 2, send.y + send.h / 2 + 2);
  c.textAlign = "left";
  hotspots.push({ ...send, id: "send" });
  c.textBaseline = "alphabetic";
  return hotspots;
}

// ---------- postcard + envelope (contact) ----------
export function drawPostcard(c, w, h) {
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#000";
  c.fillRect(w / 2 - 2, 40, 4, h - 80);
  c.font = `800 30px ${DISPLAY}`;
  c.fillText("HELLO", 30, 70);
  c.fillText("FROM", 30, 110);
  c.fillText("THE DESK", 30, 150);
  c.font = `600 30px 'Caveat', cursive`;
  c.fillStyle = "#3b82f6";
  c.fillText("got a project?", 34, 220);
  c.fillText("let's talk :)", 34, 260);
  // stamp
  brutalBox(c, w - 130, 30, 96, 110, "#ff90e8", { shadow: 0, line: 5 });
  c.fillStyle = "#000";
  c.font = `800 22px ${DISPLAY}`;
  c.textAlign = "center";
  c.fillText("OK", w - 82, 92);
  c.textAlign = "left";
  // address lines
  for (let i = 0; i < 3; i++) c.fillRect(w / 2 + 30, 190 + i * 46, w / 2 - 70, 3);
  c.font = `700 20px ${BODY}`;
  c.fillText("TO: YOU", w / 2 + 30, 178);
  c.lineWidth = 10;
  c.strokeStyle = "#000";
  c.strokeRect(5, 5, w - 10, h - 10);
}

// Airmail's red-white-blue barber stripes, as a pattern to fill a border band with
function airmailStripes(c, band) {
  const tile = document.createElement("canvas");
  tile.width = tile.height = Math.round(band * 4);
  const t = tile.getContext("2d");
  const n = tile.width;
  // White ground with 45° stripes, red then blue, each a quarter of the tile wide; the tile is
  // one red and one blue across, so it repeats seamlessly
  t.fillStyle = "#fffdf5";
  t.fillRect(0, 0, n, n);
  const s = n / 4;
  for (let k = -2; k <= 2; k++) {
    const x = k * (n / 2);
    t.fillStyle = k % 2 === 0 ? "#e11d48" : "#1d4ed8";
    t.beginPath();
    t.moveTo(x, n);
    t.lineTo(x + s, n);
    t.lineTo(x + s + n, 0);
    t.lineTo(x + n, 0);
    t.closePath();
    t.fill();
  }
  return c.createPattern(tile, "repeat");
}
// Paper grain: a scatter of tiny light and dark flecks
function paperGrain(c, w, h, count) {
  for (let i = 0; i < count; i++) {
    c.fillStyle = i % 2 ? "rgba(90,60,20,.08)" : "rgba(255,255,255,.18)";
    c.fillRect((Math.sin(i * 12.9898) * 0.5 + 0.5) * w, (Math.cos(i * 78.233) * 0.5 + 0.5) * h, 2 + (i % 3), 1.5);
  }
}

export function drawEnvelope(c, w, h, { delivered = false } = {}) {
  c.clearRect(0, 0, w, h);
  const outline = () => {
    c.beginPath();
    c.moveTo(0, 0); c.lineTo(w / 2, h * 0.52); c.lineTo(w, 0);
    c.lineTo(w, h); c.lineTo(0, h); c.closePath();
  };
  outline();
  c.fillStyle = "#dcc391"; c.fill();
  c.save();
  outline();
  c.clip();
  paperGrain(c, w, h, 900);
  // the side flaps' folds, running in from the corners, with a faint shadow under each
  c.strokeStyle = "rgba(120,85,35,.45)";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, h); c.lineTo(w * 0.42, h * 0.58);
  c.moveTo(w, h); c.lineTo(w * 0.58, h * 0.58);
  c.stroke();
  c.fillStyle = "rgba(120,85,35,.08)";
  c.beginPath();
  c.moveTo(0, h); c.lineTo(w * 0.42, h * 0.58); c.lineTo(w / 2, h * 0.52); c.lineTo(w * 0.58, h * 0.58); c.lineTo(w, h);
  c.closePath();
  c.fill();
  // the airmail border along the sides and the bottom
  const band = h * 0.06;
  c.fillStyle = airmailStripes(c, band);
  c.fillRect(0, 0, band, h);
  c.fillRect(w - band, 0, band, h);
  c.fillRect(0, h - band, w, band);
  c.restore();
  outline();
  c.lineWidth = 6; c.strokeStyle = "#000"; c.stroke();
  c.save(); c.translate(w * 0.08, h * 0.76); c.rotate(-0.07);
  c.strokeStyle = "#1d4ed8"; c.fillStyle = "#1d4ed8"; c.lineWidth = 3;
  c.strokeRect(0, 0, w * 0.38, h * 0.15);
  c.font = `800 ${Math.round(h * 0.075)}px ${BODY}`;
  c.textBaseline = "middle"; c.fillText("PAR AVION ✈", w * 0.025, h * 0.075);
  c.restore();
  if (delivered) {
    c.save(); c.translate(w * 0.68, h * 0.75); c.rotate(-0.12);
    c.strokeStyle = "#16a34a"; c.fillStyle = "#16a34a"; c.lineWidth = 4;
    c.strokeRect(-w * 0.22, -h * 0.09, w * 0.44, h * 0.18);
    c.font = `800 ${Math.round(h * 0.08)}px ${BODY}`;
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("DELIVERED ✓", 0, 0);
    c.restore();
  }
}
export function drawEnvelopeFlap(c, w, h) {
  c.clearRect(0, 0, w, h);
  const outline = () => {
    c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w / 2, h); c.closePath();
  };
  outline();
  // a touch lighter toward the fold, like paper catching the light
  const shade = c.createLinearGradient(0, 0, 0, h);
  shade.addColorStop(0, "#ecd7aa");
  shade.addColorStop(1, "#dcc391");
  c.fillStyle = shade; c.fill();
  c.save();
  outline();
  c.clip();
  paperGrain(c, w, h, 400);
  c.fillStyle = airmailStripes(c, h * 0.075);
  c.fillRect(0, 0, w, h * 0.075);
  c.restore();
  outline();
  c.strokeStyle = "#000"; c.lineWidth = 6; c.stroke();
  // a red wax seal pressed over the flap's point, stamped with a star
  const sx = w / 2;
  const sy = h * 0.8;
  const sr = h * 0.13;
  c.fillStyle = "#000";
  c.beginPath();
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const r = sr * (1 + (i % 2 ? 0.08 : -0.04));
    c.lineTo(sx + 4 + Math.cos(a) * r, sy + 4 + Math.sin(a) * r);
  }
  c.fill();
  c.fillStyle = "#c81e3a";
  c.beginPath();
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const r = sr * (1 + (i % 2 ? 0.08 : -0.04));
    c.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
  }
  c.fill();
  c.lineWidth = 3;
  c.stroke();
  c.strokeStyle = "rgba(0,0,0,.35)";
  c.beginPath();
  c.arc(sx, sy, sr * 0.68, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = "rgba(255,220,220,.75)";
  c.font = `900 ${Math.round(sr * 0.9)}px ${DISPLAY}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("✦", sx, sy + sr * 0.05);
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
}
// Pontianak's Tugu Khatulistiwa (the Equator Monument), neo-brutalist: four pillars on a
// plinth carrying a globe with the equator ring round it and the arrow through it. Centred on
// cx, in a box `size` wide and `height` tall from `top`.
function drawEquatorMonument(c, cx, top, size, height) {
  const ink = Math.max(3, size * 0.035);
  const shadow = ink * 1.2;
  c.lineJoin = "round";
  const shape = (draw, fill) => {
    c.save();
    c.translate(shadow, shadow);
    draw();
    c.fillStyle = "#000";
    c.fill();
    c.restore();
    draw();
    c.fillStyle = fill;
    c.fill();
    c.lineWidth = ink;
    c.strokeStyle = "#000";
    c.stroke();
  };
  const r = size * 0.24;
  const gy = top + r + height * 0.02;
  const bottom = top + height;
  // plinth and pillars: the back pair (darker, inside) first, then the front pair over them
  shape(() => {
    c.beginPath();
    c.rect(cx - size * 0.42, bottom - height * 0.09, size * 0.84, height * 0.09);
  }, "#c98a4b");
  [[-0.13, "#c98a4b"], [0.05, "#c98a4b"], [-0.3, "#e7c08a"], [0.22, "#e7c08a"]].forEach(([dx, fill]) => {
    shape(() => {
      c.beginPath();
      c.rect(cx + size * dx, gy + r * 0.55, size * 0.08, bottom - height * 0.09 - (gy + r * 0.55));
    }, fill);
  });
  // globe, equator ring, arrow
  shape(() => {
    c.beginPath();
    c.arc(cx, gy, r, 0, Math.PI * 2);
  }, "#7fb2ff");
  c.beginPath();
  c.ellipse(cx, gy, r * 1.25, r * 0.32, 0, 0, Math.PI * 2);
  c.lineWidth = ink * 2.2;
  c.strokeStyle = "#000";
  c.stroke();
  c.lineWidth = ink * 1.1;
  c.strokeStyle = "#ff7a1a";
  c.stroke();
  shape(() => {
    const y = gy - r * 0.55;
    const x0 = cx - size * 0.46;
    const x1 = cx + size * 0.46;
    const t = height * 0.05;
    c.beginPath();
    c.moveTo(x0, y - t / 2);
    c.lineTo(x1 - t * 2, y - t / 2);
    c.lineTo(x1 - t * 2, y - t * 1.5);
    c.lineTo(x1, y);
    c.lineTo(x1 - t * 2, y + t * 1.5);
    c.lineTo(x1 - t * 2, y + t / 2);
    c.lineTo(x0, y + t / 2);
    c.closePath();
  }, "#ffdd00");
  c.fillStyle = "#000";
  c.font = `800 ${Math.round(size * 0.16)}px ${BODY}`;
  c.textAlign = "right";
  c.textBaseline = "middle";
  c.fillText("0°", cx - size * 0.34, gy + r * 1.3);
}

export function drawPostcardStamp(c, w, h) {
  c.fillStyle = "#ffdd00"; c.fillRect(0, 0, w, h);
  c.strokeStyle = "#000"; c.lineWidth = 5; c.strokeRect(3, 3, w - 6, h - 6);
  c.strokeStyle = "#fffdf5"; c.lineWidth = 3; c.setLineDash([3, 5]);
  c.strokeRect(10, 10, w - 20, h - 20); c.setLineDash([]);
  drawEquatorMonument(c, w / 2, h * 0.14, w * 0.5, h * 0.44);
  c.fillStyle = "#000"; c.textAlign = "center"; c.textBaseline = "middle";
  c.font = `800 ${Math.round(w * 0.11)}px ${BODY}`;
  c.fillText("PONTIANAK", w / 2, h * 0.69); c.fillText("2026", w / 2, h * 0.82);
  c.textAlign = "left"; c.textBaseline = "alphabetic";
}

// The writing side of the postcard: message on the left, sender on the right, SEND stamp.
// `card` is the scene's live state ({ name, email, message, active, errors, status }).
export function drawPostcardBack(c, w, h, card, { caret = false } = {}) {
  return fileCanvas(c, w, h, () => {
    c.fillStyle = "#fffdf5"; c.fillRect(0, 0, 1000, 640);
    c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = 2; c.setLineDash([8, 7]);
    c.strokeRect(14, 14, 972, 612); c.setLineDash([]);
    c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(560, 0, 2, 640);
    fileText(c, "HI OKA,", 40, 48, 450, { size: 35, weight: 800, lines: 1 });
    const area = { x: 38, y: 115, w: 485, h: 430, id: "message" };
    c.fillStyle = "rgba(0,0,0,.18)";
    for (let y = 172; y < 560; y += 56) c.fillRect(40, y, 480, 2);
    c.font = `500 30px ${BODY}`;
    const lines = (card.message || "").split("\n").flatMap((line) => wrap(c, line, 465, 30)).slice(-7);
    c.fillStyle = card.message ? "#1a1714" : "rgba(0,0,0,.4)";
    (card.message ? lines : ["Tell me about your", "project..."]).forEach((line, i) => c.fillText(line, 44, 129 + i * 56));
    if (caret && card.active === "message") {
      c.fillStyle = "#111";
      c.fillRect(44 + c.measureText(lines[lines.length - 1] || "").width, 129 + Math.max(0, lines.length - 1) * 56, 3, 34);
    }
    if (card.errors.message) fileText(c, card.errors.message, 40, 580, 480, { size: 18, ink: "#dc2626", lines: 1 });
    c.save(); c.translate(725, 106); c.rotate(-0.24);
    c.strokeStyle = "rgba(217,70,239,.7)"; c.fillStyle = "rgba(217,70,239,.85)"; c.lineWidth = 4;
    c.beginPath(); c.arc(0, 0, 60, 0, Math.PI * 2); c.stroke();
    c.font = `800 14px ${BODY}`; c.textAlign = "center";
    c.fillText("SENT FROM", 0, -24); c.fillText("OKASP.DEV", 0, -3); c.fillText("✦", 0, 18); c.restore();
    fileText(c, "To: Oka Sutarto Putra", 600, 222, 350, { size: 24, weight: 800, lines: 1 });
    const hotspots = [area];
    [{ id: "name", label: "FROM (YOUR NAME)", placeholder: "Jane Doe", y: 290 },
      { id: "email", label: "REPLY TO (EMAIL)", placeholder: "jane@company.com", y: 405 }].forEach((field) => {
      fileText(c, field.label, 600, field.y, 350, { size: 18, weight: 800, lines: 1, ink: "#666" });
      fileText(c, card[field.id] || field.placeholder, 600, field.y + 31, 350, { size: 27, lines: 1, ink: card[field.id] ? "#111" : "#999" });
      c.fillStyle = card.active === field.id ? "#000" : "rgba(0,0,0,.35)";
      c.fillRect(600, field.y + 72, 350, card.active === field.id ? 4 : 2);
      if (caret && card.active === field.id) {
        c.font = `500 27px ${BODY}`;
        c.fillRect(601 + Math.min(340, c.measureText(card[field.id] || "").width), field.y + 31, 3, 32);
      }
      if (card.errors[field.id]) fileText(c, card.errors[field.id], 600, field.y + 79, 350, { size: 16, ink: "#dc2626", lines: 1 });
      hotspots.push({ x: 590, y: field.y - 5, w: 370, h: 80, id: field.id });
    });
    const send = { x: 600, y: 535, w: 350, h: 62, id: "send" };
    brutalBox(c, send.x, send.y, send.w, send.h, "#ffdd00", { shadow: 6, line: 4 });
    fileText(c, card.status === "sending" ? "SENDING..." : "SEND POSTCARD ↗", 620, 555, 315, { size: 24, weight: 800, lines: 1 });
    if (card.status === "error") fileText(c, "Couldn't send. Try again?", 600, 611, 350, { size: 16, ink: "#dc2626", lines: 1 });
    hotspots.push(send);
    c.strokeStyle = "#000"; c.lineWidth = 6; c.strokeRect(3, 3, 994, 634);
    return hotspots;
  }, 640);
}

// ---------- pinned About board (same content as the 2D sticker board) ----------
export function drawAboutBoard(c, w, h) {
  // Cork: a warm base, then granules in a few shades, big and small, so it reads as pressed cork
  c.fillStyle = "#cb9b67";
  c.fillRect(0, 0, w, h);
  let r = 4111;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const GRAINS = ["rgba(70,40,15,.2)", "rgba(70,40,15,.12)", "rgba(255,230,190,.22)", "rgba(140,85,40,.25)"];
  for (let i = 0; i < (w * h) / 55; i++) {
    c.fillStyle = GRAINS[i % GRAINS.length];
    const s = 1 + rand() * (i % 7 === 0 ? 4 : 2);
    c.beginPath();
    c.ellipse(rand() * w, rand() * h, s, s * (0.5 + rand() * 0.6), rand() * Math.PI, 0, Math.PI * 2);
    c.fill();
  }
  // Old pin holes from notes long gone
  for (let i = 0; i < 26; i++) {
    const x = rand() * w;
    const y = h * 0.12 + rand() * h * 0.85;
    c.fillStyle = "rgba(40,20,5,.55)";
    c.beginPath();
    c.arc(x, y, w * 0.0022, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "rgba(255,235,200,.35)";
    c.beginPath();
    c.arc(x + 1, y + 1.5, w * 0.002, 0, Math.PI);
    c.fill();
  }
  // A faded coffee ring
  c.strokeStyle = "rgba(90,50,20,.18)";
  c.lineWidth = w * 0.006;
  c.beginPath();
  c.arc(w * 0.47, h * 0.9, w * 0.045, 0.3, Math.PI * 1.85);
  c.stroke();

  // Stickers slapped on the cork: flat colour, a thick black edge and a hard shadow
  const sticker = (x, y, turn, draw) => {
    c.save();
    c.translate(w * x, h * y);
    c.rotate(turn);
    c.fillStyle = "#000";
    c.save();
    c.translate(w * 0.004, w * 0.004);
    draw(true);
    c.restore();
    draw(false);
    c.restore();
  };
  const u = w / 100;
  const shape = (path, fill) => (shadow) => {
    c.beginPath();
    path();
    c.fillStyle = shadow ? "#000" : fill;
    c.fill();
    if (!shadow) {
      c.lineWidth = u * 0.35;
      c.strokeStyle = "#000";
      c.stroke();
    }
  };
  // a code bracket badge
  sticker(0.7, 0.075, -0.2, (shadow) => {
    shape(() => c.roundRect(-u * 3.4, -u * 2, u * 6.8, u * 4, u * 1.2), "#00e0c6")(shadow);
    if (shadow) return;
    c.fillStyle = "#000";
    c.font = `900 ${Math.round(u * 2.6)}px ${DISPLAY}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("</>", 0, u * 0.2);
  });
  // a lightning bolt
  sticker(0.355, 0.13, 0.25, shape(() => {
    c.moveTo(u * 0.6, -u * 3);
    c.lineTo(-u * 1.8, u * 0.4);
    c.lineTo(-u * 0.1, u * 0.4);
    c.lineTo(-u * 0.8, u * 3);
    c.lineTo(u * 1.9, -u * 0.6);
    c.lineTo(u * 0.2, -u * 0.6);
    c.closePath();
  }, "#ffdd00"));
  // a star
  sticker(0.965, 0.93, 0.3, shape(() => {
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? u * 1.1 : u * 2.5;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      if (i) c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
  }, "#ff90e8"));
  // a round "hello" sticker
  sticker(0.62, 0.95, -0.15, (shadow) => {
    shape(() => c.arc(0, 0, u * 2.4, 0, Math.PI * 2), "#ff6b6b")(shadow);
    if (shadow) return;
    c.fillStyle = "#fffdf5";
    c.font = `900 ${Math.round(u * 1.2)}px ${DISPLAY}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("HELLO!", 0, u * 0.1);
  });

  // A marker smiley on the cork
  c.strokeStyle = "rgba(17,17,17,.75)";
  c.lineWidth = u * 0.3;
  c.lineCap = "round";
  c.beginPath();
  c.arc(w * 0.83, h * 0.12, u * 1.6, 0, Math.PI * 2);
  c.moveTo(w * 0.83 - u * 0.9, h * 0.12 + u * 0.3);
  c.quadraticCurveTo(w * 0.83, h * 0.12 + u * 1.2, w * 0.83 + u * 0.9, h * 0.12 + u * 0.3);
  c.stroke();
  c.fillStyle = "rgba(17,17,17,.75)";
  [-0.5, 0.5].forEach((dx) => c.fillRect(w * 0.83 + dx * u - u * 0.15, h * 0.12 - u * 0.6, u * 0.3, u * 0.6));

  // The heading on a strip of masking tape, torn at both ends
  const tw = w * 0.24;
  const th = h * 0.085;
  c.save();
  c.translate(w / 2, h * 0.07);
  c.rotate(-0.025);
  c.fillStyle = "rgba(0,0,0,.25)";
  c.fillRect(-tw / 2 + 4, -th / 2 + 4, tw, th);
  c.beginPath();
  c.moveTo(-tw / 2, -th / 2);
  c.lineTo(tw / 2, -th / 2);
  for (let i = 0; i <= 6; i++) c.lineTo(tw / 2 + (i % 2 ? -1 : 1) * u * 0.5, -th / 2 + (th * i) / 6);
  c.lineTo(-tw / 2, th / 2);
  for (let i = 6; i >= 0; i--) c.lineTo(-tw / 2 + (i % 2 ? 1 : -1) * u * 0.5, -th / 2 + (th * i) / 6);
  c.closePath();
  c.fillStyle = "#f3e7c4";
  c.fill();
  c.fillStyle = "#111";
  c.font = `900 ${Math.round(h * 0.055)}px ${DISPLAY}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("ABOUT ME", 0, th * 0.06);
  c.restore();
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
}

// Each paper on the board is its own kind of stationery: a page torn from a lined notebook, sticky
// notes with a doodle each, a sticker sheet of the stack, an index card for what's being built, a
// little map postcard, and a label-maker strip for the resume.
const PAPER_COLORS = { years: "#ffdd00", projects: "#00e0c6", companies: "#7fb2ff", stack: "#ff90e8", now: "#c4b5fd", resume: "#141414" };
// Fine grain and a faint shadow where the paper lifts off the board at its lower right corner
function paperFinish(c, w, h, seed = 1) {
  let r = seed * 9301;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < (w * h) / 900; i++) {
    c.fillStyle = rand() < 0.5 ? "rgba(0,0,0,.035)" : "rgba(255,255,255,.08)";
    c.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1);
  }
  const curl = c.createLinearGradient(w * 0.75, h * 0.75, w, h);
  curl.addColorStop(0, "rgba(0,0,0,0)");
  curl.addColorStop(1, "rgba(0,0,0,.14)");
  c.fillStyle = curl;
  c.fillRect(0, 0, w, h);
}
// Text with a hard offset shadow, like the site's headings
function shadowText(c, text, x, y, color, shadow, d) {
  c.fillStyle = shadow;
  c.fillText(text, x + d, y + d);
  c.fillStyle = color;
  c.fillText(text, x, y);
}
const HAND = "'Caveat', cursive";

function drawWhoNote(c, w, h, note) {
  // lined notebook paper torn from a spiral pad
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, w, h);
  const rule = h * 0.085;
  const first = h * 0.3;
  c.strokeStyle = "rgba(59,130,246,.28)";
  c.lineWidth = Math.max(1, w * 0.003);
  for (let y = first; y < h - rule * 0.3; y += rule) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(w, y);
    c.stroke();
  }
  const margin = w * 0.12;
  c.strokeStyle = "rgba(225,29,72,.5)";
  c.beginPath();
  c.moveTo(margin, 0);
  c.lineTo(margin, h);
  c.stroke();
  // punched holes down the left, and the torn perforation along the top
  [0.3, 0.55, 0.8].forEach((k) => {
    c.fillStyle = "#cb9b67";
    c.beginPath();
    c.arc(w * 0.055, h * k, w * 0.018, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(0,0,0,.25)";
    c.lineWidth = 1.5;
    c.stroke();
  });
  c.fillStyle = "rgba(0,0,0,.12)";
  for (let x = 0; x < w; x += w * 0.025) c.fillRect(x, h * 0.03, w * 0.012, w * 0.006);
  // the heading in marker, then the note in handwriting sitting on the rules
  c.textBaseline = "alphabetic";
  fitFont(c, note.title.toUpperCase(), 800, DISPLAY, Math.round(h * 0.11), w - margin - w * 0.1);
  shadowText(c, note.title.toUpperCase(), margin + w * 0.035, first - rule * 0.35, "#1a1714", "#ffdd00", w * 0.006);
  const size = rule * 0.82;
  c.font = `700 ${Math.round(size)}px ${HAND}`;
  const plain = note.body.replace(/<[^>]*>/g, "");
  const marked = (note.body.match(/<mark[^>]*>(.*?)<\/mark>/) || [])[1] || "";
  const words = plain.split(" ");
  const markStart = marked ? plain.indexOf(marked) : -1;
  let x = margin + w * 0.035;
  let y = first + rule - rule * 0.18;
  let at = 0;
  words.forEach((word) => {
    const ww = c.measureText(word + " ").width;
    if (x + ww > w - w * 0.04) {
      x = margin + w * 0.035;
      y += rule;
    }
    if (y > h - rule * 0.2) return;
    // the name gets a highlighter stroke
    if (markStart >= 0 && at >= markStart && at < markStart + marked.length) {
      c.fillStyle = "rgba(255,221,0,.75)";
      c.fillRect(x - 2, y - size * 0.62, c.measureText(word).width + 6, size * 0.68);
    }
    c.fillStyle = "#1e2a5a";
    c.fillText(word, x, y);
    x += ww;
    at += word.length + 1;
  });
  // a doodled star in the corner
  c.strokeStyle = "#e11d48";
  c.lineWidth = w * 0.006;
  c.beginPath();
  const sx = w * 0.9;
  const sy = h * 0.88;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    c[i ? "lineTo" : "moveTo"](sx + Math.cos(a) * w * 0.04, sy + Math.sin(a) * w * 0.04);
  }
  c.closePath();
  c.stroke();
  paperFinish(c, w, h, 3);
}

// A tiny doodle per statistic: a calendar page, a folder, a building
function statDoodle(c, id, x, y, s) {
  c.save();
  c.translate(x, y);
  c.lineWidth = s * 0.07;
  c.strokeStyle = "#1a1714";
  c.fillStyle = "rgba(255,255,255,.85)";
  c.lineJoin = "round";
  if (id === "years") {
    c.fillRect(0, s * 0.15, s, s * 0.85);
    c.strokeRect(0, s * 0.15, s, s * 0.85);
    c.fillStyle = "#e11d48";
    c.fillRect(0, s * 0.15, s, s * 0.22);
    c.strokeRect(0, s * 0.15, s, s * 0.22);
    [0.25, 0.75].forEach((k) => {
      c.beginPath();
      c.moveTo(s * k, 0);
      c.lineTo(s * k, s * 0.3);
      c.stroke();
    });
    c.fillStyle = "#1a1714";
    for (let i = 0; i < 6; i++) c.fillRect(s * (0.14 + (i % 3) * 0.28), s * (0.5 + Math.floor(i / 3) * 0.24), s * 0.14, s * 0.12);
  } else if (id === "projects") {
    c.beginPath();
    c.moveTo(0, s * 0.2);
    c.lineTo(s * 0.4, s * 0.2);
    c.lineTo(s * 0.5, s * 0.32);
    c.lineTo(s, s * 0.32);
    c.lineTo(s, s * 0.95);
    c.lineTo(0, s * 0.95);
    c.closePath();
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(s * 0.25, s * 0.66);
    c.lineTo(s * 0.45, s * 0.8);
    c.lineTo(s * 0.78, s * 0.5);
    c.strokeStyle = "#16a34a";
    c.lineWidth = s * 0.1;
    c.stroke();
  } else {
    c.fillRect(s * 0.1, s * 0.1, s * 0.5, s * 0.9);
    c.strokeRect(s * 0.1, s * 0.1, s * 0.5, s * 0.9);
    c.fillRect(s * 0.6, s * 0.4, s * 0.35, s * 0.6);
    c.strokeRect(s * 0.6, s * 0.4, s * 0.35, s * 0.6);
    c.fillStyle = "#1a1714";
    for (let i = 0; i < 6; i++) c.fillRect(s * (0.2 + (i % 2) * 0.2), s * (0.22 + Math.floor(i / 2) * 0.22), s * 0.1, s * 0.1);
  }
  c.restore();
}
function drawStatNote(c, w, h, note) {
  const base = PAPER_COLORS[note.id];
  c.fillStyle = base;
  c.fillRect(0, 0, w, h);
  // the sticky strip along the top, a shade deeper
  c.fillStyle = "rgba(0,0,0,.07)";
  c.fillRect(0, 0, w, h * 0.2);
  c.textBaseline = "alphabetic";
  c.font = `900 ${Math.round(h * 0.42)}px ${DISPLAY}`;
  shadowText(c, note.value, w * 0.08, h * 0.68, "#1a1714", "rgba(255,255,255,.7)", w * 0.02);
  fitFont(c, note.label.toUpperCase(), 800, BODY, Math.round(h * 0.1), w * 0.84);
  c.fillStyle = "#1a1714";
  c.fillText(note.label.toUpperCase(), w * 0.08, h * 0.86);
  // an underline scribble under the label
  c.strokeStyle = "rgba(26,23,20,.55)";
  c.lineWidth = h * 0.012;
  c.beginPath();
  for (let x = w * 0.08; x <= w * 0.62; x += w * 0.04) c.lineTo(x, h * 0.91 + Math.sin(x * 0.2) * h * 0.008);
  c.stroke();
  // In the top right corner, clear of the number and the pin in the middle
  statDoodle(c, note.id, w * 0.72, h * 0.05, w * 0.2);
  paperFinish(c, w, h, note.id.length);
}

function drawStackNote(c, w, h) {
  // a sticker sheet: each tool a little sticker with a hard shadow
  c.fillStyle = PAPER_COLORS.stack;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(0,0,0,.12)";
  c.setLineDash([w * 0.012, w * 0.012]);
  c.lineWidth = 2;
  c.strokeRect(w * 0.03, h * 0.04, w * 0.94, h * 0.92);
  c.setLineDash([]);
  const pad = w * 0.075;
  c.textBaseline = "top";
  c.font = `900 ${Math.round(w * 0.065)}px ${DISPLAY}`;
  shadowText(c, "STACK", pad, h * 0.09, "#1a1714", "#fffdf5", w * 0.006);
  const STICKERS = ["#fffdf5", "#ffdd00", "#00e0c6", "#7fb2ff", "#c4b5fd"];
  // Each group on its own row: its name in the left column, its stickers wrapping to the right
  let y = h * 0.27;
  const chipH = w * 0.064;
  const left = pad + w * 0.17;
  ABOUT_STACK.forEach((group, g) => {
    c.font = `800 ${Math.round(w * 0.032)}px ${BODY}`;
    c.fillStyle = "rgba(26,23,20,.7)";
    c.fillText(group.label.toUpperCase(), pad, y + chipH * 0.25);
    let x = left;
    c.font = `700 ${Math.round(w * 0.038)}px ${BODY}`;
    group.items.forEach((item, i) => {
      const cw = c.measureText(item).width + w * 0.04;
      if (x + cw > w - pad) {
        x = left;
        y += chipH + w * 0.014;
      }
      c.fillStyle = "#1a1714";
      c.beginPath();
      c.roundRect(x + 3, y + 3, cw, chipH, chipH / 2);
      c.fill();
      c.fillStyle = STICKERS[(g + i) % STICKERS.length];
      c.beginPath();
      c.roundRect(x, y, cw, chipH, chipH / 2);
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = "#1a1714";
      c.stroke();
      c.fillStyle = "#1a1714";
      c.fillText(item, x + w * 0.02, y + chipH * 0.2);
      x += cw + w * 0.016;
    });
    y += chipH + w * 0.03;
  });
  paperFinish(c, w, h, 7);
}

function drawNowNote(c, w, h, note) {
  // an index card: a red heading rule, blue lines, a progress bar and a WIP stamp
  c.fillStyle = PAPER_COLORS.now;
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(255,255,255,.35)";
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(225,29,72,.45)";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(0, h * 0.42);
  c.lineTo(w, h * 0.42);
  c.stroke();
  c.strokeStyle = "rgba(59,130,246,.25)";
  [0.62, 0.78, 0.94].forEach((k) => {
    c.beginPath();
    c.moveTo(0, h * k);
    c.lineTo(w, h * k);
    c.stroke();
  });
  const pad = w * 0.06;
  c.textBaseline = "alphabetic";
  c.font = `900 ${Math.round(h * 0.17)}px ${DISPLAY}`;
  shadowText(c, note.title.toUpperCase(), pad, h * 0.37, "#1a1714", "#fffdf5", w * 0.004);
  c.font = `700 ${Math.round(h * 0.14)}px ${HAND}`;
  c.fillStyle = "#1e2a5a";
  wrap(c, note.body, w * 0.66, 3).forEach((line, i) => c.fillText(line, pad, h * (0.6 + i * 0.16)));
  // progress, and a rubber stamp
  const bx = w * 0.76;
  const bw = w * 0.19;
  c.fillStyle = "#fffdf5";
  c.fillRect(bx, h * 0.73, bw, h * 0.1);
  c.fillStyle = "#16a34a";
  c.fillRect(bx, h * 0.73, bw * 0.7, h * 0.1);
  c.strokeStyle = "#1a1714";
  c.lineWidth = 2;
  c.strokeRect(bx, h * 0.73, bw, h * 0.1);
  c.save();
  c.translate(w * 0.86, h * 0.5);
  c.rotate(-0.18);
  c.strokeStyle = "rgba(225,29,72,.8)";
  c.lineWidth = h * 0.025;
  c.strokeRect(-w * 0.08, -h * 0.1, w * 0.16, h * 0.2);
  c.fillStyle = "rgba(225,29,72,.85)";
  c.font = `900 ${Math.round(h * 0.13)}px ${DISPLAY}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("WIP", 0, h * 0.01);
  c.restore();
  c.textAlign = "left";
  paperFinish(c, w, h, 5);
}

function drawLocationNote(c, w, h, note) {
  // a little map card: the coast, the Kapuas river, and the equator running right through town
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, w, h);
  const mx = w * 0.08;
  const my = h * 0.44;
  const mw = w * 0.84;
  const mh = h * 0.34;
  c.fillStyle = "#a8ecff";
  c.fillRect(mx, my, mw, mh);
  c.fillStyle = "#8fd694";
  c.beginPath();
  c.moveTo(mx + mw * 0.3, my);
  c.bezierCurveTo(mx + mw * 0.2, my + mh * 0.4, mx + mw * 0.35, my + mh * 0.7, mx + mw * 0.25, my + mh);
  c.lineTo(mx + mw, my + mh);
  c.lineTo(mx + mw, my);
  c.closePath();
  c.fill();
  c.strokeStyle = "#3b82f6";
  c.lineWidth = h * 0.02;
  c.beginPath();
  c.moveTo(mx + mw * 0.3, my + mh * 0.55);
  c.bezierCurveTo(mx + mw * 0.55, my + mh * 0.45, mx + mw * 0.7, my + mh * 0.75, mx + mw, my + mh * 0.6);
  c.stroke();
  c.setLineDash([w * 0.03, w * 0.025]);
  c.strokeStyle = "#e11d48";
  c.lineWidth = h * 0.012;
  c.beginPath();
  c.moveTo(mx, my + mh * 0.3);
  c.lineTo(mx + mw, my + mh * 0.3);
  c.stroke();
  c.setLineDash([]);
  c.strokeStyle = "#1a1714";
  c.lineWidth = 2;
  c.strokeRect(mx, my, mw, mh);
  // the pin on town
  const px = mx + mw * 0.36;
  const py = my + mh * 0.3;
  c.fillStyle = "#d946ef";
  c.beginPath();
  c.arc(px, py - h * 0.05, h * 0.035, Math.PI, 0);
  c.lineTo(px, py);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#1a1714";
  c.textBaseline = "alphabetic";
  c.font = `700 ${Math.round(h * 0.05)}px ${BODY}`;
  c.fillText("0° EQUATOR", mx + mw * 0.45, my + mh * 0.25);
  // Below the pin, which sits at the top middle
  fitFont(c, note.title.toUpperCase(), 900, BODY, Math.round(h * 0.11), w * 0.84);
  c.fillText(note.title.toUpperCase(), w * 0.08, h * 0.37);
  c.font = `600 ${Math.round(h * 0.075)}px ${BODY}`;
  c.fillStyle = "rgba(26,23,20,.7)";
  c.fillText(note.body, w * 0.08, h * 0.9);
  paperFinish(c, w, h, 11);
}

function drawResumeNote(c, w, h, note) {
  // embossed label-maker tape
  c.fillStyle = PAPER_COLORS.resume;
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(255,255,255,.06)";
  for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1);
  c.fillStyle = "rgba(255,255,255,.12)";
  [w * 0.015, w * 0.975].forEach((x) => c.fillRect(x, 0, w * 0.01, h));
  c.textBaseline = "middle";
  fitFont(c, note.title.toUpperCase(), 900, BODY, Math.round(h * 0.44), w * 0.8);
  c.fillStyle = "rgba(0,0,0,.6)";
  c.fillText(note.title.toUpperCase(), w * 0.07 + 2, h * 0.55 + 2);
  c.fillStyle = "#f4f1ea";
  c.fillText(note.title.toUpperCase(), w * 0.07, h * 0.55);
}

export function drawAboutNote(c, w, h, note) {
  c.textAlign = "left";
  if (note.type === "stat") drawStatNote(c, w, h, note);
  else if (note.type === "stack") drawStackNote(c, w, h);
  else if (note.id === "who") drawWhoNote(c, w, h, note);
  else if (note.id === "now") drawNowNote(c, w, h, note);
  else if (note.id === "location") drawLocationNote(c, w, h, note);
  else if (note.id === "resume") drawResumeNote(c, w, h, note);
  else {
    c.fillStyle = "#fffdf5";
    c.fillRect(0, 0, w, h);
  }
  c.textBaseline = "alphabetic";
  return note.href ? [{ x: 0, y: 0, w, h, href: note.href }] : [];
}

// ---------- the file drawer's front panel, same as the 2D drawer ----------
export function drawDrawerFront(c, w, h, count) {
  c.fillStyle = "#ffdd00";
  c.fillRect(0, 0, w, h);
  // Label boxes sized to their text; the type shrinks until both fit side by side
  const left = `PROJECTS 01–${String(count).padStart(2, "0")}`;
  let size = h * 0.2;
  c.font = `800 ${size}px ${DISPLAY}`;
  const boxW = (big) => c.measureText(big).width + w * 0.05;
  const need = boxW(left) + boxW("SHIPPED");
  if (need > w * 0.86) size *= (w * 0.86) / need;
  const label = (x, small, big, fromRight = false) => {
    c.font = `800 ${size}px ${DISPLAY}`;
    const bw = boxW(big);
    if (fromRight) x = w - x - bw;
    brutalBox(c, x, h * 0.22, bw, h * 0.56, "#fffdf5", { shadow: 0, line: Math.max(4, h * 0.035) });
    c.fillStyle = "rgba(0,0,0,.6)";
    c.font = `700 ${Math.round(h * 0.11)}px ${BODY}`;
    c.textBaseline = "top";
    c.fillText(small, x + w * 0.025, h * 0.28);
    c.fillStyle = "#111";
    c.font = `800 ${size}px ${DISPLAY}`;
    c.fillText(big, x + w * 0.025, h * 0.44);
  };
  label(w * 0.04, "DRAWER A", left);
  label(w * 0.04, "STATUS", "SHIPPED", true);
  c.textBaseline = "alphabetic";
  c.lineWidth = Math.max(6, h * 0.05);
  c.strokeStyle = "#000";
  c.strokeRect(0, 0, w, h);
}

// ---------- desk top: light oak planks running the desk's length, flat grain, bold seams ----------
// Recycled messmate / Victorian ash, like a solid-timber standing desk: full-length boards in a
// warm honey tone, dense straight grain with darker streaks, and little black gum veins
export function drawWoodTop(c, w, h) {
  const boards = 5;
  const bh = h / boards;
  const tones = ["#cf9459", "#c4864c", "#d69f65", "#c98d52", "#d29a5f"];
  // A fixed seed, so the grain is the same every load
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < boards; i++) {
    const y = i * bh;
    c.fillStyle = tones[i % tones.length];
    c.fillRect(0, y, w, bh);
    // Broad bands of lighter and darker growth
    for (let b = 0; b < 4; b++) {
      const by = y + rand() * bh;
      const band = 8 + rand() * 26;
      c.fillStyle = rand() < 0.5 ? "rgba(120, 62, 22, 0.16)" : "rgba(255, 220, 170, 0.14)";
      c.beginPath();
      for (let x = 0; x <= w; x += 40) c.lineTo(x, by + Math.sin(x / 300 + b) * 4);
      for (let x = w; x >= 0; x -= 40) c.lineTo(x, by + band + Math.sin(x / 300 + b) * 4);
      c.fill();
    }
    // Dense, nearly straight grain lines that drift a little along the board
    for (let g = 0; g < 22; g++) {
      const gy = y + rand() * bh;
      const amp = 1 + rand() * 4;
      const len = 200 + rand() * 300;
      const phase = rand() * 10;
      c.strokeStyle = `rgba(${90 + rand() * 30}, ${44 + rand() * 20}, 14, ${0.12 + rand() * 0.28})`;
      c.lineWidth = 1 + rand() * 2.5;
      c.beginPath();
      for (let x = 0; x <= w; x += 20) c.lineTo(x, gy + Math.sin(x / len + phase) * amp);
      c.stroke();
    }
    // Gum veins: short, sharp black streaks along the grain
    for (let v = 0; v < 3; v++) {
      const vx = rand() * w;
      const vy = y + bh * (0.15 + rand() * 0.7);
      const len = 14 + rand() * (v === 0 ? 120 : 40);
      c.fillStyle = "rgba(28, 16, 8, 0.85)";
      c.beginPath();
      c.ellipse(vx, vy, len, 1.5 + rand() * 2.5, 0, 0, Math.PI * 2);
      c.fill();
    }
    // The glue line between boards
    c.fillStyle = "rgba(70, 36, 12, 0.45)";
    c.fillRect(0, y, w, 2);
  }
}

// ---------- desk mat under the keyboard and mouse ----------
// Plain charcoal felt with a faint dot grid
// The desk mat: deep navy felt (clear of the black keyboard on it) with a faint dot grid,
// a stitched edge, and a few rolling waves printed across its right-hand corner
export function drawDeskMat(c, w, h) {
  c.fillStyle = "#2b3a5c";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(255,255,255,.07)";
  for (let y = 24; y < h; y += 32) for (let x = 24; x < w; x += 32) c.fillRect(x, y, 3, 3);
  // waves, curling in from the bottom-right corner
  c.lineWidth = 6;
  c.lineCap = "round";
  [["#3f5583", 0], ["#4f6aa0", 1], ["#7fb2ff", 2]].forEach(([color, k]) => {
    c.strokeStyle = color;
    c.beginPath();
    const y0 = h * (0.62 + k * 0.12);
    c.moveTo(w * 0.62, y0 + 30);
    for (let x = w * 0.62; x <= w; x += 60) {
      c.quadraticCurveTo(x + 15, y0 - 26, x + 30, y0);
      c.quadraticCurveTo(x + 45, y0 + 26, x + 60, y0);
    }
    c.stroke();
  });
  // a little wordmark in the top-left
  c.fillStyle = "rgba(255,253,245,.35)";
  c.font = "900 26px 'Lexend Mega', sans-serif";
  c.textBaseline = "top";
  c.fillText("OKA · DESK", 40, 34);
  // the stitched edge
  c.strokeStyle = "rgba(255,253,245,.45)";
  c.lineWidth = 3;
  c.setLineDash([14, 9]);
  c.strokeRect(14, 14, w - 28, h - 28);
  c.setLineDash([]);
}

// ---------- room details: the clock face, the guitar's top, straw, the chair's quilting ----------
// The wall clock's dial: bold hour bars and four numerals
export function drawClockFace(c, w, h) {
  const cx = w / 2;
  const r = w / 2;
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i += 5) {
    const a = (i / 60) * Math.PI * 2;
    const inner = r * 0.78;
    c.strokeStyle = "#1a1714";
    c.lineWidth = r * 0.035;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(cx + Math.sin(a) * inner, cx - Math.cos(a) * inner);
    c.lineTo(cx + Math.sin(a) * r * 0.92, cx - Math.cos(a) * r * 0.92);
    c.stroke();
  }
  c.fillStyle = "#1a1714";
  c.font = `900 ${Math.round(r * 0.2)}px ${DISPLAY}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  [["12", 0], ["3", 90], ["6", 180], ["9", 270]].forEach(([n, deg]) => {
    const a = (deg * Math.PI) / 180;
    c.fillText(n, cx + Math.sin(a) * r * 0.6, cx - Math.cos(a) * r * 0.6 + r * 0.01);
  });
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
}

// The guitar's top, laid out in the body outline's own units (x -1..1 across, y -0.95..1.92),
// in the room's neo-brutalist style: one flat colour, a faint halftone, a teal pickguard,
// thick black and white rings round the soundhole, and a few stickers with hard shadows
export function drawGuitarTop(c, w, h, { halfWidth = null } = {}) {
  const toX = (x) => ((x + 1) / 2) * w;
  const toY = (y) => (1 - (y + 0.95) / 2.87) * h;
  const ux = w / 2;
  const line = w * 0.018;
  let seed = 3907;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // A natural spruce top, warm but quiet next to the room's brights
  c.fillStyle = "#e6c38f";
  c.fillRect(0, 0, w, h);
  // its grain: fine straight lines running the length of the top, a little uneven in weight
  // and spacing, each wavering faintly
  for (let x = 0; x < w; x += 3 + rand() * 5) {
    c.strokeStyle = `rgba(150,95,40,${0.08 + rand() * 0.14})`;
    c.lineWidth = 0.6 + rand() * 1.2;
    const sway = rand() * 2;
    c.beginPath();
    c.moveTo(x, 0);
    c.bezierCurveTo(x + sway, h * 0.33, x - sway, h * 0.66, x + sway * 0.5, h);
    c.stroke();
  }
  // a soft sunburst: the lower bout's middle stays pale, its edges warming to amber
  const burst = c.createRadialGradient(toX(0), toY(0.1), ux * 0.35, toX(0), toY(0.4), ux * 1.25);
  burst.addColorStop(0, "rgba(160,80,20,0)");
  burst.addColorStop(0.7, "rgba(160,80,20,.12)");
  burst.addColorStop(1, "rgba(110,50,10,.42)");
  c.fillStyle = burst;
  c.fillRect(0, 0, w, h);
  // halftone dots, heavier toward the lower edge
  for (let y = 0; y < h; y += w * 0.035) {
    for (let x = (Math.round(y / (w * 0.035)) % 2) * w * 0.0175; x < w; x += w * 0.035) {
      const k = Math.max(0, (y / h - 0.55) / 0.45);
      if (!k) continue;
      c.fillStyle = "rgba(150,95,40,.3)";
      c.beginPath();
      c.arc(x, y, w * 0.007 * k, 0, Math.PI * 2);
      c.fill();
    }
  }
  // the pickguard: a dark tortoise crescent tucked against the rosette's lower right, its inner edge
  // following the ring and its outer edge sweeping round toward the waist
  const cx = toX(0);
  const cy = toY(1.15);
  const ringR = 0.5 * ux;
  c.beginPath();
  c.arc(cx, cy, ringR, 1.9, -0.25, true);
  c.bezierCurveTo(toX(0.78), toY(1.12), toX(0.86), toY(0.78), toX(0.6), toY(0.6));
  c.bezierCurveTo(toX(0.4), toY(0.48), toX(0.02), toY(0.52), cx + Math.cos(1.9) * ringR, cy + Math.sin(1.9) * ringR);
  c.closePath();
  c.fillStyle = "#4a2f1f";
  c.fill();
  c.lineWidth = line * 0.8;
  c.strokeStyle = "#000";
  c.stroke();
  // tortoiseshell: warm amber flecks through the dark, kept inside the guard
  c.save();
  c.clip();
  for (let i = 0; i < 40; i++) {
    c.fillStyle = rand() < 0.5 ? "rgba(180,95,30,.35)" : "rgba(20,10,5,.35)";
    c.beginPath();
    c.ellipse(toX(0.1 + rand() * 0.8), toY(0.5 + rand() * 0.7), ux * (0.02 + rand() * 0.05), ux * (0.01 + rand() * 0.03), rand() * Math.PI, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  // binding round the edge: a cream band just inside the outline with a fine dark purfling
  // line inside it
  if (halfWidth) {
    const trace = (inset) => {
      c.beginPath();
      const ys = Array.from({ length: 121 }, (_, k) => -0.95 + (k / 120) * 2.87);
      ys.forEach((y, k) => (k ? c.lineTo(toX(halfWidth(y) - inset), toY(y)) : c.moveTo(toX(halfWidth(y) - inset), toY(y))));
      [...ys].reverse().forEach((y) => c.lineTo(toX(-halfWidth(y) + inset), toY(y)));
      c.closePath();
    };
    trace(0.03);
    c.strokeStyle = "#fffdf5";
    c.lineWidth = ux * 0.05;
    c.stroke();
    trace(0.065);
    c.strokeStyle = "rgba(40,20,10,.7)";
    c.lineWidth = ux * 0.012;
    c.stroke();
  }
  // rosette: black, white, black
  [[0.5, "#1a1714", 0.09], [0.43, "#fffdf5", 0.05], [0.38, "#1a1714", 0.03]].forEach(([r, color, t]) => {
    c.strokeStyle = color;
    c.lineWidth = t * ux;
    c.beginPath();
    c.ellipse(toX(0), toY(1.15), r * ux, (r / 2.87) * 2 * h / 2, 0, 0, Math.PI * 2);
    c.stroke();
  });
  // stickers
  const sticker = (x, y, turn, path, fill, label) => {
    c.save();
    c.translate(toX(x), toY(y));
    c.rotate(turn);
    c.translate(line * 0.8, line * 0.8);
    path();
    c.fillStyle = "#000";
    c.fill();
    c.translate(-line * 0.8, -line * 0.8);
    path();
    c.fillStyle = fill;
    c.fill();
    c.lineWidth = line * 0.6;
    c.strokeStyle = "#000";
    c.stroke();
    if (label) {
      c.fillStyle = "#000";
      c.font = `900 ${Math.round(ux * 0.13)}px 'Lexend Mega', sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(label, 0, ux * 0.01);
    }
    c.restore();
  };
  const r = ux * 0.15;
  sticker(-0.5, 0.1, -0.25, () => {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      if (i) c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
  }, "#ff90e8");
  sticker(0.15, -0.45, 0.12, () => {
    c.beginPath();
    c.roundRect(-r * 1.5, -r * 0.75, r * 3, r * 1.5, r * 0.5);
  }, "#00e0c6", "</>");
  sticker(-0.42, 1.55, 0.3, () => {
    c.beginPath();
    c.moveTo(r * 0.25, -r);
    c.lineTo(-r * 0.6, r * 0.15);
    c.lineTo(-r * 0.05, r * 0.15);
    c.lineTo(-r * 0.3, r);
    c.lineTo(r * 0.65, -r * 0.2);
    c.lineTo(r * 0.05, -r * 0.2);
    c.closePath();
  }, "#ff6b6b");
}

// The room's painted walls: a faint dot grid (the same grid as the site's loading screen) over a
// soft paint-roller grain, both low enough to stay a texture, not a pattern. Tiles seamlessly.
export function drawWallPaint(c, w, h) {
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, w, h);
  let r = 7331;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  // roller grain: short soft streaks running up and down, a shade either way of the paint
  for (let i = 0; i < (w * h) / 40; i++) {
    c.fillStyle = rand() < 0.5 ? "rgba(26,23,20,.04)" : "rgba(255,255,255,.6)";
    const x = rand() * w;
    const y = rand() * h;
    c.fillRect(x, y, 1 + rand() * 1.5, 3 + rand() * 9);
  }
  // roller laps: two broad, barely-there bands where the paint went on a touch thicker
  [0.18, 0.66].forEach((k) => {
    const lap = c.createLinearGradient(w * k, 0, w * (k + 0.22), 0);
    lap.addColorStop(0, "rgba(26,23,20,0)");
    lap.addColorStop(0.5, "rgba(26,23,20,.018)");
    lap.addColorStop(1, "rgba(26,23,20,0)");
    c.fillStyle = lap;
    c.fillRect(0, 0, w, h);
  });
  // the dot grid
  const step = w / 6;
  c.fillStyle = "rgba(26,23,20,.16)";
  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      c.beginPath();
      c.arc(x, y, w * 0.011, 0, Math.PI * 2);
      c.fill();
    }
  }
}

// Soft fur, as a light grey map the fur colours multiply with: short strokes a touch lighter
// and darker, all leaning the same way like brushed fur. Tiles seamlessly.
export function drawFur(c, w, h) {
  c.fillStyle = "#eeeeee";
  c.fillRect(0, 0, w, h);
  let r = 5167;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  c.lineCap = "round";
  for (let i = 0; i < (w * h) / 18; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const len = 3 + rand() * 6;
    c.strokeStyle = rand() < 0.5 ? "rgba(255,255,255,.7)" : "rgba(150,150,150,.35)";
    c.lineWidth = 1 + rand();
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + len * 0.35, y + len);
    c.stroke();
  }
}

// Woven straw: rows of plaited strands, each a little lighter in the middle
export function drawStraw(c, w, h) {
  c.fillStyle = "#e9b543";
  c.fillRect(0, 0, w, h);
  const row = h / 16;
  for (let r = 0; r < 16; r++) {
    for (let x = (r % 2) * 12; x < w; x += 24) {
      const g = c.createLinearGradient(x, r * row, x + 22, r * row + row);
      g.addColorStop(0, "#d79f2e");
      g.addColorStop(0.5, "#f8d06b");
      g.addColorStop(1, "#c98e24");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x, r * row + row * 0.15);
      c.lineTo(x + 22, r * row + row * 0.5);
      c.lineTo(x, r * row + row * 0.85);
      c.closePath();
      c.fill();
    }
    c.fillStyle = "rgba(120,70,10,.35)";
    c.fillRect(0, r * row, w, 1.5);
  }
}

// The chair's carbon-weave edging: a fine, low-contrast twill of small tiles of alternating
// sheen that repeat seamlessly
export function drawCarbonWeave(c, w, h) {
  c.fillStyle = "#2a2725";
  c.fillRect(0, 0, w, h);
  const n = 4;
  const s = w / n;
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      // each tile's strands run across or down, alternating like a twill
      const across = (row + col) % 2 === 0;
      const sheen = c.createLinearGradient(col * s, row * s, across ? col * s : (col + 1) * s, across ? (row + 1) * s : row * s);
      sheen.addColorStop(0, "#322e2c");
      sheen.addColorStop(0.5, "#423d3a");
      sheen.addColorStop(1, "#322e2c");
      c.fillStyle = sheen;
      c.fillRect(col * s + 1, row * s + 1, s - 2, s - 2);
    }
  }
}

// Brushed metal, as a light tile its material tints: fine streaks drawn across in slightly
// different greys, with a broad soft sheen through the middle. Tiles across.
export function drawBrushedMetal(c, w, h) {
  let r = 6151;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  c.fillStyle = "#c8c8c8";
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < h * 3; i++) {
    const tone = 170 + Math.floor(rand() * 85);
    c.fillStyle = `rgba(${tone},${tone},${tone},.5)`;
    c.fillRect(rand() * w - w * 0.5, rand() * h, w * (0.3 + rand() * 0.9), 0.6 + rand() * 0.8);
  }
  const sheen = c.createLinearGradient(0, 0, 0, h);
  sheen.addColorStop(0, "rgba(255,255,255,0)");
  sheen.addColorStop(0.5, "rgba(255,255,255,.18)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = sheen;
  c.fillRect(0, 0, w, h);
}

// A satin-painted cabinet, as a light tile its material tints: a fine even stipple with a
// faint grain running along it, so a flat panel reads as a finished surface. Tiles both ways.
export function drawSatinFinish(c, w, h, { grain = 0.06 } = {}) {
  let r = 2713;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  c.fillStyle = "#d4d4d4";
  c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) {
    c.fillStyle = `rgba(${rand() < 0.5 ? "255,255,255" : "0,0,0"},${rand() * grain})`;
    c.fillRect(0, y, w, 1 + rand());
  }
  for (let i = 0; i < (w * h) / 6; i++) {
    c.fillStyle = rand() < 0.5 ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.14)";
    c.fillRect(rand() * w, rand() * h, 1, 1);
  }
}

// A speaker cone's surface on its lathe's uv (up the canvas is from the rim in to the centre):
// pressed concentric ribs, and fine fibres radiating out through the paper
export function drawConeRibs(c, w, h) {
  let r = 811;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  c.fillStyle = "#e4e4e4";
  c.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 1.5) {
    c.fillStyle = `rgba(${rand() < 0.5 ? "255,255,255" : "0,0,0"},${rand() * 0.12})`;
    c.fillRect(x, 0, 1, h);
  }
  for (let k = 1; k < 6; k++) {
    const y = h * (0.22 + k * 0.11);
    c.fillStyle = "rgba(0,0,0,.22)";
    c.fillRect(0, y, w, h * 0.025);
    c.fillStyle = "rgba(255,255,255,.3)";
    c.fillRect(0, y + h * 0.025, w, h * 0.02);
  }
}

// The chair's leatherette, as a light tile the leather's colour tints dark: soft mottling, then
// a pebbled grain of small rounded cells, each lit a little on top and creased dark round its
// edge, tiling seamlessly. `perforated` adds the staggered rows of tiny breathing holes the
// centre panel has.
export function drawLeatherGrain(c, w, h, { perforated = false } = {}) {
  let r = 9241;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  // every mark is drawn again across each edge it crosses, so the tile repeats without seams
  const wrapped = (x, y, reach, draw) => {
    for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) if (Math.abs(x + dx - w / 2) < w / 2 + reach && Math.abs(y + dy - h / 2) < h / 2 + reach) draw(x + dx, y + dy);
  };
  c.fillStyle = "#969696";
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const size = w * (0.1 + rand() * 0.18);
    const tone = rand() < 0.5 ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)";
    wrapped(x, y, size, (px, py) => {
      const g = c.createRadialGradient(px, py, 0, px, py, size);
      g.addColorStop(0, tone);
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g;
      c.fillRect(px - size, py - size, size * 2, size * 2);
    });
  }
  const cells = Math.round((w * h) / 70);
  for (let i = 0; i < cells; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const rx = w * (0.012 + rand() * 0.014);
    const ry = rx * (0.7 + rand() * 0.5);
    const turn = rand() * Math.PI;
    const light = 215 + Math.floor(rand() * 40);
    wrapped(x, y, rx * 1.5, (px, py) => {
      const g = c.createRadialGradient(px - rx * 0.25, py - ry * 0.3, 0, px, py, Math.max(rx, ry));
      g.addColorStop(0, `rgb(${light},${light},${light})`);
      g.addColorStop(0.75, `rgb(${light - 40},${light - 40},${light - 40})`);
      g.addColorStop(1, "rgba(150,150,150,0)");
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(px, py, rx, ry, turn, 0, Math.PI * 2);
      c.fill();
    });
  }
  // a few longer fine creases, as the leather has where it flexes
  c.lineCap = "round";
  for (let i = 0; i < 14; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const len = w * (0.05 + rand() * 0.1);
    const a = rand() * Math.PI;
    c.strokeStyle = "rgba(70,70,70,.55)";
    c.lineWidth = 0.8 + rand() * 0.6;
    wrapped(x, y, len, (px, py) => {
      c.beginPath();
      c.moveTo(px, py);
      c.quadraticCurveTo(px + Math.cos(a + 0.4) * len * 0.5, py + Math.sin(a + 0.4) * len * 0.5, px + Math.cos(a) * len, py + Math.sin(a) * len);
      c.stroke();
    });
  }
  if (!perforated) return;
  const pitch = w / 12;
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 12; col++) {
      const x = (col + (row % 2) * 0.5 + 0.25) * pitch;
      const y = (row + 0.5) * pitch;
      c.fillStyle = "rgba(255,255,255,.5)";
      c.beginPath();
      c.arc(x + 0.6, y + 0.8, pitch * 0.17, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#3a3a3a";
      c.beginPath();
      c.arc(x, y, pitch * 0.15, 0, Math.PI * 2);
      c.fill();
    }
  }
}

// A plant leaf, laid out on its own uv: across the canvas is across the blade, edge to edge at
// every height, and up the canvas is from its base to its tip. Darker at the base and lighter
// toward the tip and the margins, with a pale midrib and a few faint side veins arching out
// toward the edge.
export function drawPlantLeaf(c, w, h, { base = "#15803d", tip = "#4ade80", vein = "#bbf7d0" } = {}) {
  const along = c.createLinearGradient(0, h, 0, 0);
  along.addColorStop(0, base);
  along.addColorStop(1, tip);
  c.fillStyle = along;
  c.fillRect(0, 0, w, h);
  const across = c.createLinearGradient(0, 0, w, 0);
  across.addColorStop(0, "rgba(255,255,255,.16)");
  across.addColorStop(0.2, "rgba(255,255,255,0)");
  across.addColorStop(0.45, "rgba(0,0,0,.1)");
  across.addColorStop(0.55, "rgba(0,0,0,.1)");
  across.addColorStop(0.8, "rgba(255,255,255,0)");
  across.addColorStop(1, "rgba(255,255,255,.16)");
  c.fillStyle = across;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = vein;
  c.lineCap = "round";
  // side veins, from the midrib up and out, thinning toward the edge
  for (let k = 0; k < 4; k++) {
    const y = h * (0.8 - k * 0.17);
    const rise = h * (0.1 + k * 0.006);
    for (const side of [-1, 1]) {
      c.globalAlpha = 0.3;
      c.lineWidth = 2 - k * 0.2;
      c.beginPath();
      c.moveTo(w / 2, y);
      c.quadraticCurveTo(w / 2 + side * w * 0.22, y - rise * 0.35, w / 2 + side * w * 0.43, y - rise);
      c.stroke();
    }
  }
  c.globalAlpha = 1;
  // the midrib, broad at the base and tapering to the tip
  c.fillStyle = vein;
  c.beginPath();
  c.moveTo(w / 2 - 4, h);
  c.lineTo(w / 2 + 4, h);
  c.lineTo(w / 2 + 0.8, 0);
  c.lineTo(w / 2 - 0.8, 0);
  c.closePath();
  c.fill();
}

// A glazed terracotta pot on a lathe's uv: speckled clay all over; up its outer wall (between
// `wall`'s two heights, 0 at the foot) the faint rings left by the wheel and a darker
// water-stain band near the foot; its rim's face (`rim`) a touch lighter.
export function drawTerracotta(c, w, h, { base = "#ff7a1a", wall = [0, 1], rim = null } = {}) {
  let r = 7331;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const y = (v) => h * (1 - v);
  c.fillStyle = base;
  c.fillRect(0, 0, w, h);
  const [w0, w1] = wall;
  const stain = c.createLinearGradient(0, y(w0), 0, y(w0 + (w1 - w0) * 0.35));
  stain.addColorStop(0, "rgba(90,30,0,.28)");
  stain.addColorStop(1, "rgba(90,30,0,0)");
  c.fillStyle = stain;
  c.fillRect(0, y(w1), w, y(w0) - y(w1));
  // a soft glaze sheen down the upper wall
  const sheen = c.createLinearGradient(0, y(w0), 0, y(w1));
  sheen.addColorStop(0.55, "rgba(255,255,255,0)");
  sheen.addColorStop(0.85, "rgba(255,230,200,.14)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = sheen;
  c.fillRect(0, y(w1), w, y(w0) - y(w1));
  for (let k = 1; k < 9; k++) {
    const ring = y(w0 + ((w1 - w0) * k) / 9 + (rand() - 0.5) * 0.004);
    c.fillStyle = k % 2 ? "rgba(120,40,0,.07)" : "rgba(255,220,180,.06)";
    c.fillRect(0, ring, w, 1.5);
  }
  if (rim) {
    c.fillStyle = "rgba(255,235,210,.14)";
    c.fillRect(0, y(rim[1]), w, y(rim[0]) - y(rim[1]));
    c.fillStyle = "rgba(90,30,0,.25)";
    c.fillRect(0, y(rim[0]) - 2, w, 2);
  }
  for (let i = 0; i < (w * h) / 180; i++) {
    const dark = rand() < 0.6;
    c.fillStyle = dark ? `rgba(110,40,0,${0.15 + rand() * 0.25})` : `rgba(255,236,210,${0.2 + rand() * 0.3})`;
    c.fillRect(rand() * w, rand() * h, 1 + rand() * 1.4, 1 + rand() * 1.4);
  }
}

// The chair's small embroidered badge: a gold-rimmed hexagon with a four-pointed star in it,
// edged in dark so it reads on black leather
export function drawChairCrest(c, w, h, { gold = "#d4a72c" } = {}) {
  c.clearRect(0, 0, w, h);
  const hex = (r) => {
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      c.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
    }
    c.closePath();
  };
  hex(w * 0.46);
  c.fillStyle = "#1a1714";
  c.fill();
  hex(w * 0.4);
  c.fillStyle = gold;
  c.fill();
  hex(w * 0.32);
  c.fillStyle = "#1f1d1c";
  c.fill();
  const r = w * 0.22;
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const k = i % 2 ? 0.3 : 1;
    c.lineTo(w / 2 + Math.cos(a) * r * k, h / 2 + Math.sin(a) * r * k);
  }
  c.closePath();
  c.fillStyle = gold;
  c.fill();
}

// ---------- floor: wood planks that tile seamlessly in both directions ----------
export function drawWoodFloor(c, w, h) {
  const rows = 8;
  const rh = h / rows;
  const tones = ["#c98d55", "#bf834c", "#d29a62", "#c48851"];
  for (let i = 0; i < rows; i++) {
    const y = i * rh;
    c.fillStyle = tones[i % tones.length];
    c.fillRect(0, y, w, rh);
    // Grain whose waves repeat a whole number of times across the tile, so it wraps cleanly
    c.strokeStyle = "rgba(110, 60, 22, 0.2)";
    c.lineWidth = 3;
    for (let g = 0; g < 4; g++) {
      const gy = y + rh * (0.2 + g * 0.2);
      c.beginPath();
      for (let x = 0; x <= w; x += 16) c.lineTo(x, gy + Math.sin(((x / w) * (2 + g) + i * 0.3) * Math.PI * 2) * 4);
      c.stroke();
    }
    // Two plank ends per row, staggered from row to row
    c.fillStyle = "rgba(55, 30, 10, 0.6)";
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
  const ink = (path, fill) => {
    c.fillStyle = fill;
    c.fill(path);
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
    c.lineWidth = Math.max(4, w / 150);
    c.strokeStyle = "#30283a";
    c.stroke(path);
  };
  if (art === 1) drawNightCity(c, w, h, ink);
  else if (art === 2) drawWave(c, w, h, ink);
  else drawSunset(c, w, h, ink);
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

// A city at night: moon, stars, a skyline with lit windows over the river
function drawNightCity(c, w, h, ink) {
  c.fillStyle = "#1e2a5a";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#26356b";
  c.fillRect(0, h * 0.4, w, h * 0.3);
  c.fillStyle = "#fffdf5";
  [[0.1, 0.12], [0.25, 0.22], [0.4, 0.09], [0.6, 0.18], [0.92, 0.3], [0.52, 0.3], [0.16, 0.34]].forEach(([x, y]) => c.fillRect(w * x, h * y, w * 0.01, w * 0.01));
  const moon = new Path2D();
  moon.arc(w * 0.8, h * 0.2, h * 0.11, 0, Math.PI * 2);
  ink(moon, "#ffdd00");
  c.fillStyle = "#1e2a5a";
  c.beginPath();
  c.arc(w * 0.84, h * 0.17, h * 0.1, 0, Math.PI * 2);
  c.fill();
  const towers = [[0.04, 0.5, 0.1, "#7fb2ff"], [0.15, 0.36, 0.09, "#ff90e8"], [0.25, 0.56, 0.08, "#00e0c6"], [0.34, 0.28, 0.11, "#ffb35c"],
    [0.46, 0.48, 0.09, "#c4b5fd"], [0.56, 0.4, 0.1, "#ff6b6b"], [0.67, 0.54, 0.08, "#8fd694"], [0.76, 0.44, 0.1, "#7fb2ff"], [0.87, 0.58, 0.1, "#ff90e8"]];
  towers.forEach(([x, top, bw, color], i) => {
    const tower = new Path2D();
    tower.rect(w * x, h * top, w * bw, h * (0.8 - top));
    ink(tower, color);
    c.fillStyle = "#ffdd00";
    for (let wy = top + 0.05; wy < 0.74; wy += 0.07) {
      for (let wx = 0; wx < 3; wx++) if ((i + wx + Math.round(wy * 20)) % 3) c.fillRect(w * (x + 0.015 + wx * bw * 0.3), h * wy, w * bw * 0.16, h * 0.035);
    }
  });
  const river = new Path2D();
  river.rect(-10, h * 0.8, w + 20, h * 0.25);
  ink(river, "#172554");
  c.fillStyle = "#ffdd00";
  for (let i = 0; i < 6; i++) c.fillRect(w * (0.08 + i * 0.15), h * (0.86 + (i % 2) * 0.04), w * 0.06, h * 0.012);
}

// A neo-brutalist great wave: a curling crest with foam claws, a small mountain far behind
function drawWave(c, w, h, ink) {
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#ffdd00";
  c.fillRect(0, 0, w, h * 0.45);
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
  ink(sea, "#3b82f6");
  // The big wave rising from the left and curling over to the right
  const wave = new Path2D();
  wave.moveTo(-10, h);
  wave.lineTo(-10, h * 0.55);
  wave.bezierCurveTo(w * 0.05, h * 0.2, w * 0.4, h * 0.1, w * 0.5, h * 0.3);
  wave.bezierCurveTo(w * 0.42, h * 0.24, w * 0.32, h * 0.3, w * 0.36, h * 0.42);
  wave.bezierCurveTo(w * 0.42, h * 0.58, w * 0.55, h * 0.75, w * 0.62, h);
  wave.closePath();
  ink(wave, "#1e40af");
  const inner = new Path2D();
  inner.moveTo(w * 0.04, h);
  inner.bezierCurveTo(w * 0.02, h * 0.6, w * 0.18, h * 0.38, w * 0.3, h * 0.36);
  inner.bezierCurveTo(w * 0.24, h * 0.5, w * 0.36, h * 0.8, w * 0.42, h);
  inner.closePath();
  ink(inner, "#00e0c6");
  // foam claws along the crest
  c.fillStyle = "#fffdf5";
  c.strokeStyle = "#000";
  c.lineWidth = Math.max(4, w / 140);
  [[0.38, 0.17], [0.43, 0.2], [0.47, 0.25], [0.3, 0.16], [0.22, 0.2], [0.5, 0.31]].forEach(([x, y], i) => {
    c.beginPath();
    c.arc(w * x, h * y, h * (0.035 - (i % 2) * 0.01), 0, Math.PI * 2);
    c.fill();
    c.stroke();
  });
  // small waves in the foreground
  for (let i = 0; i < 5; i++) {
    const small = new Path2D();
    const x = w * (0.55 + i * 0.1);
    small.moveTo(x - w * 0.05, h * 0.9);
    small.quadraticCurveTo(x, h * 0.8, x + w * 0.05, h * 0.9);
    small.closePath();
    ink(small, "#7fb2ff");
  }
}

function drawSunset(c, w, h, ink) {
  // sky bands
  [["#ff90e8", 0], ["#ffb35c", 0.28], ["#ffdd00", 0.46]].forEach(([color, y]) => {
    c.fillStyle = color;
    c.fillRect(0, h * y, w, h);
  });
  // stars and a ringed planet
  c.fillStyle = "#fffdf5";
  [[0.08, 0.1], [0.2, 0.2], [0.36, 0.08], [0.55, 0.16], [0.9, 0.1], [0.78, 0.24]].forEach(([x, y]) => {
    c.fillRect(w * x, h * y, w * 0.012, w * 0.012);
  });
  const planet = new Path2D();
  planet.arc(w * 0.82, h * 0.2, h * 0.08, 0, Math.PI * 2);
  ink(planet, "#7fb2ff");
  c.save();
  c.translate(w * 0.82, h * 0.2);
  c.rotate(-0.35);
  c.lineWidth = Math.max(5, w / 110);
  c.strokeStyle = "#000";
  c.beginPath();
  c.ellipse(0, 0, h * 0.15, h * 0.035, 0, 0, Math.PI * 2);
  c.stroke();
  c.restore();
  // big sun, half behind the hills
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
  };
  hill([[0, 0.7], [0.18, 0.55], [0.34, 0.68], [0.52, 0.5], [0.72, 0.66], [0.88, 0.56], [1, 0.62]], "#00e0c6");
  hill([[0, 0.82], [0.22, 0.7], [0.45, 0.8], [0.66, 0.72], [0.84, 0.8], [1, 0.74]], "#3b82f6");
  hill([[0, 0.92], [0.3, 0.84], [0.55, 0.9], [0.8, 0.83], [1, 0.9]], "#8fd694");
  // a tiny house with a lit window
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

// ---------- sticky notes (monitor bezel) ----------
export function drawStickyNote(c, w, h, { text, color = "#ffdd00", tick = false } = {}) {
  c.fillStyle = color;
  c.fillRect(0, 0, w, h);
  // a darker strip where the glue is
  c.fillStyle = "rgba(0,0,0,.08)";
  c.fillRect(0, 0, w, h * 0.16);
  c.fillStyle = "#1a1714";
  c.font = `600 ${Math.round(h * 0.17)}px 'Caveat', cursive`;
  c.textBaseline = "top";
  wrap(c, text, w * 0.84, 4).forEach((line, i) => c.fillText(line, w * 0.08, h * 0.24 + i * h * 0.18));
  if (tick) {
    c.strokeStyle = "#16a34a";
    c.lineWidth = h * 0.035;
    c.beginPath();
    c.moveTo(w * 0.66, h * 0.8);
    c.lineTo(w * 0.74, h * 0.88);
    c.lineTo(w * 0.9, h * 0.68);
    c.stroke();
  }
  c.lineWidth = Math.max(4, w / 60);
  c.strokeStyle = "#000";
  c.strokeRect(2, 2, w - 4, h - 4);
  c.textBaseline = "alphabetic";
}

// ---------- keycap labels (the shortcut keys) ----------
// Legends in the Halo75's manner: a clean, medium-weight sans, small and light on the cap.
// `ink` is the legend's colour; `small` sets word legends (ENTER, F1) smaller than single
// glyphs; `shift` stacks the shifted symbol above the key's own (! over 1); `homing` adds the
// little bar the F and J keys carry. A null `color` draws the legend alone on a clear canvas
export function drawKeyLabel(c, w, h, label, color = "#fff", { ink = "#000", small = false, shift = null, homing = null } = {}) {
  // No `color` leaves the canvas clear, so the legend prints straight onto the cap below it
  c.clearRect(0, 0, w, h);
  if (color) {
    c.fillStyle = color;
    c.fillRect(0, 0, w, h);
  }
  c.fillStyle = ink;
  c.textAlign = "center";
  c.textBaseline = "middle";
  if (shift) {
    fitFont(c, shift, 500, BODY, Math.round(h * 0.3), w - 18);
    c.fillText(shift, w / 2, h * 0.3);
    fitFont(c, label, 500, BODY, Math.round(h * 0.3), w - 18);
    c.fillText(label, w / 2, h * 0.68);
  } else {
    fitFont(c, label, 500, BODY, Math.round(h * (small ? 0.24 : 0.4)), w - 20);
    c.fillText(label, w / 2, h / 2 + 2);
  }
  if (homing) {
    c.fillStyle = homing;
    c.fillRect(w / 2 - w * 0.14, h * 0.82, w * 0.28, h * 0.05);
  }
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
}

// ---------- speech bubble over the mug: a quote per sip ----------
export const SIP_QUOTES = [
  { text: "First, solve the problem. Then, write the code.", by: "John Johnson" },
  { text: "Simplicity is prerequisite for reliability.", by: "Edsger W. Dijkstra" },
  { text: "Make it work, make it right, make it fast.", by: "Kent Beck" },
  { text: "Talk is cheap. Show me the code.", by: "Linus Torvalds" },
  { text: "Code is like humor. When you have to explain it, it's bad.", by: "Cory House" },
  { text: "Programs must be written for people to read.", by: "Harold Abelson" },
  { text: "It works on my machine. Ship the machine?", by: "every dev ever" },
  { text: "Coffee in, features out.", by: "oka" },
  { text: "One more sip, one less bug.", by: "oka" },
];
// A plain manga speech balloon: a white oval with a thin ink line and a short triangular tail
// Where a manga bubble's tail goes, and the oval that leaves room for it in the canvas: the tail
// leaves the oval at `angle` (canvas angles: 0 is right, π/2 is down) and its tip lands at
// `tip`, as fractions of the canvas
export const BUBBLE_TAILS = {
  right: { oval: [0.5, 0.42, 0.46, 0.36], angle: 0.32 * Math.PI, tip: [0.72, 0.91] },
  left: { oval: [0.5, 0.42, 0.46, 0.36], angle: 0.68 * Math.PI, tip: [0.28, 0.91] },
  "up-right": { oval: [0.5, 0.58, 0.46, 0.36], angle: -0.32 * Math.PI, tip: [0.72, 0.09] },
  "up-left": { oval: [0.5, 0.58, 0.46, 0.36], angle: -0.68 * Math.PI, tip: [0.28, 0.09] },
  "down-left": { oval: [0.53, 0.41, 0.4, 0.35], angle: 0.7 * Math.PI, tip: [0.24, 0.81] },
  "side-left": { oval: [0.56, 0.5, 0.4, 0.42], angle: Math.PI, tip: [0.03, 0.5] },
  "side-right": { oval: [0.44, 0.5, 0.4, 0.42], angle: 0, tip: [0.97, 0.5] },
};
// `by`: the attribution's size as a share of the quote's
function drawMangaBubble(c, w, h, quote, size, tailSide, by = 0.75) {
  const shape = BUBBLE_TAILS[tailSide] || BUBBLE_TAILS.right;
  const cx = w * shape.oval[0];
  const cy = h * shape.oval[1];
  const rx = w * shape.oval[2];
  const ry = h * shape.oval[3];
  // Leave a gap in the oval for a short, straight-sided tail, as in a manga balloon.
  const spread = 0.09;
  const a0 = shape.angle - spread;
  const a1 = shape.angle + spread;
  c.beginPath();
  c.ellipse(cx, cy, rx, ry, 0, a1, a0 + Math.PI * 2);
  c.lineTo(w * shape.tip[0], h * shape.tip[1]);
  c.lineTo(cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry);
  c.closePath();
  c.fillStyle = "#fff";
  c.fill();
  c.lineWidth = 4;
  c.lineJoin = "round";
  c.strokeStyle = "#000";
  c.stroke();
  const lead = size * 1.2;
  c.font = `italic 700 ${size}px ${BODY}`;
  const lines = wrap(c, quote.text.toUpperCase(), rx * 1.45, 4);
  const byH = size * by * 1.2;
  const top = cy - (lines.length * lead + byH) / 2 + lead / 2;
  c.fillStyle = "#000";
  c.textAlign = "center";
  c.textBaseline = "middle";
  lines.forEach((line, i) => c.fillText(line, cx, top + i * lead));
  c.font = `600 ${Math.round(size * by)}px 'Caveat', cursive`;
  c.fillStyle = "rgba(0,0,0,.6)";
  c.fillText(`— ${quote.by}`, cx, top + lines.length * lead + byH * 0.2);
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
}

export function drawQuoteBubble(c, w, h, quote, { size = 32, tail: tailSide = "right", style, by } = {}) {
  c.clearRect(0, 0, w, h);
  if (!quote) return;
  if (style === "manga") return drawMangaBubble(c, w, h, quote, size, tailSide, by);
  const tail = 46;
  const box = { x: 14, y: 14, w: w - 40, h: h - tail - 40 };
  // hard shadow, then the bubble with its tail pointing down to the speaker: from the lower
  // right by default, or the lower left
  // Along the bottom edge from right to left: base, tip, base (the tip leans outward)
  const tailPoints = tailSide === "left" ? [[0.38, 0], [0.14, 1], [0.22, 0]] : [[0.78, 0], [0.86, 1], [0.62, 0]];
  const shape = (dx, dy) => {
    c.beginPath();
    c.moveTo(box.x + dx, box.y + dy);
    c.lineTo(box.x + box.w + dx, box.y + dy);
    c.lineTo(box.x + box.w + dx, box.y + box.h + dy);
    tailPoints.forEach(([k, isTip]) => c.lineTo(box.x + box.w * k + dx, box.y + box.h + isTip * tail + dy));
    c.lineTo(box.x + dx, box.y + box.h + dy);
    c.closePath();
  };
  shape(12, 12);
  c.fillStyle = "#000";
  c.fill();
  shape(0, 0);
  c.fillStyle = "#fff";
  c.fill();
  c.lineWidth = 7;
  c.strokeStyle = "#000";
  c.stroke();
  // quote + attribution, centred as a block
  // `size` is the quote's type size; the line spacing and attribution scale with it
  const lead = size * 1.3;
  c.font = `700 ${size}px ${BODY}`;
  const lines = wrap(c, quote.text, box.w - 100, 3);
  // The quote is centred in the space above the attribution, which sits in the bottom-right corner
  const byH = size * 1.5;
  const blockH = lines.length * lead;
  const top = box.y + (box.h - byH - blockH) / 2 + size * 0.2;
  c.fillStyle = "#000";
  c.textBaseline = "top";
  lines.forEach((line, i) => c.fillText(line, box.x + 64, top + i * lead));
  c.font = `800 60px ${DISPLAY}`;
  c.fillStyle = "#ff90e8";
  c.fillText("“", box.x + 18, top - 8);
  c.fillStyle = "rgba(0,0,0,.6)";
  c.font = `600 ${size}px 'Caveat', cursive`;
  c.textAlign = "right";
  c.textBaseline = "bottom";
  c.fillText(`— ${quote.by}`, box.x + box.w - 28, box.y + box.h - size * 0.45);
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
}

// Retro terminal on the monitor: lines of text plus an optional blinking cursor
// A line starting "# " prints as a highlighted banner. `alert` makes the title bar call for
// attention (it alternates with `alertOn`, the blink phase) with a NEW MESSAGE flag.
export function drawTerminal(c, w, h, lines, cursor, { alert = false, alertOn = false } = {}) {
  c.fillStyle = "#1a1714";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(143,214,148,.06)";
  for (let y = 0; y < h; y += 6) c.fillRect(0, y, w, 3);
  // title bar
  c.fillStyle = alert && alertOn ? "#ffdd00" : "#ff7a1a";
  c.fillRect(0, 0, w, 44);
  c.fillStyle = "#000";
  c.fillRect(0, 44, w, 5);
  ["#000", "#000", "#000"].forEach((col, i) => {
    c.fillStyle = col;
    c.beginPath();
    c.arc(26 + i * 30, 22, 9, 0, Math.PI * 2);
    c.fill();
  });
  c.font = "700 22px 'Space Grotesk', monospace";
  c.textBaseline = "middle";
  c.fillText("oka@desk: ~", 120, 23);
  if (alert) {
    c.font = "800 18px 'Space Grotesk', monospace";
    const label = "● NEW MESSAGE";
    const lw = c.measureText(label).width + 24;
    c.fillStyle = alertOn ? "#000" : "#e11d48";
    c.fillRect(w - lw - 12, 8, lw, 28);
    c.fillStyle = alertOn ? "#ffdd00" : "#fff";
    c.fillText(label, w - lw, 23);
  }

  c.font = "700 22px ui-monospace, Menlo, monospace";
  c.textBaseline = "top";
  const visible = lines.slice(-9);
  visible.forEach((line, i) => {
    const y = 64 + i * 33;
    if (line.startsWith("# ")) {
      const text = line.slice(2);
      c.font = "800 24px ui-monospace, Menlo, monospace";
      c.fillStyle = "#ffdd00";
      c.fillRect(16, y - 4, c.measureText(text).width + 20, 31);
      c.fillStyle = "#000";
      c.fillText(text, 26, y);
      c.font = "700 22px ui-monospace, Menlo, monospace";
      return;
    }
    c.fillStyle = line.startsWith(">") ? "#ff7a1a" : "#8fd694";
    c.fillText(line, 24, y);
  });
  if (cursor) {
    const last = visible[visible.length - 1] || "";
    const x = 24 + c.measureText(last).width + 4;
    c.fillStyle = "#8fd694";
    c.fillRect(x, 64 + (visible.length - 1) * 33, 13, 24);
  }
  c.textBaseline = "alphabetic";
}

// ---------- the view out of the window: an animated neo-brutalist landscape ----------
// Flat colours, thick black outlines and hard offset shadows. `t` is seconds; the scene loops
// on its own (clouds, birds, ripples, swaying trees, a bobbing boat). Night swaps the sun for a
// moon, adds twinkling stars and fireflies. `flockAt` / `starAt` (seconds, same clock) start a
// flock of birds or a shooting star.
const VIEW_STARS = Array.from({ length: 38 }, (_, i) => {
  const r = (n) => (Math.sin(i * 127.1 + n * 311.7) * 43758.5453) % 1;
  return { x: Math.abs(r(1)), y: Math.abs(r(2)) * 0.5, s: 0.6 + Math.abs(r(3)) * 0.8, p: Math.abs(r(4)) * 6 };
});
const VIEW_FLIES = Array.from({ length: 14 }, (_, i) => ({ x: (i * 0.137 + 0.05) % 1, y: 0.8 + ((i * 0.071) % 0.17), p: i * 1.7 }));

// A colour part-way to another (both "#rrggbb")
function mixHex(a, b, k) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round(((pa >> shift) & 255) * (1 - k) + ((pb >> shift) & 255) * k);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}
// Grass tufts on the near shore: where each stands (0–1 across, 0–1 down the bank) and how tall
const GRASS_TUFTS = Array.from({ length: 30 }, (_, i) => ({ x: (i * 0.6180339 + 0.03) % 1, y: (i * 0.3819 + 0.12) % 1, s: 0.7 + ((i * 0.7071) % 1) * 0.6 }));
// A snapshot of the view, for the raindrops on the glass to refract
let glassCopy = null;
// Raindrops stuck to the glass: where each sits, how big, and how fast it slides
const GLASS_DROPS = Array.from({ length: 22 }, (_, i) => ({ x: (i * 0.383 + 0.07) % 1, y: (i * 0.617) % 1, r: 1.1 + ((i * 0.29) % 1) * 1.5, v: 0.004 + ((i * 0.53) % 1) * 0.02 }));
// Fine beads of water stuck to the glass between the drops
const GLASS_BEADS = Array.from({ length: 70 }, (_, i) => ({ x: (i * 0.6180339 + 0.11) % 1, y: (i * 0.4142 + 0.37) % 1, r: 0.2 + ((i * 0.7071) % 1) * 0.3 }));
// The sky through the day: top band, middle, horizon; the sun's height, colour and side
const SKIES = {
  morning: { sky: ["#ffb98a", "#ffd4a8", "#fff0d6"], sun: [0.26, 0.38, "#ffcf5c"], cloud: "#fff3e3" },
  day: { sky: ["#7fdfff", "#a8ecff", "#cdf6ff"], sun: [0.74, 0.19, "#ffdd00"], cloud: "#ffffff" },
  evening: { sky: ["#6d5cc4", "#ff8fa3", "#ffb35c"], sun: [0.7, 0.44, "#ff7a1a"], cloud: "#ffd0e0" },
  night: { sky: ["#1e2a5a", "#26356b", "#30437f"], sun: [0.74, 0.19, "#fffdf5"], cloud: "#55638f" },
};

// `time` is the part of the day outside (morning, day, evening, night), `rain` 0–1
export function drawWindowView(c, w, h, { t = 0, time = "day", rain = 0, flockAt = -99, starAt = -99 } = {}) {
  const dark = time === "night";
  const look = SKIES[time];
  // Rain greys everything over
  const grey = (color) => mixHex(color, dark ? "#2a2f45" : "#8d97a8", rain * 0.55);
  const u = w / 100;
  const line = Math.max(3, u * 0.7);
  c.lineJoin = "round";
  c.lineCap = "round";
  const stroke = (width = line, color = "#000") => {
    c.lineWidth = width;
    c.strokeStyle = color;
    c.stroke();
  };
  // A union of circles (and rects) with one clean outline and a hard shadow: drawn three times,
  // shadow, then grown by the line width in black, then the fill on top
  const blob = (parts, fill, shadow = line * 1.4) => {
    [[shadow, shadow, 0, "#000"], [0, 0, line, "#000"], [0, 0, 0, fill]].forEach(([dx, dy, grow, color]) => {
      if (color === "#000" && dx && !shadow) return;
      c.fillStyle = color;
      c.beginPath();
      parts.forEach(([x, y, r, rw, rh]) => {
        if (rw) c.rect(x + dx - grow, y + dy - grow, rw + grow * 2, rh + grow * 2);
        else {
          c.moveTo(x + dx + r + grow, y + dy);
          c.arc(x + dx, y + dy, r + grow, 0, Math.PI * 2);
        }
      });
      c.fill();
    });
  };
  const wrapX = (x, margin) => ((x % (w + margin * 2)) + w + margin * 2) % (w + margin * 2) - margin;
  // Painted like a background plate: the sun (or moon) picks a side, every form gets a lit face
  // toward it and a cool shade face away from it, and shadows fall the other way
  const lightSide = look.sun[0] < 0.5 ? -1 : 1;
  const SHADE = dark ? "#0b1030" : time === "evening" ? "#3a1f5c" : "#3b3a7a";
  const shade = (color, k = 0.3) => mixHex(color, SHADE, k);
  const glow = (color, k = 0.3) => mixHex(color, dark ? "#c9d4ff" : time === "evening" ? "#ffc58f" : "#fffdf5", k);
  // Wind instead of every stalk on its own metronome: a light breeze rolling across the view,
  // and every few seconds a gust sweeping in from the left. Each thing leans as the gust reaches
  // it, then springs back past upright and settles; `lag` lets a crown trail its trunk.
  const GUST_EVERY = 7;
  const gustFront = ((t / GUST_EVERY) % 1) * 1.8 - 0.4;
  const wind = (x, lag = 0) => {
    const tt = t - lag;
    const breeze = Math.sin(tt * 1.3 - x * 4) * 0.25 + Math.sin(tt * 2.9 - x * 9) * 0.08;
    const behind = ((tt / GUST_EVERY) % 1) * 1.8 - 0.4 - x;
    const gust = behind > 0 ? (1 - Math.exp(-behind * 40)) * Math.exp(-behind * 5) * Math.cos(behind * 14) : 0;
    return (breeze + gust * 1.1) * (1 + rain * 0.8);
  };
  const lumps = (parts, dx = 0, dy = 0, grow = 1) => {
    c.beginPath();
    parts.forEach(([x, y, r, rw, rh]) => {
      if (rw) c.rect(x + dx, y + dy, rw, rh);
      else {
        c.moveTo(x + dx + r * grow, y + dy);
        c.arc(x + dx, y + dy, r * grow, 0, Math.PI * 2);
      }
    });
  };
  // A blob in two tones: its own colour where the light reaches, shade in the crescent beneath
  // and away from the sun, and a small sheen on the bigger lumps facing it
  const celBlob = (parts, color, size, shadow) => {
    blob(parts, color, shadow);
    c.save();
    lumps(parts);
    c.clip();
    c.fillStyle = shade(color, 0.28);
    c.fillRect(-w * 2, -h * 2, w * 4, h * 4);
    lumps(parts, lightSide * size * 0.12, -size * 0.16, 0.96);
    c.fillStyle = color;
    c.fill();
    c.beginPath();
    parts.forEach(([x, y, r, rw]) => {
      if (rw || r < size * 0.3) return;
      const hx = x + lightSide * r * 0.38;
      const hy = y - r * 0.45;
      c.moveTo(hx + r * 0.22, hy);
      c.ellipse(hx, hy, r * 0.22, r * 0.12, 0, 0, Math.PI * 2);
    });
    c.fillStyle = glow(color, 0.4);
    c.fill();
    c.restore();
  };

  // Sky in flat bands, lighter toward the horizon
  const SKY = look.sky.map(grey);
  c.fillStyle = SKY[0];
  c.fillRect(0, 0, w, h);
  // a deeper zenith and an in-between band, so the steps down to the horizon stay small
  c.fillStyle = shade(SKY[0], dark ? 0.25 : 0.08);
  c.fillRect(0, 0, w, h * 0.1);
  c.fillStyle = mixHex(SKY[0], SKY[1], 0.5);
  c.fillRect(0, h * 0.21, w, h * 0.09);
  c.fillStyle = SKY[1];
  c.fillRect(0, h * 0.3, w, h * 0.1);
  c.fillStyle = SKY[2];
  c.fillRect(0, h * 0.4, w, h * 0.1);

  if (dark && rain < 0.6) {
    VIEW_STARS.forEach((star) => {
      const k = 0.55 + 0.45 * Math.sin(t * 2.2 + star.p);
      const s = u * star.s * k;
      c.fillStyle = "#fffdf5";
      c.save();
      c.translate(star.x * w, star.y * h);
      c.rotate(Math.PI / 4);
      c.fillRect(-s / 2, -s / 2, s, s);
      c.restore();
    });
    // Shooting star: a streak from the upper right down to the left, fading at its tail
    const sp = (t - starAt) / 1.1;
    if (sp >= 0 && sp <= 1) {
      const x = w * (0.95 - sp * 0.7);
      const y = h * (0.04 + sp * 0.26);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + w * 0.16, y - h * 0.06);
      stroke(line * 2.2, "#000");
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + w * 0.16, y - h * 0.06);
      stroke(line * 1.1, "#ffdd00");
      blob([[x, y, u * 1.4]], "#fffdf5", 0);
    }
  }

  // Sun (turning rays) or moon (with craters), fading behind rain clouds
  const sx = w * look.sun[0];
  const sy = h * look.sun[1];
  const sr = w * 0.085;
  const sunColor = look.sun[2];
  // A soft halo round it, breathing a little
  const halo = c.createRadialGradient(sx, sy, sr, sx, sy, sr * (dark ? 2.6 : 3.2) * (1 + 0.04 * Math.sin(t * 1.3)));
  halo.addColorStop(0, dark ? "rgba(255,253,245,.28)" : "rgba(255,255,230,.5)");
  halo.addColorStop(1, "rgba(255,255,255,0)");
  c.globalAlpha = 1 - rain * 0.9;
  c.fillStyle = halo;
  c.fillRect(sx - sr * 4, sy - sr * 4, sr * 8, sr * 8);
  // A ring of light swelling out from it now and then, fading as it grows
  const ring = (t * 0.22) % 1;
  c.globalAlpha = (1 - ring) * 0.4 * (1 - rain);
  c.beginPath();
  c.arc(sx, sy, sr * (1.25 + ring * 1.9), 0, Math.PI * 2);
  stroke(line * (1.4 - ring), dark ? "#fffdf5" : glow(sunColor, 0.5));
  c.globalAlpha = 1 - rain * 0.85;
  // it breathes: a slow swell, and the rays stretching in a wave that runs round the disc
  const breathe = 1 + 0.03 * Math.sin(t * 1.6);
  if (!dark) {
    c.save();
    c.translate(sx, sy);
    c.rotate(t * 0.25);
    for (let i = 0; i < 10; i++) {
      c.rotate((Math.PI * 2) / 10);
      const tip = sr * ((i % 2 ? 1.55 : 1.72) + 0.13 * Math.sin(t * 2.4 - i * 1.25));
      c.beginPath();
      c.moveTo(sr * 1.3, 0);
      c.lineTo(tip, 0);
      stroke(line * 3.2, "#000");
      c.beginPath();
      c.moveTo(sr * 1.3, 0);
      c.lineTo(tip, 0);
      stroke(line * 1.4, sunColor);
    }
    c.restore();
    celBlob([[sx, sy, sr * breathe]], sunColor, sr);
  } else {
    celBlob([[sx, sy, sr * breathe]], "#fffdf5", sr);
    [[-0.3, -0.2, 0.22], [0.3, 0.25, 0.16], [0.15, -0.38, 0.1]].forEach(([dx, dy, r]) => {
      c.beginPath();
      c.arc(sx + dx * sr, sy + dy * sr, r * sr, 0, Math.PI * 2);
      c.fillStyle = "#e7e0cc";
      c.fill();
      stroke(line * 0.6);
    });
  }
  c.globalAlpha = 1;

  // Clouds drifting across (more, lower and heavier when it rains); where each is, so its
  // shadow can slide over the mountains below it
  const cloudSpots = [];
  [[0.1, 0.12, 1, 6], [0.55, 0.3, 0.75, 9], [0.85, 0.08, 0.6, 4.5]].forEach(([bx, by, size, speed], i) => {
    const x = wrapX(bx * w + t * speed * u, w * 0.2);
    const y = by * h + Math.sin(t * 0.4 + i) * u * 0.4;
    const s = size * u * 9;
    // each puff swells and settles on its own beat, so the cloud slowly changes shape as it drifts
    const puff = (k) => s * (1 + 0.05 * Math.sin(t * 0.6 + i * 2.3 + k * 1.9));
    cloudSpots.push([x, s]);
    celBlob([[x - s * 0.55, y + s * 0.1, puff(0) * 0.42], [x, y - s * 0.15, puff(1) * 0.58], [x + s * 0.55, y + s * 0.08, puff(2) * 0.45], [x - s * 0.55, y + s * 0.1, 0, s * 1.1, s * 0.42]], grey(look.cloud), s);
  });
  if (rain > 0.05) {
    c.globalAlpha = Math.min(1, rain * 1.5);
    [[0.25, 0.05, 1.5, 3], [0.7, 0.16, 1.3, 2.2], [-0.05, 0.22, 1.1, 2.6]].forEach(([bx, by, size, speed]) => {
      const x = wrapX(bx * w + t * speed * u, w * 0.25);
      const y = by * h;
      const s = size * u * 9;
      blob([[x - s * 0.55, y + s * 0.1, s * 0.45], [x, y - s * 0.12, s * 0.6], [x + s * 0.55, y + s * 0.08, s * 0.48], [x - s * 0.55, y + s * 0.1, 0, s * 1.1, s * 0.45]], dark ? "#3a4060" : "#7d8798");
    });
    c.globalAlpha = 1;
  }

  // A hot-air balloon drifting slowly across, by day when it's dry
  if (!dark && rain < 0.3) {
    const hx = wrapX(w * 0.15 + t * u * 1.6, u * 12);
    const hy = h * 0.2 + Math.sin(t * 0.5) * u * 1.5;
    const r = u * 4.2;
    // swinging gently from the envelope, the basket trailing behind the drift
    c.save();
    c.translate(hx, hy);
    c.rotate(Math.sin(t * 0.9) * 0.07 - 0.03);
    c.translate(-hx, -hy);
    c.beginPath();
    c.moveTo(hx - r * 0.55, hy + r * 0.85);
    c.lineTo(hx - r * 0.3, hy + r * 1.75);
    c.moveTo(hx + r * 0.55, hy + r * 0.85);
    c.lineTo(hx + r * 0.3, hy + r * 1.75);
    stroke(line * 0.5);
    blob([[hx - r * 0.35, hy + r * 1.7, 0, r * 0.7, r * 0.5]], "#8b5a2b", 0);
    blob([[hx, hy, r], [hx - r * 0.55, hy + r * 0.45, 0, r * 1.1, r * 0.45]], "#ff6b6b", 0);
    c.save();
    c.beginPath();
    c.arc(hx, hy, r, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = "#ffdd00";
    c.fillRect(hx - r * 0.28, hy - r, r * 0.56, r * 2);
    c.fillStyle = "#fffdf5";
    c.fillRect(hx - r, hy - r * 0.12, r * 2, r * 0.24);
    c.restore();
    c.restore();
  }

  // A far range, paler and softer-edged, the haze between it and the near peaks
  c.beginPath();
  c.moveTo(-line, h * 0.6);
  [[0, 0.42], [0.08, 0.36], [0.2, 0.41], [0.36, 0.3], [0.52, 0.4], [0.68, 0.31], [0.86, 0.39], [1, 0.33]].forEach(([x, y]) => c.lineTo(w * x, h * y));
  c.lineTo(w + line, h * 0.6);
  c.closePath();
  c.fillStyle = grey(mixHex(dark ? "#3b3570" : time === "evening" ? "#9b7fd4" : "#c4b5fd", SKY[2], 0.55));
  c.fill();
  stroke(line * 0.6, "rgba(0,0,0,.45)");
  // Mountains behind the lake (drawn again, upside down, in the water)
  const RIDGE = [[0, 0.46], [0.14, 0.34], [0.3, 0.5], [0.45, 0.38], [0.62, 0.52], [0.8, 0.36], [1, 0.48]];
  const ridge = (mapY = (y) => y) => {
    c.beginPath();
    c.moveTo(-line, mapY(h * 0.6));
    RIDGE.forEach(([x, y]) => c.lineTo(w * x, mapY(h * y)));
    c.lineTo(w + line, mapY(h * 0.6));
    c.closePath();
  };
  const mountainColor = grey(dark ? "#3b3570" : time === "evening" ? "#9b7fd4" : "#c4b5fd");
  ridge();
  c.fillStyle = mountainColor;
  c.fill();
  c.save();
  c.clip();
  // Each peak's far side from the light in shade, the edge kinked on the way down so it reads
  // as a rock face rather than a wedge; a few gullies scored down the lit side
  [1, 3, 5].forEach((p) => {
    const [px, py] = RIDGE[p];
    const [vx, vy] = RIDGE[p - lightSide];
    c.beginPath();
    c.moveTo(w * px, h * py);
    c.lineTo(w * vx, h * vy);
    c.lineTo(w * vx, h * 0.6);
    c.lineTo(w * (px - lightSide * 0.012), h * 0.6);
    c.lineTo(w * (px + lightSide * 0.014), h * (py + (0.6 - py) * 0.5));
    c.lineTo(w * (px - lightSide * 0.004), h * (py + (0.6 - py) * 0.22));
    c.closePath();
    c.fillStyle = shade(mountainColor, 0.3);
    c.fill();
    c.beginPath();
    [[0.024, 0.085, 0.036, 0.15], [0.058, 0.1, 0.07, 0.16], [0.012, 0.13, 0.016, 0.2]].forEach(([x0, y0, x1, y1]) => {
      c.moveTo(w * (px + lightSide * x0), h * (py + y0));
      c.lineTo(w * (px + lightSide * x1), h * (py + y1));
    });
    stroke(line * 0.55, shade(mountainColor, 0.18));
  });
  // the clouds' shadows sliding over the slopes, cast away from the light
  c.fillStyle = SHADE;
  c.globalAlpha = (dark ? 0.2 : 0.14) * (1 + rain * 0.5);
  cloudSpots.forEach(([x, s], i) => {
    c.beginPath();
    c.ellipse(x - lightSide * s * 0.7, h * (0.44 + (i % 2) * 0.06), s * 1.25, s * 0.42, -lightSide * 0.12, 0, Math.PI * 2);
    c.fill();
  });
  c.globalAlpha = 1;
  c.restore();
  ridge();
  stroke();
  // Snow caps, their shaded half a cool blue-grey
  [[0.14, 0.34], [0.45, 0.38], [0.8, 0.36]].forEach(([x, y]) => {
    const cap = () => {
      c.beginPath();
      c.moveTo(w * x, h * y);
      c.lineTo(w * (x + 0.045), h * (y + 0.05));
      c.lineTo(w * (x + 0.015), h * (y + 0.04));
      c.lineTo(w * (x - 0.02), h * (y + 0.055));
      c.lineTo(w * (x - 0.05), h * (y + 0.05));
      c.closePath();
    };
    const snow = dark ? "#c9c5dc" : "#fffdf5";
    cap();
    c.fillStyle = snow;
    c.fill();
    c.save();
    c.clip();
    c.beginPath();
    c.moveTo(w * x, h * y);
    c.lineTo(w * (x - lightSide * 0.06), h * (y + 0.06));
    c.lineTo(w * (x + lightSide * 0.004), h * (y + 0.06));
    c.closePath();
    c.fillStyle = shade(snow, 0.2);
    c.fill();
    c.restore();
    cap();
    stroke(line * 0.8);
  });

  // Mist hanging along the foot of the mountains, drifting and thinning as it goes
  c.fillStyle = mixHex(SKY[2], "#ffffff", dark ? 0.1 : 0.45);
  for (let i = 0; i < 4; i++) {
    const mw = w * (0.22 + (i % 2) * 0.1);
    const mx = wrapX(((i * 0.31) % 1) * w + t * u * (0.5 + i * 0.25), mw);
    const my = h * (0.535 + (i % 3) * 0.015) + Math.sin(t * 0.5 + i * 2) * u * 0.4;
    const mh = u * (1.4 + (i % 2) * 0.6) * (0.85 + 0.15 * Math.sin(t * 0.7 + i));
    c.globalAlpha = (dark ? 0.25 : 0.45) * (0.7 + 0.3 * Math.sin(t * 0.4 + i * 1.7));
    c.beginPath();
    c.roundRect(mx - mw / 2, my - mh / 2, mw, mh, mh / 2);
    c.fill();
  }
  c.globalAlpha = 1;

  // The far shore: a low green bank with round bushes, a few houses (lit up at night, smoke
  // curling from a chimney) and a lighthouse on the point, its beam sweeping after dark
  const bank = h * 0.58;
  c.beginPath();
  c.moveTo(-line, bank + line);
  for (let x = 0; x <= 1.001; x += 0.05) c.lineTo(w * x, bank - h * (0.012 + 0.01 * Math.sin(x * 17)));
  c.lineTo(w + line, bank + line);
  c.closePath();
  const bankColor = grey(dark ? "#245239" : "#5fbf6a");
  c.fillStyle = bankColor;
  c.fill();
  stroke(line * 0.8);
  [0.04, 0.11, 0.17, 0.42, 0.5, 0.84, 0.9].forEach((x, i) => blob([[w * x, bank - h * 0.018, u * (1.6 + (i % 3) * 0.5)]], grey(dark ? "#1f5c3a" : "#2f9e57"), 0));
  [[0.56, "#ff6b6b"], [0.615, "#3b82f6"], [0.67, "#ffb35c"]].forEach(([x, roof], i) => {
    const hx = w * x;
    const hw = u * (3.4 + (i % 2) * 0.6);
    const hh = u * 2.6;
    const base = bank - h * 0.008;
    c.fillStyle = grey("#fffdf5");
    c.fillRect(hx - hw / 2, base - hh, hw, hh);
    // the gable end turned from the light, and the roof's slope on that side, in shade
    c.fillStyle = shade(grey("#fffdf5"), 0.25);
    c.fillRect(lightSide > 0 ? hx - hw / 2 : hx + hw * 0.18, base - hh, hw * 0.32, hh);
    c.beginPath();
    c.rect(hx - hw / 2, base - hh, hw, hh);
    stroke(line * 0.7);
    const gable = () => {
      c.beginPath();
      c.moveTo(hx - hw * 0.62, base - hh);
      c.lineTo(hx, base - hh - u * 2.2);
      c.lineTo(hx + hw * 0.62, base - hh);
      c.closePath();
    };
    gable();
    c.fillStyle = grey(roof);
    c.fill();
    c.beginPath();
    c.moveTo(hx, base - hh - u * 2.2);
    c.lineTo(hx - lightSide * hw * 0.62, base - hh);
    c.lineTo(hx, base - hh);
    c.closePath();
    c.fillStyle = shade(grey(roof), 0.3);
    c.fill();
    gable();
    stroke(line * 0.7);
    c.fillStyle = dark ? "#ffdd00" : "#30437f";
    c.fillRect(hx - u * 0.6, base - hh * 0.7, u * 1.2, u * 1.1);
    if (i === 1) {
      c.fillStyle = "#000";
      c.fillRect(hx + hw * 0.18, base - hh - u * 2.1, u * 0.9, u * 1.4);
      for (let k = 0; k < 3; k++) {
        const life = (t * 0.35 + k / 3) % 1;
        c.globalAlpha = (1 - life) * (dark ? 0.35 : 0.7);
        c.beginPath();
        c.arc(hx + hw * 0.22 + Math.sin(t + k * 2) * u * 0.8 + life * u * 3, base - hh - u * 2.4 - life * u * 7, u * (0.6 + life * 1.1), 0, Math.PI * 2);
        c.fillStyle = "#fffdf5";
        c.fill();
      }
      c.globalAlpha = 1;
    }
  });
  const lx = w * 0.755;
  const lBase = bank - h * 0.012;
  const lTop = lBase - u * 8.5;
  if (dark) {
    const sweep = Math.sin(t * 0.9);
    c.save();
    c.globalAlpha = 0.28 * (1 - rain * 0.5);
    c.fillStyle = "#fff6b0";
    c.beginPath();
    c.moveTo(lx, lTop + u * 0.8);
    c.lineTo(lx + sweep * w * 0.32, lTop - u * 3);
    c.lineTo(lx + sweep * w * 0.32, lTop + u * 4.5);
    c.closePath();
    c.fill();
    c.restore();
  }
  c.beginPath();
  c.moveTo(lx - u * 1.5, lBase);
  c.lineTo(lx - u * 1, lTop + u * 1.6);
  c.lineTo(lx + u * 1, lTop + u * 1.6);
  c.lineTo(lx + u * 1.5, lBase);
  c.closePath();
  c.fillStyle = grey("#fffdf5");
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = grey("#e5484d");
  [0.25, 0.6].forEach((k) => c.fillRect(lx - u * 2, lBase - (lBase - lTop) * k - u * 0.7, u * 4, u * 1.4));
  c.fillStyle = dark ? "rgba(11,16,48,.35)" : "rgba(59,58,122,.22)";
  c.fillRect(lightSide > 0 ? lx - u * 2 : lx + u * 0.35, lTop, u * 1.65, lBase - lTop);
  c.restore();
  stroke(line * 0.7);
  c.beginPath();
  c.rect(lx - u * 0.9, lTop + u * 0.2, u * 1.8, u * 1.4);
  c.fillStyle = dark ? "#fff6b0" : "#ffdd00";
  c.fill();
  stroke(line * 0.6);
  c.beginPath();
  c.moveTo(lx - u * 1.2, lTop + u * 0.2);
  c.lineTo(lx, lTop - u * 1);
  c.lineTo(lx + u * 1.2, lTop + u * 0.2);
  c.closePath();
  c.fillStyle = grey("#e5484d");
  c.fill();
  stroke(line * 0.6);

  // The lake: ripples sliding, the sun/moon's reflection wobbling, a little sailboat
  const lakeTop = h * 0.58;
  const lakeBottom = h * 0.78;
  const lakeColor = grey(dark ? "#172554" : "#3b82f6");
  c.fillStyle = lakeColor;
  c.fillRect(0, lakeTop, w, lakeBottom - lakeTop);
  c.save();
  c.beginPath();
  c.rect(0, lakeTop, w, lakeBottom - lakeTop);
  c.clip();
  // The far bank and the mountains mirrored in the water: squashed, sunk into its colour and
  // cut into thin bands that each sway on their own beat, more the further out from the bank
  // and fainter too, so the reflection wobbles like water instead of sitting there as a stamp
  const mirrored = (y) => lakeTop + (lakeTop - y) * 0.55;
  const reflectFill = mixHex(lakeColor, mountainColor, dark ? 0.3 : 0.38);
  const band = u * 1.1;
  for (let y = lakeTop, k = 0; y < lakeTop + h * 0.14; y += band, k++) {
    const depth = (y - lakeTop) / (h * 0.14);
    const dx = (Math.sin(t * 1.7 + k * 0.9) * 0.6 + Math.sin(t * 0.9 - k * 0.45) * 0.4) * u * (0.3 + depth * 1.6);
    c.save();
    c.beginPath();
    c.rect(0, y, w, band + 0.5);
    c.clip();
    c.translate(dx, 0);
    c.globalAlpha = 1 - depth * 0.55;
    ridge(mirrored);
    c.fillStyle = reflectFill;
    c.fill();
    c.restore();
  }
  // the far bank's green right under it, its lower edge rippling
  c.beginPath();
  c.moveTo(0, lakeTop);
  for (let x = 0; x <= w + u * 2; x += u * 2) c.lineTo(x, lakeTop + u * (1.6 + 0.35 * Math.sin(t * 2 + x / (u * 3))));
  c.lineTo(w + u * 2, lakeTop);
  c.closePath();
  c.fillStyle = mixHex(lakeColor, bankColor, 0.5);
  c.fill();
  // soft breaks of open water drifting through it, rounded at the ends, stretching and easing
  for (let i = 0; i < 7; i++) {
    const y = lakeTop + u * (2.6 + i * 1.9);
    const len = w * (0.12 + (i % 3) * 0.06) * (0.75 + 0.25 * Math.sin(t * 0.7 + i * 2.3));
    const x = wrapX(((i * 0.37) % 1) * w + t * u * (0.6 + (i % 3) * 0.35) + Math.sin(t * 0.8 + i * 1.7) * u * 3, w * 0.3);
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + len / 2, y + Math.sin(t * 1.3 + i) * u * 0.5, x + len, y);
    stroke(u * (0.5 + (i % 2) * 0.35), lakeColor);
  }
  // deeper water toward the near shore
  c.fillStyle = shade(lakeColor, 0.18);
  c.fillRect(0, lakeBottom - u * 3.2, w, u * 3.2);
  // the gust darkening the water as it crosses (a cat's paw), ruffled with short strokes
  if (gustFront > -0.1 && gustFront < 1.1) {
    const gx = gustFront * w;
    const gy = lakeTop + (lakeBottom - lakeTop) * 0.55;
    c.globalAlpha = 0.18;
    c.fillStyle = SHADE;
    c.beginPath();
    c.ellipse(gx - w * 0.06, gy, w * 0.14, (lakeBottom - lakeTop) * 0.32, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 0.6;
    c.beginPath();
    for (let k = 0; k < 6; k++) {
      const rx = gx - w * (0.02 + ((k * 0.37) % 1) * 0.16);
      const ry = gy + ((k * 0.61) % 1 - 0.5) * (lakeBottom - lakeTop) * 0.45;
      c.moveTo(rx, ry);
      c.lineTo(rx + u * 2, ry);
    }
    stroke(line * 0.5, glow(lakeColor, 0.5));
    c.globalAlpha = 1;
  }
  // glints twinkling on the water under the sun (or moon)
  c.fillStyle = dark ? "#fffdf5" : glow(sunColor, 0.6);
  for (let k = 0; k < 6; k++) {
    const g = Math.max(0, Math.sin(t * 2.6 + k * 2.1));
    const gs = u * 1.3 * g * g * g * (1 - rain);
    if (gs < u * 0.1) continue;
    const gx = sx + ((k * 0.618) % 1 - 0.5) * sr * 3.2;
    const gy = lakeTop + u * 2.5 + ((k * 0.382) % 1) * (lakeBottom - lakeTop) * 0.6;
    c.beginPath();
    c.moveTo(gx, gy - gs);
    c.quadraticCurveTo(gx, gy, gx + gs, gy);
    c.quadraticCurveTo(gx, gy, gx, gy + gs);
    c.quadraticCurveTo(gx, gy, gx - gs, gy);
    c.quadraticCurveTo(gx, gy, gx, gy - gs);
    c.fill();
  }
  c.restore();
  c.beginPath();
  c.moveTo(0, lakeTop);
  c.lineTo(w, lakeTop);
  stroke();
  // the sun's (or moon's) path on the water: broken dashes that slide, stretch and blink,
  // narrowing with distance from the bank
  c.fillStyle = sunColor;
  for (let i = 0; i < 5; i++) {
    const rowY = lakeTop + u * 2 + i * u * 2.3;
    const span = sr * (1.6 - i * 0.22);
    for (let k = 0; k < 3; k++) {
      const phase = t * (1.4 + k * 0.3) + i * 1.9 + k * 2.4;
      const len = span * (0.24 + 0.16 * Math.sin(phase));
      const cx = sx + Math.sin(phase * 0.7 + k) * span * 0.18 + (k - 1) * span * 0.32;
      c.globalAlpha = (1 - rain * 0.85) * (0.7 + 0.3 * Math.sin(phase * 1.3));
      c.beginPath();
      c.roundRect(cx - len / 2, rowY, len, u, u * 0.5);
      c.fill();
    }
  }
  c.globalAlpha = 1;
  // Rings spreading on the lake where the rain lands
  for (let i = 0; i < Math.round(rain * 10); i++) {
    const life = (t * 0.9 + i * 0.37) % 1;
    const rx = ((i * 0.419 + Math.floor(t * 0.9 + i * 0.37) * 0.31) % 1) * w;
    const ry = lakeTop + u * 2 + ((i * 0.23) % 1) * (lakeBottom - lakeTop - u * 4);
    c.globalAlpha = 1 - life;
    c.beginPath();
    c.ellipse(rx, ry, u * (0.5 + life * 3.5), u * (0.2 + life * 1.1), 0, 0, Math.PI * 2);
    stroke(line * 0.5, "#cdf6ff");
    c.globalAlpha = 1;
  }
  // Currents: little wavy strokes that fade in, drift along stretching out, and fade away
  // again somewhere new, each lane at its own pace (quicker nearer the shore)
  for (let i = 0; i < 10; i++) {
    const lane = i % 4;
    const dir = lane % 2 ? 1 : -1;
    const run = t * (0.12 + lane * 0.05) + i * 0.37;
    const life = run % 1;
    const fade = Math.sin(life * Math.PI);
    const x0 = ((i * 0.29 + Math.floor(run) * 0.53) % 1) * w * 0.9 + dir * life * u * 14;
    const y = lakeTop + u * 3.5 + lane * (lakeBottom - lakeTop - u * 6) / 3 + Math.sin(t + i) * u * 0.3;
    const len = u * (4 + (i % 3) * 2) * (0.6 + fade * 0.6);
    c.globalAlpha = fade * (dark ? 0.8 : 0.95);
    c.beginPath();
    c.moveTo(x0, y);
    for (let k = 1; k <= 4; k++) c.quadraticCurveTo(x0 + (len * (k - 0.5)) / 4, y + (k % 2 ? -1 : 1) * u * 0.55, x0 + (len * k) / 4, y);
    stroke(line * 0.7, dark ? "#7fb2ff" : "#cdf6ff");
  }
  c.globalAlpha = 1;
  const bx = w * 0.3 + Math.sin(t * 0.22) * w * 0.14;
  const by = lakeTop + (lakeBottom - lakeTop) * 0.45 + Math.sin(t * 2) * u * 0.6;
  c.save();
  c.translate(bx, by);
  c.rotate(Math.sin(t * 1.6) * 0.06);
  c.beginPath();
  c.moveTo(-u * 6, 0);
  c.lineTo(u * 6, 0);
  c.lineTo(u * 4, u * 2.6);
  c.lineTo(-u * 4, u * 2.6);
  c.closePath();
  c.fillStyle = "#ff6b6b";
  c.fill();
  stroke();
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, -u * 9);
  stroke();
  c.beginPath();
  c.moveTo(u * 0.6, -u * 8.5);
  c.lineTo(u * 6, -u * 1.2);
  c.lineTo(u * 0.6, -u * 1.2);
  c.closePath();
  c.fillStyle = "#fffdf5";
  c.fill();
  stroke();
  if (dark) blob([[-u * 3.2, -u * 1.4, u * 1]], "#ffdd00", 0);
  c.restore();

  // A mother duck and two ducklings paddling along, by day
  if (!dark) {
    const dx = wrapX(w * 0.62 - t * u * 1.8, u * 14);
    const dy = lakeTop + (lakeBottom - lakeTop) * 0.7;
    [[0, 1], [u * 4.2, 0.65], [u * 7.4, 0.65]].forEach(([off, k], i) => {
      const x = dx + off;
      const y = dy + Math.sin(t * 3 + i) * u * 0.3;
      blob([[x, y, u * 1.5 * k], [x - u * 1.3 * k, y - u * 1.4 * k, u * 0.95 * k]], k < 1 ? "#ffdd00" : "#fffdf5", 0);
      c.beginPath();
      c.moveTo(x - u * 2.1 * k, y - u * 1.5 * k);
      c.lineTo(x - u * 3 * k, y - u * 1.2 * k);
      c.lineTo(x - u * 2.1 * k, y - u * 1 * k);
      c.closePath();
      c.fillStyle = "#ff7a1a";
      c.fill();
      c.beginPath();
      c.moveTo(x - u * 2.3 * k, y + u * 1.1 * k);
      c.lineTo(x + u * 2.3 * k, y + u * 1.1 * k);
      stroke(line * 0.6, "#cdf6ff");
    });
  }

  // Grass, flowers, and trees swaying on the near shore
  const grassColor = grey(dark ? "#2f6b45" : "#8fd694");
  c.fillStyle = grassColor;
  c.fillRect(0, lakeBottom, w, h - lakeBottom);
  // the bank's lip in shade where it drops to the water, and tufts swaying in the breeze
  c.fillStyle = shade(grassColor, 0.2);
  c.fillRect(0, lakeBottom, w, u * 1.4);
  c.beginPath();
  GRASS_TUFTS.forEach(({ x, y, s: k }) => {
    const gx = w * x;
    const gy = lakeBottom + u * 3 + y * (h - lakeBottom - u * 3);
    const sway = wind(x, y * 0.1) * u * 0.9;
    const g = u * 1.5 * k;
    c.moveTo(gx - g * 0.5 + sway, gy - g * 1.1);
    c.quadraticCurveTo(gx - g * 0.2, gy - g * 0.3, gx, gy);
    c.quadraticCurveTo(gx + sway * 0.5, gy - g * 0.8, gx + sway * 1.3, gy - g * 1.5);
    c.moveTo(gx, gy);
    c.quadraticCurveTo(gx + g * 0.3, gy - g * 0.4, gx + g * 0.7 + sway, gy - g * 0.95);
  });
  stroke(line * 0.5, shade(grassColor, 0.32));
  c.beginPath();
  c.moveTo(0, lakeBottom);
  c.lineTo(w, lakeBottom);
  stroke();
  // A sandy path winding down to a little wooden pier
  const path = () => {
    c.beginPath();
    c.moveTo(w * 0.47, h + line);
    c.bezierCurveTo(w * 0.44, h * 0.9, w * 0.6, h * 0.86, w * 0.53, lakeBottom);
    c.lineTo(w * 0.58, lakeBottom);
    c.bezierCurveTo(w * 0.66, h * 0.86, w * 0.52, h * 0.92, w * 0.57, h + line);
    c.closePath();
  };
  const pathColor = grey(dark ? "#8a7a5a" : "#f3d9a4");
  path();
  c.fillStyle = pathColor;
  c.fill();
  // pebbles pressed into it, each with a shaded underside
  c.save();
  c.clip();
  [[0.505, 0.975, 1], [0.54, 0.94, 0.8], [0.52, 0.915, 0.6], [0.565, 0.885, 0.9], [0.585, 0.85, 0.7], [0.56, 0.815, 0.6], [0.55, 0.79, 0.5]].forEach(([x, y, k]) => {
    c.beginPath();
    c.ellipse(w * x, h * y, u * 1.1 * k, u * 0.6 * k, 0, 0, Math.PI * 2);
    c.fillStyle = shade(pathColor, 0.35);
    c.fill();
    c.beginPath();
    c.ellipse(w * x + lightSide * u * 0.15 * k, h * y - u * 0.18 * k, u * 0.8 * k, u * 0.38 * k, 0, 0, Math.PI * 2);
    c.fillStyle = glow(pathColor, 0.35);
    c.fill();
  });
  c.restore();
  path();
  stroke(line * 0.7);
  const pierTop = lakeBottom - (lakeBottom - lakeTop) * 0.34;
  [0.535, 0.575].forEach((x) => {
    c.beginPath();
    c.rect(w * x - u * 0.45, pierTop, u * 0.9, (lakeBottom - pierTop) + u);
    c.fillStyle = "#6b4a2a";
    c.fill();
    stroke(line * 0.6);
  });
  c.beginPath();
  c.moveTo(w * 0.525, lakeBottom + u * 0.4);
  c.lineTo(w * 0.532, pierTop);
  c.lineTo(w * 0.578, pierTop);
  c.lineTo(w * 0.585, lakeBottom + u * 0.4);
  c.closePath();
  c.fillStyle = grey("#b8743c");
  c.fill();
  stroke(line * 0.7);
  for (let k = 1; k < 4; k++) {
    const y = pierTop + (lakeBottom - pierTop) * (k / 4);
    c.beginPath();
    c.moveTo(w * 0.53, y);
    c.lineTo(w * 0.58, y);
    stroke(line * 0.4, "#6b4a2a");
  }
  // Reeds and cattails at the water's edge, swaying
  [0.24, 0.255, 0.27, 0.285, 0.72, 0.735, 0.75].forEach((x, i) => {
    const sway = (wind(x) + Math.sin(t * 2.2 + i) * 0.08) * u * 1.3;
    const top = lakeBottom - u * (4 + (i % 3) * 1.4);
    c.beginPath();
    c.moveTo(w * x, lakeBottom + u * 1.5);
    c.quadraticCurveTo(w * x, top + u * 2, w * x + sway, top);
    stroke(line * 0.6, dark ? "#14532d" : "#166534");
    if (i % 2 === 0) {
      c.save();
      c.translate(w * x + sway, top + u * 0.4);
      c.beginPath();
      c.roundRect(-u * 0.55, -u * 0.6, u * 1.1, u * 2.4, u * 0.5);
      c.fillStyle = "#8b5a2b";
      c.fill();
      stroke(line * 0.5);
      c.restore();
    }
  });
  // Flowers on the near shore, drawn the way the rest of the view is: one clean black
  // silhouette (stroked wide, then filled over), a shade side away from the light and a sheen
  // toward it. Daisies face us a little tilted, tulips are closed cups, lavender stands in
  // spikes. Stems are inked too, and each has a leaf or two reaching up and out.
  const stemColor = dark ? "#14532d" : "#166534";
  const leafColor = dark ? "#1f5c3a" : "#2f9e57";
  const ink = (width = line * 1.1) => stroke(width, "#000");
  const leaf = (x, y, side, size) => {
    const L = size * 1.3;
    c.save();
    c.translate(x, y);
    c.scale(side, 1);
    c.rotate(-0.55);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(L * 0.45, -L * 0.4, L, 0);
    c.quadraticCurveTo(L * 0.5, L * 0.32, 0, 0);
    c.closePath();
    ink();
    c.fillStyle = leafColor;
    c.fill();
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(L, 0);
    c.quadraticCurveTo(L * 0.5, L * 0.32, 0, 0);
    c.fillStyle = shade(leafColor, 0.3);
    c.fill();
    c.beginPath();
    c.moveTo(L * 0.08, 0);
    c.quadraticCurveTo(L * 0.5, -L * 0.06, L * 0.86, 0);
    stroke(line * 0.35, shade(leafColor, 0.5));
    c.restore();
  };
  const FLOWERS = [
    [0.36, 0.86, "#ff90e8", "daisy"], [0.43, 0.93, "#ffdd00", "tulip"], [0.62, 0.885, "#fffdf5", "daisy"],
    [0.69, 0.95, "#ff6b6b", "tulip"], [0.3, 0.95, "#a78bfa", "lavender"], [0.75, 0.86, "#c4b5fd", "lavender"], [0.4, 0.99, "#fffdf5", "daisy"],
  ];
  FLOWERS.forEach(([x, y, color, kind], i) => {
    // big enough to read their petals in the window close-up
    const fu = u * 1.7;
    // the heads trail their stems a beat, and bob a touch on their own
    const sway = (wind(x, 0.12) + Math.sin(t * 2.4 + i * 1.7) * 0.06) * fu * 0.7;
    const bx = w * x;
    const by = h * y + fu * 3.4;
    const fx = bx + sway;
    const fy = h * y;
    const petal = dark ? mixHex(color, "#3b3570", 0.45) : color;
    const tilt = sway / (fu * 6);
    const stem = () => {
      c.beginPath();
      c.moveTo(bx, by);
      c.quadraticCurveTo(bx, (by + fy) / 2, fx, fy + fu * 0.3);
    };
    stem();
    ink(line * 1.25);
    stem();
    stroke(line * 0.6, stemColor);
    leaf(bx + sway * 0.25, by - fu * 1.1, i % 2 ? 1 : -1, fu * 1.4);
    if (kind === "lavender") leaf(bx + sway * 0.1, by - fu * 0.4, i % 2 ? -1 : 1, fu * 1.1);
    c.save();
    c.translate(fx, fy);
    c.rotate(tilt);
    if (kind === "daisy") {
      // seen a little from above: squashed, nine petals, each with a crease down its middle
      c.scale(1, 0.82);
      const N = 9;
      const petals = () => {
        c.beginPath();
        for (let k = 0; k < N; k++) {
          const a = (k / N) * Math.PI * 2 + i;
          const px = Math.cos(a) * fu * 1.05;
          const py = Math.sin(a) * fu * 1.05;
          c.moveTo(px + Math.cos(a) * fu * 0.68, py + Math.sin(a) * fu * 0.68);
          c.ellipse(px, py, fu * 0.68, fu * 0.3, a, 0, Math.PI * 2);
        }
      };
      petals();
      ink();
      c.fillStyle = petal;
      c.fill();
      c.save();
      c.clip();
      c.fillStyle = shade(petal, 0.22);
      c.fillRect(-fu * 3, fu * 0.2, fu * 6, fu * 3);
      c.restore();
      c.beginPath();
      for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2 + i;
        c.moveTo(Math.cos(a) * fu * 0.65, Math.sin(a) * fu * 0.65);
        c.lineTo(Math.cos(a) * fu * 1.4, Math.sin(a) * fu * 1.4);
      }
      stroke(line * 0.3, shade(petal, 0.35));
      // the eye: a domed yellow heart, freckled, lit on top
      const eye = dark ? "#c9a227" : "#ffb800";
      c.beginPath();
      c.arc(0, 0, fu * 0.55, 0, Math.PI * 2);
      ink();
      c.fillStyle = eye;
      c.fill();
      c.beginPath();
      c.arc(0, 0, fu * 0.55, 0.15, Math.PI - 0.15);
      c.fillStyle = shade(eye, 0.28);
      c.fill();
      c.fillStyle = shade(eye, 0.45);
      [[-0.2, -0.05], [0.18, 0.08], [0.02, 0.25], [-0.05, -0.28], [0.25, -0.2]].forEach(([dx, dy]) => c.fillRect(fu * dx - u * 0.18, fu * dy - u * 0.18, u * 0.36, u * 0.36));
      c.beginPath();
      c.ellipse(lightSide * fu * 0.18, -fu * 0.22, fu * 0.2, fu * 0.11, 0, 0, Math.PI * 2);
      c.fillStyle = glow(eye, 0.6);
      c.fill();
    } else if (kind === "tulip") {
      // a closed cup: two petals behind, one in front with its edges overlapping theirs
      const cup = () => {
        c.beginPath();
        c.moveTo(-fu * 0.95, -fu * 0.85);
        c.quadraticCurveTo(-fu * 1.2, fu * 0.75, 0, fu * 0.85);
        c.quadraticCurveTo(fu * 1.2, fu * 0.75, fu * 0.95, -fu * 0.85);
        c.quadraticCurveTo(fu * 0.8, -fu * 0.4, fu * 0.42, -fu * 0.55);
        c.quadraticCurveTo(fu * 0.28, -fu * 1.3, 0, -fu * 1.3);
        c.quadraticCurveTo(-fu * 0.28, -fu * 1.3, -fu * 0.42, -fu * 0.55);
        c.quadraticCurveTo(-fu * 0.8, -fu * 0.4, -fu * 0.95, -fu * 0.85);
        c.closePath();
      };
      cup();
      ink();
      c.fillStyle = petal;
      c.fill();
      c.save();
      c.clip();
      c.fillStyle = shade(petal, 0.25);
      c.fillRect(lightSide > 0 ? -fu * 2 : fu * 0.3, -fu * 2, fu * 1.7, fu * 4);
      c.restore();
      c.beginPath();
      c.moveTo(-fu * 0.42, -fu * 0.55);
      c.quadraticCurveTo(-fu * 0.5, fu * 0.2, -fu * 0.15, fu * 0.75);
      c.moveTo(fu * 0.42, -fu * 0.55);
      c.quadraticCurveTo(fu * 0.5, fu * 0.2, fu * 0.15, fu * 0.75);
      stroke(line * 0.4, shade(petal, 0.45));
      c.beginPath();
      c.moveTo(lightSide * fu * 0.68, -fu * 0.45);
      c.quadraticCurveTo(lightSide * fu * 0.78, 0, lightSide * fu * 0.6, fu * 0.35);
      stroke(line * 0.55, glow(petal, 0.55));
    } else {
      // lavender: a spike of florets, smaller toward the tip, alternating sides
      const florets = [];
      for (let k = 0; k < 7; k++) {
        const s = 1 - k * 0.09;
        florets.push([(k % 2 ? 1 : -1) * fu * 0.22 * s, fu * 0.6 - k * fu * 0.42, fu * 0.42 * s, fu * 0.3 * s]);
      }
      const spike = () => {
        c.beginPath();
        florets.forEach(([dx, dy, rx, ry]) => {
          c.moveTo(dx + rx, dy);
          c.ellipse(dx, dy, rx, ry, 0, 0, Math.PI * 2);
        });
      };
      spike();
      ink();
      c.fillStyle = petal;
      c.fill();
      c.beginPath();
      florets.forEach(([dx, dy, rx, ry]) => {
        c.moveTo(dx - lightSide * rx * 0.2 + rx * 0.75, dy + ry * 0.25);
        c.ellipse(dx - lightSide * rx * 0.2, dy + ry * 0.25, rx * 0.75, ry * 0.7, 0, 0, Math.PI * 2);
      });
      c.fillStyle = shade(petal, 0.3);
      c.fill();
      c.fillStyle = glow(petal, 0.55);
      florets.forEach(([dx, dy, rx, ry]) => c.fillRect(dx + lightSide * rx * 0.35 - u * 0.2, dy - ry * 0.45, u * 0.4, u * 0.3));
    }
    c.restore();
  });
  const tree = (x, scale, i, round) => {
    const base = h * 0.97;
    // its shadow stretched across the grass, away from the light
    c.globalAlpha = dark ? 0.32 : 0.24;
    c.fillStyle = SHADE;
    c.beginPath();
    c.ellipse(w * x - lightSide * u * 5 * scale, base, u * 9 * scale, u * 1.8 * scale, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    c.save();
    c.translate(w * x, base);
    // the trunk bends a little with the wind, the crown a beat later and a little further
    const bend = wind(x);
    c.rotate(bend * 0.035);
    const bark = "#8b5a2b";
    const tw = u * 1.2 * scale;
    c.fillStyle = bark;
    c.fillRect(-tw, -u * 10 * scale, tw * 2, u * 10 * scale);
    // a shaded side down the trunk, and a few knots and grain marks in the bark
    c.fillStyle = shade(bark, 0.35);
    c.fillRect(lightSide > 0 ? -tw : tw * 0.2, -u * 10 * scale, tw * 0.8, u * 10 * scale);
    c.beginPath();
    [[-0.3, 2.5, 1.6], [0.35, 5, 1.2], [-0.1, 7.5, 1.4]].forEach(([bx, by, len]) => {
      c.moveTo(tw * bx, -u * by * scale);
      c.quadraticCurveTo(tw * (bx + 0.3), -u * (by + len * 0.5) * scale, tw * bx, -u * (by + len) * scale);
    });
    stroke(line * 0.45, shade(bark, 0.55));
    c.beginPath();
    c.rect(-tw, -u * 10 * scale, tw * 2, u * 10 * scale);
    stroke();
    c.translate(0, -u * 10 * scale);
    c.rotate((wind(x, 0.28) * 1.4 - bend) * 0.035 + Math.sin(t * 1.7 + i) * 0.006);
    c.translate(0, u * 10 * scale);
    if (round) {
      const r = u * 6 * scale;
      celBlob([[-r * 0.6, -u * 13 * scale, r * 0.75], [r * 0.6, -u * 13 * scale, r * 0.7], [0, -u * 18 * scale, r]], dark ? "#1f5c3a" : "#22a65c", r);
    } else {
      const pine = dark ? "#14532d" : "#166534";
      [[-u * 8, -u * 18, u * 7], [-u * 14, -u * 30, u * 5.5]].forEach(([bottom, top, half]) => {
        const tier = () => {
          c.beginPath();
          c.moveTo(0, top * scale);
          c.lineTo(half * scale, bottom * scale);
          c.lineTo(-half * scale, bottom * scale);
          c.closePath();
        };
        tier();
        c.fillStyle = "#000";
        c.save();
        c.translate(line * 1.4, line * 1.4);
        c.fill();
        c.restore();
        c.fillStyle = pine;
        c.fill();
        // the half turned from the light in shade, a lit edge catching it on the other
        c.beginPath();
        c.moveTo(0, top * scale);
        c.lineTo(-lightSide * half * scale, bottom * scale);
        c.lineTo(lightSide * half * 0.12 * scale, bottom * scale);
        c.closePath();
        c.fillStyle = shade(pine, 0.35);
        c.fill();
        c.beginPath();
        c.moveTo(lightSide * half * 0.12 * scale, (top + (bottom - top) * 0.22) * scale);
        c.lineTo(lightSide * half * 0.72 * scale, (bottom - u * 0.9) * scale);
        stroke(line * 0.7, glow(pine, 0.35));
        tier();
        stroke();
      });
    }
    c.restore();
  };
  tree(0.09, 1.2, 0, false);
  tree(0.22, 0.9, 1, true);
  tree(0.85, 1.05, 2, false);
  tree(0.96, 0.8, 3, true);

  // Petals and leaves carried along in the gust, tumbling as they go
  if (!dark && rain < 0.3 && gustFront > 0 && gustFront < 1.3) {
    for (let k = 0; k < 6; k++) {
      const px = (gustFront - 0.04 - k * 0.05) * w;
      const py = h * (0.6 + ((k * 0.377) % 1) * 0.3) - gustFront * h * 0.08 + Math.sin(t * 3 + k * 2) * u * 2;
      c.save();
      c.translate(px, py);
      c.rotate(t * (4 + k) + k);
      c.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(t * 5 + k)));
      c.beginPath();
      c.ellipse(0, 0, u * 1.1, u * 0.6, 0, 0, Math.PI * 2);
      c.fillStyle = k % 3 ? "#ff90e8" : "#8fd694";
      c.fill();
      stroke(line * 0.4);
      c.restore();
    }
  }

  // Birds by day (a few always about, a flock when called), fireflies by night
  const bird = (x, y, s, flap) => {
    c.beginPath();
    c.moveTo(x - s, y - s * 0.55 * flap);
    c.quadraticCurveTo(x - s * 0.45, y - s * 0.15, x, y);
    c.quadraticCurveTo(x + s * 0.45, y - s * 0.15, x + s, y - s * 0.55 * flap);
    stroke(line * 1.1);
  };
  if (!dark && rain < 0.3) {
    for (let i = 0; i < 3; i++) {
      const x = wrapX(w * (i * 0.37) + t * u * (5 + i * 1.5), u * 6);
      const y = h * (0.12 + i * 0.07) + Math.sin(t * 1.3 + i * 2) * u * 1.5;
      bird(x, y, u * (2.2 - i * 0.3), Math.sin(t * 9 + i * 1.7));
    }
    const fp = (t - flockAt) / 5;
    if (fp >= 0 && fp <= 1) {
      for (let i = 0; i < 7; i++) {
        const row = Math.ceil(i / 2) * (i % 2 ? 1 : -1);
        const x = -w * 0.15 + fp * w * 1.35 - Math.abs(row) * u * 4;
        const y = h * 0.3 + row * u * 3.5 - fp * h * 0.12 + Math.sin(t * 2 + i) * u * 0.6;
        bird(x, y, u * 2.4, Math.sin(t * 12 + i));
      }
    }
  } else if (dark && rain < 0.3) {
    // Fireflies wander on two loose loops at different beats, so no two paths fall in step,
    // and blink the way they do: a quick swell, a slower fade, then dark for a while. A lit one
    // leaves a short fading trail of where it just was.
    const flyAt = (fly, at) => [
      w * fly.x + (Math.sin(at * 0.43 + fly.p) * 3 + Math.sin(at * 1.13 + fly.p * 2.3) * 1.2) * u,
      h * fly.y + (Math.sin(at * 0.61 + fly.p * 1.7) * 1.8 + Math.cos(at * 1.37 + fly.p) * 0.8) * u - Math.max(0, Math.sin(at * 0.2 + fly.p)) * u * 4,
    ];
    VIEW_FLIES.forEach((fly) => {
      const cyc = (t * 0.32 + fly.p * 0.37) % 1;
      const rise = cyc < 0.1 ? cyc / 0.1 : cyc < 0.45 ? 1 - (cyc - 0.1) / 0.35 : 0;
      const g = rise * rise * (3 - 2 * rise);
      if (g < 0.03) return;
      const [x, y] = flyAt(fly, t);
      const halo = c.createRadialGradient(x, y, 0, x, y, u * 3.4 * (0.5 + g * 0.5));
      halo.addColorStop(0, `rgba(255,240,120,${0.6 * g})`);
      halo.addColorStop(1, "rgba(255,240,120,0)");
      c.fillStyle = halo;
      c.fillRect(x - u * 3.5, y - u * 3.5, u * 7, u * 7);
      c.fillStyle = "#fff6a0";
      [0.12, 0.24].forEach((ago, k) => {
        const [px, py] = flyAt(fly, t - ago);
        c.globalAlpha = g * (0.45 - k * 0.2);
        c.beginPath();
        c.arc(px, py, u * (0.4 - k * 0.1), 0, Math.PI * 2);
        c.fill();
      });
      c.globalAlpha = 1;
      c.beginPath();
      c.arc(x, y, u * (0.4 + g * 0.25), 0, Math.PI * 2);
      c.fillStyle = mixHex("#8a7a2a", "#fffbd0", g);
      c.fill();
      stroke(line * 0.35, "#1a1714");
    });
  }

  // Rain: slanted streaks falling past
  if (rain > 0.02) {
    c.strokeStyle = dark ? "rgba(190,205,255,.5)" : "rgba(235,245,255,.75)";
    c.lineWidth = Math.max(1.5, u * 0.45);
    c.beginPath();
    for (let i = 0; i < Math.round(rain * 90); i++) {
      const fall = (i * 0.291 + t * (1.4 + (i % 5) * 0.12)) % 1;
      const x = wrapX(((i * 0.137) % 1) * w - fall * u * 8, u * 4);
      const y = fall * h * 1.1 - h * 0.05;
      c.moveTo(x, y);
      c.lineTo(x - u * 1.6, y + u * 6);
    }
    c.stroke();
  }

  // The window's own cross bars: wood, like the frame, with a black outline and a lighter
  // bevel down the middle
  const bar = u * 2.4;
  c.fillStyle = "#000";
  c.fillRect(w / 2 - bar / 2 - line, 0, bar + line * 2, h);
  c.fillRect(0, h / 2 - bar / 2 - line, w, bar + line * 2);
  c.fillStyle = "#b8743c";
  c.fillRect(w / 2 - bar / 2, 0, bar, h);
  c.fillRect(0, h / 2 - bar / 2, w, bar);
  c.fillStyle = "rgba(255,220,170,.35)";
  c.fillRect(w / 2 - bar * 0.15, 0, bar * 0.3, h);
  c.fillRect(0, h / 2 - bar * 0.15, w, bar * 0.3);

  // Water on the glass. Each drop is a little lens: it shows the view behind it upside down
  // and shrunk, with a dark rim along its top, a bright caustic inside its lower edge and a
  // pinpoint of light. The bigger ones cling and swell, then let go and run in a quick
  // stick-slip zigzag, leaving a wet trail that dries again while they wait.
  if (rain > 0.05) {
    const wet = Math.min(1, rain * 1.3);
    // the drops refract a snapshot of the finished view, not the canvas they're drawing into
    if (!glassCopy) glassCopy = document.createElement("canvas");
    if (glassCopy.width !== w || glassCopy.height !== h) Object.assign(glassCopy, { width: w, height: h });
    glassCopy.getContext("2d").drawImage(c.canvas, 0, 0);
    const lens = (x, y, rx, ry, stretch = 0) => {
      // a dome, its weight low; running, it draws up into a short tail
      const shape = () => {
        c.beginPath();
        c.moveTo(x - rx, y);
        c.bezierCurveTo(x - rx, y - ry * 1.33 * (1 + stretch * 1.4), x + rx, y - ry * 1.33 * (1 + stretch * 1.4), x + rx, y);
        c.bezierCurveTo(x + rx, y + ry * 1.38, x - rx, y + ry * 1.38, x - rx, y);
        c.closePath();
      };
      c.save();
      shape();
      c.clip();
      const R = Math.max(rx, ry) * 3.2;
      c.translate(x, y);
      c.scale(1, -1);
      c.drawImage(glassCopy, x - R, y - R, R * 2, R * 2, -rx * 1.15, -ry * 1.4, rx * 2.3, ry * 2.8);
      c.restore();
      c.save();
      shape();
      c.clip();
      c.fillStyle = dark ? "rgba(140,170,255,.18)" : "rgba(200,230,255,.22)";
      c.fill();
      // the dark rim along the top, the bright caustic low inside
      c.beginPath();
      c.ellipse(x, y - ry * 0.25, rx * 1.05, ry * 1.1, 0, Math.PI * 1.05, Math.PI * 1.95);
      c.lineWidth = Math.max(1.5, ry * 0.5);
      c.strokeStyle = "rgba(10,20,45,.55)";
      c.stroke();
      c.beginPath();
      c.ellipse(x, y + ry * 0.05, rx * 0.7, ry * 0.75, 0, Math.PI * 0.2, Math.PI * 0.8);
      c.lineWidth = Math.max(1.2, ry * 0.28);
      c.strokeStyle = "rgba(255,255,255,.8)";
      c.stroke();
      c.restore();
      shape();
      c.lineWidth = Math.max(1, u * 0.2);
      c.strokeStyle = "rgba(10,20,45,.6)";
      c.stroke();
      c.beginPath();
      c.ellipse(x - rx * 0.35, y - ry * 0.4, rx * 0.2, ry * 0.15, -0.5, 0, Math.PI * 2);
      c.fillStyle = "#fff";
      c.fill();
    };
    c.globalAlpha = wet;
    // fine beads: little domes, a darker top edge and a pinpoint of light
    GLASS_BEADS.forEach((b, i) => {
      if (i / GLASS_BEADS.length > rain + 0.15) return;
      const x = b.x * w;
      const y = b.y * h;
      const r = b.r * u;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = dark ? "rgba(170,195,255,.22)" : "rgba(230,245,255,.35)";
      c.fill();
      c.beginPath();
      c.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.9);
      c.lineWidth = Math.max(1, r * 0.35);
      c.strokeStyle = "rgba(10,20,45,.35)";
      c.stroke();
      c.beginPath();
      c.arc(x, y, r * 0.7, Math.PI * 0.25, Math.PI * 0.75);
      c.lineWidth = Math.max(0.8, r * 0.25);
      c.strokeStyle = "rgba(255,255,255,.7)";
      c.stroke();
    });
    GLASS_DROPS.forEach((d, i) => {
      // stick-slip: hold and swell for most of each beat, then run down a step and stop
      const beat = t * (0.18 + d.v * 6) + i * 0.61;
      const n = Math.floor(beat);
      const f = beat - n;
      const run = f < 0.72 ? 0 : 1 - (1 - (f - 0.72) / 0.28) ** 3;
      const step = 0.05 + d.v * 2;
      const y = (((d.y + (n + run) * step) % 1.1) - 0.05) * h;
      const sideAt = (k) => Math.sin(k * 1.9 + i * 2.7) * u * 1.6;
      const x = d.x * w + sideAt(n) + (sideAt(n + 1) - sideAt(n)) * run;
      const r = d.r * u * 0.8 * (0.85 + 0.25 * Math.min(1, f / 0.72));
      // fading in at the top so a drop that wraps round never pops
      const fadeIn = Math.min(1, (y + 0.05 * h) / (0.08 * h));
      c.globalAlpha = wet * fadeIn;
      // the wet trail: drawn out while it runs, drying back while it holds
      const trail = r * (1.5 + (f < 0.72 ? 9 * Math.exp(-f * 5) : 2 + run * 9));
      const streak = c.createLinearGradient(x, y - trail, x, y);
      streak.addColorStop(0, "rgba(220,240,255,0)");
      streak.addColorStop(1, dark ? "rgba(170,195,255,.35)" : "rgba(230,245,255,.45)");
      const tail = x - (sideAt(n + 1) - sideAt(n)) * run;
      c.beginPath();
      c.moveTo(tail - r * 0.15, y - trail);
      c.quadraticCurveTo(tail - r * 0.35, y - trail * 0.4, x - r * 0.4, y - r * 0.4);
      c.lineTo(x + r * 0.4, y - r * 0.4);
      c.quadraticCurveTo(tail + r * 0.35, y - trail * 0.4, tail + r * 0.15, y - trail);
      c.closePath();
      c.fillStyle = streak;
      c.fill();
      // a bead or two left behind in it
      if (trail > r * 3) {
        c.fillStyle = "rgba(255,255,255,.6)";
        c.beginPath();
        c.arc(tail + r * 0.1, y - trail * 0.6, r * 0.16, 0, Math.PI * 2);
        c.arc(tail - r * 0.12, y - trail * 0.85, r * 0.11, 0, Math.PI * 2);
        c.fill();
      }
      lens(x, y, r, r * 0.9, run * (1 - run) * 2);
    });
    c.globalAlpha = 1;
  }
}

// ---------- game cases on the shelf ----------
// A case's spine: the platform's header band and logo at the top, the game's own colour with its
// title running up the spine, and an age rating at the foot
const RATINGS = ["E", "E10", "T", "3", "7", "12"];
export function drawGameSpine(c, w, h, { platform, art, title, ink = "#000", i = 0 }) {
  c.fillStyle = art;
  c.fillRect(0, 0, w, h);
  const band = h * 0.15;
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

// The cover of the one case standing face-out: platform band, a little pixel-art scene, the title
export function drawGameCover(c, w, h, { platform = "#e11d48", title = "PIXEL KART" } = {}) {
  const band = h * 0.1;
  // sky, sun, hills
  c.fillStyle = "#7fdfff";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#ffdd00";
  c.beginPath();
  c.arc(w * 0.78, h * 0.3, w * 0.11, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 6;
  c.strokeStyle = "#000";
  c.stroke();
  c.fillStyle = "#8fd694";
  c.beginPath();
  c.moveTo(0, h * 0.72);
  c.quadraticCurveTo(w * 0.3, h * 0.5, w * 0.6, h * 0.68);
  c.quadraticCurveTo(w * 0.85, h * 0.58, w, h * 0.66);
  c.lineTo(w, h);
  c.lineTo(0, h);
  c.closePath();
  c.fill();
  c.stroke();
  // a road and a kart
  c.fillStyle = "#3a3a3a";
  c.beginPath();
  c.moveTo(w * 0.35, h);
  c.lineTo(w * 0.47, h * 0.7);
  c.lineTo(w * 0.55, h * 0.7);
  c.lineTo(w * 0.8, h);
  c.closePath();
  c.fill();
  c.stroke();
  const kx = w * 0.42;
  const ky = h * 0.78;
  const u = w / 40;
  c.fillStyle = "#ff6b6b";
  c.fillRect(kx, ky, u * 10, u * 4);
  c.strokeRect(kx, ky, u * 10, u * 4);
  c.fillStyle = "#ffdd00";
  c.fillRect(kx + u * 3, ky - u * 4, u * 4, u * 4);
  c.strokeRect(kx + u * 3, ky - u * 4, u * 4, u * 4);
  c.fillStyle = "#000";
  [kx + u * 1.5, kx + u * 8.5].forEach((x) => {
    c.beginPath();
    c.arc(x, ky + u * 4.5, u * 1.6, 0, Math.PI * 2);
    c.fill();
  });
  // title block
  c.save();
  c.translate(w / 2, h * 0.33);
  c.rotate(-0.06);
  c.fillStyle = "#000";
  c.fillRect(-w * 0.4 + 8, -h * 0.09 + 8, w * 0.8, h * 0.18);
  c.fillStyle = "#ff90e8";
  c.fillRect(-w * 0.4, -h * 0.09, w * 0.8, h * 0.18);
  c.strokeRect(-w * 0.4, -h * 0.09, w * 0.8, h * 0.18);
  c.fillStyle = "#000";
  c.textAlign = "center";
  c.textBaseline = "middle";
  fitFont(c, title, 800, DISPLAY, Math.round(h * 0.09), w * 0.7);
  c.fillText(title, 0, 2);
  c.restore();
  // platform band on top, rating at the foot
  c.fillStyle = platform;
  c.fillRect(0, 0, w, band);
  c.fillStyle = "#000";
  c.fillRect(0, band - 3, w, 6);
  c.fillStyle = "#fff";
  c.beginPath();
  c.roundRect(w * 0.06, band * 0.25, w * 0.3, band * 0.5, band * 0.25);
  c.fill();
  c.fillStyle = "#fff";
  c.fillRect(w * 0.06, h - w * 0.2, w * 0.14, w * 0.14);
  c.lineWidth = 4;
  c.strokeRect(w * 0.06, h - w * 0.2, w * 0.14, w * 0.14);
  c.fillStyle = "#000";
  c.font = `800 ${Math.round(w * 0.08)}px ${BODY}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("E", w * 0.13, h - w * 0.13);
  c.lineWidth = 8;
  c.strokeRect(0, 0, w, h);
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
}

// ---------- gym corner ----------
// The rep counter that pops up over the dumbbells
export function drawRepBadge(c, w, h, text, fill = "#ffdd00") {
  c.clearRect(0, 0, w, h);
  brutalBox(c, 10, 10, w - 34, h - 34, fill, { shadow: 12, line: 8 });
  c.fillStyle = "#000";
  c.textAlign = "center";
  c.textBaseline = "middle";
  fitFont(c, text, 800, DISPLAY, Math.round(h * 0.42), w - 80);
  c.fillText(text, (w - 24) / 2 + 2, (h - 24) / 2 + 4);
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
}

// A sheet that's been screwed up and thrown away, wrapped round a paper ball: a page torn from
// a lined notebook (blue rules, a red margin, a few lines of pencil scrawl, a crossed-out bit) or
// a printed page (grey type in blocks). Wrinkles are drawn in, a soft shadow along each crease
// with a light edge beside it, so the ball reads as crushed paper even where it faces the light.
export function drawCrumpledPaper(c, w, h, { lined = true, seed = 1 } = {}) {
  let s = seed * 9301 + 49297;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  c.fillStyle = lined ? "#fffdf5" : "#fbf8f0";
  c.fillRect(0, 0, w, h);
  paperGrain(c, w, h, 700);
  if (lined) {
    c.strokeStyle = "rgba(90,140,220,.55)";
    c.lineWidth = 2;
    for (let y = 18; y < h; y += 22) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
    c.strokeStyle = "rgba(230,80,80,.6)";
    c.beginPath();
    c.moveTo(w * 0.16, 0);
    c.lineTo(w * 0.16, h);
    c.stroke();
    // Pencil scrawl: wavy runs of "words" sitting on the rules
    c.strokeStyle = "rgba(50,50,60,.65)";
    c.lineWidth = 1.6;
    for (let y = 40; y < h * 0.8; y += 22) {
      let x = w * 0.19;
      const end = w * (0.6 + rand() * 0.35);
      while (x < end) {
        const word = 14 + rand() * 30;
        c.beginPath();
        c.moveTo(x, y - 3);
        for (let t = 0; t <= word; t += 3) c.lineTo(x + t, y - 3 - Math.abs(Math.sin((x + t) * 0.6)) * 5);
        c.stroke();
        x += word + 6;
      }
      if (rand() < 0.25) {
        c.beginPath();
        c.moveTo(w * 0.2, y - 6);
        c.lineTo(end * 0.8, y - 4);
        c.stroke();
      }
    }
  } else {
    c.fillStyle = "rgba(40,40,40,.4)";
    for (let y = 22; y < h - 20; y += 14) {
      if (rand() < 0.15) continue; // a paragraph break
      let x = w * 0.1;
      const end = w * (rand() < 0.2 ? 0.5 : 0.9);
      while (x < end) {
        const word = 8 + rand() * 26;
        c.fillRect(x, y, Math.min(word, end - x), 5);
        x += word + 5;
      }
    }
  }
  // Creases: long jagged folds right across the sheet, each a dark line with a lit edge
  for (let i = 0; i < 16; i++) {
    let x = rand() * w;
    let y = rand() * h;
    const a = rand() * Math.PI;
    const len = 60 + rand() * 160;
    const pts = [[x, y]];
    for (let t = 0; t < len; t += 18) {
      x += Math.cos(a) * 18 + (rand() - 0.5) * 10;
      y += Math.sin(a) * 18 + (rand() - 0.5) * 10;
      pts.push([x, y]);
    }
    [["rgba(120,100,70,.28)", 3, 0], ["rgba(255,255,255,.7)", 2, 2.5]].forEach(([stroke, width, off]) => {
      c.strokeStyle = stroke;
      c.lineWidth = width;
      c.beginPath();
      pts.forEach(([px, py], j) => (j ? c.lineTo(px + off, py + off) : c.moveTo(px + off, py + off)));
      c.stroke();
    });
  }
}

// Trophy metal: shallow chased flutes, soft polish and sparse tooling marks.
export function drawTrophyMetal(c, w, h) {
  c.fillStyle = "#fffdf0";
  c.fillRect(0, 0, w, h);
  const flute = w / 16;
  for (let i = 0; i < 16; i++) {
    const sheen = c.createLinearGradient(i * flute, 0, (i + 1) * flute, 0);
    sheen.addColorStop(0, "rgba(73,48,15,.08)");
    sheen.addColorStop(0.35, "rgba(255,255,255,.28)");
    sheen.addColorStop(1, "rgba(73,48,15,.08)");
    c.fillStyle = sheen;
    c.fillRect(i * flute, 0, flute, h);
  }
  let seed = 8317;
  const rand = () => ((seed = seed * 16807 % 2147483647) / 2147483647);
  for (let i = 0; i < 500; i++) {
    c.fillStyle = i % 3 ? "rgba(69,45,16,.045)" : "rgba(255,255,255,.22)";
    c.fillRect(rand() * w, rand() * h, 0.5 + rand() * 9, 0.6);
  }
}

// A restrained charcoal stone plinth with fine pale mineral veins.
export function drawTrophyStone(c, w, h) {
  c.fillStyle = "#292a2d";
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {
    c.strokeStyle = i % 2 ? "rgba(189,194,201,.16)" : "rgba(7,9,13,.35)";
    c.lineWidth = i % 2 ? 0.8 : 2;
    c.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const y = h * (i + 0.5) / 6 + Math.sin(x * 0.035 + i * 2) * 8 + x * 0.12;
      if (!x) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  }
}

// ---------- katana ----------
// A little four-pointed glint, for light catching a blade's tip
export function drawGlint(c, w, h) {
  c.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.moveTo(cx, 0);
  c.quadraticCurveTo(cx, cy, w, cy);
  c.quadraticCurveTo(cx, cy, cx, h);
  c.quadraticCurveTo(cx, cy, 0, cy);
  c.quadraticCurveTo(cx, cy, cx, 0);
  c.fill();
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, w * 0.3);
  g.addColorStop(0, "rgba(200,240,255,.9)");
  g.addColorStop(1, "rgba(200,240,255,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

// Enma's aura: a soft purple haze, darker at its heart
export function drawHakiAura(c, w, h) {
  c.clearRect(0, 0, w, h);
  // an ellipse of haze feathered all the way out, so its edges never show
  c.save();
  c.scale(1, h / w);
  const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, "rgba(46,14,80,.7)");
  g.addColorStop(0.35, "rgba(110,40,190,.45)");
  g.addColorStop(0.7, "rgba(168,85,247,.16)");
  g.addColorStop(1, "rgba(168,85,247,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, w, w);
  c.restore();
}

// The technique's name, called out in the site's own badge style: a slanted plate in the
// sword's colour (flat, ink outline, hard offset shadow), sized to the name (split over two
// lines when it's long), with a small ink 斬 ("cut") chip pinned to its corner
const SHOUT_COLORS = { wado: ["#ffdd00", "#1a1714"], kitetsu: ["#c81e1e", "#fffdf5"], enma: ["#6b2fa8", "#fffdf5"] };
export function drawShout(c, w, h, text, { style = "wado" } = {}) {
  c.clearRect(0, 0, w, h);
  const [fill, ink] = SHOUT_COLORS[style] || SHOUT_COLORS.wado;
  // the name: two lines at a colon or the middle space when it's long
  let lines = [text];
  if (text.length > 14) {
    const colon = text.indexOf(":");
    const cut = colon > 0 ? colon + 1 : text.lastIndexOf(" ", Math.ceil(text.length / 2) + 2);
    if (cut > 0) lines = [text.slice(0, cut).trim(), text.slice(cut).trim()];
  }
  const longest = lines.reduce((a, b) => (a.length > b.length ? a : b));
  fitFont(c, longest, 900, DISPLAY, Math.round(h * (lines.length > 1 ? 0.13 : 0.16)), w * 0.7);
  const size = parseInt(c.font.match(/(\d+)px/)[1], 10);
  const lead = size * 1.2;
  const textW = Math.max(...lines.map((line) => c.measureText(line).width));
  const plateW = textW + size * 1.6;
  const plateH = lead * lines.length + size * 0.9;
  const skew = plateH * 0.22;
  const shadow = h * 0.04;
  c.save();
  c.translate(w / 2, h / 2);
  c.rotate(-0.06);
  const plate = (dx, dy) => {
    c.beginPath();
    c.moveTo(-plateW / 2 + skew + dx, -plateH / 2 + dy);
    c.lineTo(plateW / 2 + skew + dx, -plateH / 2 + dy);
    c.lineTo(plateW / 2 - skew + dx, plateH / 2 + dy);
    c.lineTo(-plateW / 2 - skew + dx, plateH / 2 + dy);
    c.closePath();
  };
  plate(shadow, shadow);
  c.fillStyle = "#1a1714";
  c.fill();
  plate(0, 0);
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = h * 0.022;
  c.lineJoin = "miter";
  c.strokeStyle = "#1a1714";
  c.stroke();
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = ink;
  lines.forEach((line, i) => c.fillText(line, 0, (i - (lines.length - 1) / 2) * lead + size * 0.05));
  // the chip, half off the plate's top-left corner
  const chip = h * 0.15;
  c.translate(-plateW / 2 + skew - chip * 0.15, -plateH / 2 - chip * 0.1);
  c.rotate(-0.12);
  c.fillStyle = "#1a1714";
  c.fillRect(-chip / 2, -chip / 2, chip, chip);
  c.fillStyle = "#ffdd00";
  c.font = `900 ${Math.round(chip * 0.7)}px serif`;
  c.fillText("斬", 0, chip * 0.04);
  c.restore();
}

// Enma's blade, printed in the blade's own coordinates (x along it, y across, in world units):
// a black back, a cyan band and purple flames licking up from a lilac edge.
// `bow(x)` is the blade's curve; `length` its straight length; `width` the canvas's span in x.
export function drawEnmaBlade(c, w, h, { bow, length, width, yMin, yMax }) {
  c.clearRect(0, 0, w, h);
  const toRow = (y) => (1 - (y - yMin) / (yMax - yMin)) * h;
  for (let px = 0; px < w; px++) {
    const x = (px / w) * width;
    const t = Math.min(1, x / length);
    const edge = bow(Math.min(x, length)) - 0.055 * (1 - 0.3 * t);
    const spine = bow(Math.min(x, length)) + 0.05;
    const at = (f) => toRow(edge + (spine - edge) * f);
    const flame = 0.36 + 0.09 * Math.sin(x * 38) + 0.05 * Math.sin(x * 91 + 2);
    const band = 0.66 + 0.06 * Math.sin(x * 29 + 1);
    [[0, 0.12, "#e9d5ff"], [0.12, flame, "#9333ea"], [flame, band, "#22d3ee"], [band, 1.05, "#1a1714"]].forEach(([from, to, color]) => {
      c.fillStyle = color;
      c.fillRect(px, at(to), 1.5, at(from) - at(to) + 1);
    });
  }
  drawBladePolish(c, w, h, { bow, length, width, yMin, yMax });
}

// A little five-petalled yellow flower, the crest on Enma's scabbard and handle
export function drawEnmaFlower(c, w, h) {
  c.clearRect(0, 0, w, h);
  const r = w * 0.17;
  c.lineWidth = w * 0.05;
  c.strokeStyle = "#1a1714";
  c.fillStyle = "#ffdd00";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    c.beginPath();
    c.arc(w / 2 + Math.cos(a) * r * 1.15, h / 2 + Math.sin(a) * r * 1.15, r, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }
  c.beginPath();
  c.arc(w / 2, h / 2, r * 0.75, 0, Math.PI * 2);
  c.fillStyle = "#ff7a1a";
  c.fill();
  c.stroke();
}

// Wado Ichimonji: a black back over a clean white edge, split by a soft straight hamon
export function drawWadoBlade(c, w, h, { bow, length, width, yMin, yMax }) {
  c.clearRect(0, 0, w, h);
  const toRow = (y) => (1 - (y - yMin) / (yMax - yMin)) * h;
  for (let px = 0; px < w; px++) {
    const x = (px / w) * width;
    const t = Math.min(1, x / length);
    const edge = bow(Math.min(x, length)) - 0.055 * (1 - 0.3 * t);
    const spine = bow(Math.min(x, length)) + 0.05;
    const at = (f) => toRow(edge + (spine - edge) * f);
    const wave = 0.32 + 0.04 * Math.sin(x * 42) + 0.02 * Math.sin(x * 110);
    [[0, 0.15, "#ffffff"], [0.15, wave + 0.12, "#eef2f7"], [wave + 0.12, wave + 0.2, "#94a3b8"], [wave + 0.2, 1.05, "#1a1714"]].forEach(([from, to, color]) => {
      c.fillStyle = color;
      c.fillRect(px, at(to), 1.5, at(from) - at(to) + 1);
    });
  }
  drawBladePolish(c, w, h, { bow, length, width, yMin, yMax });
}

// Sandai Kitetsu: a black back, a white body and a jagged violet hamon along the edge
export function drawKitetsuBlade(c, w, h, { bow, length, width, yMin, yMax }) {
  c.clearRect(0, 0, w, h);
  const toRow = (y) => (1 - (y - yMin) / (yMax - yMin)) * h;
  for (let px = 0; px < w; px++) {
    const x = (px / w) * width;
    const t = Math.min(1, x / length);
    const edge = bow(Math.min(x, length)) - 0.055 * (1 - 0.3 * t);
    const spine = bow(Math.min(x, length)) + 0.05;
    const at = (f) => toRow(edge + (spine - edge) * f);
    const flame = 0.26 + 0.08 * Math.sin(x * 48) + 0.05 * Math.sin(x * 124 + 1);
    const back = 0.62 + 0.03 * Math.sin(x * 32);
    [[0, 0.08, "#c4b5fd"], [0.08, flame, "#6d28d9"], [flame, back, "#f8fafc"], [back, 1.05, "#1a1714"]].forEach(([from, to, color]) => {
      c.fillStyle = color;
      c.fillRect(px, at(to), 1.5, at(from) - at(to) + 1);
    });
  }
  drawBladePolish(c, w, h, { bow, length, width, yMin, yMax });
}

// TubeGeometry uses u along the saya, v around it. Highlights wrap seamlessly.
export function drawSayaLacquer(c, w, h, { color }) {
  c.fillStyle = color;
  c.fillRect(0, 0, w, h);
  const sheen = c.createLinearGradient(0, 0, 0, h);
  [[0, "rgba(0,0,0,.08)"], [0.2, "rgba(0,0,0,.22)"],
    [0.43, "rgba(255,255,255,.04)"], [0.5, "rgba(255,255,255,.3)"],
    [0.57, "rgba(255,255,255,.04)"], [0.8, "rgba(0,0,0,.22)"],
    [1, "rgba(0,0,0,.08)"]].forEach(([at, tone]) => sheen.addColorStop(at, tone));
  c.fillStyle = sheen;
  c.fillRect(0, 0, w, h);
  // Restrained lengthwise lacquer grain and small handling marks.
  let seed = 9413;
  const rand = () => ((seed = seed * 16807 % 2147483647) / 2147483647);
  for (let i = 0; i < 240; i++) {
    c.fillStyle = i % 3 ? "rgba(0,0,0,.045)" : "rgba(255,255,255,.12)";
    c.fillRect(rand() * w, rand() * h, 2 + rand() * w * 0.14, 0.5);
  }
}

// Fine longitudinal polishing lines follow the blade's curve and remain inside its edge. Over
// them, the steel in toon terms: the shinogi (the ridge line) inked along the blade, a bright
// band of polished steel just under it and a burnished, darker one above, a hard white line
// down the cutting edge, the yokote where the point begins, slanted bars of reflected light,
// and the fine sparkle of nie scattered along the temper line.
function drawBladePolish(c, w, h, { bow, length, width, yMin, yMax }) {
  const row = (x, f) => {
    const edge = bow(x) - 0.055 * (1 - 0.3 * x / length);
    return (1 - (edge + (bow(x) + 0.05 - edge) * f - yMin) / (yMax - yMin)) * h;
  };
  const strip = (f0, f1, color) => {
    c.beginPath();
    for (let px = 0; px <= w; px += 4) {
      const x = Math.min(px / w * width, length);
      (px ? c.lineTo : c.moveTo).call(c, px, row(x, f0));
    }
    for (let px = w; px >= 0; px -= 4) c.lineTo(px, row(Math.min(px / w * width, length), f1));
    c.closePath();
    c.fillStyle = color;
    c.fill();
  };
  strip(0.5, 0.6, "rgba(255,255,255,.42)");
  strip(0.64, 0.86, "rgba(0,0,0,.16)");
  strip(0.6, 0.64, "rgba(26,23,20,.55)");
  strip(0.02, 0.07, "rgba(255,255,255,.75)");
  const yx = (length / width) * w;
  c.fillStyle = "rgba(26,23,20,.5)";
  c.fillRect(yx - 1, row(length, 1), 2.5, row(length, 0) - row(length, 1));
  // slanted bars of light: a broad one and a thin one, twice along the blade
  c.fillStyle = "rgba(255,255,255,.28)";
  [[0.28, 0.03], [0.32, 0.008], [0.66, 0.025], [0.695, 0.007]].forEach(([at, wd]) => {
    c.beginPath();
    c.moveTo(w * at, h);
    c.lineTo(w * (at + wd), h);
    c.lineTo(w * (at + wd + 0.03), 0);
    c.lineTo(w * (at + 0.03), 0);
    c.closePath();
    c.fill();
  });
  let r = 4447;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  c.fillStyle = "rgba(255,255,255,.85)";
  for (let i = 0; i < 260; i++) {
    const px = rand() * w;
    const x = px / w * width;
    if (x > length) continue;
    c.fillRect(px, row(x, 0.12 + rand() * 0.3), 1.5, 1.5);
  }
  c.save();
  c.lineWidth = 0.6;
  for (let i = 1; i < 14; i++) {
    c.strokeStyle = i % 3 ? "rgba(255,255,255,.16)" : "rgba(0,0,0,.12)";
    c.beginPath();
    for (let px = 0; px <= w; px += 3) {
      const x = px / w * width;
      if (x > length) break;
      const edge = bow(x) - 0.055 * (1 - 0.3 * x / length);
      const y = edge + (bow(x) + 0.05 - edge) * i / 15;
      const row = (1 - (y - yMin) / (yMax - yMin)) * h;
      if (px === 0) c.moveTo(px, row);
      else c.lineTo(px, row);
    }
    c.stroke();
  }
  c.restore();
}

// A katana's handle wrap (tsuka-ito), for a cylinder laid along the handle: v runs along it,
// u around it. The cord crosses over itself and leaves a row of diamonds of the ray skin
// underneath showing on the front (u = 0) and the back (u = 0.5).
export function drawTsukaWrap(c, w, h, { cord, skin, diamonds = 7 }) {
  c.fillStyle = cord;
  c.fillRect(0, 0, w, h);
  // Diagonal silk fibres across the wrap, with alternating light and dark threads.
  c.save();
  c.lineWidth = 0.8;
  for (let y = -w; y < h + w; y += 3) {
    c.strokeStyle = y % 2 ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.2)";
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(w, y + w * 0.6);
    c.stroke();
  }
  c.restore();
  const step = h / diamonds;
  c.lineWidth = Math.max(2, w * 0.012);
  c.strokeStyle = "rgba(0,0,0,0.35)";
  [0, w / 2, w].forEach((cx) => {
    for (let i = 0; i < diamonds; i++) {
      const cy = (i + 0.5) * step;
      c.beginPath();
      c.moveTo(cx, cy - step * 0.42);
      c.lineTo(cx + w * 0.11, cy);
      c.lineTo(cx, cy + step * 0.42);
      c.lineTo(cx - w * 0.11, cy);
      c.closePath();
      c.fillStyle = skin;
      c.fill();
      // Pebbled ray skin stays clipped to each diamond opening.
      c.save();
      c.clip();
      for (let py = cy - step * 0.42; py < cy + step * 0.42; py += 5) {
        for (let px = cx - w * 0.11; px < cx + w * 0.11; px += 5) {
          c.fillStyle = "rgba(255,255,255,.28)";
          c.beginPath();
          c.arc(px + (Math.round(py / 5) % 2) * 2.5, py, 1.2, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.restore();
      // Restore the diamond path after drawing the skin's individual nodules.
      c.beginPath();
      c.moveTo(cx, cy - step * 0.42);
      c.lineTo(cx + w * 0.11, cy);
      c.lineTo(cx, cy + step * 0.42);
      c.lineTo(cx - w * 0.11, cy);
      c.closePath();
      c.stroke();
      // the cord's crossing line between diamonds
      c.beginPath();
      c.moveTo(cx - w * 0.16, cy + step * 0.5);
      c.lineTo(cx + w * 0.16, cy + step * 0.5);
      c.stroke();
    }
  });
}

// ---------- family portrait ----------
// The family on the desk frame, drawn as an anime-style illustration: dad with his arm round
// mum (in a hijab), who holds their waving two-year-old daughter, and their seven-year-old son
// in front in a little straw hat, throwing a peace sign. Heads lean in toward each other; flat
// colours, thick ink lines and big shiny eyes, like the rest of the room.
export function drawFamilyPortrait(c, w, h) {
  const u = w / 360;
  const INK = "#1a1714";
  const SKIN = "#f6d2b4";
  const SKIN_SHADE = "#e9b894";
  c.save();
  c.scale(u, u);
  const H = h / u;
  const line = (width = 4) => {
    c.lineWidth = width;
    c.strokeStyle = INK;
    c.lineJoin = "round";
    c.lineCap = "round";
  };
  const shape = (fill, draw, width = 4) => {
    c.beginPath();
    draw();
    c.fillStyle = fill;
    c.fill();
    if (width) {
      line(width);
      c.stroke();
    }
  };
  const ellipse = (x, y, rx, ry, fill, width = 4) => shape(fill, () => c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2), width);
  const stroke = (width, draw) => {
    line(width);
    c.beginPath();
    draw();
    c.stroke();
  };
  // Draws `fn` turned by `angle` about (x, y): for heads leaning in
  const tilted = (x, y, angle, fn) => {
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.translate(-x, -y);
    fn();
    c.restore();
  };
  const sparkle = (x, y, r, color = "#fff") => {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x, y - r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y);
    c.quadraticCurveTo(x, y, x, y - r);
    c.fill();
  };
  const heart = (x, y, r, color) => {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x, y + r * 0.9);
    c.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.35);
    c.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
    c.fill();
    line(2);
    c.stroke();
  };

  // ---- Backdrop: a warm sky, sun rays, soft bokeh, petals and a flowery lawn ----
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#ffe7c2");
  sky.addColorStop(0.6, "#ffd1dc");
  sky.addColorStop(1, "#cfe8d5");
  c.fillStyle = sky;
  c.fillRect(0, 0, 360, H);
  c.save();
  c.globalAlpha = 0.35;
  c.fillStyle = "#fff7e6";
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.22;
    c.beginPath();
    c.moveTo(180, 120);
    c.lineTo(180 + Math.cos(a - 0.06) * 700, 120 + Math.sin(a - 0.06) * 700);
    c.lineTo(180 + Math.cos(a + 0.06) * 700, 120 + Math.sin(a + 0.06) * 700);
    c.closePath();
    c.fill();
  }
  [[50, 150, 26], [320, 200, 20], [300, 60, 14], [40, 380, 18], [330, 420, 24], [90, 40, 12]].forEach(([x, y, r]) => {
    c.globalAlpha = 0.28;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = "#ffffff";
    c.fill();
  });
  c.restore();
  ellipse(180, 120, 70, 70, "#fff3d6", 0);
  [[40, 70, 0.4], [310, 110, -0.6], [70, 300, 1.1], [300, 330, 0.2], [30, 470, -0.3], [330, 520, 0.8], [250, 50, 1.4], [120, 90, 2.1]].forEach(([x, y, r]) => {
    c.save();
    c.translate(x, y);
    c.rotate(r);
    c.beginPath();
    c.ellipse(0, 0, 9, 5.5, 0, 0, Math.PI * 2);
    c.fillStyle = "#ff9ec2";
    c.fill();
    line(2.5);
    c.stroke();
    c.restore();
  });
  [[64, 120, 7], [292, 160, 9], [320, 470, 6], [44, 250, 6]].forEach(([x, y, r]) => sparkle(x, y, r));
  shape("#a7d7a5", () => {
    c.moveTo(0, 560);
    c.quadraticCurveTo(180, 530, 360, 560);
    c.lineTo(360, H);
    c.lineTo(0, H);
    c.closePath();
  });
  // little flowers and grass tufts on the lawn
  [[30, 572, "#fffdf5"], [70, 585, "#ffdd00"], [300, 575, "#ff90b3"], [334, 590, "#fffdf5"], [110, 592, "#ff90b3"]].forEach(([x, y, color]) => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ellipse(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.4, 3.4, color, 1.5);
    }
    ellipse(x, y, 2.6, 2.6, "#ffb000", 1.2);
  });
  [[150, 580], [240, 586], [20, 600], [350, 610]].forEach(([x, y]) => stroke(2.5, () => {
    c.moveTo(x - 6, y + 4);
    c.lineTo(x - 3, y - 4);
    c.moveTo(x, y + 4);
    c.lineTo(x + 1, y - 7);
    c.moveTo(x + 6, y + 4);
    c.lineTo(x + 5, y - 3);
  }));

  // An anime face: brows, big glossy eyes (or happy closed ones), rosy cheeks and a smile that
  // can open into a grin
  const face = (x, y, r, { eye = "#5a3825", lashes = false, closed = false, grin = false, brow = INK } = {}) => {
    ellipse(x, y, r, r * 1.04, SKIN);
    // a soft shade under the hairline
    c.save();
    c.globalAlpha = 0.25;
    c.beginPath();
    c.ellipse(x, y - r * 0.55, r * 0.85, r * 0.3, 0, 0, Math.PI * 2);
    c.fillStyle = SKIN_SHADE;
    c.fill();
    c.restore();
    [-1, 1].forEach((side) => {
      const ex = x + side * r * 0.38;
      const ey = y + r * 0.12;
      c.fillStyle = "#ff9fb1";
      c.globalAlpha = 0.7;
      c.beginPath();
      c.ellipse(ex + side * r * 0.12, ey + r * 0.32, r * 0.17, r * 0.09, 0, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
      // blush hatching
      stroke(1.5, () => {
        [-0.08, 0, 0.08].forEach((dx) => {
          c.moveTo(ex + side * r * (0.08 + dx), ey + r * 0.36);
          c.lineTo(ex + side * r * (0.13 + dx), ey + r * 0.28);
        });
      });
      // brows, raised and soft
      c.strokeStyle = brow;
      line(r * 0.07);
      c.strokeStyle = brow;
      c.beginPath();
      c.moveTo(ex - side * r * 0.14, ey - r * 0.36);
      c.quadraticCurveTo(ex + side * r * 0.02, ey - r * 0.46, ex + side * r * 0.18, ey - r * 0.38);
      c.stroke();
      if (closed) {
        stroke(3, () => c.arc(ex, ey + r * 0.04, r * 0.14, Math.PI * 1.1, Math.PI * 1.9));
        return;
      }
      c.beginPath();
      c.ellipse(ex, ey, r * 0.15, r * 0.22, 0, 0, Math.PI * 2);
      c.fillStyle = INK;
      c.fill();
      c.beginPath();
      c.ellipse(ex, ey + r * 0.05, r * 0.11, r * 0.14, 0, 0, Math.PI * 2);
      c.fillStyle = eye;
      c.fill();
      c.fillStyle = "#fff";
      c.beginPath();
      c.arc(ex - r * 0.05, ey - r * 0.08, r * 0.065, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(ex + r * 0.05, ey + r * 0.08, r * 0.03, 0, Math.PI * 2);
      c.fill();
      if (lashes) {
        stroke(3, () => {
          c.moveTo(ex + side * r * 0.12, ey - r * 0.16);
          c.lineTo(ex + side * r * 0.24, ey - r * 0.26);
        });
      }
    });
    if (grin) {
      shape("#7a2b2b", () => {
        c.moveTo(x - r * 0.22, y + r * 0.42);
        c.quadraticCurveTo(x, y + r * 0.44, x + r * 0.22, y + r * 0.42);
        c.quadraticCurveTo(x + r * 0.2, y + r * 0.72, x, y + r * 0.72);
        c.quadraticCurveTo(x - r * 0.2, y + r * 0.72, x - r * 0.22, y + r * 0.42);
        c.closePath();
      }, 2.5);
      ellipse(x, y + r * 0.63, r * 0.1, r * 0.06, "#ff8a8a", 0);
    } else stroke(3, () => c.arc(x, y + r * 0.42, r * 0.15, Math.PI * 0.12, Math.PI * 0.88));
  };
  const neck = (x, y, wd, hd) => shape(SKIN_SHADE, () => c.rect(x - wd / 2, y, wd, hd), 3);
  const hand = (x, y, r = 9) => ellipse(x, y, r, r * 0.9, SKIN, 3);
  // A sleeve as a thick rounded stroke from a to b, with a hand at the end
  const arm = (color, x1, y1, cx, cy, x2, y2, width = 22, handR = 9) => {
    c.lineCap = "round";
    c.lineWidth = width + 8;
    c.strokeStyle = INK;
    c.beginPath();
    c.moveTo(x1, y1);
    c.quadraticCurveTo(cx, cy, x2, y2);
    c.stroke();
    c.lineWidth = width;
    c.strokeStyle = color;
    c.stroke();
    hand(x2, y2, handR);
  };

  // ---- Dad (right): short black hair, navy overshirt over a white tee, khaki trousers ----
  const DX = 248;
  shape("#c8a97e", () => {
    c.moveTo(DX - 48, 380);
    c.lineTo(DX - 52, 560);
    c.lineTo(DX - 6, 560);
    c.lineTo(DX, 420);
    c.lineTo(DX + 6, 560);
    c.lineTo(DX + 52, 560);
    c.lineTo(DX + 48, 380);
    c.closePath();
  });
  stroke(2, () => {
    c.moveTo(DX - 28, 430);
    c.lineTo(DX - 30, 550);
    c.moveTo(DX + 28, 430);
    c.lineTo(DX + 30, 550);
  });
  [-1, 1].forEach((s) => {
    shape("#5a3a2a", () => c.roundRect(DX + s * 28 - 26, 552, 52, 16, 7), 3);
    stroke(2, () => {
      c.moveTo(DX + s * 28 - 10, 556);
      c.lineTo(DX + s * 28 + 10, 556);
    });
  });
  neck(DX, 222, 26, 24);
  shape("#2f4a7a", () => {
    c.moveTo(DX - 62, 262);
    c.quadraticCurveTo(DX, 236, DX + 62, 262);
    c.lineTo(DX + 54, 392);
    c.lineTo(DX - 54, 392);
    c.closePath();
  });
  // open front showing the tee, collar points, buttons and a chest pocket
  shape("#fffdf5", () => {
    c.moveTo(DX - 18, 244);
    c.lineTo(DX + 18, 244);
    c.lineTo(DX + 12, 392);
    c.lineTo(DX - 12, 392);
    c.closePath();
  }, 3);
  shape("#3d5f99", () => {
    c.moveTo(DX - 18, 244);
    c.lineTo(DX - 4, 262);
    c.lineTo(DX - 26, 270);
    c.closePath();
  }, 2.5);
  shape("#3d5f99", () => {
    c.moveTo(DX + 18, 244);
    c.lineTo(DX + 4, 262);
    c.lineTo(DX + 26, 270);
    c.closePath();
  }, 2.5);
  shape("#3d5f99", () => c.rect(DX + 24, 290, 20, 18), 2.5);
  [300, 330, 360].forEach((y) => ellipse(DX - 22, y, 2.5, 2.5, "#fffdf5", 1.5));
  shape("#7a5a2a", () => c.rect(DX - 54, 384, 108, 10), 2.5);
  ellipse(DX, 389, 6, 5, "#d4a72c", 2);
  // right arm down, thumbs up
  arm("#2f4a7a", DX + 52, 272, DX + 74, 330, DX + 62, 384, 22, 10);
  shape(SKIN, () => c.roundRect(DX + 58, 366, 8, 14, 4), 2.5);
  shape("#fffdf5", () => c.rect(DX + 50, 372, 22, 5), 2);
  // head, leaning toward mum
  tilted(DX, 222, -0.1, () => {
    face(DX, 188, 40, { grin: true });
    shape(INK, () => {
      c.moveTo(DX - 42, 186);
      c.quadraticCurveTo(DX - 46, 136, DX - 6, 140);
      c.lineTo(DX + 2, 130);
      c.lineTo(DX + 10, 142);
      c.quadraticCurveTo(DX + 46, 140, DX + 42, 186);
      c.quadraticCurveTo(DX + 34, 168, DX + 20, 166);
      c.lineTo(DX + 10, 174);
      c.lineTo(DX + 4, 162);
      c.quadraticCurveTo(DX - 20, 170, DX - 30, 160);
      c.quadraticCurveTo(DX - 36, 176, DX - 42, 186);
      c.closePath();
    }, 3);
    // a shine on the hair, and ears
    c.strokeStyle = "#4b5e86";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(DX - 6, 158, 20, Math.PI * 1.15, Math.PI * 1.55);
    c.stroke();
    [-1, 1].forEach((s) => ellipse(DX + s * 41, 194, 6, 9, SKIN, 3));
  });

  // ---- Mum (left): a dusty-rose hijab with a brooch, and a long sage dress with a belt ----
  const MX = 118;
  shape("#8fb8a0", () => {
    c.moveTo(MX - 44, 290);
    c.quadraticCurveTo(MX - 60, 440, MX - 70, 562);
    c.lineTo(MX + 70, 562);
    c.quadraticCurveTo(MX + 60, 440, MX + 44, 290);
    c.closePath();
  });
  // a little floral print and the dress's folds
  [[MX - 30, 430], [MX + 20, 470], [MX - 12, 510], [MX + 36, 530], [MX - 44, 520], [MX + 6, 420]].forEach(([x, y]) => {
    for (let i = 0; i < 4; i++) ellipse(x + Math.cos((i * Math.PI) / 2) * 3, y + Math.sin((i * Math.PI) / 2) * 3, 2.4, 2.4, "#fffdf5", 0);
    ellipse(x, y, 1.6, 1.6, "#ffb000", 0);
  });
  stroke(2, () => {
    c.moveTo(MX - 20, 420);
    c.quadraticCurveTo(MX - 26, 500, MX - 30, 556);
    c.moveTo(MX + 24, 430);
    c.quadraticCurveTo(MX + 30, 500, MX + 34, 556);
  });
  shape("#6f9a82", () => c.rect(MX - 50, 384, 100, 10), 2.5);
  [-1, 1].forEach((s) => shape("#6b4a3a", () => c.roundRect(MX + s * 26 - 20, 556, 40, 12, 6), 3));
  // left arm hanging down
  arm("#7aa38b", MX - 52, 304, MX - 70, 380, MX - 58, 450, 22, 9);
  // The hijab: a rounded hood framing the face and a drape over the shoulders, head leaning in
  tilted(MX, 240, 0.09, () => {
    shape("#d98fa0", () => {
      c.moveTo(MX - 50, 200);
      c.quadraticCurveTo(MX - 54, 152, MX, 150);
      c.quadraticCurveTo(MX + 54, 152, MX + 50, 200);
      c.quadraticCurveTo(MX + 66, 280, MX + 52, 322);
      c.quadraticCurveTo(MX, 340, MX - 52, 322);
      c.quadraticCurveTo(MX - 66, 280, MX - 50, 200);
      c.closePath();
    });
    // a soft shine on the fabric
    c.strokeStyle = "#f2b9c6";
    c.lineWidth = 4;
    c.beginPath();
    c.arc(MX - 4, 196, 44, Math.PI * 1.2, Math.PI * 1.45);
    c.stroke();
    face(MX, 212, 34, { lashes: true, closed: true, grin: false });
    // the inner band hugging the face
    c.beginPath();
    c.ellipse(MX, 210, 36, 40, 0, Math.PI * 1.08, Math.PI * 1.92);
    line(7);
    c.strokeStyle = "#f2c6cf";
    c.stroke();
    stroke(3, () => c.ellipse(MX, 210, 40, 44, 0, Math.PI * 1.05, Math.PI * 1.95));
    // the drape's folds and a pearl brooch under the chin
    [[MX - 30, 268, MX - 38, 314], [MX + 30, 268, MX + 38, 314], [MX - 12, 290, MX - 16, 330]].forEach(([x1, y1, x2, y2]) => stroke(2.5, () => {
      c.moveTo(x1, y1);
      c.quadraticCurveTo((x1 + x2) / 2 + (x1 < MX ? -6 : 6), (y1 + y2) / 2, x2, y2);
    }));
    ellipse(MX + 22, 262, 7, 7, "#fffdf5", 2.5);
    ellipse(MX + 22, 262, 3, 3, "#ffd34d", 0);
  });

  // Dad's arm round mum's shoulders, his hand on her far shoulder
  arm("#2f4a7a", DX - 50, 270, MX + 80, 248, MX + 44, 284, 20, 9);

  // ---- The little girl (2), on Mum's hip: pigtails with bows, a yellow dress, waving ----
  c.save();
  c.translate(4, -22);
  const GX = 168;
  // Mum's arm, under her: up from Mum's side and round beneath her
  arm("#7aa38b", MX + 40, 304, MX + 30, 378, GX - 20, 352, 18, 0.1);
  shape("#ffd34d", () => {
    c.moveTo(GX - 22, 316);
    c.quadraticCurveTo(GX, 306, GX + 22, 316);
    c.lineTo(GX + 30, 372);
    c.lineTo(GX - 30, 372);
    c.closePath();
  });
  // a white collar and a little flower on the dress
  shape("#fffdf5", () => {
    c.moveTo(GX - 14, 312);
    c.quadraticCurveTo(GX - 8, 324, GX, 316);
    c.quadraticCurveTo(GX + 8, 324, GX + 14, 312);
    c.closePath();
  }, 2);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ellipse(GX + 12 + Math.cos(a) * 3.5, 350 + Math.sin(a) * 3.5, 2.6, 2.6, "#ff90b3", 0);
  }
  ellipse(GX + 12, 350, 1.8, 1.8, "#fff", 0);
  [-1, 1].forEach((s) => shape(SKIN, () => c.roundRect(GX + s * 12 - 6, 368, 12, 24, 6), 3));
  [-1, 1].forEach((s) => ellipse(GX + s * 12, 394, 9, 6, "#ff90b3", 3));
  // her waving arm, up by her head
  arm("#ffd34d", GX + 20, 322, GX + 42, 312, GX + 40, 280, 10, 7);
  stroke(2, () => {
    c.arc(GX + 40, 280, 14, Math.PI * 1.2, Math.PI * 1.5);
    c.moveTo(GX + 56, 272);
    c.arc(GX + 40, 280, 18, Math.PI * 1.75, Math.PI * 1.95);
  });
  tilted(GX, 300, -0.12, () => {
    [-1, 1].forEach((s) => ellipse(GX + s * 34, 268, 10, 13, "#4a2c1d", 3));
    face(GX, 282, 26, { eye: "#3d2a1e", grin: true });
    shape("#4a2c1d", () => {
      c.moveTo(GX - 27, 280);
      c.quadraticCurveTo(GX - 28, 250, GX, 252);
      c.quadraticCurveTo(GX + 28, 250, GX + 27, 280);
      c.quadraticCurveTo(GX + 14, 266, GX + 2, 270);
      c.quadraticCurveTo(GX - 12, 264, GX - 27, 280);
      c.closePath();
    }, 3);
    // bows on the pigtails
    [-1, 1].forEach((s) => {
      [-1, 1].forEach((k) => shape("#ff6b8b", () => {
        c.moveTo(GX + s * 30, 258);
        c.lineTo(GX + s * 30 + k * 9, 252);
        c.lineTo(GX + s * 30 + k * 9, 264);
        c.closePath();
      }, 2));
      ellipse(GX + s * 30, 258, 3, 3, "#ff6b8b", 2);
    });
  });
  // Mum's hand on her side (the arm runs under her, drawn before her)
  hand(GX - 20, 352, 8);
  c.restore();

  // ---- The boy (7), in front: a straw hat, a red shirt, blue shorts and a peace sign ----
  const BX = 182;
  [-1, 1].forEach((s) => shape(SKIN, () => c.roundRect(BX + s * 14 - 8, 510, 16, 44, 7), 3));
  [-1, 1].forEach((s) => {
    shape("#fffdf5", () => c.roundRect(BX + s * 16 - 15, 550, 30, 14, 6), 3);
    shape("#e5484d", () => c.rect(BX + s * 16 - 15, 559, 30, 4), 0);
    stroke(1.5, () => {
      c.moveTo(BX + s * 16 - 4, 552);
      c.lineTo(BX + s * 16 + 4, 556);
      c.moveTo(BX + s * 16 + 4, 552);
      c.lineTo(BX + s * 16 - 4, 556);
    });
  });
  shape("#3b6fd6", () => c.roundRect(BX - 32, 478, 64, 42, 8));
  stroke(2, () => {
    c.moveTo(BX, 486);
    c.lineTo(BX, 518);
  });
  shape("#e5484d", () => {
    c.moveTo(BX - 40, 420);
    c.quadraticCurveTo(BX, 404, BX + 40, 420);
    c.lineTo(BX + 36, 486);
    c.lineTo(BX - 36, 486);
    c.closePath();
  });
  stroke(3, () => {
    c.moveTo(BX - 8, 412);
    c.lineTo(BX - 4, 482);
    c.moveTo(BX + 8, 412);
    c.lineTo(BX + 4, 482);
  });
  [440, 460].forEach((y) => ellipse(BX - 13, y, 2.6, 2.6, "#ffdd00", 1.5));
  // left arm down, right arm up making a peace sign
  arm("#e5484d", BX - 38, 428, BX - 50, 460, BX - 46, 486, 18, 8);
  arm("#e5484d", BX + 38, 428, BX + 66, 420, BX + 62, 382, 18, 9);
  [-1, 1].forEach((s) => shape(SKIN, () => {
    c.save();
    c.translate(BX + 62 + s * 4, 372);
    c.rotate(s * 0.25);
    c.roundRect(-3.5, -16, 7, 18, 3.5);
    c.restore();
  }, 2.5));
  hand(BX + 62, 382, 9);
  tilted(BX, 410, 0.07, () => {
    face(BX, 380, 31, { grin: true });
    shape("#2a1a12", () => {
      c.moveTo(BX - 32, 378);
      c.quadraticCurveTo(BX - 34, 350, BX, 350);
      c.quadraticCurveTo(BX + 34, 350, BX + 32, 378);
      c.lineTo(BX + 22, 366);
      c.lineTo(BX + 12, 374);
      c.lineTo(BX + 2, 362);
      c.lineTo(BX - 10, 374);
      c.lineTo(BX - 20, 364);
      c.closePath();
    }, 3);
    // a sticking plaster on his cheek, for a boy who plays hard
    c.save();
    c.translate(BX - 18, 396);
    c.rotate(-0.4);
    shape("#ffd9a8", () => c.roundRect(-7, -3, 14, 6, 3), 1.5);
    c.restore();
    // the straw hat: a wide brim, a round crown, a red band and woven lines
    shape("#f2c14e", () => c.ellipse(BX, 356, 54, 12, 0, 0, Math.PI * 2));
    shape("#f2c14e", () => {
      c.moveTo(BX - 30, 356);
      c.quadraticCurveTo(BX - 32, 318, BX, 318);
      c.quadraticCurveTo(BX + 32, 318, BX + 30, 356);
      c.closePath();
    });
    shape("#d62828", () => c.rect(BX - 31, 340, 62, 12), 3);
    c.strokeStyle = "#c99a32";
    c.lineWidth = 1.5;
    [-36, -22, 22, 36].forEach((dx) => {
      c.beginPath();
      c.moveTo(BX + dx, 352);
      c.lineTo(BX + dx * 1.25, 362);
      c.stroke();
    });
  });

  // a few hearts floating up between them
  heart(206, 150, 7, "#ff6b8b");
  heart(222, 128, 5, "#ff90b3");
  heart(70, 210, 6, "#ff90b3");

  // Caption
  c.fillStyle = INK;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = "800 30px 'Space Grotesk', sans-serif";
  c.fillText("Our Little Family", 180, 616);
  heart(180, 648, 9, "#e5484d");
  c.restore();
}

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

// ---------- weather card (beside the window) ----------
// WMO weather codes, as Open-Meteo reports them, to a label and an icon kind
export function weatherKind(code) {
  if (code === 0) return ["Clear", "clear"];
  if (code <= 2) return ["Partly cloudy", "partly"];
  if (code === 3) return ["Overcast", "cloudy"];
  if (code === 45 || code === 48) return ["Fog", "fog"];
  if (code >= 51 && code <= 57) return ["Drizzle", "rain"];
  if (code >= 61 && code <= 67) return ["Rain", "rain"];
  if (code >= 71 && code <= 77) return ["Snow", "snow"];
  if (code >= 80 && code <= 82) return ["Showers", "rain"];
  if (code >= 85 && code <= 86) return ["Snow showers", "snow"];
  if (code >= 95) return ["Thunderstorm", "storm"];
  return ["—", "cloudy"];
}

// A little icon for a kind of weather, `s` across, centred on (x, y): flat colours with a
// shaded underside and a sheen up top, like the rest of the desk's cartoon props
function weatherIcon(c, x, y, s, kind, night = false) {
  const ink = "#1a1714";
  c.save();
  c.lineJoin = "round";
  c.lineCap = "round";
  c.lineWidth = s * 0.05;
  c.strokeStyle = ink;
  // fill a shape, shade the part of it `below` traces (it may name a fill rule), add a sheen,
  // then ink its edge
  const cel = (path, fill, below, sheen) => {
    path();
    c.fillStyle = fill;
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = mixHex(fill, "#3b3a7a", 0.22);
    c.fill(below() || "nonzero");
    if (sheen) {
      c.fillStyle = "rgba(255,255,255,.75)";
      sheen();
      c.fill();
    }
    c.restore();
    path();
    c.stroke();
  };
  const sun = (cx, cy, r) => {
    if (night) {
      const moon = () => {
        c.beginPath();
        c.arc(cx, cy, r, Math.PI * 0.35, Math.PI * 1.65);
        c.arc(cx + r * 0.45, cy - r * 0.1, r * 0.8, Math.PI * 1.55, Math.PI * 0.45, true);
        c.closePath();
      };
      cel(moon, "#fff3b0", () => {
        c.beginPath();
        c.arc(cx - r * 0.2, cy + r * 0.35, r * 0.9, 0, Math.PI * 2);
      });
      c.fillStyle = "#e6d27a";
      [[-0.55, -0.2, 0.13], [-0.35, 0.35, 0.09]].forEach(([dx, dy, k]) => {
        c.beginPath();
        c.arc(cx + dx * r, cy + dy * r, k * r, 0, Math.PI * 2);
        c.fill();
      });
      return;
    }
    // rays: long and short in turn, each a rounded wedge
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const len = i % 2 ? 1.5 : 1.75;
      c.save();
      c.translate(cx, cy);
      c.rotate(a);
      c.beginPath();
      c.moveTo(r * 1.22, -r * 0.13);
      c.lineTo(r * len, 0);
      c.lineTo(r * 1.22, r * 0.13);
      c.closePath();
      c.fillStyle = i % 2 ? "#ffb02e" : "#ffcf3a";
      c.fill();
      c.stroke();
      c.restore();
    }
    cel(() => {
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
    }, "#ffcf3a", () => {
      // everything outside a circle nudged up and left: a crescent of shade low on the right
      c.beginPath();
      c.arc(cx - r * 0.25, cy - r * 0.3, r * 1.05, 0, Math.PI * 2);
      c.rect(cx - r * 2, cy - r * 2, r * 4, r * 4);
      return "evenodd";
    }, () => {
      c.beginPath();
      c.ellipse(cx - r * 0.38, cy - r * 0.42, r * 0.26, r * 0.15, -0.6, 0, Math.PI * 2);
    });
  };
  const cloud = (cx, cy, r, fill = "#fffdf5") => {
    const shape = () => {
      c.beginPath();
      c.arc(cx - r * 0.75, cy + r * 0.15, r * 0.55, Math.PI * 0.5, Math.PI * 1.5);
      c.arc(cx - r * 0.15, cy - r * 0.25, r * 0.7, Math.PI * 1.05, Math.PI * 1.9);
      c.arc(cx + r * 0.65, cy + r * 0.1, r * 0.6, Math.PI * 1.35, Math.PI * 0.5);
      c.closePath();
    };
    cel(shape, fill, () => {
      c.beginPath();
      c.rect(cx - r * 2, cy + r * 0.28, r * 4, r * 2);
    }, () => {
      c.beginPath();
      c.ellipse(cx - r * 0.3, cy - r * 0.55, r * 0.26, r * 0.11, -0.25, 0, Math.PI * 2);
    });
  };
  const drop = (px, py, k) => {
    c.beginPath();
    c.moveTo(px, py - k * 1.3);
    c.quadraticCurveTo(px + k, py + k * 0.2, px, py + k);
    c.quadraticCurveTo(px - k, py + k * 0.2, px, py - k * 1.3);
    c.fillStyle = "#5fb3ff";
    c.fill();
    c.stroke();
    c.beginPath();
    c.arc(px - k * 0.3, py + k * 0.05, k * 0.22, 0, Math.PI * 2);
    c.fillStyle = "#fffdf5";
    c.fill();
  };
  if (kind === "clear") sun(x, y, s * 0.24);
  else if (kind === "partly") {
    sun(x - s * 0.14, y - s * 0.12, s * 0.18);
    cloud(x + s * 0.08, y + s * 0.1, s * 0.3);
  } else if (kind === "cloudy") {
    cloud(x + s * 0.12, y - s * 0.08, s * 0.24, "#c9d1dc");
    cloud(x - s * 0.04, y + s * 0.08, s * 0.32);
  } else if (kind === "fog") {
    cloud(x, y - s * 0.12, s * 0.28, "#dfe4ea");
    [0.16, 0.3].forEach((dy, i) => {
      c.beginPath();
      const x0 = x - s * (0.32 - i * 0.06);
      const x1 = x + s * (0.32 - i * 0.1);
      c.moveTo(x0, y + s * dy);
      for (let k = 1; k <= 4; k++) c.quadraticCurveTo(x0 + ((k - 0.5) / 4) * (x1 - x0), y + s * (dy + (k % 2 ? -0.03 : 0.03)), x0 + (k / 4) * (x1 - x0), y + s * dy);
      c.stroke();
    });
  } else {
    cloud(x, y - s * 0.1, s * 0.3, kind === "storm" ? "#9aa5b5" : "#dfe6f0");
    if (kind === "storm") {
      const bolt = () => {
        c.beginPath();
        c.moveTo(x + s * 0.02, y + s * 0.06);
        c.lineTo(x - s * 0.1, y + s * 0.26);
        c.lineTo(x + s * 0.02, y + s * 0.26);
        c.lineTo(x - s * 0.06, y + s * 0.44);
        c.lineTo(x + s * 0.16, y + s * 0.18);
        c.lineTo(x + s * 0.04, y + s * 0.18);
        c.closePath();
      };
      cel(bolt, "#ffdd00", () => {
        c.beginPath();
        c.rect(x + s * 0.03, y, s * 0.3, s * 0.5);
      });
    } else {
      [-0.16, 0, 0.16].forEach((dx, i) => {
        const px = x + s * dx;
        const py = y + s * (0.24 + (i % 2) * 0.08);
        if (kind !== "snow") return drop(px, py, s * 0.05);
        c.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI;
          c.moveTo(px - Math.cos(a) * s * 0.05, py - Math.sin(a) * s * 0.05);
          c.lineTo(px + Math.cos(a) * s * 0.05, py + Math.sin(a) * s * 0.05);
        }
        c.stroke();
      });
    }
  }
  c.restore();
}

// The card: where and when, the weather right now (icon, temperature, what it's doing,
// humidity and wind), then the next few days. `weather` is null while it loads, or has
// `error` when it couldn't be fetched. Card stock with a fine grain, taped to the wall.
export function drawWeatherCard(c, w, h, { place, weather }) {
  c.clearRect(0, 0, w, h);
  const pad = w * 0.06;
  const ink = "#1a1714";
  const cardW = w - 30;
  const cardH = h - 30;
  brutalBox(c, 6, 6, cardW, cardH, "#fffdf5", { shadow: 16, line: 7 });
  c.save();
  c.beginPath();
  c.rect(10, 10, cardW - 8, cardH - 8);
  c.clip();
  // the stock: a faint grid and a scatter of fibres and flecks
  c.fillStyle = "rgba(47,124,246,.06)";
  for (let gx = 10; gx < cardW; gx += 36) c.fillRect(gx, 10, 2, cardH);
  for (let gy = 10; gy < cardH; gy += 36) c.fillRect(10, gy, cardW, 2);
  for (let i = 0; i < 700; i++) {
    const fx = 10 + ((i * 0.6180339) % 1) * cardW;
    const fy = 10 + ((i * 0.7548776 + 0.3) % 1) * cardH;
    c.fillStyle = i % 3 ? "rgba(26,23,20,.07)" : "rgba(160,120,60,.09)";
    c.fillRect(fx, fy, i % 5 ? 2 : 5, 2);
  }
  // header band: sky blue, a shaded lower edge, light diagonal stripes
  const bandH = h * 0.11;
  c.fillStyle = "#7fdfff";
  c.fillRect(9, 9, cardW - 6, bandH);
  c.fillStyle = "rgba(255,255,255,.28)";
  for (let sx = -bandH; sx < cardW; sx += 34) {
    c.beginPath();
    c.moveTo(sx, 9 + bandH);
    c.lineTo(sx + 12, 9 + bandH);
    c.lineTo(sx + 12 + bandH, 9);
    c.lineTo(sx + bandH, 9);
    c.closePath();
    c.fill();
  }
  c.fillStyle = "#4fc3ea";
  c.fillRect(9, 9 + bandH - 9, cardW - 6, 9);
  c.restore();
  c.fillStyle = ink;
  c.fillRect(9, 9 + bandH, cardW - 6, 6);
  // a map pin, then the place
  const pinX = pad + h * 0.018;
  const pinY = 9 + bandH / 2;
  const pr = h * 0.02;
  c.beginPath();
  c.arc(pinX, pinY - pr * 0.4, pr, Math.PI * 0.85, Math.PI * 0.15);
  c.lineTo(pinX, pinY + pr * 1.5);
  c.closePath();
  c.fillStyle = "#ff6b6b";
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = ink;
  c.lineJoin = "round";
  c.stroke();
  c.beginPath();
  c.arc(pinX, pinY - pr * 0.4, pr * 0.38, 0, Math.PI * 2);
  c.fillStyle = "#fffdf5";
  c.fill();
  c.stroke();
  c.textBaseline = "middle";
  c.fillStyle = ink;
  const title = `WEATHER · ${place.toUpperCase()}`;
  const titleX = pinX + pr * 1.8;
  let size = Math.round(h * 0.045);
  c.font = `900 ${size}px 'Lexend Mega', sans-serif`;
  while (c.measureText(title).width > cardW - titleX - pad * 0.4 && size > 12) c.font = `900 ${--size}px 'Lexend Mega', sans-serif`;
  c.fillText(title, titleX, pinY + 2);
  const right = cardW - pad;
  if (!weather || weather.error) {
    c.font = `600 ${Math.round(h * 0.04)}px 'Space Grotesk', sans-serif`;
    c.textAlign = "center";
    c.fillText(weather?.error ? "Couldn't reach the forecast right now." : "Checking the sky…", cardW / 2, h * 0.45);
    c.textAlign = "left";
    tape(c, w);
    return;
  }
  const { current, days, updated } = weather;
  const [label, kind] = weatherKind(current.code);
  const top = 9 + bandH + 6;
  // now: the icon on a round badge tinted by the sky it shows
  const badgeX = pad + w * 0.16;
  const badgeY = top + h * 0.17;
  const badgeR = w * 0.14;
  const tint = !current.isDay ? "#c9c5ff" : kind === "clear" || kind === "partly" ? "#fff1b8" : kind === "storm" ? "#d9dcef" : "#d6ecff";
  c.beginPath();
  c.arc(badgeX + 7, badgeY + 7, badgeR, 0, Math.PI * 2);
  c.fillStyle = ink;
  c.fill();
  c.beginPath();
  c.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
  c.fillStyle = tint;
  c.fill();
  c.lineWidth = 5;
  c.stroke();
  weatherIcon(c, badgeX, badgeY, w * 0.3, kind, !current.isDay);
  // the temperature in big type with a hard pink shadow
  const temp = `${Math.round(current.temp)}°`;
  c.font = `900 ${Math.round(h * 0.13)}px 'Lexend Mega', sans-serif`;
  c.fillStyle = "#ff90e8";
  c.fillText(temp, pad + w * 0.38 + 7, top + h * 0.13 + 7);
  c.fillStyle = ink;
  c.fillText(temp, pad + w * 0.38, top + h * 0.13);
  c.font = `700 ${Math.round(h * 0.042)}px 'Space Grotesk', sans-serif`;
  c.fillText(label, pad + w * 0.39, top + h * 0.235);
  c.font = `500 ${Math.round(h * 0.032)}px 'Space Grotesk', sans-serif`;
  c.fillStyle = "#4b4f57";
  c.fillText(`Now · updated ${updated}`, pad + w * 0.39, top + h * 0.285);
  // humidity and wind chips, each with a drawn icon
  const chipY = top + h * 0.34;
  const chipH = h * 0.06;
  [["humidity", `${current.humidity}%`, "#c4e6ff"], ["wind", `${Math.round(current.wind)} km/h`, "#d9f7d6"]].forEach(([icon, text, fill], i) => {
    c.font = `700 ${Math.round(h * 0.034)}px 'Space Grotesk', sans-serif`;
    const iconW = chipH * 0.7;
    const cw = c.measureText(text).width + iconW + pad * 1.2;
    const cx = pad + i * (w * 0.4);
    c.fillStyle = ink;
    c.fillRect(cx + 5, chipY + 5, cw, chipH);
    c.fillStyle = fill;
    c.fillRect(cx, chipY, cw, chipH);
    c.lineWidth = 4;
    c.strokeStyle = ink;
    c.strokeRect(cx, chipY, cw, chipH);
    const ix = cx + pad * 0.45 + iconW / 2;
    const iy = chipY + chipH / 2;
    c.lineWidth = 3.5;
    c.lineCap = "round";
    if (icon === "humidity") {
      const k = chipH * 0.22;
      c.beginPath();
      c.moveTo(ix, iy - k * 1.4);
      c.quadraticCurveTo(ix + k * 1.1, iy + k * 0.2, ix, iy + k);
      c.quadraticCurveTo(ix - k * 1.1, iy + k * 0.2, ix, iy - k * 1.4);
      c.fillStyle = "#2f7cf6";
      c.fill();
      c.stroke();
    } else {
      const k = chipH * 0.24;
      c.beginPath();
      c.moveTo(ix - k * 1.3, iy - k * 0.6);
      c.lineTo(ix + k * 0.6, iy - k * 0.6);
      c.arc(ix + k * 0.6, iy - k * 1.05, k * 0.45, Math.PI / 2, -Math.PI * 0.9, true);
      c.moveTo(ix - k * 1.3, iy + k * 0.35);
      c.lineTo(ix + k * 1, iy + k * 0.35);
      c.arc(ix + k * 1, iy + k * 0.85, k * 0.5, -Math.PI / 2, Math.PI * 0.9);
      c.stroke();
    }
    c.fillStyle = ink;
    c.fillText(text, cx + pad * 0.75 + iconW, chipY + h * 0.032);
  });
  // the next days, each on its own little card; today's picked out in yellow
  const rowY = top + h * 0.45;
  c.fillStyle = ink;
  c.fillRect(pad, rowY, right - pad, 4);
  const colW = (right - pad) / days.length;
  const dayTop = rowY + h * 0.022;
  const dayH = h * 0.29;
  days.forEach((d, i) => {
    const bx = pad + colW * i + 5;
    const bw = colW - 16;
    const cx = bx + bw / 2;
    brutalBox(c, bx, dayTop, bw, dayH, i === 0 ? "#fff1a6" : "#eef8ff", { shadow: 6, line: 4 });
    c.textAlign = "center";
    c.fillStyle = ink;
    c.font = `800 ${Math.round(h * 0.032)}px 'Space Grotesk', sans-serif`;
    c.fillText(d.label, cx, dayTop + h * 0.03);
    weatherIcon(c, cx, dayTop + h * 0.1, bw * 0.62, weatherKind(d.code)[1]);
    c.fillStyle = ink;
    c.font = `800 ${Math.round(h * 0.036)}px 'Space Grotesk', sans-serif`;
    c.fillText(`${Math.round(d.max)}°`, cx - bw * 0.16, dayTop + h * 0.18);
    c.fillStyle = "#6b7280";
    c.font = `600 ${Math.round(h * 0.028)}px 'Space Grotesk', sans-serif`;
    c.fillText(`${Math.round(d.min)}°`, cx + bw * 0.2, dayTop + h * 0.182);
    // chance of rain as a little gauge
    const rain = d.rain ?? 0;
    const gx = bx + bw * 0.14;
    const gw = bw * 0.72;
    const gy = dayTop + h * 0.212;
    const gh = h * 0.016;
    c.fillStyle = "#fffdf5";
    c.fillRect(gx, gy, gw, gh);
    c.fillStyle = "#5fb3ff";
    c.fillRect(gx, gy, (gw * rain) / 100, gh);
    c.lineWidth = 3;
    c.strokeStyle = ink;
    c.strokeRect(gx, gy, gw, gh);
    c.fillStyle = "#2f7cf6";
    c.font = `700 ${Math.round(h * 0.026)}px 'Space Grotesk', sans-serif`;
    c.fillText(`${rain}% rain`, cx, dayTop + h * 0.258);
  });
  c.textAlign = "left";
  // attribution, as the forecast's licence asks
  c.fillStyle = "#6b7280";
  c.font = `500 ${Math.round(h * 0.024)}px 'Space Grotesk', sans-serif`;
  c.textAlign = "right";
  c.fillText("Weather data by Open-Meteo.com", right, h - 30 - pad * 0.6);
  c.textAlign = "left";
  tape(c, w);
}
// Two strips of yellow tape holding the card's top corners to the wall
function tape(c, w) {
  [[w * 0.1, 16, -0.45], [w * 0.86, 16, 0.4]].forEach(([x, y, a]) => {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    const tw = 120;
    const th = 34;
    c.beginPath();
    c.moveTo(-tw / 2, -th / 2);
    for (let k = 0; k <= 4; k++) c.lineTo(-tw / 2 + (k % 2 ? 5 : 0), -th / 2 + (k * th) / 4);
    for (let k = 0; k <= 4; k++) c.lineTo(tw / 2 - (k % 2 ? 5 : 0), th / 2 - (k * th) / 4);
    c.closePath();
    c.fillStyle = "rgba(255,221,0,.78)";
    c.fill();
    c.fillStyle = "rgba(255,255,255,.35)";
    c.fillRect(-tw / 2 + 8, -th / 2 + 5, tw - 16, 5);
    c.lineWidth = 2;
    c.strokeStyle = "rgba(26,23,20,.35)";
    c.stroke();
    c.restore();
  });
}

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

// ---------- shared print details ----------
// Card or paper stock: a fine scatter of flecks and a few short fibres, with the edges a shade
// darker where hands have worn it. Flat, hard-edged marks, so it stays a printed toon surface.
function stockGrain(c, w, h, { seed = 1, density = 1, fibre = "rgba(90,60,20,.09)", wear = 0.08 } = {}) {
  let r = Math.abs(Math.round(seed * 9301 + 49297)) % 2147483646 + 1;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const n = Math.round(((w * h) / 900) * density);
  for (let i = 0; i < n; i++) {
    c.fillStyle = rand() < 0.5 ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.12)";
    c.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand());
  }
  c.strokeStyle = fibre;
  c.lineWidth = 1;
  c.beginPath();
  for (let i = 0; i < n / 30; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const a = rand() * Math.PI;
    const l = 4 + rand() * 10;
    c.moveTo(x, y);
    c.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + rand() * 3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
  }
  c.stroke();
  if (wear) {
    // a flat worn band round the edge, and the corners rubbed lighter
    const band = Math.min(w, h) * 0.025;
    c.fillStyle = `rgba(0,0,0,${wear})`;
    c.fillRect(0, 0, w, band);
    c.fillRect(0, h - band, w, band);
    c.fillRect(0, 0, band, h);
    c.fillRect(w - band, 0, band, h);
    c.fillStyle = "rgba(255,255,255,.22)";
    [[0, 0], [w, 0], [0, h], [w, h]].forEach(([x, y]) => {
      c.beginPath();
      c.arc(x, y, band * 2.2, 0, Math.PI * 2);
      c.fill();
    });
  }
}
// Security-print waves (guilloche): fine sine lines weaving over each other
function guilloche(c, x, y, w, h, color, { lines = 7, waves = 6 } = {}) {
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.strokeStyle = color;
  c.lineWidth = 1.2;
  for (let k = 0; k < lines; k++) {
    c.beginPath();
    for (let px = 0; px <= w; px += 4) {
      const a = (px / w) * Math.PI * 2 * waves;
      const py = y + h / 2 + Math.sin(a + k * 0.9) * h * 0.32 + Math.sin(a * 0.5 - k * 1.3) * h * 0.12;
      if (px === 0) c.moveTo(x + px, py);
      else c.lineTo(x + px, py);
    }
    c.stroke();
  }
  c.restore();
}
// A rubber stamp, inked a little unevenly (gaps knocked out of the ink)
function rubberStamp(c, x, y, text, { color = "#d62828", size = 30, angle = -0.12, seed = 1 } = {}) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.font = `800 ${size}px ${DISPLAY}`;
  const tw = c.measureText(text).width;
  const pw = tw + size * 0.9;
  const ph = size * 1.6;
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineWidth = size * 0.14;
  c.strokeRect(-pw / 2, -ph / 2, pw, ph);
  c.lineWidth = size * 0.05;
  c.strokeRect(-pw / 2 + size * 0.2, -ph / 2 + size * 0.2, pw - size * 0.4, ph - size * 0.4);
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, 0, size * 0.06);
  c.globalCompositeOperation = "destination-out";
  let r = seed * 7919 + 13;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 40; i++) c.fillRect((rand() - 0.5) * pw, (rand() - 0.5) * ph, 2 + rand() * 6, 1.5 + rand() * 2);
  c.restore();
}
// A paperclip seen from above: one wire bent into nested loops, inked, with a bright line
function paperclip(c, x, y, len, angle = 0) {
  const W = len * 0.36;
  const wire = () => {
    c.beginPath();
    c.moveTo(-0.15 * W, len * 0.62);
    c.lineTo(-0.15 * W, len * 0.22);
    c.arc(0, len * 0.22, 0.15 * W, Math.PI, 0);
    c.lineTo(0.15 * W, len - 0.25 * W);
    c.arc(-0.1 * W, len - 0.25 * W, 0.25 * W, 0, Math.PI);
    c.lineTo(-0.35 * W, 0.35 * W);
    c.arc(0, 0.35 * W, 0.35 * W, Math.PI, 0);
    c.lineTo(0.35 * W, len * 0.78);
  };
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.lineCap = "round";
  c.lineJoin = "round";
  [[0.1, "#1a1714"], [0.055, "#b9c2cf"], [0.016, "#ffffff"]].forEach(([k, color]) => {
    wire();
    c.lineWidth = len * k;
    c.strokeStyle = color;
    c.stroke();
  });
  c.restore();
}

// ---------- mug, coffee and coaster ----------
// The coffee's top, for a cylinder's cap: a ring of darker brew round the edge where it meets
// the cup, the crema in two flat tones, a layered latte-art heart, a few bubbles at the rim and
// a hard-edged sheen of the window across it
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
  // bubbles clinging to the rim
  [[0.2, 0.06], [0.9, 0.05], [1.6, 0.07], [2.5, 0.045], [3.3, 0.06], [4.4, 0.05], [5.3, 0.065]].forEach(([a, s]) => {
    const bx = cx + Math.cos(a) * R * 0.8;
    const by = cy + Math.sin(a) * R * 0.8;
    c.beginPath();
    c.arc(bx, by, w * s * 0.5, 0, Math.PI * 2);
    c.fillStyle = "#d9a875";
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = "#5b3a1e";
    c.stroke();
    c.beginPath();
    c.arc(bx - w * s * 0.12, by - w * s * 0.12, w * s * 0.12, 0, Math.PI * 2);
    c.fillStyle = "#fff6e6";
    c.fill();
  });
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
