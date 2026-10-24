// Three.js scene for the Projects showcase: a neo-brutalist phone that spins once
// per project as the user scrolls, with cubes orbiting behind it.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { drawScreen, SCREEN_W, SCREEN_H } from "./screens";

// Portrait phone
const W = 1.62;
const H = 3.36;
const D = 0.16;
const R = 0.22;
const SW = W - 0.14;
const SH = SW * (SCREEN_H / SCREEN_W);

// Cubes orbit all the way around the phone, in front and behind. The spinning phone
// sweeps a cylinder of radius ~0.9 (~1.2 at its ends when tilted, ~1.4 for the offset
// shadow), so the orbit ellipse keeps every cube at least ORBIT_RZ from the phone's axis.
const ORBIT_RZ = 2.0;

const STACKED_QUERY = "(max-width: 767px)";

export function createPhoneScene({ container, projects, colorFor }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  // 1.5x is visually indistinguishable here and much lighter on retina GPUs
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "absolute inset-0 w-full h-full block";
  renderer.domElement.style.touchAction = "pan-y";
  renderer.domElement.style.cursor = "grab";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 6);
  scene.add(key);

  // pivot = user drag + mouse tilt, phone = scroll spin
  const pivot = new THREE.Group();
  const phone = new THREE.Group();
  pivot.add(phone);
  scene.add(pivot);

  let destroyed = false;
  let frame = null;
  const disposables = [];
  const track = (o) => (disposables.push(o), o);

  const bodyGeo = track(new RoundedBoxGeometry(W, H, D, 6, R));
  const bodyMat = track(new THREE.MeshToonMaterial({ color: colorFor(projects[0]) }));
  phone.add(new THREE.Mesh(bodyGeo, bodyMat));

  // Thick black outline (inverted hull)
  const outline = new THREE.Mesh(
    bodyGeo,
    track(new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })),
  );
  outline.scale.set(1.06, 1.03, 1.35);
  phone.add(outline);

  // Hard offset shadow: stays behind the phone (doesn't spin), its width follows the silhouette
  const shadowMat = track(new THREE.MeshBasicMaterial({ color: 0x000000 }));
  const shadow = new THREE.Mesh(track(new RoundedBoxGeometry(W, H, 0.02, 6, R)), shadowMat);
  shadow.position.set(0.2, -0.2, -0.5);
  pivot.add(shadow);

  // Screen
  const bezel = new THREE.Mesh(
    track(new THREE.PlaneGeometry(SW + 0.06, SH + 0.06)),
    track(new THREE.MeshBasicMaterial({ color: 0x000000 })),
  );
  bezel.position.z = D / 2 + 0.001;
  phone.add(bezel);
  const screenMat = track(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const screen = new THREE.Mesh(track(new THREE.PlaneGeometry(SW, SH)), screenMat);
  screen.position.z = D / 2 + 0.002;
  phone.add(screen);

  // Back panel with logo sticker
  const backCanvas = document.createElement("canvas");
  backCanvas.width = 500;
  backCanvas.height = 1036;
  const backTex = track(new THREE.CanvasTexture(backCanvas));
  backTex.colorSpace = THREE.SRGBColorSpace;
  const drawBack = (color) => {
    const c = backCanvas.getContext("2d");
    const bw = backCanvas.width;
    const bh = backCanvas.height;
    c.fillStyle = color;
    c.fillRect(0, 0, bw, bh);
    c.fillStyle = "rgba(0,0,0,.18)";
    for (let x = 0; x < bw; x += 48) c.fillRect(x, 0, 2, bh);
    for (let y = 0; y < bh; y += 48) c.fillRect(0, y, bw, 2);
    c.fillStyle = "#000";
    c.fillRect(96, 494, 336, 132);
    c.fillStyle = "#00e0c6";
    c.fillRect(82, 480, 336, 132);
    c.strokeStyle = "#000";
    c.lineWidth = 8;
    c.strokeRect(82, 480, 336, 132);
    c.fillStyle = "#000";
    c.font = "800 66px 'Lexend Mega', sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("okasp", 250, 548);
    // camera module
    c.fillRect(44, 44, 170, 170);
    c.fillStyle = "#fff";
    c.fillRect(32, 32, 170, 170);
    c.strokeRect(32, 32, 170, 170);
    c.fillStyle = "#111";
    c.beginPath();
    c.arc(84, 84, 32, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(150, 150, 32, 0, Math.PI * 2);
    c.fill();
    backTex.needsUpdate = true;
  };
  const back = new THREE.Mesh(
    track(new THREE.PlaneGeometry(W - 0.12, H - 0.12)),
    track(new THREE.MeshBasicMaterial({ map: backTex })),
  );
  back.rotation.y = Math.PI;
  back.position.z = -D / 2 - 0.002;
  phone.add(back);

  // Floating cubes
  const blocks = [];
  const blockGeo = track(new THREE.BoxGeometry(0.22, 0.22, 0.22));
  const outlineMat = track(new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }));
  [0xffdd00, 0x00e0c6, 0xd946ef, 0x3b82f6, 0xffffff, 0xffdd00, 0x00e0c6, 0xd946ef, 0x3b82f6].forEach(
    (color, i) => {
      const m = new THREE.Mesh(blockGeo, track(new THREE.MeshToonMaterial({ color })));
      const o = new THREE.Mesh(blockGeo, outlineMat);
      o.scale.setScalar(1.18);
      m.add(o);
      m.userData = {
        a: (i / 9) * Math.PI * 2,
        rx: 2.0 + (i % 3) * 0.25,
        y: (i % 2 ? 1 : -1) * (0.3 + (i % 4) * 0.35),
        s: 0.3 + (i % 5) * 0.08,
      };
      scene.add(m);
      blocks.push(m);
    },
  );

  // Screen textures, one canvas per project
  const textures = projects.map((project) => {
    const canvas = document.createElement("canvas");
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;
    const tex = track(new THREE.CanvasTexture(canvas));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.userData.draw = () => {
      drawScreen(canvas.getContext("2d"), project);
      tex.needsUpdate = true;
    };
    tex.userData.draw();
    return tex;
  });

  // Upload textures and compile shaders up front instead of on the first visible frame
  textures.forEach((t) => renderer.initTexture(t));

  let shown = -1;
  const showTexture = (i) => {
    if (i === shown) return;
    shown = i;
    screenMat.map = textures[i];
    screenMat.needsUpdate = true;
    const color = colorFor(projects[i]);
    bodyMat.color.set(color);
    drawBack(color);
  };
  showTexture(0);

  // Redraw canvases once the brand fonts are ready
  document.fonts?.ready.then(() => {
    if (destroyed) return;
    textures.forEach((t) => t.userData.draw());
    drawBack(colorFor(projects[shown]));
  });

  // ---------- Interaction ----------
  let progress = 0;
  let dragging = false;
  let lastX = 0;
  let dragVel = 0;
  let dragRot = 0;
  const mouse = { x: 0, y: 0 };

  const onPointerDown = (e) => {
    dragging = true;
    lastX = e.clientX;
    renderer.domElement.style.cursor = "grabbing";
  };
  const onPointerUp = () => {
    dragging = false;
    renderer.domElement.style.cursor = "grab";
  };
  const onPointerMove = (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    if (!dragging) return;
    dragVel = (e.clientX - lastX) * 0.012;
    lastX = e.clientX;
    dragRot += dragVel;
  };
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const stacked = window.matchMedia(STACKED_QUERY).matches;
    // Phone sits in the right column on desktop, in the top area when stacked
    camera.position.set(0, 0, stacked ? 15.5 : 8.4);
    if (stacked) camera.setViewOffset(w, h, 0, h * 0.14, w, h);
    else camera.setViewOffset(w, h, -w * 0.18, -h * 0.04, w, h);
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  renderer.compile(scene, camera);

  // ---------- Loop ----------
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = new THREE.Clock();
  let smooth = 0;

  const tick = () => {
    const t = clock.getElapsedTime();
    smooth += (progress - smooth) * 0.12;

    // One full spin per project; the texture swaps while the back faces the camera
    phone.rotation.y = reduced ? 0 : smooth * Math.PI * 2;
    showTexture(Math.min(projects.length - 1, Math.max(0, Math.round(smooth))));

    if (!dragging) {
      dragVel *= 0.92;
      dragRot += dragVel;
      dragRot *= 0.94;
    }
    pivot.rotation.y = dragRot + mouse.x * 0.25;
    pivot.rotation.x = mouse.y * 0.15 + Math.sin(t * 0.8) * 0.04;
    pivot.position.y = Math.sin(t * 1.2) * 0.06;

    // Squash a little mid-spin for a cartoony feel
    const mid = Math.abs(Math.sin(smooth * Math.PI));
    phone.scale.set(1 - mid * 0.08, 1 + mid * 0.05, 1);
    const silhouette =
      Math.abs(Math.cos(phone.rotation.y)) * (W - 0.1) + Math.abs(Math.sin(phone.rotation.y)) * D;
    shadow.scale.set((silhouette / W) * phone.scale.x * 1.03, phone.scale.y * 1.05, 1);
    shadowMat.color.set(document.documentElement.classList.contains("dark") ? 0x8fd694 : 0x000000);

    blocks.forEach((b) => {
      const d = b.userData;
      const a = d.a + t * d.s * 0.4 + smooth * 0.6;
      b.position.set(
        Math.cos(a) * d.rx,
        d.y + Math.sin(t * d.s * 2 + d.a) * 0.15,
        Math.sin(a) * ORBIT_RZ,
      );
      b.rotation.x = t * d.s;
      b.rotation.y = t * d.s * 1.3;
    });

    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };

  return {
    // p: 0..(projects.length - 1)
    setProgress(p) {
      progress = p;
    },
    start() {
      if (frame === null && !destroyed) {
        clock.getDelta();
        frame = requestAnimationFrame(tick);
      }
    },
    stop() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    },
    destroy() {
      destroyed = true;
      this.stop();
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      disposables.forEach((o) => o.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
