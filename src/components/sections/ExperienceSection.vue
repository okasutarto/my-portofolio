<template>
  <section
    id="experience"
    class="py-16 md:py-20 overflow-hidden bg-light dark:bg-dark-dark transition-colors duration-400">
    <div class="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div class="mb-12 md:mb-16 text-center">
        <h2
          ref="sectionTitle"
          class="text-3xl md:text-5xl font-bold mb-4 text-dark-dark dark:text-light opacity-0">
          My Journey
        </h2>
        <div
          class="h-1 w-20 bg-primary rounded-full opacity-0 mx-auto"
          ref="titleUnderline"></div>
      </div>

      <!-- F-Pattern Layout Container -->
      <div class="relative">
        <!-- Vertical Timeline Line - Left Aligned to 20px center (19px left) -->
        <div
          ref="timelineLine"
          class="absolute left-[19px] top-2 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800 origin-top opacity-0"></div>

        <!-- End Dot - Centered at 20px (14px left), 12px wide -->
        <div
          ref="timelineEndDot"
          class="absolute left-[14px] -bottom-[6px] w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-800 border-2 border-white dark:border-dark-dark opacity-0"></div>

        <!-- Experience Items Stack -->
        <div class="space-y-12">
          <div
            v-for="(experience, index) in experiences"
            :key="experience.id"
            :ref="
              (el) => {
                if (el) experienceCards[index] = el;
              }
            "
            class="relative flex gap-8 opacity-0 group">
            <!-- Timeline Dot - Centered at 20px (12px left), 16px wide -->
            <div
              class="absolute left-[12px] mt-1.5 z-20"
              :ref="
                (el) => {
                  if (el) timelineDots[index] = el;
                }
              ">
              <div class="relative flex items-center justify-center">
                <div
                  class="w-4 h-4 rounded-full bg-white dark:bg-dark-dark border-[3px] border-primary transition-all duration-300 group-hover:scale-125 group-hover:border-primary"></div>
              </div>
            </div>

            <!-- Content -->
            <div class="pl-12 w-full">
              <!-- Header -->
              <div class="mb-4">
                <span
                  class="inline-block text-primary text-sm font-bold tracking-wider uppercase mb-1">
                  {{ experience.period }}
                </span>
                <div
                  class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3
                      class="text-xl md:text-2xl font-bold text-dark-dark dark:text-light">
                      {{ experience.role }}
                    </h3>
                    <div
                      class="flex items-center gap-2 text-lg text-gray-600 dark:text-gray-400 font-medium mt-1">
                      <span>{{ experience.company }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Location & Description -->
              <div class="mb-4">
                <p
                  class="text-sm text-gray-500 dark:text-gray-500 mb-3 flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor">
                    <path
                      fill-rule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clip-rule="evenodd" />
                  </svg>
                  {{ experience.location }}
                </p>
                <p
                  class="text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
                  {{ experience.description }}
                </p>
              </div>

              <!-- Achievements -->
              <ul v-if="experience.achievements.length" class="space-y-2 mb-5">
                <li
                  v-for="(achievement, achieveIndex) in experience.achievements"
                  :key="achieveIndex"
                  class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <span
                    class="mt-2 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></span>
                  <span class="leading-relaxed">{{ achievement }}</span>
                </li>
              </ul>

              <!-- Technologies -->
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="(tech, techIndex) in experience.technologies"
                  :key="techIndex"
                  class="px-3 py-1 text-xs font-medium rounded-md bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors">
                  {{ tech }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted } from "vue";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { experiences as experiencesData } from "@/data/experience";

gsap.registerPlugin(ScrollTrigger);

export default {
  name: "ExperienceSection",
  setup() {
    const sectionTitle = ref(null);
    const titleUnderline = ref(null);
    const timelineLine = ref(null);
    const timelineEndDot = ref(null);
    const experienceCards = reactive([]);
    const timelineDots = reactive([]);
    const animations = [];

    // Experience data
    const experiences = experiencesData;

    onMounted(() => {
      // Clean previous animations
      animations.forEach((anim) => anim.kill());

      // Title & Underline
      animations.push(
        gsap.to([sectionTitle.value, titleUnderline.value], {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionTitle.value,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        })
      );

      // Hairline drawing animation
      gsap.set(timelineLine.value, { scaleY: 0, opacity: 1 });
      animations.push(
        gsap.to(timelineLine.value, {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: "#experience",
            start: "top 60%",
            end: "bottom 80%",
            scrub: 1,
          },
        })
      );

      // End dot animation
      animations.push(
        gsap.fromTo(
          timelineEndDot.value,
          { scale: 0, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            scrollTrigger: {
              trigger: "#experience",
              start: "bottom 85%", // Appear near the end
              end: "bottom 80%",
              scrub: 1,
            },
          }
        )
      );

      // Staggered Items Animation
      experienceCards.forEach((card, index) => {
        const dot = timelineDots[index];

        // Card fade up
        animations.push(
          gsap.fromTo(
            card,
            { opacity: 0, y: 50 },
            {
              opacity: 1,
              y: 0,
              duration: 1,
              ease: "power3.out",
              scrollTrigger: {
                trigger: card,
                start: "top 85%",
                end: "top 65%",
                scrub: 1,
              },
            }
          )
        );

        // Dot scale in
        animations.push(
          gsap.fromTo(
            dot,
            { scale: 0, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              duration: 0.5,
              delay: 0.2, // Slight delay after card starts
              ease: "back.out(2)",
              scrollTrigger: {
                trigger: card,
                start: "top 85%",
                end: "top 70%",
                scrub: 1,
              },
            }
          )
        );
      });
    });

    onUnmounted(() => {
      animations.forEach((animation) => {
        if (animation.scrollTrigger) animation.scrollTrigger.kill();
        animation.kill();
      });
    });

    return {
      sectionTitle,
      titleUnderline,
      timelineLine,
      timelineEndDot,
      experienceCards,
      timelineDots,
      experiences,
    };
  },
};
</script>

<style scoped>
/* Ensure clean typography rendering */
h2,
h3,
p,
span {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
