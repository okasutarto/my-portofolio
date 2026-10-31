import { mixHex } from "./windowView";

// ---------- weather shown on the window's glass ----------
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
// The forecast shown on the window's glass, as if the pane were a screen: the whole pane tints
// dark like a switched-on display, the sky outside only just showing through, with light type
// and icons on it. The canvas is the top-left pane's shape, edge to edge.
export function drawWindowWeather(c, w, h, { place, weather }) {
  c.clearRect(0, 0, w, h);
  const pad = w * 0.07;
  const glow = "#ffffff";
  const dim = "rgba(225,235,255,.85)";
  // the display's tint: deep blue glass, a touch lighter at the top, darker at the corners
  const tint = c.createLinearGradient(0, 0, 0, h);
  tint.addColorStop(0, "rgba(22,34,64,.86)");
  tint.addColorStop(1, "rgba(8,14,30,.9)");
  c.fillStyle = tint;
  c.fillRect(0, 0, w, h);
  const edge = c.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.8);
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(0,0,0,.35)");
  c.fillStyle = edge;
  c.fillRect(0, 0, w, h);
  c.save();
  c.shadowColor = "rgba(5,10,25,.55)";
  c.shadowBlur = w * 0.012;
  c.shadowOffsetY = w * 0.004;
  c.textBaseline = "middle";
  c.textAlign = "left";
  const text = (str, x, y, size, weight = 700, color = glow, font = "'Space Grotesk', sans-serif") => {
    c.font = `${weight} ${Math.round(size)}px ${font}`;
    c.fillStyle = color;
    c.fillText(str, x, y);
  };
  // the place, small and spaced, with a dot for the pin
  c.beginPath();
  c.arc(pad + h * 0.012, pad + h * 0.01, h * 0.012, 0, Math.PI * 2);
  c.fillStyle = "#ff90e8";
  c.fill();
  let size = h * 0.04;
  const title = place.toUpperCase();
  c.font = `800 ${Math.round(size)}px 'Space Grotesk', sans-serif`;
  while (c.measureText(title).width > w - pad * 3 && size > 12) c.font = `800 ${Math.round(--size)}px 'Space Grotesk', sans-serif`;
  text(title, pad + h * 0.04, pad + h * 0.012, size, 800, dim);
  if (!weather || weather.error) {
    text(weather?.error ? "Forecast unavailable" : "Checking the sky…", pad, h * 0.22, h * 0.05, 600);
    c.restore();
    return;
  }
  const { current, days, updated } = weather;
  const [label, kind] = weatherKind(current.code);
  // now: the temperature large, its icon beside it
  text(`${Math.round(current.temp)}°`, pad - w * 0.01, h * 0.25, h * 0.2, 900, glow, "'Lexend Mega', sans-serif");
  c.restore();
  weatherIcon(c, w * 0.78, h * 0.24, w * 0.3, kind, !current.isDay);
  c.save();
  c.shadowColor = "rgba(5,10,25,.55)";
  c.shadowBlur = w * 0.012;
  c.shadowOffsetY = w * 0.004;
  c.textBaseline = "middle";
  text(label, pad, h * 0.41, h * 0.055, 700);
  text(`${current.humidity}% humidity · ${Math.round(current.wind)} km/h wind`, pad, h * 0.475, h * 0.036, 600, dim);
  // a hairline, then the next days in columns
  c.fillStyle = "rgba(255,255,255,.4)";
  c.fillRect(pad, h * 0.54, w - pad * 2, Math.max(2, h * 0.003));
  const colW = (w - pad * 2) / days.length;
  days.forEach((d, i) => {
    const cx = pad + colW * (i + 0.5);
    c.textAlign = "center";
    text(i === 0 ? "TODAY" : d.label.toUpperCase(), cx, h * 0.6, h * 0.032, 800, i === 0 ? "#ffe26b" : dim);
    c.restore();
    weatherIcon(c, cx, h * 0.7, colW * 0.62, weatherKind(d.code)[1]);
    c.save();
    c.shadowColor = "rgba(5,10,25,.55)";
    c.shadowBlur = w * 0.012;
    c.shadowOffsetY = w * 0.004;
    c.textBaseline = "middle";
    c.textAlign = "center";
    text(`${Math.round(d.max)}° ${Math.round(d.min)}°`, cx, h * 0.81, h * 0.036, 700);
    text(`${d.rain ?? 0}% rain`, cx, h * 0.86, h * 0.028, 600, "#9fd3ff");
  });
  // updated time and the attribution the forecast's licence asks for
  c.textAlign = "left";
  text(`Updated ${updated}`, pad, h - pad * 0.7, h * 0.024, 500, dim);
  c.textAlign = "right";
  text("Weather data by Open-Meteo.com", w - pad, h - pad * 0.7, h * 0.024, 500, dim);
  c.restore();
}

