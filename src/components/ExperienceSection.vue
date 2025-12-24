<template>
  <section id="experience" class="py-16 md:py-20 overflow-hidden">
    <div class="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <h2 
        ref="sectionTitle"
        class="text-3xl md:text-4xl font-bold mb-12 text-center dark:text-white opacity-0"
      >
        Work Experience
      </h2>

      <!-- Timeline Container -->
      <div class="relative">
        <!-- Vertical Line -->
        <div 
          ref="timelineLine"
          class="absolute left-4 md:left-1/2 md:-translate-x-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-primary opacity-0"
        ></div>

        <!-- Experience Items -->
        <div class="space-y-8 md:space-y-12">
          <div 
            v-for="(experience, index) in experiences" 
            :key="experience.id"
            :ref="el => { if(el) experienceCards[index] = el }"
            class="relative flex items-start opacity-0"
            :class="index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'"
          >
            <!-- Timeline Dot -->
            <div 
              class="absolute left-4 md:left-1/2 md:-translate-x-1/2 w-4 h-4 rounded-full bg-primary border-4 border-white dark:border-gray-900 shadow-lg z-10"
              :ref="el => { if(el) timelineDots[index] = el }"
            ></div>

            <!-- Content Card -->
            <div 
              class="ml-12 md:ml-0 md:w-[calc(50%-2rem)] p-5 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700"
              :class="index % 2 === 0 ? 'md:mr-auto md:pr-8' : 'md:ml-auto md:pl-8'"
            >
              <!-- Date Badge -->
              <div class="flex items-center gap-3 mb-3">
                <span class="px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light">
                  {{ experience.period }}
                </span>
                <span v-if="experience.current" class="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Current
                </span>
              </div>

              <!-- Company & Role -->
              <div class="flex items-center gap-4 mb-3">
                <div 
                  class="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden shadow-md border-none"
                  :style="{ background: experience.color }"
                >
                  <img 
                    v-if="experience.logo" 
                    :src="experience.logo" 
                    :alt="experience.company + ' logo'"
                    class="w-full h-full object-cover"
                  >
                  <div 
                    v-else 
                    class="w-full h-full flex items-center justify-center text-white text-lg font-bold"
                  >
                    {{ experience.companyInitial }}
                  </div>
                </div>
                <div>
                  <h3 class="text-md font-bold text-gray-900 dark:text-white">
                    {{ experience.role }}
                  </h3>
                  <a 
                    v-if="experience.companyUrl" 
                    :href="experience.companyUrl" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="text-sm text-primary dark:text-primary-light font-medium hover:underline inline-flex items-center gap-1"
                  >
                    {{ experience.company }}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <p v-else class="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {{ experience.company }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {{ experience.location }}
                  </p>
                </div>
              </div>

              <!-- Description -->
              <p class="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                {{ experience.description }}
              </p>

              <!-- Achievements -->
              <ul v-if="experience.achievements.length" class="space-y-2 mb-4">
                <li 
                  v-for="(achievement, achieveIndex) in experience.achievements" 
                  :key="achieveIndex"
                  class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  <span>{{ achievement }}</span>
                </li>
              </ul>

              <!-- Tech Stack -->
              <div class="flex flex-wrap gap-2">
                <span 
                  v-for="(tech, techIndex) in experience.technologies" 
                  :key="techIndex"
                  class="px-2 py-1 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
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
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Import company logos
import jubliaLogo from '@/assets/jublia.jpg';
import nullrebornLogo from '@/assets/nullreborn.jpg';
import geekseatLogo from '@/assets/geekseat.png';

gsap.registerPlugin(ScrollTrigger);

