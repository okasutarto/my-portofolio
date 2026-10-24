<template>
  <!-- Tilted "tape" strip used between sections -->
  <div
    class="relative z-10 w-full border-y-[3px] border-black dark:border-[#f4ead5] py-3 marquee-container scale-[1.03]"
    :class="[
      variant === 'accent'
        ? 'bg-neo-magenta dark:bg-[#e8b04a] rotate-[1.2deg]'
        : 'bg-primary -rotate-[1.5deg]',
    ]">
    <div
      class="marquee-content font-display text-lg md:text-xl font-bold uppercase tracking-widest text-black"
      :class="{ 'marquee-reverse': variant === 'accent' }">
      <slot>
        FULL STACK DEVELOPER ✦ MOBILE ENGINEER ✦ AI ENTHUSIAST ✦ FULL STACK
        DEVELOPER ✦ MOBILE ENGINEER ✦ AI ENTHUSIAST ✦ FULL STACK DEVELOPER ✦
        MOBILE ENGINEER ✦ AI ENTHUSIAST ✦ FULL STACK DEVELOPER ✦ MOBILE
        ENGINEER ✦ AI ENTHUSIAST ✦
      </slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  variant: { type: String, default: "primary" },
});
</script>

<style scoped>
.marquee-reverse {
  animation-direction: reverse;
}
</style>
