<template>
  <section
    id="projects"
    class="py-24 px-4 md:px-12 bg-[rgba(0,224,198,0.09)] dark:bg-[rgba(143,214,148,0.04)] transition-colors duration-300 bg-grid-pattern overflow-x-clip">
    <div class="max-w-7xl mx-auto">
      <!-- Section Header -->
      <div class="mb-12 text-center relative">
        <h2
          v-title-reveal="'box'"
          class="text-4xl md:text-6xl font-display font-bold uppercase tracking-tighter relative z-10 inline-block bg-black text-white dark:bg-primary dark:text-black px-8 py-4 border-2 border-black dark:border-primary shadow-neo-sm transform -rotate-1">
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

    <!-- A drawer of project files: flip through them by scrolling, open one right here -->
    <FileDrawer class="-mx-4 md:-mx-12" :projects="projects" />
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
  </section>
</template>

<script setup>
import { projects } from "@/data/projects";
import FileDrawer from "@/components/features/FileDrawer.vue";
</script>
