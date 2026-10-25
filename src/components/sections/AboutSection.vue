<template>
  <section
    id="about"
    ref="sectionRef"
    class="bg-[rgba(255,240,150,0.45)] dark:bg-[rgba(255,190,120,0.04)] py-20 px-4 sm:px-6 lg:px-8 relative transition-colors duration-300 bg-grid-pattern overflow-hidden">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div
        class="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4 text-center md:text-left">
        <h2
          v-title-reveal
          class="font-display text-4xl md:text-6xl font-bold uppercase tracking-tight leading-none text-black dark:text-white">
          About
          <span
            class="bg-black text-white px-3 py-1 dark:bg-white dark:text-black inline-block transform rotate-1"
            >Me</span
          >
        </h2>
        <p
          class="font-bold uppercase tracking-[0.15em] text-xs text-black/60 dark:text-white/60">
          <span class="hidden [@media(hover:hover)]:inline"
            ><i class="fas fa-hand-pointer mr-1"></i> Drag the cards around ✦</span
          >
        </p>
      </div>

      <!-- Cork Pinboard -->
      <div class="cork-frame relative">
        <span class="frame-corner frame-tl" aria-hidden="true"></span>
        <span class="frame-corner frame-tr" aria-hidden="true"></span>
        <span class="frame-corner frame-bl" aria-hidden="true"></span>
        <span class="frame-corner frame-br" aria-hidden="true"></span>

        <div
          ref="boardRef"
          class="board relative overflow-hidden">
        <component
          :is="sticker.href ? 'a' : 'div'"
          v-for="sticker in stickers"
          :key="sticker.id"
          :ref="
            (el) => {
              if (el) stickerEls[sticker.id] = el.$el || el;
            }
          "
          class="sticker absolute p-4 md:p-5 border-[2.5px] border-black shadow-[5px_5px_0_#000] text-black select-none"
          :class="[sticker.class, sticker.href ? 'cursor-pointer' : 'cursor-grab']"
          :style="{
            '--sx': sticker.pos[0] + '%',
            '--sy': sticker.pos[1] + '%',
            '--sx-m': sticker.mobile[0] + '%',
            '--sy-m': sticker.mobile[1] + '%',
            '--sw': sticker.width || 'auto',
            '--sw-m': sticker.mobileWidth || sticker.width || 'auto',
          }"
          :href="sticker.href"
          :target="sticker.href ? '_blank' : undefined"
          :rel="sticker.href ? 'noopener noreferrer' : undefined"
          @click="sticker.href && trackResumeDownload()">
          <!-- Push pin: pulled out while dragging, pushed back in on release -->
          <span class="pin" aria-hidden="true">
            <span class="pin-shadow"></span>
            <span class="pin-ring"></span>
            <span class="pin-needle"></span>
            <span class="pin-head" :style="{ backgroundColor: sticker.pin }"></span>
          </span>

          <template v-if="sticker.type === 'stat'">
            <b class="block font-display font-bold text-5xl leading-none tracking-tighter">{{
              sticker.value
            }}</b>
            <span class="block mt-2 font-display font-bold text-xs uppercase">{{
              sticker.label
            }}</span>
          </template>

          <template v-else-if="sticker.type === 'stack'">
            <h3 class="font-display font-bold text-sm uppercase mb-3">Stack</h3>
            <div class="flex flex-col gap-2">
              <div
                v-for="group in stack"
                :key="group.label"
                class="flex flex-wrap items-center gap-1.5">
                <span
                  class="w-[4.5rem] font-bold text-[10px] uppercase tracking-wider"
                  >{{ group.label }}</span
                >
                <span
                  v-for="tech in group.items"
                  :key="tech"
                  class="bg-white border-2 border-black px-2 py-0.5 text-xs font-bold"
                  >{{ tech }}</span
                >
              </div>
            </div>
          </template>

          <template v-else>
            <h3
              class="font-display font-bold text-sm uppercase"
              :class="{ 'mb-2': sticker.body }">
              <i v-if="sticker.icon" :class="[sticker.icon, 'mr-1']"></i>
              {{ sticker.title }}
            </h3>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p v-if="sticker.body" class="font-medium leading-relaxed text-[0.95rem]" v-html="sticker.body"></p>
          </template>
        </component>
      </div>
    </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import gsap from "gsap";
import { sfx } from "@/composables/useSfx";
import { Draggable } from "gsap/Draggable";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePostHog } from "@/composables/usePostHog";
import { ABOUT_STACK as stack, ABOUT_NOTES as stickers } from "@/data/about";

gsap.registerPlugin(Draggable, ScrollTrigger);

