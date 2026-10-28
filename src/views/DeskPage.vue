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
          <button
            v-if="!zoomed"
            class="hud-btn bg-white text-black px-2"
            :aria-expanded="settingsOpen"
            aria-label="Room settings"
            title="Room settings"
            @click="settingsOpen = !settingsOpen">
            <svg viewBox="0 0 24 24" class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <!-- On a phone the way back out sits beside it, not in a third row over the view -->
          <transition name="hud-pop">
            <button v-if="zoomed && !isDesktop" class="hud-btn bg-primary text-black" @click="scene?.back()">← Back</button>
          </transition>
        </div>
        <!-- Room settings: the wall's paint, and the wood and cut of the desk, the monitor riser,
             the window frame and the game shelf -->
        <transition name="hud-pop">
          <div
            v-if="settingsOpen && !zoomed"
            class="pointer-events-auto bg-white text-black border-3 border-black shadow-neo-sm p-3 w-[17.5rem] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)] overflow-y-auto flex flex-col gap-3">
            <section>
              <h2 class="settings-label">Wall</h2>
              <div class="flex flex-wrap items-center gap-1.5">
                <button
                  v-for="paint in WALL_PAINTS"
                  :key="paint.hex"
                  class="swatch"
                  :class="{ 'swatch--on': settings.wall === paint.hex }"
                  :style="{ background: paint.hex }"
                  :title="paint.name"
                  :aria-label="`${paint.name} wall`"
                  @click="setWall(paint.hex)"></button>
                <label class="swatch swatch--custom" title="Any colour" aria-label="Pick any wall colour">
                  <input :value="settings.wall" type="color" class="absolute inset-0 opacity-0 cursor-pointer" @input="setWall($event.target.value)" />
                </label>
              </div>
            </section>
            <section v-for="(label, part) in WOOD_TARGETS" :key="part">
              <h2 class="settings-label">
                {{ label }} <span class="font-normal normal-case text-black/60">· {{ WOODS[settings.woods[part].wood].name }}</span>
              </h2>
              <div class="flex flex-wrap items-center gap-1.5">
                <button
                  v-for="(wood, key) in WOODS"
                  :key="key"
                  class="swatch"
                  :class="{ 'swatch--on': settings.woods[part].wood === key }"
                  :style="{ background: wood.swatch }"
                  :title="wood.name"
                  :aria-label="`${wood.name} ${label.toLowerCase()}`"
                  @click="setWood(part, { wood: key })"></button>
              </div>
              <div class="flex flex-wrap gap-1 mt-1.5">
                <button
                  v-for="(name, key) in WOOD_PATTERNS"
                  :key="key"
                  class="pattern-chip"
                  :class="{ 'pattern-chip--on': settings.woods[part].pattern === key }"
                  @click="setWood(part, { pattern: key })">
                  {{ name }}
                </button>
              </div>
            </section>
          </div>
        </transition>
      </div>

      <!-- Zoomed in: the way back out -->
      <transition name="hud-pop">
        <div v-if="zoomed && isDesktop" class="absolute top-4 left-1/2 -translate-x-1/2">
          <button class="hud-btn bg-primary text-black text-base" @click="scene?.back()">
            ← Back to desk
            <kbd class="ml-1 bg-black text-white px-1.5 text-[10px] leading-5">ESC</kbd>
          </button>
        </div>
      </transition>

      <!-- Top-right: a secret just found (the trophy on the shelf keeps the count) -->
      <transition name="hud-pop">
        <div
          v-if="secretToast"
          :key="secretToast.key"
          class="absolute top-4 right-4 md:top-6 md:right-6 z-50 pointer-events-auto cursor-pointer bg-[#ffdd00] border-3 md:border-4 border-black shadow-[6px_6px_0_0_#000000] p-2.5 md:p-3 flex items-center gap-3 select-none -rotate-1 max-w-[calc(100vw-2rem)] hover:scale-105 transition-transform"
          title="Click to dismiss"
          @click="secretToast = null">
          <div class="w-10 h-10 md:w-11 md:h-11 bg-black text-[#ffdd00] flex items-center justify-center border-2 border-black font-extrabold text-lg md:text-xl shadow-[2px_2px_0_0_#ff90e8] shrink-0">
            {{ secretToast.allDone ? '🏆' : '✦' }}
          </div>
          <div class="flex flex-col min-w-0 pr-1">
            <div class="flex items-center gap-2">
              <span class="text-[10px] md:text-xs font-black tracking-wider uppercase bg-black text-white px-1.5 py-0.5 leading-none">
                {{ secretToast.allDone ? 'ALL SECRETS FOUND!' : 'SECRET FOUND' }}
              </span>
              <span class="text-xs md:text-sm font-bold text-black font-mono">
                {{ secretToast.found }}/{{ secretToast.total }}
              </span>
            </div>
            <div class="text-xs md:text-sm font-extrabold text-black leading-tight mt-1 truncate">
              {{ secretToast.title }}
            </div>
          </div>
        </div>
      </transition>

      <!-- Bottom: monitor command chips, then the hint -->
      <div class="absolute bottom-6 inset-x-4 flex flex-col items-center gap-3 pointer-events-none">
        <transition name="hud-pop">
          <div v-if="focus === 'monitor' && !consoleOn" class="pointer-events-auto flex flex-wrap justify-center gap-2">
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
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useMediaQuery } from "@vueuse/core";
import { projects } from "@/data/projects";
import { experiences } from "@/data/experience";
import { useTheme } from "@/composables/useTheme";
import { useSfx, initializeAudio, sfx } from "@/composables/useSfx";
import { hideBootLoader } from "@/utils/bootLoader";
import { WOODS, WOOD_PATTERNS, WOOD_TARGETS, DEFAULT_WOODS } from "@/components/features/desk/woods";

