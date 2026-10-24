<template>
  <section
    id="experience"
    ref="sectionRef"
    class="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300 bg-grid-pattern">
    <div class="max-w-5xl mx-auto relative z-10">
      <!-- Section Header -->
      <div class="mb-14 text-center lg:text-left">
        <h2
          v-title-reveal
          class="font-display text-4xl md:text-6xl font-bold uppercase tracking-tight leading-none text-black dark:text-white">
          My career
          <span
            class="bg-black text-white px-3 py-1 dark:bg-primary dark:text-black inline-block transform -rotate-1 shadow-neo-sm"
            >Timeline</span
          >
        </h2>
      </div>

      <!-- Folders -->
      <div class="flex flex-col gap-5">
        <article
          v-for="experience in experiences"
          :key="experience.id"
          class="xp-row bg-white dark:bg-surface-dark border-2 border-black dark:border-[#f4ead5] shadow-neo"
          :class="{ open: openId === experience.id }">
          <button
            :id="`xp-head-${experience.id}`"
            class="row-head w-full grid items-center gap-x-5 gap-y-2 px-5 md:px-6 py-4 md:py-5 text-left text-black dark:text-white group/row"
            :aria-expanded="openId === experience.id"
            :aria-controls="`xp-body-${experience.id}`"
            @click="toggle(experience.id)">
            <span
              class="period font-bold text-xs md:text-sm uppercase tracking-wider opacity-80"
              >{{ experience.period }}</span
            >
            <span class="min-w-0">
              <span
                class="block font-display font-bold uppercase tracking-tight text-lg md:text-2xl leading-tight"
                >{{ experience.role }}</span
              >
              <span class="block font-bold text-sm mt-1">
                <a
                  v-if="experience.companyUrl"
                  :href="experience.companyUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="underline decoration-2 decoration-primary underline-offset-2 hover:bg-primary hover:text-black"
                  @click.stop
                  >@{{ experience.company }}</a
                >
                <template v-else>@{{ experience.company }}</template>
                · {{ experience.location }}
                <span
                  v-if="experience.current"
                  class="ml-1.5 bg-[#22c55e] text-black border-2 border-black px-1.5 text-[10px] align-middle"
                  >NOW</span
                >
              </span>
            </span>
            <span
              v-if="experience.metric"
              class="metric font-display font-bold text-sm md:text-base px-3 py-1.5 border-2 border-black text-black shadow-neo-sm whitespace-nowrap -rotate-2 justify-self-start"
              :class="toneClass(experience.metric.tone)"
              >{{ experience.metric.label }}</span
            >
            <span
              class="toggle w-11 h-11 border-2 border-black dark:border-[#f4ead5] grid place-items-center text-lg group-hover/row:bg-primary group-hover/row:text-black"
              aria-hidden="true">
              <i class="fas fa-plus"></i>
            </span>
          </button>

          <div
            :id="`xp-body-${experience.id}`"
            class="row-body"
            role="region"
            :aria-labelledby="`xp-head-${experience.id}`">
            <div class="overflow-hidden">
              <div
                class="mx-5 md:mx-6 pt-5 pb-6 border-t-2 border-dashed border-black dark:border-[#f4ead5] grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 md:gap-8">
                <!-- Big numbers -->
                <div class="flex flex-row md:flex-col flex-wrap gap-3.5">
                  <div
                    v-for="stat in experience.stats"
                    :key="stat.label"
                    class="px-4 py-3 border-2 border-black text-black shadow-[4px_4px_0_#000] flex-1 md:flex-none min-w-[130px]"
                    :class="toneClass(stat.tone)">
                    <b
                      class="block font-display font-bold leading-none tracking-tighter"
                      :class="
                        stat.value.length > 5
                          ? 'text-xl md:text-3xl'
                          : 'text-3xl md:text-4xl'
                      "
                      >{{ stat.value }}</b
                    >
                    <span
                      class="block mt-1.5 font-bold text-[11px] uppercase tracking-wider"
                      >{{ stat.label }}</span
                    >
                  </div>
                </div>

                <div>
                  <ul class="flex flex-col gap-3">
                    <li
                      v-for="(achievement, aIndex) in experience.achievements"
                      :key="aIndex"
                      class="flex items-start gap-3 text-gray-800 dark:text-gray-200">
                      <span
                        class="mt-2 w-2.5 h-2.5 bg-primary border border-black flex-shrink-0 rotate-45"></span>
                      <p class="font-medium text-base leading-relaxed">
                        <template
                          v-for="(part, pIndex) in splitNumbers(achievement)"
                          :key="pIndex">
                          <strong
                            v-if="part.number"
                            class="bg-primary/60 text-black dark:text-white px-1"
                            >{{ part.text }}</strong
                          >
                          <template v-else>{{ part.text }}</template>
                        </template>
                      </p>
                    </li>
                  </ul>
                  <div class="flex flex-wrap gap-2 mt-5">
                    <span
                      v-for="tech in experience.technologies"
                      :key="tech"
                      class="px-2.5 py-0.5 border-2 border-black dark:border-[#f4ead5] text-xs font-bold uppercase tracking-wider text-black dark:text-white"
                      >{{ tech }}</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { experiences } from "@/data/experience";

gsap.registerPlugin(ScrollTrigger);

const TONES = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  pink: "bg-accent-pink",
  violet: "bg-[#c4b5fd]",
};
const toneClass = (tone) => TONES[tone] || TONES.primary;

// Split text so percentages ("40%", "99.9%") can be highlighted
const splitNumbers = (text) =>
  text
    .split(/([+−-]?\d+(?:\.\d+)?%)/)
    .filter(Boolean)
    .map((part) => ({ text: part, number: /\d%$/.test(part) }));

const sectionRef = ref(null);
const openId = ref(experiences[0]?.id);
const toggle = (id) => {
  openId.value = openId.value === id ? null : id;
};

let ctx = null;

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  ctx = gsap.context(() => {
    // Calm fade-up: tilt + overshoot here read as the section shaking while scrolling
    gsap.from(".xp-row", {
      y: 32,
      opacity: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: "power3.out",
      clearProps: "transform,opacity",
      scrollTrigger: { trigger: sectionRef.value, start: "top 70%" },
    });
  }, sectionRef.value);
});

onUnmounted(() => {
  if (ctx) ctx.revert();
});
</script>

<style scoped>
.row-head {
  grid-template-columns: 1fr 44px;
}
.row-head .period {
  grid-column: 1 / -1;
}
.row-head .metric {
  grid-column: 1;
}
.row-head .toggle {
  grid-column: 2;
  grid-row: 2 / span 2;
}
@media (min-width: 768px) {
  .row-head {
    grid-template-columns: 170px 1fr auto 44px;
  }
  .row-head .period,
  .row-head .metric,
  .row-head .toggle {
    grid-column: auto;
    grid-row: auto;
  }
}

.toggle {
  transition:
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    background 0.2s;
}
.xp-row.open .toggle {
  transform: rotate(45deg);
  background: var(--color-primary);
  color: #000;
}

/* Smooth open/close without measuring heights */
.row-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.xp-row.open .row-body {
  grid-template-rows: 1fr;
}
</style>
