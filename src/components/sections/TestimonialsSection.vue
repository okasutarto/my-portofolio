<template>
  <section
    id="testimonials"
    class="py-24 px-4 md:px-12 bg-background-light dark:bg-background-dark transition-colors duration-300 relative overflow-hidden bg-grid-pattern">
    <!-- Decorative Background Elements -->
    <div
      class="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[size:40px_40px] bg-[linear-gradient(#000_1px,transparent_1px),linear-gradient(90deg,#000_1px,transparent_1px)] dark:bg-[linear-gradient(#fff_0.5px,transparent_0.5px),linear-gradient(90deg,#fff_0.5px,transparent_0.5px)]"></div>
    <div
      class="absolute top-40 left-10 w-16 h-16 border-4 border-black dark:border-primary rounded-full bg-transparent opacity-20 pointer-events-none hidden lg:block animate-pulse"></div>
    <div
      class="absolute bottom-40 right-20 w-24 h-24 bg-primary border-4 border-black opacity-20 pointer-events-none hidden lg:block transform rotate-12"></div>

    <div class="max-w-6xl mx-auto relative z-10">
      <!-- Section Header -->
      <div class="text-center mb-16 relative">
        <h2
          ref="sectionTitle"
          class="text-4xl md:text-6xl font-display font-bold uppercase tracking-tighter text-black dark:text-white transform rotate-[-1deg] opacity-0 drop-shadow-[3px_3px_0px_#ffdd00] dark:drop-shadow-[5px_5px_0px_#39ff14]">
          What People Say
        </h2>
        <div
          class="absolute -z-10 bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-3 bg-secondary dark:bg-secondary hidden md:block"
          style="left: calc(50% + 8px); bottom: -6px"></div>
      </div>

      <!-- Carousel Container -->
      <div class="flex items-center justify-center gap-4 md:gap-8">
        <!-- Desktop Navigation: Prev -->
        <button
          @click="prevTestimonial"
          aria-label="Previous testimonial"
          class="hidden md:flex items-center justify-center w-14 h-14 bg-white dark:bg-primary border-2 border-black dark:border-primary shadow-neo-sm dark:shadow-neo hover:translate-x-1 hover:translate-y-1 hover:shadow-neo transition-all active:translate-x-1 active:translate-y-1 active:shadow-none shrink-0 group">
          <span
            class="material-icons text-3xl font-bold text-black group-hover:scale-110 transition-transform"
            >chevron_left</span
          >
        </button>

        <!-- Main Card Area -->
        <div class="relative w-full max-w-3xl">
          <!-- Bouncing Quote Badge -->
          <div
            class="absolute -top-8 -left-5 md:-left-8 z-20 w-16 h-16 bg-primary border-2 border-black flex items-center justify-center shadow-neo-sm transform -rotate-12 group">
            <span
              class="material-icons text-black text-4xl font-bold group-hover:scale-110 transition-transform"
              >format_quote</span
            >
          </div>

          <div
            ref="cardContent"
            class="bg-white dark:bg-surface-dark p-6 md:p-12 border-2 border-black dark:border-primary shadow-neo-sm dark:shadow-neo relative z-10 min-h-[380px] flex flex-col justify-center">
            <!-- Quote Text -->
            <p
              class="text-lg md:text-xl font-body font-bold leading-relaxed mb-8 border-l-4 border-black dark:border-primary pl-6 dark:text-white">
              "{{ testimonials[currentIndex].text }}"
            </p>

            <div
              class="w-full h-0.5 bg-black dark:bg-zinc-800 mb-8 border-dashed border-t-2"></div>

            <!-- Author Info -->
            <div
              class="flex flex-col md:flex-row items-center md:items-start gap-6">
              <!-- Avatar -->
              <div
                class="w-20 h-20 shrink-0 bg-primary border-2 border-black shadow-neo-sm overflow-hidden relative rotate-3">
                <div
                  class="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                  :style="{
                    background: testimonials[currentIndex].avatarColor,
                  }">
                  {{ testimonials[currentIndex].initials }}
                </div>
              </div>

              <!-- Details -->
              <div
                class="flex flex-col items-center md:items-start space-y-2 w-full">
                <div
                  class="bg-primary px-4 py-1.5 border-2 border-black shadow-neo-sm transform -rotate-1 inline-block">
                  <h3
                    class="text-black font-display font-bold text-lg uppercase tracking-wide">
                    {{ testimonials[currentIndex].name }}
                  </h3>
                </div>
                <p class="font-bold text-gray-800 dark:text-gray-300 text-base">
                  {{ testimonials[currentIndex].role }} at
                  {{ testimonials[currentIndex].company }}
                </p>
                <a
                  v-if="testimonials[currentIndex].linkedIn"
                  :href="testimonials[currentIndex].linkedIn"
                  target="_blank"
                  class="inline-flex items-center gap-1.5 font-bold hover:underline decoration-2 decoration-primary text-black dark:text-secondary mt-1 group text-sm">
                  <span
                    class="material-icons text-primary dark:text-secondary text-xl group-hover:scale-110 transition-transform"
                    >link</span
                  >
                  <span class="group-hover:translate-x-0.5 transition-transform"
                    >View on LinkedIn</span
                  >
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop Navigation: Next -->
        <button
          @click="nextTestimonial"
          aria-label="Next testimonial"
          class="hidden md:flex items-center justify-center w-14 h-14 bg-white dark:bg-primary border-2 border-black dark:border-primary shadow-neo-sm dark:shadow-neo hover:translate-x-1 hover:translate-y-1 hover:shadow-neo transition-all active:translate-x-1 active:translate-y-1 active:shadow-none shrink-0 group">
          <span
            class="material-icons text-3xl font-bold text-black group-hover:scale-110 transition-transform"
            >chevron_right</span
          >
        </button>
      </div>

      <!-- Mobile Navigation -->
      <div
        class="flex md:hidden justify-between mt-10 w-full max-w-3xl mx-auto px-4">
        <button
          @click="prevTestimonial"
          class="flex items-center justify-center w-14 h-14 bg-white dark:bg-primary border-2 border-black shadow-neo-sm active:translate-y-0.5 active:shadow-none">
          <span class="material-icons text-3xl font-bold text-black"
            >chevron_left</span
          >
        </button>
        <div class="flex items-center gap-3">
          <button
            v-for="(_, index) in testimonials"
            :key="index"
            @click="goToTestimonial(index)"
            class="w-5 h-5 border-2 border-black transition-all transform -rotate-12 shadow-neo-sm"
            :class="
              currentIndex === index
                ? 'bg-primary scale-110'
                : 'bg-white dark:bg-surface-dark'
            "></button>
        </div>
        <button
          @click="nextTestimonial"
          class="flex items-center justify-center w-14 h-14 bg-white dark:bg-primary border-2 border-black shadow-neo-sm active:translate-y-0.5 active:shadow-none">
          <span class="material-icons text-3xl font-bold text-black"
            >chevron_right</span
          >
        </button>
      </div>

      <!-- Desktop Indicators -->
      <div class="hidden md:flex justify-center mt-12 gap-4">
        <button
          v-for="(_, index) in testimonials"
          :key="index"
          @click="goToTestimonial(index)"
          class="w-8 h-5 border-2 border-black dark:border-primary shadow-neo-sm hover:translate-y-0.5 hover:shadow-none transition-all transform -skew-x-12"
          :class="
            currentIndex === index
              ? 'bg-primary'
              : 'bg-white dark:bg-surface-dark'
          "></button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { testimonials as testimonialsData } from "@/data/testimonials";

