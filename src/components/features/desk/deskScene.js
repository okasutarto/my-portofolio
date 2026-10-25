// "The Desk": an orthographic, neo-brutalist diorama of a work corner. Each section of
// the site is a prop: the ID badge on the monitor (hero), a scrapbook (about), a stack of
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
import { sfx } from "@/composables/useSfx";
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
  drawScrapCover,
  drawScrapPage,
  drawScrapInsideFlipped,
  loadPortrait,
  drawKeyLabel,
  drawQuoteBubble,
  SIP_QUOTES,
} from "./textures";

const PALETTES = {
  light: { desk: "#a388ee", shadow: "#000000" },
  // Night: the same lavender, dimmed, so it still reads against the dark page
  dark: { desk: "#6b5bc4", shadow: "#000000" },
};
// Props that stand for a section of the 2D site
export const SECTIONS = ["hero", "about", "experience", "projects", "contact"];

// Smallest area of the scene that always stays in view (world units)
const VIEW_W = 21.5;
const VIEW_H = 14.5;

export function createDeskScene({ container, projects, experiences, skills = [], labels = {}, dark = false, onEvent = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
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
  const sun = new THREE.DirectionalLight(0xfff1cc, 1.8);
  sun.position.set(-14, 7.5, -5.25);
  sun.target.position.set(0, -0.3, 1);
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
  const outlineMat = (thickness) => {
    if (!outlineMats.has(thickness)) {
      outlineMats.set(
        thickness,
        track(
          new THREE.ShaderMaterial({
            uniforms: { thickness: { value: thickness }, color: { value: new THREE.Color(0x000000) } },
            vertexShader: `
              uniform float thickness;
              void main() {
                vec4 p = vec4(position + normal * thickness, 1.0);
                #ifdef USE_INSTANCING
                  p = instanceMatrix * p;
                #endif
                gl_Position = projectionMatrix * modelViewMatrix * p;
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
  function mesh(geo, material, { outline = 0.045, cast = true } = {}) {
    track(geo);
    const m = new THREE.Mesh(geo, material);
    m.castShadow = cast;
    m.receiveShadow = true;
    if (outline) {
      const hull = new THREE.Mesh(hullGeometry(geo), outlineMat(outline));
      hull.raycast = noRaycast;
      m.add(hull);
    }
    return m;
  }
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
      pressKey(e.key === " " ? SPACE : e.key.toLowerCase().charCodeAt(0) % (COLS * ROWS));
  };
  typer.addEventListener("input", onTyperInput);
  typer.addEventListener("keydown", onTyperKey);

  // ---------- the desk ----------
  const FLOOR_Y = -5.2;
  const deskMat = toon(PALETTES.light.desk);
  const desk = mesh(rbox(14, 0.7, 8.4, 0.14), deskMat, { outline: 0.06 });
  desk.position.y = -0.35;
  scene.add(desk);
  const legMat = toon("#ffffff");
  [
    [-6.4, -3.6],
    [6.4, -3.6],
    [-6.4, 3.6],
    [6.4, 3.6],
  ].forEach(([x, z]) => {
    const leg = mesh(rbox(0.55, 4.5, 0.55, 0.08), legMat, { outline: 0.05 });
    leg.position.set(x, -2.95, z);
    scene.add(leg);
  });

  // ---------- full-viewport room: walls and floor extend beyond every camera shot ----------
  const room = new THREE.Group();
  scene.add(room);
  const floorMat = toon("#f5c76b");
  const backWallMat = toon("#fff0c9");
  const sideWallMat = toon("#ff90e8");
  const trimMat = toon("#ffffff");
  const roomBox = (w, h, d, material, x, y, z, outline = 0.055) => {
    const part = mesh(new THREE.BoxGeometry(w, h, d), material, { outline, cast: false });
    part.position.set(x, y, z);
    room.add(part);
    return part;
  };
  roomBox(200, 0.25, 200, floorMat, 0, FLOOR_Y - 0.17, 1.2);
  roomBox(200, 100, 0.24, backWallMat, 0, FLOOR_Y + 50, -6.68);
  roomBox(0.24, 100, 200, sideWallMat, -8.88, FLOOR_Y + 50, 1.2);
  roomBox(200, 0.22, 0.16, trimMat, 0, FLOOR_Y + 0.17, -6.45, 0.025);
  roomBox(0.16, 0.22, 200, trimMat, -8.65, FLOOR_Y + 0.17, 1.2, 0.025);
  // Broad floor tiles keep the room graphic rather than adding a noisy texture.
  const floorGrid = new THREE.GridHelper(200, 64, "#1a1714", "#1a1714");
  track(floorGrid.geometry);
  track(floorGrid.material);
  floorGrid.material.transparent = true;
  floorGrid.material.opacity = 0.3;
  floorGrid.position.y = FLOOR_Y - 0.036;
  floorGrid.raycast = noRaycast;
  room.add(floorGrid);

  // A framed illustration on the left wall: four panes, a sun/moon and angular trees.
  let roomDark = false;
  const windowGroup = new THREE.Group();
  windowGroup.position.set(-8.7, 3.9, -2.65);
  windowGroup.rotation.y = Math.PI / 2;
  room.add(windowGroup);
  const windowFrame = mesh(new THREE.BoxGeometry(4.4, 4.5, 0.18), trimMat, { cast: false, outline: 0.07 });
  const windowView = printed(4.0, 4.1, 160, (c, w, h) => {
    c.fillStyle = roomDark ? "#243257" : "#7fdfff";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#ffdd00";
    c.beginPath();
    c.arc(w * 0.75, h * 0.22, w * 0.12, 0, Math.PI * 2);
    c.fill();
    if (roomDark) {
      c.fillStyle = "#fffdf5";
      [[0.15, 0.15], [0.4, 0.28], [0.57, 0.1]].forEach(([x, y]) => c.fillRect(w * x, h * y, 8, 8));
    }
    c.fillStyle = roomDark ? "#43885e" : "#8fd694";
    c.fillRect(0, h * 0.8, w, h * 0.2);
    [[0.2, 0.42, "#166534"], [0.5, 0.53, "#22a65c"], [0.82, 0.48, "#166534"]].forEach(([x, top, color]) => {
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(w * x, h * top);
      c.lineTo(w * (x + 0.16), h * 0.94);
      c.lineTo(w * (x - 0.16), h * 0.94);
      c.closePath();
      c.fill();
      c.lineWidth = 5;
      c.strokeStyle = "#000";
      c.stroke();
    });
    c.fillStyle = "#000";
    c.fillRect(w / 2 - 7, 0, 14, h);
    c.fillRect(0, h / 2 - 7, w, 14);
  });
  windowView.position.z = 0.105;
  windowGroup.add(windowFrame, windowView);
  const sill = mesh(new THREE.BoxGeometry(4.65, 0.18, 0.6), trimMat, { cast: false, outline: 0.045 });
  sill.position.set(0, -2.3, 0.14);
  windowGroup.add(sill);

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
  clock.position.set(5.3, 4.0, -6.43);
  room.add(clock);
  const clockRim = mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.15, 12), toon("#7fb2ff"), { cast: false, outline: 0.06 });
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
  roomBox(3.6, 1.9, 0.12, toon("#ffdd00"), -0.1, 4.35, -6.42);
  const poster = printed(3.35, 1.65, 160, (c, w, h) => {
    c.fillStyle = "#ffdd00";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#000";
    c.font = `900 ${Math.round(h * 0.27)}px sans-serif`;
    c.textAlign = "center";
    c.fillText("MAKE COOL", w / 2, h * 0.44);
    c.fillText("STUFF.", w / 2, h * 0.8);
  });
  poster.position.set(-0.1, 4.35, -6.34);
  room.add(poster);

  // Seat height is roughly 60% of desk height, with a full-size back and armrests.
  const chair = new THREE.Group();
  chair.position.set(-2.9, 0, 6.4);
  chair.rotation.y = -0.22;
  room.add(chair);
  const chairMat = toon("#00e0c6");
  const chairFrameMat = toon("#1a1714");
  const chairSeat = mesh(rbox(3.7, 0.35, 3.1, 0.14), chairMat, { outline: 0.06 });
  chairSeat.position.y = -2.1;
  const chairBack = mesh(rbox(3.7, 3.8, 0.35, 0.15), chairMat, { outline: 0.06 });
  chairBack.position.set(0, -0.05, 1.35);
  const chairPost = mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.7, 12), chairFrameMat, { outline: 0.025 });
  chairPost.position.y = -3.65;
  chair.add(chairSeat, chairBack, chairPost);
  for (let i = 0; i < 5; i++) {
    const spoke = mesh(rbox(1.9, 0.16, 0.2, 0.04), chairFrameMat, { outline: 0.02 });
    const angle = (i / 5) * Math.PI * 2;
    spoke.position.set(Math.cos(angle) * 0.8, FLOOR_Y + 0.25, Math.sin(angle) * 0.8);
    spoke.rotation.y = -angle;
    chair.add(spoke);
  }
  for (const x of [-1.85, 1.85]) {
    const arm = mesh(rbox(0.24, 0.18, 2.0, 0.06), chairFrameMat, { outline: 0.025 });
    arm.position.set(x, -0.75, 0);
    const support = mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.25, 10), chairFrameMat, { outline: 0.02 });
    support.position.set(x, -1.42, 0.4);
    chair.add(arm, support);
  }

  // A rod between two points (lamp arms, plant stems)
  const UP = new THREE.Vector3(0, 1, 0);
  function rod(a, b, radius, material, outline = 0.025) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const m = mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), 12), material, { outline });
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(UP, dir.normalize());
    return m;
  }

  // ---------- desk lamp (back-left): a light switch for the night shift ----------
  const lamp = new THREE.Group();
  scene.add(lamp);
  const lampMat = toon("#ffdd00");
  const jointMat = toon("#1a1714");
  const LAMP_BASE = new THREE.Vector3(-6.0, 0, -3.45);
  const ELBOW = new THREE.Vector3(-5.55, 3.1, -3.45);
  const WRIST = new THREE.Vector3(-4.45, 3.75, -3.1);
  const AIM = new THREE.Vector3(-3.9, 0, -2.2);
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
  // Beam: a soft flat cone down to the desk, only at night
  const beamLength = WRIST.distanceTo(AIM);
  const beam = new THREE.Mesh(
    track(new THREE.ConeGeometry(1.7, beamLength, 32, 1, true)),
    track(new THREE.MeshBasicMaterial({ color: "#fff1a8", transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })),
  );
  beam.rotation.x = -Math.PI / 2;
  beam.position.z = beamLength / 2 + 0.3;
  beam.raycast = noRaycast;
  beam.visible = false;
  lampHead.add(shade, bulb, beam);
  lamp.add(lampHead);
  const setLamp = (on) => {
    bulbMat.color.set(on ? "#fff6c2" : "#d9d4c7");
    beam.visible = on;
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
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const reach = 0.4 + (i % 2) * 0.18;
    const tip = new THREE.Vector3(Math.cos(a) * reach, 1.0 + ((i * 3) % 4) * 0.42, Math.sin(a) * reach);
    foliage.add(rod(new THREE.Vector3(0, 0, 0), tip, 0.035, stemMat, 0.015));
    const leafGeo = new THREE.SphereGeometry(1, 18, 10);
    leafGeo.scale(0.32, 0.05, 0.62);
    leafGeo.translate(0, 0, 0.5);
    const leaf = mesh(leafGeo, leafMats[i % 2], { outline: 0.03 });
    leaf.position.copy(tip);
    // Point the leaf (its length runs along +z) outward and a little up, then let it droop
    leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(Math.cos(a), 0.5, Math.sin(a)).normalize());
    leaf.rotateX(0.35);
    foliage.add(leaf);
  }
  register(plant, {
    onHover: (on) => on && gsap.fromTo(foliage.rotation, { z: 0.06 }, { z: 0, duration: 1.2, ease: "elastic.out(1, 0.3)" }),
    onClick: () => {
      gsap.fromTo(foliage.rotation, { z: 0.15 }, { z: 0, duration: 1.4, ease: "elastic.out(1, 0.25)" });
      sfx.rustle({ duration: 0.5 });
    },
  });

  // ---------- monitor + terminal ----------
  const monitor = new THREE.Group();
  monitor.position.set(-0.2, 0, -2.75);
  scene.add(monitor);
  const whiteMat = toon("#ffffff");
  const base = mesh(rbox(1.6, 0.16, 1.0), whiteMat);
  base.position.y = 0.08;
  const neck = mesh(rbox(0.36, 1.1, 0.26), whiteMat);
  neck.position.set(0, 0.65, -0.15);
  const body = mesh(rbox(4.5, 2.9, 0.36, 0.12), toon("#00e0c6"), { outline: 0.06 });
  body.position.y = 2.35;
  monitor.add(base, neck, body);

  const term = canvasTexture(640, 384);
  track(term.texture);
  const screen = new THREE.Mesh(track(new THREE.PlaneGeometry(4.0, 2.4)), track(new THREE.MeshBasicMaterial({ map: term.texture })));
  screen.position.set(0, 2.38, 0.185);
  monitor.add(screen);

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
  };
  COMMANDS.ls = COMMANDS.projects;
  const AUTORUN = ["help", "whoami", "projects", "hobbies", "sudo hire oka"];
  const MAX_INPUT = 26;
  let termLines = ["oka@desk ready.", "click the screen to zoom in"];
  let greeted = false;
  let input = "";
  let termBusy = false;
  let autorunIndex = 0;
  let cursorOn = true;
  const redrawTerminal = () => {
    drawTerminal(term.ctx, 640, 384, [...termLines, "> " + input], cursorOn);
    term.texture.needsUpdate = true;
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

  register(monitor, {
    focus: "monitor",
    onEnter: () => {
      if (greeted) return;
      greeted = true;
      termLines = ["oka@desk ready.", "type a command, try: help"];
      redrawTerminal();
    },
    onClick: () => autotype(AUTORUN[autorunIndex++ % AUTORUN.length]),
  });

  // ---------- ID badge on a lanyard, hooked on the monitor's corner (hero) ----------
  const strapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.7, 3.83, -2.55),
    new THREE.Vector3(-2.3, 3.9, -2.54),
    new THREE.Vector3(-2.6, 3.62, -2.48),
    new THREE.Vector3(-2.74, 3.15, -2.44),
    new THREE.Vector3(-2.8, 2.92, -2.42),
  ]);
  scene.add(mesh(new THREE.TubeGeometry(strapCurve, 40, 0.05, 6), toon("#ffdd00"), { outline: 0.03 }));
  const badgePivot = new THREE.Group();
  badgePivot.position.set(-2.8, 2.92, -2.42);
  scene.add(badgePivot);
  const badge = new THREE.Group();
  badgePivot.add(badge);
  const clip = mesh(rbox(0.22, 0.16, 0.08, 0.03), toon("#888888"), { outline: 0.025 });
  const badgeCard = new THREE.Group();
  badgeCard.position.y = -1.0;
  const badgeFront = printed(1.1, 1.8, 400, (c, w, h) => drawBadge(c, w, h));
  badgeFront.position.z = 0.028;
  const badgeBack = printed(1.1, 1.8, 400, (c, w, h) => drawBadge(c, w, h, { back: true }));
  badgeBack.position.z = -0.028;
  badgeBack.rotation.y = Math.PI;
  badgeCard.add(mesh(rbox(1.1, 1.8, 0.05, 0.04), toon("#ffffff"), { outline: 0.035 }), badgeFront, badgeBack);
  badge.add(clip, badgeCard);
  const swing = (amount) => gsap.fromTo(badge.rotation, { z: amount }, { z: 0, duration: 1.6, ease: "elastic.out(1, 0.25)" });
  // Zoomed in, clicking the badge turns it over: the links are printed on the back
  let badgeFlipped = false;
  const flipBadge = (to = !badgeFlipped) => {
    badgeFlipped = to;
    gsap.to(badgeCard.rotation, { y: to ? Math.PI : 0, duration: 0.6, ease: "back.out(1.4)" });
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
      gsap.fromTo(badge.rotation, { y: 0 }, { y: Math.PI * 2, duration: 1.1, ease: "power3.out" });
      sfx.whoosh({ duration: 0.5 });
    },
  });

  // ---------- scrapbook (about) ----------
  // Zoomed in, the cover opens out flat and the pages turn over on the spine: click the right
  // page (or →) to turn forward, the left page (or ←) to turn back.
  const BOOK_W = 1.8;
  const BOOK_D = 2.4;
  const LEAF_W = BOOK_W - 0.1;
  const LEAF_D = BOOK_D - 0.1;
  const BLOCK_TOP = 0.12;
  const book = new THREE.Group();
  book.position.set(-4.15, 0, -1.9);
  book.rotation.y = 0.06;
  scene.add(book);
  const coverMat = toon("#1a1714");
  const paperMat = toon("#fffdf5");
  const bookBack = mesh(rbox(BOOK_W, 0.06, BOOK_D, 0.02), coverMat, { outline: 0.035 });
  bookBack.position.y = 0.03;
  const pageBlock = mesh(rbox(BOOK_W - 0.08, 0.06, BOOK_D - 0.08, 0.02), paperMat, { outline: 0.025 });
  pageBlock.position.y = 0.09;
  // Under the left half once the book lies open, so the open cover doesn't float
  const leftBlock = mesh(rbox(BOOK_W - 0.08, BLOCK_TOP, BOOK_D - 0.08, 0.02), paperMat, { outline: 0.025 });
  leftBlock.position.set(-BOOK_W, BLOCK_TOP / 2, 0);
  leftBlock.visible = false;
  const lastPage = printed(LEAF_W, LEAF_D, 300, (c, w, h) => drawScrapPage(c, w, h, { kind: "notes", n: 7, side: "right" }));
  lastPage.rotation.x = -Math.PI / 2;
  lastPage.position.y = BLOCK_TOP + 0.002;
  book.add(bookBack, pageBlock, leftBlock, lastPage);

  // A leaf is two printed sides back to back, hinged on the spine
  const SPREADS = [
    ["hello", "bio"],
    ["stats", "now"],
    ["skills", "end"],
  ];
  const leafGeo = track(rbox(LEAF_W, 0.008, LEAF_D, 0.003));
  const leaves = SPREADS.map(([front, back], i) => {
    const pivot = new THREE.Group();
    const rightY = BLOCK_TOP + 0.006 + (SPREADS.length - 1 - i) * 0.012;
    pivot.position.set(-BOOK_W / 2 + 0.05, rightY, 0);
    const leaf = mesh(leafGeo, paperMat, { outline: 0.01, cast: false });
    leaf.position.x = LEAF_W / 2;
    const frontFace = printed(LEAF_W, LEAF_D, 300, (c, w, h) => drawScrapPage(c, w, h, { kind: front, n: i * 2 + 1, side: "right", skills }));
    frontFace.rotation.x = -Math.PI / 2;
    frontFace.position.set(LEAF_W / 2, 0.005, 0);
    const backFace = printed(LEAF_W, LEAF_D, 300, (c, w, h) =>
      drawScrapPage(c, w, h, { kind: back, n: i * 2 + 2, side: "left", flipped: true, skills }),
    );
    backFace.rotation.x = Math.PI / 2;
    backFace.position.set(LEAF_W / 2, -0.005, 0);
    pivot.add(leaf, frontFace, backFace);
    book.add(pivot);
    return { pivot, rightY };
  });

  // The cover, hinged on the spine; its inside is printed upside down for the same reason
  const coverHinge = new THREE.Group();
  coverHinge.position.set(-BOOK_W / 2, BLOCK_TOP + 0.05, 0);
  const cover = mesh(rbox(BOOK_W, 0.03, BOOK_D, 0.01), coverMat, { outline: 0.035 });
  cover.position.x = BOOK_W / 2;
  const coverFace = printed(BOOK_W, BOOK_D, 200, drawScrapCover);
  coverFace.rotation.x = -Math.PI / 2;
  coverFace.position.set(BOOK_W / 2, 0.016, 0);
  const inside = printed(BOOK_W, BOOK_D, 200, drawScrapInsideFlipped);
  inside.rotation.x = Math.PI / 2;
  inside.position.set(BOOK_W / 2, -0.016, 0);
  const strap = mesh(rbox(0.1, 0.02, BOOK_D, 0.005), toon("#ffdd00"), { outline: 0.02, cast: false });
  strap.position.set(BOOK_W - 0.2, 0.025, 0);
  coverHinge.add(cover, coverFace, inside, strap);
  book.add(coverHinge);

  let bookOpen = false;
  let turned = 0; // leaves turned over to the left
  // Turned leaves pile up on the left, on top of the open cover
  const leftY = (k) => BLOCK_TOP + 0.056 + k * 0.012;
  function openBook(open) {
    bookOpen = open;
    gsap.to(coverHinge.rotation, {
      z: open ? Math.PI : 0,
      duration: open ? 0.7 : 0.5,
      ease: open ? "power2.inOut" : "bounce.out",
      // The left block only exists under the cover: show it once the cover is past upright
      onUpdate: () => (leftBlock.visible = coverHinge.rotation.z > Math.PI * 0.55),
    });
    gsap.to(coverHinge.position, { y: open ? BLOCK_TOP + 0.05 - 0.02 : BLOCK_TOP + 0.05, duration: 0.5 });
    open ? sfx.rustle({ duration: 0.5 }) : sfx.paper();
  }
  function turnPage(dir) {
    if (!bookOpen) return openBook(true);
    if (dir > 0 && turned < leaves.length) {
      const { pivot } = leaves[turned];
      gsap.to(pivot.rotation, { z: Math.PI, duration: 0.55, ease: "power2.inOut" });
      gsap.to(pivot.position, { keyframes: [{ y: 0.5, duration: 0.27 }, { y: leftY(turned), duration: 0.28 }] });
      turned++;
      sfx.paper();
    } else if (dir < 0 && turned > 0) {
      turned--;
      const { pivot, rightY } = leaves[turned];
      gsap.to(pivot.rotation, { z: 0, duration: 0.55, ease: "power2.inOut" });
      gsap.to(pivot.position, { keyframes: [{ y: 0.5, duration: 0.27 }, { y: rightY, duration: 0.28 }] });
      sfx.paper();
    } else {
      // Nothing further this way: a little nudge
      gsap.fromTo(book.rotation, { z: dir * 0.02 }, { z: 0, duration: 0.4, ease: "elastic.out(1.5, 0.3)" });
    }
  }
  function closeBook() {
    leaves.forEach(({ pivot, rightY }, i) => {
      gsap.to(pivot.rotation, { z: 0, duration: 0.35, delay: (leaves.length - 1 - i) * 0.05 });
      gsap.to(pivot.position, { y: rightY, duration: 0.35 });
    });
    turned = 0;
    timers.push(setTimeout(() => openBook(false), 200));
  }
  const bookPoint = new THREE.Vector3();
  register(book, {
    focus: "about",
    onHover: hoverScale(book, 1.03),
    onArrive: () => openBook(true),
    onLeave: closeBook,
    // Right of the spine turns forward, left of it turns back
    onClick: (hit) => {
      book.worldToLocal(bookPoint.copy(hit.point));
      turnPage(bookPoint.x > -BOOK_W / 2 ? 1 : -1);
    },
    onKey: (e) => {
      if (e.key === "ArrowRight") return turnPage(1), true;
      if (e.key === "ArrowLeft") return turnPage(-1), true;
      return false;
    },
  });

  // ---------- keyboard ----------
  const keyboard = new THREE.Group();
  keyboard.position.set(0.2, 0, 0.75);
  scene.add(keyboard);
  const keyBase = mesh(rbox(4.6, 0.25, 1.7), toon("#ffdd00"));
  keyBase.position.y = 0.125;
  keyboard.add(keyBase);
  // Four rows of 13 keys, then a bottom row of modifiers around a spacebar (cols 3-9)
  const COLS = 13;
  const ROWS = 4;
  const BOTTOM_COLS = [0, 1, 2, 10, 11, 12];
  const KEY_COUNT = COLS * ROWS + BOTTOM_COLS.length;
  const SPACE = -1;
  const rowZ = (r) => -0.68 + r * 0.34;
  const colX = (c) => -2.04 + c * 0.34;
  const keyGeo = track(rbox(0.29, 0.18, 0.29, 0.05));
  const keys = new THREE.InstancedMesh(keyGeo, toon("#ffffff"), KEY_COUNT);
  const keyHull = new THREE.InstancedMesh(hullGeometry(keyGeo), outlineMat(0.03), KEY_COUNT);
  keyHull.instanceMatrix = keys.instanceMatrix;
  keyHull.raycast = noRaycast;
  keys.castShadow = true;
  const keyPos = [];
  const keyDepth = new Float32Array(KEY_COUNT);
  const dummy = new THREE.Object3D();
  const ACCENTS = { 0: "#e11d48", 12: "#00e0c6", 25: "#00e0c6", 38: "#3b82f6", 51: "#e11d48" };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const id = r * COLS + c;
      keyPos.push(new THREE.Vector3(colX(c), 0.34, rowZ(r)));
      keys.setColorAt(id, new THREE.Color(ACCENTS[id] || "#ffffff"));
    }
  }
  BOTTOM_COLS.forEach((c, i) => {
    keyPos.push(new THREE.Vector3(colX(c), 0.34, rowZ(ROWS)));
    keys.setColorAt(COLS * ROWS + i, new THREE.Color(i === 0 || i === BOTTOM_COLS.length - 1 ? "#ffdd00" : "#ffffff"));
  });
  const spacebar = mesh(rbox(7 * 0.34 - 0.05, 0.18, 0.29, 0.05), toon("#ffffff"), { outline: 0.03 });
  spacebar.position.set(colX(6), 0.34, rowZ(ROWS));
  // Shortcut keys, printed on their keycaps: digits fly to the sections, T to the terminal,
  // C to the chat. They work from your own keyboard too.
  const SHORTCUTS = {
    1: { shot: "hero", key: 1, color: "#ffdd00" },
    2: { shot: "about", key: 2, color: "#ff90e8" },
    3: { shot: "experience", key: 3, color: "#00e0c6" },
    4: { shot: "projects", key: 4, color: "#f5c76b" },
    5: { shot: "contact", key: 5, color: "#e9c48a" },
    t: { shot: "monitor", key: COLS + 5, color: "#8fd694" },
    c: { shot: "chat", key: 2 * COLS + 3, color: "#7fb2ff" },
  };
  const shortcutByKey = new Map(Object.values(SHORTCUTS).map((sc) => [sc.key, sc]));
  const keyLabels = new Map(); // key id -> printed label riding on that keycap
  const addKeyLabel = (id, label, color) => {
    const plane = printed(0.25, 0.25, 400, (c, w, h) => drawKeyLabel(c, w, h, label, color));
    plane.rotation.x = -Math.PI / 2;
    plane.userData.keyId = id;
    keyboard.add(plane);
    keyLabels.set(id, plane);
  };
  Object.entries(SHORTCUTS).forEach(([label, sc]) => addKeyLabel(sc.key, label.toUpperCase(), sc.color));
  addKeyLabel(0, "ESC", "#ff6b6b");
  const updateKey = (id) => {
    dummy.position.copy(keyPos[id]);
    dummy.position.y -= keyDepth[id];
    dummy.updateMatrix();
    keys.setMatrixAt(id, dummy.matrix);
    keyLabels.get(id)?.position.set(dummy.position.x, dummy.position.y + 0.092, dummy.position.z);
  };
  for (let id = 0; id < KEY_COUNT; id++) updateKey(id);
  keyboard.add(keys, keyHull, spacebar);

  let keysPressed = 0;
  function pressKey(id, { sound = true } = {}) {
    if (id === SPACE) {
      gsap.fromTo(spacebar.position, { y: 0.22 }, { y: 0.34, duration: 0.3, ease: "back.out(3)" });
    } else {
      const state = { d: 0.12 };
      gsap.to(state, {
        d: 0,
        duration: 0.28,
        ease: "back.out(3)",
        onUpdate: () => {
          keyDepth[id] = state.d;
          updateKey(id);
          keys.instanceMatrix.needsUpdate = true;
        },
      });
    }
    if (sound) id === SPACE ? sfx.thud({ strength: 0.25 }) : sfx.key();
    onEvent("keys", { count: ++keysPressed });
  }
  const hitKey = (hit) => {
    const id = hit.object === spacebar ? SPACE : hit.object.userData.keyId ?? hit.instanceId ?? Math.floor(Math.random() * KEY_COUNT);
    pressKey(id);
    if (id === 0) return timers.push(setTimeout(back, 200));
    const sc = shortcutByKey.get(id);
    if (sc) timers.push(setTimeout(() => setFocus(sc.shot), 200));
  };
  register(keyboard, { focus: "keyboard", onClick: hitKey });
  const onKeyDown = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea, [contenteditable]")) return;
    if (e.key === "Escape") return back();
    if (byFocus.get(focus.name)?.onKey?.(e)) return e.preventDefault();
    // Shortcuts (not while the terminal has the keyboard: there they're just typing)
    const sc = focus.name !== "monitor" && !e.repeat && SHORTCUTS[e.key.toLowerCase()];
    if (sc) {
      pressKey(sc.key);
      return setFocus(sc.shot);
    }
    if (e.key.length !== 1 && e.key !== "Enter" && e.key !== "Backspace") return;
    const keyId = e.key === " " ? SPACE : e.key.toLowerCase().charCodeAt(0) % (COLS * ROWS);
    if (focus.name === "monitor") {
      e.preventDefault();
      if (e.repeat && e.key === "Enter") return;
      typeKey(e.key);
      pressKey(keyId, { sound: !termBusy });
    } else if (!e.repeat) pressKey(keyId);
  };
  window.addEventListener("keydown", onKeyDown);

  // ---------- mouse + pad (decor) ----------
  const mousePad = mesh(rbox(1.8, 0.04, 1.45, 0.02), toon("#00e0c6"), { outline: 0.03 });
  mousePad.position.set(3.7, 0.02, 0.45);
  scene.add(mousePad);
  const mouse = new THREE.Group();
  mouse.position.set(3.75, 0.04, 0.5);
  mouse.rotation.y = -0.12;
  scene.add(mouse);
  const mouseBody = mesh(rbox(0.5, 0.26, 0.8, 0.13), toon("#ffffff"), { outline: 0.035 });
  mouseBody.position.y = 0.13;
  const seam = new THREE.Mesh(track(new THREE.BoxGeometry(0.02, 0.01, 0.34)), shadowFill);
  seam.position.set(0, 0.262, -0.2);
  const wheel = mesh(rbox(0.07, 0.06, 0.14, 0.02), toon("#e11d48"), { outline: 0.015, cast: false });
  wheel.position.set(0, 0.27, -0.2);
  mouse.add(mouseBody, seam, wheel);
  // It follows your real cursor around the pad, and clicks when you click
  const PAD = { x: 3.7, z: 0.45 };
  const mouseAim = { x: 3.75, z: 0.5 };
  const pressMouse = () => gsap.fromTo(mouseBody.position, { y: 0.09 }, { y: 0.13, duration: 0.2, ease: "back.out(3)" });
  register(mouse, {
    onHover: hoverScale(mouse, 1.06),
    onClick: () => {
      sfx.click();
      timers.push(setTimeout(() => sfx.click(), 110));
    },
  });

  // ---------- boarding passes (experience) ----------
  // Zoomed in, the stack fans out. Click a pass to hold it up to the camera, click it again to
  // turn it over to its itinerary; ← → hold the previous / next one.
  const tickets = new THREE.Group();
  tickets.position.set(-4.4, 0, 2.2);
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
  function holdTicket(entry) {
    if (heldTicket === entry) return;
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
      onHover: (on) => gsap.to(entry.flipper.position, { y: on ? 0.08 : 0, duration: 0.15 }),
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
  // The chat with Oka's AI assistant runs on the phone's screen: type (or tap a suggested
  // question), the reply streams in, the wheel scrolls back through it.
  const phoneStand = new THREE.Group();
  phoneStand.position.set(3.3, 0, -2.3);
  phoneStand.rotation.y = -0.3;
  scene.add(phoneStand);
  const standMat = toon("#222222");
  const standBase = mesh(rbox(1.1, 0.14, 0.9, 0.04), standMat, { outline: 0.03 });
  standBase.position.y = 0.07;
  const standBack = mesh(rbox(0.7, 1.2, 0.1, 0.03), standMat, { outline: 0.03 });
  standBack.position.set(0, 0.6, -0.3);
  standBack.rotation.x = -0.28;
  const phone = new THREE.Group();
  phone.position.set(0, 1.08, -0.12);
  phone.rotation.x = -0.28;
  let unread = true;
  const chat = { messages: [], input: "", active: false, waiting: false, scroll: 0, maxScroll: 0 };
  let chatDirty = false;
  const phoneScreen = printed(0.82, 1.64, 700, (c, w, h) => drawChatScreen(c, w, h, chat, { unread, caret: caretOn && chat.active }));
  phoneScreen.position.z = 0.047;
  phone.add(mesh(rbox(0.95, 1.85, 0.09, 0.12), toon("#3b82f6"), { outline: 0.035 }), phoneScreen);
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
      gsap.fromTo(phone.position, { y: 1.22 }, { y: 1.08, duration: 0.4, ease: "bounce.out" });
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
  // A pile of manila folders, one per project.
  // Zoomed in, they're dealt into a grid. Click one to lift it and open its cover flat; its
  // sheets then turn like pages (right side forward, left side back, or ← →). The last sheet
  // carries the links as stamps.
  const FOLDER_W = 1.2;
  const FOLDER_D = 0.9;
  const SHEET_W = FOLDER_W - 0.08;
  const SHEET_D = FOLDER_D - 0.08;
  const folders = new THREE.Group();
  folders.position.set(0.3, 0, 2.75);
  folders.rotation.y = -0.06;
  scene.add(folders);
  const manila = toon("#f5c76b");
  const folderGeo = track(rbox(FOLDER_W, 0.03, FOLDER_D, 0.012));
  const sheetGeo = track(rbox(SHEET_W, 0.004, SHEET_D, 0.0015));
  const sheetMat = toon("#ffffff");
  const sheetY = (k) => 0.02 + (CASE_SHEETS.length - 1 - k) * 0.006;
  const HINGE_Y = 0.02 + CASE_SHEETS.length * 0.006 + 0.02;
  const turnedY = (k) => HINGE_Y + 0.022 + k * 0.006;
  const folderList = projects.map((project, i) => {
    const f = new THREE.Group();
    // Everything visible sits in body, so hover can lift it without touching f's own moves
    const body = new THREE.Group();
    f.add(body);
    const back = mesh(folderGeo, manila, { outline: 0.02 });
    body.add(back);
    // Sheets, hinged on the folder's left edge like pages
    const sheets = CASE_SHEETS.map((kind, k) => {
      const pivot = new THREE.Group();
      pivot.position.set(-FOLDER_W / 2 + 0.04, sheetY(k), 0);
      const paper = mesh(sheetGeo, sheetMat, { outline: 0.008, cast: false });
      paper.position.x = SHEET_W / 2;
      const front = printed(SHEET_W, SHEET_D, 600, (c, w, h) => drawCaseSheet(c, w, h, project, kind));
      front.rotation.x = -Math.PI / 2;
      front.position.set(SHEET_W / 2, 0.0025, 0);
      const backSide = printed(SHEET_W, SHEET_D, 300, (c, w, h) => drawCaseBack(c, w, h, project));
      backSide.rotation.x = Math.PI / 2;
      backSide.position.set(SHEET_W / 2, -0.0025, 0);
      pivot.add(paper, front, backSide);
      body.add(pivot);
      return pivot;
    });
    const hinge = new THREE.Group();
    hinge.position.set(-FOLDER_W / 2, HINGE_Y, 0);
    const cover = mesh(folderGeo, manila, { outline: 0.02 });
    cover.position.x = FOLDER_W / 2;
    const face = printed(FOLDER_W, FOLDER_D, 600, (c, w, h) => drawFolderCover(c, w, h, project, i));
    face.rotation.x = -Math.PI / 2;
    face.position.set(FOLDER_W / 2, 0.016, 0);
    const inside = printed(FOLDER_W, FOLDER_D, 300, (c, w, h) => drawCaseBack(c, w, h, project, { inside: true, index: i }));
    inside.rotation.x = Math.PI / 2;
    inside.position.set(FOLDER_W / 2, -0.016, 0);
    hinge.add(cover, face, inside);
    body.add(hinge);
    // First project on top of the pile
    const stack = { x: (Math.random() - 0.5) * 0.1, y: 0.016 + (projects.length - 1 - i) * 0.08, z: (Math.random() - 0.5) * 0.08, r: (Math.random() - 0.5) * 0.1 };
    // Dealt into a grid: three on the back row, the rest in front
    const perRow = 3;
    const r = Math.floor(i / perRow);
    const inRow = Math.min(perRow, projects.length - r * perRow);
    const row = { x: ((i % perRow) - (inRow - 1) / 2) * 1.32, y: 0.016, z: -0.15 + r * 1.1, r: (Math.random() - 0.5) * 0.08 };
    f.position.set(stack.x, stack.y, stack.z);
    f.rotation.y = stack.r;
    folders.add(f);
    return { project, f, body, hinge, sheets, turned: 0, stack, row };
  });
  let openFolder = null;
  const arrangeFolders = (dealt) => {
    if (openFolder) closeFolder(openFolder);
    openFolder = null;
    folderList.forEach(({ f, stack, row }, i) => {
      const to = dealt ? row : stack;
      const delay = (dealt ? i : folderList.length - 1 - i) * 0.08;
      gsap.to(f.position, { x: to.x, z: to.z, duration: 0.5, delay, ease: "power2.inOut" });
      gsap.to(f.position, { keyframes: [{ y: 0.6, duration: 0.25 }, { y: to.y, duration: 0.25 }], delay });
      gsap.to(f.rotation, { y: to.r, duration: 0.5, delay });
      timers.push(setTimeout(() => sfx.slap(), (delay + 0.5) * 1000));
    });
  };
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
    gsap.to(entry.hinge.rotation, { z: 0, duration: 0.4, delay: 0.1, ease: "power2.in" });
    gsap.to(entry.f.position, { y: entry.row.y, duration: 0.3, delay: 0.3, ease: "power2.in", onComplete: () => sfx.slap() });
  }
  // Lift a folder and open its cover out flat, and move the camera in close
  function openProject(entry) {
    if (openFolder) closeFolder(openFolder);
    openFolder = entry;
    gsap.to(entry.f.position, { y: 0.35, duration: 0.3, ease: "back.out(2)" });
    gsap.to(entry.hinge.rotation, { z: Math.PI, duration: 0.6, delay: 0.15, ease: "power2.inOut" });
    sfx.rustle({ duration: 0.4 });
    applyShot();
  }
  function closeProject() {
    if (!openFolder) return;
    closeFolder(openFolder);
    openFolder = null;
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
    if (entry !== openFolder) return openProject(entry);
    entry.f.worldToLocal(folderPoint.copy(hit.point));
    turnSheet(folderPoint.x > -FOLDER_W / 2 ? 1 : -1);
  };
  // Hover lifts just the folder under the pointer
  folderList.forEach((entry) =>
    register(entry.f, {
      focus: "projects",
      item: true,
      onHover: (on) => gsap.to(entry.body.position, { y: on && entry !== openFolder ? 0.1 : 0, duration: 0.15 }),
      onClick: clickFolder,
    }),
  );
  register(folders, {
    focus: "projects",
    onArrive: () => arrangeFolders(true),
    onLeave: () => arrangeFolders(false),
    onClick: clickFolder,
    onKey: (e) => {
      if (!openFolder || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return false;
      turnSheet(e.key === "ArrowRight" ? 1 : -1);
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
  const envelope = new THREE.Group();
  envelope.position.y = 0.04;
  const envTop = printed(2.2, 1.4, 300, drawEnvelope);
  envTop.rotation.x = -Math.PI / 2;
  envTop.position.y = 0.026;
  envelope.add(mesh(rbox(2.2, 0.05, 1.4, 0.02), toon("#e9c48a"), { outline: 0.03 }), envTop);
  const postcard = new THREE.Group();
  const POSTCARD_REST = { x: -0.35, y: 0.012, z: -0.4, r: 0.15 };
  const POSTCARD_OUT = { x: 0, y: 0.2, z: 0.6, r: -0.12 };
  postcard.position.set(POSTCARD_REST.x, POSTCARD_REST.y, POSTCARD_REST.z);
  postcard.rotation.y = POSTCARD_REST.r;
  const postFlip = new THREE.Group();
  postcard.add(postFlip);
  const postFace = printed(2.0, 1.3, 300, drawPostcard);
  postFace.rotation.x = -Math.PI / 2;
  postFace.position.y = 0.012;
  const card = { name: "", email: "", message: "", active: null, errors: {}, status: "idle" };
  const postBack = printed(2.0, 1.3, 500, (c, w, h) => drawPostcardBack(c, w, h, card, { caret: caretOn && !!card.active }));
  postBack.rotation.x = Math.PI / 2;
  postBack.position.y = -0.012;
  postFlip.add(mesh(rbox(2.0, 0.02, 1.3, 0.008), toon("#fffdf5"), { outline: 0.025 }), postFace, postBack);
  mail.add(postcard, envelope);
  const redrawCard = () => postBack.userData.tex.redraw();

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
  // The card turns back over, slips into the envelope, and the envelope flies off and comes
  // back stamped SENT
  function mailOff() {
    flipCard(false);
    gsap.to(postcard.position, { x: POSTCARD_REST.x, y: POSTCARD_REST.y, z: POSTCARD_REST.z, duration: 0.45, delay: 0.35 });
    gsap.to(postcard.rotation, { y: POSTCARD_REST.r, duration: 0.45, delay: 0.35 });
    gsap
      .timeline({ delay: 0.9 })
      .call(() => sfx.whoosh({ duration: 0.6 }))
      .to(mail.position, { y: 6, duration: 0.6, ease: "power2.in" })
      .to(mail.rotation, { z: 0.4, duration: 0.6 }, "<")
      .call(() => {
        redrawCard();
        envTop.userData.tex.redraw({ delivered: true });
      })
      .set(mail.rotation, { z: 0 })
      .to(mail.position, { y: MAIL_POS.y, duration: 0.7, ease: "bounce.out", delay: 0.4 })
      .call(() => sfx.stamp());
    timers.push(setTimeout(() => envTop.userData.tex.redraw({ delivered: false }), 12000));
  }
  let cardFlipped = false;
  function flipCard(to) {
    cardFlipped = to;
    gsap.to(postFlip.rotation, { x: to ? Math.PI : 0, duration: 0.55, ease: "back.out(1.3)" });
  }
  register(mail, {
    focus: "contact",
    onHover: hoverScale(mail, 1.04),
    // Arrival: the postcard slides out of the envelope toward you and turns to its writing side
    onArrive: () => {
      gsap.to(postcard.position, { x: POSTCARD_OUT.x, y: POSTCARD_OUT.y, z: POSTCARD_OUT.z, duration: 0.6, ease: "back.out(1.4)" });
      gsap.to(postcard.rotation, { y: POSTCARD_OUT.r, duration: 0.6 });
      timers.push(setTimeout(() => focus.name === "contact" && (flipCard(true), editField("message")), 500));
      sfx.paper();
    },
    onLeave: () => {
      flipCard(false);
      gsap.to(postcard.position, { x: POSTCARD_REST.x, y: POSTCARD_REST.y, z: POSTCARD_REST.z, duration: 0.4 });
      gsap.to(postcard.rotation, { y: POSTCARD_REST.r, duration: 0.4 });
    },
    onClick: () => !cardFlipped && flipCard(true),
    onHotspot: (hs) => (hs.id === "send" ? sendCard() : editField(hs.id)),
  });

  // ---------- mug (decor) ----------
  const mug = new THREE.Group();
  mug.position.set(5.6, 0, -0.6);
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
  const mugBody = mesh(new THREE.LatheGeometry(mugProfile, 32), toon("#3b82f6"), { outline: 0.05 });
  const coffee = mesh(new THREE.CylinderGeometry(0.405, 0.405, 0.02, 32), toon("#5b3a1e"), { outline: 0, cast: false });
  coffee.position.y = 0.93;
  const crema = mesh(new THREE.TorusGeometry(0.3, 0.03, 6, 32), toon("#c8925a"), { outline: 0, cast: false });
  crema.rotation.x = Math.PI / 2;
  crema.position.y = 0.945;
  const handle = mesh(new THREE.TorusGeometry(0.28, 0.08, 10, 20, Math.PI), toon("#3b82f6"), { outline: 0.04 });
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
  mug.add(mugBody, coffee, crema, handle);

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
  const bubbleTex = canvasTexture(760, 400);
  track(bubbleTex.texture);
  const bubble = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: bubbleTex.texture, depthTest: false, transparent: true })));
  // Move back as well as up: the high camera angle compresses vertical separation.
  bubble.position.set(mug.position.x - 0.45, 2.0, mug.position.z - 1.3);
  bubble.scale.set(0.001, 0.001, 1);
  bubble.renderOrder = 10;
  bubble.raycast = noRaycast;
  scene.add(bubble);
  let lastQuote = -1;
  let bubbleTimer = null;
  function say(quote) {
    drawQuoteBubble(bubbleTex.ctx, 760, 400, quote);
    bubbleTex.texture.needsUpdate = true;
    gsap.fromTo(bubble.scale, { x: 0.3, y: 0.15 }, { x: 1.9, y: 1.0, duration: 0.4, ease: "back.out(2)" });
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => gsap.to(bubble.scale, { x: 0.001, y: 0.001, duration: 0.25, ease: "power2.in" }), 4200);
  }
  function sip() {
    if (sipping || sipsLeft === 0) return;
    sipping = true;
    // Lift and tip the rim toward you, then put it back down
    gsap
      .timeline({ onComplete: () => (sipping = false) })
      .to(mug.position, { y: 0.7, duration: 0.3, ease: "power2.out" })
      .to(mug.rotation, { x: 0.55, duration: 0.3, ease: "power2.out" }, 0)
      .to(mug.rotation, { x: 0, duration: 0.3, ease: "power2.inOut" }, 0.95)
      .to(mug.position, { y: 0, duration: 0.35, ease: "bounce.out" }, 1.0);
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
  });

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
  // The real photo for the badge and the scrapbook (initials stand in until it arrives)
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
    ambient.intensity = isDark ? 0.8 : 1.15;
    sun.color.set(isDark ? "#aabfff" : "#fff1cc");
    sun.intensity = isDark ? 0.65 : 1.8;
    windowLight.color.set(isDark ? "#94b5ff" : "#ffe5ad");
    windowLight.intensity = isDark ? 16 : 110;
    floorMat.color.set(isDark ? "#39344f" : "#f5c76b");
    backWallMat.color.set(isDark ? "#34304b" : "#fff0c9");
    scene.background = new THREE.Color(isDark ? "#34304b" : "#fff0c9");
    sideWallMat.color.set(isDark ? "#59406f" : "#ff90e8");
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

  const pick = (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, true)[0];
    return hit ? { hit, entry: entryFor(hit.object) } : null;
  };
  const setHover = (entry) => {
    if (hovered?.object === entry?.object) return;
    hovered?.onHover?.(false);
    hovered = entry;
    hovered?.onHover?.(true);
    renderer.domElement.style.cursor = entry ? "pointer" : "default";
    onEvent("hover", { name: entry?.focus || null });
  };
  const onPointerMove = (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    parallax.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    parallax.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    if (e.pointerType === "mouse") {
      setHover(pick(e)?.entry || null);
      mouseAim.x = PAD.x + parallax.tx * 0.6;
      mouseAim.z = PAD.z + parallax.ty * 0.45;
    }
  };
  const onPointerDown = (e) => {
    downAt = { x: e.clientX, y: e.clientY };
    if (e.pointerType === "mouse") pressMouse();
  };
  const onPointerUp = (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) return;
    downAt = null;
    const result = pick(e);
    if (result?.entry) handleClick(result.entry, result.hit);
    else back();
  };
  const onPointerLeave = () => {
    setHover(null);
    parallax.tx = parallax.ty = 0;
  };
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointerleave", onPointerLeave);

  // ---------- camera shots ----------
  // Each prop has a shot: where the camera looks from, and the box (world units) it must
  // fit. Clicking a prop flies the camera there; clicking it again while in its shot does
  // its thing. Empty space or Esc goes back out to the overview.
  const focus = { name: "overview" };
  const screenNormal = new THREE.Vector3();
  const screenPos = new THREE.Vector3();
  const SHOTS = {
    // The camera sits inside the room, with no cutaway edges or outside backdrop.
    overview: () => ({ target: [0, 1.0, 0.7], dir: [0.48, 0.72, 1] }),
    hero: () => ({ target: [-2.8, 1.95, -2.4], dir: [0.06, 0.14, 1], fit: [1.9, 2.7] }),
    // The open spread: both pages either side of the spine
    about: () => ({ target: [-5.05, 0.15, -1.9], dir: [0.02, 1, 0.3], fit: [4.0, 2.7] }),
    // The fan, or square on the pass being held up
    experience: () => {
      if (!heldTicket) return { target: [-4.25, 0, 2.85], dir: [0.06, 1, 0.5], fit: [3.4, 3.0] };
      tickets.localToWorld(screenPos.set(HOLD.x, HOLD.y, HOLD.z));
      return { target: screenPos.toArray(), dir: [0, 1, 0.5], fit: [4.1, 1.9] };
    },
    // The dealt grid, or close on the open folder (its cover lies open to the left)
    projects: () => {
      if (!openFolder) return { target: [0.3, 0, 3.15], dir: [0.05, 1, 0.55], fit: [4.3, 2.7] };
      // Centre on the spine: the open cover lies to its left, the sheets to its right
      openFolder.f.localToWorld(screenPos.set(-FOLDER_W / 2, 0, 0));
      return { target: [screenPos.x, 0.4, screenPos.z], dir: [0.03, 1, 0.35], fit: [2.6, 1.1] };
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
      mail.localToWorld(screenPos.set(POSTCARD_OUT.x, POSTCARD_OUT.y, POSTCARD_OUT.z));
      return { target: screenPos.toArray(), dir: [0.02, 1, 0.25], fit: [2.3, 1.55] };
    },
    monitor: () => ({ target: [-0.2, 2.4, -2.6], dir: [0.1, 0.32, 1], fit: [5.2, 3.4] }),
    keyboard: () => ({ target: [0.2, 0.3, 0.75], dir: [0.1, 1, 0.75], fit: [5.4, 2.6] }),
    // A higher angle pushes the plant above the frame and leaves room for the sip quote.
    mug: () => ({ target: [5.3, 0.95, -1.05], dir: [-0.2, 1, 0.45], fit: [3.1, 4.1] }),
  };
  const cam = { tx: 0, ty: 0, tz: 0, dx: 0, dy: 1, dz: 1, zoom: 1 };

  function applyShot(instant = false, duration = 0.9) {
    const shot = SHOTS[focus.name]();
    const d = new THREE.Vector3(...shot.dir).normalize();
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    const viewW = viewH * (w / h);
    const zoom = shot.fit ? Math.min(viewW / shot.fit[0], viewH / shot.fit[1]) : 1;
    const to = { tx: shot.target[0], ty: shot.target[1], tz: shot.target[2], dx: d.x, dy: d.y, dz: d.z, zoom };
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
  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    const aspect = w / h;
    // Keep desk props large enough to tap while the room fills the rest of the screen.
    viewH = Math.max(VIEW_H, (aspect < 1 ? 18 : VIEW_W) / aspect);
    camera.left = (-viewH * aspect) / 2;
    camera.right = (viewH * aspect) / 2;
    camera.top = viewH / 2;
    camera.bottom = -viewH / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (!intro?.isActive()) applyShot(true);
  }

  // HUD tags that follow their prop on screen (DOM elements owned by the page)
  const LABEL_ANCHORS = {
    hero: new THREE.Vector3(-2.8, 3.25, -2.42),
    about: new THREE.Vector3(-4.15, 0.35, -3.1),
    experience: new THREE.Vector3(-4.4, 0.3, 1.65),
    projects: new THREE.Vector3(0.3, 0.4, 2.3),
    chat: new THREE.Vector3(3.3, 2.25, -2.3),
    contact: new THREE.Vector3(4.6, 0.3, 2.4),
    monitor: new THREE.Vector3(0.9, 4.05, -2.75),
  };
  const projected = new THREE.Vector3();
  function placeLabels() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    for (const [name, el] of Object.entries(labels)) {
      const anchor = LABEL_ANCHORS[name];
      if (!el || !anchor) continue;
      projected.copy(anchor).project(camera);
      el.style.transform = `translate(${((projected.x + 1) / 2) * w}px, ${((1 - projected.y) / 2) * h}px) translate(-50%, -100%)`;
    }
  }

  let frame = null;
  let lastBlink = 0;
  const WORLD_UP = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const target = new THREE.Vector3();
  function tick(now) {
    frame = requestAnimationFrame(tick);
    parallax.x += (parallax.tx - parallax.x) * 0.06;
    parallax.y += (parallax.ty - parallax.y) * 0.06;
    // Parallax shrinks as we zoom in so close-ups stay readable
    const sway = 1 / Math.sqrt(cam.zoom);
    dir.set(cam.dx + parallax.x * 0.08 * sway, cam.dy - parallax.y * 0.05 * sway, cam.dz).normalize();
    target.set(cam.tx, cam.ty, cam.tz);
    camera.position.copy(target).addScaledVector(dir, 40);
    camera.up.copy(WORLD_UP);
    camera.lookAt(target);
    if (camera.zoom !== cam.zoom) {
      camera.zoom = cam.zoom;
      camera.updateProjectionMatrix();
    }
    badgePivot.rotation.z = Math.sin(now / 900) * 0.03;
    plant.rotation.z = Math.sin(now / 1400) * 0.015;
    mouse.position.x += (mouseAim.x - mouse.position.x) * 0.18;
    mouse.position.z += (mouseAim.z - mouse.position.z) * 0.18;
    if (now - lastBlink > 530) {
      lastBlink = now;
      cursorOn = !cursorOn;
      caretOn = !caretOn;
      if (!termBusy) redrawTerminal();
      typing?.redraw();
    }
    if (chatDirty) {
      chatDirty = false;
      redrawChat();
    }
    renderer.render(scene, camera);
    placeLabels();
  }

  // Intro, like a game's start screen: open on the ID badge, then pull back to the desk
  let intro = null;
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  focus.name = "hero";
  applyShot(true);
  focus.name = "overview";
  swing(0.3);
  intro = gsap.delayedCall(0.9, () => {
    applyShot(false, 1.8);
    sfx.whoosh({ duration: 1.2, up: false });
  });
  frame = requestAnimationFrame(tick);

  return {
    setTheme,
    back,
    focusOn: (name) => SHOTS[name] && setFocus(name),
    runCommand: (cmd) =>
      focus.name === "monitor" ? autotype(cmd) : (setFocus("monitor"), timers.push(setTimeout(() => autotype(cmd), 700))),

    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      clearTimeout(arriveTimer);
      clearTimeout(bubbleTimer);
      clearInterval(clockTimer);
      clearInterval(buzzTimer);
      intro.kill();
      gsap.killTweensOf(cam);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      typer.removeEventListener("input", onTyperInput);
      typer.removeEventListener("keydown", onTyperKey);
      typer.remove();
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      scene.traverse((o) => gsap.killTweensOf([o.position, o.rotation, o.scale]));
      keys.dispose();
      keyHull.dispose();
      disposables.forEach((d) => d.dispose?.());
      sun.shadow.dispose();
      windowLight.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
