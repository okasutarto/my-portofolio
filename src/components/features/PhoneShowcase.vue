<template>
  <div
    ref="trackRef"
    class="relative"
    :style="{ height: `${projects.length * 100}vh` }">
    <div class="sticky top-0 h-screen overflow-hidden">
      <!-- 3D stage spans the whole viewport, behind the text -->
      <div ref="stageRef" class="absolute inset-0 z-0"></div>

      <div
        class="relative z-10 h-full max-w-7xl mx-auto px-4 md:px-12 grid grid-cols-1 md:grid-cols-12 content-start md:content-center pt-[57vh] md:pt-0 pointer-events-none">
        <Transition name="swap" mode="out-in">
          <div
            :key="active.id"
            class="md:col-span-5 pointer-events-auto md:bg-white md:dark:bg-surface-dark md:border-2 md:border-black md:dark:border-primary md:shadow-neo md:p-8">
            <div
              class="font-display font-bold leading-none text-5xl md:text-8xl text-white"
              style="-webkit-text-stroke: 3px #000; paint-order: stroke fill; text-shadow: 6px 6px 0 var(--color-secondary)">
              {{ String(activeIndex + 1).padStart(2, "0")
              }}<span
                class="text-xl md:text-3xl text-black dark:text-white align-top ml-1"
                style="-webkit-text-stroke: 0; text-shadow: none"
                >/ {{ String(projects.length).padStart(2, "0") }}</span
              >
            </div>

            <span
              class="inline-block mt-3 md:mt-4 mb-2 md:mb-3 px-3 py-0.5 border-2 border-black dark:border-primary text-xs font-bold uppercase shadow-neo-sm"
              :class="typeStyle(active.type).badge">
              {{ active.type }}
            </span>

            <h3
              class="font-display font-bold uppercase tracking-tight leading-none text-2xl md:text-5xl text-black dark:text-white mb-3 md:mb-4">
              {{ active.title }}
            </h3>
            <p
              class="font-medium leading-relaxed text-sm md:text-lg text-gray-800 dark:text-gray-200 border-l-4 pl-4 max-w-md mb-4 md:mb-5 line-clamp-3 md:line-clamp-none"
              :class="typeStyle(active.type).border">
              {{ active.description }}
            </p>

            <div class="flex flex-wrap gap-2 mb-4 md:mb-6">
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
        </Transition>
      </div>

      <!-- Progress -->
      <div
        class="absolute left-4 md:left-12 top-[7.5rem] md:top-auto md:bottom-6 z-10 flex gap-2"
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
        class="absolute right-4 md:right-12 top-28 z-10 bg-neo-magenta text-white border-2 border-black px-3 py-1 text-xs font-bold uppercase shadow-neo-sm rotate-3 pointer-events-none">
        Drag to spin ✦
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";

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
const stageRef = ref(null);
const activeIndex = ref(0);
const active = computed(() => props.projects[activeIndex.value]);

let phoneScene = null;
let loading = false;
let observer = null;
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
  activeIndex.value = Math.round(p);
  if (phoneScene) phoneScene.setProgress(p);
};

const loadScene = async () => {
  // three.js is loaded only once the section is about to be seen
  const { createPhoneScene } = await import(
    /* webpackChunkName: "phone-scene" */ "./phone/phoneScene"
  );
  if (!stageRef.value) return;
  phoneScene = createPhoneScene({
    container: stageRef.value,
    projects: props.projects,
    colorFor: (project) => typeStyle(project.type).color,
  });
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
  onScroll();

  // Load near the viewport, and only render while on screen
  observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !phoneScene && !loading) {
        loading = true;
        loadScene();
      }
      else if (phoneScene) visible ? phoneScene.start() : phoneScene.stop();
    },
    { rootMargin: "300px 0px" },
  );
  observer.observe(trackRef.value);
});

onUnmounted(() => {
  window.removeEventListener("scroll", onScroll);
  if (observer) observer.disconnect();
  if (phoneScene) phoneScene.destroy();
});
</script>

<style scoped>
.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.swap-enter-from,
.swap-leave-to {
  opacity: 0;
  transform: translateY(16px) rotate(-1deg);
}
</style>
