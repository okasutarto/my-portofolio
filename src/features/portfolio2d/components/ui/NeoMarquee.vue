<template>
  <!-- Tilted "tape" strip used between sections. The wrapper clips the sides so the
       rotated, slightly scaled strip never makes the page scroll horizontally. -->
  <div class="relative z-10 overflow-x-clip py-3 -my-3" aria-hidden="true">
    <div
      class="w-full border-y-[3px] border-black dark:border-[#f4ead5] py-3 marquee-container scale-[1.03]"
      :class="
        variant === 'accent'
          ? 'bg-neo-magenta dark:bg-[#e8b04a] rotate-[1.2deg]'
          : 'bg-primary -rotate-[1.5deg]'
      ">
      <div
        class="marquee-content font-display text-lg md:text-xl font-bold uppercase tracking-widest text-black"
        :class="{ 'marquee-reverse': variant === 'accent' }">
        <!-- Even number of repeats: the animation slides by exactly half -->
        <span v-for="n in 8" :key="n">{{ text }} ✦&nbsp;</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    default: "Full stack developer ✦ Mobile engineer ✦ AI enthusiast",
  },
  variant: { type: String, default: "primary" },
});
</script>

<style scoped>
.marquee-reverse {
  animation-direction: reverse;
}
</style>
