import * as THREE from "three";
import gsap from "gsap";
import { sfx, GROOVE_BEAT, setRainLevel, initializeAudio } from "@/composables/useSfx";
import { canvasTexture, drawTerminal, drawStickyNote, drawWoodTop, drawBrushedMetal, drawStudioTop, drawVentSlots, drawPerforatedGrille, drawPowerScreen, drawSatinFinish, drawConeRibs } from "../textures";
import { createDesktop, SCREEN_W, SCREEN_H } from "../desktop";
import { createLofi, TRACKS } from "../lofi";
import { PALETTES } from "../sceneConfig";
import { DEFAULT_WOODS } from "../woods";

export function createWorkstation(runtime) {
  // ---------- monitor riser: a wooden shelf the monitor and speakers stand on ----------
  // One board of the desk's own grain on two slab legs, the same wood as the top so it reads as
  // part of the desk, deep enough for the speakers and the monitor's foot
  const RISER_TOP = 0.8;
  const RISER_BOARD = 0.14;
  const RISER_LEG_SHADE = 0.62;
  // Its own print of the grain (not a clone of the desk's), so it can take a different wood
  const riserGrain = canvasTexture(1400, 840);
  drawWoodTop(riserGrain.ctx, 1400, 840, DEFAULT_WOODS.riser);
  const riserWood = riserGrain.texture;
  riserWood.wrapS = riserWood.wrapT = THREE.RepeatWrapping;
  // the grain at the desk's scale: its share of the desk's length, and one of its five boards
  riserWood.repeat.set(11.8 / 18, 0.2);
  riserWood.offset.set(0.2, 0.4);
  riserWood.needsUpdate = true;
  runtime.core.track(riserWood);
  const riserMat = runtime.core.toon(PALETTES.light.desk);
  riserMat.map = riserWood;
  const riser = new THREE.Group();
  riser.position.set(-0.25, 0, -3.1);
  runtime.core.scene.add(riser);
  const riserTop = runtime.core.mesh(runtime.core.rbox(11.8, RISER_BOARD, 2.4, 0.05), riserMat, { outline: 0.045 });
  riserTop.position.y = RISER_TOP - RISER_BOARD / 2;
  riser.add(riserTop);
  // The legs in a deeper shade of the same grain, set in from the ends under an overhang, so
  // they stand apart from the desk top they rest on
  const riserLegMat = runtime.core.toon(PALETTES.light.desk);
  riserLegMat.color.multiplyScalar(RISER_LEG_SHADE);
  riserLegMat.map = riserWood;
  [-5.2, 5.2].forEach((x) => {
    // A thinner outline keeps the short wooden legs readable at their original height.
    const leg = runtime.core.mesh(runtime.core.rbox(0.36, RISER_TOP - RISER_BOARD, 2.1, 0.04), riserLegMat, { outline: 0.018 });
    leg.position.set(x, (RISER_TOP - RISER_BOARD) / 2, 0);
    riser.add(leg);
  });

  // ---------- monitor + terminal ----------
  const monitor = new THREE.Group();
  const MONITOR_SCALE = 62.3 / 42.4;
  monitor.scale.setScalar(MONITOR_SCALE);
  monitor.position.set(-0.4, RISER_TOP, -2.9);
  runtime.core.scene.add(monitor);
  // Studio Display XDR: a thin silver aluminium slab with an even black glass border all round
  // (no chin), on a stand folded from one aluminium sheet, the foot running forward under it
  const brushed = canvasTexture(128, 128);
  runtime.core.track(brushed.texture);
  drawBrushedMetal(brushed.ctx, 128, 128);
  // Soften the existing grain so it reads as a finish rather than broad painted stripes.
  brushed.ctx.fillStyle = "rgba(255,255,255,0.82)";
  brushed.ctx.fillRect(0, 0, 128, 128);
  brushed.texture.wrapS = brushed.texture.wrapT = THREE.RepeatWrapping;
  brushed.texture.repeat.set(2, 3);
  brushed.texture.needsUpdate = true;
  // One silver for the display, its stand and the Mac Studio, so the three read as one set
  const SILVER = "#dcdee0";
  const aluminium = runtime.core.toon("#c8cbce");
  aluminium.map = brushed.texture;
  // Modelled at 4.24 units wide, then uniformly scaled to a real 62.3 cm display.
  // All scene dimensions use 10 cm/unit. The screen itself keeps the desktop's
  // 5:3, so the body stands a little taller than the real 16:9 one.
  const SCREEN_Y = 2.13;
  // The stand's side profile (z forward, y up) as a centre line: the foot plate back from its
  // front lip, a rounded fold at its rear, and the arm rising forward to the hinge behind the
  // panel. The sheet is that line thickened, extruded across the stand's width.
  // Stand proportions are modelled locally, then scaled together with the 62.3 cm panel:
  // a foot about 1.1 deep and under a third of the panel's width
  const STAND_W = 1.2;
  const STAND_T = 0.045;
  const FOLD_R = 0.14;
  const armTop = new THREE.Vector2(-0.28, SCREEN_Y - 0.33);
  const standLine = [new THREE.Vector2(0.26, STAND_T / 2), new THREE.Vector2(-0.62, STAND_T / 2)];
  const foldCentre = new THREE.Vector2(-0.62, STAND_T / 2 + FOLD_R);
  const armAngle = Math.atan2(armTop.y - foldCentre.y, armTop.x - foldCentre.x);
  for (let i = 1; i <= 12; i++) {
    const a = Math.PI + (armAngle - Math.PI) * (i / 12);
    standLine.push(new THREE.Vector2(foldCentre.x - FOLD_R * Math.sin(a), foldCentre.y + FOLD_R * Math.cos(a)));
  }
  standLine.push(armTop);
  const sideA = [];
  const sideB = [];
  standLine.forEach((p, i) => {
    const prev = standLine[Math.max(0, i - 1)];
    const next = standLine[Math.min(standLine.length - 1, i + 1)];
    const t = next.clone().sub(prev).normalize();
    const n = new THREE.Vector2(-t.y, t.x).multiplyScalar(STAND_T / 2);
    sideA.push(p.clone().add(n));
    sideB.push(p.clone().sub(n));
  });
  const standShape = new THREE.Shape([...sideA, ...sideB.reverse()]);
  const standGeo = new THREE.ExtrudeGeometry(standShape, {
    depth: STAND_W - 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2,
  });
  // shape x runs along z, its extrusion across x
  standGeo.rotateY(-Math.PI / 2);
  standGeo.translate((STAND_W - 0.02) / 2, 0, 0);
  // The stand sits in the panel's shadow and its sheet is a few units long, where the shared
  // grain would read as broad stripes: a finer grain and a little glow of its own keep it the
  // same silver as the display and the Mac Studio
  const footMat = runtime.core.toon(SILVER);
  const standGrain = runtime.core.track(brushed.texture.clone());
  standGrain.repeat.set(8, 12);
  standGrain.needsUpdate = true;
  footMat.map = standGrain;
  footMat.emissive.set(SILVER);
  footMat.emissiveIntensity = 0.12;
  const stand = runtime.core.mesh(standGeo, footMat, { outline: 0.015 });
  // A thin dark rubber pad under the foot, and the hinge block the arm meets on the back
  const hingeMat = runtime.core.toon("#1c1d21");
  const footPad = runtime.core.mesh(runtime.core.rbox(STAND_W - 0.12, 0.01, 0.78, 0.004), hingeMat, { outline: 0, cast: false });
  footPad.position.set(0, -0.003, -0.18);
  const mount = runtime.core.mesh(runtime.core.rbox(0.86, 0.5, 0.16, 0.05), aluminium, { outline: 0.012 });
  mount.position.set(0, armTop.y + 0.08, -0.2);
  monitor.add(stand, footPad, mount);
  // The screen runs from x -2.0 to 2.0 and 1.2 either side of SCREEN_Y; the black glass border
  // is 0.08 round it and the aluminium shows only as a hairline rim. Seen from above, the
  // body's top face thickens the top edge and its bottom rim hides, so the bottom border is a
  // little deeper and the aluminium below it deeper still
  const CHIN = 0.035;
  const RIM = 0.03;
  const silverMat = runtime.core.toon(SILVER);
  silverMat.map = brushed.texture;
  const body = runtime.core.mesh(runtime.core.rbox(4.24, 2.62 + CHIN + RIM, 0.2, 0.06), silverMat, { outline: 0.03 });
  body.position.set(0, SCREEN_Y - (CHIN + RIM) / 2, -0.03);
  const bezel = runtime.core.mesh(runtime.core.rbox(4.18, 2.56 + CHIN, 0.02, 0.045), runtime.core.toon("#0d0e10"), { outline: 0, cast: false });
  bezel.position.set(0, SCREEN_Y - CHIN / 2, 0.075);
  monitor.add(body, bezel);
  // The details: a thin black border round the panel and the camera in the top border
  // between the bezel's face (z 0.085) and the screen (z 0.09)
  const panelEdge = runtime.core.mesh(runtime.core.rbox(4.08, 2.44, 0.006, 0.002), runtime.core.toon("#1a1714"), { outline: 0, cast: false });
  panelEdge.position.set(0, SCREEN_Y, 0.084);
  // in the strip of border above the panel
  const webcam = new THREE.Mesh(runtime.core.track(new THREE.CircleGeometry(0.018, 16)), runtime.core.track(new THREE.MeshBasicMaterial({ color: "#23262c" })));
  webcam.position.set(0, SCREEN_Y + 1.242, 0.087);
  const webcamLens = new THREE.Mesh(runtime.core.track(new THREE.CircleGeometry(0.008, 12)), runtime.core.track(new THREE.MeshBasicMaterial({ color: "#3d5a8c" })));
  webcamLens.position.set(0, SCREEN_Y + 1.242, 0.088);
  [panelEdge, webcam, webcamLens].forEach((part) => (part.raycast = runtime.core.noRaycast));
  monitor.add(panelEdge, webcam, webcamLens);

  // ---------- Mac Studio: on the riser, right of the display's foot ----------
  // The same brushed silver as the display: a tall square block with tight rounded corners and
  // softly eased top edges, a dark whole-apple badge on its top, on a dark round foot with vents
  // round it. Two USB-C ports and an SD slot low on its front, the status light at its lower right;
  // a perforated grille across the back's lower half, with the ports in a row above it.
  const STUDIO_W = 1.2;
  const STUDIO_H = 0.58;
  const STUDIO_LIFT = 0.055;
  const macStudio = new THREE.Group();
  const STUDIO_SCALE = 19.7 / 12;
  const STUDIO_SCALE_Y = 0.95 / (STUDIO_H + STUDIO_LIFT); // 9.5 cm including the foot
  macStudio.scale.set(STUDIO_SCALE, STUDIO_SCALE_Y, STUDIO_SCALE);
  macStudio.position.set(2.25, RISER_TOP, -3.1);
  macStudio.rotation.y = -0.1;
  runtime.core.scene.add(macStudio);
  const studioBevel = 0.035;
  const STUDIO_LID = STUDIO_W - 2 * studioBevel;
  const studioGeo = new THREE.ExtrudeGeometry(runtime.core.roundedRectShape(STUDIO_LID, STUDIO_LID, 0.18 - studioBevel), {
    depth: STUDIO_H - 2 * studioBevel, bevelEnabled: true, bevelThickness: studioBevel, bevelSize: studioBevel, bevelSegments: 4, curveSegments: 12,
  });
  // stood up: its extrusion runs up y, from the foot's top (the shape's +y to the back)
  studioGeo.rotateX(-Math.PI / 2);
  studioGeo.translate(0, STUDIO_LIFT + studioBevel, 0);
  const studioMat = runtime.core.toon(SILVER);
  studioMat.map = brushed.texture;
  // the lids take the shape's own coordinates as uv, so the top print is stretched over the lid
  const studioTop = canvasTexture(512, 512);
  runtime.core.track(studioTop.texture);
  drawStudioTop(studioTop.ctx, 512, 512, { logo: 0.24 });
  studioTop.texture.repeat.set(1 / STUDIO_LID, 1 / STUDIO_LID);
  studioTop.texture.offset.set(0.5, 0.5);
  studioTop.texture.needsUpdate = true;
  const studioTopMat = runtime.core.toon("#ffffff");
  studioTopMat.map = studioTop.texture;
  const studioBody = runtime.core.mesh(studioGeo, [studioTopMat, studioMat], { outline: 0.018 });
  // the round foot's wall takes its way round along u and the height up v: one slot row round it
  const vents = canvasTexture(64, 16);
  runtime.core.track(vents.texture);
  drawVentSlots(vents.ctx, 64, 16);
  vents.texture.wrapS = vents.texture.wrapT = THREE.RepeatWrapping;
  vents.texture.repeat.set(24, 1);
  vents.texture.needsUpdate = true;
  const ventMat = runtime.core.toon("#ffffff");
  ventMat.map = vents.texture;
  const footMatDark = runtime.core.toon("#1e2024");
  const studioFoot = runtime.core.mesh(new THREE.CylinderGeometry(0.52, 0.46, STUDIO_LIFT, 40, 1, true), ventMat, { outline: 0.005 });
  studioFoot.position.y = STUDIO_LIFT / 2;
  const studioFootPad = runtime.core.mesh(new THREE.CircleGeometry(0.46, 40).rotateX(-Math.PI / 2), footMatDark, { outline: 0, cast: false });
  studioFootPad.position.y = 0.001;
  macStudio.add(studioBody, studioFoot, studioFootPad);
  // the front face is at z STUDIO_W / 2; the ports sit low, two USB-C left of centre, the SD slot beside them
  const STUDIO_FRONT = STUDIO_W / 2 + 0.002;
  const PORT_Y = STUDIO_LIFT + 0.105;
  const portMat = runtime.core.toon("#121316");
  const portTongue = runtime.core.toon("#3b3f46");
  const portChamfer = runtime.core.toon("#a7abb1");
  // a USB-C port on either face: a bright chamfered rim round a dark slot with its tongue
  const usbC = (x, y, z, facing) => {
    const port = new THREE.Group();
    port.position.set(x, y, z);
    port.rotation.y = facing;
    const rim = runtime.core.mesh(runtime.core.rbox(0.024, 0.06, 0.006, 0.01), portChamfer, { outline: 0, cast: false });
    const slot = runtime.core.mesh(runtime.core.rbox(0.016, 0.052, 0.01, 0.006), portMat, { outline: 0, cast: false });
    slot.position.z = 0.001;
    const tongue = runtime.core.mesh(new THREE.BoxGeometry(0.006, 0.04, 0.004), portTongue, { outline: 0, cast: false });
    tongue.position.z = 0.005;
    port.add(rim, slot, tongue);
    port.traverse((o) => (o.raycast = runtime.core.noRaycast));
    macStudio.add(port);
  };
  [-0.4, -0.31].forEach((x) => usbC(x, PORT_Y, STUDIO_FRONT, 0));
  const sdRim = runtime.core.mesh(runtime.core.rbox(0.17, 0.024, 0.006, 0.008), portChamfer, { outline: 0, cast: false });
  sdRim.position.set(-0.14, PORT_Y, STUDIO_FRONT);
  const sdSlot = runtime.core.mesh(runtime.core.rbox(0.155, 0.015, 0.01, 0.006), portMat, { outline: 0, cast: false });
  sdSlot.position.set(-0.14, PORT_Y, STUDIO_FRONT + 0.001);
  // the status light, a small dot near the front's lower right corner
  const LED_X = 0.4;
  const LED_Y = PORT_Y;
  const studioLedMat = runtime.core.track(new THREE.MeshBasicMaterial({ color: "#22c55e" }));
  const studioLed = new THREE.Mesh(runtime.core.track(new THREE.CircleGeometry(0.006, 16)), studioLedMat);
  studioLed.position.set(LED_X, LED_Y, STUDIO_FRONT + 0.002);
  const studioLedRim = new THREE.Mesh(runtime.core.track(new THREE.RingGeometry(0.006, 0.008, 20)), portChamfer);
  studioLedRim.position.set(LED_X, LED_Y, STUDIO_FRONT + 0.001);
  const studioLedHaloMat = runtime.core.track(new THREE.MeshBasicMaterial({ color: "#22c55e", transparent: true, opacity: 0.65, depthWrite: false }));
  const studioLedHalo = new THREE.Mesh(runtime.core.track(new THREE.CircleGeometry(0.02, 16)), studioLedHaloMat);
  studioLedHalo.position.set(LED_X, LED_Y, STUDIO_FRONT + 0.0015);
  [sdRim, sdSlot, studioLed, studioLedRim, studioLedHalo].forEach((part) => (part.raycast = runtime.core.noRaycast));
  macStudio.add(sdRim, sdSlot, studioLed, studioLedRim, studioLedHalo);
  // the back, seen from behind (so its x runs the other way): the perforated grille low across
  // it, and above it power, ethernet, HDMI, two USB-A, four USB-C and the headphone jack
  const STUDIO_BACK = -STUDIO_W / 2 - 0.002;
  const grille = canvasTexture(512, 128);
  runtime.core.track(grille.texture);
  drawPerforatedGrille(grille.ctx, 512, 128);
  grille.texture.needsUpdate = true;
  const grilleMat = runtime.core.track(new THREE.MeshBasicMaterial({ map: grille.texture, transparent: true }));
  const grillePanel = new THREE.Mesh(runtime.core.track(new THREE.PlaneGeometry(STUDIO_W - 0.24, 0.2)), grilleMat);
  grillePanel.rotation.y = Math.PI;
  grillePanel.position.set(0, STUDIO_LIFT + 0.14, STUDIO_BACK);
  const BACK_Y = STUDIO_LIFT + 0.34;
  const power = runtime.core.mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.008, 28), portMat, { outline: 0, cast: false });
  power.rotation.x = Math.PI / 2;
  power.position.set(0.42, BACK_Y, STUDIO_BACK);
  const ethernet = runtime.core.mesh(runtime.core.rbox(0.11, 0.08, 0.008, 0.008), portMat, { outline: 0, cast: false });
  ethernet.position.set(0.28, BACK_Y, STUDIO_BACK);
  const hdmi = runtime.core.mesh(runtime.core.rbox(0.1, 0.035, 0.008, 0.006), portMat, { outline: 0, cast: false });
  hdmi.position.set(0.15, BACK_Y, STUDIO_BACK);
  const usbA = [0.03, -0.07].map((x) => {
    const port = runtime.core.mesh(runtime.core.rbox(0.07, 0.03, 0.008, 0.004), portMat, { outline: 0, cast: false });
    port.position.set(x, BACK_Y, STUDIO_BACK);
    return port;
  });
  const backJack = new THREE.Mesh(runtime.core.track(new THREE.CircleGeometry(0.018, 20)), portMat);
  backJack.rotation.y = Math.PI;
  backJack.position.set(-0.46, BACK_Y, STUDIO_BACK - 0.001);
  [grillePanel, power, ethernet, hdmi, backJack, ...usbA].forEach((part) => (part.raycast = runtime.core.noRaycast));
  macStudio.add(grillePanel, power, ethernet, hdmi, backJack, ...usbA);
  [-0.16, -0.23, -0.3, -0.37].forEach((x) => usbC(x, BACK_Y, STUDIO_BACK, Math.PI));
  runtime.core.register(macStudio, {
    onHover: (on) => {
      gsap.to(macStudio.position, { y: RISER_TOP + (on ? 0.06 : 0), duration: 0.25, ease: "power2.out", overwrite: true });
      gsap.to(studioLed.scale, { x: on ? 1.4 : 1, y: on ? 1.4 : 1, duration: 0.25, overwrite: true });
      gsap.to(studioLedHalo.scale, { x: on ? 1.4 : 1, y: on ? 1.4 : 1, duration: 0.25, overwrite: true });
    },
    onClick: () => {
      gsap.fromTo(macStudio.scale, { x: STUDIO_SCALE * 1.04, y: STUDIO_SCALE_Y * 0.94, z: STUDIO_SCALE * 1.04 }, { x: STUDIO_SCALE, y: STUDIO_SCALE_Y, z: STUDIO_SCALE, duration: 0.4, ease: "elastic.out(1.2, 0.4)" });
      toggleComputer();
    },
  });
  // Clamped task light: brushed graphite, rubber end caps and an inset opal lens,
  // all with the same stepped toon shading as the monitor.
  const lightbar = new THREE.Group();
  lightbar.name = "monitor-lightbar";
  lightbar.position.set(0, SCREEN_Y + 1.41, 0.2);
  monitor.add(lightbar);
  const lightbarMetal = runtime.core.toon("#454b55");
  lightbarMetal.map = brushed.texture;
  const lightbarRubber = runtime.core.toon("#20232a");
  const lightbarTrim = runtime.core.toon("#88919b");
  const lightbarBody = runtime.core.mesh(runtime.core.rbox(3.9, 0.105, 0.22, 0.014), lightbarMetal, { outline: 0.012 });
  lightbar.add(lightbarBody);
  [-1, 1].forEach((side) => {
    const cap = runtime.core.mesh(runtime.core.rbox(0.055, 0.108, 0.224, 0.012), lightbarRubber, { outline: 0.008 });
    cap.position.x = side * 1.97;
    const collar = runtime.core.mesh(runtime.core.rbox(0.018, 0.106, 0.222, 0.008), lightbarTrim, { outline: 0 });
    collar.position.x = side * 1.915;
    lightbar.add(cap, collar);
  });
  const lightbarClamp = runtime.core.mesh(runtime.core.rbox(0.34, 0.11, 0.4, 0.025), lightbarRubber, { outline: 0.015 });
  lightbarClamp.position.set(0, -0.065, -0.18);
  const lightbarCounterweight = runtime.core.mesh(runtime.core.rbox(0.32, 0.34, 0.14, 0.035), lightbarMetal, { outline: 0.015 });
  lightbarCounterweight.position.set(0, -0.2, -0.37);
  const lightbarPad = runtime.core.mesh(runtime.core.rbox(0.28, 0.045, 0.16, 0.01), lightbarRubber, { outline: 0 });
  lightbarPad.position.set(0, -0.13, -0.185);
  const lightbarButton = runtime.core.mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.02, 16), lightbarRubber, { outline: 0.006 });
  lightbarButton.position.set(1.64, 0.053, 0);
  const lightbarPowerMark = runtime.core.mesh(runtime.core.rbox(0.012, 0.003, 0.035, 0.002), lightbarTrim, { outline: 0, cast: false });
  lightbarPowerMark.position.set(1.64, 0.065, 0);
  lightbar.add(lightbarClamp, lightbarCounterweight, lightbarPad, lightbarButton, lightbarPowerMark);
  // The lens sits inside a dark lip and throws light forward, away from the screen.
  const lightbarLip = runtime.core.mesh(runtime.core.rbox(3.67, 0.025, 0.13, 0.008), lightbarRubber, { outline: 0.005 });
  lightbarLip.position.set(0, -0.045, 0.055);
  lightbarLip.rotation.x = -0.35;
  const lightbarDiffuserMat = runtime.core.toon("#e4dac5");
  lightbarDiffuserMat.emissive.copy(runtime.lamp.lampLight.color);
  const lightbarDiffuser = runtime.core.mesh(runtime.core.rbox(3.53, 0.015, 0.095, 0.005), lightbarDiffuserMat, { outline: 0, cast: false });
  lightbarDiffuser.position.set(0, -0.062, 0.065);
  lightbarDiffuser.rotation.x = -0.35;
  lightbar.add(lightbarLip, lightbarDiffuser);
  for (let i = -7; i <= 7; i++) {
    const seam = runtime.core.mesh(runtime.core.rbox(0.012, 0.006, 0.087, 0.002), lightbarTrim, { outline: 0, cast: false });
    seam.position.set(i * 0.215, -0.071, 0.07);
    seam.rotation.x = -0.35;
    lightbar.add(seam);
  }
  // A focused task beam needs gentler falloff over the full monitor-to-desk height;
  // inverse-square decay and a 120-degree cone hid the previous light in the toon bands.
  // Widen the task beam to cover the longer bar without another shadow-map sampler.
  const lightbarLight = new THREE.SpotLight(runtime.lamp.lampLight.color, 0, 7, Math.PI / 4, 0.55, 0);
  lightbarLight.position.set(0, -0.09, 0.14);
  lightbarLight.target.position.set(0, -4.65, 3.2);
  lightbarLight.shadow.mapSize.set(512, 512);
  lightbarLight.shadow.camera.near = 0.1;
  lightbarLight.shadow.bias = -0.0002;
  lightbarLight.shadow.normalBias = 0.02;
  lightbarLight.shadow.radius = 4;
  lightbar.add(lightbarLight, lightbarLight.target);
  lightbar.traverse((part) => (part.raycast = runtime.core.noRaycast));
  lightbarBody.raycast = THREE.Mesh.prototype.raycast;
  lightbarButton.raycast = THREE.Mesh.prototype.raycast;
  // Like the lamp, the bar comes on for the night and goes off for the day (see setTheme), and
  // its button switches it at any hour
  let lightbarOn = false;
  const lightbarState = { power: 0 };
  function updateLightbar() {
    const power = lightbarState.power;
    lightbarLight.color.copy(runtime.lamp.lampLight.color);
    lightbarLight.intensity = 9 * power;
    lightbarLight.castShadow = power > 0.05;
    lightbarDiffuserMat.emissive.copy(runtime.lamp.lampLight.color);
    lightbarDiffuserMat.emissiveIntensity = 1.4 * power;
  }
  function setLightbar(on, duration = 0) {
    lightbarOn = on;
    if (typeof gsap === "undefined" || !duration) {
      lightbarState.power = on ? 1 : 0;
      updateLightbar();
      return;
    }
    gsap.killTweensOf(lightbarState);
    gsap.to(lightbarState, { power: on ? 1 : 0, duration, ease: "power2.out", onUpdate: updateLightbar });
  }
  function toggleLightbar() {
    if (typeof gsap !== "undefined") {
      gsap.fromTo(lightbarButton.position, { y: 0.043 }, { y: 0.053, duration: 0.14, ease: "power2.out" });
    }
    if (typeof sfx !== "undefined") sfx.click();
    setLightbar(!lightbarOn, 0.25);
  }
  // The monitor has the same cyan/pink bias strip. Broad rear-facing sources follow its
  // transform and overlap on the wall; they never paint over shadows with a glow plane.
  const monitorGlowMat = { opacity: 0 };
  [["#00e0c6", -1], ["#ff90e8", 1]].forEach(([color, x]) => {
    runtime.room.stripLight(color, () => 2 * monitorGlowMat.opacity / 0.7,
      [x, SCREEN_Y, -0.18], [x, SCREEN_Y, -2], monitor);
  });
  // Sticky notes on the right of the bezel, each with a hard little shadow behind it
  const noteShadowMat = runtime.core.track(new THREE.MeshBasicMaterial({ color: "#000000" }));
  [
    // Stuck to the right edge of the body, half hanging off it, clear of the screen
    { text: "ship it", color: "#ffdd00", tick: true, x: 2.18, y: SCREEN_Y + 0.77, rz: -0.12 },
    { text: "drink water!", color: "#ff90e8", x: 2.22, y: SCREEN_Y - 0.48, rz: 0.18 },
  ].forEach((n) => {
    const note = runtime.core.printed(0.62, 0.62, 500, (c, w, h) => drawStickyNote(c, w, h, n));
    const shadow = new THREE.Mesh(runtime.core.track(new THREE.PlaneGeometry(0.62, 0.62)), noteShadowMat);
    shadow.position.set(0.05, -0.05, -0.004);
    shadow.raycast = runtime.core.noRaycast;
    const stuck = new THREE.Group();
    stuck.position.set(n.x, n.y, 0.1);
    stuck.rotation.z = n.rz;
    stuck.add(shadow, note);
    monitor.add(stuck);
    runtime.core.register(note, {
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
  let soundMuted = runtime.options.muted;
  // Music notes: a small pool of sprites, printed once per glyph and colour
  const noteSprites = [["♪", "#ffdd00"], ["♫", "#ff90e8"], ["♪", "#00e0c6"], ["♫", "#7fb2ff"]].map(([glyph, color]) => {
    const tex = canvasTexture(128, 128);
    runtime.core.track(tex.texture);
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
    const sprite = new THREE.Sprite(runtime.core.track(new THREE.SpriteMaterial({ map: noteSprites[i % noteSprites.length], transparent: true, depthWrite: false })));
    sprite.visible = false;
    sprite.raycast = runtime.core.noRaycast;
    runtime.core.scene.add(sprite);
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
  // Satin-painted cabinets and baffles and ribbed paper cones, shared by both
  const satin = canvasTexture(128, 128);
  runtime.core.track(satin.texture);
  drawSatinFinish(satin.ctx, 128, 128);
  const cabinetMat = runtime.core.toon("#2b313a");
  cabinetMat.map = satin.texture;
  const baffleMat = runtime.core.toon("#181d24");
  baffleMat.map = satin.texture;
  const ribs = canvasTexture(256, 64);
  runtime.core.track(ribs.texture);
  drawConeRibs(ribs.ctx, 256, 64);
  const coneMat = runtime.core.toon("#88a8e2");
  coneMat.map = ribs.texture;
  [-5.1, 4.6].forEach((x) => {
    const speaker = new THREE.Group();
    // on a foam isolation pad
    speaker.position.set(x, RISER_TOP + 0.1, -3.55);
    runtime.core.scene.add(speaker);
    const pad = runtime.core.mesh(runtime.core.rbox(0.99, 0.1, 0.89, 0.035), runtime.core.toon("#3b4048"), { outline: 0.015 });
    pad.position.y = -0.05;
    const cabinet = runtime.core.mesh(runtime.core.rbox(0.95, 1.75, 0.85, 0.065), cabinetMat, { outline: 0.028 });
    cabinet.position.y = 0.875;
    const baffle = runtime.core.mesh(runtime.core.rbox(0.83, 1.58, 0.035, 0.045), baffleMat, { outline: 0.009 });
    baffle.position.set(0, 0.9, 0.431);
    // A recessed cone meets its rubber surround; the centre cap sits inside the cone.
    const coneProfile = [[0.278, 0.018], [0.26, 0.012], [0.13, -0.035], [0.09, -0.035]].map(([r, depth]) => new THREE.Vector2(r, depth));
    const woofer = runtime.core.mesh(new THREE.LatheGeometry(coneProfile, 48), coneMat, { outline: 0 });
    woofer.rotation.x = Math.PI / 2;
    woofer.position.set(0, 0.62, 0.49);
    const basket = runtime.core.mesh(new THREE.TorusGeometry(0.322, 0.014, 10, 48), runtime.core.toon("#454e5d"), { outline: 0 });
    basket.position.set(0, 0.62, 0.485);
    const surround = runtime.core.mesh(new THREE.TorusGeometry(0.287, 0.027, 12, 48), runtime.core.toon("#080b10"), { outline: 0 });
    surround.position.set(0, 0.62, 0.498);
    const dustCap = runtime.core.mesh(new THREE.SphereGeometry(0.105, 24, 16), runtime.core.toon("#252b35"), { outline: 0.004 });
    dustCap.scale.z = 0.4;
    dustCap.position.set(0, 0.62, 0.477);
    dustCap.userData.restZ = dustCap.position.z;
    const waveguide = runtime.core.mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 40), runtime.core.toon("#080b10"), { outline: 0.005 });
    waveguide.rotation.x = Math.PI / 2;
    waveguide.position.set(0, 1.25, 0.463);
    const tweeter = runtime.core.mesh(new THREE.SphereGeometry(0.105, 24, 16), runtime.core.toon("#ffdd00"), { outline: 0.004 });
    tweeter.scale.z = 0.38;
    tweeter.position.set(0, 1.25, 0.485);
    const tweeterRim = runtime.core.mesh(new THREE.TorusGeometry(0.128, 0.012, 10, 40), runtime.core.toon("#434c59"), { outline: 0 });
    tweeterRim.position.set(0, 1.25, 0.48);
    const statusX = x < 0 ? -0.24 : 0.24;
    const ledMat = runtime.core.track(new THREE.MeshBasicMaterial({ color: soundMuted ? "#e11d48" : "#16a34a" }));
    const ledHousing = runtime.core.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 28), runtime.core.toon("#080b10"), { outline: 0.005 });
    ledHousing.rotation.x = Math.PI / 2;
    ledHousing.position.set(statusX, 1.55, 0.452);
    const led = new THREE.Mesh(runtime.core.track(new THREE.SphereGeometry(0.045, 20, 14)), ledMat);
    led.scale.z = 0.4;
    led.position.set(statusX, 1.55, 0.46);
    speakerLeds.push(ledMat);
    // Flush fasteners, a small bass port and the power control finish the front panel.
    [-0.35, 0.35].forEach((sx) => [0.18, 1.6].forEach((sy) => {
      const screw = new THREE.Mesh(runtime.core.track(new THREE.CircleGeometry(0.012, 12)), runtime.core.toon("#747c89"));
      screw.position.set(sx, sy, 0.451);
      screw.raycast = runtime.core.noRaycast;
      speaker.add(screw);
    }));
    const port = runtime.core.mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.012, 24), runtime.core.toon("#050608"), { outline: 0 });
    port.rotation.x = Math.PI / 2;
    port.position.set(-0.26, 0.18, 0.455);
    const portRim = runtime.core.mesh(new THREE.TorusGeometry(0.05, 0.007, 8, 24), runtime.core.toon("#434c59"), { outline: 0 });
    portRim.position.set(-0.26, 0.18, 0.46);
    const knob = runtime.core.mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.035, 24), runtime.core.toon("#697383"), { outline: 0.004 });
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0.26, 0.18, 0.465);
    const knobMark = runtime.core.mesh(new THREE.BoxGeometry(0.006, 0.02, 0.004), runtime.core.toon("#f1f1ed"), { outline: 0 });
    knobMark.position.set(0.26, 0.194, 0.485);
    // a small silver nameplate between the port and the knob
    const nameplate = runtime.core.mesh(runtime.core.rbox(0.17, 0.035, 0.01, 0.004), runtime.core.toon("#8a9099"), { outline: 0, cast: false });
    nameplate.position.set(0, 0.18, 0.453);
    speaker.add(pad, nameplate, cabinet, baffle, basket, surround, woofer, dustCap, waveguide, tweeter, tweeterRim, ledHousing, led, port, portRim, knob, knobMark);
    const entry = { group: speaker, woofer, dustCap, tweeter };
    speakers.push(entry);
    runtime.core.register(speaker, {
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
        runtime.options.onEvent("toggleSound");
      },
    });
  });
  // Spotifree on the monitor plays through these: the cones kick with the drums and notes
  // float up on some of the snares
  let noteSide = 0;
  const lofi = createLofi({
    onHit: (kind) => {
      speakers.forEach((speaker) => pump(speaker, kind === "kick" ? 0.7 : 0.35));
      runtime.robot.robotBeat(kind);
      if (kind === "snare" && Math.random() < 0.5) floatNote(speakers[noteSide++ % speakers.length]);
    },
    onTrack: (i) => {
      desktop.notify("spotifree", "Now playing", TRACKS[i].title);
      redrawScreen();
    },
  });
  // The Mac Studio's power: off, the screen goes black and its light out; on, it boots first.
  // `level` fades the screen's spill.
  const computer = { on: false, booting: true, bar: 0 };
  const screenPower = { level: 0.35 };
  // A track asked for while the sound is off: it starts once the speakers are switched on
  let pendingTrack = null;
  function startMusic(index = lofi.index) {
    if (!computer.on) return;
    if (soundMuted) {
      pendingTrack = index;
      runtime.options.onEvent("toggleSound");
      return;
    }
    const fresh = !lofi.playing;
    runtime.secrets.discover("lofi");
    if (lofi.play(index) && fresh) desktop.notify("spotifree", "Now playing", TRACKS[lofi.index].title);
    redrawScreen();
  }
  function setMuted(isMuted) {
    setRainLevel(isMuted ? 0 : runtime.room.outside.rain);
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
        runtime.core.timers.push(setTimeout(() => {
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
  setMuted(runtime.options.muted);

  // Printed at twice its layout size (drawTerminal still works in 640 × 384) so the text stays
  // crisp when the camera zooms right in on the screen
  // The terminal is drawn off screen, then shown in its window on the desktop
  const term = canvasTexture(1280, 768);
  term.ctx.scale(2, 2);
  runtime.core.track(term.texture);
  const screenTex = canvasTexture(SCREEN_W * 2, SCREEN_H * 2);
  screenTex.ctx.scale(2, 2);
  runtime.core.track(screenTex.texture);
  const screen = new THREE.Mesh(runtime.core.track(new THREE.PlaneGeometry(4.0, 2.4)), runtime.core.track(new THREE.MeshBasicMaterial({ map: screenTex.texture })));
  screen.position.set(0, SCREEN_Y, 0.09);
  screen.userData.tex = screenTex;
  monitor.add(screen);
  // The screen's own spill: a cool light over the keyboard and desk, faint by day, and the
  // props in front of it throw shadows towards the visitor at night
  const screenLight = runtime.room.neonLight("#c4d4ff", 2.2, () => screenPower.level * (0.25 + 0.75 * runtime.core.roomLight.night), { distance: 7, shadow: true });
  screenLight.position.set(0, SCREEN_Y - 0.13, 0.9);
  monitor.add(screenLight);
  const desktop = createDesktop({
    terminal: term,
    player: lofi,
    actions: {
      toggle: () => (lofi.playing ? lofi.pause() : startMusic()),
      next: () => lofi.next(),
      prev: () => lofi.restartOrPrev(),
      playTrack: (i) => startMusic(i),
      focus: (name) => runtime.camera.setFocus(name),
      terminalClick: () => autotype(AUTORUN[autorunIndex++ % AUTORUN.length]),
      sound: (name) => sfx[name]?.(),
    },
  });
  let screenDrawnAt = 0;
  let consoleOn = false;
  function redrawScreen() {
    screenDrawnAt = performance.now();
    // The page swaps the terminal's chips and hint for the game's while the TV is on
    if ((desktop.active() === "console") !== consoleOn) {
      consoleOn = !consoleOn;
      runtime.options.onEvent("console", { on: consoleOn });
      // the console is the display's own input, so it lights the screen with the Mac Studio off
      if (!computer.on && !computer.booting) gsap.to(screenPower, { level: consoleOn ? 1 : 0, duration: 0.35, overwrite: true });
    }
    // Off or still starting, the Mac Studio shows black or its boot screen and nothing is clickable
    if (!computer.on && !consoleOn) {
      screenTex.ctx.save();
      screenTex.ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawPowerScreen(screenTex.ctx, SCREEN_W * 2, SCREEN_H * 2, { booting: computer.booting, progress: computer.bar });
      screenTex.ctx.restore();
      screenTex.hotspots = [];
      screenTex.texture.needsUpdate = true;
      return;
    }
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
    projects: wrapWords(runtime.options.projects.map((p) => p.id)),
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
    if (!computer.on) return;
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
      runtime.options.onEvent("terminal", { command: cmd });
      if (cmd === "welcome") runtime.core.timers.push(setTimeout(onWelcomed, 150));
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
    if (termBusy || !computer.on) return;
    termBusy = true;
    let i = 0;
    const typeNext = () => {
      if (!computer.on) {
        termBusy = false;
        return;
      }
      if (i < cmd.length) {
        input = cmd.slice(0, ++i);
        sfx.key();
        redrawTerminal();
        runtime.core.timers.push(setTimeout(typeNext, 45 + Math.random() * 50));
      } else {
        runtime.core.timers.push(
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
    if (termBusy || !computer.on) return;
    if (key === "Enter") return execute(input);
    if (key === "Backspace") input = input.slice(0, -1);
    else if (input.length < MAX_INPUT) input += key;
    redrawTerminal();
  }

  // Once the room is in view, the terminal greets whoever just arrived. The greeting stays on
  // screen when they zoom in, so it can be read there; zooming in first types it then.
  const welcome = () => {
    if (welcomed || !computer.on) return;
    welcomed = true;
    autotype("welcome");
  };
  // The greeting lands with a hop of the monitor and the title bar starts flashing
  const onWelcomed = () => {
    if (runtime.camera.focus.name === "monitor") return;
    termAlert = true;
    redrawTerminal();
    gsap.fromTo(monitor.position, { y: RISER_TOP }, { keyframes: [{ y: RISER_TOP + 0.3, duration: 0.15, ease: "power2.out" }, { y: RISER_TOP, duration: 0.4, ease: "bounce.out" }] });
    sfx.ping();
  };

  const showTerminal = () => {
    if (!computer.on) return;
    desktop.exitConsole();
    if (desktop.active() === "terminal") return;
    desktop.launch("terminal");
    redrawScreen();
  };
  // Clicking the Mac Studio shuts the computer down (the music and any game stop, the screen
  // goes black and its light fades) or starts it: the boot screen fills its bar, then the
  // desktop comes back as it was. Clicks while it boots are ignored.
  function bootComputer({ playSound = true, delay = 0.5 } = {}) {
    computer.booting = true;
    computer.bar = 0;
    let playedBootSound = false;
    const cleanGesture = () => {
      ["pointerdown", "keydown"].forEach((evt) => window.removeEventListener(evt, onFirstGesture, true));
    };
    const onFirstGesture = () => {
      cleanGesture();
      if (computer.booting && !playedBootSound) {
        playedBootSound = true;
        sfx.power();
      }
    };
    if (playSound) {
      initializeAudio().then((ready) => {
        if (ready && computer.booting && !playedBootSound) {
          playedBootSound = true;
          sfx.power();
          cleanGesture();
        }
      });
      ["pointerdown", "keydown"].forEach((evt) => window.addEventListener(evt, onFirstGesture, { capture: true, once: true }));
    }
    studioLedMat.color.set("#22c55e");
    studioLedHalo.visible = true;
    gsap.to(studioLedHaloMat, { opacity: 0.65, duration: 0.3, overwrite: true });
    redrawScreen();
    gsap.to(screenPower, { level: 0.35, duration: 0.4, overwrite: true });
    gsap.to(computer, {
      bar: 1,
      duration: 2.2,
      delay,
      ease: "power1.inOut",
      onUpdate: redrawScreen,
      onComplete: () => {
        cleanGesture();
        computer.booting = false;
        computer.on = true;
        sfx.ding();
        gsap.to(screenPower, { level: 1, duration: 0.4, overwrite: true });
        redrawTerminal();
        if (!welcomed) runtime.core.timers.push(setTimeout(welcome, 2000));
      },
    });
  }

  function toggleComputer() {
    if (computer.booting) return;
    gsap.killTweensOf(computer);
    if (computer.on) {
      if (lofi.playing) lofi.pause();
      if (desktop.exitConsole()) redrawScreen();
      computer.on = false;
      sfx.powerDown();
      studioLedMat.color.set("#1f2125");
      gsap.to(studioLedHaloMat, { opacity: 0, duration: 0.25, overwrite: true, onComplete: () => { studioLedHalo.visible = false; } });
      gsap.to(screenPower, { level: 0, duration: 0.35, ease: "power2.in", overwrite: true });
      redrawScreen();
      return;
    }
    bootComputer({ playSound: true, delay: 0.4 });
  }
  const monitorEdgeRest = panelEdge.material.color.clone();
  runtime.core.register(monitor, {
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
      gsap.to(panelEdge.material.color, { r: on ? 0.12 : monitorEdgeRest.r, g: on ? 0.25 : monitorEdgeRest.g, b: on ? 0.23 : monitorEdgeRest.b, duration: 0.25, overwrite: true });
    },
    onPointer: (hit) => {
      if (!computer.on && !consoleOn) return;
      const moved = hit?.object === screen && hit.uv ? desktop.hover(hit.uv.x * SCREEN_W, (1 - hit.uv.y) * SCREEN_H) : desktop.hover(null);
      if (moved) redrawScreen();
    },
    // The console, Snake or Spotifree up front take their keys; anything else goes to the terminal
    onKey: (e) => {
      if (runtime.camera.focus.name !== "monitor") return false;
      if (!computer.on && !consoleOn) return false;
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
  runtime.core.register(lightbar, {
    onClick: () => toggleLightbar(),
    onHover: (on) => {
      gsap.to(lightbarButton.scale, {
        x: on ? 1.25 : 1,
        y: on ? 1.25 : 1,
        z: on ? 1.25 : 1,
        duration: 0.2,
        overwrite: true,
      });
      gsap.to(lightbarPowerMark.scale, {
        x: on ? 1.25 : 1,
        z: on ? 1.25 : 1,
        duration: 0.2,
        overwrite: true,
      });
    },
  });

  // Public state used by the other scene parts.
  return {
    monitor,
    speakers,
    desktop,
    redrawScreen,
    typeKey,
    get termBusy() { return termBusy; },
    showTerminal,
    RISER_TOP,
    macStudio,
    riser,
    redrawTerminal,
    riserGrain,
    riserMat,
    riserLegMat,
    RISER_LEG_SHADE,
    monitorGlowMat,
    lightbarState,
    get lightbarOn() { return lightbarOn; },
    setLightbar,
    updateLightbar,
    screen,
    SCREEN_Y,
    lightbarLight,
    screenLight,
    screenPower,
    get soundMuted() { return soundMuted; },
    get cursorOn() { return cursorOn; },
    set cursorOn(value) { cursorOn = value; },
    lofi,
    get screenDrawnAt() { return screenDrawnAt; },
    bootComputer,
    setMuted,
    computer,
    autotype,
    panelEdge,
  };
}
