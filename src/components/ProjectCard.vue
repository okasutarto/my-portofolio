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
      <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-4">
        <div>
          <router-link 
            :to="`/projects/${project.id}`" 
            class="text-white hover:text-primary-light text-sm font-medium mr-4"
          >
            View Details
          </router-link>
          <a 
            :href="project.liveUrl" 
            target="_blank" 
            class="text-white hover:text-primary-light text-sm font-medium"
          >
            Live Demo
          </a>
        </div>
      </div>
    </div>
    <div class="p-5">
      <h3 class="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
        {{ project.title }}
      </h3>
      <p class="text-gray-600 dark:text-gray-300 text-sm mb-4">
        {{ project.description }}
      </p>
      <div class="flex flex-wrap gap-2">
        <span 
          v-for="(tech, index) in project.technologies" 
          :key="index"
          class="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-gray-200"
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
