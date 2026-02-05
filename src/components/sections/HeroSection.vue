<template>
  <main
    class="flex-grow flex bg-background-light dark:bg-background-dark items-center justify-center relative px-4 sm:px-6 lg:px-8 py-8 bg-grid-pattern overflow-hidden">
    <!-- Abstract Shapes (Pinned locally for better alignment) -->
    <div
      class="absolute top-1/2 right-10 w-8 h-8 bg-secondary border-2 border-black rounded-none rotate-45 hidden lg:block shadow-neo"></div>

    <div
      class="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-14 items-center z-10">
      <!-- Top Content (Greeting & Name) -->
      <!-- Left Column (Merged Name & Content for alignment) -->
      <div class="contents lg:flex lg:flex-col lg:col-span-7 lg:space-y-12">
        <!-- Top Content (Greeting & Name) -->
        <div class="flex flex-col space-y-6 text-center lg:text-left order-1">
          <div class="relative w-fit mx-auto lg:mx-0">
            <div
              class="absolute -top-6 -left-8 w-16 h-16 bg-primary border-4 border-black dark:border-primary rounded-full hidden lg:block animate-bounce shadow-neo -z-10"></div>
            <div
              class="inline-block bg-black text-white dark:bg-white dark:text-black px-4 py-2 font-black font-display transform -rotate-2 w-fit border-2 border-transparent">
              👋 Hi there, I'm
            </div>
          </div>

          <h1
            class="text-6xl sm:text-7xl lg:text-7xl font-display font-bold leading-none tracking-tighter text-black dark:text-white drop-shadow-[4px_4px_0px_var(--color-secondary)] dark:drop-shadow-[6px_6px_0px_var(--color-primary)]">
            OKA <br />
            SUTARTO <br />
            PUTRA
          </h1>
        </div>

        <!-- Bottom Content (Badges, Description, CTAs, Socials) -->
        <div class="flex flex-col space-y-6 text-center lg:text-left order-3">
          <div
            class="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 text-xl font-bold">
            <span
              class="bg-secondary dark:bg-primary px-3 py-1 border-2 border-black dark:border-primary shadow-neo-sm text-black">
              &lt;Full Stack Developer /&gt;
            </span>
            <span
              class="bg-primary dark:bg-secondary px-3 py-1 border-2 border-black dark:border-primary shadow-neo-sm dark:shadow-primary text-black">
              Content Creator & AI Enthusiast
            </span>
          </div>

          <p
            class="text-lg sm:text-xl max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed border-l-4 border-primary dark:border-secondary pl-6 dark:text-gray-100">
            Turning complex problems into elegant, brutalist code. Currently
            exploring the intersection of
            <strong>AI, programming, and content creation</strong> to build the
            next generation of digital experiences.
          </p>

          <div
            class="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start pt-2">
            <a
              class="i-primary group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-black transition-all duration-200 bg-primary dark:bg-secondary border-2 border-black dark:border-primary dark:shadow-primary font-display focus:outline-none shadow-neo hover:shadow-neo-hover hover:translate-x-[3px] hover:translate-y-[3px]"
              href="#projects">
              <i class="fas fa-briefcase mr-3"></i>
              View My Work
            </a>
            <a
              class="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-black bg-white transition-all duration-200 border-2 border-black dark:border-primary dark:bg-primary font-display focus:outline-none shadow-neo hover:shadow-neo-hover hover:translate-x-[3px] hover:translate-y-[3px]"
              href="#contact">
              <i class="fas fa-paper-plane mr-3"></i>
              Get In Touch
            </a>
          </div>

          <div class="flex gap-4 justify-center lg:justify-start pt-4">
            <a
              v-for="social in socials"
              :key="social.icon"
              class="w-12 h-12 flex items-center justify-center border-2 border-black bg-white dark:bg-surface-dark dark:border-primary shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all group"
              :href="social.link">
              <i
                :class="[
                  'fab',
                  social.icon,
                  'text-xl group-hover:scale-110 transition-transform',
                ]"></i>
            </a>
          </div>
        </div>
      </div>

      <!-- Portrait Image (Below name on mobile, Right on desktop) -->
      <div class="lg:col-span-5 relative mt-0 lg:mt-0 order-2 lg:order-none">
        <div
          class="relative w-full aspect-square max-w-[280px] sm:max-w-xs lg:max-w-md mx-auto">
          <div
            class="absolute inset-0 bg-secondary dark:bg-primary translate-x-4 translate-y-4 border-2 border-black dark:border-primary shadow-neo-sm"></div>
          <div
            class="absolute inset-0 bg-primary dark:bg-secondary -translate-x-4 -translate-y-4 border-2 border-black dark:border-primary shadow-neo-sm"></div>

          <!-- Abstract Square anchored to portrait -->
          <div
            class="absolute -bottom-10 -right-8 w-24 h-24 bg-transparent border-4 border-black dark:border-primary rotate-12 hidden lg:block shadow-neo -z-10"></div>

          <div
            class="absolute inset-0 bg-white dark:bg-surface-dark border-2 border-black dark:border-primary overflow-hidden flex items-center justify-center shadow-neo z-10">
            <img
              alt="Oka Sutarto Putra Portrait"
              class="w-full h-full object-cover grayscale contrast-125 hover:grayscale-0 transition-all duration-500"
              src="https://rbopflmphatliijk.public.blob.vercel-storage.com/assets/profile-cartoon.png" />
          </div>
          <div
            class="absolute -top-6 -right-6 bg-white dark:bg-surface-dark border-2 border-black dark:border-primary p-4 shadow-neo-sm rotate-3 animate-pulse z-20">
            <i class="fas fa-laptop-code text-2xl text-primary font-bold"></i>
          </div>
          <div
            class="absolute -bottom-10 -left-6 bg-black text-white dark:text-black dark:bg-primary px-6 py-3 border-2 border-primary dark:border-primary shadow-neo transform -rotate-3 font-display font-bold text-lg z-20">
            3+ YEARS EXP.
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
const socials = [
  { icon: "fa-github", link: "https://github.com/okasutarto" },
  { icon: "fa-linkedin-in", link: "https://linkedin.com/in/okasutarto" },
  { icon: "fa-instagram", link: "https://instagram.com/okasp.dev" },
  { icon: "fa-tiktok", link: "https://tiktok.com/@okasp.dev" },
];
</script>
