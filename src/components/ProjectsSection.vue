<template>
  <section id="projects" class="relative py-16 overflow-hidden">
    <div class="container mx-auto px-4 relative z-10">
      <h2 
        ref="sectionTitle"
        class="text-3xl font-bold mb-8 text-center dark:text-white opacity-0"
      >My Projects</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="(project, index) in projects" 
          :key="project.id" 
          :ref="el => { if(el) projectCards[index] = el }"
          class="project-card bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden 
                transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl 
                focus-within:scale-105 focus-within:shadow-xl focus-within:ring-2 focus-within:ring-blue-500 opacity-0">
          
          <div class="project-image-container overflow-hidden">
            <img 
              :ref="el => { if(el) projectImages[index] = el }" 
              :src="project.image" 
              :alt="project.title" 
              class="w-full h-48 object-cover"
            >
          </div>
          
          <div class="p-4">
            <h3 
              :ref="el => { if(el) projectTitles[index] = el }"
              class="text-xl font-semibold mb-2 dark:text-white opacity-0"
            >{{ project.title }}</h3>
            
            <p 
              :ref="el => { if(el) projectDescriptions[index] = el }"
              class="text-gray-600 dark:text-gray-300 mb-4 opacity-0"
            >{{ project.description }}</p>
            
            <div class="flex flex-wrap gap-2 mb-4">
              <span 
                v-for="(tech, techIndex) in project.technologies" 
                :key="techIndex"
                :ref="el => { if(el) projectTechBadges.push(el) }"
                class="tech-badge bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs px-2 py-1 rounded opacity-0">
                {{ tech }}
              </span>
            </div>
            
            <div 
              :ref="el => { if(el) projectLinks[index] = el }"
              class="flex space-x-2 opacity-0"
            >
              <a :href="project.demoLink" target="_blank" 
                 class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200">
                Demo
              </a>
              <a :href="project.codeLink" target="_blank" 
                 class="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200">
                Code
              </a>
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

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

export default {
  name: 'ProjectsSection',
  setup() {
    // Element refs for animations
    const sectionTitle = ref(null);
    const projectCards = reactive([]);
    const projectImages = reactive([]);
    const projectTitles = reactive([]);
    const projectDescriptions = reactive([]);
    const projectTechBadges = reactive([]);
    const projectLinks = reactive([]);
    
    // Store all animations for cleanup
    const animations = [];
    
    // Projects data
    const projects = reactive([
      {
        id: 1,
        title: 'Summarizer',
        description: 'AI-powered tool that summarizes text, PDFs, and images into clear, actionable insights.',
        image: 'https://narrato.io/blog/wp-content/uploads/2024/04/Content_Marketing_Case_Study_Airtable_812__500_px_Presentation_169_18.jpg', // Shopping/retail related image
        technologies: ['Next', 'Shadcn UI', 'OpenAI API'],
        demoLink: '#',
        codeLink: 'https://github.com/okasutarto/summarizer'
      },
      {
        id: 2,
        title: 'Pokedex',
        description: 'Pokedex Web App: Explore Pokémon types, stats, abilities, and evolutions.',
        image: 'https://static.wixstatic.com/media/2e36a5_76a80b6d6fc04bd38ef398cc27b97cc4~mv2.jpg/v1/fill/w_568,h_332,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/2e36a5_76a80b6d6fc04bd38ef398cc27b97cc4~mv2.jpg', // Weather/clouds related image
        technologies: ['Vue.js', 'Axios', 'CSS'],
        demoLink: 'https://pokedex-oka.vercel.app/#/',
        codeLink: 'https://github.com/okasutarto/Pokedex'
      },
      {
        id: 3,
        title: 'Task Manager',
        description: 'A productivity app for managing daily tasks with drag and drop functionality.',
        image: 'https://picsum.photos/id/20/800/450', // Productivity/desk related image
        technologies: ['Vue.js', 'Firebase', 'Tailwind CSS'],
        demoLink: '#',
        codeLink: '#'
      }
    ]);

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
      projectCards,
      projectImages,
      projectTitles,
      projectDescriptions, 
      projectTechBadges,
      projectLinks,
      projects
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
</style>
