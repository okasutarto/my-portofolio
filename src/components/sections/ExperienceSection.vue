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
      <div ref="timelineRef" class="relative pl-10 md:pl-12">
        <!-- Vertical Timeline Line (fills as you scroll) -->
        <div
          class="absolute left-0 top-0 bottom-0 w-2 bg-black/10 dark:bg-white/10 border-2 border-black dark:border-primary overflow-hidden">
          <div
            ref="progressRef"
            class="absolute inset-x-0 top-0 h-full bg-primary dark:bg-primary origin-top scale-y-0"></div>
        </div>

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
              class="absolute -left-[52px] md:-left-[64px] top-6 w-8 h-8 md:w-10 md:h-10 border-2 border-black dark:border-primary rounded-none flex items-center justify-center z-20 group-hover:rotate-45 transition-all duration-300 shadow-neo-sm"
              :class="
                activeIndex >= index
                  ? 'bg-primary rotate-45'
                  : 'bg-white dark:bg-zinc-800'
              ">
              <div class="w-3 h-3 bg-black dark:bg-white"></div>
            </div>

            <!-- Item Card -->
            <div
              class="bg-white dark:bg-surface-dark border-2 border-black dark:border-primary p-5 md:p-8 shadow-neo-sm dark:shadow-neo hover:shadow-neo-hover hover:-translate-x-1 hover:-translate-y-1 transition-all duration-300">
              <!-- Header -->
              <div
                class="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                <div>
                  <h3
                    class="font-display text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-black dark:text-white mb-2 uppercase tracking-tight leading-tight break-words">
                    {{ experience.role }}
                  </h3>
                  <div class="flex flex-wrap items-center gap-3">
                    <component
                      :is="experience.companyUrl ? 'a' : 'span'"
                      :href="experience.companyUrl || undefined"
                      :target="experience.companyUrl ? '_blank' : undefined"
                      :rel="experience.companyUrl ? 'noopener noreferrer' : undefined"
                      class="bg-primary text-black px-2 py-0.5 font-bold border-2 border-black transform -rotate-1 text-xs uppercase"
                      :class="{
                        'hover:bg-black hover:text-primary hover:rotate-0 transition-all':
                          experience.companyUrl,
                      }">
                      @{{ experience.company }}
                      <i
                        v-if="experience.companyUrl"
                        class="fas fa-external-link-alt text-[9px] ml-0.5"></i>
                    </component>
                    <span
                      class="bg-secondary text-black dark:text-white px-2 py-0.5 font-bold border-2 border-black dark:border-primary transform rotate-1 text-xs uppercase">
                      {{ experience.location }}
                    </span>
                  </div>
                </div>
                <div
                  class="bg-neo-magenta text-white dark:bg-white dark:text-black px-4 py-2 font-display font-bold text-base border-2 border-black shadow-neo-sm self-start lg:translate-x-2 text-sm md:text-base md:whitespace-nowrap">
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
import { ref, reactive, onMounted, onUnmounted } from "vue";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { experiences } from "@/data/experience";

gsap.registerPlugin(ScrollTrigger);

const experienceCards = reactive([]);
const timelineRef = ref(null);
const progressRef = ref(null);
const activeIndex = ref(-1);
const animations = [];

onMounted(() => {
  // Fill the timeline line as the section scrolls past
  animations.push(
    gsap.to(progressRef.value, {
      scaleY: 1,
      ease: "none",
      scrollTrigger: {
        trigger: timelineRef.value,
        start: "top 60%",
        end: "bottom 60%",
        scrub: 0.5,
      },
    }),
  );

  experienceCards.forEach((card, index) => {
    const anim = gsap.fromTo(
      card,
      { opacity: 0, y: 60 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power4.out",
        scrollTrigger: {
          trigger: card,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      },
    );
    animations.push(anim);

    // Light up the node once the fill line reaches it
    animations.push(
      ScrollTrigger.create({
        trigger: card,
        start: "top 60%",
        onEnter: () => (activeIndex.value = index),
        onLeaveBack: () => (activeIndex.value = index - 1),
      }),
    );
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
