<template>
  <div class="min-h-screen flex flex-col">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <SpeedInsights />
  </div>
</template>

<script setup>
import { useTheme } from "./shared/composables/useTheme";
import { inject } from "@vercel/analytics";
import { SpeedInsights } from "@vercel/speed-insights/vue";

// Apply the visitor's theme before either experience paints.
useTheme().initTheme();
inject();
</script>
