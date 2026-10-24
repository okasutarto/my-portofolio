// Three.js layer behind the hero: developer-themed objects (keycaps with code
// symbols, a cursor, a bolt, a gear) that float, wobble, and get pushed around by
// the cursor, then spring back to their spot.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// Spots as fractions of the hero box, kept around the edges and the gap between columns
const SPOTS = [
  [0.018, 0.3, 46],
  [0.47, 0.08, 46],
  [0.93, 0.1, 60],
  [0.56, 0.5, 40],
  [0.97, 0.55, 50],
  [0.018, 0.75, 52],
  [0.42, 0.95, 44],
  [0.88, 0.92, 58],
  [0.3, 0.035, 34],
  [0.7, 0.04, 38],
];
// One item per spot: a keycap with a label, or an extruded icon
const ITEMS = [
  { key: "{ }", tone: 0 },
  { icon: "cursor", tone: 0 },
  { key: "</>", tone: 1 },
  { icon: "bolt", tone: 2 },
  { key: "ESC", tone: 3 },
  { key: "⌘", tone: 2 },
  { icon: "gear", tone: 3 },
  { key: ";", tone: 4 },
  { key: "↵", tone: 1 },
  { key: "$_", tone: 0 },
];
// [cap colour, label colour] per tone
const LIGHT_TONES = [
  ["#ffffff", "#111111"],
  ["#111111", "#ffdd00"],
  ["#ffdd00", "#111111"],
  ["#00e0c6", "#111111"],
  ["#3b82f6", "#ffffff"],
];
const DARK_TONES = [
  ["#f4ead5", "#1a1714"],
  ["#2b251f", "#ff7a1a"],
  ["#ff7a1a", "#1a1714"],
  ["#8fd694", "#1a1714"],
  ["#c2562a", "#f4ead5"],
];
const MOBILE_WIDTH = 1024;

function shapeFrom(points) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  return shape;
}

function iconGeometry(icon) {
  let shape;
  if (icon === "cursor") {
    shape = shapeFrom([[0, 0], [0, -1], [0.27, -0.74], [0.45, -1.1], [0.62, -1.02], [0.44, -0.67], [0.8, -0.67]]);
  } else if (icon === "bolt") {
    shape = shapeFrom([[0.2, 1], [-0.45, -0.08], [0.02, -0.08], [-0.15, -1], [0.5, 0.12], [0.03, 0.12]]);
  } else {
    // gear: 8 teeth around a ring with a hole
    const pts = [];
    const teeth = 8;
    for (let i = 0; i < teeth * 4; i++) {
      const a = (i / (teeth * 4)) * Math.PI * 2;
      const r = i % 4 < 2 ? 0.72 : 0.54;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    shape = shapeFrom(pts);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.22, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: false });
  geo.center();
  geo.computeBoundingBox();
  const size = geo.boundingBox.getSize(new THREE.Vector3());
  const k = 1.15 / Math.max(size.x, size.y);
  geo.scale(k, k, k);
  return geo;
}

// Keycap face: a slightly dished cap with the label in the brand font
function drawKeycap(canvas, label, [cap, ink]) {
  const c = canvas.getContext("2d");
  const s = canvas.width;
  c.fillStyle = cap;
  c.fillRect(0, 0, s, s);
  c.fillStyle = "rgba(0,0,0,0.12)";
  c.beginPath();
  c.roundRect(s * 0.1, s * 0.1, s * 0.8, s * 0.8, s * 0.1);
  c.fill();
  c.fillStyle = cap;
  c.beginPath();
  c.roundRect(s * 0.12, s * 0.1, s * 0.76, s * 0.76, s * 0.09);
  c.fill();
  const size = label.length <= 1 ? 0.46 : label.length === 2 ? 0.34 : 0.27;
  c.font = `800 ${Math.round(s * size)}px 'Lexend Mega', sans-serif`;
  c.fillStyle = ink;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(label, s / 2, s * 0.49);
}

