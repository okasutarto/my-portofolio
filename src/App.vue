<template>
  <div class="min-h-screen flex flex-col">
    <CustomCursor />
    <TheNavbar />
    <main class="flex-grow">
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
    <Analytics />
    <SpeedInsights />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import TheNavbar from './components/TheNavbar.vue';
import TheFooter from './components/TheFooter.vue';
import MainLayout from './layouts/MainLayout.vue';
import ChatBot from './components/ChatBot.vue';
import CustomCursor from './components/CustomCursor.vue';
import { useTheme } from './composables/useTheme';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights/vue';

const { initTheme } = useTheme();

// Initialize Vercel Analytics
inject();
injectSpeedInsights();

onMounted(() => {
  initTheme();
});
</script>