gsap.registerPlugin(ScrollTrigger);

const sectionTitle = ref(null);
const cardContent = ref(null);
const testimonials = ref(testimonialsData);
const currentIndex = ref(0);
const animations = [];
let autoplayInterval = null;

const nextTestimonial = () => {
  // Add quick flicker/flash animation on change
  gsap.fromTo(
    cardContent.value,
    { opacity: 0, x: 20 },
    { opacity: 1, x: 0, duration: 0.4, ease: "back.out(1.7)" },
  );
  currentIndex.value = (currentIndex.value + 1) % testimonials.value.length;
  resetAutoplay();
};

const prevTestimonial = () => {
  gsap.fromTo(
    cardContent.value,
    { opacity: 0, x: -20 },
    { opacity: 1, x: 0, duration: 0.4, ease: "back.out(1.7)" },
  );
  currentIndex.value =
    (currentIndex.value - 1 + testimonials.value.length) %
    testimonials.value.length;
  resetAutoplay();
};

const goToTestimonial = (index) => {
  if (currentIndex.value === index) return;
  gsap.fromTo(
    cardContent.value,
    { opacity: 0, scale: 0.95 },
    { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)" },
  );
  currentIndex.value = index;
  resetAutoplay();
};

const startAutoplay = () => {
  autoplayInterval = setInterval(nextTestimonial, 10000);
};

const resetAutoplay = () => {
  if (autoplayInterval) {
    clearInterval(autoplayInterval);
    startAutoplay();
  }
};

onMounted(() => {
  // Title animation
  animations.push(
    gsap.to(sectionTitle.value, {
      opacity: 1,
      y: 0,
      rotate: -2,
      duration: 1,
      ease: "back.out(1.7)",
      scrollTrigger: {
        trigger: sectionTitle.value,
        start: "top 85%",
        toggleActions: "play none none reverse",
      },
    }),
  );

  startAutoplay();
});

onUnmounted(() => {
  animations.forEach((anim) => {
    if (anim.scrollTrigger) anim.scrollTrigger.kill();
    anim.kill();
  });
  if (autoplayInterval) clearInterval(autoplayInterval);
});
</script>

<style scoped>
.font-body {
  font-family: "Space Grotesk", sans-serif;
}

/* Material Icons size refinement */
.material-icons {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
