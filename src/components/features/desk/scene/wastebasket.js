import * as THREE from "three";
import gsap from "gsap";
import { sfx } from "@/composables/useSfx";
import { canvasTexture, drawRepBadge, drawCrumpledPaper, drawBinRibs, drawBackboard, drawHoopNet } from "../textures";

export function createWastebasket(runtime) {
  // ---------- wastebasket: office basketball, right of the shelf ----------
  // A teal bin with a mini hoop clipped to its back rim. Click to shoot a crumpled paper ball
  // at it: a swish drops in (the net stretches, the bin squashes), a brick
  // clangs off the rim and rolls away across the floor. Three in a row and it's ON FIRE (a secret).
  const bin = new THREE.Group();
  bin.rotation.y = -0.2;
  bin.scale.setScalar(2);
  // Snug against the shelf's right side, level with its middle (the rim's radius is 0.54)
  bin.position.set(
    runtime.shelf.shelf.position.x + runtime.shelf.SHELF_W * runtime.shelf.shelf.scale.x / 2 + 0.54 * bin.scale.x + 0.02,
    runtime.room.FLOOR_Y,
    runtime.shelf.shelf.position.z,
  );
  runtime.core.scene.add(bin);
  const BIN_H = 1.4;
  const binBody = new THREE.Group();
  bin.add(binBody);
  const binProfile = [
    [0, 0], [0.4, 0], [0.5, BIN_H], [0.55, BIN_H], [0.55, BIN_H + 0.08], [0.47, BIN_H + 0.08], [0.37, 0.08], [0, 0.08],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  // moulded plastic: upright ribs round it and a fine stipple (drawBinRibs), under the teal
  const binRibs = canvasTexture(512, 512);
  runtime.core.track(binRibs.texture);
  drawBinRibs(binRibs.ctx, 512, 512);
  const binMat = runtime.core.toon("#00e0c6");
  binMat.map = binRibs.texture;
  binBody.add(runtime.core.mesh(new THREE.LatheGeometry(binProfile, 28), binMat, { outline: 0.045 }));
  const binRim = runtime.core.mesh(new THREE.TorusGeometry(0.54, 0.045, 8, 32), runtime.core.toon("#1a1714"), { outline: 0 });
  binRim.rotation.x = Math.PI / 2;
  binRim.position.y = BIN_H + 0.06;
  binBody.add(binRim);
  // Close up it wants a little more to it: a dark band round the foot and one under the rim
  // (proud of the tapered side by a hair)
  const binRadius = (y) => 0.4 + (0.1 * y) / BIN_H;
  const bandMat = runtime.core.toon("#008f80");
  [[0.12, 0.1], [BIN_H - 0.2, 0.08]].forEach(([y, h]) => {
    const band = runtime.core.mesh(new THREE.CylinderGeometry(binRadius(y + h / 2) + 0.012, binRadius(y - h / 2) + 0.012, h, 32, 1, true), bandMat, { outline: 0, cast: false });
    band.position.y = y;
    binBody.add(band);
  });
  // A crumpled paper ball: a lumpy, flat-faceted icosahedron (each facet a crushed plane of
  // paper catching the light its own way), squashed a little differently each time and wrapped
  // in a screwed-up sheet: lined notebook paper with pencil scrawl, or a printed page
  const paperMats = [true, false, true, false].map((lined, i) => {
    const sheet = canvasTexture(512, 256);
    runtime.core.track(sheet.texture);
    drawCrumpledPaper(sheet.ctx, 512, 256, { lined, seed: i + 1 });
    return runtime.core.track(new THREE.MeshToonMaterial({ map: sheet.texture, gradientMap: runtime.core.gradient }));
  });
  // Every copy of a corner (the icosahedron's faces don't share vertices) must move the same
  // way or the ball cracks, so the dent comes from a hash of where the corner points
  const dent = (x, y, z, seed) => {
    const v = Math.sin(Math.round(x * 997) * 12.9898 + Math.round(y * 997) * 78.233 + Math.round(z * 997) * 37.719 + seed) * 43758.5453;
    return v - Math.floor(v);
  };
  // World-space radius: both the pile and thrown paper are approximately 6 cm across.
  const PAPER_R = 0.3;
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
    // Bound every crumpled shape by its collision radius, in any spin orientation.
    let maxRadius = 0;
    for (let i = 0; i < p.count; i++) maxRadius = Math.max(maxRadius, tmpV.fromBufferAttribute(p, i).length());
    geo.scale(r / maxRadius, r / maxRadius, r / maxRadius);
    geo.computeVertexNormals();
    return runtime.core.mesh(geo, paperMats[crumpled++ % paperMats.length], { outline: 0.018 });
  };
  // What's already in it, peeking over the rim; a swish adds to the pile (up to full)
  const tmpV = new THREE.Vector3();
  const binPile = [[-0.15, 0.1], [0.18, -0.05], [0.02, 0.2], [-0.05, -0.2], [0.22, 0.18]].map(([x, z], i) => {
    const ball = crumple(PAPER_R / bin.scale.x);
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
  const hoopPost = runtime.core.mesh(runtime.core.rbox(0.07, 0.9, 0.07, 0.02), runtime.core.toon("#1a1714"), { outline: 0.015 });
  hoopPost.position.set(0, BIN_H + 0.42, -0.52);
  // Clamped over the back of the rim, with a screw knob
  const hoopClamp = runtime.core.mesh(runtime.core.rbox(0.16, 0.22, 0.14, 0.03), runtime.core.toon("#1a1714"), { outline: 0.015 });
  hoopClamp.position.set(0, BIN_H + 0.02, -0.53);
  const clampKnob = runtime.core.mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 10), runtime.core.toon("#ff7a1a"), { outline: 0.01 });
  clampKnob.rotation.z = Math.PI / 2;
  clampKnob.position.set(0.11, -0.03, 0);
  hoopClamp.add(clampKnob);
  bin.add(hoopPost, hoopClamp);
  const backboard = runtime.core.mesh(runtime.core.rbox(0.9, 0.6, 0.05, 0.03), runtime.core.toon("#ffdd00"), { outline: 0.025 });
  backboard.position.set(0, 0.28, -0.36);
  // its face (drawBackboard): border, shooter's square, the league's name, bolts and scuffs
  const hoopBoardFace = runtime.core.printed(0.86, 0.56, 420, drawBackboard);
  hoopBoardFace.position.z = 0.027;
  hoopBoardFace.raycast = runtime.core.noRaycast;
  backboard.add(hoopBoardFace);
  const ring = runtime.core.mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 24), runtime.core.toon("#ff7a1a"), { outline: 0.012 });
  ring.rotation.x = Math.PI / 2;
  // the hooks the net hangs from, round the underside of the ring
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const hook = runtime.core.mesh(new THREE.BoxGeometry(0.02, 0.04, 0.02), runtime.core.toon("#c2410c"), { outline: 0, cast: false });
    hook.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0.03);
    ring.add(hook);
  }
  // a diamond mesh of white cord (drawHoopNet), seen from inside as well as out
  const netTex = canvasTexture(256, 128);
  runtime.core.track(netTex.texture);
  drawHoopNet(netTex.ctx, 256, 128);
  netTex.texture.wrapS = THREE.RepeatWrapping;
  const net = new THREE.Mesh(
    runtime.core.track(new THREE.CylinderGeometry(0.22, 0.14, 0.32, 16, 2, true)),
    runtime.core.track(new THREE.MeshBasicMaterial({ map: netTex.texture, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide })),
  );
  net.geometry.translate(0, -0.16, 0);
  net.raycast = runtime.core.noRaycast;
  hoop.add(backboard, ring, net);

  const binTex = canvasTexture(320, 160);
  runtime.core.track(binTex.texture);
  const binBadge = new THREE.Sprite(runtime.core.track(new THREE.SpriteMaterial({ map: binTex.texture, depthTest: false, transparent: true })));
  binBadge.renderOrder = 10;
  binBadge.raycast = runtime.core.noRaycast;
  binBadge.scale.set(0.001, 0.001, 1);
  binBadge.position.set(bin.position.x, runtime.room.FLOOR_Y + HOOP_Y * bin.scale.y + 1.1, bin.position.z);
  runtime.core.scene.add(binBadge);
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
  const MAX_LITTER = 5;
  const PARKED = new THREE.Vector3(0, -100, 0); // hidden balls are parked out of the pointer's way
  const papers = Array.from({ length: MAX_LITTER + 3 }, () => {
    const ball = crumple(PAPER_R);
    ball.position.copy(PARKED);
    ball.visible = false;
    runtime.core.scene.add(ball);
    return { ball, state: "idle", vel: new THREE.Vector3(), spin: new THREE.Vector3(), t: 0, at: 0, swish: false, side: 1, born: 0 };
  });
  const litter = () => papers.filter((p) => p.state === "litter");
  const tmpQ = new THREE.Quaternion();
  const binTop = () => bin.position.y + (BIN_H + 0.08) * bin.scale.y;
  // How far from the bin's axis a ball's centre must stay at a height (its side tapers out)
  const binReach = (y) => (0.4 + 0.15 * THREE.MathUtils.clamp((y - bin.position.y) / (BIN_H * bin.scale.y), 0, 1)) * bin.scale.x + PAPER_R;
  const insideBin = (x, y, z) => y < binTop() + PAPER_R * 0.5 && Math.hypot(x - bin.position.x, z - bin.position.z) < binReach(y);
  // (SHELF_BOX is set further down, before any throw)
  const insideShelf = (x, y, z) => y < SHELF_BOX.y1 + PAPER_R && x > SHELF_BOX.x0 - PAPER_R && x < SHELF_BOX.x1 + PAPER_R && z > SHELF_BOX.z0 - PAPER_R && z < SHELF_BOX.z1 + PAPER_R;
  // Whether a throw's arc, up to its arrival at the hoop, stays out of the bin and the shelf
  function arcClears(from, vel, at) {
    for (let t = 0.02; t <= at; t += 0.02) {
      const x = from.x + vel.x * t;
      const y = from.y + vel.y * t - 0.5 * GRAVITY * t * t;
      const z = from.z + vel.z * t;
      if (insideBin(x, y, z) || insideShelf(x, y, z)) return false;
    }
    return true;
  }
  // Where a throw from the viewer starts: a little below the screen's bottom edge, under the
  // hoop, and a touch nearer the camera so nothing in the room clips it on the way up
  function throwOrigin(hoopAt, across = -0.25) {
    runtime.core.camera.updateMatrixWorld();
    tmpV.copy(hoopAt).project(runtime.core.camera);
    const x = THREE.MathUtils.clamp(tmpV.x + across, -0.9, 0.9);
    return new THREE.Vector3(x, -1.15, tmpV.z).unproject(runtime.core.camera)
      .addScaledVector(runtime.core.camera.getWorldDirection(new THREE.Vector3()), -0.6);
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
    paper.swish = Math.random() < 0.65;
    paper.side = Math.random() < 0.5 ? -1 : 1;
    // Aim through the ring's middle for a swish, or at one side of its rim for a brick, and
    // solve for the launch velocity that gets there in `at` seconds under gravity
    const aim = paper.swish
      ? hoopAt.clone().add(tmpV.set(0, 0.04, 0))
      : hoopAt.clone().add(tmpV.set(paper.side * 0.24 * bin.scale.x, 0.06, 0).applyQuaternion(bin.quaternion));
    // A higher, longer arc until its path clears the bin's side and the shelf beside it: a throw
    // from low down (the shelf's bottom close-up, or litter at the bin's foot) would otherwise
    // go through them. A throw from the viewer that still can't clear the shelf starts further
    // right instead, past the shelf's side.
    const launch = (at) => paper.vel.subVectors(aim, ball.position).divideScalar(at).setY(paper.vel.y + 0.5 * GRAVITY * at);
    for (const across of from ? [null] : [-0.25, 0, 0.25, 0.5, 0.75]) {
      if (!from) ball.position.copy(throwOrigin(hoopAt, across));
      paper.at = THREE.MathUtils.clamp(0.55 + ball.position.distanceTo(aim) * 0.06, 0.7, 1.05);
      for (launch(paper.at); paper.at < 2.2 && !arcClears(ball.position, paper.vel, paper.at); launch(paper.at)) paper.at += 0.1;
      if (arcClears(ball.position, paper.vel, paper.at)) break;
    }
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
      runtime.secrets.discover("trash");
      runtime.gym.burst(hoopAt.x, hoopAt.y + 0.2, hoopAt.z + 0.4);
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
    x0: runtime.shelf.shelf.position.x - runtime.shelf.SHELF_W * runtime.shelf.shelf.scale.x / 2, x1: runtime.shelf.shelf.position.x + runtime.shelf.SHELF_W * runtime.shelf.shelf.scale.x / 2,
    z0: runtime.shelf.shelf.position.z - runtime.shelf.SHELF_D * runtime.shelf.shelf.scale.z / 2, z1: runtime.shelf.shelf.position.z + runtime.shelf.SHELF_D * runtime.shelf.shelf.scale.z / 2, y1: runtime.shelf.shelf.position.y + runtime.shelf.SHELF_H * runtime.shelf.shelf.scale.y,
  };
  const BOUNCE = 0.42;
  // The shelf's close-up (its shot's dir and depth) clips everything more than 3.2 in front of
  // the shelf, and that cut is angled: it comes nearer the further right you go. A ball across
  // it is sliced open (a black disc, the inside of its outline) or gone, so the litter is
  // fenced in behind it, with a margin, and kept from rolling off the right of the screen.
  const CUT_N = new THREE.Vector3(0.24, 0.1, 1).normalize();
  const CUT_FLAT = new THREE.Vector3(CUT_N.x, 0, CUT_N.z).normalize();
  const CUT_AT = new THREE.Vector3(runtime.shelf.shelf.position.x + 0.35, 0, runtime.shelf.shelf.position.z);
  const CUT_REACH = (3.2 - PAPER_R - 0.12) / Math.hypot(CUT_N.x, CUT_N.z);
  const LITTER_RIGHT = Math.min(bin.position.x + 0.55 * bin.scale.x + PAPER_R * 3 + 0.5, runtime.room.DIORAMA.x1 - PAPER_R - 0.2);
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
    const binR = binReach(p.y);
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
      // (never into the bin standing against its right side)
      const pushes = [
        [SHELF_BOX.x1 + PAPER_R - p.x, "x", 1], [p.x - (SHELF_BOX.x0 - PAPER_R), "x", -1], [SHELF_BOX.z1 + PAPER_R - p.z, "z", 1],
      ].filter(([depth, axis, dir]) => !(axis === "x" && dir > 0 && insideBin(p.x + depth, p.y, p.z))).sort((a, b) => a[0] - b[0]);
      const [depth, axis, dir] = pushes[0];
      p[axis] += depth * dir;
      if (vel[axis] * dir < 0) vel[axis] *= -BOUNCE;
    }
    const wallFace = runtime.room.WALL_Z + 0.12 + PAPER_R;
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
      if (p.y > runtime.room.FLOOR_Y + PAPER_R * 3 || gap >= PAPER_R * 2 || gap < 1e-4) return;
      tmpV.divideScalar(gap);
      p.x += tmpV.x * (PAPER_R * 2 - gap);
      p.z += tmpV.z * (PAPER_R * 2 - gap);
      const into = vel.x * tmpV.x + vel.z * tmpV.z;
      if (into < 0) {
        vel.x -= (1 + BOUNCE) * into * tmpV.x;
        vel.z -= (1 + BOUNCE) * into * tmpV.z;
      }
    });
    const floor = runtime.room.FLOOR_Y + PAPER_R;
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
  papers.forEach((paper) => runtime.core.register(paper.ball, {
    onHover: (on) => {
      if (!on || paper.state !== "litter") return;
      gsap.fromTo(paper.ball.position, { y: runtime.room.FLOOR_Y + PAPER_R + 0.12 }, { y: runtime.room.FLOOR_Y + PAPER_R, duration: 0.4, ease: "bounce.out" });
    },
    onClick: () => paper.state === "litter" && shoot(paper),
  }));
  runtime.core.register(bin, {
    // Hovered, it perks up: a little hop and the hoop's net sways, as if it's ready for a pass
    onHover: (on) => {
      if (!on) return;
      gsap.fromTo(binBody.position, { y: 0 }, { keyframes: [{ y: 0.12, duration: 0.14, ease: "power2.out" }, { y: 0, duration: 0.2, ease: "power2.in" }] });
      gsap.fromTo(hoop.rotation, { z: 0.08 }, { z: 0, duration: 0.8, ease: "elastic.out(1, 0.3)" });
    },
    onClick: () => shoot(),
  });

  // Public state used by the other scene parts.
  return {
    bin,
    hoopBoardFace,
    net,
    updatePapers,
    papers,
    get binBadgeTimer() { return binBadgeTimer; },
  };
}
