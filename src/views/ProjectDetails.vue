<template>
  <div class="project-details min-h-screen">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>

    <!-- Project Not Found -->
    <div v-else-if="!project" class="flex flex-col items-center justify-center min-h-screen">
      <h1 class="text-4xl font-bold text-gray-800 dark:text-white mb-4">Project Not Found</h1>
      <p class="text-gray-600 dark:text-gray-400 mb-8">The project you're looking for doesn't exist.</p>
      <router-link to="/#projects" class="btn btn-primary">
        Back to Projects
      </router-link>
    </div>

    <!-- Project Content -->
    <div v-else>
      <!-- Hero Section -->
      <section class="relative pt-20 pb-32 overflow-hidden">
        <div class="absolute inset-0"></div>
        <div class="container max-w-6xl mx-auto px-4 relative z-10">
          <!-- Back Button -->
          <router-link 
            to="/#projects" 
            class="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors mb-8"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Projects
          </router-link>

          <div class="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span class="inline-block px-3 py-1 text-sm font-semibold rounded-full bg-primary/10 text-primary mb-4">
                {{ project.type }}
              </span>
              <h1 class="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                {{ project.title }}
              </h1>
              <p class="text-xl text-gray-600 dark:text-gray-300 mb-6">
                {{ project.subtitle }}
              </p>
              
              <!-- Quick Info -->
              <div class="flex flex-wrap gap-6 mb-8">
                <div>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Role</p>
                  <p class="font-medium text-gray-900 dark:text-white">{{ project.role }}</p>
                </div>
                <div>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                  <p class="font-medium text-gray-900 dark:text-white">{{ project.duration }}</p>
                </div>
                <div>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Year</p>
                  <p class="font-medium text-gray-900 dark:text-white">{{ project.year }}</p>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-wrap gap-4">
                <a 
                  v-if="project.demoLink && project.demoLink !== '#'"
                  :href="project.demoLink" 
                  target="_blank"
                  class="btn btn-primary flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Live Demo
                </a>
                <a 
                  v-if="project.codeLink && project.codeLink !== '#'"
                  :href="project.codeLink" 
                  target="_blank"
                  class="btn btn-outline flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  View Code
                </a>
              </div>
            </div>

            <!-- Hero Image -->
            <div class="relative">
              <div class="rounded-2xl overflow-hidden shadow-2xl">
                <img :src="project.image" :alt="project.title" class="w-full h-auto">
              </div>
              <!-- Decorative elements -->
              <div class="absolute -bottom-4 -right-4 w-full h-full bg-primary/20 rounded-2xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Overview Section -->
      <section class="py-16 bg-white dark:bg-gray-900">
        <div class="container max-w-4xl mx-auto px-4">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Project Overview</h2>
          <p class="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            {{ project.overview }}
          </p>
        </div>
      </section>

      <!-- Problem & Solution -->
      <section class="py-16 bg-gray-50 dark:bg-gray-800">
        <div class="container max-w-6xl mx-auto px-4">
          <div class="grid md:grid-cols-2 gap-12">
            <!-- Problem -->
            <div class="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg">
              <div class="flex items-center gap-3 mb-6">
                <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ project.problem.title }}</h3>
              </div>
              <p class="text-gray-600 dark:text-gray-300 mb-4">{{ project.problem.description }}</p>
              <ul class="space-y-3">
                <li v-for="(point, index) in project.problem.points" :key="index" class="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span class="text-gray-600 dark:text-gray-400">{{ point }}</span>
                </li>
              </ul>
            </div>

            <!-- Solution -->
            <div class="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg">
              <div class="flex items-center gap-3 mb-6">
                <div class="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ project.solution.title }}</h3>
              </div>
              <p class="text-gray-600 dark:text-gray-300 mb-4">{{ project.solution.description }}</p>
              <ul class="space-y-3">
                <li v-for="(point, index) in project.solution.points" :key="index" class="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  <span class="text-gray-600 dark:text-gray-400">{{ point }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="py-16 bg-white dark:bg-gray-900">
        <div class="container max-w-4xl mx-auto px-4">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8">Key Features</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <div 
              v-for="(feature, index) in project.features" 
              :key="index"
              class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <span class="text-gray-700 dark:text-gray-300">{{ feature }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Tech Stack Section -->
      <section class="py-16 bg-gray-50 dark:bg-gray-800">
        <div class="container max-w-4xl mx-auto px-4">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8">Technology Stack</h2>
          <div class="flex flex-wrap gap-3">
            <span 
              v-for="(tech, index) in project.technologies" 
              :key="index"
              class="px-4 py-2 bg-white dark:bg-gray-900 rounded-full shadow-md text-gray-700 dark:text-gray-300 font-medium"
            >
              {{ tech }}
            </span>
          </div>
        </div>
      </section>

      <!-- Screenshots Gallery -->
      <section v-if="project.screenshots && project.screenshots.length" class="py-16 bg-white dark:bg-gray-900">
        <div class="container max-w-6xl mx-auto px-4">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8">Screenshots</h2>
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div 
              v-for="(screenshot, index) in project.screenshots" 
              :key="index"
              class="group relative overflow-hidden rounded-xl shadow-lg cursor-pointer"
              @click="openLightbox(index)"
            >
              <img :src="screenshot.url" :alt="screenshot.caption" class="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110">
              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
              <p class="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent text-white text-sm">
                {{ screenshot.caption }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Results/Impact Section -->
      <section v-if="project.results" class="py-16 bg-gradient-to-br from-primary to-secondary text-white">
        <div class="container max-w-4xl mx-auto px-4 text-center">
          <h2 class="text-2xl font-bold mb-12">{{ project.results.title }}</h2>
          <div class="grid grid-cols-3 gap-8">
            <div v-for="(metric, index) in project.results.metrics" :key="index">
              <p class="text-4xl md:text-5xl font-bold mb-2">{{ metric.value }}</p>
              <p class="text-white/80">{{ metric.label }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Learnings Section -->
      <section v-if="project.learnings && project.learnings.length" class="py-16 bg-white dark:bg-gray-900">
        <div class="container max-w-4xl mx-auto px-4">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8">What I Learned</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <div 
              v-for="(learning, index) in project.learnings" 
              :key="index"
              class="flex items-start gap-3 p-4"
            >
              <div class="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                <span class="text-secondary font-bold">{{ index + 1 }}</span>
              </div>
              <span class="text-gray-700 dark:text-gray-300">{{ learning }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Navigation to Other Projects -->
      <section class="py-16 bg-gray-50 dark:bg-gray-800">
        <div class="container max-w-4xl mx-auto px-4 text-center">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8">Explore More Projects</h2>
          <div class="flex flex-wrap justify-center gap-4">
            <router-link 
              v-for="otherProject in otherProjects" 
              :key="otherProject.id"
              :to="`/projects/${otherProject.id}`"
              class="px-6 py-3 bg-white dark:bg-gray-900 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 text-gray-700 dark:text-gray-300 font-medium"
            >
              {{ otherProject.title }}
            </router-link>
          </div>
          <router-link to="/#projects" class="inline-block mt-8 text-primary hover:text-primary-dark font-medium">
            ← View All Projects
          </router-link>
        </div>
      </section>
    </div>

    <!-- Lightbox Modal -->
    <Teleport to="body">
      <Transition name="lightbox">
        <div 
          v-if="lightboxOpen" 
          class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          @click="closeLightbox"
        >
          <button 
            class="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            @click="closeLightbox"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img 
            v-if="project && project.screenshots"
            :src="project.screenshots[lightboxIndex]?.url" 
            :alt="project.screenshots[lightboxIndex]?.caption"
            class="max-w-full max-h-[90vh] object-contain rounded-lg"
            @click.stop
          >
          <!-- Navigation arrows -->
          <button 
            v-if="lightboxIndex > 0"
            class="absolute left-4 text-white hover:text-gray-300 transition-colors"
            @click.stop="lightboxIndex--"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            v-if="project && project.screenshots && lightboxIndex < project.screenshots.length - 1"
            class="absolute right-4 text-white hover:text-gray-300 transition-colors"
            @click.stop="lightboxIndex++"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { projects, getProjectById } from '@/data/projects';

const route = useRoute();
const loading = ref(true);
const project = ref(null);
const lightboxOpen = ref(false);
const lightboxIndex = ref(0);

// Get other projects for navigation
const otherProjects = computed(() => {
  if (!project.value) return [];
  return projects.filter(p => p.id !== project.value.id).slice(0, 3);
});

const openLightbox = (index) => {
  lightboxIndex.value = index;
  lightboxOpen.value = true;
  document.body.style.overflow = 'hidden';
};

const closeLightbox = () => {
  lightboxOpen.value = false;
  document.body.style.overflow = '';
};

onMounted(() => {
  const projectId = route.params.id;
  project.value = getProjectById(projectId);
  loading.value = false;
  
  // Scroll to top
  window.scrollTo(0, 0);
});
</script>

<style scoped>
/* Lightbox transitions */
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.3s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}
</style>
