import * as THREE from "three";
import gsap from "gsap";
import { sfx } from "@/composables/useSfx";
import { canvasTexture, drawCarbonWeave, drawLeatherGrain, drawChairCrest } from "../textures";

export function createChair(runtime) {
  // Seat height is roughly 60% of desk height, with a full-size back and armrests.
  const chair = new THREE.Group();
  chair.position.set(-3.1, 0, 7.0);
  chair.rotation.y = -0.22;
  runtime.room.room.add(chair);
  const chairFrameMat = runtime.core.toon("#1a1714");
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
    runtime.core.track(tex.texture);
    drawLeatherGrain(tex.ctx, 256, 256, { perforated });
    tex.texture.wrapS = tex.texture.wrapT = THREE.RepeatWrapping;
    tex.texture.repeat.set(repeat, repeat);
    const mat = runtime.core.toon("#35312e");
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
  runtime.core.track(dashTex.texture);
  dashTex.ctx.fillStyle = "#000";
  dashTex.ctx.fillRect(0, 0, 16, 4);
  dashTex.ctx.fillStyle = "#fff";
  dashTex.ctx.fillRect(0, 0, 10, 4);
  dashTex.texture.wrapS = THREE.RepeatWrapping;
  dashTex.texture.magFilter = THREE.NearestFilter;
  const carbonTex = canvasTexture(64, 64);
  runtime.core.track(carbonTex.texture);
  drawCarbonWeave(carbonTex.ctx, 64, 64);
  carbonTex.texture.wrapS = carbonTex.texture.wrapT = THREE.RepeatWrapping;
  carbonTex.texture.repeat.set(6, 6);
  // dimmed, so the weave reads as a subtle dark texture beside the leather
  const carbon = runtime.core.toon("#8f8a86");
  carbon.map = carbonTex.texture;
  // A stitched seam: a thin red tube through a closed loop of points
  const STITCH_LENGTH = 0.09;
  const chairSeam = (points) => {
    const curve = new THREE.CatmullRomCurve3(points, true);
    // each seam gets its own thread, its dashes repeating along its length
    const thread = runtime.core.toon(CHAIR_STITCH);
    thread.alphaMap = dashTex.texture.clone();
    thread.alphaMap.repeat.set(Math.round(curve.getLength() / STITCH_LENGTH), 1);
    runtime.core.track(thread.alphaMap);
    thread.alphaTest = 0.5;
    return runtime.core.mesh(new THREE.TubeGeometry(curve, 480, 0.012, 4, true), thread, { outline: 0, cast: false });
  };

  // Under the cushion a black plastic pan, so the seat reads thick, and the tilt mechanism
  // under that
  const seatBase = runtime.core.mesh(runtime.core.rbox(4.3, 0.3, 3.9, 0.12), chairFrameMat, { outline: 0.04 });
  seatBase.position.y = -2.82;
  const mechanism = runtime.core.mesh(runtime.core.rbox(1.9, 0.34, 2.2, 0.08), chairFrameMat, { outline: 0.03 });
  mechanism.position.set(0, -3.1, 0.2);
  // its tilt knob and recline lever out to one side
  mechanism.add(runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.5, 0.22, 0.5, 0.08), chairFrameMat, { outline: 0.02 }), 1.0, 0, 0.3));
  mechanism.add(runtime.core.at(runtime.core.rod(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.9, 0.05, 0), 0.05, chairFrameMat, 0.015), -1.6, 0, -0.4));
  // The back's proportions are traced from photos of the chair, front, side and rear: a
  // shield-shaped back about 1.5 times as tall as it is wide, its headrest the narrow top of
  // the shield. Side on, its rear is one straight line while its front swells: the headrest is
  // barely half as thick as the lower back, and the wings sweep forward round the sitter, with
  // the lumbar pushing out between them. Its front is leather, with a raised panel stitched
  // round in red; the wings' inner faces are carbon weave, rolling over into leather at their
  // outer edges. Its rear is one smooth leather shell stitched round the edge.
  const BACK_H = 7.0;
  const BACK_DEPTH = 1.25;
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
  // through the middle (a number, or one for each height) and rounding off to nothing at its
  // edges, as one smooth grid in front and one behind, denser toward the edges, so it bends
  // cleanly with no cracks. `bulge(x, y, side)` swells either face (front -1, rear 1) out
  // further in places, and `material(x, y, side)` picks each patch's material. uv in world
  // units.
  const pillow = (halfWidth, height, depth, { cols = 28, rows = 44, centre = () => 0, bulge = () => 0, material = () => 0 } = {}) => {
    const depthOf = typeof depth === "function" ? depth : () => depth;
    const thickness = (x, y) => {
      const edge = depthOf(y) / 2;
      const d = Math.max(0, Math.min(halfWidth(y) - Math.abs(x - centre(y)), y, height - y));
      return edge * Math.sqrt(1 - (1 - Math.min(1, d / edge)) ** 2);
    };
    // how far its surface stands out on that side
    const depthAt = (x, y, side) => thickness(x, y) + bulge(x, y, side);
    const position = [];
    const uv = [];
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
          uv.push(x + Math.sign(x - centre(y)) * (depthOf(y) / 2 - thickness(x, y)), y);
        }
      }
      grids.push({ side, start });
    }
    // each material's patches in one run, so each is one draw
    const runs = [];
    for (const { side, start } of grids) {
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const a = start + j * (cols + 1) + i;
          const c = a + cols + 1;
          const m = material((position[a * 3] + position[(c + 1) * 3]) / 2, (position[a * 3 + 1] + position[(c + 1) * 3 + 1]) / 2, side);
          const run = runs[m] || (runs[m] = []);
          // the front grid faces -z, the rear +z
          if (side < 0) run.push(a, c, a + 1, a + 1, c, c + 1);
          else run.push(a, a + 1, c, a + 1, c + 1, c);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    const index = [];
    runs.forEach((run, m) => {
      geo.addGroup(index.length, run.length, m);
      for (const v of run) index.push(v);
    });
    geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(index);
    return { geo, depthAt, halfWidth, height, centre };
  };

  // The back shell. `y` here is up the back from its middle, `h` up from its foot. Its outline
  // is traced from a straight-on photo: a shield, its narrow rounded top under half the
  // shoulders' width, the sides curving out ever faster to the shoulders, then running down
  // near straight to the seat.
  const BACK_Y = -BACK_H / 2;
  const backWidth = halfWidthAlong(
    [[2.12, 0], [2.2, 1.1], [2.27, 2.3], [2.3, 3.4], [2.3, 4.25], [2.23, 4.5], [2.02, 4.87], [1.77, 5.25], [1.5, 5.62], [1.29, 6.0], [1.13, 6.38], [0.96, 6.76], [0.9, BACK_H]],
    BACK_H,
    0.25,
  );
  // Full depth up to the lumbar, thinning over the shoulders to a slim headrest
  const backDepth = (h) => BACK_DEPTH - 0.6 * THREE.MathUtils.smoothstep(h, 3.6, 6.6);
  // Each height sits forward of the flat rear by however much thinner it is
  const recess = (y) => (BACK_DEPTH - backDepth(y + BACK_H / 2)) / 2;
  // The wings: the centre panel fills the headrest edge to edge, then below WING_TOP its edges
  // run down converging a little while the outline flares out to the shoulders, so each wing
  // starts as a point high on the side and widens down to the seat. Outward of the panel's
  // edge the shell bends forward (-z), sweeping round toward the sitter into a deep U, and
  // swells into a thick rolled cushion faced in leather. From the shoulders down, the back's
  // sides (the wings' outer faces, round the rolled edge) are carbon weave, piped in red where
  // they meet the leather front and rear. The headrest, all panel, stays flat.
  const WING_TOP = 5.85;
  const PANEL_FOOT = 1.08;
  const SIDE_BAND = 0.32;
  const SIDE_TOP = 5.0;
  const panelEdge = (h) => (h >= WING_TOP ? backWidth(h) : PANEL_FOOT + ((backWidth(WING_TOP) - PANEL_FOOT) * h) / WING_TOP);
  const WING_SWELL = 0.45;
  const wingSwell = (x, h) => {
    const inner = panelEdge(h);
    const u = (Math.abs(x) - inner) / (backWidth(h) - inner);
    if (u <= 0 || u >= 1) return 0;
    const fade = THREE.MathUtils.smoothstep(backWidth(h) - inner, 0, 0.7) * THREE.MathUtils.smoothstep(h, 0, 0.6);
    return WING_SWELL * Math.sin(Math.PI * u) ** 0.7 * fade;
  };
  const onSide = (x, h) => h < SIDE_TOP && Math.abs(x) > backWidth(h) - SIDE_BAND;
  // Low down the front also swells forward at the lumbar, easing off toward the rim so the
  // smooth rear shell stays put. `z` tells front (below 0) from rear.
  const BEND = 0.75;
  const LUMBAR = 0.22;
  const lumbar = (x, y) => LUMBAR * Math.exp(-(((y + BACK_H / 2 - 1.8) / 1.1) ** 2)) * THREE.MathUtils.smoothstep(backWidth(y + BACK_H / 2) - Math.abs(x), 0, 0.9);
  const backZ = (x, y, z) => recess(y) - BEND * Math.max(0, Math.abs(x) - panelEdge(y + BACK_H / 2)) ** 2 - (z < 0 ? lumbar(x, y) : 0);
  // Lay a pad built round z = 0 onto the back: up by y0, forward by z0(y), then shaped
  const bent = (geo, y0, z0 = () => 0) => {
    geo.translate(0, y0, 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const z = pos.getZ(i) + z0(y);
      pos.setZ(i, z + backZ(pos.getX(i), y, z));
    }
    geo.computeVertexNormals();
    return geo;
  };
  // Stitching round a pillow's face, `inset` in from its edge, on its front (-1) or rear (1)
  const stitched = (pad, inset, side, y0, z0 = () => 0, bend = backZ) => {
    const run = Array.from({ length: 121 }, (_, k) => inset + ((pad.height - 2 * inset) * k) / 120);
    const edge = (y, sign) => [pad.centre(y) + sign * Math.max(0, pad.halfWidth(y) - inset), y];
    const loop = [...run.map((y) => edge(y, 1)), ...run.slice().reverse().map((y) => edge(y, -1))];
    return chairSeam(loop.map(([x, y]) => new THREE.Vector3(x, y + y0, z0(y + y0) + side * (pad.depthAt(x, y, side) + 0.015) + bend(x, y + y0, side))));
  };
  const backPad = pillow(backWidth, BACK_H, backDepth, {
    cols: 56,
    rows: 160,
    bulge: (x, h, side) => (side < 0 ? wingSwell(x, h) : 0),
    material: (x, h, side) => (onSide(x, h) ? 2 : side > 0 ? 1 : 0),
  });
  const chairBack = runtime.core.mesh(bent(backPad.geo, BACK_Y), [leather, leather, carbon], { outline: 0.06 });
  chairBack.position.set(0, BACK_FOOT + BACK_H / 2, 2.05);
  // reclined about 8 degrees, as the chair stands upright
  chairBack.rotation.x = -0.14;
  chairBack.add(stitched(backPad, 0.12, -1, BACK_Y), stitched(backPad, 0.12, 1, BACK_Y));
  // each side's carbon piped round: up its front edge, over the rim at the shoulder and back
  // down its rear edge
  for (const side of [-1, 1]) {
    const run = Array.from({ length: 121 }, (_, k) => 0.3 + ((SIDE_TOP - 0.3) * k) / 120);
    const at = (h, face) => {
      const x = side * (backWidth(h) - SIDE_BAND);
      return new THREE.Vector3(x, h + BACK_Y, face * (backPad.depthAt(x, h, face) + 0.015) + backZ(x, h + BACK_Y, face));
    };
    chairBack.add(chairSeam([...run.map((h) => at(h, -1)), ...run.slice().reverse().map((h) => at(h, 1))]));
  }
  // The raised centre panel: between the wings, then filling the headrest, sunk a little into
  // the back's front face
  const CENTRE_H = BACK_H - 0.35;
  const centrePad = pillow((h) => Math.min(panelEdge(h + 0.12) - 0.02, backWidth(h + 0.12) - 0.2), CENTRE_H, 0.24, { cols: 28, rows: 110 });
  const centreZ = (y) => -backDepth(y + BACK_H / 2) / 2 + 0.04;
  chairBack.add(runtime.core.mesh(bent(centrePad.geo, BACK_Y + 0.12, centreZ), leatherPanel, { outline: 0.03 }), stitched(centrePad, 0.1, -1, BACK_Y + 0.12, centreZ));
  // the lumbar knob on the left side, a little above the seat
  const KNOB_H = 2.6;
  const knob = runtime.core.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.18, 20), chairFrameMat, { outline: 0.02 });
  knob.rotation.z = Math.PI / 2;
  knob.position.set(-backWidth(KNOB_H) - 0.06, KNOB_H + BACK_Y, backZ(-backWidth(KNOB_H), KNOB_H + BACK_Y, 1));
  chairBack.add(knob);

  // The seat: one thick padded cushion a touch wider than the back, its top stitched round in
  // red, with raised side bolsters, carbon over their tops, running from the back to just
  // short of the front's roll. Built standing up like the back's pads, then laid flat (its
  // rear, y = 0, toward the back), the top of its padding where the cat curls up.
  const SEAT_L = 4.3;
  const SEAT_DEPTH = 1.1;
  const seatWidth = halfWidthAlong([[2.2, 0], [2.35, 2.2], [2.3, SEAT_L]], SEAT_L, 0.7);
  const SEAT_BOLSTER = 0.14;
  const seatBolster = (x, y) =>
    SEAT_BOLSTER *
    THREE.MathUtils.smoothstep(Math.abs(x), 1.3, 1.95) *
    THREE.MathUtils.smoothstep(seatWidth(y) - Math.abs(x), 0, 0.5) *
    (1 - THREE.MathUtils.smoothstep(y, SEAT_L - 1.2, SEAT_L - 0.4));
  const seatPad = pillow(seatWidth, SEAT_L, SEAT_DEPTH, {
    cols: 40,
    rows: 48,
    bulge: (x, y, side) => (side > 0 ? seatBolster(x, y) : 0),
    material: (x, y, side) => (side > 0 && Math.abs(x) > 1.55 && y < SEAT_L - 0.7 ? 1 : 0),
  });
  seatPad.geo.translate(0, -SEAT_L / 2, 0);
  seatPad.geo.computeVertexNormals();
  const chairSeat = new THREE.Group();
  chairSeat.rotation.x = -Math.PI / 2;
  chairSeat.position.y = -1.77 - SEAT_DEPTH / 2;
  chairSeat.add(runtime.core.mesh(seatPad.geo, [leather, carbon], { outline: 0.06 }), stitched(seatPad, 0.2, 1, -SEAT_L / 2, () => 0, () => 0));
  // Gold: a small badge high on the headrest, front and back
  const crestTex = canvasTexture(128, 128);
  runtime.core.track(crestTex.texture);
  drawChairCrest(crestTex.ctx, 128, 128);
  const crestMat = runtime.core.printMaterial(crestTex.texture, { transparent: true });
  const CREST_Y = BACK_H / 2 - 0.85;
  const crestFront = centreZ(CREST_Y) - 0.12 - 0.04 + backZ(0, CREST_Y, -1);
  [[0.55, CREST_Y, crestFront, Math.PI], [0.6, BACK_H / 2 - 0.95, BACK_DEPTH / 2 + 0.03, 0]].forEach(([size, y, z, turn]) => {
    const crest = new THREE.Mesh(runtime.core.track(new THREE.PlaneGeometry(size, size)), crestMat);
    crest.position.set(0, y, z);
    crest.rotation.y = turn;
    crest.raycast = runtime.core.noRaycast;
    chairBack.add(crest);
  });

  const chairPost = runtime.core.mesh(new THREE.CylinderGeometry(0.32, 0.36, 2.6, 20), chairFrameMat, { outline: 0.03 });
  chairPost.position.y = -3.6;
  // the gas lift, in black like the rest of the chair
  const gasLift = runtime.core.mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.7, 16), runtime.core.toon("#3a3735"), { outline: 0.015 });
  gasLift.position.y = -2.4;
  // The back's bracket: an L under the seat that rises up inside the seat's rear edge, under the
  // back, so none of it pokes through the cushion or shows on the back's rear face
  const backPost = new THREE.Group();
  backPost.add(
    runtime.core.rod(new THREE.Vector3(0, -2.38, 1.1), new THREE.Vector3(0, -2.38, 2.12), 0.14, chairFrameMat, 0.03),
    runtime.core.rod(new THREE.Vector3(0, -2.38, 2.12), new THREE.Vector3(0, -1.88, 2.12), 0.14, chairFrameMat, 0.03),
  );
  // Everything above the gas lift turns on it: seat, back and armrests. They're modelled a
  // size up and shrunk to the chair's real proportions against its seat height (the seat
  // about 50 cm up, 55 cm wide, the back 82 cm tall), which keeps it from looking squat.
  const CHAIR_SCALE = 0.82;
  const SEAT_TOP = -1.77 * CHAIR_SCALE;
  const chairTop = new THREE.Group();
  const upholstery = new THREE.Group();
  upholstery.scale.setScalar(CHAIR_SCALE);
  upholstery.add(chairSeat, seatBase, mechanism, chairBack, backPost);
  chairTop.add(upholstery);
  chair.add(chairTop, chairPost, gasLift);
  // A five-star base of flat legs sloping down to the casters, each caster a twin wheel under
  // a hood
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const leg = new THREE.Group();
    leg.rotation.y = -angle;
    const bar = runtime.core.mesh(runtime.core.rbox(2.2, 0.2, 0.36, 0.07), chairFrameMat, { outline: 0.025 });
    bar.position.set(1.1, runtime.room.FLOOR_Y + 0.58, 0);
    bar.rotation.z = -0.08;
    const hood = runtime.core.mesh(runtime.core.rbox(0.36, 0.2, 0.42, 0.08), chairFrameMat, { outline: 0.02 });
    hood.position.set(2.15, runtime.room.FLOOR_Y + 0.4, 0);
    leg.add(bar, hood);
    [-0.1, 0.1].forEach((z) => {
      const wheel = runtime.core.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 16), runtime.core.toon("#2b2827"), { outline: 0.015 });
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(2.15, runtime.room.FLOOR_Y + 0.2, z * 1.8);
      leg.add(wheel);
    });
    chair.add(leg);
  }
  chair.add(runtime.core.at(runtime.core.mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.3, 20), chairFrameMat, { outline: 0.02 }), 0, runtime.room.FLOOR_Y + 0.62, 0));
  // 4D armrests: a bracket out from under the seat, a tall slim stem and a flat padded top
  // As the side view has them: a long flat pad well above the seat, on a thick stem that runs
  // down past the seat's underside before turning in beneath it
  for (const x of [-2.8, 2.8]) {
    const bracket = runtime.core.mesh(runtime.core.rbox(1.7, 0.2, 0.5, 0.06), chairFrameMat, { outline: 0.02 });
    bracket.position.set(x * 0.72, -3.05, 0.6);
    const stem = runtime.core.mesh(runtime.core.rbox(0.3, 2.75, 0.46, 0.1), chairFrameMat, { outline: 0.03 });
    stem.position.set(x, -1.73, 0.6);
    const pad = runtime.core.mesh(runtime.core.rbox(0.6, 0.24, 2.7, 0.1), leatherBox, { outline: 0.03 });
    pad.position.set(x, -0.3, 0.4);
    upholstery.add(bracket, stem, pad);
  }
  // The recline hub either side where the back meets the seat: a round cap, a bracket rising
  // from it up the back's side and another running forward under the seat
  for (const side of [-1, 1]) {
    const hub = runtime.core.mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.26, 28), chairFrameMat, { outline: 0.025 });
    hub.rotation.z = Math.PI / 2;
    hub.position.set(side * 2.5, -2.45, 1.9);
    const upright = runtime.core.mesh(runtime.core.rbox(0.16, 2.1, 0.75, 0.06), chairFrameMat, { outline: 0.02 });
    upright.position.set(side * 2.36, -1.35, 2.1);
    upright.rotation.x = -0.14;
    const runner = runtime.core.mesh(runtime.core.rbox(0.16, 0.45, 1.8, 0.06), chairFrameMat, { outline: 0.02 });
    runner.position.set(side * 2.47, -2.75, 1.0);
    runner.rotation.x = 0.12;
    upholstery.add(hub, upright, runner);
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
    if (Math.abs(drag.turned + coast) > Math.PI) runtime.secrets.discover("chair");
    if (Math.abs(coast) < 0.02) return;
    gsap.to(chairTop.rotation, { y: chairTop.rotation.y + coast, duration: 0.6 + Math.abs(speed) * 60, ease: "power3.out" });
    if (Math.abs(coast) > 1.5) sfx.patter({ duration: 0.4 });
  }
  runtime.core.register(chair, {
    grabTurn: true,
    onHover: (on) => {
      if (!on || chairBusy || gsap.isTweening(chairTop.rotation)) return;
      const y = chairTop.rotation.y;
      gsap.fromTo(chairTop.rotation, { y: y + 0.08 }, { y, duration: 0.9, ease: "elastic.out(1, 0.3)" });
    },
    onClick: () => {
      if (chairBusy) return;
      chairBusy = true;
      runtime.secrets.discover("chair");
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

  // Public state used by the other scene parts.
  return {
    chair,
    chairTop,
    SEAT_TOP,
    grabChair,
    turnChair,
    releaseChair,
    get chairBusy() { return chairBusy; },
  };
}
