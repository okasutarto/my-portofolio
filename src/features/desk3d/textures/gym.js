import { DISPLAY, brutalBox, fitFont } from "./base";
import { paperGrain } from "./postcard";

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

