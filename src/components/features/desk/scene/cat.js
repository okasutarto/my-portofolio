import * as THREE from "three";
import gsap from "gsap";
import { sfx } from "@/composables/useSfx";
import { canvasTexture, BUBBLE_TAILS, drawFur } from "../textures";

export function createCat(runtime) {
  // ---------- Oyen, the cat ----------
  // A ginger cat curled up asleep: on the rug just under the desk's front edge by day, and at night up on the desk in the warm
  // pool of the lamp (she jumps across when the room switches). Click her and she wakes for a
  // moment (a meow and a word in a bubble); every third time she gets up and walks right
  // across the keyboard instead, typing nonsense into the terminal on the way.
  const fur = runtime.core.toon("#ff9f45");
  const furDark = runtime.core.toon("#d9741f");
  const furLight = runtime.core.toon("#fffdf5");
  // In the desk's shade (the floor, the rug, the chair) her toon colours sink to flat darks and
  // her stripes and white bits vanish; there her fur gives off a little of its own colour, so
  // she reads as well as she does under the lamp. Out of the shade it fades back off.
  const FUR_MATS = [fur, furDark, furLight];
  // a soft brushed texture over her orange coat and stripes
  const furTex = canvasTexture(128, 128);
  runtime.core.track(furTex.texture);
  drawFur(furTex.ctx, 128, 128);
  furTex.texture.wrapS = furTex.texture.wrapT = THREE.RepeatWrapping;
  furTex.texture.repeat.set(3, 2);
  [fur, furDark].forEach((mat) => (mat.map = furTex.texture));
  FUR_MATS.forEach((mat) => mat.emissive.copy(mat.color));
  function catShade(inShade, duration = 0.6) {
    FUR_MATS.forEach((mat) => gsap.to(mat, { emissiveIntensity: inShade ? 0.38 : 0, duration, overwrite: true }));
  }
  const catInk = runtime.core.toon("#1a1714");
  const cat = new THREE.Group();
  cat.scale.setScalar(0.85);
  const catBody = new THREE.Group();
  cat.add(catBody);
  const belly = runtime.core.mesh(new THREE.SphereGeometry(1, 24, 16), fur, { outline: 0.03 });
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
    const stripe = runtime.core.mesh(geo, furDark, { outline: 0, cast: false });
    stripe.material.side = THREE.DoubleSide;
    return stripe;
  }
  [[-0.62, 0.07, 2.0, 1], [-0.3, 0.085, 2.3, 2], [0.02, 0.075, 2.1, 3], [0.33, 0.06, 1.8, 4]].forEach(([x, width, reach, seed]) => belly.add(tabbyStripe(x, width, reach, seed)));
  // her white chest: shown when she's up, tucked away (hidden) when she's curled asleep, where
  // it only showed as a white patch at her neck
  const catChest = runtime.core.at(runtime.core.mesh(new THREE.SphereGeometry(0.42, 16, 12), furLight, { outline: 0.015 }), 0.85, 0.55, 0.15);
  catChest.visible = false;
  catBody.add(catChest);
  // Legs, shown only when she stands; paws tucked in front when she's curled
  const catLegs = [[0.62, 0.32], [0.62, -0.32], [-0.62, 0.32], [-0.62, -0.32]].map(([x, z]) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.62, z);
    leg.add(runtime.core.at(runtime.core.mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.62, 12), fur, { outline: 0.015 }), 0, -0.31, 0));
    leg.add(runtime.core.at(runtime.core.mesh(new THREE.SphereGeometry(0.14, 12, 8), furLight, { outline: 0.012 }), 0, -0.6, 0.02));
    leg.visible = false;
    cat.add(leg);
    return leg;
  });
  // Haunches: the rounded thighs a sitting cat sits on, shown only when she's sat up
  const haunches = [0.36, -0.36].map((z) => {
    const thigh = runtime.core.mesh(new THREE.SphereGeometry(1, 16, 12), fur, { outline: 0.014 });
    thigh.scale.set(0.48, 0.4, 0.3);
    thigh.position.set(-0.3, 0.36, z);
    thigh.visible = false;
    cat.add(thigh);
    return thigh;
  });
  const paws = new THREE.Group();
  paws.add(
    runtime.core.at(runtime.core.mesh(new THREE.SphereGeometry(0.16, 12, 8), furLight, { outline: 0.012 }), 1.05, 0.14, 0.62),
    runtime.core.at(runtime.core.mesh(new THREE.SphereGeometry(0.16, 12, 8), furLight, { outline: 0.012 }), 1.32, 0.14, 0.36),
  );
  cat.add(paws);
  // Head: ears, a white muzzle, a pink nose, and eyes shut (lines) or open (dots)
  const catHead = new THREE.Group();
  cat.add(catHead);
  const skull = runtime.core.mesh(new THREE.SphereGeometry(0.5, 20, 14), fur, { outline: 0.02 });
  skull.scale.y = 0.88;
  catHead.add(skull);
  const catEars = [];
  [-1, 1].forEach((side) => {
    const ear = runtime.core.mesh(new THREE.ConeGeometry(0.17, 0.34, 12), fur, { outline: 0.012 });
    catEars.push(ear);
    ear.position.set(side * 0.27, 0.42, -0.02);
    ear.rotation.z = -side * 0.3;
    const inner = runtime.core.mesh(new THREE.ConeGeometry(0.09, 0.2, 10), runtime.core.toon("#ff90b0"), { outline: 0, cast: false });
    inner.position.set(0, -0.04, 0.06);
    ear.add(inner);
    catHead.add(ear);
  });
  const muzzle = runtime.core.mesh(new THREE.SphereGeometry(0.22, 14, 10), furLight, { outline: 0.01 });
  muzzle.scale.set(1.25, 0.8, 0.8);
  muzzle.position.set(0, -0.14, 0.38);
  catHead.add(muzzle, runtime.core.at(runtime.core.mesh(new THREE.SphereGeometry(0.055, 10, 8), runtime.core.toon("#ff6b8a"), { outline: 0.006 }), 0, -0.06, 0.52));
  const eyesShut = [-1, 1].map((side) => runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.16, 0.035, 0.03, 0.012), catInk, { outline: 0, cast: false }), side * 0.18, 0.06, 0.44, side * 0.22));
  const eyesOpen = [-1, 1].map((side) => {
    const eye = runtime.core.at(runtime.core.mesh(new THREE.SphereGeometry(0.07, 12, 8), catInk, { outline: 0, cast: false }), side * 0.18, 0.07, 0.43);
    eye.visible = false;
    return eye;
  });
  catHead.add(...eyesShut, ...eyesOpen);
  // her mouth, only there when she yawns
  // (out in front of the muzzle, which would hide it otherwise), and a pink tongue for washing
  const catMouth = runtime.core.mesh(new THREE.SphereGeometry(0.09, 12, 8), runtime.core.toon("#9d174d"), { outline: 0.008, cast: false });
  catMouth.position.set(0, -0.27, 0.53);
  catMouth.scale.set(0.001, 0.001, 0.001);
  const catTongue = runtime.core.mesh(new THREE.SphereGeometry(0.06, 10, 8), runtime.core.toon("#ff7aa8"), { outline: 0.006, cast: false });
  catTongue.position.set(0, -0.31, 0.58);
  catTongue.scale.set(0.001, 0.001, 0.001);
  catHead.add(catMouth, catTongue);
  // whiskers fanning out from the muzzle, and a blue collar with a little gold bell
  const whiskerMat = runtime.core.toon("#1a1714");
  [-1, 1].forEach((side) => [-0.14, 0, 0.14].forEach((tilt) => {
    const whisker = runtime.core.mesh(new THREE.BoxGeometry(0.34, 0.012, 0.012), whiskerMat, { outline: 0, cast: false });
    whisker.position.set(side * 0.36, -0.15, 0.4);
    whisker.rotation.set(0, side * -0.35, side * tilt);
    catHead.add(whisker);
  }));
  const collar = runtime.core.mesh(new THREE.TorusGeometry(0.33, 0.05, 8, 24), runtime.core.toon("#3b82f6"), { outline: 0.01, cast: false });
  collar.rotation.x = Math.PI / 2;
  collar.position.y = -0.36;
  const bell = runtime.core.mesh(new THREE.SphereGeometry(0.075, 12, 10), runtime.core.toon("#ffd34d"), { outline: 0.01, cast: false });
  bell.position.set(0, -0.44, 0.32);
  catHead.add(collar, bell);
  const catNeck = runtime.core.mesh(new THREE.SphereGeometry(1, 16, 12), fur, { outline: 0 });
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
    if (length > 0.0001) catNeck.quaternion.setFromUnitVectors(runtime.core.UP, neckDirection.divideScalar(length));
  }
  // Tail: wrapped round her front when curled, held up in a hook when she walks
  const tailTube = (points, radius) => runtime.core.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))), 32, radius, 10), fur, { outline: 0.015 });
  const tailCurl = new THREE.Group();
  tailCurl.add(tailTube([[-1.05, 0.35, -0.2], [-1.2, 0.25, 0.4], [-0.6, 0.2, 0.95], [0.3, 0.18, 1.0], [0.85, 0.2, 0.85]], 0.13));
  tailCurl.add(runtime.core.at(runtime.core.mesh(new THREE.SphereGeometry(0.14, 12, 8), furDark, { outline: 0.012 }), 0.88, 0.2, 0.84));
  const tailUp = new THREE.Group();
  tailUp.add(tailTube([[-1.0, 0.75, 0], [-1.35, 1.2, 0], [-1.4, 1.75, 0], [-1.2, 2.05, 0]], 0.12));
  tailUp.add(runtime.core.at(runtime.core.mesh(new THREE.SphereGeometry(0.13, 12, 8), furDark, { outline: 0.012 }), -1.2, 2.05, 0));
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
    floor: { parent: runtime.core.scene, position: new THREE.Vector3(1.4, runtime.room.FLOOR_Y + 0.08, 0.3), yaw: 0.25, via: new THREE.Vector3(1.8, runtime.room.FLOOR_Y + 0.08, 5.4) },
    desk: { parent: runtime.core.scene, position: new THREE.Vector3(-3.85, 0, -0.55), yaw: 0.45 },
    // curled on the gaming chair's seat, on the side that shows past its back (she turns with
    // the chair when it spins)
    chair: { parent: runtime.chair.chairTop, position: new THREE.Vector3(0.95, runtime.chair.SEAT_TOP, -0.55), yaw: -1.25 },
    // further along under the desk, toward the dumbbells, clear of the desk's right leg
    rug: { parent: runtime.core.scene, position: new THREE.Vector3(3.7, runtime.room.FLOOR_Y + 0.08, 0.7), yaw: -0.4, via: new THREE.Vector3(3.9, runtime.room.FLOOR_Y + 0.08, 5.4) },
  };
  const bedFor = (night) => CAT_BEDS[night ? "desk" : "floor"];
  let catBed = bedFor(runtime.options.dark);
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
      runtime.core.scene.attach(cat);
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
    const shooed = runtime.theme.darkNow && !!runtime.projectFiles.openFolder;
    const bed = bedFor(runtime.theme.darkNow && !shooed);
    if (bed === catBed) return;
    const go = () => {
      catInterrupt();
      if (catBusy) return runtime.core.timers.push(setTimeout(go, 300));
      if (bedFor(runtime.theme.darkNow && !runtime.projectFiles.openFolder) !== bed || bed === catBed) return;
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
  let catWatchAt = (out) => runtime.mouse.mouse.getWorldPosition(out);
  const catLook = new THREE.Vector3();
  function catSpotsMouse() {
    catInterrupt();
    if (catBusy) return;
    catBusy = true;
    catEyes(true);
    catSay("!");
    sfx.meow({ short: true, delay: 0.2 });
    catWatchAt = (out) => runtime.mouse.mouse.getWorldPosition(out);
    catWatchUntil = performance.now() + 4300;
    // Up off her paws into an alert loaf: head raised, level and forward over her chest, chest
    // lifted a little
    catChest.visible = true;
    gsap.to(catHead.position, { ...HEAD_LOAF, duration: 0.35, ease: "power2.out", overwrite: true });
    gsap.to(catHead.rotation, { x: 0, z: 0, duration: 0.35, ease: "power2.out", overwrite: true });
    gsap.to(catBody.position, { y: 0.08, duration: 0.35, ease: "power2.out", overwrite: true });
    gsap.fromTo(tailCurl.rotation, { y: -0.12 }, { y: 0.12, duration: 0.3, yoyo: true, repeat: 13, ease: "sine.inOut", onComplete: () => (tailCurl.rotation.y = 0) });
    runtime.core.timers.push(catFidget = setTimeout(() => {
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
    catRay.setFromCamera(runtime.pointer.ndc, runtime.core.camera);
    catHead.getWorldPosition(catHeadAt);
    return out.copy(catRay.ray.origin).addScaledVector(catRay.ray.direction, catHeadAt.distanceTo(runtime.core.camera.position));
  };
  const windowPoint = (out) => runtime.room.windowGroup.getWorldPosition(out);
  const butterflyPoint = (out) => runtime.plant.butterfly.getWorldPosition(out);
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
  const catSpots = () => Object.values(CAT_BEDS).filter((bed) => bed !== catBed && !(bed === CAT_BEDS.desk && runtime.projectFiles.openFolder));
  function catWakeUp() {
    // Every time: a yawn, a stretch and, straight on from it, a wash sat up. Then, maybe, one
    // more thing: back to sleep, watching the pointer still sat, up to look out of the window
    // (only from the desk, the one spot it's in view from), swatting at the butterfly, or a
    // move to another spot. A move can't be stopped mid-way; the rest can be interrupted.
    const moving = Math.random() < 0.4;
    const onDesk = catBed === CAT_BEDS.desk;
    const choices = onDesk ? ["rest", "pointer", "window"] : ["rest", "pointer"];
    const after = runtime.plant.flight.active ? "butterfly" : choices[Math.floor(Math.random() * choices.length)];
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
    if (catBusy || !runtime.plant.flight.active) return;
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
      catWatchUntil = performance.now() + runtime.plant.FLIGHT_TIME * 1000;
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
  const catBubble = runtime.core.speechBubble(CAT_BUBBLE_W, CAT_BUBBLE_H, { size: 72, by: 0.9, tail: "left", style: "manga" });
  const catBubbleHolder = new THREE.Group();
  runtime.core.scene.add(catBubbleHolder);
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
    const unitsPerPixel = runtime.animation.viewH / runtime.core.camera.zoom / runtime.options.container.clientHeight;
    const k = Math.min(CAT_BUBBLE_PX, runtime.options.container.clientWidth * 0.55) * unitsPerPixel / CAT_BUBBLE_W;
    catBubbleHolder.scale.setScalar(k);
    catHead.getWorldPosition(catBubbleAt);
    catBubbleRight.set(1, 0, 0).applyQuaternion(runtime.core.camera.quaternion);
    catBubbleUp.set(0, 1, 0).applyQuaternion(runtime.core.camera.quaternion);
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
    runtime.secrets.discover("catKeys");
    catBusy = true;
    const keyTop = runtime.keyboard.keyboard.localToWorld(new THREE.Vector3(0, runtime.keyboard.KEY_Y + 0.09, 0.05));
    const top = keyTop.y;
    const z = keyTop.z;
    const tl = gsap.timeline({ onComplete: () => (catBusy = false, catTravel = null) });
    catTravel = tl;
    tl.call(() => {
      catPose(true);
      runtime.workstation.showTerminal();
    });
    tl.to({}, { duration: 0.35 });
    catLeave(tl);
    catHop(tl, new THREE.Vector3(runtime.keyboard.keyboard.position.x - 2.0 * runtime.keyboard.KEYBOARD_SCALE, top, z), 0, 1.6);
    tl.call(() => catSay("✨ helping ✨"));
    const trot = { p: 0 };
    let lastStep = 0;
    tl.to(trot, {
      p: 1,
      duration: 2.4,
      ease: "none",
      onUpdate: () => {
        cat.position.x = runtime.keyboard.keyboard.position.x + (-2.0 + trot.p * 4.1) * runtime.keyboard.KEYBOARD_SCALE;
        catLegs.forEach((leg, i) => (leg.rotation.z = Math.sin(trot.p * 28 + (i % 2) * Math.PI) * 0.45));
        const step = Math.floor(trot.p * 14);
        if (step !== lastStep) {
          lastStep = step;
          const ch = "ASDFJKLQWERUIOPZXCVNM"[Math.floor(Math.random() * 21)];
          runtime.keyboard.pressKey(`Key${ch}`);
          runtime.workstation.typeKey(ch.toLowerCase());
        }
      },
    });
    tl.call(() => {
      catLegs.forEach((leg) => (leg.rotation.z = 0));
      runtime.keyboard.pressKey("Enter");
      runtime.workstation.typeKey("Enter");
    });
    tl.to({}, { duration: 0.3 });
    catToBed(tl, bedFor(runtime.theme.darkNow && !runtime.projectFiles.openFolder));
  }
  runtime.core.register(cat, {
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
      runtime.core.timers.push(catFidget = setTimeout(() => {
        catEyes(false);
        catBusy = false;
      }, 2000));
    },
  });

  // Public state used by the other scene parts.
  return {
    catChaseButterfly,
    catModel,
    catSpotsMouse,
    catShoo,
    catSettle,
    get catIdleTl() { return catIdleTl; },
    get catBusy() { return catBusy; },
    updateCatWatch,
    updateCatLife,
    updateCatNeck,
    catBubble,
    placeCatBubble,
  };
}