export default {
  name: 'ExperienceSection',
  setup() {
    const sectionTitle = ref(null);
    const timelineLine = ref(null);
    const experienceCards = reactive([]);
    const timelineDots = reactive([]);
    const animations = [];

    // Experience data - Your actual experience
    const experiences = reactive([
      {
        id: 1,
        role: 'Frontend Engineer',
        company: 'Jublia',
        companyInitial: 'J',
        logo: jubliaLogo,
        companyUrl: 'https://www.jublia.com/',
        location: 'Singapore (Remote)',
        period: 'Jul 2023 - Dec 2025',
        current: false,
        type: 'Full-time',
        color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        description: 'Lead frontend development for a global B2B SaaS event networking platform, ensuring high performance for major international conferences.',
        achievements: [
          'Improved user engagement by 40% through enhanced UI/UX performance',
          'Maintained 95%+ code coverage with scalable frontend architecture',
          'Expanded to Angular projects beyond core Vue.js responsibilities',
          'Mentored junior developers on coding best practices'
        ],
        technologies: ['Vue.js', 'Angular', 'TypeScript', 'Vuex', 'Bootstrap 5', 'Unlayer']
      },
      {
        id: 2,
        role: 'Backend Developer',
        company: 'Null Reborn',
        companyInitial: 'NR',
        logo: nullrebornLogo,
        companyUrl: 'https://www.linkedin.com/company/null-reborn',
        location: 'Indonesia (Remote)',
        period: 'Mar 2023 - Jul 2023',
        current: false,
        type: 'Part-time',
        color: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        description: 'Architected and implemented secure RESTful APIs for applications, achieving 99.9% uptime and robust security compliance.',
        achievements: [
          'Reduced database query response times by 60% through optimization',
          'Built authentication systems with role-based access control (RBAC)',
          'Achieved 99.9% API uptime through efficient architecture',
          'Collaborated with frontend teams for seamless API integration'
        ],
        technologies: ['Node.js', 'Express', 'PostgreSQL', 'MySQL', 'Sequelize', 'JWT']
      },
      {
        id: 3,
        role: 'Junior Frontend Developer',
        company: 'PT Geekseat Indonesia',
        companyInitial: 'GS',
        logo: geekseatLogo,
        companyUrl: 'https://geekseat.com.au/',
        location: 'Bandung, Indonesia',
        period: 'Sep 2022 - Jun 2023',
        current: false,
        type: 'Full-time',
        color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        description: 'Developed responsive web applications and built user interfaces with modern frontend frameworks in an Agile environment.',
        achievements: [
          'Built responsive UIs with React and Vue.js',
          'Integrated APIs and real-time data features',
          'Collaborated closely with UI/UX design teams',
          'Practiced Scrum and Agile development methodologies'
        ],
        technologies: ['React', 'Vue.js', 'Tailwind CSS', 'Kendo UI', 'HTML', 'CSS']
      }
    ]);

    onMounted(() => {
      // Title animation
      animations.push(
        gsap.fromTo(sectionTitle.value,
          { opacity: 0, y: -30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sectionTitle.value,
              start: 'top 80%',
              toggleActions: 'play none none reverse'
            }
          }
        )
      );

      // Timeline line animation
      animations.push(
        gsap.fromTo(timelineLine.value,
          { opacity: 0, scaleY: 0 },
          {
            opacity: 1,
            scaleY: 1,
            duration: 1,
            ease: 'power2.out',
            transformOrigin: 'top',
            scrollTrigger: {
              trigger: timelineLine.value,
              start: 'top 80%',
              toggleActions: 'play none none reverse'
            }
          }
        )
      );

      // Experience cards staggered animation
      experienceCards.forEach((card, index) => {
        const isEven = index % 2 === 0;
        animations.push(
          gsap.fromTo(card,
            { 
              opacity: 0, 
              x: isEven ? -50 : 50,
              y: 20
            },
            {
              opacity: 1,
              x: 0,
              y: 0,
              duration: 0.8,
              delay: 0.2 * index,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
              }
            }
          )
        );
      });

      // Timeline dots animation
      timelineDots.forEach((dot, index) => {
        animations.push(
          gsap.fromTo(dot,
            { scale: 0, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              duration: 0.4,
              delay: 0.2 * index + 0.3,
              ease: 'back.out(1.7)',
              scrollTrigger: {
                trigger: dot,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
              }
            }
          )
        );
      });
    });

    onUnmounted(() => {
      animations.forEach(animation => {
        if (animation.scrollTrigger) {
          animation.scrollTrigger.kill();
        }
        animation.kill();
      });
    });

    return {
      sectionTitle,
      timelineLine,
      experienceCards,
      timelineDots,
      experiences
    };
  }
};
</script>

<style scoped>
/* Pulse animation for current job dot */
.bg-primary {
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
  }
}
</style>
