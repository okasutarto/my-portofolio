// The monitor's screen: a cartoon macOS desktop in the site's neo-brutal style. A menu bar, a
// dock that magnifies under the pointer and bounces an app as it launches, and windows (the
// terminal, Spotifree) that genie out of the dock and back into it. Drawn on a 2D canvas in a
// 640 × 384 layout; clickable areas come back as hotspots in the same units.
import { TRACKS, trackLength } from "./lofi";

export const SCREEN_W = 640;
export const SCREEN_H = 384;
const MENU_H = 20;
const TITLE_H = 20;
const ICON = 32;
const ICON_GAP = 10;
const DOCK_H = 46;
const DOCK_Y = SCREEN_H - DOCK_H - 6;
const DISPLAY = "'Lexend Mega', sans-serif";
const BODY = "'Space Grotesk', sans-serif";
const GREEN = "#1fdf64";

// Apps with a window open on the screen; the others fly the camera to their prop
const DOCK_APPS = [
  { id: "files", label: "Projects", focus: "projects" },
  { id: "terminal", label: "Terminal" },
  { id: "spotifree", label: "Spotifree" },
  { id: "notes", label: "About me", focus: "about" },
  { id: "mail", label: "Mail", focus: "contact" },
  { id: "messages", label: "AI Chat", focus: "chat" },
];
const DOCK_W = DOCK_APPS.length * (ICON + ICON_GAP) + ICON_GAP;
const DOCK_X = (SCREEN_W - DOCK_W) / 2;
const iconCenter = (i) => DOCK_X + ICON_GAP + i * (ICON + ICON_GAP) + ICON / 2;
const iconOf = (id) => DOCK_APPS.findIndex((a) => a.id === id);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeOut = (t) => 1 - (1 - t) ** 3;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function surface(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * 2);
  canvas.height = Math.round(h * 2);
  const c = canvas.getContext("2d");
  c.scale(2, 2);
  return { canvas, c, w, h };
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

// ---------- wallpaper: a flat sunset with hills, drawn once ----------
let wallpaper = null;
function drawWallpaper(c) {
  if (!wallpaper) {
    wallpaper = surface(SCREEN_W, SCREEN_H);
    const w = wallpaper.c;
    const sky = w.createLinearGradient(0, 0, 0, SCREEN_H);
    sky.addColorStop(0, "#ffb35c");
    sky.addColorStop(1, "#ff90e8");
    w.fillStyle = sky;
    w.fillRect(0, 0, SCREEN_W, SCREEN_H);
    w.lineWidth = 3;
    w.strokeStyle = "#000";
    w.fillStyle = "#ffdd00";
    w.beginPath();
    w.arc(470, 170, 74, 0, Math.PI * 2);
    w.fill();
    w.stroke();
    [["#00e0c6", 250, 0.9], ["#8fd694", 290, 1.4]].forEach(([color, base, k]) => {
      w.fillStyle = color;
      w.beginPath();
      w.moveTo(0, SCREEN_H);
      for (let x = 0; x <= SCREEN_W; x += 8) w.lineTo(x, base + Math.sin(x / 90 * k + k) * 26 + Math.sin(x / 37) * 6);
      w.lineTo(SCREEN_W, SCREEN_H);
      w.closePath();
      w.fill();
      w.stroke();
    });
  }
  c.drawImage(wallpaper.canvas, 0, 0, SCREEN_W, SCREEN_H);
}

