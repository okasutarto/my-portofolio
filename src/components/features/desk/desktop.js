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

// Every app: those with a window open on the screen; the others fly the camera to their prop
const APPS = {
  launchpad: { id: "launchpad", label: "Launchpad" },
  files: { id: "files", label: "Projects", focus: "projects" },
  terminal: { id: "terminal", label: "Terminal" },
  spotifree: { id: "spotifree", label: "Spotifree" },
  code: { id: "code", label: "VS Kode" },
  snake: { id: "snake", label: "Snake" },
  notes: { id: "notes", label: "About me", focus: "about" },
  mail: { id: "mail", label: "Mail", focus: "contact" },
  messages: { id: "messages", label: "AI Chat", focus: "chat" },
};
// Kept in the dock; Snake only shows there while it's open (it lives in Launchpad)
const DOCK_KEPT = ["launchpad", "files", "terminal", "spotifree", "code", "notes", "mail", "messages"];
const LAUNCHPAD_APPS = ["terminal", "spotifree", "code", "snake", "files", "notes", "mail", "messages"];
function dockLayout(ids) {
  const w = ids.length * (ICON + ICON_GAP) + ICON_GAP;
  const x = (SCREEN_W - w) / 2;
  return { x, w, center: (i) => x + ICON_GAP + i * (ICON + ICON_GAP) + ICON / 2 };
}

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

// ---------- theme: the desktop follows the room's day and night ----------
const THEMES = {
  light: {
    sky: ["#fbf7ef", "#efe6d8"], dots: "rgba(26,23,20,.07)", line: "#1a1714",
    shapes: ["#ff90e8", "#00e0c6", "#ffdd00", "#7fb2ff", "#ffb35c"],
    bar: "rgba(255,253,245,.92)", ink: "#1a1714", edge: "#000",
    dock: "rgba(255,253,245,.75)", tip: "#1a1714", tipInk: "#fffdf5", card: "#fffdf5",
  },
  dark: {
    sky: ["#2a2540", "#17151f"], dots: "rgba(196,185,220,.08)", line: "#0b0a10",
    shapes: ["#b05fa3", "#1f9c8e", "#c9a93a", "#5f7bc4", "#c97f45"],
    bar: "rgba(23,21,31,.92)", ink: "#ece8f7", edge: "#4b4466",
    dock: "rgba(42,37,64,.8)", tip: "#ece8f7", tipInk: "#17151f", card: "#2a2540",
  },
};

