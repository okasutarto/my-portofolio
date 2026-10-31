import { paintScenery } from "../wallpapers";
import { SCREEN_W, SCREEN_H, GREEN } from "./config";
import { surface, roundRect, seeded, grainOver, halftone, gloss } from "./canvas";

// ---------- theme: the desktop follows the room's day and night ----------
const THEMES = {
  light: {
    // a cool sky and bold, plain colours: navy where the pink blob was, cobalt, teal, the
    // yellow sun with orange stripes
    sky: ["#a8dcff", "#eef8ff"], dots: "rgba(26,23,20,.09)", line: "#1a1714",
    shapes: ["#1e3a8a", "#00e0c6", "#ffdd00", "#3b82f6", "#ff7a1a"],
    bar: "rgba(255,253,245,.92)", ink: "#1a1714", edge: "#000",
    dock: "rgba(255,253,245,.75)", shelf: "rgba(26,23,20,.08)", tip: "#1a1714", tipInk: "#fffdf5", card: "#fffdf5",
  },
  dark: {
    sky: ["#2a2540", "#17151f"], dots: "rgba(196,185,220,.08)", line: "#0b0a10",
    shapes: ["#b05fa3", "#1f9c8e", "#c9a93a", "#5f7bc4", "#c97f45"],
    bar: "rgba(23,21,31,.92)", ink: "#ece8f7", edge: "#4b4466",
    dock: "rgba(42,37,64,.8)", shelf: "rgba(0,0,0,.25)", tip: "#ece8f7", tipInk: "#17151f", card: "#2a2540",
  },
};

// ---------- wallpaper: abstract cut-paper shapes over the site's dot grid, drawn once a theme ----------
// Big shapes hug the edges and corners, so the middle stays calm behind the windows
const wallpapers = {};
function originalSheet(name) {
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
    // paper fibres: short faint hairs, the same every time
    const rnd = seeded(name === "dark" ? 41 : 17);
    w.lineWidth = 0.6;
    for (let i = 0; i < 140; i++) {
      const x = rnd() * SCREEN_W;
      const y = rnd() * SCREEN_H;
      const a = rnd() * Math.PI;
      w.strokeStyle = rnd() < 0.5 ? theme.dots : "rgba(255,255,255,.25)";
      w.beginPath();
      w.moveTo(x, y);
      w.quadraticCurveTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4 + 1.5, x + Math.cos(a) * 9, y + Math.sin(a) * 9);
      w.stroke();
    }
    const [blob, teal, yellow, blue, orange] = theme.shapes;
    w.lineWidth = 3;
    w.lineJoin = "round";
    w.lineCap = "round";
    w.strokeStyle = theme.line;
    // Each cut-paper shape lies on the page: a hard shadow under it, halftone shading on
    // its lower side, and its ink outline
    const shade = name === "dark" ? "rgba(0,0,0,.35)" : "rgba(26,23,20,.22)";
    const shape = (fill, path, box = null) => {
      w.save();
      w.translate(4, 4);
      w.beginPath();
      path();
      w.fillStyle = shade;
      w.fill();
      w.restore();
      w.beginPath();
      path();
      w.fillStyle = fill;
      w.fill();
      if (box) halftone(w, box, "rgba(0,0,0,.16)");
      w.beginPath();
      path();
      w.stroke();
    };
    // a blob spilling in from the top right
    shape(blob, () => {
      w.moveTo(430, -10);
      w.bezierCurveTo(440, 60, 500, 120, 580, 110);
      w.bezierCurveTo(630, 104, 650, 150, 660, 170);
      w.lineTo(660, -10);
      w.closePath();
    }, [430, -10, 230, 180]);
    // a half sun rising from the bottom left
    shape(yellow, () => w.arc(70, SCREEN_H + 10, 120, Math.PI, Math.PI * 2), [-50, SCREEN_H - 110, 240, 120]);
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
    // a thin highlight along the sun's rim
    w.strokeStyle = "rgba(255,255,255,.55)";
    w.lineWidth = 2;
    w.beginPath();
    w.arc(70, SCREEN_H + 10, 112, Math.PI * 1.1, Math.PI * 1.45);
    w.stroke();
    w.strokeStyle = theme.line;
    w.lineWidth = 3;
    // a teal quarter disc in the bottom right with a ring floating over it
    shape(teal, () => {
      w.moveTo(SCREEN_W + 10, SCREEN_H + 10);
      w.arc(SCREEN_W + 10, SCREEN_H + 10, 150, Math.PI, Math.PI * 1.5);
      w.closePath();
    }, [SCREEN_W - 140, SCREEN_H - 140, 150, 150]);
    // a dashed orbit round the ring
    w.save();
    w.setLineDash([3, 6]);
    w.lineWidth = 1.6;
    w.beginPath();
    w.ellipse(530, 250, 62, 22, -0.35, 0, Math.PI * 2);
    w.stroke();
    w.restore();
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
    shape(blue, () => w.rect(0, 0, 70, 70), [0, 0, 70, 70]);
    // ruled lines on the tile, like a scrap of notebook paper
    w.strokeStyle = "rgba(255,255,255,.35)";
    w.lineWidth = 1;
    for (let k = 1; k < 5; k++) {
      w.beginPath();
      w.moveTo(8, k * 14);
      w.lineTo(64, k * 14);
      w.stroke();
    }
    w.restore();
    // a strip of washi tape holding the tile on
    w.save();
    w.translate(40, 140);
    w.rotate(0.5);
    w.fillStyle = name === "dark" ? "rgba(201,169,58,.75)" : "rgba(255,221,0,.8)";
    w.fillRect(-18, -6, 36, 12);
    w.strokeStyle = "rgba(0,0,0,.15)";
    w.lineWidth = 1;
    for (let k = -14; k < 18; k += 5) {
      w.beginPath();
      w.moveTo(k, -6);
      w.lineTo(k + 4, 6);
      w.stroke();
    }
    w.restore();
    // a squiggle drifting across the top left
    w.strokeStyle = theme.line;
    w.lineWidth = 3.5;
    w.beginPath();
    for (let x = 150; x <= 330; x += 4) w.lineTo(x, 48 + Math.sin((x - 150) / 14) * 9);
    w.stroke();
    // confetti: a few dots, a triangle and a sparkle
    [[blob, 380, 330, 7], [teal, 250, 345, 5], [yellow, 600, 60, 6], [orange, 120, 105, 5]].forEach(([fill, x, y, r]) =>
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
    // little plus marks, scattered like print registration crosses
    w.strokeStyle = theme.line;
    w.lineWidth = 2;
    [[352, 92], [470, 330], [214, 300], [612, 300]].forEach(([x, y]) => {
      w.beginPath();
      w.moveTo(x - 5, y);
      w.lineTo(x + 5, y);
      w.moveTo(x, y - 5);
      w.lineTo(x, y + 5);
      w.stroke();
    });
    // the whole sheet gets the print grain, then a soft vignette at the edges
    w.beginPath();
    w.rect(0, 0, SCREEN_W, SCREEN_H);
    grainOver(w, 1);
    const vignette = w.createRadialGradient(SCREEN_W / 2, SCREEN_H / 2, SCREEN_H * 0.35, SCREEN_W / 2, SCREEN_H / 2, SCREEN_W * 0.62);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, name === "dark" ? "rgba(0,0,0,.35)" : "rgba(26,23,20,.12)");
    w.fillStyle = vignette;
    w.fillRect(0, 0, SCREEN_W, SCREEN_H);
    wallpapers[name] = paper;
  }
  return wallpapers[name];
}
// Any wallpaper's sheet for the room's look: the original, or a landscape cut from the same paper
function sheetOf(id, name) {
  if (id === "original") return originalSheet(name);
  const key = `${id}-${name}`;
  if (!wallpapers[key]) {
    wallpapers[key] = surface(SCREEN_W, SCREEN_H);
    paintScenery(wallpapers[key].c, id, name, { halftone, grainOver, seeded });
  }
  return wallpapers[key];
}