// ---------- dock icons ----------
function drawIcon(c, id, x, y, s) {
  const u = s / 32;
  roundRect(c, x, y, s, s, 8 * u);
  c.fillStyle = { files: "#ffdd00", terminal: "#1a1714", spotifree: GREEN, notes: "#fffdf5", mail: "#7fb2ff", messages: "#ff90e8" }[id];
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = "#000";
  c.stroke();
  c.save();
  c.translate(x, y);
  c.scale(u, u);
  c.lineWidth = 2;
  c.strokeStyle = "#000";
  c.fillStyle = "#000";
  if (id === "files") {
    c.fillStyle = "#ffb35c";
    c.beginPath();
    c.moveTo(6, 11);
    c.lineTo(13, 11);
    c.lineTo(15, 13);
    c.lineTo(26, 13);
    c.lineTo(26, 24);
    c.lineTo(6, 24);
    c.closePath();
    c.fill();
    c.stroke();
  } else if (id === "terminal") {
    c.strokeStyle = "#8fd694";
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(8, 11);
    c.lineTo(13, 16);
    c.lineTo(8, 21);
    c.stroke();
    c.fillStyle = "#8fd694";
    c.fillRect(15, 20, 9, 2.5);
  } else if (id === "spotifree") {
    // A record with a green label
    c.beginPath();
    c.arc(16, 16, 10.5, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(255,255,255,.35)";
    c.lineWidth = 1;
    c.beginPath();
    c.arc(16, 16, 7.5, 0.4, 2.2);
    c.stroke();
    c.fillStyle = GREEN;
    c.beginPath();
    c.arc(16, 16, 3.6, 0, Math.PI * 2);
    c.fill();
  } else if (id === "notes") {
    c.fillStyle = "#ffdd00";
    c.fillRect(2, 2, 28, 7);
    c.strokeStyle = "rgba(0,0,0,.35)";
    c.lineWidth = 1.5;
    [14, 19, 24].forEach((ly) => {
      c.beginPath();
      c.moveTo(7, ly);
      c.lineTo(25, ly);
      c.stroke();
    });
  } else if (id === "mail") {
    c.fillStyle = "#fff";
    c.fillRect(6, 10, 20, 13);
    c.strokeRect(6, 10, 20, 13);
    c.beginPath();
    c.moveTo(6, 10);
    c.lineTo(16, 18);
    c.lineTo(26, 10);
    c.stroke();
  } else if (id === "messages") {
    c.fillStyle = "#fff";
    c.beginPath();
    c.ellipse(16, 15, 10, 7.5, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(10, 20);
    c.lineTo(8, 25);
    c.lineTo(14, 21.5);
    c.fill();
    [12, 16, 20].forEach((dx) => c.fillRect(dx - 1, 14, 2, 2));
  }
  c.restore();
}

// ---------- Spotifree ----------
function drawCover(c, track, i, x, y, s, levels) {
  const [bg, ink, accent] = track.colors;
  c.save();
  roundRect(c, x, y, s, s, 4);
  c.clip();
  c.fillStyle = bg;
  c.fillRect(x, y, s, s);
  c.lineWidth = 2;
  c.strokeStyle = ink;
  c.fillStyle = accent;
  if (i % 4 === 0) {
    // a moon and stars
    c.beginPath();
    c.arc(x + s * 0.62, y + s * 0.38, s * 0.22, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = bg;
    c.beginPath();
    c.arc(x + s * 0.7, y + s * 0.32, s * 0.18, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = accent;
    [[0.2, 0.2], [0.3, 0.45], [0.15, 0.6]].forEach(([sx, sy]) => c.fillRect(x + s * sx, y + s * sy, 3, 3));
  } else if (i % 4 === 1) {
    // a steaming cup
    roundRect(c, x + s * 0.28, y + s * 0.4, s * 0.38, s * 0.3, 4);
    c.fill();
    c.stroke();
    c.beginPath();
    c.arc(x + s * 0.7, y + s * 0.53, s * 0.07, -Math.PI / 2, Math.PI / 2);
    c.stroke();
    [0.38, 0.48, 0.58].forEach((sx) => {
      c.beginPath();
      c.moveTo(x + s * sx, y + s * 0.34);
      c.bezierCurveTo(x + s * (sx - 0.05), y + s * 0.26, x + s * (sx + 0.05), y + s * 0.2, x + s * sx, y + s * 0.12);
      c.stroke();
    });
  } else if (i % 4 === 2) {
    // rain on a cloud
    c.beginPath();
    [[0.38, 0.32, 0.13], [0.55, 0.28, 0.16], [0.68, 0.36, 0.11]].forEach(([cx, cy, r]) => {
      c.moveTo(x + s * (cx + r), y + s * cy);
      c.arc(x + s * cx, y + s * cy, s * r, 0, Math.PI * 2);
    });
    c.fill();
    c.stroke();
    c.strokeStyle = ink;
    for (let k = 0; k < 6; k++) {
      const rx = x + s * (0.3 + k * 0.08);
      c.beginPath();
      c.moveTo(rx, y + s * 0.52);
      c.lineTo(rx - 4, y + s * 0.66);
      c.stroke();
    }
  } else {
    // two branches meeting
    [[0.38, 0.38], [0.62, 0.38]].forEach(([cx, cy], k) => {
      c.globalAlpha = k ? 0.85 : 1;
      c.beginPath();
      c.arc(x + s * cx, y + s * cy, s * 0.2, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    });
    c.globalAlpha = 1;
  }
  // The visualizer runs along the bottom of the cover
  const bars = levels.length;
  const bw = s / bars;
  c.fillStyle = ink;
  levels.forEach((v, k) => {
    const bh = 3 + v * s * 0.28;
    c.fillRect(x + k * bw + 1, y + s - bh, bw - 2, bh);
  });
  c.restore();
  roundRect(c, x, y, s, s, 4);
  c.lineWidth = 2;
  c.strokeStyle = "#000";
  c.stroke();
}

function drawPlayIcon(c, x, y, r, playing, color) {
  c.fillStyle = color;
  if (playing) {
    c.fillRect(x - r * 0.45, y - r * 0.5, r * 0.32, r);
    c.fillRect(x + r * 0.13, y - r * 0.5, r * 0.32, r);
  } else {
    c.beginPath();
    c.moveTo(x - r * 0.35, y - r * 0.55);
    c.lineTo(x + r * 0.55, y);
    c.lineTo(x - r * 0.35, y + r * 0.55);
    c.closePath();
    c.fill();
  }
}
function drawSkip(c, x, y, dir, color) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x - 5 * dir, y - 6);
  c.lineTo(x + 4 * dir, y);
  c.lineTo(x - 5 * dir, y + 6);
  c.closePath();
  c.fill();
  c.fillRect(dir > 0 ? x + 4 : x - 6, y - 6, 2, 12);
}

function drawSpotifree(c, w, h, player, hotspots) {
  c.fillStyle = "#1a1714";
  c.fillRect(0, 0, w, h);
  const track = TRACKS[player.index];
  const levels = player.levels(14);
  drawCover(c, track, player.index, 12, 12, 92, levels);
  c.textBaseline = "top";
  c.fillStyle = GREEN;
  c.font = `800 7px ${DISPLAY}`;
  c.fillText(player.playing ? "NOW PLAYING" : "PAUSED", 114, 16);
  c.fillStyle = "#fff";
  c.font = `700 14px ${BODY}`;
  const words = track.title.split(" ");
  const first = words.slice(0, Math.ceil(words.length / 2)).join(" ");
  const second = words.slice(Math.ceil(words.length / 2)).join(" ");
  c.fillText(first, 114, 30);
  if (second) c.fillText(second, 114, 47);
  c.fillStyle = "rgba(255,255,255,.6)";
  c.font = `500 10px ${BODY}`;
  c.fillText(track.artist, 114, second ? 66 : 49);
  c.fillStyle = "rgba(255,255,255,.4)";
  c.font = `500 8px ${BODY}`;
  c.fillText("lo-fi · synthesized live", 114, 88);

  // progress
  const total = trackLength(track);
  const elapsed = Math.min(total, player.elapsed);
  c.fillStyle = "rgba(255,255,255,.2)";
  roundRect(c, 12, 118, w - 24, 4, 2);
  c.fill();
  c.fillStyle = GREEN;
  roundRect(c, 12, 118, (w - 24) * (elapsed / total), 4, 2);
  c.fill();
  c.fillStyle = "rgba(255,255,255,.55)";
  c.font = `500 8px ${BODY}`;
  c.fillText(fmt(elapsed), 12, 126);
  c.textAlign = "right";
  c.fillText(fmt(total), w - 12, 126);
  c.textAlign = "left";

  // controls
  const cy = 156;
  const cx = w / 2;
  c.fillStyle = GREEN;
  c.beginPath();
  c.arc(cx, cy, 15, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = "#000";
  c.stroke();
  drawPlayIcon(c, cx + (player.playing ? 0 : 1.5), cy, 13, player.playing, "#000");
  drawSkip(c, cx - 44, cy, -1, "#fff");
  drawSkip(c, cx + 44, cy, 1, "#fff");
  hotspots.push({ id: "play", x: cx - 17, y: cy - 17, w: 34, h: 34 });
  hotspots.push({ id: "prev", x: cx - 58, y: cy - 14, w: 28, h: 28 });
  hotspots.push({ id: "next", x: cx + 30, y: cy - 14, w: 28, h: 28 });

  // track list
  c.fillStyle = "rgba(255,255,255,.12)";
  c.fillRect(12, 180, w - 24, 1);
  TRACKS.forEach((t, i) => {
    const ry = 186 + i * 16;
    const current = i === player.index;
    if (current) {
      c.fillStyle = "rgba(31,223,100,.14)";
      c.fillRect(8, ry - 2, w - 16, 15);
    }
    c.textBaseline = "top";
    c.font = `700 9px ${BODY}`;
    c.fillStyle = current ? GREEN : "rgba(255,255,255,.45)";
    c.fillText(current && player.playing ? "♫" : String(i + 1), 14, ry + 1);
    c.fillStyle = current ? GREEN : "#fff";
    c.fillText(t.title, 30, ry + 1);
    c.fillStyle = "rgba(255,255,255,.45)";
    c.font = `500 8px ${BODY}`;
    c.fillText(t.artist, 30 + c.measureText(t.title).width * 1.15 + 8, ry + 2);
    c.textAlign = "right";
    c.fillText(fmt(trackLength(t)), w - 14, ry + 2);
    c.textAlign = "left";
    hotspots.push({ id: "track", index: i, x: 8, y: ry - 2, w: w - 16, h: 15 });
  });
}

export function createDesktop({ terminal, player, actions }) {
  // Positions are the windows' homes; maximized they fill the space between bar and dock
  const windows = {
    terminal: { id: "terminal", title: "oka@desk: ~", home: { x: 18, y: 32, w: 368, h: 212 }, bar: "#ff7a1a", open: true },
    spotifree: { id: "spotifree", title: "Spotifree", home: { x: 376, y: 40, w: 250, h: 272 }, bar: "#000", open: false },
  };
  Object.values(windows).forEach((win) => Object.assign(win, { min: false, max: false, anim: null, surface: null }));
  let order = ["terminal"];
  let hoverX = null;
  let bounce = null;
  let notice = null;
  const now = () => performance.now() / 1000;

  const rectOf = (win) => (win.max ? { x: 10, y: MENU_H + 8, w: SCREEN_W - 20, h: DOCK_Y - MENU_H - 16 } : win.home);
  const front = () => {
    for (let i = order.length - 1; i >= 0; i--) {
      const win = windows[order[i]];
      if (win.open && !win.min) return win;
    }
    return null;
  };
  const raise = (id) => {
    order = order.filter((o) => o !== id).concat(id);
  };

  function launch(id) {
    const app = DOCK_APPS.find((a) => a.id === id);
    if (app?.focus) return actions.focus(app.focus);
    const win = windows[id];
    raise(id);
    if (win.open && !win.min) return;
    if (!win.open) {
      bounce = { id, t0: now() };
      // A first launch bounces in the dock a moment before the window comes out
      win.anim = { kind: "open", t0: now() + 0.35, dur: 0.45 };
      win.open = true;
      actions.launched?.(id);
    } else {
      win.anim = { kind: "restore", t0: now(), dur: 0.45 };
      win.min = false;
    }
  }
  function close(id) {
    const win = windows[id];
    if (!win.open || win.anim) return;
    win.anim = { kind: "close", t0: now(), dur: 0.18 };
  }
  function minimize(id) {
    const win = windows[id];
    if (!win.open || win.min || win.anim) return;
    win.anim = { kind: "min", t0: now(), dur: 0.5 };
  }
  function toggleMax(id) {
    const win = windows[id];
    win.max = !win.max;
    win.anim = { kind: "zoom", t0: now(), dur: 0.25, from: { ...rectOf({ ...win, max: !win.max }) } };
    raise(id);
  }

  // Each window paints into its own canvas, then lands on the screen: straight, or bent by
  // the genie (slices that pour toward the dock icon, the bottom ones first)
  function paintWindow(win, t, hotspots) {
    const r = rectOf(win);
    if (!win.surface || win.surface.w !== r.w || win.surface.h !== r.h) win.surface = surface(r.w, r.h);
    const { c } = win.surface;
    c.clearRect(0, 0, r.w, r.h);
    const local = [];
    c.save();
    roundRect(c, 1, 1, r.w - 2, r.h - 2, 8);
    c.clip();
    // body
    c.save();
    c.translate(0, TITLE_H);
    if (win.id === "terminal") {
      c.fillStyle = "#1a1714";
      c.fillRect(0, 0, r.w, r.h - TITLE_H);
      const src = terminal.canvas;
      // The terminal's own title bar is cropped off; the window has one
      const crop = (49 / 384) * src.height;
      const bodyH = r.h - TITLE_H;
      const scale = Math.min(r.w / src.width, bodyH / (src.height - crop));
      c.drawImage(src, 0, crop, src.width, src.height - crop, 0, 0, src.width * scale, (src.height - crop) * scale);
      local.push({ id: "term", x: 0, y: TITLE_H, w: r.w, h: bodyH });
    } else {
      const inner = [];
      drawSpotifree(c, r.w, r.h - TITLE_H, player, inner);
      inner.forEach((hs) => local.push({ ...hs, y: hs.y + TITLE_H }));
    }
    c.restore();
    // title bar
    c.fillStyle = win.bar;
    c.fillRect(0, 0, r.w, TITLE_H);
    c.fillStyle = "#000";
    c.fillRect(0, TITLE_H - 2, r.w, 2);
    ["#ff5f57", "#febc2e", "#28c840"].forEach((color, i) => {
      c.fillStyle = color;
      c.beginPath();
      c.arc(12 + i * 14, TITLE_H / 2 - 1, 4.5, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 1.2;
      c.strokeStyle = "#000";
      c.stroke();
    });
    local.push(
      { id: "close", win: win.id, x: 5, y: 2, w: 14, h: 16 },
      { id: "min", win: win.id, x: 19, y: 2, w: 14, h: 16 },
      { id: "max", win: win.id, x: 33, y: 2, w: 14, h: 16 },
    );
    c.fillStyle = win.id === "terminal" ? "#000" : "#fff";
    c.font = `700 10px ${BODY}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(win.title, r.w / 2, TITLE_H / 2);
    c.textAlign = "left";
    if (win.id === "terminal" && terminal.alert) {
      c.font = `800 8px ${BODY}`;
      const label = "● NEW MESSAGE";
      const lw = c.measureText(label).width + 10;
      c.fillStyle = terminal.alertOn ? "#000" : "#e11d48";
      c.fillRect(r.w - lw - 6, 4, lw, 12);
      c.fillStyle = terminal.alertOn ? "#ffdd00" : "#fff";
      c.fillText(label, r.w - lw - 1, TITLE_H / 2);
    }
    c.restore();
    roundRect(c, 1, 1, r.w - 2, r.h - 2, 8);
    c.lineWidth = 2;
    c.strokeStyle = "#000";
    c.stroke();

    // onto the screen
    const S = win.surface.canvas;
    const anim = win.anim;
    const p = anim ? clamp01((t - anim.t0) / anim.dur) : 1;
    const icon = { x: iconCenter(iconOf(win.id)), y: DOCK_Y + DOCK_H / 2 };
    if (anim && (anim.kind === "min" || anim.kind === "open" || anim.kind === "restore")) {
      if (t < anim.t0) return;
      // q: 0 the full window, 1 tucked into the icon
      const q = anim.kind === "min" ? p : 1 - p;
      const slices = 28;
      main.globalAlpha = 1 - clamp01((q - 0.85) / 0.15);
      // Where a point f (0 top, 1 bottom) of the window has got to: each slice spans from its
      // own top to the next one's, so the bent window stays in one piece
      const bend = (f) => easeInOut(clamp01(q * 1.6 - (1 - f) * 0.6));
      const yAt = (f) => lerp(r.y + f * r.h, icon.y, bend(f));
      for (let i = 0; i < slices; i++) {
        const f0 = i / slices;
        const f1 = (i + 1) / slices;
        const e = bend((f0 + f1) / 2);
        const width = lerp(r.w, ICON * 0.6, e);
        const cx = lerp(r.x + r.w / 2, icon.x, e);
        const y = yAt(f0);
        main.drawImage(S, 0, f0 * S.height, S.width, S.height / slices, cx - width / 2, y, width, Math.max(0.5, yAt(f1) - y) + 0.6);
      }
      main.globalAlpha = 1;
    } else if (anim && anim.kind === "close") {
      const s = lerp(1, 0.86, easeOut(p));
      main.globalAlpha = 1 - p;
      main.drawImage(S, r.x + (r.w * (1 - s)) / 2, r.y + (r.h * (1 - s)) / 2, r.w * s, r.h * s);
      main.globalAlpha = 1;
    } else {
      let d = r;
      if (anim?.kind === "zoom") {
        const k = easeOut(p);
        d = { x: lerp(anim.from.x, r.x, k), y: lerp(anim.from.y, r.y, k), w: lerp(anim.from.w, r.w, k), h: lerp(anim.from.h, r.h, k) };
      }
      // a hard offset shadow, like everything else on the site
      main.fillStyle = "rgba(0,0,0,.85)";
      roundRect(main, d.x + 5, d.y + 5, d.w, d.h, 8);
      main.fill();
      main.drawImage(S, d.x, d.y, d.w, d.h);
      if (!anim) local.forEach((hs) => hotspots.push({ ...hs, x: hs.x + r.x, y: hs.y + r.y, focusWin: win.id }));
    }
  }

  let main = null;
  function draw(c, { alert = false, alertOn = false } = {}) {
    main = c;
    terminal.alert = alert;
    terminal.alertOn = alertOn;
    const t = now();
    const hotspots = [];
    drawWallpaper(c);

    // windows, back to front; finished animations settle their state
    order.forEach((id) => {
      const win = windows[id];
      if (win.anim && t >= win.anim.t0 + win.anim.dur) {
        if (win.anim.kind === "close") {
          win.open = false;
          win.max = false;
        }
        if (win.anim.kind === "min") win.min = true;
        win.anim = null;
      }
      if (!win.open || (win.min && !win.anim)) return;
      paintWindow(win, t, hotspots);
    });

    // menu bar
    c.fillStyle = "rgba(255,253,245,.92)";
    c.fillRect(0, 0, SCREEN_W, MENU_H);
    c.fillStyle = "#000";
    c.fillRect(0, MENU_H - 2, SCREEN_W, 2);
    c.textBaseline = "middle";
    c.font = `800 11px ${DISPLAY}`;
    c.fillText("✦", 10, MENU_H / 2);
    c.font = `700 10px ${BODY}`;
    const active = front();
    const appName = active ? (active.id === "terminal" ? "Terminal" : "Spotifree") : "Finder";
    c.fillText(appName, 28, MENU_H / 2);
    c.font = `500 10px ${BODY}`;
    let mx = 28 + c.measureText(appName).width + 14;
    ["File", "Edit", "View", "Window", "Help"].forEach((item) => {
      c.fillText(item, mx, MENU_H / 2);
      mx += c.measureText(item).width + 12;
    });
    const date = new Date();
    const clock = `${date.toLocaleDateString("en-US", { weekday: "short" })} ${date.toLocaleDateString("en-US", { day: "numeric", month: "short" })}  ${date.toTimeString().slice(0, 5)}`;
    c.textAlign = "right";
    c.fillText(clock, SCREEN_W - 10, MENU_H / 2);
    let rx = SCREEN_W - 10 - c.measureText(clock).width - 12;
    // battery and wi-fi
    c.lineWidth = 1.2;
    c.strokeStyle = "#000";
    c.strokeRect(rx - 18, 6, 16, 8);
    c.fillRect(rx - 16, 8, 10, 4);
    c.fillRect(rx - 2, 8.5, 1.5, 3);
    rx -= 28;
    [7, 4.5, 2].forEach((r) => {
      c.beginPath();
      c.arc(rx - 6, 14, r, Math.PI * 1.25, Math.PI * 1.75);
      c.stroke();
    });
    rx -= 18;
    if (player.playing) {
      const label = `♫ ${TRACKS[player.index].title}`;
      c.font = `700 10px ${BODY}`;
      c.fillStyle = "#000";
      c.fillText(label, rx, MENU_H / 2);
      hotspots.push({ id: "dock", app: "spotifree", x: rx - c.measureText(label).width, y: 0, w: c.measureText(label).width, h: MENU_H });
    }
    c.textAlign = "left";

    // dock
    roundRect(c, DOCK_X, DOCK_Y, DOCK_W, DOCK_H, 12);
    c.fillStyle = "rgba(255,253,245,.55)";
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = "#000";
    c.stroke();
    let tip = null;
    DOCK_APPS.forEach((app, i) => {
      const cx = iconCenter(i);
      const near = hoverX === null ? 0 : clamp01(1 - Math.abs(cx - hoverX) / 54);
      const s = ICON * (1 + 0.45 * easeInOut(near));
      let lift = 0;
      if (bounce?.id === app.id) {
        const bt = t - bounce.t0;
        if (bt > 1.1) bounce = null;
        else lift = Math.abs(Math.sin(bt * Math.PI * 2.7)) * 12 * (1 - bt / 1.1);
      }
      const y = DOCK_Y + DOCK_H - 7 - s - lift;
      drawIcon(c, app.id, cx - s / 2, y, s);
      const win = windows[app.id];
      if (win?.open) {
        c.fillStyle = "#000";
        c.beginPath();
        c.arc(cx, DOCK_Y + DOCK_H - 3.5, 1.8, 0, Math.PI * 2);
        c.fill();
      }
      if (app.id === "terminal" && alert) {
        c.fillStyle = "#e11d48";
        c.beginPath();
        c.arc(cx + s / 2 - 3, y + 3, 6, 0, Math.PI * 2);
        c.fill();
        c.lineWidth = 1.5;
        c.stroke();
        c.fillStyle = "#fff";
        c.font = `800 8px ${BODY}`;
        c.textAlign = "center";
        c.fillText("1", cx + s / 2 - 3, y + 3.5);
        c.textAlign = "left";
      }
      if (near > 0.7) tip = { label: app.label, x: cx, y: y - 6 };
      hotspots.push({ id: "dock", app: app.id, x: cx - ICON / 2 - ICON_GAP / 2, y: DOCK_Y, w: ICON + ICON_GAP, h: DOCK_H });
    });
    if (tip) {
      c.font = `700 9px ${BODY}`;
      const tw = c.measureText(tip.label).width + 12;
      roundRect(c, tip.x - tw / 2, tip.y - 16, tw, 14, 4);
      c.fillStyle = "#000";
      c.fill();
      c.fillStyle = "#fff";
      c.textAlign = "center";
      c.fillText(tip.label, tip.x, tip.y - 8.5);
      c.textAlign = "left";
    }

    // notification banner, sliding in from the right under the menu bar
    if (notice) {
      const nt = t - notice.t0;
      if (nt > 3.6) notice = null;
      else {
        const slide = nt < 0.35 ? easeOut(nt / 0.35) : nt > 3.2 ? 1 - easeInOut((nt - 3.2) / 0.4) : 1;
        const nw = 200;
        const nx = lerp(SCREEN_W + 8, SCREEN_W - nw - 10, slide);
        const ny = MENU_H + 8;
        c.fillStyle = "#000";
        roundRect(c, nx + 4, ny + 4, nw, 42, 8);
        c.fill();
        roundRect(c, nx, ny, nw, 42, 8);
        c.fillStyle = "#fffdf5";
        c.fill();
        c.lineWidth = 2;
        c.stroke();
        drawIcon(c, notice.app, nx + 8, ny + 8, 26);
        c.fillStyle = "#000";
        c.textBaseline = "top";
        c.font = `700 9px ${BODY}`;
        c.fillText(notice.title, nx + 42, ny + 9);
        c.font = `500 9px ${BODY}`;
        c.fillText(notice.body, nx + 42, ny + 23);
      }
    }
    // Topmost first, for the hit test
    return hotspots.reverse();
  }

  function click(hs) {
    if (hs.id === "dock") return launch(hs.app);
    if (hs.focusWin) raise(hs.focusWin);
    if (hs.id === "close") return close(hs.win);
    if (hs.id === "min") return minimize(hs.win);
    if (hs.id === "max") return toggleMax(hs.win);
    if (hs.id === "play") return actions.toggle();
    if (hs.id === "next") return actions.next();
    if (hs.id === "prev") return actions.prev();
    if (hs.id === "track") return actions.playTrack(hs.index);
    if (hs.id === "term") return actions.terminalClick();
  }

  return {
    draw,
    click,
    launch,
    // Something is moving on the screen: keep redrawing every frame
    busy: () => {
      const t = now();
      return !!(bounce || notice || Object.values(windows).some((w) => w.anim && t < w.anim.t0 + w.anim.dur + 0.05));
    },
    // The pointer over the screen (layout units), or null: the dock magnifies under it
    hover(x, y) {
      const next = x === null || y < DOCK_Y - 24 ? null : x;
      if (next === hoverX) return false;
      hoverX = next;
      return true;
    },
    notify(app, title, body) {
      notice = { app, title, body, t0: now() };
    },
    active: () => front()?.id || null,
    isOpen: (id) => windows[id].open && !windows[id].min,
  };
}
