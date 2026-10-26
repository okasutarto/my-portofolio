// "The Desk": an orthographic, neo-brutalist diorama of a work corner. Each section of
// the site is a prop: the ID badge on the monitor (hero), a pinned wall board (about), a stack of
// boarding passes (experience), a pile of case files (projects) and a postcard (contact).
// The phone on its stand is the AI chat.
// Clicking one flies the camera in and plays a little arrival move. Everything is read (and
// written: the postcard, the chat) on the props themselves; nothing hands off to the 2D site.
//
// The 2D site's look carried into 3D:
// - thick black outlines: inverted hulls pushed out along smoothed normals
// - flat toon shading with three hard bands
// - window light and shadows on the actual toon-shaded surfaces
import * as THREE from "three";
import gsap from "gsap";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import emailjs from "@emailjs/browser";
import { sfx, GROOVE_BEAT } from "@/composables/useSfx";
import { ABOUT_NOTES } from "@/data/about";
import { FOLDER_COLORS } from "@/data/projectFiles";
import { EMAILJS_CONFIG } from "@/config/emailjs";
import { getStreamingResponse } from "@/services/openai";
import {
  canvasTexture,
  drawTerminal,
  drawBadge,
  drawTicket,
  drawTicketBack,
  drawFolderCover,
  drawCaseSheet,
  drawCaseBack,
  CASE_SHEETS,
  drawChatScreen,
  drawPostcard,
  drawPostcardBack,
  drawEnvelope,
  drawEnvelopeFlap,
  drawPostcardStamp,
  drawAboutBoard,
  drawAboutNote,
  loadPortrait,
  drawKeyLabel,
  drawQuoteBubble,
  drawStickyNote,
  drawPainting,
  PAINTING_COUNT,
  drawWindowView,
  drawGameSpine,
  drawGameCover,
  drawRepBadge,
  drawGymCalendar,
  drawSlash,
  drawShout,
  drawEnmaBlade,
  drawEnmaFlower,
  drawWoodTop,
  drawDeskMat,
  drawWoodFloor,
  drawRug,
  drawDrawerFront,
  SIP_QUOTES,
  LUFFY_QUOTES,
} from "./textures";
import { createDesktop, SCREEN_W, SCREEN_H } from "./desktop";
import { createLofi, TRACKS } from "./lofi";

const PALETTES = {
  light: { desk: "#ffffff", shadow: "#000000" },
  // Night: the same wood, dimmed, so it still reads against the dark page
  dark: { desk: "#c4b9dc", shadow: "#000000" },
};
// Props that stand for a section of the 2D site
export const SECTIONS = ["hero", "about", "experience", "projects", "contact"];

// Smallest area of the scene that always stays in view (world units)
const VIEW_W = 21.5;
const VIEW_H = 14.5;

