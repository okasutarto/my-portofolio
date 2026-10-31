import { BODY, DISPLAY, brutalBox, wrap } from "./base";
import { fileCanvas, fileText } from "./caseFiles";

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


// Shared with the other texture modules
export { paperGrain };
