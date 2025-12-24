<template>
  <section id="projects" class="relative py-16 overflow-hidden">
    <div class="container mx-auto px-4 relative z-10">
      <h2 
        ref="sectionTitle"
        class="text-3xl md:text-4xl font-bold mb-4 text-center dark:text-white opacity-0"
      >My Projects</h2>
      <p 
        ref="sectionSubtitle"
        class="text-gray-600 dark:text-gray-400 text-center mb-10 max-w-2xl mx-auto opacity-0"
      >
        A selection of projects I've worked on, from AI-powered tools to full-stack applications
      </p>
      
      <!-- Filter Tabs -->
      <div ref="filterTabs" class="flex justify-center gap-2 mb-8 opacity-0">
        <button 
          v-for="filter in filters" 
          :key="filter"
          @click="activeFilter = filter"
          class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300"
          :class="activeFilter === filter 
            ? 'bg-primary text-white shadow-md' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'"
        >
          {{ filter }}
        </button>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="(project, index) in filteredProjects" 
          :key="project.id" 
          :ref="el => { if(el) projectCards[index] = el }"
          class="project-card group bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden 
                transition-all duration-500 ease-out transform hover:-translate-y-2 hover:shadow-2xl opacity-0">
          
          <!-- Image Container with Overlay -->
          <div class="project-image-container relative overflow-hidden">
            <img 
              :ref="el => { if(el) projectImages[index] = el }" 
              :src="project.image" 
              :alt="project.title" 
              class="w-full h-52 object-cover transition-transform duration-700 group-hover:scale-110"
            >
            <!-- Overlay on Hover -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
              <router-link 
                :to="`/projects/${project.id}`"
                class="px-4 py-2 bg-white text-gray-900 rounded-full text-sm font-medium hover:bg-primary hover:text-white transition-colors duration-300 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Case Study
              </router-link>
            </div>
            <!-- Project Type Badge -->
            <span class="absolute top-3 left-3 px-2 py-1 text-xs font-semibold rounded-full bg-primary/90 text-white">
              {{ project.type }}
            </span>
          </div>
          
          <div class="p-5">
            <!-- Title & Subtitle -->
            <h3 
              :ref="el => { if(el) projectTitles[index] = el }"
              class="text-xl font-bold mb-1 dark:text-white opacity-0 group-hover:text-primary transition-colors duration-300"
            >{{ project.title }}</h3>
            
            <p 
              :ref="el => { if(el) projectDescriptions[index] = el }"
              class="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2 opacity-0"
            >{{ project.description }}</p>
            
            <!-- Tech Stack -->
            <div class="flex flex-wrap gap-2 mb-4">
              <span 
                v-for="(tech, techIndex) in project.technologies.slice(0, 4)" 
                :key="techIndex"
                class="tech-badge bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs px-2 py-1 rounded-md">
                {{ tech }}
              </span>
              <span 
                v-if="project.technologies.length > 4"
                class="text-xs text-gray-500 dark:text-gray-400 py-1"
              >
                +{{ project.technologies.length - 4 }} more
              </span>
            </div>
            
            <!-- Action Links -->
            <div 
              :ref="el => { if(el) projectLinks[index] = el }"
              class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 opacity-0"
            >
              <div class="flex gap-2">
                <a 
                  v-if="project.demoLink && project.demoLink !== '#'"
                  :href="project.demoLink" 
                  target="_blank" 
                  class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Demo
                </a>
                <a 
                  v-if="project.codeLink && project.codeLink !== '#'"
                  :href="project.codeLink" 
                  target="_blank" 
                  class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Code
                </a>
              </div>
              <router-link 
                :to="`/projects/${project.id}`"
                class="text-sm font-medium text-primary hover:text-primary-dark flex items-center gap-1 transition-colors"
              >
                Details
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { projects as projectsData } from '@/data/projects';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

