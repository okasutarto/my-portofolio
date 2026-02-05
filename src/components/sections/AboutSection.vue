<template>
  <section
    id="about"
    class="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 overflow-hidden relative transition-colors duration-300 bg-grid-pattern">
    <!-- Abstract Shapes -->
    <div
      class="absolute top-20 left-10 w-16 h-16 bg-accent-blue border-4 border-black dark:border-primary rounded-full opacity-50 hidden lg:block animate-bounce shadow-neo"></div>
    <div
      class="absolute bottom-20 right-10 w-24 h-24 bg-secondary border-4 border-black dark:border-primary transform rotate-12 opacity-50 hidden lg:block shadow-neo"></div>

    <div class="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 z-10">
      <!-- Left Column: Vision & Portrait -->
      <div class="lg:col-span-5 flex flex-col space-y-8">
        <div class="text-center lg:text-left">
          <h1
            class="font-display text-4xl md:text-6xl font-bold uppercase tracking-tight leading-none mb-2 text-black dark:text-white">
            About
            <br />
            <span
              class="bg-black text-white px-3 py-1 dark:bg-white dark:text-black inline-block transform rotate-1"
              >Me</span
            >
          </h1>
        </div>

        <!-- Identity Card -->
        <div
          class="bg-white dark:bg-surface-dark border-4 border-black dark:border-primary p-6 shadow-neo-sm relative">
          <h2
            class="font-display text-3xl font-bold mb-4 text-secondary dark:text-primary uppercase">
            Who is this guy?
          </h2>
          <p
            class="text-lg md:text-xl leading-relaxed font-bold mb-4 dark:text-white">
            I'm
            <span
              class="bg-primary dark:bg-secondary text-black px-2 border-2 border-black transform inline-block -rotate-1"
              >Oka Sutarto Putra</span
            >. A former industrial engineer who realized code is much more fun
            than conveyor belts.
          </p>
          <p
            class="text-base md:text-lg font-medium text-gray-700 dark:text-gray-200">
            I build responsive UIs with Vue.js, React, & Angular, and architect
            robust APIs with Node.js. My approach? Analytical thinking meets
            chaotic creativity.
          </p>
          <div
            class="absolute top-0 right-0 w-4 h-4 bg-black dark:bg-white"></div>
        </div>
      </div>

      <!-- Right Column: Content & Stats -->
      <div class="lg:col-span-7 flex flex-col space-y-10">
        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <div
            class="bg-primary p-6 border-2 border-black dark:border-primary shadow-neo-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-crosshair flex flex-col items-center justify-center text-center h-full">
            <div
              class="text-6xl font-display font-bold text-black mb-2 drop-shadow-md">
              3+
            </div>
            <div
              class="font-bold text-black bg-white w-full border-2 border-black py-1 uppercase tracking-widest text-xs">
              Years Exp
            </div>
          </div>
          <div
            class="bg-accent-blue p-6 border-2 border-black dark:border-primary shadow-neo-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-crosshair flex flex-col items-center justify-center text-center h-full">
            <div
              class="text-6xl font-display font-bold text-white mb-2 drop-shadow-md">
              8+
            </div>
            <div
              class="font-bold text-black bg-white w-full border-2 border-black py-1 uppercase tracking-widest text-xs">
              Projects
            </div>
          </div>
          <div
            class="bg-secondary p-6 border-2 border-black dark:border-primary shadow-neo-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-crosshair flex flex-col items-center justify-center text-center h-full">
            <div
              class="text-6xl font-display font-bold text-black mb-2 drop-shadow-md">
              99%
            </div>
            <div
              class="font-bold text-white bg-black dark:bg-white dark:text-black w-full border-2 border-white dark:border-black py-1 uppercase tracking-widest text-xs">
              Satisfaction
            </div>
          </div>
        </div>

        <!-- Tech Arsenal -->
        <div
          class="relative p-8 border-2 border-black dark:border-primary bg-white dark:bg-surface-dark border-dashed">
          <div
            class="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-neo-magenta dark:bg-primary text-white dark:text-black font-display font-bold px-6 py-2 border-2 border-black dark:border-primary -rotate-1 shadow-neo-sm">
            TECH ARSENAL
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div
              v-for="tech in arsenal"
              :key="tech.name"
              class="group flex flex-col items-center justify-center p-4 border-2 border-black dark:border-primary bg-gray-50 dark:bg-zinc-800 hover:bg-primary dark:hover:bg-primary transition-all shadow-neo-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1">
              <i
                :class="[
                  tech.icon,
                  'text-4xl mb-2',
                  tech.color,
                  'group-hover:scale-110 group-hover:text-black transition-all',
                ]"></i>
              <span
                class="font-bold text-xs uppercase group-hover:text-black transition-colors"
                >{{ tech.name }}</span
              >
            </div>
          </div>
        </div>

        <!-- Download CTA -->
        <div class="flex justify-start pt-4">
          <a
            class="relative inline-block group w-full md:w-auto text-center"
            href="https://rbopflmphatliijk.public.blob.vercel-storage.com/OkaSutartoCV.pdf"
            target="_blank"
            rel="noopener noreferrer"
            @click="trackResumeDownload">
            <span
              class="absolute inset-0 w-full h-full transition duration-200 ease-out transform translate-x-2 translate-y-2 bg-black dark:bg-secondary group-hover:translate-x-0 group-hover:translate-y-0"></span>
            <span
              class="absolute inset-0 w-full h-full bg-white dark:bg-surface-dark border-2 border-black dark:border-primary group-hover:bg-primary group-hover:border-black transform group-hover:-translate-x-1 group-hover:-translate-y-1 transition-all"></span>
            <span
              class="relative flex items-center justify-center px-8 py-4 font-display font-bold text-black dark:text-white uppercase group-hover:text-black">
              Download Resume <i class="fas fa-download ml-3"></i>
            </span>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { usePostHog } from "@/composables/usePostHog";

const { posthog } = usePostHog();

const trackResumeDownload = () => {
  posthog.capture("resume_downloaded");
  // Add direct link if needed: window.open('your-cv-url', '_blank');
};

const arsenal = [
  { name: "Vue.js", icon: "fab fa-vuejs", color: "text-green-600" },
  { name: "React", icon: "fab fa-react", color: "text-blue-500" },
  { name: "Angular", icon: "fab fa-angular", color: "text-red-600" },
  { name: "Node.js", icon: "fab fa-node", color: "text-green-700" },
  { name: "PostgreSQL", icon: "fas fa-database", color: "text-yellow-600" },
  { name: "Docker", icon: "fab fa-docker", color: "text-blue-600" },
  { name: "Git", icon: "fab fa-git-alt", color: "text-orange-600" },
  { name: "TypeScript", icon: "fas fa-code", color: "text-blue-700" },
];
</script>

<style scoped>
/* Scoped styles relocated to global index.css for consistency where possible */
</style>
