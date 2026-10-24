<template>
  <section
    id="about"
    ref="sectionRef"
    class="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8 overflow-hidden relative transition-colors duration-300 bg-grid-pattern">
    <!-- Abstract Shapes -->
    <div
      class="absolute top-20 left-10 w-16 h-16 bg-accent-blue border-4 border-black dark:border-primary rounded-full opacity-50 hidden lg:block animate-bounce shadow-neo"></div>
    <div
      class="absolute bottom-20 right-10 w-24 h-24 bg-secondary border-4 border-black dark:border-primary transform rotate-12 opacity-50 hidden lg:block shadow-neo"></div>

    <div class="max-w-7xl w-full z-10">
      <!-- Header -->
      <div class="mb-12 text-center lg:text-left">
        <h2
          class="font-display text-4xl md:text-6xl font-bold uppercase tracking-tight leading-none text-black dark:text-white">
          About
          <span
            class="bg-black text-white px-3 py-1 dark:bg-white dark:text-black inline-block transform rotate-1"
            >Me</span
          >
        </h2>
      </div>

      <!-- Bento Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-12 gap-5 lg:gap-6">
        <!-- Identity Card -->
        <div
          class="bento-tile col-span-2 lg:col-span-7 lg:row-span-2 bg-white dark:bg-surface-dark border-4 border-black dark:border-primary p-6 md:p-8 shadow-neo relative flex flex-col justify-between">
          <div>
            <h3
              class="font-display text-2xl md:text-3xl font-bold mb-5 text-secondary dark:text-primary uppercase">
              Who is this guy?
            </h3>
            <p
              class="text-lg md:text-2xl leading-snug font-bold mb-5 dark:text-white">
              I'm
              <span
                class="bg-primary dark:bg-secondary text-black px-2 border-2 border-black transform inline-block -rotate-1"
                >Oka Sutarto Putra</span
              >. A former industrial engineer who realized code is much more
              fun than conveyor belts.
            </p>
            <p
              class="text-base md:text-lg font-medium text-gray-700 dark:text-gray-200">
              I build responsive UIs with Vue.js, React, & Angular, and
              architect robust APIs with Node.js. My approach? Analytical
              thinking meets chaotic creativity.
            </p>
          </div>

          <!-- Journey -->
          <div class="mt-8 flex flex-wrap items-center gap-2 text-xs font-bold uppercase">
            <span
              class="px-2 py-1 border-2 border-black dark:border-primary bg-gray-100 dark:bg-zinc-800 line-through decoration-2 decoration-accent-pink"
              >Industrial Engineer</span
            >
            <i class="fas fa-arrow-right text-black dark:text-primary"></i>
            <span
              class="px-2 py-1 border-2 border-black dark:border-primary bg-secondary text-black"
              >Full Stack Dev</span
            >
            <i class="fas fa-plus text-black dark:text-primary"></i>
            <span
              class="px-2 py-1 border-2 border-black dark:border-primary bg-neo-magenta text-white"
              >Mobile Engineer</span
            >
          </div>
          <div
            class="absolute top-0 right-0 w-4 h-4 bg-black dark:bg-white"></div>
        </div>

        <!-- Stats -->
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="bento-tile p-5 md:p-6 border-2 border-black dark:border-primary shadow-neo-sm hover:-translate-y-1 hover:shadow-neo transition-all flex flex-col justify-between min-h-[150px]"
          :class="[stat.class, stat.span]">
          <div
            class="font-bold w-fit border-2 border-black px-2 py-0.5 uppercase tracking-widest text-[10px] md:text-xs bg-white text-black">
            {{ stat.label }}
          </div>
          <div
            class="text-5xl md:text-6xl font-display font-bold leading-none"
            :class="stat.textClass">
            <span
              :ref="
                (el) => {
                  if (el) counterEls[stat.label] = el;
                }
              "
              >{{ stat.value }}</span
            >{{ stat.suffix }}
          </div>
        </div>

        <!-- Tech Marquee -->
        <div
          class="bento-tile col-span-2 lg:col-span-12 border-2 border-black dark:border-primary bg-white dark:bg-surface-dark shadow-neo-sm relative overflow-hidden py-6">
          <div
            class="absolute top-0 left-4 -translate-y-px bg-neo-magenta dark:bg-primary text-white dark:text-black font-display font-bold text-xs px-3 py-1 border-2 border-t-0 border-black dark:border-primary z-10">
            TECH ARSENAL
          </div>
          <div
            v-for="(row, rowIndex) in arsenalRows"
            :key="rowIndex"
            class="marquee-container mt-6 first:mt-8 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div
              class="marquee-content hover:[animation-play-state:paused]"
              :class="{ 'marquee-reverse': rowIndex === 1 }"
              :style="{ animationDuration: rowIndex === 1 ? '34s' : '28s' }">
              <span
                v-for="(tech, techIndex) in [...row, ...row]"
                :key="techIndex"
                class="inline-flex items-center gap-3 mx-2 px-4 py-2 border-2 border-black dark:border-primary bg-gray-50 dark:bg-zinc-800 shadow-neo-sm font-bold text-sm uppercase hover:bg-primary hover:text-black dark:hover:bg-primary transition-colors">
                <i :class="[tech.icon, tech.color, 'text-2xl']"></i>
                {{ tech.name }}
              </span>
            </div>
          </div>
        </div>

        <!-- Currently -->
        <div
          class="bento-tile col-span-2 lg:col-span-7 border-2 border-black dark:border-primary bg-black text-white dark:bg-zinc-900 shadow-neo-sm p-6 flex items-center gap-4">
          <span class="relative flex h-4 w-4 flex-shrink-0">
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-lime opacity-75"></span>
            <span
              class="relative inline-flex rounded-full h-4 w-4 bg-neo-lime border-2 border-white"></span>
          </span>
          <p class="font-bold text-base md:text-lg">
            <span class="text-neo-lime uppercase text-xs tracking-widest block mb-1"
              >Currently</span
            >
            Building cross-platform mobile apps with Flutter at Dusitek.
          </p>
        </div>

        <!-- Download CTA -->
        <a
          class="bento-tile col-span-2 lg:col-span-5 group relative block"
          href="https://rbopflmphatliijk.public.blob.vercel-storage.com/OkaSutartoCV.pdf"
          target="_blank"
          rel="noopener noreferrer"
          @click="trackResumeDownload">
          <span
            class="absolute inset-0 w-full h-full transition duration-200 ease-out transform translate-x-2 translate-y-2 bg-black dark:bg-secondary group-hover:translate-x-0 group-hover:translate-y-0"></span>
          <span
            class="absolute inset-0 w-full h-full bg-primary border-2 border-black dark:border-primary transform group-hover:-translate-x-1 group-hover:-translate-y-1 transition-all"></span>
          <span
            class="relative flex h-full min-h-[88px] items-center justify-between px-6 py-4 font-display font-bold text-black uppercase text-lg">
            Download Resume
            <span
              class="w-10 h-10 bg-white border-2 border-black flex items-center justify-center group-hover:rotate-12 transition-transform">
              <i class="fas fa-download"></i>
            </span>
          </span>
        </a>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePostHog } from "@/composables/usePostHog";

