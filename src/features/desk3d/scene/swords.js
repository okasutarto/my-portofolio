import * as THREE from "three";
import gsap from "gsap";
import { sfx } from "@/shared/composables/useSfx";
import { canvasTexture, drawTsukaWrap, drawSayaLacquer } from "../textures";

export function createSwords(runtime) {
  // The rack's own close-up: clicking a bracket (or a sword, from further out) comes in to it
  runtime.core.register(runtime.swordRack.katanaRack, {
    focus: "swords",
    onLeave: () => {
      clearTimeout(runtime.swordEffects.swordZoomTimer);
      runtime.swordEffects.hideSwordCard();
    },
  });

  // Handle wraps: cord over ray skin, the diamonds showing front and back
  const tsukaMat = (cord, skin) => {
    const tex = canvasTexture(256, 512);
    runtime.core.track(tex.texture);
    drawTsukaWrap(tex.ctx, 256, 512, { cord, skin });
    const mat = runtime.core.toon("#ffffff");
    mat.map = tex.texture;
    return mat;
  };
  const lacquerMat = (color) => {
    const tex = canvasTexture(1024, 128);
    runtime.core.track(tex.texture);
    drawSayaLacquer(tex.ctx, 1024, 128, { color });
    const mat = runtime.core.toon("#ffffff");
    mat.map = tex.texture;
    return mat;
  };
  // Swords sit in the hooks centred on the rack: handle on the right, saya to the left. Each
  // is built handle-left and turned round, so its front details are on its local -z.
  const TSUKA_L = 0.95;
  // Centred on the rack: half the way from the kashira to the kojiri
  const SWORD_X = (runtime.swordRack.BLADE_L + 0.2 - (TSUKA_L + 0.04)) / 2;
  const SWORD_SPAN = runtime.swordRack.BLADE_L + TSUKA_L + 0.3;
  const FRONT = -1;
  // A ring round the saya at x along it, following its curve
  const sayaRing = (saya, x, w, material, r = 0.085) => {
    const ring = runtime.core.mesh(new THREE.CylinderGeometry(r, r, w, 18), material, { outline: 0.01 });
    ring.rotation.z = Math.PI / 2 + Math.atan(2 * runtime.swordRack.SORI * x / runtime.swordRack.BLADE_L ** 2);
    ring.position.set(x, runtime.swordRack.bow(x), 0);
    saya.add(ring);
    return ring;
  };
  // A ring round the handle (fuchi, menuki band, kashira)
  const tsukaRing = (blade, x, w, material, r = 0.072) => {
    const ring = runtime.core.mesh(new THREE.CylinderGeometry(r, r, w, 18), material, { outline: 0.01 });
    ring.rotation.z = Math.PI / 2;
    ring.scale.z = 0.82;
    ring.position.x = x;
    blade.add(ring);
    return ring;
  };

  // A complete katana: saya, and the blade with its habaki, tsuba and tsuka (drawn together)
  const buildKatana = (yRack, { info, style, bladeMat, sayaMat, tsukaMat: handleMat, tsubaMaker, addDetails, goldColor = "#d4a72c", mouthRing = true }) => {
    // Each sword has its own gold, so only the hovered one glints
    const gold = runtime.core.toon(goldColor);
    const tierGroup = new THREE.Group();
    tierGroup.position.set(SWORD_X, yRack + 0.02, 0.2);
    tierGroup.rotation.y = Math.PI;
    runtime.swordRack.katanaRack.add(tierGroup);

    const sayaGroup = new THREE.Group();
    sayaGroup.add(runtime.core.mesh(new THREE.TubeGeometry(runtime.swordEffects.sayaCurve, 40, 0.075, 14), sayaMat, { outline: 0.02 }));
    // koiguchi (the mouth) and kojiri (the capped tip)
    if (mouthRing) sayaRing(sayaGroup, 0.07, 0.07, gold, 0.086);
    const kojiri = runtime.core.mesh(new THREE.SphereGeometry(0.084, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), gold, { outline: 0.012 });
    kojiri.rotation.z = -Math.PI / 2 + Math.atan(2 * runtime.swordRack.SORI / runtime.swordRack.BLADE_L);
    kojiri.scale.y = 0.6;
    kojiri.position.set(runtime.swordRack.BLADE_L + 0.2, runtime.swordRack.bow(runtime.swordRack.BLADE_L + 0.2), 0);
    sayaGroup.add(kojiri);
    sayaRing(sayaGroup, runtime.swordRack.BLADE_L + 0.15, 0.1, gold, 0.088);
    tierGroup.add(sayaGroup);

    // The blade and handle hang from a pivot at the centre of the saya's curve (see SORI_R)
    const drawPivot = new THREE.Group();
    drawPivot.position.y = runtime.swordRack.SORI_R;
    tierGroup.add(drawPivot);
    const bladeGroup = new THREE.Group();
    bladeGroup.position.y = -runtime.swordRack.SORI_R;
    const steel = new THREE.Group();
    steel.add(runtime.core.mesh(runtime.swordRack.bladeShape(0), bladeMat, { outline: 0.018 }));
    steel.visible = false;
    const habaki = runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.09, 0.14, 0.05, 0.015), gold, { outline: 0.012 }), 0.045, 0, 0);
    const tsuba = tsubaMaker(gold);
    const tsuka = runtime.core.mesh(new THREE.CylinderGeometry(0.066, 0.062, TSUKA_L, 20), handleMat, { outline: 0.02 });
    tsuka.rotation.z = Math.PI / 2;
    tsuka.scale.z = 0.82;
    tsuka.position.x = -0.04 - TSUKA_L / 2;
    bladeGroup.add(steel, habaki, tsuba, tsuka);
    tsukaRing(bladeGroup, -0.07, 0.05, gold);
    const kashira = runtime.core.mesh(new THREE.SphereGeometry(0.07, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), gold, { outline: 0.012 });
    kashira.rotation.z = Math.PI / 2;
    kashira.scale.set(1, 0.5, 0.82);
    kashira.position.x = -0.04 - TSUKA_L;
    tsukaRing(bladeGroup, -0.04 - TSUKA_L + 0.02, 0.05, gold, 0.07);
    bladeGroup.add(kashira);
    drawPivot.add(bladeGroup);

    addDetails(bladeGroup, sayaGroup, gold);

    const restY = tierGroup.position.y;
    const swordObj = { tierGroup, drawPivot, bladeGroup, sayaGroup, steel, yRack, style, restY };
    let clicks = [];
    // Hover: the sword lifts up off its hooks and out past their tips, tips a touch and slides
    // a good length of steel out of the saya, its gold catching the light; off, it settles
    // back. Like every other prop, a click from further out brings the camera in to the rack;
    // in its close-up, the hovered sword's card shows beside the rack and a click draws it.
    // An invisible band round the sword that stays put on the rack: the sword itself lifts and
    // slides on hover, which would slip out from under the pointer and flicker. The band
    // reaches out past the lifted sword, so the pointer stays on it the whole time.
    const hitArea = new THREE.Mesh(runtime.core.track(new THREE.BoxGeometry(SWORD_SPAN + 0.1, 0.52, 0.8)), runtime.swordEffects.hitAreaMat);
    hitArea.position.set(0, yRack + 0.08, 0.32);
    runtime.swordRack.katanaRack.add(hitArea);
    runtime.core.register(hitArea, {
      focus: "swords",
      item: true,
      // Clicked from further out: its card once the camera's in
      onEnter: () => {
        clearTimeout(runtime.swordEffects.swordZoomTimer);
        runtime.swordEffects.swordZoomTimer = setTimeout(() => runtime.swordEffects.showSwordCard(swordObj), 850);
      },
      onHover: (on) => {
        if (runtime.swordEffects.slashing) return;
        if (runtime.camera.focus.name === "swords") on ? runtime.swordEffects.showSwordCard(swordObj) : runtime.swordEffects.hideSwordCard();
        if (style === "enma") runtime.swordEffects.hoverHaki(swordObj, on);
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
          onComplete: () => !on && !runtime.swordEffects.slashing && sfx.rackLand({ strength: 0.45 }),
        });
        gsap.to(tierGroup.rotation, { z: on ? 0.035 : 0, duration: on ? 0.3 : 0.35, ease: "power2.out", overwrite: true });
        gsap.to(drawPivot.rotation, {
          z: on ? runtime.swordRack.drawTurn(runtime.swordEffects.HOVER_BARE) : 0,
          duration: on ? 0.45 : 0.25,
          delay: on ? 0.1 : 0,
          ease: on ? "power2.out" : "power2.in",
          overwrite: true,
          onComplete: () => !on && !runtime.swordEffects.slashing && (steel.visible = false),
        });
      },
      onClick: () => {
        runtime.swordEffects.hideSwordCard();
        // Three quick clicks on Sandai Kitetsu: Zoro's test of the curse. It's thrown up,
        // spinning, and falls back past the arm that isn't there, onto its hooks
        const now = performance.now();
        clicks = clicks.filter((at) => now - at < 900).concat(now);
        if (style === "kitetsu" && clicks.length >= 3) {
          clicks = [];
          if (runtime.swordEffects.slashing) runtime.swordEffects.afterStrike(() => runtime.swordEffects.tossKitetsu(swordObj, restY));
          else runtime.swordEffects.tossKitetsu(swordObj, restY);
          return;
        }
        runtime.swordEffects.slashSword(swordObj);
      },
    });
    swordObj.info = info;

    return swordObj;
  };

  // Top: Wado Ichimonji
  // Lit a little from within, so the toon shading keeps it white rather than grey
  const wadoWhite = runtime.core.toon("#fbfaf6");
  wadoWhite.emissive.set("#5a5a58");
  buildKatana(runtime.swordRack.RACK_TIERS[0], {
    style: "wado",
    info: {
      name: "Wado Ichimonji", jp: "和道一文字", grade: "Ō Wazamono · 1 of the 21 Great Swords", color: "#fffdf5",
      text: "Zoro's most treasured sword. It belonged to his childhood friend Kuina, and was forged by the legendary swordsmith Shimotsuki Kozaburo.",
    },
    bladeMat: runtime.swordRack.wadoBladeMat,
    sayaMat: lacquerMat("#fbfaf6"),
    tsukaMat: tsukaMat("#f8f7f2", "#1a1714"),
    tsubaMaker: (gold) => {
      const tsuba = new THREE.Group();
      const disc = runtime.core.mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 28), gold, { outline: 0.012 });
      disc.rotation.z = Math.PI / 2;
      const rim = runtime.core.mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 28), runtime.core.toon("#a37b1c"), { outline: 0 });
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
      const y = runtime.swordRack.bow(X);
      const z = FRONT * 0.088;
      [-1, 1].forEach((k) => {
        const turn = sayaRing(saya, X + k * 0.03, 0.026, wadoWhite, 0.084);
        turn.rotation.x = k * 0.38;
      });
      // each loop a puffed, flattened teardrop of ribbon, with a crease down its middle
      const loop = (dx, dy, tilt) => {
        const l = runtime.core.mesh(new THREE.SphereGeometry(0.08, 16, 10), wadoWhite, { outline: 0.008 });
        l.scale.set(1, 0.5, 0.28);
        l.add(runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.11, 0.006, 0.02, 0.003), runtime.core.toon("#c9ccd2"), { outline: 0 }), 0, 0, FRONT * 0.09));
        l.position.set(X + dx, y + dy, z);
        l.rotation.z = tilt;
        saya.add(l);
      };
      loop(0.085, 0.025, -0.25);
      loop(-0.085, 0.025, 0.25);
      saya.add(runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.05, 0.05, 0.03, 0.012), wadoWhite, { outline: 0.008 }), X, y, z + FRONT * 0.01));
      const tail = (dx, dy, len, tilt) => {
        const t = runtime.core.mesh(runtime.core.rbox(0.036, len, 0.012, 0.006), wadoWhite, { outline: 0.007 });
        t.position.set(X + dx, y + dy, z + FRONT * 0.012);
        t.rotation.z = tilt;
        saya.add(t);
      };
      tail(-0.06, -0.11, 0.22, -0.55);
      tail(-0.13, -0.07, 0.26, -1.05);
    },
  });

  // Middle: Sandai Kitetsu
  buildKatana(runtime.swordRack.RACK_TIERS[1], {
    style: "kitetsu",
    info: {
      name: "Sandai Kitetsu", jp: "三代鬼徹", grade: "Wazamono · 1 of the 50 named swords", color: "#c81e1e", ink: "#fffdf5",
      text: "A cursed blade (yōtō): every owner before is said to have met a tragic end. Zoro staked his life on his luck to test it in Loguetown, and the sword chose him.",
    },
    bladeMat: runtime.swordRack.kitetsuBladeMat,
    sayaMat: lacquerMat("#c81e1e"),
    tsukaMat: tsukaMat("#a3161c", "#1a1714"),
    tsubaMaker: (gold) => {
      const tsuba = new THREE.Group();
      tsuba.add(runtime.core.mesh(runtime.core.rbox(0.035, 0.27, 0.22, 0.07), gold, { outline: 0.012 }));
      // little lobes either side of the blade, like the reference's carved guard
      [-1, 1].forEach((s) => tsuba.add(runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.04, 0.07, 0.07, 0.025), gold, { outline: 0.008 }), 0, s * 0.15, 0)));
      return tsuba;
    },
    addDetails: (blade, saya, gold) => {
      tsukaRing(blade, -0.47, 0.06, gold);
      // thin black lacquer rings down the saya, and a wrapped band in gold collars
      const ring = runtime.core.toon("#1a1714");
      [0.24, 0.42, 0.6, 1.4, 1.6, 1.8, 2.0, 2.18].forEach((x) => sayaRing(saya, x, 0.014, ring, 0.0765));
      sayaRing(saya, 0.83, 0.05, gold, 0.088);
      sayaRing(saya, 1.17, 0.05, gold, 0.088);
      const wrap = runtime.core.mesh(new THREE.CylinderGeometry(0.081, 0.081, 0.29, 18), tsukaMat("#9b1218", "#1a1714"), { outline: 0.01 });
      wrap.rotation.z = Math.PI / 2 + Math.atan(2 * runtime.swordRack.SORI * 1.0 / runtime.swordRack.BLADE_L ** 2);
      wrap.position.set(1.0, runtime.swordRack.bow(1.0), 0);
      saya.add(wrap);
    },
  });

  // Bottom: Enma
  buildKatana(runtime.swordRack.RACK_TIERS[2], {
    style: "enma",
    info: {
      name: "Enma", jp: "閻魔", grade: "Ō Wazamono · 1 of the 21 Great Swords", color: "#6b2fa8", ink: "#fffdf5",
      text: "Ranked with Wado Ichimonji. Once Kozuki Oden's, the only sword to scar Kaido; it pulls its wielder's Haki out of them, so only the strong can tame it.",
    },
    bladeMat: runtime.swordRack.enmaBladeMat,
    sayaMat: lacquerMat("#6b2fa8"),
    tsukaMat: tsukaMat("#6b2fa8", "#6b2fa8"),
    tsubaMaker: (gold) => {
      const tsuba = new THREE.Group();
      [[0, 0.085], [0, -0.085], [0.085, 0], [-0.085, 0]].forEach(([y, z]) => {
        const lobe = runtime.core.mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.04, 20), gold, { outline: 0.012 });
        lobe.rotation.z = Math.PI / 2;
        lobe.position.set(0, y, z);
        tsuba.add(lobe);
      });
      return tsuba;
    },
    addDetails: (blade, saya, gold) => {
      // gold bands up the handle, and its flower crest
      [-0.3, -0.62].forEach((x) => tsukaRing(blade, x, 0.06, gold));
      runtime.swordRack.crest(blade, -0.46, 0, 0.056);
      // flowers on the saya, a pair of gold bands near the tip
      [0.62, 1.5, 1.82].forEach((x) => runtime.swordRack.crest(saya, x, runtime.swordRack.bow(x), 0.077));
      sayaRing(saya, 1.2, 0.035, gold);
      sayaRing(saya, 1.27, 0.035, gold);
      // the red cord wound below the mouth, and two tassels hanging from it
      sayaRing(saya, 0.32, 0.17, runtime.swordRack.cord, 0.09);
      [[0.3, -0.06], [0.4, 0.04]].forEach(([x, dz], i) => {
        const top = new THREE.Vector3(x, runtime.swordRack.bow(x) - 0.08, FRONT * (0.06 + dz));
        const end = new THREE.Vector3(x + 0.05 + i * 0.03, -0.3 - i * 0.06, FRONT * (0.08 + dz));
        // Each tassel on its own pivot where the cord leaves the wrap, so it can swing
        const pivot = new THREE.Group();
        pivot.position.copy(top);
        const tip = end.clone().sub(top);
        const tasselCord = runtime.core.rod(new THREE.Vector3(), tip, 0.011, runtime.swordRack.cord, 0.006);
        const knot = runtime.core.mesh(new THREE.SphereGeometry(0.026, 10, 8), runtime.swordRack.cord, { outline: 0.006 });
        knot.position.copy(tip);
        const tassel = runtime.core.mesh(new THREE.CylinderGeometry(0.018, 0.045, 0.2, 10), runtime.swordRack.cord, { outline: 0.01 });
        tassel.position.set(tip.x, tip.y - 0.12, tip.z);
        pivot.add(tasselCord, knot, tassel);
        saya.add(pivot);
        const rest = new THREE.Vector3(tip.x, tip.y - 0.12, tip.z).normalize();
        runtime.swordRack.tasselSway.push({ pivot, saya, rest, dir: rest.clone(), spin: new THREE.Vector3(), lastPos: new THREE.Vector3(), lastVel: new THREE.Vector3() });
      });
    },
  });

  // Public state used by the other scene parts.
  return {
    TSUKA_L,
    SWORD_SPAN,
  };
}
