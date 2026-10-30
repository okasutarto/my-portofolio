import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { createSceneMeshes } from "../sceneMeshes";
import { createPaperFlex } from "../paperFlex";
import { PALETTES, perfParams, benchmark, lowPower } from "../sceneConfig";

export function createCore(runtime) {
  // Local preview links hold a part of the day, or a level of rain, whatever the visitor's clock
  // and weather say. `previewRain` is null when the link doesn't set one.
  const previewTime = process.env.NODE_ENV === "development" ? perfParams.get("time") : null;
  if (["morning", "day", "evening", "night"].includes(previewTime)) runtime.options.dark = previewTime === "night";
  const rainParam = process.env.NODE_ENV === "development" ? perfParams.get("rain") : null;
  const previewRain = rainParam === null ? null : THREE.MathUtils.clamp(Number(rainParam) || 0, 0, 1);
  let responsiveUntil = 0;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = benchmark !== "no-shadows";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "absolute inset-0 w-full h-full block";
  renderer.domElement.style.touchAction = "none";
  runtime.options.container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);

  // Ambient occlusion: props darken where they meet the desk, the wall and each other. The
  // composer renders into its own multisampled target, since the canvas's antialias no longer
  // applies once a post pass sits in between. It keeps the frame's depth, which the occlusion
  // reads (normals rebuilt from it) instead of drawing the whole room a second time.
  const composer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(1, 1) }),
  );
  composer.addPass(new RenderPass(scene, camera));
  const aoPass = new GTAOPass(scene, camera, 1, 1);
  aoPass.depthRenderMaterial.defines.PERSPECTIVE_CAMERA = 0;
  // Keep shallow wall gaps (sword racks, boards and shelf backs) readable even in diffuse
  // light. More near-contact samples and a narrower denoise preserve thin silhouettes.
  aoPass.updateGtaoMaterial({ radius: 1.6, thickness: 1.4, distanceExponent: 2, scale: 1.8, samples: 12 });
  aoPass.updatePdMaterial({ radius: 2.5, samples: 8, rings: 2 });
  // The occlusion is the costliest pass, and most of the time the room holds still: it's worked
  // out afresh whenever the view or anything in it moves (see the frame loop), a few times a
  // second otherwise (idle motion, the cat's breathing, is slow enough for the shading to trail
  // it by a frame or two), and in between the last result is laid over the frame again
  let aoDue = true;
  const aoSetSize = aoPass.setSize.bind(aoPass);
  // Occlusion is soft, so it's worked out per CSS pixel and blended up onto a Retina frame:
  // a quarter of the work at 2×, where it was the heaviest pass by far
  aoPass.setSize = (width, height) => {
    aoDue = true;
    const density = Math.max(1, renderer.getPixelRatio());
    aoSetSize(Math.ceil(width / density), Math.ceil(height / density));
  };
  const aoRenderFresh = aoPass.render.bind(aoPass);
  aoPass.render = (r, writeBuffer, readBuffer, ...rest) => {
    if (aoDue || benchmark === "no-ao-cache") {
      aoDue = false;
      return aoRenderFresh(r, writeBuffer, readBuffer, ...rest);
    }
    // GTAOPass's own composite (OUTPUT.Default) over the cached, denoised occlusion
    const into = aoPass.renderToScreen ? null : writeBuffer;
    aoPass.copyMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    aoPass.copyMaterial.blending = THREE.NoBlending;
    aoPass.renderPass(r, aoPass.copyMaterial, into);
    aoPass.blendMaterial.uniforms.intensity.value = aoPass.blendIntensity;
    aoPass.blendMaterial.uniforms.tDiffuse.value = aoPass.pdRenderTarget.texture;
    aoPass.renderPass(r, aoPass.blendMaterial, into);
  };
  aoPass.blendIntensity = 0.88;
  // Sprites (the gauntlet stones' halos, bubbles, cards) face the camera without writing depth;
  // drawn into the occlusion's normal buffer they disagree with the depth behind them, and the
  // occlusion speckles round every glow. GTAOPass already leaves points and lines out.
  const aoHideDefaults = aoPass.overrideVisibility.bind(aoPass);
  aoPass.overrideVisibility = () => {
    aoHideDefaults();
    scene.traverse((object) => {
      if (object.isSprite) object.visible = false;
    });
  };
  const useFrameDepth = () => aoPass.setGBuffer(composer.readBuffer.depthTexture);
  useFrameDepth();
  [aoPass.gtaoMaterial, aoPass.pdMaterial].forEach((m) => (m.needsUpdate = true));
  composer.addPass(aoPass);
  // Lights off, for the room waiting behind the loader: everything darkens but the screen
  // (`rect`: its centre and half size in the frame's 0–1 coordinates) and the cool spill from
  // it. `dark` 0 is the room as lit; off unless the room is in standby (see animation).
  const standbyPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      dark: { value: 0 },
      rect: { value: new THREE.Vector4(0.5, 0.5, 0.1, 0.1) },
      aspect: { value: 1 },
    },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float dark;
      uniform vec4 rect;
      uniform float aspect;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        vec2 p = (vUv - rect.xy) * vec2(aspect, 1.0);
        vec2 hs = rect.zw * vec2(aspect, 1.0);
        // how far outside the screen, in screen heights
        float d = length(max(abs(p) - hs, 0.0)) / (2.0 * hs.y);
        // (linear light: what reads as a dark room after the output's sRGB curve is near zero)
        float spill = exp(-d * 4.0);
        vec3 lit = mix(vec3(0.0015, 0.002, 0.004), vec3(0.35, 0.42, 0.75), spill * spill);
        color.rgb *= mix(vec3(1.0), mix(lit, vec3(1.0), step(d, 0.0)), dark);
        gl_FragColor = color;
      }`,
  });
  standbyPass.enabled = false;
  composer.addPass(standbyPass);
  composer.addPass(new OutputPass());
  if (benchmark === "no-ao" || lowPower) aoPass.enabled = false;
  // Count the complete frame, including shadow, postprocessing and overlay draws.
  if (perfParams.has("perf")) renderer.info.autoReset = false;
  let renderMs = 0;
  let drawCalls = 0;
  let triangles = 0;
  let gpuMs = null;
  const gl = renderer.getContext();
  const gpuTimer = perfParams.has("perf") ? gl.getExtension("EXT_disjoint_timer_query_webgl2") : null;
  let gpuQuery = null;
  // Cards, labels and bubbles drawn over everything (no depth test) skip the composer and are
  // laid on top afterwards, so the occlusion never shades them
  const overlays = [];
  const overlaySet = new Set();
  function renderFrame() {
    const started = performance.now();
    if (perfParams.has("perf")) renderer.info.reset();
    if (gpuQuery && gl.getQueryParameter(gpuQuery, gl.QUERY_RESULT_AVAILABLE)) {
      if (!gl.getParameter(gpuTimer.GPU_DISJOINT_EXT)) {
        const elapsed = gl.getQueryParameter(gpuQuery, gl.QUERY_RESULT) / 1e6;
        gpuMs = gpuMs === null ? elapsed : gpuMs + (elapsed - gpuMs) * 0.1;
      }
      gl.deleteQuery(gpuQuery);
      gpuQuery = null;
    }
    const measuring = gpuTimer && !gpuQuery;
    if (measuring) {
      gpuQuery = gl.createQuery();
      gl.beginQuery(gpuTimer.TIME_ELAPSED_EXT, gpuQuery);
    }
    overlays.length = 0;
    overlaySet.clear();
    scene.traverseVisible((o) => {
      if (o.material?.depthTest !== false) return;
      for (let p = o.parent; p; p = p.parent) if (overlaySet.has(p)) return;
      overlaySet.add(o);
      o.traverse((part) => part.layers.enable(1));
      overlays.push(o);
    });
    overlays.forEach((o) => (o.visible = false));
    // the composer's targets swap during a frame; the scene always lands in its read buffer
    useFrameDepth();
    composer.render();
    overlays.forEach((o) => (o.visible = true));
    if (overlays.length) {
      renderer.autoClear = false;
      const layers = camera.layers.mask;
      const background = scene.background;
      camera.layers.set(1);
      scene.background = null;
      renderer.render(scene, camera);
      scene.background = background;
      camera.layers.mask = layers;
      renderer.autoClear = true;
    }
    if (measuring) gl.endQuery(gpuTimer.TIME_ELAPSED_EXT);
    renderMs += (performance.now() - started - renderMs) * 0.1;
    drawCalls += (renderer.info.render.calls - drawCalls) * 0.1;
    triangles += (renderer.info.render.triangles - triangles) * 0.1;
  }

  // Daylight enters from the upper panes of the left window, across the desk.
  const roomLight = { night: runtime.options.dark ? 1 : 0 };
  const ambient = new THREE.AmbientLight(0xffffff, 1.15);
  scene.add(ambient);
  // Broad sky/floor bounce keeps the whole daytime room bright, beyond the window patch.
  const skyFill = new THREE.HemisphereLight(0xfffaf0, 0xd9c7aa, 1.45);
  scene.add(skyFill);
  // Soft front fill reveals bevels without adding another directional shadow.
  const readabilityFill = new THREE.DirectionalLight(0xdde4ff, 0);
  readabilityFill.position.set(-4, 6, 8);
  scene.add(readabilityFill);
  const sun = new THREE.DirectionalLight(0xfff1cc, 1.8);
  // Broad sky/room bounce from the open front-left side gives all props a soft cast shadow.
  // Its direction stays stable while the direct sunlight moves through the window.
  sun.position.set(-7, 12, 8);
  sun.target.position.set(1, -0.5, -2.5);
  sun.castShadow = true;
  const SUN_MAP = lowPower ? 1024 : 2048;
  sun.shadow.mapSize.set(SUN_MAP, SUN_MAP);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 60 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  // (in texels, so a smaller map keeps the same penumbra with a smaller radius)
  sun.shadow.radius = 14 * SUN_MAP / 2048;
  scene.add(sun, sun.target);
  // Square, so texels stay square and the blur round; see fitSunShadow
  const SUN_SPAN = 40;
  const SUN_BLUR = sun.shadow.radius * SUN_SPAN;
  const sunCasters = new THREE.Box3();
  const sunCorner = new THREE.Vector3();
  const sunFootprint = new THREE.Box3();
  function fitSunShadow() {
    if (sunCasters.isEmpty()) return;
    const cam = sun.shadow.camera;
    cam.position.copy(sun.position);
    cam.lookAt(sun.target.position);
    cam.updateMatrixWorld();
    sunFootprint.makeEmpty();
    for (let i = 0; i < 8; i++) {
      sunCorner.set(i & 1 ? sunCasters.max.x : sunCasters.min.x, i & 2 ? sunCasters.max.y : sunCasters.min.y, i & 4 ? sunCasters.max.z : sunCasters.min.z);
      sunFootprint.expandByPoint(sunCorner.applyMatrix4(cam.matrixWorldInverse));
    }
    const half = Math.min(SUN_SPAN, Math.max(sunFootprint.max.x - sunFootprint.min.x, sunFootprint.max.y - sunFootprint.min.y) + 1) / 2;
    const cx = (sunFootprint.min.x + sunFootprint.max.x) / 2;
    const cy = (sunFootprint.min.y + sunFootprint.max.y) / 2;
    Object.assign(cam, { left: cx - half, right: cx + half, bottom: cy - half, top: cy + half });
    cam.updateProjectionMatrix();
    // the same penumbra in world units, now drawn from finer texels
    sun.shadow.radius = SUN_BLUR / (half * 2);
    sun.shadow.needsUpdate = true;
  }

  const timers = [];
  let destroyed = false;

  const {
    disposables, track, gradient, toon, outlineResolution, outlineMat, hullGeometry, noRaycast, mesh, UP, rbox, rod,
    roundedRectShape, phoneSlab, at, printMaterial, redrawers, printed, bubbleTimers, speechBubble,
  } = createSceneMeshes(scene);
  const { bendable, paperFlex, updatePaperFlex, flexTo, flexSettle } = createPaperFlex(track);
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

  // Public state used by the other scene parts.
  return {
    toon,
    track,
    mesh,
    rod,
    rbox,
    scene,
    printed,
    noRaycast,
    previewRain,
    previewTime,
    at,
    hullGeometry,
    outlineMat,
    get destroyed() { return destroyed; },
    set destroyed(value) { destroyed = value; },
    timers,
    register,
    UP,
    roomLight,
    printMaterial,
    camera,
    aoPass,
    ambient,
    skyFill,
    phoneSlab,
    speechBubble,
    interactive,
    gradient,
    roundedRectShape,
    renderer,
    get responsiveUntil() { return responsiveUntil; },
    set responsiveUntil(value) { responsiveUntil = value; },
    byFocus,
    shadowFill,
    bendable,
    paperFlex,
    flexSettle,
    flexTo,
    redrawers,
    readabilityFill,
    sun,
    fitSunShadow,
    pickables,
    entryFor,
    outlineResolution,
    composer,
    get drawCalls() { return drawCalls; },
    get triangles() { return triangles; },
    get renderMs() { return renderMs; },
    get gpuMs() { return gpuMs; },
    sunCasters,
    get aoDue() { return aoDue; },
    set aoDue(value) { aoDue = value; },
    updatePaperFlex,
    renderFrame,
    standbyPass,
    bubbleTimers,
    disposables,
    get gpuQuery() { return gpuQuery; },
    gl,
  };
}
