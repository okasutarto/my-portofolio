<template>
  <nav
    class="w-full transition-all duration-300 py-4 sticky top-0 z-50 border-b-2 border-black dark:border-primary bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center">
        <div class="flex-shrink-0 flex items-center">
          <router-link
            to="/"
            class="font-display text-2xl font-bold tracking-tighter bg-secondary text-black px-3 py-1 border-2 border-black dark:border-primary dark:text-white shadow-neo-sm transform -rotate-2 hover:rotate-0 transition-transform">
            okasp
          </router-link>
        </div>

        <!-- Desktop Menu -->
        <div class="hidden md:flex space-x-10 items-center">
          <template v-if="isProjectPage">
            <router-link
              to="/#projects"
              class="inline-flex items-center gap-2 font-bold hover:translate-x-[-4px] transition-transform text-lg group text-black dark:text-white">
              <span
                class="material-icons group-hover:text-neo-magenta transition-colors"
                >arrow_back</span
              >
              <span
                class="border-b-2 border-transparent group-hover:border-black dark:group-hover:border-primary transition-all"
                >Back to Projects</span
              >
            </router-link>
          </template>
          <template v-else>
            <router-link
              v-for="(link, index) in navLinks"
              :key="index"
              :to="link.path"
              class="text-lg font-bold transition-all relative group text-black dark:text-white hover:underline"
              active-class="decoration-primary decoration-4 underline-offset-8">
              {{ link.name }}
            </router-link>
          </template>
          <ThemeSwitcher />
        </div>

        <!-- Mobile Menu Button -->
        <div class="md:hidden flex items-center space-x-4">
          <ThemeSwitcher />
          <button
            @click="toggleMobileMenu"
            class="p-2 border-2 border-black dark:border-primary rounded-none shadow-neo-sm bg-primary text-black active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
            <i class="fas" :class="mobileMenuOpen ? 'fa-times' : 'fa-bars'"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu Overlay -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform -translate-y-full"
      enter-to-class="transform translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform translate-y-0"
      leave-to-class="transform -translate-y-full">
      <div
        v-if="mobileMenuOpen"
        class="md:hidden bg-background-light dark:bg-zinc-900 border-2 border-black dark:border-primary absolute w-[calc(100%-2rem)] left-4 mt-2 py-6 z-40 shadow-neo transition-all">
        <div class="flex flex-col space-y-6 px-6 text-black dark:text-white">
          <template v-if="isProjectPage">
            <router-link
              to="/#projects"
              class="text-2xl font-bold flex items-center gap-2"
              @click="mobileMenuOpen = false">
              <span class="material-icons">arrow_back</span>
              Back to Projects
            </router-link>
          </template>
          <template v-else>
            <router-link
              v-for="(link, index) in navLinks"
              :key="index"
              :to="link.path"
              class="text-2xl font-bold p-2 hover:bg-primary/20 transition-colors"
              active-class="text-primary"
              @click="mobileMenuOpen = false">
              {{ link.name }}
            </router-link>
          </template>
        </div>
      </div>
    </transition>
  </nav>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import ThemeSwitcher from "../features/ThemeSwitcher.vue";

const route = useRoute();
const mobileMenuOpen = ref(false);

const isProjectPage = computed(() => route.path.startsWith("/projects/"));

const navLinks = [
  { name: "Home", path: "/" },
  { name: "About", path: "/#about" },
  { name: "Experience", path: "/#experience" },
  { name: "Projects", path: "/#projects" },
  { name: "Contact", path: "/#contact" },
];

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};
</script>

<style scoped>
.font-display {
  font-family: "Lexend Mega", sans-serif;
}
</style>
