<template>
  <section
    id="projects"
    class="py-24 px-4 md:px-12 bg-background-light dark:bg-background-dark transition-colors duration-300 bg-grid-pattern overflow-x-clip">
    <div class="max-w-7xl mx-auto">
      <!-- Section Header -->
      <div class="mb-20 text-center relative">
        <h2
          ref="sectionTitle"
          class="text-4xl md:text-6xl font-display font-bold uppercase tracking-tighter relative z-10 inline-block bg-black text-white dark:bg-primary dark:text-black px-8 py-4 border-2 border-black dark:border-primary shadow-neo-sm transform -rotate-1 opacity-0">
          My Projects
        </h2>
        <div
          class="absolute top-1/2 left-0 w-full h-1 bg-secondary dark:bg-primary -z-0 opacity-30 transform translate-y-4"></div>
        <p
          class="mt-8 font-bold uppercase tracking-widest text-xs md:text-sm text-black/70 dark:text-white/70">
          {{ projects.length }} shipped · more cooking
        </p>
      </div>

    </div>

    <!-- 3D phone showcase (full-bleed so the scene isn't clipped by the section padding) -->
    <template v-if="use3d">
      <PhoneShowcase
        class="-mx-4 md:-mx-12"
        :projects="projects"
        @unsupported="use3d = false" />
      <div class="max-w-7xl mx-auto mt-12">
        <article
          class="flex flex-col md:flex-row justify-between items-center gap-6 bg-primary border-2 border-black dark:border-primary shadow-neo p-8 relative overflow-hidden group text-center md:text-left">
          <div>
            <h3
              class="text-2xl md:text-3xl font-display font-bold uppercase tracking-tighter text-black">
              More Coming Soon!
            </h3>
            <p class="font-bold text-sm uppercase text-black mt-2">
              Currently working on exciting new stuff.
            </p>
          </div>
          <div
            class="w-16 h-16 bg-white border-2 border-black flex items-center justify-center animate-bounce shadow-neo-sm rotate-12 group-hover:rotate-0 transition-transform flex-shrink-0">
            <i class="fas fa-rocket text-3xl text-black"></i>
          </div>
        </article>
      </div>
    </template>

    <div v-else class="max-w-7xl mx-auto">
      <!-- Projects Grid (fallback without WebGL / with reduced motion) -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        <article
          v-for="(project, index) in projects"
          :key="project.id"
          :ref="
            (el) => {
              if (el) projectCards[index] = el;
            }
          "
          class="project-card group relative opacity-0"
          :class="{ 'md:col-span-2 xl:col-span-2': index === 0 }"
          @mousemove="onTilt($event, index)"
          @mouseleave="resetTilt(index)">
          <div
            :ref="
              (el) => {
                if (el) tiltEls[index] = el;
              }
            "
            class="bg-white dark:bg-surface-dark border-2 border-black dark:border-primary shadow-neo dark:shadow-neo flex flex-col h-full relative overflow-hidden transition-shadow duration-300 group-hover:shadow-neo-hover will-change-transform"
            :class="{ 'lg:flex-row': index === 0 }">
            <!-- Preview -->
            <router-link
              :to="`/projects/${project.id}`"
              class="relative block border-b-2 border-black dark:border-primary overflow-hidden bg-gray-100 dark:bg-zinc-900 flex-shrink-0"
              :class="
                index === 0
                  ? 'aspect-[16/10] lg:aspect-auto lg:min-h-[400px] lg:w-[58%] lg:border-b-0 lg:border-r-2'
                  : 'aspect-[16/10]'
              "
              :aria-label="`View ${project.title} case study`">
              <!-- Browser chrome -->
              <div
                class="absolute top-0 inset-x-0 h-7 bg-white dark:bg-zinc-800 border-b-2 border-black dark:border-primary flex items-center gap-1.5 px-3 z-10">
                <span
                  class="w-2.5 h-2.5 rounded-full border border-black bg-accent-pink"></span>
                <span
                  class="w-2.5 h-2.5 rounded-full border border-black bg-primary"></span>
                <span
                  class="w-2.5 h-2.5 rounded-full border border-black bg-secondary"></span>
                <span
                  class="ml-3 flex-1 h-3.5 bg-gray-100 dark:bg-zinc-700 border border-black/20 dark:border-white/20 text-[9px] leading-[12px] px-2 truncate text-black/60 dark:text-white/60 font-bold">
                  {{ project.id }}.app
                </span>
              </div>
              <img
                v-if="project.thumbnail"
                :src="project.thumbnail"
                :alt="`${project.title} preview`"
                loading="lazy"
                class="w-full h-full object-cover object-top pt-7 transition-transform duration-700 ease-out group-hover:scale-105"
                :class="{ 'lg:absolute lg:inset-0': index === 0 }" />
              <!-- Hover overlay -->
              <div
                class="absolute inset-0 top-7 bg-primary/0 group-hover:bg-primary/20 dark:group-hover:bg-secondary/20 transition-colors flex items-center justify-center">
                <span
                  class="font-display font-bold uppercase text-sm bg-black text-white dark:bg-primary dark:text-black px-4 py-2 border-2 border-black dark:border-primary shadow-neo-sm opacity-0 translate-y-4 -rotate-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  View case study →
                </span>
              </div>
              <!-- Index number -->
              <span
                class="absolute bottom-3 left-3 font-display font-bold text-4xl md:text-5xl text-white z-10 pointer-events-none"
                style="-webkit-text-stroke: 2px black; paint-order: stroke fill">
                {{ String(index + 1).padStart(2, "0") }}
              </span>
            </router-link>

            <div class="p-6 flex flex-col flex-1 relative">
              <!-- Category Badge -->
              <div class="flex items-center gap-2 mb-4">
                <span
                  class="font-bold px-3 py-0.5 border-2 border-black dark:border-primary text-xs uppercase"
                  :class="getCategoryColor(project.type, 'bg')">
                  {{ project.type }}
                </span>
                <span
                  v-if="index === 0"
                  class="font-bold px-3 py-0.5 border-2 border-black dark:border-primary text-xs uppercase bg-neo-magenta text-white -rotate-2">
                  ★ Latest
                </span>
              </div>

              <h3
                class="font-display font-bold mb-3 text-black dark:text-white uppercase tracking-tight leading-tight"
                :class="index === 0 ? 'text-3xl md:text-4xl' : 'text-2xl'">
                {{ project.title }}
              </h3>
              <p
                class="text-gray-800 dark:text-gray-200 font-medium leading-relaxed border-l-4 pl-4 text-base mb-6"
                :class="getCategoryColor(project.type, 'border')">
                {{ project.description }}
              </p>

              <!-- Technology Stack -->
              <div class="flex flex-wrap gap-2 mb-8">
                <span
                  v-for="(tech, techIndex) in project.technologies"
                  :key="techIndex"
                  class="bg-gray-100 dark:bg-zinc-800 border-2 border-black dark:border-primary px-2 py-0.5 text-xs font-bold uppercase hover:bg-primary hover:text-black transition-colors">
                  {{ tech }}
                </span>
              </div>

              <!-- Footer Actions -->
              <div
                class="mt-auto flex justify-between items-center border-t-2 border-black dark:border-primary pt-5 border-dashed">
                <div class="flex gap-4">
                  <a
                    v-if="project.demoLink && project.demoLink !== '#'"
                    :href="project.demoLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center gap-2 font-bold text-xs uppercase hover:underline decoration-2 text-black dark:text-white">
                    <i class="fas fa-external-link-alt"></i> Demo
                  </a>
                  <a
                    v-if="project.codeLink && project.codeLink !== '#'"
                    :href="project.codeLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center gap-2 font-bold text-xs uppercase hover:underline decoration-2 text-black dark:text-white">
                    <i class="fab fa-github"></i> Code
                  </a>
                </div>

                <router-link
                  :to="`/projects/${project.id}`"
                  class="bg-black dark:bg-primary text-white dark:text-black font-bold py-2 px-5 border-2 border-black dark:border-primary hover:bg-primary hover:text-black dark:hover:bg-secondary dark:hover:text-white transition-all shadow-neo-sm active:translate-y-0.5 active:shadow-none flex items-center gap-2 uppercase text-xs tracking-wider">
                  Details
                  <i
                    class="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                </router-link>
              </div>
            </div>
          </div>
        </article>

        <!-- More Coming Soon Card -->
        <article
          class="flex flex-col justify-center items-center bg-primary border-2 border-black dark:border-primary shadow-neo p-8 h-full relative text-center min-h-[300px] overflow-hidden group"
          :class="comingSoonSpan">
          <div
            class="absolute -top-8 -right-8 w-32 h-32 bg-secondary opacity-20 rounded-full border-2 border-black group-hover:scale-125 transition-transform duration-700"></div>
          <h3
            class="text-3xl md:text-4xl font-display font-bold mb-4 uppercase tracking-tighter text-black">
            More Coming Soon!
          </h3>
          <p class="font-bold mb-8 text-base uppercase text-black">
            Currently working on exciting new stuff.
          </p>
          <div
            class="w-16 h-16 bg-white border-2 border-black flex items-center justify-center animate-bounce shadow-neo-sm rotate-12 group-hover:rotate-0 transition-transform">
            <i class="fas fa-rocket text-3xl text-black"></i>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive, onMounted, onUnmounted, ref, watch, nextTick } from "vue";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { projects as projectsData } from "@/data/projects";
