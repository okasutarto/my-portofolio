<template>
  <div ref="trackRef" class="relative" :style="{ height: `${projects.length * 110}vh` }">
    <div class="stage" :style="{ '--nav-h': `${navH}px` }">
      <!-- One colour band per project; the next one slides up over the last as you scroll -->
      <div
        v-for="(project, index) in projects"
        :key="project.id"
        class="band"
        :style="bandStyle(index)"
        aria-hidden="true">
        <span class="band-num font-display">{{ pad(index + 1) }}</span>
      </div>

      <div class="stage-inner">
        <!-- Left: what the project is, and the way in -->
        <div ref="copyRef" class="copy">
          <span class="type-sticker">{{ shownProject.type }}</span>
          <h3 class="copy-title font-display" :class="titleSize">{{ shownProject.title }}</h3>
          <p class="copy-desc">{{ shownProject.description }}</p>
          <a :href="`/projects/${shownProject.id}`" class="keycap font-display" @click.prevent="explore">
            Explore {{ shownProject.title }} →
          </a>
        </div>

        <!-- Centre: the phone never moves; its screen scrolls like a feed -->
        <div ref="phoneRef" class="phone-frame showcase-phone">
          <div class="phone-screen">
            <span class="phone-island"></span>
            <div class="strip" :style="{ transform: `translateY(${-eased * pageH}px)` }">
              <canvas
                v-for="(project, index) in projects"
                :key="project.id"
                :ref="(el) => el && (canvases[index] = el)"
                width="600"
                height="1280"></canvas>
            </div>
          </div>
        </div>

        <!-- Right: results, slapped on like stickers -->
        <div ref="statsRef" class="stats">
          <div v-for="metric in shownMetrics" :key="metric.label" class="stat-sticker">
            <b class="font-display" :class="{ wordy: String(metric.value).length > 5 }">{{ metric.value }}</b>
            <span>{{ metric.label }}</span>
          </div>
        </div>
      </div>

      <nav class="tabs" aria-label="Projects">
        <button
          v-for="(project, index) in projects"
          :key="project.id"
          :class="{ on: index === shownIndex }"
          @click="goTo(index)">
          {{ pad(index + 1) }}<span class="hidden sm:inline">&nbsp;{{ project.title }}</span>
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import gsap from "gsap";
import { sfx } from "@/composables/useSfx";
import { drawScreen } from "./phone/screens";
import { bandColor, createBand, createPhone, flyTo, handoff, clearHandoff } from "./phone/handoff";

const props = defineProps({
  projects: { type: Array, required: true },
});

const router = useRouter();
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pad = (n) => String(n).padStart(2, "0");

const trackRef = ref(null);
const phoneRef = ref(null);
const copyRef = ref(null);
const statsRef = ref(null);
const canvases = [];

// Scroll position across projects (0..n-1), eased so each project holds for a moment
const eased = ref(0);
// The project the text shows; it swaps once the next screen is mostly in
const shownIndex = ref(0);
const shownProject = computed(() => props.projects[shownIndex.value]);
const shownMetrics = computed(() => (shownProject.value.results?.metrics || []).slice(0, 3));
// Lexend Mega is very wide: size the title by its longest word so it never overflows
const titleSize = computed(() => {
  const longest = Math.max(...shownProject.value.title.split(/\s+/).map((w) => w.length));
  return longest <= 6 ? "text-big" : longest <= 9 ? "text-mid" : "text-small";
});

// Height of one screen in the strip (plus the divider between screens)
const pageH = ref(0);
const navH = ref(72);
const measure = () => {
  const canvas = canvases[0];
  if (canvas) pageH.value = canvas.offsetHeight + 4;
  const nav = document.querySelector("nav");
  navH.value = nav ? nav.offsetHeight : 72;
};

// Band i slides up while the screen scrolls from project i-1 to i
const bandStyle = (index) => {
  const f = Math.min(Math.max(eased.value - (index - 1), 0), 1);
  return {
    backgroundColor: bandColor(index),
    zIndex: index,
    transform: index === 0 ? "none" : `translateY(${(1 - f) * 100}%)`,
  };
};