// ---------- wallpaper: abstract cut-paper shapes over the site's dot grid, drawn once a theme ----------
// Big shapes hug the edges and corners, so the middle stays calm behind the windows
const wallpapers = {};
function drawWallpaper(c, name) {
  if (!wallpapers[name]) {
    const paper = surface(SCREEN_W, SCREEN_H);
    const w = paper.c;
    const theme = THEMES[name];
    const sky = w.createLinearGradient(0, 0, SCREEN_W * 0.4, SCREEN_H);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(1, theme.sky[1]);
    w.fillStyle = sky;
    w.fillRect(0, 0, SCREEN_W, SCREEN_H);
    w.fillStyle = theme.dots;
    for (let y = 12; y < SCREEN_H; y += 16) for (let x = 12; x < SCREEN_W; x += 16) w.fillRect(x, y, 1.6, 1.6);
    const [pink, teal, yellow, blue, orange] = theme.shapes;
    w.lineWidth = 3;
    w.lineJoin = "round";
    w.lineCap = "round";
    w.strokeStyle = theme.line;
    const shape = (fill, path) => {
      w.beginPath();
      path();
      w.fillStyle = fill;
      w.fill();
      w.stroke();
    };
    // a blob spilling in from the top right
    shape(pink, () => {
      w.moveTo(430, -10);
      w.bezierCurveTo(440, 60, 500, 120, 580, 110);
      w.bezierCurveTo(630, 104, 650, 150, 660, 170);
      w.lineTo(660, -10);
      w.closePath();
    });
    // a half sun rising from the bottom left
    shape(yellow, () => w.arc(70, SCREEN_H + 10, 120, Math.PI, Math.PI * 2));
    // stripes inside it
    w.save();
    w.beginPath();
    w.arc(70, SCREEN_H + 10, 118, Math.PI, Math.PI * 2);
    w.clip();
    w.strokeStyle = orange;
    w.lineWidth = 6;
    for (let k = 0; k < 6; k++) {
      w.beginPath();
      w.moveTo(-60, SCREEN_H - 30 - k * 18);
      w.lineTo(220, SCREEN_H - 30 - k * 18);
      w.stroke();
    }
    w.restore();
    w.strokeStyle = theme.line;
    w.lineWidth = 3;
    w.beginPath();
    w.arc(70, SCREEN_H + 10, 120, Math.PI, Math.PI * 2);
    w.stroke();
    // a teal quarter disc in the bottom right with a ring floating over it
    shape(teal, () => {
      w.moveTo(SCREEN_W + 10, SCREEN_H + 10);
      w.arc(SCREEN_W + 10, SCREEN_H + 10, 150, Math.PI, Math.PI * 1.5);
      w.closePath();
    });
    w.lineWidth = 12;
    w.strokeStyle = blue;
    w.beginPath();
    w.arc(530, 250, 34, 0, Math.PI * 2);
    w.stroke();
    w.lineWidth = 3;
    w.strokeStyle = theme.line;
    // outlined on both edges, like a cut-paper ring
    [28, 40].forEach((r) => {
      w.beginPath();
      w.arc(530, 250, r, 0, Math.PI * 2);
      w.stroke();
    });
    // a tilted blue tile on the left edge
    w.save();
    w.translate(-6, 150);
    w.rotate(-0.22);
    shape(blue, () => w.rect(0, 0, 70, 70));
    w.restore();
    // a squiggle drifting across the top left
    w.strokeStyle = theme.line;
    w.lineWidth = 3.5;
    w.beginPath();
    for (let x = 150; x <= 330; x += 4) w.lineTo(x, 48 + Math.sin((x - 150) / 14) * 9);
    w.stroke();
    // confetti: a few dots, a triangle and a sparkle
    [[pink, 380, 330, 7], [teal, 250, 345, 5], [yellow, 600, 60, 6], [orange, 120, 105, 5]].forEach(([fill, x, y, r]) =>
      shape(fill, () => w.arc(x, y, r, 0, Math.PI * 2)),
    );
    shape(orange, () => {
      w.moveTo(410, 30);
      w.lineTo(432, 62);
      w.lineTo(394, 60);
      w.closePath();
    });
    shape(yellow, () => {
      const [x, y, a, b] = [600, 205, 13, 4];
      w.moveTo(x, y - a);
      w.quadraticCurveTo(x + b, y - b, x + a, y);
      w.quadraticCurveTo(x + b, y + b, x, y + a);
      w.quadraticCurveTo(x - b, y + b, x - a, y);
      w.quadraticCurveTo(x - b, y - b, x, y - a);
    });
    wallpapers[name] = paper;
  }
  c.drawImage(wallpapers[name].canvas, 0, 0, SCREEN_W, SCREEN_H);
}

