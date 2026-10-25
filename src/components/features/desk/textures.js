// Canvas textures for the desk props. A draw function may return hotspots, rectangles in
// canvas pixels ({ x, y, w, h, href | action }), which the scene makes clickable.
//
// Props: ID badge, boarding passes, case files, phone chat,
// postcard, scrapbook and the terminal screen.
// Everything is drawn flat with thick black strokes and hard offset shadows, like the 2D site.
import * as THREE from "three";

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
    c.fillStyle = "#000";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#ffdd00";
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
    c.fillStyle = "#fff";
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

// ---------- project case files (projects) ----------
export function drawFolderCover(c, w, h, project, index = 0) {
  c.fillStyle = "#f5c76b";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(120,70,10,.12)";
  for (let y = 0; y < h; y += 12) c.fillRect(0, y, w, 2);
  // label sticker
  brutalBox(c, 34, 34, w * 0.62, 150, "#fff", { shadow: 8, line: 6 });
  c.fillStyle = "#000";
  c.font = `700 20px ${BODY}`;
  c.textBaseline = "top";
  c.fillText(`CASE FILE #${String(index + 1).padStart(3, "0")}`, 54, 52);
  fitFont(c, project.title.toUpperCase(), 800, DISPLAY, 44, w * 0.62 - 40);
  c.fillText(project.title.toUpperCase(), 54, 86);
  c.font = `700 20px ${BODY}`;
  c.fillText(`${project.type.toUpperCase()} · ${project.year || ""}`, 54, 146);
  // type stamp
  c.save();
  c.translate(w - 150, h - 110);
  c.rotate(-0.2);
  c.strokeStyle = colorFor(project) === "#ffdd00" ? "#e11d48" : colorFor(project);
  c.fillStyle = c.strokeStyle;
  c.lineWidth = 8;
  c.strokeRect(-110, -40, 220, 80);
  c.font = `800 34px ${DISPLAY}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("SHIPPED", 0, 2);
  c.restore();
  c.textBaseline = "alphabetic";
  c.lineWidth = 10;
  c.strokeStyle = "#000";
  c.strokeRect(5, 5, w - 10, h - 10);
}


// The sheets clipped inside each folder, turned over one by one once the folder is open.
// Back sides (and the inside of the cover) are drawn upside down, like the scrapbook's.
function sheetPaper(c, w, h, project, title, n, total) {
  c.fillStyle = "#fff";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(59,130,246,.15)";
  for (let y = 100; y < h; y += 34) c.fillRect(0, y, w, 2);
  c.fillStyle = colorFor(project);
  c.fillRect(0, 0, w, 16);
  c.fillStyle = "#000";
  c.textBaseline = "top";
  c.font = `700 16px ${BODY}`;
  c.fillText(`${project.title.toUpperCase()} · ${n}/${total}`, 28, 30);
  c.font = `800 32px ${DISPLAY}`;
  c.fillText(title, 28, 54);
  c.fillStyle = "rgba(0,0,0,.5)";
  c.font = `600 22px 'Caveat', cursive`;
  c.textAlign = "right";
  c.fillText(n < total ? "turn →" : "the end", w - 22, h - 34);
  c.textAlign = "left";
  c.fillStyle = "#000";
}
const bullets = (c, items, x, y, width, { max = 4, lines = 2, size = 19, gap = 10 } = {}) => {
  for (const item of items.slice(0, max)) {
    c.fillStyle = "#000";
    c.fillRect(x, y + 7, 10, 10);
    c.font = `500 ${size}px ${BODY}`;
    const ls = wrap(c, item, width - 24, lines);
    ls.forEach((line, i) => c.fillText(line, x + 22, y + i * (size + 5)));
    y += ls.length * (size + 5) + gap;
  }
  return y;
};
export const CASE_SHEETS = ["brief", "challenge", "features", "results"];
const SHEETS = {
  brief(c, w, h, p) {
    c.font = `700 16px ${BODY}`;
    c.fillText(`${p.type.toUpperCase()} · ${p.year || ""} · ${(p.role || "").toUpperCase()}`, 28, 100);
    c.font = `500 19px ${BODY}`;
    wrap(c, p.overview || p.description || "", w - 56, 6).forEach((line, i) => c.fillText(line, 28, 136 + i * 34));
    let x = 28;
    c.font = `700 15px ${BODY}`;
    for (const tech of (p.technologies || []).slice(0, 5)) {
      const tw = c.measureText(tech.toUpperCase()).width + 20;
      if (x + tw > w - 28) break;
      brutalBox(c, x, h - 76, tw, 32, "#ffdd00", { shadow: 4, line: 3 });
      c.fillStyle = "#000";
      c.fillText(tech.toUpperCase(), x + 10, h - 68);
      x += tw + 12;
    }
  },
  challenge(c, w, h, p) {
    const half = (w - 70) / 2;
    c.font = `800 18px ${DISPLAY}`;
    c.fillStyle = "#e11d48";
    c.fillText("PROBLEM", 28, 104);
    c.fillStyle = "#166534";
    c.fillText("SOLUTION", 42 + half, 104);
    bullets(c, p.problem?.points || [], 28, 138, half, { max: 4, lines: 3, size: 16, gap: 8 });
    bullets(c, p.solution?.points || [], 42 + half, 138, half, { max: 4, lines: 3, size: 16, gap: 8 });
    c.fillStyle = "#000";
    c.fillRect(34 + half, 104, 3, h - 160);
  },
  features(c, w, h, p) {
    const half = (w - 70) / 2;
    const items = p.features || [];
    bullets(c, items.slice(0, 4), 28, 104, half, { lines: 2, size: 17 });
    bullets(c, items.slice(4, 8), 42 + half, 104, half, { lines: 2, size: 17 });
  },
  results(c, w, h, p) {
    const hotspots = [];
    (p.results?.metrics || []).slice(0, 3).forEach((m, i) => {
      const bw = (w - 56 - 24) / 3;
      const x = 28 + i * (bw + 12);
      brutalBox(c, x, 104, bw, 124, ["#ffdd00", "#ff90e8", "#8fd694"][i], { shadow: 6, line: 4 });
      c.fillStyle = "#000";
      fitFont(c, m.value, 800, DISPLAY, 34, bw - 20);
      c.fillText(m.value, x + 12, 118);
      c.font = `700 14px ${BODY}`;
      wrap(c, m.label.toUpperCase(), bw - 24, 3).forEach((line, j) => c.fillText(line, x + 12, 168 + j * 17));
    });
    // Links as rubber stamps
    const links = [
      { label: "LIVE SITE ↗", href: p.demoLink, color: "#00e0c6" },
      { label: "CODE ↗", href: p.codeLink, color: "#fff" },
    ].filter((l) => l.href && l.href !== "#");
    links.forEach((l, i) => {
      const box = { x: 28 + i * 230, y: h - 140, w: 210, h: 64 };
      brutalBox(c, box.x, box.y, box.w, box.h, l.color, { shadow: 6, line: 5 });
      c.fillStyle = "#000";
      c.font = `800 22px ${DISPLAY}`;
      c.textBaseline = "middle";
      c.fillText(l.label, box.x + 18, box.y + box.h / 2 + 2);
      c.textBaseline = "top";
      hotspots.push({ ...box, href: l.href });
    });
    if (!links.length) {
      c.font = `600 26px 'Caveat', cursive`;
      c.fillText("(private project: no public link)", 28, h - 118);
    }
    return hotspots;
  },
};
const SHEET_TITLES = { brief: "THE BRIEF", challenge: "THE CHALLENGE", features: "FEATURES", results: "RESULTS" };

export function drawCaseSheet(c, w, h, project, kind) {
  const n = CASE_SHEETS.indexOf(kind) + 1;
  sheetPaper(c, w, h, project, SHEET_TITLES[kind], n, CASE_SHEETS.length);
  const hotspots = SHEETS[kind](c, w, h, project) || [];
  c.textBaseline = "alphabetic";
  c.lineWidth = 6;
  c.strokeStyle = "#000";
  c.strokeRect(3, 3, w - 6, h - 6);
  return hotspots;
}
// Back of a turned sheet / inside of the cover: drawn upside down so they read once flipped
export function drawCaseBack(c, w, h, project, { inside = false, index = 0 } = {}) {
  c.save();
  c.translate(w, h);
  c.rotate(Math.PI);
  c.fillStyle = inside ? "#f5c76b" : "#fff";
  c.fillRect(0, 0, w, h);
  c.fillStyle = inside ? "rgba(120,70,10,.12)" : "rgba(59,130,246,.15)";
  for (let y = inside ? 0 : 100; y < h; y += inside ? 12 : 34) c.fillRect(0, y, w, 2);
  c.fillStyle = "#000";
  if (inside) {
    c.font = `800 30px ${DISPLAY}`;
    c.fillText(`CASE FILE #${String(index + 1).padStart(3, "0")}`, 30, 70);
    c.font = `600 30px 'Caveat', cursive`;
    c.fillText(`re: ${project.title}`, 30, 120);
    c.fillText("handle with care ✦", 30, 160);
  } else {
    c.font = `600 26px 'Caveat', cursive`;
    c.fillStyle = "rgba(0,0,0,.45)";
    c.fillText("← back", 26, h - 30);
  }
  c.lineWidth = 6;
  c.strokeStyle = "#000";
  c.strokeRect(3, 3, w - 6, h - 6);
  c.restore();
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
  c.fillStyle = "#e9c48a";
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "#000";
  c.lineWidth = 8;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(w / 2, h * 0.55);
  c.lineTo(w, 0);
  c.stroke();
  c.beginPath();
  c.moveTo(0, h);
  c.lineTo(w * 0.42, h * 0.48);
  c.moveTo(w, h);
  c.lineTo(w * 0.58, h * 0.48);
  c.stroke();
  // wax seal
  c.fillStyle = "#e11d48";
  c.beginPath();
  c.arc(w / 2, h * 0.55, 34, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.lineWidth = 12;
  c.strokeRect(6, 6, w - 12, h - 12);
  if (delivered) {
    c.save();
    c.translate(w * 0.72, h * 0.28);
    c.rotate(-0.15);
    c.strokeStyle = "#16a34a";
    c.fillStyle = "#16a34a";
    c.lineWidth = 7;
    c.strokeRect(-130, -36, 260, 72);
    c.font = `800 30px ${DISPLAY}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("SENT ✓", 0, 2);
    c.restore();
  }
}

// The writing side of the postcard: message on the left, sender on the right, SEND stamp.
// `card` is the scene's live state ({ name, email, message, active, errors, status }).
export function drawPostcardBack(c, w, h, card, { caret = false } = {}) {
  const hotspots = [];
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, w, h);
  const split = w * 0.56;
  c.fillStyle = "#000";
  c.fillRect(split - 2, 40, 4, h - 80);

  // message
  c.textBaseline = "alphabetic";
  c.fillStyle = "rgba(0,0,0,.55)";
  c.font = `700 18px ${BODY}`;
  c.fillText("WRITE ME SOMETHING", 40, 58);
  const area = { x: 34, y: 76, w: split - 70, h: h - 150 };
  c.fillStyle = "rgba(59,130,246,.25)";
  for (let y = area.y + 56; y < area.y + area.h; y += 54) c.fillRect(area.x, y, area.w, 2);
  if (card.active === "message") {
    c.strokeStyle = "#3b82f6";
    c.lineWidth = 4;
    c.setLineDash([12, 8]);
    c.strokeRect(area.x - 6, area.y - 6, area.w + 12, area.h + 12);
    c.setLineDash([]);
  }
  c.font = `600 40px 'Caveat', cursive`;
  const lines = (card.message || "").split("\n").flatMap((para) => wrap(c, para, area.w - 10, 20));
  const visible = lines.slice(-7);
  c.fillStyle = card.message ? "#1a1714" : "rgba(0,0,0,.35)";
  (card.message ? visible : ["Hi Oka, I'd love to…"]).forEach((line, i) => c.fillText(line, area.x + 6, area.y + 48 + i * 54));
  if (caret && card.active === "message") {
    const last = card.message ? visible[visible.length - 1] || "" : "";
    const row = Math.max(0, (card.message ? visible.length : 1) - 1);
    c.fillStyle = "#1a1714";
    c.fillRect(area.x + 8 + c.measureText(card.message ? last : "").width, area.y + 14 + row * 54, 4, 42);
  }
  if (card.errors.message) {
    c.fillStyle = "#e11d48";
    c.font = `700 18px ${BODY}`;
    c.fillText(card.errors.message, area.x, h - 40);
  }
  hotspots.push({ ...area, id: "message" });

  // stamp = the send button
  const stamp = { x: w - 200, y: 36, w: 160, h: 190 };
  const stampColor = card.status === "error" ? "#e11d48" : card.status === "sending" ? "#ffdd00" : "#ff90e8";
  brutalBox(c, stamp.x, stamp.y, stamp.w, stamp.h, stampColor, { shadow: 8, line: 6 });
  c.fillStyle = "rgba(0,0,0,.2)";
  for (let i = 0; i < 10; i++) {
    c.beginPath();
    c.arc(stamp.x + 8 + i * 16, stamp.y - 2, 6, 0, Math.PI * 2);
    c.arc(stamp.x + 8 + i * 16, stamp.y + stamp.h + 2, 6, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = "#000";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = `800 34px ${DISPLAY}`;
  c.fillText(card.status === "sending" ? "…" : "SEND", stamp.x + stamp.w / 2, stamp.y + 80);
  c.font = `800 40px ${BODY}`;
  c.fillText(card.status === "error" ? "!" : "✉", stamp.x + stamp.w / 2, stamp.y + 136);
  c.textAlign = "left";
  hotspots.push({ ...stamp, id: "send" });
  if (card.status === "error") {
    c.fillStyle = "#e11d48";
    c.font = `700 18px ${BODY}`;
    c.fillText("Couldn't send. Try again?", split + 30, stamp.y + stamp.h + 34);
  }

  // sender fields on address lines
  [
    { id: "name", label: "FROM", placeholder: "your name", y: 330 },
    { id: "email", label: "REPLY TO", placeholder: "you@email.com", y: 470 },
  ].forEach((f) => {
    const box = { x: split + 30, y: f.y - 70, w: w - split - 70, h: 96 };
    c.fillStyle = "rgba(0,0,0,.55)";
    c.font = `700 18px ${BODY}`;
    c.textBaseline = "alphabetic";
    c.fillText(f.label, box.x, f.y - 46);
    c.fillStyle = "#000";
    c.fillRect(box.x, f.y + 8, box.w, card.active === f.id ? 6 : 3);
    const value = card[f.id] || "";
    c.font = `600 30px ${BODY}`;
    let shown = value;
    while (shown && c.measureText(shown).width > box.w - 16) shown = shown.slice(1);
    c.fillStyle = value ? "#000" : "rgba(0,0,0,.3)";
    c.fillText(value ? shown : f.placeholder, box.x + 4, f.y - 6);
    if (caret && card.active === f.id) c.fillRect(box.x + 6 + (value ? c.measureText(shown).width : 0), f.y - 36, 4, 38);
    if (card.errors[f.id]) {
      c.fillStyle = "#e11d48";
      c.font = `700 17px ${BODY}`;
      c.fillText(card.errors[f.id], box.x, f.y + 38);
    }
    hotspots.push({ ...box, id: f.id });
  });

  c.lineWidth = 10;
  c.strokeStyle = "#000";
  c.strokeRect(5, 5, w - 10, h - 10);
  c.textBaseline = "alphabetic";
  return hotspots;
}

// ---------- scrapbook (about) ----------
function sticker(c, x, y, r, w, h, fill, text, { ink = "#000", size = 28 } = {}) {
  c.save();
  c.translate(x, y);
  c.rotate(r);
  brutalBox(c, -w / 2, -h / 2, w, h, fill, { shadow: 6, line: 5 });
  c.fillStyle = ink;
  c.textAlign = "center";
  c.textBaseline = "middle";
  fitFont(c, text, 800, DISPLAY, size, w - 20);
  c.fillText(text, 0, 2);
  c.restore();
}
function washi(c, x, y, r, w = 110) {
  c.save();
  c.translate(x, y);
  c.rotate(r);
  c.fillStyle = "rgba(255,144,232,.75)";
  c.fillRect(-w / 2, -16, w, 32);
  c.fillStyle = "rgba(255,255,255,.35)";
  for (let i = -w / 2; i < w / 2; i += 16) c.fillRect(i, -16, 6, 32);
  c.restore();
}

export function drawScrapCover(c, w, h) {
  c.fillStyle = "#1a1714";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(255,255,255,.06)";
  for (let y = 0; y < h; y += 14) c.fillRect(0, y, w, 2);
  sticker(c, w * 0.45, h * 0.2, -0.06, 300, 96, "#ffdd00", "ABOUT ME", { size: 40 });
  sticker(c, w * 0.25, h * 0.45, 0.12, 130, 64, "#00e0c6", "VUE");
  sticker(c, w * 0.62, h * 0.47, -0.1, 150, 64, "#8fd694", "NODE");
  sticker(c, w * 0.32, h * 0.66, -0.08, 180, 64, "#3b82f6", "FLUTTER", { ink: "#fff" });
  sticker(c, w * 0.66, h * 0.7, 0.14, 150, 64, "#ff90e8", "GAMER");
  sticker(c, w * 0.42, h * 0.86, 0.05, 170, 60, "#fff", "COFFEE++", { size: 24 });
  c.lineWidth = 10;
  c.strokeStyle = "#000";
  c.strokeRect(5, 5, w - 10, h - 10);
}

// Paper, page number and the "turn" cue every scrapbook page shares
function scrapPaper(c, w, h, { n, side }) {
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(0,0,0,.12)";
  for (let y = 18; y < h; y += 26) for (let x = 18; x < w; x += 26) c.fillRect(x, y, 3, 3);
  c.fillStyle = "rgba(0,0,0,.5)";
  c.font = `600 26px 'Caveat', cursive`;
  c.textBaseline = "alphabetic";
  if (side === "right") {
    c.textAlign = "right";
    c.fillText(`${n}  ·  turn →`, w - 26, h - 22);
  } else {
    c.textAlign = "left";
    c.fillText(`← back  ·  ${n}`, 26, h - 22);
  }
  c.textAlign = "left";
}
const scrapEdge = (c, w, h) => {
  c.lineWidth = 6;
  c.strokeStyle = "#000";
  c.strokeRect(3, 3, w - 6, h - 6);
};
const hand = (c, text, x, y, size = 36, color = "#1a1714") => {
  c.fillStyle = color;
  c.font = `600 ${size}px 'Caveat', cursive`;
  c.fillText(text, x, y);
};

// Inside of the front cover (left side of the first spread)
export function drawScrapInside(c, w, h) {
  c.fillStyle = "#e9c48a";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(120,70,10,.15)";
  for (let y = 0; y < h; y += 12) c.fillRect(0, y, w, 2);
  brutalBox(c, 50, 120, w - 110, 200, "#fff", { shadow: 10, line: 6 });
  hand(c, "this scrapbook", 80, 190, 40);
  hand(c, "belongs to:", 80, 236, 40);
  c.fillStyle = "#000";
  c.font = `800 40px ${DISPLAY}`;
  c.fillText("OKA", 80, 292);
  sticker(c, w * 0.3, h * 0.62, -0.15, 170, 70, "#ffdd00", "HELLO!");
  sticker(c, w * 0.68, h * 0.72, 0.1, 150, 70, "#00e0c6", "2026");
  hand(c, "flip through →", w * 0.42, h - 50, 34, "#3b82f6");
  scrapEdge(c, w, h);
}

const SCRAP_PAGES = {
  hello(c, w) {
    c.save();
    c.translate(w / 2, 250);
    c.rotate(-0.05);
    c.fillStyle = "#000";
    c.fillRect(-119, -169, 250, 360);
    c.fillStyle = "#fff";
    c.fillRect(-125, -175, 250, 360);
    c.strokeStyle = "#000";
    c.lineWidth = 6;
    c.strokeRect(-125, -175, 250, 360);
    drawPortrait(c, -104, -154, 208, 280, "#00e0c6");
    c.fillStyle = "#000";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `600 32px 'Caveat', cursive`;
    c.fillText("me, probably coding", 0, 156);
    c.restore();
    washi(c, w / 2 - 130, 100, -0.5);
    washi(c, w / 2 + 130, 100, 0.45);
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
    hand(c, "hi, i'm oka!", 60, 500, 56);
    hand(c, "web + mobile engineer", 64, 552, 36, "#3b82f6");
    hand(c, "from pontianak, indonesia", 64, 596, 36, "#3b82f6");
  },
  bio(c, w) {
    c.fillStyle = "#000";
    c.font = `800 34px ${DISPLAY}`;
    c.fillText("WHO IS", 50, 90);
    c.fillText("THIS GUY?", 50, 134);
    washi(c, w - 90, 70, 0.6, 90);
    c.font = `500 25px ${BODY}`;
    const bio =
      "Hi, I'm Oka Sutarto Putra, a Pontianak-based engineer who builds for web and mobile. I started out in industrial engineering, so I still hunt for bottlenecks, just in code now.";
    wrap(c, bio, w - 100, 12).forEach((line, i) => c.fillText(line, 50, 200 + i * 38));
    hand(c, "(the bottleneck thing is real)", 54, 560, 32, "#e11d48");
  },
  stats(c, w) {
    c.fillStyle = "#000";
    c.font = `800 34px ${DISPLAY}`;
    c.fillText("BY THE", 50, 90);
    c.fillText("NUMBERS", 50, 134);
    [
      { v: "4+", l: "years of experience", color: "#ffdd00", r: -0.05 },
      { v: "8+", l: "projects shipped", color: "#ff90e8", r: 0.04 },
      { v: "4", l: "companies", color: "#8fd694", r: -0.03 },
    ].forEach((st, i) => {
      c.save();
      c.translate(w / 2, 240 + i * 140);
      c.rotate(st.r);
      brutalBox(c, -190, -55, 380, 110, st.color, { shadow: 8, line: 6 });
      c.fillStyle = "#000";
      c.font = `800 58px ${DISPLAY}`;
      c.textBaseline = "middle";
      c.fillText(st.v, -170, 2);
      fitFont(c, st.l.toUpperCase(), 700, BODY, 24, 220);
      c.fillText(st.l.toUpperCase(), -50, 2);
      c.restore();
    });
  },
  now(c) {
    c.fillStyle = "#000";
    c.font = `800 34px ${DISPLAY}`;
    c.fillText("NOW", 50, 90);
    c.fillText("BUILDING", 50, 134);
    ["flutter apps @ dusitek", "AI-powered side tools", "this very desk :)"].forEach((item, i) => {
      c.fillStyle = "#e11d48";
      c.fillRect(56, 214 + i * 92, 18, 18);
      c.strokeStyle = "#000";
      c.lineWidth = 4;
      c.strokeRect(56, 214 + i * 92, 18, 18);
      hand(c, item, 92, 236 + i * 92, 42);
    });
    // doodle: a little rocket trail
    c.strokeStyle = "#3b82f6";
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(80, 560);
    c.bezierCurveTo(200, 500, 300, 620, 420, 520);
    c.stroke();
    sticker(c, 440, 500, 0.3, 90, 70, "#ffdd00", "GO!");
  },
  skills(c, w, h, { skills = [] } = {}) {
    c.fillStyle = "#000";
    c.font = `800 34px ${DISPLAY}`;
    c.fillText("STICKER", 50, 90);
    c.fillText("COLLECTION", 50, 134);
    const colors = ["#00e0c6", "#ffdd00", "#ff90e8", "#8fd694", "#3b82f6", "#fff"];
    skills.slice(0, 12).forEach((name, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const color = colors[i % colors.length];
      sticker(c, 110 + col * 160, 220 + row * 100, ((i * 37) % 7) / 30 - 0.1, 146, 66, color, name.toUpperCase(), {
        ink: color === "#3b82f6" ? "#fff" : "#000",
        size: 24,
      });
    });
  },
  end(c, w) {
    hand(c, "that's me!", 60, 200, 64);
    hand(c, "next stop:", 64, 290, 42, "#3b82f6");
    hand(c, "the boarding passes ✈", 64, 340, 42, "#3b82f6");
    c.strokeStyle = "#000";
    c.lineWidth = 6;
    c.beginPath();
    c.arc(w / 2, 480, 70, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "#000";
    c.fillRect(w / 2 - 30, 455, 12, 12);
    c.fillRect(w / 2 + 18, 455, 12, 12);
    c.beginPath();
    c.arc(w / 2, 490, 34, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
  },
  notes(c, w, h) {
    c.fillStyle = "rgba(59,130,246,.25)";
    for (let y = 140; y < h - 60; y += 44) c.fillRect(40, y, w - 80, 2);
    hand(c, "notes:", 50, 110, 44);
    hand(c, "hire oka  ✓", 60, 172, 36, "#e11d48");
  },
};

// One scrapbook page. Back sides of leaves are drawn upside down: they end up the right way
// round once the leaf is turned over to the left.
export function drawScrapPage(c, w, h, { kind, n, side, flipped = false, skills } = {}) {
  c.save();
  if (flipped) {
    c.translate(w, h);
    c.rotate(Math.PI);
  }
  scrapPaper(c, w, h, { n, side });
  SCRAP_PAGES[kind](c, w, h, { skills });
  scrapEdge(c, w, h);
  c.restore();
}
export function drawScrapInsideFlipped(c, w, h) {
  c.save();
  c.translate(w, h);
  c.rotate(Math.PI);
  drawScrapInside(c, w, h);
  c.restore();
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

  c.font = "700 30px ui-monospace, Menlo, monospace";
  c.textBaseline = "top";
  const visible = lines.slice(-7);
  visible.forEach((line, i) => {
    c.fillStyle = line.startsWith(">") ? "#ff7a1a" : "#8fd694";
    c.fillText(line, 24, 66 + i * 44);
  });
  if (cursor) {
    const last = visible[visible.length - 1] || "";
    const x = 24 + c.measureText(last).width + 4;
    c.fillStyle = "#8fd694";
    c.fillRect(x, 66 + (visible.length - 1) * 44, 17, 32);
  }
  c.textBaseline = "alphabetic";
}
