<template>
  <div class="min-h-screen flex flex-col">
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
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import TheNavbar from './components/TheNavbar.vue';
import TheFooter from './components/TheFooter.vue';
import MainLayout from './layouts/MainLayout.vue';
import ChatBot from './components/ChatBot.vue';
import { useTheme } from './composables/useTheme';

const { initTheme } = useTheme();

onMounted(() => {
  initTheme();
});
</script>