// ---------- dock icons ----------
function drawIcon(c, id, x, y, s) {
  const u = s / 32;
  roundRect(c, x, y, s, s, 8 * u);
  c.fillStyle = { launchpad: "#3a3550", files: "#ffdd00", terminal: "#1a1714", spotifree: GREEN, code: "#4f7cff", snake: "#8fd694", notes: "#fffdf5", mail: "#7fb2ff", messages: "#ff90e8" }[id];
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
  if (id === "launchpad") {
    // A grid of little app squares
    ["#ff90e8", "#ffdd00", "#00e0c6", "#7fb2ff", "#ffb35c", "#8fd694", "#fffdf5", "#ff6b6b", "#c4b5fd"].forEach((color, i) => {
      c.fillStyle = color;
      c.fillRect(7 + (i % 3) * 6.5, 7 + Math.floor(i / 3) * 6.5, 4.5, 4.5);
    });
  } else if (id === "code") {
    // Angle brackets and a slash
    c.strokeStyle = "#fff";
    c.lineWidth = 2.6;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(11, 11);
    c.lineTo(6.5, 16);
    c.lineTo(11, 21);
    c.moveTo(21, 11);
    c.lineTo(25.5, 16);
    c.lineTo(21, 21);
    c.moveTo(17.5, 9.5);
    c.lineTo(14.5, 22.5);
    c.stroke();
  } else if (id === "snake") {
    c.strokeStyle = "#1a1714";
    c.lineWidth = 4;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(7, 23);
    c.lineTo(7, 17);
    c.lineTo(16, 17);
    c.lineTo(16, 10);
    c.lineTo(24, 10);
    c.stroke();
    c.fillStyle = "#ff6b6b";
    c.beginPath();
    c.arc(24, 22, 2.6, 0, Math.PI * 2);
    c.fill();
  } else if (id === "files") {
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

// ---------- VS Kode: an editor that writes code by itself ----------
const MONO = "ui-monospace, Menlo, monospace";
const CODE_FILES = [
  {
    name: "hireOka.ts",
    lang: "TypeScript",
    text: `// hireOka.ts: the one function every team needs
import { coffee, ship } from "./life";

type Offer = { role: string; remote: boolean };

export async function hireOka(offer: Offer) {
  const dev = await coffee("double shot");
  if (!offer.remote) dev.pack("laptop");
  return ship({
    who: "Oka Sutarto Putra",
    stack: ["Vue", "React", "Flutter", "Node"],
    vibe: "neo-brutal",
    bugs: 0, // most days
  });
}`,
  },
  {
    name: "Desk.vue",
    lang: "Vue",
    text: `<template>
  <div class="desk" @click="explore">
    <Cat name="Oyen" :asleep="!night" />
    <Monitor app="Spotifree" lofi />
  </div>
</template>

<script setup>
import { ref } from "vue";
const night = ref(new Date().getHours() > 18);
const explore = () => console.log("almost everything clicks");
</script>`,
  },
  {
    name: "coffee.js",
    lang: "JavaScript",
    text: `// coffee.js: the real build step
const cups = [];

export function brew(strength = 2) {
  for (let i = 0; i < strength; i++) {
    cups.push({ hot: true, at: Date.now() });
  }
  return cups.length > 3 ? "ship it" : "one more";
}`,
  },
];
const KEYWORDS = new Set(["const", "let", "function", "return", "if", "else", "for", "export", "default", "import", "from", "await", "async", "new", "true", "false", "null", "type", "class"]);
const SYNTAX = { keyword: "#ff90e8", string: "#8fd694", comment: "#7a7f99", number: "#ffb35c", call: "#7fb2ff", tag: "#ffdd00", plain: "#e8e6f0" };
// Splits a line into coloured runs
function tokenize(line) {
  const out = [];
  const re = /(\/\/.*$)|("[^"]*"?|'[^']*'?|`[^`]*`?)|(<\/?[A-Za-z]+)|(\b\d+\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(line))) {
    const [text, comment, str, tag, num, call, word] = m;
    const kind = comment ? "comment" : str ? "string" : tag ? "tag" : num ? "number" : call ? (KEYWORDS.has(call) ? "keyword" : "call") : word && KEYWORDS.has(word) ? "keyword" : "plain";
    out.push([text, SYNTAX[kind]]);
  }
  return out;
}
// The keystrokes for a file: every character, with the odd typo typed and rubbed out
function keystrokes(text) {
  const ops = [];
  for (const ch of text) {
    if (/[a-z]/.test(ch) && Math.random() < 0.025) ops.push(String.fromCharCode(97 + Math.floor(Math.random() * 26)), "\b");
    ops.push(ch);
  }
  return ops;
}
function createTypist() {
  const state = { file: 0, ops: keystrokes(CODE_FILES[0].text), at: 0, text: "", next: 0, doneAt: null, fastUntil: 0 };
  // Catch up to time t: a human-ish rhythm, a beat after every line, now and then a long think
  state.step = (t) => {
    if (t - state.next > 1) state.next = t;
    for (let n = 0; n < 12 && t >= state.next; n++) {
      if (state.at >= state.ops.length) {
        if (state.doneAt === null) state.doneAt = t;
        if (t - state.doneAt < 3) return;
        state.file = (state.file + 1) % CODE_FILES.length;
        Object.assign(state, { ops: keystrokes(CODE_FILES[state.file].text), at: 0, text: "", doneAt: null });
      }
      const op = state.ops[state.at++];
      state.text = op === "\b" ? state.text.slice(0, -1) : state.text + op;
      let wait = op === "\n" ? 0.28 : op === "\b" ? 0.12 : 0.035 + Math.random() * 0.07;
      if (op === " " && Math.random() < 0.04) wait += 0.7;
      if (t < state.fastUntil) wait /= 3;
      state.next = Math.max(state.next, t - 0.05) + wait;
    }
  };
  return state;
}
function drawCode(c, w, h, typist, t) {
  const file = CODE_FILES[typist.file];
  const ACT = 24;
  const SIDE = 92;
  const TABS = 18;
  const STATUS = 14;
  c.fillStyle = "#1a1b26";
  c.fillRect(0, 0, w, h);
  // activity bar and explorer
  c.fillStyle = "#13141c";
  c.fillRect(0, 0, ACT, h);
  ["#e8e6f0", "#5b5f7a", "#5b5f7a", "#5b5f7a"].forEach((color, i) => {
    c.strokeStyle = color;
    c.lineWidth = 1.4;
    c.strokeRect(7, 9 + i * 22, 10, 10);
  });
  c.fillStyle = "#20212d";
  c.fillRect(ACT, 0, SIDE, h);
  c.textBaseline = "top";
  c.font = `700 7px ${BODY}`;
  c.fillStyle = "#8a8fab";
  c.fillText("EXPLORER", ACT + 8, 7);
  c.fillText("▾ PORTFOLIO", ACT + 8, 20);
  CODE_FILES.forEach((f, i) => {
    const y = 32 + i * 13;
    if (i === typist.file) {
      c.fillStyle = "#2f3145";
      c.fillRect(ACT, y - 2, SIDE, 13);
    }
    c.font = `500 8px ${BODY}`;
    c.fillStyle = i === typist.file ? "#fff" : "#a9adc6";
    c.fillText(f.name, ACT + 16, y);
  });
  const ex = ACT + SIDE;
  // tab
  c.fillStyle = "#13141c";
  c.fillRect(ex, 0, w - ex, TABS);
  c.fillStyle = "#1a1b26";
  c.fillRect(ex, 0, 84, TABS);
  c.fillStyle = "#ffdd00";
  c.fillRect(ex, 0, 84, 2);
  c.fillStyle = "#e8e6f0";
  c.font = `500 8px ${BODY}`;
  c.fillText(file.name, ex + 9, 5);
  c.fillText(typist.at < typist.ops.length ? "●" : "×", ex + 72, 5);
  // code
  const LINE = 11;
  const lines = typist.text.split("\n");
  const rows = Math.floor((h - TABS - STATUS - 6) / LINE);
  const first = Math.max(0, lines.length - rows);
  c.font = `500 8.5px ${MONO}`;
  for (let i = first; i < lines.length; i++) {
    const y = TABS + 4 + (i - first) * LINE;
    c.fillStyle = i === lines.length - 1 ? "#e8e6f0" : "#4b4f68";
    c.textAlign = "right";
    c.fillText(String(i + 1), ex + 20, y);
    c.textAlign = "left";
    let x = ex + 28;
    tokenize(lines[i]).forEach(([text, color]) => {
      c.fillStyle = color;
      c.fillText(text, x, y);
      x += c.measureText(text).width;
    });
    if (i === lines.length - 1 && Math.floor(t * 2) % 2 === 0) {
      c.fillStyle = "#ffdd00";
      c.fillRect(x + 1, y - 1, 1.5, 10);
    }
  }
  // status bar
  const last = lines[lines.length - 1];
  c.fillStyle = "#4f7cff";
  c.fillRect(0, h - STATUS, w, STATUS);
  c.fillStyle = "#fff";
  c.font = `600 7.5px ${BODY}`;
  c.textBaseline = "middle";
  c.fillText("⎇ main   ✓ 0 problems", 8, h - STATUS / 2);
  c.textAlign = "right";
  c.fillText(`Ln ${lines.length}, Col ${last.length + 1}   ${file.lang}`, w - 8, h - STATUS / 2);
  c.textAlign = "left";
}

// ---------- Snake ----------
const SNAKE_COLS = 16;
const SNAKE_ROWS = 12;
const CELL = 12;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEY_DIRS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
const readBest = () => {
  try {
    return Number(localStorage.getItem("snake-best")) || 0;
  } catch {
    return 0;
  }
};
function createSnake(sound) {
  const game = { state: "ready", body: [], dir: "right", queue: [], food: null, score: 0, best: readBest(), stepAt: 0 };
  const placeFood = () => {
    const free = [];
    for (let x = 0; x < SNAKE_COLS; x++) for (let y = 0; y < SNAKE_ROWS; y++) if (!game.body.some((p) => p.x === x && p.y === y)) free.push({ x, y });
    game.food = free[Math.floor(Math.random() * free.length)];
  };
  game.reset = (dir = "right") => {
    Object.assign(game, { state: "play", body: [{ x: 6, y: 6 }, { x: 5, y: 6 }, { x: 4, y: 6 }], dir: "right", queue: [dir], score: 0, stepAt: 0 });
    placeFood();
  };
  // A turn (or a start): turns are queued so two quick ones both land, and never straight back
  game.steer = (dir) => {
    if (game.state !== "play") return game.reset(dir === "left" ? "right" : dir);
    const last = game.queue[game.queue.length - 1] || game.dir;
    const [dx, dy] = DIRS[dir];
    const [lx, ly] = DIRS[last];
    if (dx === -lx && dy === -ly) return;
    if (game.queue.length < 3) game.queue.push(dir);
  };
  game.step = (t) => {
    if (game.state !== "play") return;
    if (!game.stepAt) game.stepAt = t;
    const every = Math.max(0.07, 0.14 - game.score * 0.004);
    if (t - game.stepAt > 1) game.stepAt = t;
    while (t - game.stepAt >= every && game.state === "play") {
      game.stepAt += every;
      if (game.queue.length) game.dir = game.queue.shift();
      const [dx, dy] = DIRS[game.dir];
      const head = { x: game.body[0].x + dx, y: game.body[0].y + dy };
      const hit = head.x < 0 || head.y < 0 || head.x >= SNAKE_COLS || head.y >= SNAKE_ROWS || game.body.slice(0, -1).some((p) => p.x === head.x && p.y === head.y);
      if (hit) {
        game.state = "over";
        if (game.score > game.best) {
          game.best = game.score;
          try {
            localStorage.setItem("snake-best", String(game.best));
          } catch {
            // The best score just isn't kept between visits
          }
        }
        sound("buzz");
        return;
      }
      game.body.unshift(head);
      if (head.x === game.food.x && head.y === game.food.y) {
        game.score++;
        sound("pop");
        placeFood();
      } else game.body.pop();
    }
  };
  return game;
}
function drawSnake(c, w, h, game, hotspots) {
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#1a1714";
  c.textBaseline = "middle";
  c.font = `800 8px ${DISPLAY}`;
  c.fillText(`SCORE ${game.score}`, 10, 10);
  c.textAlign = "right";
  c.fillText(`BEST ${Math.max(game.best, game.score)}`, w - 10, 10);
  c.textAlign = "left";
  const bx = (w - SNAKE_COLS * CELL) / 2;
  const by = 20;
  c.fillStyle = "#1a1714";
  c.fillRect(bx - 2, by - 2, SNAKE_COLS * CELL + 4, SNAKE_ROWS * CELL + 4);
  for (let x = 0; x < SNAKE_COLS; x++) for (let y = 0; y < SNAKE_ROWS; y++) {
    c.fillStyle = (x + y) % 2 ? "#2a2724" : "#24211f";
    c.fillRect(bx + x * CELL, by + y * CELL, CELL, CELL);
  }
  // a coffee bean to eat
  if (game.food) {
    const fx = bx + game.food.x * CELL + CELL / 2;
    const fy = by + game.food.y * CELL + CELL / 2;
    c.fillStyle = "#a0622d";
    c.beginPath();
    c.ellipse(fx, fy, 4.2, 3.2, 0.6, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#3b2312";
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(fx - 2.4, fy - 1.6);
    c.quadraticCurveTo(fx, fy + 0.8, fx + 2.4, fy + 1.6);
    c.stroke();
  }
  game.body.forEach((p, i) => {
    c.fillStyle = i === 0 ? "#22c55e" : "#8fd694";
    c.fillRect(bx + p.x * CELL + 1, by + p.y * CELL + 1, CELL - 2, CELL - 2);
    if (i === 0) {
      // Two eyes either side of the way it's heading
      c.fillStyle = "#1a1714";
      const [dx, dy] = DIRS[game.dir];
      const cx = bx + p.x * CELL + CELL / 2 + dx * 2;
      const cy = by + p.y * CELL + CELL / 2 + dy * 2;
      [-1, 1].forEach((side) => c.fillRect(cx - dy * 2.6 * side - 1, cy + dx * 2.6 * side - 1, 2, 2));
    }
  });
  if (game.state !== "play") {
    c.fillStyle = "rgba(26,23,20,.75)";
    c.fillRect(bx, by, SNAKE_COLS * CELL, SNAKE_ROWS * CELL);
    c.fillStyle = "#ffdd00";
    c.textAlign = "center";
    c.font = `800 10px ${DISPLAY}`;
    c.fillText(game.state === "over" ? "GAME OVER" : "SNAKE", w / 2, by + SNAKE_ROWS * CELL / 2 - 8);
    c.fillStyle = "#fffdf5";
    c.font = `600 8px ${BODY}`;
    c.fillText(game.state === "over" ? "an arrow or a tap to play again" : "press an arrow (or WASD) to start", w / 2, by + SNAKE_ROWS * CELL / 2 + 8);
    c.textAlign = "left";
  }
  hotspots.push({ id: "snakeStart", x: bx, y: by, w: SNAKE_COLS * CELL, h: SNAKE_ROWS * CELL });
  // On-screen arrows, for touch screens
  const py = by + SNAKE_ROWS * CELL + 8;
  [["left", "◀"], ["up", "▲"], ["down", "▼"], ["right", "▶"]].forEach(([dir, glyph], i) => {
    const x = w / 2 - 66 + i * 34;
    c.fillStyle = "#1a1714";
    roundRect(c, x + 2, py + 2, 30, 18, 4);
    c.fill();
    c.fillStyle = "#ffdd00";
    roundRect(c, x, py, 30, 18, 4);
    c.fill();
    c.lineWidth = 1.5;
    c.strokeStyle = "#1a1714";
    c.stroke();
    c.fillStyle = "#1a1714";
    c.textAlign = "center";
    c.font = `800 9px ${BODY}`;
    c.fillText(glyph, x + 15, py + 9.5);
    c.textAlign = "left";
    hotspots.push({ id: "snakeDir", dir, x, y: py, w: 30, h: 18 });
  });
}

export function createDesktop({ terminal, player, actions }) {
  // Positions are the windows' homes; maximized they fill the space between bar and dock
  const windows = {
    terminal: { id: "terminal", title: "oka@desk: ~", home: { x: 18, y: 32, w: 368, h: 212 }, bar: "#ff7a1a", ink: "#000", open: true },
    spotifree: { id: "spotifree", title: "Spotifree", home: { x: 376, y: 40, w: 250, h: 272 }, bar: "#000", ink: "#fff", open: false },
    code: { id: "code", title: "portfolio — VS Kode", home: { x: 44, y: 38, w: 420, h: 268 }, bar: "#13141c", ink: "#fff", open: false },
    snake: { id: "snake", title: "Snake", home: { x: 404, y: 52, w: 212, h: 238 }, bar: "#8fd694", ink: "#000", open: false },
  };
  const typist = createTypist();
  const snake = createSnake((name) => actions.sound?.(name));
  // Launchpad: a grid of every app over the dimmed desktop
  const pad = { open: false, t0: -9 };
  Object.values(windows).forEach((win) => Object.assign(win, { min: false, max: false, anim: null, surface: null }));
  let order = ["terminal"];
  let hoverX = null;
  let bounce = null;
  let notice = null;
  let themeName = "light";
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

  const dockIds = () => (windows.snake.open ? [...DOCK_KEPT, "snake"] : DOCK_KEPT);
  const iconX = (id) => {
    const ids = dockIds();
    return dockLayout(ids).center(Math.max(0, ids.indexOf(id)));
  };

  function launch(id) {
    const app = APPS[id];
    if (id === "launchpad") return Object.assign(pad, { open: !pad.open, t0: now() });
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
      if (win.id === "spotifree") drawSpotifree(c, r.w, r.h - TITLE_H, player, inner);
      else if (win.id === "snake") drawSnake(c, r.w, r.h - TITLE_H, snake, inner);
      else {
        drawCode(c, r.w, r.h - TITLE_H, typist, t);
        inner.push({ id: "code", x: 0, y: 0, w: r.w, h: r.h - TITLE_H });
      }
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
    c.fillStyle = win.ink;
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
    const icon = { x: iconX(win.id), y: DOCK_Y + DOCK_H / 2 };
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
    const theme = THEMES[themeName];
    drawWallpaper(c, themeName);
    // The editor types on while it's showing; the snake only moves while it's the front window
    if (windows.code.open && !windows.code.min) typist.step(t);
    if (front()?.id === "snake") snake.step(t);

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
    c.fillStyle = theme.bar;
    c.fillRect(0, 0, SCREEN_W, MENU_H);
    c.fillStyle = theme.edge;
    c.fillRect(0, MENU_H - 2, SCREEN_W, 2);
    c.fillStyle = theme.ink;
    c.textBaseline = "middle";
    c.font = `800 11px ${DISPLAY}`;
    c.fillText("✦", 10, MENU_H / 2);
    c.font = `700 10px ${BODY}`;
    const active = front();
    const appName = active ? APPS[active.id].label : "Finder";
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
    c.strokeStyle = theme.ink;
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
      c.fillText(label, rx, MENU_H / 2);
      hotspots.push({ id: "dock", app: "spotifree", x: rx - c.measureText(label).width, y: 0, w: c.measureText(label).width, h: MENU_H });
    }
    c.textAlign = "left";

    // dock
    const ids = dockIds();
    const dock = dockLayout(ids);
    roundRect(c, dock.x, DOCK_Y, dock.w, DOCK_H, 12);
    c.fillStyle = theme.dock;
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = theme.edge;
    c.stroke();
    let tip = null;
    ids.forEach((id, i) => {
      const app = APPS[id];
      const cx = dock.center(i);
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
      if (win?.open || (app.id === "launchpad" && pad.open)) {
        c.fillStyle = theme.ink;
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
      c.fillStyle = theme.tip;
      c.fill();
      c.fillStyle = theme.tipInk;
      c.textAlign = "center";
      c.fillText(tip.label, tip.x, tip.y - 8.5);
      c.textAlign = "left";
    }

    // Launchpad over everything but the notifications: the desktop dims, the icons zoom in
    const pt = t - pad.t0;
    const shown = pad.open ? clamp01(pt / 0.25) : 1 - clamp01(pt / 0.2);
    if (shown > 0) {
      c.fillStyle = `rgba(20,18,30,${0.6 * shown})`;
      c.fillRect(0, 0, SCREEN_W, SCREEN_H);
      c.save();
      c.globalAlpha = shown;
      const k = lerp(1.15, 1, easeOut(shown));
      c.translate(SCREEN_W / 2, SCREEN_H / 2);
      c.scale(k, k);
      c.translate(-SCREEN_W / 2, -SCREEN_H / 2);
      if (pad.open) hotspots.push({ id: "padClose", x: 0, y: 0, w: SCREEN_W, h: SCREEN_H });
      LAUNCHPAD_APPS.forEach((id, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const size = 52;
        const x = SCREEN_W / 2 - 2 * 96 + col * 96 + (96 - size) / 2;
        const y = 90 + row * 104;
        drawIcon(c, id, x, y, size);
        c.fillStyle = "#fff";
        c.font = `700 10px ${BODY}`;
        c.textAlign = "center";
        c.textBaseline = "top";
        c.fillText(APPS[id].label, x + size / 2, y + size + 8);
        c.textAlign = "left";
        if (pad.open) hotspots.push({ id: "pad", app: id, x: x - 12, y: y - 6, w: size + 24, h: size + 30 });
      });
      c.restore();
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
        c.fillStyle = theme.card;
        c.fill();
        c.lineWidth = 2;
        c.strokeStyle = "#000";
        c.stroke();
        drawIcon(c, notice.app, nx + 8, ny + 8, 26);
        c.fillStyle = theme.ink;
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
    if (hs.id === "padClose") return Object.assign(pad, { open: false, t0: now() });
    if (hs.id === "pad") {
      Object.assign(pad, { open: false, t0: now() });
      return launch(hs.app);
    }
    if (hs.id === "dock") {
      if (pad.open && hs.app !== "launchpad") Object.assign(pad, { open: false, t0: now() });
      return launch(hs.app);
    }
    if (hs.focusWin) raise(hs.focusWin);
    if (hs.id === "close") return close(hs.win);
    if (hs.id === "min") return minimize(hs.win);
    if (hs.id === "max") return toggleMax(hs.win);
    if (hs.id === "play") return actions.toggle();
    if (hs.id === "next") return actions.next();
    if (hs.id === "prev") return actions.prev();
    if (hs.id === "track") return actions.playTrack(hs.index);
    if (hs.id === "term") return actions.terminalClick();
    // A click in the editor makes it type faster for a few seconds
    if (hs.id === "code") typist.fastUntil = now() + 4;
    if (hs.id === "snakeDir") return snake.steer(hs.dir);
    if (hs.id === "snakeStart" && snake.state !== "play") return snake.reset();
  }

  return {
    draw,
    click,
    launch,
    // Something is moving on the screen: keep redrawing every frame
    busy: () => {
      const t = now();
      return !!(
        bounce ||
        notice ||
        t - pad.t0 < 0.3 ||
        (windows.code.open && !windows.code.min) ||
        (front()?.id === "snake" && snake.state === "play") ||
        Object.values(windows).some((w) => w.anim && t < w.anim.t0 + w.anim.dur + 0.05)
      );
    },
    // A key while zoomed in on the screen; true when the desktop used it (Snake's arrows/WASD)
    key(e) {
      if (front()?.id !== "snake") return false;
      const dir = KEY_DIRS[e.key];
      if (dir) {
        snake.steer(dir);
        return true;
      }
      if ((e.key === " " || e.key === "Enter") && snake.state !== "play") {
        snake.reset();
        return true;
      }
      return false;
    },
    // The pointer over the screen (layout units), or null: the dock magnifies under it
    hover(x, y) {
      const next = x === null || y < DOCK_Y - 24 ? null : x;
      if (next === hoverX) return false;
      hoverX = next;
      return true;
    },
    setTheme(dark) {
      themeName = dark ? "dark" : "light";
    },
    notify(app, title, body) {
      notice = { app, title, body, t0: now() };
    },
    active: () => front()?.id || null,
    isOpen: (id) => windows[id].open && !windows[id].min,
  };
}
