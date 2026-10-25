<template>
  <div class="min-h-screen flex flex-col">
    <CustomCursor />
    <TheNavbar v-if="!immersive" />
    <div class="page-dots" aria-hidden="true"></div>
    <main class="flex-grow">
      <MainLayout>
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </MainLayout>
    </main>
    <TheFooter v-if="!immersive" />
    <ChatBot v-if="!immersive" />
    <SpeedInsights />
    <dialog ref="soundDialog" tabindex="-1" class="sound-dialog" aria-labelledby="sound-title" aria-describedby="sound-description" @cancel.prevent="chooseSound(false)">
      <span class="sound-label">BEFORE WE START</span>
      <h2 id="sound-title">Sound on?</h2>
      <p id="sound-description">A few sound effects bring the animations to life. Your call.</p>
      <div class="sound-actions">
        <button type="button" :disabled="choosingSound" class="sound-enable" @click="chooseSound(true)">Enable sound <span aria-hidden="true">↗</span></button>
        <button type="button" :disabled="choosingSound" class="sound-muted" @click="chooseSound(false)">Continue muted</button>
      </div>
      <p v-if="soundError" class="sound-error" role="alert">Sound couldn't start. Try again or continue muted.</p>
      <small>You can change this anytime in the navigation.</small>
    </dialog>
  </div>
</template>

<script setup>
import { computed, ref, provide, onMounted, onBeforeUnmount } from "vue";
import { setSoundEnabled, initializeAudio } from "./composables/useSfx";
import { useRoute } from "vue-router";
import TheNavbar from "./components/layout/TheNavbar.vue";
import TheFooter from "./components/layout/TheFooter.vue";
import MainLayout from "./layouts/MainLayout.vue";
import ChatBot from "./components/features/ChatBot.vue";
import CustomCursor from "./components/ui/CustomCursor.vue";
import { useTheme } from "./composables/useTheme";
import { useSpotlight } from "./composables/useSpotlight";
import { inject } from "@vercel/analytics";
import { SpeedInsights } from "@vercel/speed-insights/vue";

const introReady = ref(false);
provide("introReady", introReady);
const soundDialog = ref(null);
const choosingSound = ref(false);
const soundError = ref(false);
let previousOverflow = "";
const chooseSound = async (enabled) => {
  if (choosingSound.value) return;
  choosingSound.value = true;
  soundError.value = false;
  if (await setSoundEnabled(enabled)) {
    soundDialog.value.close();
    document.documentElement.style.overflow = previousOverflow;
    introReady.value = true;
  } else {
    soundError.value = true;
  }
  choosingSound.value = false;
};
const { initTheme } = useTheme();
const route = useRoute();
// Full-screen pages (the 3D desk) bring their own HUD instead of the site chrome
const immersive = computed(() => !!route.meta.immersive);
useSpotlight();

// Initialize Vercel Analytics
inject();

// The dialog only asks when it has to: a visitor who chose "muted" isn't asked again, and one
// who chose sound skips it whenever the browser lets audio start without a click. Browsers
// block audio on a fresh page load until the visitor interacts, so then the dialog's button
// is that interaction.
const storedChoice = () => {
  try {
    return localStorage.getItem("sfx-muted");
  } catch {
    return null;
  }
};
const askForSound = () => {
  previousOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden";
  soundDialog.value.showModal();
  // Start on the dialog itself, not the first button, so no focus ring shows until someone tabs
  soundDialog.value.focus();
};
onMounted(async () => {
  initTheme();
  const choice = storedChoice();
  if (choice === "1") {
    introReady.value = true;
    return;
  }
  if (choice === "0") {
    const started = await Promise.race([initializeAudio(), new Promise((resolve) => setTimeout(() => resolve(false), 400))]);
    if (started) {
      introReady.value = true;
      return;
    }
  }
  askForSound();
});
onBeforeUnmount(() => { document.documentElement.style.overflow = previousOverflow; });
</script>

<style scoped>
.sound-dialog { cursor: auto; width: calc(100% - 40px); max-width: 420px; padding: 28px; border: 4px solid #000; background: #fffdf5; color: #111; box-shadow: 9px 9px 0 #000; }
.sound-dialog::backdrop { background: #0004; backdrop-filter: blur(3px); }
.sound-label { display: inline-block; padding: 4px 8px; border: 2px solid #000; background: var(--color-secondary); transform: rotate(-3deg); font: 800 10px "JetBrains Mono", monospace; letter-spacing: 1px; }
.sound-dialog h2 { font-size: clamp(24px, 6vw, 32px); font-weight: 800; letter-spacing: -1.5px; margin: 20px 0 12px; text-transform: uppercase; }
.sound-dialog p { font-size: 14px; line-height: 1.6; }
.sound-actions { display: grid; gap: 12px; margin: 24px 0 18px; }
.sound-actions button { cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border: 3px solid #000; box-shadow: 4px 4px 0 #000; font-weight: 800; font-size: 13px; text-align: left; }
.sound-enable { background: var(--color-primary); }.sound-muted { background: #fff; }
.sound-actions button:hover:not(:disabled) { transform: translate(-1px, -1px); box-shadow: 5px 5px 0 #000; }
.sound-dialog:focus { outline: none; }
/* The dialog sits in the browser's top layer, above the custom cursor, so it uses the real one */
.sound-dialog, .sound-dialog * { cursor: auto !important; }
.sound-actions button, .sound-actions button * { cursor: pointer !important; }
.sound-actions button:focus-visible { outline: 3px solid #000; outline-offset: 2px; }
.sound-actions button:disabled { opacity: .6; }
.sound-dialog small { font-size: 11px; color: #555; }.sound-dialog .sound-error { margin-bottom: 14px; }
</style>
