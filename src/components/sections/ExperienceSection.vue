<template>
  <section
    id="experience"
    class="min-h-screen py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300 bg-background-light dark:bg-background-dark bg-grid-pattern">
    <div class="max-w-5xl mx-auto relative z-10">
      <!-- Section Header -->
      <div class="mb-20 text-center lg:text-left">
        <h2
          class="font-display text-5xl md:text-7xl font-bold uppercase tracking-tight leading-none mb-4 text-black dark:text-white drop-shadow-[4px_4px_0px_var(--color-secondary)]">
          My
          <span
            class="text-stroke-2 text-transparent"
            style="-webkit-text-stroke: 1px currentColor; color: transparent"
            >Career</span
          >
          <br />
          <span
            class="bg-black text-white px-3 py-1 dark:bg-primary dark:text-black inline-block transform -rotate-1 shadow-neo-sm"
            >Timeline</span
          >
        </h2>
        <div
          class="w-32 h-3 bg-secondary border-2 border-black dark:border-primary mt-6 mx-auto lg:mx-0 shadow-neo-sm transform rotate-1"></div>
      </div>

      <!-- Experience Container -->
      <div class="relative pl-8 md:pl-12">
        <!-- Vertical Timeline Line -->
        <div
          class="absolute left-0 top-0 bottom-0 w-2 bg-black dark:bg-primary border-r-2 border-black dark:border-primary shadow-neo-sm"></div>

        <!-- Experience Items -->
        <div class="space-y-16">
          <div
            v-for="(experience, index) in experiences"
            :key="experience.id"
            :ref="
              (el) => {
                if (el) experienceCards[index] = el;
              }
            "
            class="relative opacity-0 group">
            <!-- Timeline Node -->
            <div
              class="absolute -left-[42px] md:-left-[56px] top-6 w-10 h-10 bg-white dark:bg-zinc-800 border-2 border-black dark:border-primary rounded-none flex items-center justify-center z-20 group-hover:bg-primary group-hover:rotate-45 transition-all duration-300 shadow-neo-sm">
              <div class="w-3 h-3 bg-black dark:bg-white"></div>
            </div>

            <!-- Item Card -->
            <div
              class="bg-white dark:bg-surface-dark border-2 border-black dark:border-primary p-6 md:p-8 shadow-neo-sm dark:shadow-neo transition-all duration-300">
              <!-- Header -->
              <div
                class="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                <div>
                  <h3
                    class="font-display text-xl md:text-2xl lg:text-3xl font-bold text-black dark:text-white mb-2 uppercase tracking-tight leading-tight">
                    {{ experience.role }}
                  </h3>
                  <div class="flex flex-wrap items-center gap-3">
                    <span
                      class="bg-primary text-black px-2 py-0.5 font-bold border-2 border-black transform -rotate-1 text-xs uppercase">
                      @{{ experience.company }}
                    </span>
                    <span
                      class="bg-secondary text-black dark:text-white px-2 py-0.5 font-bold border-2 border-black dark:border-primary transform rotate-1 text-xs uppercase">
                      {{ experience.location }}
                    </span>
                  </div>
                </div>
                <div
                  class="bg-neo-magenta text-white dark:bg-white dark:text-black px-4 py-2 font-display font-bold text-base border-2 border-black shadow-neo-sm self-start lg:translate-x-2 whitespace-nowrap">
                  {{ experience.period }}
                </div>
              </div>

              <!-- Achievements -->
              <ul class="space-y-3 mb-8">
                <li
                  v-for="(achievement, aIndex) in experience.achievements"
                  :key="aIndex"
                  class="flex items-start gap-3 text-gray-800 dark:text-gray-200">
                  <span
                    class="mt-1.5 w-2 h-2 bg-primary border border-black flex-shrink-0 transform rotate-45"></span>
                  <p class="font-medium text-base leading-relaxed">
                    {{ achievement }}
                  </p>
                </li>
              </ul>

              <!-- Tech Stack Tags -->
              <div
                class="flex flex-wrap gap-2 pt-6 border-t-2 border-black/10 dark:border-white/10">
                <span
                  v-for="(tech, tIndex) in experience.technologies"
                  :key="tIndex"
                  class="px-3 py-1 bg-gray-100 dark:bg-zinc-800 border-2 border-black dark:border-primary text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-black transition-all">
                  {{ tech }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive, onMounted, onUnmounted } from "vue";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { experiences } from "@/data/experience";

gsap.registerPlugin(ScrollTrigger);

const experienceCards = reactive([]);
const animations = [];

onMounted(() => {
  experienceCards.forEach((card, index) => {
    const anim = gsap.fromTo(
      card,
      {
        opacity: 0,
        x: index % 2 === 0 ? -50 : 50,
        y: 30,
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        duration: 0.8,
        ease: "power4.out",
        scrollTrigger: {
          trigger: card,
          start: "top 85%",
          end: "top 60%",
          scrub: 1,
          toggleActions: "play none none reverse",
        },
      },
    );
    animations.push(anim);
  });
});

onUnmounted(() => {
  animations.forEach((anim) => {
    if (anim.scrollTrigger) anim.scrollTrigger.kill();
    anim.kill();
  });
});
</script>

<style scoped>
.text-stroke-2 {
  -webkit-text-stroke: 2px black;
}
.dark .text-stroke-2 {
  -webkit-text-stroke: 2px white;
}
</style>