export default {
  name: 'ProjectsSection',
  setup() {
    // Element refs for animations
    const sectionTitle = ref(null);
    const sectionSubtitle = ref(null);
    const filterTabs = ref(null);
    const projectCards = reactive([]);
    const projectImages = reactive([]);
    const projectTitles = reactive([]);
    const projectDescriptions = reactive([]);
    const projectTechBadges = reactive([]);
    const projectLinks = reactive([]);
    
    // Filter state
    const filters = ['All', 'Fullstack', 'Frontend', 'Backend'];
    const activeFilter = ref('All');
    
    // Store all animations for cleanup
    const animations = [];
    
    // Projects data from centralized file
    const projects = reactive(projectsData);
    
    // Computed filtered projects
    const filteredProjects = computed(() => {
      if (activeFilter.value === 'All') return projects;
      return projects.filter(p => p.type === activeFilter.value);
    });

    onMounted(() => {
      // Section title animation
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
              start: 'top 65%',
              toggleActions: 'play none none reverse'
            }
          }
        )
      );
      
      // Project cards staggered reveal
      projectCards.forEach((card, index) => {
        animations.push(
          gsap.fromTo(card,
            { opacity: 0, y: 50 },
            { 
              opacity: 1, 
              y: 0, 
              duration: 0.8,
              delay: 0.15 * index, // Stagger effect
              ease: 'power2.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 65%',
                toggleActions: 'play none none reverse'
              }
            }
          )
        );
        
        // Project image subtle scale effect on scroll
        if (projectImages[index]) {
          animations.push(
            gsap.fromTo(projectImages[index],
              { scale: 1.1 },
              {
                scale: 1,
                duration: 1,
                ease: 'power1.inOut',
                scrollTrigger: {
                  trigger: projectImages[index],
                  start: 'top 65%',
                  end: 'bottom 15%',
                  scrub: true
                }
              }
            )
          );
        }
        
        // Content reveal animations for each project
        if (projectTitles[index]) {
          animations.push(
            gsap.fromTo(projectTitles[index],
              { opacity: 0, x: -20 },
              { 
                opacity: 1, 
                x: 0, 
                duration: 0.5,
                delay: 0.2 + (index * 0.15),
                ease: 'power2.out',
                scrollTrigger: {
                  trigger: projectTitles[index],
                  start: 'top 75%',
                  toggleActions: 'play none none reverse'
                }
              }
            )
          );
        }
        
        if (projectDescriptions[index]) {
          animations.push(
            gsap.fromTo(projectDescriptions[index],
              { opacity: 0, x: -20 },
              { 
                opacity: 1, 
                x: 0, 
                duration: 0.5,
                delay: 0.3 + (index * 0.15),
                ease: 'power2.out',
                scrollTrigger: {
                  trigger: projectDescriptions[index],
                  start: 'top 75%',
                  toggleActions: 'play none none reverse'
                }
              }
            )
          );
        }
        
        if (projectLinks[index]) {
          animations.push(
            gsap.fromTo(projectLinks[index],
              { opacity: 0, y: 20 },
              { 
                opacity: 1, 
                y: 0, 
                duration: 0.5,
                delay: 0.5 + (index * 0.15),
                ease: 'power2.out',
                scrollTrigger: {
                  trigger: projectLinks[index],
                  start: 'top 80%',
                  toggleActions: 'play none none reverse'
                }
              }
            )
          );
        }
      });
      
      // Technology badges staggered animation
      projectTechBadges.forEach((badge, index) => {
        animations.push(
          gsap.fromTo(badge,
            { opacity: 0, scale: 0.8 },
            { 
              opacity: 1, 
              scale: 1, 
              duration: 0.3,
              delay: 0.03 * index, // Micro-stagger for badges
              ease: 'back.out(1.5)',
              scrollTrigger: {
                trigger: badge,
                start: 'top 75%',
                toggleActions: 'play none none reverse'
              }
            }
          )
        );
      });
    });
    
    onUnmounted(() => {
      // Clean up all ScrollTrigger instances
      animations.forEach(animation => {
        if (animation.scrollTrigger) {
          animation.scrollTrigger.kill();
        }
      });
      
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    });

    return {
      sectionTitle,
      sectionSubtitle,
      filterTabs,
      projectCards,
      projectImages,
      projectTitles,
      projectDescriptions, 
      projectTechBadges,
      projectLinks,
      projects,
      filters,
      activeFilter,
      filteredProjects
    };
  }
}
</script>

<style scoped>
/* Add a perspective to the container for 3D effects */
.grid {
  perspective: 1000px;
}

section {
  padding-top: 6rem;    /* 96px */
  padding-bottom: 6rem; /* 96px */
}

/* Optimize for animations with GPU acceleration */
.project-card {
  will-change: transform, opacity;
  backface-visibility: hidden;
}

/* For project image parallax effect */
.project-image-container {
  overflow: hidden;
}

/* Technology badge animation enhancement */
.tech-badge {
  display: inline-block;
  transform-origin: center;
  will-change: transform, opacity;
}

/* Line clamp for description */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
