<template>
  <section class="relative min-h-screen flex items-center justify-center overflow-hidden">
    <!-- Floating decorative elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <!-- Gradient orbs -->
      <div class="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float"></div>
      <div class="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float-delayed"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl"></div>
      
      <!-- Floating shapes -->
      <div class="hidden md:block absolute top-32 right-[15%] w-16 h-16 border-2 border-primary/30 rounded-lg animate-spin-slow"></div>
      <div class="hidden md:block absolute bottom-32 left-[15%] w-12 h-12 border-2 border-secondary/30 rounded-full animate-pulse-slow"></div>
      <div class="hidden md:block absolute top-1/3 left-[10%] w-8 h-8 bg-gradient-to-br from-primary/40 to-secondary/40 rounded-lg rotate-45 animate-float"></div>
      <div class="hidden md:block absolute bottom-1/3 right-[10%] w-6 h-6 bg-gradient-to-br from-secondary/40 to-accent/40 rounded-full animate-float-delayed"></div>
    </div>

    <div class="container mx-auto px-4 z-10">
      <div class="text-center">
        <div>
          <p class="text-base md:text-lg text-primary dark:text-primary-light font-medium">Hi there, I'm</p>
        </div>
        
        <!-- Name with enhanced gradient -->
        <h1 class="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 animate-slide-up">
          <span class="relative">
            <span class="bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-accent bg-[length:200%_auto] animate-gradient">Oka Sutarto Putra</span>
            <!-- Underline decoration -->
            <span class="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent rounded-full transform scale-x-0 animate-scale-x"></span>
          </span>
        </h1>
        
        <!-- Typewriter effect for role -->
        <div class="flex items-center justify-center mb-6 animate-slide-up animation-delay-200">
          <div class="h-px w-12 bg-gradient-to-r from-transparent to-primary/50"></div>
          <div class="relative mx-4 px-4 py-2">
            <h2 class="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-800 dark:text-gray-100">
              <span class="text-primary dark:text-primary-light">&lt;</span>
              <span ref="typewriterText" class="typewriter-text">Full Stack Developer</span>
              <span class="text-primary dark:text-primary-light">/&gt;</span>
            </h2>
          </div>
          <div class="h-px w-12 bg-gradient-to-l from-transparent to-secondary/50"></div>
        </div>
        
        <!-- Description with better styling -->
        <p class="max-w-2xl mx-auto text-gray-600 dark:text-gray-300 mb-10 text-base md:text-lg leading-relaxed animate-fade-in animation-delay-400">
          I craft <span class="text-primary dark:text-primary-light font-medium">modern</span>, 
          <span class="text-secondary font-medium">responsive</span> web applications with a focus on 
          <span class="text-accent font-medium">user experience</span> and clean code.
        </p>
        
        <!-- Enhanced CTA buttons -->
        <div class="flex flex-wrap justify-center gap-4 animate-fade-in animation-delay-600">
          <a 
            href="#projects" 
            @click.prevent="scrollToSection('projects')" 
            class="group relative px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-full overflow-hidden shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-1"
          >
            <span class="relative z-10 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              View My Work
            </span>
            <div class="absolute inset-0 bg-gradient-to-r from-secondary to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </a>
          
          <a 
            href="#contact" 
            @click.prevent="scrollToSection('contact')"
            class="group px-8 py-3 font-semibold rounded-full border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition-all duration-300 hover:-translate-y-1 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Get In Touch
          </a>
          
          <a 
            href="/OkaSutartoCV.pdf" 
            download="Oka_Sutarto_Putra_CV.pdf"
            class="group px-8 py-3 font-semibold rounded-full border-2 border-secondary text-secondary hover:bg-secondary hover:text-white dark:border-secondary dark:text-secondary dark:hover:bg-secondary dark:hover:text-white transition-all duration-300 hover:-translate-y-1 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transition-transform group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download CV
          </a>
        </div>

        <!-- Social links -->
        <div class="flex justify-center gap-4 mt-10 animate-fade-in animation-delay-700">
          <a 
            v-for="social in socials" 
            :key="social.name"
            :href="social.url" 
            target="_blank" 
            rel="noopener noreferrer"
            class="w-12 h-12 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-lg shadow-transparent hover:shadow-primary/25"
            :title="social.name"
          >
            <component :is="social.icon" class="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
    
    <!-- Enhanced scroll down indicator -->
    <a 
      href="#about" 
      @click.prevent="scrollToSection('about')"
      class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors z-10 group"
    >
      <span class="text-sm mb-2 opacity-70 group-hover:opacity-100 transition-opacity">Scroll Down</span>
      <div class="w-6 h-10 rounded-full border-2 border-current flex justify-center pt-2">
        <div class="w-1.5 h-1.5 rounded-full bg-current animate-scroll-down"></div>
      </div>
    </a>
  </section>
