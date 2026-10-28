import * as THREE from "three";
import { canvasTexture, drawSatinFinish } from "../textures";

export function createShelfConsole(runtime) {
  const PALETTE = ["#ff6b6b", "#ffdd00", "#00e0c6", "#ff90e8", "#8fd694", "#3b82f6", "#ffb35c", "#c4b5fd", "#fffdf5"];
  const black = runtime.core.toon("#1a1714");

  // Level 0: a PS5 Pro standing on its end, after the reference photo. A gloss-black core
  // between two white side panels, each a tall sweep that flares out at its top front and is
  // cut across the middle by three black fins; a blue light runs up the front edges of the
  // core, and the whole thing stands on a round silver foot.
  const PS_H = 1.62;
  const PS_D = 0.86;
  const CORE_T = 0.26;
  const PANEL_T = 0.055;
  const psWhite = runtime.core.toon("#ffffff");
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
  const core = runtime.core.at(runtime.core.mesh(runtime.core.rbox(CORE_T, PS_H * 0.95, PS_D * 0.9, 0.04), black, { outline: 0.016 }), 0, PS_H * 0.475 + 0.01, -0.01);
  consoleBody.add(core);
  // The three fins: black slats across each panel's face, slanting up toward the front
  const FINS = [0.4, 0.445, 0.49];
  [-1, 1].forEach((side) => {
    const x = side * (CORE_T / 2 + PANEL_T / 2 + 0.004);
    const panel = runtime.core.at(runtime.core.mesh(panelGeo, psWhite, { outline: 0.016 }), x, 0, 0);
    consoleBody.add(panel);
    FINS.forEach((k, i) => {
      const fin = runtime.core.mesh(runtime.core.rbox(0.02, 0.028, PS_D * (0.98 - i * 0.02), 0.01), black, { outline: 0.006, cast: false });
      fin.position.set(x + side * (PANEL_T / 2 + 0.008), PS_H * k, 0.01);
      fin.rotation.x = -0.16;
      consoleBody.add(fin);
    });
  });
  // The blue light, up the front edge of the core on either side
  const led = new THREE.Group();
  const ledMat = runtime.core.track(new THREE.MeshBasicMaterial({ color: "#4f6bff" }));
  [-1, 1].forEach((side) => {
    const strip = new THREE.Mesh(runtime.core.track(new THREE.BoxGeometry(0.014, PS_H * 0.82, 0.014)), ledMat);
    strip.position.set(side * (CORE_T / 2 - 0.012), PS_H * 0.48, PS_D * 0.45 - 0.004);
    led.add(strip);
  });
  // The LED's glow on the shelf round the console, blue in standby and brighter once it boots
  const consoleLight = runtime.room.neonLight("#4f6bff", 0.6, () => (0.4 + 0.6 * runtime.core.roomLight.night), { distance: 1.8, tint: ledMat });
  consoleLight.position.set(0, PS_H * 0.5, PS_D * 0.45 + 0.2);
  led.add(consoleLight);
  consoleBody.add(led);
  // PlayStation logo, small, near the top front of the left panel
  const psLogo = runtime.core.printed(0.075, 0.075, 1200, (c, w, h) => {
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
  const psFoot = runtime.shelf.group(
    runtime.core.at(runtime.core.mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.035, 36), runtime.core.toon("#2a2d33"), { outline: 0.012 }), 0, 0.0175, 0),
    runtime.core.at(runtime.core.mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.02, 36), runtime.core.toon("#c9ced6"), { outline: 0 }), 0, 0.045, 0),
  );
  psFoot.scale.z = 1.6;
  const ps5 = runtime.shelf.addItem(runtime.core.at(runtime.shelf.group(psFoot, consoleBody), -1.5, runtime.shelf.standOn(0), 0.05), "console");
  // Turned three-quarters on to the room, so its white side shows as well as its front
  ps5.rotation.y = -0.5;
  const padFinish = canvasTexture(128, 128);
  runtime.core.track(padFinish.texture);
  drawSatinFinish(padFinish.ctx, 128, 128, { grain: 0.06 });
  padFinish.texture.wrapS = padFinish.texture.wrapT = THREE.RepeatWrapping;
  padFinish.texture.repeat.set(4, 4);
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
    const light = color === "#fffdf5";
    const body = runtime.core.toon(color);
    body.map = padFinish.texture;
    if (!light) {
      body.emissive.set("#4a4d55");
      body.emissiveIntensity = 0.12;
    }
    const pad = runtime.shelf.group(runtime.core.mesh(bodyGeo, body, { outline: 0.016 }));
    const seamMat = runtime.core.toon(light ? "#a6adb5" : "#42464e");
    const seamGeo = bodyGeo.clone();
    seamGeo.scale(1.012, 0.055, 1.012);
    pad.add(runtime.core.mesh(seamGeo, seamMat, { outline: 0, cast: false }));
    // Modern-gamepad layout (as in the reference): offset sticks, the left one up top beside a
    // d-pad below; colour-coded face buttons; a round home button and three small ones between
    const TOP = 0.087;
    const controlPlastic = runtime.core.toon(light ? "#43474e" : "#45484e");
    controlPlastic.map = padFinish.texture;
    const screwSlot = runtime.core.toon(light ? "#535860" : "#8b929c");
    // Small casing screws sit in the continuous moulded-plastic shell.
    [-1, 1].forEach((side) => {
      const screw = runtime.core.mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.005, 12), seamMat, { outline: 0, cast: false });
      screw.position.set(side * 0.27, TOP, 0.16);
      const slot = runtime.core.mesh(new THREE.BoxGeometry(0.018, 0.002, 0.003), screwSlot, { outline: 0, cast: false });
      slot.position.set(side * 0.27, TOP + 0.0035, 0.16);
      pad.add(screw, slot);
    });
    // Sticks and d-pad in a contrasting grey on each pad, so they read at shelf distance
    const knob = runtime.core.toon(light ? "#43474e" : "#5a6069");
    knob.map = padFinish.texture;
    const well = runtime.core.toon(light ? "#9aa1ab" : "#313740");
    const stick = (x, z) => {
      pad.add(runtime.core.at(runtime.core.mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.01, 28), well, { outline: 0 }), x, TOP + 0.004, z));
      pad.add(runtime.core.at(runtime.core.mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.05, 16), knob, { outline: 0.006 }), x, TOP + 0.03, z));
      pad.add(runtime.core.at(runtime.core.mesh(new THREE.CylinderGeometry(0.068, 0.066, 0.026, 28), knob, { outline: 0.012 }), x, TOP + 0.062, z));
      const rim = runtime.core.mesh(new THREE.TorusGeometry(0.056, 0.012, 8, 28), runtime.core.toon(light ? "#2a2d32" : "#6b717a"), { outline: 0 });
      rim.rotation.x = Math.PI / 2;
      pad.add(runtime.core.at(rim, x, TOP + 0.076, z));
      const thumb = runtime.core.mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.003, 24), controlPlastic, { outline: 0, cast: false });
      pad.add(runtime.core.at(thumb, x, TOP + 0.076, z));
      const ribGeo = new THREE.BoxGeometry(0.008, 0.004, 0.013);
      for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI / 6;
        const rib = runtime.core.mesh(ribGeo, knob, { outline: 0, cast: false });
        rib.position.set(x + Math.sin(angle) * 0.059, TOP + 0.087, z + Math.cos(angle) * 0.059);
        rib.rotation.y = angle;
        pad.add(rib);
      }
    };
    stick(-0.3, -0.04);
    stick(0.14, 0.11);
    // d-pad in its dish
    pad.add(runtime.core.at(runtime.core.mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.01, 28), well, { outline: 0 }), -0.14, TOP + 0.004, 0.11));
    pad.add(runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.14, 0.03, 0.046, 0.01), knob, { outline: 0.01 }), -0.14, TOP + 0.02, 0.11));
    pad.add(runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.046, 0.03, 0.14, 0.01), knob, { outline: 0.01 }), -0.14, TOP + 0.02, 0.11));
    // face buttons: caps in their colours with the letter in dark ink, big enough to read
    [[0, -0.075, "Y", "#ffd400"], [0.075, 0, "B", "#ef3b3b"], [0, 0.075, "A", "#3fbf4f"], [-0.075, 0, "X", "#2f7cf6"]].forEach(([dx, dz, letter, cap]) => {
      pad.add(runtime.core.at(runtime.core.mesh(new THREE.CylinderGeometry(0.036, 0.038, 0.03, 20), runtime.core.toon(cap), { outline: 0.01 }), 0.3 + dx, TOP + 0.015, -0.04 + dz));
      const label = runtime.core.printed(0.06, 0.06, 1200, (c, w, h) => {
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
    pad.add(runtime.core.at(runtime.core.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 24), runtime.core.toon(light ? "#2b2e33" : "#3a3e45"), { outline: 0.01 }), 0, TOP + 0.01, -0.15));
    const glow = runtime.core.mesh(new THREE.TorusGeometry(0.028, 0.008, 6, 24), runtime.core.track(new THREE.MeshBasicMaterial({ color: "#f4f6f8" })), { outline: 0 });
    glow.rotation.x = Math.PI / 2;
    pad.add(runtime.core.at(glow, 0, TOP + 0.022, -0.15));
    // view, menu and share
    const small = runtime.core.toon(light ? "#2b2e33" : "#5a5f68");
    [-0.075, 0.075].forEach((x) => pad.add(runtime.core.at(runtime.core.mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.016, 16), small, { outline: 0.008 }), x, TOP + 0.008, -0.05)));
    pad.add(runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.054, 0.016, 0.028, 0.008), small, { outline: 0.008 }), 0, TOP + 0.008, 0.0));
    // bumpers along the top edge, the body's colour
    [-0.34, 0.34].forEach((x) => {
      const bumper = runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.26, 0.07, 0.08, 0.03), controlPlastic, { outline: 0.008 }), x, 0.02, -0.235);
      bumper.rotation.y = -Math.sign(x) * 0.18;
      pad.add(bumper);
    });
    return pad;
  };
  // Each pad on a clear acrylic display stand under the neon sign: a foot, a lip its grips rest
  // on and a back plate it leans on, tipped back so its face looks out at the room
  const PAD_TILT = 1.05;
  const clearStandMat = runtime.core.track(new THREE.MeshToonMaterial({ color: "#dbeafe", transparent: true, opacity: 0.65 }));
  const padStand = () => {
    const stand = runtime.shelf.group(
      runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.9, 0.04, 0.62, 0.015), clearStandMat, { outline: 0.01 }), 0, 0.02, 0),
      runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.84, 0.07, 0.04, 0.012), clearStandMat, { outline: 0.008 }), 0, 0.07, 0.25),
      runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.6, 0.5, 0.03, 0.015), clearStandMat, { outline: 0.008 }), 0, 0.26, -0.14),
    );
    stand.children[2].rotation.x = -(Math.PI / 2 - PAD_TILT);
    return stand;
  };
  const padOnStand = (color, x, turn) => {
    const pad = controller(color);
    pad.rotation.x = PAD_TILT;
    pad.position.set(0, 0.37, 0.04);
    pad.scale.setScalar(0.9);
    const item = runtime.shelf.addItem(runtime.core.at(runtime.shelf.group(padStand(), pad), x, runtime.shelf.standOn(0), 0.12), "controller");
    item.rotation.y = turn;
    // Clicks move the pad on its stand; the stand stays put
    pad.userData.restY = pad.position.y;
    item.userData.moves = pad;
    return item;
  };
  const pad1 = padOnStand("#1a1714", -0.35, 0.1);
  const pad2 = padOnStand("#fffdf5", 0.9, -0.1);

  // Public state used by the other scene parts.
  return {
    PALETTE,
    black,
    led,
    pad1,
    pad2,
    ledMat,
    ps5,
  };
}
