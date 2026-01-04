<template>
  <div 
    class="project-card bg-white dark:bg-dark-800 overflow-hidden rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition duration-300"
    :class="{ 'animate-slide-up': isIntersecting }"
    ref="element"
  >
    <div class="relative overflow-hidden group">
      <img 
        :src="project.image" 
        :alt="project.title" 
        class="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div class="absolute top-0 left-0 w-full h-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
        <div class="flex flex-col gap-3">
          <router-link 
            :to="`/projects/${project.id}`" 
            class="px-4 py-2 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors text-sm text-center"
          >
            View Details
          </router-link>
          <a 
            :href="project.liveUrl" 
            target="_blank" 
            class="px-4 py-2 bg-transparent border border-white text-white font-medium rounded-lg hover:bg-white/10 transition-colors text-sm text-center"
          >
            Live Demo
          </a>
        </div>
      </div>
    </div>
    <div class="p-6">
      <h3 class="text-xl font-bold mb-3 text-gray-900 dark:text-white">
        {{ project.title }}
      </h3>
      <p class="text-gray-700 dark:text-gray-200 text-sm mb-4 leading-relaxed">
        {{ project.description }}
      </p>
      <div class="flex flex-wrap gap-2">
        <span 
          v-for="(tech, index) in project.technologies" 
          :key="index"
          class="text-xs px-2.5 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800"
        >
          {{ tech }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, onMounted, ref, watch } from 'vue';
import { useIntersectionObserver } from '../composables/useIntersectionObserver';

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
});

const isDarkMode = ref(false);

// Check if dark mode is enabled
onMounted(() => {
  // Check for dark class on document or user preference
  isDarkMode.value = document.documentElement.classList.contains('dark') || 
                     window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Watch for changes in dark mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    isDarkMode.value = e.matches;
  });
});

const { isIntersecting, element } = useIntersectionObserver({
  threshold: 0.2
});
</script>

<style scoped>
.animate-slide-up {
  animation: slide-up 0.6s ease-out forwards;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Ensure dark mode styles are applied with higher specificity if needed */
:global(.dark) .project-card {
  background-color: var(--dark-bg-color, #1f2937);
  color: var(--dark-text-color, #f3f4f6);
}
</style>
