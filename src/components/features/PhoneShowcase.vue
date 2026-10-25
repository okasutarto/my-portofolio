<template>
  <div
    ref="trackRef"
    class="relative"
    :style="{ height: `${projects.length * 100}vh` }">
    <div class="sticky top-0 h-screen overflow-hidden">
      <!-- 3D stage spans the whole viewport, behind the text -->
      <div ref="stageRef" class="absolute inset-0 z-0"></div>

      <div
        class="relative z-10 h-full max-w-7xl mx-auto px-4 md:px-12 grid grid-cols-1 md:grid-cols-12 content-start md:content-center md:!pt-0 pointer-events-none"
        :style="{ paddingTop: `${textTop}px` }">
        <!-- Outer wrapper: one-off entrance. Inner card: follows the scroll between projects -->
        <div ref="cardIntroRef" class="md:col-span-5">
        <div
            class="info-card pointer-events-auto md:bg-white md:dark:bg-surface-dark md:border-2 md:border-black md:dark:border-primary md:shadow-neo md:p-8"
            :style="cardStyle">
            <div
              class="outlined-num relative isolate font-display font-bold leading-none text-5xl md:text-8xl text-white"
              :data-num="String(activeIndex + 1).padStart(2, '0')">
              {{ String(activeIndex + 1).padStart(2, "0")
              }}<span
                class="text-xl md:text-3xl text-black dark:text-white align-top ml-2"
                >/ {{ String(projects.length).padStart(2, "0") }}</span
              >
            </div>

            <span
              class="inline-block mt-3 md:mt-4 mb-2 md:mb-3 px-3 py-0.5 border-2 border-black dark:border-primary text-xs font-bold uppercase shadow-neo-sm"
              :class="typeStyle(active.type).badge">
              {{ active.type }}
            </span>

            <h3
              class="font-display font-bold uppercase tracking-tight leading-none text-2xl text-black dark:text-white mb-3 md:mb-4 [overflow-wrap:anywhere]"
              :class="titleSize">
              {{ active.title }}
            </h3>
            <p
              class="font-medium leading-relaxed text-sm md:text-lg text-gray-800 dark:text-gray-200 border-l-4 pl-4 max-w-md mb-4 md:mb-5 line-clamp-3 [@media(max-width:767px)_and_(max-height:740px)]:line-clamp-2 md:line-clamp-none"
              :class="typeStyle(active.type).border">
              {{ active.description }}
            </p>

            <div class="flex flex-wrap gap-2 mb-4 md:mb-6 [@media(max-width:767px)_and_(max-height:740px)]:hidden">
              <span
                v-for="(tech, techIndex) in active.technologies.slice(0, 5)"
                :key="tech"
                :class="{ 'hidden md:inline-block': techIndex >= 3 }"
                class="bg-white dark:bg-zinc-800 border-2 border-black dark:border-primary px-2 py-0.5 text-xs font-bold uppercase shadow-neo-sm text-black dark:text-white">
                {{ tech }}
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-4">
              <router-link
                :to="`/projects/${active.id}`"
                class="bg-black dark:bg-primary text-white dark:text-black font-bold py-2.5 px-5 border-2 border-black dark:border-primary hover:bg-primary hover:text-black transition-all shadow-neo-sm active:translate-y-0.5 active:shadow-none flex items-center gap-2 uppercase text-xs tracking-wider">
                Case study <i class="fas fa-arrow-right"></i>
              </router-link>
              <a
                v-if="isLink(active.demoLink)"
                :href="active.demoLink"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 font-bold text-xs uppercase hover:underline decoration-2 text-black dark:text-white">
                <i class="fas fa-external-link-alt"></i> Demo
              </a>
              <a
                v-if="isLink(active.codeLink)"
                :href="active.codeLink"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 font-bold text-xs uppercase hover:underline decoration-2 text-black dark:text-white">
                <i class="fab fa-github"></i> Code
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Progress -->
      <div
        class="absolute left-4 bottom-4 md:left-12 md:bottom-6 z-10 flex gap-2"
        aria-hidden="true">
        <span
          v-for="(project, index) in projects"
          :key="project.id"
          class="w-8 h-2.5 border-2 border-black dark:border-primary transition-all duration-300"
          :class="
            index === activeIndex
              ? 'bg-primary -translate-y-1 shadow-neo-sm'
              : 'bg-white dark:bg-zinc-800'
          "></span>
      </div>
      <div
        class="hidden md:block absolute right-12 top-28 z-10 bg-neo-magenta text-white border-2 border-black px-3 py-1 text-xs font-bold uppercase shadow-neo-sm rotate-3 pointer-events-none">
        Drag to spin ✦
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { sfx } from "@/composables/useSfx";
import gsap from "gsap";
import { STACKED_QUERY, topInset, stackedPhoneHeight } from "./phone/layout";

const props = defineProps({
  projects: { type: Array, required: true },
});
const emit = defineEmits(["unsupported"]);

const TYPE_STYLES = {
  Frontend: { color: "#ffdd00", badge: "bg-primary text-black", border: "border-primary" },
  Fullstack: { color: "#3b82f6", badge: "bg-accent-blue text-white", border: "border-accent-blue" },
  Backend: { color: "#00e0c6", badge: "bg-secondary text-black", border: "border-secondary" },
};
const typeStyle = (type) => TYPE_STYLES[type] || TYPE_STYLES.Fullstack;
const isLink = (url) => url && url !== "#";

