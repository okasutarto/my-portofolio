<template>
  <section
    id="experience"
    ref="sectionRef"
    class="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300 bg-grid-pattern">
    <div class="max-w-5xl mx-auto relative z-10">
      <!-- Section Header -->
      <div class="mb-14 text-center lg:text-left">
        <h2
          v-title-reveal
          class="font-display text-4xl md:text-6xl font-bold uppercase tracking-tight leading-none text-black dark:text-white">
          My career
          <span
            class="bg-black text-white px-3 py-1 dark:bg-primary dark:text-black inline-block transform -rotate-1 shadow-neo-sm"
            >Timeline</span
          >
        </h2>
      </div>

      <!-- Boarding passes, newest first -->
      <div class="relative flex flex-col gap-7">
        <article
          v-for="ticket in tickets"
          :key="ticket.id"
          class="ticket text-[#111]"
          :class="{ open: openId === ticket.id }">
          <!-- Main part -->
          <div class="ticket-main relative p-5 md:p-7 bg-[#fffdf5] border-[2.5px] border-black">
            <div class="flex items-center justify-between gap-3">
              <!-- The company is the "airline" -->
              <component
                :is="ticket.companyUrl ? 'a' : 'span'"
                :href="ticket.companyUrl || undefined"
                :target="ticket.companyUrl ? '_blank' : undefined"
                :rel="ticket.companyUrl ? 'noopener noreferrer' : undefined"
                class="flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider"
                :class="{ 'hover:underline decoration-2': ticket.companyUrl }">
                <span
                  class="w-8 h-8 grid place-items-center border-2 border-black font-display text-xs"
                  :class="toneClass(ticket.tone)"
                  >{{ ticket.companyInitial }}</span
                >
                {{ ticket.company }}
              </component>
              <span
                class="status-stamp font-display font-bold text-[10px] md:text-xs uppercase px-2.5 py-1 border-2 -rotate-3 whitespace-nowrap"
                :class="
                  ticket.current
                    ? 'border-[#16a34a] text-[#16a34a]'
                    : 'border-black/60 text-black/60'
                ">
                {{ ticket.current ? "✈ Boarding now" : "Arrived ✓" }}
              </span>
            </div>

            <!-- Route: start month -> end month. The small labels sit on their own row so the
                 flight path lines up with the middle of the big letters. -->
            <div class="mt-5 mb-4">
              <div class="flex items-center gap-3 md:gap-5">
                <span class="route-code flap">{{ ticket.from.month }}</span>
                <!-- Dotted trail drawn behind the plane as it flies to the destination -->
                <div class="flight-path relative flex-1 h-6" aria-hidden="true">
                  <span class="trail"></span>
                  <i class="plane fas fa-plane text-lg md:text-xl"></i>
                </div>
                <span class="route-code flap">{{ ticket.to.month }}</span>
              </div>
              <div class="route-label flex justify-between gap-3 mt-1.5">
                <span>{{ ticket.from.label }}</span>
                <span class="text-right">{{ ticket.to.label }}</span>
              </div>
            </div>

            <h3
              class="flap font-display font-bold uppercase tracking-tight text-lg md:text-2xl leading-tight">
              {{ ticket.role }}
            </h3>

            <dl class="flex flex-wrap gap-x-7 gap-y-2 mt-3">
              <div>
                <dt class="field-label">Destination</dt>
                <dd class="font-bold">{{ ticket.location }}</dd>
              </div>
              <div>
                <dt class="field-label">Duration</dt>
                <dd class="font-bold">{{ ticket.duration }}</dd>
              </div>
              <div>
                <dt class="field-label">Gear</dt>
                <dd class="font-bold">{{ ticket.technologies.slice(0, 3).join(" · ") }}</dd>
              </div>
            </dl>
          </div>

          <!-- Stub: the headline number; tear it off to open the details -->
          <button
            type="button"
            class="ticket-stub relative flex md:flex-col justify-between items-center md:items-stretch gap-4 p-4 md:p-5 border-[2.5px] border-black text-left text-black"
            :class="toneClass(ticket.tone)"
            :aria-expanded="openId === ticket.id"
            :aria-controls="`ticket-details-${ticket.id}`"
            @click="toggle(ticket.id)">
            <span>
              <span class="field-label !opacity-70">Highlight</span>
              <span
                class="block font-display font-bold leading-none tracking-tighter"
                :class="ticket.stats[0].value.length > 5 ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl'"
                >{{ ticket.stats[0].value }}</span
              >
              <span class="block mt-1 text-[11px] font-bold uppercase tracking-wider">{{
                ticket.stats[0].label
              }}</span>
            </span>
            <span class="flex flex-col gap-2 items-end md:items-stretch flex-1 md:flex-none">
              <span class="barcode w-full max-w-[160px] md:max-w-none" aria-hidden="true"></span>
              <span class="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
                {{ openId === ticket.id ? "Close ↙" : "Tear for details ↗" }}
              </span>
            </span>
          </button>

          <!-- Details revealed when the stub is torn off -->
          <div
            :id="`ticket-details-${ticket.id}`"
            class="ticket-details"
            role="region"
            :aria-label="`${ticket.role} at ${ticket.company}`">
            <div class="overflow-hidden">
              <div
                class="mt-3 p-5 md:p-6 bg-white dark:bg-surface-dark border-[2.5px] border-black dark:border-[#f4ead5] text-black dark:text-white grid grid-cols-1 md:grid-cols-[1fr_220px] gap-6">
                <ul class="flex flex-col gap-2.5">
                  <li
                    v-for="(achievement, aIndex) in ticket.achievements"
                    :key="aIndex"
                    class="flex gap-3 font-medium leading-relaxed">
                    <i
                      class="fas fa-plane w-4 h-4 leading-4 self-start flex-shrink-0 text-center text-xs mt-1.5 -rotate-45 opacity-60"
                      aria-hidden="true"></i>
                    <p>
                      <template v-for="(part, pIndex) in splitNumbers(achievement)" :key="pIndex">
                        <strong v-if="part.number" class="bg-primary/60 text-black dark:text-white px-1">{{
                          part.text
                        }}</strong>
                        <template v-else>{{ part.text }}</template>
                      </template>
                    </p>
                  </li>
                </ul>
                <div class="flex md:flex-col flex-wrap gap-3">
                  <div
                    v-for="stat in ticket.stats"
                    :key="stat.label"
                    class="flex-1 px-4 py-3 border-2 border-black text-black shadow-[4px_4px_0_#000]"
                    :class="toneClass(stat.tone)">
                    <b
                      class="block font-display font-bold leading-none tracking-tighter"
                      :class="stat.value.length > 5 ? 'text-xl' : 'text-3xl'"
                      >{{ stat.value }}</b
                    >
                    <span class="block mt-1 text-[11px] font-bold uppercase tracking-wider">{{
                      stat.label
                    }}</span>
                  </div>
                </div>
                <div class="md:col-span-2 flex flex-wrap gap-2">
                  <span
                    v-for="tech in ticket.technologies"
                    :key="tech"
                    class="px-2.5 py-0.5 border-2 border-black dark:border-[#f4ead5] text-xs font-bold uppercase tracking-wider"
                    >{{ tech }}</span
                  >
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import gsap from "gsap";
import { sfx } from "@/composables/useSfx";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { experiences } from "@/data/experience";

