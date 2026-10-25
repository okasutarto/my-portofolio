<template>
  <div>
    <div class="desk-page fixed inset-0 overflow-hidden select-none">
      <div ref="stageRef" class="absolute inset-0"></div>

      <!-- Tags that follow each prop (positioned by the scene every frame) -->
      <div
        class="absolute inset-0 pointer-events-none transition-opacity duration-300"
        :class="focus === 'overview' && !introPlaying ? 'opacity-100' : 'opacity-0'">
        <button
          v-for="tag in TAGS"
          :key="tag.id"
          :ref="(el) => (labelEls[tag.id] = el)"
          class="desk-tag absolute top-0 left-0 pointer-events-auto whitespace-nowrap bg-white border-3 border-black px-2 py-0.5 text-[11px] md:text-xs font-bold uppercase text-black"
          :class="{ 'is-hot': hovered === tag.id }"
          @click="scene?.focusOn(tag.id)">
          <span v-if="tag.no" class="font-display mr-1">{{ tag.no }}</span>{{ tag.label }}
        </button>
      </div>

      <!-- Top-left: title + way out -->
      <div class="absolute top-4 left-4 flex flex-col items-start gap-2 pointer-events-none">
        <div class="pointer-events-auto bg-primary border-4 border-black shadow-neo px-3 py-1.5 -rotate-2">
          <h1 class="font-display font-extrabold text-black text-lg md:text-2xl leading-none">THE DESK</h1>
        </div>
        <span class="bg-black text-white text-[10px] md:text-xs font-bold uppercase px-2 py-0.5 tracking-widest">
          prototype · v1
        </span>
        <div class="pointer-events-auto flex gap-2 mt-1">
          <router-link to="/" class="hud-btn bg-white text-black">← 2D site</router-link>
          <button class="hud-btn bg-white text-black" :aria-label="muted ? 'Unmute' : 'Mute'" @click="toggleMute">
            <i class="fa-solid" :class="muted ? 'fa-volume-xmark' : 'fa-volume-high'"></i>
          </button>
          <button class="hud-btn bg-white text-black" aria-label="Toggle theme" @click="toggleTheme">
            <i class="fa-solid" :class="isDark ? 'fa-sun' : 'fa-moon'"></i>
          </button>
        </div>
      </div>

      <!-- Zoomed in: the way back out -->
      <transition name="hud-pop">
        <div v-if="zoomed" class="absolute top-[8.5rem] left-4 md:top-4 md:left-1/2 md:-translate-x-1/2">
          <button class="hud-btn bg-primary text-black text-sm md:text-base" @click="scene?.back()">
            ← Back to desk
            <kbd v-if="isDesktop" class="ml-1 bg-black text-white px-1.5 text-[10px] leading-5">ESC</kbd>
          </button>
        </div>
      </transition>

      <!-- Bottom: monitor command chips, then the hint -->
      <div class="absolute bottom-6 inset-x-4 flex flex-col items-center gap-3 pointer-events-none">
        <transition name="hud-pop">
          <div v-if="focus === 'monitor'" class="pointer-events-auto flex flex-wrap justify-center gap-2">
            <button
              v-for="cmd in COMMAND_CHIPS"
              :key="cmd"
              class="hud-btn bg-black text-[#8fd694] normal-case font-mono"
              @click="scene?.runCommand(cmd)">
              &gt; {{ cmd }}
            </button>
          </div>
        </transition>
        <transition name="hud-pop" mode="out-in">
          <div
            v-if="hint"
            :key="hint"
            class="bg-black text-white font-bold text-sm md:text-base px-4 py-2 border-4 border-black shadow-[5px_5px_0_0_#00e0c6] text-center">
            {{ hint }}
          </div>
        </transition>
      </div>

      <p v-if="unsupported" class="absolute inset-0 flex items-center justify-center p-6 text-center font-bold">
        WebGL isn't available here. <router-link to="/" class="underline ml-1">Use the 2D site →</router-link>
      </p>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useMediaQuery } from "@vueuse/core";
import { projects } from "@/data/projects";
import { experiences } from "@/data/experience";
import { skills } from "@/data/skills";
import { useTheme } from "@/composables/useTheme";
import { useSfx } from "@/composables/useSfx";

