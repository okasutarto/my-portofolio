import * as THREE from "three";
import { canvasTexture, drawGameSpine, drawGameCover, drawBookSpine, drawPageEdges, drawMushroomCap, drawMushroomFace, drawMushroomGills } from "../textures";

export function createShelfBooks(runtime) {
  // A hardback, spine to the room: covers either side, cream pages showing between them at the
  // top, and the spine printed flat (black bands, a boxed title label, a sticker)
  // Pages show their fine paper lines
  const pageTex = canvasTexture(64, 64);
  runtime.core.track(pageTex.texture);
  drawPageEdges(pageTex.ctx, 64, 64);
  pageTex.texture.wrapS = pageTex.texture.wrapT = THREE.RepeatWrapping;
  pageTex.texture.repeat.set(3, 3);
  const pagesMat = runtime.core.toon("#ffffff");
  pagesMat.map = pageTex.texture;
  function bookMesh(w, h, color, i = 0, depth = 1.0, drawSpine = (c, cw, ch) => drawBookSpine(c, cw, ch, { color, i })) {
    const cover = runtime.core.toon(color);
    const book = runtime.shelf.group(
      runtime.core.at(runtime.core.mesh(runtime.core.rbox(w - 0.05, h - 0.05, depth - 0.06, 0.02), pagesMat, { outline: 0.02 }), 0, 0, -0.02),
      runtime.core.at(runtime.core.mesh(runtime.core.rbox(w, h, 0.06, 0.02), cover, { outline: 0.025 }), 0, 0, depth / 2 - 0.03),
      runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.035, h, depth, 0.012), cover, { outline: 0.02 }), -w / 2 + 0.0175, 0, 0),
      runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.035, h, depth, 0.012), cover, { outline: 0.02 }), w / 2 - 0.0175, 0, 0),
    );
    const spine = runtime.core.printed(w - 0.01, h - 0.01, 420, drawSpine);
    spine.position.z = depth / 2 + 0.002;
    book.add(spine);
    return book;
  }
  // Level 1, kept loose: a chunky yellow bookend, a row of books of all heights not quite
  // upright, one leaning on them, and a short stack lying flat with the mushroom on top
  const bookend = runtime.shelf.group(
    runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.08, 1.0, 0.78, 0.02), runtime.core.toon("#ffdd00"), { outline: 0.025 }), 0, 0.5, 0),
    runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.09, 0.14, 0.8, 0.02), runtime.core.toon("#1a1714"), { outline: 0.02 }), 0, 0.07, 0),
  );
  runtime.shelf.addItem(runtime.core.at(bookend, -1.83, runtime.shelf.standOn(1), 0.1, -0.03), "book");
  let x = -1.76;
  [
    [0.3, 1.55, 0.015], [0.22, 1.3, -0.012], [0.36, 1.72, 0], [0.2, 1.18, 0.02], [0.28, 1.62, -0.01],
  ].forEach(([w, h, tilt], i) => {
    runtime.shelf.addItem(runtime.core.at(bookMesh(w, h, runtime.shelfConsole.PALETTE[i % runtime.shelfConsole.PALETTE.length], i), x + w / 2, runtime.shelf.standOn(1) + h / 2, 0.1 + (i % 2) * 0.04, tilt), "book");
    x += w + 0.025;
  });
  runtime.shelf.addItem(runtime.core.at(bookMesh(0.26, 1.4, "#00e0c6", 6), x + 0.42, runtime.shelf.standOn(1) + 0.71, 0.1, -0.32), "book");
  // lying flat, spines out and readable, each a little off the one under it
  const STACK_X = 1.12;
  [[0.17, 0.98, "#3b82f6", 8, 0.03], [0.15, 0.9, "#ff6b6b", 10, -0.05], [0.18, 0.94, "#ffb35c", 11, 0.06]].reduce((y, [thick, len, color, title, turn]) => {
    const lying = runtime.shelf.addItem(runtime.core.at(bookMesh(thick, len, color, title, 0.85), STACK_X + turn * 0.6, runtime.shelf.standOn(1) + y + thick / 2, 0.15, -Math.PI / 2), "book");
    lying.rotation.y = turn;
    return y + thick;
  }, 0);
  const STACK_TOP = 0.17 + 0.15 + 0.18;
  // The figure: a spotted red cap (inked spots, a pale lip), gills under it, and a cream stem
  // with a face, all printed (drawMushroomCap / Face / Gills) on its simple shapes
  const mushroomPrint = (draw, w, h) => {
    const tex = canvasTexture(w, h);
    runtime.core.track(tex.texture);
    draw(tex.ctx, w, h);
    const mat = runtime.core.toon("#ffffff");
    mat.map = tex.texture;
    return mat;
  };
  const capMat = mushroomPrint(drawMushroomCap, 512, 256);
  const faceMat = mushroomPrint(drawMushroomFace, 256, 128);
  const gillMat = mushroomPrint(drawMushroomGills, 128, 128);
  // a stem that swells a little in the middle, like a toy's
  const stemGeo = new THREE.LatheGeometry([[0, 0], [0.2, 0], [0.21, 0.12], [0.19, 0.3], [0.16, 0.44], [0, 0.44]].map(([x, y]) => new THREE.Vector2(x, y)), 20);
  const capGeo = new THREE.SphereGeometry(0.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  capGeo.scale(1, 0.85, 1);
  const gills = runtime.core.mesh(new THREE.CircleGeometry(0.39, 32), gillMat, { outline: 0, cast: false });
  gills.rotation.x = Math.PI / 2;
  const mushroom = runtime.shelf.group(
    runtime.core.at(runtime.core.mesh(stemGeo, faceMat, { outline: 0.025 }), 0, 0, 0),
    runtime.core.at(runtime.core.mesh(capGeo, capMat, { outline: 0.03 }), 0, 0.38, 0),
    runtime.core.at(gills, 0, 0.379, 0),
  );
  runtime.shelf.addItem(runtime.core.at(mushroom, STACK_X, runtime.shelf.standOn(1) + STACK_TOP, 0.15), "figure");

  // Level 2: a row of game cases, spines out, one standing face-out beside them, and a little robot.
  // Grouped by console, at their real sizes (the shelf's 2× scale makes one unit 20 cm): PS5
  // cases are Blu-ray boxes, 135 × 170 × 14 mm, in blue; Switch cases are slimmer and shallower,
  // 105 × 170 × 11 mm, in red. Fronts line up at the shelf's edge whatever their depth.
  const PS5_BLUE = "#1d64d8";
  const SWITCH_RED = "#e11d48";
  const CASES = {
    ps5: { platform: PS5_BLUE, t: 0.07, d: 0.675 },
    switch: { platform: SWITCH_RED, t: 0.055, d: 0.525 },
  };
  const CASE_H = 0.85;
  const CASE_FRONT = 0.2 + 0.675 / 2;
  const PS5_GAMES = [
    ["PIXEL KART", "#ffdd00"], ["SKY QUEST", "#7fdfff"], ["NEON RUN", "#ff90e8"], ["TINY KNIGHT", "#fffdf5"],
    ["MOON DASH", "#c4b5fd"], ["SLIME LAND", "#8fd694"], ["RACE 99", "#ffb35c"], ["ROBO BRAWL", "#00e0c6"],
    ["DUNGEON 64", "#ff6b6b"], ["STAR FORGE", "#ffe26b"], ["CAT CAFE", "#ffc8a8"], ["BLOCK CITY", "#a3e635"],
    ["SPACE BOLT", "#7fb2ff"], ["TURBO 2", "#ffb35c"], ["GHOST INN", "#e9d5ff"],
  ];
  const SWITCH_GAMES = [["NINJA DUO", "#ff90e8"], ["FARM DAYS", "#bef264"], ["ROCKET LIG", "#fde047"], ["HEX RPG", "#5eead4"], ["PUZZLE POP", "#fda4af"]];
  // (the spines are printed finely enough that the small PS5 mark stays legible)
  const gameCase = ([title, art], i, system, at) => {
    const { platform, t, d } = CASES[system];
    const caseMesh = runtime.core.mesh(runtime.core.rbox(t, CASE_H, d, 0.02), runtime.core.toon(platform), { outline: 0.022 });
    const spine = runtime.core.printed(t - 0.005, CASE_H - 0.04, 1000, (c, w, h) => drawGameSpine(c, w, h, { platform, art, title, i, system }));
    spine.position.z = d / 2 + 0.0025;
    runtime.shelf.addItem(runtime.core.at(runtime.shelf.group(caseMesh, spine), at + t / 2, runtime.shelf.standOn(2) + CASE_H / 2, CASE_FRONT - d / 2), "case");
    return at + t + 0.02;
  };
  // the PS5 run fills the left of the bay; past the face-out case, the last of them, then the
  // Switch games, up to the robot
  let at = -1.8;
  PS5_GAMES.slice(0, 12).forEach((game, i) => (at = gameCase(game, i, "ps5", at)));
  at = 0.06;
  PS5_GAMES.slice(12).forEach((game, i) => (at = gameCase(game, 12 + i, "ps5", at)));
  at += 0.04;
  SWITCH_GAMES.forEach((game, i) => (at = gameCase(game, i, "switch", at)));
  const cover = runtime.core.printed(0.63, 0.81, 600, (c, w, h) => drawGameCover(c, w, h, { platform: PS5_BLUE }));
  cover.position.z = 0.076;
  // On a little black display stand, so its foot sits well clear of the shelf's front edge
  const caseStand = runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.56, 0.12, 0.34, 0.03), runtime.shelfConsole.black, { outline: 0.02 }), 0, -0.485, -0.04);
  const faceOut = runtime.shelf.group(runtime.core.mesh(runtime.core.rbox(0.67, 0.85, 0.14, 0.03), runtime.core.toon(PS5_BLUE), { outline: 0.025 }), cover, caseStand);
  runtime.shelf.addItem(runtime.core.at(faceOut, -0.35, runtime.shelf.standOn(2) + 0.545, 0.15), "case").rotation.set(-0.06, 0.12, 0);

  // Public state used by the other scene parts.
  return {
    bookMesh,
  };
}
