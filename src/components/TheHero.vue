<template>
  <section class="relative h-screen flex items-center justify-center overflow-hidden">
    <div class="container mx-auto px-4 z-10">
      <div class="text-center">
        <p class="text-lg md:text-xl mb-4 text-primary animate-fade-in">Hi, I'm</p>
        
        <h1 class="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up">
          <span class="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Oka Sutarto Putra</span>
        </h1>
        
        <div class="flex items-center justify-center mb-8 animate-slide-up animation-delay-200">
          <div class="h-px w-8 bg-dark-light dark:bg-gray-600"></div>
          <h2 class="text-xl md:text-2xl font-medium mx-4">Full Stack Developer</h2>
          <div class="h-px w-8 bg-dark-light dark:bg-gray-600"></div>
        </div>
        
        <p class="max-w-2xl mx-auto text-gray-600 dark:text-gray-300 mb-10 animate-fade-in animation-delay-400">
          I create modern, responsive web applications with a focus on user experience and clean code.
        </p>
        
        <div class="flex flex-wrap justify-center gap-4 animate-fade-in animation-delay-600">
          <a href="#projects" @click.prevent="scrollToSection('projects')" class="btn btn-primary">View My Work</a>
          <a href="#contact" class="btn btn-outline">Get In Touch</a>
        </div>
      </div>
    </div>
    
    <!-- Scroll down indicator -->
    <a 
      href="#about" 
      @click.prevent="scrollToSection('about')"
      class="absolute bottom-8 transform -translate-x-1/2 flex flex-col items-center animate-bounce text-dark dark:text-light w-auto mx-auto z-10"
    >
      <span class="text-sm mb-2">Scroll Down</span>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    </a>
  </section>
</template>

<style scoped>
/* Existing animations for text elements */
.animate-fade-in {
  opacity: 0;
  animation: fade-in 1s ease forwards;
}

.animate-slide-up {
  opacity: 0;
  transform: translateY(30px);
  animation: slide-up 0.8s ease forwards;
}

.animation-delay-200 {
  animation-delay: 0.2s;
}

.animation-delay-400 {
  animation-delay: 0.4s;
}

.animation-delay-600 {
  animation-delay: 0.6s;
}

@keyframes fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes slide-up {
  0% {
    opacity: 0;
    transform: translateY(30px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

<script setup>
import { nextTick } from 'vue';

// Scroll to section function
const scrollToSection = async (sectionId) => {
  const element = document.getElementById(sectionId);
  if (!element) return;

  const offset = 80; // Adjust based on navbar height
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;
  
  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
  
  // For the About section, trigger animations after scrolling completes
  if (sectionId === 'about') {
    // Wait for scroll to complete before triggering animations
    await nextTick();
    setTimeout(() => {
      // Access the AboutSection component and trigger animations
      try {
        // Method 1: Try to access component through DOM
        const aboutComponent = document.getElementById('about').__vueParentComponent?.proxy;
        if (aboutComponent && aboutComponent.showAllElements) {
          aboutComponent.showAllElements();
          return;
        }
          
        // Method 2: Using custom event as fallback
        const event = new CustomEvent('showAboutAnimations');
        document.dispatchEvent(event);
      } catch (error) {
        console.error("Could not trigger about section animations:", error);
      }
    }, 500); // Adjust timing as needed
  }
};
</script>
