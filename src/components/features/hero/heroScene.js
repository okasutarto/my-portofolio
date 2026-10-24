// Three.js layer behind the hero: toon shapes that float, spin, and get
// pushed around by the cursor, then spring back to their spot.
import * as THREE from "three";

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
const LIGHT_PALETTE = [0xffdd00, 0x00e0c6, 0xd946ef, 0x3b82f6, 0xffffff];
const DARK_PALETTE = [0xff7a1a, 0x8fd694, 0xf4ead5, 0xe8b04a, 0xc2562a];
const MOBILE_WIDTH = 1024;

function starGeometry(points = 4, outer = 1, inner = 0.42) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    if (i) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ExtrudeGeometry(shape, { depth: 0.45, bevelEnabled: false }).center();
}

const GEOMETRIES = [
  () => new THREE.BoxGeometry(1, 1, 1),
  () => new THREE.IcosahedronGeometry(0.62, 0),
  () => new THREE.TorusGeometry(0.5, 0.2, 10, 24),
  () => starGeometry(),
  () => new THREE.OctahedronGeometry(0.7, 0),
  () => new THREE.CylinderGeometry(0.45, 0.45, 0.9, 6),
];

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
  const materials = SPOTS.map(() => new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap }));
  const geometries = SPOTS.map((_, i) => GEOMETRIES[i % GEOMETRIES.length]());

  const applyTheme = () => {
    const dark = document.documentElement.classList.contains("dark");
    const palette = dark ? DARK_PALETTE : LIGHT_PALETTE;
    materials.forEach((m, i) => m.color.set(palette[i % palette.length]));
    outlineMat.color.set(dark ? 0x0d0b09 : 0x000000);
  };
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
      .map(({ spot: [fx, fy, size], i }) => {
        const mesh = new THREE.Mesh(geometries[i], materials[i]);
        const outline = new THREE.Mesh(geometries[i], outlineMat);
        outline.scale.setScalar(1.12);
        mesh.add(outline);
        scene.add(mesh);
        const s = mobile ? size * 0.7 : size;
        return { mesh, size: s, rx: fx * w, ry: fy * h, x: fx * w, y: fy * h, vx: 0, vy: 0, spin: 0.3 + (i % 4) * 0.15, order: i };
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
      b.mesh.position.set(b.x, -b.y, 0);
      b.mesh.rotation.x = b.vy * 0.02 + (reducedMotion ? 0.4 : Math.sin(elapsed * b.spin) * 0.4);
      b.mesh.rotation.y = b.vx * 0.02 + (reducedMotion ? 0.6 : elapsed * b.spin);
      b.mesh.rotation.z = -b.vx * 0.01;
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
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      outlineMat.dispose();
      gradientMap.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
