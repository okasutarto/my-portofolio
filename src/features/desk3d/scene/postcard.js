import * as THREE from "three";
import gsap from "gsap";
import emailjs from "@emailjs/browser";
import { hoverSound, sfx } from "@/shared/composables/useSfx";
import { EMAILJS_CONFIG } from "@/shared/config/emailjs";
import { drawPostcard, drawPostcardBack, drawEnvelope, drawEnvelopeFlap, drawPostcardStamp } from "../textures";

export function createPostcard(runtime) {
  // ---------- postcard + envelope (contact) ----------
  // Zoomed in, the postcard slides out and turns over to its writing side: click the message
  // area or an address line to write (Tab moves along), press the SEND stamp to mail it. It
  // goes out through EmailJS, like the 2D contact form, folded into a paper plane that flies off.
  const mail = new THREE.Group();
  const MAIL_POS = { x: 4.2, y: 0, z: 3.2 };
  mail.position.set(MAIL_POS.x, MAIL_POS.y, MAIL_POS.z);
  mail.rotation.y = 0.18;
  runtime.core.scene.add(mail);
  const ENV_W = 1.62;
  const ENV_D = 1.14;
  const CARD_W = 1.48;
  const CARD_D = 1.05;
  const envelope = new THREE.Group();
  envelope.position.y = 0.04;
  const envBackMat = runtime.core.toon("#e8d3a7");
  const envBack = runtime.core.mesh(runtime.core.rbox(ENV_W, 0.025, ENV_D, 0.012), envBackMat, { outline: 0.025 });
  const envTop = runtime.core.printed(ENV_W, ENV_D, 400, drawEnvelope);
  envTop.rotation.x = -Math.PI / 2;
  envTop.position.y = 0.06;
  envTop.material.alphaTest = 0.5;
  const flap = new THREE.Group();
  flap.position.set(0, 0.075, -ENV_D / 2);
  const flapFace = runtime.core.printed(ENV_W, ENV_D * 0.52, 400, drawEnvelopeFlap);
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
  const postFace = runtime.core.printed(CARD_W, CARD_D, 400, drawPostcard);
  postFace.rotation.x = -Math.PI / 2;
  postFace.position.y = 0.012;
  const card = { name: "", email: "", message: "", active: null, errors: {}, status: "idle" };
  const postBack = runtime.core.printed(CARD_W, CARD_D, 700, (c, w, h) => drawPostcardBack(c, w, h, card, { caret: runtime.textInput.caretOn && !!card.active }));
  postBack.rotation.x = Math.PI / 2;
  postBack.position.y = -0.012;
  postFlip.add(runtime.core.mesh(runtime.core.rbox(CARD_W, 0.02, CARD_D, 0.008), runtime.core.toon("#fffdf5"), { outline: 0.018 }), postFace, postBack);
  const postage = runtime.core.printed(CARD_W * 0.13, CARD_D * 0.24, 700, drawPostcardStamp);
  postage.rotation.x = -Math.PI / 2;
  postage.position.set(CARD_W * 0.385, 0.026, -CARD_D * 0.316);
  postcard.add(postage);
  // The paper a sent card folds into: three quads (the two wings and the keel under them) in
  // the plane's own space, nose toward +x. They morph from the flat card-sized sheet, to the
  // sheet folded lengthwise with its corners creased in, to a paper plane (FOLDS, by `fold.t`
  // 0 → 1 → 2), so the card visibly folds up rather than swapping for a model.
  const FOLDS = [
    // flat sheet, the card's size
    [[[-0.74, 0, -0.525], [0.74, 0, -0.525], [0.74, 0, 0], [-0.74, 0, 0]], [[-0.74, 0, 0], [0.74, 0, 0], [0.74, 0, 0.525], [-0.74, 0, 0.525]], [[-0.74, 0, 0], [0.74, 0, 0], [0.74, 0, 0], [-0.74, 0, 0]]],
    // folded lengthwise, corners creased in toward the nose
    [[[-0.66, 0.06, -0.36], [0.78, 0.01, -0.05], [0.78, 0, 0], [-0.66, 0, 0]], [[-0.66, 0, 0], [0.78, 0, 0], [0.78, 0.01, 0.05], [-0.66, 0.06, 0.36]], [[-0.66, 0, 0], [0.78, 0, 0], [0.78, 0, 0], [-0.66, -0.08, 0]]],
    // a paper plane, wings tipped up over a keel
    [[[-0.62, 0.14, -0.44], [0.8, 0, 0], [0.8, 0, 0], [-0.62, 0, 0]], [[-0.62, 0, 0], [0.8, 0, 0], [0.8, 0, 0], [-0.62, 0.14, 0.44]], [[-0.62, 0, 0], [0.8, 0, 0], [0.8, 0, 0], [-0.62, -0.2, 0]]],
  ];
  const planeMat = runtime.core.toon("#fffdf5");
  planeMat.side = THREE.DoubleSide;
  planeMat.transparent = true;
  const planeGeo = runtime.core.track(new THREE.BufferGeometry());
  planeGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * 6 * 3), 3));
  const planeLines = runtime.core.track(new THREE.BufferGeometry());
  planeLines.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * 8 * 3), 3));
  const plane = new THREE.Group();
  const planeMesh = new THREE.Mesh(planeGeo, planeMat);
  planeMesh.castShadow = true;
  plane.add(planeMesh, new THREE.LineSegments(planeLines, runtime.core.track(new THREE.LineBasicMaterial({ color: "#000" }))));
  const fold = { t: 0 };
  const corner = new THREE.Vector3();
  function shapePlane() {
    const i = Math.min(1, Math.floor(fold.t));
    const f = fold.t - i;
    const tris = planeGeo.attributes.position;
    const lines = planeLines.attributes.position;
    FOLDS[i].forEach((piece, p) => {
      const at = piece.map((v, k) => corner.fromArray(v).lerp(new THREE.Vector3(...FOLDS[i + 1][p][k]), f).clone());
      [0, 1, 2, 0, 2, 3].forEach((k, n) => tris.setXYZ(p * 6 + n, at[k].x, at[k].y, at[k].z));
      [0, 1, 1, 2, 2, 3, 3, 0].forEach((k, n) => lines.setXYZ(p * 8 + n, at[k].x, at[k].y, at[k].z));
    });
    tris.needsUpdate = true;
    lines.needsUpdate = true;
    planeGeo.computeVertexNormals();
    planeGeo.computeBoundingSphere();
    planeLines.computeBoundingSphere();
  }
  // Flat and hidden, over the card where it lies out on the envelope
  function resetPlane() {
    plane.visible = false;
    fold.t = 0;
    shapePlane();
    planeMat.opacity = 1;
    plane.position.set(POSTCARD_OUT.x, POSTCARD_OUT.y + 0.03, POSTCARD_OUT.z);
    plane.rotation.set(0, POSTCARD_OUT.r, 0);
  }
  resetPlane();
  // Its flight: progress along the takeoff curve, and the turns that point its nose (+x) along it
  const flight = { p: 0 };
  const forward = new THREE.Vector3(1, 0, 0);
  const heading = new THREE.Quaternion();
  const takeoffTurn = new THREE.Quaternion();
  const bank = new THREE.Quaternion();
  mail.add(postcard, envelope, plane);
  const redrawCard = () => postBack.userData.tex.redraw();
  let mailIntro = null;
  let cardReady = false;

  const FIELDS = ["message", "name", "email"];
  function editField(id) {
    card.active = id;
    const next = (d) => editField(FIELDS[(FIELDS.indexOf(id) + d + FIELDS.length) % FIELDS.length]);
    runtime.textInput.startTyping({
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
    runtime.textInput.stopTyping();
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
    if (runtime.core.destroyed) return;
    // The card keeps its words until it's tucked into the envelope (mailOff clears it)
    card.status = "sent";
    redrawCard();
    mailOff();
  }
  // A sent card comes back blank for the next message
  function clearSentCard() {
    if (card.status !== "sent") return;
    Object.assign(card, { name: "", email: "", message: "", status: "idle", errors: {} });
    redrawCard();
  }
  function resetEnvelope() {
    clearSentCard();
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
    envelope.scale.set(1, 1, 1);
    resetPlane();
    gsap.killTweensOf(flap.rotation);
    flap.rotation.x = 0;
    flap.position.y = 0.075;
    envTop.userData.tex.redraw({ delivered: false });
  }
  function openEnvelope() {
    resetEnvelope();
    gsap.to(mail.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
    runtime.camera.applyShot();
    // Match the 2D sequence: arrive, open flap, extract card, drop envelope, settle, stamp.
    mailIntro = gsap.timeline({ onComplete: () => { cardReady = true; runtime.camera.applyShot(false, 0.8); } })
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
  // Sent: the card folds up into a paper plane that takes off from the envelope and flies away
  // along one smooth curve; then the empty envelope's flap folds shut and it gets its
  // DELIVERED stamp. It stays closed; clicking it (or coming back to it) opens a fresh card.
  function mailOff() {
    cardReady = false;
    mailIntro?.kill();
    resetPlane();
    let path = null;
    mailIntro = gsap.timeline()
      // The blank sheet settles over the card as its words fade off...
      .set(plane, { visible: true }, 0)
      .fromTo(planeMat, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none" }, 0)
      .set([postcard, postage], { visible: false }, 0.2)
      .call(clearSentCard, null, 0.2)
      // 1. ...folds in half lengthwise with its corners creased in, turning nose-first...
      .to(fold, { t: 1, duration: 0.6, ease: "sine.inOut", onUpdate: shapePlane }, 0.15)
      .to(plane.rotation, { y: 0, duration: 0.6, ease: "sine.inOut" }, 0.15)
      .call(() => sfx.paper(), null, 0.18)
      .call(() => sfx.rustle({ duration: 0.45 }), null, 0.3)
      // 2. ...and its wings come down into a paper plane, lifting off the envelope
      .to(fold, { t: 2, duration: 0.55, ease: "sine.inOut", onUpdate: shapePlane }, 0.75)
      .to(plane.position, { y: POSTCARD_OUT.y + 0.16, duration: 0.55, ease: "sine.inOut" }, 0.75)
      .call(() => sfx.paper(), null, 0.8)
      .call(() => sfx.paper(), null, 1.1)
      // Pull back to frame the whole envelope (and see the plane off)
      .call(() => runtime.camera.applyShot(false, 1), null, 1.15)
      // 3. Takeoff: along one curve, climbing away past the far edge of the desk, nose along
      //    the path (eased round from where it was) and banking into the turn
      .call(() => {
        const from = plane.position.clone();
        path = new THREE.CatmullRomCurve3([from, from.clone().add(new THREE.Vector3(0.6, 0.18, -0.05)), new THREE.Vector3(1.3, 1, -2.2), new THREE.Vector3(2, 2.2, -6), new THREE.Vector3(2.4, 3.2, -10)]);
        takeoffTurn.copy(plane.quaternion);
        flight.p = 0;
        sfx.planeTakeoff({ duration: 1.9 });
      }, null, 1.3)
      .to(flight, {
        p: 1,
        duration: 1.9,
        ease: "power1.in",
        onUpdate: () => {
          if (!path) return;
          path.getPointAt(flight.p, plane.position);
          heading.setFromUnitVectors(forward, path.getTangentAt(flight.p));
          bank.setFromAxisAngle(forward, -0.5 * Math.sin(Math.PI * Math.min(1, flight.p * 1.4)));
          plane.quaternion.slerpQuaternions(takeoffTurn, heading.multiply(bank), Math.min(1, flight.p * 5));
        },
      }, 1.3)
      .set(plane, { visible: false }, 3.2)
      // 4. The envelope settles back, its flap lifts off the desk and folds shut
      .to(envelope.position, { y: 0.04, z: 0, duration: 0.6, ease: "sine.inOut" }, 1.9)
      .to(envelope.rotation, { y: 0, duration: 0.6, ease: "sine.inOut" }, 1.9)
      .to(flap.position, { y: 0.075, duration: 0.15, ease: "power2.out" }, 2.4)
      .to(flap.rotation, { x: 0, duration: 0.55, ease: "power2.inOut" }, 2.45)
      .call(() => sfx.cardDown({ strength: 0.4 }), null, 2.95)
      // 5. Stamped DELIVERED, with a thump that squashes the envelope a little
      .call(() => {
        envTop.userData.tex.redraw({ delivered: true });
        sfx.stamp();
      }, null, 3.2)
      .fromTo(envelope.scale, { x: 1.04, y: 0.6, z: 1.04 }, { x: 1, y: 1, z: 1, duration: 0.4, ease: "back.out(3)" }, 3.2)
      // Back at rest inside the envelope, out of sight, for the next card
      .set(postcard.position, { x: POSTCARD_REST.x, y: POSTCARD_REST.y, z: POSTCARD_REST.z }, 3.2)
      .set(postcard.rotation, { y: 0 }, 3.2)
      .call(resetPlane, null, 3.6);
  }
  runtime.core.register(mail, {
    focus: "contact",
    onHover: (on) => {
      if (runtime.camera.focus.name === "contact") return;
      gsap.to(flap.rotation, { x: on ? -0.32 : 0, duration: 0.3, ease: "power2.out", overwrite: true });
      if (on) hoverSound(mail, (s) => s.coverOpen({ duration: 0.2 }));
    },
    onArrive: openEnvelope,
    onLeave: resetEnvelope,
    // Zoomed in on the closed, delivered envelope: open it for another card
    onClick: () => !cardReady && !mailIntro?.isActive() && openEnvelope(),
    onHotspot: (hs) => cardReady && (hs.id === "send" ? sendCard() : editField(hs.id)),
  });

  // Public state used by the other scene parts.
  return {
    mail,
    POSTCARD_OUT,
    ENVELOPE_SETTLE,
    get cardReady() { return cardReady; },
    get mailIntro() { return mailIntro; },
  };
}
