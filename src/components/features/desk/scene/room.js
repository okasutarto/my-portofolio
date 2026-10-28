import * as THREE from "three";
import { canvasTexture, drawWindowView, windowSky, drawWallPaint, drawWoodTop, drawWoodFloor } from "../textures";
import { DEFAULT_WOODS } from "../woods";
import { PALETTES } from "../sceneConfig";

export function createRoom(runtime) {
  // ---------- the desk ----------
  const FLOOR_Y = -5.2;
  // The back wall stands right behind the desk, a cable's width from its back edge. What hangs
  // on it is lifted by as much as the move brings it down on screen, so the overview keeps its
  // composition.
  const WALL_Z = -4.58; // the middle of the wall slab; its face is at WALL_Z + 0.12
  const WALL_LIFT = 1.2;
  // The left wall stands just as close to the desk's left end
  const SIDE_X = -7.38; // the middle of the side wall slab; its face is at SIDE_X + 0.12
  // A wood-grain top; the material's colour tints it for the night shift
  const deskMat = runtime.core.toon(PALETTES.light.desk);
  const deskWood = canvasTexture(1400, 840);
  runtime.core.track(deskWood.texture);
  drawWoodTop(deskWood.ctx, 1400, 840, DEFAULT_WOODS.desk);
  deskMat.map = deskWood.texture;
  const desk = runtime.core.mesh(runtime.core.rbox(14, 0.7, 8.4, 0.14), deskMat, { outline: 0.06 });
  desk.position.y = -0.35;
  runtime.core.scene.add(desk);
  // A sit-stand frame in matte black: two telescoping columns (three stages, widest at the
  // floor) on flat T-feet, a crossbar between them and a rail under the top at each end, with
  // the memory keypad tucked under the front edge on the right
  const legMat = runtime.core.toon("#1a1a1a");
  const frameBar = (w, h, d, x, y, z, outline = 0.045) => {
    const part = runtime.core.mesh(runtime.core.rbox(w, h, d, 0.04), legMat, { outline });
    part.position.set(x, y, z);
    runtime.core.scene.add(part);
    return part;
  };
  [-5.5, 5.5].forEach((x) => {
    frameBar(0.62, 0.22, 7.6, x, FLOOR_Y + 0.13, 0.2, 0.05);
    [-3.35, 3.75].forEach((z) => frameBar(0.4, 0.08, 0.4, x, FLOOR_Y + 0.04, z, 0.03));
    frameBar(0.78, 2.0, 0.62, x, FLOOR_Y + 1.24, 0.2, 0.05);
    frameBar(0.7, 1.4, 0.54, x, -2.25, 0.2);
    frameBar(0.62, 1.0, 0.46, x, -1.15, 0.2);
    frameBar(0.72, 0.1, 7.2, x, -0.75, 0.2, 0.035);
  });
  frameBar(10.4, 0.32, 0.4, 0, -0.86, 0.2);
  const keypad = runtime.core.mesh(runtime.core.rbox(1.25, 0.46, 0.2, 0.06), legMat, { outline: 0.03 });
  keypad.position.set(4.3, -0.9, 3.98);
  keypad.rotation.x = -0.35;
  const keypadFace = runtime.core.printed(1.15, 0.4, 300, (c, w, h) => {
    c.fillStyle = "#121212";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#8fd694";
    c.font = "700 30px 'Space Grotesk', sans-serif";
    c.textBaseline = "middle";
    c.fillText("112", 22, h / 2);
    ["^", "1", "3", "M", "v", "2", "4", "◐"].forEach((label, i) => {
      const bx = w * 0.33 + (i % 4) * w * 0.165;
      const by = h * (i < 4 ? 0.3 : 0.72);
      c.fillStyle = "#2a2a2a";
      c.beginPath();
      c.arc(bx, by, 17, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#d8d8d8";
      c.font = "600 18px 'Space Grotesk', sans-serif";
      c.textAlign = "center";
      c.fillText(label, bx, by + 1);
      c.textAlign = "left";
    });
  });
  keypadFace.position.z = 0.102;
  keypad.add(keypadFace);
  runtime.core.scene.add(keypad);

  // ---------- full-viewport room: walls and floor extend beyond every camera shot ----------
  const room = new THREE.Group();
  runtime.core.scene.add(room);
  // Wood flooring: one tile of staggered planks repeated across the floor (8 × 8 units a tile)
  const floorMat = runtime.core.toon("#ffffff");
  const floorWood = canvasTexture(1024, 1024);
  runtime.core.track(floorWood.texture);
  drawWoodFloor(floorWood.ctx, 1024, 1024);
  floorWood.texture.wrapS = floorWood.texture.wrapT = THREE.RepeatWrapping;
  floorWood.texture.repeat.set(25, 25);
  floorMat.map = floorWood.texture;
  // Both walls share one painted texture, tiled every 2 units (the back wall's box maps 0–1 over
  // its 200 × 100; the side wall's extrusion maps in world units)
  const wallPaint = canvasTexture(256, 256);
  runtime.core.track(wallPaint.texture);
  drawWallPaint(wallPaint.ctx, 256, 256);
  wallPaint.texture.wrapS = wallPaint.texture.wrapT = THREE.RepeatWrapping;
  const WALL_TILE = 2;
  const backWallPaint = wallPaint.texture;
  backWallPaint.repeat.set(200 / WALL_TILE, 100 / WALL_TILE);
  const sideWallPaint = runtime.core.track(wallPaint.texture.clone());
  sideWallPaint.needsUpdate = true;
  sideWallPaint.repeat.set(1 / WALL_TILE, 1 / WALL_TILE);
  const backWallMat = runtime.core.toon("#ffffff");
  backWallMat.map = backWallPaint;
  const sideWallMat = runtime.core.toon("#ffffff");
  // Matte paint needs a continuous response: the props' three toon bands turn overlapping
  // strip lights into visible circular patches on these otherwise flat walls.
  const wallGradient = runtime.core.track(new THREE.DataTexture(Uint8Array.from({ length: 256 }, (_, i) => Math.round(70 + i * 185 / 255)), 256, 1, THREE.RedFormat));
  wallGradient.minFilter = wallGradient.magFilter = THREE.LinearFilter;
  wallGradient.needsUpdate = true;
  backWallMat.gradientMap = sideWallMat.gradientMap = wallGradient;
  sideWallMat.map = sideWallPaint;
  const trimMat = runtime.core.toon("#ffffff");
  const roomBox = (w, h, d, material, x, y, z, outline = 0.055) => {
    const part = runtime.core.mesh(new THREE.BoxGeometry(w, h, d), material, { outline, cast: false });
    part.position.set(x, y, z);
    room.add(part);
    return part;
  };
  const fullRoom = [
    roomBox(200, 0.25, 200, floorMat, 0, FLOOR_Y - 0.17, 1.2),
    roomBox(200, 100, 0.24, backWallMat, 0, FLOOR_Y + 50, WALL_Z),
  ];
  // The wall materials already receive the real light's shadows. A separate ShadowMaterial
  // mask would darken them even outside the window cookie or an indoor light's actual reach.
  // The side wall, with a real opening cut for the window (see the window below). Built as
  // its outline extruded through the wall's thickness, the opening as a hole in it.
  const WINDOW_AT = { y: 4.7, z: -1.1, w: 4.4, h: 4.5 };
  const wallShape = new THREE.Shape();
  // Shape x runs along -z once stood up; y is height
  wallShape.moveTo(-101.2, FLOOR_Y);
  wallShape.lineTo(98.8, FLOOR_Y);
  wallShape.lineTo(98.8, FLOOR_Y + 100);
  wallShape.lineTo(-101.2, FLOOR_Y + 100);
  wallShape.closePath();
  const opening = new THREE.Path();
  const ox = -WINDOW_AT.z;
  const halfW = WINDOW_AT.w / 2 + 0.01;
  const halfH = WINDOW_AT.h / 2 + 0.01;
  opening.moveTo(ox - halfW, WINDOW_AT.y - halfH);
  opening.lineTo(ox - halfW, WINDOW_AT.y + halfH);
  opening.lineTo(ox + halfW, WINDOW_AT.y + halfH);
  opening.lineTo(ox + halfW, WINDOW_AT.y - halfH);
  opening.closePath();
  wallShape.holes.push(opening);
  const sideWallGeo = new THREE.ExtrudeGeometry(wallShape, { depth: 0.24, bevelEnabled: false });
  sideWallGeo.rotateY(Math.PI / 2);
  const sideWall = runtime.core.mesh(sideWallGeo, sideWallMat, { outline: 0.055, cast: false });
  sideWall.position.x = SIDE_X - 0.12;
  room.add(sideWall);
  fullRoom.push(
    sideWall,
    roomBox(200, 0.22, 0.16, trimMat, 0, FLOOR_Y + 0.17, WALL_Z + 0.23, 0.025),
    roomBox(0.16, 0.22, 200, trimMat, SIDE_X + 0.23, FLOOR_Y + 0.17, 1.2, 0.025),
  );

  // On a portrait screen the room is a diorama instead: the same two walls and floor cut off
  // just past the furniture, standing on a thick slab, the whole of it framed on the page's
  // own background (see SHOTS.overview), with a pinch to look closer
  const DIORAMA = { x0: SIDE_X - 0.12, x1: 15.6, z0: WALL_Z - 0.12, z1: 11, top: FLOOR_Y + 15.5, slab: 0.9 };
  const slabMat = runtime.core.toon("#3a332c");
  // A box whose faces tile their texture as the endless room's do (one unit is one unit)
  const dioramaBox = (w, h, d, material, x, y, z, uvScale, outline = 0.055) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uvScale[0], uv.getY(i) * uvScale[1]);
    const part = runtime.core.mesh(geo, material, { outline, cast: false });
    part.position.set(x, y, z);
    room.add(part);
    return part;
  };
  const dioramaW = DIORAMA.x1 - DIORAMA.x0;
  const dioramaD = DIORAMA.z1 - DIORAMA.z0;
  const dioramaMidX = (DIORAMA.x0 + DIORAMA.x1) / 2;
  const dioramaMidZ = (DIORAMA.z0 + DIORAMA.z1) / 2;
  const floorTop = FLOOR_Y - 0.045;
  const dioramaWallH = DIORAMA.top - FLOOR_Y;
  // The floor's planks on top, the slab's raw edge on every other face
  const slabFaces = [slabMat, slabMat, floorMat, slabMat, slabMat, slabMat];
  const dioramaSideShape = new THREE.Shape();
  dioramaSideShape.moveTo(-DIORAMA.z1, FLOOR_Y);
  dioramaSideShape.lineTo(-DIORAMA.z0, FLOOR_Y);
  dioramaSideShape.lineTo(-DIORAMA.z0, DIORAMA.top);
  dioramaSideShape.lineTo(-DIORAMA.z1, DIORAMA.top);
  dioramaSideShape.closePath();
  dioramaSideShape.holes.push(opening);
  const dioramaSideGeo = new THREE.ExtrudeGeometry(dioramaSideShape, { depth: 0.24, bevelEnabled: false });
  dioramaSideGeo.rotateY(Math.PI / 2);
  const dioramaSide = runtime.core.mesh(dioramaSideGeo, sideWallMat, { outline: 0.055, cast: false });
  dioramaSide.position.x = SIDE_X - 0.12;
  room.add(dioramaSide);
  const dioramaRoom = [
    dioramaBox(dioramaW, DIORAMA.slab, dioramaD, slabFaces, dioramaMidX, floorTop - DIORAMA.slab / 2, dioramaMidZ, [dioramaW / 200, dioramaD / 200], 0.07),
    dioramaBox(dioramaW, dioramaWallH, 0.24, backWallMat, dioramaMidX, FLOOR_Y + dioramaWallH / 2, WALL_Z, [dioramaW / 200, dioramaWallH / 100], 0.07),
    dioramaSide,
    roomBox(dioramaW, 0.22, 0.16, trimMat, dioramaMidX, FLOOR_Y + 0.17, WALL_Z + 0.23, 0.025),
    roomBox(0.16, 0.22, dioramaD, trimMat, SIDE_X + 0.23, FLOOR_Y + 0.17, dioramaMidZ, 0.025),
  ];
  let diorama = false;
  const roomBackground = (isDark) => (diorama ? (isDark ? "#2a2440" : "#ffffff") : isDark ? "#d6d3e6" : "#ffffff");
  function setDiorama(on) {
    diorama = on;
    fullRoom.forEach((part) => (part.visible = !on));
    dioramaRoom.forEach((part) => (part.visible = on));
    runtime.core.scene.background.set(roomBackground(runtime.theme.darkNow));
    // The day/night blend holds the background too: it's told the new one
    const at = runtime.theme.lightingColors.indexOf(runtime.core.scene.background);
    [runtime.theme.lightingFrom, runtime.theme.lightingTarget].forEach((state) => state.colors[at].copy(runtime.core.scene.background));
    if (on) drawBackdrop();
  }

  // Behind the diorama, a clean white page with the 2D site's dot grid. A screen-sized card that follows the camera (see the loop), redrawn for size and theme
  const backdropTex = canvasTexture(4, 4);
  runtime.core.track(backdropTex.texture);
  const backdrop = new THREE.Mesh(runtime.core.track(new THREE.PlaneGeometry(1, 1)), runtime.core.track(new THREE.MeshBasicMaterial({ map: backdropTex.texture, depthWrite: false, toneMapped: false })));
  backdrop.raycast = runtime.core.noRaycast;
  backdrop.renderOrder = -2;
  runtime.core.scene.add(backdrop);
  function drawBackdrop() {
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round((runtime.options.container.clientWidth || 1) * scale);
    const h = Math.round((runtime.options.container.clientHeight || 1) * scale);
    const { canvas, ctx: c } = backdropTex;
    if (canvas.width !== w || canvas.height !== h) {
      Object.assign(canvas, { width: w, height: h });
      backdropTex.texture.dispose();
    }
    const night = runtime.theme.darkNow;
    const ink = night ? "#0d0b14" : "#1a1714";
    dioramaShadow.material.color.set(ink);
    c.fillStyle = night ? "#2a2440" : "#ffffff";
    c.fillRect(0, 0, w, h);
    // the page's dot grid
    const gap = 22 * scale;
    c.fillStyle = night ? "rgba(255,255,255,.12)" : "rgba(26,23,20,.16)";
    for (let y = gap / 2; y < h; y += gap) {
      for (let x = gap / 2; x < w; x += gap) {
        c.beginPath();
        c.arc(x, y, 1.6 * scale, 0, Math.PI * 2);
        c.fill();
      }
    }
    backdropTex.texture.needsUpdate = true;
  }
  // The diorama's own hard shadow: the block's outline as seen, in solid ink, laid flat just in
  // front of the backdrop and nudged down to the right on screen (see the loop)
  const dioramaShadow = new THREE.Mesh(new THREE.BufferGeometry(), runtime.core.track(new THREE.MeshBasicMaterial({ color: "#1a1714", toneMapped: false, depthWrite: false })));
  dioramaShadow.raycast = runtime.core.noRaycast;
  dioramaShadow.renderOrder = -1;
  runtime.core.scene.add(dioramaShadow);
  let dioramaShadowFor = null;
  // The block's eight corners in the view's right/up coordinates, wrapped in their hull
  function shapeDioramaShadow(right, up) {
    const pts = [];
    const corner = new THREE.Vector3();
    [DIORAMA.x0, DIORAMA.x1].forEach((x) => [floorTop - DIORAMA.slab, DIORAMA.top].forEach((y) => [DIORAMA.z0, DIORAMA.z1].forEach((z) => {
      corner.set(x, y, z);
      pts.push(new THREE.Vector2(corner.dot(right), corner.dot(up)));
    })));
    pts.sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const half = (list) => list.reduce((hull, p) => {
      while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) hull.pop();
      hull.push(p);
      return hull;
    }, []);
    const lower = half(pts);
    const upper = half([...pts].reverse());
    dioramaShadow.geometry.dispose();
    dioramaShadow.geometry = new THREE.ShapeGeometry(new THREE.Shape([...lower.slice(0, -1), ...upper.slice(0, -1)]));
  }
  dioramaRoom.push(backdrop, dioramaShadow);
  dioramaRoom.forEach((part) => (part.visible = false));

  // Rear LED strips illuminate surfaces through actual shadowed lights.
  const DESK_WASH = 0.45;
  // Every neon also lights the room for real: a point light that follows its glow (fade, flicker,
  // party), so the toon surfaces pick up the colour and the props throw coloured shadows
  const neonLights = [];
  // `tint` follows a material whose colour changes (a console's LED); `shadow` costs a texture
  // unit in every lit shader, so it's kept to the lights whose shadows read (16 is the usual cap)
  const neonLight = (color, max, level, { distance = 8, shadow = false, tint = null } = {}) => {
    const light = new THREE.PointLight(color, 0, distance, 2);
    if (shadow) {
      light.castShadow = true;
      light.shadow.mapSize.set(512, 512);
      light.shadow.camera.near = 0.05;
      light.shadow.bias = -0.002;
      light.shadow.normalBias = 0.03;
      light.shadow.radius = 6;
      // A point light's shadow is six renders of the room; see updateNeonLights
      light.shadow.autoUpdate = false;
      light.shadow.needsUpdate = true;
      shadowedNeons.push(light);
    }
    neonLights.push({ light, max, level, tint });
    return light;
  };
  const shadowedNeons = [];
  let neonShadowTurn = 0;
  let neonShadowAt = 0;
  function updateNeonLights(now, moving = false) {
    neonLights.forEach(({ light, max, level, tint }) => {
      light.intensity = max * level();
      if (tint) light.color.copy(tint.color);
    });
    // Cache decorative shadows while idle; motion gets one cube update per rendered frame.
    if (!shadowedNeons.length || (!moving && now < neonShadowAt)) return;
    neonShadowAt = now + 50;
    neonShadowTurn = (neonShadowTurn + 1) % shadowedNeons.length;
    const light = shadowedNeons[neonShadowTurn];
    if (light.intensity > 0) light.shadow.needsUpdate = true;
  }
  // Shared broad emitters for the desk and monitor strips. A flat inner cone and overlapping
  // coverage keep the individual sample centres from reading as little spotlights.
  const stripLight = (color, level, position, target, parent = runtime.core.scene) => {
    const light = new THREE.SpotLight(color, 0, 4.5, 1.5, 0.12, 0);
    light.position.set(...position);
    light.target.position.set(...target);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.camera.near = 0.05;
    light.shadow.bias = -0.0003;
    light.shadow.normalBias = 0.015;
    light.shadow.radius = 9;
    light.shadow.autoUpdate = false;
    light.shadow.needsUpdate = true;
    shadowedNeons.push(light);
    // ponytail: overlapping samples approximate a strip; true area shadows need a different renderer.
    neonLights.push({ light, max: 1.1, level });
    parent.add(light, light.target);
    return light;
  };
  const deskNeons = ["#00e0c6", "#ff90e8"].map((color, i) => {
    const x = i === 0 ? -3.5 : 3.5;
    const strip = new THREE.Mesh(
      runtime.core.track(new THREE.BoxGeometry(7, 0.045, 0.06)),
      runtime.core.track(new THREE.MeshBasicMaterial({ color })),
    );
    // tucked just under the top's back edge, so only its light shows, never the strip itself
    strip.position.set(x, -0.3, -4.23);
    strip.raycast = runtime.core.noRaycast;
    // Fade state only: no painted wall glow that can bypass an occluding prop.
    const washMat = { opacity: 0 };
    // Four broad samples retain the strip coverage and leave texture units for the
    // monitor task light and textured/bump-mapped materials on 16-sampler GPUs.
    const lights = Array.from({ length: 2 }, (_, sample) => {
      const sx = x - 3.5 + (sample + 0.5) * 3.5;
      return stripLight(color, () => 1.5 * washMat.opacity / DESK_WASH,
        [sx, strip.position.y, strip.position.z], [sx, 2.5, WALL_Z + 0.12]);
    });
    runtime.core.scene.add(strip);
    return { strip, washMat, lights };
  });

  // A framed illustration on the left wall: four panes, a sun/moon and angular trees.
  const windowGroup = new THREE.Group();
  // Seated in the wall's opening, the frame's face all but flush with the wall's, so the wall
  // runs straight up to the wood: the group's origin is the frame's plane, WINDOW_DEPTH behind
  // the wall's face
  const WINDOW_DEPTH = 0.1;
  windowGroup.position.set(SIDE_X + 0.12 - WINDOW_DEPTH, WINDOW_AT.y, WINDOW_AT.z);
  windowGroup.rotation.y = Math.PI / 2;
  room.add(windowGroup);
  // One wooden frame, matching glazing bars and sill, with a brass catch and faint glare.
  const windowWood = canvasTexture(512, 512);
  runtime.core.track(windowWood.texture);
  drawWoodTop(windowWood.ctx, 512, 512);
  // The frame keeps its own copy of the grain, so a new wood for it leaves the painting, the
  // lamp and the board (which share windowWood) as they are
  const frameGrainTex = canvasTexture(512, 512);
  runtime.core.track(frameGrainTex.texture);
  drawWoodTop(frameGrainTex.ctx, 512, 512, DEFAULT_WOODS.window);
  const frameWood = runtime.core.toon("#f0c7a0");
  frameWood.map = frameGrainTex.texture;
  const windowFrame = runtime.core.mesh(new THREE.BoxGeometry(4.4, 4.5, 0.18), frameWood, { cast: false, outline: 0.03 });
  // Keep the animated view at the same cadence in overview and close-up.
  // Start at a random daylight mood, then cycle in order with the room lighting.
  // Night joins the cycle and switches on the room's lamps automatically.
  const outside = { t: 0, flockAt: -99, starAt: -99, drawnAt: 0, rain: runtime.core.previewRain, rainTarget: runtime.core.previewRain, clicks: [], night: runtime.options.dark };
  const daylightParts = ["morning", "day", "evening", "night"];
  let daylightPart = daylightParts.includes(runtime.core.previewTime) ? runtime.core.previewTime : runtime.options.dark ? "night" : daylightParts[Math.floor(Math.random() * 3)];
  const dayPart = () => (outside.night ? "night" : daylightPart);
  outside.sky = windowSky(dayPart());
  const windowView = runtime.core.printed(4.0, 4.1, 220, (c, w, h) => drawWindowView(c, w, h, { ...outside, time: dayPart() }), { unlit: true });
  windowView.position.z = 0.105;
  windowGroup.add(windowFrame, windowView);
  // The sill runs out from the frame past the wall's face, with an apron board under it. Its
  // top sits clearly above the opening's floor and the frame's foot (both end inside it), so
  // no two faces share a plane and flicker as the camera moves.
  const sill = runtime.core.mesh(new THREE.BoxGeometry(4.4 + 0.5, 0.2, WINDOW_DEPTH + 0.45), frameWood, { cast: false, outline: 0.03 });
  sill.position.set(0, -2.25 - 0.03, (WINDOW_DEPTH + 0.45) / 2);
  const apron = runtime.core.mesh(runtime.core.rbox(4.1, 0.26, 0.08, 0.03), frameWood, { cast: false, outline: 0.02 });
  apron.position.set(0, -2.25 - 0.29, WINDOW_DEPTH + 0.04);
  windowGroup.add(sill, apron);
  // A single cross avoids overlapping faces and outline seams at the centre joint.
  const windowBars = 0.15;
  const halfBar = windowBars / 2;
  const crossShape = new THREE.Shape();
  [[-halfBar, 2.05], [halfBar, 2.05], [halfBar, halfBar], [2, halfBar],
    [2, -halfBar], [halfBar, -halfBar], [halfBar, -2.05], [-halfBar, -2.05],
    [-halfBar, -halfBar], [-2, -halfBar], [-2, halfBar], [-halfBar, halfBar]]
    .forEach(([x, y], i) => i ? crossShape.lineTo(x, y) : crossShape.moveTo(x, y));
  crossShape.closePath();
  const glazingBars = runtime.core.mesh(new THREE.ExtrudeGeometry(crossShape, { depth: 0.08, bevelEnabled: false }), frameWood, { cast: false, outline: 0.015 });
  const crossPositions = glazingBars.geometry.attributes.position;
  const crossUV = glazingBars.geometry.attributes.uv;
  for (let i = 0; i < crossUV.count; i++) {
    crossUV.setXY(i, crossPositions.getX(i) / 4.4 + 0.5, crossPositions.getY(i) / 4.5 + 0.5);
  }
  glazingBars.position.z = 0.09;
  windowGroup.add(glazingBars);
  const brass = runtime.core.toon("#d4a72c");
  const catchPlate = runtime.core.mesh(runtime.core.rbox(0.18, 0.12, 0.04, 0.02), brass, { cast: false, outline: 0.01 });
  catchPlate.position.set(0, 0, 0.20);
  const catchLever = runtime.core.mesh(runtime.core.rbox(0.05, 0.22, 0.04, 0.02), brass, { cast: false, outline: 0.01 });
  catchLever.position.set(0.06, -0.08, 0.23);
  catchLever.rotation.z = 0.5;
  // The catch turns around the spindle in the fixed plate.
  const windowCatch = new THREE.Group();
  windowCatch.position.z = 0.23;
  catchLever.position.z = 0;
  windowCatch.add(catchLever);
  windowGroup.add(catchPlate, windowCatch);
  const glareTex = canvasTexture(256, 256);
  runtime.core.track(glareTex.texture);
  glareTex.ctx.fillStyle = "rgba(255,255,255,.32)";
  [[40, 26], [96, 12]].forEach(([x, wd]) => {
    glareTex.ctx.beginPath();
    glareTex.ctx.moveTo(x, 256);
    glareTex.ctx.lineTo(x + wd, 256);
    glareTex.ctx.lineTo(x + wd + 130, 0);
    glareTex.ctx.lineTo(x + 130, 0);
    glareTex.ctx.closePath();
    glareTex.ctx.fill();
  });
  const windowGlare = new THREE.Mesh(runtime.core.track(new THREE.PlaneGeometry(4.0, 4.1)), runtime.core.track(new THREE.MeshBasicMaterial({ map: glareTex.texture, transparent: true, opacity: 0.55, depthWrite: false })));
  glareTex.texture.wrapS = THREE.RepeatWrapping;
  windowGlare.position.z = 0.115;
  windowGlare.raycast = runtime.core.noRaycast;
  windowGroup.add(windowGlare);
  // Dedicated shadows for the glazing bars and blind, drawn only into the window light's
  // shadow map (skipped in every other
  // pass), so the sun doesn't see them and nothing of them shows. The light's cookie keeps
  // the beam inside the glass opening.
  const shadowOnly = runtime.core.track(new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
  const skipDraw = (r, s, c, geometry) => geometry.setDrawRange(0, 0);
  const restoreDraw = (r, s, c, geometry) => geometry.setDrawRange(0, Infinity);
  const windowShadow = (geo) => {
    const m = new THREE.Mesh(geo, shadowOnly);
    m.castShadow = true;
    m.frustumCulled = false;
    m.raycast = runtime.core.noRaycast;
    m.userData.windowShadow = true;
    m.onBeforeShadow = (r, o, c, shadowCamera, g) => g.setDrawRange(0, shadowCamera === runtime.windowLighting.windowLight.shadow.camera ? Infinity : 0);
    m.onAfterShadow = (r, o, c, shadowCamera, g) => g.setDrawRange(0, Infinity);
    m.onBeforeRender = skipDraw;
    m.onAfterRender = restoreDraw;
    return m;
  };
  [
    runtime.core.track(new THREE.BoxGeometry(windowBars, 4.1, 0.04)),
    runtime.core.track(new THREE.BoxGeometry(4.0, windowBars, 0.04)),
  ].forEach((geo) => windowGroup.add(runtime.core.at(windowShadow(geo), 0, 0, 0.06)));

  // Public state used by the other scene parts.
  return {
    windowGroup,
    windowShadow,
    WINDOW_DEPTH,
    brass,
    shadowOnly,
    outside,
    dayPart,
    SIDE_X,
    WINDOW_AT,
    windowCatch,
    windowGlare,
    glareTex,
    room,
    WALL_Z,
    FLOOR_Y,
    WALL_LIFT,
    windowWood,
    neonLight,
    stripLight,
    backWallMat,
    sideWallMat,
    deskWood,
    deskMat,
    frameGrainTex,
    frameWood,
    deskNeons,
    DESK_WASH,
    shadowedNeons,
    floorMat,
    roomBackground,
    trimMat,
    get diorama() { return diorama; },
    drawBackdrop,
    windowView,
    get daylightPart() { return daylightPart; },
    set daylightPart(value) { daylightPart = value; },
    daylightParts,
    DIORAMA,
    setDiorama,
    backdrop,
    get dioramaShadowFor() { return dioramaShadowFor; },
    set dioramaShadowFor(value) { dioramaShadowFor = value; },
    shapeDioramaShadow,
    dioramaShadow,
    updateNeonLights,
    neonLights,
  };
}
