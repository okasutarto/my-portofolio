<template>
  <div class="project-details min-h-screen">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div
        class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>

    <!-- Project Not Found -->
    <div
      v-else-if="!project"
      class="flex flex-col items-center justify-center min-h-screen px-4">
      <h1
        class="font-display text-4xl md:text-5xl border-4 border-black dark:border-primary bg-white dark:bg-surface-dark p-8 shadow-neo-sm dark:shadow-neo mb-8 rotate-1 text-black dark:text-white">
        Project Not Found
      </h1>
      <router-link to="/#projects" class="btn btn-primary text-xl px-10 py-5">
        Back to Projects
      </router-link>
    </div>

    <!-- Project Content -->
    <div v-else>
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 mt-8">
        <!-- Hero Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
          <div class="space-y-8">
            <div ref="heroHeader">
              <span
                class="inline-block bg-neo-teal text-black font-bold px-3 py-1 border-2 border-black dark:border-primary shadow-neo-sm dark:shadow-neo-dark mb-4 uppercase tracking-wider text-sm">
                {{ project.type }}
              </span>
              <h1
                class="font-display text-4xl md:text-5xl lg:text-6xl leading-none mb-6 text-black dark:text-white uppercase tracking-tighter drop-shadow-[4px_4px_0px_var(--color-primary)]">
                {{ project.title }}
              </h1>
              <p
                class="text-xl md:text-2xl font-bold text-gray-700 dark:text-gray-300">
                {{ project.subtitle || project.description }}
              </p>
            </div>

            <div
              class="flex flex-wrap gap-8 font-bold border-y-2 border-black dark:border-primary py-6 text-black dark:text-white">
              <div>
                <p class="text-xs uppercase tracking-widest opacity-60 mb-1">
                  Role
                </p>
                <p class="text-lg">{{ project.role }}</p>
              </div>
              <div>
                <p class="text-xs uppercase tracking-widest opacity-60 mb-1">
                  Duration
                </p>
                <p class="text-lg">{{ project.duration }}</p>
              </div>
              <div>
                <p class="text-xs uppercase tracking-widest opacity-60 mb-1">
                  Year
                </p>
                <p class="text-lg">{{ project.year }}</p>
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
              <span
                v-for="(tech, index) in project.technologies"
                :key="index"
                class="px-3 py-1 border-2 border-black dark:border-primary font-bold bg-white dark:bg-zinc-800 text-black dark:text-white text-sm hover:bg-neo-yellow dark:hover:bg-primary hover:text-black transition-colors cursor-default shadow-neo-sm">
                {{ tech }}
              </span>
            </div>

            <div class="flex flex-wrap gap-6 pt-4">
              <a
                v-if="project.demoLink && project.demoLink !== '#'"
                :href="project.demoLink"
                target="_blank"
                class="inline-flex items-center gap-2 bg-neo-teal text-black font-extrabold text-lg px-8 py-4 border-2 border-black dark:border-primary shadow-neo-sm dark:shadow-neo-dark hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none active:translate-y-[4px] active:translate-x-[4px] transition-all group">
                <span
                  class="material-icons group-hover:rotate-45 transition-transform"
                  >open_in_new</span
                >
                LIVE DEMO
              </a>
              <a
                v-if="project.codeLink && project.codeLink !== '#'"
                :href="project.codeLink"
                target="_blank"
                class="inline-flex items-center gap-2 bg-neo-magenta text-white font-extrabold text-lg px-8 py-4 border-2 border-black dark:border-primary shadow-neo-sm dark:shadow-neo-dark hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none active:translate-y-[4px] active:translate-x-[4px] transition-all group">
                <span
                  class="material-icons group-hover:scale-110 transition-transform"
                  >code</span
                >
                VIEW CODE
              </a>
            </div>
          </div>

          <div class="relative" ref="heroImage">
            <div
              class="relative z-10 border-4 border-black dark:border-primary bg-white dark:bg-zinc-800 p-2 shadow-neo-cyan-alt dark:shadow-neo">
              <img
                :src="project.image"
                :alt="project.title"
                class="w-full h-auto border-2 border-black dark:border-primary grayscale hover:grayscale-0 transition-all duration-700" />
            </div>
            <!-- Decorative shapes -->
            <div
              class="absolute -top-6 -right-6 w-24 h-24 bg-neo-magenta border-4 border-black dark:border-primary -z-0 transform rotate-12 hidden md:block"></div>
            <div
              class="absolute -bottom-8 -left-8 w-32 h-32 bg-neo-yellow border-4 border-black dark:border-primary rounded-none -z-0 transform -rotate-12 hidden md:block"></div>
          </div>
        </div>

        <!-- Overview Section -->
        <div class="mb-24 max-w-4xl" ref="overviewSection">
          <h2
            class="font-display text-4xl mb-8 flex items-center gap-4 text-black dark:text-white uppercase tracking-tighter">
            <span class="w-8 h-8 bg-black dark:bg-primary inline-block"></span>
            Project Overview
          </h2>
          <p
            class="text-xl md:text-2xl leading-relaxed font-bold text-gray-800 dark:text-gray-200 border-l-8 border-neo-magenta dark:border-primary pl-6 py-2 bg-white dark:bg-surface-dark border-r-2 border-y-2 border-black dark:border-primary shadow-neo-sm dark:shadow-neo transition-all">
            {{ project.overview }}
          </p>
        </div>

        <!-- Problem & Solution Cards -->
        <div
          class="grid grid-cols-1 md:grid-cols-2 gap-12 mb-24"
          ref="problemSolution">
          <!-- Problem Card -->
          <div
            class="bg-white dark:bg-zinc-900 border-4 border-black dark:border-primary p-8 shadow-neo-magenta dark:shadow-neo hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-300">
            <div class="flex items-center gap-4 mb-6">
              <div
                class="bg-red-100 dark:bg-red-900/30 p-3 border-2 border-black dark:border-primary shadow-neo-sm">
                <span
                  class="material-icons text-red-600 dark:text-red-400 text-3xl"
                  >warning</span
                >
              </div>
              <h3
                class="font-display text-2xl text-black dark:text-white uppercase tracking-tight">
                {{ project.problem.title }}
              </h3>
            </div>
            <p
              class="mb-8 text-gray-700 dark:text-gray-300 font-bold text-lg leading-snug">
              {{ project.problem.description }}
            </p>
            <ul class="space-y-4">
              <li
                v-for="(point, index) in project.problem.points"
                :key="index"
                class="flex items-start gap-3 group">
                <span
                  class="material-icons text-red-500 font-bold group-hover:rotate-90 transition-transform"
                  >close</span
                >
                <span class="text-black dark:text-white font-bold">{{
                  point
                }}</span>
              </li>
            </ul>
          </div>

          <!-- Solution Card -->
          <div
            class="bg-white dark:bg-zinc-900 border-4 border-black dark:border-primary p-8 shadow-neo-cyan-alt dark:shadow-neo hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-300">
            <div class="flex items-center gap-4 mb-6">
              <div
                class="bg-green-100 dark:bg-green-900/30 p-3 border-2 border-black dark:border-primary shadow-neo-sm">
                <span
                  class="material-icons text-green-600 dark:text-green-400 text-3xl"
                  >lightbulb</span
                >
              </div>
              <h3
                class="font-display text-2xl text-black dark:text-white uppercase tracking-tight">
                {{ project.solution.title }}
              </h3>
            </div>
            <p
              class="mb-8 text-gray-700 dark:text-gray-300 font-bold text-lg leading-snug">
              {{ project.solution.description }}
            </p>
            <ul class="space-y-4">
              <li
                v-for="(point, index) in project.solution.points"
                :key="index"
                class="flex items-start gap-3 group">
                <span
                  class="material-icons text-green-500 font-bold group-hover:scale-125 transition-transform"
                  >check_circle</span
                >
                <span class="text-black dark:text-white font-bold">{{
                  point
                }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Key Features Grid -->
        <div class="mb-24" ref="featuresSection">
          <h2
            class="font-display text-4xl mb-12 text-center uppercase tracking-tighter text-black dark:text-white">
            Key Features
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
              v-for="(feature, index) in project.features"
              :key="index"
              class="bg-white dark:bg-zinc-800 border-4 border-black dark:border-primary p-6 hover:-translate-y-2 hover:shadow-neo transition-all duration-300 shadow-neo-sm dark:shadow-neo group">
              <div
                class="w-12 h-12 flex items-center justify-center border-2 border-black dark:border-primary shadow-neo-sm mb-6 transition-all group-hover:bg-primary group-hover:text-black"
                :class="getFeatureIconColor(index)">
                <span class="material-icons text-2xl font-bold">{{
                  getFeatureIcon(index)
                }}</span>
              </div>
              <h3
                class="font-bold text-xl mb-2 text-black dark:text-white leading-tight">
                {{ feature }}
              </h3>
              <p
                class="text-sm opacity-70 font-bold text-black dark:text-white">
                Core functionality implemented with clean architecture.
              </p>
            </div>
          </div>
        </div>
      </main>

      <!-- Impact & Results (Banner) -->
      <section
        v-if="project.results"
        class="w-full bg-neo-yellow dark:bg-secondary border-y-4 border-black dark:border-primary py-24 mb-24 overflow-hidden relative shadow-[inset_0_4px_10px_rgba(0,0,0,0.1)]">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2
            class="font-display text-4xl md:text-5xl text-center mb-16 text-black uppercase tracking-tighter drop-shadow-sm">
            {{ project.results.title }}
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div
              v-for="(metric, index) in project.results.metrics"
              :key="index"
              class="bg-white dark:bg-zinc-800 border-4 border-black dark:border-black p-8 shadow-neo-sm dark:shadow-neo-dark transition-transform hover:scale-105"
              :style="{
                transform: `rotate(${index % 2 === 0 ? '2' : '-1'}deg)`,
              }">
              <h3
                class="font-display text-6xl md:text-7xl mb-2 text-black dark:text-white transition-all transform hover:scale-110">
                {{ metric.value }}
              </h3>
              <p
                class="font-black text-lg uppercase tracking-widest text-black dark:text-primary">
                {{ metric.label }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <!-- What I Learned -->
        <div class="mb-32" ref="learningsSection">
          <h2
            class="font-display text-4xl mb-12 flex items-center gap-4 text-black dark:text-white uppercase tracking-tighter">
            <span class="text-neo-teal material-icons text-5xl">school</span>
            What I Learned
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div
              v-for="(learning, index) in project.learnings"
              :key="index"
              class="flex items-start gap-6 p-6 border-4 border-transparent hover:border-black dark:hover:border-primary hover:bg-white dark:hover:bg-zinc-900 transition-all shadow-none hover:shadow-neo-sm group">
              <span
                class="flex-shrink-0 w-16 h-16 flex items-center justify-center text-white dark:text-black font-display text-2xl border-4 border-black dark:border-primary shadow-neo-sm transition-all group-hover:rotate-12"
                :class="getLearningColor(index)">
                {{ index + 1 }}
              </span>
              <div>
                <h4
                  class="font-display text-xl mb-2 text-black dark:text-white uppercase tracking-tight">
                  {{ getLearningHeadline(learning) }}
                </h4>
                <p
                  class="text-lg font-bold text-gray-700 dark:text-gray-400 leading-relaxed">
                  {{ learning }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Footer -->
        <div
          class="border-t-8 border-black dark:border-primary pt-24 text-center">
          <h2
            class="font-display text-4xl mb-16 text-black dark:text-white uppercase tracking-tighter">
            Explore More Projects
          </h2>
          <div class="flex flex-wrap justify-center gap-8">
            <router-link
              v-for="otherProject in otherProjects"
              :key="otherProject.id"
              :to="`/projects/${otherProject.id}`"
              class="bg-white dark:bg-zinc-800 text-black dark:text-white px-10 py-5 font-display text-xl border-4 border-black dark:border-primary shadow-neo hover:bg-primary hover:text-black hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all uppercase tracking-tighter">
              {{ otherProject.title }}
            </router-link>
          </div>
          <router-link
            to="/#projects"
            class="inline-block mt-24 text-2xl font-display uppercase tracking-widest text-black dark:text-white border-b-8 border-primary hover:bg-primary hover:text-black transition-all px-4 py-2">
            ← View All Work
          </router-link>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useRoute } from "vue-router";
import { projects, getProjectById } from "@/data/projects";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const route = useRoute();
const loading = ref(true);
const project = ref(null);

// UI Helpers
const getFeatureIcon = (index) => {
  const icons = [
    "inventory_2",
    "shopping_cart",
    "admin_panel_settings",
    "dns",
    "auto_awesome",
    "terminal",
    "layers",
    "speed",
  ];
  return icons[index % icons.length];
};

const getFeatureIconColor = (index) => {
  const colors = [
    "bg-neo-teal",
    "bg-neo-magenta",
    "bg-neo-yellow",
    "bg-neo-cyan",
    "bg-primary",
  ];
  return colors[index % colors.length];
};

const getLearningColor = (index) => {
  const colors = [
    "bg-neo-teal",
    "bg-neo-cyan",
    "bg-neo-magenta",
    "bg-neo-yellow",
    "bg-primary",
  ];
  return colors[index % colors.length];
};

const getLearningHeadline = (text) => {
  const t = text.toLowerCase();
  if (t.includes("api") || t.includes("backend")) return "CORE ARCHITECTURE";
  if (t.includes("database") || t.includes("sql")) return "DATA SYSTEMS";
  if (t.includes("secure") || t.includes("auth") || t.includes("jwt"))
    return "SECURITY protocols";
  if (t.includes("devops") || t.includes("deployment")) return "INFRASTRUCTURE";
  return "TECHNICAL mastery";
};

// Logic
const otherProjects = computed(() => {
  if (!project.value) return [];
  return projects.filter((p) => p.id !== project.value.id).slice(0, 3);
});

const loadProject = (id) => {
  loading.value = true;
  project.value = getProjectById(id);
  setTimeout(() => {
    loading.value = false;
    nextTick(() => initAnimations());
  }, 300);
  window.scrollTo(0, 0);
};

const initAnimations = () => {
  // Clear any existing scroll triggers
  ScrollTrigger.getAll().forEach((st) => st.kill());

  gsap.from(".project-details main > div", {
    y: 50,
    opacity: 0,
    duration: 1,
    stagger: 0.15,
    ease: "back.out(1.2)",
    scrollTrigger: {
      trigger: ".project-details",
      start: "top 20%",
    },
  });

  // Animate the big impact count cards separately for extra flair
  gsap.from("section .bg-white.dark\\:bg-zinc-800", {
    scale: 0.8,
    rotate: 0,
    opacity: 0,
    duration: 1.2,
    stagger: 0.3,
    ease: "elastic.out(1, 0.5)",
    scrollTrigger: {
      trigger: "section.bg-neo-yellow",
      start: "top 60%",
    },
  });
};

onMounted(() => {
  loadProject(route.params.id);
});

watch(
  () => route.params.id,
  (newId) => {
    loadProject(newId);
  },
);
</script>

<style scoped>
.project-details {
  background-image: linear-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.02) 1px, transparent 1px);
  background-size: 40px 40px;
}

.dark .project-details {
  background-image: linear-gradient(
      rgba(255, 255, 255, 0.05) 1px,
      transparent 1px
    ),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
}

.font-display {
  font-family: "Lexend Mega", sans-serif;
}
</style>