function coverImage(c, image, x, y, w, h) {
  const scale = Math.max(w / image.width, h / image.height);
  const sw = w / scale, sh = h / scale;
  c.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h);
}

// ---------- dock icons ----------
// Each is a little printed tile: a hard shadow, its colour, a gloss on top, grain, an outline
function drawIcon(c, id, x, y, s, { shadow = true } = {}) {
  const u = s / 32;
  if (shadow) {
    roundRect(c, x + 2 * u, y + 2.5 * u, s, s, 8 * u);
    c.fillStyle = "rgba(0,0,0,.8)";
    c.fill();
  }
  roundRect(c, x, y, s, s, 8 * u);
  c.fillStyle = { launchpad: "#3a3550", files: "#ffdd00", terminal: "#1a1714", spotifree: GREEN, code: "#4f7cff", wallpaper: "#b7c8ff", snake: "#8fd694", notes: "#fffdf5", mail: "#7fb2ff", messages: "#ff90e8" }[id];
  c.fill();
  gloss(c, x, y, s, s, { top: 0.32, foot: 0.16 });
  grainOver(c, 0.9);
  c.lineWidth = 2;
  c.strokeStyle = "#000";
  c.stroke();
  // a bright sliver along the top edge
  c.save();
  roundRect(c, x, y, s, s, 8 * u);
  c.clip();
  c.strokeStyle = "rgba(255,255,255,.45)";
  c.lineWidth = 1.2 * u;
  c.beginPath();
  c.moveTo(x + 7 * u, y + 2.6 * u);
  c.lineTo(x + s - 7 * u, y + 2.6 * u);
  c.stroke();
  c.restore();
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
  } else if (id === "wallpaper") {
    c.fillStyle = "#fff6bd";
    c.beginPath(); c.arc(22, 10, 4, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = "#589f84";
    c.beginPath(); c.moveTo(4, 26); c.lineTo(13, 12); c.lineTo(19, 20);
    c.lineTo(24, 16); c.lineTo(29, 26); c.closePath(); c.fill(); c.stroke();
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
    // One closed outline keeps the tail joined to the balloon without a seam.
    c.lineJoin = "round";
    c.beginPath();
    c.ellipse(16, 15, 10, 7.5, 0, 2.35, 1.85 + Math.PI * 2);
    c.lineTo(8, 25);
    c.lineTo(16 + Math.cos(2.35) * 10, 15 + Math.sin(2.35) * 7.5);
    c.closePath();
    c.fill();
    c.stroke();
  }
  c.restore();
}

// ---------- Spotifree ----------

export { THEMES, sheetOf, coverImage, drawIcon };
