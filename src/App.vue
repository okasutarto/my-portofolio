<template>
  <div class="min-h-screen flex flex-col">
    <CustomCursor />
    <TheNavbar />
    <main class="flex-grow bg-grid-pattern">
      <MainLayout>
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </MainLayout>
    </main>
    <TheFooter />
    <ChatBot />
    <SpeedInsights />
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import TheNavbar from "./components/layout/TheNavbar.vue";
import TheFooter from "./components/layout/TheFooter.vue";
import MainLayout from "./layouts/MainLayout.vue";
import ChatBot from "./components/features/ChatBot.vue";
import CustomCursor from "./components/ui/CustomCursor.vue";
import { useTheme } from "./composables/useTheme";
import { inject } from "@vercel/analytics";
import { SpeedInsights } from "@vercel/speed-insights/vue";

const { initTheme } = useTheme();

// Initialize Vercel Analytics
inject();

onMounted(() => {
  initTheme();
});
</script>