const { posthog } = usePostHog();
const trackResumeDownload = () => {
  posthog.capture("resume_downloaded");
};

const sectionRef = ref(null);
const boardRef = ref(null);
const stickerEls = {};
let draggables = [];
let ctx = null;

const pinParts = (card) => {
  const pin = card.querySelector(".pin");
  return {
    pin,
    head: pin.querySelector(".pin-head"),
    needle: pin.querySelector(".pin-needle"),
    shadow: pin.querySelector(".pin-shadow"),
    ring: pin.querySelector(".pin-ring"),
  };
};

// Pin pops out of the board: head lifts and tilts, the needle shows, shadow drifts away
const pullPin = (card) => {
  const { pin, head, needle, shadow } = pinParts(card);
  sfx.pop({ pitch: 1.4 });
  gsap.killTweensOf([pin, head, needle, shadow]);
  gsap.to(pin, { y: -34, x: 8, rotation: -28, duration: 0.25, ease: "back.out(2.5)" });
  gsap.to(needle, { scaleY: 1, duration: 0.15, ease: "power2.out" });
  gsap.to(shadow, { x: 16, y: 26, scale: 0.6, opacity: 0.15, duration: 0.25 });
  gsap.to(head, { scaleX: 1, scaleY: 1, duration: 0.2 });
};

// Pin drops and sticks: needle sinks in, the head squashes on impact, a ring ripples out
const pushPin = (card) => {
  const { pin, head, needle, shadow, ring } = pinParts(card);
  sfx.tick({ pitch: 0.55, delay: 0.32 });
  gsap.killTweensOf([pin, head, needle, shadow, ring]);
  gsap
    .timeline({ delay: 0.12 })
    .to(pin, { y: 0, x: 0, rotation: 0, duration: 0.22, ease: "power4.in" })
    .to(shadow, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.22, ease: "power4.in" }, "<")
    .to(needle, { scaleY: 0, duration: 0.08 }, "-=0.06")
    .fromTo(
      head,
      { scaleX: 1.25, scaleY: 0.75 },
      { scaleX: 1, scaleY: 1, duration: 0.5, ease: "elastic.out(1.2, 0.4)" },
    )
    .fromTo(ring, { scale: 0.4, opacity: 0.8 }, { scale: 1.8, opacity: 0, duration: 0.4, ease: "power2.out" }, "<")
    .fromTo(card, { y: "+=3" }, { y: "-=3", duration: 0.25, ease: "bounce.out" }, "<");
};

onMounted(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const els = stickers.map((s) => stickerEls[s.id]);
  let z = 10;

  ctx = gsap.context(() => {
    els.forEach((el, i) => gsap.set(el, { rotation: stickers[i].rotate }));

    if (!reduced) {
      // Stickers get slapped onto the board one by one, then pinned
      const pins = els.map((el) => el.querySelector(".pin"));
      const intro = gsap
        .timeline({ scrollTrigger: { trigger: boardRef.value, start: "top 75%" } })
        .from(els, {
          scale: 0,
          rotation: () => gsap.utils.random(-25, 25),
          duration: 0.55,
          stagger: 0.08,
          ease: "back.out(2.2)",
        })
        .from(
          pins,
          { y: -60, opacity: 0, duration: 0.45, stagger: 0.07, ease: "bounce.out" },
          "-=0.3",
        );
      // Each sticker slaps onto the board, then its pin clicks in
      els.forEach((_, i) => {
        intro.call(() => sfx.slap(), null, 0.25 + i * 0.08);
        intro.call(() => sfx.tick({ pitch: 0.55 }), null, 0.33 + els.length * 0.08 + i * 0.07);
      });
    }
  }, sectionRef.value);

  // Dragging is for mouse users only, so touch scrolling never gets stuck on a card.
  // The resume link stays a plain link.
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  draggables = Draggable.create(
    els.filter((_, i) => !stickers[i].href),
    {
      bounds: boardRef.value,
      onPress() {
        this.target.style.zIndex = ++z;
        gsap.to(this.target, { scale: 1.06, rotation: 0, boxShadow: "12px 12px 0 #000", duration: 0.2 });
        pullPin(this.target);
      },
      onRelease() {
        gsap.to(this.target, {
          scale: 1,
          rotation: gsap.utils.random(-6, 6),
          boxShadow: "5px 5px 0 #000",
          duration: 0.4,
          ease: "back.out(3)",
        });
        pushPin(this.target);
      },
    },
  );
});

onUnmounted(() => {
  draggables.forEach((d) => d.kill());
  if (ctx) ctx.revert();
});
</script>

