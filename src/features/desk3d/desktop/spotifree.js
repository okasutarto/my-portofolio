import { TRACKS, trackLength } from "../lofi";
import { DISPLAY, BODY } from "../textures/base";
import { GREEN, fmt } from "./config";
import { roundRect } from "./canvas";

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

export { drawSpotifree };