const smooth = (x) => x * x * (3 - 2 * x);
const trackProgress = () => {
  const rect = trackRef.value.getBoundingClientRect();
  const total = rect.height - window.innerHeight;
  return Math.min(Math.max(-rect.top / total, 0), 1) * (props.projects.length - 1);
};
let frame = 0;
const onScroll = () => {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    if (!trackRef.value) return;
    const raw = trackProgress();
    const i = Math.floor(raw);
    const f = raw - i;
    // Hold on each project for the first and last quarter, move in between
    const moved = f < 0.25 ? 0 : f > 0.75 ? 1 : smooth((f - 0.25) / 0.5);
    eased.value = Math.min(i + moved, props.projects.length - 1);
    swapTo(Math.round(eased.value));
  });
};

// ---------- swapping the text: the old copy lifts away, the new one is slapped on ----------
let swapTl = null;
const swapTo = (index) => {
  if (index === shownIndex.value && !swapTl) return;
  if (swapTl && swapTl.data === index) return;
  if (reduced) {
    shownIndex.value = index;
    return;
  }
  if (swapTl) swapTl.kill();
  const parts = () => [copyRef.value, ...statsRef.value.children];
  swapTl = gsap.timeline({ data: index, onComplete: () => (swapTl = null) });
  swapTl
    .to(parts(), { y: -16, opacity: 0, duration: 0.15, ease: "power1.in" })
    .add(async () => {
      shownIndex.value = index;
      await nextTick();
      gsap.fromTo(
        parts(),
        { y: 28, scale: 1.08, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.45, stagger: 0.07, ease: "back.out(2)", clearProps: "transform,opacity" },
      );
    });
  sfx.whoosh({ duration: 0.3 });
  [0.25, 0.32, 0.39].forEach((delay) => sfx.slap({ delay }));
};

// Tabs jump to a project's resting point in the track
const goTo = (index) => {
  const track = trackRef.value;
  const total = track.offsetHeight - window.innerHeight;
  let top = 0;
  for (let el = track; el; el = el.offsetParent) top += el.offsetTop;
  window.scrollTo({ top: top + (total * index) / (props.projects.length - 1), behavior: reduced ? "auto" : "smooth" });
};
const scrollToInstant = (index) => {
  const track = trackRef.value;
  const total = track.offsetHeight - window.innerHeight;
  let top = 0;
  for (let el = track; el; el = el.offsetParent) top += el.offsetTop;
  window.scrollTo({ top: top + (total * index) / (props.projects.length - 1), behavior: "instant" });
};

// ---------- into a project: its band rises over everything, the phone stays on top ----------
let leaving = false;
const explore = async () => {
  if (leaving) return;
  const project = shownProject.value;
  const path = `/projects/${project.id}`;
  if (reduced) {
    router.push(path);
    return;
  }
  leaving = true;
  clearHandoff();
  handoff.phone = createPhone(project, phoneRef.value.getBoundingClientRect());
  handoff.band = createBand(bandColor(shownIndex.value));
  sfx.whoosh({ duration: 0.6 });
  await gsap.fromTo(handoff.band, { yPercent: 100 }, { yPercent: 0, duration: 0.65, ease: "power3.inOut" });
  router.push(path);
};

// ---------- back from a project: land on it, drop the band to reveal the showcase ----------
const landFromProject = async () => {
  const index = handoff.returnTo;
  scrollToInstant(index);
  eased.value = index;
  shownIndex.value = index;
  await nextTick();
  measure();
  const { band, phone } = handoff;
  if (phone) {
    await gsap.to(phone, { ...flyTo(phone, phoneRef.value.getBoundingClientRect()), duration: 0.55, ease: "power3.inOut" });
    sfx.thud({ strength: 0.5 });
  }
  if (phone) phone.remove();
  handoff.phone = null;
  if (band) {
    sfx.whoosh({ duration: 0.5, up: false });
    await gsap.to(band, { yPercent: 100, duration: 0.6, ease: "power3.inOut" });
  }
  clearHandoff();
};

const draw = () => canvases.forEach((canvas, i) => drawScreen(canvas.getContext("2d"), props.projects[i]));
const onResize = () => {
  measure();
  onScroll();
};
watch(() => props.projects.length, () => nextTick(draw));

onMounted(() => {
  draw();
  measure();
  // Web fonts change the screen art and the navbar height
  document.fonts?.ready.then(() => {
    draw();
    onResize();
  });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  if (handoff.returnTo !== null) landFromProject();
  else onScroll();
});

onUnmounted(() => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onResize);
  cancelAnimationFrame(frame);
  if (swapTl) swapTl.kill();
});
</script>

