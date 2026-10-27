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
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import emailjs from "@emailjs/browser";
import { sfx, GROOVE_BEAT, setRainLevel, startScrape } from "@/composables/useSfx";
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
  BUBBLE_TAILS,
  drawStickyNote,
  drawPainting,
  PAINTING_COUNT,
  drawWindowView,
  drawWallPaint,
  drawFur,
  drawSparkStreak,
  drawBlackBolt,
  drawGameSpine,
  drawGameCover,
  drawRepBadge,
  drawBinLabel,
  drawCrumpledPaper,
  drawGlint,
  drawHakiAura,
  drawShout,
  drawEnmaBlade,
  drawEnmaFlower,
  drawWadoBlade,
  drawKitetsuBlade,
  drawTsukaWrap,
  drawSakuraPetal,
  drawSakuraBlossom,
  drawBookSpine,
  drawMangaSpine,
  drawNarutoCover,
  drawInvaders,
  drawPageEdges,
  drawWeatherCard,
  weatherKind,
  drawFamilyPortrait,
  drawSwordCard,
  drawWoodTop,
  drawDeskMat,
  drawClockFace,
  drawGuitarTop,
  drawStraw,
  drawCarbonWeave,
  drawLeatherGrain,
  drawPlantLeaf,
  drawTerracotta,
  drawChairCrest,
  drawWoodFloor,
  drawRug,
  drawDrawerFront,
  SIP_QUOTES,
} from "./textures";
import { createDesktop, SCREEN_W, SCREEN_H } from "./desktop";
import { createLofi, TRACKS } from "./lofi";
import { createToonBatch } from "./toonBatch";

const PALETTES = {
  // The shelf's oak tone, so the desk, the riser, the shelf and the window frame read as one set
  light: { desk: "#f3d3b0", shadow: "#000000" },
  // Night: the same wood, dimmed, so it still reads against the dark page
  dark: { desk: "#bb9998", shadow: "#000000" },
};
// Props that stand for a section of the 2D site
export const SECTIONS = ["hero", "about", "experience", "projects", "contact"];
const perfParams = new URLSearchParams(window.location.search);
const benchmark = perfParams.has("perf") ? perfParams.get("bench") : null;

// Contact-hardening soft shadows (PCSS): crisp where a prop meets the surface, spreading wider
// the further the shadow falls from it. Swapped in for three's fixed-width PCF soft filter, for
// the sun, window and lamp and for the neons' point lights alike; each light's `shadow.radius`
// is its widest blur, in texels.
if (benchmark !== "no-pcss" && !THREE.ShaderChunk.shadowmap_pars_fragment.includes("pcssShadow")) {
  const pcss = `
    // a quick search for what's in the way, then a finer filter sized by how far it is
    #define PCSS_SEARCH 8
    #define PCSS_SAMPLES 12
    // Five taps across the widest blur first: all lit, or all blocked, means this pixel is
    // nowhere near a shadow's edge, and only the edges (a sliver of the screen) pay for the rest
    const vec2 PCSS_PROBES[ 4 ] = vec2[]( vec2( 1.0, 0.0 ), vec2( -1.0, 0.0 ), vec2( 0.0, 1.0 ), vec2( 0.0, -1.0 ) );
    // how far (in shadow-map depth) a shadow must fall before it's fully spread
    #define PCSS_RANGE 0.03
    // A Vogel disk: evenly spread samples, turned per pixel so the banding turns to fine grain
    vec2 pcssDisk( int i, int count, float spin ) {
      float a = spin + float( i ) * 2.39996;
      return vec2( cos( a ), sin( a ) ) * sqrt( ( float( i ) + 0.5 ) / float( count ) );
    }
    float pcssShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowRadius, vec4 coord ) {
      vec2 texel = 1.0 / shadowMapSize;
      float probe = texture2DCompare( shadowMap, coord.xy, coord.z );
      for ( int i = 0; i < 4; i ++ ) probe += texture2DCompare( shadowMap, coord.xy + PCSS_PROBES[ i ] * shadowRadius * texel, coord.z );
      if ( probe == 5.0 ) return 1.0;
      if ( probe == 0.0 ) return 0.0;
      float spin = rand( coord.xy ) * PI2;
      float blockers = 0.0;
      float blockerDepth = 0.0;
      for ( int i = 0; i < PCSS_SEARCH; i ++ ) {
        float d = unpackRGBAToDepth( texture2D( shadowMap, coord.xy + pcssDisk( i, PCSS_SEARCH, spin ) * shadowRadius * texel ) );
        if ( d < coord.z ) { blockers += 1.0; blockerDepth += d; }
      }
      if ( blockers == 0.0 ) return 1.0;
      float spread = smoothstep( 0.0, PCSS_RANGE, coord.z - blockerDepth / blockers );
      float radius = mix( 1.0, shadowRadius, spread );
      float lit = 0.0;
      for ( int i = 0; i < PCSS_SAMPLES; i ++ ) {
        lit += texture2DCompare( shadowMap, coord.xy + pcssDisk( i, PCSS_SAMPLES, spin ) * radius * texel, coord.z );
      }
      return lit / float( PCSS_SAMPLES );
    }
  `;
  // Point lights store linear distance, so the penumbra follows the real PCSS ratio: fully
  // spread once the surface is twice as far from the light as the thing in the way
  const pcssPoint = `
    float pcssPointShadow( sampler2D shadowMap, float texelY, float shadowRadius, vec3 dir, float dp ) {
      vec3 side = normalize( cross( dir, abs( dir.y ) < 0.99 ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 ) ) );
      vec3 up = cross( side, dir );
      float probe = texture2DCompare( shadowMap, cubeToUV( dir, texelY ), dp );
      for ( int i = 0; i < 4; i ++ ) {
        vec2 o = PCSS_PROBES[ i ] * shadowRadius * texelY;
        probe += texture2DCompare( shadowMap, cubeToUV( dir + side * o.x + up * o.y, texelY ), dp );
      }
      if ( probe == 5.0 ) return 1.0;
      if ( probe == 0.0 ) return 0.0;
      float spin = rand( dir.xy + dir.z ) * PI2;
      float blockers = 0.0;
      float blockerDepth = 0.0;
      for ( int i = 0; i < PCSS_SEARCH; i ++ ) {
        vec2 o = pcssDisk( i, PCSS_SEARCH, spin ) * shadowRadius * texelY;
        float d = unpackRGBAToDepth( texture2D( shadowMap, cubeToUV( dir + side * o.x + up * o.y, texelY ) ) );
        if ( d < dp ) { blockers += 1.0; blockerDepth += d; }
      }
      if ( blockers == 0.0 ) return 1.0;
      blockerDepth /= blockers;
      float spread = smoothstep( 0.0, 1.0, ( dp - blockerDepth ) / max( blockerDepth, 1e-3 ) );
      float radius = mix( 1.0, shadowRadius, spread ) * texelY;
      float lit = 0.0;
      for ( int i = 0; i < PCSS_SAMPLES; i ++ ) {
        vec2 o = pcssDisk( i, PCSS_SAMPLES, spin ) * radius;
        lit += texture2DCompare( shadowMap, cubeToUV( dir + side * o.x + up * o.y, texelY ), dp );
      }
      return lit / float( PCSS_SAMPLES );
    }
  `;
  THREE.ShaderChunk.shadowmap_pars_fragment = THREE.ShaderChunk.shadowmap_pars_fragment
    .replace("float getShadow(", `${pcss}\n\tfloat getShadow(`)
    .replace("#elif defined( SHADOWMAP_TYPE_PCF_SOFT )", "#elif defined( SHADOWMAP_TYPE_PCF_SOFT )\n\t\t\treturn pcssShadow( shadowMap, shadowMapSize, shadowRadius, shadowCoord );")
    .replace("float getPointShadow(", `${pcssPoint}\n\tfloat getPointShadow(`)
    .replace(
      "#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )",
      "#if defined( SHADOWMAP_TYPE_PCF_SOFT )\n\t\t\treturn pcssPointShadow( shadowMap, texelSize.y, shadowRadius, bd3D, dp );\n\t\t#elif defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_VSM )",
    );
}

// Smallest area of the scene that always stays in view (world units)
const VIEW_W = 21.5;
const VIEW_H = 14.5;

export function createDeskScene({ container, projects, experiences, dark = false, muted = false, onEvent = () => {} }) {
  let responsiveUntil = 0;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = benchmark !== "no-shadows";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "absolute inset-0 w-full h-full block";
  renderer.domElement.style.touchAction = "none";
  container.appendChild(renderer.domElement);

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
  aoPass.updateGtaoMaterial({ radius: 1.2, thickness: 1, distanceExponent: 1.5, scale: 1.4, samples: 12 });
  aoPass.updatePdMaterial({ radius: 6, samples: 12, rings: 2 });
  const aoSetSize = aoPass.setSize.bind(aoPass);
  aoPass.setSize = (width, height) => aoSetSize(Math.ceil(width / 2), Math.ceil(height / 2));
  aoPass.blendIntensity = 0.85;
  const useFrameDepth = () => aoPass.setGBuffer(composer.readBuffer.depthTexture);
  useFrameDepth();
  [aoPass.gtaoMaterial, aoPass.pdMaterial].forEach((m) => (m.needsUpdate = true));
  composer.addPass(aoPass);
  composer.addPass(new OutputPass());
  if (benchmark === "no-ao") aoPass.enabled = false;
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
  sun.shadow.radius = 14;
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
  // A rounded rectangle in the xy plane, centred on the origin
  const roundedRectShape = (w, h, r) => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return shape;
  };
  // A thin slab with big rounded corners in its face (rbox caps its radius at half the
  // thinnest side, so a phone-thin box would come out nearly square), its edges softly bevelled
  const phoneSlab = (w, h, d, r) => {
    const b = Math.min(0.015, d / 3);
    const geo = new THREE.ExtrudeGeometry(roundedRectShape(w - 2 * b, h - 2 * b, r - b), {
      depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10,
    });
    geo.translate(0, 0, -(d - 2 * b) / 2);
    return geo;
  };
  // Places an object (and tips it about z), for building props out of parts
  const at = (obj, x, y, z = 0, rz = 0) => {
    obj.position.set(x, y, z);
    obj.rotation.z = rz;
    return obj;
  };

  // Paper, prints and labels: part self-lit so the print stays readable in any light, part toon
  // shaded so it still takes shadows and the neons' colour
  const PRINT_GLOW = 0.6;
  const PRINT_LIT = 0.5;
  const printMaterial = (map, options = {}) => {
    const m = new THREE.MeshToonMaterial({ map, emissiveMap: map, gradientMap: gradient, ...options });
    m.color.setScalar(PRINT_LIT);
    m.emissive.setScalar(1);
    m.emissiveIntensity = PRINT_GLOW;
    return track(m);
  };
  // A plane carrying a canvas texture. Screens and views (`unlit`) keep their exact colours
  const redrawers = [];
  function printed(w, h, px, draw, { unlit = false } = {}) {
    const t = canvasTexture(Math.round(w * px), Math.round(h * px));
    track(t.texture);
    const material = unlit ? track(new THREE.MeshBasicMaterial({ map: t.texture })) : printMaterial(t.texture);
    const plane = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), material);
    plane.receiveShadow = !unlit;
    t.redraw = (...args) => {
      t.hotspots = draw(t.ctx, t.canvas.width, t.canvas.height, ...args) || [];
      t.texture.needsUpdate = true;
    };
    plane.userData.tex = t;
    redrawers.push(() => t.redraw());
    return plane;
  }
  // A quote bubble that pops up over a prop for a few seconds (the mug).
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
  // The back wall stands right behind the desk, a cable's width from its back edge. What hangs
  // on it is lifted by as much as the move brings it down on screen, so the overview keeps its
  // composition.
  const WALL_Z = -4.58; // the middle of the wall slab; its face is at WALL_Z + 0.12
  const WALL_LIFT = 1.2;
  // The left wall stands just as close to the desk's left end
  const SIDE_X = -7.38; // the middle of the side wall slab; its face is at SIDE_X + 0.12
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
  // Both walls share one painted texture, tiled every 2 units (the back wall's box maps 0–1 over
  // its 200 × 100; the side wall's extrusion maps in world units)
  const wallPaint = canvasTexture(256, 256);
  track(wallPaint.texture);
  drawWallPaint(wallPaint.ctx, 256, 256);
  wallPaint.texture.wrapS = wallPaint.texture.wrapT = THREE.RepeatWrapping;
  const WALL_TILE = 2;
  const backWallPaint = wallPaint.texture;
  backWallPaint.repeat.set(200 / WALL_TILE, 100 / WALL_TILE);
  const sideWallPaint = track(wallPaint.texture.clone());
  sideWallPaint.needsUpdate = true;
  sideWallPaint.repeat.set(1 / WALL_TILE, 1 / WALL_TILE);
  const backWallMat = toon("#ffffff");
  backWallMat.map = backWallPaint;
  const sideWallMat = toon("#ffffff");
  sideWallMat.map = sideWallPaint;
  const trimMat = toon("#ffffff");
  const roomBox = (w, h, d, material, x, y, z, outline = 0.055) => {
    const part = mesh(new THREE.BoxGeometry(w, h, d), material, { outline, cast: false });
    part.position.set(x, y, z);
    room.add(part);
    return part;
  };
  roomBox(200, 0.25, 200, floorMat, 0, FLOOR_Y - 0.17, 1.2);
  roomBox(200, 100, 0.24, backWallMat, 0, FLOOR_Y + 50, WALL_Z);
  // The room's ambient fill washes shadows off the wall, so the wall gets its own catcher: a
  // plane just in front of it that only shows where something's shadow lands
  const wallShadowMat = track(new THREE.ShadowMaterial({ color: "#1a1714", opacity: 0.32 }));
  const wallShadows = new THREE.Mesh(track(new THREE.PlaneGeometry(40, 24)), wallShadowMat);
  wallShadows.position.set(0, FLOOR_Y + 10, WALL_Z + 0.125);
  wallShadows.receiveShadow = true;
  wallShadows.raycast = noRaycast;
  room.add(wallShadows);
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
  const sideWall = mesh(sideWallGeo, sideWallMat, { outline: 0.055, cast: false });
  sideWall.position.x = SIDE_X - 0.12;
  room.add(sideWall);
  const sideShadows = new THREE.Mesh(track(new THREE.PlaneGeometry(30, 24)), wallShadowMat);
  sideShadows.rotation.y = Math.PI / 2;
  sideShadows.position.set(SIDE_X + 0.135, FLOOR_Y + 10, 1.2);
  sideShadows.receiveShadow = true;
  sideShadows.raycast = noRaycast;
  room.add(sideShadows);
  roomBox(200, 0.22, 0.16, trimMat, 0, FLOOR_Y + 0.17, WALL_Z + 0.23, 0.025);
  roomBox(0.16, 0.22, 200, trimMat, SIDE_X + 0.23, FLOOR_Y + 0.17, 1.2, 0.025);

  // A hidden LED strip along the rear edge, with a soft wash on the wall above it.
  const deskGlow = canvasTexture(256, 128);
  track(deskGlow.texture);
  const deskGlowGradient = deskGlow.ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  deskGlowGradient.addColorStop(0, "rgba(255,255,255,1)");
  deskGlowGradient.addColorStop(0.45, "rgba(255,255,255,0.75)");
  deskGlowGradient.addColorStop(1, "rgba(255,255,255,0)");
  deskGlow.ctx.fillStyle = deskGlowGradient;
  deskGlow.ctx.fillRect(0, 0, 256, 128);
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
  const deskNeons = ["#00e0c6", "#ff90e8"].map((color, i) => {
    const x = i === 0 ? -3.5 : 3.5;
    const strip = new THREE.Mesh(
      track(new THREE.BoxGeometry(7, 0.045, 0.06)),
      track(new THREE.MeshBasicMaterial({ color })),
    );
    // tucked just under the top's back edge, so only its light shows, never the strip itself
    strip.position.set(x, -0.3, -4.23);
    strip.raycast = noRaycast;
    const washMat = track(new THREE.MeshBasicMaterial({
      map: deskGlow.texture, color, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0,
    }));
    // A broad, faint wash: the two colours meet softly behind the monitor instead of each
    // lighting a flat band of wall
    const wash = new THREE.Mesh(track(new THREE.PlaneGeometry(11, 3.6)), washMat);
    wash.position.set(x, 1.8, WALL_Z + 0.15);
    wash.raycast = noRaycast;
    // Above the top's back edge: it washes the wall and the backs of the props, whose
    // silhouettes rise up the wall in the strip's colour. Held a metre off the wall: any closer
    // and the falloff burns a white hotspot onto it
    const light = neonLight(color, 4, () => washMat.opacity / DESK_WASH, { distance: 9, shadow: true });
    light.position.set(x, 0.5, WALL_Z + 1.1);
    scene.add(strip, wash, light);
    return { strip, washMat };
  });

  // A framed illustration on the left wall: four panes, a sun/moon and angular trees.
  const windowGroup = new THREE.Group();
  // Set back in the wall's opening: the group's origin is the frame's plane, WINDOW_DEPTH
  // behind the wall's face
  const WINDOW_DEPTH = 0.42;
  windowGroup.position.set(SIDE_X + 0.12 - WINDOW_DEPTH, WINDOW_AT.y, WINDOW_AT.z);
  windowGroup.rotation.y = Math.PI / 2;
  room.add(windowGroup);
  // A wooden frame and sill (the desk's grain, a shade warmer), a darker moulding round the glass,
  // an apron board under the sill, a brass catch where the bars cross, and a faint glare
  const windowWood = canvasTexture(512, 512);
  track(windowWood.texture);
  drawWoodTop(windowWood.ctx, 512, 512);
  const frameWood = toon("#f0c7a0");
  frameWood.map = windowWood.texture;
  const windowFrame = mesh(new THREE.BoxGeometry(4.4, 4.5, 0.18), frameWood, { cast: false, outline: 0.03 });
  // The view outside is animated (see drawWindowView): redrawn from the render loop, often
  // while it's zoomed in on, a few times a second otherwise
  // The sky matches the room: night while the room is dark, and while it's light the visitor's
  // own time of day (morning, day or evening, with a late dusk standing in for night, so the
  // lamp and the view always agree). Now and then it rains.
  const outside = { t: 0, flockAt: -99, starAt: -99, drawnAt: 0, rain: 0, rainTarget: 0, clicks: [], night: dark };
  const clockPart = (hour = new Date().getHours() + new Date().getMinutes() / 60) =>
    hour >= 5 && hour < 10 ? "morning" : hour >= 10 && hour < 16 ? "day" : "evening";
  const dayPart = (hour) => (outside.night ? "night" : clockPart(hour));
  const windowView = printed(4.0, 4.1, 220, (c, w, h) => drawWindowView(c, w, h, { ...outside, time: dayPart() }), { unlit: true });
  windowView.position.z = 0.105;
  windowGroup.add(windowFrame, windowView);
  // The reveal: wooden linings round the opening (the frame's wood), from the frame out to the wall's face
  // (they fill the cut wall's edges and run on behind it), with a soft shadow cast in from
  // above and the side so the frame reads as set into the wall
  const JAMB = 0.12;
  const REVEAL = WINDOW_DEPTH + 0.1;
  // (no lining along the bottom: the sill is the opening's floor)
  [[0, 2.25 + JAMB / 2, 4.4 + JAMB * 2, JAMB], [2.2 + JAMB / 2, 0, JAMB, 4.5], [-2.2 - JAMB / 2, 0, JAMB, 4.5]].forEach(([x, y, w, h]) => {
    const jamb = mesh(new THREE.BoxGeometry(w, h, REVEAL), frameWood, { cast: false, outline: 0.015 });
    // Stands just proud of the wall's face, a thin wooden lip round the opening: ending behind
    // it let the white cut edge of the wall show as a line, and flush, the two faces flicker
    jamb.position.set(x, y, WINDOW_DEPTH + 0.02 - REVEAL / 2);
    windowGroup.add(jamb);
  });
  const revealShade = printed(4.4, 4.5, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const top = c.createLinearGradient(0, 0, 0, h * 0.22);
    top.addColorStop(0, "rgba(40,30,60,0.45)");
    top.addColorStop(1, "rgba(40,30,60,0)");
    c.fillStyle = top;
    c.fillRect(0, 0, w, h * 0.22);
    const side = c.createLinearGradient(w, 0, w * 0.86, 0);
    side.addColorStop(0, "rgba(40,30,60,0.35)");
    side.addColorStop(1, "rgba(40,30,60,0)");
    c.fillStyle = side;
    c.fillRect(w * 0.86, 0, w * 0.14, h);
  }, { unlit: true });
  revealShade.material.transparent = true;
  revealShade.material.depthWrite = false;
  revealShade.position.z = 0.125;
  revealShade.raycast = noRaycast;
  // The sill runs out from the frame past the wall's face, with an apron board under it. Its
  // top sits clearly above the opening's floor and the frame's foot (both end inside it), so
  // no two faces share a plane and flicker as the camera moves.
  const sill = mesh(new THREE.BoxGeometry(4.4 + 0.5, 0.2, WINDOW_DEPTH + 0.45), frameWood, { cast: false, outline: 0.03 });
  sill.position.set(0, -2.25 - 0.03, (WINDOW_DEPTH + 0.45) / 2);
  const apron = mesh(rbox(4.1, 0.26, 0.08, 0.03), frameWood, { cast: false, outline: 0.02 });
  apron.position.set(0, -2.25 - 0.29, WINDOW_DEPTH + 0.04);
  windowGroup.add(sill, apron, revealShade);
  const moulding = toon("#7a4a26");
  [[0, 2.05, 4.12, 0.1], [0, -2.05, 4.12, 0.1], [2.0, 0, 0.1, 4.2], [-2.0, 0, 0.1, 4.2]].forEach(([x, y, w, h]) => {
    const strip = mesh(rbox(w, h, 0.08, 0.02), moulding, { cast: false, outline: 0.015 });
    strip.position.set(x, y, 0.13);
    windowGroup.add(strip);
  });
  const brass = toon("#d4a72c");
  const catchPlate = mesh(rbox(0.18, 0.12, 0.04, 0.02), brass, { cast: false, outline: 0.01 });
  catchPlate.position.set(0, 0, 0.14);
  const catchLever = mesh(rbox(0.05, 0.22, 0.04, 0.02), brass, { cast: false, outline: 0.01 });
  catchLever.position.set(0.06, -0.08, 0.17);
  catchLever.rotation.z = 0.5;
  // The catch turns around the spindle in the fixed plate.
  const windowCatch = new THREE.Group();
  windowCatch.position.z = 0.17;
  catchLever.position.z = 0;
  windowCatch.add(catchLever);
  windowGroup.add(catchPlate, windowCatch);
  const glareTex = canvasTexture(256, 256);
  track(glareTex.texture);
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
  const windowGlare = new THREE.Mesh(track(new THREE.PlaneGeometry(4.0, 4.1)), track(new THREE.MeshBasicMaterial({ map: glareTex.texture, transparent: true, opacity: 0.55, depthWrite: false })));
  glareTex.texture.wrapS = THREE.RepeatWrapping;
  windowGlare.position.z = 0.115;
  windowGlare.raycast = noRaycast;
  windowGroup.add(windowGlare);
  // Weather: a quarter of visits open on a shower; after that a shower now and then, a minute
  // or two long, every few minutes at most
  function weather(first = false) {
    if (destroyed) return;
    let wait;
    if (outside.rainTarget) {
      outside.rainTarget = 0;
      wait = 180000 + Math.random() * 120000;
    } else if (Math.random() < (first ? 0.25 : 0.3)) {
      outside.rainTarget = 0.6 + Math.random() * 0.4;
      wait = 60000 + Math.random() * 60000;
    } else wait = 180000 + Math.random() * 120000;
    timers.push(setTimeout(weather, wait));
  }
  timers.push(setTimeout(() => weather(true), 4000));
  // Click the window to look out; click again for a flock of birds (or, at night, a shooting
  // star). Three quick clicks bring the rain, or stop it.
  const lookOut = () => {
    const now = performance.now();
    outside.clicks = outside.clicks.filter((at) => now - at < 1500).concat(now);
    if (outside.clicks.length >= 3) {
      outside.clicks = [];
      outside.rainTarget = outside.rainTarget ? 0 : 0.9;
      discover("rain");
      sfx.patter({ duration: 0.8, volume: 0.3 });
      return;
    }
    if (dayPart() === "night") {
      if (outside.t - outside.starAt < 1.6) return;
      outside.starAt = outside.t;
      discover("star");
      sfx.sparkle({ delay: 0.15, volume: 0.3 });
    } else {
      if (outside.t - outside.flockAt < 2) return;
      outside.flockAt = outside.t;
      [0.3, 0.75, 1.3].forEach((delay) => sfx.chirp({ delay, volume: 0.3 }));
    }
  };
  // ---------- a live forecast beside the window, in its close-up ----------
  // Today's real weather where Oka lives (Pontianak), from Open-Meteo (free, no key, and no
  // asking visitors for their location): now, and the next few days. Fetched when the window
  // is first looked at and at most every 15 minutes after. If it's really raining there, so is
  // the view.
  const WEATHER_PLACE = { name: "Pontianak", lat: -0.0263, lon: 109.3425, tz: "Asia/Pontianak" };
  const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_PLACE.lat}&longitude=${WEATHER_PLACE.lon}`
    + "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day"
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
    + `&timezone=${encodeURIComponent(WEATHER_PLACE.tz)}&forecast_days=4`;
  let weatherNow = null;
  let weatherFetchedAt = 0;
  let weatherLoading = false;
  const WEATHER_CARD = { w: 2.8, h: 2.8 * (840 / 720) };
  const weatherTex = canvasTexture(720, 840);
  track(weatherTex.texture);
  const weatherCard = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: weatherTex.texture, depthTest: false, transparent: true })));
  weatherCard.renderOrder = 12;
  weatherCard.raycast = noRaycast;
  weatherCard.scale.set(0.001, 0.001, 1);
  // On the wall to the window's left as you face it, close by it and a little high, clear of
  // the guitar below
  weatherCard.position.set(SIDE_X + 0.6, WINDOW_AT.y + 0.4, WINDOW_AT.z + WINDOW_AT.w / 2 + 0.2 + WEATHER_CARD.w / 2);
  scene.add(weatherCard);
  const redrawWeather = () => {
    drawWeatherCard(weatherTex.ctx, 720, 840, { place: WEATHER_PLACE.name, weather: weatherNow });
    weatherTex.texture.needsUpdate = true;
  };
  async function loadWeather() {
    if (weatherLoading || (weatherNow && !weatherNow.error && performance.now() - weatherFetchedAt < 15 * 60000)) return;
    weatherLoading = true;
    try {
      const res = await fetch(WEATHER_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { current, daily } = await res.json();
      if (destroyed) return;
      weatherNow = {
        current: { temp: current.temperature_2m, humidity: current.relative_humidity_2m, code: current.weather_code, wind: current.wind_speed_10m, isDay: current.is_day === 1 },
        days: daily.time.map((date, i) => ({
          label: i === 0 ? "Today" : new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
          code: daily.weather_code[i],
          max: daily.temperature_2m_max[i],
          min: daily.temperature_2m_min[i],
          rain: daily.precipitation_probability_max[i],
        })),
        updated: current.time.slice(11, 16),
      };
      weatherFetchedAt = performance.now();
      // Raining for real: let it rain outside the window too
      const kind = weatherKind(current.weather_code)[1];
      if ((kind === "rain" || kind === "storm") && !outside.rainTarget) outside.rainTarget = kind === "storm" ? 1 : 0.7;
    } catch {
      weatherNow = { error: true };
    } finally {
      weatherLoading = false;
    }
    if (!destroyed) redrawWeather();
  }
  function showWeather() {
    redrawWeather();
    gsap.fromTo(weatherCard.scale, { x: WEATHER_CARD.w * 0.85, y: WEATHER_CARD.h * 0.85 }, { x: WEATHER_CARD.w, y: WEATHER_CARD.h, duration: 0.35, ease: "back.out(2)", overwrite: true });
    loadWeather();
  }
  const hideWeather = () => gsap.to(weatherCard.scale, { x: 0.001, y: 0.001, duration: 0.15, ease: "power2.in", overwrite: true });
  register(windowGroup, {
    focus: "window",
    onHover: (on) => {
      gsap.to(windowCatch.rotation, { z: on ? -0.55 : 0, duration: on ? 0.25 : 0.4, ease: "power2.out", overwrite: true });
      gsap.to(windowGlare.material, { opacity: on ? 1 : 0.55, duration: 0.35, overwrite: true });
      gsap.to(glareTex.texture.offset, { x: on ? -0.45 : 0, duration: on ? 0.65 : 0.4, ease: "power2.out", overwrite: true });
    },
    onArrive: () => {
      showWeather();
      lookOut();
    },
    onLeave: hideWeather,
    onClick: lookOut,
  });

  // A guitar hanging on the left wall from a hook under its headstock. Click it for a strum;
  // it swings on the hook. Built standing up in its own plane, then turned to face the room.
  const guitar = new THREE.Group();
  guitar.position.set(SIDE_X + 0.38, 2.9, 5.3);
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
  // The top carries the printed face (sunburst, grain, pickguard, rosette, binding), mapped in
  // the outline's own units; the sides and back are plain
  const guitarTop = canvasTexture(512, 740);
  track(guitarTop.texture);
  drawGuitarTop(guitarTop.ctx, 512, 740);
  guitarTop.texture.repeat.set(0.5, 1 / 2.87);
  guitarTop.texture.offset.set(0.5, 0.95 / 2.87);
  const guitarTopMat = toon("#ffffff");
  guitarTopMat.map = guitarTop.texture;
  const guitarBody = mesh(bodyGeo, [guitarTopMat, toon("#1a1714")], { outline: 0.04 });
  const flat = (geo, color, x, y, z) => {
    const m = new THREE.Mesh(track(geo), track(new THREE.MeshBasicMaterial({ color })));
    m.position.set(x, y, z);
    return m;
  };
  const soundHole = flat(new THREE.CircleGeometry(0.3, 40), "#1a1714", 0, 1.15, 0.195);
  const bridge = mesh(rbox(0.7, 0.14, 0.05, 0.02), toon("#4a2f1f"), { outline: 0.02 });
  bridge.position.set(0, -0.15, 0.21);
  const guitarNeck = mesh(rbox(0.26, 2.3, 0.14, 0.04), toon("#1a1714"), { outline: 0.03 });
  guitarNeck.position.set(0, 2.85, 0.06);
  const fretboard = flat(new THREE.PlaneGeometry(0.24, 2.3), "#2b2b2b", 0, 2.85, 0.135);
  const fretY = (k) => 3.95 - k * 0.24 * (1 - k * 0.03);
  const frets = Array.from({ length: 9 }, (_, k) => flat(new THREE.PlaneGeometry(0.24, 0.02), "#d9d4c7", 0, fretY(k), 0.137));
  // Cream inlay dots on the 3rd, 5th and 7th frets
  const inlays = [2, 4, 6].map((k) => flat(new THREE.CircleGeometry(0.035, 16), "#f1e6cf", 0, (fretY(k) + fretY(k + 1)) / 2, 0.138));
  // The headstock: flared from the nut to a crowned top with a dip in the middle, a cream nut,
  // a black truss-rod cover, a star sticker, three tuners a side (gear housings and cream keys
  // out the edges, string posts through the face) and the strings running from the nut to them
  const headShape = new THREE.Shape();
  headShape.moveTo(-0.15, 0);
  headShape.lineTo(-0.24, 0.62);
  headShape.quadraticCurveTo(-0.25, 0.72, -0.15, 0.73);
  headShape.quadraticCurveTo(-0.06, 0.73, 0, 0.67);
  headShape.quadraticCurveTo(0.06, 0.73, 0.15, 0.73);
  headShape.quadraticCurveTo(0.25, 0.72, 0.24, 0.62);
  headShape.lineTo(0.15, 0);
  headShape.closePath();
  const headGeo = new THREE.ExtrudeGeometry(headShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
  const headstock = mesh(headGeo, toon("#6b4428"), { outline: 0.03 });
  headstock.position.set(0, 3.98, 0);
  const HEAD_FACE = 0.092;
  const nut = mesh(rbox(0.27, 0.035, 0.05, 0.01), toon("#fffdf5"), { outline: 0.01 });
  nut.position.set(0, 4.0, 0.14);
  const trussCover = mesh(rbox(0.1, 0.12, 0.012, 0.03), toon("#1a1714"), { outline: 0.008, cast: false });
  trussCover.position.set(0, 4.1, HEAD_FACE + 0.006);
  const headStar = printed(0.16, 0.16, 800, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const star = (dx) => {
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = (i % 2 ? 0.2 : 0.45) * w;
        const t = (i / 10) * Math.PI * 2 - Math.PI / 2;
        c.lineTo(w / 2 + dx + Math.cos(t) * r, h / 2 + dx + Math.sin(t) * r);
      }
      c.closePath();
    };
    star(w * 0.05);
    c.fillStyle = "#000";
    c.fill();
    star(0);
    c.fillStyle = "#ffdd00";
    c.fill();
    c.lineWidth = w * 0.05;
    c.stroke();
  });
  headStar.material.transparent = true;
  headStar.material.alphaTest = 0.1;
  headStar.position.set(0, 4.6, HEAD_FACE + 0.004);
  const pegMat = toon("#d9d4c7");
  const metal = toon("#b8bec7");
  const pegs = [];
  const posts = [];
  const strings = [];
  const stringMat = track(new THREE.MeshBasicMaterial({ color: "#f4f2ee" }));
  [-1, 1].forEach((side) => [0, 1, 2].forEach((k) => {
    const y = 4.22 + k * 0.17;
    const edge = 0.2 + k * 0.02;
    // the gear housing on the back edge, and the key sticking out the side
    const housing = mesh(rbox(0.08, 0.1, 0.07, 0.02), metal, { outline: 0.01, cast: false });
    housing.position.set(side * (edge + 0.03), y, 0.02);
    const shaft = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.08, 8), metal, { outline: 0.006, cast: false });
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(side * (edge + 0.1), y, 0.02);
    const key = mesh(new THREE.SphereGeometry(0.06, 12, 8), pegMat, { outline: 0.012, cast: false });
    key.scale.set(0.45, 1, 0.8);
    key.position.set(side * (edge + 0.16), y, 0.02);
    pegs.push(housing, shaft, key);
    // the string post on the face, and the string from the nut to it
    const postAt = new THREE.Vector3(side * (edge - 0.07), y, HEAD_FACE + 0.035);
    const post = mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.06, 10), metal, { outline: 0.006, cast: false });
    post.rotation.x = Math.PI / 2;
    post.position.copy(postAt);
    posts.push(post);
    const s = 3 + side * (k + 1) - (side > 0 ? 1 : 0);
    const from = new THREE.Vector3(-0.085 + s * 0.034, 4.0, 0.23);
    const dir = postAt.clone().sub(from);
    const run = new THREE.Mesh(track(new THREE.BoxGeometry(0.008, dir.length(), 0.008)), stringMat);
    run.position.copy(from).addScaledVector(dir, 0.5);
    run.quaternion.setFromUnitVectors(UP, dir.normalize());
    strings.push(run);
  }));
  const stringGeo = track(new THREE.BoxGeometry(0.008, 4.15, 0.008, 1, 16, 1));
  strings.push(...Array.from({ length: 6 }, (_, k) => {
    const str = new THREE.Mesh(stringGeo, stringMat);
    str.position.set(-0.085 + k * 0.034, 1.925, 0.23);
    return str;
  }));
  // On the bridge, a bone saddle the strings break over and a cream pin for each string behind
  // it; a strap button at the foot of the body; and a yellow pick tucked under the strings
  // up by the nut, ready to hand
  const saddle = mesh(rbox(0.3, 0.025, 0.03, 0.008), toon("#fffdf5"), { outline: 0.008, cast: false });
  saddle.position.set(0, -0.11, 0.245);
  const bridgePins = Array.from({ length: 6 }, (_, k) => flat(new THREE.CircleGeometry(0.014, 12), "#f1e6cf", -0.085 + k * 0.034, -0.19, 0.237));
  const strapButton = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.07, 14), toon("#f1e6cf"), { outline: 0.01, cast: false });
  strapButton.position.set(0, -1.0, 0);
  const pickShape = new THREE.Shape();
  pickShape.moveTo(0, -0.07);
  pickShape.quadraticCurveTo(0.075, 0.02, 0.06, 0.055);
  pickShape.quadraticCurveTo(0, 0.08, -0.06, 0.055);
  pickShape.quadraticCurveTo(-0.075, 0.02, 0, -0.07);
  const guitarPick = mesh(new THREE.ShapeGeometry(pickShape, 8), toon("#ffdd00"), { outline: 0.01, cast: false });
  guitarPick.position.set(0.03, 3.62, 0.215);
  guitarPick.rotation.z = -0.35;
  // A woven strap, tied on behind the nut and run down to the strap button, hanging slack in a
  // loop beside the body: red with yellow and teal bands woven down its length
  const guitarStrapTex = canvasTexture(64, 16);
  track(guitarStrapTex.texture);
  [["#d62828", 0, 64], ["#ffdd00", 6, 4], ["#00a99d", 14, 6], ["#ffdd00", 24, 4], ["#fffdf5", 40, 3], ["#00a99d", 50, 6]].forEach(([color, x, w]) => {
    guitarStrapTex.ctx.fillStyle = color;
    guitarStrapTex.ctx.fillRect(x, 0, w, 16);
  });
  guitarStrapTex.ctx.fillStyle = "rgba(0,0,0,.18)";
  for (let y = 0; y < 16; y += 4) guitarStrapTex.ctx.fillRect(0, y, 64, 1);
  guitarStrapTex.texture.wrapS = THREE.RepeatWrapping;
  const guitarStrapPath = new THREE.CatmullRomCurve3([
    [-0.1, 3.94, -0.06], [-0.32, 3.4, -0.1], [-0.62, 2.4, -0.12], [-1.05, 1.0, -0.12],
    [-1.12, -0.2, -0.12], [-0.85, -0.95, -0.1], [-0.35, -1.12, -0.06], [0, -1.02, 0],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  guitarStrapTex.texture.repeat.set(Math.round(guitarStrapPath.getLength() / 0.9), 1);
  const guitarStrapMat = toon("#ffffff");
  guitarStrapMat.map = guitarStrapTex.texture;
  const guitarStrap = mesh(new THREE.TubeGeometry(guitarStrapPath, 80, 0.06, 6), guitarStrapMat, { outline: 0.015, cast: false });
  // flattened into a band lying against the wall
  guitarStrap.scale.z = 0.35;
  guitarParts.add(guitarBody, soundHole, bridge, saddle, guitarStrap, ...bridgePins, strapButton, guitarNeck, fretboard, ...frets, ...inlays, headstock, nut, trussCover, headStar, ...pegs, ...posts, ...strings, guitarPick);
  // The hook: a plate on the wall and two arms the headstock rests on
  const hookMat = toon("#1a1714");
  const hookPlate = mesh(rbox(0.34, 0.5, 0.06, 0.02), hookMat, { outline: 0.02 });
  hookPlate.position.set(0, HOOK_Y, -0.23);
  guitar.add(hookPlate);
  [-0.2, 0.2].forEach((x) => {
    guitar.add(rod(new THREE.Vector3(x, HOOK_Y, -0.22), new THREE.Vector3(x, HOOK_Y, 0.12), 0.03, hookMat, 0.015));
    guitar.add(rod(new THREE.Vector3(x, HOOK_Y, 0.12), new THREE.Vector3(x, HOOK_Y + 0.12, 0.15), 0.03, hookMat, 0.015));
  });
  const stringRestColor = stringMat.color.clone();
  const stringRestPositions = stringGeo.attributes.position.array.slice();
  const stringVibration = { strength: 0, phase: 0 };
  const updateGuitarStrings = () => {
    const positions = stringGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = stringRestPositions[i * 3 + 1];
      // Both ends stay on the nut and bridge; only the middle of the strings moves.
      const envelope = Math.sin(Math.PI * (y / 4.15 + 0.5));
      positions.setX(i, stringRestPositions[i * 3] + envelope * Math.sin(stringVibration.phase) * stringVibration.strength);
    }
    positions.needsUpdate = true;
  };
  let guitarBusy = false;
  register(guitarSwing, {
    onHover: (on) => {
      if (guitarBusy) return;
      gsap.to(guitarSwing.rotation, { z: on ? 0.075 : 0, duration: on ? 0.35 : 0.8, ease: on ? "back.out(1.8)" : "elastic.out(1, 0.5)", overwrite: true });
      gsap.to(stringMat.color, { r: on ? 1 : stringRestColor.r, g: on ? 0.95 : stringRestColor.g, b: on ? 0.65 : stringRestColor.b, duration: 0.25, overwrite: true });
      if (on) gsap.fromTo(stringVibration, { strength: 0.014, phase: 0 }, { strength: 0, phase: Math.PI * 14, duration: 0.8, ease: "power1.out", onUpdate: updateGuitarStrings, overwrite: true });
      else gsap.to(stringVibration, { strength: 0, duration: 0.2, onUpdate: updateGuitarStrings, overwrite: true });
    },
    onClick: () => {
      if (guitarBusy) return;
      guitarBusy = true;
      sfx.strum();
      discover("guitar");
      gsap.fromTo(guitarSwing.rotation, { z: 0.09 * (Math.random() < 0.5 ? -1 : 1) }, { z: 0, duration: 1.6, ease: "elastic.out(1, 0.25)", overwrite: true, onComplete: () => (guitarBusy = false) });
      // The strings shimmer for a moment
      gsap.fromTo(stringMat.color, { r: 1, g: 0.87, b: 0 }, { r: stringRestColor.r, g: stringRestColor.g, b: stringRestColor.b, duration: 1.2, ease: "power2.out", overwrite: true });
      gsap.fromTo(stringVibration, { strength: 0.025, phase: 0 }, { strength: 0, phase: Math.PI * 28, duration: 1.2, onUpdate: updateGuitarStrings, overwrite: true });
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
  windowLight.position.set(SIDE_X + 0.48, 5.6, -1.1);
  windowLight.target.position.set(1, -1, 1);
  windowLight.map = paneLight.texture;
  windowLight.castShadow = true;
  windowLight.shadow.mapSize.set(1024, 1024);
  windowLight.shadow.bias = -0.0002;
  windowLight.shadow.normalBias = 0.03;
  windowLight.shadow.radius = 6;
  scene.add(windowLight, windowLight.target);

  // Wall clock and a small print give the empty upper area a purpose.
  const clock = new THREE.Group();
  // Lined up over the monitor as seen from the desk view
  // Low enough that its top stays in frame on wide, short screens
  clock.position.set(-0.9, 4.95 + WALL_LIFT + 0.4, WALL_Z + 0.25); // midway between the painting and the board
  const clockMount = new THREE.Group();
  clockMount.position.copy(clock.position).add(new THREE.Vector3(0, 0.78, 0));
  clock.position.set(0, -0.78, 0);
  clockMount.add(clock);
  room.add(clockMount);
  const clockRim = mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.15, 48), toon("#7fb2ff"), { outline: 0.06 });
  clockRim.rotation.x = Math.PI / 2;
  // a rolled bezel round the glass
  const clockBezel = mesh(new THREE.TorusGeometry(0.8, 0.055, 10, 48), toon("#5a8ad6"), { outline: 0.012 });
  clockBezel.position.z = 0.09;
  const dial = canvasTexture(512, 512);
  track(dial.texture);
  drawClockFace(dial.ctx, 512, 512);
  const clockFace = new THREE.Mesh(track(new THREE.CircleGeometry(0.76, 48)), printMaterial(dial.texture));
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
  // A red seconds hand with a round counterweight that ticks round, and a gold cap over the pivot
  const secondHand = new THREE.Group();
  secondHand.position.z = 0.145;
  const secondMat = toon("#e11d48");
  secondHand.add(
    at(mesh(new THREE.BoxGeometry(0.022, 0.86, 0.012), secondMat, { cast: false, outline: 0 }), 0, 0.27, 0),
    at(mesh(new THREE.CircleGeometry(0.05, 16), secondMat, { cast: false, outline: 0 }), 0, -0.12, 0.008),
  );
  const clockCap = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 16), toon("#ffd34d"), { outline: 0.008, cast: false });
  clockCap.rotation.x = Math.PI / 2;
  clockCap.position.z = 0.16;
  clock.add(clockRim, clockBezel, clockFace, hourHand, minuteHand, secondHand, clockCap);
  let lastSecond = -1;
  function updateSecondHand() {
    const sec = new Date().getSeconds();
    if (sec === lastSecond || clockBusy) return;
    lastSecond = sec;
    gsap.to(secondHand.rotation, { z: -(sec / 60) * Math.PI * 2, duration: 0.25, ease: "elastic.out(1.2, 0.5)", overwrite: true });
    if (sec === 0) secondHand.rotation.z = Math.PI * 2 / 60;
  }
  const updateRoomClock = () => {
    const now = new Date();
    minuteHand.rotation.z = -(now.getMinutes() / 60) * Math.PI * 2;
    hourHand.rotation.z = -((now.getHours() % 12 + now.getMinutes() / 60) / 12) * Math.PI * 2;
  };
  updateRoomClock();
  // Click the clock: its hands whirl round twice, it rocks on its nail, then strikes the hour
  let clockBusy = false;
  register(clock, {
    onHover: (on) => {
      if (!clockBusy) gsap.to(clockMount.rotation, { z: on ? 0.13 : 0, duration: on ? 0.35 : 0.8, ease: on ? "back.out(1.8)" : "elastic.out(1, 0.5)", overwrite: true });
    },
    onClick: () => {
      if (clockBusy) return;
      clockBusy = true;
      gsap.to(clockMount.rotation, { z: 0, duration: 0.2, overwrite: true });
      discover("clock");
      gsap.to(minuteHand.rotation, { z: minuteHand.rotation.z - Math.PI * 4, duration: 1.4, ease: "power2.inOut" });
      gsap.to(hourHand.rotation, {
        z: hourHand.rotation.z - Math.PI * 2, duration: 1.4, ease: "power2.inOut",
        onComplete: () => {
          updateRoomClock();
          gsap.fromTo(clockMount.rotation, { z: 0.14 }, { z: 0, duration: 1.4, ease: "elastic.out(1, 0.2)", overwrite: true, onComplete: () => (clockBusy = false) });
          gsap.fromTo(clock.scale, { x: 1.1, y: 1.1 }, { x: 1, y: 1, duration: 0.5, ease: "back.out(3)" });
          // It strikes the hour, as a wall clock does (a few strokes at most)
          sfx.clockStrike({ count: Math.min(3, new Date().getHours() % 12 || 12) });
        },
      });
      // the movement ratcheting as the hands whirl
      for (let i = 0; i < 12; i++) sfx.tick({ pitch: 1.1 + (i % 2) * 0.25, delay: i * 0.11 });
    },
  });
  const rugTex = canvasTexture(1600, 1150);
  track(rugTex.texture);
  drawRug(rugTex.ctx, 1600, 1150);
  const rugTop = new THREE.Mesh(track(new THREE.PlaneGeometry(16, 11.5)), toon("#ffffff"));
  rugTop.material.map = rugTex.texture;
  rugTop.rotation.x = -Math.PI / 2;
  rugTop.position.set(0.9, FLOOR_Y + 0.07, 2.4);
  rugTop.receiveShadow = true;
  rugTop.raycast = noRaycast;
  const rugBase = mesh(rbox(16, 0.08, 11.5, 0.03), toon("#1a1714"), { outline: 0.03, cast: false });
  rugBase.position.set(0.9, FLOOR_Y + 0.025, 2.4);
  rugBase.raycast = noRaycast;
  room.add(rugBase, rugTop);

  // A framed painting hung from a nail on a wire. It's a little gallery: click it and it swings,
  // turns over and shows the next picture (a sunset, a city at night, a great wave).
  const PAINTING_DROP = 1.75; // nail to the painting's centre
  const paintingHang = new THREE.Group();
  // Hung clear of the lamp, but low enough that the frame and its nail stay in frame on wide,
  // short screens
  paintingHang.position.set(-4.9, 3.4 + WALL_LIFT + 0.9 + PAINTING_DROP, WALL_Z + 0.24);
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
    onHover: (on) => {
      if (!paintingBusy) gsap.to(paintingHang.rotation, { z: on ? -0.085 : 0, duration: on ? 0.35 : 0.9, ease: on ? "back.out(1.8)" : "elastic.out(1, 0.5)", overwrite: true });
    },
    onClick: () => {
      if (paintingBusy) return;
      paintingBusy = true;
      discover("painting");
      gsap.fromTo(paintingHang.rotation, { z: 0.09 }, { z: 0, duration: 1.6, ease: "elastic.out(1, 0.25)", overwrite: true, onComplete: () => (paintingBusy = false) });
      // Squashed edge-on and back (a turn round its vertical axis would go through the wall)
      gsap.timeline()
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
  const chairFrameMat = toon("#1a1714");
  // Sized against the desk: the desk is 14 wide (about 140 cm), so the seat is about 55 cm
  // across and sits at roughly 60% of the desk's height. A premium gaming chair in black
  // leatherette: a tall reclined back with the headrest built in, a raised centre panel
  // between carbon-weave wings, fine dark red stitching along every seam, gold badges, a thick
  // padded seat, recline hubs, 4D armrests and a flat-legged base.
  // The leatherette: a pebbled grain tile, tinted dark, that also bumps the toon shading so
  // the grain catches the light; the centre panel's is perforated. The pads' uv run in world
  // units (a tile to a unit), the boxes' 0 to 1 a face, so theirs repeat more.
  const leatherTile = (perforated, repeat) => {
    const tex = canvasTexture(256, 256);
    track(tex.texture);
    drawLeatherGrain(tex.ctx, 256, 256, { perforated });
    tex.texture.wrapS = tex.texture.wrapT = THREE.RepeatWrapping;
    tex.texture.repeat.set(repeat, repeat);
    const mat = toon("#35312e");
    mat.map = mat.bumpMap = tex.texture;
    mat.bumpScale = 2.2;
    return mat;
  };
  const leather = leatherTile(false, 1);
  const leatherPanel = leatherTile(true, 1.6);
  const leatherBox = leatherTile(false, 3.5);
  const CHAIR_STITCH = "#7a1a24";
  // Stitching is a fine dashed thread: a dash, a gap, along every seam
  const dashTex = canvasTexture(16, 4);
  track(dashTex.texture);
  dashTex.ctx.fillStyle = "#000";
  dashTex.ctx.fillRect(0, 0, 16, 4);
  dashTex.ctx.fillStyle = "#fff";
  dashTex.ctx.fillRect(0, 0, 10, 4);
  dashTex.texture.wrapS = THREE.RepeatWrapping;
  dashTex.texture.magFilter = THREE.NearestFilter;
  const carbonTex = canvasTexture(64, 64);
  track(carbonTex.texture);
  drawCarbonWeave(carbonTex.ctx, 64, 64);
  carbonTex.texture.wrapS = carbonTex.texture.wrapT = THREE.RepeatWrapping;
  carbonTex.texture.repeat.set(6, 6);
  const carbon = toon("#ffffff");
  carbon.map = carbonTex.texture;
  // A stitched seam: a thin red tube through a closed loop of points
  const STITCH_LENGTH = 0.09;
  const chairSeam = (points) => {
    const curve = new THREE.CatmullRomCurve3(points, true);
    // each seam gets its own thread, its dashes repeating along its length
    const thread = toon(CHAIR_STITCH);
    thread.alphaMap = dashTex.texture.clone();
    thread.alphaMap.repeat.set(Math.round(curve.getLength() / STITCH_LENGTH), 1);
    track(thread.alphaMap);
    thread.alphaTest = 0.5;
    return mesh(new THREE.TubeGeometry(curve, 480, 0.012, 4, true), thread, { outline: 0, cast: false });
  };

  // A deep cushion under it, so the seat reads thick, and the tilt mechanism under that
  const seatBase = mesh(rbox(4.5, 0.5, 4.0, 0.2), leatherBox, { outline: 0.04 });
  seatBase.position.y = -2.55;
  const mechanism = mesh(rbox(1.9, 0.34, 2.2, 0.08), chairFrameMat, { outline: 0.03 });
  mechanism.position.set(0, -2.95, 0.2);
  // its tilt knob and recline lever out to one side
  mechanism.add(at(mesh(rbox(0.5, 0.22, 0.5, 0.08), chairFrameMat, { outline: 0.02 }), 1.0, 0, 0.3));
  mechanism.add(at(rod(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.9, 0.05, 0), 0.05, chairFrameMat, 0.015), -1.6, 0, -0.4));
  // The back's proportions are traced from photos of the chair, front and rear: a narrow
  // rounded headrest, shoulders that slant straight out to the widest point a little over
  // halfway down, then near-vertical sides; as wide as the seat and about 1.35 times as tall
  // above it as it is wide. Its front is leather, with a raised panel stitched round in red
  // and, below the shoulders, two thick leather wings taking up the outer half of each side,
  // swept forward, carbon weave only on their rolled outer edges; its rear is one smooth
  // leather shell stitched round the edge.
  const BACK_H = 7.0;
  const BACK_DEPTH = 1.15;
  const BACK_FOOT = -2.45;
  // Half-width up a silhouette through these [half-width, height] points, its top corners
  // rounded off
  const halfWidthAlong = (points, height, corner) => {
    const samples = new THREE.SplineCurve(points.map(([hw, y]) => new THREE.Vector2(y, hw))).getPoints(160);
    return (y) => {
      let i = 1;
      while (i < samples.length - 1 && samples[i].x < y) i++;
      const a = samples[i - 1];
      const b = samples[i];
      const raw = a.y + (b.y - a.y) * THREE.MathUtils.clamp((y - a.x) / (b.x - a.x || 1), 0, 1);
      const over = y - (height - corner);
      return over > 0 ? raw - corner + Math.sqrt(Math.max(0, corner * corner - over * over)) : raw;
    };
  };
  // A padded slab: a silhouette `halfWidth(y)` either side of `centre(y)`, `depth` thick
  // through the middle and rounding off to nothing at its edges, as one smooth grid in front
  // (material 0) and one behind (material 1), denser toward the edges, so it bends cleanly
  // with no cracks. The front's outermost `rim` columns either side, round its rolled edge,
  // are material 2. `bulge(x, y)` swells its front out further in places. uv in world units.
  const pillow = (halfWidth, height, depth, { cols = 28, rows = 44, centre = () => 0, rim = 0, bulge = () => 0 } = {}) => {
    const edge = depth / 2;
    const thickness = (x, y) => {
      const d = Math.max(0, Math.min(halfWidth(y) - Math.abs(x - centre(y)), y, height - y));
      return edge * Math.sqrt(1 - (1 - Math.min(1, d / edge)) ** 2);
    };
    // how far its surface stands out on that side: the front swells by the bulge
    const depthAt = (x, y, side) => thickness(x, y) + (side < 0 ? bulge(x, y) : 0);
    const position = [];
    const uv = [];
    const index = [];
    const grids = [];
    for (const side of [-1, 1]) {
      const start = position.length / 3;
      for (let j = 0; j <= rows; j++) {
        const y = (height * (1 - Math.cos((Math.PI * j) / rows))) / 2;
        const hw = halfWidth(y);
        for (let i = 0; i <= cols; i++) {
          const x = centre(y) + hw * Math.sin(Math.PI * (i / cols - 0.5));
          position.push(x, y, side * depthAt(x, y, side));
          // across the rolled edge the surface runs mostly in depth, so the weave is laid by
          // distance along the surface rather than by x alone
          uv.push(x + Math.sign(x - centre(y)) * (edge - thickness(x, y)), y);
        }
      }
      grids.push({ side, start });
    }
    // the front's middle, then the whole rear, then the front's rim, so each is one run
    const quads = (side, start, keep) => {
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          if (!keep(i)) continue;
          const a = start + j * (cols + 1) + i;
          const c = a + cols + 1;
          // the front grid faces -z, the rear +z
          if (side < 0) index.push(a, c, a + 1, a + 1, c, c + 1);
          else index.push(a, a + 1, c, a + 1, c + 1, c);
        }
      }
    };
    const onRim = (i) => i < rim || i >= cols - rim;
    const [front, rear] = grids;
    quads(front.side, front.start, (i) => !onRim(i));
    const middle = index.length;
    quads(rear.side, rear.start, () => true);
    const rearEnd = index.length;
    quads(front.side, front.start, onRim);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(index);
    geo.addGroup(0, middle, 0);
    geo.addGroup(middle, rearEnd - middle, 1);
    geo.addGroup(rearEnd, index.length - rearEnd, 2);
    return { geo, depthAt, halfWidth, height, centre };
  };
  // The wings: from the edge of the centre panel outward, the shell bends forward (-z), so
  // each side sweeps round toward the sitter into a deep U
  const BEND_FROM = 1.1;
  const BEND = 0.75;
  const bendZ = (x) => -BEND * Math.max(0, Math.abs(x) - BEND_FROM) ** 2;
  const bent = (geo, y0, z0) => {
    geo.translate(0, y0, z0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) + bendZ(pos.getX(i)));
    geo.computeVertexNormals();
    return geo;
  };
  // Stitching round a pillow's face, `inset` in from its edge, on its front (-1) or rear (1)
  const stitched = (pad, inset, side, y0, z0, bend = bendZ) => {
    const run = Array.from({ length: 121 }, (_, k) => inset + ((pad.height - 2 * inset) * k) / 120);
    const edge = (y, sign) => [pad.centre(y) + sign * Math.max(0, pad.halfWidth(y) - inset), y];
    const loop = [...run.map((y) => edge(y, 1)), ...run.slice().reverse().map((y) => edge(y, -1))];
    return chairSeam(loop.map(([x, y]) => new THREE.Vector3(x, y + y0, z0 + side * (pad.depthAt(x, y, side) + 0.015) + bend(x))));
  };

  // The back shell
  const BACK_Y = -BACK_H / 2;
  const backWidth = halfWidthAlong(
    [[2.28, 0], [2.36, 1.4], [2.4, 2.6], [2.38, 4.2], [2.3, 4.6], [2.12, 4.97], [1.87, 5.32], [1.63, 5.7], [1.42, 6.08], [1.22, 6.44], [1.06, 6.8], [1.02, BACK_H]],
    BACK_H,
    0.45,
  );
  // The wings: below the shoulders, the outer half of each side swells forward into a thick
  // rolled cushion, part of the shell itself so it runs into the shoulder with no join. Its
  // inner edge runs straight down the back until it sweeps out toward the shoulder's slant;
  // the swell fades away over the wing's top.
  const BOLSTER_H = 5.0;
  const BOLSTER_IN = 1.12;
  const bolsterInner = (y) => (y < 3.9 ? BOLSTER_IN : BOLSTER_IN + (backWidth(BOLSTER_H) - 0.6 - BOLSTER_IN) * ((y - 3.9) / (BOLSTER_H - 3.9)) ** 1.6);
  const WING_SWELL = 0.42;
  const wingSwell = (x, y) => {
    const inner = bolsterInner(y);
    const u = (Math.abs(x) - inner) / (backWidth(y) - inner);
    if (u <= 0 || u >= 1) return 0;
    const fade = THREE.MathUtils.smoothstep(BOLSTER_H - y, 0, 1.6) * THREE.MathUtils.smoothstep(y, 0, 0.6);
    return WING_SWELL * Math.sin(Math.PI * u) ** 0.7 * fade;
  };
  const backPad = pillow(backWidth, BACK_H, BACK_DEPTH, { cols: 48, rows: 140, rim: 5, bulge: wingSwell });
  const chairBack = mesh(bent(backPad.geo, BACK_Y, 0), [leather, leather, carbon], { outline: 0.06 });
  chairBack.position.set(0, BACK_FOOT + BACK_H / 2, 2.05);
  // reclined about 8 degrees, as the chair stands upright
  chairBack.rotation.x = -0.14;
  chairBack.add(stitched(backPad, 0.12, -1, BACK_Y, 0), stitched(backPad, 0.12, 1, BACK_Y, 0));
  // each wing stitched round: up its inner edge, over its top and back down near the rim
  for (const side of [-1, 1]) {
    const run = Array.from({ length: 121 }, (_, k) => 0.3 + ((BOLSTER_H - 0.5) * k) / 120);
    const loop = [...run.map((y) => [bolsterInner(y) + 0.04, y]), ...run.slice().reverse().map((y) => [backWidth(y) - 0.24, y])];
    chairBack.add(chairSeam(loop.map(([x, y]) => new THREE.Vector3(side * x, y + BACK_Y, -(backPad.depthAt(side * x, y, -1) + 0.015) + bendZ(side * x)))));
  }
  // The raised centre panel: between the wings, then widening over the shoulders to fill
  // the headrest
  const CENTRE_H = BACK_H - 0.35;
  const centrePad = pillow((y) => Math.min(y < 3.9 ? BOLSTER_IN - 0.02 : bolsterInner(y) - 0.02, backWidth(y) - 0.22), CENTRE_H, 0.24, { cols: 28, rows: 110 });
  const CENTRE_Z = -BACK_DEPTH / 2 + 0.04;
  chairBack.add(mesh(bent(centrePad.geo, BACK_Y + 0.12, CENTRE_Z), leatherPanel, { outline: 0.03 }), stitched(centrePad, 0.1, -1, BACK_Y + 0.12, CENTRE_Z));

  // The seat: one thick padded cushion as wide as the back, a touch wider at the front, its
  // top stitched round in red. Built standing up like the back's
  // pads, then laid flat (its front toward -z), the top of its padding where the cat curls up.
  const SEAT_L = 4.3;
  const SEAT_DEPTH = 1.0;
  const seatWidth = halfWidthAlong([[2.2, 0], [2.35, 2.2], [2.3, SEAT_L]], SEAT_L, 0.7);
  const seatPad = pillow(seatWidth, SEAT_L, SEAT_DEPTH, { cols: 40, rows: 48 });
  seatPad.geo.translate(0, -SEAT_L / 2, 0);
  seatPad.geo.computeVertexNormals();
  const chairSeat = new THREE.Group();
  chairSeat.rotation.x = -Math.PI / 2;
  chairSeat.position.y = -1.77 - SEAT_DEPTH / 2;
  chairSeat.add(mesh(seatPad.geo, leather, { outline: 0.06 }), stitched(seatPad, 0.2, 1, -SEAT_L / 2, 0, () => 0));
  // Gold: a small badge high on the headrest, front and back
  const crestTex = canvasTexture(128, 128);
  track(crestTex.texture);
  drawChairCrest(crestTex.ctx, 128, 128);
  const crestMat = printMaterial(crestTex.texture, { transparent: true });
  const CREST_FRONT = CENTRE_Z - 0.12 - 0.04;
  [[0.55, BACK_H / 2 - 0.85, CREST_FRONT, Math.PI], [0.6, BACK_H / 2 - 0.95, BACK_DEPTH / 2 + 0.03, 0]].forEach(([size, y, z, turn]) => {
    const crest = new THREE.Mesh(track(new THREE.PlaneGeometry(size, size)), crestMat);
    crest.position.set(0, y, z);
    crest.rotation.y = turn;
    crest.raycast = noRaycast;
    chairBack.add(crest);
  });

  const chairPost = mesh(new THREE.CylinderGeometry(0.32, 0.36, 2.6, 20), chairFrameMat, { outline: 0.03 });
  chairPost.position.y = -3.6;
  // the gas lift, in black like the rest of the chair
  const gasLift = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.7, 16), toon("#3a3735"), { outline: 0.015 });
  gasLift.position.y = -2.4;
  // The back's bracket: an L under the seat that rises up inside the seat's rear edge, under the
  // back, so none of it pokes through the cushion or shows on the back's rear face
  const backPost = new THREE.Group();
  backPost.add(
    rod(new THREE.Vector3(0, -2.38, 1.1), new THREE.Vector3(0, -2.38, 2.12), 0.14, chairFrameMat, 0.03),
    rod(new THREE.Vector3(0, -2.38, 2.12), new THREE.Vector3(0, -1.88, 2.12), 0.14, chairFrameMat, 0.03),
  );
  // Everything above the gas lift turns on it: seat, back and armrests
  const chairTop = new THREE.Group();
  chairTop.add(chairSeat, seatBase, mechanism, chairBack, backPost);
  chair.add(chairTop, chairPost, gasLift);
  // A five-star base of flat legs sloping down to the casters, each caster a twin wheel under
  // a hood
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const leg = new THREE.Group();
    leg.rotation.y = -angle;
    const bar = mesh(rbox(2.3, 0.2, 0.36, 0.07), chairFrameMat, { outline: 0.025 });
    bar.position.set(1.15, FLOOR_Y + 0.58, 0);
    bar.rotation.z = -0.08;
    const hood = mesh(rbox(0.36, 0.2, 0.42, 0.08), chairFrameMat, { outline: 0.02 });
    hood.position.set(2.25, FLOOR_Y + 0.4, 0);
    leg.add(bar, hood);
    [-0.1, 0.1].forEach((z) => {
      const wheel = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 16), toon("#2b2827"), { outline: 0.015 });
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(2.25, FLOOR_Y + 0.2, z * 1.8);
      leg.add(wheel);
    });
    chair.add(leg);
  }
  chair.add(at(mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.3, 20), chairFrameMat, { outline: 0.02 }), 0, FLOOR_Y + 0.62, 0));
  // 4D armrests: a bracket out from under the seat, a tall slim stem and a flat padded top
  // As the side view has them: a long flat pad well above the seat, on a thick stem that runs
  // down past the seat's underside before turning in beneath it
  for (const x of [-2.8, 2.8]) {
    const bracket = mesh(rbox(1.7, 0.2, 0.5, 0.06), chairFrameMat, { outline: 0.02 });
    bracket.position.set(x * 0.72, -3.05, 0.6);
    const stem = mesh(rbox(0.3, 2.65, 0.46, 0.1), chairFrameMat, { outline: 0.03 });
    stem.position.set(x, -1.78, 0.6);
    const pad = mesh(rbox(0.55, 0.24, 2.7, 0.1), leatherBox, { outline: 0.03 });
    pad.position.set(x, -0.4, 0.4);
    chairTop.add(bracket, stem, pad);
  }
  // The recline hub either side where the back meets the seat: a round cap, a bracket rising
  // from it up the back's side and another running forward under the seat
  for (const side of [-1, 1]) {
    const hub = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.26, 28), chairFrameMat, { outline: 0.025 });
    hub.rotation.z = Math.PI / 2;
    hub.position.set(side * 2.5, -2.45, 1.9);
    const upright = mesh(rbox(0.16, 2.1, 0.75, 0.06), chairFrameMat, { outline: 0.02 });
    upright.position.set(side * 2.47, -1.35, 2.1);
    upright.rotation.x = -0.14;
    const runner = mesh(rbox(0.16, 0.45, 1.8, 0.06), chairFrameMat, { outline: 0.02 });
    runner.position.set(side * 2.47, -2.75, 1.0);
    runner.rotation.x = 0.12;
    chairTop.add(hub, upright, runner);
  }
  // Click it for a spin: the gas lift sinks with a hiss and springs back, the seat whirls round
  // on its post and the whole chair rolls back a little on its casters and back again
  let chairBusy = false;
  // Dragged sideways, the seat turns on its post with the hand, and let go it carries on
  // spinning with the hand's speed, slowing to a stop. It keeps whatever way it ends up facing.
  const CHAIR_TURN_PER_PX = 0.012;
  function grabChair(drag) {
    gsap.killTweensOf(chairTop.rotation);
    Object.assign(drag, { turned: 0, speed: 0, lastX: drag.startX, lastTime: performance.now(), lastSound: 0 });
  }
  function turnChair(drag, x, time) {
    const turn = (x - drag.lastX) * CHAIR_TURN_PER_PX;
    const dt = Math.max(1, time - drag.lastTime);
    // radians a millisecond, smoothed so one jittery event doesn't fling it
    drag.speed = drag.speed * 0.6 + (turn / dt) * 0.4;
    drag.lastX = x;
    drag.lastTime = time;
    drag.turned += turn;
    chairTop.rotation.y += turn;
    if (Math.abs(turn) > 0.02 && time - drag.lastSound > 260) {
      sfx.creak();
      drag.lastSound = time;
    }
  }
  function releaseChair(drag) {
    // a hand that stopped before letting go leaves it still
    const speed = performance.now() - drag.lastTime > 90 ? 0 : THREE.MathUtils.clamp(drag.speed, -0.03, 0.03);
    const coast = speed * 500;
    if (Math.abs(drag.turned + coast) > Math.PI) discover("chair");
    if (Math.abs(coast) < 0.02) return;
    gsap.to(chairTop.rotation, { y: chairTop.rotation.y + coast, duration: 0.6 + Math.abs(speed) * 60, ease: "power3.out" });
    if (Math.abs(coast) > 1.5) sfx.patter({ duration: 0.4 });
  }
  register(chair, {
    grabTurn: true,
    onHover: (on) => {
      if (!on || chairBusy || gsap.isTweening(chairTop.rotation)) return;
      const y = chairTop.rotation.y;
      gsap.fromTo(chairTop.rotation, { y: y + 0.08 }, { y, duration: 0.9, ease: "elastic.out(1, 0.3)" });
    },
    onClick: () => {
      if (chairBusy) return;
      chairBusy = true;
      discover("chair");
      const z = chair.position.z;
      gsap.killTweensOf(chairTop.rotation);
      const y = chairTop.rotation.y;
      gsap.timeline({ onComplete: () => (chairBusy = false) })
        .to(chairTop.position, { y: -0.35, duration: 0.18, ease: "power2.in" })
        .to(chairTop.position, { y: 0, duration: 0.7, ease: "elastic.out(1.1, 0.35)" })
        .fromTo(chairTop.rotation, { y }, { y: y + Math.PI * 2, duration: 1.5, ease: "power3.out" }, 0.12)
        .to(chair.position, { z: z + 0.5, duration: 0.5, ease: "power2.out" }, 0.1)
        .to(chair.position, { z, duration: 0.9, ease: "power2.inOut" }, 0.7);
      sfx.hiss();
      sfx.creak({ delay: 0.15 });
      sfx.patter({ duration: 0.5, delay: 0.1 });
    },
  });

  // ---------- desk lamp (back-left): a light switch for the night shift ----------
  // An Edison bulb lamp: a round walnut base, a black pole that rises from its back and hooks
  // over toward the desk, and a bare amber globe bulb hanging from a black socket, its filament
  // glowing when it's on.
  const lamp = new THREE.Group();
  scene.add(lamp);
  const jointMat = toon("#1a1714");
  const LAMP_BASE = new THREE.Vector3(-5.8, 0, -3.3);
  // Where the socket hangs, over the right of the base
  const SOCKET = new THREE.Vector3(-5.25, 3.35, -3.2);
  const AIM = new THREE.Vector3(-1.8, 0, 0.8);
  const lampBrass = toon("#c9a24a");
  const lampWood = toon("#8b5a34");
  lampWood.map = windowWood.texture;
  // The base: a thick walnut puck with a chamfered top edge, on a thin black felt pad
  const lampBase = mesh(new THREE.CylinderGeometry(0.6, 0.62, 0.18, 36), lampWood, { outline: 0.04 });
  lampBase.position.copy(LAMP_BASE).setY(0.11);
  const lampBaseTop = mesh(new THREE.CylinderGeometry(0.52, 0.6, 0.06, 36), lampWood, { outline: 0.02 });
  lampBaseTop.position.copy(LAMP_BASE).setY(0.23);
  const lampFelt = mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.02, 36), jointMat, { outline: 0.01, cast: false });
  lampFelt.position.copy(LAMP_BASE).setY(0.01);
  // The pole: straight up from the back of the base, a rounded bend over the top, and down to
  // the socket
  const POLE_X = LAMP_BASE.x - 0.4;
  const poleTop = SOCKET.y + 0.45;
  const polePath = new THREE.CurvePath();
  polePath.add(new THREE.LineCurve3(new THREE.Vector3(POLE_X, 0.24, SOCKET.z), new THREE.Vector3(POLE_X, poleTop - 0.35, SOCKET.z)));
  polePath.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(POLE_X, poleTop - 0.35, SOCKET.z), new THREE.Vector3(POLE_X, poleTop, SOCKET.z), new THREE.Vector3(POLE_X + 0.35, poleTop, SOCKET.z)));
  polePath.add(new THREE.LineCurve3(new THREE.Vector3(POLE_X + 0.35, poleTop, SOCKET.z), new THREE.Vector3(SOCKET.x - 0.22, poleTop, SOCKET.z)));
  polePath.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(SOCKET.x - 0.22, poleTop, SOCKET.z), new THREE.Vector3(SOCKET.x, poleTop, SOCKET.z), new THREE.Vector3(SOCKET.x, poleTop - 0.22, SOCKET.z)));
  const pole = mesh(new THREE.TubeGeometry(polePath, 96, 0.055, 12), jointMat, { outline: 0.025 });
  // a lampBrass flange where the pole meets the wood, and a lampBrass ferrule where it meets the socket
  const poleFoot = mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.06, 18), lampBrass, { outline: 0.012 });
  poleFoot.position.set(POLE_X, 0.29, SOCKET.z);
  const poleFerrule = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.1, 16), lampBrass, { outline: 0.01 });
  poleFerrule.position.set(SOCKET.x, poleTop - 0.24, SOCKET.z);
  // The switch: a small black rocker on the base's rim
  const lampButton = at(mesh(rbox(0.12, 0.05, 0.08, 0.02), toon("#2a2523"), { outline: 0.01 }), LAMP_BASE.x + 0.4, 0.2, LAMP_BASE.z + 0.33);
  lamp.add(lampFelt, lampBase, lampBaseTop, pole, poleFoot, poleFerrule, lampButton);
  // The head hangs from the end of the pole: it holds the socket, the bulb and the light, and
  // swings from the pole on hover
  const lampHead = new THREE.Group();
  lampHead.position.copy(SOCKET);
  // A ribbed black socket with a lampBrass turn-key on its side and a lampBrass collar the bulb's
  // neck screws into
  const socket = mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.42, 20), jointMat, { outline: 0.016 });
  const socketRibs = [0.12, 0.04, -0.04, -0.12].map((y) => {
    const rib = mesh(new THREE.TorusGeometry(0.152, 0.014, 6, 24), toon("#2c2826"), { outline: 0 });
    rib.rotation.x = Math.PI / 2;
    rib.position.y = y;
    return rib;
  });
  const turnKeyStem = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 10), lampBrass, { outline: 0.008 });
  turnKeyStem.rotation.z = Math.PI / 2;
  turnKeyStem.position.set(0.19, 0.05, 0);
  const turnKey = mesh(rbox(0.03, 0.12, 0.09, 0.015), lampBrass, { outline: 0.01 });
  turnKey.position.set(0.25, 0.05, 0);
  const bulbCollar = mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.12, 18), lampBrass, { outline: 0.01 });
  bulbCollar.position.y = -0.27;
  const collarThreads = [-0.24, -0.29].map((y) => {
    const thread = mesh(new THREE.TorusGeometry(0.108, 0.01, 6, 20), toon("#9c7a2e"), { outline: 0 });
    thread.rotation.x = Math.PI / 2;
    thread.position.y = y;
    return thread;
  });
  // A G95 globe: a big round bulb on a short neck. The profile is traced from the tip up, so
  // the lathe's faces point outward.
  const BULB_Y = -0.86;
  const BULB_R = 0.5;
  const bulbProfile = [[0, -1.36], [0.17, -1.33], [0.33, -1.24], [0.45, -1.09], [0.5, -0.9], [0.46, -0.72], [0.33, -0.56], [0.17, -0.45], [0.11, -0.4], [0.1, -0.33]].map(([r, y]) => new THREE.Vector2(r, y));
  // Amber glass, flat-shaded like everything else; it brightens when the bulb is on
  const bulbMat = track(new THREE.MeshBasicMaterial({ color: "#ecd3a3" }));
  const bulb = mesh(new THREE.LatheGeometry(bulbProfile, 40), bulbMat, { outline: 0.02, cast: false });
  // A soft white glint across the upper left of the glass
  const glintMat = track(new THREE.MeshBasicMaterial({ color: "#fffaf0", transparent: true, opacity: 0.85 }));
  const bulbGlint = new THREE.Mesh(track(new THREE.TorusGeometry(Math.sqrt(BULB_R ** 2 - 0.36 ** 2), 0.022, 6, 20, 0.9)), glintMat);
  bulbGlint.position.set(0, BULB_Y, 0.36);
  bulbGlint.rotation.z = 1.85;
  bulbGlint.raycast = noRaycast;
  // Inside, drawn over the glass so they show through it: a clear glass stem up the middle and
  // a squirrel-cage filament, six wavy strands strung between a top and a bottom ring
  const filamentMat = track(new THREE.MeshBasicMaterial({ color: "#a8742c", depthTest: false }));
  const bulbStemMat = track(new THREE.MeshBasicMaterial({ color: "#f6ead0", depthTest: false, transparent: true, opacity: 0.8 }));
  const filament = new THREE.Group();
  const bulbStem = new THREE.Mesh(track(new THREE.CylinderGeometry(0.025, 0.04, 0.5, 10)), bulbStemMat);
  bulbStem.position.y = -0.62;
  filament.add(bulbStem);
  const CAGE = { top: -0.62, bottom: -1.08, r: 0.16 };
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const points = Array.from({ length: 9 }, (_, k) => {
      const t = k / 8;
      const wobble = Math.sin(t * Math.PI * 4) * 0.025;
      return new THREE.Vector3(Math.cos(a) * (CAGE.r + wobble), CAGE.top + (CAGE.bottom - CAGE.top) * t, Math.sin(a) * (CAGE.r + wobble));
    });
    filament.add(new THREE.Mesh(track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, 0.01, 4)), filamentMat));
  }
  [CAGE.top, CAGE.bottom].forEach((y) => {
    const ring = new THREE.Mesh(track(new THREE.TorusGeometry(CAGE.r, 0.008, 4, 24)), filamentMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    filament.add(ring);
  });
  filament.children.forEach((part) => {
    part.renderOrder = 2;
    part.raycast = noRaycast;
  });
  // The glow: a halo round the bulb and a warm pool where its light lands on the desk. Their
  // strength follows the light's, so they flicker with it as it comes on.
  const radial = (stops) => {
    const tex = canvasTexture(128, 128);
    track(tex.texture);
    const g = tex.ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(([at, color]) => g.addColorStop(at, color));
    tex.ctx.fillStyle = g;
    tex.ctx.fillRect(0, 0, 128, 128);
    return tex.texture;
  };
  const halo = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: radial([[0, "rgba(255,240,190,1)"], [0.3, "rgba(255,206,110,0.55)"], [1, "rgba(255,190,90,0)"]]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })));
  halo.scale.set(2.6, 2.6, 1);
  halo.position.y = BULB_Y;
  halo.raycast = noRaycast;
  const pool = new THREE.Mesh(
    track(new THREE.PlaneGeometry(4.2, 3.4)),
    track(new THREE.MeshBasicMaterial({ map: radial([[0, "rgba(255,214,130,0.75)"], [0.55, "rgba(255,200,110,0.25)"], [1, "rgba(255,190,100,0)"]]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(AIM.x + 0.2, 0.015, AIM.z - 0.6);
  pool.raycast = noRaycast;
  scene.add(pool);
  function updateLampGlow() {
    const k = Math.min(1, lampLight.intensity / 55);
    // Kept soft, so the bulb reads as a lamp rather than a white blowout
    halo.material.opacity = 0.55 * k;
    pool.material.opacity = 0.5 * k;
    bulbMat.color.setRGB(0.93 + 0.07 * k, 0.83 + 0.06 * k, 0.64 - 0.06 * k);
    filamentMat.color.setRGB(0.66 + 0.34 * k, 0.45 + 0.5 * k, 0.17 + 0.55 * k);
  }
  // The bulb lights the work surface and casts shadows away from the lamp. It sits just below
  // the glass, so the socket can't block it, and looks across at the desk.
  const lampLight = new THREE.SpotLight(0xffd394, 0, 22, 0.95, 0.6, 2);
  lampLight.position.y = BULB_Y - 0.55;
  lampLight.target.position.copy(AIM);
  scene.add(lampLight.target);
  lampLight.shadow.mapSize.set(1024, 1024);
  lampLight.shadow.camera.near = 0.2;
  lampLight.shadow.camera.far = 22;
  lampLight.shadow.bias = -0.0002;
  lampLight.shadow.normalBias = 0.02;
  lampLight.shadow.radius = 9;
  lampHead.add(socket, ...socketRibs, turnKeyStem, turnKey, bulbCollar, ...collarThreads, bulb, bulbGlint, filament, halo, lampLight);
  lamp.add(lampHead);
  const setLamp = (on) => {
    lampLight.intensity = on ? 55 : 0;
    lampLight.castShadow = on;
    updateLampGlow();
  };
  // Switched on, the bulb stutters a couple of times before it settles
  function lampSwitch(on) {
    gsap.killTweensOf(lampLight);
    if (!on) return;
    gsap.timeline()
      .set(lampLight, { intensity: 0 })
      .to(lampLight, { intensity: 40, duration: 0.05 })
      .to(lampLight, { intensity: 4, duration: 0.07 })
      .to(lampLight, { intensity: 30, duration: 0.05, delay: 0.1 })
      .to(lampLight, { intensity: 2, duration: 0.08 })
      .to(lampLight, { intensity: 55, duration: 0.2, delay: 0.12 });
  }
  // Like a desk lamp with a mind of its own: on hover the bulb swings on its pole; on a click
  // the lamp crouches, hops, nods its bulb, and only then throws the switch
  const lampHeadRest = lampHead.rotation.clone();
  let lampHopping = false;
  register(lamp, {
    onHover: (on) => {
      if (lampHopping) return;
      // Swing the hanging bulb; the base and the pole stay put
      gsap.to(lampHead.rotation, { x: lampHeadRest.x + (on ? 0.12 : 0), z: lampHeadRest.z + (on ? 0.22 : 0), duration: on ? 0.32 : 0.6, ease: on ? "power2.out" : "elastic.out(1, 0.4)", overwrite: true });
    },
    onClick: () => {
      if (lampHopping) return;
      lampHopping = true;
      gsap.killTweensOf(lampHead.rotation);
      lampHead.rotation.copy(lampHeadRest);
      discover("lamp");
      gsap.timeline({ onComplete: () => (lampHopping = false) })
        .to(lamp.scale, { y: 0.88, duration: 0.12, ease: "power2.in" })
        .to(lamp.scale, { y: 1.06, duration: 0.15, ease: "power2.out" })
        .to(lamp.position, { y: 0.55, duration: 0.18, ease: "power2.out" }, "<")
        .to(lamp.position, { y: 0, duration: 0.2, ease: "power2.in" })
        .call(() => sfx.knock({ strength: 0.5 }))
        .to(lamp.scale, { y: 1, duration: 0.35, ease: "elastic.out(1.2, 0.4)" })
        .to(lampHead.rotation, { z: lampHeadRest.z - 0.25, duration: 0.12, yoyo: true, repeat: 3, ease: "sine.inOut" }, "<")
        .call(() => {
          sfx.click();
          onEvent("nightShift", { dark: !darkNow });
        });
      sfx.pop({ pitch: 1.2 });
    },
  });

  // Family keepsake: the anime-style family portrait in a chunky dark walnut frame with a thin
  // black lip, an off-white mat round the photo, a brushed brass plate on the bottom rail and
  // corner keys, on a black easel leg.
  const familyFrame = new THREE.Group();
  familyFrame.position.set(-4.55, 0, -3.05);
  familyFrame.scale.setScalar(0.8);
  familyFrame.rotation.set(-0.08, 0.08, 0);
  const FY = 1.08;
  // The window's wood grain, stained dark
  const walnut = toon("#7a5338");
  walnut.map = windowWood.texture;
  const frameBrass = toon("#c9a24a");
  const frameBack = mesh(rbox(1.36, 2.08, 0.1, 0.04), walnut, { outline: 0.018 });
  frameBack.position.y = FY;
  familyFrame.add(frameBack);
  // the moulding: four squared bars standing proud, with a thin black lip inside them
  [[0, 0.96, 1.36, 0.16], [0, -0.96, 1.36, 0.16], [0.6, 0, 0.16, 1.76], [-0.6, 0, 0.16, 1.76]].forEach(([x, y, w, h]) => {
    familyFrame.add(at(mesh(rbox(w, h, 0.16, 0.025), walnut, { outline: 0.014 }), x, FY + y, 0.05));
  });
  [[0, 0.875, 1.06, 0.025], [0, -0.875, 1.06, 0.025], [0.515, 0, 0.025, 1.74], [-0.515, 0, 0.025, 1.74]].forEach(([x, y, w, h]) => {
    familyFrame.add(at(mesh(rbox(w, h, 0.04, 0.008), toon("#1a1714"), { outline: 0.006 }), x, FY + y, 0.075));
  });
  // off-white mat, a thin ink edge and the photo
  const frameMat = new THREE.Mesh(track(new THREE.PlaneGeometry(1.03, 1.75)), track(new THREE.MeshBasicMaterial({ color: "#f4f1ea" })));
  frameMat.position.set(0, FY, 0.056);
  const photoBorder = new THREE.Mesh(track(new THREE.PlaneGeometry(0.92, 1.69)), track(new THREE.MeshBasicMaterial({ color: "#171717" })));
  photoBorder.position.set(0, FY, 0.06);
  const familyPhoto = printed(0.88, 1.65, 409, drawFamilyPortrait);
  familyPhoto.position.set(0, FY, 0.064);
  familyFrame.add(frameMat, photoBorder, familyPhoto);
  // brass corner keys where the rails meet
  [[-0.6, 0.96], [0.6, 0.96], [-0.6, -0.96], [0.6, -0.96]].forEach(([x, y]) => {
    familyFrame.add(at(mesh(rbox(0.09, 0.09, 0.02, 0.01), frameBrass, { outline: 0.006 }), x, FY + y, 0.135));
  });
  // a brushed brass plate on the bottom rail
  const plate = printed(0.4, 0.085, 700, (c, w, h) => {
    const sheen = c.createLinearGradient(0, 0, w, 0);
    sheen.addColorStop(0, "#b8913c");
    sheen.addColorStop(0.5, "#e6c873");
    sheen.addColorStop(1, "#b8913c");
    c.fillStyle = sheen;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#6e5420";
    c.lineWidth = h * 0.1;
    c.strokeRect(0, 0, w, h);
    c.fillStyle = "#3d2e10";
    c.font = `800 ${Math.round(h * 0.5)}px 'Space Grotesk', sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("THE FAMILY", w / 2, h * 0.55);
  });
  plate.position.set(0, FY - 0.96, 0.132);
  familyFrame.add(plate);
  // the easel stand behind it
  const easel = toon("#1a1714");
  const frameFoot = mesh(rbox(1.12, 0.07, 0.65, 0.02), easel, { outline: 0.016 });
  frameFoot.position.set(0, 0.035, -0.12);
  const frameLeg = mesh(rbox(0.14, 1.15, 0.12, 0.02), easel, { outline: 0.012 });
  frameLeg.position.set(0, 0.6, -0.31);
  frameLeg.rotation.x = -0.42;
  familyFrame.add(frameFoot, frameLeg);
  scene.add(familyFrame);
  register(familyFrame, {
    focus: "family",
    onHover: (on) => gsap.to(familyFrame.rotation, { x: on ? -0.015 : -0.08, y: on ? 0.14 : 0.08, duration: 0.35, ease: "power2.out", overwrite: true }),
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
  // The pot: speckled glazed terracotta, wheel rings up its wall, standing in a shallow saucer.
  // The lathe's uv runs one step of the profile to each seventh: its wall is the second, the
  // rim's outer face the fourth.
  const potTex = canvasTexture(256, 256);
  track(potTex.texture);
  drawTerracotta(potTex.ctx, 256, 256, { wall: [1 / 7, 2 / 7], rim: [3 / 7, 4 / 7] });
  potTex.texture.wrapS = THREE.RepeatWrapping;
  potTex.texture.repeat.set(3, 1);
  const potMat = toon("#ffffff");
  potMat.map = potTex.texture;
  const pot = mesh(new THREE.LatheGeometry(potProfile, 36), potMat, { outline: 0.045 });
  pot.position.y = 0.03;
  const saucerProfile = [[0, 0], [0.62, 0], [0.7, 0.12], [0.64, 0.12], [0.57, 0.035], [0, 0.035]].map(([x, y]) => new THREE.Vector2(x, y));
  const saucer = mesh(new THREE.LatheGeometry(saucerProfile, 36), toon("#e0631a"), { outline: 0.03 });
  const soil = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 24), toon("#3b2a1a"), { outline: 0, cast: false });
  soil.position.y = 1.05;
  const foliage = new THREE.Group();
  foliage.position.y = 1.05;
  // a touch smaller than the pot would grow it, so the leaves clear the wall behind
  foliage.scale.setScalar(0.85);
  plant.add(saucer, pot, soil, foliage);
  const stemMat = toon("#166534");
  // Each leaf colouring is its own painted texture: [base, tip, vein]; the last is the young
  // leaves' fresh lime
  const leafMats = [
    ["#166534", "#22c55e", "#a7f3c0"], ["#15803d", "#4ade80", "#bbf7d0"], ["#2f7d43", "#8fd694", "#dcfce7"], ["#4d9c2f", "#a3e66b", "#ecfccb"],
  ].map(([base, tip, vein]) => {
    const tex = canvasTexture(256, 256);
    track(tex.texture);
    drawPlantLeaf(tex.ctx, 256, 256, { base, tip, vein });
    const material = toon("#ffffff");
    material.map = tex.texture;
    return material;
  });
  // A leaf blade as a thin solid: a teardrop outline, folded up a little either side of its
  // midrib, arching back so its tip droops. Built along +y with its
  // upper face toward -z; uv runs edge to edge across it and base to tip along it.
  const leafGeo = (length, width, { fold = 0.3, arch = 0.22 } = {}) => {
    const ROWS = 22;
    const COLS = 10;
    const THICK = 0.012;
    const halfWidth = (t) => (width / 2) * Math.sin(Math.PI * t ** 0.72);
    const position = [];
    const uv = [];
    const index = [];
    for (const side of [-1, 1]) {
      for (let j = 0; j <= ROWS; j++) {
        const t = j / ROWS;
        for (let i = 0; i <= COLS; i++) {
          const u = (i / COLS) * 2 - 1;
          const x = u * halfWidth(t);
          const z = -fold * Math.abs(x) + arch * length * t * t;
          position.push(x, t * length, z + side * THICK);
          uv.push((u + 1) / 2, t);
        }
      }
    }
    const at = (side, i, j) => (side < 0 ? 0 : (ROWS + 1) * (COLS + 1)) + j * (COLS + 1) + i;
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        // the upper face looks toward -z, the lower toward +z
        index.push(at(-1, i, j), at(-1, i, j + 1), at(-1, i + 1, j), at(-1, i + 1, j), at(-1, i, j + 1), at(-1, i + 1, j + 1));
        index.push(at(1, i, j), at(1, i + 1, j), at(1, i, j + 1), at(1, i + 1, j), at(1, i + 1, j + 1), at(1, i, j + 1));
      }
      // its thin edges either side
      index.push(at(-1, 0, j), at(1, 0, j), at(-1, 0, j + 1), at(1, 0, j), at(1, 0, j + 1), at(-1, 0, j + 1));
      index.push(at(-1, COLS, j), at(-1, COLS, j + 1), at(1, COLS, j), at(1, COLS, j), at(-1, COLS, j + 1), at(1, COLS, j + 1));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(index);
    geo.computeVertexNormals();
    return geo;
  };
  // Teardrop leaves, each on its own stem: the stem runs from the soil to the leaf's base, and the
  // leaf leans out from there toward its heading, rolled a little about its own length. The big
  // ones, then a few small young ones in the middle, more upright.
  // [heading°, base height, lean, length, width, colouring]
  [
    [20, 0.3, 0.85, 1.5, 0.62, 0], [100, 0.4, 0.8, 1.6, 0.6, 1], [170, 0.5, 0.7, 1.5, 0.58, 2], [250, 0.35, 0.85, 1.6, 0.62, 0],
    [320, 0.55, 0.65, 1.4, 0.56, 1], [60, 0.7, 0.45, 1.35, 0.52, 2], [210, 0.8, 0.4, 1.35, 0.52, 1],
    [140, 0.9, 0.3, 0.7, 0.3, 3], [290, 0.95, 0.32, 0.65, 0.28, 3], [30, 1.05, 0.22, 0.55, 0.25, 3],
  ].forEach(([heading, height, lean, length, width, colouring], i) => {
    const angle = THREE.MathUtils.degToRad(heading);
    const young = length < 1;
    const base = new THREE.Vector3(Math.sin(angle) * 0.16, height, Math.cos(angle) * 0.16);
    foliage.add(rod(new THREE.Vector3(0, 0, 0), base, young ? 0.024 : 0.035, stemMat, 0.015));
    const leaf = new THREE.Group();
    leaf.position.copy(base);
    leaf.rotation.set(lean, angle, (((i * 37) % 7) - 3) * 0.07, "YXZ");
    const shape = young ? { fold: 0.45, arch: 0.08 } : { fold: 0.25 + (i % 3) * 0.05, arch: 0.18 + (i % 4) * 0.03 };
    leaf.add(mesh(leafGeo(length, width, shape), leafMats[colouring], { outline: young ? 0.018 : 0.025 }));
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
    // A tiny flutter on each downstroke, fading in as it arrives and out as it leaves
    if (flap < 0 && flight.lastFlap >= 0) sfx.wingFlap({ volume: arrive * (1 - Math.min(1, leave / 1.6)) });
    flight.lastFlap = flap;
    if (leave > 1.6) {
      flight.active = false;
      butterfly.visible = false;
    }
  }
  function callButterfly() {
    discover("butterfly");
    if (flight.active) return;
    flight.active = true;
    flight.t = 0;
    butterfly.visible = true;
    sfx.bloom({ pitch: 1.8 });
    // the cat's after it at once
    timers.push(setTimeout(catChaseButterfly, 700));
  }

  register(plant, {
    onHover: (on) => gsap.to(foliage.rotation, { z: on ? 0.12 : 0, duration: on ? 0.3 : 0.65, ease: "power2.out", overwrite: true }),
    onClick: () => {
      gsap.fromTo(foliage.rotation, { z: 0.15 }, { z: 0, duration: 1.4, ease: "elastic.out(1, 0.25)", overwrite: true });
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
  shelf.position.set(10.5, FLOOR_Y, WALL_Z + 0.83);
  scene.add(shelf);
  const SHELF_W = 4.2;
  const SHELF_D = 1.5;
  const SHELF_H = 8.4;
  let shelfLook = 1.7;
  const BOARD = 0.22;
  // Oak with a visible grain (the desk's wood print, toned warmer and deeper)
  const shelfWood = canvasTexture(512, 512);
  track(shelfWood.texture);
  drawWoodTop(shelfWood.ctx, 512, 512);
  const shelfMat = toon("#f3d3b0");
  shelfMat.map = shelfWood.texture;
  [-1, 1].forEach((side) => {
    const panel = mesh(rbox(BOARD, SHELF_H, SHELF_D, 0.04), shelfMat, { outline: 0.05 });
    panel.position.set(side * (SHELF_W / 2 - BOARD / 2), SHELF_H / 2, 0);
    shelf.add(panel);
  });
  // The back panel and the shelves' front lips share the oak grain, toned a little deeper
  const shelfBackMat = toon("#d9a878");
  shelfBackMat.map = shelfWood.texture;
  const shelfBack = mesh(rbox(SHELF_W, SHELF_H, 0.12, 0.03), shelfBackMat, { outline: 0.04 });
  shelfBack.position.set(0, SHELF_H / 2, -SHELF_D / 2 + 0.06);
  shelf.add(shelfBack);
  const LEVELS = [0.15, 2.25, 4.35, 6.4, SHELF_H - BOARD / 2];
  const lipMat = toon("#e2b384");
  lipMat.map = shelfWood.texture;
  // Recessed diffusers sit flush under the rear of each shelf; all bays share one colour.
  const glowTex = canvasTexture(256, 128);
  track(glowTex.texture);
  const glowGrad = glowTex.ctx.createLinearGradient(0, 0, 0, 128);
  glowGrad.addColorStop(0, "rgba(255,255,255,0.65)");
  glowGrad.addColorStop(1, "rgba(255,255,255,0)");
  glowTex.ctx.fillStyle = glowGrad;
  glowTex.ctx.fillRect(0, 0, 256, 128);
  const edgeFade = glowTex.ctx.createLinearGradient(0, 0, 256, 0);
  edgeFade.addColorStop(0, "transparent");
  edgeFade.addColorStop(0.08, "white");
  edgeFade.addColorStop(0.92, "white");
  edgeFade.addColorStop(1, "transparent");
  glowTex.ctx.globalCompositeOperation = "destination-in";
  glowTex.ctx.fillStyle = edgeFade;
  glowTex.ctx.fillRect(0, 0, 256, 128);
  glowTex.ctx.globalCompositeOperation = "source-over";
  const shelfLeds = [];
  LEVELS.forEach((y, i) => {
    const board = mesh(rbox(SHELF_W, BOARD, SHELF_D, 0.04), shelfMat, { outline: 0.045 });
    board.position.y = y;
    const lip = mesh(rbox(SHELF_W - BOARD * 2, BOARD + 0.06, 0.08, 0.02), lipMat, { outline: 0.02 });
    lip.position.set(0, y, SHELF_D / 2 - 0.02);
    shelf.add(board, lip);
    if (i === 0) return;
    const channel = mesh(rbox(3.7, 0.055, 0.12, 0.015), toon("#454b50"), { outline: 0.008, cast: false });
    channel.position.set(0, y - BOARD / 2 - 0.0275, -0.48);
    channel.raycast = noRaycast;
    const ledMat = track(new THREE.MeshBasicMaterial({ color: "#c4cece" }));
    const strip = new THREE.Mesh(track(new THREE.BoxGeometry(3.6, 0.018, 0.045)), ledMat);
    strip.position.set(0, y - BOARD / 2 - 0.055, -0.435);
    strip.raycast = noRaycast;
    const glowMat = track(new THREE.MeshBasicMaterial({ map: glowTex.texture, color: "#70e5e0", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    const glow = new THREE.Mesh(track(new THREE.PlaneGeometry(3.7, 1.6)), glowMat);
    glow.position.set(0, y - BOARD / 2 - 0.8, -0.619);
    glow.raycast = noRaycast;
    shelf.add(channel, strip, glow);
    shelfLeds.push({ ledMat, glowMat });
  });
  // The LEDs' colour on the shelves, party hues included: one light per two compartments, level
  // with the board between them (every light is paid for on every pixel, so they're kept few).
  // Held out in front of the shelf: toon shading lights a face even from behind, so a light
  // inside the board burnt a bright disc onto its top.
  const shelfLights = [LEVELS[1], LEVELS[3]].map((y) => {
    const light = neonLight("#70e5e0", 3.2, () => shelfLeds[0].glowMat.opacity / 0.5, { distance: 3.6 });
    light.position.set(0, y, SHELF_D / 2 + 0.55);
    shelf.add(light);
    return light;
  });
  const ledColor = new THREE.Color();
  let ledPartyUntil = 0;
  function updateShelfLeds(now) {
    const party = now < ledPartyUntil;
    ledColor.set(party ? "#ff90e8" : "#70e5e0");
    if (party) ledColor.setHSL((now / 1000) % 1, 0.8, 0.65);
    shelfLights.forEach((light) => light.color.copy(ledColor));
    shelfLeds.forEach(({ ledMat, glowMat }) => {
      ledMat.color.set(darkNow || party ? ledColor : "#c4cece");
      glowMat.color.copy(ledColor);
      glowMat.opacity = party ? 0.7 : darkNow ? 0.5 : 0;
    });
  }
  // A neon sign on the back panel above the console: "GAME ON" with a little controller. By
  // day its glass tubes sit unlit; at night it flickers on and glows
  const NEON = { w: 1.9, h: 0.655 };
  const neonSign = (lit) => {
    const t = canvasTexture(1160, 400);
    track(t.texture);
    const c = t.ctx;
    const tube = (color, draw) => {
      if (lit) {
        c.shadowColor = color;
        c.shadowBlur = 34;
        c.strokeStyle = color;
        c.lineWidth = 16;
        draw();
        c.shadowBlur = 0;
        c.strokeStyle = "rgba(255,255,255,.9)";
        c.lineWidth = 5;
        draw();
      } else {
        c.strokeStyle = "rgba(255,255,255,.55)";
        c.lineWidth = 10;
        draw();
        c.strokeStyle = "rgba(26,23,20,.35)";
        c.lineWidth = 2;
        draw();
      }
    };
    c.lineCap = "round";
    c.lineJoin = "round";
    // the controller: a rounded body, a D-pad and two buttons
    tube("#00e0ff", () => {
      c.beginPath();
      c.roundRect(60, 120, 300, 170, 80);
      c.moveTo(140, 175);
      c.lineTo(140, 235);
      c.moveTo(110, 205);
      c.lineTo(170, 205);
      c.moveTo(285, 185);
      c.arc(270, 185, 15, 0, Math.PI * 2);
      c.moveTo(325, 225);
      c.arc(310, 225, 15, 0, Math.PI * 2);
      c.stroke();
    });
    c.font = "900 170px 'Lexend Mega', sans-serif";
    c.textBaseline = "middle";
    tube("#ff3fd2", () => c.strokeText("GAME", 410, 140));
    tube("#ffe14d", () => c.strokeText("ON", 410, 300));
    return t.texture;
  };
  const neonOff = new THREE.Mesh(track(new THREE.PlaneGeometry(NEON.w, NEON.h)), track(new THREE.MeshBasicMaterial({ map: neonSign(false), transparent: true, depthWrite: false })));
  const neonOn = new THREE.Mesh(track(new THREE.PlaneGeometry(NEON.w, NEON.h)), track(new THREE.MeshBasicMaterial({ map: neonSign(true), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })));
  [neonOff, neonOn].forEach((plane, i) => {
    // low enough that the shelf above doesn't hide its top from the room
    plane.position.set(0.1, (LEVELS[0] + LEVELS[1]) / 2 + 0.22, -SHELF_D / 2 + 0.14 + i * 0.01);
    plane.raycast = noRaycast;
    shelf.add(plane);
  });
  // The sign's magenta-violet spill: on the console and the shelf, with the shelf's things
  // casting back onto the panel
  const signLight = neonLight("#d86bff", 3.5, () => neonOn.material.opacity, { distance: 4, shadow: true });
  signLight.position.set(0.1, neonOn.position.y, neonOn.position.z + 0.45);
  shelf.add(signLight);
  // Night: a couple of stuttering flickers, then on. Day: off.
  function setNeon(on, instant = false) {
    gsap.killTweensOf(neonOn.material);
    if (instant || !on) return gsap.to(neonOn.material, { opacity: on ? 1 : 0, duration: instant ? 0 : 0.3 });
    gsap.timeline()
      .to(neonOn.material, { opacity: 0.8, duration: 0.05, delay: 0.4 })
      .to(neonOn.material, { opacity: 0, duration: 0.08 })
      .to(neonOn.material, { opacity: 0.6, duration: 0.05, delay: 0.15 })
      .to(neonOn.material, { opacity: 0.1, duration: 0.1 })
      .to(neonOn.material, { opacity: 1, duration: 0.15, delay: 0.2 });
    sfx.hiss({ delay: 0.4 });
  }
  setNeon(dark, true);
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
  // ---------- secrets: every hidden interaction found, kept on the trophy's plate ----------
  const SECRETS = ["snap", "katana", "rat", "catKeys", "rain", "star", "lamp", "painting", "chair", "guitar", "luffy", "clock", "butterfly", "lofi", "badge", "gymPR", "konami", "console", "robot", "trash"];
  // What the trophy hints at, one at a time, for the secrets still to find
  const SECRET_HINTS = {
    snap: "a golden glove wants to snap",
    katana: "a blade waits on top of the shelf",
    rat: "something on the desk has a tail",
    catKeys: "pester the cat, three times",
    rain: "knock on the window, three times fast",
    star: "at night, look out of the window",
    lamp: "the lamp is shy, but bouncy",
    painting: "art changes when you touch it",
    chair: "give the chair a spin",
    guitar: "those strings want strumming",
    luffy: "a straw hat made of rubber",
    clock: "turn back time",
    butterfly: "make every bud on the plant bloom",
    lofi: "put some music on the monitor",
    badge: "turn the badge over",
    gymPR: "ten reps, no rest",
    konami: "an old cheat code, it starts up, up...",
    console: "press start",
    robot: "the little robot likes attention: five pokes",
    trash: "beside the shelf: three in a row, nothing but net",
  };
  // Local-only preview; all secrets exist for this scene without touching saved progress.
  const previewTrophy = process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("preview") === "trophy";
  const secretsFound = new Set((() => {
    if (previewTrophy) return SECRETS;
    try {
      return JSON.parse(localStorage.getItem("desk-secrets") || "[]").filter((id) => SECRETS.includes(id));
    } catch {
      return [];
    }
  })());
  function discover(id) {
    if (secretsFound.has(id) || !SECRETS.includes(id)) return;
    secretsFound.add(id);
    try {
      localStorage.setItem("desk-secrets", JSON.stringify([...secretsFound]));
    } catch {
      // Still counted for this visit
    }
    trophyPlate.userData.tex.redraw();
    onEvent("secret", { found: secretsFound.size, total: SECRETS.length });
    if (secretsFound.size === SECRETS.length) timers.push(setTimeout(celebrateSecrets, 1200));
  }
  // All of them: the trophy lights up gold and throws confetti
  function celebrateSecrets() {
    // First bring the camera to the trophy (the last secret is often found elsewhere, or with
    // the arrow keys that scroll the shelf), then the bubble once it's still
    trophy.getWorldPosition(shelfBubbleAt);
    const lookY = shelfBubbleAt.y + 0.6;
    const there = focus.name === "shelf";
    if (there) browseShelf(shelfLookAt(lookY));
    else setFocus("shelf", { point: new THREE.Vector3(shelfBubbleAt.x, lookY, shelfBubbleAt.z) });
    // (the bubble picks its side from where the camera is, so wait until it has stopped)
    const whenStill = () => {
      if (destroyed) return;
      if (gsap.isTweening(cam)) timers.push(setTimeout(whenStill, 100));
      else cheerTrophy();
    };
    timers.push(setTimeout(whenStill, there ? 500 : 300));
  }
  function cheerTrophy() {
    if (trophyCelebrating) return;
    trophyCelebrating = true;
    shelfBubble.hide();
    ledPartyUntil = performance.now() + 6500;
    trophy.getWorldPosition(shelfBubbleAt);
    trophyHalo.position.copy(shelfBubbleAt).add(new THREE.Vector3(0, 0.9, -0.2));
    trophyHalo.visible = true;
    gsap.fromTo(trophyHalo.material, { opacity: 0 }, { opacity: 0.65, duration: 0.5, overwrite: true });
    gsap.fromTo(trophyHalo.scale, { x: 1.2, y: 1.2 }, { x: 3.4, y: 3.4, duration: 1, ease: "power2.out", overwrite: true });
    gsap.killTweensOf([trophy.position, trophy.rotation, trophy.scale, trophyGold.emissive]);
    const restY = trophy.userData.restY;
    trophyCelebration = gsap.timeline({ onComplete: () => { trophyCelebrating = false; } })
      .to(trophy.position, { y: restY + 0.18, duration: 0.6, ease: "power2.out" })
      .to(trophy.rotation, { y: Math.PI * 2, duration: 1.5, ease: "power2.inOut" }, 0.25)
      .fromTo(trophyGold.emissive, { r: 0, g: 0, b: 0 }, { r: 0.6, g: 0.35, b: 0.04, duration: 0.5 }, 0)
      .call(() => {
        // Align the emitter above the bowl in screen space, then bring it in front of the shelf.
        trophy.localToWorld(shelfBubbleAt.set(0, 1.38, 0));
        const towardCamera = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
        const frontZ = shelf.position.z + SHELF_D / 2 + 0.25;
        shelfBubbleAt.addScaledVector(towardCamera, Math.max(0, frontZ - shelfBubbleAt.z) / towardCamera.z);
        burst(shelfBubbleAt.x, shelfBubbleAt.y, shelfBubbleAt.z, true);
        sfx.sparkle();
        sfx.cheer();
        sfx.applause({ delay: 0.2 });
        shelfSay(trophy, `${SECRETS.length}/${SECRETS.length} SECRETS FOUND!`, "master of the desk", 6000);
      }, null, 0.65)
      .to(trophy.position, { y: restY, duration: 0.6, ease: "bounce.out" }, 2.1)
      .set(trophy.rotation, { y: 0 }, 2.7)
      .to(trophyGold.emissive, { r: 0, g: 0, b: 0, duration: 1.5 }, 3.2)
      .to(trophyHalo.material, { opacity: 0, duration: 1.5, onComplete: () => { trophyHalo.visible = false; } }, 3.2);
  }

  const PALETTE = ["#ff6b6b", "#ffdd00", "#00e0c6", "#ff90e8", "#8fd694", "#3b82f6", "#ffb35c", "#c4b5fd", "#fffdf5"];
  const black = toon("#1a1714");
  const white = toon("#fffdf5");

  // Level 0: a PS5 Pro standing on its end, after the reference photo. A gloss-black core
  // between two white side panels, each a tall sweep that flares out at its top front and is
  // cut across the middle by three black fins; a blue light runs up the front edges of the
  // core, and the whole thing stands on a round silver foot.
  const PS_H = 1.62;
  const PS_D = 0.86;
  const CORE_T = 0.26;
  const PANEL_T = 0.055;
  const psWhite = toon("#ffffff");
  // A side panel's outline, in (z, y): back edge straight, front edge leaning in a little up
  // to the fins, then flaring out past the core toward the top
  const panelGeo = (() => {
    const z0 = -PS_D / 2;
    const z1 = PS_D / 2;
    const shape = new THREE.Shape();
    shape.moveTo(z0 + 0.04, 0);
    shape.lineTo(z1 - 0.06, 0);
    shape.quadraticCurveTo(z1 - 0.03, 0, z1 - 0.035, 0.05);
    shape.quadraticCurveTo(z1 - 0.14, PS_H * 0.45, z1 - 0.02, PS_H * 0.8);
    shape.quadraticCurveTo(z1 + 0.1, PS_H * 0.97, z1 + 0.01, PS_H);
    shape.quadraticCurveTo(0, PS_H * 1.035, z0 + 0.03, PS_H * 0.985);
    shape.quadraticCurveTo(z0, PS_H * 0.98, z0, PS_H * 0.95);
    shape.lineTo(z0, 0.04);
    shape.quadraticCurveTo(z0, 0, z0 + 0.04, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: PANEL_T, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 14 });
    // The shape is drawn in x/y: turn it so its width runs along z and it's extruded along x
    geo.rotateY(-Math.PI / 2);
    geo.translate(PANEL_T / 2, 0, 0);
    return geo;
  })();
  const consoleBody = new THREE.Group();
  const core = at(mesh(rbox(CORE_T, PS_H * 0.95, PS_D * 0.9, 0.04), black, { outline: 0.016 }), 0, PS_H * 0.475 + 0.01, -0.01);
  consoleBody.add(core);
  // The three fins: black slats across each panel's face, slanting up toward the front
  const FINS = [0.4, 0.445, 0.49];
  [-1, 1].forEach((side) => {
    const x = side * (CORE_T / 2 + PANEL_T / 2 + 0.004);
    const panel = at(mesh(panelGeo, psWhite, { outline: 0.016 }), x, 0, 0);
    consoleBody.add(panel);
    FINS.forEach((k, i) => {
      const fin = mesh(rbox(0.02, 0.028, PS_D * (0.98 - i * 0.02), 0.01), black, { outline: 0.006, cast: false });
      fin.position.set(x + side * (PANEL_T / 2 + 0.008), PS_H * k, 0.01);
      fin.rotation.x = -0.16;
      consoleBody.add(fin);
    });
  });
  // The blue light, up the front edge of the core on either side
  const led = new THREE.Group();
  const ledMat = track(new THREE.MeshBasicMaterial({ color: "#4f6bff" }));
  led.material = ledMat;
  [-1, 1].forEach((side) => {
    const strip = new THREE.Mesh(track(new THREE.BoxGeometry(0.014, PS_H * 0.82, 0.014)), ledMat);
    strip.position.set(side * (CORE_T / 2 - 0.012), PS_H * 0.48, PS_D * 0.45 - 0.004);
    led.add(strip);
  });
  // The LED's glow on the shelf round the console, blue in standby and brighter once it boots
  const consoleLight = neonLight("#4f6bff", 0.6, () => (darkNow ? 1 : 0.4), { distance: 1.8, tint: ledMat });
  consoleLight.position.set(0, PS_H * 0.5, PS_D * 0.45 + 0.2);
  led.add(consoleLight);
  consoleBody.add(led);
  // PlayStation logo, small, near the top front of the left panel
  const psLogo = printed(0.075, 0.075, 1200, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = "#3a3f48";
    c.lineWidth = w * 0.09;
    c.lineCap = "round";
    c.lineJoin = "round";
    const px = w * 0.38;
    c.beginPath();
    c.moveTo(px, h * 0.7);
    c.lineTo(px, h * 0.18);
    c.bezierCurveTo(w * 0.75, h * 0.16, w * 0.75, h * 0.44, px, h * 0.45);
    c.stroke();
    c.beginPath();
    c.moveTo(px, h * 0.64);
    c.bezierCurveTo(w * 0.68, h * 0.6, w * 0.76, h * 0.72, w * 0.58, h * 0.8);
    c.bezierCurveTo(w * 0.36, h * 0.88, w * 0.46, h * 0.94, w * 0.7, h * 0.9);
    c.stroke();
  });
  psLogo.material.transparent = true;
  psLogo.material.alphaTest = 0.05;
  psLogo.rotation.y = -Math.PI / 2;
  psLogo.position.set(-(CORE_T / 2 + PANEL_T + 0.022), PS_H * 0.86, PS_D * 0.3);
  consoleBody.add(psLogo);
  consoleBody.position.y = 0.067;
  // Its round foot: a brushed silver disc with a dark rim
  const psFoot = group(
    at(mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.035, 36), toon("#2a2d33"), { outline: 0.012 }), 0, 0.0175, 0),
    at(mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.02, 36), toon("#c9ced6"), { outline: 0 }), 0, 0.045, 0),
  );
  psFoot.scale.z = 1.6;
  const ps5 = addItem(at(group(psFoot, consoleBody), -1.5, standOn(0), 0.05), "console");
  // Turned three-quarters on to the room, so its white side shows as well as its front
  ps5.rotation.y = -0.5;
  const controller = (color) => {
    // One continuous silhouette, with tapered grips instead of overlapping blocks.
    const outline = new THREE.Shape();
    outline.moveTo(-0.4, 0.23);
    outline.quadraticCurveTo(-0.5, 0.26, -0.54, 0.08);
    outline.bezierCurveTo(-0.58, -0.05, -0.64, -0.34, -0.51, -0.37);
    outline.quadraticCurveTo(-0.43, -0.4, -0.29, -0.18);
    outline.quadraticCurveTo(-0.23, -0.11, -0.16, -0.13);
    outline.lineTo(0.16, -0.13);
    outline.quadraticCurveTo(0.23, -0.11, 0.29, -0.18);
    outline.quadraticCurveTo(0.43, -0.4, 0.51, -0.37);
    outline.bezierCurveTo(0.64, -0.34, 0.58, -0.05, 0.54, 0.08);
    outline.quadraticCurveTo(0.5, 0.26, 0.4, 0.23);
    outline.closePath();
    const bodyGeo = new THREE.ExtrudeGeometry(outline, { depth: 0.12, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3, curveSegments: 16, steps: 1 });
    bodyGeo.translate(0, 0, -0.06);
    bodyGeo.rotateX(-Math.PI / 2);
    const light = color !== "#1a1714";
    const body = toon(color);
    const pad = group(mesh(bodyGeo, body, { outline: 0.016 }));
    // Modern-gamepad layout (as in the reference): offset sticks, the left one up top beside a
    // d-pad below; colour-coded face buttons; a round home button and three small ones between
    const TOP = 0.087;
    // Sticks and d-pad in a contrasting grey on each pad, so they read at shelf distance
    const knob = toon(light ? "#43474e" : "#4a4f57");
    const well = toon(light ? "#9aa1ab" : "#0b0c0e");
    const stick = (x, z) => {
      pad.add(at(mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.01, 28), well, { outline: 0 }), x, TOP + 0.004, z));
      pad.add(at(mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.05, 16), knob, { outline: 0.006 }), x, TOP + 0.03, z));
      pad.add(at(mesh(new THREE.CylinderGeometry(0.068, 0.066, 0.026, 28), knob, { outline: 0.012 }), x, TOP + 0.062, z));
      const rim = mesh(new THREE.TorusGeometry(0.056, 0.012, 8, 28), toon(light ? "#2a2d32" : "#6b717a"), { outline: 0 });
      rim.rotation.x = Math.PI / 2;
      pad.add(at(rim, x, TOP + 0.076, z));
    };
    stick(-0.3, -0.04);
    stick(0.14, 0.11);
    // d-pad in its dish
    pad.add(at(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.01, 28), well, { outline: 0 }), -0.14, TOP + 0.004, 0.11));
    pad.add(at(mesh(rbox(0.14, 0.03, 0.046, 0.01), knob, { outline: 0.01 }), -0.14, TOP + 0.02, 0.11));
    pad.add(at(mesh(rbox(0.046, 0.03, 0.14, 0.01), knob, { outline: 0.01 }), -0.14, TOP + 0.02, 0.11));
    // face buttons: caps in their colours with the letter in dark ink, big enough to read
    [[0, -0.075, "Y", "#ffd400"], [0.075, 0, "B", "#ef3b3b"], [0, 0.075, "A", "#3fbf4f"], [-0.075, 0, "X", "#2f7cf6"]].forEach(([dx, dz, letter, cap]) => {
      pad.add(at(mesh(new THREE.CylinderGeometry(0.036, 0.038, 0.03, 20), toon(cap), { outline: 0.01 }), 0.3 + dx, TOP + 0.015, -0.04 + dz));
      const label = printed(0.06, 0.06, 1200, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.fillStyle = "#1a1714";
        c.font = `800 ${w * 0.62}px 'Space Grotesk', sans-serif`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(letter, w / 2, h * 0.55);
      });
      label.material.transparent = true;
      label.material.alphaTest = 0.1;
      label.rotation.x = -Math.PI / 2;
      label.position.set(0.3 + dx, TOP + 0.031, -0.04 + dz);
      pad.add(label);
    });
    // home button: a round cap with a plain glowing ring (no brand mark)
    pad.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 24), toon(light ? "#2b2e33" : "#3a3e45"), { outline: 0.01 }), 0, TOP + 0.01, -0.15));
    const glow = mesh(new THREE.TorusGeometry(0.028, 0.008, 6, 24), track(new THREE.MeshBasicMaterial({ color: "#f4f6f8" })), { outline: 0 });
    glow.rotation.x = Math.PI / 2;
    pad.add(at(glow, 0, TOP + 0.022, -0.15));
    // view, menu and share
    const small = toon(light ? "#2b2e33" : "#5a5f68");
    [-0.075, 0.075].forEach((x) => pad.add(at(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.016, 16), small, { outline: 0.008 }), x, TOP + 0.008, -0.05)));
    pad.add(at(mesh(rbox(0.054, 0.016, 0.028, 0.008), small, { outline: 0.008 }), 0, TOP + 0.008, 0.0));
    // bumpers along the top edge, the body's colour
    [-0.34, 0.34].forEach((x) => {
      const bumper = at(mesh(rbox(0.26, 0.07, 0.08, 0.03), toon(light ? "#e7e9ec" : "#202226"), { outline: 0.008 }), x, 0.02, -0.235);
      bumper.rotation.y = -Math.sign(x) * 0.18;
      pad.add(bumper);
    });
    return pad;
  };
  // Each pad on a clear acrylic display stand under the neon sign: a foot, a lip its grips rest
  // on and a back plate it leans on, tipped back so its face looks out at the room
  const PAD_TILT = 1.05;
  const clearStandMat = track(new THREE.MeshToonMaterial({ color: "#dbeafe", transparent: true, opacity: 0.65 }));
  const padStand = () => {
    const stand = group(
      at(mesh(rbox(0.9, 0.04, 0.62, 0.015), clearStandMat, { outline: 0.01 }), 0, 0.02, 0),
      at(mesh(rbox(0.84, 0.07, 0.04, 0.012), clearStandMat, { outline: 0.008 }), 0, 0.07, 0.25),
      at(mesh(rbox(0.6, 0.5, 0.03, 0.015), clearStandMat, { outline: 0.008 }), 0, 0.26, -0.14),
    );
    stand.children[2].rotation.x = -(Math.PI / 2 - PAD_TILT);
    return stand;
  };
  const padOnStand = (color, x, turn) => {
    const pad = controller(color);
    pad.rotation.x = PAD_TILT;
    pad.position.set(0, 0.37, 0.04);
    pad.scale.setScalar(0.9);
    const item = addItem(at(group(padStand(), pad), x, standOn(0), 0.12), "controller");
    item.rotation.y = turn;
    // Clicks move the pad on its stand; the stand stays put
    pad.userData.restY = pad.position.y;
    item.userData.moves = pad;
    return item;
  };
  const pad1 = padOnStand("#1a1714", -0.35, 0.1);
  const pad2 = padOnStand("#fffdf5", 0.9, -0.1);

  // A hardback, spine to the room: covers either side, cream pages showing between them at the
  // top, and the spine printed flat (black bands, a boxed title label, a sticker)
  // Pages show their fine paper lines
  const pageTex = canvasTexture(64, 64);
  track(pageTex.texture);
  drawPageEdges(pageTex.ctx, 64, 64);
  pageTex.texture.wrapS = pageTex.texture.wrapT = THREE.RepeatWrapping;
  pageTex.texture.repeat.set(3, 3);
  const pagesMat = toon("#ffffff");
  pagesMat.map = pageTex.texture;
  function bookMesh(w, h, color, i = 0, depth = 1.0, drawSpine = (c, cw, ch) => drawBookSpine(c, cw, ch, { color, i })) {
    const cover = toon(color);
    const book = group(
      at(mesh(rbox(w - 0.05, h - 0.05, depth - 0.06, 0.02), pagesMat, { outline: 0.02 }), 0, 0, -0.02),
      at(mesh(rbox(w, h, 0.06, 0.02), cover, { outline: 0.025 }), 0, 0, depth / 2 - 0.03),
      at(mesh(rbox(0.035, h, depth, 0.012), cover, { outline: 0.02 }), -w / 2 + 0.0175, 0, 0),
      at(mesh(rbox(0.035, h, depth, 0.012), cover, { outline: 0.02 }), w / 2 - 0.0175, 0, 0),
    );
    const spine = printed(w - 0.01, h - 0.01, 420, drawSpine);
    spine.position.z = depth / 2 + 0.002;
    book.add(spine);
    return book;
  }
  // Level 1, kept loose: a chunky yellow bookend, a row of books of all heights not quite
  // upright, one leaning on them, and a short stack lying flat with the mushroom on top
  const bookend = group(
    at(mesh(rbox(0.08, 1.0, 0.78, 0.02), toon("#ffdd00"), { outline: 0.025 }), 0, 0.5, 0),
    at(mesh(rbox(0.09, 0.14, 0.8, 0.02), toon("#1a1714"), { outline: 0.02 }), 0, 0.07, 0),
  );
  addItem(at(bookend, -1.84, standOn(1), 0.1, -0.03), "book");
  let x = -1.76;
  [
    [0.3, 1.55, 0.015], [0.22, 1.3, -0.012], [0.36, 1.72, 0], [0.2, 1.18, 0.02], [0.28, 1.62, -0.01],
  ].forEach(([w, h, tilt], i) => {
    addItem(at(bookMesh(w, h, PALETTE[i % PALETTE.length], i), x + w / 2, standOn(1) + h / 2, 0.1 + (i % 2) * 0.04, tilt), "book");
    x += w + 0.025;
  });
  addItem(at(bookMesh(0.26, 1.4, "#00e0c6", 6), x + 0.42, standOn(1) + 0.66, 0.1, -0.32), "book");
  // lying flat, spines out and readable, each a little off the one under it
  const STACK_X = 1.12;
  [[0.17, 0.98, "#3b82f6", 8, 0.03], [0.15, 0.9, "#ff6b6b", 10, -0.05], [0.18, 0.94, "#ffb35c", 11, 0.06]].reduce((y, [thick, len, color, title, turn]) => {
    const lying = addItem(at(bookMesh(thick, len, color, title, 0.85), STACK_X + turn * 0.6, standOn(1) + y + thick / 2, 0.15, -Math.PI / 2), "book");
    lying.rotation.y = turn;
    return y + thick;
  }, 0);
  const STACK_TOP = 0.17 + 0.15 + 0.18;
  const mushroom = group(
    at(mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.42, 14), white, { outline: 0.025 }), 0, 0.21, 0),
    at(mesh(new THREE.SphereGeometry(0.4, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon("#e11d48"), { outline: 0.03 }), 0, 0.38, 0),
  );
  [[0.15, 0.62, 0.22], [-0.2, 0.6, 0.18], [0.02, 0.72, -0.12]].forEach(([dx, dy, dz]) =>
    mushroom.add(at(mesh(new THREE.SphereGeometry(0.07, 10, 8), white, { outline: 0 }), dx, dy, dz)),
  );
  addItem(at(mushroom, STACK_X, standOn(1) + STACK_TOP, 0.15), "figure");

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
  // Bit, the little robot: built from moving parts (a body that can bob and sway, a head on a
  // neck that turns, blinking eyes, an antenna light, and arms on shoulder pivots). It glances
  // toward the pointer and blinks now and then, dances while Spotifree plays, says hi when
  // clicked, and five quick pokes glitch it into giving up a secret.
  const teal = toon("#00e0c6");
  const robot = new THREE.Group();
  const bot = new THREE.Group();
  robot.add(bot);
  bot.add(
    at(mesh(rbox(0.52, 0.55, 0.42, 0.08), teal, { outline: 0.03 }), 0, 0.28, 0),
    // a chest panel with buttons and a little speaker slot
    at(mesh(rbox(0.3, 0.24, 0.03, 0.03), white, { outline: 0.01 }), 0, 0.3, 0.215),
    at(mesh(new THREE.SphereGeometry(0.04, 10, 8), toon("#ff6b6b"), { outline: 0 }), -0.07, 0.33, 0.235),
    at(mesh(new THREE.SphereGeometry(0.04, 10, 8), toon("#ffdd00"), { outline: 0 }), 0.07, 0.33, 0.235),
    at(mesh(rbox(0.16, 0.03, 0.02, 0.005), black, { outline: 0 }), 0, 0.24, 0.235),
  );
  const botHead = new THREE.Group();
  botHead.position.y = 0.57;
  bot.add(botHead);
  const eyeMat = toon("#1a1714");
  const botEyes = [-0.1, 0.1].map((x) => at(mesh(rbox(0.08, 0.1, 0.02, 0.01), eyeMat, { outline: 0 }), x, 0.21, 0.19));
  const antennaMat = track(new THREE.MeshBasicMaterial({ color: "#ff6b6b" }));
  botHead.add(
    at(mesh(rbox(0.44, 0.38, 0.38, 0.08), white, { outline: 0.03 }), 0, 0.19, 0),
    ...botEyes,
    at(mesh(rbox(0.18, 0.04, 0.02, 0.01), black, { outline: 0 }), 0, 0.09, 0.195),
    rod(new THREE.Vector3(0, 0.38, 0), new THREE.Vector3(0, 0.63, 0), 0.025, black, 0),
    at(mesh(new THREE.SphereGeometry(0.07, 10, 8), antennaMat, { outline: 0.015 }), 0, 0.67, 0),
  );
  // arms hang from shoulder pivots, so they can wave and pump
  const botArms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.33, 0.5, 0);
    shoulder.rotation.z = side * -0.12;
    shoulder.add(at(mesh(rbox(0.12, 0.42, 0.14, 0.05), teal, { outline: 0.02 }), 0, -0.2, 0));
    bot.add(shoulder);
    return shoulder;
  });
  addItem(at(robot, 1.15, standOn(2), 0.1), "robot");

  // Blinks every few seconds
  const botBlink = () => gsap.fromTo(botEyes.map((eye) => eye.scale), { y: 1 }, { y: 0.1, duration: 0.07, yoyo: true, repeat: 1, ease: "power1.in" });
  let botBlinkAt = performance.now() + 3000;
  let botBusy = false;
  // Each frame: its head turns toward where the pointer is on screen (gently, and not while busy)
  function updateRobot(now) {
    if (now > botBlinkAt) {
      botBlinkAt = now + 2500 + Math.random() * 3000;
      if (!botBusy) botBlink();
    }
    if (botBusy) return;
    botHead.rotation.y += (parallax.x * 0.55 - botHead.rotation.y) * 0.08;
    botHead.rotation.x += (parallax.y * 0.25 - botHead.rotation.x) * 0.08;
  }
  // Dancing on the music's beat: a bob on every kick, the arms pump on the snare
  let botStep = 0;
  function robotBeat(kind) {
    if (botBusy) return;
    if (kind === "kick") {
      botStep++;
      gsap.fromTo(bot.position, { y: 0.06 }, { y: 0, duration: 0.3, ease: "bounce.out", overwrite: true });
      gsap.to(bot.rotation, { z: botStep % 2 ? 0.1 : -0.1, duration: 0.25, ease: "sine.inOut", overwrite: true });
    } else {
      botArms.forEach((arm, i) => gsap.fromTo(arm.rotation, { x: -1.1 * ((botStep + i) % 2 ? 1 : 0.4) }, { x: 0, duration: 0.35, ease: "power2.out", overwrite: true }));
      gsap.fromTo(antennaMat.color, { r: 0.5, g: 1, b: 0.9 }, { r: 1, g: 0.42, b: 0.42, duration: 0.3 });
    }
  }
  const BOT_LINES = ["beep boop! I'm Bit 🤖", "01101000 01101001 (that's \"hi\")", "battery 100%. ready to code!", "have you tried turning it off and on?", "I compile, therefore I am."];
  let botLine = 0;
  let botPokes = 0;
  let botPokeTimer = null;
  // A click: say hi (antenna flashes, eyes blink, the right arm waves, a couple of beeps).
  // Five in a row: a glitch, and a secret.
  function pokeRobot() {
    clearTimeout(botPokeTimer);
    botPokeTimer = setTimeout(() => (botPokes = 0), 3500);
    if (++botPokes >= 5) {
      botPokes = 0;
      return glitchRobot();
    }
    if (botBusy) return;
    botBusy = true;
    gsap.to(botHead.rotation, { x: 0, y: 0, duration: 0.2 });
    gsap.fromTo(antennaMat.color, { r: 1, g: 1, b: 0.3 }, { r: 1, g: 0.42, b: 0.42, duration: 0.25, repeat: 3, yoyo: true });
    botBlink();
    gsap.timeline({ onComplete: () => (botBusy = false) })
      .to(botArms[1].rotation, { z: 2.4, duration: 0.25, ease: "back.out(2)" })
      .to(botArms[1].rotation, { z: 2.0, duration: 0.14, yoyo: true, repeat: 5, ease: "sine.inOut" })
      .to(botArms[1].rotation, { z: -0.12, duration: 0.3, ease: "power2.in" });
    sfx.blip();
    sfx.blip({ delay: 0.14 });
    shelfSay(robot, BOT_LINES[botLine++ % BOT_LINES.length], "Bit", 2600, 0.7, 0.35);
  }
  function glitchRobot() {
    botBusy = true;
    discover("robot");
    eyeMat.color.set("#ff2d55");
    sfx.buzz();
    sfx.powerDown({ delay: 0.5 });
    const x = bot.position.x;
    gsap.timeline({
      onComplete: () => {
        eyeMat.color.set("#1a1714");
        botBusy = false;
      },
    })
      .to(bot.position, { x: x + 0.05, duration: 0.04, yoyo: true, repeat: 11, ease: "steps(1)" })
      .to(antennaMat.color, { r: 0.2, g: 1, b: 0.4, duration: 0.05, yoyo: true, repeat: 9 }, 0)
      .to(botHead.rotation, { y: Math.PI * 2, duration: 0.6, ease: "power2.inOut" }, 0.2)
      .set(botHead.rotation, { y: 0 })
      .to(bot.scale, { x: 1.15, y: 0.85, z: 1.15, duration: 0.08, yoyo: true, repeat: 3 }, 0.5)
      .to({}, { duration: 1.2 });
    timers.push(setTimeout(() => shelfSay(robot, "SYSTEM OVERRIDE… secret unlocked 👾", "Bit", 3200, 0.7, 0.35), 700));
  }

  // Level 3: a pile of manga volumes lying down, a trophy, and a handheld console. Manga are
  // smaller than the hardbacks, with white covers and the series' colour on each spine, the
  // pile a little untidy.
  const MANGA = [[1, "#f68026"], [2, "#ffc342"], [3, "#ed6d37"], [4, "#ffb15c"], [5, "#e99a32"]];
  const stackTop = MANGA.reduce((y, [vol, color], i) => {
    const thick = 0.15;
    const lying = bookMesh(thick, 1.02, "#fffdf5", i, 0.72, (c, cw, ch) => drawMangaSpine(c, cw, ch, { vol, color }));
    const coverArt = printed(0.7, 1.0, 750, (c, cw, ch) => drawNarutoCover(c, cw, ch, { vol, color }));
    coverArt.rotation.y = Math.PI / 2;
    coverArt.position.x = thick / 2 + 0.003;
    lying.add(coverArt);
    lying.rotation.z = Math.PI / 2;
    const item = addItem(at(group(lying), -1.05 + (i % 2 ? 0.05 : -0.04), y + thick / 2, 0.25), "book");
    item.rotation.y = (i % 3 - 1) * 0.07;
    return y + thick;
  }, standOn(3));
  // A 3×3 puzzle cube on top of the pile: 27 little cubies, each with its stickers on the
  // outside faces, so a layer can really turn. It sits a few twists away from solved; click
  // it and it gets played with: a quick run of layer turns as it spins round.
  const CUBE = 0.36;
  const CUBIE = CUBE / 3;
  const stickerMats = { px: "#e5484d", nx: "#ff8a1f", py: "#fffdf5", ny: "#ffd400", pz: "#22a35a", nz: "#2f7cf6" };
  Object.keys(stickerMats).forEach((k) => (stickerMats[k] = toon(stickerMats[k])));
  const cubieGeo = rbox(CUBIE - 0.004, CUBIE - 0.004, CUBIE - 0.004, 0.012);
  const stickerGeo = rbox(CUBIE - 0.026, CUBIE - 0.026, 0.01, 0.01);
  const rubik = new THREE.Group();
  const cubies = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    const cubie = mesh(cubieGeo, black, { outline: 0.008 });
    cubie.position.set(x * CUBIE, y * CUBIE, z * CUBIE);
    const face = (axis, sign) => {
      const sticker = mesh(stickerGeo, stickerMats[`${sign > 0 ? "p" : "n"}${axis}`], { outline: 0 });
      sticker.position[axis] = sign * (CUBIE / 2);
      if (axis === "x") sticker.rotation.y = Math.PI / 2;
      if (axis === "y") sticker.rotation.x = Math.PI / 2;
      cubie.add(sticker);
    };
    if (x) face("x", x);
    if (y) face("y", y);
    if (z) face("z", z);
    rubik.add(cubie);
    cubies.push(cubie);
  }
  // Turn one layer (axis "x" | "y" | "z", layer -1..1) a quarter turn either way: its cubies
  // move to a pivot, it turns, and they come back snapped to the grid
  const AXES = ["x", "y", "z"];
  const snap = (v, step) => Math.round(v / step) * step;
  function turnLayer(axis, layer, dir, duration = 0, onDone) {
    const pivot = new THREE.Object3D();
    rubik.add(pivot);
    const members = cubies.filter((c) => Math.round(c.position[axis] / CUBIE) === layer);
    members.forEach((c) => pivot.attach(c));
    const settle = () => {
      members.forEach((c) => {
        rubik.attach(c);
        c.position.set(snap(c.position.x, CUBIE), snap(c.position.y, CUBIE), snap(c.position.z, CUBIE));
        c.rotation.set(snap(c.rotation.x, Math.PI / 2), snap(c.rotation.y, Math.PI / 2), snap(c.rotation.z, Math.PI / 2));
      });
      rubik.remove(pivot);
      onDone?.();
    };
    if (!duration) {
      pivot.rotation[axis] = (dir * Math.PI) / 2;
      pivot.updateMatrixWorld(true);
      return settle();
    }
    gsap.to(pivot.rotation, { [axis]: (dir * Math.PI) / 2, duration, ease: "power2.inOut", onComplete: settle });
  }
  // a few turns from solved, as if put down mid-solve
  [["y", 1, 1], ["x", -1, -1], ["z", 1, 1], ["y", -1, -1]].forEach(([axis, layer, dir]) => turnLayer(axis, layer, dir));
  rubik.rotation.set(0, 0.6, 0);
  const rubikItem = addItem(at(group(rubik), -0.7, stackTop + CUBE / 2, 0.3), "rubik");
  let rubikBusy = false;
  function playRubik() {
    if (rubikBusy) return;
    rubikBusy = true;
    const TURNS = 6;
    const turn = (n) => {
      if (n === TURNS) {
        rubikBusy = false;
        return;
      }
      const axis = AXES[Math.floor(Math.random() * 3)];
      sfx.tick({ pitch: 1.6 + Math.random() * 0.6 });
      turnLayer(axis, Math.floor(Math.random() * 3) - 1, Math.random() < 0.5 ? 1 : -1, 0.16, () => turn(n + 1));
    };
    turn(0);
    // turned over in the hands as it's played
    gsap.to(rubik.rotation, { y: rubik.rotation.y + Math.PI * 2, duration: 6 * 0.17, ease: "power1.inOut" });
    gsap.fromTo(rubik.rotation, { x: 0 }, { x: 0.35, duration: 6 * 0.085, yoyo: true, repeat: 1, ease: "sine.inOut" });
  }
  let trophyCelebrating = false;
  let trophyCelebration = null;
  const trophyHalo = new THREE.Sprite(track(new THREE.SpriteMaterial({
    map: radial([[0, "rgba(255,220,100,.8)"], [0.4, "rgba(255,204,60,.35)"], [1, "rgba(255,190,40,0)"]]),
    transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending,
  })));
  trophyHalo.raycast = noRaycast;
  trophyHalo.visible = false;
  scene.add(trophyHalo);
  const trophyGold = toon("#e8b640");
  const trophyProfile = [[0, 0.52], [0.12, 0.53], [0.24, 0.65], [0.34, 0.87], [0.37, 1.12], [0.32, 1.12], [0.3, 0.9], [0.2, 0.71], [0.08, 0.65], [0, 0.65]].map(([r, y]) => new THREE.Vector2(r, y));
  // A hollow bowl, rounded rim and continuous loop handles sit on a separate stem.
  const cup = mesh(new THREE.LatheGeometry(trophyProfile, 40), trophyGold, { outline: 0.012 });
  // While the trophy celebrates, its glow lights the shelf around it
  const trophyLight = neonLight("#ffc94d", 3, () => trophyGold.emissive.r / 0.6, { distance: 3 });
  trophyLight.position.set(0, 0.9, 0.4);
  cup.add(trophyLight);
  // The plate on its plinth keeps score of the room's secrets found so far
  const trophyPlate = printed(0.4, 0.13, 700, (c, w, h) => {
    c.fillStyle = "#ffd34d";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#8a6416";
    c.lineWidth = h * 0.08;
    c.strokeRect(0, 0, w, h);
    c.fillStyle = "#1a1714";
    c.font = `900 ${Math.round(h * 0.62)}px 'Lexend Mega', sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(`${secretsFound.size}/${SECRETS.length}`, w / 2, h * 0.55);
  });
  trophyPlate.position.set(0, 0.11, 0.252);
  const trophy = group(
    at(mesh(rbox(0.62, 0.22, 0.5, 0.035), black, { outline: 0.016 }), 0, 0.11, 0), trophyPlate, cup,
    at(mesh(rbox(0.53, 0.04, 0.42, 0.02), trophyGold, { outline: 0.008 }), 0, 0.24, 0),
    at(mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.28, 24), trophyGold, { outline: 0.008 }), 0, 0.4, 0),
  );
  const trophyRim = mesh(new THREE.TorusGeometry(0.345, 0.025, 10, 40), trophyGold, { outline: 0 });
  trophyRim.rotation.x = Math.PI / 2;
  trophyRim.position.y = 1.12;
  trophy.add(trophyRim);
  [-1, 1].forEach((side) => {
    const path = new THREE.CatmullRomCurve3([[0.34, 1.04], [0.49, 1.02], [0.51, 0.85], [0.42, 0.71], [0.29, 0.74]].map(([x, y]) => new THREE.Vector3(side * x, y, 0)));
    trophy.add(mesh(new THREE.TubeGeometry(path, 24, 0.027, 10, false), trophyGold, { outline: 0.008 }));
  });
  const trophyStar = printed(0.16, 0.16, 700, (c, w, h) => {
    c.fillStyle = "#89601f"; c.font = `900 ${w}px sans-serif`;
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("★", w / 2, h * 0.54);
  });
  trophyStar.material.transparent = true;
  trophyStar.material.alphaTest = 0.1;
  trophyStar.position.set(0, 0.9, 0.35);
  trophy.add(trophyStar);
  addItem(at(trophy, 0.45, standOn(3), 0.15), "trophy");
  const handheld = group(
    mesh(rbox(0.62, 0.95, 0.14, 0.08), toon("#8fd694"), { outline: 0.03 }),
    at(mesh(rbox(0.5, 0.42, 0.02, 0.03), toon("#3a4a3a"), { outline: 0 }), 0, 0.2, 0.072),
    at(mesh(rbox(0.16, 0.05, 0.025, 0.01), black, { outline: 0 }), -0.15, -0.16, 0.075),
    at(mesh(rbox(0.05, 0.16, 0.025, 0.01), black, { outline: 0 }), -0.15, -0.16, 0.075),
    at(mesh(new THREE.SphereGeometry(0.045, 10, 8), toon("#e11d48"), { outline: 0 }), 0.19, -0.13, 0.08),
    at(mesh(new THREE.SphereGeometry(0.045, 10, 8), toon("#e11d48"), { outline: 0 }), 0.1, -0.19, 0.08),
  );
  // a little pixel scene on its screen, and speaker holes
  // its screen plays a little space-invaders loop (redrawn from the render loop)
  const handheldScreen = printed(0.4, 0.32, 520, (c, w, h, t) => drawInvaders(c, w, h, t), { unlit: true });
  handheldScreen.position.set(0, 0.2, 0.084);
  let handheldDrawnAt = 0;
  handheld.add(handheldScreen);
  for (let i = 0; i < 4; i++) handheld.add(at(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 6), black, { outline: 0 }), 0.12 + i * 0.045, -0.36, 0.075, 0.6));
  const handheldItem = addItem(at(handheld, 1.35, standOn(3) + 0.47, -0.2), "console");
  handheldItem.rotation.x = -0.18;

  // Top: the Infinity Gauntlet at the left end (where it shows from the desk) and a katana on its
  // stand beside it. Luffy's straw hat hangs on the wall by the guitar: a wide straw brim, a round
  // crown and the red band
  // Woven straw on the brim and crown
  const strawWeave = canvasTexture(256, 256);
  track(strawWeave.texture);
  drawStraw(strawWeave.ctx, 256, 256);
  strawWeave.texture.wrapS = strawWeave.texture.wrapT = THREE.RepeatWrapping;
  strawWeave.texture.repeat.set(4, 2);
  const straw = toon("#ffffff");
  straw.map = strawWeave.texture;
  const strawHat = group(
    at(mesh(new THREE.CylinderGeometry(0.74, 0.76, 0.05, 40), straw, { outline: 0.03 }), 0, 0.025, 0),
    at(mesh(new THREE.TorusGeometry(0.74, 0.03, 8, 40), toon("#d9a43a"), { outline: 0 }), 0, 0.04, 0),
    at(mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.2, 32), straw, { outline: 0.03 }), 0, 0.15, 0),
    at(mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.13, 32), toon("#d62828"), { outline: 0.02 }), 0, 0.12, 0),
    at(mesh(new THREE.SphereGeometry(0.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), straw, { outline: 0.03 }), 0, 0.25, 0),
  );
  strawHat.children[1].rotation.x = Math.PI / 2;
  strawHat.children[4].scale.y = 0.8;

  // Hung on the left wall beside the guitar from a nail by its cord, crown to the room, as if
  // tossed there after a session; it swings from the nail. In the hat's peg, x runs along the
  // wall, y up and z out into the room from the nail.
  const HAT_NAIL = new THREE.Vector3(SIDE_X + 0.12, 8.0, 8.6);
  const hatPeg = new THREE.Group();
  hatPeg.position.copy(HAT_NAIL);
  hatPeg.rotation.set(0, Math.PI / 2, -0.25);
  room.add(hatPeg);
  // The nail, out from the wall with a round head; it stays put while the hat swings
  const nailMat = toon("#8b9099");
  const hatNail = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.36, 10), nailMat, { outline: 0.012 });
  hatNail.rotation.z = Math.PI / 2;
  hatNail.position.copy(HAT_NAIL).add(new THREE.Vector3(0.18, 0, 0));
  const nailHead = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 16), nailMat, { outline: 0.012 });
  nailHead.rotation.z = Math.PI / 2;
  nailHead.position.copy(HAT_NAIL).add(new THREE.Vector3(0.36, 0, 0));
  room.add(hatNail, nailHead);
  // Against the room (the desk is about 140 cm): a brim about 28 cm across, its back just off
  // the wall
  const HAT_SCALE = 1.9;
  const HAT_OFF_WALL = 0.12;
  // The cord is tied either side of the crown's base, 40 degrees off its top, with a little
  // knot at each tie; it hangs the hat a hand's length below the nail
  const TIE_ANGLE = (40 * Math.PI) / 180;
  const TIE_X = 0.42 * Math.sin(TIE_ANGLE);
  const TIE_UP = 0.42 * Math.cos(TIE_ANGLE);
  const HAT_DROP = TIE_UP * HAT_SCALE + 1.0;
  const hung = at(strawHat, 0, -HAT_DROP, HAT_OFF_WALL);
  hung.rotation.x = Math.PI / 2;
  hung.scale.setScalar(HAT_SCALE);
  hatPeg.add(hung);
  // (the hat stands with its crown along its own +y; turned to face the room, its top is -z)
  const cordMat = toon("#7a5634");
  [-1, 1].forEach((side) => {
    const knot = mesh(new THREE.SphereGeometry(0.035, 10, 8), cordMat, { outline: 0.008, cast: false });
    knot.position.set(side * TIE_X, 0.075, -TIE_UP);
    strawHat.add(knot);
  });
  // Its cord: from each tie, taut up to the nail, and draped over the top of it
  const CORD_TOP = 0.065;
  const tie = (side) => new THREE.Vector3(side * TIE_X * HAT_SCALE, -HAT_DROP + TIE_UP * HAT_SCALE, HAT_OFF_WALL + 0.075 * HAT_SCALE);
  const overNail = (side) => new THREE.Vector3(side * 0.07, 0.02, 0.22);
  const hatCord = new THREE.CatmullRomCurve3([
    tie(-1),
    tie(-1).lerp(overNail(-1), 0.5),
    overNail(-1),
    new THREE.Vector3(0, CORD_TOP, 0.22),
    overNail(1),
    tie(1).lerp(overNail(1), 0.5),
    tie(1),
  ]);
  // Held from the top of its loop over the nail, so a stretch only lengthens what hangs below
  const cordHang = at(new THREE.Group(), 0, CORD_TOP, 0);
  cordHang.add(at(mesh(new THREE.TubeGeometry(hatCord, 64, 0.022, 8), cordMat, { outline: 0.008, cast: false }), 0, -CORD_TOP, 0));
  hatPeg.add(cordHang);
  // Gomu gomu: the hat is rubber. Its cord stretches (`stretch.s`, 1 at rest) and the hat
  // sinks on it, drawn long and thin along the pull; let go, and it shoots back up past the
  // nail squashed flat, spins on its crown, bounces on its cord and swings before it settles.
  // A click is a yank; or grab it and pull it about yourself.
  const HAT_TILT = -0.25;
  const CORD_LEN = CORD_TOP - tie(1).y;
  const stretch = { s: 1 };
  const setStretch = () => {
    cordHang.scale.y = stretch.s;
    hung.position.y = CORD_TOP - CORD_LEN * stretch.s - TIE_UP * HAT_SCALE;
  };
  const stopHat = () => gsap.killTweensOf([stretch, hung.scale, hung.rotation, hatPeg.rotation]);
  // Let go from a stretch `from`, swung out to `angle`: the further it was pulled, the harder
  // it snaps, squashes and bounces
  function snapBack(from, angle) {
    stopHat();
    const power = THREE.MathUtils.clamp((from - 1) / 1.6, 0.25, 1);
    gsap.timeline({ onUpdate: setStretch })
      .to(stretch, { s: 1 - 0.45 * power, duration: 0.11, ease: "power3.in" }, 0)
      .to(hung.scale, { x: HAT_SCALE * (1 + 0.34 * power), z: HAT_SCALE * (1 - 0.38 * power), duration: 0.11, ease: "power3.in" }, 0)
      .to(stretch, { s: 1, duration: 1.5, ease: `elastic.out(${1 + 0.6 * power}, 0.22)` })
      .to(hung.scale, { x: HAT_SCALE, z: HAT_SCALE, duration: 1.3, ease: "elastic.out(1.6, 0.25)" }, "<");
    // swings back through and about the nail
    gsap.fromTo(hatPeg.rotation, { z: angle }, { z: HAT_TILT, duration: 2, ease: "elastic.out(1.3, 0.18)" });
    // and spins on its crown as it flies up, wobbling back straight
    gsap.timeline()
      .to(hung.rotation, { y: (Math.random() < 0.5 ? -1 : 1) * 0.7 * power, duration: 0.12, ease: "power2.out" })
      .to(hung.rotation, { y: 0, duration: 1.3, ease: "elastic.out(1.2, 0.3)" });
    sfx.boing();
    sfx.pop({ pitch: 0.5 });
  }
  // The yank: a little hop up, then pulled down long and thin on a squealing cord, held there
  // a beat trembling with the strain, and let go
  function gomuGomu() {
    stopHat();
    gsap.timeline({ onUpdate: setStretch, onComplete: () => snapBack(stretch.s, hatPeg.rotation.z) })
      .to(stretch, { s: 0.85, duration: 0.1, ease: "power2.out" })
      .to(hung.scale, { x: HAT_SCALE * 1.08, z: HAT_SCALE * 0.92, duration: 0.1, ease: "power2.out" }, "<")
      .to(stretch, { s: 2.6, duration: 0.42, ease: "power2.out" })
      .to(hung.scale, { x: HAT_SCALE * 0.8, z: HAT_SCALE * 1.35, duration: 0.42, ease: "power2.out" }, "<")
      // swung out away from the guitar
      .to(hatPeg.rotation, { z: HAT_TILT - 0.35, duration: 0.42, ease: "power2.out" }, "<")
      .to(stretch, { s: 2.5, duration: 0.03, repeat: 5, yoyo: true, ease: "none" });
    sfx.rubber({ duration: 0.45, delay: 0.08 });
  }
  // Grab and pull: the hat follows the pointer across a plane just off the wall, its cord
  // stretching to reach and swinging round to point at it; let go and it snaps back. In the
  // nail's own frame (like the peg's, untilted), straight down is angle 0.
  const hatPullPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -(HAT_NAIL.x + HAT_OFF_WALL + 0.3));
  const hatFrame = new THREE.Object3D();
  hatFrame.position.copy(HAT_NAIL);
  hatFrame.rotation.y = Math.PI / 2;
  room.add(hatFrame);
  const hatReachPoint = new THREE.Vector3();
  function hatReach(ray) {
    if (!ray.intersectPlane(hatPullPlane, hatReachPoint)) return null;
    hatFrame.updateMatrixWorld();
    hatFrame.worldToLocal(hatReachPoint);
    return { length: Math.hypot(hatReachPoint.x, hatReachPoint.y), angle: Math.atan2(hatReachPoint.x, -hatReachPoint.y) };
  }
  function grabHat(drag, ray) {
    const reach = hatReach(ray);
    if (!reach) return false;
    Object.assign(drag, { length: reach.length / stretch.s, turn: reach.angle - hatPeg.rotation.z, pull: stretch.s, lastSound: 0 });
    return true;
  }
  function pullHat(drag, ray, time) {
    const reach = hatReach(ray);
    if (!reach) return;
    if (!drag.held) {
      drag.held = true;
      stopHat();
    }
    drag.pull = THREE.MathUtils.clamp(reach.length / drag.length, 0.75, 3.2);
    stretch.s = drag.pull;
    hatPeg.rotation.z = THREE.MathUtils.clamp(reach.angle - drag.turn, -1.3, 1.3);
    // drawn long and thin along the pull
    const strain = Math.max(0, drag.pull - 1);
    hung.scale.set(HAT_SCALE * (1 - 0.1 * strain), HAT_SCALE, HAT_SCALE * (1 + 0.18 * strain));
    setStretch();
    if (strain > 0.15 && time - drag.lastSound > 180) {
      sfx.rubber({ duration: 0.25 });
      drag.lastSound = time;
    }
  }
  function releaseHat(drag) {
    snapBack(drag.pull, hatPeg.rotation.z);
    sfx.shishishi({ delay: 0.45 });
    discover("luffy");
  }
  register(hatPeg, {
    onHover: (on) => on && !gsap.isTweening(stretch) && gsap.fromTo(hatPeg.rotation, { z: HAT_TILT - 0.1 }, { z: HAT_TILT, duration: 1, ease: "elastic.out(1, 0.3)" }),
    onClick: () => {
      gomuGomu();
      sfx.shishishi({ delay: 1.1 });
      discover("luffy");
    },
  });

  // ---------- Zoro's three swords on a wall rack, above the gauntlet ----------
  // Two black wall brackets, each a plate with three curved hooks (the wavy arms of a sword
  // stand, turned to hang on the wall), and in them, top to bottom:
  // Wado Ichimonji: white saya and white wrap with black diamonds, a round gold tsuba
  // Sandai Kitetsu: red saya ringed in black, red wrap with black diamonds, a gold tsuba
  // Enma: purple saya with yellow flowers, a red cord and tassels, a lobed gold tsuba
  const KATANA_SCALE = 1.3;
  const RACK_TIERS = [0.6, 0, -0.6];
  const RACK_ARM_X = 1.0;
  // How far above the shelf's top the rack hangs: clear above the gauntlet, even mid-snap
  const RACK_Y = 3.6;
  // The shelf's close-up scrolls up to the gauntlet and the handheld, not the swords: they
  // have a close-up of their own
  const SHELF_TOP_EXTRA = 2.9;
  const katanaRack = new THREE.Group();
  katanaRack.position.set(0.35, SHELF_H + RACK_Y, -SHELF_D / 2 + 0.05);
  katanaRack.scale.setScalar(KATANA_SCALE);
  shelf.add(katanaRack);

  const rackMat = toon("#181513");
  // A bracket in profile (x out from the wall, y up), extruded to its thickness
  const bracketShape = new THREE.Shape();
  const RACK_TOP = RACK_TIERS[0] + 0.36;
  const RACK_BOTTOM = RACK_TIERS[RACK_TIERS.length - 1] - 0.36;
  bracketShape.moveTo(0, RACK_BOTTOM);
  bracketShape.lineTo(0, RACK_TOP);
  bracketShape.quadraticCurveTo(0.1, RACK_TOP + 0.04, 0.1, RACK_TOP - 0.08);
  RACK_TIERS.forEach((y) => {
    bracketShape.lineTo(0.1, y + 0.06);
    // the cradle the sword rests in, then up to a rounded tip and back under the hook
    bracketShape.quadraticCurveTo(0.2, y - 0.13, 0.3, y - 0.04);
    bracketShape.quadraticCurveTo(0.33, y + 0.02, 0.35, y + 0.09);
    bracketShape.quadraticCurveTo(0.4, y + 0.1, 0.39, y + 0.02);
    bracketShape.quadraticCurveTo(0.37, y - 0.17, 0.22, y - 0.2);
    bracketShape.quadraticCurveTo(0.12, y - 0.2, 0.1, y - 0.27);
  });
  bracketShape.lineTo(0.1, RACK_BOTTOM + 0.08);
  bracketShape.quadraticCurveTo(0.1, RACK_BOTTOM - 0.04, 0, RACK_BOTTOM);
  const bracketGeo = new THREE.ExtrudeGeometry(bracketShape, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 10 });
  bracketGeo.translate(0, 0, -0.065);
  bracketGeo.rotateY(-Math.PI / 2);
  [-RACK_ARM_X, RACK_ARM_X].forEach((x) => {
    katanaRack.add(at(mesh(bracketGeo, rackMat, { outline: 0.018 }), x, 0, 0));
    // two screws in the wall plate
    [RACK_TOP - 0.16, RACK_BOTTOM + 0.16].forEach((y) => {
      const screw = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 10), toon("#c9a24a"), { outline: 0.006 });
      screw.rotation.z = Math.PI / 2;
      katanaRack.add(at(screw, x, y, 0.06));
    });
  });

  // How far the curve rises over the blade. Its sori (the most the back stands off the straight
  // line from the hilt to the tip) is a quarter of this: 2.3% of the blade, as on a real katana
  // (1.6 cm over 70 cm)
  const SORI = 0.2;
  const BLADE_L = 2.2;
  const bow = (x) => SORI * (x / BLADE_L) ** 2;
  // That curve is (to well under a hair) an arc of this radius about a point straight above the
  // saya's mouth, so a blade slides in and out of its saya by turning about that point
  const SORI_R = BLADE_L ** 2 / (2 * SORI);
  const drawTurn = (distance) => -distance / SORI_R;
  const bladeShape = (inset) => {
    const shape = new THREE.Shape();
    const steps = 16;
    shape.moveTo(0, -0.055 + inset);
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * BLADE_L;
      shape.lineTo(x, bow(x) - 0.055 * (1 - 0.3 * (x / BLADE_L)) + inset);
    }
    // the kissaki: the edge sweeps up to the point in a convex curve (the fukura), carrying on
    // from the edge's own line before it turns, with the point near the back as the curve goes
    const edgeEnd = bow(BLADE_L) - 0.055 * 0.7 + inset;
    shape.quadraticCurveTo(BLADE_L + 0.11, edgeEnd + 0.11 * (2 * SORI / BLADE_L), BLADE_L + 0.14, bow(BLADE_L + 0.14) + 0.03);
    for (let i = steps; i >= 0; i--) {
      const x = (i / steps) * BLADE_L;
      shape.lineTo(x, bow(x) + 0.05 - (inset ? 0.05 : 0));
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.022, bevelEnabled: false });
    geo.translate(0, 0, -0.011);
    return geo;
  };
  const BLADE_SPAN = BLADE_L + 0.14;
  const Y_MIN = -0.06;
  const Y_MAX = SORI + 0.08;

  // Blade textures for each of the 3 swords
  const createBladeMat = (drawFn) => {
    const tex = canvasTexture(1024, 128);
    track(tex.texture);
    drawFn(tex.ctx, 1024, 128, { bow, length: BLADE_L, width: BLADE_SPAN, yMin: Y_MIN, yMax: Y_MAX });
    tex.texture.repeat.set(1 / BLADE_SPAN, 1 / (Y_MAX - Y_MIN));
    tex.texture.offset.set(0, -Y_MIN / (Y_MAX - Y_MIN));
    const mat = toon("#ffffff");
    mat.map = tex.texture;
    return mat;
  };

  const wadoBladeMat = createBladeMat(drawWadoBlade);
  const kitetsuBladeMat = createBladeMat(drawKitetsuBlade);
  const enmaBladeMat = createBladeMat(drawEnmaBlade);

  // Enma crest decals
  const enmaPurple = toon("#6b2fa8");
  const cord = toon("#e11d48");
  // Enma's tassels hang from pivots on the saya and swing like little pendulums: each frame they
  // lean toward gravity as the saya feels it (its own acceleration subtracted), so a drawn,
  // sheathed or wobbling saya sets them swaying, and they settle back to how they were tied
  const tasselSway = [];
  const swayPos = new THREE.Vector3();
  const swayQuat = new THREE.Quaternion();
  const swayPull = new THREE.Vector3();
  // A blade leaving or going home jolts its saya: a shove sideways and back for its tassels
  function kickTassels(saya, strength = 1) {
    tasselSway.forEach((t, i) => {
      if (t.saya === saya) t.spin.add(new THREE.Vector3((i % 2 ? 2.2 : -1.7) * strength, 0.5 * strength, 3.2 * strength));
    });
  }
  function updateTassels(dt) {
    if (!dt) return;
    tasselSway.forEach((t) => {
      t.saya.updateWorldMatrix(true, false);
      t.saya.getWorldPosition(swayPos);
      t.saya.getWorldQuaternion(swayQuat);
      if (!t.seen) {
        t.seen = true;
        t.lastPos.copy(swayPos);
      }
      const vel = swayPos.clone().sub(t.lastPos).divideScalar(dt);
      const accel = vel.clone().sub(t.lastVel).divideScalar(dt).clampLength(0, 60);
      t.lastPos.copy(swayPos);
      t.lastVel.copy(vel);
      // the pull the tassel feels, in the saya's own frame
      swayPull.set(0, -9.8, 0).addScaledVector(accel, -0.22).applyQuaternion(swayQuat.invert()).normalize();
      // the first frame fixes how far its tie leans it off true vertical
      if (!t.bias) t.bias = new THREE.Quaternion().setFromUnitVectors(swayPull, t.rest);
      const want = swayPull.applyQuaternion(t.bias);
      t.spin.addScaledVector(want.sub(t.dir), 70 * dt).multiplyScalar(Math.exp(-3.2 * dt));
      t.dir.addScaledVector(t.spin, dt).normalize();
      t.pivot.quaternion.setFromUnitVectors(t.rest, t.dir);
    });
  }
  const flowerTex = canvasTexture(64, 64);
  track(flowerTex.texture);
  drawEnmaFlower(flowerTex.ctx, 64, 64);
  const flowerMat = track(new THREE.MeshBasicMaterial({ map: flowerTex.texture, transparent: true, depthWrite: false }));
  const flowerGeo = track(new THREE.PlaneGeometry(0.11, 0.11));
  const crest = (parent, x, y, radius) => [-1, 1].forEach((side) => {
    const decal = new THREE.Mesh(flowerGeo, flowerMat);
    decal.position.set(x, y, side * (radius + 0.004));
    if (side < 0) decal.rotation.y = Math.PI;
    decal.raycast = noRaycast;
    parent.add(decal);
  });


  // Wado's glint on its tip as it cuts
  const glintTex = canvasTexture(128, 128);
  track(glintTex.texture);
  drawGlint(glintTex.ctx, 128, 128);
  const glint = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glintTex.texture, depthTest: false, transparent: true, blending: THREE.AdditiveBlending })));
  glint.renderOrder = 12;
  glint.raycast = noRaycast;
  glint.visible = false;
  scene.add(glint);
  // Enma's Haki aura, wrapped along the blade while it's out (one, moved to whichever is drawn)
  const auraTex = canvasTexture(256, 128);
  track(auraTex.texture);
  drawHakiAura(auraTex.ctx, 256, 128);
  const haki = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), track(new THREE.MeshBasicMaterial({ map: auraTex.texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0 })));
  haki.raycast = noRaycast;
  haki.renderOrder = 11;
  haki.visible = false;
  // Hovered, Enma leaks a little of its Haki: a faint aura breathing round the bare steel
  // between the guard and the saya's mouth as it slides part way out, gone again when the
  // pointer leaves (a strike takes over from there)
  const HOVER_BARE = 0.62;
  function hoverHaki(sword, on) {
    gsap.killTweensOf([haki.material, haki.scale]);
    if (!on) {
      gsap.to(haki.material, { opacity: 0, duration: 0.3, ease: "sine.in", onComplete: () => (haki.visible = false) });
      return;
    }
    sword.bladeGroup.add(haki);
    haki.position.set(HOVER_BARE / 2, bow(HOVER_BARE / 2) + 0.01, 0);
    haki.scale.set(HOVER_BARE * 1.6, 0.6, 1);
    haki.visible = true;
    // in as the blade comes out of the mouth, then breathing
    gsap.fromTo(haki.material, { opacity: 0 }, { opacity: 0.9, duration: 0.4, delay: 0.3, ease: "sine.out" });
    gsap.to(haki.scale, { y: 0.78, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut", delay: 0.3 });
  }
  const tipAt = new THREE.Vector3();
  const shoutTex = canvasTexture(640, 320);
  track(shoutTex.texture);
  const shout = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: shoutTex.texture, depthTest: false, transparent: true })));
  shout.renderOrder = 12;
  shout.raycast = noRaycast;
  shout.scale.set(0.001, 0.001, 1);
  scene.add(shout);

  // Loose sakura petals, with a whole blossom every fourth one
  const petalTex = canvasTexture(128, 128);
  track(petalTex.texture);
  drawSakuraPetal(petalTex.ctx, 128, 128);
  const blossomTex = canvasTexture(160, 160);
  track(blossomTex.texture);
  drawSakuraBlossom(blossomTex.ctx, 160, 160);
  const petals = Array.from({ length: 12 }, (_, i) => {
    const petal = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: i % 4 === 3 ? blossomTex.texture : petalTex.texture, transparent: true, depthWrite: false })));
    petal.userData.blossom = i % 4 === 3;
    // over the close-up's spotlight shadow (see spotlight), as the cut's other effects are
    petal.renderOrder = 11;
    petal.visible = false;
    petal.raycast = noRaycast;
    scene.add(petal);
    return petal;
  });

  // Each sword leaves its own mark: Wado its sakura (above); Sandai Kitetsu, the cursed blade,
  // throws a few crimson sparks off the cut; Enma cracks black lightning.
  const SPARK_COLORS = { kitetsu: { spark: "#e11d48", sparkCore: "#ffdd00" } };
  const sparkTex = Object.fromEntries(Object.entries(SPARK_COLORS).map(([style, { spark, sparkCore }]) => {
    const tex = canvasTexture(128, 32);
    track(tex.texture);
    drawSparkStreak(tex.ctx, 128, 32, { color: spark, core: sparkCore });
    return [style, tex.texture];
  }));

  // Sparks share a pool of sprites. Each is posed every frame by updateFx from its own age, by
  // its own little rule, until its life is up.
  const fxPool = [];
  const liveFx = [];
  function spawnFx({ map, life, delay = 0, order = 13, step }) {
    let sprite = fxPool.pop();
    if (!sprite) {
      sprite = new THREE.Sprite(track(new THREE.SpriteMaterial({ map, transparent: true, depthTest: false, depthWrite: false })));
      sprite.raycast = noRaycast;
      scene.add(sprite);
    }
    sprite.material.map = map;
    sprite.material.opacity = 1;
    sprite.material.rotation = 0;
    sprite.renderOrder = order;
    sprite.visible = false;
    liveFx.push({ sprite, life, age: -delay, step });
  }
  function updateFx(dt) {
    for (let i = liveFx.length - 1; i >= 0; i--) {
      const fx = liveFx[i];
      fx.age += dt;
      if (fx.age < 0) continue;
      if (fx.age >= fx.life) {
        fx.sprite.visible = false;
        fxPool.push(fx.sprite);
        liveFx.splice(i, 1);
        continue;
      }
      fx.sprite.visible = true;
      fx.step(fx, fx.age / fx.life);
    }
  }
  // The arc the blade really cut through, kept from the smear as it lands (see markCut): where
  // its tip and the inner end of the smear were, from the wind-up to the hit, with how far
  // along the tip's path each was. A point on it: t runs from the wind-up end to the hit,
  // `inset` from the inner end (0) to the tip (1).
  const camRight = new THREE.Vector3();
  const camUp = new THREE.Vector3();
  const cutPath = [];
  function alongCut(t, inset = 0.9) {
    camRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    if (!cutPath.length) return new THREE.Vector3();
    const want = t * cutPath[cutPath.length - 1].at;
    let i = 1;
    while (i < cutPath.length - 1 && cutPath[i].at < want) i++;
    const a = cutPath[i - 1] || cutPath[0];
    const b = cutPath[i] || a;
    const k = b.at > a.at ? (want - a.at) / (b.at - a.at) : 0;
    const base = a.base.clone().lerp(b.base, k);
    return a.tip.clone().lerp(b.tip, k).sub(base).multiplyScalar(inset).add(base);
  }

  // Sparks flung out and up from a point, slowing in the air and falling: each a streak
  // pointing the way it flies, stretched by its speed
  const SPARK_DRAG = 2.4;
  const SPARK_G = -12;
  function sparkBurst(style, at, count, { delay = 0 } = {}) {
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * (0.08 + Math.random() * 0.84);
      const speed = 4.5 + Math.random() * 4.5;
      const vx = Math.cos(angle) * speed;
      const vy0 = Math.sin(angle) * speed;
      const terminal = SPARK_G / SPARK_DRAG;
      spawnFx({
        map: sparkTex[style],
        life: 0.5 + Math.random() * 0.4,
        delay: delay + Math.random() * 0.06,
        step: (fx, t) => {
          // in closed form, so a slow frame never throws one off course
          const fade = Math.exp(-SPARK_DRAG * fx.age);
          const k = (1 - fade) / SPARK_DRAG;
          const vxNow = vx * fade;
          const vyNow = terminal + (vy0 - terminal) * fade;
          const shrink = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
          fx.sprite.center.set(0.85, 0.5);
          fx.sprite.scale.set((0.25 + Math.hypot(vxNow, vyNow) * 0.08) * shrink, 0.15 * shrink, 1);
          fx.sprite.position.copy(at).addScaledVector(camRight, vx * k).addScaledVector(camUp, terminal * fx.age + (vy0 - terminal) * k);
          fx.sprite.material.rotation = Math.atan2(vyNow, vxNow);
        },
      });
    }
  }
  const boltTex = canvasTexture(128, 256);
  track(boltTex.texture);
  drawBlackBolt(boltTex.ctx, 128, 256);
  const bolts = Array.from({ length: 3 }, () => {
    const bolt = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: boltTex.texture, transparent: true, depthTest: false, depthWrite: false })));
    bolt.visible = false;
    bolt.raycast = noRaycast;
    bolt.renderOrder = 13;
    scene.add(bolt);
    return bolt;
  });
  function sakuraFall() {
    petals.forEach((petal, i) => {
      gsap.killTweensOf([petal.position, petal.material]);
      petal.visible = true;
      // petals tumble: their width flips back and forth as they turn over in the air
      const size = (petal.userData.blossom ? 0.34 : 0.26) + Math.random() * 0.1;
      petal.scale.set(size, size, 1);
      gsap.killTweensOf(petal.scale);
      if (!petal.userData.blossom) gsap.to(petal.scale, { x: size * 0.25, duration: 0.35 + Math.random() * 0.3, yoyo: true, repeat: 9, ease: "sine.inOut", delay: i * 0.03 });
      petal.material.opacity = 1;
      const x = katanaWorld.x - 2.5 + Math.random() * 4;
      const z = katanaWorld.z + 0.1 + Math.random() * 0.4;
      petal.position.set(x, katanaWorld.y + 1.2 + Math.random() * 1.6, z);
      const fall = 2.2 + Math.random() * 1.2;
      gsap.to(petal.position, { y: katanaWorld.y - 2.6 - Math.random(), x: x + 0.6 + Math.random() * 0.8, duration: fall, delay: i * 0.03, ease: "sine.in" });
      gsap.fromTo(petal.material, { rotation: Math.random() * 3 }, { rotation: `+=${4 + Math.random() * 4}`, duration: fall, delay: i * 0.03 });
      gsap.to(petal.material, { opacity: 0, delay: fall - 0.4 + i * 0.03, duration: 0.4, onComplete: () => (petal.visible = false) });
    });
  }
  // Sandai Kitetsu: sparks thrown off the cut, from two points along it
  function cursedSparks() {
    sparkBurst("kitetsu", alongCut(0.6), 7);
    sparkBurst("kitetsu", alongCut(0.95), 7, { delay: 0.04 });
  }
  // Enma: black lightning cracking down off the cut in three places, one after another, each
  // flickering (on, off, on again) the way lightning does
  function enmaLightning() {
    bolts.forEach((bolt, i) => {
      gsap.killTweensOf(bolt.material);
      // hanging from the arc the tip swept, down past it
      const size = 1.8 + Math.random() * 0.6;
      bolt.position.copy(alongCut(0.35 + i * 0.3, 1)).addScaledVector(camUp, -size * 0.3);
      bolt.scale.set(size * 0.5, size, 1);
      bolt.material.rotation = (Math.random() - 0.5) * 0.7;
      bolt.material.opacity = 0;
      bolt.visible = true;
      gsap.timeline({ delay: i * 0.05, onComplete: () => (bolt.visible = false) })
        .set(bolt.material, { opacity: 1 })
        .set(bolt.material, { opacity: 0 }, 0.05)
        .set(bolt.material, { opacity: 1 }, 0.09)
        .set(bolt.material, { opacity: 0 }, 0.22);
    });
    sfx.thunder();
  }

  const TECHNIQUES = [
    "SHISHI SONSON!", "36 POUND CANNON!", "DAI SHINKAN!", "ONI GIRI!", "TATSU MAKI!", "SANZEN SEKAI!",
    "YAKKODORI!", "HIRYU KAEN!", "RENGOKU ONI GIRI!", "ASURA: ICHIBUGIN!", "KOKUJO: O TATSUMAKI!",
    "ICHIDAI SANZEN DAISEN SEKAI!", "HYAKUHACHI POUND HO!", "ENMA: KING OF HELL!",
  ];
  let techniqueIndex = Math.floor(Math.random() * TECHNIQUES.length);
  const SHOUT_W = 4.5;
  const SHOUT_H = 2.25;
  const katanaWorld = new THREE.Vector3();
  let slashing = false;
  // the strike under way, and whether it's past the cut and only going home
  let activeSlash = null;
  let activeSword = null;
  let recovering = false;
  // The impact frame: for two or three frames as the blade bites, the picture inverts, the
  // way anime punctuates a hit. Left out for anyone who's asked for reduced motion.
  const impactFlash = document.createElement("div");
  Object.assign(impactFlash.style, {
    position: "absolute",
    inset: "0",
    background: "#fff",
    mixBlendMode: "difference",
    pointerEvents: "none",
    opacity: "0",
  });
  container.appendChild(impactFlash);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  function impactFrame() {
    if (reducedMotion.matches) return;
    impactFlash.style.opacity = "0.9";
    gsap.delayedCall(0.045, () => (impactFlash.style.opacity = "0"));
  }
  let shoutTimer = null;

  // Nudges a sprite of the given world size back inside the screen, below the page's top bar
  // (the 3D site's title and "Back to desk" buttons), wherever the camera and window size put it
  const TOP_BAR_PX = 80;
  const screenAxis = new THREE.Vector3();
  function keepOnScreen(sprite, w, h) {
    const centre = sprite.position.clone().project(camera);
    const upW = screenAxis.set(0, 1, 0).applyQuaternion(camera.quaternion).clone();
    const rightW = screenAxis.set(1, 0, 0).applyQuaternion(camera.quaternion).clone();
    const halfY = sprite.position.clone().addScaledVector(upW, h / 2).project(camera).y - centre.y;
    const halfX = sprite.position.clone().addScaledVector(rightW, w / 2).project(camera).x - centre.x;
    const top = 1 - (2 * TOP_BAR_PX) / (container.clientHeight || 1);
    let dy = 0;
    if (centre.y + halfY > top) dy = top - (centre.y + halfY);
    else if (centre.y - halfY < -0.95) dy = -0.95 - (centre.y - halfY);
    let dx = 0;
    if (centre.x + halfX > 0.96) dx = 0.96 - (centre.x + halfX);
    else if (centre.x - halfX < -0.96) dx = -0.96 - (centre.x - halfX);
    // back from screen units to world units along the camera's axes
    sprite.position.addScaledVector(upW, (dy * (h / 2)) / halfY).addScaledVector(rightW, (dx * (w / 2)) / halfX);
  }

  // The cut itself, as anime draws it: one smear, the strip of air the blade swept through,
  // locked to the blade at its front and tapering away behind to a hairline at the tip's edge.
  // It holds its whole body for a few frames, then is eaten away fast from the inside, raggedly,
  // rather than fading. Bold and flat: white over its outer half (the side the tip swept), the
  // sword's colour inside that, ink along the tip's edge and wherever it's eaten.
  const TRAIL_SAMPLES = 96;
  const TRAIL_LIFE = 0.2;
  const TRAIL_COLORS = { wado: "#bfe9ff", kitetsu: "#e11d48", enma: "#7e22ce" };
  const trailGeo = track(new THREE.BufferGeometry());
  trailGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL_SAMPLES * 6), 3));
  trailGeo.setAttribute("age", new THREE.BufferAttribute(new Float32Array(TRAIL_SAMPLES * 2), 1));
  trailGeo.setAttribute("side", new THREE.BufferAttribute(new Float32Array(TRAIL_SAMPLES * 2), 1));
  trailGeo.setAttribute("born", new THREE.BufferAttribute(new Float32Array(TRAIL_SAMPLES * 2), 1));
  trailGeo.setAttribute("lead", new THREE.BufferAttribute(new Float32Array(TRAIL_SAMPLES * 2), 1));
  trailGeo.setIndex(Array.from({ length: TRAIL_SAMPLES - 1 }, (_, i) => [2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2]).flat());
  const trailColor = { value: new THREE.Color() };
  const trail = new THREE.Mesh(trailGeo, track(new THREE.ShaderMaterial({
    uniforms: { color: trailColor, ink: { value: new THREE.Color("#1a1714") } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      attribute float age;
      attribute float side;
      attribute float born;
      attribute float lead;
      varying float vAge;
      varying float vSide;
      varying float vBorn;
      varying float vLead;
      void main() {
        vAge = age;
        vSide = side;
        vBorn = born;
        vLead = lead;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 color;
      uniform vec3 ink;
      varying float vAge;
      varying float vSide;
      varying float vBorn;
      varying float vLead;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      float noise(float x) {
        float i = floor(x);
        float f = fract(x);
        return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
      }
      void main() {
        // eaten from the inside as it ages, slow then fast; the ragged edge is keyed to when
        // each stretch was laid down, so it stays put on the stroke rather than crawling
        float ragged = noise(vBorn * 90.0) - 0.5;
        float inner = smoothstep(0.3, 1.0, vAge) * 1.05 + ragged * 0.2 * vAge;
        // the stretch carried on past the blade narrows to a point on the tip's edge
        inner = max(inner, pow(vLead, 1.4));
        if (vSide < inner) discard;
        vec3 c = color;
        if (vSide > 0.965) c = ink;
        else if (vSide > 0.5) c = vec3(1.0);
        else if (vSide < inner + 0.045) c = ink;
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));
  trail.raycast = noRaycast;
  trail.frustumCulled = false;
  trail.renderOrder = 12;
  trail.visible = false;
  scene.add(trail);
  const trailSamples = [];
  let trailSword = null;
  let trailClock = 0;
  // where the blade was last frame: its hand, and the inner and outer ends of the smear
  const trailLast = { hand: new THREE.Vector3(), base: new THREE.Vector3(), tip: new THREE.Vector3(), at: 0, set: false };
  const trailNow = { hand: new THREE.Vector3(), base: new THREE.Vector3(), tip: new THREE.Vector3() };
  function startTrail(sword) {
    trailSword = sword;
    trailSamples.length = 0;
    trailLast.set = false;
    trailColor.value.set(TRAIL_COLORS[sword.style]);
  }
  function stopTrail() {
    trailSword = null;
  }
  // As the blade lands the smear stops following it and carries on round a little way past it,
  // along the circle the tip was swinging through, about the hand, narrowing to a point: the
  // way anime draws a cut, its arc running out just ahead of the blade.
  const CUT_CARRY = 0.3;
  const CARRY_STEPS = 6;
  const carryAxis = new THREE.Vector3();
  const carryTurn = new THREE.Quaternion();
  const carryArm = new THREE.Vector3();
  function extendCut() {
    const sword = trailSword;
    stopTrail();
    if (!sword || !trailSamples.length) return;
    const blade = sword.bladeGroup;
    blade.localToWorld(trailNow.hand.set(-TSUKA_L / 2, 0, 0));
    blade.localToWorld(trailNow.base.set(BLADE_L * 0.3, bow(BLADE_L * 0.3), 0));
    blade.localToWorld(trailNow.tip.set(BLADE_L + 0.12, bow(BLADE_L + 0.12) + 0.02, 0));
    // the plane of the swing: round the hand, from where the tip was a little way back to now
    const back = trailSamples.find((sample) => sample.tip.distanceTo(trailNow.tip) > 0.3);
    if (!back) return;
    carryAxis.subVectors(back.tip, trailNow.hand).cross(carryArm.subVectors(trailNow.tip, trailNow.hand)).normalize();
    for (let step = 0; step <= CARRY_STEPS; step++) {
      const k = step / CARRY_STEPS;
      carryTurn.setFromAxisAngle(carryAxis, CUT_CARRY * k);
      const sample = {
        base: carryArm.subVectors(trailNow.base, trailNow.hand).applyQuaternion(carryTurn).add(trailNow.hand).clone(),
        tip: carryArm.subVectors(trailNow.tip, trailNow.hand).applyQuaternion(carryTurn).add(trailNow.hand).clone(),
        at: trailClock,
        lead: k,
      };
      trailSamples.unshift(sample);
      if (trailSamples.length > TRAIL_SAMPLES) trailSamples.pop();
    }
  }
  // As the blade lands: keep the arc it cut (the smear so far, oldest first, the held wind-up
  // folded into one point) for the sparks thrown off it (alongCut)
  function markCut() {
    cutPath.length = 0;
    let at = 0;
    for (let i = trailSamples.length - 1; i >= 0; i--) {
      const sample = trailSamples[i];
      const last = cutPath[cutPath.length - 1];
      if (last) {
        const step = sample.tip.distanceTo(last.tip);
        if (step < 1e-4) continue;
        at += step;
      }
      cutPath.push({ base: sample.base.clone(), tip: sample.tip.clone(), at });
    }
  }
  const armFrom = new THREE.Vector3();
  const armTo = new THREE.Vector3();
  const armTurn = new THREE.Quaternion();
  const noTurn = new THREE.Quaternion();
  const armPart = new THREE.Quaternion();
  const handAt = new THREE.Vector3();
  // A point k of the way between last frame and this one, swung round the hand rather than
  // cut straight across, so a fast cut still sweeps a true arc
  function swungPoint(from, to, k, out) {
    armFrom.subVectors(from, trailLast.hand);
    armTo.subVectors(to, trailNow.hand);
    const fromLength = armFrom.length();
    const toLength = armTo.length();
    armTurn.setFromUnitVectors(armFrom.normalize(), armTo.normalize());
    armPart.slerpQuaternions(noTurn, armTurn, k);
    return out.copy(armFrom).applyQuaternion(armPart).multiplyScalar(fromLength + (toLength - fromLength) * k)
      .add(handAt.lerpVectors(trailLast.hand, trailNow.hand, k));
  }
  const TRAIL_STEPS = 4;
  // Each frame: where the blade is (the outer half of it, out to the tip) while it's cutting,
  // with in-between samples back to last frame, and the strip rebuilt from the samples still
  // young enough to show
  function updateTrail(dt) {
    const before = trailClock;
    trailClock += dt;
    if (trailSword) {
      const blade = trailSword.bladeGroup;
      blade.localToWorld(trailNow.hand.set(-TSUKA_L / 2, 0, 0));
      blade.localToWorld(trailNow.base.set(BLADE_L * 0.3, bow(BLADE_L * 0.3), 0));
      blade.localToWorld(trailNow.tip.set(BLADE_L + 0.12, bow(BLADE_L + 0.12) + 0.02, 0));
      for (let step = trailLast.set ? 1 : TRAIL_STEPS; step <= TRAIL_STEPS; step++) {
        const k = step / TRAIL_STEPS;
        const sample = trailSamples.length >= TRAIL_SAMPLES ? trailSamples.pop() : { base: new THREE.Vector3(), tip: new THREE.Vector3() };
        if (k < 1) {
          swungPoint(trailLast.base, trailNow.base, k, sample.base);
          swungPoint(trailLast.tip, trailNow.tip, k, sample.tip);
        } else {
          sample.base.copy(trailNow.base);
          sample.tip.copy(trailNow.tip);
        }
        sample.at = before + dt * k;
        sample.lead = 0;
        trailSamples.unshift(sample);
      }
      trailLast.hand.copy(trailNow.hand);
      trailLast.base.copy(trailNow.base);
      trailLast.tip.copy(trailNow.tip);
      trailLast.set = true;
    }
    while (trailSamples.length && trailClock - trailSamples[trailSamples.length - 1].at > TRAIL_LIFE) trailSamples.pop();
    trail.visible = trailSamples.length > 1;
    if (!trail.visible) return;
    const pos = trailGeo.attributes.position;
    const age = trailGeo.attributes.age;
    const side = trailGeo.attributes.side;
    const born = trailGeo.attributes.born;
    const lead = trailGeo.attributes.lead;
    for (let i = 0; i < TRAIL_SAMPLES; i++) {
      // past the samples there are, repeat the oldest: those triangles are empty
      const s = trailSamples[Math.min(i, trailSamples.length - 1)];
      const a = Math.min(1, (trailClock - s.at) / TRAIL_LIFE);
      pos.setXYZ(2 * i, s.base.x, s.base.y, s.base.z);
      pos.setXYZ(2 * i + 1, s.tip.x, s.tip.y, s.tip.z);
      age.setX(2 * i, a);
      age.setX(2 * i + 1, a);
      side.setX(2 * i, 0);
      side.setX(2 * i + 1, 1);
      born.setX(2 * i, s.at);
      born.setX(2 * i + 1, s.at);
      lead.setX(2 * i, s.lead);
      lead.setX(2 * i + 1, s.lead);
    }
    pos.needsUpdate = true;
    age.needsUpdate = true;
    side.needsUpdate = true;
    born.needsUpdate = true;
    lead.needsUpdate = true;
  }

  function tossKitetsu(sword, restY) {
    if (slashing) return;
    slashing = true;
    const g = sword.tierGroup;
    gsap.killTweensOf([g.position, g.rotation]);
    sfx.whoosh({ duration: 0.4 });
    gsap.timeline({ onComplete: () => (slashing = false) })
      .to(g.position, { y: restY + 2.4, z: 0.6, duration: 0.55, ease: "power2.out" })
      .to(g.rotation, { z: Math.PI * 4, duration: 1.1, ease: "none" }, 0)
      .to(g.position, { y: restY, z: 0.2, duration: 0.55, ease: "power2.in" }, 0.55)
      .set(g.rotation, { z: 0 })
      .call(() => {
        sfx.rackLand({ strength: 0.8 });
        kickTassels(sword.sayaGroup, 1);
        g.getWorldPosition(katanaWorld);
        drawShout(shoutTex.ctx, 640, 320, "THE CURSE LIKES ME!", { style: "kitetsu" });
        shoutTex.texture.needsUpdate = true;
        shout.position.set(katanaWorld.x - 2.4, katanaWorld.y + 1.6, katanaWorld.z + 0.25);
        keepOnScreen(shout, SHOUT_W, SHOUT_H);
        gsap.fromTo(shout.scale, { x: 1, y: 0.5 }, { x: SHOUT_W, y: SHOUT_H, duration: 0.3, ease: "back.out(3)", overwrite: true });
        clearTimeout(shoutTimer);
        shoutTimer = setTimeout(() => gsap.to(shout.scale, { x: 0.001, y: 0.001, duration: 0.2, ease: "power2.in", overwrite: true }), 2000);
      })
      .fromTo(g.position, { y: restY + 0.06 }, { y: restY, duration: 0.3, ease: "bounce.out" });
  }
  function slashSword(sword) {
    if (slashing) {
      // Clicked again while the last blade is only going home: it hurries back, and this one
      // goes as soon as it's in
      if (recovering) {
        activeSlash.timeScale(3);
        activeSword.afterSlash = () => slashSword(sword);
      }
      return;
    }
    slashing = true;
    discover("katana");
    const technique = TECHNIQUES[techniqueIndex++ % TECHNIQUES.length];
    const out = drawTurn(BLADE_L + 0.25);
    const home = -SORI_R;
    // the hand just high enough that the blade, swung down to level and a little past it, still
    // clears the top sword whichever tier this one hangs on (and the raised tip stays in frame)
    const aboveRack = RACK_TIERS[0] + 0.62 - sword.yRack;
    gsap.killTweensOf([sword.drawPivot.rotation, sword.bladeGroup.position, sword.bladeGroup.rotation]);
    if (sword.style === "enma") {
      // the aura rises off the blade as it's drawn, flickering, and fades as it's sheathed
      sword.bladeGroup.add(haki);
      haki.position.set(BLADE_L / 2 + 0.05, bow(BLADE_L / 2) + 0.02, 0);
      haki.scale.set(BLADE_L * 1.35, 0.75, 1);
      haki.visible = true;
      // it swells in, then breathes slowly while the sword is out
      gsap.killTweensOf([haki.material, haki.scale]);
      gsap.fromTo(haki.material, { opacity: 0 }, { opacity: 0.95, duration: 0.7, delay: 0.2, ease: "sine.out" });
      gsap.fromTo(haki.scale, { y: 0.55 }, { y: 0.95, duration: 0.7, delay: 0.2, ease: "sine.out" });
      gsap.to(haki.scale, { y: 0.8, x: BLADE_L * 1.28, duration: 0.65, yoyo: true, repeat: 3, ease: "sine.inOut", delay: 0.9 });
    }
    // Drawn along the saya's curve, swung free of it, then slid back in along the same curve
    const tl = gsap.timeline({
      onComplete: () => {
        slashing = false;
        recovering = false;
        // a toss asked for mid-strike goes once the blade is home
        const next = sword.afterSlash;
        sword.afterSlash = null;
        if (next) next();
      },
    });
    activeSlash = tl;
    activeSword = sword;
    if (sword.style === "kitetsu") {
      // the cursed blade stirs first: it shudders in the rack and growls, wanting to cut
      const x = sword.tierGroup.position.x;
      sfx.growl({ duration: 0.4 });
      tl.fromTo(sword.tierGroup.position, { x: x - 0.018 }, { x: x + 0.018, duration: 0.035, repeat: 5, yoyo: true, ease: "none" })
        .set(sword.tierGroup.position, { x });
    }
    tl
      .call(() => {
        sword.steel.visible = true;
        sfx.shing();
        kickTassels(sword.sayaGroup, 1);
      })
      .to(sword.drawPivot.rotation, { z: out, duration: 0.42, ease: "power2.in" })
      // Up past the handle end and over above the whole rack in one curve (rising fast while
      // it's slow to move over), never passing across a saya
      .to(sword.bladeGroup.position, { y: home + aboveRack, duration: 0.38, ease: "power3.out" })
      .to(sword.bladeGroup.position, { z: -0.7, duration: 0.2, ease: "power2.out" }, "<")
      .to(sword.bladeGroup.position, { x: 2.1, duration: 0.38, ease: "power2.in" }, "<")
      .to(sword.bladeGroup.rotation, { z: 0.55, duration: 0.3, ease: "power2.inOut" }, "<0.08")
      // Wind-up: cocked back over the rack (not so high the tip leaves the frame), settling
      // into a held beat long enough to read
      .to(sword.bladeGroup.rotation, { z: 0.95, duration: 0.28, ease: "power3.out" })
      .to(sword.bladeGroup.position, { x: 1.8, duration: 0.28, ease: "power3.out" }, "<")
      .call(() => startTrail(sword))
      .to({}, { duration: 0.1 })
      // The cut: all at once, seven frames or so, one sweep from high over the rack right down
      // past level to low in front of it (passing in front of the other swords), the hand
      // carried along with it on the same curve
      .to(sword.bladeGroup.rotation, { z: -0.8, duration: 0.12, ease: "power3.in" })
      .to(sword.bladeGroup.position, { x: 2.75, y: "-=0.12", duration: 0.12, ease: "power3.in" }, "<")
      // The hit, staggered as anime times it: the impact frame and the jolt on the hit itself,
      // the sword's own mark a few frames on, then the technique's name
      .addLabel("hit")
      .call(() => {
        sword.bladeGroup.getWorldPosition(katanaWorld);
        extendCut();
        markCut();
        impactFrame();
        sfx.slash();
        if (sword.style === "wado") {
          // light catching the tip as it cuts
          sword.bladeGroup.localToWorld(tipAt.set(BLADE_L + 0.12, bow(BLADE_L + 0.12) + 0.02, 0));
          glint.position.copy(tipAt);
          glint.visible = true;
          gsap.fromTo(glint.scale, { x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out", onComplete: () => (glint.visible = false) });
          gsap.fromTo(glint.material, { rotation: 0 }, { rotation: 0.8, duration: 0.28 });
        }
        // The hit jolts the camera, hard at first and settling fast; Enma's Haki a little harder
        const tx = cam.tx;
        const ty = cam.ty;
        const kick = sword.style === "enma" ? 0.08 : 0.05;
        const shake = gsap.timeline();
        [1, -0.6, 0.3, -0.12].forEach((k) => shake.to(cam, { tx: tx + kick * k, ty: ty - kick * 0.6 * k, duration: 0.04, ease: "sine.inOut" }));
        shake.to(cam, { tx, ty, duration: 0.05, ease: "sine.out" });
      })
      // Hit-stop: the blade holds dead still a beat as it bites, then settles the last of the way
      .to({}, { duration: 0.1 })
      .to(sword.bladeGroup.rotation, { z: -0.86, duration: 0.14, ease: "power3.out" })
      // Zanshin: held there, low, a long breath
      .to({}, { duration: 0.45 })
      // Chiburi: the blade lifted a little, then flicked down sharp to throw it clean
      .to(sword.bladeGroup.rotation, { z: -0.6, duration: 0.25, ease: "power2.inOut" })
      .to(sword.bladeGroup.rotation, { z: -0.92, duration: 0.08, ease: "power3.in" })
      .call(() => sfx.whoosh({ duration: 0.15, up: false }))
      .to(sword.bladeGroup.rotation, { z: -0.84, duration: 0.18, ease: "power2.out" })
      .to({}, { duration: 0.25 })
      // from here it's only going home, and a click hurries it (see the top)
      .call(() => (recovering = true))
      // Back the way it came, unhurried: raised level as it goes over to the handle end (in front
      // of the other swords), dropping once it's there, then in to the rack
      .to(sword.bladeGroup.rotation, { z: 0, duration: 0.75, ease: "power2.inOut" })
      .to(sword.bladeGroup.position, { x: 0, duration: 0.75, ease: "power2.inOut" }, "<")
      .to(sword.bladeGroup.position, { y: home, duration: 0.45, ease: "power2.in" }, "<0.4")
      .to(sword.bladeGroup.position, { z: 0, duration: 0.15, ease: "power2.in" })
      // Noto: slid home slowly most of the way, then the last of it snaps in with a click
      .to(sword.drawPivot.rotation, { z: out * 0.12, duration: 0.5, ease: "sine.inOut" })
      .to(sword.drawPivot.rotation, { z: 0, duration: 0.07, ease: "power4.in" })
      .call(() => {
        sfx.sheathe();
        kickTassels(sword.sayaGroup, 0.8);
        sword.steel.visible = false;
        if (sword.style === "enma") gsap.to(haki.material, { opacity: 0, duration: 0.5, ease: "sine.in", onComplete: () => (haki.visible = false) });
      })
      .fromTo(katanaRack.scale, { y: KATANA_SCALE * 0.94 }, { y: KATANA_SCALE, duration: 0.3, ease: "back.out(3)" })
      // (placed at the hit, after the rest is laid down, so they don't push it along)
      .call(() => {
        if (sword.style === "wado") sakuraFall();
        else if (sword.style === "kitetsu") cursedSparks();
        else enmaLightning();
      }, null, "hit+=0.05")
      .call(() => {
        drawShout(shoutTex.ctx, 640, 320, technique, { style: sword.style });
        shoutTex.texture.needsUpdate = true;
        // Close by the cut: up and a little to the left of the hand, over the top of the arc
        shout.position.set(katanaWorld.x - 2.4, katanaWorld.y + 2.1, katanaWorld.z + 0.25);
        keepOnScreen(shout, SHOUT_W, SHOUT_H);
        gsap.fromTo(shout.scale, { x: 1, y: 0.5 }, { x: SHOUT_W, y: SHOUT_H, duration: 0.3, ease: "back.out(3)", overwrite: true });
        gsap.fromTo(shout.material, { rotation: 0.15 }, { rotation: 0, duration: 0.5, ease: "elastic.out(1.2, 0.4)" });
        clearTimeout(shoutTimer);
        shoutTimer = setTimeout(() => gsap.to(shout.scale, { x: 0.001, y: 0.001, duration: 0.2, ease: "power2.in", overwrite: true }), 1600);
      }, null, "hit+=0.1");
  }

  // Common scabbard curve
  const sayaCurve = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => {
    const x = 0.04 + (i / 8) * (BLADE_L + 0.16);
    return new THREE.Vector3(x, bow(x), 0);
  }));

  const hitAreaMat = track(new THREE.MeshBasicMaterial({ visible: false }));
  // The sword under the pointer, and a timer for its card once the camera has come in
  let swordZoomTimer = null;
  // The sword's card: a sprite beside the rack, level with the sword, always facing the camera
  const SWORD_CARD = { w: 3.7, h: 3.7 * (480 / 760) };
  const swordCardTex = canvasTexture(760, 480);
  track(swordCardTex.texture);
  const swordCard = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: swordCardTex.texture, depthTest: false, transparent: true })));
  swordCard.renderOrder = 12;
  swordCard.raycast = noRaycast;
  swordCard.scale.set(0.001, 0.001, 1);
  scene.add(swordCard);
  const swordCardAt = new THREE.Vector3();
  function showSwordCard(sword) {
    drawSwordCard(swordCardTex.ctx, 760, 480, sword.info);
    swordCardTex.texture.needsUpdate = true;
    // Left of the rack, level with the sword
    katanaRack.getWorldPosition(swordCardAt);
    sword.tierGroup.getWorldPosition(swordCard.position);
    // (the card's art starts at the top of its canvas, so the sprite sits a little low to put
    // the card itself level with the sword)
    swordCard.position.set(swordCardAt.x - (SWORD_SPAN / 2) * KATANA_SCALE - SWORD_CARD.w / 2 - 0.25, swordCard.position.y - 0.25, swordCardAt.z + 0.8);
    gsap.fromTo(swordCard.scale, { x: SWORD_CARD.w * 0.85, y: SWORD_CARD.h * 0.85 }, { x: SWORD_CARD.w, y: SWORD_CARD.h, duration: 0.3, ease: "back.out(2)", overwrite: true });
  }
  function hideSwordCard() {
    gsap.to(swordCard.scale, { x: 0.001, y: 0.001, duration: 0.15, ease: "power2.in", overwrite: true });
  }
  // The rack's close-up has a spotlight on it: everything round the strike's space (the cork
  // board, the gauntlet, the desk) sinks into shadow as the camera comes in, so the eye stays on
  // the swords. One screen-filling layer of ink with a soft oval hole over the rack and the air
  // the strike sweeps through (high above it for the wind-up, low under it for the finish: so
  // taller than it is wide), drawn after the room but before the cards, plates and the cut's
  // effects, which stay bright.
  const SPOT_REACH = { x: 3.0, y: 4.0 };
  const spotUniforms = {
    center: { value: new THREE.Vector2() },
    radius: { value: new THREE.Vector2(1, 1) },
    strength: { value: 0 },
    ink: { value: new THREE.Color("#1a1714") },
  };
  const spotlight = new THREE.Mesh(track(new THREE.PlaneGeometry(2, 2)), track(new THREE.ShaderMaterial({
    uniforms: spotUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader: `
      varying vec2 vNdc;
      void main() {
        vNdc = position.xy;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: `
      uniform vec2 center;
      uniform vec2 radius;
      uniform float strength;
      uniform vec3 ink;
      varying vec2 vNdc;
      void main() {
        float d = length((vNdc - center) / radius);
        gl_FragColor = vec4(ink, strength * 0.7 * smoothstep(0.75, 1.15, d));
      }`,
  })));
  spotlight.frustumCulled = false;
  spotlight.raycast = noRaycast;
  spotlight.renderOrder = 10;
  spotlight.visible = false;
  scene.add(spotlight);
  // (kept out of the ambient-occlusion pass, which would read it as a wall across the screen)
  const aoOverride = aoPass.overrideVisibility.bind(aoPass);
  aoPass.overrideVisibility = () => {
    aoOverride();
    spotlight.visible = false;
  };
  const spotAt = new THREE.Vector3();
  const spotEdge = new THREE.Vector3();
  // Each frame: easing in or out with the close-up, and kept centred on the rack wherever the
  // camera is. The gauntlet below the rack is put away for the close-up altogether.
  function updateSpotlight(dt) {
    gauntlet.visible = focus.name !== "swords";
    const strength = spotUniforms.strength;
    strength.value += ((focus.name === "swords" ? 1 : 0) - strength.value) * (1 - Math.pow(0.02, dt));
    spotlight.visible = strength.value > 0.005;
    if (!spotlight.visible) return;
    katanaRack.getWorldPosition(spotAt);
    spotEdge.copy(spotAt).project(camera);
    spotUniforms.center.value.set(spotEdge.x, spotEdge.y);
    const cx = spotEdge.x;
    const cy = spotEdge.y;
    spotUniforms.radius.value.set(
      Math.abs(spotEdge.copy(spotAt).add(screenAxis.set(SPOT_REACH.x, 0, 0)).project(camera).x - cx),
      Math.abs(spotEdge.copy(spotAt).add(screenAxis.set(0, SPOT_REACH.y, 0)).project(camera).y - cy),
    );
  }

  // The rack's own close-up: clicking a bracket (or a sword, from further out) comes in to it
  register(katanaRack, {
    focus: "swords",
    onLeave: () => {
      clearTimeout(swordZoomTimer);
      hideSwordCard();
    },
  });

  // Handle wraps: cord over ray skin, the diamonds showing front and back
  const tsukaMat = (cord, skin) => {
    const tex = canvasTexture(256, 512);
    track(tex.texture);
    drawTsukaWrap(tex.ctx, 256, 512, { cord, skin });
    const mat = toon("#ffffff");
    mat.map = tex.texture;
    return mat;
  };
  // Swords sit in the hooks centred on the rack: handle on the right, saya to the left. Each
  // is built handle-left and turned round, so its front details are on its local -z.
  const TSUKA_L = 0.95;
  // Centred on the rack: half the way from the kashira to the kojiri
  const SWORD_X = (BLADE_L + 0.2 - (TSUKA_L + 0.04)) / 2;
  const SWORD_SPAN = BLADE_L + TSUKA_L + 0.3;
  const FRONT = -1;
  // A ring round the saya at x along it, following its curve
  const sayaRing = (saya, x, w, material, r = 0.085) => {
    const ring = mesh(new THREE.CylinderGeometry(r, r, w, 18), material, { outline: 0.01 });
    ring.rotation.z = Math.PI / 2 + Math.atan(2 * SORI * x / BLADE_L ** 2);
    ring.position.set(x, bow(x), 0);
    saya.add(ring);
    return ring;
  };
  // A ring round the handle (fuchi, menuki band, kashira)
  const tsukaRing = (blade, x, w, material, r = 0.072) => {
    const ring = mesh(new THREE.CylinderGeometry(r, r, w, 18), material, { outline: 0.01 });
    ring.rotation.z = Math.PI / 2;
    ring.scale.z = 0.82;
    ring.position.x = x;
    blade.add(ring);
    return ring;
  };

  // A complete katana: saya, and the blade with its habaki, tsuba and tsuka (drawn together)
  const buildKatana = (yRack, { info, style, bladeMat, sayaMat, tsukaMat: handleMat, tsubaMaker, addDetails, goldColor = "#d4a72c", mouthRing = true }) => {
    // Each sword has its own gold, so only the hovered one glints
    const gold = toon(goldColor);
    const tierGroup = new THREE.Group();
    tierGroup.position.set(SWORD_X, yRack + 0.02, 0.2);
    tierGroup.rotation.y = Math.PI;
    katanaRack.add(tierGroup);

    const sayaGroup = new THREE.Group();
    sayaGroup.add(mesh(new THREE.TubeGeometry(sayaCurve, 40, 0.075, 14), sayaMat, { outline: 0.02 }));
    // koiguchi (the mouth) and kojiri (the capped tip)
    if (mouthRing) sayaRing(sayaGroup, 0.07, 0.07, gold, 0.086);
    const kojiri = mesh(new THREE.SphereGeometry(0.084, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), gold, { outline: 0.012 });
    kojiri.rotation.z = -Math.PI / 2 + Math.atan(2 * SORI / BLADE_L);
    kojiri.scale.y = 0.6;
    kojiri.position.set(BLADE_L + 0.2, bow(BLADE_L + 0.2), 0);
    sayaGroup.add(kojiri);
    sayaRing(sayaGroup, BLADE_L + 0.15, 0.1, gold, 0.088);
    tierGroup.add(sayaGroup);

    // The blade and handle hang from a pivot at the centre of the saya's curve (see SORI_R)
    const drawPivot = new THREE.Group();
    drawPivot.position.y = SORI_R;
    tierGroup.add(drawPivot);
    const bladeGroup = new THREE.Group();
    bladeGroup.position.y = -SORI_R;
    const steel = new THREE.Group();
    steel.add(mesh(bladeShape(0), bladeMat, { outline: 0.018 }));
    steel.visible = false;
    const habaki = at(mesh(rbox(0.09, 0.14, 0.05, 0.015), gold, { outline: 0.012 }), 0.045, 0, 0);
    const tsuba = tsubaMaker(gold);
    const tsuka = mesh(new THREE.CylinderGeometry(0.066, 0.062, TSUKA_L, 20), handleMat, { outline: 0.02 });
    tsuka.rotation.z = Math.PI / 2;
    tsuka.scale.z = 0.82;
    tsuka.position.x = -0.04 - TSUKA_L / 2;
    bladeGroup.add(steel, habaki, tsuba, tsuka);
    tsukaRing(bladeGroup, -0.07, 0.05, gold);
    const kashira = mesh(new THREE.SphereGeometry(0.07, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), gold, { outline: 0.012 });
    kashira.rotation.z = Math.PI / 2;
    kashira.scale.set(1, 0.5, 0.82);
    kashira.position.x = -0.04 - TSUKA_L;
    tsukaRing(bladeGroup, -0.04 - TSUKA_L + 0.02, 0.05, gold, 0.07);
    bladeGroup.add(kashira);
    drawPivot.add(bladeGroup);

    addDetails(bladeGroup, sayaGroup, gold);

    const swordObj = { tierGroup, drawPivot, bladeGroup, sayaGroup, steel, yRack, style };
    let clicks = [];
    const restY = tierGroup.position.y;
    // Hover: the sword lifts up off its hooks and out past their tips, tips a touch and slides
    // a good length of steel out of the saya, its gold catching the light; off, it settles
    // back. Like every other prop, a click from further out brings the camera in to the rack;
    // in its close-up, the hovered sword's card shows beside the rack and a click draws it.
    // An invisible band round the sword that stays put on the rack: the sword itself lifts and
    // slides on hover, which would slip out from under the pointer and flicker. The band
    // reaches out past the lifted sword, so the pointer stays on it the whole time.
    const hitArea = new THREE.Mesh(track(new THREE.BoxGeometry(SWORD_SPAN + 0.1, 0.52, 0.8)), hitAreaMat);
    hitArea.position.set(0, yRack + 0.08, 0.32);
    katanaRack.add(hitArea);
    register(hitArea, {
      focus: "swords",
      item: true,
      // Clicked from further out: its card once the camera's in
      onEnter: () => {
        clearTimeout(swordZoomTimer);
        swordZoomTimer = setTimeout(() => showSwordCard(swordObj), 850);
      },
      onHover: (on) => {
        if (slashing) return;
        if (focus.name === "swords") on ? showSwordCard(swordObj) : hideSwordCard();
        if (style === "enma") hoverHaki(swordObj, on);
        if (on) {
          steel.visible = true;
          gsap.fromTo(gold.emissive, { r: 0.55, g: 0.42, b: 0.1 }, { r: 0.12, g: 0.09, b: 0.02, duration: 0.6, ease: "power2.out", overwrite: true });
          sfx.koiguchi();
        } else {
          gsap.to(gold.emissive, { r: 0, g: 0, b: 0, duration: 0.3, overwrite: true });
          sfx.koiguchiShut();
        }
        gsap.to(tierGroup.position, {
          y: on ? restY + 0.22 : restY,
          z: on ? 0.5 : 0.2,
          duration: on ? 0.3 : 0.35,
          ease: on ? "back.out(2)" : "power2.inOut",
          overwrite: true,
          // Settled back on its hooks: a soft knock of the saya on the wood (cut short, and
          // silent, if it's hovered again on the way down)
          onComplete: () => !on && !slashing && sfx.rackLand({ strength: 0.45 }),
        });
        gsap.to(tierGroup.rotation, { z: on ? 0.035 : 0, duration: on ? 0.3 : 0.35, ease: "power2.out", overwrite: true });
        gsap.to(drawPivot.rotation, {
          z: on ? drawTurn(HOVER_BARE) : 0,
          duration: on ? 0.45 : 0.25,
          delay: on ? 0.1 : 0,
          ease: on ? "power2.out" : "power2.in",
          overwrite: true,
          onComplete: () => !on && !slashing && (steel.visible = false),
        });
      },
      onClick: () => {
        hideSwordCard();
        // Three quick clicks on Sandai Kitetsu: Zoro's test of the curse. It's thrown up,
        // spinning, and falls back past the arm that isn't there, onto its hooks
        const now = performance.now();
        clicks = clicks.filter((at) => now - at < 900).concat(now);
        if (style === "kitetsu" && clicks.length >= 3) {
          clicks = [];
          if (slashing) swordObj.afterSlash = () => tossKitetsu(swordObj, restY);
          else tossKitetsu(swordObj, restY);
          return;
        }
        gsap.to(tierGroup.position, { y: restY, z: 0.2, duration: 0.2, overwrite: true });
        gsap.to(tierGroup.rotation, { z: 0, duration: 0.2, overwrite: true });
        slashSword(swordObj);
      },
    });
    swordObj.info = info;

    return swordObj;
  };

  // Top: Wado Ichimonji
  // Lit a little from within, so the toon shading keeps it white rather than grey
  const wadoWhite = toon("#fbfaf6");
  wadoWhite.emissive.set("#5a5a58");
  buildKatana(RACK_TIERS[0], {
    style: "wado",
    info: {
      name: "Wado Ichimonji", jp: "和道一文字", grade: "Ō Wazamono · 1 of the 21 Great Swords", color: "#fffdf5",
      text: "Zoro's most treasured sword. It belonged to his childhood friend Kuina, and was forged by the legendary swordsmith Shimotsuki Kozaburo.",
    },
    bladeMat: wadoBladeMat,
    sayaMat: wadoWhite,
    tsukaMat: tsukaMat("#f8f7f2", "#1a1714"),
    tsubaMaker: (gold) => {
      const tsuba = new THREE.Group();
      const disc = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 28), gold, { outline: 0.012 });
      disc.rotation.z = Math.PI / 2;
      const rim = mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 28), toon("#a37b1c"), { outline: 0 });
      rim.rotation.y = Math.PI / 2;
      tsuba.add(disc, rim);
      return tsuba;
    },
    // Olive-gold fittings and a plain white mouth, as on the reference
    goldColor: "#b9a33c",
    mouthRing: false,
    addDetails: (blade, saya) => {
      // The white sageo: two turns crossing round the saya a quarter of the way down, tied in a
      // bow on the front, its two loops lying along the saya and two tails trailing back
      // toward the mouth
      const X = 0.58;
      const y = bow(X);
      const z = FRONT * 0.088;
      [-1, 1].forEach((k) => {
        const turn = sayaRing(saya, X + k * 0.03, 0.026, wadoWhite, 0.084);
        turn.rotation.x = k * 0.38;
      });
      // each loop a puffed, flattened teardrop of ribbon, with a crease down its middle
      const loop = (dx, dy, tilt) => {
        const l = mesh(new THREE.SphereGeometry(0.08, 16, 10), wadoWhite, { outline: 0.008 });
        l.scale.set(1, 0.5, 0.28);
        l.add(at(mesh(rbox(0.11, 0.006, 0.02, 0.003), toon("#c9ccd2"), { outline: 0 }), 0, 0, FRONT * 0.09));
        l.position.set(X + dx, y + dy, z);
        l.rotation.z = tilt;
        saya.add(l);
      };
      loop(0.085, 0.025, -0.25);
      loop(-0.085, 0.025, 0.25);
      saya.add(at(mesh(rbox(0.05, 0.05, 0.03, 0.012), wadoWhite, { outline: 0.008 }), X, y, z + FRONT * 0.01));
      const tail = (dx, dy, len, tilt) => {
        const t = mesh(rbox(0.036, len, 0.012, 0.006), wadoWhite, { outline: 0.007 });
        t.position.set(X + dx, y + dy, z + FRONT * 0.012);
        t.rotation.z = tilt;
        saya.add(t);
      };
      tail(-0.06, -0.11, 0.22, -0.55);
      tail(-0.13, -0.07, 0.26, -1.05);
    },
  });

  // Middle: Sandai Kitetsu
  const kitetsuRed = toon("#c81e1e");
  buildKatana(RACK_TIERS[1], {
    style: "kitetsu",
    info: {
      name: "Sandai Kitetsu", jp: "三代鬼徹", grade: "Wazamono · 1 of the 50 named swords", color: "#c81e1e", ink: "#fffdf5",
      text: "A cursed blade (yōtō): every owner before is said to have met a tragic end. Zoro staked his life on his luck to test it in Loguetown, and the sword chose him.",
    },
    bladeMat: kitetsuBladeMat,
    sayaMat: kitetsuRed,
    tsukaMat: tsukaMat("#a3161c", "#1a1714"),
    tsubaMaker: (gold) => {
      const tsuba = new THREE.Group();
      tsuba.add(mesh(rbox(0.035, 0.27, 0.22, 0.07), gold, { outline: 0.012 }));
      // little lobes either side of the blade, like the reference's carved guard
      [-1, 1].forEach((s) => tsuba.add(at(mesh(rbox(0.04, 0.07, 0.07, 0.025), gold, { outline: 0.008 }), 0, s * 0.15, 0)));
      return tsuba;
    },
    addDetails: (blade, saya, gold) => {
      tsukaRing(blade, -0.47, 0.06, gold);
      // thin black lacquer rings down the saya, and a wrapped band in gold collars
      const ring = toon("#1a1714");
      [0.24, 0.42, 0.6, 1.4, 1.6, 1.8, 2.0, 2.18].forEach((x) => sayaRing(saya, x, 0.014, ring, 0.0765));
      sayaRing(saya, 0.83, 0.05, gold, 0.088);
      sayaRing(saya, 1.17, 0.05, gold, 0.088);
      const wrap = mesh(new THREE.CylinderGeometry(0.081, 0.081, 0.29, 18), tsukaMat("#9b1218", "#1a1714"), { outline: 0.01 });
      wrap.rotation.z = Math.PI / 2 + Math.atan(2 * SORI * 1.0 / BLADE_L ** 2);
      wrap.position.set(1.0, bow(1.0), 0);
      saya.add(wrap);
    },
  });

  // Bottom: Enma
  buildKatana(RACK_TIERS[2], {
    style: "enma",
    info: {
      name: "Enma", jp: "閻魔", grade: "Ō Wazamono · 1 of the 21 Great Swords", color: "#6b2fa8", ink: "#fffdf5",
      text: "Ranked with Wado Ichimonji. Once Kozuki Oden's, the only sword to scar Kaido; it pulls its wielder's Haki out of them, so only the strong can tame it.",
    },
    bladeMat: enmaBladeMat,
    sayaMat: enmaPurple,
    tsukaMat: enmaPurple,
    tsubaMaker: (gold) => {
      const tsuba = new THREE.Group();
      [[0, 0.085], [0, -0.085], [0.085, 0], [-0.085, 0]].forEach(([y, z]) => {
        const lobe = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.04, 20), gold, { outline: 0.012 });
        lobe.rotation.z = Math.PI / 2;
        lobe.position.set(0, y, z);
        tsuba.add(lobe);
      });
      return tsuba;
    },
    addDetails: (blade, saya, gold) => {
      // gold bands up the handle, and its flower crest
      [-0.3, -0.62].forEach((x) => tsukaRing(blade, x, 0.06, gold));
      crest(blade, -0.46, 0, 0.056);
      // flowers on the saya, a pair of gold bands near the tip
      [0.62, 1.5, 1.82].forEach((x) => crest(saya, x, bow(x), 0.077));
      sayaRing(saya, 1.2, 0.035, gold);
      sayaRing(saya, 1.27, 0.035, gold);
      // the red cord wound below the mouth, and two tassels hanging from it
      sayaRing(saya, 0.32, 0.17, cord, 0.09);
      [[0.3, -0.06], [0.4, 0.04]].forEach(([x, dz], i) => {
        const top = new THREE.Vector3(x, bow(x) - 0.08, FRONT * (0.06 + dz));
        const end = new THREE.Vector3(x + 0.05 + i * 0.03, -0.3 - i * 0.06, FRONT * (0.08 + dz));
        // Each tassel on its own pivot where the cord leaves the wrap, so it can swing
        const pivot = new THREE.Group();
        pivot.position.copy(top);
        const tip = end.clone().sub(top);
        const tasselCord = rod(new THREE.Vector3(), tip, 0.011, cord, 0.006);
        const knot = mesh(new THREE.SphereGeometry(0.026, 10, 8), cord, { outline: 0.006 });
        knot.position.copy(tip);
        const tassel = mesh(new THREE.CylinderGeometry(0.018, 0.045, 0.2, 10), cord, { outline: 0.01 });
        tassel.position.set(tip.x, tip.y - 0.12, tip.z);
        pivot.add(tasselCord, knot, tassel);
        saya.add(pivot);
        const rest = new THREE.Vector3(tip.x, tip.y - 0.12, tip.z).normalize();
        tasselSway.push({ pivot, saya, rest, dir: rest.clone(), spin: new THREE.Vector3(), lastPos: new THREE.Vector3(), lastVel: new THREE.Vector3() });
      });
    },
  });

  // ---------- a hybrid handheld console on a display stand, right of the gauntlet ----------
  // (Switch-style, with an original logo and no product name on its screen)
  // Handheld mode: the black tablet between a neon-blue and a neon-red Joy-Con, leaning back
  // on a little black stand. Click it for a hop and a word from it.
  const joyCon = (color, side) => {
    const con = new THREE.Group();
    con.add(mesh(rbox(0.25, 0.62, 0.1, 0.1), toon(color), { outline: 0.016 }));
    const stickY = side < 0 ? 0.13 : -0.04;
    const padY = side < 0 ? -0.04 : 0.13;
    const stick = mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.05, 16), black, { outline: 0.01 });
    stick.rotation.x = Math.PI / 2;
    con.add(at(stick, 0, stickY, 0.065));
    // four face buttons (or arrow buttons) in a diamond
    [[0, 0.055], [0, -0.055], [0.055, 0], [-0.055, 0]].forEach(([dx, dy]) => {
      const b = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.025, 10), black, { outline: 0.004 });
      b.rotation.x = Math.PI / 2;
      con.add(at(b, dx, padY + dy, 0.058));
    });
    // minus / plus
    con.add(at(mesh(rbox(0.05, 0.014, 0.02, 0.006), black, { outline: 0 }), side * 0.02, 0.26, 0.055));
    if (side > 0) con.add(at(mesh(rbox(0.014, 0.05, 0.02, 0.006), black, { outline: 0 }), side * 0.02, 0.26, 0.055));
    return con;
  };
  // The screen: its boot logo at rest. Played (`at`, seconds since it was switched on), it
  // flashes up, shows the logo, then runs a little kart game for a few seconds and signs off.
  const SWITCH_GAME = 6.6;
  const switchGame = { start: -99, live: false };
  let switchDrawnAt = 0;
  const switchLogo = (c, w, h) => {
    const glow = c.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, w * 0.6);
    glow.addColorStop(0, "#2b3348");
    glow.addColorStop(1, "#0d1018");
    c.fillStyle = glow;
    c.fillRect(0, 0, w, h);
    // soft coloured swooshes behind the logo
    [["#00b4e6", 0.1], ["#ff4554", 0.9]].forEach(([color, x]) => {
      c.fillStyle = color;
      c.globalAlpha = 0.18;
      c.beginPath();
      c.ellipse(w * x, h * 0.8, w * 0.35, h * 0.35, 0, 0, Math.PI * 2);
      c.fill();
    });
    c.globalAlpha = 1;
    // Our own boot logo: a rounded game pad badge with a star, and the room's name for it
    const r = h * 0.17;
    const cx = w / 2;
    const cy = h * 0.4;
    c.lineWidth = h * 0.028;
    c.strokeStyle = "#ffffff";
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.roundRect(cx - r * 1.5, cy - r * 0.8, r * 3, r * 1.6, r * 0.8);
    c.stroke();
    // a d-pad on the left, two buttons on the right
    c.fillRect(cx - r * 0.95, cy - r * 0.1, r * 0.6, r * 0.2);
    c.fillRect(cx - r * 0.75, cy - r * 0.3, r * 0.2, r * 0.6);
    [[0.75, -0.18], [0.45, 0.18]].forEach(([dx, dy]) => {
      c.beginPath();
      c.arc(cx + r * dx, cy + r * dy, r * 0.14, 0, Math.PI * 2);
      c.fill();
    });
    c.fillStyle = "#ffdd00";
    c.font = `900 ${Math.round(r * 0.7)}px sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("★", cx, cy - r * 1.05);
    c.fillStyle = "#ffffff";
    c.font = `800 ${Math.round(h * 0.09)}px 'Lexend Mega', sans-serif`;
    c.fillText("POCKET PLAY", w / 2, h * 0.74);
  };
  // A side-on kart race: parallax hills, a scrolling road, cones the kart hops, a lap counter
  const switchKart = (c, w, h, t) => {
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#5ec8ff");
    sky.addColorStop(1, "#c9f0ff");
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#fffdf5";
    [[0.2, 0.2], [0.7, 0.14]].forEach(([x, y]) => {
      const cx = ((x * w - t * 12) % (w + 60) + w + 60) % (w + 60) - 30;
      c.beginPath();
      c.arc(cx, h * y, h * 0.06, 0, Math.PI * 2);
      c.arc(cx + h * 0.07, h * y - h * 0.02, h * 0.075, 0, Math.PI * 2);
      c.arc(cx + h * 0.15, h * y, h * 0.055, 0, Math.PI * 2);
      c.fill();
    });
    const ground = h * 0.74;
    [["#7ed957", 0.3, 30], ["#3fae49", 0.18, 70]].forEach(([color, hill, speed]) => {
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(0, ground);
      for (let x = 0; x <= w; x += 6) c.lineTo(x, ground - h * hill * (0.6 + 0.4 * Math.sin((x + t * speed) / (w * 0.18))));
      c.lineTo(w, ground);
      c.fill();
    });
    c.fillStyle = "#3a3e45";
    c.fillRect(0, ground, w, h - ground);
    c.fillStyle = "#ffdd00";
    for (let x = -((t * 160) % 40); x < w; x += 40) c.fillRect(x, ground + (h - ground) * 0.45, 20, 3);
    // cones come by every so often; the kart hops each one
    const gap = w * 0.75;
    const scroll = t * 160;
    const kartX = w * 0.26;
    let hop = 0;
    for (let i = Math.floor(scroll / gap); i <= Math.floor((scroll + w) / gap) + 1; i++) {
      const x = i * gap - scroll + w * 0.6;
      const near = (x - kartX) / (w * 0.22);
      if (Math.abs(near) < 1) hop = Math.max(hop, 1 - near * near);
      c.fillStyle = "#ff7a1a";
      c.beginPath();
      c.moveTo(x, ground - h * 0.13);
      c.lineTo(x + h * 0.05, ground);
      c.lineTo(x - h * 0.05, ground);
      c.fill();
      c.fillStyle = "#fffdf5";
      c.fillRect(x - h * 0.025, ground - h * 0.075, h * 0.05, h * 0.02);
    }
    const ky = ground - hop * h * 0.24;
    const bob = Math.sin(t * 30) * 1.2;
    c.fillStyle = "#1a1714";
    [-0.07, 0.07].forEach((dx) => {
      c.beginPath();
      c.arc(kartX + dx * h, ky - h * 0.035, h * 0.035, 0, Math.PI * 2);
      c.fill();
    });
    c.fillStyle = "#ff4554";
    c.beginPath();
    c.roundRect(kartX - h * 0.12, ky - h * 0.11 + bob, h * 0.24, h * 0.07, h * 0.02);
    c.fill();
    c.fillStyle = "#ffdd00";
    c.beginPath();
    c.arc(kartX - h * 0.02, ky - h * 0.13 + bob, h * 0.04, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#d62828";
    c.fillRect(kartX - h * 0.07, ky - h * 0.15 + bob, h * 0.1, h * 0.018);
    c.fillStyle = "#1a1714";
    c.font = `800 ${Math.round(h * 0.09)}px 'Space Grotesk', sans-serif`;
    c.textAlign = "left";
    c.textBaseline = "top";
    c.fillText(`LAP ${Math.min(3, 1 + Math.floor(t / 1.6))}/3`, w * 0.04, h * 0.05);
    c.textAlign = "right";
    c.fillText(`${String(Math.floor(t * 137)).padStart(5, "0")}`, w * 0.96, h * 0.05);
  };
  const switchScreen = printed(0.98, 0.55, 300, (c, w, h, now) => {
    const t = now === undefined ? -1 : now - switchGame.start;
    if (t < 0 || t > SWITCH_GAME) return switchLogo(c, w, h);
    c.textAlign = "center";
    c.textBaseline = "middle";
    // a white flash, then the logo, then the race, then a sign-off
    if (t < 0.25) {
      c.fillStyle = `rgba(255,255,255,${1 - t * 2})`;
      c.fillRect(0, 0, w, h);
      return;
    }
    if (t < 1.3) {
      switchLogo(c, w, h);
      c.fillStyle = `rgba(13,16,24,${Math.max(0, 1 - (t - 0.25) * 3)})`;
      c.fillRect(0, 0, w, h);
      return;
    }
    const race = t - 1.3;
    if (race < 4.4) return switchKart(c, w, h, race);
    switchKart(c, w, h, 4.4);
    c.fillStyle = "rgba(13,16,24,.6)";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#ffdd00";
    c.font = `900 ${Math.round(h * 0.2)}px 'Lexend Mega', sans-serif`;
    c.fillText("1ST! ★", w / 2, h * 0.45);
    c.fillStyle = "#fffdf5";
    c.font = `800 ${Math.round(h * 0.08)}px 'Space Grotesk', sans-serif`;
    c.fillText("save point reached ✓", w / 2, h * 0.68);
  }, { unlit: true });
  const leftCon = at(joyCon("#00b4e6", -1), -0.68, 0, 0);
  const rightCon = at(joyCon("#ff4554", 1), 0.68, 0, 0);
  const switchConsole = group(
    mesh(rbox(1.08, 0.62, 0.08, 0.04), toon("#24262b"), { outline: 0.016 }),
    at(switchScreen, 0, 0, 0.041),
    leftCon,
    rightCon,
  );
  // The dock it leans on: a base with a lip at the front for the console's foot and, behind,
  // the dock itself, hollow, so the console can drop in. A small LED on its front lights green
  // when it's docked.
  const dockLed = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, 0.02, 0.01)), track(new THREE.MeshBasicMaterial({ color: "#3a3e45" })));
  const DOCK_FRONT = -0.18;
  const DOCK_BACK = -0.38;
  const switchStand = group(
    at(mesh(rbox(1.26, 0.06, 0.7, 0.02), black, { outline: 0.014 }), 0, 0.03, -0.08),
    at(mesh(rbox(1.0, 0.08, 0.08, 0.02), black, { outline: 0.012 }), 0, 0.1, 0.13),
    at(mesh(rbox(1.26, 0.38, 0.05, 0.03), black, { outline: 0.014 }), 0, 0.23, DOCK_FRONT),
    at(mesh(rbox(1.26, 0.56, 0.05, 0.03), black, { outline: 0.014 }), 0, 0.32, DOCK_BACK),
    at(mesh(rbox(0.05, 0.38, 0.25, 0.02), black, { outline: 0.012 }), -0.605, 0.23, (DOCK_FRONT + DOCK_BACK) / 2),
    at(mesh(rbox(0.05, 0.38, 0.25, 0.02), black, { outline: 0.012 }), 0.605, 0.23, (DOCK_FRONT + DOCK_BACK) / 2),
    at(dockLed, 0.5, 0.1, DOCK_FRONT + 0.027),
  );
  const SWITCH_REST = { y: 0.46, z: 0.04, tilt: -0.28 };
  switchConsole.position.set(0, SWITCH_REST.y, SWITCH_REST.z);
  switchConsole.rotation.x = SWITCH_REST.tilt;
  const nintendoSwitch = addItem(at(group(switchStand, switchConsole), 0.95, standOn(4), 0.05), "switch");
  nintendoSwitch.rotation.y = -0.12;
  // Its bubble's anchor: the top of the console; the bubble opens beside it (reach: half its
  // width), its tail pointing back at the red Joy-Con's top corner
  const switchBubbleAt = new THREE.Object3D();
  switchBubbleAt.position.set(0, 0.85, 0.1);
  nintendoSwitch.add(switchBubbleAt);
  const SWITCH_LINES = ["one more run, I promise", "battery: 12%. still playing.", "kart race tonight?", "the kids want a turn"];
  let switchLine = 0;
  // Each click plays the next trick: the Joy-Cons slide off and click back on; it boots up and
  // races a lap; it drops into its dock for TV mode, then lifts back out.
  let switchTrick = 0;
  let switchBusy = false;
  const switchSay = (text) => shelfSay(switchBubbleAt, text, "the handheld", 3000, 0, 0.85);
  function joyConsOff() {
    const tl = gsap.timeline({ onComplete: () => (switchBusy = false) });
    [[leftCon, -1], [rightCon, 1]].forEach(([con, side]) => {
      tl.to(con.position, { x: side * 0.9, y: 0.05, duration: 0.2, ease: "power2.out" }, 0)
        .to(con.rotation, { z: side * -0.18, duration: 0.2, ease: "power2.out" }, 0)
        .to(con.rotation, { z: side * -0.05, duration: 0.09, repeat: 3, yoyo: true, ease: "sine.inOut" }, 0.2)
        .to(con.position, { x: side * 0.68, y: 0, duration: 0.12, ease: "power3.in" }, 0.62)
        .to(con.rotation, { z: 0, duration: 0.12, ease: "power3.in" }, 0.62);
    });
    tl.fromTo(switchConsole.scale, { x: 1.06, y: 0.95 }, { x: 1, y: 1, duration: 0.4, ease: "elastic.out(1.4, 0.4)" }, 0.74);
    sfx.slide({ duration: 0.18 });
    sfx.click({ delay: 0.74 });
    switchSay("*click* Joy-Cons on ✓");
  }
  function bootSwitch() {
    switchGame.start = performance.now() / 1000;
    switchGame.live = true;
    sfx.power({ duration: 0.6 });
    sfx.groove({ delay: 1.3 });
    sfx.sparkle({ delay: 5.7 });
    setTimeout(() => (switchBusy = false), 1300);
    switchSay(SWITCH_LINES[switchLine++ % SWITCH_LINES.length]);
  }
  function dockSwitch() {
    const lift = SWITCH_REST.y + 0.55;
    const docked = { y: 0.37, z: (DOCK_FRONT + DOCK_BACK) / 2 };
    gsap.timeline({ onComplete: () => (switchBusy = false) })
      .to(switchConsole.position, { y: lift, z: docked.z, duration: 0.35, ease: "power2.out" })
      .to(switchConsole.rotation, { x: 0, duration: 0.35, ease: "power2.out" }, "<")
      .to(switchConsole.position, { y: docked.y, duration: 0.22, ease: "power2.in" })
      .call(() => {
        sfx.dock({ strength: 0.5 });
        sfx.blip({ delay: 0.15 });
        dockLed.material.color.set("#3fe36b");
        switchScreen.material.color.setScalar(0.22);
        switchSay("docked. TV mode ▶");
      })
      .to(switchConsole.position, { y: lift, duration: 0.3, ease: "power2.out", delay: 3 })
      .call(() => {
        sfx.slide({ duration: 0.2 });
        dockLed.material.color.set("#3a3e45");
        switchScreen.material.color.setScalar(1);
      }, null, "<")
      .to(switchConsole.position, { y: SWITCH_REST.y, z: SWITCH_REST.z, duration: 0.35, ease: "power2.inOut" })
      .to(switchConsole.rotation, { x: SWITCH_REST.tilt, duration: 0.35, ease: "power2.inOut" }, "<");
    sfx.whoosh({ duration: 0.3 });
  }
  function playSwitch() {
    if (switchBusy || switchGame.live) return;
    switchBusy = true;
    [joyConsOff, bootSwitch, dockSwitch][switchTrick++ % 3]();
  }

  // ---------- the Infinity Gauntlet, on the left of the shelf's top ----------
  // Enlarged by 35%, under the sword rack, with the Switch on its stand to its right.
  const GAUNTLET_X = -0.95;
  const gauntlet = new THREE.Group();
  gauntlet.position.set(GAUNTLET_X, standOn(4), 0.05);
  gauntlet.scale.setScalar(1.35);
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
  // An armoured finger segment: a gold capsule whose round ends overlap its neighbours', so a
  // bent finger stays in one piece, with a dark plate ring around the joint at its base
  const fingerSegment = (radius, length, ring = true) => {
    const part = new THREE.Group();
    const body = mesh(new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius), 6, 16), glove, { outline: 0.012 });
    body.scale.z = 0.88;
    body.position.y = length / 2;
    part.add(body);
    if (ring) {
      const band = mesh(new THREE.CylinderGeometry(radius * 1.12, radius * 1.12, 0.026, 18), gloveDark, { outline: 0.008 });
      band.scale.z = 0.9;
      part.add(band);
    }
    return part;
  };
  // Fingers on hinges at the knuckles: three segments each, tapering to the tip
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
      piece.add(fingerSegment(0.05 - k * 0.005, length * share));
      // A raised cap over the big knuckle
      if (!k) piece.add(at(mesh(new THREE.SphereGeometry(0.036, 14, 10), gloveLight, { outline: 0.008 }), 0, 0.035, 0.035));
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
  thumbTip.add(fingerSegment(0.05, 0.15));
  thumb.add(fingerSegment(0.06, 0.18, false), thumbTip);
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
  // One glow on the glove for all six: the colour of whichever stone burns brightest, faint at
  // rest (the mind stone) and flaring with it
  const stoneTint = { color: new THREE.Color() };
  const stoneLight = neonLight("#ffdd00", 0.9, () => {
    let brightest = stones[4];
    stones.forEach((gem) => {
      if (gem.userData.halo.material.opacity > brightest.userData.halo.material.opacity) brightest = gem;
    });
    stoneTint.color.copy(brightest.material.color);
    return brightest.userData.halo.material.opacity;
  }, { distance: 1.6, tint: stoneTint });
  stoneLight.position.set(0, 1.22, 0.35);
  glovePart.add(stoneLight);
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
    // (anything it leaves lying about loose in the room goes with it)
    object.userData.onCrumble?.(delay);
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
    gsap.killTweensOf(glovePart.position);
    discover("snap");
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
        // Perfectly balanced: a random half of everything in the room (bar the gauntlet, the
        // shelf it stands on and the window, a hole in the wall), each with the colours its
        // dust takes
        const everything = [
          [[mug, coaster], ["#fffdf5", "#6f4e37", "#a8743f"]],
          [[mail], ["#e2cb9c", "#fffdf5", "#3b82f6"]],
          [[phoneStand], ["#7a2635", "#1a1714", "#ffdd00"]],
          [[plant], ["#16a34a", "#8fd694", "#ff7a1a"]],
          [[mouse], ["#ffffff", "#e11d48"]],
          [[keyboard], ["#1b1c1f", "#43464d", "#f5c22b", "#f2603c"]],
          [[monitor], ["#c2c6cc", "#1a1714", "#8fd694"]],
          [[speakers[0].group], ["#1a1714", "#7fb2ff", "#ffdd00"]],
          [[speakers[1].group], ["#1a1714", "#7fb2ff", "#ffdd00"]],
          [[lamp], ["#8b5a34", "#1a1714", "#efd9ae"]],
          [[chair], ["#45474d", "#1a1714"]],
          [[guitar], ["#e6c38f", "#6b4428", "#1a1714"]],
          [[paintingHang], ["#ff90e8", "#ffdd00", "#00e0c6", "#1a1714"]],
          [[clock], ["#7fb2ff", "#fffdf5", "#1a1714"]],
          [[tickets], ["#fffdf5", "#00e0c6", "#ffdd00"]],
          [[folders], ["#ff90e8", "#ffdd00", "#8fd694", "#7fb2ff"]],
          [[gym], ["#8b9099", "#6b7079", "#9ca3af"]],
          [[hatPeg], ["#f2c14e", "#d62828"]],
          [[katanaRack], ["#6b2fa8", "#b91c1c", "#fffdf5", "#d4a72c", "#181513"]],
          [[catModel], ["#ff9f45", "#d9741f", "#fffdf5"]],
          [[bin], ["#00e0c6", "#008f80", "#ff7a1a", "#ffdd00", "#fffdf5"]],
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
      if (snapping) return;
      gsap.to(glovePart.position, { y: on ? 0.28 : 0, duration: on ? 0.4 : 0.5, ease: on ? "back.out(1.5)" : "power2.out", overwrite: true });
      if (!on) return;
      stones.forEach((gem, i) => flare(gem, i * 0.06));
      sfx.tick({ pitch: 2.2 });
      sfx.tick({ pitch: 2.6, delay: 0.12 });
    },
    onClick: snapFingers,
  });

  const SHELF_SOUNDS = {
    console: () => {
      sfx.blip();
      gsap.fromTo(led.scale, { x: 1, y: 2.2, z: 2.2 }, { x: 1, y: 1, z: 1, duration: 0.5 });
    },
    controller: () => {
      sfx.click();
      timers.push(setTimeout(() => sfx.click(), 90));
    },
    book: () => sfx.bookDown({ strength: 0.4 }),
    case: () => sfx.tick({ pitch: 0.9 }),
    figure: () => sfx.pop({ pitch: 1.3 }),
    trophy: () => sfx.ping(),
    robot: () => {},
    rubik: () => sfx.click(),
    switch: () => sfx.blip(),
  };
  const itemFor = (obj) => shelfItems.find(({ obj: item }) => {
    for (let o = obj; o; o = o.parent) if (o === item) return true;
    return false;
  });
  // Zoomed in on the shelf: the console switches on and boots its game on the monitor, a
  // controller buzzes and hints at a cheat code, the trophy reads out the secrets found
  // One bubble, out on the wall to the right of what was clicked, its tail pointing straight
  // across at it (the tip sits at the bubble's left edge, 0.47 of its width from the middle)
  const SHELF_BUBBLE_W = 2.7;
  const shelfBubbleAt = new THREE.Vector3();
  const shelfBubblePrint = { size: 40, tail: "side-left", style: "manga" };
  const shelfBubble = speechBubble(SHELF_BUBBLE_W, 1.42, shelfBubblePrint);
  let shelfBubbleTarget = null;
  const trophyBubbleRight = new THREE.Vector3();
  const trophyBubbleUp = new THREE.Vector3();
  function placeTrophyBubble() {
    trophy.localToWorld(shelfBubbleAt.set(0.25, 1.12, 0.3));
    trophyBubbleRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    trophyBubbleUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    shelfBubbleAt.addScaledVector(trophyBubbleRight, 0.06).addScaledVector(trophyBubbleUp, 0.14);
    const [tipX, tipY] = BUBBLE_TAILS["down-left"].tip;
    const sprite = shelfBubble.sprite;
    sprite.position.copy(shelfBubbleAt)
      .addScaledVector(trophyBubbleRight, (0.5 - tipX) * sprite.scale.x)
      .addScaledVector(trophyBubbleUp, (tipY - 0.5) * sprite.scale.y);
  }
  // `reach`: half the width of what's speaking, so the bubble starts beyond its side
  function shelfSay(obj, text, by = "the shelf", hold = 3200, lift = 0.3, reach = 0) {
    shelfBubbleTarget = obj;
    if (obj === trophy) {
      shelfBubblePrint.tail = "down-left";
      shelfBubble.say({ text, by }, hold);
      placeTrophyBubble();
      return;
    }
    obj.getWorldPosition(shelfBubbleAt);
    // To the right if it fits on screen, else to the left; if neither, whichever has more room
    const spot = (side) => shelfBubbleAt.clone().add(new THREE.Vector3((SHELF_BUBBLE_W * 0.47 + 0.15 + reach) * side, lift, 0.3));
    const fits = (side) => Math.abs(spot(side).add(new THREE.Vector3((side * SHELF_BUBBLE_W) / 2, 0, 0)).project(camera).x) <= 0.97;
    const left = fits(1) ? false : fits(-1) || shelfBubbleAt.clone().project(camera).x > 0;
    shelfBubblePrint.tail = left ? "side-right" : "side-left";
    shelfBubble.sprite.position.copy(spot(left ? -1 : 1));
    shelfBubble.say({ text, by }, hold);
  }
  function powerConsole() {
    discover("console");
    sfx.power({ duration: 0.8 });
    led.material.color.set("#8fdcff");
    // Lights up along its length, never past the console's ends: it only thickens and glows
    led.children.forEach((strip) => gsap.fromTo(strip.scale, { x: 3, y: 1, z: 3 }, { x: 1.5, y: 1, z: 1.5, duration: 0.6, ease: "back.out(3)" }));
    [pad1, pad2].forEach((pad, i) => gsap.fromTo(pad.userData.moves.rotation, { z: 0.08 }, { z: 0, duration: 0.5, delay: i * 0.08, ease: "elastic.out(1.5, 0.15)" }));
    setNeon(true);
    shelfBubble.hide();
    // Off to the monitor, which turns into its TV: the console boots into Straw Hat Dash
    timers.push(setTimeout(() => {
      setFocus("monitor");
      timers.push(setTimeout(() => {
        desktop.playConsole();
        redrawScreen();
      }, 900));
    }, 900));
  }
  function buzzController(item) {
    const pad = item.userData.moves;
    const x = pad.position.x;
    gsap.fromTo(pad.position, { x: x - 0.04 }, { x, duration: 0.05, repeat: 7, yoyo: true, ease: "none", onComplete: () => (pad.position.x = x) });
    sfx.patter({ duration: 0.35 });
    shelfSay(item, "↑ ↑ ↓ ↓ ← → ← → B A", "try it on the keyboard", 3200, 0, 0.62);
  }
  register(shelf, {
    focus: "shelf",
    onLeave: () => {
      finishShelfDrag();
      shelfBubble.hide();
      shelfHoverCarriers.forEach((carrier) => gsap.to(carrier.position, { y: 0, z: 0, duration: 0.25, overwrite: true }));
    },
    onKey: (e) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return false;
      browseShelf(shelfLook + (e.key === "ArrowUp" ? 1.4 : -1.4));
      return true;
    },
    onClick: (hit) => {
      const item = itemFor(hit.object);
      if (!item) return sfx.knock({ strength: 0.6 });
      if (item.obj === ps5) powerConsole();
      else if (item.obj === pad1 || item.obj === pad2) buzzController(item.obj);
      else if (item.obj === rubikItem) playRubik();
      else if (item.obj === robot) pokeRobot();
      else if (item.obj === nintendoSwitch) playSwitch();
      else if (item.obj === trophy) {
        // The score, and a hint toward one of the secrets still to find
        const left = SECRETS.filter((id) => !secretsFound.has(id));
        if (!left.length) return cheerTrophy();
        const text = left.length ? `${secretsFound.size}/${SECRETS.length} found. Hint: ${SECRET_HINTS[left[Math.floor(Math.random() * left.length)]]}` : "ALL SECRETS FOUND! 🏆";
        shelfSay(trophy, text, "the trophy", 4500, 0.5, 0.55);
      }
      // Always from where it rests: a click mid-hop must not start the next hop higher up
      // (an item on a stand hops off its stand, not with it)
      const hopper = item.obj.userData.moves || item.obj;
      const y = hopper.userData.restY;
      gsap.fromTo(hopper.position, { y }, { keyframes: [{ y: y + 0.28, duration: 0.16, ease: "power2.out" }, { y, duration: 0.3, ease: "bounce.out" }], overwrite: true });
      SHELF_SOUNDS[item.sound]();
    },
  });

  // Every shelf prop has its own hover target; the fixed shelf never moves.
  // Translation-only carriers preserve local coordinates used by the existing click routines.
  const shelfHoverCarriers = [];
  shelfItems.forEach((item) => {
    const movable = item.obj === pad1 || item.obj === pad2 ? item.obj.userData.moves
      : item.obj === nintendoSwitch ? switchConsole : item.obj;
    const carrier = new THREE.Group();
    movable.parent.add(carrier);
    carrier.add(movable);
    shelfHoverCarriers.push(carrier);
    const lift = item.sound === "book" || item.sound === "case" || item.obj === ps5 ? 0
      : item.obj === trophy ? 0.06 : item.sound === "rubik" ? 0.12 : 0.09;
    const forward = item.sound === "book" ? 0.22 : item.sound === "case" ? 0.18 : 0.09;
    register(item.obj, {
      focus: "shelf", item: true,
      onHover: (on) => {
        const busy = (item.obj === trophy && trophyCelebrating) || (item.obj === robot && botBusy)
          || (item.obj === rubikItem && rubikBusy) || (item.obj === nintendoSwitch && switchBusy);
        if (on && busy) return;
        gsap.to(carrier.position, { y: on ? lift : 0, z: on ? forward : 0, duration: on ? 0.25 : 0.35, ease: "power2.out", overwrite: true });
      },
      onClick: (hit) => interactive.get(shelf).onClick(hit),
    });
  });

  // ---------- gym corner: a pair of dumbbells on the floor between the desk and the shelf ----------
  // Click for a rep: one dumbbell is lifted and set down with a clank, and a counter pops up
  // over them. Ten in a row is a new PR, with confetti.
  const gym = new THREE.Group();
  // Between the desk's leg and the shelf, clear of both, resting on top of the rug
  gym.position.set(7.0, FLOOR_Y + 0.08, -2.55);
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
  // Cast iron grey, one a shade darker than the other
  const dumbbells = [dumbbell("#8b9099", -0.45, -0.3, 0.25), dumbbell("#6b7079", 0.5, 0.35, -0.15)];
  const repTex = canvasTexture(320, 160);
  track(repTex.texture);
  const repBadge = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: repTex.texture, depthTest: false, transparent: true })));
  repBadge.renderOrder = 10;
  repBadge.raycast = noRaycast;
  repBadge.scale.set(0.001, 0.001, 1);
  repBadge.position.set(gym.position.x, FLOOR_Y + 2.7, gym.position.z);
  scene.add(repBadge);
  // Confetti for a PR: a pool of little coloured squares
  const confetti = Array.from({ length: 72 }, (_, i) => {
    const bit = new THREE.Sprite(track(new THREE.SpriteMaterial({ color: PALETTE[i % 7], transparent: true, depthWrite: false })));
    bit.visible = false;
    bit.raycast = noRaycast;
    scene.add(bit);
    return bit;
  });
  function burst(x, y, z, celebration = false) {
    // Trophy confetti falls in front of the shelf, clear of its boards and side panels.
    const frontZ = celebration ? shelf.position.z + SHELF_D / 2 + 0.25 : z;
    confetti.slice(0, celebration ? 72 : 22).forEach((bit, i) => {
      const delay = celebration ? i * 0.008 : 0;
      const duration = celebration ? 3.2 : 1.3;
      gsap.killTweensOf([bit.position, bit.material]);
      bit.visible = true;
      bit.position.set(x, y, celebration ? Math.max(z, frontZ) : z);
      bit.scale.setScalar(0.1 + Math.random() * 0.08);
      bit.material.opacity = 1;
      bit.material.rotation = Math.random() * Math.PI;
      const a = Math.random() * Math.PI * 2;
      const r = (0.8 + Math.random() * 1.4) * (celebration ? 1.45 : 1);
      gsap.to(bit.position, { x: x + Math.cos(a) * r, z: celebration ? frontZ + 0.15 + Math.random() * 0.35 : z + Math.sin(a) * r * 0.6, duration: duration * 0.9, delay, ease: "power2.out" });
      gsap.to(bit.position, { delay, keyframes: [{ y: y + 0.8 + Math.random() * 1.2, duration: duration * 0.35, ease: "power2.out" }, { y: y - (celebration ? 2.2 : 1.2), duration: duration * 0.65, ease: "power2.in" }] });
      gsap.to(bit.material, { rotation: bit.material.rotation + Math.PI * (celebration ? 4 : 1), duration, delay });
      gsap.to(bit.material, { opacity: 0, delay: delay + duration * 0.7, duration: duration * 0.3, onComplete: () => (bit.visible = false) });
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
  function lift(db = dumbbells[reps % 2]) {
    if (lifting) return;
    lifting = true;
    gsap.killTweensOf(db.position);
    const y = db.userData.restY;
    gsap.timeline({ onComplete: () => (lifting = false) })
      .to(db.position, { y: y + 1.5, duration: 0.32, ease: "power2.out" })
      .to(db.rotation, { y: db.rotation.y + 0.5, duration: 0.32, ease: "power2.out" }, 0)
      .to(db.position, { y, duration: 0.3, ease: "power2.in" }, 0.42)
      .to(db.rotation, { y: db.rotation.y, duration: 0.3, ease: "power2.in" }, 0.42)
      .call(() => {
        sfx.dumbbell();
        reps++;
        if (reps >= 10) {
          showReps("NEW PR!", "#ff90e8");
          discover("gymPR");
          burst(gym.position.x, FLOOR_Y + 1.6, gym.position.z);
          sfx.sparkle();
          reps = 0;
        } else showReps(`REP ${reps}`);
      }, null, 0.72);
    sfx.whoosh({ duration: 0.3 });
  }
  dumbbells.forEach((db) => register(db, {
    onHover: (on) => {
      if (lifting) return;
      gsap.to(db.position, { y: db.userData.restY + (on ? 0.14 : 0), duration: on ? 0.25 : 0.35, ease: "power2.out", overwrite: true });
    },
    onClick: () => lift(db),
  }));
  register(gym, { onClick: () => lift() });

  // ---------- wastebasket: office basketball, right of the shelf ----------
  // A teal bin with a mini hoop clipped to its back rim. Click to shoot a crumpled paper ball
  // at it: a swish drops in (the net stretches, the bin squashes), a brick
  // clangs off the rim and rolls away across the floor. Three in a row and it's ON FIRE (a secret).
  const bin = new THREE.Group();
  bin.position.set(13.35, FLOOR_Y, -3.6);
  bin.rotation.y = -0.2;
  bin.scale.setScalar(1.2);
  scene.add(bin);
  const BIN_H = 1.4;
  const binBody = new THREE.Group();
  bin.add(binBody);
  const binProfile = [
    [0, 0], [0.4, 0], [0.5, BIN_H], [0.55, BIN_H], [0.55, BIN_H + 0.08], [0.47, BIN_H + 0.08], [0.37, 0.08], [0, 0.08],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  binBody.add(mesh(new THREE.LatheGeometry(binProfile, 28), toon("#00e0c6"), { outline: 0.045 }));
  const binRim = mesh(new THREE.TorusGeometry(0.54, 0.045, 8, 32), toon("#1a1714"), { outline: 0 });
  binRim.rotation.x = Math.PI / 2;
  binRim.position.y = BIN_H + 0.06;
  binBody.add(binRim);
  // Close up it wants a little more to it: a dark band round the foot and one under the rim
  // (proud of the tapered side by a hair), and a sticker wrapped round the front
  const binRadius = (y) => 0.4 + (0.1 * y) / BIN_H;
  const bandMat = toon("#008f80");
  [[0.12, 0.1], [BIN_H - 0.2, 0.08]].forEach(([y, h]) => {
    const band = mesh(new THREE.CylinderGeometry(binRadius(y + h / 2) + 0.012, binRadius(y - h / 2) + 0.012, h, 32, 1, true), bandMat, { outline: 0, cast: false });
    band.position.y = y;
    binBody.add(band);
  });
  const LABEL_Y = [0.5, 1.0];
  const LABEL_ARC = 1.15;
  const binLabelTex = canvasTexture(560, 200);
  track(binLabelTex.texture);
  drawBinLabel(binLabelTex.ctx, 560, 200);
  const binLabel = new THREE.Mesh(
    track(new THREE.CylinderGeometry(binRadius(LABEL_Y[1]) + 0.01, binRadius(LABEL_Y[0]) + 0.01, LABEL_Y[1] - LABEL_Y[0], 24, 1, true, -LABEL_ARC / 2, LABEL_ARC)),
    printMaterial(binLabelTex.texture, { transparent: true }),
  );
  binLabel.position.y = (LABEL_Y[0] + LABEL_Y[1]) / 2;
  binLabel.raycast = noRaycast;
  binBody.add(binLabel);
  // A crumpled paper ball: a lumpy, flat-faceted icosahedron (each facet a crushed plane of
  // paper catching the light its own way), squashed a little differently each time and wrapped
  // in a screwed-up sheet: lined notebook paper with pencil scrawl, or a printed page
  const paperMats = [true, false, true, false].map((lined, i) => {
    const sheet = canvasTexture(512, 256);
    track(sheet.texture);
    drawCrumpledPaper(sheet.ctx, 512, 256, { lined, seed: i + 1 });
    return track(new THREE.MeshToonMaterial({ map: sheet.texture, gradientMap: gradient, flatShading: true }));
  });
  // Every copy of a corner (the icosahedron's faces don't share vertices) must move the same
  // way or the ball cracks, so the dent comes from a hash of where the corner points
  const dent = (x, y, z, seed) => {
    const v = Math.sin(Math.round(x * 997) * 12.9898 + Math.round(y * 997) * 78.233 + Math.round(z * 997) * 37.719 + seed) * 43758.5453;
    return v - Math.floor(v);
  };
  let crumpled = 0;
  const crumple = (r) => {
    const geo = new THREE.IcosahedronGeometry(r, 2);
    const seed = Math.random() * 100;
    const squash = new THREE.Vector3(0.82 + Math.random() * 0.18, 0.82 + Math.random() * 0.18, 0.82 + Math.random() * 0.18);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      tmpV.set(p.getX(i), p.getY(i), p.getZ(i)).divideScalar(r);
      const k = 0.8 + dent(tmpV.x, tmpV.y, tmpV.z, seed) * 0.3;
      p.setXYZ(i, tmpV.x * r * k * squash.x, tmpV.y * r * k * squash.y, tmpV.z * r * k * squash.z);
    }
    geo.computeVertexNormals();
    return mesh(geo, paperMats[crumpled++ % paperMats.length], { outline: 0.018 });
  };
  // What's already in it, peeking over the rim; a swish adds to the pile (up to full)
  const tmpV = new THREE.Vector3();
  const binPile = [[-0.15, 0.1], [0.18, -0.05], [0.02, 0.2], [-0.05, -0.2], [0.22, 0.18]].map(([x, z], i) => {
    const ball = crumple(0.17);
    ball.position.set(x, BIN_H - 0.22 + (i % 2) * 0.06, z);
    ball.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    ball.visible = i < 2;
    binBody.add(ball);
    return ball;
  });
  let binFill = 2;
  // The hoop: a little backboard on a post at the back rim, an orange ring and a net under it
  const HOOP_Y = BIN_H + 0.72;
  const HOOP_Z = -0.16;
  const hoop = new THREE.Group();
  hoop.position.set(0, HOOP_Y, HOOP_Z);
  bin.add(hoop);
  const hoopPost = mesh(rbox(0.07, 0.9, 0.07, 0.02), toon("#1a1714"), { outline: 0.015 });
  hoopPost.position.set(0, BIN_H + 0.42, -0.52);
  // Clamped over the back of the rim, with a screw knob
  const hoopClamp = mesh(rbox(0.16, 0.22, 0.14, 0.03), toon("#1a1714"), { outline: 0.015 });
  hoopClamp.position.set(0, BIN_H + 0.02, -0.53);
  const clampKnob = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 10), toon("#ff7a1a"), { outline: 0.01 });
  clampKnob.rotation.z = Math.PI / 2;
  clampKnob.position.set(0.11, -0.03, 0);
  hoopClamp.add(clampKnob);
  bin.add(hoopPost, hoopClamp);
  const backboard = mesh(rbox(0.9, 0.6, 0.05, 0.03), toon("#ffdd00"), { outline: 0.025 });
  backboard.position.set(0, 0.28, -0.36);
  const boxMat = toon("#1a1714");
  [[0, 0.17, 0.32, 0.03], [0, -0.01, 0.32, 0.03], [-0.145, 0.08, 0.03, 0.2], [0.145, 0.08, 0.03, 0.2]].forEach(([x, y, w, h]) => {
    const bar = mesh(new THREE.BoxGeometry(w, h, 0.01), boxMat, { outline: 0, cast: false });
    bar.position.set(x, y, 0.03);
    backboard.add(bar);
  });
  const ring = mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 24), toon("#ff7a1a"), { outline: 0.012 });
  ring.rotation.x = Math.PI / 2;
  const net = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.22, 0.14, 0.32, 10, 2, true)),
    track(new THREE.MeshBasicMaterial({ color: "#fffdf5", wireframe: true })),
  );
  net.geometry.translate(0, -0.16, 0);
  net.raycast = noRaycast;
  hoop.add(backboard, ring, net);

  const binTex = canvasTexture(320, 160);
  track(binTex.texture);
  const binBadge = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: binTex.texture, depthTest: false, transparent: true })));
  binBadge.renderOrder = 10;
  binBadge.raycast = noRaycast;
  binBadge.scale.set(0.001, 0.001, 1);
  binBadge.position.set(bin.position.x, FLOOR_Y + HOOP_Y * 1.2 + 1.1, bin.position.z);
  scene.add(binBadge);
  let binBadgeTimer = null;
  function binSay(text, fill) {
    drawRepBadge(binTex.ctx, 320, 160, text, fill);
    binTex.texture.needsUpdate = true;
    gsap.fromTo(binBadge.scale, { x: 0.6, y: 0.3 }, { x: 1.6, y: 0.8, duration: 0.35, ease: "back.out(3)", overwrite: true });
    clearTimeout(binBadgeTimer);
    binBadgeTimer = setTimeout(() => gsap.to(binBadge.scale, { x: 0.001, y: 0.001, duration: 0.2, ease: "power2.in", overwrite: true }), 1800);
  }

  const hoopWorld = () => hoop.getWorldPosition(new THREE.Vector3());
  const squashBin = (k = 1) => {
    gsap.fromTo(binBody.scale, { x: 1 + 0.1 * k, y: 1 - 0.12 * k, z: 1 + 0.1 * k }, { x: 1, y: 1, z: 1, duration: 0.7, ease: "elastic.out(1.2, 0.35)" });
  };
  // The shot is yours: each paper ball is thrown from just below the bottom of the screen, under
  // the hoop, so it rises into view as if tossed from where you're sitting. From there it's
  // plain physics (gravity, bounces, rolling), stepped in the render loop, so a brick falls,
  // bounces and rolls without a seam. Missed balls stay where they stop, a few of them strewn
  // round the bin; click one to pick it up and shoot it again from there.
  const GRAVITY = 16;
  const PAPER_R = 0.15;
  const MAX_LITTER = 5;
  const PARKED = new THREE.Vector3(0, -100, 0); // hidden balls are parked out of the pointer's way
  const papers = Array.from({ length: MAX_LITTER + 3 }, () => {
    const ball = crumple(0.16);
    ball.position.copy(PARKED);
    ball.visible = false;
    scene.add(ball);
    return { ball, state: "idle", vel: new THREE.Vector3(), spin: new THREE.Vector3(), t: 0, at: 0, swish: false, side: 1, born: 0 };
  });
  const litter = () => papers.filter((p) => p.state === "litter");
  const tmpQ = new THREE.Quaternion();
  const binTop = () => bin.position.y + (BIN_H + 0.08) * bin.scale.y;
  // Where a throw from the viewer starts: a little below the screen's bottom edge, under the
  // hoop, and a touch nearer the camera so nothing in the room clips it on the way up
  function throwOrigin(hoopAt) {
    camera.updateMatrixWorld();
    tmpV.copy(hoopAt).project(camera);
    const x = THREE.MathUtils.clamp(tmpV.x - 0.25, -0.9, 0.9);
    return new THREE.Vector3(x, -1.15, tmpV.z).unproject(camera)
      .addScaledVector(camera.getWorldDirection(new THREE.Vector3()), -0.6);
  }
  let streak = 0;
  function shoot(from) {
    if (binGone()) return;
    const hoopAt = hoopWorld();
    let paper = from;
    if (!paper) {
      paper = papers.find((p) => p.state === "idle");
      if (!paper) paper = litter().sort((a, b) => a.born - b.born)[0];
      if (!paper) return; // every ball is in the air
    }
    const { ball } = paper;
    gsap.killTweensOf(ball.scale);
    ball.scale.setScalar(1);
    ball.visible = true;
    ball.children[0].visible = true;
    if (!from) ball.position.copy(throwOrigin(hoopAt));
    paper.swish = Math.random() < 0.65;
    paper.side = Math.random() < 0.5 ? -1 : 1;
    // Aim through the ring's middle for a swish, or at one side of its rim for a brick, and
    // solve for the launch velocity that gets there in `at` seconds under gravity
    const aim = paper.swish
      ? hoopAt.clone().add(tmpV.set(0, 0.04, 0))
      : hoopAt.clone().add(tmpV.set(paper.side * 0.24, 0.06, 0).applyQuaternion(bin.quaternion));
    paper.at = THREE.MathUtils.clamp(0.55 + ball.position.distanceTo(aim) * 0.06, 0.7, 1.05);
    paper.vel.subVectors(aim, ball.position).divideScalar(paper.at);
    paper.vel.y += 0.5 * GRAVITY * paper.at;
    paper.spin.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(8 + Math.random() * 6);
    paper.t = 0;
    paper.state = "flying";
    sfx.whoosh({ duration: 0.4 });
  }
  // A swish: it's through the hoop and falls into the bin
  function scored(paper) {
    const hoopAt = hoopWorld();
    paper.state = "idle";
    paper.ball.visible = false;
    paper.ball.position.copy(PARKED);
    sfx.binLand();
    squashBin();
    if (binFill < binPile.length) {
      const ball = binPile[binFill++];
      ball.visible = true;
      gsap.fromTo(ball.scale, { x: 0.6, y: 0.6, z: 0.6 }, { x: 1, y: 1, z: 1, duration: 0.4, ease: "back.out(3)" });
    }
    streak++;
    if (streak >= 3) {
      binSay("ON FIRE!", "#ff6b6b");
      discover("trash");
      burst(hoopAt.x, hoopAt.y + 0.2, hoopAt.z + 0.4);
      sfx.sparkle();
      sfx.cheer();
      streak = 0;
    } else binSay(streak === 1 ? "SWISH!" : `SWISH x${streak}`, "#00e0c6");
  }
  // A ball on the floor shrinks away and goes back in the pool
  function sweep(old, delay = 0) {
    old.state = "leaving";
    // The outline keeps its width in pixels, so a shrinking ball would end as a black dot
    old.ball.children[0].visible = false;
    gsap.to(old.ball.scale, {
      x: 0.001, y: 0.001, z: 0.001, delay, duration: 0.3, ease: "back.in(2)",
      onComplete: () => {
        old.state = "idle";
        old.ball.visible = false;
        old.ball.position.copy(PARKED);
      },
    });
  }
  // Settled on the floor: it stays there, and the oldest goes once there are too many
  function settle(paper) {
    paper.state = "litter";
    paper.born = performance.now();
    paper.vel.set(0, 0, 0);
    const strewn = litter().sort((a, b) => a.born - b.born);
    strewn.slice(0, Math.max(0, strewn.length - MAX_LITTER)).forEach((old) => sweep(old));
  }
  // Snapped away, the bin takes its litter with it: those balls don't come back when it does
  bin.userData.onCrumble = (delay) => litter().forEach((paper) => sweep(paper, delay + 0.3 + Math.random() * 0.6));
  // (and there's no hoop to shoot at while it's gone)
  const binGone = () => bin.userData.rest && bin.scale.x < bin.userData.rest.scale.x * 0.99;
  const SHELF_BOX = {
    x0: shelf.position.x - SHELF_W / 2, x1: shelf.position.x + SHELF_W / 2,
    z0: shelf.position.z - SHELF_D / 2, z1: shelf.position.z + SHELF_D / 2, y1: shelf.position.y + SHELF_H,
  };
  const BOUNCE = 0.42;
  // The shelf's close-up (its shot's dir and depth) clips everything more than 1.6 in front of
  // the shelf, and that cut is angled: it comes nearer the further right you go. A ball across
  // it is sliced open (a black disc, the inside of its outline) or gone, so the litter is
  // fenced in behind it, with a margin, and kept from rolling off the right of the screen.
  const CUT_N = new THREE.Vector3(0.24, 0.1, 1).normalize();
  const CUT_FLAT = new THREE.Vector3(CUT_N.x, 0, CUT_N.z).normalize();
  const CUT_AT = new THREE.Vector3(shelf.position.x + 0.35, 0, shelf.position.z);
  const CUT_REACH = (1.6 - PAPER_R - 0.12) / Math.hypot(CUT_N.x, CUT_N.z);
  const LITTER_RIGHT = bin.position.x + 1.1;
  function stepPaper(paper, dt) {
    const { ball, vel, spin } = paper;
    const p = ball.position;
    const prevT = paper.t;
    paper.t += dt;
    vel.y -= GRAVITY * dt;
    p.addScaledVector(vel, dt);
    if (paper.state === "flying" && prevT < paper.at && paper.t >= paper.at) {
      if (paper.swish) {
        // The net catches it: most of its sideways speed goes, and it drops through
        vel.x *= 0.12;
        vel.z *= 0.12;
        vel.y = Math.min(vel.y, -1.5);
        sfx.swish();
        gsap.fromTo(net.scale, { x: 0.8, y: 1.7, z: 0.8 }, { x: 1, y: 1, z: 1, duration: 0.8, ease: "elastic.out(1.1, 0.3)" });
      } else {
        // Off the rim: it kicks out sideways and a little toward the room, losing most of its
        // pace, so each one comes down somewhere different round the bin's foot
        const out = tmpV.set(paper.side, 0, 0).applyQuaternion(bin.quaternion);
        vel.set(out.x * (0.6 + Math.random() * 0.9) + 0.2, 2 + Math.random(), 0.5 + Math.random() * 0.8);
        spin.multiplyScalar(-1.4);
        sfx.rimHit({ strength: 0.5 });
        gsap.fromTo(hoop.rotation, { x: 0.18, z: paper.side * 0.12 }, { x: 0, z: 0, duration: 0.9, ease: "elastic.out(1, 0.25)" });
        gsap.fromTo(net.scale, { x: 1.15, y: 0.85 }, { x: 1, y: 1, duration: 0.6, ease: "elastic.out(1, 0.3)" });
        streak = 0;
        binSay("BRICK!", "#ffdd00");
        paper.state = "loose";
      }
    }
    if (paper.state === "flying") {
      if (paper.swish && paper.t > paper.at && p.y < binTop() - 0.35) scored(paper);
      else if (!paper.swish || paper.t < paper.at) ball.rotateOnAxis(tmpV.copy(spin).normalize(), spin.length() * dt);
      return;
    }
    // Loose: the bin's side (a tapered cylinder), the shelf, the wall and the floor
    tmpV.set(p.x - bin.position.x, 0, p.z - bin.position.z);
    const h = THREE.MathUtils.clamp((p.y - bin.position.y) / (BIN_H * bin.scale.y), 0, 1);
    const binR = (0.4 + 0.15 * h) * bin.scale.x + PAPER_R;
    const d = tmpV.length();
    if (p.y < binTop() + PAPER_R * 0.5 && d < binR && d > 1e-4) {
      tmpV.divideScalar(d);
      p.x = bin.position.x + tmpV.x * binR;
      p.z = bin.position.z + tmpV.z * binR;
      const into = vel.x * tmpV.x + vel.z * tmpV.z;
      if (into < 0) {
        vel.x -= (1 + BOUNCE) * into * tmpV.x;
        vel.z -= (1 + BOUNCE) * into * tmpV.z;
      }
    }
    if (p.y < SHELF_BOX.y1 && p.x > SHELF_BOX.x0 - PAPER_R && p.x < SHELF_BOX.x1 + PAPER_R && p.z > SHELF_BOX.z0 - PAPER_R && p.z < SHELF_BOX.z1 + PAPER_R) {
      // Out through whichever face it's nearest
      const pushes = [
        [SHELF_BOX.x1 + PAPER_R - p.x, "x", 1], [p.x - (SHELF_BOX.x0 - PAPER_R), "x", -1], [SHELF_BOX.z1 + PAPER_R - p.z, "z", 1],
      ].sort((a, b) => a[0] - b[0]);
      const [depth, axis, dir] = pushes[0];
      p[axis] += depth * dir;
      if (vel[axis] * dir < 0) vel[axis] *= -BOUNCE;
    }
    const wallFace = WALL_Z + 0.12 + PAPER_R;
    if (p.z < wallFace) {
      p.z = wallFace;
      if (vel.z < 0) vel.z *= -BOUNCE;
    }
    // Behind the close-up's cut (the floor is below the shot's target, which only helps, so
    // height is left out) and no further right than the screen shows
    const over = (p.x - CUT_AT.x) * CUT_FLAT.x + (p.z - CUT_AT.z) * CUT_FLAT.z - CUT_REACH;
    if (over > 0) {
      p.addScaledVector(CUT_FLAT, -over);
      const into = vel.x * CUT_FLAT.x + vel.z * CUT_FLAT.z;
      if (into > 0) {
        vel.x -= (1 + BOUNCE) * into * CUT_FLAT.x;
        vel.z -= (1 + BOUNCE) * into * CUT_FLAT.z;
      }
    }
    if (p.x > LITTER_RIGHT) {
      p.x = LITTER_RIGHT;
      if (vel.x > 0) vel.x *= -BOUNCE;
    }
    // Balls already on the floor are bumped, not passed through, so they spread out
    papers.forEach((other) => {
      if (other === paper || other.state !== "litter") return;
      tmpV.set(p.x - other.ball.position.x, 0, p.z - other.ball.position.z);
      const gap = tmpV.length();
      if (p.y > FLOOR_Y + PAPER_R * 3 || gap >= PAPER_R * 2 || gap < 1e-4) return;
      tmpV.divideScalar(gap);
      p.x += tmpV.x * (PAPER_R * 2 - gap);
      p.z += tmpV.z * (PAPER_R * 2 - gap);
      const into = vel.x * tmpV.x + vel.z * tmpV.z;
      if (into < 0) {
        vel.x -= (1 + BOUNCE) * into * tmpV.x;
        vel.z -= (1 + BOUNCE) * into * tmpV.z;
      }
    });
    const floor = FLOOR_Y + PAPER_R;
    let grounded = false;
    if (p.y <= floor) {
      p.y = floor;
      grounded = true;
      if (vel.y < -1.2) {
        sfx.paperBounce({ strength: Math.min(0.5, -vel.y / 14) });
        vel.y *= -BOUNCE;
        vel.x *= 0.8;
        vel.z *= 0.8;
      } else vel.y = 0;
    }
    if (grounded && vel.y === 0) {
      // Rolling: friction slows it, and it turns about the axis across its path
      const fade = Math.exp(-2.2 * dt);
      vel.x *= fade;
      vel.z *= fade;
      const speed = Math.hypot(vel.x, vel.z);
      if (speed < 0.06) return settle(paper);
      tmpQ.setFromAxisAngle(tmpV.set(vel.z, 0, -vel.x).divideScalar(speed), (speed / PAPER_R) * dt);
      ball.quaternion.premultiply(tmpQ);
    } else ball.rotateOnAxis(tmpV.copy(spin).normalize(), spin.length() * dt);
  }
  function updatePapers(dt) {
    const step = Math.min(dt, 0.05) / 3;
    papers.forEach((paper) => {
      for (let i = 0; i < 3 && (paper.state === "flying" || paper.state === "loose"); i++) stepPaper(paper, step);
    });
  }
  papers.forEach((paper) => register(paper.ball, {
    onHover: (on) => {
      if (!on || paper.state !== "litter") return;
      gsap.fromTo(paper.ball.position, { y: FLOOR_Y + PAPER_R + 0.12 }, { y: FLOOR_Y + PAPER_R, duration: 0.4, ease: "bounce.out" });
    },
    onClick: () => paper.state === "litter" && shoot(paper),
  }));
  register(bin, {
    // Hovered, it perks up: a little hop and the hoop's net sways, as if it's ready for a pass
    onHover: (on) => {
      if (!on) return;
      gsap.fromTo(binBody.position, { y: 0 }, { keyframes: [{ y: 0.12, duration: 0.14, ease: "power2.out" }, { y: 0, duration: 0.2, ease: "power2.in" }] });
      gsap.fromTo(hoop.rotation, { z: 0.08 }, { z: 0, duration: 0.8, ease: "elastic.out(1, 0.3)" });
    },
    onClick: () => shoot(),
  });

  // ---------- monitor riser: a wooden shelf the monitor and speakers stand on ----------
  // One board of the desk's own grain on two slab legs, the same wood as the top so it reads as
  // part of the desk, deep enough for the speakers and the monitor's foot
  const RISER_TOP = 0.5;
  const RISER_BOARD = 0.14;
  const RISER_LEG_SHADE = 0.62;
  const riserWood = deskWood.texture.clone();
  riserWood.wrapS = riserWood.wrapT = THREE.RepeatWrapping;
  // the grain at the desk's scale: half its length, and one of its five boards
  riserWood.repeat.set(0.5, 0.2);
  riserWood.offset.set(0.2, 0.4);
  riserWood.needsUpdate = true;
  track(riserWood);
  const riserMat = toon(PALETTES.light.desk);
  riserMat.map = riserWood;
  const riser = new THREE.Group();
  riser.position.set(-0.25, 0, -3.1);
  scene.add(riser);
  const riserTop = mesh(rbox(7.0, RISER_BOARD, 2.0, 0.05), riserMat, { outline: 0.045 });
  riserTop.position.y = RISER_TOP - RISER_BOARD / 2;
  riser.add(riserTop);
  // The legs in a deeper shade of the same grain, set in from the ends under an overhang, so
  // they stand apart from the desk top they rest on
  const riserLegMat = toon(PALETTES.light.desk);
  riserLegMat.color.multiplyScalar(RISER_LEG_SHADE);
  riserLegMat.map = riserWood;
  [-3.0, 3.0].forEach((x) => {
    const leg = mesh(rbox(0.36, RISER_TOP - RISER_BOARD, 1.7, 0.04), riserLegMat, { outline: 0.04 });
    leg.position.set(x, (RISER_TOP - RISER_BOARD) / 2, 0);
    riser.add(leg);
  });

  // ---------- monitor + terminal ----------
  const monitor = new THREE.Group();
  monitor.position.set(-0.2, RISER_TOP, -2.75);
  scene.add(monitor);
  // Nearly bezelless, in black: a thin slab that stops just short of the screen's edges, a
  // slim chin below it, on a flat foot with a slanted plate for a stand (a few near-blacks, so
  // it keeps its shape)
  const aluminium = toon("#2b2d31");
  const base = mesh(rbox(1.75, 0.07, 1.3, 0.03), aluminium, { outline: 0.03 });
  base.position.set(0, 0.035, -0.15);
  const neck = mesh(rbox(1.3, 1.75, 0.09, 0.03), aluminium, { outline: 0.03 });
  neck.position.set(0, 0.9, -0.42);
  neck.rotation.x = 0.16;
  // The screen runs from x -2.0 to 2.0 and y 1.43 to 3.83; the body is only 0.11 wider each
  // side and 0.09 taller, with the chin below from 1.0
  const body = mesh(rbox(4.22, 2.92, 0.14, 0.08), toon("#1f2125"), { outline: 0.06 });
  body.position.set(0, 2.46, 0);
  const bezel = mesh(rbox(4.16, 2.5, 0.02, 0.05), toon("#141518"), { outline: 0, cast: false });
  bezel.position.set(0, 2.63, 0.075);
  monitor.add(base, neck, body, bezel);
  // The details: a thin black border round the panel, a webcam in the top bezel, a little
  // logo and a power light on the chin (the body's own face below the bezel, 1.0 to 1.38),
  // and the cable hole through the stand
  // between the bezel's face (z 0.085) and the screen (z 0.09)
  const panelEdge = mesh(rbox(4.08, 2.44, 0.006, 0.002), toon("#1a1714"), { outline: 0, cast: false });
  panelEdge.position.set(0, 2.63, 0.084);
  // in the strip of bezel above the panel (3.85 to 3.88)
  const webcam = new THREE.Mesh(track(new THREE.CircleGeometry(0.016, 16)), track(new THREE.MeshBasicMaterial({ color: "#2a2d33" })));
  webcam.position.set(0, 3.866, 0.087);
  const webcamLens = new THREE.Mesh(track(new THREE.CircleGeometry(0.007, 12)), track(new THREE.MeshBasicMaterial({ color: "#5a7bb0" })));
  webcamLens.position.set(0, 3.866, 0.088);
  // a small, plain round mark (the pentagon read as clutter)
  const chinLogo = new THREE.Mesh(track(new THREE.CircleGeometry(0.045, 24)), track(new THREE.MeshBasicMaterial({ color: "#5c6169" })));
  chinLogo.position.set(0, 1.19, 0.085);
  const powerLed = new THREE.Mesh(track(new THREE.CircleGeometry(0.022, 10)), track(new THREE.MeshBasicMaterial({ color: "#16a34a" })));
  powerLed.position.set(1.8, 1.19, 0.085);
  const cableHole = new THREE.Mesh(track(new THREE.CircleGeometry(0.12, 18)), track(new THREE.MeshBasicMaterial({ color: "#0e0f11" })));
  cableHole.position.set(0, 0.25, 0.05);
  neck.add(cableHole);
  [panelEdge, webcam, webcamLens, chinLogo, powerLed].forEach((part) => (part.raycast = noRaycast));
  monitor.add(panelEdge, webcam, webcamLens, chinLogo, powerLed);
  // Bias lighting: a strip on the monitor's back throws a cyan-to-pink glow on the wall behind
  // it, at night. Drawn as the blurred shadow of a rounded rect (the shape itself stays off the
  // canvas), so it fades out evenly on every side.
  const monitorGlowTex = canvasTexture(640, 480);
  track(monitorGlowTex.texture);
  {
    const c = monitorGlowTex.ctx;
    const glowFill = c.createLinearGradient(0, 0, 640, 0);
    glowFill.addColorStop(0, "#00e0c6");
    glowFill.addColorStop(0.5, "#8b7bff");
    glowFill.addColorStop(1, "#ff90e8");
    // The shadow takes its colour from shadowColor only, so lay the gradient over it
    c.shadowColor = "#ffffff";
    c.shadowBlur = 60;
    c.shadowOffsetX = 2000;
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.roundRect(120 - 2000, 110, 400, 260, 50);
    c.fill();
    c.shadowColor = "transparent";
    c.globalCompositeOperation = "source-in";
    c.fillStyle = glowFill;
    c.fillRect(0, 0, 640, 480);
  }
  // Normal blending, not additive: the night wall is already pale, so added light only washed
  // the colours out to white; laid over it instead, the glow keeps its cyan, violet and pink
  const monitorGlowMat = track(new THREE.MeshBasicMaterial({
    map: monitorGlowTex.texture, transparent: true, depthWrite: false, opacity: 0,
  }));
  const monitorGlow = new THREE.Mesh(track(new THREE.PlaneGeometry(10.4, 7.8)), monitorGlowMat);
  // On the wall, centred behind the screen
  monitorGlow.position.set(monitor.position.x, RISER_TOP + 2.7, WALL_Z + 0.16);
  monitorGlow.raycast = noRaycast;
  scene.add(monitorGlow);
  // The bias strip lights the wall for real too: cyan on the left, pink on the right
  [["#00e0c6", -1.6], ["#ff90e8", 1.6]].forEach(([color, dx]) => {
    const light = neonLight(color, 2.5, () => monitorGlowMat.opacity / 0.7, { distance: 6 });
    light.position.set(monitor.position.x + dx, RISER_TOP + 2.6, WALL_Z + 1.2);
    scene.add(light);
  });
  // Sticky notes on the right of the bezel, each with a hard little shadow behind it
  const noteShadowMat = track(new THREE.MeshBasicMaterial({ color: "#000000" }));
  [
    // Stuck to the right edge of the body, half hanging off it, clear of the screen
    { text: "ship it", color: "#ffdd00", tick: true, x: 2.18, y: 3.4, rz: -0.12 },
    { text: "drink water!", color: "#ff90e8", x: 2.22, y: 2.15, rz: 0.18 },
  ].forEach((n) => {
    const note = printed(0.62, 0.62, 500, (c, w, h) => drawStickyNote(c, w, h, n));
    const shadow = new THREE.Mesh(track(new THREE.PlaneGeometry(0.62, 0.62)), noteShadowMat);
    shadow.position.set(0.05, -0.05, -0.004);
    shadow.raycast = noRaycast;
    const stuck = new THREE.Group();
    stuck.position.set(n.x, n.y, 0.1);
    stuck.rotation.z = n.rz;
    stuck.add(shadow, note);
    monitor.add(stuck);
    register(note, {
      focus: "monitor", item: true, sticky: stuck,
      // Curl the loose paper forward, keeping its draggable mounting group in place.
      onHover: (on) => {
        const angle = on ? -0.2 : 0;
        gsap.to(note.rotation, { x: angle, duration: 0.25, ease: "power2.out", overwrite: true });
        gsap.to(note.position, { y: 0.31 * (1 - Math.cos(angle)), z: -0.31 * Math.sin(angle), duration: 0.25, ease: "power2.out", overwrite: true });
      },
    });
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
    gsap.fromTo(speaker.woofer.scale, { x: 1 + 0.04 * strength, z: 1 + 0.04 * strength }, { x: 1, z: 1, duration: 0.18, ease: "power2.out", overwrite: true });
    gsap.fromTo(speaker.dustCap.position, { z: speaker.dustCap.userData.restZ + 0.018 * strength }, { z: speaker.dustCap.userData.restZ, duration: 0.18, ease: "power2.out", overwrite: true });
    gsap.fromTo(speaker.group.scale, { x: 1.02, y: 0.98, z: 1.02 }, { x: 1, y: 1, z: 1, duration: 0.22, ease: "power2.out", overwrite: true });
  }
  [-3.05, 2.55].forEach((x) => {
    const speaker = new THREE.Group();
    speaker.position.set(x, RISER_TOP, -3.55);
    scene.add(speaker);
    const cabinet = mesh(rbox(0.95, 1.75, 0.85, 0.065), toon("#252a31"), { outline: 0.028 });
    cabinet.position.y = 0.875;
    const baffle = mesh(rbox(0.83, 1.58, 0.035, 0.045), toon("#14181e"), { outline: 0.009 });
    baffle.position.set(0, 0.9, 0.431);
    // A recessed cone meets its rubber surround; the centre cap sits inside the cone.
    const coneProfile = [[0.278, 0.018], [0.26, 0.012], [0.13, -0.035], [0.09, -0.035]].map(([r, depth]) => new THREE.Vector2(r, depth));
    const woofer = mesh(new THREE.LatheGeometry(coneProfile, 48), toon("#7f9fd8"), { outline: 0 });
    woofer.rotation.x = Math.PI / 2;
    woofer.position.set(0, 0.62, 0.49);
    const basket = mesh(new THREE.TorusGeometry(0.322, 0.014, 10, 48), toon("#454e5d"), { outline: 0 });
    basket.position.set(0, 0.62, 0.485);
    const surround = mesh(new THREE.TorusGeometry(0.287, 0.027, 12, 48), toon("#080b10"), { outline: 0 });
    surround.position.set(0, 0.62, 0.498);
    const dustCap = mesh(new THREE.SphereGeometry(0.105, 24, 16), toon("#252b35"), { outline: 0.004 });
    dustCap.scale.z = 0.4;
    dustCap.position.set(0, 0.62, 0.477);
    dustCap.userData.restZ = dustCap.position.z;
    const waveguide = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 40), toon("#080b10"), { outline: 0.005 });
    waveguide.rotation.x = Math.PI / 2;
    waveguide.position.set(0, 1.25, 0.463);
    const tweeter = mesh(new THREE.SphereGeometry(0.105, 24, 16), toon("#ffdd00"), { outline: 0.004 });
    tweeter.scale.z = 0.38;
    tweeter.position.set(0, 1.25, 0.485);
    const tweeterRim = mesh(new THREE.TorusGeometry(0.128, 0.012, 10, 40), toon("#434c59"), { outline: 0 });
    tweeterRim.position.set(0, 1.25, 0.48);
    const statusX = x < 0 ? -0.24 : 0.24;
    const ledMat = track(new THREE.MeshBasicMaterial({ color: soundMuted ? "#e11d48" : "#16a34a" }));
    const ledHousing = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 28), toon("#080b10"), { outline: 0.005 });
    ledHousing.rotation.x = Math.PI / 2;
    ledHousing.position.set(statusX, 1.55, 0.452);
    const led = new THREE.Mesh(track(new THREE.SphereGeometry(0.045, 20, 14)), ledMat);
    led.scale.z = 0.4;
    led.position.set(statusX, 1.55, 0.46);
    speakerLeds.push(ledMat);
    // Flush fasteners, a small bass port and the power control finish the front panel.
    [-0.35, 0.35].forEach((sx) => [0.18, 1.6].forEach((sy) => {
      const screw = new THREE.Mesh(track(new THREE.CircleGeometry(0.012, 12)), toon("#747c89"));
      screw.position.set(sx, sy, 0.451);
      screw.raycast = noRaycast;
      speaker.add(screw);
    }));
    const port = mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.012, 24), toon("#050608"), { outline: 0 });
    port.rotation.x = Math.PI / 2;
    port.position.set(-0.26, 0.18, 0.455);
    const portRim = mesh(new THREE.TorusGeometry(0.05, 0.007, 8, 24), toon("#434c59"), { outline: 0 });
    portRim.position.set(-0.26, 0.18, 0.46);
    const knob = mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.035, 24), toon("#697383"), { outline: 0.004 });
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0.26, 0.18, 0.465);
    const knobMark = mesh(new THREE.BoxGeometry(0.006, 0.02, 0.004), toon("#f1f1ed"), { outline: 0 });
    knobMark.position.set(0.26, 0.194, 0.485);
    speaker.add(cabinet, baffle, basket, surround, woofer, dustCap, waveguide, tweeter, tweeterRim, ledHousing, led, port, portRim, knob, knobMark);
    const entry = { group: speaker, woofer, dustCap, tweeter };
    speakers.push(entry);
    register(speaker, {
      onHover: (on) => {
        gsap.to(speaker.rotation, { x: on ? -0.045 : 0, duration: 0.3, ease: "power2.out", overwrite: true });
        if (on) {
          pump(entry, 1.2);
          floatNote(entry);
        }
      },
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
      robotBeat(kind);
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
    discover("lofi");
    if (lofi.play(index) && fresh) desktop.notify("spotifree", "Now playing", TRACKS[lofi.index].title);
    redrawScreen();
  }
  function setMuted(isMuted) {
    setRainLevel(isMuted ? 0 : outside.rain);
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
  // The screen's own spill: a cool light over the keyboard and desk, faint by day, and the
  // props in front of it throw shadows towards the visitor at night
  const screenLight = neonLight("#c4d4ff", 2.2, () => (darkNow ? 1 : 0.25), { distance: 7, shadow: true });
  screenLight.position.set(0, 2.5, 0.9);
  monitor.add(screenLight);
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
      sound: (name) => sfx[name]?.(),
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
    gsap.fromTo(monitor.position, { y: RISER_TOP }, { keyframes: [{ y: RISER_TOP + 0.3, duration: 0.15, ease: "power2.out" }, { y: RISER_TOP, duration: 0.4, ease: "bounce.out" }] });
    sfx.ping();
  };
  timers.push(setTimeout(welcome, 1500));

  const showTerminal = () => {
    desktop.exitConsole();
    if (desktop.active() === "terminal") return;
    desktop.launch("terminal");
    redrawScreen();
  };
  const monitorEdgeRest = panelEdge.material.color.clone();
  register(monitor, {
    focus: "monitor",
    // Leaving the screen switches the console off
    onLeave: () => desktop.exitConsole() && redrawScreen(),
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
    onHover: (on) => {
      if (!on && desktop.hover(null)) redrawScreen();
      // The screen acknowledges attention without moving the stand or its clickable UI.
      gsap.to(powerLed.scale, { x: on ? 1.8 : 1, y: on ? 1.8 : 1, duration: 0.25, overwrite: true });
      gsap.to(panelEdge.material.color, { r: on ? 0.12 : monitorEdgeRest.r, g: on ? 0.25 : monitorEdgeRest.g, b: on ? 0.23 : monitorEdgeRest.b, duration: 0.25, overwrite: true });
    },
    onPointer: (hit) => {
      const moved = hit?.object === screen && hit.uv ? desktop.hover(hit.uv.x * SCREEN_W, (1 - hit.uv.y) * SCREEN_H) : desktop.hover(null);
      if (moved) redrawScreen();
    },
    // The console, Snake or Spotifree up front take their keys; anything else goes to the terminal
    onKey: (e) => {
      if (focus.name !== "monitor") return false;
      // The console takes every key; Snake up front takes the arrows and WASD
      if (desktop.key(e)) {
        redrawScreen();
        return true;
      }
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
  // The board is 6.8 × 4.2 centred at (4.6, 5.8) on the back wall: the pin sits inside its
  // top-left corner and the badge hangs just off its left edge. Close up, the camera's near
  // plane cuts away the monitor in front of it (see the hero shot's depth).
  const BADGE_PIN = new THREE.Vector3(1.4, 7.55, WALL_Z + 0.48);
  const BADGE_CLIP = new THREE.Vector3(1.4, 5.85, WALL_Z + 0.58); // straight below the pin: the rope's resting shape
  // Blue: it stands off the yellow badge, the red pin and the cork
  const strapWeave = canvasTexture(512, 128);
  track(strapWeave.texture);
  const weave = strapWeave.ctx;
  weave.fillStyle = "#245bd7";
  weave.fillRect(0, 0, 512, 128);
  for (let y = 0; y < 128; y += 3) {
    weave.fillStyle = y % 2 ? "#ffffff12" : "#0b256522";
    weave.fillRect(0, y, 512, 1);
  }
  weave.fillStyle = "#b9d3ff";
  for (const y of [5, 59, 69, 123]) {
    for (let x = 0; x < 512; x += 12) weave.fillRect(x, y, 7, 1);
  }
  weave.font = "700 11px 'Space Grotesk', sans-serif";
  weave.textAlign = "center";
  for (const y of [35, 99]) {
    for (const x of [128, 384]) weave.fillText("OKASP  /  MAKE THINGS WORK", x, y);
  }
  const strapMat = toon("#ffffff");
  strapMat.map = strapWeave.texture;
  // Where the pin is now: drag it to re-pin the badge anywhere on this stretch of wall
  const badgePin = BADGE_PIN.clone();
  const PIN_BOUNDS = { minX: 0.3, maxX: 8.0, minY: 4.9 + WALL_LIFT, maxY: 9.0 + WALL_LIFT };
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
  const strandPoint = (i, side, out) => {
    const t = i / ROPE_SEGMENTS;
    return out.set(rope[i].x + side * 0.17 * Math.sin(Math.PI * t), rope[i].y, rope[i].z + 0.02);
  };
  // Flattened, rounded ribbons: reuse their buffers as the rope moves, including the outline.
  const STRAND_STEPS = 48;
  const STRAND_RADIUS = 0.075;
  const STRAND_DEPTH = 0.014;
  const strands = [-1, 1].map((side) => {
    const curve = new THREE.CatmullRomCurve3(rope.map((_, i) => strandPoint(i, side, new THREE.Vector3())));
    const geo = track(new THREE.TubeGeometry(curve, STRAND_STEPS, STRAND_RADIUS, 8));
    const tube = new THREE.Mesh(geo, strapMat);
    tube.castShadow = true;
    tube.receiveShadow = true;
    const hull = new THREE.Mesh(geo, outlineMat(0.03));
    hull.raycast = noRaycast;
    // the pin can be dragged anywhere on the wall, past the tube's first bounds
    tube.frustumCulled = hull.frustumCulled = false;
    tube.add(hull);
    scene.add(tube);
    return { side, curve, tube };
  });
  const strapPin = new THREE.Group();
  const pinMetal = toon("#b8c4d5");
  const pinSeat = mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.04, 20), toon("#9f1239"), { outline: 0.012 });
  pinSeat.rotation.x = Math.PI / 2;
  const pinStem = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.11, 12), pinMetal, { outline: 0.008 });
  pinStem.rotation.x = Math.PI / 2;
  pinStem.position.z = 0.04;
  const pinHead = mesh(new THREE.SphereGeometry(0.105, 18, 12), toon("#f43f5e"), { outline: 0.02 });
  pinHead.scale.set(1, 1, 0.65);
  pinHead.position.z = 0.12;
  const pinGlint = mesh(new THREE.SphereGeometry(0.025, 10, 8), toon("#ffbdcc"), { outline: 0, cast: false });
  pinGlint.position.set(-0.035, 0.04, 0.175);
  strapPin.add(pinSeat, pinStem, pinHead, pinGlint);
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
      sfx.strap({ speed: 0.3 });
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
  // How far out from the wall the badge must hang at (x, y, angle) to clear the papers under
  // it; the About board fills this in once its papers exist
  let badgeClearance = () => -Infinity;
  let badgeZ = BADGE_CLIP.z;
  const strapPoint = new THREE.Vector3();
  const strapTangent = new THREE.Vector3();
  function updateLanyard(dt) {
    ropeTime += dt;
    ropeClock += dt;
    const STEP = 1 / 120;
    while (ropeClock >= STEP) {
      stepRope(STEP);
      ropeClock -= STEP;
    }
    // Over a paper the badge stands off it, quick to pull out and slow to settle back, and
    // the strap leans out with it from the pin
    const clearance = Math.max(BADGE_CLIP.z, badgeClearance(rope[ROPE_SEGMENTS].x, rope[ROPE_SEGMENTS].y, badgeAngle));
    badgeZ += (clearance - badgeZ) * Math.min(1, dt * (clearance > badgeZ ? 30 : 4));
    rope.forEach((p, i) => (p.z = THREE.MathUtils.lerp(BADGE_PIN.z, badgeZ, i / ROPE_SEGMENTS)));
    strands.forEach(({ side, curve, tube }) => {
      curve.points.forEach((point, i) => strandPoint(i, side, point));
      const { position, normal } = tube.geometry.attributes;
      for (let i = 0; i <= STRAND_STEPS; i++) {
        curve.getPoint(i / STRAND_STEPS, strapPoint);
        curve.getTangent(i / STRAND_STEPS, strapTangent);
        const length = Math.hypot(strapTangent.x, strapTangent.y) || 1;
        const sx = strapTangent.y / length;
        const sy = -strapTangent.x / length;
        for (let j = 0; j <= 8; j++) {
          const angle = j / 8 * Math.PI * 2;
          const x = Math.cos(angle);
          const z = Math.sin(angle);
          const index = i * 9 + j;
          position.setXYZ(index, strapPoint.x + sx * x * STRAND_RADIUS, strapPoint.y + sy * x * STRAND_RADIUS, strapPoint.z + z * STRAND_DEPTH);
          const nx = x / STRAND_RADIUS;
          const nz = z / STRAND_DEPTH;
          const n = Math.hypot(nx, nz);
          normal.setXYZ(index, sx * nx / n, sy * nx / n, nz / n);
        }
      }
      position.needsUpdate = normal.needsUpdate = true;
    });
    const end = rope[ROPE_SEGMENTS];
    const before = rope[ROPE_SEGMENTS - 2];
    badge.position.set(end.x, end.y, badgeZ);
    const target = Math.atan2(end.x - before.x, before.y - end.y);
    const spinBefore = badgeSpin;
    badgeSpin += (90 * (target - badgeAngle) - 7 * badgeSpin) * dt;
    badgeAngle += badgeSpin * dt;
    badge.rotation.z = badgeAngle;
    // Each time a real swing turns back, the holder knocks its clip; the breeze's little drift
    // never builds enough to click
    swingPeak = Math.max(swingPeak, Math.abs(badgeSpin));
    if (Math.sign(badgeSpin) !== Math.sign(spinBefore) && spinBefore !== 0) {
      if (swingPeak > BADGE_CLICK_SPIN) sfx.badgeClick({ strength: Math.min(1, swingPeak / 8) });
      swingPeak = 0;
    }
  }
  let swingPeak = 0;
  const BADGE_CLICK_SPIN = 1.5;
  // A sideways push on the lower part of the strap, strongest at the badge
  const swing = (amount) => {
    rope.forEach((p, i) => {
      const reach = i / ROPE_SEGMENTS;
      p.px -= amount * 0.09 * reach * reach;
    });
  };
  // Deep enough to close round both strands' ends (they meet at its centre, 0.05 thick and
  // 0.02 proud of the badge), so neither pokes out through its face
  const clip = new THREE.Group();
  clip.position.z = 0.02;
  const clipBody = at(mesh(rbox(0.23, 0.14, 0.09, 0.025), pinMetal, { outline: 0.018 }), 0, 0, 0.025);
  const clipInset = at(mesh(rbox(0.15, 0.045, 0.015, 0.01), toon("#526075"), { outline: 0.006 }), 0, 0.01, 0.08);
  const clipRivet = at(mesh(new THREE.SphereGeometry(0.025, 12, 8), toon("#edf4ff"), { outline: 0.006 }), 0, -0.025, 0.085);
  const clipRing = mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 20), pinMetal, { outline: 0.008 });
  clipRing.position.set(0, -0.115, 0.025);
  clip.add(clipBody, clipInset, clipRivet, clipRing);
  const badgeCard = new THREE.Group();
  // About the size of a real ID card on a lanyard (it was reading as a clipboard)
  badgeCard.position.y = -0.74;
  const badgeFront = printed(0.76, 1.22, 700, (c, w, h) => drawBadge(c, w, h));
  badgeFront.position.z = 0.038;
  const badgeBack = printed(0.76, 1.22, 700, (c, w, h) => drawBadge(c, w, h, { back: true }));
  badgeBack.position.z = -0.038;
  badgeBack.rotation.y = Math.PI;
  const badgeHolder = mesh(phoneSlab(0.86, 1.34, 0.065, 0.06), toon("#d6e2ee"), { outline: 0.025 });
  const badgeLip = at(mesh(rbox(0.23, 0.1, 0.07, 0.025), pinMetal, { outline: 0.012 }), 0, 0.65, 0);
  const holderSlot = at(mesh(rbox(0.115, 0.025, 0.075, 0.01), toon("#273449"), { outline: 0 }), 0, 0.66, 0);
  badgeCard.add(badgeHolder, badgeFront, badgeBack, badgeLip, holderSlot);
  badge.add(clip, badgeCard);
  // Zoomed in, clicking the badge turns it over: the links are printed on the back
  let badgeFlipped = false;
  const flipBadge = (to = !badgeFlipped) => {
    badgeFlipped = to;
    discover("badge");
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
  aboutBoard.position.set(4.6, 5.8, -4.28); // on the wall: WALL_Z + 0.3
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
  // Paper isn't rigid: pinned at the top, each sheet bows a touch and one bottom corner curls
  // up off the cork. Both the backing and the print are bent the same way.
  const curlPaper = (geo, w, h, curl, side) => {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / (w / 2);
      const y = pos.getY(i) / (h / 2);
      const k = Math.max(0, (side * x - y - 1.05) / 0.95);
      const bow = 0.012 * (1 - x * x) * (1 - y) * 0.5;
      pos.setZ(i, pos.getZ(i) + curl * k * k + bow);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const TAPED = { resume: [-1, 1], location: [1, -1] };
  const boardNotes = ABOUT_NOTES.map((note, n) => {
    const [x, y, slotW, slotH] = noteLayout[note.id];
    const w = slotW * NOTE_SCALE;
    const h = slotH * NOTE_SCALE;
    const paper = new THREE.Group();
    paper.position.set(x, y, 0.15);
    paper.rotation.z = -THREE.MathUtils.clamp(note.rotate, -4, 4) * Math.PI / 180;
    const curl = note.id === "resume" ? 0 : 0.05 + (n % 3) * 0.02;
    const side = n % 2 ? -1 : 1;
    const pinY = h / 2 - Math.min(0.1, h * 0.15);
    const sheet = new THREE.Group();
    sheet.position.y = pinY;
    paper.add(sheet);
    const backing = mesh(curlPaper(new THREE.BoxGeometry(w, h, 0.025, 10, 10, 1), w, h, curl, side), toon("#fffdf5"), { outline: 0.018 });
    // Same canvas as a full-size paper, so the print keeps its layout and sharpness
    const face = printed(w, h, 230 / NOTE_SCALE, (c, pw, ph) => drawAboutNote(c, pw, ph, note));
    face.geometry.dispose();
    face.geometry = track(curlPaper(new THREE.PlaneGeometry(w, h, 10, 10), w, h, curl, side));
    backing.position.y = -pinY;
    face.position.set(0, -pinY, 0.014);
    sheet.add(backing, face);
    // A strip of washi tape over a corner on a couple of them, as well as the pin
    if (TAPED[note.id]) {
      const [tx, ty] = TAPED[note.id];
      const tape = new THREE.Mesh(track(new THREE.PlaneGeometry(0.36, 0.1)), track(new THREE.MeshBasicMaterial({ color: note.id === "resume" ? "#00e0c6" : "#ff90e8", transparent: true, opacity: 0.85 })));
      tape.position.set(tx * (w / 2 - 0.04), ty * (h / 2 - 0.03) - pinY, 0.03);
      tape.rotation.z = tx * ty * 0.75;
      sheet.add(tape);
    }
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
    paper.add(pinShadow, pin, ring);
    aboutBoard.add(shadow, paper);
    return { paper, sheet, shadow, pin, pinShadow, head, highlight, ring, w, h, href: note.href, angle: paper.rotation.z };
  });
  // The badge swinging over the board clears each paper's face, its pin and however far a
  // hover has tipped the sheet out from the cork, with a margin for the swing's speed
  badgeClearance = (x, y, angle) => {
    const cos = Math.abs(Math.cos(angle));
    const sin = Math.abs(Math.sin(angle));
    const cardX = x + 0.74 * Math.sin(angle);
    const cardY = y - 0.74 * Math.cos(angle);
    const halfX = 0.43 * cos + 0.67 * sin + 0.2;
    const halfY = 0.43 * sin + 0.67 * cos + 0.2;
    let z = -Infinity;
    boardNotes.forEach(({ paper, sheet, w, h }) => {
      const noteX = (w * Math.cos(paper.rotation.z) + h * Math.abs(Math.sin(paper.rotation.z))) / 2 * paper.scale.x;
      const noteY = (h * Math.cos(paper.rotation.z) + w * Math.abs(Math.sin(paper.rotation.z))) / 2 * paper.scale.y;
      if (Math.abs(aboutBoard.position.x + paper.position.x - cardX) > halfX + noteX) return;
      if (Math.abs(aboutBoard.position.y + paper.position.y - cardY) > halfY + noteY) return;
      const tipped = Math.sin(Math.max(0, -sheet.rotation.x)) * h;
      z = Math.max(z, aboutBoard.position.z + paper.position.z + Math.max(0.17, 0.12 + tipped));
    });
    // The holder's half depth and a little air
    return z + 0.1;
  };
  const boardPinGlints = [];
  // Spare push pins left stuck in the cork
  [[-3.0, -1.55, "#00e0c6"], [0.6, 1.45, "#ffdd00"], [3.02, 0.25, "#ff6b6b"], [-0.6, 1.55, "#7fb2ff"]].forEach(([x, y, color], i) => {
    const spare = mesh(pinGeo, toon(color), { outline: 0.012 });
    spare.position.set(x, y, 0.13);
    spare.scale.setScalar(0.85);
    const glint = new THREE.Mesh(track(new THREE.SphereGeometry(0.018, 8, 6)), track(new THREE.MeshBasicMaterial({ color: "#fff", transparent: true, opacity: 0.35 })));
    glint.position.set(-0.022, 0.023, 0.044);
    glint.raycast = noRaycast;
    spare.add(glint);
    boardPinGlints.push(glint);
    const stem = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.08, 8), toon("#9ca3af"), { outline: 0, cast: false });
    stem.rotation.set(Math.PI / 2 + (i % 2 ? 0.4 : -0.3), 0, 0.3);
    stem.position.set(x, y, 0.1);
    aboutBoard.add(stem, spare);
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
    // Drag takes over the sheet and shadow, while its pin is pulled out separately.
    gsap.killTweensOf([note.sheet.rotation, note.shadow.material, note.highlight.scale]);
    note.sheet.rotation.set(0, 0, 0);
    note.shadow.material.opacity = 0.32;
    note.highlight.scale.setScalar(1);
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
      if (noteDrag || (on && gsap.isTweening(note.pin.position))) return;
      renderer.domElement.style.cursor = on ? "grab" : "default";
      gsap.to(note.sheet.rotation, { x: on ? -0.24 : 0, z: on ? 0.035 : 0, duration: on ? 0.3 : 0.5, ease: on ? "back.out(1.6)" : "power2.out", overwrite: true });
      gsap.to(note.shadow.scale, { x: on ? 1.08 : 1, y: on ? 1.08 : 1, duration: 0.3, overwrite: true });
      gsap.to(note.shadow.material, { opacity: on ? 0.22 : 0.32, duration: 0.3, overwrite: true });
      gsap.to(note.highlight.scale, { x: on ? 1.5 : 1, y: on ? 1.5 : 1, duration: 0.25, overwrite: true });
    },
  }));
  let boardIntroduced = false;
  register(aboutBoard, {
    focus: "about",
    // The pins glint; each paper answers only its own hover, so the cork leaves them alone
    onHover: (on) => boardPinGlints.forEach((glint) => gsap.to(glint.material, { opacity: on ? 1 : 0.35, duration: 0.3, overwrite: true })),
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

  // ---------- keyboard: a 75% board after the NuPhy Halo75 ----------
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
  // A black aluminium case on a smoky see-through bottom, with the Halo's light bar glowing along
  // its left end
  const KEY_UNIT = 0.28;
  const KEY_GAP = 0.034;
  const KEYS_W = 16 * KEY_UNIT;
  const KEYS_D = 6 * KEY_UNIT;
  const CASE_W = KEYS_W + 0.22;
  const CASE_D = KEYS_D + 0.24;
  const keyBottom = mesh(rbox(CASE_W, 0.12, CASE_D, 0.06), toon("#3a3d44"), { outline: 0.03 });
  keyBottom.position.y = 0.06;
  const keyBase = mesh(rbox(CASE_W - 0.02, 0.15, CASE_D - 0.02, 0.06), toon("#1b1c1f"), { outline: 0.03 });
  keyBase.position.y = 0.19;
  keyboard.add(keyBottom, keyBase);
  const haloMat = track(new THREE.MeshBasicMaterial({ color: "#38bdf8" }));
  const haloBar = new THREE.Mesh(track(new THREE.BoxGeometry(0.03, 0.012, KEY_UNIT * 1.6)), haloMat);
  haloBar.position.set(-CASE_W / 2 + 0.05, 0.27, -KEYS_D / 2 + KEY_UNIT * 0.9);
  haloBar.raycast = noRaycast;
  keyboard.add(haloBar);
  const KEY_Y = 0.34;
  const letters = (row) => row.split("").map((ch) => [`Key${ch}`, ch]);
  const fKeys = Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, `F${i + 1}`]);
  const KEY_ROWS = [
    [["Escape", "ESC"], ...fKeys, ["PrintScreen", "PRT"], ["Insert", "INS"], ["Delete", "DEL"]],
    [["Backquote", "`"], ...Array.from({ length: 10 }, (_, i) => [`Digit${(i + 1) % 10}`, String((i + 1) % 10)]), ["Minus", "-"], ["Equal", "="], ["Backspace", "BACKSPACE", 2], ["Home", "HOME"]],
    [["Tab", "TAB", 1.5], ...letters("QWERTYUIOP"), ["BracketLeft", "["], ["BracketRight", "]"], ["Backslash", "\\", 1.5], ["End", "END"]],
    [["CapsLock", "CAPS", 1.75], ...letters("ASDFGHJKL"), ["Semicolon", ";"], ["Quote", "'"], ["Enter", "ENTER", 2.25], ["PageUp", "PGUP"]],
    [["ShiftLeft", "SHIFT", 2.25], ...letters("ZXCVBNM"), ["Comma", ","], ["Period", "."], ["Slash", "/"], ["ShiftRight", "SHIFT", 1.75], ["ArrowUp", "↑"], ["PageDown", "PGDN"]],
    // Apple's bottom row: fn, control, option, command, the space bar, command, option
    [["Fn", "fn"], ["ControlLeft", "control"], ["AltLeft", "option"], ["MetaLeft", "command", 1.25], ["Space", "", 6.25], ["MetaRight", "command", 1.25], ["AltRight", "option", 1.25], ["ArrowLeft", "←"], ["ArrowDown", "↓"], ["ArrowRight", "→"]],
  ];
  // Apple prints each modifier's symbol over its name
  const MOD_SYMBOLS = { ControlLeft: "⌃", AltLeft: "⌥", AltRight: "⌥", MetaLeft: "⌘", MetaRight: "⌘" };
  // Pressed on their own, so they show even though they never type anything
  const MODIFIER_CODES = new Set(["ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"]);
  // Shortcut keys, their legends printed in colour: digits fly to the sections, T to the
  // terminal, C to the chat. They work from your own keyboard too.
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
  // The Halo75's colourway: near-black alphas, grey modifiers, a mint Esc, a coral Enter and a
  // yellow space bar
  const ACCENTS = { Escape: "#5ec4a2", Enter: "#f2603c", Space: "#f5c22b" };
  const ALPHA = /^(Key|Digit)|^(Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash|Backquote)$/;
  const keyColor = (code) => ACCENTS[code] || (ALPHA.test(code) ? "#2a2c31" : "#43464d");
  const keyInk = (code) => shortcutByCode.get(code)?.color || (ACCENTS[code] ? "#1a1714" : "#c3c6cc");
  // The shifted symbols printed above the digits and punctuation
  const SHIFTED = {
    Backquote: "~", Digit1: "!", Digit2: "@", Digit3: "#", Digit4: "$", Digit5: "%", Digit6: "^", Digit7: "&", Digit8: "*", Digit9: "(", Digit0: ")",
    Minus: "_", Equal: "+", BracketLeft: "{", BracketRight: "}", Backslash: "|", Semicolon: ":", Quote: "\"", Comma: "<", Period: ">", Slash: "?",
  };
  const keyMats = new Map();
  const keyMat = (color) => keyMats.get(color) || keyMats.set(color, toon(color)).get(color);
  const keyByCode = new Map();
  const legendMat = (map) => track(new THREE.MeshToonMaterial({
    map, gradientMap: gradient, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
  }));
  KEY_ROWS.forEach((row, r) => {
    let cursor = -8; // the rows are 16 units wide
    row.forEach(([code, label, width = 1]) => {
      const w = width * KEY_UNIT - KEY_GAP;
      const d = KEY_UNIT - KEY_GAP;
      const color = keyColor(code);
      const key = new THREE.Group();
      key.position.set((cursor + width / 2) * KEY_UNIT, KEY_Y, (r - 2.5) * KEY_UNIT);
      key.userData.code = code;
      // AO supplies the gaps between caps; the case supplies the keyboard's cast shadow.
      key.add(mesh(rbox(w, 0.18, d, 0.05), keyMat(color), { outline: 0.03, cast: false }));
      if (label) {
        const homing = code === "KeyF" || code === "KeyJ" ? "#38bdf8" : null;
        const legend = printed(w - 0.05, d - 0.05, 340, (c, cw, ch) => drawKeyLabel(c, cw, ch, label, null, { ink: keyInk(code), small: label.length > 1, shift: SHIFTED[code] || MOD_SYMBOLS[code], homing }));
        // Ink on the cap, not a sticker over it: a clear decal under the cap's own toon light
        legend.material = legendMat(legend.userData.tex.texture);
        legend.rotation.x = -Math.PI / 2;
        legend.position.y = 0.091;
        key.add(legend);
      }
      keyboard.add(key);
      keyByCode.set(code, key);
      cursor += width;
    });
  });

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
  let hoveredKey = null;
  function hoverKey(hit) {
    let key = hit?.object;
    while (key && !key.userData.code) key = key.parent;
    if (key === hoveredKey) return;
    if (hoveredKey) gsap.to(hoveredKey.position, { y: KEY_Y, duration: 0.18, overwrite: true });
    hoveredKey = key || null;
    if (hoveredKey) gsap.to(hoveredKey.position, { y: KEY_Y + 0.09, duration: 0.18, ease: "power2.out", overwrite: true });
  }
  register(keyboard, {
    focus: "keyboard", onClick: hitKey,
    onHover: (on) => { if (!on) hoverKey(null); },
    onPointer: hoverKey,
  });
  const onKeyDown = (e) => {
    responsiveUntil = performance.now() + 2000;
    // A modifier's own keydown already carries its flag (Cmd sets metaKey), so it's pressed
    // here, before combinations are ignored below
    if (MODIFIER_CODES.has(e.code)) {
      if (!e.repeat) pressKey(e.code);
      return;
    }
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
  // The Konami code, typed anywhere: the shelf throws a party
  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let konamiAt = 0;
  const onKonami = (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    konamiAt = key === KONAMI[konamiAt] ? konamiAt + 1 : key === KONAMI[0] ? 1 : 0;
    if (konamiAt < KONAMI.length) return;
    konamiAt = 0;
    discover("konami");
    ledPartyUntil = performance.now() + 5000;
    shelf.getWorldPosition(shelfBubbleAt);
    burst(shelfBubbleAt.x, FLOOR_Y + 6, shelfBubbleAt.z + 0.8);
    burst(0, 1.2, 0.5);
    sfx.groove();
    sfx.meow({ delay: 0.4 });
    gsap.fromTo(neonOn.material, { opacity: 0 }, { opacity: 1, duration: 0.12, repeat: 9, yoyo: true, onComplete: () => (neonOn.material.opacity = darkNow ? 1 : 0) });
  };
  window.addEventListener("keydown", onKonami);

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
    gsap.killTweensOf(mouse.rotation);
    discover("rat");
    critter.forEach((part, i) => gsap.to(part.scale, { ...part.userData.scale, duration: 0.3, delay: i * 0.04, ease: "back.out(3)" }));
    sfx.squeak();
    catSpotsMouse();
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
    onHover: (on) => {
      if (mouseRunning) return;
      gsap.to(mouse.rotation, { y: on ? -0.28 : -0.12, duration: 0.25, ease: "power2.out", overwrite: true });
      gsap.to(wheel.rotation, { x: on ? -0.65 : 0, duration: 0.3, overwrite: true });
    },
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
  // Hover works like a wallet's card stack: the selected pass peeks forward and sideways;
  // every pass over it slides back to open a gap, so its face reads clearly.
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
      const goalZ = i === hoveredIndex ? 0.24 : hoveredIndex >= 0 && i < hoveredIndex ? -TICKET_REVEAL : 0;
      const goalX = i === hoveredIndex ? 0.12 : 0;
      // A hair of lift for the hovered one, well under the 0.024 gap between layers
      const goalY = i === hoveredIndex ? 0.01 : 0;
      const p = entry.flipper.position;
      entry.vx = (entry.vx || 0) + (SPRING * (goalX - p.x) - DAMPING * (entry.vx || 0)) * dt;
      p.x += entry.vx * dt;
      entry.vz = (entry.vz || 0) + (SPRING * (goalZ - p.z) - DAMPING * (entry.vz || 0)) * dt;
      entry.vy = (entry.vy || 0) + (SPRING * (goalY - p.y) - DAMPING * (entry.vy || 0)) * dt;
      p.z += entry.vz * dt;
      p.y += entry.vy * dt;
    });
  }
  function holdTicket(entry) {
    if (heldTicket === entry) return;
    Object.assign(entry, { vx: 0, vz: 0, vy: 0, hoverTarget: 0 });
    gsap.to(entry.flipper.position, { x: 0, y: 0, z: 0, duration: 0.3, ease: "power2.out" });
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

  // ---------- Oyen, the cat ----------
  // A ginger cat curled up asleep: on the rug just under the desk's front edge by day, and at night up on the desk in the warm
  // pool of the lamp (she jumps across when the room switches). Click her and she wakes for a
  // moment (a meow and a word in a bubble); every third time she gets up and walks right
  // across the keyboard instead, typing nonsense into the terminal on the way.
  const fur = toon("#ff9f45");
  const furDark = toon("#d9741f");
  const furLight = toon("#fffdf5");
  // In the desk's shade (the floor, the rug, the chair) her toon colours sink to flat darks and
  // her stripes and white bits vanish; there her fur gives off a little of its own colour, so
  // she reads as well as she does under the lamp. Out of the shade it fades back off.
  const FUR_MATS = [fur, furDark, furLight];
  // a soft brushed texture over her orange coat and stripes
  const furTex = canvasTexture(128, 128);
  track(furTex.texture);
  drawFur(furTex.ctx, 128, 128);
  furTex.texture.wrapS = furTex.texture.wrapT = THREE.RepeatWrapping;
  furTex.texture.repeat.set(3, 2);
  [fur, furDark].forEach((mat) => (mat.map = furTex.texture));
  FUR_MATS.forEach((mat) => mat.emissive.copy(mat.color));
  function catShade(inShade, duration = 0.6) {
    FUR_MATS.forEach((mat) => gsap.to(mat, { emissiveIntensity: inShade ? 0.38 : 0, duration, overwrite: true }));
  }
  const catInk = toon("#1a1714");
  const cat = new THREE.Group();
  cat.scale.setScalar(0.85);
  const catBody = new THREE.Group();
  cat.add(catBody);
  const belly = mesh(new THREE.SphereGeometry(1, 24, 16), fur, { outline: 0.03 });
  belly.scale.set(1.15, 0.55, 0.85);
  belly.position.y = 0.55;
  catBody.add(belly);
  // Tabby stripes over the back, painted onto the same sphere as her body (just proud of it):
  // each one widest along her spine and tapering to a point down her side, with a slight wave
  // and a lean back toward her tail, like a real tabby's markings
  function tabbyStripe(x, width, reach, seed) {
    const steps = 32;
    const positions = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const phi = (t - 0.5) * reach; // round from the top of her back
      const taper = Math.sin(Math.PI * t) ** 0.6;
      const centre = Math.acos(THREE.MathUtils.clamp(x, -1, 1)) + Math.abs(phi) * 0.12 + Math.sin(phi * 3 + seed) * 0.035;
      [-1, 1].forEach((edge) => {
        const theta = centre + edge * width * taper * (0.85 + 0.15 * Math.sin(phi * 5 + seed * 2));
        positions.push(1.012 * Math.cos(theta), 1.012 * Math.cos(phi) * Math.sin(theta), 1.012 * Math.sin(phi) * Math.sin(theta));
      });
    }
    const index = [];
    for (let i = 0; i < steps; i++) {
      const a = i * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(index);
    geo.computeVertexNormals();
    const stripe = mesh(geo, furDark, { outline: 0, cast: false });
    stripe.material.side = THREE.DoubleSide;
    return stripe;
  }
  [[-0.62, 0.07, 2.0, 1], [-0.3, 0.085, 2.3, 2], [0.02, 0.075, 2.1, 3], [0.33, 0.06, 1.8, 4]].forEach(([x, width, reach, seed]) => belly.add(tabbyStripe(x, width, reach, seed)));
  // her white chest: shown when she's up, tucked away (hidden) when she's curled asleep, where
  // it only showed as a white patch at her neck
  const catChest = at(mesh(new THREE.SphereGeometry(0.42, 16, 12), furLight, { outline: 0.015 }), 0.85, 0.55, 0.15);
  catChest.visible = false;
  catBody.add(catChest);
  // Legs, shown only when she stands; paws tucked in front when she's curled
  const catLegs = [[0.62, 0.32], [0.62, -0.32], [-0.62, 0.32], [-0.62, -0.32]].map(([x, z]) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.62, z);
    leg.add(at(mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.62, 12), fur, { outline: 0.015 }), 0, -0.31, 0));
    leg.add(at(mesh(new THREE.SphereGeometry(0.14, 12, 8), furLight, { outline: 0.012 }), 0, -0.6, 0.02));
    leg.visible = false;
    cat.add(leg);
    return leg;
  });
  // Haunches: the rounded thighs a sitting cat sits on, shown only when she's sat up
  const haunches = [0.36, -0.36].map((z) => {
    const thigh = mesh(new THREE.SphereGeometry(1, 16, 12), fur, { outline: 0.014 });
    thigh.scale.set(0.48, 0.4, 0.3);
    thigh.position.set(-0.3, 0.36, z);
    thigh.visible = false;
    cat.add(thigh);
    return thigh;
  });
  const paws = new THREE.Group();
  paws.add(
    at(mesh(new THREE.SphereGeometry(0.16, 12, 8), furLight, { outline: 0.012 }), 1.05, 0.14, 0.62),
    at(mesh(new THREE.SphereGeometry(0.16, 12, 8), furLight, { outline: 0.012 }), 1.32, 0.14, 0.36),
  );
  cat.add(paws);
  // Head: ears, a white muzzle, a pink nose, and eyes shut (lines) or open (dots)
  const catHead = new THREE.Group();
  cat.add(catHead);
  const skull = mesh(new THREE.SphereGeometry(0.5, 20, 14), fur, { outline: 0.02 });
  skull.scale.y = 0.88;
  catHead.add(skull);
  const catEars = [];
  [-1, 1].forEach((side) => {
    const ear = mesh(new THREE.ConeGeometry(0.17, 0.34, 12), fur, { outline: 0.012 });
    catEars.push(ear);
    ear.position.set(side * 0.27, 0.42, -0.02);
    ear.rotation.z = -side * 0.3;
    const inner = mesh(new THREE.ConeGeometry(0.09, 0.2, 10), toon("#ff90b0"), { outline: 0, cast: false });
    inner.position.set(0, -0.04, 0.06);
    ear.add(inner);
    catHead.add(ear);
  });
  const muzzle = mesh(new THREE.SphereGeometry(0.22, 14, 10), furLight, { outline: 0.01 });
  muzzle.scale.set(1.25, 0.8, 0.8);
  muzzle.position.set(0, -0.14, 0.38);
  catHead.add(muzzle, at(mesh(new THREE.SphereGeometry(0.055, 10, 8), toon("#ff6b8a"), { outline: 0.006 }), 0, -0.06, 0.52));
  const eyesShut = [-1, 1].map((side) => at(mesh(rbox(0.16, 0.035, 0.03, 0.012), catInk, { outline: 0, cast: false }), side * 0.18, 0.06, 0.44, side * 0.22));
  const eyesOpen = [-1, 1].map((side) => {
    const eye = at(mesh(new THREE.SphereGeometry(0.07, 12, 8), catInk, { outline: 0, cast: false }), side * 0.18, 0.07, 0.43);
    eye.visible = false;
    return eye;
  });
  catHead.add(...eyesShut, ...eyesOpen);
  // her mouth, only there when she yawns
  // (out in front of the muzzle, which would hide it otherwise), and a pink tongue for washing
  const catMouth = mesh(new THREE.SphereGeometry(0.09, 12, 8), toon("#9d174d"), { outline: 0.008, cast: false });
  catMouth.position.set(0, -0.27, 0.53);
  catMouth.scale.set(0.001, 0.001, 0.001);
  const catTongue = mesh(new THREE.SphereGeometry(0.06, 10, 8), toon("#ff7aa8"), { outline: 0.006, cast: false });
  catTongue.position.set(0, -0.31, 0.58);
  catTongue.scale.set(0.001, 0.001, 0.001);
  catHead.add(catMouth, catTongue);
  // whiskers fanning out from the muzzle, and a blue collar with a little gold bell
  const whiskerMat = toon("#1a1714");
  [-1, 1].forEach((side) => [-0.14, 0, 0.14].forEach((tilt) => {
    const whisker = mesh(new THREE.BoxGeometry(0.34, 0.012, 0.012), whiskerMat, { outline: 0, cast: false });
    whisker.position.set(side * 0.36, -0.15, 0.4);
    whisker.rotation.set(0, side * -0.35, side * tilt);
    catHead.add(whisker);
  }));
  const collar = mesh(new THREE.TorusGeometry(0.33, 0.05, 8, 24), toon("#3b82f6"), { outline: 0.01, cast: false });
  collar.rotation.x = Math.PI / 2;
  collar.position.y = -0.36;
  const bell = mesh(new THREE.SphereGeometry(0.075, 12, 10), toon("#ffd34d"), { outline: 0.01, cast: false });
  bell.position.set(0, -0.44, 0.32);
  catHead.add(collar, bell);
  const catNeck = mesh(new THREE.SphereGeometry(1, 16, 12), fur, { outline: 0 });
  cat.add(catNeck);
  const neckBase = new THREE.Vector3();
  const neckTop = new THREE.Vector3();
  const neckDirection = new THREE.Vector3();
  function updateCatNeck() {
    catNeck.visible = catChest.visible;
    if (!catNeck.visible) return;
    catBody.localToWorld(neckBase.set(0.72, 0.78, 0));
    catHead.localToWorld(neckTop.set(0, -0.24, -0.1));
    catNeck.parent.worldToLocal(neckBase);
    catNeck.parent.worldToLocal(neckTop);
    neckDirection.subVectors(neckTop, neckBase);
    const length = neckDirection.length();
    catNeck.position.copy(neckBase).add(neckTop).multiplyScalar(0.5);
    catNeck.scale.set(0.27, length / 2 + 0.18, 0.27);
    if (length > 0.0001) catNeck.quaternion.setFromUnitVectors(UP, neckDirection.divideScalar(length));
  }
  // Tail: wrapped round her front when curled, held up in a hook when she walks
  const tailTube = (points, radius) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))), 32, radius, 10), fur, { outline: 0.015 });
  const tailCurl = new THREE.Group();
  tailCurl.add(tailTube([[-1.05, 0.35, -0.2], [-1.2, 0.25, 0.4], [-0.6, 0.2, 0.95], [0.3, 0.18, 1.0], [0.85, 0.2, 0.85]], 0.13));
  tailCurl.add(at(mesh(new THREE.SphereGeometry(0.14, 12, 8), furDark, { outline: 0.012 }), 0.88, 0.2, 0.84));
  const tailUp = new THREE.Group();
  tailUp.add(tailTube([[-1.0, 0.75, 0], [-1.35, 1.2, 0], [-1.4, 1.75, 0], [-1.2, 2.05, 0]], 0.12));
  tailUp.add(at(mesh(new THREE.SphereGeometry(0.13, 12, 8), furDark, { outline: 0.012 }), -1.2, 2.05, 0));
  tailUp.visible = false;
  cat.add(tailCurl, tailUp);
  const HEAD_CURLED = new THREE.Vector3(1.0, 0.55, 0.42);
  const HEAD_UP = new THREE.Vector3(1.25, 1.55, 0);
  // Awake but still lying down (a loaf): head up and out in front of her body over her white
  // chest, rather than lifted straight up onto her back
  const HEAD_LOAF = new THREE.Vector3(1.2, 0.95, 0.3);
  catHead.position.copy(HEAD_CURLED);
  catHead.rotation.set(0.15, 0.35, 0.1);

  // Everything she's made of, in one group at her origin: the snap crumbles this, so it comes
  // back to the right place wherever she happens to be lying
  const catModel = new THREE.Group();
  catModel.add(...cat.children);
  cat.add(catModel);

  // Curled (asleep) or standing: what shows, where the body and head go
  // `overwrite`: "auto" inside one of her routines, so it doesn't cancel the moves queued after it
  function catPose(standing, duration = 0.3, overwrite = true) {
    catLegs.forEach((leg) => (leg.visible = standing));
    catChest.visible = standing;
    paws.visible = !standing;
    tailCurl.visible = !standing;
    tailUp.visible = standing;
    gsap.to(catBody.position, { y: standing ? 0.5 : 0, duration, ease: "power2.out", overwrite });
    gsap.to(catBody.scale, { y: standing ? 0.85 : 1, duration, ease: "power2.out", overwrite });
    gsap.to(catHead.position, { ...(standing ? HEAD_UP : HEAD_CURLED), duration, ease: "power2.out", overwrite });
    gsap.to(catHead.rotation, { x: standing ? 0 : 0.15, y: standing ? 0.6 : 0.35, z: standing ? 0 : 0.1, duration, overwrite });
    catEyes(standing);
  }
  function catEyes(open) {
    eyesShut.forEach((e) => (e.visible = !open));
    eyesOpen.forEach((e) => (e.visible = open));
  }

  // Her two beds: the rug under the desk, and the desk by the lamp. Both stay in view on wide
  // and tall screens alike. From under the desk she steps out in front of it (`via`) before
  // jumping, so she never passes through the top.
  const CAT_BEDS = {
    floor: { parent: scene, position: new THREE.Vector3(1.4, FLOOR_Y + 0.08, 0.3), yaw: 0.25, via: new THREE.Vector3(1.8, FLOOR_Y + 0.08, 5.4) },
    desk: { parent: scene, position: new THREE.Vector3(-3.85, 0, -0.55), yaw: 0.45 },
    // curled on the gaming chair's seat, on the side that shows past its back (she turns with
    // the chair when it spins)
    chair: { parent: chairTop, position: new THREE.Vector3(1.3, -1.77, -0.7), yaw: -1.25 },
    // further along under the desk, toward the dumbbells, clear of the desk's right leg
    rug: { parent: scene, position: new THREE.Vector3(3.7, FLOOR_Y + 0.08, 0.7), yaw: -0.4, via: new THREE.Vector3(3.9, FLOOR_Y + 0.08, 5.4) },
  };
  const bedFor = (night) => CAT_BEDS[night ? "desk" : "floor"];
  let catBed = bedFor(dark);
  catShade(catBed !== CAT_BEDS.desk, 0);
  catBed.parent.add(cat);
  cat.position.copy(catBed.position);
  cat.rotation.y = catBed.yaw;
  let catBusy = false;
  // The timeline carrying her from one place to another, and the timer that ends a fidget in
  // place (spotting the mouse, a click): both cut short when the case files need the desk
  let catTravel = null;
  let catFidget = null;
  const worldYaw = (object) => {
    const q = new THREE.Quaternion();
    object.getWorldQuaternion(q);
    return new THREE.Euler().setFromQuaternion(q, "YXZ").y;
  };

  // A hop to a world point: up on her legs, a squash, an arc through the air, a squash on landing
  function catHop(tl, to, yaw, peak = 2.2) {
    const from = new THREE.Vector3();
    const hop = { p: 0 };
    tl.call(() => {
      cat.getWorldPosition(from);
      const yawNow = worldYaw(cat);
      scene.attach(cat);
      cat.rotation.set(0, yawNow, 0);
      sfx.whoosh({ duration: 0.35 });
    })
      .to(cat.scale, { y: 0.85 * 0.8, duration: 0.15, ease: "power2.in" })
      .to(cat.rotation, { y: yaw, duration: 0.25, ease: "power2.out" }, "<")
      .to(hop, {
        p: 1,
        duration: 0.7,
        ease: "none",
        onStart: () => gsap.to(cat.scale, { y: 0.85, duration: 0.2 }),
        onUpdate: () => {
          cat.position.lerpVectors(from, to, hop.p);
          // Higher for a bigger climb, so she clears the desk's edge
          cat.position.y += Math.sin(hop.p * Math.PI) * (peak + Math.abs(to.y - from.y) * 0.5);
        },
      })
      .to(cat.scale, { y: 0.85 * 0.82, duration: 0.1, ease: "power2.out" })
      .call(() => sfx.catLand({ strength: 0.35 }))
      .to(cat.scale, { y: 0.85, duration: 0.35, ease: "elastic.out(1.2, 0.4)" });
  }
  // Out from under the desk first, when that's where she is
  function catLeave(tl) {
    if (catBed.via) catHop(tl, catBed.via, 0.6, 0.3);
  }
  // Settle into a bed: hop there (by way of the front of the desk for the floor), turn round
  // once and curl up
  function catToBed(tl, bed) {
    const target = bed.parent.localToWorld(bed.position.clone());
    if (bed.via) {
      catHop(tl, bed.via, worldYaw(bed.parent) + bed.yaw);
      catHop(tl, target, worldYaw(bed.parent) + bed.yaw, 0.3);
    } else catHop(tl, target, worldYaw(bed.parent) + bed.yaw);
    tl.to(cat.rotation, { y: `+=${Math.PI * 2}`, duration: 0.6, ease: "power1.inOut" })
      .call(() => {
        catPose(false, 0.4);
        bed.parent.attach(cat);
        cat.position.copy(bed.position);
        cat.rotation.set(0, bed.yaw, 0);
        catBed = bed;
        catShade(bed !== CAT_BEDS.desk);
      });
  }
  // Where she belongs right now: the desk at night, unless the case files are open on it (then
  // she's shooed back under the desk until they're put away)
  function catSettle() {
    const shooed = darkNow && !!openFolder;
    const bed = bedFor(darkNow && !shooed);
    if (bed === catBed) return;
    const go = () => {
      catInterrupt();
      if (catBusy) return timers.push(setTimeout(go, 300));
      if (bedFor(darkNow && !openFolder) !== bed || bed === catBed) return;
      catBusy = true;
      const tl = gsap.timeline({ delay: shooed ? 0 : 0.6, onComplete: () => (catBusy = false, catTravel = null) });
      catTravel = tl;
      tl.call(() => {
        catPose(true);
        sfx.meow({ short: true });
        if (shooed) catSay("hmph!");
      });
      tl.to({}, { duration: 0.4 });
      catLeave(tl);
      catToBed(tl, bed);
    };
    go();
  }
  // Off the desk before a case file comes out, whatever she's doing: a move or a fidget is cut
  // short, she jumps down to the rug under the desk, and `then` runs as she leaves the desk.
  // Already off it and staying off, `then` runs straight away.
  function catShoo(then) {
    if (!catTravel && catBed !== CAT_BEDS.desk) return then();
    catInterrupt();
    catTravel?.kill();
    clearTimeout(catFidget);
    gsap.killTweensOf([cat.position, cat.rotation, cat.scale, catHead.position, catHead.rotation, catBody.position, tailCurl.rotation]);
    catLegs.forEach((leg) => (leg.rotation.z = 0));
    catWatchUntil = 0;
    catBusy = true;
    const tl = gsap.timeline({ onComplete: () => (catBusy = false, catTravel = null) });
    catTravel = tl;
    tl.call(() => {
      catPose(true, 0.2);
      gsap.to(cat.scale, { y: 0.85, duration: 0.2 });
      sfx.meow({ short: true });
      catSay("hmph!");
    });
    tl.to({}, { duration: 0.3 });
    // the file starts out of the drawer as she springs, and lands once she's clear
    tl.call(then, null, tl.duration() + 0.15);
    catToBed(tl, CAT_BEDS.floor);
  }

  // The mouse on the desk turns into a real one and runs: she wakes with a start, follows it
  // round with her head, tail lashing, and settles back down once it's a mouse again
  let catWatchUntil = 0;
  // What she's watching: the mouse by default; the pointer, the window or the butterfly when
  // she's up between naps
  let catWatchAt = (out) => mouse.getWorldPosition(out);
  const catLook = new THREE.Vector3();
  function catSpotsMouse() {
    catInterrupt();
    if (catBusy) return;
    catBusy = true;
    catEyes(true);
    catSay("!");
    sfx.meow({ short: true, delay: 0.2 });
    catWatchAt = (out) => mouse.getWorldPosition(out);
    catWatchUntil = performance.now() + 4300;
    // Up off her paws into an alert loaf: head raised, level and forward over her chest, chest
    // lifted a little
    catChest.visible = true;
    gsap.to(catHead.position, { ...HEAD_LOAF, duration: 0.35, ease: "power2.out", overwrite: true });
    gsap.to(catHead.rotation, { x: 0, z: 0, duration: 0.35, ease: "power2.out", overwrite: true });
    gsap.to(catBody.position, { y: 0.08, duration: 0.35, ease: "power2.out", overwrite: true });
    gsap.fromTo(tailCurl.rotation, { y: -0.12 }, { y: 0.12, duration: 0.3, yoyo: true, repeat: 13, ease: "sine.inOut", onComplete: () => (tailCurl.rotation.y = 0) });
    timers.push(catFidget = setTimeout(() => {
      // ...and settles back down onto her paws, chin over her chest again
      gsap.to(catHead.position, { ...HEAD_CURLED, duration: 0.7, ease: "power2.inOut", onComplete: () => (catChest.visible = false) });
      gsap.to(catHead.rotation, { x: 0.15, y: 0.35, z: 0.1, duration: 0.7, ease: "power2.inOut" });
      gsap.to(catBody.position, { y: 0, duration: 0.7, ease: "power2.inOut" });
      catEyes(false);
      catBusy = false;
    }, 4600));
  }
  // While she's watching, her head turns after the mouse and tips up toward it, easing along
  // and never further than a cat would comfortably turn without moving the rest of her
  const HEAD_REST_YAW = 0.35;
  catHead.rotation.order = "YXZ"; // turn, then tip: no sideways roll when she looks up
  function updateCatWatch(now) {
    if (now > catWatchUntil - 300) return;
    cat.worldToLocal(catWatchAt(catLook));
    const dx = catLook.x - catHead.position.x;
    const dy = catLook.y - catHead.position.y;
    const dz = catLook.z - catHead.position.z;
    const yaw = THREE.MathUtils.clamp(Math.atan2(dx, dz), HEAD_REST_YAW - 0.7, HEAD_REST_YAW + 0.7);
    const pitch = THREE.MathUtils.clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.2, 0.55);
    catHead.rotation.y += (yaw - catHead.rotation.y) * 0.07;
    catHead.rotation.x += (-pitch - catHead.rotation.x) * 0.07;
  }

  // ---------- her day: naps, and what she gets up to between them ----------
  // Asleep she breathes, flicks her tail now and then and twitches an ear. Every so often she
  // wakes: a yawn and a long stretch, then one thing (a wash, watching your pointer, looking
  // out of the window, swatting at the butterfly if it's about, or moving to another spot)
  // and back to sleep. Naps are short, 6–12 s. A click wakes her whatever she's doing.
  let catIdleTl = null;
  const catLife = { wakeAt: performance.now() + 6000 + Math.random() * 6000, twitchAt: 0 };
  const napLength = () => 6000 + Math.random() * 6000;
  const catRay = new THREE.Raycaster();
  const catHeadAt = new THREE.Vector3();
  // the pointer, as a point in the room at her head's distance from the camera
  const pointerPoint = (out) => {
    catRay.setFromCamera(ndc, camera);
    catHead.getWorldPosition(catHeadAt);
    return out.copy(catRay.ray.origin).addScaledVector(catRay.ray.direction, catHeadAt.distanceTo(camera.position));
  };
  const windowPoint = (out) => windowGroup.getWorldPosition(out);
  const butterflyPoint = (out) => butterfly.getWorldPosition(out);
  // Stop whatever she's up to between naps and lie straight back down
  function catInterrupt() {
    if (!catIdleTl) return;
    catIdleTl.kill();
    catIdleTl = null;
    catWatchUntil = 0;
    gsap.killTweensOf([catModel.rotation, paws.children[0].position, tailCurl.rotation, tailUp.rotation, cat.rotation, catBody.rotation, catBody.scale, catMouth.scale, catTongue.scale]);
    catLegs.forEach((leg) => {
      gsap.killTweensOf([leg.rotation, leg.scale, leg.position]);
      resetLeg(leg);
    });
    catBody.rotation.z = 0;
    catModel.rotation.x = 0;
    catMouth.scale.setScalar(0.001);
    catTongue.scale.setScalar(0.001);
    catBody.scale.x = 1;
    haunches.forEach((thigh) => (thigh.visible = false));
    gsap.killTweensOf([tailCurl.position, tailCurl.scale]);
    tailCurl.position.set(0, 0, 0);
    tailCurl.scale.set(1, 1, 1);
    tailUp.rotation.set(0, 0, 0);
    gsap.killTweensOf(tailUp.position);
    tailUp.position.set(0, 0, 0);
    cat.rotation.y = catBed.yaw;
    catModel.rotation.z = 0;
    cat.position.copy(catBed.position);
    paws.children[0].position.set(1.05, 0.14, 0.62);
    tailCurl.rotation.y = 0;
    gsap.to(catBody.position, { y: 0, duration: 0.2 });
    catPose(false, 0.2);
    catLife.wakeAt = performance.now() + napLength();
  }
  // Watching something: her head follows it (see updateCatWatch) and her tail sways;
  // `tail`: the curled tail when she's sat, the raised one when she's standing
  function catWatch(tl, at, seconds, tail = tailCurl) {
    tl.call(() => {
      catWatchAt = at;
      catWatchUntil = performance.now() + seconds * 1000 + 300;
    })
      .to(tail.rotation, { y: 0.12, duration: 0.45, yoyo: true, repeat: Math.round(seconds / 0.45) - 1, ease: "sine.inOut" })
      .set(tail.rotation, { y: 0 });
  }
  // A yawn: eyes screwed shut, head up over her chest and tipped back, mouth wide, then a
  // little shake of the head (the stretch that follows stands her up from there)
  function catYawn(tl) {
    tl.call(() => {
      catEyes(false);
      catChest.visible = true;
    })
      .to(catHead.rotation, { x: -0.5, duration: 0.45, ease: "sine.out" })
      .to(catHead.position, { x: HEAD_LOAF.x, y: HEAD_LOAF.y - 0.05, z: HEAD_LOAF.z, duration: 0.45, ease: "sine.out" }, "<")
      .to(catMouth.scale, { x: 1.3, y: 1.7, z: 0.7, duration: 0.35, ease: "back.out(2)" }, "<0.1")
      .to(catTongue.scale, { x: 1, y: 0.7, z: 0.8, duration: 0.35, ease: "back.out(2)" }, "<")
      .to([catMouth.scale, catTongue.scale], { x: 0.001, y: 0.001, z: 0.001, duration: 0.2, ease: "power2.in" }, "+=0.7")
      .to(catHead.rotation, { x: 0.05, duration: 0.3, ease: "sine.inOut" }, "<")
      .call(() => catEyes(true))
      .to(catHead.rotation, { z: 0.12, duration: 0.07, yoyo: true, repeat: 3, ease: "sine.inOut" })
      .set(catHead.rotation, { z: 0 });
  }
  // Where a point on her body is, in her own space, for a given pose of the body: the belly's
  // local point, scaled (catBody.scale), turned (catBody.rotation.z) and lifted
  // (catBody.position.y). Her legs hang from these, so they always join her body.
  const bodyPoint = (lx, ly, lz, { rz = 0, py = 0.5, sx = 1, sy = 0.85 } = {}) => {
    const x = lx * sx;
    const y = ly * sy;
    return new THREE.Vector3(x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz) + py, lz);
  };
  // shoulder and hip, inside the belly (its ellipsoid is 1.15 × 0.55 × 0.85 about (0, 0.55))
  const SHOULDER = [0.75, 0.3];
  const HIP = [-0.75, 0.3];
  // A paw's centre sits its own radius up, so the paw rests on the ground instead of in it
  const PAW_Y = 0.14;
  const STAND_POSE = { rz: 0, py: 0.5, sx: 1, sy: 0.85 };
  const STRETCH_POSE = { rz: -0.45, py: 0.42, sx: 1, sy: 0.85 };
  // Every leg from its shoulder or hip on the body as it is posed, to its paw on the ground
  // (front paws `reach` further forward)
  function legsOnBody(pose, reach = 0) {
    [[frontL, 1, SHOULDER], [frontR, -1, SHOULDER], [rearL, 1, HIP], [rearR, -1, HIP]].forEach(([leg, side, [lx, ly]]) => {
      const root = bodyPoint(lx, ly, side * 0.32, pose);
      const front = lx > 0;
      aimLeg(leg, root, new THREE.Vector3(root.x + (front ? reach : 0), PAW_Y, side * 0.32));
    });
  }
  // The big stretch: front legs reaching out ahead, chest right down, rear end up in the air
  // on straightened back legs, held, and back to level with a shiver. One tween drives the
  // body's tilt and re-hangs every leg from it each frame.
  const [frontL, frontR, rearL, rearR] = catLegs;
  function catStretch(tl) {
    const k = { t: 0 };
    const pose = { ...STAND_POSE };
    const lerp = (a, b, t) => a + (b - a) * t;
    const apply = () => {
      pose.rz = lerp(STAND_POSE.rz, STRETCH_POSE.rz, k.t);
      pose.py = lerp(STAND_POSE.py, STRETCH_POSE.py, k.t);
      catBody.rotation.z = pose.rz;
      catBody.position.y = pose.py;
      legsOnBody(pose, 0.75 * k.t);
    };
    tl.call(() => catPose(true, 0.3, "auto"))
      .to({}, { duration: 0.35 })
      .call(() => {
        k.t = 0;
        apply();
      })
      .to(k, { t: 1, duration: 0.8, ease: "sine.inOut", onUpdate: apply }, "stretch")
      .to(catHead.position, { x: 1.25, y: 1.0, duration: 0.8, ease: "sine.inOut" }, "stretch")
      .to(catHead.rotation, { x: -0.2, duration: 0.8, ease: "sine.inOut" }, "stretch")
      // the tail rides up with her rear end (it hangs from her origin, so it's moved, not
      // turned: turning it there would swing its root away from her body)
      .to(tailUp.position, { x: 0.2, y: 0.6, duration: 0.8, ease: "sine.inOut" }, "stretch")
      // held a moment, then back up level
      .to(k, { t: 0, duration: 0.6, ease: "sine.inOut", onUpdate: apply }, "stretch+=1.4")
      .to(catHead.position, { ...HEAD_UP, duration: 0.6, ease: "sine.inOut" }, "stretch+=1.4")
      .to(catHead.rotation, { x: 0, duration: 0.6, ease: "sine.inOut" }, "stretch+=1.4")
      .to(tailUp.position, { x: 0, y: 0, duration: 0.6, ease: "sine.inOut" }, "stretch+=1.4")
      .to(catModel.rotation, { x: 0.05, duration: 0.05, yoyo: true, repeat: 5, ease: "sine.inOut" })
      .set(catModel.rotation, { x: 0 });
  }
  // Sat up properly: the body tipped right up and drawn in (a pear, not a loaf), haunches on
  // the ground, head on the top of the body (overlapping it, for a neck), tail from her hip
  // round her feet. Her front legs are aimed rather than turned: each runs from a shoulder
  // inside her chest to wherever its paw should be, stretched to fit, the paw kept round.
  // (Worked out on the sat body: chest centre (-0.43, 0.74), tipped 0.9; the shoulders below
  // sit inside it, and every paw target sits outside her head, in front of her muzzle.)
  const SIT_HEAD = new THREE.Vector3(0.18, 1.78, 0);
  const LEG_DOWN = new THREE.Vector3(0, -1, 0);
  const LEG_LEN = 0.6;
  const legAim = new THREE.Vector3();
  function aimLeg(leg, shoulder, paw) {
    leg.position.copy(shoulder);
    legAim.subVectors(paw, shoulder);
    const len = Math.max(0.2, legAim.length());
    leg.quaternion.setFromUnitVectors(LEG_DOWN, legAim.normalize());
    leg.scale.set(1, len / LEG_LEN, 1);
    leg.children[1].scale.set(1, LEG_LEN / len, 1);
    leg.userData.shoulder = shoulder.clone();
    leg.userData.paw = paw.clone();
  }
  // standing, as built: straight down from the hip/shoulder
  const legRest = (leg) => {
    const side = leg === frontL || leg === rearL ? 1 : -1;
    const [lx, ly] = leg === frontL || leg === frontR ? SHOULDER : HIP;
    const root = bodyPoint(lx, ly, side * 0.32, STAND_POSE);
    return { shoulder: root, paw: new THREE.Vector3(root.x, PAW_Y, side * 0.32) };
  };
  function resetLeg(leg) {
    const { shoulder, paw } = legRest(leg);
    gsap.killTweensOf(leg.userData);
    leg.quaternion.identity();
    leg.position.copy(shoulder);
    leg.scale.set(1, 1, 1);
    leg.children[1].scale.set(1, 1, 1);
    leg.userData.shoulder = shoulder;
    leg.userData.paw = paw;
  }
  catLegs.forEach(resetLeg);
  // a smooth move of one leg's shoulder and paw to new points
  function moveLeg(tl, leg, shoulder, paw, duration, at) {
    const from = { s: new THREE.Vector3(), p: new THREE.Vector3() };
    const k = { t: 0 };
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    // (a plain `to` from 0: `fromTo` would render at once, snapping the leg before its turn)
    tl.to(k, {
      t: 1,
      duration,
      ease: "sine.inOut",
      onStart: () => {
        from.s.copy(leg.userData.shoulder || legRest(leg).shoulder);
        from.p.copy(leg.userData.paw || legRest(leg).paw);
      },
      onUpdate: () => aimLeg(leg, s.lerpVectors(from.s, shoulder, k.t), p.lerpVectors(from.p, paw, k.t)),
    }, at);
  }
  const SIT_POSE = { rz: 0.9, py: 0.45, sx: 0.75, sy: 0.85 };
  const SIT_SHOULDER = (side) => bodyPoint(...SHOULDER, side * 0.3, SIT_POSE);
  const SIT_PAW = (side) => new THREE.Vector3(0.3, PAW_Y, side * 0.3);
  function catSitPose(tl, on) {
    const d = 0.7;
    const ease = "sine.inOut";
    const k = { t: on ? 0 : 1 };
    const pose = { ...STAND_POSE };
    const lerp = (a, b, t) => a + (b - a) * t;
    const pawFrom = [new THREE.Vector3(), new THREE.Vector3()];
    // the body tips, draws in and settles; her shoulders ride on it and her paws slide from
    // where they stood to under her chest, so nothing ever leaves her body mid-way
    const apply = () => {
      pose.rz = lerp(STAND_POSE.rz, SIT_POSE.rz, k.t);
      pose.py = lerp(STAND_POSE.py, SIT_POSE.py, k.t);
      pose.sx = lerp(STAND_POSE.sx, SIT_POSE.sx, k.t);
      catBody.rotation.z = pose.rz;
      catBody.position.y = pose.py;
      catBody.scale.x = pose.sx;
      [[frontL, 1], [frontR, -1]].forEach(([leg, side], i) => {
        const shoulder = bodyPoint(...SHOULDER, side * (0.32 - 0.02 * k.t), pose);
        const sitPaw = SIT_PAW(side);
        aimLeg(leg, shoulder, on ? pawFrom[i].clone().lerp(sitPaw, k.t) : sitPaw.clone().lerp(pawFrom[i], 1 - k.t));
      });
    };
    tl.call(() => {
      frontL.visible = frontR.visible = true;
      rearL.visible = rearR.visible = !on;
      catChest.visible = true;
      haunches.forEach((thigh) => (thigh.visible = on));
      paws.visible = false;
      tailCurl.visible = on;
      tailUp.visible = !on;
      catEyes(true);
      catBody.scale.y = 0.85;
      // where the paws start from (sitting: as they stand; standing up: as they'll stand)
      [frontL, frontR].forEach((leg, i) => pawFrom[i].copy(on ? leg.userData.paw || legRest(leg).paw : legRest(leg).paw));
      k.t = on ? 0 : 1;
    })
      .to(k, { t: on ? 1 : 0, duration: d, ease, onUpdate: apply })
      .to(tailCurl.position, { x: on ? 0.45 : 0, y: on ? -0.1 : 0, duration: d, ease }, "<")
      .to(tailCurl.scale, { x: on ? 0.85 : 1, z: on ? 0.85 : 1, duration: d, ease }, "<")
      .to(catHead.position, { ...(on ? SIT_HEAD : HEAD_UP), duration: d, ease }, "<")
      .to(catHead.rotation, { x: 0, y: 0.5, z: 0, duration: d, ease }, "<");
    // standing back up, the back legs come back under her hips
    if (!on) tl.call(() => [rearL, rearR].forEach(resetLeg));
  }
  // A wash, slow and soft: her near front paw drawn up in front of her muzzle and licked
  // (tongue out), wiped up over her cheek and back, then down to the ground while she licks
  // her chest. Every move eases into the next.
  const lick = (tl, times) => tl
    .to(catTongue.scale, { x: 1, y: 0.9, z: 1.3, duration: 0.2, yoyo: true, repeat: times * 2 - 1, ease: "sine.inOut" })
    .to(catHead.rotation, { x: "+=0.12", duration: 0.2, yoyo: true, repeat: times * 2 - 1, ease: "sine.inOut" }, "<")
    .set(catTongue.scale, { x: 0.001, y: 0.001, z: 0.001 });
  const GROOM_SHOULDER = SIT_SHOULDER(1);
  const AT_MOUTH = new THREE.Vector3(0.55, 1.35, 0.72);
  // a short stroke up from her mouth over her cheek
  const AT_CHEEK = new THREE.Vector3(0.46, 1.62, 0.7);
  function catGroom(tl) {
    const ease = "sine.inOut";
    catSitPose(tl, true);
    // the paw comes up as her head bends to meet it
    moveLeg(tl, frontL, GROOM_SHOULDER, AT_MOUTH, 0.7);
    tl.to(catHead.rotation, { x: 0.35, y: 0.5, duration: 0.7, ease }, "<0.15")
      .to(catHead.position, { x: 0.2, y: 1.72, z: 0.05, duration: 0.7, ease }, "<");
    lick(tl, 4);
    // the wipe: up over her cheek and back, twice, her head leaning into it
    for (let i = 0; i < 2; i++) {
      moveLeg(tl, frontL, GROOM_SHOULDER, AT_CHEEK, 0.5);
      tl.to(catHead.rotation, { x: 0.1, z: -0.28, duration: 0.5, ease }, "<");
      moveLeg(tl, frontL, GROOM_SHOULDER, AT_MOUTH, 0.5);
      tl.to(catHead.rotation, { x: 0.35, z: 0, duration: 0.5, ease }, "<");
    }
    // paw back down to the ground while her head goes down to her chest
    moveLeg(tl, frontL, SIT_SHOULDER(1), SIT_PAW(1), 0.6);
    tl.to(catHead.rotation, { x: 0.8, y: 0.3, z: 0, duration: 0.6, ease }, "<0.1")
      .to(catHead.position, { x: 0.22, y: 1.66, duration: 0.6, ease }, "<");
    lick(tl, 3);
    tl.to(catHead.rotation, { x: 0, y: 0.5, duration: 0.6, ease })
      .to(catHead.position, { ...SIT_HEAD, duration: 0.6, ease }, "<");
  }
  const catSpots = () => Object.values(CAT_BEDS).filter((bed) => bed !== catBed && !(bed === CAT_BEDS.desk && openFolder));
  function catWakeUp() {
    // Every time: a yawn, a stretch and, straight on from it, a wash sat up. Then, maybe, one
    // more thing: back to sleep, watching the pointer still sat, up to look out of the window
    // (only from the desk, the one spot it's in view from), swatting at the butterfly, or a
    // move to another spot. A move can't be stopped mid-way; the rest can be interrupted.
    const moving = Math.random() < 0.4;
    const onDesk = catBed === CAT_BEDS.desk;
    const choices = onDesk ? ["rest", "pointer", "window"] : ["rest", "pointer"];
    const after = flight.active ? "butterfly" : choices[Math.floor(Math.random() * choices.length)];
    const what = moving ? "move" : after;
    const tl = gsap.timeline({
      onComplete: () => {
        catIdleTl = null;
        if (moving) catBusy = false, catTravel = null;
        catLife.wakeAt = performance.now() + napLength();
      },
    });
    if (moving) catBusy = true, catTravel = tl;
    else catIdleTl = tl;
    catYawn(tl);
    catStretch(tl);
    catGroom(tl);
    if (what === "move") {
      const spots = catSpots();
      // the chair's her favourite: half the time she goes there if she isn't on it already
      const pick = spots.includes(CAT_BEDS.chair) && Math.random() < 0.5 ? CAT_BEDS.chair : spots[Math.floor(Math.random() * spots.length)];
      catSitPose(tl, false);
      catLeave(tl);
      catToBed(tl, pick);
      return;
    }
    if (what === "pointer") catWatch(tl, pointerPoint, 5);
    else if (what === "window") {
      // up off her haunches, turned round to face it (it's behind her on the desk), then back
      catSitPose(tl, false);
      const restYaw = cat.rotation.y;
      tl.call(() => {
        const at = cat.parent.worldToLocal(windowPoint(new THREE.Vector3()));
        let y = Math.atan2(-(at.z - cat.position.z), at.x - cat.position.x);
        // the short way round
        while (y - restYaw > Math.PI) y -= Math.PI * 2;
        while (y - restYaw < -Math.PI) y += Math.PI * 2;
        gsap.to(cat.rotation, { y, duration: 0.6, ease: "power2.inOut" });
      });
      tl.to({}, { duration: 0.6 });
      // head raised toward the glass
      tl.to(catHead.position, { y: HEAD_UP.y + 0.08, duration: 0.35, ease: "power2.out" });
      catWatch(tl, windowPoint, 6, tailUp);
      tl.call(() => sfx.meow({ short: true }), null, "-=3");
      tl.to(cat.rotation, { y: restYaw, duration: 0.6, ease: "power2.inOut" });
    } else if (what === "butterfly") {
      // still sat: she follows it, and swats at it twice with her near paw
      tl.addLabel("watch");
      catWatch(tl, butterflyPoint, 5);
      const reach = AT_CHEEK.clone().add(new THREE.Vector3(0.35, 0.3, 0.2));
      [1.2, 3].forEach((at) => {
        moveLeg(tl, frontL, GROOM_SHOULDER, reach, 0.18, `watch+=${at}`);
        moveLeg(tl, frontL, SIT_SHOULDER(1), SIT_PAW(1), 0.25, `watch+=${at + 0.18}`);
      });
    }
    // and back down to sleep
    tl.call(() => {
      catWatchUntil = 0;
      catPose(false, 0.6, "auto");
    }, null, "+=0.4")
      .to(catBody.position, { y: 0, duration: 0.6, ease: "power2.inOut" }, "<")
      .to(catBody.rotation, { z: 0, duration: 0.6, ease: "power2.inOut" }, "<")
      .to(catBody.scale, { x: 1, duration: 0.6, ease: "power2.inOut" }, "<")
      .call(() => catLegs.forEach(resetLeg), null, "<0.6")
      .to(tailCurl.position, { x: 0, y: 0, duration: 0.6, ease: "power2.inOut" }, "<-0.6")
      .to(tailCurl.scale, { x: 1, z: 1, duration: 0.6, ease: "power2.inOut" }, "<")
      .call(() => haunches.forEach((thigh) => (thigh.visible = false)), null, "<0.3");
  }
  // The butterfly's out: she's up straight away and after it, turning to keep it in front of
  // her and jumping at it, paw out, until it flies off
  function catChaseButterfly() {
    if (catBusy || !flight.active) return;
    catInterrupt();
    const restYaw = cat.rotation.y;
    const towardIt = () => {
      const at = cat.parent.worldToLocal(butterflyPoint(new THREE.Vector3()));
      let y = Math.atan2(-(at.z - cat.position.z), at.x - cat.position.x);
      while (y - cat.rotation.y > Math.PI) y -= Math.PI * 2;
      while (y - cat.rotation.y < -Math.PI) y += Math.PI * 2;
      return y;
    };
    const floorY = cat.position.y;
    const tl = gsap.timeline({
      onComplete: () => {
        catIdleTl = null;
        catLife.wakeAt = performance.now() + napLength();
      },
    });
    catIdleTl = tl;
    tl.call(() => {
      catPose(true, 0.25);
      sfx.meow({ short: true });
      catWatchAt = butterflyPoint;
      catWatchUntil = performance.now() + FLIGHT_TIME * 1000;
    });
    tl.to({}, { duration: 0.3 });
    for (let i = 0; i < 5; i++) {
      tl.call(() => gsap.to(cat.rotation, { y: towardIt(), duration: 0.3, ease: "power2.out" }))
        .to({}, { duration: 0.3 })
        // a crouch, a jump with a paw out, a landing
        .to(cat.scale, { y: 0.85 * 0.82, duration: 0.12, ease: "power2.in" })
        .to(cat.scale, { y: 0.85, duration: 0.1 })
        .to(cat.position, { y: floorY + 0.75, duration: 0.22, ease: "power2.out" }, "<")
        .to(paws.children[0].position, { x: 1.35, y: 1.1, z: 0.45, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out" }, "<")
        .to(cat.position, { y: floorY, duration: 0.2, ease: "power2.in" })
        .call(() => sfx.catLand({ strength: 0.2 }))
        .to({}, { duration: 0.45 + Math.random() * 0.3 });
    }
    // it's gone: back round and down to sleep
    tl.call(() => (catWatchUntil = 0))
      .to(cat.rotation, { y: restYaw, duration: 0.5, ease: "power2.inOut" })
      .call(() => catPose(false, 0.6, "auto"));
  }
  function updateCatLife(now) {
    if (catBusy || catIdleTl) return;
    // asleep: breathing, the odd flick of the tail or twitch of an ear
    belly.scale.y = 0.55 * (1 + 0.035 * Math.sin(now * 0.0022));
    if (now > catLife.twitchAt) {
      catLife.twitchAt = now + 3000 + Math.random() * 5000;
      if (Math.random() < 0.5) gsap.fromTo(tailCurl.rotation, { y: 0 }, { y: 0.14, duration: 0.25, yoyo: true, repeat: 1, ease: "sine.inOut" });
      else {
        const ear = catEars[Math.floor(Math.random() * catEars.length)];
        gsap.fromTo(ear.rotation, { x: 0 }, { x: -0.35, duration: 0.08, yoyo: true, repeat: 3, ease: "sine.inOut", onComplete: () => (ear.rotation.x = 0) });
      }
    }
    if (now > catLife.wakeAt) catWakeUp();
  }

  const CAT_LINES = ["mrrp?", "meow~", "purrr…", "zzz…", "feed me 🐟", "5 more minutes"];
  let catLine = 0;
  let catClicks = 0;
  // Her bubble keeps the same size on screen however far out the camera is (from the whole
  // room on a phone to a close-up), so what she says, and her name nearly as large under it,
  // stay readable. Built at 1 world unit per CAT_BUBBLE_PX; a holder scales it to fit.
  const CAT_BUBBLE_W = 3.6;
  const CAT_BUBBLE_H = 1.92;
  const CAT_BUBBLE_PX = 300;
  const catBubble = speechBubble(CAT_BUBBLE_W, CAT_BUBBLE_H, { size: 72, by: 0.9, tail: "left", style: "manga" });
  const catBubbleHolder = new THREE.Group();
  scene.add(catBubbleHolder);
  catBubbleHolder.add(catBubble.sprite);
  const catBubbleAt = new THREE.Vector3();
  const catBubbleTip = new THREE.Vector3();
  const catBubbleRight = new THREE.Vector3();
  const catBubbleUp = new THREE.Vector3();
  const [CAT_TIP_X, CAT_TIP_Y] = BUBBLE_TAILS.left.tip;
  // The bubble rides along above her head (she may be sitting up, standing, or trotting across
  // the keyboard), its tail pointing down at her with a clear gap above her ears. `blend`: 1
  // jumps straight there; less eases it after her head, so a quick bob doesn't jiggle it.
  const placeCatBubble = (blend = 1) => {
    // world units per screen pixel, then the scale that makes it CAT_BUBBLE_PX wide (at most
    // about half a narrow screen, so it doesn't run off the side of a phone)
    const unitsPerPixel = viewH / camera.zoom / container.clientHeight;
    const k = Math.min(CAT_BUBBLE_PX, container.clientWidth * 0.55) * unitsPerPixel / CAT_BUBBLE_W;
    catBubbleHolder.scale.setScalar(k);
    catHead.getWorldPosition(catBubbleAt);
    catBubbleRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    catBubbleUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    catBubbleAt.addScaledVector(catBubbleUp, 1.0).addScaledVector(catBubbleRight, 0.15);
    catBubbleTip.lerp(catBubbleAt, blend);
    catBubbleHolder.position.copy(catBubbleTip)
      .addScaledVector(catBubbleRight, (0.5 - CAT_TIP_X) * CAT_BUBBLE_W * k)
      .addScaledVector(catBubbleUp, (CAT_TIP_Y - 0.5) * CAT_BUBBLE_H * k);
  };
  function catSay(text) {
    placeCatBubble();
    catBubble.say({ text, by: "Oyen" }, 2600);
  }
  // The keyboard run: up onto its left end, a trot to the right with a key under every step,
  // Enter at the end (the terminal duly complains), then back to bed
  function catKeyboardRun() {
    discover("catKeys");
    catBusy = true;
    const top = keyboard.position.y + KEY_Y + 0.09;
    const z = keyboard.position.z + 0.05;
    const tl = gsap.timeline({ onComplete: () => (catBusy = false, catTravel = null) });
    catTravel = tl;
    tl.call(() => {
      catPose(true);
      showTerminal();
    });
    tl.to({}, { duration: 0.35 });
    catLeave(tl);
    catHop(tl, new THREE.Vector3(keyboard.position.x - 2.0, top, z), 0, 1.6);
    tl.call(() => catSay("✨ helping ✨"));
    const trot = { p: 0 };
    let lastStep = 0;
    tl.to(trot, {
      p: 1,
      duration: 2.4,
      ease: "none",
      onUpdate: () => {
        cat.position.x = keyboard.position.x - 2.0 + trot.p * 4.1;
        catLegs.forEach((leg, i) => (leg.rotation.z = Math.sin(trot.p * 28 + (i % 2) * Math.PI) * 0.45));
        const step = Math.floor(trot.p * 14);
        if (step !== lastStep) {
          lastStep = step;
          const ch = "ASDFJKLQWERUIOPZXCVNM"[Math.floor(Math.random() * 21)];
          pressKey(`Key${ch}`);
          typeKey(ch.toLowerCase());
        }
      },
    });
    tl.call(() => {
      catLegs.forEach((leg) => (leg.rotation.z = 0));
      pressKey("Enter");
      typeKey("Enter");
    });
    tl.to({}, { duration: 0.3 });
    catToBed(tl, bedFor(darkNow && !openFolder));
  }
  register(cat, {
    onHover: (on) => on && !catBusy && gsap.fromTo(catHead.rotation, { z: 0.25 }, { z: catHead.rotation.z, duration: 0.6, ease: "elastic.out(1, 0.3)" }),
    onClick: () => {
      catInterrupt();
      if (catBusy) return;
      if (++catClicks % 3 === 0) return catKeyboardRun();
      catBusy = true;
      catEyes(true);
      // her head pops up over her chest and drops back
      catChest.visible = true;
      gsap.fromTo(catHead.position, { ...catHead.position }, { ...HEAD_LOAF, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out", onComplete: () => (catChest.visible = false) });
      gsap.fromTo(tailCurl.rotation, { y: 0 }, { y: 0.15, duration: 0.2, yoyo: true, repeat: 5, ease: "sine.inOut" });
      sfx.meow();
      catSay(CAT_LINES[catLine++ % CAT_LINES.length]);
      timers.push(catFidget = setTimeout(() => {
        catEyes(false);
        catBusy = false;
      }, 2000));
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
  // A burgundy iPhone 17 Pro Max: a tall aluminium unibody with a thin, even black border
  // round a screen whose corners follow the body's, the Dynamic Island printed at its top
  // (drawChatScreen), the buttons down both sides, and on the back the full-width camera
  // plateau: three big lenses in a triangle, the flash and LiDAR beside them, and the logo
  const phoneFinish = toon("#7a2635");
  const phoneTrim = toon("#5e1a27");
  const PHONE_W = 0.95;
  const PHONE_H = 1.95;
  const phoneScreen = printed(0.87, 1.87, 700, (c, w, h) => drawChatScreen(c, w, h, chat, { unread, caret: caretOn && chat.active }), { unlit: true });
  // A rounded screen, its UVs spread over the whole print so the chat's hotspots line up
  {
    const sw = 0.87, sh = 1.87;
    const geo = new THREE.ShapeGeometry(roundedRectShape(sw, sh, 0.11), 10);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / sw + 0.5, pos.getY(i) / sh + 0.5);
    phoneScreen.geometry.dispose();
    phoneScreen.geometry = track(geo);
  }
  phoneScreen.position.z = 0.059;
  // The chat's glow on the desk and the mug in front of it, at night
  const phoneLight = neonLight("#fff1dc", 0.5, () => (darkNow ? 1 : 0), { distance: 1.6 });
  phoneLight.position.z = 0.35;
  phoneScreen.add(phoneLight);
  const phoneBezel = mesh(phoneSlab(0.91, 1.91, 0.02, 0.13), toon("#0d0d0f"), { outline: 0, cast: false });
  phoneBezel.position.z = 0.047;
  const phoneBody = mesh(phoneSlab(PHONE_W, PHONE_H, 0.09, 0.16), phoneFinish, { outline: 0.035 });
  // Side buttons: the action button and volume rocker on the left, the side button and Camera
  // Control on the right
  const sideButton = (x, y, h) => {
    const b = mesh(rbox(0.025, h, 0.04, 0.012), phoneTrim, { outline: 0.012 });
    b.position.set(x, y, 0);
    phone.add(b);
  };
  sideButton(-PHONE_W / 2 - 0.008, 0.62, 0.1);
  sideButton(-PHONE_W / 2 - 0.008, 0.42, 0.18);
  sideButton(-PHONE_W / 2 - 0.008, 0.18, 0.18);
  sideButton(PHONE_W / 2 + 0.008, 0.45, 0.26);
  sideButton(PHONE_W / 2 + 0.008, -0.25, 0.16);
  // The plateau runs edge to edge across the top of the back, a shade deeper than the body
  const plateau = mesh(phoneSlab(PHONE_W - 0.03, 0.56, 0.05, 0.13), phoneTrim, { outline: 0.025 });
  plateau.position.set(0, 0.66, -0.065);
  // Seen from the back the lenses sit on the left, which is +x here (the screen faces +z)
  const lensRing = toon("#4a131e");
  const lensGlass = toon("#16181d");
  [[0.25, 0.79], [0.25, 0.53], [0.05, 0.66]].forEach(([x, y]) => {
    const ring = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.035, 28), lensRing, { outline: 0.015 });
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, -0.1);
    const glass = mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.02, 24), lensGlass, { outline: 0 });
    glass.rotation.x = Math.PI / 2;
    glass.position.set(x, y, -0.112);
    const glint = new THREE.Mesh(track(new THREE.CircleGeometry(0.018, 12)), track(new THREE.MeshBasicMaterial({ color: "#5a6b8c" })));
    glint.rotation.y = Math.PI;
    glint.position.set(x - 0.02, y + 0.02, -0.123);
    glint.raycast = noRaycast;
    phone.add(ring, glass, glint);
  });
  const camFlash = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), toon("#fff3d6"), { outline: 0.006 });
  camFlash.rotation.x = Math.PI / 2;
  camFlash.position.set(-0.3, 0.79, -0.095);
  const lidar = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), lensGlass, { outline: 0.006 });
  lidar.rotation.x = Math.PI / 2;
  lidar.position.set(-0.3, 0.53, -0.095);
  // the logo, a plain round mark like the monitor's
  const backLogo = new THREE.Mesh(track(new THREE.CircleGeometry(0.07, 24)), phoneTrim);
  backLogo.rotation.y = Math.PI;
  backLogo.position.set(0, -0.1, -0.047);
  backLogo.raycast = noRaycast;
  phone.add(phoneBody, phoneBezel, phoneScreen, plateau, camFlash, lidar, backLogo);
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
    gsap.fromTo(phone.rotation, { z: 0.06 }, { z: 0, duration: 0.5, ease: "elastic.out(1.4, 0.2)", overwrite: "auto" });
  };
  const buzzTimer = setInterval(buzz, 4000);
  register(phoneStand, {
    focus: "chat",
    onHover: (on) => {
      if (focus.name === "chat") return;
      gsap.to(phone.rotation, { x: on ? -0.2 : -0.28, z: 0, duration: 0.25, overwrite: true });
      if (on) buzz();
    },
    // Arrival: the phone hops, the unread badge clears and the chat box takes the keyboard
    onArrive: () => {
      gsap.killTweensOf(phone.rotation);
      phone.rotation.set(-0.28, 0, 0);
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
    responsiveUntil = performance.now() + 2000;
    if (focus.name === "shelf") {
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? container.clientHeight : 1);
      browseShelf(shelfLook - delta * 0.0035);
      return;
    }
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
  // set down a little askew, not squared up to the desk
  const OUT = { x: 0.65, y: 0.04, z: DRAWER_D / 2 + 3.55, r: -Math.PI / 2 + 0.07 };
  // Opened, the cover's board springs back a touch instead of lying dead flat
  const OPEN_TILT = 0.05;
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
  // Paged through as in 2D: the sheets stay a loose stack on the right, a turn slides the top
  // one out and tucks it under the pile (back: the bottom one comes out on top). Each depth in
  // the stack sits a little further down and across, at its own slight angle.
  const SHEET_SKEW = [0, -0.9, 0.7, -0.5, 1].map((deg) => (deg * Math.PI) / 180);
  const sheetRest = (pivot, depth) => {
    const base = pivot.userData.base;
    return { x: base.x + depth * 0.012, y: sheetY(depth), z: base.z + depth * 0.012, ry: base.ry + (SHEET_SKEW[depth] || 0) };
  };
  // A steady wobble per folder, so the drawer looks handled: each one leans its own way, its
  // cover left a little ajar, a stray sheet poking out of the top, page flags out the side
  const wobble = (i, k) => {
    const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return (v - Math.floor(v)) * 2 - 1;
  };
  const strayMat = toon("#fffdf5");
  const FLAG_COLORS = ["#ff6b6b", "#00e0c6", "#ffdd00"];
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
      // not squared into a neat stack: each sheet sits a hair off the one under it
      pivot.userData.base = { x: -FOLDER_W / 2 + 0.04 + wobble(i * 7 + k, 30) * 0.015, z: wobble(i * 7 + k, 31) * 0.025, ry: wobble(i * 7 + k, 32) * 0.02 };
      const restAt = sheetRest(pivot, k);
      pivot.position.set(restAt.x, restAt.y, restAt.z);
      pivot.rotation.y = restAt.ry;
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
    // A loose sheet or two poking out past the top edge, askew
    [0, 1].slice(0, 1 + (i % 2)).forEach((k) => {
      const stray = mesh(rbox(SHEET_W * (0.7 - k * 0.15), 0.004, 0.5, 0.0015), strayMat, { outline: 0.008, cast: false });
      stray.position.set(wobble(i, 7 + k) * 0.35, 0.0172 + k * 0.0003, -FOLDER_D / 2 + 0.2 - 0.06 - k * 0.04 - Math.abs(wobble(i, 9 + k)) * 0.05);
      stray.rotation.y = wobble(i, 11 + k) * 0.12;
      body.add(stray);
    });
    // Page flags: little neon tabs stuck to a sheet, poking out past the right-hand edge
    FLAG_COLORS.slice(0, 2 + (i % 2)).forEach((color, k) => {
      const flag = mesh(rbox(0.16, 0.004, 0.09, 0.0015), toon(color), { outline: 0.006, cast: false });
      flag.position.set(FOLDER_W / 2 + 0.03, 0.0175, -FOLDER_D * (0.25 - k * 0.22) + wobble(i, 20 + k) * 0.05);
      flag.rotation.y = wobble(i, 23 + k) * 0.08;
      body.add(flag);
    });
    const rest = 0.03 + Math.abs(wobble(i, 1)) * 0.06;
    hinge.rotation.z = rest;
    folders.add(f);
    const lean = { x: wobble(i, 2) * 0.07, y: wobble(i, 3) * 0.05, z: wobble(i, 4) * 0.05, dx: wobble(i, 5) * 0.07 };
    return { project, index: i, f, body, hinge, sheets, order: sheets.map((_, k) => k), flipping: false, out: 0, rest, lean };
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
      const { lean } = entry;
      if (t <= 0) {
        f.position.set(slot.x + lean.dx, slot.y, slot.z);
        f.rotation.set(STAND_RX + lean.x, lean.y, lean.z);
        return;
      }
      f.position.set(
        bezier(slot.x, slot.x, OUT.x, OUT.x, t),
        bezier(slot.y, FLY_Y + 0.4, FLY_Y, OUT.y, t),
        bezier(slot.z, slot.z, OUT.z, OUT.z, t),
      );
      // it straightens up as it comes out
      const loose = 1 - smooth(t / 0.6);
      f.position.x += lean.dx * loose;
      f.rotation.set(between(STAND_RX, 0, t, 0.3, 0.8) + lean.x * loose, between(0, OUT.r, t, 0.25, 0.85) + lean.y * loose, lean.z * loose);
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
    // the stack squared back into its first order
    entry.order = entry.sheets.map((_, k) => k);
    entry.sheets.forEach((pivot, k) => {
      const restAt = sheetRest(pivot, k);
      gsap.to(pivot.rotation, { y: restAt.ry, duration: 0.3, overwrite: true });
      gsap.to(pivot.position, { x: restAt.x, y: restAt.y, z: restAt.z, duration: 0.3, overwrite: true });
    });
    entry.flipping = false;
    // Shut the cover, then back into its slot at the front of the drawer
    gsap.to(entry.hinge.rotation, { z: entry.rest, duration: 0.4, delay: 0.1, ease: "power2.in", onComplete: () => sfx.slap() });
    gsap.to(entry, { out: 0, duration: 0.95, delay: 0.45, ease: "power2.inOut", overwrite: true, onComplete: () => sfx.knock({ strength: 0.8 }) });
  }
  // Pull the front folder out onto the desk, open its cover out flat, and move the camera in close
  function openProject(entry) {
    if (openFolder) return;
    openFolder = entry;
    onEvent("projectOpen", { open: true });
    gsap.to(entry.body.position, { y: 0, z: 0, duration: 0.2, overwrite: true });
    applyShot(false, 1.2);
    // The cat gets off the desk first, whatever she's up to; the file waits for her to go
    catShoo(() => {
      if (openFolder !== entry) return;
      sfx.folderSlide({ duration: 0.6 });
      gsap.to(entry, { out: 1, duration: 1.0, ease: "power2.inOut", overwrite: true, onComplete: () => sfx.flop({ strength: 0.5, recorded: false }) });
      gsap.to(entry.hinge.rotation, { z: Math.PI - OPEN_TILT, duration: 0.6, delay: 1.0, ease: "power2.inOut", onStart: () => sfx.coverOpen({ duration: 0.6 }), onComplete: () => sfx.flop({ strength: 0.3, recorded: false }) });
    });
  }
  function closeProject() {
    if (!openFolder) return;
    closeFolder(openFolder);
    openFolder = null;
    catSettle();
    onEvent("projectOpen", { open: false });
    applyShot();
  }
  function turnSheet(dir) {
    const entry = openFolder;
    if (!entry || entry.flipping) return;
    entry.flipping = true;
    const { order, sheets } = entry;
    const page = dir > 0 ? order[0] : order[order.length - 1];
    const moving = sheets[page];
    // Out: slid off to the right, lifted clear of the pile, tipped a little
    sfx.slide({ duration: 0.22 });
    gsap.to(moving.rotation, { y: moving.rotation.y - 0.12, duration: 0.23, ease: "power2.in", overwrite: true });
    gsap.to(moving.position, {
      x: moving.position.x + SHEET_W * 0.62,
      y: sheetY(0) + 0.06,
      z: moving.position.z - SHEET_D * 0.06,
      duration: 0.23,
      ease: "power2.in",
      overwrite: true,
      onComplete: () => {
        entry.order = dir > 0 ? [...order.slice(1), page] : [page, ...order.slice(0, -1)];
        // the rest settle into their new depths; the moving one drops to its own height (under
        // the pile, or on top) while it's still clear of it, then slides back in
        entry.order.forEach((p, depth) => {
          if (p === page) return;
          const restAt = sheetRest(sheets[p], depth);
          gsap.to(sheets[p].position, { x: restAt.x, y: restAt.y, z: restAt.z, duration: 0.2 });
          gsap.to(sheets[p].rotation, { y: restAt.ry, duration: 0.2 });
        });
        const restAt = sheetRest(moving, entry.order.indexOf(page));
        moving.position.y = restAt.y;
        sfx.slide({ duration: 0.28, up: false, delay: 0.05 });
        gsap.to(moving.rotation, { y: restAt.ry, duration: 0.32, ease: "back.out(1.4)" });
        gsap.to(moving.position, { x: restAt.x, z: restAt.z, duration: 0.32, ease: "back.out(1.4)", onComplete: () => (entry.flipping = false) });
      },
    });
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
      onHover: (on) => {
        const lift = on && !openFolder;
        gsap.to(entry.body.position, { y: 0, z: lift ? -0.42 : 0, duration: lift ? 0.28 : 0.4, ease: "power2.out", overwrite: true });
      },
      onClick: clickFolder,
      onHotspot: (hs) => openFolder && turnSheet(hs.action === "prev" ? -1 : 1),
    }),
  );
  register(folders, {
    focus: "projects",
    onLeave: () => {
      if (openFolder) closeProject();
    },
    onHover: (on) => {
      gsap.to(drawerHandle.position, { z: DRAWER_D / 2 + (on && !openFolder ? 0.23 : 0.13), duration: 0.25, overwrite: true });
      folderList[frontIndex()] && interactive.get(folderList[frontIndex()].f).onHover(on);
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
    gsap.killTweensOf(flap.rotation);
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
      .call(() => sfx.cardDown({ strength: 0.5 }), null, "out+=1.75")
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
    onHover: (on) => {
      if (focus.name === "contact") return;
      gsap.to(flap.rotation, { x: on ? -0.32 : 0, duration: 0.3, ease: "power2.out", overwrite: true });
    },
    onArrive: openEnvelope,
    onLeave: resetEnvelope,
    onHotspot: (hs) => cardReady && (hs.id === "send" ? sendCard() : editField(hs.id)),
  });

  // ---------- mug (decor) ----------
  const mug = new THREE.Group();
  // On a cork coaster, a little closer to the envelope
  const MUG_Y = 0.06;
  mug.position.set(5.5, MUG_Y, 0.95);
  const coaster = mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.06, 32), toon("#a8743f"), { outline: 0.03, cast: false });
  coaster.position.set(mug.position.x, 0.03, mug.position.z);
  const coasterRing = new THREE.Mesh(track(new THREE.TorusGeometry(0.6, 0.02, 6, 40)), track(new THREE.MeshBasicMaterial({ color: "#6e4520" })));
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
  // Steam: three cartoon squiggles rising off the coffee, redrawn as they go. Each one is a
  // wavy white stroke with a soft grey edge that curls up out of the cup, sways as it climbs
  // and thins away at the top, staggered so the next is always on its way.
  const STEAM_W = 128;
  const STEAM_H = 256;
  const steamTex = canvasTexture(STEAM_W, STEAM_H);
  track(steamTex.texture);
  const steam = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: steamTex.texture, transparent: true, depthWrite: false })));
  steam.raycast = noRaycast;
  steam.center.set(0.5, 0);
  steam.scale.set(0.8, 1.6, 1);
  steam.position.set(0, 1.08, 0);
  mug.add(steam);
  const puffs = [steam];
  const WISPS = [{ x: 0.3, phase: 0 }, { x: 0.52, phase: 0.36 }, { x: 0.72, phase: 0.7 }];
  const STEAM_PERIOD = 2.6;
  let steamDrawnAt = 0;
  // Each wisp is drawn solid here, then laid onto the texture at its own opacity
  const wispLayer = document.createElement("canvas");
  wispLayer.width = STEAM_W;
  wispLayer.height = STEAM_H;
  const wc = wispLayer.getContext("2d");
  wc.lineCap = "round";
  wc.lineJoin = "round";
  function updateSteam(now) {
    if (!steam.visible || now - steamDrawnAt < 33) return;
    steamDrawnAt = now;
    const c = steamTex.ctx;
    c.clearRect(0, 0, STEAM_W, STEAM_H);
    c.lineCap = "round";
    c.lineJoin = "round";
    const t = now / 1000;
    WISPS.forEach(({ x, phase }) => {
      const p = (t / STEAM_PERIOD + phase) % 1;
      // The stroke spans a window that climbs the canvas: born at the cup, gone at the top
      const head = p * 1.3;
      const tail = Math.max(0, head - 0.55);
      if (tail >= 1) return;
      const points = [];
      for (let f = tail; f <= Math.min(1, head); f += 0.02) {
        const sway = Math.sin(f * 9 - t * 3 + phase * 7) * (0.06 + f * 0.1);
        points.push([(x + sway) * STEAM_W, (1 - f) * STEAM_H]);
      }
      if (points.length < 2) return;
      // fades in near the cup and out toward the top
      const alpha = Math.min(1, p / 0.15) * Math.min(1, (1 - tail) / 0.45);
      // Segment by segment, so the stroke swells in the middle and tapers at both ends
      const trace = (color, extra) => {
        wc.strokeStyle = color;
        for (let i = 1; i < points.length; i++) {
          const k = i / (points.length - 1);
          wc.lineWidth = 4 + Math.sin(k * Math.PI) * 11 + extra;
          wc.beginPath();
          wc.moveTo(points[i - 1][0], points[i - 1][1]);
          wc.lineTo(points[i][0], points[i][1]);
          wc.stroke();
        }
      };
      wc.clearRect(0, 0, STEAM_W, STEAM_H);
      trace("#b4bcc6", 5);
      trace("#ffffff", 0);
      c.globalAlpha = alpha * 0.92;
      c.drawImage(wispLayer, 0, 0);
    });
    c.globalAlpha = 1;
    steamTex.texture.needsUpdate = true;
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
    // Steam only rises off a full cup
    puffs.forEach((puff) => (puff.visible = level >= 1));
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
    gsap.killTweensOf(mug.position);
    // No steam while it's at your lips (nor after: it's no longer full)
    puffs.forEach((puff) => (puff.visible = false));
    // Lift and tip the rim toward you, then put it back down
    gsap
      .timeline({ onComplete: () => (sipping = false) })
      .to(mug.position, { y: MUG_Y + 0.7, duration: 0.3, ease: "power2.out" })
      .to(mug.rotation, { x: 0.55, duration: 0.3, ease: "power2.out" }, 0)
      .to(mug.rotation, { x: 0, duration: 0.3, ease: "power2.inOut" }, 0.95)
      .to(mug.position, { y: MUG_Y, duration: 0.35, ease: "bounce.out" }, 1.0);
    // The slurp starts as the rim reaches your lips; the mug is set down after the gulp
    sfx.slurp({ delay: 0.25 });
    timers.push(setTimeout(() => sfx.mugDown({ strength: 0.35 }), 1200));
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
    onHover: (on) => {
      if (sipping) return;
      gsap.to(mug.position, { y: on ? MUG_Y + 0.06 : MUG_Y, duration: 0.3, ease: "power2.out", overwrite: true });
      gsap.to(steam.scale, { x: on ? 1 : 0.8, y: on ? 1.95 : 1.6, duration: 0.4, overwrite: true });
      if (on) gsap.fromTo(crema.rotation, { z: -0.12 }, { z: 0, duration: 0.7, ease: "elastic.out(1, 0.4)", overwrite: true });
    },
    onArrive: sip,
    onClick: sip,
    onLeave: () => {
      hideBubble();
      if (!sipping) {
        gsap.to(mug.position, { y: MUG_Y, duration: 0.2 });
        gsap.to(mug.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
      }
    },
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
  contactShadow(monitor, 2.2, 1.5, RISER_TOP);
  contactShadow(riser, 7.4, 2.4, 0, 0.7);
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
    // the room's sun moves on with the clock, as the view outside does
    if (!darkNow) applyDaylight();
  }, 60000);

  // ---------- theme ----------
  let darkNow = dark;
  function setTheme(isDark) {
    darkNow = isDark;
    deskNeons.forEach(({ strip, washMat }) => {
      strip.visible = isDark;
      washMat.opacity = isDark ? DESK_WASH : 0;
    });
    monitorGlowMat.opacity = isDark ? 0.7 : 0;
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
    riserMat.color.set(p.desk);
    riserLegMat.color.set(p.desk).multiplyScalar(RISER_LEG_SHADE);
    shadowFill.color.set(p.shadow);
    if (!isDark) applyDaylight();
  }
  // By day the room follows the visitor's clock, like the view outside: a low warm sun through
  // the window in the morning, the white midday sun, and a long amber light in the evening
  const DAYLIGHT = {
    morning: { sun: "#ffd6a0", sunAt: [-14, 6, 7], sunPower: 1.35, sky: "#fff1dc", skyPower: 1.25, ambient: 0.62, pane: "#ffd59a", panePower: 80 },
    day: { sun: "#fff1cc", sunAt: [-13, 9.5, 4.5], sunPower: 1.6, sky: "#fffaf0", skyPower: 1.45, ambient: 0.65, pane: "#ffe5ad", panePower: 70 },
    // the view's sun rises on the front side of the window and sets on the back side, so the
    // room's evening sun comes in from behind
    evening: { sun: "#ff9e66", sunAt: [-14, 4.5, -4], sunPower: 1.25, sky: "#ffe0c4", skyPower: 1.1, ambient: 0.55, pane: "#ffb27a", panePower: 85 },
  };
  function applyDaylight() {
    const light = DAYLIGHT[clockPart()];
    sun.color.set(light.sun);
    sun.position.set(...light.sunAt);
    sun.intensity = light.sunPower;
    skyFill.color.set(light.sky);
    skyFill.intensity = light.skyPower;
    ambient.intensity = light.ambient;
    windowLight.color.set(light.pane);
    windowLight.intensity = light.panePower;
  }
  setTheme(dark);
  // The monitor's desktop follows the room
  const setRoomTheme = (isDark) => {
    setTheme(isDark);
    outside.night = isDark;
    windowView.userData.tex.redraw();
    lampSwitch(isDark);
    setNeon(isDark);
    catSettle();
    desktop.setTheme(isDark);
    redrawScreen();
  };
  desktop.setTheme(dark);

  // ---------- pointer ----------
  const raycaster = new THREE.Raycaster();
  raycaster.layers.enable(2);
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
  // (nor the gauntlet while it's put away for the swords' close-up: hidden, it's still there
  // for the ray)
  // (nor the chair, put away for the tickets' close-up)
  const inside = (object, group) => {
    for (let o = object; o; o = o.parent) if (o === group) return true;
    return false;
  };
  const visibleHits = () => raycaster.intersectObjects(pickables, true)
    .filter((h) => -viewPoint.copy(h.point).applyMatrix4(camera.matrixWorldInverse).z >= camera.near)
    .filter((h) => (gauntlet.visible || !inside(h.object, gauntlet)) && (chair.visible || !inside(h.object, chair)));
  const pick = (e) => {
    rayFromPointer(e);
    const hit = visibleHits()[0];
    return hit ? { hit, entry: entryFor(hit.object) } : null;
  };
  // For hover: stay on the item already hovered while the pointer is still over any part of
  // it. A lifted ticket or folder shifts a little on screen; without this the hover would
  // flick back and forth between it and the one beneath.
  const pickHover = (e, hits = null) => {
    rayFromPointer(e);
    if (!hits) hits = visibleHits();
    const nearest = hits[0] ? entryFor(hits[0].object) : null;
    // A paper in front of its board must take hover from the parent behind it.
    // Keep the existing retention for overlapping peers such as tickets and folders.
    if (hovered && nearest?.object !== hovered.object) {
      for (let o = nearest?.object.parent; o; o = o.parent) if (o === hovered.object) return nearest;
    }
    if (hovered && hits.some((h) => entryFor(h.object)?.object === hovered.object)) return hovered;
    return nearest;
  };
  const setHover = (entry) => {
    if (hovered?.object === entry?.object) return;
    hovered?.onHover?.(false);
    hovered = entry;
    hovered?.onHover?.(true);
    renderer.domElement.style.cursor = entry?.sticky || entry?.grabTurn || (entry?.note && focus.name === "about") ? "grab" : entry ? "pointer" : "default";
  };
  let shelfDrag = null;
  function browseShelf(y, instant = false) {
    shelfLook = THREE.MathUtils.clamp(y, 1.7, 9);
    shelfBubble.hide();
    applyShot(instant, instant ? 0 : 0.22);
  }
  function finishShelfDrag(pointerId = null) {
    if (!shelfDrag || (pointerId !== null && shelfDrag.pointerId !== pointerId)) return null;
    const drag = shelfDrag;
    shelfDrag = null;
    if (renderer.domElement.hasPointerCapture(drag.pointerId)) renderer.domElement.releasePointerCapture(drag.pointerId);
    renderer.domElement.style.cursor = "grab";
    if (drag.moved) downAt = null;
    return drag;
  }
  let stickyDrag = null;
  const stickyPlane = new THREE.Plane();
  const stickyPoint = new THREE.Vector3();
  function stickyPointer(e) {
    monitor.updateWorldMatrix(true, false);
    stickyPlane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, 1).transformDirection(monitor.matrixWorld),
      monitor.localToWorld(stickyPoint.set(0, 0, 0.1)),
    );
    const hit = rayFromPointer(e).intersectPlane(stickyPlane, stickyPoint);
    return hit ? monitor.worldToLocal(hit) : null;
  }
  function finishStickyDrag(pointerId = null) {
    if (!stickyDrag || (pointerId !== null && stickyDrag.pointerId !== pointerId)) return null;
    const drag = stickyDrag;
    stickyDrag = null;
    downAt = null;
    if (renderer.domElement.hasPointerCapture(drag.pointerId)) renderer.domElement.releasePointerCapture(drag.pointerId);
    renderer.domElement.style.cursor = "grab";
    return drag;
  }
  const onPointerMove = (e) => {
    responsiveUntil = performance.now() + 2000;
    if (shelfDrag) {
      if (e.pointerId !== shelfDrag.pointerId) return;
      const dy = e.clientY - shelfDrag.startY;
      if (!shelfDrag.moved && Math.hypot(e.clientX - shelfDrag.startX, dy) < 6) return;
      shelfDrag.moved = true;
      renderer.domElement.style.cursor = "grabbing";
      browseShelf(shelfDrag.startLook + dy * shelfDrag.unitsPerPixel, true);
      e.preventDefault();
      return;
    }
    if (stickyDrag) {
      if (e.pointerId !== stickyDrag.pointerId) return;
      if (!stickyDrag.moved && Math.hypot(e.clientX - stickyDrag.startX, e.clientY - stickyDrag.startY) < 4) return;
      const point = stickyPointer(e);
      if (!point) return;
      stickyDrag.moved = true;
      // Keep a little overhang around the bezel, as in the original placements.
      stickyDrag.sticky.position.x = THREE.MathUtils.clamp(point.x - stickyDrag.offsetX, -2.3, 2.3);
      stickyDrag.sticky.position.y = THREE.MathUtils.clamp(point.y - stickyDrag.offsetY, 1.3, 3.7);
      renderer.domElement.style.cursor = "grabbing";
      e.preventDefault();
      return;
    }
    if (chairDrag) {
      if (e.pointerId !== chairDrag.pointerId) return;
      if (!chairDrag.moved && Math.hypot(e.clientX - chairDrag.startX, e.clientY - chairDrag.startY) < 4) return;
      if (!chairDrag.moved) {
        chairDrag.moved = true;
        grabChair(chairDrag);
        renderer.domElement.style.cursor = "grabbing";
      }
      turnChair(chairDrag, e.clientX, performance.now());
      e.preventDefault();
      return;
    }
    if (hatDrag) {
      if (e.pointerId !== hatDrag.pointerId) return;
      if (!hatDrag.moved && Math.hypot(e.clientX - hatDrag.startX, e.clientY - hatDrag.startY) < 4) return;
      hatDrag.moved = true;
      renderer.domElement.style.cursor = "grabbing";
      pullHat(hatDrag, rayFromPointer(e), e.timeStamp);
      e.preventDefault();
      return;
    }
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
      if (e.timeStamp - (lanyardDrag.lastSound || 0) > 130) {
        sfx.strap({ speed: Math.min(1, Math.hypot(e.movementX, e.movementY) / 14) });
        lanyardDrag.lastSound = e.timeStamp;
      }
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
      // One held scrape for the whole drag, swelling with the hand and fading when it stops
      if (!noteDrag.scrape) noteDrag.scrape = startScrape();
      noteDrag.scrape?.set(Math.min(1, Math.hypot(e.movementX, e.movementY) / 12));
      e.preventDefault();
      return;
    }
    const rect = renderer.domElement.getBoundingClientRect();
    parallax.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    parallax.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    if (e.pointerType === "mouse") {
      // Reuse one raycast for hover, prop hotspots and the lanyard hit area.
      rayFromPointer(e);
      const hits = visibleHits();
      setHover(pickHover(e, hits));
      if (hovered?.onPointer) {
        const hit = hits[0];
        hovered.onPointer(entryFor(hit?.object)?.object === hovered.object ? hit : null);
      }
      if (lanyardUnder(e, hits)?.strap || hovered?.object === hatPeg) renderer.domElement.style.cursor = "grab";
      mouseAim.x = MOUSE_ORIGIN.x + parallax.tx * 0.6;
      mouseAim.z = MOUSE_ORIGIN.z + parallax.ty * 0.45;
    }
  };
  // The pin or strap under the pointer, or the badge itself, on the shots where it's in reach
  // (the overview, the badge close up, and the About board it hangs from)
  function lanyardUnder(e, hits = null) {
    if (focus.name !== "overview" && focus.name !== "hero" && focus.name !== "about") return null;
    const badgeHit = hits ? entryFor(hits[0]?.object)?.object === badge : pick(e)?.entry?.object === badge;
    const point = rayFromPointer(e).intersectPlane(lanyardPlane, lanyardPoint);
    return point ? lanyardAt(point, badgeHit) : null;
  }
  let lanyardDrag = null;
  // The gaming chair, turned on its post by a sideways drag
  let chairDrag = null;
  function finishChairDrag(pointerId = null) {
    if (!chairDrag || (pointerId !== null && pointerId !== chairDrag.pointerId)) return null;
    const drag = chairDrag;
    chairDrag = null;
    if (drag.moved) releaseChair(drag);
    if (renderer.domElement.hasPointerCapture(drag.pointerId)) renderer.domElement.releasePointerCapture(drag.pointerId);
    renderer.domElement.style.cursor = "grab";
    return drag;
  }
  // The straw hat, held and pulled on its cord
  let hatDrag = null;
  function finishHatDrag(pointerId = null) {
    if (!hatDrag || (pointerId !== null && pointerId !== hatDrag.pointerId)) return null;
    const drag = hatDrag;
    hatDrag = null;
    if (drag.moved) releaseHat(drag);
    if (renderer.domElement.hasPointerCapture(drag.pointerId)) renderer.domElement.releasePointerCapture(drag.pointerId);
    renderer.domElement.style.cursor = "default";
    return drag;
  }
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
    responsiveUntil = performance.now() + 2000;
    if (shelfDrag || stickyDrag || noteDrag || lanyardDrag || hatDrag || chairDrag || e.button !== 0) return;
    downAt = { x: e.clientX, y: e.clientY };
    if (focus.name === "shelf") {
      shelfDrag = {
        pointerId: e.pointerId, startX: e.clientX, startY: e.clientY,
        startLook: shelfLook, unitsPerPixel: viewH / cam.zoom / container.clientHeight, moved: false,
      };
      renderer.domElement.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    const stickyEntry = pick(e)?.entry;
    if (stickyEntry?.sticky) {
      const point = stickyPointer(e);
      if (!point) return;
      stickyDrag = {
        sticky: stickyEntry.sticky, entry: stickyEntry, pointerId: e.pointerId,
        startX: e.clientX, startY: e.clientY, moved: false,
        offsetX: point.x - stickyEntry.sticky.position.x,
        offsetY: point.y - stickyEntry.sticky.position.y,
      };
      renderer.domElement.setPointerCapture(e.pointerId);
      renderer.domElement.style.cursor = "grabbing";
      e.preventDefault();
      return;
    }
    if (stickyEntry?.grabTurn && !chairBusy) {
      chairDrag = { entry: stickyEntry, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
      renderer.domElement.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    if (stickyEntry?.object === hatPeg) {
      const drag = { entry: stickyEntry, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
      if (grabHat(drag, rayFromPointer(e))) {
        hatDrag = drag;
        renderer.domElement.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
    }
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
    drag.scrape?.stop();
    downAt = null;
    const overlaps = drag.moved && boardNotes.some((other) => other !== drag.note && notesOverlap(drag.note, other));
    pinNote(drag.note, sound, overlaps ? { x: drag.homeX, y: drag.homeY } : drag.note.paper.position);
    if (renderer.domElement.hasPointerCapture(drag.pointerId)) renderer.domElement.releasePointerCapture(drag.pointerId);
    renderer.domElement.style.cursor = "grab";
    return drag;
  }
  const onPointerCancel = (e) => {
    setHover(null);
    if (finishShelfDrag(e.pointerId)) downAt = null;
    finishStickyDrag(e.pointerId);
    finishNoteDrag(e.pointerId);
    if (lanyardDrag?.pointerId === e.pointerId) finishLanyardDrag();
    finishHatDrag(e.pointerId);
    finishChairDrag(e.pointerId);
  };
  const onWindowBlur = () => {
    setHover(null);
    if (finishShelfDrag()) downAt = null;
    finishStickyDrag();
    finishNoteDrag();
    finishLanyardDrag();
    finishHatDrag();
    finishChairDrag();
  };
  const onPointerUp = (e) => {
    if (shelfDrag) {
      if (e.pointerId !== shelfDrag.pointerId) return;
      const drag = finishShelfDrag(e.pointerId);
      if (drag.moved) return;
    }
    if (stickyDrag) {
      if (e.pointerId !== stickyDrag.pointerId) return;
      const drag = finishStickyDrag(e.pointerId);
      if (!drag.moved) handleClick(drag.entry);
      return;
    }
    if (chairDrag && e.pointerId === chairDrag.pointerId) {
      const drag = finishChairDrag(e.pointerId);
      downAt = null;
      if (!drag.moved) handleClick(drag.entry);
      return;
    }
    if (hatDrag && e.pointerId === hatDrag.pointerId) {
      const drag = finishHatDrag(e.pointerId);
      downAt = null;
      if (!drag.moved) handleClick(drag.entry);
      return;
    }
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
    if (shelfDrag || noteDrag || stickyDrag || chairDrag) return;
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
    overview: () => ({ target: [1.8, 3.0, 0.7], dir: [0.48, 0.72, 1] }),
    // Browse the tall collection in close-up, starting at the console and GAME ON sign.
    shelf: () => {
      const fit = [container.clientWidth < 900 ? 5.4 : 6.8, 4.6];
      const visibleH = Math.max(fit[1], fit[0] * container.clientHeight / container.clientWidth);
      const bottom = visibleH / 2 - (container.clientWidth < 600 ? 1.2 : 0.5);
      const shelfTop = (FLOOR_Y + SHELF_H + SHELF_TOP_EXTRA);
      const top = Math.max(bottom, shelfTop - FLOOR_Y + 1.5 - visibleH / 2);
      const y = bottom + (shelfLook - 1.7) / 7.3 * (top - bottom);
      return { target: [shelf.position.x + 0.35, FLOOR_Y + y, shelf.position.z], dir: [0.24, 0.1, 1], fit, depth: 1.6 };
    },
    // Clip only what's well in front of the wall (the monitor), not the board behind the badge
    hero: () => ({ target: [badgePin.x, badgePin.y - (BADGE_PIN.y - BADGE_CLIP.y) - 0.74, BADGE_CLIP.z], dir: [0.06, 0.14, 1], fit: [1.5, 2.1], depth: 0.9 }),
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
    family: () => {
      familyFrame.updateWorldMatrix(true, false);
      familyFrame.localToWorld(screenPos.set(0, 1.1, 0.1));
      familyFrame.getWorldDirection(screenNormal);
      return { target: screenPos.toArray(), dir: screenNormal.toArray(), fit: [1.6, 2.15], depth: 0.9 };
    },
    // Face-on to the phone's screen, whatever angle the stand holds it at
    chat: () => {
      phoneScreen.updateWorldMatrix(true, false);
      phoneScreen.getWorldDirection(screenNormal);
      phoneScreen.getWorldPosition(screenPos);
      // Room above the phone for the back button and below it for the hint, so neither
      // covers the screen (the phone itself is 1.95 tall)
      return { target: screenPos.toArray(), dir: screenNormal.toArray(), fit: [1.3, 2.6] };
    },
    // Square over the postcard where it lands once it slides out of the envelope
    contact: () => {
      // Between the card and the envelope under it, so both stay in frame
      mail.localToWorld(screenPos.set(POSTCARD_OUT.x, POSTCARD_OUT.y, (POSTCARD_OUT.z + ENVELOPE_SETTLE.z) / 2));
      return { target: screenPos.toArray(), dir: [0.02, 1, 0.25], fit: cardReady ? [2.2, 1.95] : [2.45, 3.5] };
    },
    // The sword rack, with room on its left for a sword's card and above it for a slash
    swords: () => {
      katanaRack.getWorldPosition(screenPos);
      return { target: [screenPos.x - 1.6, screenPos.y + 1.1, screenPos.z], dir: [0.12, 0.08, 1], fit: [10.4, 6.8], depth: 3.5 };
    },
    // Close on the gauntlet for the snap, from a little to its right and above
    gauntlet: () => {
      // Framed for the glove hovering above its plinth
      gauntlet.localToWorld(screenPos.set(0, 1.25, 0));
      return { target: screenPos.toArray(), dir: [0.3, 0.3, 1], fit: [3.5, 4.3], depth: 3.8 };
    },
    // Square on the window in the left wall. A shallow clip: the desk's left end sits close to it.
    // The window, with its weather card on the wall to its left
    window: () => ({ target: [windowGroup.position.x + 0.1, windowGroup.position.y + 0.15, windowGroup.position.z + 1.55], dir: [1, 0.08, 0.04], fit: [8.6, 6.2], depth: 1.4 }),
    // Framed a little high, with room under the monitor's chin for the command chips and the
    // hint (they'd sit over the chin otherwise)
    monitor: () => ({ target: [-0.2, 2.25 + RISER_TOP, -2.66], dir: [0.1, 0.32, 1], fit: [5.2, 4.6] }),
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
    if (instant) {
      gsap.killTweensOf(cam);
      Object.assign(cam, to);
    } else if (focus.name === "shelf" && duration <= 0.25) {
      Object.assign(cam, { tx: to.tx, tz: to.tz, dx: to.dx, dy: to.dy, dz: to.dz, zoom: to.zoom, near: to.near });
    } else {
      gsap.killTweensOf(cam);
      gsap.to(cam, { ...to, duration, ease: "power3.inOut" });
    }
  }

  // Where the shelf's close-up looks (its scroll, 1.7–9) to centre a height in the world
  function shelfLookAt(worldY) {
    const fit = [container.clientWidth < 900 ? 5.4 : 6.8, 4.6];
    const visibleH = Math.max(fit[1], fit[0] * container.clientHeight / container.clientWidth);
    const bottom = visibleH / 2 - (container.clientWidth < 600 ? 1.2 : 0.5);
    const shelfTop = (FLOOR_Y + SHELF_H + SHELF_TOP_EXTRA);
    const top = Math.max(bottom, shelfTop - FLOOR_Y + 1.5 - visibleH / 2);
    const norm = top > bottom ? (worldY - FLOOR_Y - bottom) / (top - bottom) : 0;
    return THREE.MathUtils.clamp(1.7 + norm * 7.3, 1.7, 9);
  }

  let arriveTimer = null;
  function setFocus(name, hit = null) {
    if (focus.name === name) return;
    setHover(null);
    stopTyping();
    byFocus.get(focus.name)?.onLeave?.();
    clearTimeout(arriveTimer);
    focus.name = name;
    if (name === "shelf") {
      if (hit?.point) {
        shelfLook = shelfLookAt(hit.point.y);
      } else {
        shelfLook = 1.7;
      }
    }
    catSettle();
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
    const t = hit?.object.userData.tex;
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
    setHover(null);
    if (!entry.focus || focus.name === entry.focus) {
      const hs = entry.focus && hotspotAt(hit);
      if (typing && hs?.id !== typing.id) stopTyping();
      return hs ? runHotspot(hs, entry) : entry.onClick?.(hit);
    }
    entry.onEnter?.(hit);
    setFocus(entry.focus, hit);
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
    const density = pixelRatio();
    renderer.setPixelRatio(density);
    const aspect = w / h;
    // Keep desk props large enough to tap while the room fills the rest of the screen.
    viewH = Math.max(VIEW_H, (aspect < 1 ? 18 : VIEW_W) / aspect);
    camera.left = (-viewH * aspect) / 2;
    camera.right = (viewH * aspect) / 2;
    camera.top = viewH / 2;
    camera.bottom = -viewH / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    sizeComposer();
    outlineResolution.value.set(w, h);
    if (!intro?.isActive()) applyShot(true);
  }

  // Match the canvas at every zoom/density. Slow frames must never lower image sharpness.
  const refreshMs = 1000 / 60;
  let frameMs = 16;
  const postDensity = () => renderer.getPixelRatio();
  function sizeComposer() {
    composer.setPixelRatio(postDensity());
    composer.setSize(container.clientWidth || 1, container.clientHeight || 1);
  }
  // `?perf` in the address shows the frame rate and what the quality has settled on
  const perfReadout = new URLSearchParams(window.location.search).has("perf") ? document.createElement("div") : null;
  if (perfReadout) {
    perfReadout.style.cssText = "position:absolute;right:8px;bottom:8px;z-index:50;padding:4px 8px;font:12px/1.4 ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.7);border-radius:4px;pointer-events:none;white-space:pre";
    container.appendChild(perfReadout);
    timers.push(setInterval(() => {
      const neonShadows = shadowedNeons.some((light) => light.castShadow);
      const intervals = [...frameIntervals].sort((a, b) => a - b);
      const p95 = intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * 0.95))] || 0;
      perfReadout.textContent = `${(1000 / frameMs).toFixed(0)} fps (budget ${(1000 / refreshMs).toFixed(0)}) · resolution locked\npost ${postDensity().toFixed(2)}× · GTAO ${aoPass.enabled ? "on" : "off"} · neon shadows ${neonShadows ? "on" : "off"}\n${drawCalls.toFixed(0)} draws · ${(triangles / 1000).toFixed(0)}k triangles\nCPU submit ${renderMs.toFixed(1)}ms · GPU ${gpuMs === null ? "n/a" : gpuMs.toFixed(1) + "ms"} · frame p95 ${p95.toFixed(1)}ms${benchmark ? " · " + benchmark : ""}`;
    }, 500));
  }

  let frame = null;
  let lastBlink = 0;
  const WORLD_UP = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const target = new THREE.Vector3();
  let lastTick = 0;
  let mainShadowAt = 0;
  const frameIntervals = [];
  const updateToonBatch = benchmark === "no-batch" ? () => {} : createToonBatch(scene, renderer, track);
  [sun, windowLight, lampLight].forEach((light) => {
    light.shadow.autoUpdate = false;
    light.shadow.needsUpdate = true;
  });
  function tick(now) {
    frame = requestAnimationFrame(tick);
    if (document.hidden) {
      lastTick = 0;
      frameIntervals.length = 0;
      return;
    }
    const moving = now < responsiveUntil || gsap.isTweening(cam) || catIdleTl?.isActive() || mouseRunning || lampHopping || trophyCelebrating || lanyardDrag || hatDrag || noteDrag || shelfDrag || stickyDrag;
    // Do not skip presentation frames during interaction. Idle uses a tolerant interval rather
    // than an accumulated deadline, which otherwise creates short/long frame pairs under jitter.
    if (!moving && lastTick && now - lastTick < refreshMs * 0.7) return;
    if (lastTick && perfReadout) {
      frameIntervals.push(now - lastTick);
      if (frameIntervals.length > 180) frameIntervals.shift();
    }
    // Step size for the springs, capped so a background tab doesn't fling them on return
    const dt = Math.min(0.05, lastTick ? (now - lastTick) / 1000 : 0.016);
    if (lastTick) frameMs += (now - lastTick - frameMs) * 0.05;
    lastTick = now;
    updateTicketHover(dt);
    updateTassels(dt);
    updateFx(dt);
    updateTrail(dt);
    updateSpotlight(dt);
    // the chair stands between the camera and the tickets' close-up, so it's put away for it
    chair.visible = focus.name !== "experience";
    poseFolders();
    const pointerBlend = 1 - Math.pow(0.94, dt * 60);
    parallax.x += (parallax.tx - parallax.x) * pointerBlend;
    parallax.y += (parallax.ty - parallax.y) * pointerBlend;
    if (focus.name === "shelf" && !shelfDrag && !gsap.isTweening(cam)) {
      const shot = SHOTS.shelf();
      const blend = 1 - Math.exp(-14 * dt);
      cam.ty += (shot.target[1] - cam.ty) * blend;
    }
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
    updateShelfLeds(now);
    updateCatWatch(now);
    updateCatLife(now);
    updateCatNeck();
    updateSecondHand();
    outside.t += dt;
    outside.rain += (outside.rainTarget - outside.rain) * Math.min(1, dt * 0.35);
    if (Math.abs(outside.rain - (outside.heard ?? -1)) > 0.02) {
      outside.heard = outside.rain;
      setRainLevel(soundMuted ? 0 : outside.rain);
    }
    if (now - outside.drawnAt > (focus.name === "window" ? 33 : 150)) {
      outside.drawnAt = now;
      windowView.userData.tex.redraw();
    }
    plant.rotation.z = Math.sin(now / 1400) * 0.015;
    updateSteam(now);
    updateLampGlow();
    updateRobot(now);
    if (switchGame.live && now - switchDrawnAt > 40) {
      switchDrawnAt = now;
      switchGame.live = now / 1000 - switchGame.start <= SWITCH_GAME;
      switchScreen.userData.tex.redraw(switchGame.live ? now / 1000 : undefined);
    }
    if (now - handheldDrawnAt > 90) {
      handheldDrawnAt = now;
      handheldScreen.userData.tex.redraw(now / 1000);
    }
    updateButterfly(dt, now);
    updatePapers(dt);
    if (!mouseRunning) {
      const blend = 1 - Math.pow(0.82, dt * 60);
      mouse.position.x += (mouseAim.x - mouse.position.x) * blend;
      mouse.position.z += (mouseAim.z - mouse.position.z) * blend;
    }
    for (const { object, plane, baseY, strength } of contactShadows) {
      const lift = Math.max(0, object.position.y - baseY);
      plane.position.x = object.position.x;
      plane.position.z = object.position.z;
      plane.rotation.z = -object.rotation.y;
      plane.scale.setScalar(1 + lift * 0.3);
      // Ambient occlusion now darkens the contact itself; this only softens it under a prop
      // and carries the shadow while the prop is lifted
      plane.material.opacity = (darkNow ? 0.22 : 0.28) * strength / (1 + lift * 3);
      plane.visible = object.visible;
    }
    if (now - lastBlink > 530) {
      lastBlink = now;
      cursorOn = !cursorOn;
      caretOn = !caretOn;
      if (!termBusy) redrawTerminal();
      typing?.redraw();
    }
    if (shelfBubbleTarget === trophy && shelfBubble.sprite.scale.x > 0.01) placeTrophyBubble();
    if (trophyCelebrating) trophy.localToWorld(trophyHalo.position.set(0, 0.9, -0.2));
    if (catBubble.sprite.scale.x > 0.01) placeCatBubble(1 - Math.exp(-10 * dt));
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
    // Moving props need primary shadows in the same frame, not a delayed 30Hz silhouette.
    if (moving || now >= mainShadowAt) {
      mainShadowAt = now + 1000 / 30 - 0.5;
      [sun, windowLight, lampLight].forEach((light) => {
        if (light.castShadow && light.intensity > 0) light.shadow.needsUpdate = true;
      });
    }
    updateNeonLights(now, moving);
    updateToonBatch();
    renderFrame();
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
  // Moving the window to a screen of another density doesn't always fire a resize
  let densityQuery = null;
  const watchDensity = () => {
    densityQuery?.removeEventListener("change", onDensityChange);
    densityQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    densityQuery.addEventListener("change", onDensityChange);
  };
  function onDensityChange() {
    resize();
    watchDensity();
  }
  watchDensity();
  resize();
  const settledZoom = cam.zoom;
  cam.zoom = settledZoom * 1.08;
  swing(0.3);
  intro = gsap.to(cam, { zoom: settledZoom, duration: 1.4, ease: "power2.out", delay: 0.15 });
  let firstFrame = true;
  frame = requestAnimationFrame(tick);
  if (previewTrophy) timers.push(setTimeout(celebrateSecrets, 2000));

  return {
    setTheme: setRoomTheme,
    setMuted,
    back,
    focusOn: (name) => SHOTS[name] && setFocus(name),
    runCommand: (cmd) => {
      showTerminal();
      if (focus.name === "monitor") autotype(cmd);
      else setFocus("monitor"), timers.push(setTimeout(() => autotype(cmd), 700));
    },

    destroy() {
      finishShelfDrag();
      finishStickyDrag();
      finishNoteDrag(null, false);
      destroyed = true;
      lofi.destroy();
      setRainLevel(0);
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
      trophyCelebration?.kill();
      gsap.killTweensOf(trophyHalo.material);
      confetti.forEach((bit) => gsap.killTweensOf(bit.material));
      papers.forEach(({ ball }) => gsap.killTweensOf(ball.scale));
      clearTimeout(binBadgeTimer);
      gsap.killTweensOf([cam, stringVibration, stringMat.color, windowGlare.material, glareTex.texture.offset, panelEdge.material.color]);
      boardPinGlints.forEach((glint) => gsap.killTweensOf(glint.material));
      ro.disconnect();
      perfReadout?.remove();
      window.removeEventListener("resize", resize);
      densityQuery?.removeEventListener("change", onDensityChange);
      window.visualViewport?.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keydown", onKonami);
      typer.removeEventListener("input", onTyperInput);
      typer.removeEventListener("keydown", onTyperKey);
      typer.remove();
      impactFlash.remove();
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("pointercancel", onPointerCancel);
      renderer.domElement.removeEventListener("lostpointercapture", onPointerCancel);
      window.removeEventListener("blur", onWindowBlur);
      scene.traverse((o) => gsap.killTweensOf([o.position, o.rotation, o.scale]));
      boardNotes.forEach((note) => gsap.killTweensOf([note.ring.material, note.pinShadow.material, note.shadow.material]));
      disposables.forEach((d) => d.dispose?.());
      sun.shadow.dispose();
      windowLight.shadow.dispose();
      lampLight.shadow.dispose();
      neonLights.forEach(({ light }) => light.shadow?.dispose());
      composer.passes.forEach((pass) => pass.dispose?.());
      composer.dispose();
      if (gpuQuery) gl.deleteQuery(gpuQuery);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
