import * as THREE from "three";
import gsap from "gsap";
import { sfx } from "@/shared/composables/useSfx";
import { canvasTexture, drawBrushedMetal, drawSatinFinish } from "../textures";

export function createRobot(runtime) {
  // Bit, the little robot: built from moving parts (a body that can bob and sway, a head on a
  // neck that turns, blinking eyes, an antenna light, and arms on shoulder pivots). It glances
  // toward the pointer and blinks now and then, dances while Spotifree plays, says hi when
  // clicked, and five quick pokes glitch it into giving up a secret.
  // Brushed metal with real light-dependent specular highlights, shared by moving parts.
  const botMetal = canvasTexture(256, 256);
  runtime.core.track(botMetal.texture);
  drawBrushedMetal(botMetal.ctx, 256, 256);
  const botGrain = canvasTexture(128, 128);
  runtime.core.track(botGrain.texture);
  drawSatinFinish(botGrain.ctx, 128, 128, { grain: 0.045 });
  botGrain.texture.colorSpace = THREE.NoColorSpace;
  const botMetalMat = (color, shininess = 75) => runtime.core.track(new THREE.MeshPhongMaterial({
    color, map: botMetal.texture, bumpMap: botGrain.texture, bumpScale: 0.0012,
    specular: "#d7f5ff", shininess, emissive: color, emissiveIntensity: 0.13,
  }));
  const teal = botMetalMat("#35edda");
  const botSilver = botMetalMat("#f7fbff", 95);
  const botSteel = botMetalMat("#8197a7", 65);
  const robot = new THREE.Group();
  const bot = new THREE.Group();
  robot.add(bot);
  bot.add(
    runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.52, 0.55, 0.42, 0.08), teal, { outline: 0.03 }), 0, 0.28, 0),
    // Inset steel bezel around a brushed-aluminium service panel.
    runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.36, 0.29, 0.018, 0.035), botSteel, { outline: 0.004 }), 0, 0.3, 0.215),
    runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.3, 0.24, 0.018, 0.025), botSilver, { outline: 0 }), 0, 0.3, 0.232),
    runtime.core.at(runtime.core.mesh(new THREE.SphereGeometry(0.04, 10, 8), runtime.core.toon("#ff6b6b"), { outline: 0 }), -0.07, 0.33, 0.25),
    runtime.core.at(runtime.core.mesh(new THREE.SphereGeometry(0.04, 10, 8), runtime.core.toon("#ffdd00"), { outline: 0 }), 0.07, 0.33, 0.25),
    runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.16, 0.03, 0.02, 0.005), runtime.shelfConsole.black, { outline: 0 }), 0, 0.24, 0.25),
  );
  const botHead = new THREE.Group();
  botHead.position.y = 0.57;
  bot.add(botHead);
  const eyeMat = runtime.core.toon("#1a1714");
  const botEyes = [-0.1, 0.1].map((x) => runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.08, 0.1, 0.02, 0.01), eyeMat, { outline: 0 }), x, 0.21, 0.19));
  const antennaMat = runtime.core.track(new THREE.MeshBasicMaterial({ color: "#ff6b6b" }));
  botHead.add(
    runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.44, 0.38, 0.38, 0.08), botSilver, { outline: 0.018 }), 0, 0.19, 0),
    ...botEyes,
    runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.18, 0.04, 0.02, 0.01), runtime.shelfConsole.black, { outline: 0 }), 0, 0.09, 0.195),
    runtime.core.rod(new THREE.Vector3(0, 0.38, 0), new THREE.Vector3(0, 0.63, 0), 0.025, runtime.shelfConsole.black, 0),
    runtime.core.at(runtime.core.mesh(new THREE.SphereGeometry(0.07, 10, 8), antennaMat, { outline: 0.015 }), 0, 0.67, 0),
  );
  // Riveted service panels, cooling slots and machined ear caps follow their own pivots.
  const botScrewGeo = runtime.core.track(new THREE.SphereGeometry(0.009, 8, 6));
  for (const side of [-1, 1]) {
    for (const y of [0.205, 0.395]) {
      const screw = new THREE.Mesh(botScrewGeo, botSteel);
      screw.scale.z = 0.45;
      bot.add(runtime.core.at(screw, side * 0.125, y, 0.245));
    }
    const ear = runtime.core.mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.045, 20), botSteel, { outline: 0.004 });
    ear.rotation.z = Math.PI / 2;
    botHead.add(runtime.core.at(ear, side * 0.23, 0.21, 0));
    const earCap = runtime.core.mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.048, 20), botSilver, { outline: 0 });
    earCap.rotation.z = Math.PI / 2;
    botHead.add(runtime.core.at(earCap, side * 0.245, 0.21, 0));
    botHead.add(runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.018, 0.22, 0.012, 0.004), botSteel, { outline: 0 }), side * 0.186, 0.2, 0.171));
    bot.add(runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.2, 0.065, 0.47, 0.025), botSteel, { outline: 0.005 }), side * 0.145, 0.038, 0.025));
    for (let i = 0; i < 3; i++) {
      bot.add(runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.004, 0.012, 0.13, 0.002), botSteel, { outline: 0, cast: false }), side * 0.26, 0.24 + i * 0.045, 0));
    }
  }
  for (let i = 0; i < 4; i++) {
    bot.add(runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.015, 0.022, 0.006, 0.003), botSteel, { outline: 0 }), -0.045 + i * 0.03, 0.24, 0.263));
  }
  const antennaBase = runtime.core.mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.035, 16), botSteel, { outline: 0.004 });
  botHead.add(runtime.core.at(antennaBase, 0, 0.39, 0));
  botHead.add(runtime.core.rod(new THREE.Vector3(0, 0.405, 0), new THREE.Vector3(0, 0.605, 0), 0.013, botSilver, 0));
  // arms hang from shoulder pivots, so they can wave and pump
  const botArms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.33, 0.5, 0);
    shoulder.rotation.z = side * -0.12;
    const joint = runtime.core.mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 20), botSteel, { outline: 0.005 });
    joint.rotation.z = Math.PI / 2;
    shoulder.add(joint);
    shoulder.add(runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.12, 0.15, 0.14, 0.035), teal, { outline: 0.008 }), 0, -0.105, 0));
    shoulder.add(runtime.core.at(runtime.core.mesh(new THREE.SphereGeometry(0.055, 16, 10), botSteel, { outline: 0.003 }), 0, -0.215, 0));
    shoulder.add(runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.13, 0.14, 0.15, 0.025), botSilver, { outline: 0.008 }), 0, -0.31, 0));
    [-1, 1].forEach((finger) => {
      shoulder.add(runtime.core.at(runtime.core.mesh(runtime.core.rbox(0.035, 0.06, 0.1, 0.012), botSteel, { outline: 0.003 }), finger * 0.035, -0.405, 0.018));
    });
    bot.add(shoulder);
    return shoulder;
  });
  runtime.shelf.addItem(runtime.core.at(robot, 0.7, runtime.shelf.standOn(0), 0.1), "robot");

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
    botHead.rotation.y += (runtime.pointer.parallax.x * 0.55 - botHead.rotation.y) * 0.08;
    botHead.rotation.x += (runtime.pointer.parallax.y * 0.25 - botHead.rotation.x) * 0.08;
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
    runtime.gauntlet.shelfSay(robot, BOT_LINES[botLine++ % BOT_LINES.length], "Bit", 2600, 0.7, 0.35);
  }
  function glitchRobot() {
    botBusy = true;
    runtime.secrets.discover("robot");
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
    runtime.core.timers.push(setTimeout(() => runtime.gauntlet.shelfSay(robot, "SYSTEM OVERRIDE… secret unlocked 👾", "Bit", 3200, 0.7, 0.35), 700));
  }

  // Public state used by the other scene parts.
  return {
    robot,
    pokeRobot,
    get botBusy() { return botBusy; },
    robotBeat,
    updateRobot,
  };
}
