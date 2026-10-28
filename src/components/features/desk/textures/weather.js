import { brutalBox } from "./base";
import { mixHex } from "./windowView";

// ---------- weather card (beside the window) ----------
// WMO weather codes, as Open-Meteo reports them, to a label and an icon kind
export function weatherKind(code) {
  if (code === 0) return ["Clear", "clear"];
  if (code <= 2) return ["Partly cloudy", "partly"];
  if (code === 3) return ["Overcast", "cloudy"];
  if (code === 45 || code === 48) return ["Fog", "fog"];
  if (code >= 51 && code <= 57) return ["Drizzle", "rain"];
  if (code >= 61 && code <= 67) return ["Rain", "rain"];
  if (code >= 71 && code <= 77) return ["Snow", "snow"];
  if (code >= 80 && code <= 82) return ["Showers", "rain"];
  if (code >= 85 && code <= 86) return ["Snow showers", "snow"];
  if (code >= 95) return ["Thunderstorm", "storm"];
  return ["—", "cloudy"];
}

// A little icon for a kind of weather, `s` across, centred on (x, y): flat colours with a
// shaded underside and a sheen up top, like the rest of the desk's cartoon props
function weatherIcon(c, x, y, s, kind, night = false) {
  const ink = "#1a1714";
  c.save();
  c.lineJoin = "round";
  c.lineCap = "round";
  c.lineWidth = s * 0.05;
  c.strokeStyle = ink;
  // fill a shape, shade the part of it `below` traces (it may name a fill rule), add a sheen,
  // then ink its edge
  const cel = (path, fill, below, sheen) => {
    path();
    c.fillStyle = fill;
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = mixHex(fill, "#3b3a7a", 0.22);
    c.fill(below() || "nonzero");
    if (sheen) {
      c.fillStyle = "rgba(255,255,255,.75)";
      sheen();
      c.fill();
    }
    c.restore();
    path();
    c.stroke();
  };
  const sun = (cx, cy, r) => {
    if (night) {
      const moon = () => {
        c.beginPath();
        c.arc(cx, cy, r, Math.PI * 0.35, Math.PI * 1.65);
        c.arc(cx + r * 0.45, cy - r * 0.1, r * 0.8, Math.PI * 1.55, Math.PI * 0.45, true);
        c.closePath();
      };
      cel(moon, "#fff3b0", () => {
        c.beginPath();
        c.arc(cx - r * 0.2, cy + r * 0.35, r * 0.9, 0, Math.PI * 2);
      });
      c.fillStyle = "#e6d27a";
      [[-0.55, -0.2, 0.13], [-0.35, 0.35, 0.09]].forEach(([dx, dy, k]) => {
        c.beginPath();
        c.arc(cx + dx * r, cy + dy * r, k * r, 0, Math.PI * 2);
        c.fill();
      });
      return;
    }
    // rays: long and short in turn, each a rounded wedge
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const len = i % 2 ? 1.5 : 1.75;
      c.save();
      c.translate(cx, cy);
      c.rotate(a);
      c.beginPath();
      c.moveTo(r * 1.22, -r * 0.13);
      c.lineTo(r * len, 0);
      c.lineTo(r * 1.22, r * 0.13);
      c.closePath();
      c.fillStyle = i % 2 ? "#ffb02e" : "#ffcf3a";
      c.fill();
      c.stroke();
      c.restore();
    }
    cel(() => {
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
    }, "#ffcf3a", () => {
      // everything outside a circle nudged up and left: a crescent of shade low on the right
      c.beginPath();
      c.arc(cx - r * 0.25, cy - r * 0.3, r * 1.05, 0, Math.PI * 2);
      c.rect(cx - r * 2, cy - r * 2, r * 4, r * 4);
      return "evenodd";
    }, () => {
      c.beginPath();
      c.ellipse(cx - r * 0.38, cy - r * 0.42, r * 0.26, r * 0.15, -0.6, 0, Math.PI * 2);
    });
  };
  const cloud = (cx, cy, r, fill = "#fffdf5") => {
    const shape = () => {
      c.beginPath();
      c.arc(cx - r * 0.75, cy + r * 0.15, r * 0.55, Math.PI * 0.5, Math.PI * 1.5);
      c.arc(cx - r * 0.15, cy - r * 0.25, r * 0.7, Math.PI * 1.05, Math.PI * 1.9);
      c.arc(cx + r * 0.65, cy + r * 0.1, r * 0.6, Math.PI * 1.35, Math.PI * 0.5);
      c.closePath();
    };
    cel(shape, fill, () => {
      c.beginPath();
      c.rect(cx - r * 2, cy + r * 0.28, r * 4, r * 2);
    }, () => {
      c.beginPath();
      c.ellipse(cx - r * 0.3, cy - r * 0.55, r * 0.26, r * 0.11, -0.25, 0, Math.PI * 2);
    });
  };
  const drop = (px, py, k) => {
    c.beginPath();
    c.moveTo(px, py - k * 1.3);
    c.quadraticCurveTo(px + k, py + k * 0.2, px, py + k);
    c.quadraticCurveTo(px - k, py + k * 0.2, px, py - k * 1.3);
    c.fillStyle = "#5fb3ff";
    c.fill();
    c.stroke();
    c.beginPath();
    c.arc(px - k * 0.3, py + k * 0.05, k * 0.22, 0, Math.PI * 2);
    c.fillStyle = "#fffdf5";
    c.fill();
  };
  if (kind === "clear") sun(x, y, s * 0.24);
  else if (kind === "partly") {
    sun(x - s * 0.14, y - s * 0.12, s * 0.18);
    cloud(x + s * 0.08, y + s * 0.1, s * 0.3);
  } else if (kind === "cloudy") {
    cloud(x + s * 0.12, y - s * 0.08, s * 0.24, "#c9d1dc");
    cloud(x - s * 0.04, y + s * 0.08, s * 0.32);
  } else if (kind === "fog") {
    cloud(x, y - s * 0.12, s * 0.28, "#dfe4ea");
    [0.16, 0.3].forEach((dy, i) => {
      c.beginPath();
      const x0 = x - s * (0.32 - i * 0.06);
      const x1 = x + s * (0.32 - i * 0.1);
      c.moveTo(x0, y + s * dy);
      for (let k = 1; k <= 4; k++) c.quadraticCurveTo(x0 + ((k - 0.5) / 4) * (x1 - x0), y + s * (dy + (k % 2 ? -0.03 : 0.03)), x0 + (k / 4) * (x1 - x0), y + s * dy);
      c.stroke();
    });
  } else {
    cloud(x, y - s * 0.1, s * 0.3, kind === "storm" ? "#9aa5b5" : "#dfe6f0");
    if (kind === "storm") {
      const bolt = () => {
        c.beginPath();
        c.moveTo(x + s * 0.02, y + s * 0.06);
        c.lineTo(x - s * 0.1, y + s * 0.26);
        c.lineTo(x + s * 0.02, y + s * 0.26);
        c.lineTo(x - s * 0.06, y + s * 0.44);
        c.lineTo(x + s * 0.16, y + s * 0.18);
        c.lineTo(x + s * 0.04, y + s * 0.18);
        c.closePath();
      };
      cel(bolt, "#ffdd00", () => {
        c.beginPath();
        c.rect(x + s * 0.03, y, s * 0.3, s * 0.5);
      });
    } else {
      [-0.16, 0, 0.16].forEach((dx, i) => {
        const px = x + s * dx;
        const py = y + s * (0.24 + (i % 2) * 0.08);
        if (kind !== "snow") return drop(px, py, s * 0.05);
        c.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI;
          c.moveTo(px - Math.cos(a) * s * 0.05, py - Math.sin(a) * s * 0.05);
          c.lineTo(px + Math.cos(a) * s * 0.05, py + Math.sin(a) * s * 0.05);
        }
        c.stroke();
      });
    }
  }
  c.restore();
}