<style scoped>
.stage {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
  color: #111;
}
.band {
  position: absolute;
  inset: 0;
  border-top: 5px solid #000;
  will-change: transform;
  background-image: radial-gradient(rgba(0, 0, 0, 0.2) 1.2px, transparent 1.2px);
  background-size: 24px 24px;
}
.band-num {
  position: absolute;
  right: -2vw;
  bottom: -6vh;
  font-size: 34vh;
  line-height: 1;
  letter-spacing: -0.08em;
  color: transparent;
  -webkit-text-stroke: 4px rgba(0, 0, 0, 0.13);
}

.stage-inner {
  position: relative;
  z-index: 10;
  height: 100%;
  max-width: 80rem;
  margin: 0 auto;
  padding: calc(var(--nav-h) + 16px) 1rem 76px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

/* ---------- copy ---------- */
.copy {
  width: 100%;
  text-align: center;
}
.type-sticker {
  display: inline-block;
  padding: 3px 10px;
  border: 3px solid #000;
  background: #fff;
  box-shadow: 3px 3px 0 #000;
  font: 700 0.68rem "JetBrains Mono", monospace;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  transform: rotate(-3deg);
}
.copy-title {
  margin: 12px 0 8px;
  font-weight: 800;
  line-height: 0.92;
  letter-spacing: -0.07em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}
.text-big { font-size: 2.2rem; }
.text-mid { font-size: 1.9rem; }
.text-small { font-size: 1.5rem; }
.copy-desc {
  display: none;
  margin: 0 0 24px;
  max-width: 34ch;
  font-weight: 500;
  line-height: 1.55;
}
.keycap {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  background: #111;
  color: #fff;
  border: 3px solid #000;
  box-shadow: 5px 5px 0 #fff, 5px 5px 0 3px #000;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  transition: transform 0.12s, box-shadow 0.12s;
}
.keycap:hover {
  transform: translate(-2px, -2px);
  box-shadow: 7px 7px 0 #fff, 7px 7px 0 3px #000;
}
.keycap:active {
  transform: translate(4px, 4px);
  box-shadow: 1px 1px 0 #fff, 1px 1px 0 3px #000;
}

/* ---------- phone: sized so it always fits under the copy ---------- */
.showcase-phone {
  --phone-w: clamp(140px, calc((100svh - var(--nav-h) - 300px) * 0.47 + 30px), 230px);
  flex: none;
}
.strip {
  position: absolute;
  inset: 0 0 auto;
  will-change: transform;
}
.strip canvas + canvas {
  border-top: 4px solid #000;
}

/* ---------- stats ---------- */
.stats {
  display: none;
}
.stat-sticker {
  min-width: 200px;
  padding: 12px 16px;
  background: #fff;
  border: 3px solid #000;
  box-shadow: 6px 6px 0 #000;
}
.stat-sticker b {
  display: block;
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.08em;
}
.stat-sticker b.wordy {
  font-size: 1.7rem;
}
.stat-sticker span {
  font: 700 0.66rem "JetBrains Mono", monospace;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.stat-sticker:nth-child(1) { rotate: 2deg; }
.stat-sticker:nth-child(2) { rotate: -2deg; margin-right: 26px; }
.stat-sticker:nth-child(3) { rotate: 1.5deg; }

/* ---------- tabs ---------- */
.tabs {
  position: absolute;
  z-index: 10;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  display: flex;
  border: 3px solid #000;
  background: #fff;
  box-shadow: 4px 4px 0 #000;
  white-space: nowrap;
}
.tabs button {
  padding: 6px 12px;
  font: 700 0.7rem "JetBrains Mono", monospace;
  border-left: 3px solid #000;
}
.tabs button:first-child {
  border-left: 0;
}
.tabs button.on {
  background: #111;
  color: #ffdd00;
}

/* ---------- desktop: copy | phone | stats ---------- */
@media (min-width: 768px) {
  .stage-inner {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 4vw;
    padding: calc(var(--nav-h) + 10px) 3rem 70px;
  }
  .copy {
    text-align: left;
  }
  .copy-desc {
    display: block;
  }
  .text-big { font-size: clamp(2.4rem, 4.4vw, 3.8rem); }
  .text-mid { font-size: clamp(2rem, 3.6vw, 3.1rem); }
  .text-small { font-size: clamp(1.6rem, 2.8vw, 2.4rem); }
  .keycap {
    padding: 14px 20px;
    font-size: 0.85rem;
  }
  .showcase-phone {
    --phone-w: clamp(180px, calc((100vh - var(--nav-h) - 110px) * 0.47 + 30px), 280px);
  }
  .stats {
    display: grid;
    gap: 18px;
    justify-items: end;
  }
}
</style>
