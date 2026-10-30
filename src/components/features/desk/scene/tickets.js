import * as THREE from "three";
import gsap from "gsap";
import { sfx } from "@/composables/useSfx";
import { drawTicket, drawTicketBack } from "../textures";

export function createTickets(runtime) {
  // ---------- boarding passes (experience) ----------
  // Zoomed in, the stack fans out. Click a pass to hold it up to the camera, click it again to
  // turn it over to its itinerary; ← → hold the previous / next one.
  const tickets = new THREE.Group();
  // left of the desk mat, with a clear strip of wood between them
  tickets.position.set(-5.9, 0, 2.7);
  tickets.rotation.y = 0.12;
  runtime.core.scene.add(tickets);
  const TICKET_W = 2.1;
  const TICKET_D = 0.83;
  // The pass is laid out in pixels on a 1040-wide card, so print it at that width
  const TICKET_PX = 1040 / TICKET_W;
  const ticketBody = runtime.core.toon("#fffdf5");
  const ticketList = runtime.options.experiences.map((exp, i) => {
    const t = new THREE.Group();
    const flipper = new THREE.Group();
    t.add(flipper);
    // thin card, like a real pass
    const card = runtime.core.mesh(runtime.core.bendable(TICKET_W, TICKET_D, 0.008), ticketBody, { outline: 0.018 });
    flipper.add(card);
    const face = runtime.core.printed(TICKET_W, TICKET_D, TICKET_PX, (c, w, h) => drawTicket(c, w, h, exp));
    face.geometry = runtime.core.track(runtime.core.bendable(TICKET_W, TICKET_D));
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.0045;
    const back = runtime.core.printed(TICKET_W, TICKET_D, TICKET_PX, (c, w, h) => drawTicketBack(c, w, h, exp));
    back.rotation.x = Math.PI / 2;
    back.position.y = -0.0045;
    back.geometry = runtime.core.track(runtime.core.bendable(TICKET_W, TICKET_D));
    flipper.add(face, back);
    // Newest on top of the stack; fanned out they cascade toward you
    const y = 0.012 + (runtime.options.experiences.length - 1 - i) * 0.024;
    const stack = { x: (Math.random() - 0.5) * 0.12, y, z: (Math.random() - 0.5) * 0.1, r: (Math.random() - 0.5) * 0.12 };
    const fan = { x: i * 0.1, y, z: i * 0.45, r: -0.04 + i * 0.02 };
    t.position.set(stack.x, stack.y, stack.z);
    t.rotation.y = stack.r;
    tickets.add(t);
    // a pass is card: it flexes out from the middle (held up, turned over, set down), on top
    // of which hover peels it up a touch
    const flex = runtime.core.paperFlex(flipper, [card, face, back], { centre: true, length: TICKET_W / 2 });
    // and no pass lies dead flat: they all keep the same slight curl, ends up off the desk
    // (the same for each, so stacked passes nest instead of cutting into one another)
    const restBend = 0.04;
    return { t, flipper, stack, fan, flipped: false, flex, bendAnim: { bend: 0 }, hoverBend: 0, restBend, idle: 0 };
  });
  // Held up: above the fan, square to the group and tilted to face the camera
  const HOLD = { x: 0.2, y: 1.4, z: 0.8 };
  const HOLD_TILT = Math.atan2(0.5, 1);
  let heldTicket = null;
  function settleTicket(entry, to) {
    entry.flipped = false;
    gsap.to(entry.flipper.rotation, { x: 0, duration: 0.3 });
    gsap.to(entry.t.position, { x: to.x, y: to.y, z: to.z, duration: 0.4, ease: "power2.inOut" });
    gsap.to(entry.t.rotation, { x: 0, y: to.r, duration: 0.4 });
    gsap.to(entry.t.scale, { x: 1, y: 1, z: 1, duration: 0.4 });
    // set down, its ends flick up and settle
    runtime.core.flexSettle(entry.bendAnim, 0.07, { duration: 0.5, delay: 0.3 });
  }
  // Hover works like a wallet's card stack: the selected pass peeks forward and sideways;
  // every pass over it slides back to open a gap, so its face reads clearly.
  // Each pass only ever moves along its own layer, so nothing can pass through anything,
  // and every offset rides a critically damped spring, so sweeping fast stays smooth.
  const TICKET_REVEAL = 0.62; // the overlap with the pass behind (fan step 0.45, depth 1.0) plus a margin
  const SPRING = 160;
  const DAMPING = 2 * Math.sqrt(SPRING);
  function hoverTicket(entry, on) {
    entry.hoverTarget = on ? 1 : 0;
  }
  function updateTicketHover(dt) {
    const hoveredIndex = ticketList.findIndex((entry) => entry.hoverTarget === 1 && entry !== heldTicket);
    ticketList.forEach((entry, i) => {
      if (entry === heldTicket) return;
      const goalZ = i === hoveredIndex ? 0.24 : hoveredIndex >= 0 && i < hoveredIndex ? -TICKET_REVEAL : 0;
      const goalX = i === hoveredIndex ? 0.12 : 0;
      // A hair of lift for the hovered one, well under the 0.024 gap between layers
      const goalY = i === hoveredIndex ? 0.01 : 0;
      const p = entry.flipper.position;
      entry.vx = (entry.vx || 0) + (SPRING * (goalX - p.x) - DAMPING * (entry.vx || 0)) * dt;
      p.x += entry.vx * dt;
      entry.vz = (entry.vz || 0) + (SPRING * (goalZ - p.z) - DAMPING * (entry.vz || 0)) * dt;
      entry.vy = (entry.vy || 0) + (SPRING * (goalY - p.y) - DAMPING * (entry.vy || 0)) * dt;
      p.z += entry.vz * dt;
      p.y += entry.vy * dt;
    });
    // hover peels the pass up at its ends a little; the rest is its own flex animation. The one
    // held up is in a hand: it never quite stops, swaying and tipping a touch and flexing as
    // it's held, each on its own beat so the motion never loops visibly.
    ticketList.forEach((entry, i) => {
      const held = entry === heldTicket;
      const goal = !held && i === hoveredIndex ? 0.07 : 0;
      entry.hoverBend += (goal - entry.hoverBend) * Math.min(1, dt * 12);
      entry.idle += dt;
      const k = (entry.held = (entry.held || 0) + ((held ? 1 : 0) - (entry.held || 0)) * Math.min(1, dt * 4));
      const s = entry.idle;
      const breathe = k * (0.04 * Math.sin(s * 2.1) + 0.015 * Math.sin(s * 3.7 + 1));
      entry.flex.bend = entry.restBend * (1 - k) + entry.bendAnim.bend + entry.hoverBend + breathe;
      entry.flipper.rotation.z = k * (0.03 * Math.sin(s * 1.3) + 0.01 * Math.sin(s * 2.9));
      entry.flipper.rotation.y = k * 0.025 * Math.sin(s * 0.9 + 0.7);
    });
  }
  function holdTicket(entry) {
    if (heldTicket === entry) return;
    Object.assign(entry, { vx: 0, vz: 0, vy: 0, hoverTarget: 0 });
    gsap.to(entry.flipper.position, { x: 0, y: 0, z: 0, duration: 0.3, ease: "power2.out" });
    if (heldTicket) settleTicket(heldTicket, heldTicket.fan);
    heldTicket = entry;
    gsap.to(entry.t.position, { ...HOLD, duration: 0.5, ease: "back.out(1.4)" });
    gsap.to(entry.t.rotation, { x: HOLD_TILT, y: -tickets.rotation.y, duration: 0.5 });
    gsap.to(entry.t.scale, { x: 1.45, y: 1.45, z: 1.45, duration: 0.5, ease: "back.out(1.4)" });
    // lifted by the middle, its ends droop with the swing up, then spring level
    runtime.core.flexTo(entry.bendAnim, -0.35, { duration: 1.1 });
    sfx.whoosh({ duration: 0.3 });
    runtime.camera.applyShot();
  }
  function dropTicket() {
    if (!heldTicket) return;
    settleTicket(heldTicket, heldTicket.fan);
    heldTicket = null;
    sfx.paper();
    runtime.camera.applyShot();
  }
  function flipTicket(entry) {
    entry.flipped = !entry.flipped;
    gsap.to(entry.flipper.rotation, { x: entry.flipped ? Math.PI : 0, duration: 0.55, ease: "back.out(1.3)" });
    // turned over fast, the ends trail the turn, then whip through and settle
    runtime.core.flexTo(entry.bendAnim, -0.3, { rise: 0.2 });
    sfx.whoosh({ duration: 0.3 });
  }
  const arrangeTickets = (fanned) => {
    heldTicket = null;
    ticketList.forEach((entry, i) => {
      const to = fanned ? entry.fan : entry.stack;
      runtime.core.timers.push(setTimeout(() => settleTicket(entry, to), (fanned ? i : ticketList.length - 1 - i) * 70));
    });
    sfx.riffle({ count: ticketList.length, duration: 0.3 });
  };
  const ticketFor = (obj) => ticketList.find(({ t }) => {
    for (let o = obj; o; o = o.parent) if (o === t) return true;
    return false;
  });
  const clickTicket = (hit) => {
    const entry = ticketFor(hit.object);
    if (!entry) return;
    entry === heldTicket ? flipTicket(entry) : holdTicket(entry);
  };
  // Hover lifts just the pass under the pointer
  ticketList.forEach((entry) =>
    runtime.core.register(entry.t, {
      focus: "experience",
      item: true,
      // Each pass lies partly under the one behind it, so it slides forward out from under
      // that one first and only then lifts; leaving, it settles down before sliding back
      onHover: (on) => entry !== heldTicket && hoverTicket(entry, on),
      onClick: clickTicket,
    }),
  );
  runtime.core.register(tickets, {
    focus: "experience",
    onArrive: () => arrangeTickets(true),
    onLeave: () => arrangeTickets(false),
    onClick: clickTicket,
    onKey: (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return false;
      const at = heldTicket ? ticketList.indexOf(heldTicket) : -1;
      const next = Math.max(0, Math.min(ticketList.length - 1, at + (e.key === "ArrowRight" ? 1 : -1)));
      holdTicket(ticketList[at < 0 ? 0 : next]);
      return true;
    },
  });

  // Public state used by the other scene parts.
  return {
    tickets,
    get heldTicket() { return heldTicket; },
    HOLD,
    dropTicket,
    updateTicketHover,
  };
}
