<template>
  <div class="min-h-screen flex flex-col">
    <TheNavbar />
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
    <TheFooter />
    <ChatBot />
  </div>
</template>

<script setup>
import { onMounted, provide, ref } from "vue";
import TheNavbar from "./components/layout/TheNavbar.vue";
import TheFooter from "./components/layout/TheFooter.vue";
import MainLayout from "./components/layout/MainLayout.vue";
import ChatBot from "./components/ChatBot.vue";
import { useSpotlight } from "./composables/useSpotlight";
import { hideBootLoader } from "@/shared/utils/bootLoader";

provide("introReady", ref(true));
useSpotlight();
onMounted(() => {
  hideBootLoader();
  // External @imports inside lazy CSS can reject the route when a CDN is blocked.
  // Load icon fonts independently; the page remains usable if either request fails.
  const iconFonts = {
    "material-icons": "https://fonts.googleapis.com/icon?family=Material+Icons",
    "font-awesome": "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css",
  };
  for (const [id, href] of Object.entries(iconFonts)) {
    if (document.getElementById(id)) continue;
    const link = document.createElement("link");
    Object.assign(link, { id, rel: "stylesheet", href });
    document.head.appendChild(link);
  }
});
</script>