gsap.registerPlugin(ScrollTrigger);

const TONES = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  pink: "bg-accent-pink",
  violet: "bg-[#c4b5fd]",
};
const toneClass = (tone) => TONES[tone] || TONES.primary;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "Jun 2026" -> { month: "JUN", year: 2026, index } ; "Present" -> today
const parseDate = (text) => {
  const [mon, year] = text.trim().split(/\s+/);
  const index = MONTHS.findIndex((m) => m.toLowerCase() === mon.toLowerCase());
  return { month: mon.toUpperCase(), year: Number(year), index };
};

const monthsBetween = (a, b) => (b.year - a.year) * 12 + (b.index - a.index) + 1;

const formatDuration = (months) => {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years && `${years} yr`, rest && `${rest} mo`].filter(Boolean).join(" ");
};

const tickets = experiences.map((experience) => {
  const [startText, endText] = experience.period.split(/\s*-\s*/);
  const from = parseDate(startText);
  const now = new Date();
  const isPresent = /present/i.test(endText);
  const to = isPresent
    ? { month: "PRESENT", year: now.getFullYear(), index: now.getMonth() }
    : parseDate(endText);
  return {
    ...experience,
    tone: experience.metric?.tone || "primary",
    from: { month: from.month, label: `${from.month} ${from.year}` },
    to: { month: to.month, label: isPresent ? "Today" : `${to.month} ${to.year}` },
    duration: formatDuration(monthsBetween(from, to)),
  };
});

