<template>
  <section
    class="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-20 md:pt-0 md:pb-0">
    <!-- Floating decorative elements -->
    <!-- Floating decorative elements removed for minimalist design -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none"></div>

    <div class="container mx-auto px-4 z-10">
      <div class="text-center">
        <div>
          <p
            class="text-base md:text-lg text-gray-600 dark:text-white font-medium">
            Hi there, I'm
          </p>
        </div>

        <!-- Name with enhanced gradient & premium typography -->
        <h1
          class="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold mb-6 animate-slide-up tracking-tighter">
          <span class="bg-clip-text text-primary animate-gradient">
            Oka Sutarto Putra
          </span>
        </h1>

        <!-- Typewriter effect for role -->
        <div
          class="flex items-center justify-center mb-8 animate-slide-up animation-delay-200">
          <div class="relative mx-4 px-4 py-2">
            <h2
              class="text-xl md:text-2xl lg:text-3xl font-medium text-gray-600 dark:text-gray-300 font-mono">
              <span class="text-gray-400 dark:text-gray-500">&lt;</span>
              <span ref="typewriterText" class="typewriter-text">{{
                displayedText
              }}</span>
              <span class="text-gray-400 dark:text-gray-500">/&gt;</span>
            </h2>
          </div>
        </div>

        <!-- Description with better styling -->
        <p
          class="max-w-sm sm:max-w-3xl mx-auto text-gray-600 dark:text-gray-400 mb-10 text-md sm:text-xl leading-relaxed animate-fade-in animation-delay-400 font-light">
          Turning complex problems into elegant code. Currently exploring the
          intersection of AI and Web Development.
        </p>

        <!-- Enhanced CTA buttons - Premium & Glassmorphism -->
        <div
          class="flex flex-col sm:flex-row justify-center items-center gap-6 animate-fade-in animation-delay-600">
          <a
            href="#projects"
            @click.prevent="scrollToSection('projects')"
            class="group relative px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-full shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 min-w-[180px] overflow-hidden">
            <!-- Button sheen effect -->
            <div
              class="absolute inset-0 w-full h-full bg-white/20 skew-x-12 -translate-x-full group-hover:animate-sheen"></div>

            <span class="relative z-10 flex items-center justify-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 transition-transform duration-300 group-hover:scale-110"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              View My Work
            </span>
          </a>

          <a
            href="#contact"
            @click.prevent="scrollToSection('contact')"
            class="group px-8 py-4 font-bold rounded-full border-2 border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary text-gray-900 dark:text-white hover:text-primary dark:hover:text-primary transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2 min-w-[180px] hover:shadow-lg hover:bg-primary/5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 transition-transform duration-300 group-hover:rotate-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Get In Touch
          </a>
        </div>

        <!-- Social links -->
        <div
          class="flex justify-center gap-6 mt-12 animate-fade-in animation-delay-700 mb-16 md:mb-0">
          <a
            v-for="social in socials"
            :key="social.name"
            :href="social.url"
            target="_blank"
            rel="noopener noreferrer"
            class="group w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-gray-900 transition-all duration-300 hover:-translate-y-1"
            :title="social.name">
            <component :is="social.icon" class="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>

    <!-- Enhanced scroll down indicator -->
    <a
      href="#about"
      @click.prevent="scrollToSection('about')"
      class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors z-10 group cursor-pointer">
      <span
        class="text-xs font-medium tracking-widest uppercase mb-2 opacity-50 group-hover:opacity-100 transition-all duration-300"
        >Scroll</span
      >
      <div
        class="w-[30px] h-[50px] border-2 border-current rounded-full flex justify-center p-2 opacity-75 group-hover:opacity-100 transition-all duration-300">
        <div
          class="w-1.5 h-1.5 bg-current rounded-full animate-scroll-mouse"></div>
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
.animation-delay-200 {
  animation-delay: 0.2s;
}
.animation-delay-300 {
  animation-delay: 0.3s;
}
.animation-delay-400 {
  animation-delay: 0.4s;
}
.animation-delay-600 {
  animation-delay: 0.6s;
}
.animation-delay-700 {
  animation-delay: 0.7s;
}

@keyframes fade-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
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
  0% {
    transform: scaleX(0);
  }
  100% {
    transform: scaleX(1);
  }
}

/* Gradient animation for name */
.bg-300\% {
  background-size: 300% auto;
}

.animate-gradient {
  animation: gradient-shift 8s ease infinite;
}