// The card: where and when, the weather right now (icon, temperature, what it's doing,
// humidity and wind), then the next few days. `weather` is null while it loads, or has
// `error` when it couldn't be fetched. Card stock with a fine grain, taped to the wall.
export function drawWeatherCard(c, w, h, { place, weather }) {
  c.clearRect(0, 0, w, h);
  const pad = w * 0.06;
  const ink = "#1a1714";
  const cardW = w - 30;
  const cardH = h - 30;
  brutalBox(c, 6, 6, cardW, cardH, "#fffdf5", { shadow: 16, line: 7 });
  c.save();
  c.beginPath();
  c.rect(10, 10, cardW - 8, cardH - 8);
  c.clip();
  // the stock: a faint grid and a scatter of fibres and flecks
  c.fillStyle = "rgba(47,124,246,.06)";
  for (let gx = 10; gx < cardW; gx += 36) c.fillRect(gx, 10, 2, cardH);
  for (let gy = 10; gy < cardH; gy += 36) c.fillRect(10, gy, cardW, 2);
  for (let i = 0; i < 700; i++) {
    const fx = 10 + ((i * 0.6180339) % 1) * cardW;
    const fy = 10 + ((i * 0.7548776 + 0.3) % 1) * cardH;
    c.fillStyle = i % 3 ? "rgba(26,23,20,.07)" : "rgba(160,120,60,.09)";
    c.fillRect(fx, fy, i % 5 ? 2 : 5, 2);
  }
  // header band: sky blue, a shaded lower edge, light diagonal stripes
  const bandH = h * 0.11;
  c.fillStyle = "#7fdfff";
  c.fillRect(9, 9, cardW - 6, bandH);
  c.fillStyle = "rgba(255,255,255,.28)";
  for (let sx = -bandH; sx < cardW; sx += 34) {
    c.beginPath();
    c.moveTo(sx, 9 + bandH);
    c.lineTo(sx + 12, 9 + bandH);
    c.lineTo(sx + 12 + bandH, 9);
    c.lineTo(sx + bandH, 9);
    c.closePath();
    c.fill();
  }
  c.fillStyle = "#4fc3ea";
  c.fillRect(9, 9 + bandH - 9, cardW - 6, 9);
  c.restore();
  c.fillStyle = ink;
  c.fillRect(9, 9 + bandH, cardW - 6, 6);
  // a map pin, then the place
  const pinX = pad + h * 0.018;
  const pinY = 9 + bandH / 2;
  const pr = h * 0.02;
  c.beginPath();
  c.arc(pinX, pinY - pr * 0.4, pr, Math.PI * 0.85, Math.PI * 0.15);
  c.lineTo(pinX, pinY + pr * 1.5);
  c.closePath();
  c.fillStyle = "#ff6b6b";
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = ink;
  c.lineJoin = "round";
  c.stroke();
  c.beginPath();
  c.arc(pinX, pinY - pr * 0.4, pr * 0.38, 0, Math.PI * 2);
  c.fillStyle = "#fffdf5";
  c.fill();
  c.stroke();
  c.textBaseline = "middle";
  c.fillStyle = ink;
  const title = `WEATHER · ${place.toUpperCase()}`;
  const titleX = pinX + pr * 1.8;
  let size = Math.round(h * 0.045);
  c.font = `900 ${size}px 'Lexend Mega', sans-serif`;
  while (c.measureText(title).width > cardW - titleX - pad * 0.4 && size > 12) c.font = `900 ${--size}px 'Lexend Mega', sans-serif`;
  c.fillText(title, titleX, pinY + 2);
  const right = cardW - pad;
  if (!weather || weather.error) {
    c.font = `600 ${Math.round(h * 0.04)}px 'Space Grotesk', sans-serif`;
    c.textAlign = "center";
    c.fillText(weather?.error ? "Couldn't reach the forecast right now." : "Checking the sky…", cardW / 2, h * 0.45);
    c.textAlign = "left";
    tape(c, w);
    return;
  }
  const { current, days, updated } = weather;
  const [label, kind] = weatherKind(current.code);
  const top = 9 + bandH + 6;
  // now: the icon on a round badge tinted by the sky it shows
  const badgeX = pad + w * 0.16;
  const badgeY = top + h * 0.17;
  const badgeR = w * 0.14;
  const tint = !current.isDay ? "#c9c5ff" : kind === "clear" || kind === "partly" ? "#fff1b8" : kind === "storm" ? "#d9dcef" : "#d6ecff";
  c.beginPath();
  c.arc(badgeX + 7, badgeY + 7, badgeR, 0, Math.PI * 2);
  c.fillStyle = ink;
  c.fill();
  c.beginPath();
  c.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
  c.fillStyle = tint;
  c.fill();
  c.lineWidth = 5;
  c.stroke();
  weatherIcon(c, badgeX, badgeY, w * 0.3, kind, !current.isDay);
  // the temperature in big type with a hard pink shadow
  const temp = `${Math.round(current.temp)}°`;
  c.font = `900 ${Math.round(h * 0.13)}px 'Lexend Mega', sans-serif`;
  c.fillStyle = "#ff90e8";
  c.fillText(temp, pad + w * 0.38 + 7, top + h * 0.13 + 7);
  c.fillStyle = ink;
  c.fillText(temp, pad + w * 0.38, top + h * 0.13);
  c.font = `700 ${Math.round(h * 0.042)}px 'Space Grotesk', sans-serif`;
  c.fillText(label, pad + w * 0.39, top + h * 0.235);
  c.font = `500 ${Math.round(h * 0.032)}px 'Space Grotesk', sans-serif`;
  c.fillStyle = "#4b4f57";
  c.fillText(`Now · updated ${updated}`, pad + w * 0.39, top + h * 0.285);
  // humidity and wind chips, each with a drawn icon
  const chipY = top + h * 0.34;
  const chipH = h * 0.06;
  [["humidity", `${current.humidity}%`, "#c4e6ff"], ["wind", `${Math.round(current.wind)} km/h`, "#d9f7d6"]].forEach(([icon, text, fill], i) => {
    c.font = `700 ${Math.round(h * 0.034)}px 'Space Grotesk', sans-serif`;
    const iconW = chipH * 0.7;
    const cw = c.measureText(text).width + iconW + pad * 1.2;
    const cx = pad + i * (w * 0.4);
    c.fillStyle = ink;
    c.fillRect(cx + 5, chipY + 5, cw, chipH);
    c.fillStyle = fill;
    c.fillRect(cx, chipY, cw, chipH);
    c.lineWidth = 4;
    c.strokeStyle = ink;
    c.strokeRect(cx, chipY, cw, chipH);
    const ix = cx + pad * 0.45 + iconW / 2;
    const iy = chipY + chipH / 2;
    c.lineWidth = 3.5;
    c.lineCap = "round";
    if (icon === "humidity") {
      const k = chipH * 0.22;
      c.beginPath();
      c.moveTo(ix, iy - k * 1.4);
      c.quadraticCurveTo(ix + k * 1.1, iy + k * 0.2, ix, iy + k);
      c.quadraticCurveTo(ix - k * 1.1, iy + k * 0.2, ix, iy - k * 1.4);
      c.fillStyle = "#2f7cf6";
      c.fill();
      c.stroke();
    } else {
      const k = chipH * 0.24;
      c.beginPath();
      c.moveTo(ix - k * 1.3, iy - k * 0.6);
      c.lineTo(ix + k * 0.6, iy - k * 0.6);
      c.arc(ix + k * 0.6, iy - k * 1.05, k * 0.45, Math.PI / 2, -Math.PI * 0.9, true);
      c.moveTo(ix - k * 1.3, iy + k * 0.35);
      c.lineTo(ix + k * 1, iy + k * 0.35);
      c.arc(ix + k * 1, iy + k * 0.85, k * 0.5, -Math.PI / 2, Math.PI * 0.9);
      c.stroke();
    }
    c.fillStyle = ink;
    c.fillText(text, cx + pad * 0.75 + iconW, chipY + h * 0.032);
  });
  // the next days, each on its own little card; today's picked out in yellow
  const rowY = top + h * 0.45;
  c.fillStyle = ink;
  c.fillRect(pad, rowY, right - pad, 4);
  const colW = (right - pad) / days.length;
  const dayTop = rowY + h * 0.022;
  const dayH = h * 0.29;
  days.forEach((d, i) => {
    const bx = pad + colW * i + 5;
    const bw = colW - 16;
    const cx = bx + bw / 2;
    brutalBox(c, bx, dayTop, bw, dayH, i === 0 ? "#fff1a6" : "#eef8ff", { shadow: 6, line: 4 });
    c.textAlign = "center";
    c.fillStyle = ink;
    c.font = `800 ${Math.round(h * 0.032)}px 'Space Grotesk', sans-serif`;
    c.fillText(d.label, cx, dayTop + h * 0.03);
    weatherIcon(c, cx, dayTop + h * 0.1, bw * 0.62, weatherKind(d.code)[1]);
    c.fillStyle = ink;
    c.font = `800 ${Math.round(h * 0.036)}px 'Space Grotesk', sans-serif`;
    c.fillText(`${Math.round(d.max)}°`, cx - bw * 0.16, dayTop + h * 0.18);
    c.fillStyle = "#6b7280";
    c.font = `600 ${Math.round(h * 0.028)}px 'Space Grotesk', sans-serif`;
    c.fillText(`${Math.round(d.min)}°`, cx + bw * 0.2, dayTop + h * 0.182);
    // chance of rain as a little gauge
    const rain = d.rain ?? 0;
    const gx = bx + bw * 0.14;
    const gw = bw * 0.72;
    const gy = dayTop + h * 0.212;
    const gh = h * 0.016;
    c.fillStyle = "#fffdf5";
    c.fillRect(gx, gy, gw, gh);
    c.fillStyle = "#5fb3ff";
    c.fillRect(gx, gy, (gw * rain) / 100, gh);
    c.lineWidth = 3;
    c.strokeStyle = ink;
    c.strokeRect(gx, gy, gw, gh);
    c.fillStyle = "#2f7cf6";
    c.font = `700 ${Math.round(h * 0.026)}px 'Space Grotesk', sans-serif`;
    c.fillText(`${rain}% rain`, cx, dayTop + h * 0.258);
  });
  c.textAlign = "left";
  // attribution, as the forecast's licence asks
  c.fillStyle = "#6b7280";
  c.font = `500 ${Math.round(h * 0.024)}px 'Space Grotesk', sans-serif`;
  c.textAlign = "right";
  c.fillText("Weather data by Open-Meteo.com", right, h - 30 - pad * 0.6);
  c.textAlign = "left";
  tape(c, w);
}
// Two strips of yellow tape holding the card's top corners to the wall
function tape(c, w) {
  [[w * 0.1, 16, -0.45], [w * 0.86, 16, 0.4]].forEach(([x, y, a]) => {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    const tw = 120;
    const th = 34;
    c.beginPath();
    c.moveTo(-tw / 2, -th / 2);
    for (let k = 0; k <= 4; k++) c.lineTo(-tw / 2 + (k % 2 ? 5 : 0), -th / 2 + (k * th) / 4);
    for (let k = 0; k <= 4; k++) c.lineTo(tw / 2 - (k % 2 ? 5 : 0), th / 2 - (k * th) / 4);
    c.closePath();
    c.fillStyle = "rgba(255,221,0,.78)";
    c.fill();
    c.fillStyle = "rgba(255,255,255,.35)";
    c.fillRect(-tw / 2 + 8, -th / 2 + 5, tw - 16, 5);
    c.lineWidth = 2;
    c.strokeStyle = "rgba(26,23,20,.35)";
    c.stroke();
    c.restore();
  });
}

