<template>
  <section
    id="projects"
    class="py-24 px-4 md:px-12 bg-background-light dark:bg-background-dark transition-colors duration-300 bg-grid-pattern overflow-hidden">
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
      </div>

      <!-- Projects Grid -->
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        <article
          v-for="(project, index) in projects"
          :key="project.id"
          :ref="
            (el) => {
              if (el) projectCards[index] = el;
            }
          "
          class="neo-card group bg-white dark:bg-surface-dark border-2 border-black dark:border-primary shadow-neo-sm dark:shadow-neo p-6 flex flex-col h-full relative overflow-hidden opacity-0 hover:-translate-x-1 hover:-translate-y-1 transition-all">
          <!-- Category Badge -->
          <div
            class="absolute top-0 right-0 font-bold px-4 py-1 border-l-2 border-b-2 border-black dark:border-primary text-xs z-10 uppercase transition-colors transform group-hover:bg-primary group-hover:text-black"
            :class="getCategoryColor(project.type, 'bg')">
            {{ project.type }}
          </div>

          <!-- Project Content -->
          <div class="mt-6 mb-6">
            <h3
              class="text-2xl md:text-3xl font-display font-bold mb-3 group-hover:translate-x-1 transition-transform text-black dark:text-white uppercase tracking-tight">
              {{ project.title }}
            </h3>
            <p
              class="text-gray-800 dark:text-gray-200 font-medium leading-relaxed border-l-4 pl-4 text-base"
              :class="getCategoryColor(project.type, 'border')">
              {{ project.description }}
            </p>
          </div>

          <!-- Technology Stack -->
          <div class="flex flex-wrap gap-2 mb-8">
            <span
              v-for="(tech, techIndex) in project.technologies"
              :key="techIndex"
              class="bg-gray-100 dark:bg-zinc-800 border-2 border-black dark:border-primary px-2 py-0.5 text-xs font-bold shadow-neo-sm uppercase hover:bg-primary hover:text-black transition-colors">
              {{ tech }}
            </span>
          </div>

          <!-- Footer Actions -->
          <div
            class="mt-auto flex justify-between items-center border-t-2 border-black dark:border-primary pt-6 border-dashed">
            <div class="flex gap-4">
              <a
                v-if="project.demoLink && project.demoLink !== '#'"
                :href="project.demoLink"
                target="_blank"
                class="flex items-center gap-2 font-bold text-xs uppercase hover:underline decoration-2"
                :class="getCategoryColor(project.type, 'text')">
                <i class="fas fa-external-link-alt"></i> Demo
              </a>
              <a
                v-if="project.codeLink && project.codeLink !== '#'"
                :href="project.codeLink"
                target="_blank"
                class="flex items-center gap-2 font-bold text-xs uppercase hover:underline decoration-2"
                :class="getCategoryColor(project.type, 'text')">
                <i class="fab fa-github"></i> Code
              </a>
            </div>

            <router-link
              :to="`/projects/${project.id}`"
              class="bg-black dark:bg-primary text-white dark:text-black font-bold py-2 px-6 border-2 border-black dark:border-primary hover:bg-white hover:text-black dark:hover:bg-secondary dark:hover:text-white transition-all shadow-neo-sm active:translate-y-0.5 active:shadow-none flex items-center gap-2 uppercase text-xs tracking-wider">
              Details <i class="fas fa-arrow-right"></i>
            </router-link>
          </div>
        </article>

        <!-- More Coming Soon Card -->
        <article
          class="neo-card flex flex-col justify-center items-center bg-primary border-2 border-black dark:border-primary shadow-neo-sm dark:shadow-neo p-8 h-full relative text-center min-h-[350px] overflow-hidden group">
          <div
            class="absolute -top-8 -right-8 w-32 h-32 bg-secondary opacity-20 rounded-full border-2 border-black group-hover:scale-125 transition-transform duration-700"></div>
          <h3
            class="text-3xl md:text-4xl font-display font-bold mb-4 uppercase tracking-tighter">
            More Coming Soon!
          </h3>
          <p class="font-bold mb-8 text-base uppercase">
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
import { reactive, onMounted, onUnmounted, ref } from "vue";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { projects as projectsData } from "@/data/projects";

gsap.registerPlugin(ScrollTrigger);

const sectionTitle = ref(null);
const projectCards = reactive([]);
const projects = reactive(projectsData);
const animations = [];

const getCategoryColor = (type, target) => {
  const colors = {
    Fullstack: {
      bg: "bg-accent-blue text-white shadow-neo-sm",
      border: "border-accent-blue",
      text: "text-accent-blue",
    },
    Frontend: {
      bg: "bg-primary text-black shadow-neo-sm",
      border: "border-primary",
      text: "text-primary",
    },
    Backend: {
      bg: "bg-secondary text-white shadow-neo-sm",
      border: "border-secondary",
      text: "text-secondary",
    },
  };

  const config = colors[type] || colors.Fullstack;
  return config[target];
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

  // Cards stagger animation
  projectCards.forEach((card, index) => {
    animations.push(
      gsap.fromTo(
        card,
        { opacity: 0, scale: 0.9, y: 50 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.6,
          delay: index * 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        },
      ),
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
/* Local styles consolidated to global */
</style>