@keyframes gradient-shift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* Wave animation for emoji */
.animate-wave {
  display: inline-block;
  animation: wave 2.5s ease-in-out infinite;
  transform-origin: 70% 70%;
}

@keyframes wave {
  0%,
  100% {
    transform: rotate(0deg);
  }
  10% {
    transform: rotate(14deg);
  }
  20% {
    transform: rotate(-8deg);
  }
  30% {
    transform: rotate(14deg);
  }
  40% {
    transform: rotate(-4deg);
  }
  50%,
  100% {
    transform: rotate(0deg);
  }
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
  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(5deg);
  }
}

/* Slow spin for decorative shape */
.animate-spin-slow {
  animation: spin-slow 20s linear infinite;
}

@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Slow pulse */
.animate-pulse-slow {
  animation: pulse-slow 3s ease-in-out infinite;
}

@keyframes pulse-slow {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* Scroll mouse animation */
.animate-scroll-mouse {
  animation: scroll-mouse 2s cubic-bezier(0.15, 0.41, 0.69, 0.94) infinite;
}

@keyframes scroll-mouse {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(15px);
  }
}

/* Button sheen animation */
.group-hover\:animate-sheen:hover {
  animation: sheen 1s forwards;
}

@keyframes sheen {
  0% {
    transform: translateX(-100%) skewX(12deg);
  }
  100% {
    transform: translateX(200%) skewX(12deg);
  }
}

/* Typewriter cursor effect */
.typewriter-text::after {
  content: "|";
  animation: blink 1s step-end infinite;
  color: currentColor;
  margin-left: 2px;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}
</style>

<script setup>
import { nextTick, h, ref, onMounted, onUnmounted } from "vue";

// Social media icons as functional components
const GitHubIcon = () =>
  h("svg", { fill: "currentColor", viewBox: "0 0 24 24" }, [
    h("path", {
      d: "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z",
    }),
  ]);

const LinkedInIcon = () =>
  h("svg", { fill: "currentColor", viewBox: "0 0 24 24" }, [
    h("path", {
      d: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
    }),
  ]);

const TwitterIcon = () =>
  h("svg", { fill: "currentColor", viewBox: "0 0 24 24" }, [
    h("path", {
      d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
    }),
  ]);

const socials = [
  { name: "GitHub", url: "https://github.com/okasutarto", icon: GitHubIcon },
  {
    name: "LinkedIn",
    url: "https://linkedin.com/in/okasutarto",
    icon: LinkedInIcon,
  },
  { name: "Twitter", url: "https://twitter.com/okasutarto", icon: TwitterIcon },
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
    behavior: "smooth",
  });

  // For the About section, trigger animations after scrolling completes
  if (sectionId === "about") {
    // Wait for scroll to complete before triggering animations
    await nextTick();
    setTimeout(() => {
      // Access the AboutSection component and trigger animations
      try {
        // Method 1: Try to access component through DOM
        const aboutComponent =
          document.getElementById("about").__vueParentComponent?.proxy;
        if (aboutComponent && aboutComponent.showAllElements) {
          aboutComponent.showAllElements();
          return;
        }

        // Method 2: Using custom event as fallback
        const event = new CustomEvent("showAboutAnimations");
        document.dispatchEvent(event);
      } catch (error) {
        console.error("Could not trigger about section animations:", error);
      }
    }, 500); // Adjust timing as needed
  }
};

// Typewriter effect
const displayedText = ref("");
const roles = ["Full Stack Developer", "AI Enthusiast", "Problem Solver"];
let currentRoleIndex = 0;
let currentCharIndex = 0;
let isDeleting = false;
let typingSpeed = 100;
let timeoutId = null;

const typeText = () => {
  const currentRole = roles[currentRoleIndex];

  if (isDeleting) {
    displayedText.value = currentRole.substring(0, currentCharIndex - 1);
    currentCharIndex--;
    typingSpeed = 50;
  } else {
    displayedText.value = currentRole.substring(0, currentCharIndex + 1);
    currentCharIndex++;
    typingSpeed = 100;
  }

  if (!isDeleting && currentCharIndex === currentRole.length) {
    isDeleting = true;
    typingSpeed = 2000; // Pause at end
  } else if (isDeleting && currentCharIndex === 0) {
    isDeleting = false;
    currentRoleIndex = (currentRoleIndex + 1) % roles.length;
    typingSpeed = 500; // Pause before typing next
  }

  timeoutId = setTimeout(typeText, typingSpeed);
};

onMounted(() => {
  typeText();
});

onUnmounted(() => {
  if (timeoutId) clearTimeout(timeoutId);
});
</script>