import PhoneShowcase from "@/components/features/PhoneShowcase.vue";

gsap.registerPlugin(ScrollTrigger);

const sectionTitle = ref(null);
const projectCards = reactive([]);
const tiltEls = [];
const projects = reactive(projectsData);
const use3d = ref(true);

// The grid only renders once the 3D showcase reports it can't run
watch(use3d, async (on) => {
  if (on) return;
  await nextTick();
  animateCards();
});
const animations = [];

// Stretch the "coming soon" card to fill the last row (the featured card takes 2 cells)
const filledCells = projects.length + 1;
const comingSoonSpan = [
  { 0: "md:col-span-2", 1: "md:col-span-1" }[filledCells % 2],
  { 0: "xl:col-span-3", 1: "xl:col-span-2", 2: "xl:col-span-1" }[
    filledCells % 3
  ],
];

const canHover = () => window.matchMedia("(hover: hover)").matches;

// 3D tilt toward the cursor
const onTilt = (e, index) => {
  if (!canHover()) return;
  const el = tiltEls[index];
  const rect = el.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  const strength = index === 0 ? 4 : 8;
  gsap.to(el, {
    rotateY: x * strength,
    rotateX: -y * strength,
    transformPerspective: 1000,
    duration: 0.4,
    ease: "power2.out",
  });
};

