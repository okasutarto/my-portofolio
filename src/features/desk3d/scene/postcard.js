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
  // The paper plane a sent card folds into: two wings hinged on the centre line, nose toward
  // -z, and a keel folded down under them. Flat (wings level, no keel) it's the folded sheet.
  const PLANE_L = 1.15;
  const PLANE_W = 0.5;
  const PLANE_KEEL = 0.13;
  const PLANE_FOLD = 0.42;
  const planeMat = runtime.core.toon("#fffdf5");
  planeMat.side = THREE.DoubleSide;
  const planeEdge = runtime.core.track(new THREE.LineBasicMaterial({ color: "#000" }));
  const paperPiece = (points) => {
    const geo = runtime.core.track(new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p))));
    geo.computeVertexNormals();
    const piece = new THREE.Mesh(geo, planeMat);
    piece.castShadow = true;
    piece.add(new THREE.LineSegments(runtime.core.track(new THREE.EdgesGeometry(geo)), planeEdge));
    return piece;
  };
  const nose = [0, 0, -PLANE_L / 2];
  const tail = [0, 0, PLANE_L / 2];
  const wings = [-1, 1].map((side) => paperPiece([nose, tail, [side * PLANE_W, 0, PLANE_L / 2]]));
  const keel = paperPiece([nose, tail, [0, -PLANE_KEEL, PLANE_L / 2]]);
  const plane = new THREE.Group();
  plane.add(...wings, keel);
  plane.visible = false;
  // Laid flat and hidden, where the card lies out on the envelope
  function resetPlane() {
    plane.visible = false;
    plane.position.set(POSTCARD_OUT.x, POSTCARD_OUT.y + 0.03, POSTCARD_OUT.z);
    plane.rotation.set(0, POSTCARD_OUT.r, 0);
    wings.forEach((wing) => wing.rotation.set(0, 0, 0));
    keel.scale.set(1, 0.01, 1);
  }
  resetPlane();
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
  // Sent: the card folds into a paper plane that takes off from the envelope and flies away;
  // then the empty envelope's flap folds shut and it gets its DELIVERED stamp. It stays closed;
  // clicking it (or coming back to it) opens a fresh card.
  function mailOff() {
    cardReady = false;
    mailIntro?.kill();
    resetPlane();
    // Pull back to frame the whole envelope, as while it opens
    runtime.camera.applyShot(false, 0.8);
    mailIntro = gsap.timeline()
      // 1. The card creases in from its sides...
      .to(postcard.scale, { x: 0.62, z: 0.92, duration: 0.3, ease: "power2.in" }, 0)
      .call(() => sfx.paper(), null, 0)
      .call(() => sfx.paper(), null, 0.2)
      // ...and becomes the flat folded sheet, whose wings fold up over a keel
      .set([postcard, postage], { visible: false }, 0.3)
      .set(plane, { visible: true }, 0.3)
      .call(clearSentCard, null, 0.3)
      .to(wings[0].rotation, { z: -PLANE_FOLD, duration: 0.4, ease: "back.out(2)" }, 0.32)
      .to(wings[1].rotation, { z: PLANE_FOLD, duration: 0.4, ease: "back.out(2)" }, 0.32)
      .to(keel.scale, { y: 1, duration: 0.3, ease: "power2.out" }, 0.32)
      .to(plane.position, { y: POSTCARD_OUT.y + 0.12, duration: 0.4, ease: "power2.out" }, 0.32)
      .to(plane.rotation, { y: 0, duration: 0.4, ease: "sine.inOut" }, 0.32)
      .call(() => sfx.rustle({ duration: 0.35 }), null, 0.32)
      // 2. Ready for takeoff: it lifts, nose up, and rocks once
      .to(plane.position, { y: 0.5, duration: 0.4, ease: "sine.inOut" }, 0.8)
      .to(plane.rotation, { x: 0.28, z: 0.12, duration: 0.25, ease: "sine.out" }, 0.8)
      .to(plane.rotation, { z: -0.08, duration: 0.2, ease: "sine.inOut" }, 1.05)
      .call(() => sfx.planeTakeoff({ duration: 1.6 }), null, 0.85)
      // 3. Takeoff: away past the far edge of the desk, climbing and banking as it goes
      .to(plane.position, { x: 1.6, y: 2.2, z: -8, duration: 1.1, ease: "power2.in" }, 1.25)
      .to(plane.rotation, { x: 0.12, z: -0.4, duration: 1.1, ease: "sine.inOut" }, 1.25)
      .set(plane, { visible: false }, 2.35)
      // 4. The envelope settles back, its flap lifts off the desk and folds shut
      .to(envelope.position, { y: 0.04, z: 0, duration: 0.6, ease: "sine.inOut" }, 1.6)
      .to(envelope.rotation, { y: 0, duration: 0.6, ease: "sine.inOut" }, 1.6)
      .to(flap.position, { y: 0.075, duration: 0.15, ease: "power2.out" }, 2.1)
      .to(flap.rotation, { x: 0, duration: 0.5, ease: "power2.inOut" }, 2.15)
      .call(() => sfx.cardDown({ strength: 0.4 }), null, 2.6)
      // 5. Stamped DELIVERED, with a thump that squashes the envelope a little
      .call(() => {
        envTop.userData.tex.redraw({ delivered: true });
        sfx.stamp();
      }, null, 2.85)
      .fromTo(envelope.scale, { x: 1.04, y: 0.6, z: 1.04 }, { x: 1, y: 1, z: 1, duration: 0.4, ease: "back.out(3)" }, 2.85)
      // Back at rest inside the envelope, out of sight, for the next card
      .set(postcard.position, { x: POSTCARD_REST.x, y: POSTCARD_REST.y, z: POSTCARD_REST.z }, 2.85)
      .set(postcard.rotation, { y: 0 }, 2.85)
      .set(postcard.scale, { x: 1, z: 1 }, 2.85)
      .call(resetPlane, null, 3.25);
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