export function createDeskScene({ container, projects, experiences, dark = false, muted = false, onEvent = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "absolute inset-0 w-full h-full block";
  renderer.domElement.style.touchAction = "none";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);

  // Daylight enters from the upper panes of the left window, across the desk.
  const ambient = new THREE.AmbientLight(0xffffff, 1.15);
  scene.add(ambient);
  // Broad sky/floor bounce keeps the whole daytime room bright, beyond the window patch.
  const skyFill = new THREE.HemisphereLight(0xfffaf0, 0xd9c7aa, 1.45);
  scene.add(skyFill);
  // Soft front fill reveals bevels without adding another directional shadow.
  const readabilityFill = new THREE.DirectionalLight(0xdde4ff, 0);
  readabilityFill.position.set(7, 8, 12);
  scene.add(readabilityFill);
  const sun = new THREE.DirectionalLight(0xfff1cc, 1.8);
  // From the window side, in front of the desk, aimed toward the back wall: shadows fall to
  // the right on the desk and up onto the wall behind the props
  sun.position.set(-13, 9.5, 4.5);
  sun.target.position.set(1, -0.5, -2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 60 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  const timers = [];
  let destroyed = false;

  // ---------- materials & helpers ----------
  const disposables = new Set();
  const track = (o) => (disposables.add(o), o);

  const gradient = track(new THREE.DataTexture(new Uint8Array([70, 160, 255]), 3, 1, THREE.RedFormat));
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  const toon = (color) => track(new THREE.MeshToonMaterial({ color, gradientMap: gradient }));

  const outlineMats = new Map();
  // Outlines are drawn in screen pixels, not world units: every prop gets a clear line of the
  // same weight whether the camera is pulled back or zoomed right in. The nominal width a
  // prop asks for (world units, 0.01–0.06) maps to roughly 2.5–4 CSS pixels.
  const outlineResolution = { value: new THREE.Vector2(1, 1) };
  const outlinePixels = (thickness) => 2.2 + thickness * 30;
  const outlineMat = (thickness) => {
    if (!outlineMats.has(thickness)) {
      outlineMats.set(
        thickness,
        track(
          new THREE.ShaderMaterial({
            uniforms: {
              thickness: { value: outlinePixels(thickness) },
              resolution: outlineResolution,
              color: { value: new THREE.Color(0x000000) },
            },
            vertexShader: `
              uniform float thickness;
              uniform vec2 resolution;
              void main() {
                vec4 p = vec4(position, 1.0);
                vec3 n = normal;
                #ifdef USE_INSTANCING
                  p = instanceMatrix * p;
                  n = mat3(instanceMatrix) * n;
                #endif
                vec4 clip = projectionMatrix * modelViewMatrix * p;
                vec2 dir = (mat3(modelViewMatrix) * n).xy;
                float len = length(dir);
                dir = len > 1e-5 ? dir / len : vec2(0.0);
                clip.xy += dir * thickness * 2.0 / resolution * clip.w;
                gl_Position = clip;
              }`,
            fragmentShader: `
              uniform vec3 color;
              void main() { gl_FragColor = vec4(color, 1.0); }`,
            side: THREE.BackSide,
          }),
        ),
      );
    }
    return outlineMats.get(thickness);
  };

  // Hull geometry: positions only, welded so hard edges share one averaged normal (no cracks)
  const hullCache = new Map();
  const hullGeometry = (geo) => {
    if (!hullCache.has(geo)) {
      const g = geo.clone();
      Object.keys(g.attributes).forEach((k) => k !== "position" && g.deleteAttribute(k));
      const welded = mergeVertices(g, 1e-3);
      welded.computeVertexNormals();
      g.dispose();
      hullCache.set(geo, track(welded));
    }
    return hullCache.get(geo);
  };

  const noRaycast = () => {};
  // `hull` swaps in a simpler outer shape for the outline (a hollow mug outlines as a cylinder)
  function mesh(geo, material, { outline = 0.045, cast = true, hull: hullShape } = {}) {
    track(geo);
    const m = new THREE.Mesh(geo, material);
    m.castShadow = cast;
    m.receiveShadow = true;
    if (outline) {
      if (hullShape) track(hullShape);
      const hull = new THREE.Mesh(hullGeometry(hullShape || geo), outlineMat(outline));
      hull.raycast = noRaycast;
      m.add(hull);
    }
    return m;
  }
  const UP = new THREE.Vector3(0, 1, 0);
  const rbox = (w, h, d, r = 0.08) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w, h, d) / 2 - 1e-3));

  // A plane carrying a canvas texture, unlit so the print keeps its exact colours
  const redrawers = [];
  function printed(w, h, px, draw) {
    const t = canvasTexture(Math.round(w * px), Math.round(h * px));
    track(t.texture);
    const plane = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), track(new THREE.MeshBasicMaterial({ map: t.texture })));
    t.redraw = (...args) => {
      t.hotspots = draw(t.ctx, t.canvas.width, t.canvas.height, ...args) || [];
      t.texture.needsUpdate = true;
    };
    plane.userData.tex = t;
    redrawers.push(() => t.redraw());
    return plane;
  }
  // A quote bubble that pops up over a prop for a few seconds (the mug, the straw hat).
  // Sized in world units; it always faces the camera and draws over everything.
  const bubbleTimers = [];
  function speechBubble(width, height, print = {}) {
    const tex = canvasTexture(760, 400);
    track(tex.texture);
    const sprite = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: tex.texture, depthTest: false, transparent: true })));
    sprite.scale.set(0.001, 0.001, 1);
    sprite.renderOrder = 10;
    sprite.raycast = noRaycast;
    scene.add(sprite);
    const slot = bubbleTimers.push(null) - 1;
    const hide = () => {
      clearTimeout(bubbleTimers[slot]);
      gsap.to(sprite.scale, { x: 0.001, y: 0.001, duration: 0.2, ease: "power2.in", overwrite: true });
    };
    const say = (quote, hold = 4200) => {
      drawQuoteBubble(tex.ctx, 760, 400, quote, print);
      tex.texture.needsUpdate = true;
      gsap.fromTo(sprite.scale, { x: width * 0.16, y: height * 0.15 }, { x: width, y: height, duration: 0.4, ease: "back.out(2)", overwrite: true });
      clearTimeout(bubbleTimers[slot]);
      bubbleTimers[slot] = setTimeout(hide, hold);
    };
    return { sprite, say, hide };
  }
  const hoverScale = (obj, amount = 1.05) => (on) =>
    gsap.to(obj.scale, { x: on ? amount : 1, y: on ? amount : 1, z: on ? amount : 1, duration: 0.18, ease: "back.out(3)" });

  const shadowFill = track(new THREE.MeshBasicMaterial({ color: PALETTES.light.shadow }));

  // ---------- interaction registry ----------
  const interactive = new Map(); // object -> { focus, onEnter, onClick, onArrive, onLeave, onHover }
  const byFocus = new Map(); // focus name -> handlers
  const pickables = [];
  function register(object, handlers) {
    interactive.set(object, handlers);
    pickables.push(object);
    // Items (one ticket, one folder) share their group's focus but not its arrive/leave/keys
    if (handlers.focus && !handlers.item) byFocus.set(handlers.focus, handlers);
  }
  const entryFor = (obj) => {
    for (let o = obj; o; o = o.parent) if (interactive.has(o)) return { object: o, ...interactive.get(o) };
    return null;
  };

  // ---------- typing into props (postcard fields, the phone's chat box) ----------
  // A visually hidden textarea holds the text, so phones raise their keyboard and every input
  // method works; the prop only draws the value. A field is { id, get, set, redraw, ... }.
  const typer = document.createElement("textarea");
  typer.setAttribute("aria-label", "Type here");
  Object.assign(typer.style, {
    position: "absolute",
    left: "0",
    bottom: "0",
    width: "1px",
    height: "1px",
    opacity: "0",
    border: "0",
    padding: "0",
    resize: "none",
    fontSize: "16px", // below 16px iOS zooms the page on focus
    pointerEvents: "none",
  });
  container.appendChild(typer);
  let typing = null;
  let caretOn = true;
  function startTyping(field) {
    typing = field;
    typer.maxLength = field.maxLength || 500;
    typer.value = field.get();
    typer.focus({ preventScroll: true });
    typer.setSelectionRange(typer.value.length, typer.value.length);
    caretOn = true;
    field.redraw();
  }
  function stopTyping() {
    if (!typing) return;
    const field = typing;
    typing = null;
    typer.blur();
    field.onStop?.();
    field.redraw();
  }
  const onTyperInput = () => {
    if (!typing) return;
    typing.set(typer.value);
    typing.redraw();
  };
  const onTyperKey = (e) => {
    if (!typing) return;
    if (e.key === "Escape") {
      e.preventDefault();
      stopTyping();
      return back();
    }
    if (e.key === "Tab" && typing.onTab) {
      e.preventDefault();
      return typing.onTab(e.shiftKey ? -1 : 1);
    }
    // Multi-line fields take Enter as a new line; Cmd/Ctrl+Enter submits
    if (e.key === "Enter" && (!typing.multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      return typing.onEnter?.();
    }
    if (!e.repeat && (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter"))
      pressKey(e.code);
  };
  typer.addEventListener("input", onTyperInput);
  typer.addEventListener("keydown", onTyperKey);

  // ---------- the desk ----------
  const FLOOR_Y = -5.2;
  // A wood-grain top; the material's colour tints it for the night shift
  const deskMat = toon(PALETTES.light.desk);
  const deskWood = canvasTexture(1400, 840);
  track(deskWood.texture);
  drawWoodTop(deskWood.ctx, 1400, 840);
  deskMat.map = deskWood.texture;
  const desk = mesh(rbox(14, 0.7, 8.4, 0.14), deskMat, { outline: 0.06 });
  desk.position.y = -0.35;
  scene.add(desk);
  // A sit-stand frame in matte black: two telescoping columns (three stages, widest at the
  // floor) on flat T-feet, a crossbar between them and a rail under the top at each end, with
  // the memory keypad tucked under the front edge on the right
  const legMat = toon("#1a1a1a");
  const frameBar = (w, h, d, x, y, z, outline = 0.045) => {
    const part = mesh(rbox(w, h, d, 0.04), legMat, { outline });
    part.position.set(x, y, z);
    scene.add(part);
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
  const keypad = mesh(rbox(1.25, 0.46, 0.2, 0.06), legMat, { outline: 0.03 });
  keypad.position.set(4.3, -0.9, 3.98);
  keypad.rotation.x = -0.35;
  const keypadFace = printed(1.15, 0.4, 300, (c, w, h) => {
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
  scene.add(keypad);

  // ---------- full-viewport room: walls and floor extend beyond every camera shot ----------
  const room = new THREE.Group();
  scene.add(room);
  // Wood flooring: one tile of staggered planks repeated across the floor (8 × 8 units a tile)
  const floorMat = toon("#ffffff");
  const floorWood = canvasTexture(1024, 1024);
  track(floorWood.texture);
  drawWoodFloor(floorWood.ctx, 1024, 1024);
  floorWood.texture.wrapS = floorWood.texture.wrapT = THREE.RepeatWrapping;
  floorWood.texture.repeat.set(25, 25);
  floorMat.map = floorWood.texture;
  const backWallMat = toon("#ffffff");
  const sideWallMat = toon("#ffffff");
  const trimMat = toon("#ffffff");
  const roomBox = (w, h, d, material, x, y, z, outline = 0.055) => {
    const part = mesh(new THREE.BoxGeometry(w, h, d), material, { outline, cast: false });
    part.position.set(x, y, z);
    room.add(part);
    return part;
  };
  roomBox(200, 0.25, 200, floorMat, 0, FLOOR_Y - 0.17, 1.2);
  roomBox(200, 100, 0.24, backWallMat, 0, FLOOR_Y + 50, -6.68);
  // The room's ambient fill washes shadows off the wall, so the wall gets its own catcher: a
  // plane just in front of it that only shows where something's shadow lands
  const wallShadowMat = track(new THREE.ShadowMaterial({ color: "#1a1714", opacity: 0.32 }));
  const wallShadows = new THREE.Mesh(track(new THREE.PlaneGeometry(40, 24)), wallShadowMat);
  wallShadows.position.set(0, FLOOR_Y + 10, -6.555);
  wallShadows.receiveShadow = true;
  wallShadows.raycast = noRaycast;
  room.add(wallShadows);
  roomBox(0.24, 100, 200, sideWallMat, -8.88, FLOOR_Y + 50, 1.2);
  const sideShadows = new THREE.Mesh(track(new THREE.PlaneGeometry(30, 24)), wallShadowMat);
  sideShadows.rotation.y = Math.PI / 2;
  sideShadows.position.set(-8.745, FLOOR_Y + 10, 1.2);
  sideShadows.receiveShadow = true;
  sideShadows.raycast = noRaycast;
  room.add(sideShadows);
  roomBox(200, 0.22, 0.16, trimMat, 0, FLOOR_Y + 0.17, -6.45, 0.025);
  roomBox(0.16, 0.22, 200, trimMat, -8.65, FLOOR_Y + 0.17, 1.2, 0.025);

  // A framed illustration on the left wall: four panes, a sun/moon and angular trees.
  let roomDark = false;
  const windowGroup = new THREE.Group();
  windowGroup.position.set(-8.7, 3.9, -2.65);
  windowGroup.rotation.y = Math.PI / 2;
  room.add(windowGroup);
  // A clean white frame and sill. Unlit, like the printed view and its cross bars, so the side
  // wall's shading doesn't turn it grey: the whole window reads as one white
  const frameWood = track(new THREE.MeshBasicMaterial({ color: "#ffffff" }));
  const windowFrame = mesh(new THREE.BoxGeometry(4.4, 4.5, 0.18), frameWood, { cast: false, outline: 0.07 });
  // The view outside is animated (see drawWindowView): redrawn from the render loop, often
  // while it's zoomed in on, a few times a second otherwise
  const outside = { t: 0, flockAt: -99, starAt: -99, drawnAt: 0 };
  const windowView = printed(4.0, 4.1, 220, (c, w, h) => drawWindowView(c, w, h, { ...outside, dark: roomDark }));
  windowView.position.z = 0.105;
  windowGroup.add(windowFrame, windowView);
  const sill = mesh(new THREE.BoxGeometry(4.65, 0.18, 0.6), frameWood, { cast: false, outline: 0.045 });
  sill.position.set(0, -2.3, 0.14);
  windowGroup.add(sill);
  // Click the window to look out; click again for a flock of birds (or, at night, a shooting star)
  const lookOut = () => {
    if (roomDark) {
      if (outside.t - outside.starAt < 1.6) return;
      outside.starAt = outside.t;
      sfx.sparkle({ delay: 0.15 });
    } else {
      if (outside.t - outside.flockAt < 2) return;
      outside.flockAt = outside.t;
      [0.3, 0.75, 1.3].forEach((delay) => sfx.chirp({ delay }));
    }
  };
  register(windowGroup, { focus: "window", onArrive: lookOut, onClick: lookOut });

  // A guitar hanging on the left wall from a hook under its headstock. Click it for a strum;
  // it swings on the hook. Built standing up in its own plane, then turned to face the room.
  const guitar = new THREE.Group();
  guitar.position.set(-8.5, 1.6, 4.5);
  guitar.rotation.y = Math.PI / 2;
  room.add(guitar);
  const HOOK_Y = 3.98;
  const guitarSwing = new THREE.Group();
  guitarSwing.position.y = HOOK_Y;
  guitar.add(guitarSwing);
  const guitarParts = new THREE.Group();
  guitarParts.position.y = -HOOK_Y;
  guitarSwing.add(guitarParts);
  // Body outline: a big lower bout and a smaller upper one, pinched at the waist
  const bodyShape = new THREE.Shape();
  const halfWidth = (y) => {
    const lower = Math.abs(y) <= 0.95 ? Math.sqrt(0.95 ** 2 - y ** 2) : 0;
    const upper = Math.abs(y - 1.2) <= 0.72 ? Math.sqrt(0.72 ** 2 - (y - 1.2) ** 2) : 0;
    return Math.max(lower, upper) * (1 - 0.1 * Math.exp(-(((y - 0.75) / 0.25) ** 2)));
  };
  const outlineYs = Array.from({ length: 41 }, (_, k) => -0.95 + (k / 40) * 2.87);
  outlineYs.forEach((y, k) => (k ? bodyShape.lineTo(halfWidth(y), y) : bodyShape.moveTo(halfWidth(y), y)));
  [...outlineYs].reverse().forEach((y) => bodyShape.lineTo(-halfWidth(y), y));
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
  bodyGeo.translate(0, 0, -0.16);
  const guitarBody = mesh(bodyGeo, toon("#e98a3d"), { outline: 0.04 });
  const flat = (geo, color, x, y, z) => {
    const m = new THREE.Mesh(track(geo), track(new THREE.MeshBasicMaterial({ color })));
    m.position.set(x, y, z);
    return m;
  };
  const soundRing = flat(new THREE.RingGeometry(0.3, 0.38, 40), "#fffdf5", 0, 1.15, 0.195);
  const soundHole = flat(new THREE.CircleGeometry(0.3, 40), "#1a1714", 0, 1.15, 0.195);
  const bridge = mesh(rbox(0.7, 0.14, 0.05, 0.02), toon("#1a1714"), { outline: 0.02 });
  bridge.position.set(0, -0.15, 0.21);
  const guitarNeck = mesh(rbox(0.26, 2.3, 0.14, 0.04), toon("#7a4a26"), { outline: 0.03 });
  guitarNeck.position.set(0, 2.85, 0.06);
  const fretboard = flat(new THREE.PlaneGeometry(0.24, 2.3), "#2a1a10", 0, 2.85, 0.135);
  const frets = Array.from({ length: 9 }, (_, k) => flat(new THREE.PlaneGeometry(0.24, 0.02), "#d9d4c7", 0, 3.95 - k * 0.24 * (1 - k * 0.03), 0.137));
  const headstock = mesh(rbox(0.46, 0.7, 0.1, 0.05), toon("#2a1a10"), { outline: 0.03 });
  headstock.position.set(0, 4.36, 0.04);
  const pegMat = toon("#d9d4c7");
  const pegs = [];
  [-1, 1].forEach((side) => [0, 1, 2].forEach((k) => {
    const peg = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 10), pegMat, { outline: 0.015, cast: false });
    peg.rotation.z = Math.PI / 2;
    peg.position.set(side * 0.3, 4.15 + k * 0.2, 0.04);
    pegs.push(peg);
  }));
  const stringMat = track(new THREE.MeshBasicMaterial({ color: "#f4f2ee" }));
  const stringGeo = track(new THREE.BoxGeometry(0.008, 4.15, 0.008));
  const strings = Array.from({ length: 6 }, (_, k) => {
    const str = new THREE.Mesh(stringGeo, stringMat);
    str.position.set(-0.085 + k * 0.034, 1.925, 0.23);
    return str;
  });
  guitarParts.add(guitarBody, soundRing, soundHole, bridge, guitarNeck, fretboard, ...frets, headstock, ...pegs, ...strings);
  // The hook: a plate on the wall and two arms the headstock rests on
  const hookMat = toon("#1a1714");
  const hookPlate = mesh(rbox(0.34, 0.5, 0.06, 0.02), hookMat, { outline: 0.02 });
  hookPlate.position.set(0, HOOK_Y, -0.23);
  guitar.add(hookPlate);
  [-0.2, 0.2].forEach((x) => {
    guitar.add(rod(new THREE.Vector3(x, HOOK_Y, -0.22), new THREE.Vector3(x, HOOK_Y, 0.12), 0.03, hookMat, 0.015));
    guitar.add(rod(new THREE.Vector3(x, HOOK_Y, 0.12), new THREE.Vector3(x, HOOK_Y + 0.12, 0.15), 0.03, hookMat, 0.015));
  });
  register(guitarSwing, {
    onClick: () => {
      sfx.strum();
      gsap.fromTo(guitarSwing.rotation, { z: 0.09 * (Math.random() < 0.5 ? -1 : 1) }, { z: 0, duration: 1.6, ease: "elastic.out(1, 0.25)", overwrite: true });
      // The strings shimmer for a moment
      gsap.fromTo(stringMat.color, { r: 1, g: 0.87, b: 0 }, { r: 0.957, g: 0.949, b: 0.933, duration: 1.2, ease: "power2.out" });
    },
  });

  // Project the four window panes onto receiving surfaces, including desk props.
  const paneLight = canvasTexture(512, 512);
  track(paneLight.texture);
  paneLight.ctx.fillStyle = "#000";
  paneLight.ctx.fillRect(0, 0, 512, 512);
  paneLight.ctx.fillStyle = "#fff";
  for (const x of [80, 264]) for (const y of [80, 264]) paneLight.ctx.fillRect(x, y, 168, 168);
  paneLight.texture.needsUpdate = true;
  const windowLight = new THREE.SpotLight(0xffe5ad, 110, 55, 0.58, 0.04, 2);
  windowLight.position.set(-8.4, 4.5, -2.65);
  windowLight.target.position.set(1, -1, 1);
  windowLight.map = paneLight.texture;
  windowLight.castShadow = true;
  windowLight.shadow.mapSize.set(1024, 1024);
  windowLight.shadow.bias = -0.0002;
  windowLight.shadow.normalBias = 0.03;
  scene.add(windowLight, windowLight.target);

  // Wall clock and a small print give the empty upper area a purpose.
  const clock = new THREE.Group();
  // Lined up over the monitor as seen from the desk view
  // Low enough that its top stays in frame on wide, short screens
  clock.position.set(-1.5, 4.95, -6.43);
  room.add(clock);
  const clockRim = mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.15, 12), toon("#7fb2ff"), { outline: 0.06 });
  clockRim.rotation.x = Math.PI / 2;
  const clockFace = new THREE.Mesh(track(new THREE.CircleGeometry(0.76, 48)), track(new THREE.MeshBasicMaterial({ color: "#fffdf5" })));
  clockFace.position.z = 0.09;
  const clockHandMat = toon("#000000");
  const hourHand = new THREE.Group();
  const minuteHand = new THREE.Group();
  [[hourHand, 0.42], [minuteHand, 0.62]].forEach(([pivot, length]) => {
    const hand = mesh(new THREE.BoxGeometry(0.075, length, 0.025), clockHandMat, { cast: false, outline: 0 });
    hand.position.y = length / 2;
    pivot.position.z = 0.13;
    pivot.add(hand);
  });
  clock.add(clockRim, clockFace, hourHand, minuteHand);
  const updateRoomClock = () => {
    const now = new Date();
    minuteHand.rotation.z = -(now.getMinutes() / 60) * Math.PI * 2;
    hourHand.rotation.z = -((now.getHours() % 12 + now.getMinutes() / 60) / 12) * Math.PI * 2;
  };
  updateRoomClock();
  // Click the clock: its hands whirl round twice, it rocks on its nail, then strikes the hour
  let clockBusy = false;
  register(clock, {
    onHover: (on) => on && gsap.fromTo(clock.rotation, { z: 0.06 }, { z: 0, duration: 0.8, ease: "elastic.out(1, 0.3)" }),
    onClick: () => {
      if (clockBusy) return;
      clockBusy = true;
      gsap.to(minuteHand.rotation, { z: minuteHand.rotation.z - Math.PI * 4, duration: 1.4, ease: "power2.inOut" });
      gsap.to(hourHand.rotation, {
        z: hourHand.rotation.z - Math.PI * 2, duration: 1.4, ease: "power2.inOut",
        onComplete: () => {
          updateRoomClock();
          clockBusy = false;
          gsap.fromTo(clock.rotation, { z: 0.14 }, { z: 0, duration: 1.4, ease: "elastic.out(1, 0.2)" });
          gsap.fromTo(clock.scale, { x: 1.1, y: 1.1 }, { x: 1, y: 1, duration: 0.5, ease: "back.out(3)" });
          sfx.chime();
        },
      });
      for (let i = 0; i < 8; i++) sfx.tick({ pitch: 1.4, delay: i * 0.17 });
    },
  });
  const rugTex = canvasTexture(1600, 1150);
  track(rugTex.texture);
  drawRug(rugTex.ctx, 1600, 1150);
  const rugTop = new THREE.Mesh(track(new THREE.PlaneGeometry(16, 11.5)), toon("#ffffff"));
  rugTop.material.map = rugTex.texture;
  rugTop.rotation.x = -Math.PI / 2;
  rugTop.position.set(0.4, FLOOR_Y + 0.07, 2.4);
  rugTop.receiveShadow = true;
  rugTop.raycast = noRaycast;
  const rugBase = mesh(rbox(16, 0.08, 11.5, 0.03), toon("#1a1714"), { outline: 0.03, cast: false });
  rugBase.position.set(0.4, FLOOR_Y + 0.025, 2.4);
  rugBase.raycast = noRaycast;
  room.add(rugBase, rugTop);

  // A framed painting hung from a nail on a wire. It's a little gallery: click it and it swings,
  // turns over and shows the next picture (a sunset, a city at night, a great wave).
  const PAINTING_DROP = 1.75; // nail to the painting's centre
  const paintingHang = new THREE.Group();
  // Hung low enough that the frame and its nail stay in frame on wide, short screens
  paintingHang.position.set(-5.6, 3.4 + PAINTING_DROP, -6.44);
  room.add(paintingHang);
  const paintingTurn = new THREE.Group();
  paintingTurn.position.y = -PAINTING_DROP;
  paintingHang.add(paintingTurn);
  // The frame casts onto the wall's shadow catcher
  const paintingFrame = mesh(new THREE.BoxGeometry(4.0, 2.9, 0.16), toon("#1a1714"), { outline: 0.055, cast: true });
  let paintingArt = 0;
  const painting = printed(3.75, 2.65, 220, (c, w, h) => drawPainting(c, w, h, { art: paintingArt }));
  painting.position.z = 0.09;
  paintingTurn.add(paintingFrame, painting);
  const nail = mesh(new THREE.SphereGeometry(0.07, 10, 8), toon("#9ca3af"), { outline: 0.015 });
  nail.position.z = 0.06;
  paintingHang.add(nail);
  [-1, 1].forEach((side) => paintingHang.add(rod(new THREE.Vector3(0, 0, 0.02), new THREE.Vector3(side * 1.3, -PAINTING_DROP + 1.45, 0.02), 0.015, toon("#1a1714"), 0)));
  let paintingBusy = false;
  register(paintingHang, {
    onHover: (on) => on && gsap.fromTo(paintingHang.rotation, { z: 0.025 }, { z: 0, duration: 1, ease: "elastic.out(1, 0.3)" }),
    onClick: () => {
      if (paintingBusy) return;
      paintingBusy = true;
      gsap.fromTo(paintingHang.rotation, { z: 0.09 }, { z: 0, duration: 1.6, ease: "elastic.out(1, 0.25)" });
      // Squashed edge-on and back (a turn round its vertical axis would go through the wall)
      gsap.timeline({ onComplete: () => (paintingBusy = false) })
        .to(paintingTurn.scale, { x: 0.02, duration: 0.2, ease: "power2.in" })
        .call(() => {
          paintingArt = (paintingArt + 1) % PAINTING_COUNT;
          painting.userData.tex.redraw();
        })
        .to(paintingTurn.scale, { x: 1, duration: 0.35, ease: "back.out(2)" });
      sfx.slide({ up: true });
      sfx.knock({ strength: 0.6, delay: 0.5 });
    },
  });

  // A rod between two points (lamp arms, plant stems, chair parts)
  function rod(a, b, radius, material, outline = 0.025) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const m = mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), 12), material, { outline });
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(UP, dir.normalize());
    return m;
  }

  // Seat height is roughly 60% of desk height, with a full-size back and armrests.
  const chair = new THREE.Group();
  chair.position.set(-3.1, 0, 7.0);
  chair.rotation.y = -0.22;
  room.add(chair);
  const chairMat = toon("#45474d");
  const chairFrameMat = toon("#1a1714");
  // Sized against the desk: the desk is 14 wide (about 140 cm), so the seat is about 55 cm
  // across and sits at roughly 60% of the desk's height. A racing-style gaming chair: a bucket
  // seat with raised side bolsters, a tall back that flares into shoulder wings and narrows to
  // a headrest with two harness slots, stripes down its back, and block armrests.
  const roundedSlab = (w, h, depth, radius) => {
    const shape = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    shape.moveTo(x + radius, y);
    shape.lineTo(x + w - radius, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + radius);
    shape.lineTo(x + w, y + h - radius);
    shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    shape.lineTo(x + radius, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 4, curveSegments: 12 });
    geo.center();
    return geo;
  };
  const seatGeo = roundedSlab(4.8, 4.3, 0.32, 1.0);
  seatGeo.rotateX(-Math.PI / 2);
  const chairSeat = mesh(seatGeo, chairMat, { outline: 0.06 });
  chairSeat.position.y = -2.05;
  // Bucket seat bolsters
  const bolsters = [-2.25, 2.25].map((x) => {
    const bolster = mesh(rbox(0.8, 0.6, 4.1, 0.28), chairFrameMat, { outline: 0.04 });
    bolster.position.set(x, -1.8, 0);
    return bolster;
  });
  // The back's outline, bottom to top: lumbar, shoulder wings, neck, headrest
  const BACK_H = 5.25;
  const backProfile = [[1.95, 0], [2.2, 1.2], [2.6, 3.0], [2.3, 3.7], [1.7, 4.1], [1.8, 4.8], [1.35, BACK_H]];
  const backShape = new THREE.Shape();
  backShape.moveTo(-1.95, 0);
  backShape.lineTo(1.95, 0);
  backShape.splineThru(backProfile.slice(1).map(([x, y]) => new THREE.Vector2(x, y)));
  backShape.lineTo(-1.35, BACK_H);
  backShape.splineThru(backProfile.slice(0, -1).reverse().map(([x, y]) => new THREE.Vector2(-x, y)));
  const backGeo = new THREE.ExtrudeGeometry(backShape, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3, curveSegments: 16 });
  backGeo.translate(0, -BACK_H / 2, -0.2);
  const chairBack = mesh(backGeo, chairMat, { outline: 0.06 });
  chairBack.position.set(0, -1.7 + BACK_H / 2, 2.05);
  chairBack.rotation.x = -0.12;
  // Harness slots by the headrest, printed flat on the back (real holes break the outline)
  [-0.75, 0.75].forEach((x) => {
    const slot = new THREE.Mesh(track(new THREE.CircleGeometry(1, 24)), chairFrameMat);
    slot.scale.set(0.34, 0.17, 1);
    slot.position.set(x, 4.35 - BACK_H / 2, 0.311);
    chairBack.add(slot);
  });
  // Racing stripes down the back (the side the room sees)
  [-0.55, 0.55].forEach((x) => {
    const stripe = new THREE.Mesh(track(new THREE.PlaneGeometry(0.32, 3.4)), chairFrameMat);
    stripe.position.set(x, -0.55, 0.311);
    chairBack.add(stripe);
  });
  const chairPost = mesh(new THREE.CylinderGeometry(0.2, 0.28, 2.6, 16), chairFrameMat, { outline: 0.03 });
  chairPost.position.y = -3.6;
  const backPost = rod(new THREE.Vector3(0, -2.1, 1.6), new THREE.Vector3(0, -1.2, 2.1), 0.16, chairFrameMat, 0.03);
  // Everything above the gas lift turns on it: seat, back and armrests
  const chairTop = new THREE.Group();
  chairTop.add(chairSeat, ...bolsters, chairBack, backPost);
  chair.add(chairTop, chairPost);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const tip = new THREE.Vector3(Math.cos(angle) * 2.3, FLOOR_Y + 0.42, Math.sin(angle) * 2.3);
    chair.add(rod(new THREE.Vector3(0, FLOOR_Y + 0.55, 0), tip, 0.13, chairFrameMat, 0.025));
    const wheel = mesh(new THREE.SphereGeometry(0.24, 14, 10), chairFrameMat, { outline: 0.02 });
    wheel.position.set(tip.x, FLOOR_Y + 0.24, tip.z);
    chair.add(wheel);
  }
  // Block armrests: a post up from under the seat and a padded top
  for (const x of [-2.95, 2.95]) {
    const armPost = mesh(rbox(0.32, 1.3, 0.45, 0.08), chairFrameMat, { outline: 0.03 });
    armPost.position.set(x, -1.5, 0.45);
    const armPad = mesh(rbox(0.6, 0.22, 2.1, 0.1), chairFrameMat, { outline: 0.03 });
    armPad.position.set(x, -0.8, 0.2);
    chairTop.add(armPost, armPad);
  }
  // Click it for a spin: the gas lift sinks with a hiss and springs back, the seat whirls round
  // on its post and the whole chair rolls back a little on its casters and back again
  let chairBusy = false;
  register(chair, {
    onHover: (on) => on && gsap.fromTo(chairTop.rotation, { y: 0.08 }, { y: 0, duration: 0.9, ease: "elastic.out(1, 0.3)" }),
    onClick: () => {
      if (chairBusy) return;
      chairBusy = true;
      const z = chair.position.z;
      gsap.timeline({ onComplete: () => (chairBusy = false) })
        .to(chairTop.position, { y: -0.35, duration: 0.18, ease: "power2.in" })
        .to(chairTop.position, { y: 0, duration: 0.7, ease: "elastic.out(1.1, 0.35)" })
        .fromTo(chairTop.rotation, { y: 0 }, { y: Math.PI * 2, duration: 1.5, ease: "power3.out" }, 0.12)
        .to(chair.position, { z: z + 0.5, duration: 0.5, ease: "power2.out" }, 0.1)
        .to(chair.position, { z, duration: 0.9, ease: "power2.inOut" }, 0.7);
      sfx.hiss();
      sfx.creak({ delay: 0.15 });
      sfx.patter({ duration: 0.5, delay: 0.1 });
    },
  });

  // ---------- desk lamp (back-left): a light switch for the night shift ----------
  const lamp = new THREE.Group();
  scene.add(lamp);
  const lampMat = toon("#ffdd00");
  const jointMat = toon("#1a1714");
  const LAMP_BASE = new THREE.Vector3(-6.0, 0, -3.45);
  const ELBOW = new THREE.Vector3(-5.55, 3.1, -3.45);
  const WRIST = new THREE.Vector3(-4.45, 3.75, -3.1);
  const AIM = new THREE.Vector3(-1.8, 0, 0.8);
  const lampBase = mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.2, 24), jointMat, { outline: 0.04 });
  lampBase.position.copy(LAMP_BASE).setY(0.1);
  lamp.add(lampBase, rod(LAMP_BASE.clone().setY(0.2), ELBOW, 0.08, lampMat), rod(ELBOW, WRIST, 0.08, lampMat));
  [ELBOW, WRIST].forEach((p) => {
    const joint = mesh(new THREE.SphereGeometry(0.15, 14, 10), jointMat, { outline: 0.025 });
    joint.position.copy(p);
    lamp.add(joint);
  });
  // The head looks at the desk; the shade opens toward it (+z after lookAt)
  const lampHead = new THREE.Group();
  lampHead.position.copy(WRIST);
  lampHead.lookAt(AIM);
  const shade = mesh(new THREE.ConeGeometry(0.6, 0.85, 28), lampMat, { outline: 0.04 });
  shade.rotation.x = -Math.PI / 2;
  shade.position.z = 0.35;
  const bulbMat = track(new THREE.MeshBasicMaterial({ color: "#d9d4c7" }));
  const bulb = new THREE.Mesh(track(new THREE.SphereGeometry(0.22, 16, 12)), bulbMat);
  bulb.position.z = 0.72;
  // The actual bulb lights the work surface and casts shadows away from the lamp.
  // Place it beyond the shade opening so its own housing cannot block the beam.
  const lampLight = new THREE.SpotLight(0xffd394, 0, 22, 0.7, 0.4, 2);
  lampLight.position.z = 0.86;
  lampLight.target.position.z = WRIST.distanceTo(AIM);
  lampLight.shadow.mapSize.set(1024, 1024);
  lampLight.shadow.camera.near = 0.2;
  lampLight.shadow.camera.far = 22;
  lampLight.shadow.bias = -0.0002;
  lampLight.shadow.normalBias = 0.02;
  lampHead.add(shade, bulb, lampLight, lampLight.target);
  lamp.add(lampHead);
  const setLamp = (on) => {
    bulbMat.color.set(on ? "#fff6c2" : "#d9d4c7");
    lampLight.intensity = on ? 55 : 0;
    lampLight.castShadow = on;
  };
  register(lamp, {
    onHover: (on) => gsap.to(lampHead.rotation, { z: on ? 0.12 : 0, duration: 0.3, ease: "back.out(3)" }),
    onClick: () => {
      sfx.click();
      onEvent("nightShift", { dark: !darkNow });
    },
  });

  // ---------- potted plant (back-right, decor) ----------
  const plant = new THREE.Group();
  plant.position.set(5.45, 0, -3.2);
  scene.add(plant);
  const potProfile = [
    [0, 0],
    [0.48, 0],
    [0.58, 0.95],
    [0.66, 0.95],
    [0.66, 1.12],
    [0.52, 1.12],
    [0.5, 1.0],
    [0, 1.0],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const pot = mesh(new THREE.LatheGeometry(potProfile, 28), toon("#ff7a1a"), { outline: 0.045 });
  const soil = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 24), toon("#3b2a1a"), { outline: 0, cast: false });
  soil.position.y = 1.02;
  const foliage = new THREE.Group();
  foliage.position.y = 1.02;
  plant.add(pot, soil, foliage);
  const stemMat = toon("#166534");
  const leafMats = [toon("#16a34a"), toon("#8fd694")];
  const veinMat = toon("#166534");
  // Teardrop leaves, each on its own stem: the stem runs from the soil to the leaf's base, and the
  // leaf leans out from there toward its heading. [heading°, base height, lean, length, width]
  const leafShape = (length, width) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(width * 0.62, length * 0.12, width * 0.58, length * 0.68, 0, length);
    shape.bezierCurveTo(-width * 0.58, length * 0.68, -width * 0.62, length * 0.12, 0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false, curveSegments: 12 });
    geo.translate(0, 0, -0.015);
    return geo;
  };
  [
    [20, 0.3, 0.85, 1.5, 0.62], [100, 0.4, 0.8, 1.6, 0.6], [170, 0.5, 0.7, 1.5, 0.58], [250, 0.35, 0.85, 1.6, 0.62],
    [320, 0.55, 0.65, 1.4, 0.56], [60, 0.7, 0.45, 1.35, 0.52], [210, 0.8, 0.4, 1.35, 0.52],
  ].forEach(([heading, height, lean, length, width], i) => {
    const angle = THREE.MathUtils.degToRad(heading);
    const base = new THREE.Vector3(Math.sin(angle) * 0.16, height, Math.cos(angle) * 0.16);
    foliage.add(rod(new THREE.Vector3(0, 0, 0), base, 0.035, stemMat, 0.015));
    const leaf = new THREE.Group();
    leaf.position.copy(base);
    leaf.rotation.set(lean, angle, 0, "YXZ");
    const blade = mesh(leafShape(length, width), leafMats[i % 2], { outline: 0.025 });
    const vein = mesh(new THREE.BoxGeometry(0.025, length * 0.78, 0.04), veinMat, { outline: 0, cast: false });
    vein.position.y = length * 0.42;
    leaf.add(blade, vein);
    foliage.add(leaf);
  });
  // Each click wiggles it and opens one of three flowers: they stand on their own stems above the
  // leaves as closed green buds until then. With all three open, a butterfly comes over and
  // flutters round it for a while.
  const petalGeo = new THREE.SphereGeometry(1, 14, 10);
  const facing = new THREE.Vector3(0.48, 0.72, 1).normalize(); // toward the overview camera
  const flowers = [
    [-0.22, 2.5, 0.02, "#ff90e8"], [0.3, 2.25, 0.1, "#fffdf5"], [0.04, 2.0, 0.36, "#ffdd00"],
  ].map(([x, y, z, color], i) => {
    const tip = new THREE.Vector3(x, y, z);
    foliage.add(rod(new THREE.Vector3(0, 0, 0), tip, 0.03, stemMat, 0.015));
    const head = new THREE.Group();
    head.position.copy(tip);
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), facing);
    const bud = mesh(petalGeo, toon("#8fd694"), { outline: 0.02 });
    bud.scale.set(0.11, 0.11, 0.15);
    const bloom = new THREE.Group();
    const petalMat = toon(color);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const petal = mesh(petalGeo, petalMat, { outline: 0.018 });
      petal.scale.set(0.17, 0.1, 0.035);
      petal.position.set(Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0);
      petal.rotation.z = a;
      bloom.add(petal);
    }
    const centre = mesh(petalGeo, toon(i === 2 ? "#ff7a1a" : "#ffdd00"), { outline: 0.018 });
    centre.scale.set(0.1, 0.1, 0.06);
    centre.position.z = 0.03;
    bloom.add(centre);
    bloom.scale.setScalar(0.001);
    head.add(bud, bloom);
    foliage.add(head);
    return { bud, bloom };
  });
  let bloomed = 0;

  // The butterfly: a little body and two wings on hinges, flown along a loop by the render loop
  const butterfly = new THREE.Group();
  butterfly.visible = false;
  scene.add(butterfly);
  const wingGeo = new THREE.SphereGeometry(1, 14, 8);
  const wingMat = toon("#ff7a1a");
  const wings = [-1, 1].map((side) => {
    const hinge = new THREE.Group();
    const upper = mesh(wingGeo, wingMat, { outline: 0.012 });
    upper.scale.set(0.2, 0.015, 0.16);
    upper.position.set(side * 0.2, 0, -0.06);
    const lower = mesh(wingGeo, toon("#ffdd00"), { outline: 0.012 });
    lower.scale.set(0.13, 0.014, 0.11);
    lower.position.set(side * 0.13, 0, 0.13);
    hinge.add(upper, lower);
    butterfly.add(hinge);
    return { hinge, side };
  });
  const bugBody = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 8), toon("#1a1714"), { outline: 0.01 });
  bugBody.rotation.x = Math.PI / 2;
  butterfly.add(bugBody);
  const flight = { active: false, t: 0, leaving: 0 };
  const FLIGHT_TIME = 8;
  function updateButterfly(dt, now) {
    if (!flight.active) return;
    flight.t += dt;
    const t = flight.t;
    // A lazy figure-eight round the plant, dipping toward the flowers
    const p = plant.position;
    const x = p.x + Math.sin(t * 1.1) * 1.3;
    const z = p.z + Math.sin(t * 2.2) * 0.7 + 0.3;
    let y = 3.8 + Math.sin(t * 1.7) * 0.35;
    // Arriving from above, leaving up and to the right
    const arrive = Math.min(1, t / 1.2);
    const leave = Math.max(0, t - FLIGHT_TIME);
    y += (1 - arrive) * 4 + leave * leave * 2.5;
    const prev = butterfly.position.clone();
    butterfly.position.set(x + leave * leave * 2, y, z);
    const vx = butterfly.position.x - prev.x;
    const vz = butterfly.position.z - prev.z;
    if (Math.hypot(vx, vz) > 1e-4) butterfly.rotation.y = Math.atan2(-vx, -vz);
    const flap = Math.sin(now * 0.045) * 1.0;
    wings.forEach(({ hinge, side }) => (hinge.rotation.z = side * flap));
    if (leave > 1.6) {
      flight.active = false;
      butterfly.visible = false;
    }
  }
  function callButterfly() {
    if (flight.active) return;
    flight.active = true;
    flight.t = 0;
    butterfly.visible = true;
    sfx.bloom({ pitch: 1.8 });
  }

  register(plant, {
    onHover: (on) => on && gsap.fromTo(foliage.rotation, { z: 0.06 }, { z: 0, duration: 1.2, ease: "elastic.out(1, 0.3)" }),
    onClick: () => {
      gsap.fromTo(foliage.rotation, { z: 0.15 }, { z: 0, duration: 1.4, ease: "elastic.out(1, 0.25)" });
      gsap.fromTo(pot.scale, { x: 1.12, y: 0.88, z: 1.12 }, { x: 1, y: 1, z: 1, duration: 0.6, ease: "elastic.out(1.2, 0.35)" });
      sfx.leaves();
      if (bloomed < flowers.length) {
        const { bud, bloom } = flowers[bloomed++];
        gsap.to(bud.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.2, ease: "back.in(2)" });
        gsap.to(bloom.scale, { x: 1, y: 1, z: 1, duration: 0.6, delay: 0.12, ease: "back.out(3)" });
        gsap.fromTo(bloom.rotation, { z: -1.6 }, { z: 0, duration: 0.8, delay: 0.12, ease: "power3.out" });
        sfx.bloom({ pitch: 1 + bloomed * 0.25, delay: 0.12 });
      }
      if (bloomed === flowers.length) timers.push(setTimeout(callButterfly, 500));
    },
  });

  // ---------- shelf (right of the desk): books and a little game collection ----------
  // Bottom to top: a console with its controllers, a row of books, game cases and a robot,
  // a book stack with a trophy and a handheld, and a mushroom figure on top. Click anything
  // on it for a little hop.
  const shelf = new THREE.Group();
  // Clear of the About board on the wall (it spans x 1.2–8.0)
  shelf.position.set(10.5, FLOOR_Y, -5.6);
  scene.add(shelf);
  const SHELF_W = 4.2;
  const SHELF_D = 1.5;
  const SHELF_H = 8.4;
  const BOARD = 0.22;
  const shelfMat = toon("#c98a4b");
  [-1, 1].forEach((side) => {
    const panel = mesh(rbox(BOARD, SHELF_H, SHELF_D, 0.04), shelfMat, { outline: 0.05 });
    panel.position.set(side * (SHELF_W / 2 - BOARD / 2), SHELF_H / 2, 0);
    shelf.add(panel);
  });
  const shelfBack = mesh(rbox(SHELF_W, SHELF_H, 0.12, 0.03), toon("#9c6230"), { outline: 0.04 });
  shelfBack.position.set(0, SHELF_H / 2, -SHELF_D / 2 + 0.06);
  shelf.add(shelfBack);
  const LEVELS = [0.15, 2.25, 4.35, 6.4, SHELF_H - BOARD / 2];
  LEVELS.forEach((y) => {
    const board = mesh(rbox(SHELF_W, BOARD, SHELF_D, 0.04), shelfMat, { outline: 0.045 });
    board.position.y = y;
    shelf.add(board);
  });
  const standOn = (level) => LEVELS[level] + BOARD / 2;
  const shelfItems = [];
  const addItem = (obj, sound) => {
    obj.userData.restY = obj.position.y;
    shelf.add(obj);
    shelfItems.push({ obj, sound });
    return obj;
  };
  const group = (...children) => {
    const g = new THREE.Group();
    g.add(...children);
    return g;
  };
  const at = (obj, x, y, z = 0, rz = 0) => {
    obj.position.set(x, y, z);
    obj.rotation.z = rz;
    return obj;
  };
  const PALETTE = ["#ff6b6b", "#ffdd00", "#00e0c6", "#ff90e8", "#8fd694", "#3b82f6", "#ffb35c", "#c4b5fd", "#fffdf5"];
  const black = toon("#1a1714");
  const white = toon("#fffdf5");

  // Level 0: console + two controllers
  const led = new THREE.Mesh(track(new THREE.SphereGeometry(0.05, 10, 8)), track(new THREE.MeshBasicMaterial({ color: "#16a34a" })));
  const consoleBody = group(
    mesh(rbox(1.9, 0.5, 1.05, 0.08), white, { outline: 0.035 }),
    at(mesh(rbox(1.92, 0.08, 1.07, 0.02), toon("#e11d48"), { outline: 0 }), 0, 0.05, 0),
    at(mesh(rbox(0.5, 0.05, 0.02, 0.01), black, { outline: 0 }), 0.35, -0.08, 0.53),
    at(led, -0.7, -0.08, 0.54),
  );
  addItem(at(consoleBody, -0.75, standOn(0) + 0.25, 0.05), "console");
  const controller = (color) => {
    const c = toon(color);
    const pad = group(
      mesh(rbox(0.85, 0.2, 0.42, 0.09), c, { outline: 0.03 }),
      at(mesh(rbox(0.32, 0.22, 0.48, 0.1), c, { outline: 0.03 }), -0.4, 0, 0.1),
      at(mesh(rbox(0.32, 0.22, 0.48, 0.1), c, { outline: 0.03 }), 0.4, 0, 0.1),
      at(mesh(rbox(0.2, 0.05, 0.06, 0.01), black, { outline: 0 }), -0.24, 0.11, 0),
      at(mesh(rbox(0.06, 0.05, 0.2, 0.01), black, { outline: 0 }), -0.24, 0.11, 0),
      at(mesh(new THREE.SphereGeometry(0.05, 10, 8), toon("#ffdd00"), { outline: 0 }), 0.22, 0.11, -0.05),
      at(mesh(new THREE.SphereGeometry(0.05, 10, 8), toon("#ff6b6b"), { outline: 0 }), 0.32, 0.11, 0.05),
    );
    return pad;
  };
  addItem(at(controller("#1a1714"), 1.05, standOn(0) + 0.11, 0.25), "controller").rotation.y = -0.3;
  const pad2 = addItem(at(controller("#ff90e8"), 1.15, standOn(0) + 0.33, -0.05), "controller");
  pad2.rotation.set(0, 0.25, 0);

  // Level 1: a row of books, one leaning, and a mushroom figure
  let x = -1.78;
  [
    [0.26, 1.55], [0.22, 1.35], [0.32, 1.7], [0.2, 1.25], [0.28, 1.6], [0.24, 1.45], [0.3, 1.5],
  ].forEach(([w, h], i) => {
    const book = mesh(rbox(w, h, 1.0, 0.03), toon(PALETTE[i % PALETTE.length]), { outline: 0.03 });
    const band = mesh(rbox(w + 0.004, 0.08, 1.004, 0.01), black, { outline: 0 });
    band.position.y = h * 0.3;
    addItem(at(group(book, band), x + w / 2, standOn(1) + h / 2, 0.1), "book");
    x += w + 0.03;
  });
  const leaning = mesh(rbox(0.26, 1.4, 1.0, 0.03), toon("#00e0c6"), { outline: 0.03 });
  addItem(at(group(leaning), x + 0.42, standOn(1) + 0.66, 0.1, -0.32), "book");
  const mushroom = group(
    at(mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.42, 14), white, { outline: 0.025 }), 0, 0.21, 0),
    at(mesh(new THREE.SphereGeometry(0.4, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon("#e11d48"), { outline: 0.03 }), 0, 0.38, 0),
  );
  [[0.15, 0.62, 0.22], [-0.2, 0.6, 0.18], [0.02, 0.72, -0.12]].forEach(([dx, dy, dz]) =>
    mushroom.add(at(mesh(new THREE.SphereGeometry(0.07, 10, 8), white, { outline: 0 }), dx, dy, dz)),
  );
  addItem(at(mushroom, 1.45, standOn(1), 0.15), "figure");

  // Level 2: a row of game cases, spines out, one standing face-out beside them, and a little robot.
  // Each case's plastic is its platform's colour; the spine is printed with the game on it.
  const PLATFORMS = ["#e11d48", "#3b82f6", "#16a34a", "#1a1714"];
  const GAMES = [
    ["PIXEL KART", "#ffdd00"], ["SKY QUEST", "#7fdfff"], ["NEON RUN", "#ff90e8"], ["TINY KNIGHT", "#fffdf5"],
    ["MOON DASH", "#c4b5fd"], ["SLIME LAND", "#8fd694"], ["RACE 99", "#ffb35c"], ["ROBO BRAWL", "#00e0c6"], ["DUNGEON 64", "#ff6b6b"],
  ];
  x = -1.8;
  GAMES.forEach(([title, art], i) => {
    const platform = PLATFORMS[i % PLATFORMS.length];
    const caseMesh = mesh(rbox(0.15, 1.15, 0.82, 0.02), toon(platform), { outline: 0.022 });
    const spine = printed(0.13, 1.11, 420, (c, w, h) => drawGameSpine(c, w, h, { platform, art, title, i }));
    spine.position.z = 0.412;
    addItem(at(group(caseMesh, spine), x + 0.075, standOn(2) + 0.575, 0.2), "case");
    x += 0.17;
  });
  const cover = printed(0.78, 1.11, 300, (c, w, h) => drawGameCover(c, w, h));
  cover.position.z = 0.076;
  // On a little black display stand, so its foot sits well clear of the shelf's front edge
  const caseStand = at(mesh(rbox(0.56, 0.12, 0.34, 0.03), black, { outline: 0.02 }), 0, -0.635, -0.04);
  const faceOut = group(mesh(rbox(0.82, 1.15, 0.14, 0.03), toon("#e11d48"), { outline: 0.025 }), cover, caseStand);
  addItem(at(faceOut, 0.36, standOn(2) + 0.695, 0.15), "case").rotation.set(-0.06, 0.12, 0);
  const robot = group(
    at(mesh(rbox(0.52, 0.55, 0.42, 0.08), toon("#00e0c6"), { outline: 0.03 }), 0, 0.28, 0),
    at(mesh(rbox(0.44, 0.38, 0.38, 0.08), white, { outline: 0.03 }), 0, 0.76, 0),
    at(mesh(rbox(0.08, 0.1, 0.02, 0.01), black, { outline: 0 }), -0.1, 0.78, 0.19),
    at(mesh(rbox(0.08, 0.1, 0.02, 0.01), black, { outline: 0 }), 0.1, 0.78, 0.19),
    rod(new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(0, 1.2, 0), 0.025, black, 0),
    at(mesh(new THREE.SphereGeometry(0.07, 10, 8), toon("#ff6b6b"), { outline: 0.015 }), 0, 1.24, 0),
  );
  addItem(at(robot, 1.15, standOn(2), 0.1), "figure");

  // Level 3: a stack of books lying down, a trophy, and a handheld console
  [[1.3, 0.24, "#ffb35c"], [1.15, 0.2, "#3b82f6"], [1.25, 0.26, "#ff90e8"]].reduce((y, [w, h, color]) => {
    addItem(at(group(mesh(rbox(w, h, 0.95, 0.03), toon(color), { outline: 0.03 })), -1.05, y + h / 2, 0.1), "book");
    return y + h;
  }, standOn(3));
  const trophyProfile = [[0, 0], [0.28, 0], [0.28, 0.08], [0.08, 0.14], [0.08, 0.42], [0.3, 0.6], [0.36, 0.95], [0.3, 0.95], [0.24, 0.66], [0, 0.6]].map(([px, py]) => new THREE.Vector2(px, py));
  addItem(at(group(mesh(new THREE.LatheGeometry(trophyProfile, 24), toon("#ffdd00"), { outline: 0.03 })), 0.45, standOn(3), 0.15), "trophy");
  const handheld = group(
    mesh(rbox(0.62, 0.95, 0.14, 0.08), toon("#8fd694"), { outline: 0.03 }),
    at(mesh(rbox(0.44, 0.36, 0.02, 0.02), toon("#1e2a5a"), { outline: 0 }), 0, 0.2, 0.075),
    at(mesh(rbox(0.16, 0.05, 0.02, 0.01), black, { outline: 0 }), -0.15, -0.2, 0.075),
    at(mesh(new THREE.SphereGeometry(0.05, 10, 8), toon("#e11d48"), { outline: 0 }), 0.15, -0.2, 0.08),
  );
  const handheldItem = addItem(at(handheld, 1.35, standOn(3) + 0.47, -0.2), "console");
  handheldItem.rotation.x = -0.18;

  // Top: the Infinity Gauntlet at the left end (where it shows from the desk) and a katana on its
  // stand beside it. Luffy's straw hat hangs on the left wall by the guitar: a wide straw brim, a
  // round crown and the red band
  const straw = toon("#f2c14e");
  const strawHat = group(
    at(mesh(new THREE.CylinderGeometry(0.74, 0.76, 0.05, 40), straw, { outline: 0.03 }), 0, 0.025, 0),
    at(mesh(new THREE.TorusGeometry(0.74, 0.03, 8, 40), toon("#d9a43a"), { outline: 0 }), 0, 0.04, 0),
    at(mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.2, 32), straw, { outline: 0.03 }), 0, 0.15, 0),
    at(mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.13, 32), toon("#d62828"), { outline: 0.02 }), 0, 0.12, 0),
    at(mesh(new THREE.SphereGeometry(0.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), straw, { outline: 0.03 }), 0, 0.25, 0),
  );
  strawHat.children[1].rotation.x = Math.PI / 2;
  strawHat.children[4].scale.y = 0.8;
  // Hung by its brim from a wooden peg, crown out from the wall; it swings on the peg
  const hatPeg = new THREE.Group();
  hatPeg.position.set(-8.7, 4.35, 2.0);
  room.add(hatPeg);
  const peg = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.24, 10), toon("#8b5a2b"), { outline: 0.012 });
  peg.rotation.z = Math.PI / 2;
  peg.position.x = 0.1;
  hatPeg.add(peg, at(strawHat, 0.05, -0.68, 0, -Math.PI / 2));
  // Click it for one of Luffy's lines, without zooming in. The bubble sits up and to the right of
  // the hat (toward the room), its tail down to the hat from the lower left. Read from the
  // overview, so it's big and set in larger type than the mug's.
  const hatBubble = speechBubble(6.6, 3.45, { size: 32, tail: "left", style: "manga" });
  hatBubble.sprite.position.set(-5.3, 5.75, 0.45);
  let luffyIndex = Math.floor(Math.random() * LUFFY_QUOTES.length);
  register(hatPeg, {
    onHover: (on) => on && gsap.fromTo(hatPeg.rotation, { x: 0.08 }, { x: 0, duration: 1, ease: "elastic.out(1, 0.3)" }),
    onClick: () => {
      gsap.fromTo(hatPeg.rotation, { x: 0.3 }, { x: 0, duration: 1.6, ease: "elastic.out(1, 0.2)" });
      sfx.shishishi();
      hatBubble.say(LUFFY_QUOTES[luffyIndex++ % LUFFY_QUOTES.length]);
    },
  });

  // ---------- katana on its stand, beside the hat ----------
  // Sheathed, handle to the right as in a display. Click it: the blade is drawn out of the
  // scabbard with a ring of steel, swung in a slash that leaves a white crescent and a shower of
  // sakura petals while the technique's name is shouted in a balloon, then slid back home with a
  // click. Built with the blade along +x from the guard, then the stand turned half round.
  // Scaled up to a full katana's length against the room (about 80 cm); the handle reaches a
  // little past the shelf's right edge, as a sword does past its stand
  const KATANA_SCALE = 1.3;
  const katanaStand = new THREE.Group();
  katanaStand.position.set(1.62, standOn(4), 0.05);
  katanaStand.rotation.y = Math.PI;
  katanaStand.scale.setScalar(KATANA_SCALE);
  shelf.add(katanaStand);
  const lacquer = toon("#141210");
  const gold = toon("#d4a72c");
  katanaStand.add(at(mesh(rbox(1.6, 0.1, 0.55, 0.04), lacquer, { outline: 0.025 }), 0.5, 0.05, 0));
  [-0.15, 1.15].forEach((x) => katanaStand.add(at(mesh(rbox(0.12, 0.82, 0.12, 0.03), lacquer, { outline: 0.02 }), x, 0.46, 0)));
  // A gentle curve (sori) shared by the blade and the scabbard: y rises with the square of x
  const SORI = 0.1;
  const BLADE_L = 1.9;
  const bow = (x) => SORI * (x / BLADE_L) ** 2;
  const bladeShape = (inset) => {
    const shape = new THREE.Shape();
    const steps = 16;
    shape.moveTo(0, -0.055 + inset);
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * BLADE_L;
      shape.lineTo(x, bow(x) - 0.055 * (1 - 0.3 * (x / BLADE_L)) + inset);
    }
    shape.lineTo(BLADE_L + 0.14, bow(BLADE_L) + 0.03);
    for (let i = steps; i >= 0; i--) {
      const x = (i / steps) * BLADE_L;
      shape.lineTo(x, bow(x) + 0.05 - (inset ? 0.05 : 0));
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.022, bevelEnabled: false });
    geo.translate(0, 0, -0.011);
    return geo;
  };
  const RACK_Y = 0.9;
  // Styled on Enma: a purple scabbard and handle with gold fittings and little yellow flower
  // crests, a red cord with a tassel at the scabbard's mouth, a four-lobed gold guard, and a
  // blade with blue and purple flames along it
  const enmaPurple = toon("#6b2fa8");
  const cord = toon("#e11d48");
  const flowerTex = canvasTexture(64, 64);
  track(flowerTex.texture);
  drawEnmaFlower(flowerTex.ctx, 64, 64);
  const flowerMat = track(new THREE.MeshBasicMaterial({ map: flowerTex.texture, transparent: true, depthWrite: false }));
  const flowerGeo = track(new THREE.PlaneGeometry(0.11, 0.11));
  // A crest on both faces at x along the piece, `radius` out from its centre line
  const crest = (parent, x, y, radius) => [-1, 1].forEach((side) => {
    const decal = new THREE.Mesh(flowerGeo, flowerMat);
    decal.position.set(x, y, side * (radius + 0.004));
    if (side < 0) decal.rotation.y = Math.PI;
    decal.raycast = noRaycast;
    parent.add(decal);
  });
  // The blade's print, laid over its faces in the blade's own coordinates
  const BLADE_SPAN = BLADE_L + 0.14;
  const Y_MIN = -0.06;
  const Y_MAX = 0.16;
  const bladeTex = canvasTexture(1024, 128);
  track(bladeTex.texture);
  drawEnmaBlade(bladeTex.ctx, 1024, 128, { bow, length: BLADE_L, width: BLADE_SPAN, yMin: Y_MIN, yMax: Y_MAX });
  bladeTex.texture.repeat.set(1 / BLADE_SPAN, 1 / (Y_MAX - Y_MIN));
  bladeTex.texture.offset.set(0, -Y_MIN / (Y_MAX - Y_MIN));
  const bladeMat = toon("#ffffff");
  bladeMat.map = bladeTex.texture;
  const katana = new THREE.Group();
  katana.position.set(0, RACK_Y, 0);
  // The steel, hidden while it's in the scabbard
  const steel = new THREE.Group();
  steel.add(mesh(bladeShape(0), bladeMat, { outline: 0.018 }));
  steel.visible = false;
  const habaki = at(mesh(rbox(0.09, 0.14, 0.05, 0.015), gold, { outline: 0.012 }), 0.045, 0, 0);
  // Guard: four round gold lobes in a cross round the blade
  const tsuba = new THREE.Group();
  [[0, 0.085], [0, -0.085], [0.085, 0], [-0.085, 0]].forEach(([y, z]) => {
    const lobe = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.045, 20), gold, { outline: 0.012 });
    lobe.rotation.z = Math.PI / 2;
    lobe.position.set(0, y, z);
    tsuba.add(lobe);
  });
  const tsuka = at(mesh(rbox(0.86, 0.12, 0.1, 0.04), enmaPurple, { outline: 0.02 }), -0.47, 0, 0);
  katana.add(steel, habaki, tsuba, tsuka);
  // Gold collars by the guard and part way up, a gold cap on the end, a crest between
  [[-0.08, 0.05], [-0.62, 0.035], [-0.68, 0.035], [-0.92, 0.07]].forEach(([x, width]) => katana.add(at(mesh(rbox(width, 0.135, 0.115, 0.02), gold, { outline: 0.012 }), x, 0, 0)));
  crest(katana, -0.36, 0, 0.05);
  katanaStand.add(katana);
  // The scabbard, from its mouth at the guard to a gold tip, on the stand's rest
  const sayaCurve = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => {
    const x = 0.04 + (i / 8) * (BLADE_L + 0.16);
    return new THREE.Vector3(x, bow(x), 0);
  }));
  const sayaGroup = new THREE.Group();
  sayaGroup.position.y = RACK_Y;
  katanaStand.add(sayaGroup);
  sayaGroup.add(mesh(new THREE.TubeGeometry(sayaCurve, 32, 0.075, 12), enmaPurple, { outline: 0.02 }));
  const sayaBand = (x, width, radius = 0.085) => {
    const band = mesh(new THREE.CylinderGeometry(radius, radius, width, 16), gold, { outline: 0.012 });
    // Square to the scabbard: turned on its side, then tilted by the curve's slope at x
    band.rotation.z = Math.PI / 2 + Math.atan(2 * SORI * x / BLADE_L ** 2);
    band.position.set(x, bow(x), 0);
    sayaGroup.add(band);
  };
  sayaBand(0.06, 0.07);
  sayaBand(1.2, 0.035);
  sayaBand(1.27, 0.035);
  sayaBand(BLADE_L + 0.15, 0.12, 0.088);
  [0.62, 1.5, 1.82].forEach((x) => crest(sayaGroup, x, bow(x), 0.075));
  // Red cord wound near the mouth, its tassel hanging down in front of the stand
  const wrap = mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.16, 16), cord, { outline: 0.012 });
  wrap.rotation.z = Math.PI / 2;
  wrap.position.set(0.32, bow(0.32), 0);
  const tasselCord = rod(new THREE.Vector3(0.36, bow(0.36) - 0.06, -0.08), new THREE.Vector3(0.42, -0.42, -0.12), 0.012, cord, 0.008);
  const tassel = mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.2, 10), cord, { outline: 0.012 });
  tassel.position.set(0.42, -0.52, -0.12);
  sayaGroup.add(wrap, tasselCord, tassel);

  const slashTex = canvasTexture(512, 256);
  track(slashTex.texture);
  drawSlash(slashTex.ctx, 512, 256);
  const slash = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: slashTex.texture, depthTest: false, transparent: true })));
  slash.renderOrder = 11;
  slash.raycast = noRaycast;
  slash.visible = false;
  scene.add(slash);
  const shoutTex = canvasTexture(640, 320);
  track(shoutTex.texture);
  const shout = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: shoutTex.texture, depthTest: false, transparent: true })));
  shout.renderOrder = 12;
  shout.raycast = noRaycast;
  shout.scale.set(0.001, 0.001, 1);
  scene.add(shout);
  // Sakura petals: little pink ovals with a dark outline
  const petalTex = canvasTexture(48, 48);
  track(petalTex.texture);
  petalTex.ctx.beginPath();
  petalTex.ctx.ellipse(24, 24, 18, 11, 0.5, 0, Math.PI * 2);
  petalTex.ctx.fillStyle = "#ffb7d5";
  petalTex.ctx.fill();
  petalTex.ctx.lineWidth = 4;
  petalTex.ctx.strokeStyle = "#1a1714";
  petalTex.ctx.stroke();
  const petals = Array.from({ length: 18 }, () => {
    const petal = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: petalTex.texture, transparent: true, depthWrite: false })));
    petal.visible = false;
    petal.raycast = noRaycast;
    scene.add(petal);
    return petal;
  });
  // Zoro's techniques, called out in the shout balloon, round the list from a random start
  const TECHNIQUES = [
    "SHISHI SONSON!", "36 POUND CANNON!", "DAI SHINKAN!", "ONI GIRI!", "TATSU MAKI!", "SANZEN SEKAI!",
    "YAKKODORI!", "HIRYU KAEN!", "RENGOKU ONI GIRI!", "ASURA: ICHIBUGIN!", "KOKUJO: O TATSUMAKI!",
    "ICHIDAI SANZEN DAISEN SEKAI!", "HYAKUHACHI POUND HO!", "ENMA: KING OF HELL!",
  ];
  let techniqueIndex = Math.floor(Math.random() * TECHNIQUES.length);
  const katanaWorld = new THREE.Vector3();
  let slashing = false;
  let shoutTimer = null;
  function slashKatana() {
    if (slashing) return;
    slashing = true;
    const technique = TECHNIQUES[techniqueIndex++ % TECHNIQUES.length];
    const home = katana.position.x;
    // Fully drawn: the guard pulled the blade's length away from the scabbard's mouth
    const drawn = home - (BLADE_L + 0.25);
    gsap.timeline({ onComplete: () => (slashing = false) })
      .call(() => {
        steel.visible = true;
        sfx.shing();
      })
      // Drawn out of the scabbard
      .to(katana.position, { x: drawn, duration: 0.45, ease: "power2.in" })
      // Up off the stand, back over the shelf, tip rising
      .to(katana.position, { x: home - 0.9, y: RACK_Y + 1.1, duration: 0.35, ease: "power2.out" })
      .to(katana.rotation, { z: 0.35, duration: 0.35, ease: "power2.out" }, "<")
      // Wind-up overhead
      .to(katana.rotation, { z: 1.25, duration: 0.25, ease: "power2.inOut" })
      .to(katana.position, { x: home - 1.2, duration: 0.25, ease: "power2.inOut" }, "<")
      // The cut
      .to(katana.rotation, { z: -0.9, duration: 0.16, ease: "power4.in" })
      .to(katana.position, { x: home - 0.5, duration: 0.16, ease: "power4.in" }, "<")
      .call(() => {
        katana.getWorldPosition(katanaWorld);
        // The stand is turned round, so the blade reaches toward -x in the room
        slash.visible = true;
        slash.position.set(katanaWorld.x - 0.9, katanaWorld.y + 0.4, katanaWorld.z + 0.8);
        slash.material.opacity = 1;
        slash.material.rotation = 0.35;
        gsap.fromTo(slash.scale, { x: 1, y: 0.5 }, { x: 4.6, y: 2.3, duration: 0.25, ease: "power3.out" });
        gsap.to(slash.material, { opacity: 0, delay: 0.25, duration: 0.45, onComplete: () => (slash.visible = false) });
        sfx.whoosh({ duration: 0.25, up: false });
        drawShout(shoutTex.ctx, 640, 320, technique);
        shoutTex.texture.needsUpdate = true;
        // Up and to the left of the blade: the shelf's right side is off screen on many displays
        shout.position.set(katanaWorld.x - 1.3, katanaWorld.y + 1.9, katanaWorld.z + 1.2);
        gsap.fromTo(shout.scale, { x: 1, y: 0.5 }, { x: 5.4, y: 2.7, duration: 0.3, ease: "back.out(3)", overwrite: true });
        gsap.fromTo(shout.material, { rotation: 0.15 }, { rotation: 0, duration: 0.5, ease: "elastic.out(1.2, 0.4)" });
        clearTimeout(shoutTimer);
        shoutTimer = setTimeout(() => gsap.to(shout.scale, { x: 0.001, y: 0.001, duration: 0.2, ease: "power2.in", overwrite: true }), 2200);
        petals.forEach((petal, i) => {
          gsap.killTweensOf([petal.position, petal.material]);
          petal.visible = true;
          petal.scale.setScalar(0.22 + Math.random() * 0.12);
          petal.material.opacity = 1;
          const x = katanaWorld.x - 2.5 + Math.random() * 4;
          const z = katanaWorld.z + 0.4 + Math.random() * 1.2;
          petal.position.set(x, katanaWorld.y + 1.2 + Math.random() * 1.6, z);
          const fall = 2.2 + Math.random() * 1.2;
          gsap.to(petal.position, { y: katanaWorld.y - 2.6 - Math.random(), x: x + 0.6 + Math.random() * 0.8, duration: fall, delay: i * 0.03, ease: "sine.in" });
          gsap.fromTo(petal.material, { rotation: Math.random() * 3 }, { rotation: `+=${4 + Math.random() * 4}`, duration: fall, delay: i * 0.03 });
          gsap.to(petal.material, { opacity: 0, delay: fall - 0.4 + i * 0.03, duration: 0.4, onComplete: () => (petal.visible = false) });
        });
      })
      // Hold the finish, then line up with the scabbard and slide home
      .to(katana.rotation, { z: 0, duration: 0.45, ease: "power2.inOut" }, "+=0.6")
      .to(katana.position, { x: drawn, y: RACK_Y, duration: 0.45, ease: "power2.inOut" }, "<")
      .call(() => sfx.sheathe())
      .to(katana.position, { x: home, duration: 0.3, ease: "power2.in" })
      .call(() => (steel.visible = false))
      .fromTo(katanaStand.scale, { y: KATANA_SCALE * 0.92 }, { y: KATANA_SCALE, duration: 0.3, ease: "back.out(3)" });
  }
  register(katanaStand, {
    // The gold fittings catch the light
    onHover: (on) => on && !slashing && gsap.fromTo(gold.emissive, { r: 0.6, g: 0.5, b: 0.15 }, { r: 0, g: 0, b: 0, duration: 0.7, ease: "power2.out" }),
    onClick: slashKatana,
  });

  // ---------- the Infinity Gauntlet, at the left end of the shelf's top ----------
  // A gold glove on a black plinth with the six stones set in it. Click for the snap: the camera
  // closes in, the stones light up one by one, the fingers snap in a flash, then the camera pulls
  // back to watch half the desk's small things crumble to dust... and come back a moment later.
  // Clear of the katana's scabbard tip, which reaches to about x -1.05 on this shelf
  const GAUNTLET_X = -1.74;
  const gauntlet = new THREE.Group();
  gauntlet.position.set(GAUNTLET_X, standOn(4), 0.1);
  gauntlet.rotation.y = 0.15;
  shelf.add(gauntlet);
  // Antique gold in three tones (with the outlines, it stays flat and graphic)
  const glove = toon("#d4a234");
  const gloveDark = toon("#8a6416");
  const gloveLight = toon("#f1c95b");
  // Plinth with a little gold plaque
  gauntlet.add(
    at(mesh(rbox(0.85, 0.2, 0.65, 0.05), toon("#1a1714"), { outline: 0.02 }), 0, 0.1, 0),
    at(mesh(rbox(0.42, 0.07, 0.02, 0.01), gloveLight, { outline: 0.008 }), 0, 0.1, 0.33),
  );
  // Everything above the plinth: it floats up off the stand for the snap
  const glovePart = new THREE.Group();
  gauntlet.add(glovePart);
  // Forearm: a tapered oval shell with raised bands and a ridged plate down the middle
  const forearm = mesh(new THREE.CylinderGeometry(0.23, 0.3, 0.62, 24), glove, { outline: 0.02 });
  forearm.position.y = 0.51;
  forearm.scale.z = 0.8;
  glovePart.add(forearm);
  [[0.3, 0.29], [0.52, 0.265], [0.74, 0.24]].forEach(([y, r]) => {
    const band = mesh(new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.04, 24), gloveDark, { outline: 0.01 });
    band.position.y = y;
    band.scale.z = 0.8;
    glovePart.add(band);
  });
  const ridge = at(mesh(rbox(0.14, 0.52, 0.05, 0.02), gloveDark, { outline: 0.012 }), 0, 0.5, 0.215);
  ridge.rotation.x = -0.1;
  glovePart.add(ridge);
  [0.34, 0.46, 0.58, 0.7].forEach((y) => [-1, 1].forEach((side) => {
    const chevron = at(mesh(rbox(0.075, 0.018, 0.02, 0.005), gloveLight, { outline: 0, cast: false }), side * 0.03, y, 0.243 - (y - 0.5) * 0.1, side * 0.55);
    glovePart.add(chevron);
  }));
  // Wrist, the back of the hand, and the knuckle bar
  const wrist = mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.07, 24), gloveDark, { outline: 0.012 });
  wrist.position.y = 0.84;
  wrist.scale.z = 0.8;
  glovePart.add(wrist, at(mesh(rbox(0.5, 0.46, 0.22, 0.07), glove, { outline: 0.02 }), 0, 1.1, 0));
  glovePart.add(at(mesh(rbox(0.53, 0.09, 0.25, 0.03), gloveDark, { outline: 0.012 }), 0, 1.34, 0));
  // Filigree lines fanning out from the centre stone's setting
  [-0.55, -0.2, 0.2, 0.55].forEach((angle) => {
    const line = at(mesh(rbox(0.02, 0.2, 0.01, 0.005), gloveDark, { outline: 0, cast: false }), Math.sin(angle) * 0.13, 1.1 + Math.cos(angle) * 0.13, 0.112, -angle);
    glovePart.add(line);
  });
  // Fingers on hinges at the knuckles: three segments each, the middle one longest
  const fingers = [[-0.18, 0.3], [-0.06, 0.36], [0.06, 0.38], [0.18, 0.32]].map(([x, length]) => {
    const hinge = new THREE.Group();
    hinge.position.set(x, 1.38, 0);
    // Its three segments, knuckle first: a pose bends each of them
    const pieces = [];
    hinge.userData.pieces = pieces;
    let joint = hinge;
    [0.42, 0.33, 0.25].forEach((share, k) => {
      const piece = new THREE.Group();
      piece.position.y = k ? length * [0.42, 0.33][k - 1] : 0;
      piece.rotation.x = k ? -0.08 : 0;
      const segment = length * share;
      piece.add(
        at(mesh(rbox(0.1 - k * 0.006, segment, 0.12 - k * 0.006, 0.04), glove, { outline: 0.014 }), 0, segment / 2, 0),
        at(mesh(rbox(0.104, 0.018, 0.124, 0.005), gloveDark, { outline: 0, cast: false }), 0, 0.009, 0),
      );
      joint.add(piece);
      joint = piece;
      pieces.push(piece);
    });
    glovePart.add(hinge);
    return hinge;
  });
  const thumb = new THREE.Group();
  thumb.position.set(0.27, 1.02, 0.02);
  thumb.rotation.z = -0.7;
  const thumbTip = new THREE.Group();
  thumbTip.position.y = 0.17;
  thumbTip.rotation.z = 0.25;
  thumbTip.add(at(mesh(rbox(0.1, 0.15, 0.11, 0.04), glove, { outline: 0.014 }), 0, 0.075, 0));
  thumb.add(at(mesh(rbox(0.12, 0.18, 0.13, 0.045), glove, { outline: 0.015 }), 0, 0.09, 0), thumbTip);
  glovePart.add(thumb);
  // A soft round glow, shared by the stones' halos and the snap's flash
  const flashTex = canvasTexture(128, 128);
  track(flashTex.texture);
  const glow = flashTex.ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.35, "rgba(255,255,255,0.55)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  flashTex.ctx.fillStyle = glow;
  flashTex.ctx.fillRect(0, 0, 128, 128);
  // Stones in raised gold settings, each with a coloured halo that brightens on hover and at
  // the snap (the halo adds light, so it reads as a glow even on the flat toon shading)
  const stoneGeo = new THREE.SphereGeometry(1, 16, 12);
  const stone = (color, parent, x, y, z, r, tall = 1) => {
    const setting = mesh(new THREE.CylinderGeometry(r * 1.35, r * 1.35, 0.03, 18), gloveDark, { outline: 0.008 });
    setting.rotation.x = Math.PI / 2;
    setting.scale.z = tall;
    setting.position.set(x, y, z - 0.01);
    const gem = new THREE.Mesh(stoneGeo, track(new THREE.MeshBasicMaterial({ color })));
    gem.scale.set(r, r * tall, r * 0.6);
    gem.position.set(x, y, z + 0.008);
    gem.userData.size = gem.scale.clone();
    const halo = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: flashTex.texture, color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })));
    halo.position.set(x, y, z + 0.03);
    halo.scale.setScalar(r * 5);
    halo.raycast = noRaycast;
    gem.userData.halo = halo;
    gem.userData.r = r;
    parent.add(setting, gem, halo);
    return gem;
  };
  // Soul, reality, space and power across the knuckles; mind at the centre; time on the thumb
  const stones = [
    stone("#ff7a1a", glovePart, -0.18, 1.34, 0.13, 0.042),
    stone("#e11d48", glovePart, -0.06, 1.34, 0.13, 0.042),
    stone("#3b82f6", glovePart, 0.06, 1.34, 0.13, 0.042),
    stone("#a855f7", glovePart, 0.18, 1.34, 0.13, 0.042),
    stone("#ffdd00", glovePart, 0, 1.1, 0.112, 0.07, 1.35),
    stone("#22c55e", thumb, 0, 0.09, 0.07, 0.036),
  ];
  // Light a stone up: the gem swells and its halo flares, then both settle
  const flare = (gem, delay = 0, strength = 1) => {
    const { size, halo, r } = gem.userData;
    gsap.fromTo(gem.scale, { x: size.x * (1 + 0.6 * strength), y: size.y * (1 + 0.6 * strength) }, { x: size.x, y: size.y, duration: 0.6, delay, ease: "power2.out" });
    gsap.fromTo(halo.scale, { x: r * (5 + 9 * strength), y: r * (5 + 9 * strength) }, { x: r * 5, y: r * 5, duration: 0.9, delay, ease: "power2.out" });
    gsap.fromTo(halo.material, { opacity: 1 }, { opacity: 0.35, duration: 0.9, delay, ease: "power2.out" });
  };
  // A white flash for the snap
  const flash = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: flashTex.texture, color: "#fff4c2", transparent: true, depthTest: false, depthWrite: false })));
  flash.renderOrder = 12;
  flash.raycast = noRaycast;
  flash.visible = false;
  scene.add(flash);
  // Dust: a pool of little squares, coloured after whatever is crumbling
  const dust = Array.from({ length: 240 }, () => {
    const grain = new THREE.Sprite(track(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })));
    grain.visible = false;
    grain.raycast = noRaycast;
    scene.add(grain);
    return grain;
  });
  const dustBox = new THREE.Box3();
  // Screen-right as seen from the desk view, the way the dust drifts off
  const driftRight = new THREE.Vector3(0.9, 0, -0.43);
  let snapping = false;
  function crumble(object, colors, delay, grains) {
    object.updateWorldMatrix(true, true);
    dustBox.setFromObject(object);
    const shadow = contactShadows.find((entry) => entry.object === object);
    grains.forEach((grain, i) => {
      gsap.killTweensOf([grain.position, grain.material, grain.scale]);
      grain.position.set(
        THREE.MathUtils.lerp(dustBox.min.x, dustBox.max.x, Math.random()),
        THREE.MathUtils.lerp(dustBox.min.y, dustBox.max.y, Math.random()),
        THREE.MathUtils.lerp(dustBox.min.z, dustBox.max.z, Math.random()),
      );
      grain.material.color.set(colors[i % colors.length]);
      grain.material.opacity = 0;
      grain.scale.setScalar(0.07 + Math.random() * 0.07);
      grain.visible = true;
      const start = delay + Math.random() * 1.0;
      const far = 1.5 + Math.random() * 2.2;
      gsap.to(grain.material, { opacity: 1, delay: start, duration: 0.1 });
      gsap.to(grain.position, {
        x: grain.position.x + driftRight.x * far, z: grain.position.z + driftRight.z * far, y: grain.position.y + 0.5 + Math.random() * 1.4,
        delay: start, duration: 1.6 + Math.random() * 0.8, ease: "power1.out",
      });
      gsap.to(grain.material, { opacity: 0, delay: start + 0.9, duration: 0.9, onComplete: () => (grain.visible = false) });
    });
    // Its resting size and place, kept from the first time it crumbled (so a snap that catches
    // it still crumbled can't make "gone" its normal state), and the middle of its shape in its
    // parent's space: it shrinks into that point, where it stands, not toward its group's origin
    if (!object.userData.rest) {
      const centre = dustBox.getCenter(new THREE.Vector3());
      object.userData.rest = {
        scale: object.scale.clone(),
        position: object.position.clone(),
        centre: object.parent.worldToLocal(centre),
      };
    }
    const { scale, position, centre } = object.userData.rest;
    const shrink = { k: 1 };
    const apply = () => {
      object.scale.copy(scale).multiplyScalar(Math.max(shrink.k, 0.001));
      object.position.copy(centre).addScaledVector(position.clone().sub(centre), shrink.k);
    };
    gsap.to(shrink, { k: 0, delay: delay + 0.3, duration: 1.1, ease: "power2.in", onUpdate: apply });
    if (shadow) gsap.to(shadow.plane.scale, { x: 0.001, y: 0.001, z: 0.001, delay: delay + 0.6, duration: 0.8 });
    // ...and back again, exactly where it was
    timers.push(setTimeout(() => {
      gsap.to(shrink, {
        k: 1, duration: 0.6, ease: "back.out(2)", onUpdate: apply,
        onComplete: () => {
          object.scale.copy(scale);
          object.position.copy(position);
        },
      });
      if (shadow) gsap.to(shadow.plane.scale, { x: 1, y: 1, z: 1, duration: 0.6 });
    }, (delay + 4.2) * 1000));
  }
  const snapPoint = new THREE.Vector3();
  function snapFingers() {
    if (snapping) return;
    snapping = true;
    setFocus("gauntlet");
    const tl = gsap.timeline({ onComplete: () => (snapping = false) });
    // Hand poses: each finger's knuckle, middle and tip joints (pinky to index), and the thumb
    const pose = (at, duration, ease, angles, thumbTo) => {
      fingers.forEach((finger, i) => finger.userData.pieces.forEach((piece, k) => {
        tl.to(k ? piece.rotation : finger.rotation, { x: angles[i][k], duration, ease }, at);
      }));
      tl.to(thumb.rotation, { ...thumbTo, duration, ease }, at);
    };
    const REST = [[0, -0.08, -0.08], [0, -0.08, -0.08], [0, -0.08, -0.08], [0, -0.08, -0.08]];
    // Ready to snap: pinky and ring folded into the palm, the middle finger pressed to the thumb,
    // the index loosely bent
    const READY = [[-1.3, -1.3, -1.0], [-1.3, -1.3, -1.0], [-0.75, -0.7, -0.5], [-0.25, -0.25, -0.2]];
    // The snap: the middle finger slams into the palm as the thumb springs out
    const SNAP = [[-1.3, -1.3, -1.0], [-1.3, -1.3, -1.0], [-1.55, -1.2, -0.9], [-0.3, -0.3, -0.2]];
    // Once the camera has closed in (0.9 s): a slow, heavy rise off the plinth while the stones
    // hum and light up one by one
    tl.call(() => sfx.power({ duration: 1.8 }), null, 0.9)
      .to(glovePart.position, { y: 0.8, duration: 1.6, ease: "power2.inOut" }, 0.95)
      // Then hovering (an even number of swings, so it's back at 0.8 before it sinks at 4.15)
      .to(glovePart.position, { y: 0.88, duration: 0.4, ease: "sine.inOut", yoyo: true, repeat: 3 }, 2.55);
    stones.forEach((gem, i) => {
      tl.call(() => {
        flare(gem, 0, 1.4);
        sfx.tick({ pitch: 1.6 + i * 0.15 });
      }, null, 1.1 + i * 0.24);
    });
    // Turn the thumb side toward the camera and take up the snap
    tl.to(glovePart.rotation, { y: -0.5, duration: 0.45, ease: "power2.inOut" }, 2.6);
    pose(2.6, 0.45, "power2.inOut", READY, { z: -0.15, x: -0.6 });
    tl.call(() => sfx.riser({ duration: 0.5 }), null, 2.92);
    pose(3.35, 0.07, "power4.in", SNAP, { z: -0.95, x: -0.2 });
    tl.call(() => {
      sfx.snap();
      glovePart.localToWorld(snapPoint.set(0.15, 1.35, 0));
      stones.forEach((gem) => flare(gem, 0, 2));
      flash.position.copy(snapPoint);
      flash.visible = true;
      gsap.fromTo(flash.scale, { x: 0.3, y: 0.3 }, { x: 4.5, y: 4.5, duration: 0.35, ease: "power3.out" });
      gsap.fromTo(flash.material, { opacity: 1 }, { opacity: 0, duration: 0.6, delay: 0.1, onComplete: () => (flash.visible = false) });
      // The recoil
      gsap.fromTo(glovePart.rotation, { z: 0.12 }, { z: 0, duration: 0.5, ease: "elastic.out(1.4, 0.25)" });
    }, null, 3.42);
    // Open the hand again and face front
    pose(3.8, 0.45, "power2.inOut", REST, { z: -0.7, x: 0 });
    tl.to(glovePart.rotation, { y: 0, duration: 0.45, ease: "power2.inOut" }, 3.8)
      // Back out to the desk to watch half of it go; the glove sinks back onto its plinth on the
      // way out, as the room starts to crumble
      .call(() => setFocus("overview"), null, 4.15)
      .to(glovePart.position, { y: 0, duration: 1.2, ease: "power2.inOut" }, 4.15)
      .call(() => sfx.knock({ strength: 0.6 }), null, 5.35)
      .call(() => {
        sfx.dust();
        // Perfectly balanced: a random half of everything in the room (bar the gauntlet and the
        // shelf it stands on), each with the colours its dust takes
        const everything = [
          [[mug, coaster], ["#fffdf5", "#6f4e37", "#c8925a"]],
          [[mail], ["#e2cb9c", "#fffdf5", "#3b82f6"]],
          [[phoneStand], ["#f47b20", "#1a1714", "#ffdd00"]],
          [[plant], ["#16a34a", "#8fd694", "#ff7a1a"]],
          [[mouse], ["#ffffff", "#e11d48"]],
          [[keyboard], ["#1f1f1f", "#e8e4dc", "#ff90e8", "#00e0c6"]],
          [[monitor], ["#c2c6cc", "#1a1714", "#8fd694"]],
          [[speakers[0].group], ["#1a1714", "#7fb2ff", "#ffdd00"]],
          [[speakers[1].group], ["#1a1714", "#7fb2ff", "#ffdd00"]],
          [[lamp], ["#ffdd00", "#1a1714"]],
          [[chair], ["#45474d", "#1a1714"]],
          [[guitar], ["#ff7a1a", "#8b5a2b", "#1a1714"]],
          [[paintingHang], ["#ff90e8", "#ffdd00", "#00e0c6", "#1a1714"]],
          [[clock], ["#7fb2ff", "#fffdf5", "#1a1714"]],
          [[tickets], ["#fffdf5", "#00e0c6", "#ffdd00"]],
          [[folders], ["#ff90e8", "#ffdd00", "#8fd694", "#7fb2ff"]],
          [[gym], ["#ffdd00", "#ff90e8", "#9ca3af"]],
          [[gymCalendar], ["#ff7a1a", "#fffdf5", "#8fd694"]],
          [[hatPeg], ["#f2c14e", "#d62828"]],
          [[katanaStand], ["#6b2fa8", "#d4a72c", "#1a1714"]],
          [[windowGroup], ["#ffffff", "#7fdfff", "#8fd694"]],
        ];
        const doomed = everything
          .map((entry) => [Math.random(), entry])
          .sort((a, b) => a[0] - b[0])
          .slice(0, Math.floor(everything.length / 2))
          .map(([, entry]) => entry);
        const share = Math.floor(dust.length / doomed.reduce((n, [objects]) => n + objects.length, 0));
        let next = 0;
        doomed.forEach(([objects, colors], i) => objects.forEach((object) => crumble(object, colors, i * 0.12, dust.slice(next, (next += share)))));
      }, null, 4.25)
      .call(() => sfx.sparkle(), null, 8.85)
      // Not again until everything is back
      .call(() => {}, null, 10.5);
  }
  register(gauntlet, {
    // A ripple of light across the stones, with a little shimmer
    onHover: (on) => {
      if (!on || snapping) return;
      stones.forEach((gem, i) => flare(gem, i * 0.06));
      sfx.tick({ pitch: 2.2 });
      sfx.tick({ pitch: 2.6, delay: 0.12 });
    },
    onClick: snapFingers,
  });

  const SHELF_SOUNDS = {
    console: () => {
      sfx.blip();
      gsap.fromTo(led.scale, { x: 2.2, y: 2.2, z: 2.2 }, { x: 1, y: 1, z: 1, duration: 0.5 });
    },
    controller: () => {
      sfx.click();
      timers.push(setTimeout(() => sfx.click(), 90));
    },
    book: () => sfx.flop({ strength: 0.4 }),
    case: () => sfx.tick({ pitch: 0.9 }),
    figure: () => sfx.pop({ pitch: 1.3 }),
    trophy: () => sfx.ping(),
  };
  const itemFor = (obj) => shelfItems.find(({ obj: item }) => {
    for (let o = obj; o; o = o.parent) if (o === item) return true;
    return false;
  });
  register(shelf, {
    onClick: (hit) => {
      const item = itemFor(hit.object);
      if (!item) return sfx.knock({ strength: 0.6 });
      // Always from where it rests: a click mid-hop must not start the next hop higher up
      const y = item.obj.userData.restY;
      gsap.fromTo(item.obj.position, { y }, { keyframes: [{ y: y + 0.28, duration: 0.16, ease: "power2.out" }, { y, duration: 0.3, ease: "bounce.out" }], overwrite: true });
      SHELF_SOUNDS[item.sound]();
    },
  });

  // ---------- gym corner: a pair of dumbbells on the floor between the desk and the shelf ----------
  // Click for a rep: one dumbbell is lifted and set down with a clank, and a counter pops up
  // over them. Ten in a row is a new PR, with confetti.
  const gym = new THREE.Group();
  gym.position.set(7.95, FLOOR_Y, -3.35);
  gym.rotation.y = -0.15;
  scene.add(gym);
  const HEAD_R = 0.27;
  // Hex heads lie flat on a face: a six-sided cylinder turned onto its side
  const dumbbell = (color, x, z, turn) => {
    const db = new THREE.Group();
    const bar = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.66, 12), toon("#9ca3af"), { outline: 0.015 });
    const grip = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.34, 12), toon("#1a1714"), { outline: 0.015 });
    db.add(bar, grip);
    [-1, 1].forEach((side) => {
      const head = mesh(new THREE.CylinderGeometry(HEAD_R, HEAD_R, 0.3, 6), toon(color), { outline: 0.025 });
      head.position.y = side * 0.42;
      const band = mesh(new THREE.CylinderGeometry(HEAD_R + 0.005, HEAD_R + 0.005, 0.06, 6), toon("#1a1714"), { outline: 0, cast: false });
      band.position.y = side * 0.42;
      db.add(head, band);
    });
    db.rotation.set(0, turn, Math.PI / 2, "YXZ");
    db.position.set(x, HEAD_R * 0.866, z);
    db.userData.restY = db.position.y;
    gym.add(db);
    return db;
  };
  const dumbbells = [dumbbell("#ffdd00", -0.45, -0.3, 0.25), dumbbell("#ff90e8", 0.5, 0.35, -0.15)];
  const repTex = canvasTexture(320, 160);
  track(repTex.texture);
  const repBadge = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: repTex.texture, depthTest: false, transparent: true })));
  repBadge.renderOrder = 10;
  repBadge.raycast = noRaycast;
  repBadge.scale.set(0.001, 0.001, 1);
  repBadge.position.set(gym.position.x, FLOOR_Y + 2.7, gym.position.z);
  scene.add(repBadge);
  // Confetti for a PR (and for stamping the calendar): a pool of little coloured squares
  const confetti = Array.from({ length: 22 }, (_, i) => {
    const bit = new THREE.Sprite(track(new THREE.SpriteMaterial({ color: PALETTE[i % 7], transparent: true, depthWrite: false })));
    bit.visible = false;
    bit.raycast = noRaycast;
    scene.add(bit);
    return bit;
  });
  function burst(x, y, z) {
    confetti.forEach((bit) => {
      gsap.killTweensOf([bit.position, bit.material]);
      bit.visible = true;
      bit.position.set(x, y, z);
      bit.scale.setScalar(0.1 + Math.random() * 0.08);
      bit.material.opacity = 1;
      bit.material.rotation = Math.random() * Math.PI;
      const a = Math.random() * Math.PI * 2;
      const r = 0.8 + Math.random() * 1.4;
      gsap.to(bit.position, { x: x + Math.cos(a) * r, z: z + Math.sin(a) * r * 0.6, duration: 1.2, ease: "power2.out" });
      gsap.to(bit.position, { keyframes: [{ y: y + 0.8 + Math.random() * 1.2, duration: 0.45, ease: "power2.out" }, { y: y - 1.2, duration: 0.8, ease: "power2.in" }] });
      gsap.to(bit.material, { opacity: 0, delay: 0.9, duration: 0.4, onComplete: () => (bit.visible = false) });
    });
  }
  let reps = 0;
  let lifting = false;
  let repTimer = null;
  function showReps(text, fill) {
    drawRepBadge(repTex.ctx, 320, 160, text, fill);
    repTex.texture.needsUpdate = true;
    gsap.fromTo(repBadge.scale, { x: 0.6, y: 0.3 }, { x: 1.8, y: 0.9, duration: 0.35, ease: "back.out(3)", overwrite: true });
    clearTimeout(repTimer);
    repTimer = setTimeout(() => {
      reps = 0;
      gsap.to(repBadge.scale, { x: 0.001, y: 0.001, duration: 0.2, ease: "power2.in", overwrite: true });
    }, 2600);
  }
  function lift() {
    if (lifting) return;
    lifting = true;
    const db = dumbbells[reps % 2];
    const y = db.userData.restY;
    gsap.timeline({ onComplete: () => (lifting = false) })
      .to(db.position, { y: y + 1.5, duration: 0.32, ease: "power2.out" })
      .to(db.rotation, { y: db.rotation.y + 0.5, duration: 0.32, ease: "power2.out" }, 0)
      .to(db.position, { y, duration: 0.3, ease: "power2.in" }, 0.42)
      .to(db.rotation, { y: db.rotation.y, duration: 0.3, ease: "power2.in" }, 0.42)
      .call(() => {
        sfx.clank();
        reps++;
        if (reps >= 10) {
          showReps("NEW PR!", "#ff90e8");
          burst(gym.position.x, FLOOR_Y + 1.6, gym.position.z);
          sfx.sparkle();
          reps = 0;
        } else showReps(`REP ${reps}`);
      }, null, 0.72);
    sfx.whoosh({ duration: 0.3 });
  }
  register(gym, { onHover: hoverScale(gym, 1.03), onClick: lift });

  // ---------- gym streak calendar on the wall above the game shelf ----------
  // This month's training days stamped in; click to stamp today and grow the streak. Today's
  // stamp is remembered on this device.
  const gymNow = new Date();
  const dayKey = `gym-${gymNow.getFullYear()}-${gymNow.getMonth() + 1}-${gymNow.getDate()}`;
  const trained = new Set();
  for (let d = 1; d < gymNow.getDate(); d++) {
    // A rest day or two a week, but the last few days all done: a streak worth keeping
    if (d >= gymNow.getDate() - 9 || (d % 7 !== 0 && d % 7 !== 3)) trained.add(d);
  }
  try {
    if (localStorage.getItem(dayKey)) trained.add(gymNow.getDate());
  } catch {
    // Without storage today just isn't stamped yet
  }
  const gymCalendar = new THREE.Group();
  gymCalendar.position.set(shelf.position.x, FLOOR_Y + SHELF_H + 2.0, -6.48);
  scene.add(gymCalendar);
  const calendarBack = mesh(rbox(2.75, 2.35, 0.06, 0.03), toon("#1a1714"), { outline: 0.03 });
  const calendarPage = printed(2.6, 2.2, 260, (c, w, h) => drawGymCalendar(c, w, h, { done: trained }));
  calendarPage.position.z = 0.035;
  const calendarClip = mesh(rbox(0.6, 0.22, 0.12, 0.04), toon("#1a1714"), { outline: 0.02 });
  calendarClip.position.set(0, 1.15, 0.06);
  gymCalendar.add(calendarBack, calendarPage, calendarClip);
  register(gymCalendar, {
    onHover: (on) => on && gsap.fromTo(gymCalendar.rotation, { z: 0.03 }, { z: 0, duration: 0.8, ease: "elastic.out(1, 0.3)" }),
    onClick: () => {
      gsap.fromTo(gymCalendar.rotation, { z: 0.07 }, { z: 0, duration: 1.1, ease: "elastic.out(1, 0.25)" });
      if (trained.has(gymNow.getDate())) return sfx.tick({ pitch: 0.8 });
      trained.add(gymNow.getDate());
      try {
        localStorage.setItem(dayKey, "1");
      } catch {
        // Stamped for this visit only
      }
      calendarPage.userData.tex.redraw();
      gsap.fromTo(gymCalendar.scale, { x: 1.08, y: 1.08 }, { x: 1, y: 1, duration: 0.5, ease: "back.out(3)" });
      burst(gymCalendar.position.x, gymCalendar.position.y, gymCalendar.position.z + 0.6);
      sfx.stamp();
    },
  });

  // ---------- cables: monitor, lamp and phone run off the back edge of the desk ----------
  const cableMat = toon("#1a1714");
  const DESK_BACK = -4.2;
  const cable = (points) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([px, py, pz]) => new THREE.Vector3(px, py, pz)));
    const wire = mesh(new THREE.TubeGeometry(curve, 72, 0.045, 8), cableMat, { outline: 0 });
    wire.raycast = noRaycast;
    scene.add(wire);
  };
  cable([[-0.2, 0.06, -3.25], [-0.35, 0.05, -3.85], [-0.45, 0.04, DESK_BACK + 0.04], [-0.5, -0.5, DESK_BACK - 0.22], [-0.7, -2.8, DESK_BACK - 0.55], [-1.1, FLOOR_Y + 0.06, -5.7], [-2.6, FLOOR_Y + 0.06, -6.35]]);
  cable([[-6.0, 0.06, -3.45], [-6.1, 0.05, -3.9], [-6.15, 0.04, DESK_BACK + 0.04], [-6.2, -0.6, DESK_BACK - 0.25], [-6.4, -3.0, DESK_BACK - 0.6], [-6.8, FLOOR_Y + 0.06, -5.9], [-8.2, FLOOR_Y + 0.06, -6.3]]);
  cable([[3.85, 0.06, -2.4], [4.0, 0.05, -3.3], [4.1, 0.04, DESK_BACK + 0.04], [4.15, -0.5, DESK_BACK - 0.22], [4.4, -2.8, DESK_BACK - 0.55], [5.0, FLOOR_Y + 0.06, -5.7], [6.5, FLOOR_Y + 0.06, -6.3]]);

  // ---------- monitor + terminal ----------
  const monitor = new THREE.Group();
  monitor.position.set(-0.2, 0, -2.75);
  scene.add(monitor);
  // iMac-style (silver): a thin aluminium slab with a light bezel around the screen, a silver
  // chin below it, on a flat foot with a slanted aluminium plate for a stand
  const aluminium = toon("#c2c6cc");
  const base = mesh(rbox(1.75, 0.07, 1.3, 0.03), aluminium, { outline: 0.03 });
  base.position.set(0, 0.035, -0.15);
  const neck = mesh(rbox(1.3, 1.75, 0.09, 0.03), aluminium, { outline: 0.03 });
  neck.position.set(0, 0.9, -0.42);
  neck.rotation.x = 0.16;
  const body = mesh(rbox(4.6, 3.2, 0.14, 0.1), toon("#9fa4ac"), { outline: 0.06 });
  body.position.set(0, 2.4, 0);
  const bezel = mesh(rbox(4.46, 2.62, 0.02, 0.06), toon("#f4f2ee"), { outline: 0, cast: false });
  bezel.position.set(0, 2.63, 0.075);
  monitor.add(base, neck, body, bezel);
  // Sticky notes on the right of the bezel, each with a hard little shadow behind it
  const noteShadowMat = track(new THREE.MeshBasicMaterial({ color: "#000000" }));
  [
    // Stuck to the right edge of the bezel, half hanging off it, clear of the screen
    { text: "ship it", color: "#ffdd00", tick: true, x: 2.36, y: 3.4, rz: -0.12 },
    { text: "drink water!", color: "#ff90e8", x: 2.4, y: 2.15, rz: 0.18 },
  ].forEach((n) => {
    const note = printed(0.62, 0.62, 500, (c, w, h) => drawStickyNote(c, w, h, n));
    note.raycast = noRaycast;
    const shadow = new THREE.Mesh(track(new THREE.PlaneGeometry(0.62, 0.62)), noteShadowMat);
    shadow.position.set(0.05, -0.05, -0.004);
    shadow.raycast = noRaycast;
    const stuck = new THREE.Group();
    stuck.position.set(n.x, n.y, 0.1);
    stuck.rotation.z = n.rz;
    stuck.add(shadow, note);
    monitor.add(stuck);
  });

  // Speakers either side of the monitor: click one to switch the sound on or off. The LED
  // shows the state (green: on, red: muted). Switching on drops a little groove: the cones pump
  // in time and notes float up out of them. Switching off, they slump with a tape-stop.
  const speakerLeds = [];
  const speakers = [];
  let soundMuted = muted;
  // Music notes: a small pool of sprites, printed once per glyph and colour
  const noteSprites = [["♪", "#ffdd00"], ["♫", "#ff90e8"], ["♪", "#00e0c6"], ["♫", "#7fb2ff"]].map(([glyph, color]) => {
    const tex = canvasTexture(128, 128);
    track(tex.texture);
    tex.ctx.font = "900 96px 'Segoe UI Symbol', 'Apple Symbols', sans-serif";
    tex.ctx.textAlign = "center";
    tex.ctx.textBaseline = "middle";
    tex.ctx.lineWidth = 12;
    tex.ctx.lineJoin = "round";
    tex.ctx.strokeStyle = "#000";
    tex.ctx.strokeText(glyph, 64, 68);
    tex.ctx.fillStyle = color;
    tex.ctx.fillText(glyph, 64, 68);
    return tex.texture;
  });
  const notePool = Array.from({ length: 14 }, (_, i) => {
    const sprite = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: noteSprites[i % noteSprites.length], transparent: true, depthWrite: false })));
    sprite.visible = false;
    sprite.raycast = noRaycast;
    scene.add(sprite);
    return sprite;
  });
  let nextNote = 0;
  const notePoint = new THREE.Vector3();
  function floatNote(speaker) {
    const sprite = notePool[nextNote++ % notePool.length];
    speaker.woofer.getWorldPosition(notePoint);
    const side = Math.sign(speaker.group.position.x - monitor.position.x) || 1;
    gsap.killTweensOf([sprite.position, sprite.scale, sprite.material]);
    sprite.visible = true;
    sprite.position.copy(notePoint).add(new THREE.Vector3(0, 0.4, 0.35));
    sprite.material.opacity = 1;
    sprite.material.rotation = (Math.random() - 0.5) * 0.6;
    gsap.fromTo(sprite.scale, { x: 0.1, y: 0.1 }, { x: 0.6, y: 0.6, duration: 0.3, ease: "back.out(3)" });
    gsap.to(sprite.position, {
      y: notePoint.y + 2.2 + Math.random() * 0.8,
      x: notePoint.x + side * (0.4 + Math.random() * 0.6),
      duration: 1.6, ease: "power1.out",
    });
    gsap.to(sprite.material, { opacity: 0, delay: 1.0, duration: 0.6, onComplete: () => (sprite.visible = false) });
  }
  function pump(speaker, strength = 1) {
    gsap.fromTo(speaker.woofer.scale, { x: 1 + 0.3 * strength, z: 1 + 0.3 * strength }, { x: 1, z: 1, duration: 0.18, ease: "power2.out", overwrite: true });
    gsap.fromTo(speaker.dustCap.position, { z: 0.6 }, { z: 0.47, duration: 0.18, ease: "power2.out", overwrite: true });
    gsap.fromTo(speaker.group.scale, { x: 1.05, y: 0.95, z: 1.05 }, { x: 1, y: 1, z: 1, duration: 0.22, ease: "power2.out", overwrite: true });
  }
  [-3.05, 2.55].forEach((x) => {
    const speaker = new THREE.Group();
    speaker.position.set(x, 0, -3.55);
    scene.add(speaker);
    const cabinet = mesh(rbox(0.95, 1.75, 0.85, 0.1), toon("#1a1714"), { outline: 0.045 });
    cabinet.position.y = 0.875;
    const woofer = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 28), toon("#7fb2ff"), { outline: 0.02 });
    woofer.rotation.x = Math.PI / 2;
    woofer.position.set(0, 0.55, 0.43);
    const dustCap = mesh(new THREE.SphereGeometry(0.11, 14, 10), toon("#1a1714"), { outline: 0.015 });
    dustCap.position.set(0, 0.55, 0.47);
    const tweeter = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 20), toon("#ffdd00"), { outline: 0.015 });
    tweeter.rotation.x = Math.PI / 2;
    tweeter.position.set(0, 1.25, 0.43);
    const ledMat = track(new THREE.MeshBasicMaterial({ color: "#16a34a" }));
    const led = new THREE.Mesh(track(new THREE.SphereGeometry(0.045, 10, 8)), ledMat);
    led.position.set(0, 1.6, 0.43);
    speakerLeds.push(ledMat);
    speaker.add(cabinet, woofer, dustCap, tweeter, led);
    const entry = { group: speaker, woofer, dustCap, tweeter };
    speakers.push(entry);
    register(speaker, {
      onHover: (on) => on && pump(entry, 0.4),
      onClick: () => {
        // Played before the switch: once muted, nothing would be heard
        if (!soundMuted) sfx.powerDown();
        else pump(entry);
        onEvent("toggleSound");
      },
    });
  });
  // Spotifree on the monitor plays through these: the cones kick with the drums and notes
  // float up on some of the snares
  let noteSide = 0;
  const lofi = createLofi({
    onHit: (kind) => {
      speakers.forEach((speaker) => pump(speaker, kind === "kick" ? 0.7 : 0.35));
      if (kind === "snare" && Math.random() < 0.5) floatNote(speakers[noteSide++ % speakers.length]);
    },
    onTrack: (i) => {
      desktop.notify("spotifree", "Now playing", TRACKS[i].title);
      redrawScreen();
    },
  });
  // A track asked for while the sound is off: it starts once the speakers are switched on
  let pendingTrack = null;
  function startMusic(index = lofi.index) {
    if (soundMuted) {
      pendingTrack = index;
      onEvent("toggleSound");
      return;
    }
    const fresh = !lofi.playing;
    if (lofi.play(index) && fresh) desktop.notify("spotifree", "Now playing", TRACKS[lofi.index].title);
    redrawScreen();
  }
  function setMuted(isMuted) {
    speakerLeds.forEach((mat) => mat.color.set(isMuted ? "#e11d48" : "#16a34a"));
    const changed = isMuted !== soundMuted;
    soundMuted = isMuted;
    if (!changed) return;
    if (isMuted && lofi.playing) {
      lofi.pause();
      redrawScreen();
    }
    if (!isMuted && pendingTrack !== null) {
      const index = pendingTrack;
      pendingTrack = null;
      startMusic(index);
    } else if (!isMuted) {
      // Sound on: the groove, with the cones pumping on every beat and notes on the off-beats
      sfx.groove({ delay: 0.05 });
      for (let i = 0; i < 9; i++) {
        timers.push(setTimeout(() => {
          speakers.forEach((speaker, k) => {
            pump(speaker, i % 2 === 0 ? 1 : 0.5);
            if ((i + k) % 2 === 0) floatNote(speaker);
          });
        }, (0.05 + i * GROOVE_BEAT) * 1000));
      }
      speakers.forEach(({ tweeter }) => gsap.fromTo(tweeter.rotation, { y: 0 }, { y: Math.PI * 4, duration: 1.8, ease: "power2.out" }));
    } else {
      // Muted: the cabinets slump and the cones sink, then they straighten up, sulking
      speakers.forEach(({ group, woofer }) => {
        gsap.timeline()
          .to(group.scale, { x: 1.08, y: 0.8, z: 1.08, duration: 0.4, ease: "power2.in" })
          .to(group.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" });
        gsap.fromTo(woofer.scale, { x: 0.75, z: 0.75 }, { x: 1, z: 1, delay: 0.4, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      });
    }
  }
  setMuted(muted);

  // Printed at twice its layout size (drawTerminal still works in 640 × 384) so the text stays
  // crisp when the camera zooms right in on the screen
  // The terminal is drawn off screen, then shown in its window on the desktop
  const term = canvasTexture(1280, 768);
  term.ctx.scale(2, 2);
  track(term.texture);
  const screenTex = canvasTexture(SCREEN_W * 2, SCREEN_H * 2);
  screenTex.ctx.scale(2, 2);
  track(screenTex.texture);
  const screen = new THREE.Mesh(track(new THREE.PlaneGeometry(4.0, 2.4)), track(new THREE.MeshBasicMaterial({ map: screenTex.texture })));
  screen.position.set(0, 2.63, 0.09);
  screen.userData.tex = screenTex;
  monitor.add(screen);
  const desktop = createDesktop({
    terminal: term,
    player: lofi,
    actions: {
      toggle: () => (lofi.playing ? lofi.pause() : startMusic()),
      next: () => lofi.next(),
      prev: () => lofi.restartOrPrev(),
      playTrack: (i) => startMusic(i),
      focus: (name) => setFocus(name),
      terminalClick: () => autotype(AUTORUN[autorunIndex++ % AUTORUN.length]),
    },
  });
  let screenDrawnAt = 0;
  function redrawScreen() {
    screenDrawnAt = performance.now();
    // Hotspots come back in layout units; the canvas is printed at twice that
    screenTex.hotspots = desktop.draw(screenTex.ctx, { alert: termAlert, alertOn: cursorOn })
      .map((hs) => ({ ...hs, x: hs.x * 2, y: hs.y * 2, w: hs.w * 2, h: hs.h * 2 }));
    screenTex.texture.needsUpdate = true;
  }

  const wrapWords = (words, width = 30) =>
    words.reduce((lines, word) => {
      const last = lines[lines.length - 1];
      if (last !== undefined && (last + " " + word).length <= width) lines[lines.length - 1] = last ? `${last}  ${word}` : word;
      else lines.push(word);
      return lines;
    }, []);
  const COMMANDS = {
    help: ["whoami  projects  hobbies", "contact  clear  sudo hire oka"],
    whoami: ["oka sutarto putra", "full stack developer"],
    projects: wrapWords(projects.map((p) => p.id)),
    hobbies: ["games. games. more games."],
    contact: ["→ /#contact", "or try: sudo hire oka"],
    "sudo hire oka": ["[sudo] access granted ✔", "→ see /#contact"],
    welcome: ["# WELCOME TO MY DESK!", "hi, i'm oka, a full stack dev.", "click around: almost everything", "here does something.", "zoom in here and type: help"],
  };
  COMMANDS.ls = COMMANDS.projects;
  const AUTORUN = ["help", "whoami", "projects", "hobbies", "sudo hire oka"];
  const MAX_INPUT = 26;
  let termLines = ["oka@desk ready."];
  let welcomed = false;
  let input = "";
  let termBusy = false;
  let autorunIndex = 0;
  let cursorOn = true;
  // From the welcome until someone opens the monitor, its title bar flashes for attention
  let termAlert = false;
  const redrawTerminal = () => {
    drawTerminal(term.ctx, 640, 384, [...termLines, "> " + input], cursorOn, { alert: termAlert, alertOn: cursorOn });
    redrawScreen();
  };

  function execute(raw) {
    const cmd = raw.trim().toLowerCase().replace(/\s+/g, " ");
    termLines.push("> " + raw);
    input = "";
    if (cmd === "clear") termLines = [];
    else if (COMMANDS[cmd]) {
      termLines.push(...COMMANDS[cmd]);
      sfx.blip();
      onEvent("terminal", { command: cmd });
      if (cmd === "welcome") timers.push(setTimeout(onWelcomed, 150));
    } else if (cmd) {
      termLines.push(`command not found: ${cmd.slice(0, 14)}`, "try: help");
      sfx.buzz();
    }
    termLines = termLines.slice(-12);
    gsap.fromTo(body.scale, { x: 1.03, y: 0.97 }, { x: 1, y: 1, duration: 0.4, ease: "elastic.out(1.2, 0.4)" });
    redrawTerminal();
  }

  // Types a command out by itself (clicking the screen, the HUD's command chips)
  function autotype(cmd) {
    if (termBusy) return;
    termBusy = true;
    let i = 0;
    const typeNext = () => {
      if (i < cmd.length) {
        input = cmd.slice(0, ++i);
        sfx.key();
        redrawTerminal();
        timers.push(setTimeout(typeNext, 45 + Math.random() * 50));
      } else {
        timers.push(
          setTimeout(() => {
            termBusy = false;
            execute(cmd);
          }, 160),
        );
      }
    };
    typeNext();
  }

  // Real typing while zoomed in on the monitor
  function typeKey(key) {
    if (termBusy) return;
    if (key === "Enter") return execute(input);
    if (key === "Backspace") input = input.slice(0, -1);
    else if (input.length < MAX_INPUT) input += key;
    redrawTerminal();
  }

  // Once the room is in view, the terminal greets whoever just arrived. The greeting stays on
  // screen when they zoom in, so it can be read there; zooming in first types it then.
  const welcome = () => {
    if (welcomed) return;
    welcomed = true;
    autotype("welcome");
  };
  // The greeting lands with a hop of the monitor and the title bar starts flashing
  const onWelcomed = () => {
    if (focus.name === "monitor") return;
    termAlert = true;
    redrawTerminal();
    gsap.fromTo(monitor.position, { y: 0 }, { keyframes: [{ y: 0.3, duration: 0.15, ease: "power2.out" }, { y: 0, duration: 0.4, ease: "bounce.out" }] });
    sfx.ping();
  };
  timers.push(setTimeout(welcome, 1500));

  const showTerminal = () => {
    if (desktop.active() === "terminal") return;
    desktop.launch("terminal");
    redrawScreen();
  };
  register(monitor, {
    focus: "monitor",
    onEnter: () => {
      termAlert = false;
      welcome();
      redrawTerminal();
    },
    // Zoomed in, clicks land on the desktop's hotspots (dock, windows, player)
    onHotspot: (hs) => {
      desktop.click(hs);
      redrawScreen();
    },
    onHover: (on) => !on && desktop.hover(null) && redrawScreen(),
    onPointer: (hit) => {
      const moved = hit ? desktop.hover(hit.uv.x * SCREEN_W, (1 - hit.uv.y) * SCREEN_H) : desktop.hover(null);
      if (moved) redrawScreen();
    },
    // Spotifree up front takes space and the arrows; anything typed goes to the terminal
    onKey: (e) => {
      if (focus.name !== "monitor") return false;
      if (desktop.active() === "spotifree" && !e.repeat) {
        if (e.key === " ") return lofi.playing ? (lofi.pause(), redrawScreen(), true) : (startMusic(), true);
        if (e.key === "ArrowRight") return lofi.next(), true;
        if (e.key === "ArrowLeft") return lofi.restartOrPrev(), true;
      }
      if (e.key.length === 1 || e.key === "Enter" || e.key === "Backspace") showTerminal();
      return false;
    },
  });

  // ---------- ID badge on a lanyard, hung from a push pin on the About board's corner (hero) ----------
  // The board is 6.8 × 4.2 centred at (4.6, 3.9) on the back wall: the pin sits inside its
  // top-left corner and the badge hangs just off its left edge
  const BADGE_PIN = new THREE.Vector3(1.4, 5.65, -6.2);
  const BADGE_CLIP = new THREE.Vector3(1.4, 3.8, -6.1); // straight below the pin: the rope's resting shape
  const strapMat = toon("#ffdd00");
  // Where the pin is now: drag it to re-pin the badge anywhere on this stretch of wall
  const badgePin = BADGE_PIN.clone();
  const PIN_BOUNDS = { minX: 0.3, maxX: 8.0, minY: 4.3, maxY: 8.4 };
  // A strap point (or the pin, index 0) held by the pointer: { index, x, y }
  let ropeHold = null;
  // The strap is a little verlet rope: a chain of points from the pin to the badge's clip,
  // pulled by gravity and held at fixed lengths, with the badge as a heavy weight at the end.
  // A nudge (hover, click) kicks the lower points, so the strap bends and the badge lags
  // behind it, then everything settles back.
  const ROPE_SEGMENTS = 8;
  const ROPE_LENGTH = BADGE_PIN.distanceTo(BADGE_CLIP) * 1.02;
  const ropeSegment = ROPE_LENGTH / ROPE_SEGMENTS;
  const rope = Array.from({ length: ROPE_SEGMENTS + 1 }, (_, i) => {
    const p = new THREE.Vector3().lerpVectors(BADGE_PIN, BADGE_CLIP, i / ROPE_SEGMENTS);
    return { x: p.x, y: p.y, px: p.x, py: p.y, z: p.z };
  });
  // Inverse mass: the pin never moves, the badge end is four times heavier than the strap
  const ropeWeight = (i) => (i === 0 || i === ropeHold?.index ? 0 : i === ROPE_SEGMENTS ? 0.25 : 1);
  let ropeClock = 0;
  let ropeTime = 0;
  function stepRope(dt) {
    const gravity = -22;
    const breeze = Math.sin(ropeTime * 0.8) * 0.5 + Math.sin(ropeTime * 2.1) * 0.25;
    rope[0].x = badgePin.x;
    rope[0].y = badgePin.y;
    for (let i = 1; i < rope.length; i++) {
      const p = rope[i];
      if (i === ropeHold?.index) {
        // Held: ease toward the pointer, keeping the motion as velocity for the throw on release
        p.px = p.x;
        p.py = p.y;
        p.x += (ropeHold.x - p.x) * 0.35;
        p.y += (ropeHold.y - p.y) * 0.35;
        continue;
      }
      const vx = (p.x - p.px) * 0.985;
      const vy = (p.y - p.py) * 0.985;
      p.px = p.x;
      p.py = p.y;
      p.x += vx + (i === ROPE_SEGMENTS ? breeze : 0) * dt * dt;
      p.y += vy + gravity * dt * dt;
    }
    for (let k = 0; k < 8; k++) {
      for (let i = 0; i < ROPE_SEGMENTS; i++) {
        const a = rope[i];
        const b = rope[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1e-6;
        const wa = ropeWeight(i);
        const wb = ropeWeight(i + 1);
        const diff = (dist - ropeSegment) / (dist * (wa + wb));
        a.x += dx * diff * wa;
        a.y += dy * diff * wa;
        b.x -= dx * diff * wb;
        b.y -= dy * diff * wb;
      }
    }
  }
  // Two strands meeting at the pin and the clip, spread into a V along the way
  const strandGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
  const strands = [-1, 1].map(() => Array.from({ length: ROPE_SEGMENTS }, () => {
    const piece = mesh(strandGeo, strapMat, { outline: 0.03 });
    scene.add(piece);
    return piece;
  }));
  const strandA = new THREE.Vector3();
  const strandB = new THREE.Vector3();
  const strandDir = new THREE.Vector3();
  const strandPoint = (i, side, out) => {
    const t = i / ROPE_SEGMENTS;
    return out.set(rope[i].x + side * 0.17 * Math.sin(Math.PI * t), rope[i].y, rope[i].z + 0.02);
  };
  const strapPin = mesh(new THREE.SphereGeometry(0.11, 14, 10), toon("#e11d48"), { outline: 0.025 });
  strapPin.position.copy(BADGE_PIN).add(new THREE.Vector3(0, 0, 0.06));
  scene.add(strapPin);
  // Grabbing the lanyard: the pin, a point along the strap, or the badge (its clip end).
  // Works on the overview and the badge close-up, on the wall-parallel plane the strap hangs in.
  const lanyardPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(BADGE_PIN.z + 0.05));
  const lanyardPoint = new THREE.Vector3();
  const strapSegment = new THREE.Line3();
  const strapClosest = new THREE.Vector3();
  function lanyardAt(point, badgeHit) {
    if (Math.hypot(point.x - badgePin.x, point.y - badgePin.y) < 0.32) return { index: 0, strap: true, dx: 0, dy: 0 };
    let best = null;
    for (let i = 0; i < ROPE_SEGMENTS; i++) {
      strapSegment.start.set(rope[i].x, rope[i].y, point.z);
      strapSegment.end.set(rope[i + 1].x, rope[i + 1].y, point.z);
      const t = strapSegment.closestPointToPointParameter(point, true);
      const distance = strapSegment.at(t, strapClosest).distanceTo(point);
      if (distance < 0.28 && (!best || distance < best.distance)) best = { distance, index: Math.max(1, Math.round(i + t)) };
    }
    if (best) return { index: best.index, strap: true, dx: 0, dy: 0 };
    if (!badgeHit) return null;
    const end = rope[ROPE_SEGMENTS];
    return { index: ROPE_SEGMENTS, dx: point.x - end.x, dy: point.y - end.y };
  }
  function moveLanyard(hold, point) {
    if (hold.index === 0) {
      badgePin.x = THREE.MathUtils.clamp(point.x, PIN_BOUNDS.minX, PIN_BOUNDS.maxX);
      badgePin.y = THREE.MathUtils.clamp(point.y, PIN_BOUNDS.minY, PIN_BOUNDS.maxY);
      strapPin.position.x = badgePin.x;
      strapPin.position.y = badgePin.y;
      return;
    }
    // A strap point can't be pulled further from the pin than the strap reaches
    let x = point.x - hold.dx;
    let y = point.y - hold.dy;
    const reach = ropeSegment * hold.index;
    const away = Math.hypot(x - badgePin.x, y - badgePin.y);
    if (away > reach) {
      x = badgePin.x + ((x - badgePin.x) * reach) / away;
      y = badgePin.y + ((y - badgePin.y) * reach) / away;
    }
    ropeHold = { index: hold.index, x, y };
  }
  function grabLanyard(hold) {
    if (hold.index === 0) {
      gsap.to(strapPin.position, { z: BADGE_PIN.z + 0.4, duration: 0.18, ease: "back.out(2.5)", overwrite: true });
      sfx.pop({ pitch: 1.4 });
    } else {
      const p = rope[hold.index];
      ropeHold = { index: hold.index, x: p.x, y: p.y };
    }
  }
  function releaseLanyard(hold) {
    ropeHold = null;
    if (hold.index !== 0) return;
    gsap.to(strapPin.position, { z: BADGE_PIN.z + 0.06, duration: 0.22, ease: "power4.in", overwrite: true });
    gsap.fromTo(strapPin.scale, { x: 1.3, y: 0.7 }, { x: 1, y: 1, delay: 0.22, duration: 0.4, ease: "elastic.out(1.2, 0.4)" });
    sfx.tick({ pitch: 0.55, delay: 0.2 });
  }
  const badge = new THREE.Group();
  badge.position.copy(BADGE_CLIP);
  scene.add(badge);
  // The badge swings on its clip a little behind the strap's own angle: a damped spring
  let badgeAngle = 0;
  let badgeSpin = 0;
  function updateLanyard(dt) {
    ropeTime += dt;
    ropeClock += dt;
    const STEP = 1 / 120;
    while (ropeClock >= STEP) {
      stepRope(STEP);
      ropeClock -= STEP;
    }
    [-1, 1].forEach((side, s) =>
      strands[s].forEach((piece, i) => {
        strandPoint(i, side, strandA);
        strandPoint(i + 1, side, strandB);
        strandDir.subVectors(strandB, strandA);
        const length = strandDir.length();
        piece.position.copy(strandA).addScaledVector(strandDir, 0.5);
        piece.quaternion.setFromUnitVectors(UP, strandDir.normalize());
        piece.scale.set(1, length + 0.04, 1);
      }),
    );
    const end = rope[ROPE_SEGMENTS];
    const before = rope[ROPE_SEGMENTS - 2];
    badge.position.set(end.x, end.y, BADGE_CLIP.z);
    const target = Math.atan2(end.x - before.x, before.y - end.y);
    badgeSpin += (90 * (target - badgeAngle) - 7 * badgeSpin) * dt;
    badgeAngle += badgeSpin * dt;
    badge.rotation.z = badgeAngle;
  }
  // A sideways push on the lower part of the strap, strongest at the badge
  const swing = (amount) => {
    rope.forEach((p, i) => {
      const reach = i / ROPE_SEGMENTS;
      p.px -= amount * 0.09 * reach * reach;
    });
  };
  const clip = mesh(rbox(0.22, 0.16, 0.08, 0.03), toon("#888888"), { outline: 0.025 });
  const badgeCard = new THREE.Group();
  // About the size of a real ID card on a lanyard (it was reading as a clipboard)
  badgeCard.position.y = -0.74;
  const badgeFront = printed(0.8, 1.3, 560, (c, w, h) => drawBadge(c, w, h));
  badgeFront.position.z = 0.023;
  const badgeBack = printed(0.8, 1.3, 560, (c, w, h) => drawBadge(c, w, h, { back: true }));
  badgeBack.position.z = -0.023;
  badgeBack.rotation.y = Math.PI;
  badgeCard.add(mesh(rbox(0.8, 1.3, 0.04, 0.035), toon("#ffffff"), { outline: 0.03 }), badgeFront, badgeBack);
  badge.add(clip, badgeCard);
  // Zoomed in, clicking the badge turns it over: the links are printed on the back
  let badgeFlipped = false;
  const flipBadge = (to = !badgeFlipped) => {
    badgeFlipped = to;
    gsap.to(badgeCard.rotation, { y: to ? Math.PI : 0, duration: 0.6, ease: "back.out(1.4)", overwrite: true });
    // Turning, the card is wider than its gap to the board: lift it clear, then let it settle back
    gsap.fromTo(badgeCard.position, { z: 0 }, { keyframes: [{ z: 0.45, duration: 0.25, ease: "power2.out" }, { z: 0, duration: 0.35, ease: "power2.in" }] });
    sfx.whoosh({ duration: 0.3 });
  };
  register(badge, {
    focus: "hero",
    onHover: (on) => on && swing(0.18),
    onClick: () => {
      swing(0.2);
      flipBadge();
    },
    onLeave: () => badgeFlipped && flipBadge(false),
    // Arrival: a full spin (flashing the back: "if found, please hire") then a settle
    onArrive: () => {
      if (badgeFlipped) return;
      gsap.fromTo(badgeCard.rotation, { y: 0 }, { y: Math.PI * 2, duration: 1.1, ease: "power3.out", onComplete: () => !badgeFlipped && (badgeCard.rotation.y = 0) });
      gsap.fromTo(badgeCard.position, { z: 0 }, { keyframes: [{ z: 0.6, duration: 0.3, ease: "power2.out" }, { z: 0, duration: 0.8, ease: "power2.inOut" }] });
      sfx.whoosh({ duration: 0.5 });
    },
  });

  // ---------- pinned About board, matching the 2D sticker board ----------
  const aboutBoard = new THREE.Group();
  // Level with the painting across the room
  aboutBoard.position.set(4.6, 3.9, -6.38);
  scene.add(aboutBoard);
  const boardFrame = mesh(rbox(6.8, 4.2, 0.16, 0.06), toon("#9c6230"), { outline: 0.06 });
  const boardFace = printed(6.55, 3.95, 170, drawAboutBoard);
  boardFace.position.z = 0.09;
  aboutBoard.add(boardFrame, boardFace);
  const noteLayout = {
    who: [-1.95, 0.5, 2.35, 1.85],
    years: [-0.1, 0.9, 0.9, 1.0],
    projects: [1.1, 0.9, 0.9, 1.0],
    companies: [2.35, 0.9, 1.0, 1.0],
    stack: [1.9, -0.85, 2.35, 1.9],
    now: [-1.95, -1.48, 2.35, 0.8],
    location: [-0.02, -0.75, 1.0, 1.1],
    resume: [-1.95, -0.8, 2.35, 0.3],
  };
  // Papers are printed smaller than their layout slot, leaving room on the board to move them
  const NOTE_SCALE = 0.78;
  const pinGeo = new THREE.SphereGeometry(0.06, 12, 8);
  let noteDrag = null;
  let noteLayer = 0;
  const boardNotes = ABOUT_NOTES.map((note) => {
    const [x, y, slotW, slotH] = noteLayout[note.id];
    const w = slotW * NOTE_SCALE;
    const h = slotH * NOTE_SCALE;
    const paper = new THREE.Group();
    paper.position.set(x, y, 0.15);
    paper.rotation.z = -THREE.MathUtils.clamp(note.rotate, -2, 2) * Math.PI / 180;
    const backing = mesh(new THREE.BoxGeometry(w, h, 0.025), toon("#fffdf5"), { outline: 0.018 });
    // Same canvas as a full-size paper, so the print keeps its layout and sharpness
    const face = printed(w, h, 230 / NOTE_SCALE, (c, pw, ph) => drawAboutNote(c, pw, ph, note));
    face.position.z = 0.014;
    const pinY = h / 2 - Math.min(0.1, h * 0.15);
    const pin = new THREE.Group();
    pin.position.set(0, pinY, 0.09);
    const head = mesh(pinGeo, toon(note.pin), { outline: 0.012 });
    const highlight = new THREE.Mesh(track(new THREE.SphereGeometry(0.018, 8, 6)), track(new THREE.MeshBasicMaterial({ color: "#fff" })));
    highlight.position.set(-0.022, 0.023, 0.044);
    const needle = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.24, 8), toon("#9ca3af"), { outline: 0, cast: false });
    needle.rotation.x = Math.PI / 2;
    needle.position.z = -0.13;
    pin.add(head, needle, highlight);
    const ring = new THREE.Mesh(track(new THREE.RingGeometry(0.072, 0.084, 24)), track(new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0, depthWrite: false })));
    ring.position.set(0, pinY, 0.028);
    const pinShadow = new THREE.Mesh(track(new THREE.CircleGeometry(0.075, 20)), track(new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.3, depthWrite: false })));
    pinShadow.position.set(0.025, pinY - 0.035, 0.025);
    pinShadow.scale.y = 0.65;
    const shadow = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), track(new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.32, depthWrite: false })));
    shadow.position.set(x + 0.04, y - 0.04, 0.115);
    shadow.rotation.z = paper.rotation.z;
    paper.add(backing, face, pinShadow, pin, ring);
    aboutBoard.add(shadow, paper);
    return { paper, shadow, pin, pinShadow, head, ring, w, h, href: note.href, angle: paper.rotation.z };
  });
  function clampNote(note, x, y) {
    // Leave room for the resting tilt and the lifted scale at every board edge.
    const angle = Math.max(Math.abs(note.angle), 0.035);
    const halfW = (note.w * Math.cos(angle) + note.h * Math.sin(angle)) * 0.53;
    const halfH = (note.h * Math.cos(angle) + note.w * Math.sin(angle)) * 0.53;
    return {
      x: THREE.MathUtils.clamp(x, -3.235 + halfW, 3.235 - halfW),
      y: THREE.MathUtils.clamp(y, -1.935 + halfH, 1.935 - halfH),
    };
  }
  function notesOverlap(a, b) {
    const extent = (note) => ({
      x: (note.w * Math.cos(note.angle) + note.h * Math.abs(Math.sin(note.angle))) / 2 + 0.02,
      y: (note.h * Math.cos(note.angle) + note.w * Math.abs(Math.sin(note.angle))) / 2 + 0.02,
    });
    const aa = extent(a);
    const bb = extent(b);
    return Math.abs(a.paper.position.x - b.paper.position.x) < aa.x + bb.x &&
      Math.abs(a.paper.position.y - b.paper.position.y) < aa.y + bb.y;
  }
  function liftNote(note) {
    gsap.killTweensOf([note.paper.position, note.paper.rotation, note.paper.scale, note.pin.position, note.pin.rotation, note.head.scale, note.shadow.position, note.shadow.rotation, note.shadow.scale, note.pinShadow.position, note.pinShadow.material, note.ring.scale, note.ring.material]);
    note.ring.material.opacity = 0;
    note.layer = ++noteLayer;
    [...boardNotes].sort((a, b) => (a.layer || 0) - (b.layer || 0)).forEach((entry, i) => {
      entry.restZ = 0.15 + i * 0.006;
      if (entry !== note) gsap.to(entry.paper.position, { z: entry.restZ, duration: 0.15 });
    });
    gsap.to(note.paper.position, { z: note.restZ + 0.12, duration: 0.2 });
    gsap.to(note.paper.scale, { x: 1.04, y: 1.04, duration: 0.2 });
    gsap.to(note.paper.rotation, { z: 0, duration: 0.2 });
    gsap.to(note.shadow.position, { x: note.paper.position.x + 0.1, y: note.paper.position.y - 0.1, duration: 0.2 });
    gsap.to(note.shadow.scale, { x: 1.04, y: 1.04, duration: 0.2 });
    gsap.to(note.shadow.rotation, { z: 0, duration: 0.2 });
    gsap.to(note.pin.position, { x: 0.07, y: note.h / 2 + 0.09, z: 0.4, duration: 0.25, ease: "back.out(2.5)" });
    gsap.to(note.pin.rotation, { z: -0.45, duration: 0.25 });
    gsap.to(note.pinShadow.position, { x: 0.13, y: note.h / 2 - 0.23, duration: 0.25 });
    gsap.to(note.pinShadow.material, { opacity: 0.12, duration: 0.25 });
    sfx.pop({ pitch: 1.4 });
  }
  function pinNote(note, sound = true, position = note.paper.position) {
    const { x, y } = position;
    gsap.to(note.paper.position, { x, y, z: note.restZ ?? 0.15, duration: 0.3, ease: "power2.out" });
    gsap.to(note.paper.scale, { x: 1, y: 1, duration: 0.3, ease: "back.out(3)" });
    gsap.to(note.paper.rotation, { z: note.angle, duration: 0.35, ease: "back.out(2)" });
    gsap.to(note.shadow.position, { x: x + 0.04, y: y - 0.04, duration: 0.3 });
    gsap.to(note.shadow.scale, { x: 1, y: 1, duration: 0.3 });
    gsap.to(note.shadow.rotation, { z: note.angle, duration: 0.35 });
    gsap.to(note.pin.position, { x: 0, y: note.h / 2 - Math.min(0.1, note.h * 0.15), z: 0.09, delay: 0.12, duration: 0.22, ease: "power4.in" });
    gsap.to(note.pin.rotation, { z: 0, delay: 0.12, duration: 0.22 });
    gsap.to(note.pinShadow.position, { x: 0.025, y: note.h / 2 - Math.min(0.1, note.h * 0.15) - 0.035, delay: 0.12, duration: 0.22 });
    gsap.to(note.pinShadow.material, { opacity: 0.3, delay: 0.12, duration: 0.22 });
    gsap.fromTo(note.head.scale, { x: 1.25, y: 0.75 }, { x: 1, y: 1, delay: 0.34, duration: 0.4, ease: "elastic.out(1.2, 0.4)" });
    gsap.fromTo(note.ring.scale, { x: 0.4, y: 0.4 }, { x: 1.8, y: 1.8, delay: 0.34, duration: 0.4 });
    gsap.fromTo(note.ring.material, { opacity: 0.65 }, { opacity: 0, delay: 0.34, duration: 0.4 });
    if (sound) sfx.tick({ pitch: 0.55, delay: 0.32 });
  }
  boardNotes.forEach((note) => register(note.paper, {
    focus: "about", item: true, note,
    onHover: (on) => {
      if (!noteDrag) renderer.domElement.style.cursor = on ? "grab" : "default";
    },
  }));
  let boardIntroduced = false;
  register(aboutBoard, {
    focus: "about",
    onArrive: () => {
      if (boardIntroduced) return;
      boardIntroduced = true;
      boardNotes.forEach((note, i) => {
        if (noteDrag?.note === note) return;
        gsap.fromTo(note.paper.scale, { x: 0.88, y: 0.88 }, { x: 1, y: 1, duration: 0.4, delay: i * 0.06, ease: "back.out(2)" });
        gsap.fromTo(note.pin.position, { z: 0.5 }, { z: 0.09, duration: 0.3, delay: i * 0.06 + 0.15, ease: "bounce.out" });
        timers.push(setTimeout(() => sfx.tick({ pitch: 0.55 }), (i * 0.06 + 0.4) * 1000));
      });
    },
    onLeave: () => finishNoteDrag(),
  });

  // ---------- keyboard: a standard 60% layout ----------
  // Every key is its own cap with its legend printed on top, keyed by KeyboardEvent.code, so the
  // key you press on your own keyboard presses the very same key on the desk.
  // A felt desk mat under the keyboard and the mouse, wide enough for the mouse's run
  const MAT_TOP = 0.03;
  const matMat = toon("#ffffff");
  const matPrint = canvasTexture(1360, 460);
  track(matPrint.texture);
  drawDeskMat(matPrint.ctx, 1360, 460);
  matMat.map = matPrint.texture;
  const deskMatPad = mesh(rbox(6.8, MAT_TOP, 2.3, 0.014), matMat, { outline: 0.03, cast: false });
  deskMatPad.position.set(0.9, MAT_TOP / 2, 0.75);
  scene.add(deskMatPad);

  const keyboard = new THREE.Group();
  keyboard.position.set(0.2, MAT_TOP, 0.75);
  scene.add(keyboard);
  const keyBase = mesh(rbox(4.6, 0.25, 1.7), toon("#1f1f1f"));
  keyBase.position.y = 0.125;
  keyboard.add(keyBase);
  const KEY_UNIT = 0.292;
  const KEY_GAP = 0.036;
  const KEY_Y = 0.34;
  const letters = (row) => row.split("").map((ch) => [`Key${ch}`, ch]);
  const KEY_ROWS = [
    [["Escape", "ESC"], ...Array.from({ length: 10 }, (_, i) => [`Digit${(i + 1) % 10}`, String((i + 1) % 10)]), ["Minus", "-"], ["Equal", "="], ["Backspace", "⌫", 2]],
    [["Tab", "TAB", 1.5], ...letters("QWERTYUIOP"), ["BracketLeft", "["], ["BracketRight", "]"], ["Backslash", "\\", 1.5]],
    [["CapsLock", "CAPS", 1.75], ...letters("ASDFGHJKL"), ["Semicolon", ";"], ["Quote", "'"], ["Enter", "ENTER", 2.25]],
    [["ShiftLeft", "SHIFT", 2.25], ...letters("ZXCVBNM"), ["Comma", ","], ["Period", "."], ["Slash", "/"], ["ShiftRight", "SHIFT", 2.75]],
    [["ControlLeft", "CTRL", 1.25], ["MetaLeft", "⌘", 1.25], ["AltLeft", "ALT", 1.25], ["Space", "", 6.25], ["AltRight", "ALT", 1.25], ["MetaRight", "⌘", 1.25], ["ContextMenu", "FN", 1.25], ["ControlRight", "CTRL", 1.25]],
  ];
  // Shortcut keys, printed in colour: digits fly to the sections, T to the terminal, C to the
  // chat. They work from your own keyboard too.
  const SHORTCUTS = {
    1: { shot: "hero", code: "Digit1", color: "#ffdd00" },
    2: { shot: "about", code: "Digit2", color: "#ff90e8" },
    3: { shot: "experience", code: "Digit3", color: "#00e0c6" },
    4: { shot: "projects", code: "Digit4", color: "#f5c76b" },
    5: { shot: "contact", code: "Digit5", color: "#e9c48a" },
    t: { shot: "monitor", code: "KeyT", color: "#8fd694" },
    c: { shot: "chat", code: "KeyC", color: "#7fb2ff" },
  };
  const shortcutByCode = new Map(Object.values(SHORTCUTS).map((sc) => [sc.code, sc]));
  const MODIFIERS = new Set(["Tab", "CapsLock", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "MetaLeft", "MetaRight", "AltLeft", "AltRight", "ContextMenu", "Backspace"]);
  const keyColor = (code) => shortcutByCode.get(code)?.color || (code === "Escape" ? "#ff6b6b" : code === "Enter" ? "#00e0c6" : MODIFIERS.has(code) ? "#d9d4c7" : "#fffdf5");
  const keyMats = new Map();
  const keyMat = (color) => keyMats.get(color) || keyMats.set(color, toon(color)).get(color);
  const keyByCode = new Map();
  KEY_ROWS.forEach((row, r) => {
    let cursor = -7.5; // the rows are 15 units wide
    row.forEach(([code, label, width = 1]) => {
      const w = width * KEY_UNIT - KEY_GAP;
      const d = KEY_UNIT - KEY_GAP;
      const color = keyColor(code);
      const key = new THREE.Group();
      key.position.set((cursor + width / 2) * KEY_UNIT, KEY_Y, (r - 2) * KEY_UNIT);
      key.userData.code = code;
      key.add(mesh(rbox(w, 0.18, d, 0.05), keyMat(color), { outline: 0.03 }));
      if (label) {
        const legend = printed(w - 0.05, d - 0.05, 340, (c, cw, ch) => drawKeyLabel(c, cw, ch, label, color));
        legend.rotation.x = -Math.PI / 2;
        legend.position.y = 0.092;
        key.add(legend);
      }
      keyboard.add(key);
      keyByCode.set(code, key);
      cursor += width;
    });
  });
  keyByCode.set("Backquote", keyByCode.get("Escape")); // 60% boards put Esc where ` sits

  let keysPressed = 0;
  function pressKey(code, { sound = true } = {}) {
    const key = keyByCode.get(code);
    if (!key) return;
    gsap.fromTo(key.position, { y: KEY_Y - 0.11 }, { y: KEY_Y, duration: 0.28, ease: "back.out(3)", overwrite: true });
    if (sound) code === "Space" ? sfx.thud({ strength: 0.25 }) : sfx.key();
    onEvent("keys", { count: ++keysPressed });
  }
  const hitKey = (hit) => {
    let code = null;
    for (let o = hit.object; o && !code; o = o.parent) code = o.userData.code;
    if (!code) return;
    pressKey(code);
    if (code === "Escape") return timers.push(setTimeout(back, 200));
    const sc = shortcutByCode.get(code);
    if (sc) timers.push(setTimeout(() => setFocus(sc.shot), 200));
  };
  register(keyboard, { focus: "keyboard", onClick: hitKey });
  const onKeyDown = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea, [contenteditable]")) return;
    if (e.key === "Escape") {
      pressKey("Escape");
      return back();
    }
    if (byFocus.get(focus.name)?.onKey?.(e)) return e.preventDefault();
    // Shortcuts (not while the terminal has the keyboard: there they're just typing)
    const sc = focus.name !== "monitor" && !e.repeat && SHORTCUTS[e.key.toLowerCase()];
    if (sc) {
      pressKey(sc.code);
      return setFocus(sc.shot);
    }
    if (focus.name === "monitor" && (e.key.length === 1 || e.key === "Enter" || e.key === "Backspace")) {
      e.preventDefault();
      if (e.repeat && e.key === "Enter") return;
      typeKey(e.key);
      pressKey(e.code, { sound: !termBusy });
    } else if (!e.repeat) pressKey(e.code);
  };
  window.addEventListener("keydown", onKeyDown);

  // ---------- mouse (decor) ----------
  const mouse = new THREE.Group();
  mouse.position.set(3.75, MAT_TOP, 0.5);
  mouse.rotation.y = -0.12;
  scene.add(mouse);
  const mouseBody = mesh(rbox(0.5, 0.26, 0.8, 0.13), toon("#ffffff"), { outline: 0.035 });
  mouseBody.position.y = 0.13;
  const seam = new THREE.Mesh(track(new THREE.BoxGeometry(0.02, 0.01, 0.34)), shadowFill);
  seam.position.set(0, 0.262, -0.2);
  const wheel = mesh(rbox(0.07, 0.06, 0.14, 0.02), toon("#e11d48"), { outline: 0.015, cast: false });
  wheel.position.set(0, 0.27, -0.2);
  mouse.add(mouseBody, seam, wheel);
  // It follows your real cursor over the desk, and clicks when you click.
  const MOUSE_ORIGIN = { x: 3.7, z: 0.45 };
  const mouseAim = { x: 3.75, z: 0.5 };
  const pressMouse = () => gsap.fromTo(mouseBody.position, { y: 0.09 }, { y: 0.13, duration: 0.2, ease: "back.out(3)" });
  // Click it and it turns into a real mouse for a moment: ears, eyes and a tail pop out, and it
  // scampers two laps round the clear patch of desk beside the keyboard, then goes back to work
  const earMat = toon("#d4d4d8");
  const critter = [];
  [-1, 1].forEach((side) => {
    const ear = mesh(new THREE.SphereGeometry(0.11, 14, 10), earMat, { outline: 0.015 });
    ear.scale.set(1, 1, 0.35);
    ear.position.set(side * 0.15, 0.36, -0.12);
    const inner = mesh(new THREE.SphereGeometry(0.065, 12, 8), toon("#ff90e8"), { outline: 0 });
    inner.position.z = 0.04;
    ear.add(inner);
    const eye = mesh(new THREE.SphereGeometry(0.035, 10, 8), toon("#000000"), { outline: 0 });
    eye.position.set(side * 0.1, 0.24, -0.36);
    critter.push(ear, eye);
  });
  const tailCurve = new THREE.CatmullRomCurve3([[0, 0.08, 0.38], [0, 0.06, 0.55], [0.13, 0.06, 0.66], [0.04, 0.12, 0.76], [-0.08, 0.2, 0.76]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const tail = mesh(new THREE.TubeGeometry(tailCurve, 24, 0.022, 6), toon("#ff90e8"), { outline: 0.012 });
  critter.push(tail);
  critter.forEach((part) => {
    part.userData.scale = part.scale.clone();
    part.scale.setScalar(0.001);
    mouse.add(part);
  });
  let mouseRunning = false;
  // Two laps of an ellipse in the clear patch between the keyboard (x < 2.5), the coaster
  // (x > 4.76), the phone stand (z < -1.36) and the envelope (z > 2.18), with room for its body
  const RUN = { x: 3.63, z: 0.4, rx: 0.62, rz: 1.05 };
  const onLap = (a) => ({ x: RUN.x + Math.cos(a) * RUN.rx, z: RUN.z + Math.sin(a) * RUN.rz });
  const leg = () => ({ u: 0 });
  function scamper() {
    if (mouseRunning) return;
    mouseRunning = true;
    critter.forEach((part, i) => gsap.to(part.scale, { ...part.userData.scale, duration: 0.3, delay: i * 0.04, ease: "back.out(3)" }));
    sfx.squeak();
    const start = { x: mouse.position.x, z: mouse.position.z };
    // Join the loop where it's nearest, run it twice round, and leave from the same point
    const A0 = Math.atan2((start.z - RUN.z) / RUN.rz, (start.x - RUN.x) / RUN.rx);
    const lap = onLap(A0);
    let last = { ...start };
    // Turns ease round instead of snapping, the short way round
    const place = (p) => {
      const dx = p.x - last.x;
      const dz = p.z - last.z;
      if (Math.hypot(dx, dz) > 1e-4) {
        const target = Math.atan2(-dx, -dz);
        const turn = Math.atan2(Math.sin(target - mouse.rotation.y), Math.cos(target - mouse.rotation.y));
        mouse.rotation.y += turn * 0.35;
      }
      mouse.position.x = p.x;
      mouse.position.z = p.z;
      last = p;
      wheel.rotation.x -= 0.4;
      mouseBody.position.y = 0.13 + Math.abs(Math.sin(performance.now() / 55)) * 0.03;
    };
    const [out, laps, home] = [leg(), leg(), leg()];
    gsap.timeline({
      onComplete: () => {
        mouseRunning = false;
        mouseBody.position.y = 0.13;
        mouse.rotation.y = Math.atan2(Math.sin(mouse.rotation.y), Math.cos(mouse.rotation.y));
        critter.forEach((part) => gsap.to(part.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.25, ease: "back.in(2)" }));
        gsap.to(mouse.rotation, { y: -0.12, duration: 0.4, ease: "back.out(2)" });
      },
    })
      .delay(0.35)
      .to(out, { u: 1, duration: 0.25, ease: "power1.in", onUpdate: () => place({ x: start.x + (lap.x - start.x) * out.u, z: start.z + (lap.z - start.z) * out.u }) })
      .to(laps, { u: 1, duration: 3.2, ease: "sine.inOut", onUpdate: () => place(onLap(A0 - laps.u * Math.PI * 4)) })
      .to(home, { u: 1, duration: 0.35, ease: "power2.out", onUpdate: () => place({ x: lap.x + (mouseAim.x - lap.x) * home.u, z: lap.z + (mouseAim.z - lap.z) * home.u }) });
    [0.4, 1.3, 2.2, 3.0].forEach((delay) => sfx.patter({ duration: 0.7, delay }));
    timers.push(setTimeout(() => sfx.squeak(), 4100));
  }
  register(mouse, {
    onHover: hoverScale(mouse, 1.06),
    onClick: () => {
      sfx.click();
      scamper();
    },
  });

  // ---------- boarding passes (experience) ----------
  // Zoomed in, the stack fans out. Click a pass to hold it up to the camera, click it again to
  // turn it over to its itinerary; ← → hold the previous / next one.
  const tickets = new THREE.Group();
  tickets.position.set(-4.4, 0, 2.7);
  tickets.rotation.y = 0.12;
  scene.add(tickets);
  const TICKET_W = 2.6;
  const TICKET_D = 1.0;
  const ticketGeo = track(new THREE.BoxGeometry(TICKET_W, 0.02, TICKET_D));
  const ticketBody = toon("#fffdf5");
  const ticketList = experiences.map((exp, i) => {
    const t = new THREE.Group();
    const flipper = new THREE.Group();
    t.add(flipper);
    flipper.add(mesh(ticketGeo, ticketBody, { outline: 0.025 }));
    const face = printed(TICKET_W, TICKET_D, 400, (c, w, h) => drawTicket(c, w, h, exp));
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.012;
    const back = printed(TICKET_W, TICKET_D, 400, (c, w, h) => drawTicketBack(c, w, h, exp));
    back.rotation.x = Math.PI / 2;
    back.position.y = -0.012;
    flipper.add(face, back);
    // Newest on top of the stack; fanned out they cascade toward you
    const y = 0.012 + (experiences.length - 1 - i) * 0.024;
    const stack = { x: (Math.random() - 0.5) * 0.12, y, z: (Math.random() - 0.5) * 0.1, r: (Math.random() - 0.5) * 0.12 };
    const fan = { x: i * 0.1, y, z: i * 0.45, r: -0.04 + i * 0.02 };
    t.position.set(stack.x, stack.y, stack.z);
    t.rotation.y = stack.r;
    tickets.add(t);
    return { t, flipper, stack, fan, flipped: false };
  });
  // Held up: above the fan, square to the group and tilted to face the camera
  const HOLD = { x: 0.2, y: 1.4, z: 0.8 };
  const HOLD_TILT = Math.atan2(0.5, 1);
  let heldTicket = null;
  function settleTicket(entry, to) {
    entry.flipped = false;
    gsap.to(entry.flipper.rotation, { x: 0, duration: 0.3 });
    gsap.to(entry.t.position, { x: to.x, y: to.y, z: to.z, duration: 0.4, ease: "power2.inOut" });
    gsap.to(entry.t.rotation, { x: 0, y: to.r, duration: 0.4 });
    gsap.to(entry.t.scale, { x: 1, y: 1, z: 1, duration: 0.4 });
  }
  // Hover works like a wallet's card stack: the hovered pass stays put and every pass lying
  // over it (the ones behind it in the fan) slides back to open a gap, so it shows whole.
  // Each pass only ever moves along its own layer, so nothing can pass through anything,
  // and every offset rides a critically damped spring, so sweeping fast stays smooth.
  const TICKET_REVEAL = 0.62; // the overlap with the pass behind (fan step 0.45, depth 1.0) plus a margin
  const SPRING = 160;
  const DAMPING = 2 * Math.sqrt(SPRING);
  function hoverTicket(entry, on) {
    entry.hoverTarget = on ? 1 : 0;
  }
  function updateTicketHover(dt) {
    const hoveredIndex = ticketList.findIndex((entry) => entry.hoverTarget === 1 && entry !== heldTicket);
    ticketList.forEach((entry, i) => {
      if (entry === heldTicket) return;
      const goalZ = hoveredIndex >= 0 && i < hoveredIndex ? -TICKET_REVEAL : 0;
      // A hair of lift for the hovered one, well under the 0.024 gap between layers
      const goalY = i === hoveredIndex ? 0.01 : 0;
      const p = entry.flipper.position;
      entry.vz = (entry.vz || 0) + (SPRING * (goalZ - p.z) - DAMPING * (entry.vz || 0)) * dt;
      entry.vy = (entry.vy || 0) + (SPRING * (goalY - p.y) - DAMPING * (entry.vy || 0)) * dt;
      p.z += entry.vz * dt;
      p.y += entry.vy * dt;
    });
  }
  function holdTicket(entry) {
    if (heldTicket === entry) return;
    Object.assign(entry, { vz: 0, vy: 0, hoverTarget: 0 });
    gsap.to(entry.flipper.position, { y: 0, z: 0, duration: 0.3, ease: "power2.out" });
    if (heldTicket) settleTicket(heldTicket, heldTicket.fan);
    heldTicket = entry;
    gsap.to(entry.t.position, { ...HOLD, duration: 0.5, ease: "back.out(1.4)" });
    gsap.to(entry.t.rotation, { x: HOLD_TILT, y: -tickets.rotation.y, duration: 0.5 });
    gsap.to(entry.t.scale, { x: 1.45, y: 1.45, z: 1.45, duration: 0.5, ease: "back.out(1.4)" });
    sfx.whoosh({ duration: 0.3 });
    applyShot();
  }
  function dropTicket() {
    if (!heldTicket) return;
    settleTicket(heldTicket, heldTicket.fan);
    heldTicket = null;
    sfx.paper();
    applyShot();
  }
  function flipTicket(entry) {
    entry.flipped = !entry.flipped;
    gsap.to(entry.flipper.rotation, { x: entry.flipped ? Math.PI : 0, duration: 0.55, ease: "back.out(1.3)" });
    sfx.whoosh({ duration: 0.3 });
  }
  const arrangeTickets = (fanned) => {
    heldTicket = null;
    ticketList.forEach((entry, i) => {
      const to = fanned ? entry.fan : entry.stack;
      timers.push(setTimeout(() => settleTicket(entry, to), (fanned ? i : ticketList.length - 1 - i) * 70));
    });
    sfx.riffle({ count: ticketList.length, duration: 0.3 });
  };
  const ticketFor = (obj) => ticketList.find(({ t }) => {
    for (let o = obj; o; o = o.parent) if (o === t) return true;
    return false;
  });
  const clickTicket = (hit) => {
    const entry = ticketFor(hit.object);
    if (!entry) return;
    entry === heldTicket ? flipTicket(entry) : holdTicket(entry);
  };
  // Hover lifts just the pass under the pointer
  ticketList.forEach((entry) =>
    register(entry.t, {
      focus: "experience",
      item: true,
      // Each pass lies partly under the one behind it, so it slides forward out from under
      // that one first and only then lifts; leaving, it settles down before sliding back
      onHover: (on) => entry !== heldTicket && hoverTicket(entry, on),
      onClick: clickTicket,
    }),
  );
  register(tickets, {
    focus: "experience",
    onArrive: () => arrangeTickets(true),
    onLeave: () => arrangeTickets(false),
    onClick: clickTicket,
    onKey: (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return false;
      const at = heldTicket ? ticketList.indexOf(heldTicket) : -1;
      const next = Math.max(0, Math.min(ticketList.length - 1, at + (e.key === "ArrowRight" ? 1 : -1)));
      holdTicket(ticketList[at < 0 ? 0 : next]);
      return true;
    },
  });

  // ---------- phone on a stand (AI chat) ----------
  // The chat with the AI assistant runs on the phone's screen: type (or tap a suggested
  // question), the reply streams in, the wheel scrolls back through it.
  const phoneStand = new THREE.Group();
  phoneStand.position.set(3.85, 0, -1.95);
  phoneStand.rotation.y = -0.3;
  scene.add(phoneStand);
  const standMat = toon("#222222");
  const standBase = mesh(rbox(1.1, 0.14, 0.9, 0.04), standMat, { outline: 0.03 });
  standBase.position.y = 0.07;
  const standBack = mesh(rbox(0.7, 1.2, 0.1, 0.03), standMat, { outline: 0.03 });
  standBack.position.set(0, 0.6, -0.3);
  standBack.rotation.x = -0.28;
  const phone = new THREE.Group();
  phone.position.set(0, 1.12, -0.12);
  phone.rotation.x = -0.28;
  let unread = true;
  const chat = { messages: [], input: "", active: false, waiting: false, scroll: 0, maxScroll: 0 };
  let chatDirty = false;
  let chatTypingAt = 0;
  // A cosmic orange iPhone 17 Pro Max: tall aluminium body behind a thin black bezel, with the
  // full-width camera plateau across the top of the back (three lenses and a flash)
  const phoneOrange = toon("#f47b20");
  const phoneScreen = printed(0.84, 1.82, 700, (c, w, h) => drawChatScreen(c, w, h, chat, { unread, caret: caretOn && chat.active }));
  phoneScreen.position.z = 0.059;
  const phoneBezel = mesh(rbox(0.89, 1.87, 0.02, 0.1), toon("#111111"), { outline: 0, cast: false });
  phoneBezel.position.z = 0.047;
  const plateau = mesh(rbox(0.93, 0.5, 0.05, 0.08), phoneOrange, { outline: 0.025 });
  plateau.position.set(0, 0.7, -0.065);
  const lensMat = toon("#1a1a1a");
  [[-0.27, 0.8], [-0.27, 0.6], [-0.1, 0.7]].forEach(([x, y]) => {
    const lens = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 20), lensMat, { outline: 0.015 });
    lens.rotation.x = Math.PI / 2;
    lens.position.set(-x, y, -0.1);
    phone.add(lens);
  });
  const camFlash = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12), toon("#fff3d6"), { outline: 0 });
  camFlash.rotation.x = Math.PI / 2;
  camFlash.position.set(-0.3, 0.7, -0.092);
  phone.add(
    mesh(rbox(0.95, 1.95, 0.09, 0.13), phoneOrange, { outline: 0.035 }),
    phoneBezel,
    phoneScreen,
    plateau,
    camFlash,
  );
  phoneStand.add(standBase, standBack, phone);
  const redrawChat = () => phoneScreen.userData.tex.redraw();
  function editChat() {
    chat.active = true;
    startTyping({
      id: "input",
      get: () => chat.input,
      set: (value) => (chat.input = value.replace(/\n/g, " ")),
      maxLength: 300,
      redraw: redrawChat,
      onEnter: () => sendChat(),
      onStop: () => (chat.active = false),
    });
  }
  async function sendChat(text = chat.input) {
    text = text.trim();
    if (!text || chat.waiting) return;
    chat.messages.push({ sender: "user", text });
    chat.input = "";
    typer.value = "";
    const reply = { sender: "bot", text: "", pending: true };
    chat.messages.push(reply);
    chat.waiting = true;
    chat.scroll = 0;
    redrawChat();
    sfx.pop({ pitch: 1.2 });
    try {
      await getStreamingResponse(text, (token) => {
        reply.text += token;
        chatDirty = true;
      });
      sfx.pop();
    } catch {
      reply.text = "Sorry, I couldn't reach my brain just now. Try again in a bit?";
      sfx.buzz();
    }
    if (destroyed) return;
    reply.pending = false;
    chat.waiting = false;
    chatDirty = true;
  }
  // Unread message: the phone buzzes now and then until you pick it up
  const buzz = () => {
    if (!unread || focus.name !== "overview") return;
    gsap.fromTo(phone.rotation, { z: 0.06 }, { z: 0, duration: 0.5, ease: "elastic.out(1.4, 0.2)" });
  };
  const buzzTimer = setInterval(buzz, 4000);
  register(phoneStand, {
    focus: "chat",
    onHover: hoverScale(phone, 1.05),
    // Arrival: the phone hops, the unread badge clears and the chat box takes the keyboard
    onArrive: () => {
      gsap.fromTo(phone.position, { y: 1.26 }, { y: 1.12, duration: 0.4, ease: "bounce.out" });
      unread = false;
      sfx.ping();
      editChat();
    },
    onClick: editChat,
    onHotspot: (hs) => {
      if (hs.id === "send") sendChat();
      else if (hs.id === "ask") sendChat(hs.text);
      else editChat();
    },
  });
  const onWheel = (e) => {
    if (focus.name !== "chat" || !chat.maxScroll) return;
    e.preventDefault();
    chat.scroll = Math.max(0, Math.min(chat.maxScroll, chat.scroll - e.deltaY));
    redrawChat();
  };
  renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

  // ---------- case files (projects) ----------
  // The folders stand in a file drawer, like the 2D Projects section: a dark box with a yellow
  // front panel, the folders upright inside with the back ones a little higher so every tab
  // shows. Zoomed in, you browse them right there: the front folder is pulled up to be read,
  // a tab (or ← →) flips through, and a folder flipped past is refiled at the back. Click the
  // front one to pull it out onto the desk and open it; its sheets then turn like pages (right
  // side forward, left side back, or ← →). The last sheet carries the links as stamps.
  const FOLDER_W = 2.2;
  const FOLDER_D = 1.65;
  const SHEET_W = FOLDER_W - 0.08;
  const SHEET_D = FOLDER_D - 0.08;
  const folders = new THREE.Group();
  // At the left end of the desk, under the window, its front turned to face the room (+x)
  folders.position.set(-6.3, 0, -0.5);
  folders.rotation.y = Math.PI / 2;
  scene.add(folders);
  // The drawer, in the folders group's own space
  const DRAWER_W = FOLDER_W + 0.32;
  const DRAWER_D = projects.length * 0.17 + 0.45;
  const DRAWER_H = 0.95;
  const WALL = 0.08;
  const drawerMat = toon("#2b2b2b");
  const drawerPart = (w, h, d, x, y, z, material = drawerMat) => {
    const part = mesh(rbox(w, h, d, 0.02), material, { outline: 0.03 });
    part.position.set(x, y, z);
    folders.add(part);
    return part;
  };
  drawerPart(DRAWER_W, WALL, DRAWER_D, 0, WALL / 2, 0);
  drawerPart(DRAWER_W, DRAWER_H, WALL, 0, DRAWER_H / 2, -DRAWER_D / 2 + WALL / 2);
  drawerPart(WALL, DRAWER_H, DRAWER_D, -DRAWER_W / 2 + WALL / 2, DRAWER_H / 2, 0);
  drawerPart(WALL, DRAWER_H, DRAWER_D, DRAWER_W / 2 - WALL / 2, DRAWER_H / 2, 0);
  const FRONT_H = DRAWER_H * 0.78;
  // Pulled out, a folder is turned square to the room and laid on the desk in front of the
  // drawer, between the keyboard and the speaker, its cover opening back toward the drawer.
  // (In the drawer's own space: +z is out of its front, -x toward the back of the desk.)
  const OUT = { x: 0.65, y: 0.04, z: DRAWER_D / 2 + 3.55, r: -Math.PI / 2 };
  drawerPart(DRAWER_W + 0.16, FRONT_H, 0.12, 0, FRONT_H / 2, DRAWER_D / 2 + 0.03, toon("#ffdd00"));
  const drawerFace = printed(DRAWER_W + 0.1, FRONT_H - 0.08, 300, (c, w, h) => drawDrawerFront(c, w, h, projects.length));
  drawerFace.position.set(0, FRONT_H / 2, DRAWER_D / 2 + 0.092);
  folders.add(drawerFace);
  const drawerHandle = drawerPart(0.7, 0.14, 0.1, 0, 0.12, DRAWER_D / 2 + 0.13, toon("#111111"));
  drawerHandle.castShadow = false;

  const folderGeo = track(rbox(FOLDER_W, 0.03, FOLDER_D, 0.012));
  const sheetGeo = track(rbox(SHEET_W, 0.004, SHEET_D, 0.0015));
  const sheetMat = toon("#ffffff");
  const sheetY = (k) => 0.02 + (CASE_SHEETS.length - 1 - k) * 0.006;
  const HINGE_Y = 0.02 + CASE_SHEETS.length * 0.006 + 0.02;
  const turnedY = (k) => HINGE_Y + 0.022 + k * 0.006;
  const folderList = projects.map((project, i) => {
    const folderMat = toon(FOLDER_COLORS[i % FOLDER_COLORS.length]);
    const f = new THREE.Group();
    // Everything visible sits in body, so hover can lift it without touching f's own moves
    const body = new THREE.Group();
    f.add(body);
    const back = mesh(folderGeo, folderMat, { outline: 0.02 });
    body.add(back);
    const tabShape = new THREE.Shape();
    tabShape.moveTo(-0.48, 0); tabShape.lineTo(-0.38, 0.23);
    tabShape.lineTo(0.38, 0.23); tabShape.lineTo(0.48, 0); tabShape.closePath();
    const tab = mesh(new THREE.ExtrudeGeometry(tabShape, { depth: 0.025, bevelEnabled: false }), folderMat, { outline: 0.018 });
    tab.rotation.x = -Math.PI / 2;
    tab.position.set(-0.55 + i * 0.22, 0, -FOLDER_D / 2 + 0.01);
    const tabLabel = printed(0.8, 0.15, 400, (c, w, h) => {
      c.fillStyle = "#fffdf5"; c.fillRect(0, 0, w, h);
      c.strokeStyle = "#000"; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, h - 4);
      c.fillStyle = "#111"; c.font = `800 ${Math.round(h * 0.36)}px sans-serif`;
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(`${String(i + 1).padStart(2, "0")} ${project.title.split(" ")[0].toUpperCase()}`, w / 2, h / 2, w - 16);
    });
    tabLabel.rotation.x = -Math.PI / 2;
    tabLabel.position.set(tab.position.x, 0.03, tab.position.z - 0.11);
    body.add(tab, tabLabel);
    // Sheets, hinged on the folder's left edge like pages
    const sheets = CASE_SHEETS.map((kind, k) => {
      const pivot = new THREE.Group();
      pivot.position.set(-FOLDER_W / 2 + 0.04, sheetY(k), 0);
      const paper = mesh(sheetGeo, sheetMat, { outline: 0.008, cast: false });
      paper.position.x = SHEET_W / 2;
      const front = printed(SHEET_W, SHEET_D, 600, (c, w, h) => drawCaseSheet(c, w, h, project, kind, { index: i }));
      front.rotation.x = -Math.PI / 2;
      front.position.set(SHEET_W / 2, 0.0025, 0);
      const backSide = printed(SHEET_W, SHEET_D, 600, (c, w, h) => drawCaseBack(c, w, h, project, { index: i, kind }));
      backSide.rotation.x = Math.PI / 2;
      backSide.position.set(SHEET_W / 2, -0.0025, 0);
      pivot.add(paper, front, backSide);
      body.add(pivot);
      return pivot;
    });
    const hinge = new THREE.Group();
    hinge.position.set(-FOLDER_W / 2, HINGE_Y, 0);
    const cover = mesh(folderGeo, folderMat, { outline: 0.02 });
    cover.position.x = FOLDER_W / 2;
    const face = printed(FOLDER_W, FOLDER_D, 600, (c, w, h) => drawFolderCover(c, w, h, project, i));
    face.rotation.x = -Math.PI / 2;
    face.position.set(FOLDER_W / 2, 0.016, 0);
    const inside = printed(FOLDER_W, FOLDER_D, 300, (c, w, h) => drawCaseBack(c, w, h, project, { inside: true, index: i }));
    inside.rotation.x = Math.PI / 2;
    inside.position.set(FOLDER_W / 2, -0.016, 0);
    hinge.add(cover, face, inside);
    body.add(hinge);
    folders.add(f);
    return { project, index: i, f, body, hinge, sheets, turned: 0, out: 0 };
  });
  let openFolder = null;
  // Standing in the drawer, the folder's -z edge (with its tab) points up and its cover faces
  // the room. Depth 0 is the front slot; each one further back stands a little higher.
  const STAND_RX = Math.PI / 2 - 0.1;
  const n = folderList.length;
  const slotZ = (d) => DRAWER_D / 2 - 0.28 - d * 0.17;
  const slotY = (d) => WALL + FOLDER_D / 2 + d * 0.05;
  const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const between = (from, to, t, lo, hi) => from + (to - from) * smooth((t - lo) / (hi - lo));
  const bezier = (a, b, c, d, t) => {
    const u = 1 - t;
    return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
  };
  // Where the browse stands: which folder is at the front (fractional while flipping)
  const browse = { p: 0, target: 0 };
  const depthOf = (entry) => (((entry.index - browse.p) % n) + n) % n;
  const frontIndex = () => ((Math.round(browse.target) % n) + n) % n;
  const drawerPose = (entry, out) => {
    const d = depthOf(entry);
    if (d > n - 1) {
      // Being refiled (as in 2D): straight up out of the others, carried back above them,
      // dropped in behind. f runs 0 (front) → 1 (back slot).
      const f = n - d;
      const up = smooth(Math.min(f / 0.3, (1 - f) / 0.3)) * (FOLDER_D + 0.55);
      out.z = between(slotZ(0), slotZ(n - 1), f, 0.25, 0.7);
      out.y = slotY(0) + (slotY(n - 1) - slotY(0)) * f + up + (1 - f) * 0.3;
    } else {
      out.z = slotZ(d);
      // The front folder is pulled up to be read
      out.y = slotY(d) + Math.max(0, 1 - d) * 0.3;
    }
    out.x = 0;
    return out;
  };
  // Out of the drawer, a folder follows one Bézier curve: straight up clear of the rim, over
  // the drawer front, turning flat on the way, and down onto the desk.
  const FLY_Y = DRAWER_H + FOLDER_D / 2 + 0.45;
  const slot = { x: 0, y: 0, z: 0 };
  function poseFolders() {
    folderList.forEach((entry) => {
      const { f, out: t } = entry;
      drawerPose(entry, slot);
      if (t <= 0) {
        f.position.set(slot.x, slot.y, slot.z);
        f.rotation.set(STAND_RX, 0, 0);
        return;
      }
      f.position.set(
        bezier(slot.x, slot.x, OUT.x, OUT.x, t),
        bezier(slot.y, FLY_Y + 0.4, FLY_Y, OUT.y, t),
        bezier(slot.z, slot.z, OUT.z, OUT.z, t),
      );
      f.rotation.set(between(STAND_RX, 0, t, 0.3, 0.8), between(0, OUT.r, t, 0.25, 0.85), 0);
    });
  }
  poseFolders();
  // Flip through to a folder (always forward, so the ones in front are refiled at the back),
  // or one step either way with ← →
  function browseTo(target) {
    if (openFolder || target === browse.target) return;
    const steps = Math.abs(target - browse.target);
    browse.target = target;
    let last = Math.round(browse.p);
    gsap.to(browse, {
      p: target,
      duration: 0.25 + 0.4 * Math.min(steps, 3),
      ease: "power2.inOut",
      overwrite: true,
      onUpdate: () => {
        const now = Math.round(browse.p);
        if (now === last) return;
        last = now;
        sfx.slide();
        sfx.knock({ strength: 0.7, delay: 0.22 });
      },
    });
  }
  const browseToFolder = (entry) => browseTo(browse.target + ((entry.index - frontIndex() + n) % n));
  const folderFor = (obj) => folderList.find(({ f }) => {
    for (let o = obj; o; o = o.parent) if (o === f) return true;
    return false;
  });
  function closeFolder(entry) {
    entry.sheets.forEach((pivot, k) => {
      gsap.to(pivot.rotation, { z: 0, duration: 0.3 });
      gsap.to(pivot.position, { y: sheetY(k), duration: 0.3 });
    });
    entry.turned = 0;
    // Shut the cover, then back into its slot at the front of the drawer
    gsap.to(entry.hinge.rotation, { z: 0, duration: 0.4, delay: 0.1, ease: "power2.in", onComplete: () => sfx.slap() });
    gsap.to(entry, { out: 0, duration: 0.95, delay: 0.45, ease: "power2.inOut", overwrite: true, onComplete: () => sfx.knock({ strength: 0.8 }) });
  }
  // Pull the front folder out onto the desk, open its cover out flat, and move the camera in close
  function openProject(entry) {
    if (openFolder) return;
    openFolder = entry;
    onEvent("projectOpen", { open: true });
    gsap.to(entry.body.position, { y: 0, z: 0, duration: 0.2, overwrite: true });
    sfx.slide({ duration: 0.35 });
    gsap.to(entry, { out: 1, duration: 1.0, ease: "power2.inOut", overwrite: true, onComplete: () => sfx.slap() });
    gsap.to(entry.hinge.rotation, { z: Math.PI, duration: 0.6, delay: 1.0, ease: "power2.inOut", onStart: () => sfx.rustle({ duration: 0.4 }) });
    applyShot(false, 1.2);
  }
  function closeProject() {
    if (!openFolder) return;
    closeFolder(openFolder);
    openFolder = null;
    onEvent("projectOpen", { open: false });
    applyShot();
  }
  function turnSheet(dir) {
    const entry = openFolder;
    if (dir > 0 && entry.turned < entry.sheets.length - 1) {
      const pivot = entry.sheets[entry.turned];
      gsap.to(pivot.rotation, { z: Math.PI, duration: 0.5, ease: "power2.inOut" });
      gsap.to(pivot.position, { keyframes: [{ y: 0.3, duration: 0.25 }, { y: turnedY(entry.turned), duration: 0.25 }] });
      entry.turned++;
      sfx.paper();
    } else if (dir < 0 && entry.turned > 0) {
      entry.turned--;
      const pivot = entry.sheets[entry.turned];
      gsap.to(pivot.rotation, { z: 0, duration: 0.5, ease: "power2.inOut" });
      gsap.to(pivot.position, { keyframes: [{ y: 0.3, duration: 0.25 }, { y: sheetY(entry.turned), duration: 0.25 }] });
      sfx.paper();
    } else {
      gsap.fromTo(entry.f.rotation, { z: dir * 0.03 }, { z: 0, duration: 0.4, ease: "elastic.out(1.5, 0.3)" });
    }
  }
  const folderPoint = new THREE.Vector3();
  const clickFolder = (hit) => {
    const entry = folderFor(hit.object);
    if (!entry) return;
    if (openFolder) {
      if (entry !== openFolder) return closeProject();
    } else {
      // The front folder comes out; any other one is flipped to the front first
      if (entry.index === frontIndex() && Math.abs(browse.p - browse.target) < 0.05) return openProject(entry);
      return browseToFolder(entry);
    }
    if (entry.out < 1) return;
    entry.f.worldToLocal(folderPoint.copy(hit.point));
    turnSheet(folderPoint.x > -FOLDER_W / 2 ? 1 : -1);
  };
  // Hover lifts just the folder under the pointer
  folderList.forEach((entry) =>
    register(entry.f, {
      focus: "projects",
      item: true,
      // In the drawer a folder is pulled up a little (its local -z points up while it stands)
      onHover: (on) =>
        gsap.to(entry.body.position, { y: 0, z: on && !openFolder ? -0.22 : 0, duration: 0.4, ease: "sine.inOut", overwrite: true }),
      onClick: clickFolder,
      onHotspot: (hs) => openFolder && turnSheet(hs.action === "prev" ? -1 : 1),
    }),
  );
  register(folders, {
    focus: "projects",
    onLeave: () => {
      if (openFolder) closeProject();
    },
    onClick: clickFolder,
    onKey: (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") {
        if (e.key !== "Enter" || openFolder) return false;
        openProject(folderList[frontIndex()]);
        return true;
      }
      const dir = e.key === "ArrowRight" ? 1 : -1;
      if (openFolder) turnSheet(dir);
      else browseTo(browse.target + dir);
      return true;
    },
  });

  // ---------- postcard + envelope (contact) ----------
  // Zoomed in, the postcard slides out and turns over to its writing side: click the message
  // area or an address line to write (Tab moves along), press the SEND stamp to mail it. It
  // goes out through EmailJS, like the 2D contact form, and the envelope flies off.
  const mail = new THREE.Group();
  const MAIL_POS = { x: 4.6, y: 0, z: 2.9 };
  mail.position.set(MAIL_POS.x, MAIL_POS.y, MAIL_POS.z);
  mail.rotation.y = 0.18;
  scene.add(mail);
  const ENV_W = 1.75;
  const ENV_D = 1.15;
  const CARD_W = 1.65;
  const CARD_D = 1.05;
  const envelope = new THREE.Group();
  envelope.position.y = 0.04;
  const envBackMat = toon("#e8d3a7");
  const envBack = mesh(rbox(ENV_W, 0.025, ENV_D, 0.012), envBackMat, { outline: 0.025 });
  const envTop = printed(ENV_W, ENV_D, 400, drawEnvelope);
  envTop.rotation.x = -Math.PI / 2;
  envTop.position.y = 0.06;
  envTop.material.alphaTest = 0.5;
  const flap = new THREE.Group();
  flap.position.set(0, 0.075, -ENV_D / 2);
  const flapFace = printed(ENV_W, ENV_D * 0.52, 400, drawEnvelopeFlap);
  flapFace.rotation.x = -Math.PI / 2;
  flapFace.position.z = ENV_D * 0.26;

  flapFace.material.side = THREE.DoubleSide;
  flapFace.material.alphaTest = 0.5;
  flapFace.castShadow = true;
  flap.add(flapFace);
  envelope.add(envBack, envTop, flap);
  const postcard = new THREE.Group();
  const POSTCARD_REST = { x: 0, y: 0.075, z: 0, r: 0 };
  // Pulled out, the card is laid down on top of the open envelope, shifted back and a little
  // askew, so the envelope's lower half (and its PAR AVION mark) still shows beneath it
  const POSTCARD_OUT = { x: 0.06, y: 0.13, z: -0.3, r: -0.05 };
  const ENVELOPE_SETTLE = { y: 0.035, z: 0.12 };
  // Pulled straight out through the open end until the card's far edge clears the envelope
  const CARD_CLEAR_Z = -(ENV_D / 2 + CARD_D / 2 + 0.06);
  postcard.position.set(POSTCARD_REST.x, POSTCARD_REST.y, POSTCARD_REST.z);
  postcard.visible = false;
  const postFlip = new THREE.Group();
  postFlip.rotation.x = Math.PI;
  postcard.add(postFlip);
  const postFace = printed(CARD_W, CARD_D, 400, drawPostcard);
  postFace.rotation.x = -Math.PI / 2;
  postFace.position.y = 0.012;
  const card = { name: "", email: "", message: "", active: null, errors: {}, status: "idle" };
  const postBack = printed(CARD_W, CARD_D, 700, (c, w, h) => drawPostcardBack(c, w, h, card, { caret: caretOn && !!card.active }));
  postBack.rotation.x = Math.PI / 2;
  postBack.position.y = -0.012;
  postFlip.add(mesh(rbox(CARD_W, 0.02, CARD_D, 0.008), toon("#fffdf5"), { outline: 0.018 }), postFace, postBack);
  const postage = printed(CARD_W * 0.13, CARD_D * 0.24, 700, drawPostcardStamp);
  postage.rotation.x = -Math.PI / 2;
  postage.position.set(CARD_W * 0.385, 0.026, -CARD_D * 0.316);
  postcard.add(postage);
  mail.add(postcard, envelope);
  const redrawCard = () => postBack.userData.tex.redraw();
  let mailIntro = null;
  let cardReady = false;

  const FIELDS = ["message", "name", "email"];
  function editField(id) {
    card.active = id;
    const next = (d) => editField(FIELDS[(FIELDS.indexOf(id) + d + FIELDS.length) % FIELDS.length]);
    startTyping({
      id,
      get: () => card[id],
      set: (value) => {
        card[id] = id === "message" ? value : value.replace(/\n/g, "");
        card.errors[id] = "";
      },
      multiline: id === "message",
      maxLength: id === "message" ? 500 : 80,
      redraw: redrawCard,
      onEnter: () => (id === "name" ? next(1) : sendCard()),
      onTab: next,
      onStop: () => (card.active = null),
    });
  }
  // Same checks and messages as the 2D contact form
  function validateCard() {
    const e = card.errors;
    e.name = !card.name.trim() ? "Tell me your name" : "";
    e.email = !card.email.trim()
      ? "I need an email to reply to"
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(card.email)
      ? "That email doesn't look right"
      : "";
    e.message = !card.message.trim()
      ? "The card is still empty"
      : card.message.trim().length < 10
      ? "A little more, please (min 10 characters)"
      : "";
    return !e.name && !e.email && !e.message;
  }
  async function sendCard() {
    if (card.status === "sending") return;
    if (!validateCard()) {
      sfx.buzz();
      gsap.fromTo(postcard.rotation, { z: 0.04 }, { z: 0, duration: 0.45, ease: "elastic.out(1.5, 0.3)" });
      return redrawCard();
    }
    stopTyping();
    card.status = "sending";
    redrawCard();
    try {
      await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        {
          name: card.name,
          email: card.email,
          subject: "Portfolio Contact Form (3D desk)",
          message: card.message,
          to_name: "Oka Sutarto Putra",
        },
        EMAILJS_CONFIG.PUBLIC_KEY,
      );
    } catch (err) {
      console.error("EmailJS Error:", err);
      card.status = "error";
      sfx.buzz();
      return redrawCard();
    }
    if (destroyed) return;
    Object.assign(card, { name: "", email: "", message: "", status: "idle", errors: {} });
    mailOff();
  }
  function resetEnvelope() {
    mailIntro?.kill();
    mailIntro = null;
    cardReady = false;
    card.active = null;
    postcard.visible = false;
    postcard.position.set(POSTCARD_REST.x, POSTCARD_REST.y, POSTCARD_REST.z);
    postcard.rotation.set(0, 0, 0);
    postcard.scale.set(1, 1, 1);
    postage.visible = false;
    envelope.visible = true;
    envelope.position.set(0, 0.04, 0);
    envelope.rotation.set(0, 0, 0);
    flap.rotation.x = 0;
    flap.position.y = 0.075;
    envTop.userData.tex.redraw({ delivered: false });
  }
  function openEnvelope() {
    resetEnvelope();
    gsap.to(mail.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
    applyShot();
    // Match the 2D sequence: arrive, open flap, extract card, drop envelope, settle, stamp.
    mailIntro = gsap.timeline({ onComplete: () => { cardReady = true; applyShot(false, 0.8); } })
      .call(() => sfx.whoosh({ duration: 0.5 }), null, 0)
      .set(postcard, { visible: true })
      .to(flap.rotation, { x: -Math.PI, duration: 0.6, ease: "power2.inOut" }, 0.45)
      // Open, the flap folds down over the edge onto the desk, so the card slides out over it
      .to(flap.position, { y: -0.03, duration: 0.2, ease: "power2.in" }, 0.85)
      .call(() => sfx.slide({ duration: 0.4 }), null, 0.45)
      .addLabel("out", 0.95)
      // 1. Straight out through the open end, flat, between the envelope's faces and over the
      //    open flap, until the card's far edge has cleared the envelope (it never rises while
      //    any of it is still inside)
      .to(postcard.position, { y: POSTCARD_REST.y, z: CARD_CLEAR_Z, duration: 0.85, ease: "power2.inOut" }, "out")
      .call(() => sfx.slide({ duration: 0.7 }), null, "out")
      // 2. Clear of it: lifted up and carried back over the envelope, then laid down across it,
      //    while the envelope eases forward underneath
      .to(
        postcard.position,
        {
          keyframes: { x: [0, POSTCARD_OUT.x * 0.6, POSTCARD_OUT.x], y: [POSTCARD_REST.y, 0.42, POSTCARD_OUT.y], z: [CARD_CLEAR_Z, (CARD_CLEAR_Z + POSTCARD_OUT.z) / 2, POSTCARD_OUT.z], easeEach: "sine.inOut" },
          duration: 0.9,
          ease: "power1.inOut",
        },
        "out+=0.85",
      )
      .to(postcard.rotation, { y: POSTCARD_OUT.r, duration: 0.9, ease: "sine.inOut" }, "out+=0.85")
      .to(envelope.position, { z: ENVELOPE_SETTLE.z, y: ENVELOPE_SETTLE.y, duration: 0.8, ease: "sine.inOut" }, "out+=0.85")
      .to(envelope.rotation, { y: 0.02, duration: 0.8, ease: "sine.inOut" }, "out+=0.85")
      .to(postcard.scale, { keyframes: [{ x: 1.01, z: 0.98, duration: 0.12 }, { x: 1, z: 1, duration: 0.2 }] }, "out+=1.75")
      .call(() => sfx.flop({ strength: 0.5 }), null, "out+=1.75")
      .set(postage, { visible: true })
      .fromTo(postage.scale, { x: 2.2, y: 2.2 }, { x: 1, y: 1, duration: 0.45, ease: "back.out(2)" })
      .call(() => sfx.stamp(), null, "<+0.08");
  }
  function mailOff() {
    cardReady = false;
    mailIntro?.kill();
    mailIntro = gsap.timeline()
      .call(() => sfx.whoosh({ duration: 0.6 }))
      .to(postcard.position, { y: 5, z: -5, duration: 0.7, ease: "power2.in" })
      .to(postcard.rotation, { x: -1.1, y: -0.14, duration: 0.7 }, "<")
      .to(postcard.scale, { x: 0.4, y: 0.4, z: 0.4, duration: 0.7 }, "<")
      .call(() => {
        resetEnvelope();
        envTop.userData.tex.redraw({ delivered: true });
        sfx.stamp();
        timers.push(setTimeout(() => !destroyed && (focus.name === "contact" ? openEnvelope() : resetEnvelope()), 2800));
      });
  }
  register(mail, {
    focus: "contact",
    onHover: (on) => focus.name !== "contact" && hoverScale(mail, 1.04)(on),
    onArrive: openEnvelope,
    onLeave: resetEnvelope,
    onHotspot: (hs) => cardReady && (hs.id === "send" ? sendCard() : editField(hs.id)),
  });

  // ---------- mug (decor) ----------
  const mug = new THREE.Group();
  // On a cork coaster, a little closer to the envelope
  const MUG_Y = 0.06;
  mug.position.set(5.5, MUG_Y, 0.95);
  const coaster = mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.06, 32), toon("#c8925a"), { outline: 0.03, cast: false });
  coaster.position.set(mug.position.x, 0.03, mug.position.z);
  const coasterRing = new THREE.Mesh(track(new THREE.TorusGeometry(0.6, 0.02, 6, 40)), track(new THREE.MeshBasicMaterial({ color: "#8a5a2b" })));
  coasterRing.rotation.x = Math.PI / 2;
  coasterRing.position.set(mug.position.x, 0.062, mug.position.z);
  coasterRing.raycast = noRaycast;
  scene.add(coaster, coasterRing);
  scene.add(mug);
  // Hollow cup (lathe profile with a wall), deep enough for the coffee level to drop
  const CUP_FLOOR = 0.12;
  const mugProfile = [
    [0, 0],
    [0.45, 0],
    [0.5, 1.1],
    [0.43, 1.1],
    [0.39, CUP_FLOOR],
    [0, CUP_FLOOR],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  // Open-ended: caps on the outline shell showed as a dark ring inside the opening
  const mugShell = new THREE.CylinderGeometry(0.5, 0.45, 1.1, 32, 1, true);
  mugShell.translate(0, 0.55, 0);
  const mugMat = toon("#fffdf5");
  const mugBody = mesh(new THREE.LatheGeometry(mugProfile, 32), mugMat, { outline: 0.05, hull: mugShell });
  // The opening's edge: the outer outline only traces the silhouette
  const rimLine = new THREE.Mesh(track(new THREE.TorusGeometry(0.43, 0.012, 6, 48)), track(new THREE.MeshBasicMaterial({ color: "#000000" })));
  rimLine.rotation.x = Math.PI / 2;
  rimLine.position.y = 1.1;
  rimLine.raycast = noRaycast;
  const coffee = mesh(new THREE.CylinderGeometry(0.405, 0.405, 0.02, 32), toon("#5b3a1e"), { outline: 0, cast: false });
  coffee.position.y = 0.93;
  const crema = mesh(new THREE.TorusGeometry(0.3, 0.03, 6, 32), toon("#c8925a"), { outline: 0, cast: false });
  crema.rotation.x = Math.PI / 2;
  crema.position.y = 0.945;
  const handle = mesh(new THREE.TorusGeometry(0.28, 0.08, 10, 20, Math.PI), mugMat, { outline: 0.04 });
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(0.46, 0.58, 0);
  // Steam: little puffs drifting up and shrinking away, forever
  const puffGeo = track(new THREE.SphereGeometry(0.09, 12, 8));
  const puffMat = toon("#ffffff");
  const puffs = [];
  for (let i = 0; i < 3; i++) {
    const puff = mesh(puffGeo, puffMat, { outline: 0.02, cast: false });
    puff.raycast = noRaycast;
    puffs.push(puff);
    mug.add(puff);
    gsap.fromTo(
      puff.position,
      { x: (i - 1) * 0.12, y: 1.05, z: 0 },
      { x: (i - 1) * 0.12 + 0.15, y: 2.0, duration: 2.2, delay: i * 0.73, repeat: -1, ease: "sine.inOut" },
    );
    gsap.fromTo(puff.scale, { x: 0.4, y: 0.4, z: 0.4 }, { keyframes: [{ x: 1.2, y: 1.2, z: 1.2, duration: 1.1 }, { x: 0.01, y: 0.01, z: 0.01, duration: 1.1 }], delay: i * 0.73, repeat: -1 });
  }
  mug.add(mugBody, rimLine, coffee, crema, handle);

  // Sipping: each click drinks a bit and a quote pops up over the mug. Finish the cup and the
  // desk switches to the night shift (or back to day), then it's refilled.
  const SIPS = 4;
  let sipsLeft = SIPS;
  let sipping = false;
  function setCoffee(level, duration = 0.5) {
    const y = CUP_FLOOR + 0.02 + level * (0.93 - CUP_FLOOR - 0.02);
    const r = 0.39 + (0.04 * (y - CUP_FLOOR)) / (1.1 - CUP_FLOOR) - 0.005;
    gsap.to(coffee.position, { y, duration });
    gsap.to(coffee.scale, { x: r / 0.405, z: r / 0.405, duration });
    gsap.to(crema.position, { y: y + 0.015, duration });
    gsap.to(crema.scale, { x: r / 0.405, y: r / 0.405, duration });
    puffs.forEach((puff) => (puff.visible = level > 0));
  }
  // Move back as well as up: the high camera angle compresses vertical separation.
  // Just above and left of the mug as the (mostly top-down) mug shot sees it, tail to the rim
  const mugBubble = speechBubble(1.9, 1.0);
  mugBubble.sprite.position.set(mug.position.x - 0.5, MUG_Y + 1.85, mug.position.z - 1.1);
  const say = mugBubble.say;
  const hideBubble = mugBubble.hide;
  let lastQuote = -1;

  function sip() {
    if (sipping || sipsLeft === 0) return;
    sipping = true;
    // Lift and tip the rim toward you, then put it back down
    gsap
      .timeline({ onComplete: () => (sipping = false) })
      .to(mug.position, { y: MUG_Y + 0.7, duration: 0.3, ease: "power2.out" })
      .to(mug.rotation, { x: 0.55, duration: 0.3, ease: "power2.out" }, 0)
      .to(mug.rotation, { x: 0, duration: 0.3, ease: "power2.inOut" }, 0.95)
      .to(mug.position, { y: MUG_Y, duration: 0.35, ease: "bounce.out" }, 1.0);
    // The slurp starts as the rim reaches your lips; the mug is set down after the gulp
    sfx.slurp({ delay: 0.25 });
    timers.push(setTimeout(() => sfx.thud({ strength: 0.35 }), 1200));
    sipsLeft--;
    timers.push(setTimeout(() => setCoffee(sipsLeft / SIPS, 0.4), 350));
    if (sipsLeft > 0) {
      let i;
      do i = Math.floor(Math.random() * SIP_QUOTES.length);
      while (i === lastQuote && SIP_QUOTES.length > 1);
      lastQuote = i;
      say(SIP_QUOTES[i]);
    } else {
      const toNight = !darkNow;
      say(toNight ? { text: "Cup's empty. Night shift it is.", by: "oka" } : { text: "Last sip. Good morning, world!", by: "oka" });
      timers.push(setTimeout(() => onEvent("nightShift", { dark: toNight }), 1300));
      // Refill
      timers.push(
        setTimeout(() => {
          sipsLeft = SIPS;
          setCoffee(1, 1.2);
          sfx.rustle({ duration: 1 });
        }, 2600),
      );
    }
    onEvent("mug");
  }
  register(mug, {
    focus: "mug",
    onArrive: sip,
    onClick: sip,
    onLeave: hideBubble,
  });

  // Lightweight contact-shadow approximations supplement the directional shadows.
  // Share one soft texture; lifted props get a wider, fainter footprint.
  const contactTexture = canvasTexture(128, 128);
  track(contactTexture.texture);
  const contactGradient = contactTexture.ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  contactGradient.addColorStop(0, "rgba(0,0,0,.55)");
  contactGradient.addColorStop(0.4, "rgba(0,0,0,.3)");
  contactGradient.addColorStop(0.75, "rgba(0,0,0,.08)");
  contactGradient.addColorStop(1, "rgba(0,0,0,0)");
  contactTexture.ctx.fillStyle = contactGradient;
  contactTexture.ctx.fillRect(0, 0, 128, 128);
  contactTexture.texture.needsUpdate = true;
  const contactShadows = [];
  const contactShadow = (object, width, depth, surfaceY = 0, strength = 1) => {
    const material = track(new THREE.MeshBasicMaterial({
      map: contactTexture.texture, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1,
    }));
    const plane = new THREE.Mesh(track(new THREE.PlaneGeometry(width, depth)), material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = surfaceY + 0.008;
    plane.raycast = noRaycast;
    scene.add(plane);
    contactShadows.push({ object, plane, baseY: object.position.y, strength });
  };
  contactShadow(mug, 1.55, 1.55);
  contactShadow(plant, 1.9, 1.9);
  contactShadow(mouse, 0.85, 1.2, MAT_TOP);
  contactShadow(monitor, 2.2, 1.5);
  contactShadow(keyboard, 5.8, 2.5, MAT_TOP, 0.8);
  contactShadow(phoneStand, 1.7, 1.5);
  contactShadow(tickets, 3.4, 1.8, 0, 0.6);
  contactShadow(folders, FOLDER_W * 1.35, FOLDER_D * 1.35, 0, 0.7);
  contactShadow(mail, 3.0, 2.1, 0, 0.55);
  contactShadow(chair, 4.4, 4.4, FLOOR_Y, 0.8);

  // ---------- textures (redrawn once the web fonts are in, and every minute for the clocks) ----------
  function drawAll() {
    redrawers.forEach((redraw) => redraw());
    redrawTerminal();
  }
  drawAll();
  Promise.all([
    document.fonts.load("800 40px 'Lexend Mega'"),
    document.fonts.load("700 20px 'Space Grotesk'"),
    document.fonts.load("500 20px 'Space Grotesk'"),
    document.fonts.load("600 30px 'Caveat'"),
  ])
    .then(() => !destroyed && drawAll())
    .catch(() => {});
  // The real photo for the badge (initials stand in until it arrives).
  loadPortrait(`${process.env.BASE_URL}images/oka-portrait.png`)
    .then(() => !destroyed && drawAll())
    .catch(() => {});
  const clockTimer = setInterval(() => {
    badgeFront.userData.tex.redraw();
    updateRoomClock();
  }, 60000);

  // ---------- theme ----------
  let darkNow = dark;
  function setTheme(isDark) {
    darkNow = isDark;
    roomDark = isDark;
    ambient.intensity = isDark ? 1.0 : 0.65;
    skyFill.intensity = isDark ? 0 : 1.45;
    readabilityFill.intensity = isDark ? 0.55 : 0.35;
    jointMat.color.set(isDark ? "#3d3749" : "#1a1714");
    sun.color.set(isDark ? "#aabfff" : "#fff1cc");
    // A faint cool overhead fill leaves short shadows outside the desk lamp's cone.
    sun.position.set(...(isDark ? [-4, 12, 3] : [-13, 9.5, 4.5]));
    sun.intensity = isDark ? 0.3 : 1.6;
    sun.castShadow = true;
    windowLight.color.set(isDark ? "#94b5ff" : "#ffe5ad");
    // The daytime pane pattern is an accent; only the sun casts directional shadows.
    windowLight.intensity = isDark ? 38 : 70;
    windowLight.castShadow = isDark;
    floorMat.color.set(isDark ? "#8a82a6" : "#ffffff");
    // Night keeps the walls white, just moonlit, so the room still reads as the same room
    backWallMat.color.set(isDark ? "#d6d3e6" : "#ffffff");
    scene.background = new THREE.Color(isDark ? "#d6d3e6" : "#ffffff");
    sideWallMat.color.set(isDark ? "#c9c5dc" : "#ffffff");
    trimMat.color.set(isDark ? "#b8b1da" : "#ffffff");
    windowView.userData.tex.redraw();
    setLamp(isDark);
    const p = isDark ? PALETTES.dark : PALETTES.light;
    deskMat.color.set(p.desk);
    shadowFill.color.set(p.shadow);
  }
  setTheme(dark);

  // ---------- pointer ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  let hovered = null;
  let downAt = null;

  const rayFromPointer = (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray;
  };
  // Close-ups clip whatever is in front of the prop (camera.near). Those props aren't drawn, so
  // they mustn't catch the pointer either: the monitor sits right in front of the badge.
  const viewPoint = new THREE.Vector3();
  const visibleHits = () => raycaster.intersectObjects(pickables, true)
    .filter((h) => -viewPoint.copy(h.point).applyMatrix4(camera.matrixWorldInverse).z >= camera.near);
  const pick = (e) => {
    rayFromPointer(e);
    const hit = visibleHits()[0];
    return hit ? { hit, entry: entryFor(hit.object) } : null;
  };
  // For hover: stay on the item already hovered while the pointer is still over any part of
  // it. A lifted ticket or folder shifts a little on screen; without this the hover would
  // flick back and forth between it and the one beneath.
  const pickHover = (e) => {
    rayFromPointer(e);
    const hits = visibleHits();
    if (hovered && hits.some((h) => entryFor(h.object)?.object === hovered.object)) return hovered;
    return hits[0] ? entryFor(hits[0].object) : null;
  };
  const setHover = (entry) => {
    if (hovered?.object === entry?.object) return;
    hovered?.onHover?.(false);
    hovered = entry;
    hovered?.onHover?.(true);
    renderer.domElement.style.cursor = entry?.note && focus.name === "about" ? "grab" : entry ? "pointer" : "default";
  };
  const onPointerMove = (e) => {
    if (lanyardDrag) {
      if (e.pointerId !== lanyardDrag.pointerId) return;
      if (!lanyardDrag.moved && Math.hypot(e.clientX - lanyardDrag.startX, e.clientY - lanyardDrag.startY) < 4) return;
      if (!lanyardDrag.moved) {
        lanyardDrag.moved = true;
        grabLanyard(lanyardDrag);
        renderer.domElement.style.cursor = "grabbing";
      }
      const point = rayFromPointer(e).intersectPlane(lanyardPlane, lanyardPoint);
      if (point) moveLanyard(lanyardDrag, point);
      e.preventDefault();
      return;
    }
    if (noteDrag) {
      if (e.pointerId !== noteDrag.pointerId) return;
      if (Math.hypot(e.clientX - noteDrag.startX, e.clientY - noteDrag.startY) < 4 && !noteDrag.moved) return;
      const point = boardPointer(e);
      if (!point) return;
      if (!noteDrag.moved) gsap.killTweensOf(noteDrag.note.shadow.position);
      noteDrag.moved = true;
      const position = clampNote(noteDrag.note, point.x - noteDrag.offsetX, point.y - noteDrag.offsetY);
      noteDrag.note.paper.position.x = position.x;
      noteDrag.note.paper.position.y = position.y;
      noteDrag.note.shadow.position.x = position.x + 0.1;
      noteDrag.note.shadow.position.y = position.y - 0.1;
      if (e.timeStamp - noteDrag.lastSound > 160) {
        sfx.paper();
        noteDrag.lastSound = e.timeStamp;
      }
      e.preventDefault();
      return;
    }
    const rect = renderer.domElement.getBoundingClientRect();
    parallax.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    parallax.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    if (e.pointerType === "mouse") {
      setHover(pickHover(e));
      if (hovered?.onPointer) {
        const hit = visibleHits()[0];
        hovered.onPointer(hit?.object === screen && hit.uv ? hit : null);
      }
      if (lanyardUnder(e)?.strap) renderer.domElement.style.cursor = "grab";
      mouseAim.x = MOUSE_ORIGIN.x + parallax.tx * 0.6;
      mouseAim.z = MOUSE_ORIGIN.z + parallax.ty * 0.45;
    }
  };
  // The pin or strap under the pointer, or the badge itself, on the shots where it's in reach
  function lanyardUnder(e) {
    if (focus.name !== "overview" && focus.name !== "hero") return null;
    const badgeHit = pick(e)?.entry?.object === badge;
    const point = rayFromPointer(e).intersectPlane(lanyardPlane, lanyardPoint);
    return point ? lanyardAt(point, badgeHit) : null;
  }
  let lanyardDrag = null;
  function finishLanyardDrag() {
    if (!lanyardDrag) return null;
    const drag = lanyardDrag;
    lanyardDrag = null;
    if (drag.moved) releaseLanyard(drag);
    if (renderer.domElement.hasPointerCapture(drag.pointerId)) renderer.domElement.releasePointerCapture(drag.pointerId);
    renderer.domElement.style.cursor = "default";
    return drag;
  }
  const onPointerDown = (e) => {
    if (noteDrag || lanyardDrag || e.button !== 0) return;
    downAt = { x: e.clientX, y: e.clientY };
    const hold = lanyardUnder(e);
    if (hold) {
      lanyardDrag = { ...hold, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
      renderer.domElement.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
    const entry = focus.name === "about" && pick(e)?.entry;
    const point = entry?.note && boardPointer(e);
    if (point) {
      noteDrag = {
        note: entry.note, pointerId: e.pointerId,
        startX: e.clientX, startY: e.clientY,
        offsetX: point.x - entry.note.paper.position.x,
        offsetY: point.y - entry.note.paper.position.y,
        homeX: entry.note.paper.position.x, homeY: entry.note.paper.position.y,
        moved: false, lastSound: e.timeStamp,
      };
      renderer.domElement.setPointerCapture(e.pointerId);
      renderer.domElement.style.cursor = "grabbing";
      liftNote(entry.note);
      e.preventDefault();
    }
    if (e.pointerType === "mouse") pressMouse();
  };
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -aboutBoard.position.z);
  const dragPoint = new THREE.Vector3();
  function boardPointer(e) {
    const hit = rayFromPointer(e).intersectPlane(dragPlane, dragPoint);
    return hit ? aboutBoard.worldToLocal(hit) : null;
  }
  function finishNoteDrag(pointerId = null, sound = true) {
    if (!noteDrag || (pointerId !== null && pointerId !== noteDrag.pointerId)) return;
    const drag = noteDrag;
    noteDrag = null;
    downAt = null;
    const overlaps = drag.moved && boardNotes.some((other) => other !== drag.note && notesOverlap(drag.note, other));
    pinNote(drag.note, sound, overlaps ? { x: drag.homeX, y: drag.homeY } : drag.note.paper.position);
    if (renderer.domElement.hasPointerCapture(drag.pointerId)) renderer.domElement.releasePointerCapture(drag.pointerId);
    renderer.domElement.style.cursor = "grab";
    return drag;
  }
  const onPointerCancel = (e) => {
    finishNoteDrag(e.pointerId);
    if (lanyardDrag?.pointerId === e.pointerId) finishLanyardDrag();
  };
  const onWindowBlur = () => {
    finishNoteDrag();
    finishLanyardDrag();
  };
  const onPointerUp = (e) => {
    if (lanyardDrag && e.pointerId === lanyardDrag.pointerId) {
      const drag = finishLanyardDrag();
      if (drag.moved) {
        downAt = null;
        // Re-pinned while close up: frame the badge where it hangs now
        if (drag.index === 0 && focus.name === "hero") applyShot(false, 0.6);
        return;
      }
      // A plain click on the strap or pin just sets it swinging; on the badge it's a click
      if (drag.strap) {
        downAt = null;
        swing(0.25);
        sfx.tick({ pitch: 0.8 });
        return;
      }
    }
    if (noteDrag) {
      if (e.pointerId !== noteDrag.pointerId) return;
      noteDrag.moved = noteDrag.moved || Math.hypot(e.clientX - noteDrag.startX, e.clientY - noteDrag.startY) >= 4;
      const drag = finishNoteDrag(e.pointerId);
      if (drag?.note.href && !drag.moved) runHotspot({ href: drag.note.href });
      return;
    }
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8;
    downAt = null;
    if (moved) return;
    const result = pick(e);
    if (result?.entry) handleClick(result.entry, result.hit);
    else back();
  };
  const onPointerLeave = () => {
    if (noteDrag) return;
    setHover(null);
    parallax.tx = parallax.ty = 0;
  };
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointerleave", onPointerLeave);
  renderer.domElement.addEventListener("pointercancel", onPointerCancel);
  renderer.domElement.addEventListener("lostpointercapture", onPointerCancel);
  window.addEventListener("blur", onWindowBlur);

  // ---------- camera shots ----------
  // Each prop has a shot: where the camera looks from, and the box (world units) it must
  // fit. Clicking a prop flies the camera there; clicking it again while in its shot does
  // its thing. Empty space or Esc goes back out to the overview.
  const focus = { name: "overview" };
  const screenNormal = new THREE.Vector3();
  const screenPos = new THREE.Vector3();
  const SHOTS = {
    // The camera sits inside the room, with no cutaway edges or outside backdrop.
    overview: () => ({ target: [1.8, 2.7, 0.7], dir: [0.48, 0.72, 1] }),
    // Clip only what's well in front of the wall (the monitor), not the board behind the badge
    hero: () => ({ target: [badgePin.x, badgePin.y - (BADGE_PIN.y - BADGE_CLIP.y) - 0.74, BADGE_CLIP.z], dir: [0.06, 0.14, 1], fit: [1.5, 2.1], depth: 2.6 }),
    about: () => ({ target: aboutBoard.position.toArray(), dir: [0, 0.8, 1], fit: [7.3, 4.8] }),
    // The fan, or square on the pass being held up
    experience: () => {
      if (!heldTicket) {
        tickets.localToWorld(screenPos.set(0.15, 0, 0.65));
        return { target: screenPos.toArray(), dir: [0.06, 1, 0.5], fit: [3.4, 3.0] };
      }
      tickets.localToWorld(screenPos.set(HOLD.x, HOLD.y, HOLD.z));
      return { target: screenPos.toArray(), dir: [0, 1, 0.5], fit: [5.6, 2.9] };
    },
    // The folders standing in the drawer, or close on the one pulled out onto the desk (its
    // cover lies open to the left)
    projects: () => {
      if (!openFolder) {
        // Square on the drawer's front, wherever it faces
        // Square on the drawer's front, wherever it faces. A shallow clip keeps the lamp
        // head (just over the drawer) out of the shot.
        folders.localToWorld(screenPos.set(0, 1.0, 0.2));
        screenNormal.set(0.05, 0.62, 1).applyQuaternion(folders.quaternion);
        return { target: screenPos.toArray(), dir: screenNormal.toArray(), fit: [4.6, 3.9], depth: 2.2 };
      }
      // Centre on the spine: the open cover lies to its left, the sheets to its right. Laid
      // down, the folder's left is the drawer's -z.
      const narrow = container.clientWidth < 768;
      folders.localToWorld(screenPos.set(OUT.x, OUT.y, OUT.z - (narrow ? 0 : FOLDER_W / 2)));
      return { target: [screenPos.x, screenPos.y + 0.17, screenPos.z], dir: [0.03, 1, 0.35], fit: narrow ? [FOLDER_W + 0.2, FOLDER_D + 0.4] : [FOLDER_W * 2 + 0.35, FOLDER_D + 0.55] };
    },
    // Face-on to the phone's screen, whatever angle the stand holds it at
    chat: () => {
      phoneScreen.updateWorldMatrix(true, false);
      phoneScreen.getWorldDirection(screenNormal);
      phoneScreen.getWorldPosition(screenPos);
      return { target: screenPos.toArray(), dir: screenNormal.toArray(), fit: [1.3, 2.1] };
    },
    // Square over the postcard where it lands once it slides out of the envelope
    contact: () => {
      // Between the card and the envelope under it, so both stay in frame
      mail.localToWorld(screenPos.set(POSTCARD_OUT.x, POSTCARD_OUT.y, (POSTCARD_OUT.z + ENVELOPE_SETTLE.z) / 2));
      return { target: screenPos.toArray(), dir: [0.02, 1, 0.25], fit: cardReady ? [2.2, 1.95] : [2.45, 3.5] };
    },
    // Close on the gauntlet for the snap, from a little to its right and above
    gauntlet: () => {
      // Framed for the glove hovering above its plinth
      gauntlet.localToWorld(screenPos.set(0, 1.25, 0));
      return { target: screenPos.toArray(), dir: [0.3, 0.3, 1], fit: [2.6, 3.2], depth: 3 };
    },
    // Square on the window in the left wall. A shallow clip: the desk's left end sits close to it.
    window: () => ({ target: [windowGroup.position.x + 0.1, windowGroup.position.y, windowGroup.position.z], dir: [1, 0.08, 0.04], fit: [5.2, 5.4], depth: 1.2 }),
    monitor: () => ({ target: [-0.2, 2.63, -2.66], dir: [0.1, 0.32, 1], fit: [5.2, 3.4] }),
    keyboard: () => ({ target: [0.2, 0.3, 0.75], dir: [0.1, 1, 0.75], fit: [5.4, 2.6] }),
    // A higher angle pushes the plant above the frame and leaves room for the sip quote.
    mug: () => ({ target: [mug.position.x - 0.3, 0.95 + MUG_Y, mug.position.z - 0.45], dir: [-0.2, 1, 0.45], fit: [3.1, 4.1] }),
  };
  const CAM_DISTANCE = 40;
  // Close-ups clip everything more than this far in front of the prop (chair, lamp, other
  // props), so nothing in the room can block the view or catch the click
  const CLOSE_UP_DEPTH = 3.5;
  const cam = { tx: 0, ty: 0, tz: 0, dx: 0, dy: 1, dz: 1, zoom: 1, near: 0.1 };

  function applyShot(instant = false, duration = 0.9) {
    const shot = SHOTS[focus.name]();
    const d = new THREE.Vector3(...shot.dir).normalize();
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    const viewW = viewH * (w / h);
    const zoom = shot.fit ? Math.min(viewW / shot.fit[0], viewH / shot.fit[1]) : 1;
    const near = shot.fit ? CAM_DISTANCE - (shot.depth ?? CLOSE_UP_DEPTH) : 0.1;
    const to = { tx: shot.target[0], ty: shot.target[1], tz: shot.target[2], dx: d.x, dy: d.y, dz: d.z, zoom, near };
    gsap.killTweensOf(cam);
    if (instant) Object.assign(cam, to);
    else gsap.to(cam, { ...to, duration, ease: "power3.inOut" });
  }

  let arriveTimer = null;
  function setFocus(name) {
    if (focus.name === name) return;
    stopTyping();
    byFocus.get(focus.name)?.onLeave?.();
    clearTimeout(arriveTimer);
    focus.name = name;
    applyShot();
    sfx.whoosh({ duration: 0.45, up: name !== "overview" });
    onEvent("focus", { name });
    const entry = byFocus.get(name);
    if (!entry) return;
    // Once the camera lands: the prop's arrival move
    arriveTimer = setTimeout(() => focus.name === name && entry.onArrive?.(), 850);
  }

  function back() {
    if (heldTicket) dropTicket();
    else if (openFolder) closeProject();
    else if (focus.name !== "overview") setFocus("overview");
  }

  // A clickable rectangle printed on a texture, under the pointer
  function hotspotAt(hit) {
    const t = hit.object.userData.tex;
    if (!t?.hotspots?.length || !hit.uv) return null;
    const px = hit.uv.x * t.canvas.width;
    const py = (1 - hit.uv.y) * t.canvas.height;
    return t.hotspots.find((hs) => px >= hs.x && px <= hs.x + hs.w && py >= hs.y && py <= hs.y + hs.h) || null;
  }
  function runHotspot(hs, entry) {
    sfx.click();
    if (!hs.href) return entry.onHotspot?.(hs);
    if (hs.href.startsWith("mailto:")) window.location.href = hs.href;
    else window.open(hs.href, "_blank", "noopener");
  }

  function handleClick(entry, hit) {
    if (!entry.focus || focus.name === entry.focus) {
      const hs = entry.focus && hotspotAt(hit);
      if (typing && hs?.id !== typing.id) stopTyping();
      return hs ? runHotspot(hs, entry) : entry.onClick?.(hit);
    }
    entry.onEnter?.(hit);
    setFocus(entry.focus);
  }

  // ---------- sizing & loop ----------
  let viewH = VIEW_H;
  // Render at the screen's real pixel density, including browser zoom (which changes
  // devicePixelRatio) and pinch zoom (visualViewport.scale), so edges stay sharp when zoomed in.
  // Capped, so a deep pinch doesn't ask for an enormous canvas.
  const pixelRatio = () => Math.min(window.devicePixelRatio * (window.visualViewport?.scale || 1), 3);
  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setPixelRatio(pixelRatio());
    const aspect = w / h;
    // Keep desk props large enough to tap while the room fills the rest of the screen.
    viewH = Math.max(VIEW_H, (aspect < 1 ? 18 : VIEW_W) / aspect);
    camera.left = (-viewH * aspect) / 2;
    camera.right = (viewH * aspect) / 2;
    camera.top = viewH / 2;
    camera.bottom = -viewH / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    outlineResolution.value.set(w, h);
    if (!intro?.isActive()) applyShot(true);
  }

  let frame = null;
  let lastBlink = 0;
  const WORLD_UP = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const target = new THREE.Vector3();
  let lastTick = 0;
  function tick(now) {
    frame = requestAnimationFrame(tick);
    // Step size for the springs, capped so a background tab doesn't fling them on return
    const dt = Math.min(0.05, lastTick ? (now - lastTick) / 1000 : 0.016);
    lastTick = now;
    updateTicketHover(dt);
    poseFolders();
    parallax.x += (parallax.tx - parallax.x) * 0.06;
    parallax.y += (parallax.ty - parallax.y) * 0.06;
    // Parallax shrinks as we zoom in so close-ups stay readable
    const sway = focus.name === "about" ? 0 : 1 / Math.sqrt(cam.zoom);
    dir.set(cam.dx + parallax.x * 0.08 * sway, cam.dy - parallax.y * 0.05 * sway, cam.dz).normalize();
    target.set(cam.tx, cam.ty, cam.tz);
    camera.position.copy(target).addScaledVector(dir, CAM_DISTANCE);
    camera.up.copy(WORLD_UP);
    camera.lookAt(target);
    if (camera.zoom !== cam.zoom || camera.near !== cam.near) {
      camera.zoom = cam.zoom;
      camera.near = cam.near;
      camera.updateProjectionMatrix();
    }
    updateLanyard(dt);
    outside.t += dt;
    if (now - outside.drawnAt > (focus.name === "window" ? 33 : 150)) {
      outside.drawnAt = now;
      windowView.userData.tex.redraw();
    }
    plant.rotation.z = Math.sin(now / 1400) * 0.015;
    updateButterfly(dt, now);
    if (!mouseRunning) {
      mouse.position.x += (mouseAim.x - mouse.position.x) * 0.18;
      mouse.position.z += (mouseAim.z - mouse.position.z) * 0.18;
    }
    for (const { object, plane, baseY, strength } of contactShadows) {
      const lift = Math.max(0, object.position.y - baseY);
      plane.position.x = object.position.x;
      plane.position.z = object.position.z;
      plane.rotation.z = -object.rotation.y;
      plane.scale.setScalar(1 + lift * 0.3);
      plane.material.opacity = (darkNow ? 0.5 : 0.65) * strength / (1 + lift * 3);
    }
    if (now - lastBlink > 530) {
      lastBlink = now;
      cursorOn = !cursorOn;
      caretOn = !caretOn;
      if (!termBusy) redrawTerminal();
      typing?.redraw();
    }
    // The desktop animates (windows, dock, the player's visualizer) at about 30 fps
    if ((desktop.busy() || lofi.playing) && now - screenDrawnAt > 33) redrawScreen();
    // The typing dots bounce while a reply hasn't started arriving
    const lastMessage = chat.messages[chat.messages.length - 1];
    if (lastMessage?.pending && !lastMessage.text && now - chatTypingAt > 50) {
      chatTypingAt = now;
      chatDirty = true;
    }
    if (chatDirty) {
      chatDirty = false;
      redrawChat();
    }
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      onEvent("ready");
    }
  }

  // Intro: the room fades in on the overview and settles back from slightly closer
  let intro = null;
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  // Zooming changes the pixel density without always resizing the container
  window.addEventListener("resize", resize);
  window.visualViewport?.addEventListener("resize", resize);
  resize();
  const settledZoom = cam.zoom;
  cam.zoom = settledZoom * 1.08;
  swing(0.3);
  intro = gsap.to(cam, { zoom: settledZoom, duration: 1.4, ease: "power2.out", delay: 0.15 });
  let firstFrame = true;
  frame = requestAnimationFrame(tick);

  return {
    setTheme,
    setMuted,
    back,
    focusOn: (name) => SHOTS[name] && setFocus(name),
    runCommand: (cmd) => {
      showTerminal();
      if (focus.name === "monitor") autotype(cmd);
      else setFocus("monitor"), timers.push(setTimeout(() => autotype(cmd), 700));
    },

    destroy() {
      finishNoteDrag(null, false);
      destroyed = true;
      lofi.destroy();
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      clearTimeout(arriveTimer);
      bubbleTimers.forEach(clearTimeout);
      clearInterval(clockTimer);
      clearInterval(buzzTimer);
      clearTimeout(repTimer);
      clearTimeout(shoutTimer);
      intro.kill();
      mailIntro?.kill();
      gsap.killTweensOf(cam);
      ro.disconnect();
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      typer.removeEventListener("input", onTyperInput);
      typer.removeEventListener("keydown", onTyperKey);
      typer.remove();
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("pointercancel", onPointerCancel);
      renderer.domElement.removeEventListener("lostpointercapture", onPointerCancel);
      window.removeEventListener("blur", onWindowBlur);
      scene.traverse((o) => gsap.killTweensOf([o.position, o.rotation, o.scale]));
      boardNotes.forEach((note) => gsap.killTweensOf([note.ring.material, note.pinShadow.material]));
      disposables.forEach((d) => d.dispose?.());
      sun.shadow.dispose();
      windowLight.shadow.dispose();
      lampLight.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
