<template>
  <header 
    class="fixed top-0 left-0 w-full z-50 transition-colors duration-300"
    :class="{'bg-white/90 dark:bg-dark/90 shadow-md backdrop-blur-sm': scrolled, 'bg-transparent': !scrolled}"
  >
    <nav class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
      <router-link to="/" class="text-xl font-bold text-primary">
        <span class="font-heading">Talkless</span>
      </router-link>
      
      <!-- Desktop Menu -->
      <div class="hidden md:flex items-center space-x-8">
        <router-link 
          v-for="(link, index) in navLinks" 
          :key="index" 
          :to="link.path"
          class="font-medium transition hover:text-primary"
          active-class="text-primary"
        >
          {{ link.name }}
        </router-link>
        <ThemeSwitcher />
      </div>
      
      <!-- Mobile Menu Button -->
      <div class="flex items-center md:hidden">
        <button @click="toggleMobileMenu" class="md:hidden text-dark dark:text-light">
          <svg v-if="!mobileMenuOpen" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div class="flex justify-center ms-3">
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
    
    <!-- Mobile Menu -->
    <div 
      v-if="mobileMenuOpen"
      class="md:hidden bg-white dark:bg-dark-dark shadow-lg absolute w-full py-4"
    >
      <div class="flex flex-col space-y-4 px-4">
        <router-link 
          v-for="(link, index) in navLinks" 
          :key="index" 
          :to="link.path"
          class="font-medium p-2 transition hover:text-primary"
          active-class="text-primary"
          @click="mobileMenuOpen = false"
        >
          {{ link.name }}
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import ThemeSwitcher from './ThemeSwitcher.vue';

const scrolled = ref(false);
const mobileMenuOpen = ref(false);

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' }
];

const handleScroll = () => {
  scrolled.value = window.scrollY > 50;
};

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>