gsap.registerPlugin(ScrollTrigger);

const { posthog } = usePostHog();

const trackResumeDownload = () => {
  posthog.capture("resume_downloaded");
};

const sectionRef = ref(null);
const counterEls = {};
let ctx = null;

const stats = [
  {
    label: "Years Exp",
    value: 3,
    suffix: "+",
    class: "bg-primary",
    textClass: "text-black",
    span: "col-span-1 lg:col-span-5",
  },
  {
    label: "Projects",
    value: 8,
    suffix: "+",
    class: "bg-accent-blue",
    textClass: "text-white",
    span: "col-span-1 lg:col-span-2",
  },
  {
    label: "Satisfaction",
    value: 99,
    suffix: "%",
    class: "bg-secondary",
    textClass: "text-black",
    span: "col-span-2 lg:col-span-3",
  },
];

const arsenal = [
  { name: "Vue.js", icon: "fab fa-vuejs", color: "text-green-600" },
  { name: "React", icon: "fab fa-react", color: "text-blue-500" },
  { name: "Angular", icon: "fab fa-angular", color: "text-red-600" },
  { name: "Node.js", icon: "fab fa-node", color: "text-green-700" },
  { name: "PostgreSQL", icon: "fas fa-database", color: "text-yellow-600" },
  { name: "Docker", icon: "fab fa-docker", color: "text-blue-600" },
  { name: "Git", icon: "fab fa-git-alt", color: "text-orange-600" },
  { name: "TypeScript", icon: "fas fa-code", color: "text-blue-700" },
  { name: "Flutter", icon: "fas fa-mobile-alt", color: "text-sky-500" },
  { name: "Dart", icon: "fas fa-bullseye", color: "text-cyan-600" },
];
// Second row runs the other way, in reverse order
const arsenalRows = [arsenal, [...arsenal].reverse()];

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  ctx = gsap.context(() => {
    gsap.from(".bento-tile", {
      y: 60,
      opacity: 0,
      rotate: () => gsap.utils.random(-3, 3),
      duration: 0.7,
      stagger: 0.08,
      ease: "back.out(1.4)",
      clearProps: "transform,opacity",
      scrollTrigger: { trigger: sectionRef.value, start: "top 70%" },
    });

    // Count the stats up from zero
    stats.forEach((stat) => {
      const el = counterEls[stat.label];
      const counter = { value: 0 };
      gsap.to(counter, {
        value: stat.value,
        duration: 1.6,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = Math.round(counter.value);
        },
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
    });
  }, sectionRef.value);
});

onUnmounted(() => {
  if (ctx) ctx.revert();
});
</script>

<style scoped>
.marquee-reverse {
  animation-direction: reverse;
}
</style>
