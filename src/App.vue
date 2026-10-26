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
  </div>
</template>

<script setup>
import { computed, ref, provide } from "vue";
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

// Intros used to wait on a "sound on?" dialog. Browsers keep audio locked until the first
// click or key anyway, and that first gesture unlocks it (see useSfx), so no one is asked.
const introReady = ref(true);
provide("introReady", introReady);
const { initTheme } = useTheme();
// Before the first paint, so a dark-theme visitor never sees the light page flash first
initTheme();
const route = useRoute();
// Full-screen pages (the 3D desk) bring their own HUD instead of the site chrome
const immersive = computed(() => !!route.meta.immersive);
useSpotlight();

// Initialize Vercel Analytics
inject();
</script>
