<template>
  <div>
    <div class="desk-page fixed inset-0 overflow-hidden select-none">
      <div ref="stageRef" class="absolute inset-0"></div>

      <!-- Top-left: title + way out -->
      <div class="absolute top-4 left-4 flex flex-col items-start gap-2 pointer-events-none">
        <div class="pointer-events-auto bg-primary border-4 border-black shadow-neo px-3 py-1.5 -rotate-2">
          <h1 class="font-display font-extrabold text-black text-lg md:text-2xl leading-none">THE DESK</h1>
        </div>
        <div class="pointer-events-auto flex gap-2 mt-1">
          <!-- Sound and night mode live on the desk: the speakers and the lamp -->
          <router-link to="/2d" class="hud-btn bg-white text-black">← 2D site</router-link>
        </div>
      </div>

      <!-- Zoomed in: the way back out -->
      <transition name="hud-pop">
        <div v-if="zoomed" class="absolute top-[7rem] left-4 md:top-4 md:left-1/2 md:-translate-x-1/2">
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
        WebGL isn't available here. <router-link to="/2d" class="underline ml-1">Use the 2D site →</router-link>
      </p>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useMediaQuery } from "@vueuse/core";
import { projects } from "@/data/projects";
import { experiences } from "@/data/experience";
import { useTheme } from "@/composables/useTheme";
import { useSfx } from "@/composables/useSfx";
import { hideBootLoader } from "@/utils/bootLoader";

const COMMAND_CHIPS = ["help", "whoami", "projects", "hobbies", "sudo hire oka"];
const stageRef = ref(null);
const scene = ref(null);
const unsupported = ref(false);
const focus = ref("overview");
const introPlaying = ref(true);
const projectOpen = ref(false);
const zoomed = computed(() => focus.value !== "overview");
const isDesktop = useMediaQuery("(min-width: 768px)");
const { isDark, toggleTheme } = useTheme();
const { muted, toggleMute } = useSfx();


const hint = computed(() => {
  if (introPlaying.value) return "";
  if (focus.value === "monitor") return isDesktop.value ? "Type a command and hit Enter. Try: help" : "Tap a command, or tap the screen";
  if (focus.value === "keyboard") return "1–5 jump to a section · T terminal · C chat · Esc back";
  if (focus.value === "window") return isDark.value ? "Click the sky and make a wish" : "Click the window to call the birds over";
  if (focus.value === "mug") return "Click the mug for a sip. Finish the cup for the night shift";
  if (focus.value === "experience") return isDesktop.value ? "Click a pass to hold it up, again to flip it (← → to browse)" : "Tap a pass to hold it, tap again to flip it";
  if (focus.value === "projects" && projectOpen.value) return isDesktop.value ? "Click the pages to turn them (or ← →)" : "Tap the pages to turn them";
  if (focus.value === "projects") return isDesktop.value ? "Click a tab (or ← →) to flip through, the front file to pull it out" : "Tap a tab to flip through, the front file to pull it out";
  if (focus.value === "contact") return isDesktop.value ? "Write on the card (Tab moves along), then hit SEND POSTCARD" : "Tap the card to write, then tap SEND POSTCARD";
  if (focus.value === "chat") return isDesktop.value ? "Type a question and hit Enter (scroll to read back)" : "Tap a question or the box below to ask";
  if (focus.value === "hero") return isDesktop.value ? "Click the badge to flip it (links on the back). Drag the pin to move it" : "Tap the badge to flip it. Drag the pin to move it";
  if (focus.value === "about") return isDesktop.value ? "Drag the papers to rearrange them. Release to pin them back" : "Drag a paper to move it. Release to pin it back";
  // The overview needs no hint: the terminal's welcome already says to look around
  return "";
});

function onEvent(name, payload = {}) {
  // An empty coffee cup (or the lamp) flips the desk to the night shift, or back to day
  // The room's first frame is drawn: the boot loader fades out over it
  if (name === "ready") hideBootLoader();
  else if (name === "nightShift" && payload.dark !== isDark.value) toggleTheme();
  else if (name === "toggleSound") toggleMute();
  else if (name === "projectOpen") projectOpen.value = payload.open;
  else if (name === "focus") {
    focus.value = payload.name;
  }
}

watch(isDark, (dark) => scene.value?.setTheme(dark));
watch(muted, (value) => scene.value?.setMuted(value));

onMounted(async () => {
  try {
    const { createDeskScene } = await import("@/components/features/desk/deskScene");
    await nextTick();
    if (!stageRef.value) return;
    scene.value = createDeskScene({
      container: stageRef.value,
      projects,
      experiences,
      dark: isDark.value,
      muted: muted.value,
      onEvent,
    });
    setTimeout(() => (introPlaying.value = false), 1600);
  } catch (err) {
    console.error(err);
    unsupported.value = true;
    hideBootLoader();
  }
});

onUnmounted(() => {
  hideBootLoader();
  scene.value?.destroy();
});
</script>

<style scoped>
.desk-page {
  z-index: 20;
  /* The boot loader's colour: it fades straight from the loader to the room */
  background: #1a1714;
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
