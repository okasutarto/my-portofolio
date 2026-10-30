import { BODY, DISPLAY, fitFont, wrap } from "./base";

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
    fitFont(c, shift, 500, BODY, Math.round(h * 0.3), w * 0.78, 4);
    c.fillText(shift, w / 2, h * 0.3);
    fitFont(c, label, 500, BODY, Math.round(h * 0.3), w * 0.78, 4);
    c.fillText(label, w / 2, h * 0.68);
  } else {
    fitFont(c, label, 500, BODY, Math.round(h * (small ? 0.24 : 0.4)), w * 0.78, 4);
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
  c.fillText("the@desk: ~", 120, 23);
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

