<template>
  <section id="experience" class="py-16 md:py-24 overflow-hidden">
    <div class="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <h2 
        ref="sectionTitle"
        class="text-3xl md:text-4xl font-bold mb-16 text-center dark:text-white opacity-0"
      >
        Work Experience
      </h2>

      <!-- Timeline Container -->
      <div class="relative">
        <!-- Vertical Timeline Line - Standout Design -->
        <div 
          ref="timelineLine"
          class="timeline-line absolute left-6 md:left-1/2 md:-translate-x-1/2 top-0 bottom-0 w-1 rounded-full opacity-0"
        >
          <!-- Glowing effect behind the line -->
          <!-- Solid line color -->
          <div class="absolute inset-0 w-1 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>

        <!-- Experience Items -->
        <div class="space-y-0">
          <div 
            v-for="(experience, index) in experiences" 
            :key="experience.id"
            :ref="el => { if(el) experienceCards[index] = el }"
            class="relative flex items-stretch opacity-0"
            :class="index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'"
          >
            <!-- Timeline Node - Enhanced Design -->
            <div class="absolute left-6 md:left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
              <!-- Outer ring with glow -->
              <div 
                class="timeline-node relative"
                :ref="el => { if(el) timelineDots[index] = el }"
              >
                <!-- Animated pulse ring -->
                <div 
                  class="absolute inset-0 rounded-full bg-white/10 dark:bg-primary/40"
                  :class="{ 'animate-ping-slow': experience.current }"
                ></div>
                <!-- Outer decorative ring -->
                <div class="w-12 h-12 rounded-full border-4 border-primary/30 dark:border-primary/30 bg-white dark:bg-gray-900 flex items-center justify-center shadow-lg shadow-primary/20">
                  <!-- Inner colored dot -->
                  <div 
                    class="w-6 h-6 rounded-full shadow-inner flex items-center justify-center"
                    :style="{ background: experience.color }"
                  >
                    <!-- Icon or number -->
                    <span class="text-white text-xs font-bold">{{ experiences.length - index }}</span>
                  </div>
                </div>
                <!-- Year badge attached to node - hidden on mobile, shown on desktop -->
                <div 
                  class="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap hidden md:block"
                >
                  <span class="px-3 py-1 text-xs font-bold rounded-full bg-primary text-white shadow-lg">
                    {{ experience.period}}
                  </span>
                </div>
              </div>
            </div>

            <!-- Content Card - Enhanced -->
            <div 
              class="ml-20 md:ml-0 md:w-[calc(50%-4rem)] mt-2 mb-16 group"
              :class="index % 2 === 0 ? 'md:mr-auto md:pr-6' : 'md:ml-auto md:pl-6'"
            >
              <!-- Year badge - shown on mobile at top of card -->
              <div class="md:hidden mb-3">
                <span class="px-3 py-1 text-xs font-bold rounded-full bg-primary text-white shadow-lg">
                  {{ experience.period }}
                </span>
              </div>
              
              <div class="relative p-6 bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
                <!-- Decorative gradient border on hover -->
                <!-- Decorative border on hover - Solid color -->
                <div class="absolute inset-0 rounded-2xl border-2 border-primary/0 group-hover:border-primary/10 transition-colors duration-500 pointer-events-none"></div>

                <div class="relative">
                  <!-- Company & Role Header -->
                  <div class="flex items-center gap-4 mb-4">
                    <!-- Company Logo with hover effect -->
                    <div 
                      class="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden shadow-lg ring-2 ring-white dark:ring-gray-700 group-hover:ring-primary/50 transition-all duration-300 transform group-hover:scale-105"
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
                    <div class="flex-1 min-w-0">
                      <h3 class="text-md font-bold text-gray-900 dark:text-white group-hover:text-primary dark:group-hover:text-primary-light transition-colors">
                        {{ experience.role }}
                      </h3>
                      <a 
                        v-if="experience.companyUrl" 
                        :href="experience.companyUrl" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="text-sm text-primary dark:text-primary-light font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        {{ experience.company }}
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                      <p v-else class="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                        {{ experience.company }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1.5 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

                  <!-- Achievements with better styling -->
                  <div v-if="experience.achievements.length" class="mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                    <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Key Achievements</h4>
                    <ul class="space-y-2">
                      <li 
                        v-for="(achievement, achieveIndex) in experience.achievements" 
                        :key="achieveIndex"
                        class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                        <span>{{ achievement }}</span>
                      </li>
                    </ul>
                  </div>

                  <!-- Tech Stack - Enhanced pills -->
                  <div class="flex flex-wrap gap-2">
                    <span 
                      v-for="(tech, techIndex) in experience.technologies" 
                      :key="techIndex"
                      class="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors cursor-default"
                    >
                      {{ tech }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Timeline End Cap -->
        <div 
          ref="timelineEnd"
          class="absolute left-6 md:left-1/2 -translate-x-1/2 -bottom-4 w-4 h-4 rounded-full bg-primary shadow-lg opacity-0"
        ></div>
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
    const timelineEnd = ref(null);
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

      // Timeline line animation - grows progressively as you scroll through experiences
      // Set initial state
      gsap.set(timelineLine.value, { opacity: 1, scaleY: 0, transformOrigin: 'top' });
      
      animations.push(
        gsap.to(timelineLine.value, {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '#experience',
            start: 'top 60%',
            end: 'bottom 70%',
            scrub: 0.5, // Smooth scrubbing tied to scroll position
          }
        })
      );

      // Timeline end cap animation - appears when line reaches the end
      if (timelineEnd.value) {
        animations.push(
          gsap.fromTo(timelineEnd.value,
            { opacity: 0, scale: 0 },
            {
              opacity: 1,
              scale: 1,
              duration: 0.5,
              ease: 'back.out(1.7)',
              scrollTrigger: {
                trigger: timelineEnd.value,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
              }
            }
          )
        );
      }

      // Experience cards staggered animation
      experienceCards.forEach((card, index) => {
        const isEven = index % 2 === 0;
        animations.push(
          gsap.fromTo(card,
            { 
              opacity: 0, 
              x: isEven ? -60 : 60,
              y: 30
            },
            {
              opacity: 1,
              x: 0,
              y: 0,
              duration: 0.9,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
              }
            }
          )
        );
      });

      // Timeline dots animation with bounce effect - appears just before their card
      timelineDots.forEach((dot, index) => {
        animations.push(
          gsap.fromTo(dot,
            { scale: 0, opacity: 0, rotation: -180 },
            {
              scale: 1,
              opacity: 1,
              rotation: 0,
              duration: 0.6,
              ease: 'back.out(2)',
              scrollTrigger: {
                trigger: experienceCards[index] || dot,
                start: 'top 90%',
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
      timelineEnd,
      experienceCards,
      timelineDots,
      experiences
    };
  }
};
</script>

<style scoped>
/* Timeline line glow effect */
.timeline-line {
  filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.3));
}

/* Connector line glow effect */
.connector-line {
  filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.3));
}

/* Slow ping animation for current role */
@keyframes ping-slow {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.5);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

.animate-ping-slow {
  animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

/* Timeline node hover effect */
.timeline-node {
  transition: transform 0.3s ease;
}

.timeline-node:hover {
  transform: scale(1.1);
}

/* Card hover lift effect */
.group:hover .relative {
  transform: translateY(-4px);
  transition: transform 0.3s ease;
}

/* Accent colors for dark mode */
:deep(.dark) .timeline-line {
  filter: drop-shadow(0 0 12px rgba(96, 165, 250, 0.4));
}
</style>