export function createHeroScene({ container, hero, reducedMotion }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "absolute inset-0 w-full h-full block";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // Orthographic camera in CSS pixels: world (x, -y) == hero-local (x, y)
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -2000, 2000);
  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(-300, 500, 800);
  scene.add(sun);

  // Toon shading with three hard bands
  const gradientMap = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
  gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
  const keycapGeo = new RoundedBoxGeometry(1, 1, 0.55, 4, 0.14);
  const disposables = [keycapGeo];

  // Per item: geometry, a side material, and (keycaps) a face material with a canvas label
  const items = ITEMS.map((item) => {
    const side = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap });
    disposables.push(side);
    if (!item.key) {
      const geo = iconGeometry(item.icon);
      disposables.push(geo);
      return { ...item, geo, side, material: side };
    }
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.MeshToonMaterial({ map, gradientMap });
    disposables.push(map, face);
    // RoundedBoxGeometry keeps BoxGeometry's face groups: index 4 is the +z face (toward us)
    return { ...item, geo: keycapGeo, side, canvas, map, material: [side, side, side, side, face, side] };
  });

  const applyTheme = () => {
    const dark = document.documentElement.classList.contains("dark");
    const tones = dark ? DARK_TONES : LIGHT_TONES;
    items.forEach((item) => {
      const tone = tones[item.tone];
      item.side.color.set(tone[0]);
      if (item.canvas) {
        drawKeycap(item.canvas, item.key, tone);
        item.map.needsUpdate = true;
      }
    });
    outlineMat.color.set(dark ? 0x0d0b09 : 0x000000);
  };
  // Labels use the brand font; redraw once it's ready
  document.fonts?.ready.then(() => applyTheme());
  const themeObserver = new MutationObserver(applyTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  // Spring bodies: rest at (rx, ry), pushed by the cursor, wobble back
  let bodies = [];
  const build = (w, h) => {
    bodies.forEach((b) => scene.remove(b.mesh));
    const mobile = w < MOBILE_WIDTH;
    // On narrow screens content is centered, so only keep spots hugging the edges
    bodies = SPOTS.map((spot, i) => ({ spot, i }))
      .filter(({ spot: [fx] }) => !mobile || fx < 0.05 || fx > 0.9)
      .map(({ spot: [spotX, fy, size], i }) => {
        // Spots are laid out for "content left, portrait right"; the desktop hero is
        // mirrored (portrait left), so mirror them too to keep objects off the text
        const fx = mobile ? spotX : 1 - spotX;
        const item = items[i];
        const mesh = new THREE.Mesh(item.geo, item.material);
        const outline = new THREE.Mesh(item.geo, outlineMat);
        outline.scale.setScalar(item.key ? 1.08 : 1.12);
        mesh.add(outline);
        scene.add(mesh);
        const s = (mobile ? size * 0.7 : size) * (item.key ? 1.15 : 1);
        return {
          mesh,
          kind: item.icon || "key",
          size: s,
          rx: fx * w,
          ry: fy * h,
          x: fx * w,
          y: fy * h,
          vx: 0,
          vy: 0,
          spin: 0.3 + (i % 4) * 0.15,
          phase: i * 1.7,
          order: i,
        };
      });
    applyTheme();
  };

  let pointer = { x: -9999, y: -9999 };
  const onPointerMove = (e) => {
    pointer = { x: e.clientX, y: e.clientY };
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  const stepBody = (b, t, heroRect) => {
    const dx = b.x - (pointer.x - heroRect.left);
    const dy = b.y - (pointer.y - heroRect.top);
    const d = Math.hypot(dx, dy);
    const reach = b.size + 110;
    if (d < reach && d > 0.01) {
      const f = (1 - d / reach) * 6;
      b.vx += (dx / d) * f;
      b.vy += (dy / d) * f;
    }
    b.vx = (b.vx + (b.rx - b.x) * 0.025) * 0.9;
    b.vy = (b.vy + (b.ry - b.y) * 0.025) * 0.9;
    b.x += b.vx;
    b.y += b.vy;
    // gentle float
    b.ry += Math.sin(t * 0.8 + b.rx) * 0.15;
  };

  let lastSize = "";
  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h || `${w}x${h}` === lastSize) return;
    lastSize = `${w}x${h}`;
    renderer.setSize(w, h, false);
    camera.left = 0;
    camera.right = w;
    camera.top = 0;
    camera.bottom = -h;
    camera.updateProjectionMatrix();
    build(w, h);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  const clock = new THREE.Clock();
  let elapsed = 0;
  let frame = null;
  const tick = () => {
    // Fixed 60Hz physics steps so speed matches on 60/120Hz screens and slow devices
    const steps = Math.min(10, Math.max(1, Math.round(clock.getDelta() * 60)));
    const heroRect = hero.getBoundingClientRect();
    for (let n = 0; n < steps; n++) {
      elapsed += 1 / 60;
      if (!reducedMotion) bodies.forEach((b) => stepBody(b, elapsed, heroRect));
    }
    bodies.forEach((b) => {
      const t = reducedMotion ? 0 : elapsed * b.spin + b.phase;
      b.mesh.position.set(b.x, -b.y, 0);
      if (b.kind === "gear") {
        // gears turn flat-on, like they're driving something
        b.mesh.rotation.set(-0.35 + b.vy * 0.02, 0.3 + b.vx * 0.02, reducedMotion ? 0 : elapsed * b.spin);
      } else {
        // keycaps and icons only wobble so their faces stay readable; tilted to show depth
        b.mesh.rotation.set(
          -0.4 + Math.sin(t) * 0.18 + b.vy * 0.02,
          0.35 + Math.sin(t * 0.8) * 0.35 + b.vx * 0.02,
          Math.sin(t * 0.6) * 0.12 - b.vx * 0.01,
        );
      }
      // pop the shapes in one by one
      const grow = reducedMotion ? 1 : Math.min(1, Math.max(0, (elapsed - 0.2 - b.order * 0.12) * 3));
      b.mesh.scale.setScalar(Math.max(0.001, b.size * (1 - Math.pow(1 - grow, 3))));
    });
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };

  // Only render while the hero is on screen
  const visibility = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && frame === null) {
      clock.getDelta();
      frame = requestAnimationFrame(tick);
    } else if (!entry.isIntersecting && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  });
  visibility.observe(hero);

  return {
    destroy() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      visibility.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      disposables.forEach((d) => d.dispose());
      outlineMat.dispose();
      gradientMap.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