const TAGS = [
  { id: "hero", no: "01", label: "ID badge" },
  { id: "about", no: "02", label: "About" },
  { id: "experience", no: "03", label: "Experience" },
  { id: "projects", no: "04", label: "Projects" },
  { id: "contact", no: "05", label: "Contact" },
  { id: "chat", label: "AI chat" },
  { id: "monitor", label: "Terminal" },
];
const COMMAND_CHIPS = ["help", "whoami", "projects", "hobbies", "sudo hire oka"];
const stageRef = ref(null);
const labelEls = {};
const scene = ref(null);
const unsupported = ref(false);
const focus = ref("overview");
const hovered = ref(null);
const introPlaying = ref(true);
const zoomed = computed(() => focus.value !== "overview");
const isDesktop = useMediaQuery("(min-width: 768px)");
const { isDark, toggleTheme } = useTheme();
const { muted, toggleMute } = useSfx();


const hint = computed(() => {
  if (introPlaying.value) return "";
  if (focus.value === "monitor") return isDesktop.value ? "Type a command and hit Enter. Try: help" : "Tap a command, or tap the screen";
  if (focus.value === "keyboard") return "1–5 jump to a section · T terminal · C chat · Esc back";
  if (focus.value === "mug") return "Click the mug for a sip. Finish the cup for the night shift";
  if (focus.value === "experience") return isDesktop.value ? "Click a pass to hold it up, again to flip it (← → to browse)" : "Tap a pass to hold it, tap again to flip it";
  if (focus.value === "projects") return isDesktop.value ? "Click a case file to open it, then click its pages (or ← →)" : "Tap a case file, then tap its pages to turn them";
  if (focus.value === "contact") return isDesktop.value ? "Write on the card (Tab moves along), then hit the SEND stamp" : "Tap the card to write, then tap the SEND stamp";
  if (focus.value === "chat") return isDesktop.value ? "Type a question and hit Enter (scroll to read back)" : "Tap a question or the box below to ask";
  if (focus.value === "hero") return "Click the badge to flip it. The links are on the back";
  if (focus.value === "about") return isDesktop.value ? "Click a page (or ← →) to turn it" : "Tap the right page to turn, left to go back";
  if (zoomed.value) return "";
  return isDesktop.value ? "Click anything on the desk, or press 1–5" : "Tap anything on the desk to take a closer look";
});

function onEvent(name, payload = {}) {
  if (name === "hover") hovered.value = payload.name;
  // An empty coffee cup flips the desk to the night shift (dark theme) or back to day
  else if (name === "nightShift" && payload.dark !== isDark.value) toggleTheme();
  else if (name === "focus") {
    focus.value = payload.name;
  }
}

watch(isDark, (dark) => scene.value?.setTheme(dark));

onMounted(async () => {
  try {
    const { createDeskScene } = await import("@/components/features/desk/deskScene");
    await nextTick();
    if (!stageRef.value) return;
    scene.value = createDeskScene({
      container: stageRef.value,
      projects,
      experiences,
      skills: skills.map((s) => s.name),
      labels: labelEls,
      dark: isDark.value,
      onEvent,
    });
    setTimeout(() => (introPlaying.value = false), 2600);
  } catch (err) {
    console.error(err);
    unsupported.value = true;
  }
});

onUnmounted(() => {
  scene.value?.destroy();
});
</script>

<style scoped>
.desk-page {
  z-index: 20;
}
.hud-btn {
  @apply inline-flex items-center gap-1 border-3 border-black px-3 py-1.5 text-xs md:text-sm font-bold uppercase shadow-neo-sm transition-transform;
}
.hud-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 0 #000;
}
.hud-btn:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}
.desk-tag {
  box-shadow: 3px 3px 0 0 #000;
  will-change: transform;
}
.desk-tag.is-hot,
.desk-tag:hover {
  background: var(--color-primary);
}
.hud-pop-enter-active,
.hud-pop-leave-active {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s;
}
.hud-pop-enter-from,
.hud-pop-leave-to {
  transform: scale(0.6) translateY(10px);
  opacity: 0;
}
</style>
