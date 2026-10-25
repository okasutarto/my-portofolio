<template>
  <button
    @click="toggleMute"
    class="p-3 border-4 border-black dark:border-primary bg-white dark:bg-zinc-900 shadow-neo-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:bg-secondary group"
    :aria-label="muted ? 'Turn sound effects on' : 'Turn sound effects off'"
    :aria-pressed="!muted"
    :title="muted ? 'Sound off' : 'Sound on'">
    <i
      class="fas text-xl w-6 text-center group-hover:rotate-12 transition-transform text-black dark:text-white"
      :class="muted ? 'fa-volume-mute' : 'fa-volume-up'"></i>
  </button>
</template>

<script setup>
import { useSfx } from "../../composables/useSfx";

const { muted, toggleMute } = useSfx();
</script>