</template>

<style scoped>
/* Base animations */
.animate-fade-in {
  opacity: 0;
  animation: fade-in 1s ease forwards;
}

.animate-slide-up {
  opacity: 0;
  transform: translateY(30px);
  animation: slide-up 0.8s ease forwards;
}

/* Animation delays */
.animation-delay-200 { animation-delay: 0.2s; }
.animation-delay-300 { animation-delay: 0.3s; }
.animation-delay-400 { animation-delay: 0.4s; }
.animation-delay-600 { animation-delay: 0.6s; }
.animation-delay-700 { animation-delay: 0.7s; }

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

/* Underline scale animation */
.animate-scale-x {
  animation: scale-x 0.8s ease 0.5s forwards;
}

@keyframes scale-x {
  0% { transform: scaleX(0); }
  100% { transform: scaleX(1); }
}

/* Gradient animation for name */
.animate-gradient {
  animation: gradient-shift 3s ease infinite;
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* Wave animation for emoji */
.animate-wave {
  display: inline-block;
  animation: wave 2.5s ease-in-out infinite;
  transform-origin: 70% 70%;
}

@keyframes wave {
  0%, 100% { transform: rotate(0deg); }
  10% { transform: rotate(14deg); }
  20% { transform: rotate(-8deg); }
  30% { transform: rotate(14deg); }
  40% { transform: rotate(-4deg); }
  50%, 100% { transform: rotate(0deg); }
}

/* Floating animations for background elements */
.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-float-delayed {
  animation: float 6s ease-in-out infinite;
  animation-delay: 3s;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

/* Slow spin for decorative shape */
.animate-spin-slow {
  animation: spin-slow 20s linear infinite;
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Slow pulse */
.animate-pulse-slow {
  animation: pulse-slow 3s ease-in-out infinite;
}

@keyframes pulse-slow {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
}

/* Scroll down indicator animation */
.animate-scroll-down {
  animation: scroll-down 1.5s ease-in-out infinite;
}

@keyframes scroll-down {
  0% { transform: translateY(0); opacity: 1; }
  50% { transform: translateY(12px); opacity: 0.5; }
  100% { transform: translateY(0); opacity: 1; }
}

/* Typewriter cursor effect */
.typewriter-text::after {
  content: '|';
  animation: blink 1s step-end infinite;
  color: currentColor;
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>

<script setup>
import { nextTick, h } from 'vue';

// Social media icons as functional components
const GitHubIcon = () => h('svg', { fill: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { d: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' })
]);

const LinkedInIcon = () => h('svg', { fill: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { d: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' })
]);

const TwitterIcon = () => h('svg', { fill: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { d: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' })
]);

const socials = [
  { name: 'GitHub', url: 'https://github.com/okasutarto', icon: GitHubIcon },
  { name: 'LinkedIn', url: 'https://linkedin.com/in/okasutarto', icon: LinkedInIcon },
  { name: 'Twitter', url: 'https://twitter.com/okasutarto', icon: TwitterIcon },
];

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