const resetTilt = (index) => {
  gsap.to(tiltEls[index], {
    rotateY: 0,
    rotateX: 0,
    duration: 0.6,
    ease: "power3.out",
  });
};

const getCategoryColor = (type, target) => {
  const colors = {
    Fullstack: {
      bg: "bg-accent-blue text-white",
      border: "border-accent-blue",
    },
    Frontend: {
      bg: "bg-primary text-black",
      border: "border-primary",
    },
    Backend: {
      bg: "bg-secondary text-black",
      border: "border-secondary",
    },
  };

  const config = colors[type] || colors.Fullstack;
  return config[target];
};

// Cards drop in like stickers being slapped on (grid fallback only)
const animateCards = () => {
  projectCards.forEach((card, index) => {
    animations.push(
      gsap.fromTo(
        card,
        { opacity: 0, y: 80, rotate: index % 2 === 0 ? -4 : 4 },
        {
          opacity: 1,
          y: 0,
          rotate: 0,
          duration: 0.8,
          delay: (index % 3) * 0.08,
          ease: "back.out(1.4)",
          scrollTrigger: {
            trigger: card,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        },
      ),
    );
  });
  ScrollTrigger.refresh();
};

onMounted(() => {
  // Header animation
  animations.push(
    gsap.to(sectionTitle.value, {
      opacity: 1,
      y: 0,
      rotate: -1,
      duration: 1,
      ease: "back.out(1.7)",
      scrollTrigger: {
        trigger: sectionTitle.value,
        start: "top 85%",
        toggleActions: "play none none reverse",
      },
    }),
  );

  animateCards();
});

onUnmounted(() => {
  animations.forEach((anim) => {
    if (anim.scrollTrigger) anim.scrollTrigger.kill();
    anim.kill();
  });
});
</script>