const COMMAND_CHIPS = ["help", "whoami", "projects", "hobbies", "sudo hire oka"];
const WALL_PAINTS = [
  { name: "White", hex: "#ffffff" },
  { name: "Greige", hex: "#e2ddd5" },
  { name: "Light grey", hex: "#d9d9d9" },
  { name: "Grey", hex: "#a6a6a6" },
  { name: "Dark grey", hex: "#8c8c8c" },
  { name: "Charcoal", hex: "#5c5c5c" },
  { name: "Graphite", hex: "#3a3a3a" },
];
const SECRET_NAMES = {
  snap: "Infinity Gauntlet Snap",
  katana: "Katana Draw & Strike",
  rat: "Mouse Scamper",
  catKeys: "Cat on Keyboard",
  rain: "Window Rainstorm",
  star: "Night Shooting Star",
  lamp: "Bouncy Edison Lamp",
  painting: "Living Canvas Art",
  chair: "Desk Chair Spin",
  guitar: "Guitar Acoustic Strum",
  luffy: "Straw Hat Strike",
  clock: "Clock Time Rewind",
  butterfly: "Bonsai Bloom",
  lofi: "Lofi Beats on Monitor",
  badge: "Staff ID Badge Flip",
  gymPR: "10-Rep Dumbbell Workout",
  konami: "Konami Cheat Code",
  console: "Retro Handheld Console",
  robot: "Bit the Glitchy Robot",
  trash: "Paper Basketball Toss",
};

const SETTINGS_KEY = "desk-settings";
const DEFAULT_WALL = "#3a3a3a";
const stageRef = ref(null);
const scene = ref(null);
const unsupported = ref(false);
const focus = ref("overview");
const introPlaying = ref(true);
const projectOpen = ref(false);
const consoleOn = ref(false);
const secretToast = ref(null);
const settingsOpen = ref(false);
const settings = reactive(readSettings());
let secretTimer = null;
const zoomed = computed(() => focus.value !== "overview");
const isDesktop = useMediaQuery("(min-width: 768px)");
const { isDark, toggleTheme } = useTheme();
const { muted, toggleMute } = useSfx();


const hint = computed(() => {
  if (introPlaying.value) return "";
  if (focus.value === "monitor" && consoleOn.value) return isDesktop.value ? "Arrows / WASD or the mouse to sail · Space for the Gatling · Q to quit" : "Drag anywhere, even down here, to sail · Tap the red button for the Gatling";
  if (focus.value === "monitor") return isDesktop.value ? "Type a command and hit Enter, or open Spotifree from the dock ♫" : "Tap a command, or the dock to open Spotifree ♫";
  if (focus.value === "keyboard") return isDesktop.value ? "1–5 jump to a section · T terminal · C chat · Esc back" : "Tap 1–5 to jump to a section · T terminal · C chat";
  if (focus.value === "window") return isDesktop.value ? "Click for birds (a shooting star at night). Three quick clicks bring the rain" : "Tap for birds or a shooting star. Three quick taps bring the rain";
  if (focus.value === "shelf") return isDesktop.value ? "Scroll / drag ↕ to explore · Click the console to play, controller for a cheat, trophy for secrets" : "Swipe ↕ to explore · Tap the console to play, controller for a cheat, trophy for secrets";
  if (focus.value === "family") return isDesktop.value ? "Our Little Family ♡ · Esc or Back to desk" : "Our Little Family ♡";
  if (focus.value === "swords") return isDesktop.value ? "Hover a sword to read about it · Click it to draw and strike" : "Tap a sword to draw and strike";
  if (focus.value === "mug") return `${isDesktop.value ? "Click" : "Tap"} the mug for a sip. Finish the cup for the night shift`;
  if (focus.value === "experience") return isDesktop.value ? "Click a pass to hold it up, again to flip it (← → to browse)" : "Tap a pass to hold it, tap again to flip it";
  if (focus.value === "projects" && projectOpen.value) return isDesktop.value ? "Click the pages to turn them (or ← →)" : "Tap the pages to turn them";
  if (focus.value === "projects") return isDesktop.value ? "Click a tab (or ← →) to flip through, the front file to pull it out" : "Tap a tab to flip through, the front file to pull it out";
  if (focus.value === "contact") return isDesktop.value ? "Write on the card (Tab moves along), then hit SEND POSTCARD" : "Tap the card to write, then tap SEND POSTCARD";
  if (focus.value === "chat") return isDesktop.value ? "Type a question and hit Enter (scroll to read back)" : "Tap a question or the box below to ask";
  if (focus.value === "hero") return isDesktop.value ? "Click the badge to flip it (links on the back). Drag the pin to move it" : "Tap the badge to flip it. Drag the pin to move it";
  if (focus.value === "about") return isDesktop.value ? "Drag the papers to rearrange them. Release to pin them back" : "Drag a paper to move it. Release to pin it back";
  // On a desktop the terminal's welcome already says to look around; on a phone it's too small to read
  return isDesktop.value ? "" : "Tap anything to take a closer look · Swipe to turn the room, pinch to zoom";
});

