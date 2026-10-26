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
  c.fillStyle = "#fff";
  c.fillRect(0, 0, w, h);
  c.textAlign = "center";
  c.textBaseline = "middle";
  const hotspots = [];
  if (back) {
    // White card, black print: the same stock as the front
    c.fillStyle = "#000";
    c.font = `800 40px ${DISPLAY}`;
    c.fillText("IF FOUND,", w / 2, 120);
    c.fillText("PLEASE HIRE.", w / 2, 172);
    // Links, printed as buttons
    [
      { label: "GITHUB ↗", color: "#ffdd00", href: "https://github.com/okasutarto" },
      { label: "LINKEDIN ↗", color: "#00e0c6", href: "https://linkedin.com/in/okasutarto" },
      { label: "EMAIL ME ↗", color: "#ff90e8", href: "mailto:okasputra@gmail.com" },
    ].forEach((link, i) => {
      const box = { x: 60, y: 250 + i * 110, w: w - 120, h: 76 };
      brutalBox(c, box.x, box.y, box.w, box.h, link.color, { shadow: 8, line: 6 });
      c.fillStyle = "#000";
      c.font = `800 28px ${DISPLAY}`;
      c.fillText(link.label, w / 2, box.y + box.h / 2 + 2);
      hotspots.push({ ...box, href: link.href });
    });
    c.fillStyle = "#000";
    c.font = `700 22px ${BODY}`;
    c.fillText("property of okasp", w / 2, h - 60);
  } else {
    // clip slot + header band
    c.fillStyle = "#ffdd00";
    c.fillRect(0, 0, w, 120);
    c.fillStyle = "#000";
    c.fillRect(0, 116, w, 8);
    c.fillRect(w / 2 - 60, 30, 120, 22);
    c.font = `800 26px ${DISPLAY}`;
    c.fillText("STAFF · DEV", w / 2, 90);
    // photo
    c.fillStyle = "#000";
    c.fillRect(w / 2 - 80, 156, 180, 242);
    drawPortrait(c, w / 2 - 90, 146, 180, 242, "#00e0c6");
    c.fillStyle = "#000";
    // name + role
    c.font = `800 40px ${DISPLAY}`;
    c.fillText("OKA S.", w / 2, 430);
    c.fillText("PUTRA", w / 2, 476);
    c.font = `700 24px ${BODY}`;
    c.fillText("FULL STACK DEVELOPER", w / 2, 522);
    // live status pill: green during working hours (WIB), orange otherwise
    const hour = (now.getUTCHours() + 7) % 24;
    const onDuty = hour >= 9 && hour < 19;
    brutalBox(c, 60, 556, w - 120, 56, onDuty ? "#8fd694" : "#ff7a1a", { shadow: 6, line: 5 });
    c.fillStyle = "#000";
    c.font = `800 22px ${DISPLAY}`;
    c.fillText(onDuty ? "● ON DUTY" : "● OFF DUTY", w / 2, 585);
    // barcode
    for (let x = 60, i = 0; x < w - 60; i++) {
      const bw = [3, 6, 2, 8, 4][i % 5];
      c.fillRect(x, 640, bw, 46);
      x += bw + [4, 3, 6, 2, 5][(i * 3) % 5];
    }
  }
  c.lineWidth = 16;
  c.strokeStyle = "#000";
  c.strokeRect(8, 8, w - 16, h - 16);
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  return hotspots;
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
  c.strokeStyle = "#555";
  c.lineWidth = 6;
  c.strokeRect(x + 35, y - 18, 20, 58);
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
export function drawFolderCover(c, w, h, project, index = 0) {
  return fileCanvas(c, w, h, () => {
    const color = FOLDER_COLORS[index % FOLDER_COLORS.length];
    c.fillStyle = color;
    c.fillRect(0, 0, 1000, 740);
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
    c.fillStyle = FOLDER_COLORS[index % FOLDER_COLORS.length];
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#000";
    c.font = `800 30px ${DISPLAY}`;
    c.fillText(`CASE FILE #${String(index + 1).padStart(3, "0")}`, 30, 70);
    c.font = `600 30px 'Caveat', cursive`;
    c.fillText(`re: ${project.title}`, 30, 120);
    c.fillText("handle with care ✦", 30, 160);
    c.lineWidth = 6;
    c.strokeStyle = "#000";
    c.strokeRect(3, 3, w - 6, h - 6);
  } else {
    const page = Math.max(0, CASE_SHEETS.indexOf(kind));
    hotspots = fileCanvas(c, w, h, () => {
      c.fillStyle = "#fffdf5";
      c.fillRect(0, 0, 1000, 740);
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

// ---------- phone: a chat with Oka's AI assistant ----------
// `chat` is the scene's live state ({ messages, input, active, waiting, scroll }); the
// renderer writes chat.maxScroll back so the wheel can clamp.
export const CHAT_QUESTIONS = [
  { label: "Experience", color: "#ffdd00", text: "What is Oka's work experience?" },
  { label: "Tech stack", color: "#00e0c6", text: "What is Oka's tech stack?" },
  { label: "Projects", color: "#ff6b6b", text: "What projects has Oka built?" },
  { label: "Hire Oka", color: "#3b82f6", text: "How can I contact Oka to hire him?" },
];
const plain = (text) => text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

export function drawChatScreen(c, w, h, chat, { unread = false, caret = false, now = new Date() } = {}) {
  const hotspots = [];
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(0,0,0,.08)";
  for (let y = 12; y < h; y += 30) for (let x = 12; x < w; x += 30) c.fillRect(x, y, 4, 4);

  // messages, laid out bottom-up from the newest, between the header and the input bar
  const top = 180;
  const bottom = h - 190;
  const maxW = w * 0.78;
  c.font = `500 25px ${BODY}`;
  const laid = chat.messages.map((m) => {
    const text = plain(m.text) || (m.pending ? "…" : "");
    const lines = text.split("\n").flatMap((para) => wrap(c, para, maxW - 40, 40));
    return { m, lines, height: lines.length * 33 + 30 };
  });
  const total = laid.reduce((sum, l) => sum + l.height + 18, 0);
  chat.maxScroll = Math.max(0, total - (bottom - top));
  chat.scroll = Math.min(chat.scroll || 0, chat.maxScroll);
  c.save();
  c.beginPath();
  c.rect(0, top, w, bottom - top);
  c.clip();
  let y = bottom + chat.scroll;
  for (let i = laid.length - 1; i >= 0; i--) {
    const { m, lines, height } = laid[i];
    y -= height;
    if (y > bottom || y + height < top) {
      y -= 18;
      continue;
    }
    const mine = m.sender === "user";
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
    c.fillText("hey! i'm oka's AI twin.", 46, top + 40);
    c.fillText("ask me anything about him", 46, top + 74);
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
  c.fillText(now.toTimeString().slice(0, 5), 30, 34);
  brutalBox(c, 28, 68, 72, 72, "#fff", { shadow: 5, line: 4 });
  c.fillStyle = "#000";
  c.fillRect(48, 92, 10, 10);
  c.fillRect(72, 92, 10, 10);
  c.fillRect(50, 116, 30, 6);
  c.font = `800 28px ${DISPLAY}`;
  c.fillText("OKA'S AI", 122, 92);
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

export function drawEnvelope(c, w, h, { delivered = false } = {}) {
  c.clearRect(0, 0, w, h);
  c.beginPath();
  c.moveTo(0, 0); c.lineTo(w / 2, h * 0.52); c.lineTo(w, 0);
  c.lineTo(w, h); c.lineTo(0, h); c.closePath();
  c.fillStyle = "#dcc391"; c.fill();
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
  c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w / 2, h); c.closePath();
  c.fillStyle = "#e2cb9c"; c.fill();
  c.strokeStyle = "#000"; c.lineWidth = 6; c.stroke();
}
export function drawPostcardStamp(c, w, h) {
  c.fillStyle = "#ffdd00"; c.fillRect(0, 0, w, h);
  c.strokeStyle = "#000"; c.lineWidth = 5; c.strokeRect(3, 3, w - 6, h - 6);
  c.strokeStyle = "#fffdf5"; c.lineWidth = 3; c.setLineDash([3, 5]);
  c.strokeRect(10, 10, w - 20, h - 20); c.setLineDash([]);
  c.strokeStyle = "#000"; c.lineWidth = 4; c.strokeRect(w * 0.36, h * 0.18, w * 0.28, h * 0.32);
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
  c.fillStyle = "#cb9b67";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(70, 40, 15, 0.14)";
  for (let i = 0; i < 300; i++) {
    const x = (Math.sin(i * 99) * 0.5 + 0.5) * w;
    const y = (Math.cos(i * 33) * 0.5 + 0.5) * h;
    c.fillRect(x, y, (i % 3) + 1, (i % 2) + 1);
  }
  c.fillStyle = "#111";
  c.font = `900 ${Math.round(h * 0.06)}px ${DISPLAY}`;
  c.textAlign = "center";
  c.fillText("ABOUT ME", w / 2, h * 0.075);
  c.textAlign = "left";
}

export function drawAboutNote(c, w, h, note) {
  const colors = { years: "#ffdd00", projects: "#00e0c6", companies: "#7fb2ff", stack: "#ff90e8", now: "#c4b5fd", resume: "#000" };
  c.fillStyle = colors[note.id] || "#fffdf5";
  c.fillRect(0, 0, w, h);
  const ink = note.id === "resume" ? "#fff" : "#000";
  const pad = w * 0.075;
  c.fillStyle = ink;
  c.textAlign = "left";
  c.textBaseline = "top";
  if (note.type === "stat") {
    c.font = `900 ${Math.round(h * 0.46)}px ${DISPLAY}`;
    c.fillText(note.value, pad, h * 0.24);
    fitFont(c, note.label.toUpperCase(), 800, BODY, Math.round(h * 0.11), w - 2 * pad);
    c.fillText(note.label.toUpperCase(), pad, h * 0.78);
  } else if (note.type === "stack") {
    c.font = `900 ${Math.round(w * 0.065)}px ${DISPLAY}`;
    c.fillText("STACK", pad, h * 0.13);
    let y = h * 0.28;
    ABOUT_STACK.forEach((group) => {
      c.font = `800 ${Math.round(w * 0.04)}px ${BODY}`;
      c.fillText(group.label.toUpperCase(), pad, y);
      c.font = `600 ${Math.round(w * 0.04)}px ${BODY}`;
      const lines = wrap(c, group.items.join(" · "), w - 2 * pad, 2);
      const bodyY = y + w * 0.044;
      lines.forEach((line, k) => c.fillText(line, pad, bodyY + k * w * 0.047));
      y = bodyY + lines.length * w * 0.047 + h * 0.025;
    });
  } else {
    const titleSize = note.id === "resume" ? h * 0.32 : Math.min(w * (note.id === "location" ? 0.12 : 0.073), h * 0.17);
    fitFont(c, note.title.toUpperCase(), 900, BODY, Math.round(titleSize), w - 2 * pad);
    const top = h * (note.id === "resume" ? 0.6 : note.id === "location" ? 0.25 : note.id === "now" ? 0.33 : 0.17);
    c.fillText(note.title.toUpperCase(), pad, top);
    if (note.body) {
      const size = Math.min(w * (note.id === "now" ? 0.038 : note.id === "location" ? 0.075 : note.id === "who" ? 0.043 : 0.047), h * 0.12);
      c.font = `500 ${Math.round(size)}px ${BODY}`;
      const lineHeight = size * 1.4;
      const bodyY = top + titleSize + h * 0.08;
      const lines = wrap(c, note.body.replace(/<[^>]*>/g, ""), w - 2 * pad, Math.max(1, Math.floor((h - bodyY - h * 0.08) / lineHeight)));
      lines.forEach((line, i) => c.fillText(line, pad, bodyY + i * lineHeight));
    }
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
export function drawWoodTop(c, w, h) {
  const planks = 6;
  const ph = h / planks;
  const tones = ["#d9a066", "#cf9559", "#deaa70", "#d39b5f"];
  // A fixed seed, so the grain is the same every load
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < planks; i++) {
    const y = i * ph;
    c.fillStyle = tones[i % tones.length];
    c.fillRect(0, y, w, ph);
    // Long, gently wavy grain lines
    c.strokeStyle = "rgba(120, 66, 24, 0.22)";
    c.lineWidth = 3;
    for (let g = 0; g < 7; g++) {
      const gy = y + ph * (0.12 + g * 0.12) + rand() * 6;
      const amp = 3 + rand() * 6;
      const len = 120 + rand() * 160;
      c.beginPath();
      for (let x = 0; x <= w; x += 20) c.lineTo(x, gy + Math.sin(x / len + g) * amp);
      c.stroke();
    }
    // A knot or two
    for (let k = 0; k < 2; k++) {
      const kx = rand() * w;
      const ky = y + ph * (0.3 + rand() * 0.4);
      c.strokeStyle = "rgba(110, 58, 20, 0.35)";
      c.lineWidth = 3;
      [18, 30].forEach((r) => {
        c.beginPath();
        c.ellipse(kx, ky, r * 2.2, r * 0.6, 0, 0, Math.PI * 2);
        c.stroke();
      });
    }
    // Plank ends are staggered, like a real top
    c.fillStyle = "rgba(60, 32, 12, 0.55)";
    const end = (0.2 + rand() * 0.6) * w;
    c.fillRect(end, y, 4, ph);
    // The seam between planks
    c.fillRect(0, y, w, 4);
  }
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
export function drawPainting(c, w, h) {
  const ink = (path, fill) => {
    c.fillStyle = fill;
    c.fill(path);
    c.lineWidth = Math.max(5, w / 110);
    c.strokeStyle = "#000";
    c.stroke(path);
  };
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
  c.fillStyle = "rgba(0,0,0,.14)";
  for (let i = 0; i < 4; i++) c.fillRect(w * 0.42 - h * 0.26, h * (0.52 + i * 0.05), h * 0.52, h * 0.015);
  // hills, back to front
  const hill = (points, fill) => {
    const path = new Path2D();
    path.moveTo(0, h);
    points.forEach(([x, y]) => path.lineTo(w * x, h * y));
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
  // white mat and black frame line
  c.lineWidth = w * 0.05;
  c.strokeStyle = "#fffdf5";
  c.strokeRect(0, 0, w, h);
  c.lineWidth = Math.max(6, w / 90);
  c.strokeStyle = "#000";
  c.strokeRect(w * 0.025, h * 0.035, w * 0.95, h * 0.93);
}

// ---------- rug under the desk: plain dusty blue with a thin cream inset border ----------
export function drawRug(c, w, h) {
  c.fillStyle = "#8fa8d6";
  c.fillRect(0, 0, w, h);
  // the faintest weave, so it reads as fabric rather than paint
  c.fillStyle = "rgba(0,0,0,.035)";
  for (let y = 0; y < h; y += 10) c.fillRect(0, y, w, 3);
  const inset = w * 0.045;
  c.lineWidth = Math.max(5, w / 200);
  c.strokeStyle = "#f3ead8";
  c.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
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
export function drawKeyLabel(c, w, h, label, color = "#fff") {
  c.fillStyle = color;
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#000";
  c.textAlign = "center";
  c.textBaseline = "middle";
  fitFont(c, label, 800, DISPLAY, Math.round(h * 0.55), w - 14);
  c.fillText(label, w / 2, h / 2 + 3);
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
}

// ---------- speech bubble over the mug: a quote per sip ----------
// Said by the straw hat on the shelf
export const LUFFY_QUOTES = [
  { text: "I'm gonna be King of the Pirates!", by: "Monkey D. Luffy" },
  { text: "If you don't take risks, you can't create a future!", by: "Monkey D. Luffy" },
  { text: "Power isn't determined by your size, but the size of your heart and dreams!", by: "Monkey D. Luffy" },
  { text: "I don't care if I die trying. I'll never give up!", by: "Monkey D. Luffy" },
  { text: "When do you think people die? When they are forgotten.", by: "Dr. Hiriluk" },
  { text: "Meat!!! Shishishi!", by: "Monkey D. Luffy" },
  { text: "I can't use a sword, I can't navigate, I can't cook... I know I need help to survive!", by: "Monkey D. Luffy" },
];

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
export function drawQuoteBubble(c, w, h, quote) {
  c.clearRect(0, 0, w, h);
  if (!quote) return;
  const tail = 46;
  const box = { x: 14, y: 14, w: w - 40, h: h - tail - 40 };
  // hard shadow, then the bubble with its tail pointing down-right to the mug
  const shape = (dx, dy) => {
    c.beginPath();
    c.moveTo(box.x + dx, box.y + dy);
    c.lineTo(box.x + box.w + dx, box.y + dy);
    c.lineTo(box.x + box.w + dx, box.y + box.h + dy);
    c.lineTo(box.x + box.w * 0.78 + dx, box.y + box.h + dy);
    c.lineTo(box.x + box.w * 0.86 + dx, box.y + box.h + tail + dy);
    c.lineTo(box.x + box.w * 0.62 + dx, box.y + box.h + dy);
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
  c.font = `700 32px ${BODY}`;
  const lines = wrap(c, quote.text, box.w - 100, 3);
  const blockH = lines.length * 42 + 50;
  const top = box.y + (box.h - blockH) / 2;
  c.fillStyle = "#000";
  c.textBaseline = "top";
  lines.forEach((line, i) => c.fillText(line, box.x + 64, top + i * 42));
  c.font = `800 60px ${DISPLAY}`;
  c.fillStyle = "#ff90e8";
  c.fillText("“", box.x + 18, top - 8);
  c.fillStyle = "rgba(0,0,0,.6)";
  c.font = `600 32px 'Caveat', cursive`;
  c.textAlign = "right";
  c.fillText(`— ${quote.by}`, box.x + box.w - 28, top + lines.length * 42 + 8);
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
}

// Retro terminal on the monitor: lines of text plus an optional blinking cursor
export function drawTerminal(c, w, h, lines, cursor) {
  c.fillStyle = "#1a1714";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(143,214,148,.06)";
  for (let y = 0; y < h; y += 6) c.fillRect(0, y, w, 3);
  // title bar
  c.fillStyle = "#ff7a1a";
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

  c.font = "700 22px ui-monospace, Menlo, monospace";
  c.textBaseline = "top";
  const visible = lines.slice(-9);
  visible.forEach((line, i) => {
    c.fillStyle = line.startsWith(">") ? "#ff7a1a" : "#8fd694";
    c.fillText(line, 24, 64 + i * 33);
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

export function drawWindowView(c, w, h, { t = 0, dark = false, flockAt = -99, starAt = -99 } = {}) {
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

  // Sky in flat bands, lighter toward the horizon
  const SKY = dark ? ["#1e2a5a", "#26356b", "#30437f"] : ["#7fdfff", "#a8ecff", "#cdf6ff"];
  c.fillStyle = SKY[0];
  c.fillRect(0, 0, w, h);
  c.fillStyle = SKY[1];
  c.fillRect(0, h * 0.3, w, h * 0.1);
  c.fillStyle = SKY[2];
  c.fillRect(0, h * 0.4, w, h * 0.1);

  if (dark) {
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

  // Sun (turning rays) or moon (with craters)
  const sx = w * 0.74;
  const sy = h * 0.19;
  const sr = w * 0.085;
  if (!dark) {
    c.save();
    c.translate(sx, sy);
    c.rotate(t * 0.25);
    for (let i = 0; i < 10; i++) {
      c.rotate((Math.PI * 2) / 10);
      c.beginPath();
      c.moveTo(sr * 1.3, 0);
      c.lineTo(sr * 1.65, 0);
      stroke(line * 3.2, "#000");
      c.beginPath();
      c.moveTo(sr * 1.3, 0);
      c.lineTo(sr * 1.65, 0);
      stroke(line * 1.4, "#ffdd00");
    }
    c.restore();
    blob([[sx, sy, sr]], "#ffdd00");
  } else {
    blob([[sx, sy, sr]], "#fffdf5");
    [[-0.3, -0.2, 0.22], [0.3, 0.25, 0.16], [0.15, -0.38, 0.1]].forEach(([dx, dy, r]) => {
      c.beginPath();
      c.arc(sx + dx * sr, sy + dy * sr, r * sr, 0, Math.PI * 2);
      c.fillStyle = "#e7e0cc";
      c.fill();
      stroke(line * 0.6);
    });
  }

  // Clouds drifting across
  [[0.1, 0.12, 1, 6], [0.55, 0.3, 0.75, 9], [0.85, 0.08, 0.6, 4.5]].forEach(([bx, by, size, speed], i) => {
    const x = wrapX(bx * w + t * speed * u, w * 0.2);
    const y = by * h + Math.sin(t * 0.4 + i) * u * 0.4;
    const s = size * u * 9;
    blob([[x - s * 0.55, y + s * 0.1, s * 0.42], [x, y - s * 0.15, s * 0.58], [x + s * 0.55, y + s * 0.08, s * 0.45], [x - s * 0.55, y + s * 0.1, 0, s * 1.1, s * 0.42]], dark ? "#55638f" : "#ffffff");
  });

  // Mountains behind the lake
  c.beginPath();
  c.moveTo(-line, h * 0.6);
  [[0, 0.46], [0.14, 0.34], [0.3, 0.5], [0.45, 0.38], [0.62, 0.52], [0.8, 0.36], [1, 0.48]].forEach(([x, y]) => c.lineTo(w * x, h * y));
  c.lineTo(w + line, h * 0.6);
  c.closePath();
  c.fillStyle = dark ? "#3b3570" : "#c4b5fd";
  c.fill();
  stroke();
  // Snow caps
  [[0.14, 0.34], [0.45, 0.38], [0.8, 0.36]].forEach(([x, y]) => {
    c.beginPath();
    c.moveTo(w * x, h * y);
    c.lineTo(w * (x + 0.045), h * (y + 0.05));
    c.lineTo(w * (x + 0.015), h * (y + 0.04));
    c.lineTo(w * (x - 0.02), h * (y + 0.055));
    c.lineTo(w * (x - 0.05), h * (y + 0.05));
    c.closePath();
    c.fillStyle = dark ? "#c9c5dc" : "#fffdf5";
    c.fill();
    stroke(line * 0.8);
  });

  // The lake: ripples sliding, the sun/moon's reflection wobbling, a little sailboat
  const lakeTop = h * 0.58;
  const lakeBottom = h * 0.78;
  c.fillStyle = dark ? "#172554" : "#3b82f6";
  c.fillRect(0, lakeTop, w, lakeBottom - lakeTop);
  c.beginPath();
  c.moveTo(0, lakeTop);
  c.lineTo(w, lakeTop);
  stroke();
  for (let i = 0; i < 4; i++) {
    const bar = sr * (1.5 - i * 0.3) * (1 + 0.15 * Math.sin(t * 3 + i));
    c.fillStyle = dark ? "#fffdf5" : "#ffdd00";
    c.fillRect(sx - bar / 2 + Math.sin(t * 2 + i * 2) * u, lakeTop + u * 2 + i * u * 2.6, bar, u * 1.2);
  }
  for (let i = 0; i < 9; i++) {
    const row = i % 4;
    const dir = row % 2 ? 1 : -1;
    const x = wrapX(((i * 0.29) % 1) * w + dir * t * u * (2 + row), u * 10);
    const y = lakeTop + u * 3.5 + row * (lakeBottom - lakeTop - u * 6) / 3;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + u * (5 + (i % 3) * 2), y);
    stroke(line * 0.8, dark ? "#7fb2ff" : "#cdf6ff");
  }
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

  // Grass, flowers, and trees swaying on the near shore
  c.fillStyle = dark ? "#2f6b45" : "#8fd694";
  c.fillRect(0, lakeBottom, w, h - lakeBottom);
  c.beginPath();
  c.moveTo(0, lakeBottom);
  c.lineTo(w, lakeBottom);
  stroke();
  [[0.38, 0.86, "#ff90e8"], [0.47, 0.92, "#ffdd00"], [0.62, 0.88, "#fffdf5"], [0.7, 0.95, "#ff90e8"], [0.31, 0.95, "#ffdd00"]].forEach(([x, y, color], i) => {
    const fx = w * x + Math.sin(t * 1.5 + i) * u * 0.3;
    c.beginPath();
    c.moveTo(w * x, h * y + u * 2.4);
    c.lineTo(fx, h * y);
    stroke(line * 0.7, dark ? "#14532d" : "#166534");
    blob([[fx, h * y, u * 1.1]], dark ? "#7c6b9e" : color, 0);
  });
  const tree = (x, scale, i, round) => {
    const base = h * 0.97;
    c.save();
    c.translate(w * x, base);
    c.rotate(Math.sin(t * 1.1 + i * 1.3) * 0.035);
    c.beginPath();
    c.rect(-u * 1.2 * scale, -u * 10 * scale, u * 2.4 * scale, u * 10 * scale);
    c.fillStyle = "#8b5a2b";
    c.fill();
    stroke();
    if (round) {
      const r = u * 6 * scale;
      blob([[-r * 0.6, -u * 13 * scale, r * 0.75], [r * 0.6, -u * 13 * scale, r * 0.7], [0, -u * 18 * scale, r]], dark ? "#1f5c3a" : "#22a65c");
    } else {
      [[-u * 8, -u * 18, u * 7], [-u * 14, -u * 30, u * 5.5]].forEach(([bottom, top, half]) => {
        c.beginPath();
        c.moveTo(0, top * scale);
        c.lineTo(half * scale, bottom * scale);
        c.lineTo(-half * scale, bottom * scale);
        c.closePath();
        c.fillStyle = "#000";
        c.save();
        c.translate(line * 1.4, line * 1.4);
        c.fill();
        c.restore();
        c.fillStyle = dark ? "#14532d" : "#166534";
        c.fill();
        stroke();
      });
    }
    c.restore();
  };
  tree(0.09, 1.2, 0, false);
  tree(0.22, 0.9, 1, true);
  tree(0.85, 1.05, 2, false);
  tree(0.96, 0.8, 3, true);

  // Birds by day (a few always about, a flock when called), fireflies by night
  const bird = (x, y, s, flap) => {
    c.beginPath();
    c.moveTo(x - s, y - s * 0.55 * flap);
    c.quadraticCurveTo(x - s * 0.45, y - s * 0.15, x, y);
    c.quadraticCurveTo(x + s * 0.45, y - s * 0.15, x + s, y - s * 0.55 * flap);
    stroke(line * 1.1);
  };
  if (!dark) {
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
  } else {
    VIEW_FLIES.forEach((fly) => {
      const on = Math.sin(t * 2.3 + fly.p);
      if (on < 0.1) return;
      const x = w * fly.x + Math.sin(t * 0.7 + fly.p) * u * 3;
      const y = h * fly.y + Math.sin(t * 1.1 + fly.p * 2) * u * 1.5;
      const s = u * 0.9 * (0.6 + on * 0.6);
      c.fillStyle = "#000";
      c.fillRect(x - s / 2 - line * 0.4, y - s / 2 - line * 0.4, s + line * 0.8, s + line * 0.8);
      c.fillStyle = "#ffdd00";
      c.fillRect(x - s / 2, y - s / 2, s, s);
    });
  }

  // The window's own cross bars
  c.fillStyle = "#000";
  c.fillRect(w / 2 - u * 1.1, 0, u * 2.2, h);
  c.fillRect(0, h / 2 - u * 1.1, w, u * 2.2);
}