<style scoped>
/* ---------- Cork Pinboard Frame ---------- */
.cork-frame {
  padding: 12px;
  background: linear-gradient(135deg, #b87c46 0%, #995c2c 50%, #b87c46 100%);
  border: 3.5px solid #000;
  box-shadow: 8px 8px 0 #000;
  transition: box-shadow 0.2s;
}
:global(.dark .cork-frame) {
  background: linear-gradient(135deg, #6b4020 0%, #4f2d14 50%, #6b4020 100%);
  border-color: #000;
  box-shadow: 8px 8px 0 #000;
}

@media (min-width: 1024px) {
  .cork-frame {
    padding: 18px;
    box-shadow: 12px 12px 0 #000;
  }
}

/* Corner metal brackets with rivet */
.frame-corner {
  position: absolute;
  width: 26px;
  height: 26px;
  background: #ffdd00;
  border: 2px solid #000;
  z-index: 5;
  pointer-events: none;
}
.frame-corner::after {
  content: "";
  position: absolute;
  width: 5px;
  height: 5px;
  background: #000;
  border-radius: 50%;
}
.frame-tl { top: -2px; left: -2px; clip-path: polygon(0 0, 100% 0, 0 100%); }
.frame-tl::after { top: 5px; left: 5px; }
.frame-tr { top: -2px; right: -2px; clip-path: polygon(0 0, 100% 0, 100% 100%); }
.frame-tr::after { top: 5px; right: 5px; }
.frame-bl { bottom: -2px; left: -2px; clip-path: polygon(0 0, 0 100%, 100% 100%); }
.frame-bl::after { bottom: 5px; left: 5px; }
.frame-br { bottom: -2px; right: -2px; clip-path: polygon(100% 0, 0 100%, 100% 100%); }
.frame-br::after { bottom: 5px; right: 5px; }

/* Cork Board Surface */
.board {
  height: 1250px;
  border: 2.5px solid #000;
  background-color: #cb9b67;
  background-image:
    radial-gradient(ellipse at 50% 50%, rgba(255, 235, 195, 0.16), rgba(60, 35, 10, 0.24)),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.45  0 0 0 0 0.28  0 0 0 0 0.12  0 0 0 0.35 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23c)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  box-shadow: inset 0 4px 14px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(0, 0, 0, 0.25);
}
:global(.dark .board) {
  background-color: #3d281a;
  background-image:
    radial-gradient(ellipse at 50% 50%, rgba(180, 120, 80, 0.08), rgba(0, 0, 0, 0.4)),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.15  0 0 0 0 0.09  0 0 0 0 0.04  0 0 0 0.45 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23c)'/%3E%3C/svg%3E");
  box-shadow: inset 0 4px 16px rgba(0, 0, 0, 0.65), inset 0 0 0 1px rgba(0, 0, 0, 0.4);
}
.sticker {
  left: var(--sx-m);
  top: var(--sy-m);
  width: var(--sw-m);
  max-width: 92%;
}
/* Free-form board layout needs the full desktop width; tablets use the stacked one */
@media (min-width: 1024px) {
  .board {
    height: 620px;
  }
  .sticker {
    left: var(--sx);
    top: var(--sy);
    width: var(--sw);
    max-width: none;
  }
}

@media (hover: none) {
  .sticker.cursor-grab {
    cursor: default;
  }
}

/* ---------- Push pin ---------- */
.pin {
  position: absolute;
  top: -14px;
  left: 50%;
  width: 26px;
  height: 26px;
  margin-left: -13px;
  z-index: 5;
  pointer-events: none;
}
.pin-head {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2.5px solid #000;
  /* glossy highlight + darker rim, so it reads as a domed head */
  background-image: radial-gradient(
    circle at 35% 30%,
    rgba(255, 255, 255, 0.85) 0 18%,
    transparent 22%
  ),
  radial-gradient(circle at 50% 55%, transparent 55%, rgba(0, 0, 0, 0.25) 100%);
}
.pin-needle {
  position: absolute;
  left: 50%;
  top: 18px;
  width: 3px;
  height: 18px;
  margin-left: -1.5px;
  background: linear-gradient(90deg, #9ca3af, #4b5563);
  border-radius: 0 0 2px 2px;
  transform: scaleY(0);
  transform-origin: top;
}
.pin-shadow {
  position: absolute;
  left: 7px;
  top: 9px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
}
.pin-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 34px;
  height: 34px;
  margin: -17px 0 0 -17px;
  border-radius: 50%;
  border: 2px solid #000;
  opacity: 0;
}

:deep(.name-mark) {
  background: var(--color-primary);
  color: #000;
  padding: 0 6px;
  border: 2px solid #000;
  display: inline-block;
  transform: rotate(-1deg);
}
</style>