// Split text so percentages ("40%", "99.9%") can be highlighted
const splitNumbers = (text) =>
  text
    .split(/([+−-]?\d+(?:\.\d+)?%)/)
    .filter(Boolean)
    .map((part) => ({ text: part, number: /\d%$/.test(part) }));

const sectionRef = ref(null);
const openId = ref(null);
const toggle = (id) => {
  const opening = openId.value !== id;
  openId.value = opening ? id : null;
  // Tearing the stub off rips; putting it back is just a rustle of paper
  if (opening) sfx.tear();
  else sfx.paper();
};

let ctx = null;

// Split-flap board: letters cycle randomly, then lock in left to right
const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const scramble = (el, duration) => {
  const final = el.textContent.trim();
  const state = { p: 0 };
  return gsap.to(state, {
    p: 1,
    duration,
    ease: "none",
    onUpdate() {
      const locked = Math.floor(state.p * final.length);
      el.textContent =
        final.slice(0, locked) +
        [...final.slice(locked)]
          .map((c) => (c === " " ? " " : FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)]))
          .join("");
    },
    onComplete() {
      el.textContent = final;
    },
  });
};

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  ctx = gsap.context(() => {
    // Each ticket is dealt when it scrolls into view, so motion and sound match what's on screen
    gsap.utils.toArray(".ticket").forEach((ticket, i) => {
      // Measure from the list + offsetTop: the ticket itself starts rotated and offset,
      // which would make its own box trigger the animation too early
      const list = ticket.parentElement;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: list, start: () => `top+=${ticket.offsetTop} 85%` },
      });
      const at = 0;
      const fromRight = i % 2 === 0;
      const plane = ticket.querySelector(".plane");
      const trail = ticket.querySelector(".trail");
      const stamp = ticket.querySelector(".status-stamp");

      tl
        // 1. Dealt like a card: thrown in from alternating sides with a spin, then lands
        .fromTo(
          ticket,
          { x: fromRight ? "60vw" : "-60vw", y: -60, rotation: fromRight ? 14 : -14, opacity: 0 },
          { x: 0, y: 0, rotation: 0, opacity: 1, duration: 0.6, ease: "back.out(1.3)" },
          at,
        )
        // A tiny squash as it hits the table
        .to(
          ticket,
          { keyframes: { scaleY: [1, 0.96, 1], scaleX: [1, 1.015, 1] }, duration: 0.25, transformOrigin: "50% 100%" },
          at + 0.5,
        )
        // 3. The plane flies to the destination, drawing its dotted trail
        .fromTo(trail, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power2.inOut" }, at + 0.75)
        .fromTo(plane, { "--fly": 0 }, { "--fly": 1, duration: 0.9, ease: "power2.inOut" }, at + 0.75)
        // 4. Landed: the status stamp slams down and the ticket shakes
        .from(
          stamp,
          {
            scale: 2.6,
            rotation: -20,
            opacity: 0,
            duration: 0.35,
            ease: "back.out(2)",
            clearProps: "transform,opacity",
          },
          at + 1.6,
        )
        .to(ticket, { keyframes: { x: [-6, 5, -3, 0] }, duration: 0.3, clearProps: "transform" }, at + 1.72);

      // 2. Departure-board letters flip into place
      ticket.querySelectorAll(".flap").forEach((el, k) => {
        tl.add(scramble(el, 0.7 + k * 0.15), at + 0.35);
      });

      // Sounds: thrown, lands, letters clatter, stamp
      tl.call(() => sfx.whoosh({ duration: 0.45 }), null, at)
        .call(() => sfx.slap(), null, at + 0.48)
        .call(() => sfx.printer({ duration: 0.7, steps: 10 }), null, at + 0.35)
        .call(() => sfx.stamp(), null, at + 1.68);
    });
  }, sectionRef.value);
});