const trackRef = ref(null);
const cardIntroRef = ref(null);
let introPlayed = false;
// First time the showcase is seen, the card slides in while the phone drops in
const playIntro = () => {
  if (introPlayed || !cardIntroRef.value) return;
  introPlayed = true;
  if (phoneScene) phoneScene.playIntro();
  sfx.whoosh({ duration: 0.4, up: false });
  sfx.thud({ delay: 0.4 });
  sfx.paper({ delay: 0.5 });
  gsap.to(cardIntroRef.value, {
    x: 0,
    rotate: 0,
    opacity: 1,
    duration: 0.8,
    delay: 0.35,
    ease: "back.out(1.6)",
    clearProps: "transform,opacity",
  });
};
const stageRef = ref(null);
const activeIndex = ref(0);
// Stacked layout: the text starts right under the phone (same maths as the 3D scene)
const textTop = ref(0);
const updateTextTop = () => {
  if (!window.matchMedia(STACKED_QUERY).matches) {
    textTop.value = 0;
    return;
  }
  const h = window.innerHeight;
  const inset = topInset();
  textTop.value = Math.round(inset + stackedPhoneHeight(h, inset) + 16);
};
const active = computed(() => props.projects[activeIndex.value]);
watch(activeIndex, () => sfx.whoosh({ duration: 0.3 }));
// -0.5..0.5: how far the scroll is from the current project
const offset = ref(0);
// The card slides aside, tilts and fades like a sheet being pulled out, then the next
// one comes in from the other side (deliberately different from the phone's spin)
// The card flips over like a desk-calendar page (around X, unlike the phone's spin).
// At the halfway point it's edge-on, which is exactly when the content swaps, so no fade
// is needed to hide it.
const cardStyle = computed(() => {
  const o = offset.value;
  return {
    transform: `perspective(1400px) rotateX(${o * 180}deg) scale(${1 - Math.abs(o) * 0.12})`,
  };
});

// Lexend Mega is very wide: size the title by its longest word so it never overflows
const titleSize = computed(() => {
  const longest = Math.max(...active.value.title.split(/\s+/).map((w) => w.length));
  if (longest <= 8) return "md:text-5xl";
  if (longest <= 11) return "md:text-4xl";
  return "md:text-3xl";
});

let phoneScene = null;
let loading = false;
let observer = null;
let introObserver = null;
let visible = false;

const supportsWebGL = () => {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && canvas.getContext("webgl2"));
  } catch (e) {
    return false;
  }
};

// Scroll position inside the tall track -> 0..(projects.length - 1)
const onScroll = () => {
  const rect = trackRef.value.getBoundingClientRect();
  const total = rect.height - window.innerHeight;
  const p = Math.min(Math.max(-rect.top / total, 0), 1) * (props.projects.length - 1);
  // With the 3D scene running, it eases p and reports back (applyProgress), so the
  // card and the phone turn together; without it, apply the raw value directly
  if (phoneScene) phoneScene.setProgress(p);
  else applyProgress(p);
};

// The content swaps at the halfway point, while the card is faded out
const applyProgress = (p) => {
  activeIndex.value = Math.round(p);
  offset.value = p - Math.round(p);
};

const loadScene = async () => {
  if (loading || phoneScene) return;
  loading = true;
  const { createPhoneScene } = await import(
    /* webpackChunkName: "phone-scene" */ "./phone/phoneScene"
  );
  if (!stageRef.value) return;
  phoneScene = createPhoneScene({
    container: stageRef.value,
    projects: props.projects,
    colorFor: (project) => typeStyle(project.type).color,
    onProgress: applyProgress,
  });
  if (introPlayed) phoneScene.playIntro();
  onScroll();
  if (visible) phoneScene.start();
};

onMounted(() => {
  if (
    !supportsWebGL() ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    emit("unsupported");
    return;
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateTextTop);
  updateTextTop();
  onScroll();

  // Build the scene while the browser is idle (shader compile and texture upload are
  // the expensive part), so nothing heavy happens while the user scrolls toward it.
  const idle =
    window.requestIdleCallback ||
    ((cb) => setTimeout(cb, 1500));
  idle(() => loadScene(), { timeout: 4000 });

  // Only render while the section is actually on screen
  observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!phoneScene) {
      if (visible) loadScene();
      return;
    }
    if (visible) phoneScene.start();
    else phoneScene.stop();
  });
  observer.observe(trackRef.value);

  // Intro plays when the card itself is actually on screen; until then it waits off to the side
  gsap.set(cardIntroRef.value, { x: -140, rotate: -6, opacity: 0 });
  introObserver = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      playIntro();
      introObserver.disconnect();
    },
    { threshold: 0.3 },
  );
  introObserver.observe(cardIntroRef.value);
});

onUnmounted(() => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", updateTextTop);
  if (observer) observer.disconnect();
  if (introObserver) introObserver.disconnect();
  if (phoneScene) phoneScene.destroy();
});
</script>

<style scoped>
/* White number with a solid black outline and a teal offset copy behind it.
   Built from text-shadows instead of -webkit-text-stroke + paint-order, which some
   mobile browsers don't support (the stroke ends up thin and covered). */
.outlined-num {
  --o: #000;
  text-shadow:
    3px 0 var(--o), -3px 0 var(--o), 0 3px var(--o), 0 -3px var(--o),
    2px 2px var(--o), -2px -2px var(--o), 2px -2px var(--o), -2px 2px var(--o);
}
.outlined-num::before {
  content: attr(data-num);
  position: absolute;
  left: 6px;
  top: 6px;
  z-index: -1;
  color: var(--color-secondary);
  text-shadow: inherit;
}
.outlined-num span {
  text-shadow: none;
}

</style>
