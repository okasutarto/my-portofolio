import * as THREE from "three";
import gsap from "gsap";
import { loadPortrait, windowSky, drawWoodTop } from "../textures";
import { WOODS, WOOD_PATTERNS, DEFAULT_WOODS } from "../woods";
import { PALETTES } from "../sceneConfig";

export function createTheme(runtime) {
  // ---------- textures (redrawn once the web fonts are in, and every minute for the clocks) ----------
  function drawAll() {
    runtime.core.redrawers.forEach((redraw) => redraw());
    runtime.workstation.redrawTerminal();
  }
  drawAll();
  Promise.all([
    document.fonts.load("800 40px 'Lexend Mega'"),
    document.fonts.load("700 20px 'Space Grotesk'"),
    document.fonts.load("500 20px 'Space Grotesk'"),
    document.fonts.load("600 30px 'Caveat'"),
  ])
    .then(() => !runtime.core.destroyed && drawAll())
    .catch(() => {});
  // The real photo for the badge (initials stand in until it arrives).
  loadPortrait(`${process.env.BASE_URL}images/oka-portrait.png`)
    .then(() => !runtime.core.destroyed && drawAll())
    .catch(() => {});
  const clockTimer = setInterval(() => {
    runtime.badge.badgeFront.userData.tex.redraw();
    runtime.wallDecor.updateRoomClock();
  }, 60000);

  // ---------- theme ----------
  let darkNow = runtime.options.dark;
  // The walls' paint is the visitor's pick (graphite by default); by night it is tinted by the
  // moonlight the white walls used to be given directly
  const wallPaintColor = new THREE.Color(runtime.options.wallColor);
  const MOONLIT_WALLS = [[runtime.room.backWallMat, new THREE.Color("#d6d3e6")], [runtime.room.sideWallMat, new THREE.Color("#c9c5dc")]];
  function paintWalls(isDark) {
    MOONLIT_WALLS.forEach(([mat, moon]) => {
      mat.color.copy(wallPaintColor);
      if (isDark) mat.color.multiply(moon);
    });
  }
  // The desk, its riser, the window frame and the game shelf can each be any of the woods, in
  // any cut. Each material keeps its tone relative to oak's tint (the shelf's back still reads
  // deeper than its sides), and only the desk and its riser are dimmed for the night shift, as
  // they always were.
  const lightDesk = new THREE.Color(PALETTES.light.desk);
  const darkDesk = new THREE.Color(PALETTES.dark.desk);
  const NIGHT_WOOD = new THREE.Color(darkDesk.r / lightDesk.r, darkDesk.g / lightDesk.g, darkDesk.b / lightDesk.b);
  const oakTint = new THREE.Color(WOODS.oak.tint);
  const woodMat = (mat, base, shade = 1) => {
    const rel = new THREE.Color(base);
    rel.setRGB((rel.r / oakTint.r) * shade, (rel.g / oakTint.g) * shade, (rel.b / oakTint.b) * shade);
    return { mat, rel };
  };
  const woodParts = {
    desk: { grain: runtime.room.deskWood, mats: [woodMat(runtime.room.deskMat, PALETTES.light.desk)], nightly: true },
    riser: {
      grain: runtime.workstation.riserGrain,
      mats: [woodMat(runtime.workstation.riserMat, PALETTES.light.desk), woodMat(runtime.workstation.riserLegMat, PALETTES.light.desk, runtime.workstation.RISER_LEG_SHADE)],
      nightly: true,
    },
    window: { grain: runtime.room.frameGrainTex, mats: [woodMat(runtime.room.frameWood, "#f0c7a0")] },
    shelf: {
      grain: runtime.shelf.shelfWood,
      mats: [woodMat(runtime.shelf.shelfMat, "#f3d3b0"), woodMat(runtime.shelf.shelfBackMat, "#d9a878"), woodMat(runtime.shelf.lipMat, "#e2b384")],
    },
  };
  const pickWood = (part, choice = {}) => ({
    wood: WOODS[choice.wood] ? choice.wood : DEFAULT_WOODS[part].wood,
    pattern: WOOD_PATTERNS[choice.pattern] ? choice.pattern : DEFAULT_WOODS[part].pattern,
  });
  const woodChoice = Object.fromEntries(Object.keys(woodParts).map((part) => [part, pickWood(part, runtime.options.woods[part])]));
  function toneWood(part, isDark) {
    const { mats, nightly } = woodParts[part];
    const tint = new THREE.Color(WOODS[woodChoice[part].wood].tint);
    mats.forEach(({ mat, rel }) => {
      mat.color.copy(rel).multiply(tint);
      if (nightly && isDark) mat.color.multiply(NIGHT_WOOD);
    });
  }
  function setTheme(isDark) {
    darkNow = isDark;
    runtime.core.roomLight.night = isDark ? 1 : 0;
    runtime.room.deskNeons.forEach(({ strip, washMat }) => {
      strip.visible = isDark;
      washMat.opacity = isDark ? runtime.room.DESK_WASH : 0;
    });
    runtime.workstation.monitorGlowMat.opacity = isDark ? 0.7 : 0;
    runtime.core.ambient.intensity = isDark ? 0.16 : 0.38;
    runtime.core.ambient.color.set(isDark ? "#aab9df" : "#ffffff");
    runtime.core.skyFill.color.set(isDark ? "#94acdb" : "#f2f5ff");
    runtime.core.skyFill.intensity = isDark ? 0.12 : 0.9;
    runtime.core.readabilityFill.intensity = isDark ? 0.12 : 0.18;
    runtime.lamp.jointMat.color.set(isDark ? "#3d3749" : "#1a1714");
    runtime.core.sun.color.set(isDark ? "#aabfff" : "#fff1cc");
    // Broad room bounce retains faint cast shadows for every prop, including wall-mounted
    // objects outside the direct window patch. The directional key remains the window light.
    runtime.core.sun.intensity = isDark ? 0.24 : 0.55;
    runtime.core.sun.castShadow = true;
    runtime.windowLighting.windowLight.color.set(isDark ? "#94b5ff" : "#ffe5ad");
    // Sun or moon, it comes in through the glass, shadowed by the wall, the bars and the blind
    runtime.windowLighting.windowLight.intensity = isDark ? 0.18 : 2.2;
    runtime.windowLighting.windowLight.castShadow = true;
    if (isDark) runtime.windowLighting.aimWindowLight(windowSky("night").sun);
    // The neons' cube shadows only by night: by day the strips are off and the screen's glow
    // is faint, yet every pixel would still sample their six-sided maps
    runtime.room.shadowedNeons.forEach((light) => (light.castShadow = isDark));
    runtime.windowBlind.blindFabric.emissiveIntensity = isDark ? 0.03 : 0.2;
    runtime.room.floorMat.color.set(isDark ? "#8a82a6" : "#ffffff");
    // Night keeps the visitor's paint, just moonlit, so the room still reads as the same room
    paintWalls(isDark);
    runtime.core.scene.background = new THREE.Color(runtime.room.roomBackground(isDark));
    runtime.room.trimMat.color.set(isDark ? "#b8b1da" : "#ffffff");
    if (runtime.room.diorama) runtime.room.drawBackdrop();
    runtime.room.windowView.userData.tex.redraw();
    runtime.lamp.familyPhoto.userData.tex.redraw();
    if (typeof runtime.workstation.lightbarState !== "undefined" && isDark) {
      runtime.workstation.lightbarOn = true;
      runtime.workstation.lightbarState.power = 1;
    }
    runtime.lamp.setLamp(isDark);
    runtime.workstation.updateLightbar();
    const p = isDark ? PALETTES.dark : PALETTES.light;
    toneWood("desk", isDark);
    toneWood("riser", isDark);
    runtime.core.shadowFill.color.set(p.shadow);
    if (!isDark) applyDaylight();
    // The backboard's print glows to stay readable by day; by dusk and night that glow would
    // make it the brightest thing in the room, so it settles into the room's own light
    const part = isDark ? "night" : runtime.room.daylightPart;
    runtime.wastebasket.hoopBoardFace.material.emissiveIntensity = HOOP_GLOW[part];
    runtime.wastebasket.net.material.color.setScalar(HOOP_NET[part]);
    runtime.core.fitSunShadow();
  }
  const HOOP_GLOW = { morning: 0.6, day: 0.6, evening: 0.22, night: 0.08 };
  const HOOP_NET = { morning: 1, day: 1, evening: 0.62, night: 0.4 };
  // Match the randomly selected sky: warm morning, bright midday or amber evening.
  const DAYLIGHT = {
    // Warm key, cool fill: the sky's blue lifts what the sun can't reach, so shadows read as
    // cool shade rather than a grey film, at no extra cost (only colours and a little more key)
    // The wall keeps the sun's direct light to the window's patch (`pane`), so the room's sun
    // is the softer daylight about the room, without adding a second set of direct shadows
    morning: { sun: "#ffe2b6", sunPower: 1.1, sky: "#fff5e7", skyPower: 1.55, ambient: 0.62, fill: "#fff4e8", pane: "#ffdfa8", panePower: 3.0 },
    day: { sun: "#fff1cc", sunPower: 1.3, sky: "#f2f5ff", skyPower: 1.85, ambient: 0.78, fill: "#eef1ff", pane: "#ffe5ad", panePower: 4.1 },
    // the view's sun rises on the front side of the window and sets on the back side, so the
    // room's evening sun comes in from behind
    evening: { sun: "#ff9e66", sunPower: 1.0, sky: "#b7aed7", skyPower: 0.38, ambient: 0.16, fill: "#c3b9de", pane: "#ffab72", panePower: 1.8 },
  };
  function applyDaylight() {
    const light = DAYLIGHT[runtime.room.daylightPart];
    runtime.core.sun.color.set(light.sun);
    runtime.core.sun.intensity = light.sunPower * (runtime.room.daylightPart === "evening" ? 0.3 : 0.5);
    runtime.core.skyFill.color.set(light.sky);
    runtime.core.skyFill.intensity = light.skyPower;
    runtime.core.ambient.intensity = light.ambient;
    runtime.core.ambient.color.set(light.fill);
    runtime.core.readabilityFill.intensity = runtime.room.daylightPart === "evening" ? 0.18 : 0.32;
    runtime.windowLighting.windowLight.color.set(light.pane);
    runtime.windowLighting.windowLight.intensity = light.panePower;
    runtime.windowLighting.aimWindowLight(windowSky(runtime.room.daylightPart).sun);
  }
  // Capture existing theme targets, then blend them in the frame loop. No extra tween owns
  // these values, so a second theme change can start from exactly what is currently visible.
  const lightingValues = [
    [runtime.core.ambient, "intensity"], [runtime.core.skyFill, "intensity"], [runtime.core.readabilityFill, "intensity"],
    [runtime.core.sun, "intensity"], [runtime.windowLighting.windowLight, "intensity"], [runtime.lamp.lampLight, "intensity"],
    [runtime.core.roomLight, "night"], [runtime.workstation.monitorGlowMat, "opacity"], [runtime.windowBlind.blindFabric, "emissiveIntensity"],
    [runtime.wastebasket.hoopBoardFace.material, "emissiveIntensity"],
    ...runtime.room.deskNeons.map(({ washMat }) => [washMat, "opacity"]),
  ];
  const lightingColors = [runtime.core.ambient.color, runtime.core.skyFill.color, runtime.core.sun.color, runtime.windowLighting.windowLight.color,
    runtime.lamp.jointMat.color, runtime.room.floorMat.color, runtime.room.backWallMat.color, runtime.room.sideWallMat.color, runtime.room.trimMat.color,
    runtime.room.deskMat.color, runtime.workstation.riserMat.color, runtime.workstation.riserLegMat.color, runtime.core.shadowFill.color,
    runtime.wastebasket.net.material.color];
  // Keep a stable background Color so it can be interpolated like the wall paint.
  setTheme(runtime.options.dark);
  lightingColors.push(runtime.core.scene.background);
  const captureLighting = () => ({
    values: lightingValues.map(([object, key]) => object[key]),
    colors: lightingColors.map((color) => color.clone()),
  });
  let lightingTarget = captureLighting();
  let lightingFrom = lightingTarget;
  let lightingStarted = -Infinity;
  const LIGHTING_TRANSITION = 2000;
  const rainLightColor = new THREE.Color("#aab8cf");
  const dryWindowColor = runtime.windowLighting.windowLight.color.clone();
  let lightingBlending = false;
  function updateLighting(now) {
    const progress = Math.min(1, Math.max(0, (now - lightingStarted) / LIGHTING_TRANSITION));
    const blend = progress * progress * (3 - 2 * progress);
    runtime.room.outside.skyBlend = blend;
    lightingValues.forEach(([object, key], i) => {
      // Once settled, preserve the lamp's own click/flicker animation.
      if (object === runtime.lamp.lampLight && !lightingBlending) return;
      object[key] = THREE.MathUtils.lerp(lightingFrom.values[i], lightingTarget.values[i], blend);
    });
    lightingColors.forEach((color, i) => color.copy(lightingFrom.colors[i]).lerp(lightingTarget.colors[i], blend));
    // Clouds remove the direct beam much more than diffuse sky/bounce light.
    runtime.windowLighting.windowLight.intensity *= 1 - 0.88 * runtime.room.outside.rain;
    runtime.core.sun.intensity *= 1 - 0.6 * runtime.room.outside.rain;
    runtime.core.skyFill.intensity *= 1 - 0.38 * runtime.room.outside.rain;
    runtime.core.ambient.intensity *= 1 - 0.25 * runtime.room.outside.rain;
    // Overcast light loses its sharp window outline; indoor lamp/neon shadows stay intact.
    runtime.windowLighting.windowLight.shadow.radius = THREE.MathUtils.lerp(3, 5, runtime.core.roomLight.night) + runtime.room.outside.rain * 9;
    if (Math.abs(runtime.windowLighting.cookieRain - runtime.room.outside.rain) > 0.02) runtime.windowLighting.drawGlassCookie();
    dryWindowColor.copy(runtime.windowLighting.windowLight.color);
    runtime.windowLighting.windowLight.color.lerp(rainLightColor, runtime.room.outside.rain * 0.65);
    runtime.room.outside.sky = windowSky(runtime.room.dayPart(), runtime.room.outside.skyFrom, blend);
    if (lightingBlending) {
      runtime.windowLighting.aimWindowLight(runtime.room.outside.sky.sun);
      runtime.lamp.lampLight.castShadow = true;
      if (progress === 1) {
        lightingBlending = false;
        runtime.lamp.lampLight.castShadow = darkNow;
      }
    }
    if (!lightingBlending) {
      runtime.room.deskNeons.forEach(({ strip }) => (strip.visible = darkNow));
      runtime.room.shadowedNeons.forEach((light) => (light.castShadow = darkNow));
    }
    runtime.lamp.updateLampGlow();
    runtime.workstation.updateLightbar();
  }
  let nextDaylightAt = performance.now() + 20000 + Math.random() * 10000;
  function updateDaylight(now) {
    // A local phase preview stays put; the normal page keeps the accelerated cycle.
    if (runtime.room.daylightParts.includes(runtime.core.previewTime) || now < nextDaylightAt) return;
    runtime.room.daylightPart = runtime.room.daylightParts[(runtime.room.daylightParts.indexOf(runtime.room.daylightPart) + 1) % runtime.room.daylightParts.length];
    const wasDark = darkNow;
    setRoomTheme(runtime.room.daylightPart === "night");
    if (wasDark !== darkNow) runtime.options.onEvent("nightShift", { dark: darkNow });
    nextDaylightAt = now + 20000 + Math.random() * 10000;
  }
  // A new paint goes straight on: both ends of any running blend take it, so the frame loop
  // doesn't lerp it back
  function setWallColor(hex) {
    wallPaintColor.set(hex);
    paintWalls(darkNow);
    MOONLIT_WALLS.forEach(([mat]) => {
      const at = lightingColors.indexOf(mat.color);
      [lightingFrom, lightingTarget].forEach((state) => state.colors[at].copy(mat.color));
    });
  }
  // A new wood is drawn into the part's grain and toned at once; like the paint, both ends of a
  // running blend take it
  function setWood(part, choice) {
    if (!woodParts[part]) return;
    woodChoice[part] = pickWood(part, { ...woodChoice[part], ...choice });
    paintWood(part, true);
  }
  function paintWood(part, redraw) {
    const target = woodParts[part];
    if (redraw) {
      const { canvas, ctx } = target.grain;
      drawWoodTop(ctx, canvas.width, canvas.height, woodChoice[part]);
      target.grain.texture.needsUpdate = true;
    }
    toneWood(part, darkNow);
    target.mats.forEach(({ mat }) => {
      const at = lightingColors.indexOf(mat.color);
      if (at >= 0) [lightingFrom, lightingTarget].forEach((state) => state.colors[at].copy(mat.color));
    });
  }
  // Each grain was first drawn in its part's default wood, so only a visitor's own pick is drawn
  // again; every part is toned to its wood either way
  Object.keys(woodParts).forEach((part) => {
    const { wood, pattern } = woodChoice[part];
    paintWood(part, wood !== DEFAULT_WOODS[part].wood || pattern !== DEFAULT_WOODS[part].pattern);
  });
  // The monitor's desktop follows the room
  const setRoomTheme = (isDark) => {
    if (isDark) runtime.room.daylightPart = "night";
    else if (runtime.room.daylightPart === "night") runtime.room.daylightPart = "morning";
    // Remove rain attenuation from the captured intensities; updateLighting applies it once.
    const rainScales = [1 - 0.25 * runtime.room.outside.rain, 1 - 0.38 * runtime.room.outside.rain, 1, 1 - 0.6 * runtime.room.outside.rain, 1 - 0.88 * runtime.room.outside.rain];
    const from = captureLighting();
    from.colors[lightingColors.indexOf(runtime.windowLighting.windowLight.color)].copy(dryWindowColor);
    rainScales.forEach((scale, i) => (from.values[i] /= scale));
    runtime.room.outside.skyFrom = runtime.room.outside.sky;
    const background = runtime.core.scene.background;
    const neonShadows = isDark || runtime.room.shadowedNeons.some((light) => light.castShadow);
    setTheme(isDark);
    runtime.room.shadowedNeons.forEach((light) => (light.castShadow = neonShadows));
    background.copy(runtime.core.scene.background);
    runtime.core.scene.background = background;
    lightingTarget = captureLighting();
    lightingFrom = from;
    lightingStarted = performance.now();
    lightingBlending = true;
    gsap.killTweensOf(runtime.lamp.lampLight);
    runtime.room.deskNeons.forEach(({ strip }) => (strip.visible = true));
    lightingValues.forEach(([object, key], i) => (object[key] = from.values[i]));
    lightingColors.forEach((color, i) => color.copy(from.colors[i]));
    runtime.room.outside.skyBlend = 0;
    runtime.room.outside.night = isDark;
    runtime.room.windowView.userData.tex.redraw();
    runtime.shelf.setNeon(isDark);
    runtime.cat.catSettle();
    runtime.workstation.desktop.setTheme(isDark);
    runtime.workstation.redrawScreen();
  };
  runtime.workstation.desktop.setTheme(runtime.options.dark);

  // Public state used by the other scene parts.
  return {
    get darkNow() { return darkNow; },
    lightingColors,
    get lightingFrom() { return lightingFrom; },
    get lightingTarget() { return lightingTarget; },
    DAYLIGHT,
    get lightingBlending() { return lightingBlending; },
    updateDaylight,
    updateLighting,
    setRoomTheme,
    setWallColor,
    setWood,
    clockTimer,
  };
}