onUnmounted(() => {
  if (ctx) ctx.revert();
});
</script>

<style scoped>
.ticket {
  display: grid;
  grid-template-columns: 1fr;
  filter: drop-shadow(6px 6px 0 var(--color-shadow));
}
.ticket-main {
  border-radius: 14px 14px 0 0;
  border-bottom-width: 0;
}
.ticket-stub {
  border-top: 3px dashed #000;
  border-radius: 0 0 14px 14px;
  transition: transform 0.6s cubic-bezier(0.3, 1.4, 0.5, 1);
  transform-origin: top center;
}
.ticket.open .ticket-stub {
  transform: translateY(14px) rotate(2deg);
}

@media (min-width: 768px) {
  .ticket {
    grid-template-columns: 1fr 210px;
  }
  .ticket-main {
    border-radius: 14px 0 0 14px;
    border-bottom-width: 2.5px;
    border-right-width: 0;
  }
  .ticket-stub {
    border-top: 2.5px solid #000;
    border-left: 3px dashed #000;
    border-radius: 0 14px 14px 0;
    transform-origin: left center;
  }
  /* Punched notches along the tear line */
  .ticket-stub::before,
  .ticket-stub::after {
    content: "";
    position: absolute;
    left: -15px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--notch-bg, #f0f0f0);
    border: 2.5px solid #000;
  }
  .ticket-stub::before {
    top: -15px;
  }
  .ticket-stub::after {
    bottom: -15px;
  }
  /* Whole selector inside :global() — ":global(.dark) .x" would compile to just ".dark" */
  :global(.dark .ticket-stub::before),
  :global(.dark .ticket-stub::after) {
    background: #1a1714;
  }
  .ticket.open .ticket-stub {
    transform: rotate(10deg) translate(30px, 26px);
  }
}

.route-code {
  font-family: "Lexend Mega", sans-serif;
  font-weight: 800;
  font-size: clamp(1.4rem, 6vw, 3rem);
  letter-spacing: -0.04em;
  line-height: 1;
}
.route-label {
  font: 700 0.7rem "Space Grotesk", sans-serif;
  letter-spacing: 0.1em;
  opacity: 0.6;
}
.trail {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 3px dotted #000;
  transform-origin: left center;
}
/* Resting state: the plane has landed at the destination end of the trail */
.plane {
  --fly: 1;
  position: absolute;
  top: 50%;
  left: calc(var(--fly) * 100%);
  transform: translate(calc(var(--fly) * -100%), -50%) rotate(45deg);
  background: #fffdf5;
  padding: 0 4px;
}


.field-label {
  display: block;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  opacity: 0.55;
}

.barcode {
  display: block;
  height: 44px;
  background: repeating-linear-gradient(
    90deg,
    #000 0 2px,
    transparent 2px 4px,
    #000 4px 7px,
    transparent 7px 9px,
    #000 9px 10px,
    transparent 10px 13px
  );
}

.ticket-details {
  grid-column: 1 / -1;
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.ticket.open .ticket-details {
  grid-template-rows: 1fr;
}
</style>
