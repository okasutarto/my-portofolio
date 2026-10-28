import * as THREE from "three";
import gsap from "gsap";
import { sfx } from "@/composables/useSfx";

export function createSecrets(runtime) {
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
    runtime.shelfCollectibles.trophyPlate.userData.tex.redraw();
    sfx.ding({ pitch: 1.15, volume: 0.22 });
    runtime.options.onEvent("secret", { id, found: secretsFound.size, total: SECRETS.length });
    if (secretsFound.size === SECRETS.length) runtime.core.timers.push(setTimeout(celebrateSecrets, 1200));
  }
  // All of them: the trophy lights up gold and throws confetti
  function celebrateSecrets() {
    // First bring the camera to the trophy (the last secret is often found elsewhere, or with
    // the arrow keys that scroll the shelf), then the bubble once it's still
    runtime.shelfCollectibles.trophy.getWorldPosition(runtime.gauntlet.shelfBubbleAt);
    const lookY = runtime.gauntlet.shelfBubbleAt.y + 0.6;
    const there = runtime.camera.focus.name === "shelf";
    if (there) runtime.pointer.browseShelf(runtime.camera.shelfLookAt(lookY));
    else runtime.camera.setFocus("shelf", { point: new THREE.Vector3(runtime.gauntlet.shelfBubbleAt.x, lookY, runtime.gauntlet.shelfBubbleAt.z) });
    // (the bubble picks its side from where the camera is, so wait until it has stopped)
    const whenStill = () => {
      if (runtime.core.destroyed) return;
      if (gsap.isTweening(runtime.camera.cam)) runtime.core.timers.push(setTimeout(whenStill, 100));
      else cheerTrophy();
    };
    runtime.core.timers.push(setTimeout(whenStill, there ? 500 : 300));
  }
  function cheerTrophy() {
    if (runtime.shelfCollectibles.trophyCelebrating) return;
    runtime.shelfCollectibles.trophyCelebrating = true;
    runtime.gauntlet.shelfBubble.hide();
    runtime.shelf.ledPartyUntil = performance.now() + 6500;
    runtime.shelfCollectibles.trophy.getWorldPosition(runtime.gauntlet.shelfBubbleAt);
    runtime.shelfCollectibles.trophyHalo.position.copy(runtime.gauntlet.shelfBubbleAt).add(new THREE.Vector3(0, 0.9, -0.2));
    runtime.shelfCollectibles.trophyHalo.visible = true;
    gsap.fromTo(runtime.shelfCollectibles.trophyHalo.material, { opacity: 0 }, { opacity: 0.65, duration: 0.5, overwrite: true });
    gsap.fromTo(runtime.shelfCollectibles.trophyHalo.scale, { x: 1.2, y: 1.2 }, { x: 3.4, y: 3.4, duration: 1, ease: "power2.out", overwrite: true });
    gsap.killTweensOf([runtime.shelfCollectibles.trophy.position, runtime.shelfCollectibles.trophy.rotation, runtime.shelfCollectibles.trophy.scale, runtime.shelfCollectibles.trophyGold.emissive]);
    const restY = runtime.shelfCollectibles.trophy.userData.restY;
    runtime.shelfCollectibles.trophyCelebration = gsap.timeline({ onComplete: () => { runtime.shelfCollectibles.trophyCelebrating = false; } })
      .to(runtime.shelfCollectibles.trophy.position, { y: restY + 0.18, duration: 0.6, ease: "power2.out" })
      .to(runtime.shelfCollectibles.trophy.rotation, { y: Math.PI * 2, duration: 1.5, ease: "power2.inOut" }, 0.25)
      .fromTo(runtime.shelfCollectibles.trophyGold.emissive, { r: 0, g: 0, b: 0 }, { r: 0.6, g: 0.35, b: 0.04, duration: 0.5 }, 0)
      .call(() => {
        // Align the emitter above the bowl in screen space, then bring it in front of the shelf.
        runtime.shelfCollectibles.trophy.localToWorld(runtime.gauntlet.shelfBubbleAt.set(0, 1.38, 0));
        const towardCamera = new THREE.Vector3(0, 0, 1).applyQuaternion(runtime.core.camera.quaternion);
        const frontZ = runtime.shelf.shelf.position.z + runtime.shelf.SHELF_D / 2 + 0.25;
        runtime.gauntlet.shelfBubbleAt.addScaledVector(towardCamera, Math.max(0, frontZ - runtime.gauntlet.shelfBubbleAt.z) / towardCamera.z);
        runtime.gym.burst(runtime.gauntlet.shelfBubbleAt.x, runtime.gauntlet.shelfBubbleAt.y, runtime.gauntlet.shelfBubbleAt.z, true);
        sfx.sparkle();
        sfx.cheer();
        sfx.applause({ delay: 0.2 });
        runtime.gauntlet.shelfSay(runtime.shelfCollectibles.trophy, `${SECRETS.length}/${SECRETS.length} SECRETS FOUND!`, "master of the desk", 6000);
      }, null, 0.65)
      .to(runtime.shelfCollectibles.trophy.position, { y: restY, duration: 0.6, ease: "bounce.out" }, 2.1)
      .set(runtime.shelfCollectibles.trophy.rotation, { y: 0 }, 2.7)
      .to(runtime.shelfCollectibles.trophyGold.emissive, { r: 0, g: 0, b: 0, duration: 1.5 }, 3.2)
      .to(runtime.shelfCollectibles.trophyHalo.material, { opacity: 0, duration: 1.5, onComplete: () => { runtime.shelfCollectibles.trophyHalo.visible = false; } }, 3.2);
  }

  // Public state used by the other scene parts.
  return {
    discover,
    secretsFound,
    SECRETS,
    cheerTrophy,
    SECRET_HINTS,
    previewTrophy,
    celebrateSecrets,
  };
}
