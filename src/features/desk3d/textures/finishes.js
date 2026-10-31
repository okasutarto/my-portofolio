import { DISPLAY } from "./base";

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


// Shared with the other texture modules
export { stockGrain, guilloche, paperclip, rubberStamp };