function onEvent(name, payload = {}) {
  // An empty coffee cup (or the lamp) flips the desk to the night shift, or back to day
  // The room's first frame is drawn: the boot loader fades out over it
  if (name === "ready") hideBootLoader();
  else if (name === "nightShift" && payload.dark !== isDark.value) toggleTheme();
  else if (name === "toggleSound") toggleMute();
  else if (name === "projectOpen") projectOpen.value = payload.open;
  else if (name === "console") consoleOn.value = payload.on;
  else if (name === "secret") {
    const isAll = payload.found === payload.total;
    const title = payload.id ? (SECRET_NAMES[payload.id] || payload.id) : (isAll ? "Master of the Desk!" : "Keep exploring the room!");
    secretToast.value = {
      allDone: isAll,
      found: payload.found,
      total: payload.total,
      title,
      key: `${payload.id || 'secret'}-${payload.found}-${Date.now()}`,
    };
    clearTimeout(secretTimer);
    secretTimer = setTimeout(() => (secretToast.value = null), 4500);
  }
  else if (name === "focus") {
    focus.value = payload.name;
  }
}

// The picks are a per-visitor convenience: blocked or empty storage just means the default room
function readSettings() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    // no storage, or not ours: the default room it is
  }
  const pickWood = (part, choice = {}) => ({
    wood: WOODS[choice.wood] ? choice.wood : DEFAULT_WOODS[part].wood,
    pattern: WOOD_PATTERNS[choice.pattern] ? choice.pattern : DEFAULT_WOODS[part].pattern,
  });
  return {
    wall: /^#[0-9a-f]{6}$/i.test(saved.wall || "") ? saved.wall : DEFAULT_WALL,
    woods: Object.fromEntries(Object.keys(WOOD_TARGETS).map((part) => [part, pickWood(part, saved.woods?.[part])])),
  };
}
function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // no storage: the picks last this visit only
  }
}
function setWall(hex) {
  settings.wall = hex;
  scene.value?.setWallColor(hex);
  saveSettings();
}
function setWood(part, choice) {
  Object.assign(settings.woods[part], choice);
  scene.value?.setWood(part, choice);
  saveSettings();
}

watch(isDark, (dark) => scene.value?.setTheme(dark));
watch(zoomed, (value) => value && (settingsOpen.value = false));
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
      wallColor: settings.wall,
      woods: JSON.parse(JSON.stringify(settings.woods)),
      onEvent,
    });
    setTimeout(() => (introPlaying.value = false), 1600);
    if (process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("preview") === "secret") {
      secretTimer = setTimeout(async () => {
        await initializeAudio();
        if (!stageRef.value) return;
        sfx.ding({ pitch: 1.15, volume: 0.22 });
        onEvent("secret", { id: "snap", found: 1, total: Object.keys(SECRET_NAMES).length });
      }, 2200);
    }
  } catch (err) {
    console.error(err);
    unsupported.value = true;
    hideBootLoader();
  }
});

onUnmounted(() => {
  clearTimeout(secretTimer);
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
.settings-label {
  @apply text-xs font-extrabold uppercase mb-1.5;
}
.swatch {
  @apply relative w-7 h-7 border-2 border-black transition-transform;
}
.swatch:hover {
  transform: translate(-1px, -1px);
}
.swatch--on {
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px #000;
}
.swatch--custom {
  background: conic-gradient(#ff90e8, #ffc900, #00e0c6, #90a8ed, #ff90e8);
}
.pattern-chip {
  @apply border-2 border-black px-1.5 py-0.5 text-[11px] font-bold bg-white;
}
.pattern-chip--on {
  @apply bg-black text-white;
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
