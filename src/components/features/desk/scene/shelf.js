import * as THREE from "three";
import gsap from "gsap";
import { sfx } from "@/composables/useSfx";
import { canvasTexture, drawWoodTop } from "../textures";
import { DEFAULT_WOODS } from "../woods";

export function createShelf(runtime) {
  // ---------- shelf (right of the desk): books and a little game collection ----------
  // Bottom to top: game cases and a robot, then manga and a trophy, then a console with
  // stacked controllers under its neon sign. Click anything on it for a little hop.
  const shelf = new THREE.Group();
  // Clear of the About board on the wall (it now hangs to the right, spanning x 15.2–23.4)
  // Full-size 61 × 30 × 132 cm shelving; its contents share the same scale.
  shelf.scale.setScalar(2);
  // Just right of the desk, far enough out that it doesn't hide the plant in the desk's back corner
  shelf.position.set(8.0 + 3.05, runtime.room.FLOOR_Y, runtime.room.WALL_Z + 1.65); // (half its 61 cm width)
  runtime.core.scene.add(shelf);
  const SHELF_W = 3.05;
  const SHELF_D = 1.5;
  const SHELF_H = 6.6;
  let shelfLook = 1.7;
  const BOARD = 0.22;
  // Oak with a visible grain (the desk's wood print, toned warmer and deeper)
  const shelfWood = canvasTexture(512, 512);
  runtime.core.track(shelfWood.texture);
  drawWoodTop(shelfWood.ctx, 512, 512, DEFAULT_WOODS.shelf);
  const shelfMat = runtime.core.toon("#f3d3b0");
  shelfMat.map = shelfWood.texture;
  [-1, 1].forEach((side) => {
    const panel = runtime.core.mesh(runtime.core.rbox(BOARD, SHELF_H, SHELF_D, 0.04), shelfMat, { outline: 0.03 });
    panel.position.set(side * (SHELF_W / 2 - BOARD / 2), SHELF_H / 2, 0);
    shelf.add(panel);
  });
  // The back panel shares the oak grain, toned a little deeper
  const shelfBackMat = runtime.core.toon("#d9a878");
  shelfBackMat.map = shelfWood.texture;
  // (between the side panels, like the shelves, so its ends don't flicker on their outer faces)
  const shelfBack = runtime.core.mesh(runtime.core.rbox(SHELF_W - BOARD * 2 + 0.02, SHELF_H, 0.12, 0.03), shelfBackMat, { outline: 0.025 });
  shelfBack.position.set(0, SHELF_H / 2, -SHELF_D / 2 + 0.06);
  shelf.add(shelfBack);
  // Bay heights follow their contents: 1.78 for the cases, 1.72 for the manga and trophy, and
  // the tall 2.18 at the top for the standing console
  const LEVELS = [0.15, 2.15, 4.09, SHELF_H - BOARD / 2];
  // Each shelf's front edge is its board's own front face, in the board's tone, with the grain
  // at the board's scale (the face maps the whole texture over its 0.22 height, so it takes
  // only the slice the board's 1.5-deep top would show there)
  const lipMat = runtime.core.toon("#f3d3b0");
  lipMat.map = runtime.core.track(shelfWood.texture.clone());
  lipMat.map.wrapS = lipMat.map.wrapT = THREE.RepeatWrapping;
  lipMat.map.repeat.set(1, BOARD / SHELF_D);
  // Recessed diffusers sit flush under the rear of each shelf; all bays share one colour.
  const glowTex = canvasTexture(256, 128);
  runtime.core.track(glowTex.texture);
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
    // Fitted between the side panels, its ends a hair into them: run out to the panels' outer
    // faces, the two shared a plane there and flickered over each other. (A box's faces run +x,
    // -x, +y, -y, +z, -z: the front, +z, takes the front edge's grain.)
    const board = runtime.core.mesh(runtime.core.rbox(SHELF_W - BOARD * 2 + 0.02, BOARD, SHELF_D, 0.04), [shelfMat, shelfMat, shelfMat, shelfMat, lipMat, shelfMat], { outline: 0.025 });
    board.position.y = y;
    shelf.add(board);
    if (i === 0) return;
    const channel = runtime.core.mesh(runtime.core.rbox(SHELF_W - 0.5, 0.055, 0.12, 0.015), runtime.core.toon("#454b50"), { outline: 0.008, cast: false });
    channel.position.set(0, y - BOARD / 2 - 0.0275, -0.48);
    channel.raycast = runtime.core.noRaycast;
    const ledMat = runtime.core.track(new THREE.MeshBasicMaterial({ color: "#c4cece" }));
    const strip = new THREE.Mesh(runtime.core.track(new THREE.BoxGeometry(SHELF_W - 0.6, 0.018, 0.045)), ledMat);
    strip.position.set(0, y - BOARD / 2 - 0.055, -0.435);
    strip.raycast = runtime.core.noRaycast;
    const glowMat = runtime.core.track(new THREE.MeshBasicMaterial({ map: glowTex.texture, color: "#70e5e0", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    const glow = new THREE.Mesh(runtime.core.track(new THREE.PlaneGeometry(SHELF_W - 0.5, 1.6)), glowMat);
    glow.position.set(0, y - BOARD / 2 - 0.8, -0.619);
    glow.raycast = runtime.core.noRaycast;
    shelf.add(channel, strip, glow);
    shelfLeds.push({ ledMat, glowMat });
  });
  // The LEDs' colour on the shelves, party hues included: one light per two compartments, level
  // with the board between them (every light is paid for on every pixel, so they're kept few).
  // Held out in front of the shelf: toon shading lights a face even from behind, so a light
  // inside the board burnt a bright disc onto its top.
  const shelfLights = [LEVELS[1], LEVELS[3]].map((y) => {
    const light = runtime.room.neonLight("#70e5e0", 3.2, () => shelfLeds[0].glowMat.opacity / 0.5, { distance: 3.6 });
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
      ledMat.color.set(runtime.theme.darkNow || party ? ledColor : "#c4cece");
      glowMat.color.copy(ledColor);
      glowMat.opacity = party ? 0.7 : runtime.core.roomLight.night * 0.5;
    });
  }
  // A neon sign on the back panel above the console, in the top bay: "GAME ON" with a little controller. By
  // day its glass tubes sit unlit; at night it flickers on and glows
  const NEON = { x: 0.22, w: 1.3, h: 0.448 };
  const neonSign = (lit) => {
    const t = canvasTexture(1160, 400);
    runtime.core.track(t.texture);
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
  const neonOff = new THREE.Mesh(runtime.core.track(new THREE.PlaneGeometry(NEON.w, NEON.h)), runtime.core.track(new THREE.MeshBasicMaterial({ map: neonSign(false), transparent: true, depthWrite: false })));
  const neonOn = new THREE.Mesh(runtime.core.track(new THREE.PlaneGeometry(NEON.w, NEON.h)), runtime.core.track(new THREE.MeshBasicMaterial({ map: neonSign(true), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })));
  [neonOff, neonOn].forEach((plane, i) => {
    // low enough that the shelf above doesn't hide its top from the room, and near the middle so
    // the side panel doesn't cut off the end of "GAME"
    plane.position.set(NEON.x, LEVELS[2] + 1.95, -SHELF_D / 2 + 0.14 + i * 0.01);
    plane.raycast = runtime.core.noRaycast;
    shelf.add(plane);
  });
  // The sign's magenta-violet spill: on the console and the shelf, with the shelf's things
  // casting back onto the panel
  const signLight = runtime.room.neonLight("#d86bff", 3.5, () => neonOn.material.opacity, { distance: 4, shadow: true });
  signLight.position.set(NEON.x, neonOn.position.y, neonOn.position.z + 0.45);
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
  setNeon(runtime.options.dark, true);
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

  // Public state used by the other scene parts.
  return {
    get ledPartyUntil() { return ledPartyUntil; },
    set ledPartyUntil(value) { ledPartyUntil = value; },
    shelf,
    SHELF_D,
    LEVELS,
    group,
    addItem,
    standOn,
    SHELF_H,
    shelfItems,
    setNeon,
    get shelfLook() { return shelfLook; },
    set shelfLook(value) { shelfLook = value; },
    SHELF_W,
    neonOn,
    shelfWood,
    shelfMat,
    shelfBackMat,
    lipMat,
    signLight,
    updateShelfLeds,
  };
}
