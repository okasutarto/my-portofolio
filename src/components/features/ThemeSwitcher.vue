<template>
  <button
    @click="toggleTheme"
    class="p-3 border-4 border-black dark:border-primary bg-white dark:bg-zinc-900 shadow-neo-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:bg-secondary group"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
    <i
      v-if="!isDark"
      class="fas fa-moon text-xl group-hover:rotate-12 transition-transform"></i>
    <i
      v-else
      class="fas fa-sun text-white text-xl group-hover:rotate-12 transition-transform"></i>
  </button>
</template>

<script setup>
import { useTheme } from "../../composables/useTheme";

const { isDark, toggleTheme } = useTheme();
</script>
