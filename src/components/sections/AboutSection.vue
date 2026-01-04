<template>
  <section id="about" class="sm:py-16 md:py-20 overflow-hidden flex items-center">
    <div class="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div class="flex flex-col lg:flex-row items-center gap-8 sm:gap-10 md:gap-12 lg:gap-16">
        <!-- Profile image with rotating ring design -->
        <div class="w-full lg:w-2/5 relative flex justify-center">
          <div 
            class="relative" 
            ref="profileContainer"
          >
            <!-- Rotating dashed ring -->
            <div class="absolute inset-0 w-72 sm:w-80 md:w-96 h-72 sm:h-80 md:h-96 -m-4 sm:-m-6 md:-m-8">
              <div class="absolute inset-0 rounded-full border-2 border-dashed border-primary/40 animate-spin-slow"></div>
            </div>
            
            <!-- Outer glow ring removed for minimalist design -->
            <!-- <div class="absolute inset-0 w-64 sm:w-72 md:w-80 h-64 sm:h-72 md:h-80 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 blur-xl"></div> -->
            
            <!-- Circular image -->
            <div class="relative rounded-full overflow-hidden w-64 sm:w-72 md:w-80 h-64 sm:h-72 md:h-80 shadow-2xl ring-4 ring-white dark:ring-gray-800">
              <img 
                ref="profileImage"
                src="@/assets/profile-placeholder.jpg" 
                alt="Profile" 
                class="w-full h-full object-cover transition-transform duration-700 ease-out"
              >
            </div>
            
            <!-- Floating badges -->
            <div class="absolute -right-2 sm:-right-4 top-4 sm:top-8 px-3 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg animate-float z-10">
              <span class="text-xl sm:text-2xl">💻</span>
            </div>
            <div class="absolute -left-2 sm:-left-4 bottom-12 sm:bottom-16 px-3 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg animate-float-delayed z-10">
              <span class="text-xl sm:text-2xl">🚀</span>
            </div>
            <div class="absolute right-8 sm:right-4 -bottom-2 sm:-bottom-4 px-3 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg animate-float z-10">
              <span class="text-xl sm:text-2xl">⚡</span>
            </div>
          </div>
        </div>
        
        <!-- Content with hero-style animations -->
        <div 
          class="w-full lg:w-3/5 overflow-hidden" 
          ref="contentSection"
        >
          <h2 
            class="text-3xl sm:text-4xl font-bold mb-6 text-gray-900 dark:text-gray-50 animation-element"
            ref="headingRef"
          >Building End-to-End <br class="hidden sm:block"/><span class="text-primary">Digital Solutions</span></h2>
          <p 
            class="mb-6 text-lg text-gray-700 dark:text-gray-300 leading-relaxed animation-element"
            ref="descriptionRef"
          >
            Fullstack Developer crafting seamless experiences from <span class="font-semibold text-primary">frontend to backend</span>. I build responsive UIs with Vue.js, React, & Angular, architect robust APIs with Node.js, and design efficient databases. Former industrial engineer turned developer—I bring analytical thinking and fresh perspectives to every project!
          </p>
          
          <!-- Quick Stats -->
          <div class="grid grid-cols-3 gap-3 sm:gap-4 mb-8 animation-element" ref="statsRef">
            <div class="text-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <p class="text-2xl sm:text-3xl font-bold text-primary">3+</p>
              <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Years Exp.</p>
            </div>
            <div class="text-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <p class="text-2xl sm:text-3xl font-bold text-primary">15+</p>
              <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Projects</p>
            </div>
            <div class="text-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <p class="text-2xl sm:text-3xl font-bold text-primary">99%</p>
              <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Satisfaction</p>
            </div>
          </div>
          
          <div class="mt-6">
            <h3 
              class="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 animation-element"
              ref="skillsHeadingRef"
            >Tech Stack</h3>
            <div class="flex flex-wrap gap-2 sm:gap-3">
              <span 
                v-for="(skill, index) in skills" 
                :key="skill.name"
                class="skill-tag bg-white border-none dark:bg-gray-800 rounded-lg px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-primary hover:text-primary dark:hover:text-primary hover:shadow-md animation-element flex items-center gap-2"
                :class="`skill-tag-${index}`"
                :ref="el => { if(el) skillElements[index] = el }"
              >
                <span>{{ skill.icon }}</span>
                <span>{{ skill.name }}</span>
              </span>
            </div>
          </div>
          
          <!-- CTA Buttons -->
          <div class="mt-8 flex flex-wrap gap-4 animation-element" ref="ctaRef">
            <router-link to="/about" class="btn btn-outline flex items-center gap-2">
              Learn More
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { ref, onMounted, onUnmounted, reactive } from 'vue';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

export default {
  setup() {
    // Element refs
    const profileContainer = ref(null);
    const backgroundCircle = ref(null);
    const profileImage = ref(null);
    const contentSection = ref(null);
    const badgeRef = ref(null);
    const headingRef = ref(null);
    const descriptionRef = ref(null);
    const statsRef = ref(null);
    const skillsHeadingRef = ref(null);
    const ctaRef = ref(null);

    // Scroll to contact function
    const scrollToContact = () => {
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    };

    // Skills array with icons - Fullstack focused
    const skills = reactive([
      { name: 'Vue.js', icon: '🟢' },
      { name: 'React', icon: '⚛️' },
      { name: 'Angular', icon: '🅰️' },
      { name: 'Node.js', icon: '🟩' },
      { name: 'Express', icon: '⚡' },
      { name: 'PostgreSQL', icon: '🐘' },
      { name: 'MySQL', icon: '🐬' },
      { name: 'TypeScript', icon: '📘' },
      { name: 'REST APIs', icon: '🔗' }
    ]);
    const skillElements = reactive([]);
    
    // Store all animations for cleanup
    const animations = [];

    onMounted(() => {
      // Profile container parallax effect
      animations.push(
        gsap.to(profileContainer.value, {
          scrollTrigger: {
            trigger: '#about',
            start: 'top bottom',
            end: 'center center',
            scrub: true
          },
          ease: 'power2.out'
        })
      );

      // Profile image scale and rotation
      animations.push(
        gsap.fromTo(profileImage.value,
          { opacity: 0, scale: 0.8 },
          { 
            opacity: 1, 
            scale: 1, 
            duration: 0.8,
            delay: 0.3,
            ease: 'back.out(1.7)',
            scrollTrigger: {
              trigger: profileImage.value,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          }
        )
      );
      
      // Content section parallax
      animations.push(
        gsap.to(contentSection.value, {
          scrollTrigger: {
            trigger: '#about',
            start: 'top bottom',
            end: 'center center',
            scrub: true
          },
          ease: 'power2.out'
        })
      );
      
      // Badge animation
      if (badgeRef.value) {
        animations.push(
          gsap.fromTo(badgeRef.value,
            { opacity: 0, y: -20 },
            { 
              opacity: 1, 
              y: 0, 
              duration: 0.5,
              scrollTrigger: {
                trigger: badgeRef.value,
                start: 'top 75%',
                toggleActions: 'play none none reverse'
              }
            }
          )
        );
      }
      
      // Heading animation
      animations.push(
        gsap.fromTo(headingRef.value,
          { opacity: 0, x: -30 },
          { 
            opacity: 1, 
            x: 0, 
            duration: 0.6,
            scrollTrigger: {
              trigger: headingRef.value,
              start: 'top 75%',
              toggleActions: 'play none none reverse'
            }
          }
        )
      );
      
      // Description animation
      animations.push(
        gsap.fromTo(descriptionRef.value,
          { opacity: 0, x: -30 },
          { 
            opacity: 1, 
            x: 0, 
            duration: 0.6,
            delay: 0.1,
            scrollTrigger: {
              trigger: descriptionRef.value,
              start: 'top 70%',
              toggleActions: 'play none none reverse'
            }
          }
        )
      );
      
      // Stats animation
      if (statsRef.value) {
        animations.push(
          gsap.fromTo(statsRef.value,
            { opacity: 0, y: 30 },
            { 
              opacity: 1, 
              y: 0, 
              duration: 0.6,
              delay: 0.2,
              scrollTrigger: {
                trigger: statsRef.value,
                start: 'top 70%',
                toggleActions: 'play none none reverse'
              }
            }
          )
        );
      }
      
      // Skills heading animation
      animations.push(
        gsap.fromTo(skillsHeadingRef.value,
          { opacity: 0, x: -20 },
          { 
            opacity: 1, 
            x: 0, 
            duration: 0.5,
            delay: 0.2,
            scrollTrigger: {
              trigger: skillsHeadingRef.value,
              start: 'top 70%',
              toggleActions: 'play none none reverse'
            }
          }
        )
      );
      
      // Skill tags staggered animation
      skillElements.forEach((element, index) => {
        if (element) {
          animations.push(
            gsap.fromTo(element,
              { opacity: 0, y: 20, scale: 0.8 },
              { 
                opacity: 1, 
                y: 0, 
                scale: 1,
                duration: 0.4,
                delay: 0.3 + (index * 0.08),
                ease: 'back.out(1.7)',
                scrollTrigger: {
                  trigger: element,
                  start: 'top 80%',
                  toggleActions: 'play none none reverse'
                }
              }
            )
          );
        }
      });
      
      // CTA animation
      if (ctaRef.value) {
        animations.push(
          gsap.fromTo(ctaRef.value,
            { opacity: 0, y: 20 },
            { 
              opacity: 1, 
              y: 0, 
              duration: 0.5,
              delay: 0.4,
              scrollTrigger: {
                trigger: ctaRef.value,
                start: 'top 80%',
                toggleActions: 'play none none reverse'
              }
            }
          )
        );
      }
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
      profileContainer,
      backgroundCircle,
      profileImage,
      contentSection,
      badgeRef,
      headingRef, 
      descriptionRef,
      statsRef,
      skillsHeadingRef,
      ctaRef,
      skills,
      skillElements,
      scrollToContact
    };
  }
}
</script>

<style scoped>
section {
  padding-top: 6rem;
  padding-bottom: 6rem;
}

@media (min-width: 640px) {
  section {
    padding-top: 4rem;
    padding-bottom: 4rem;
  }
}

@media (min-width: 768px) {
  section {
    padding-top: 6rem;
    padding-bottom: 6rem;
  }
}

/* Rotating ring animation */
@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-slow {
  animation: spin-slow 20s linear infinite;
}

/* Floating animation */
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

.animate-float-delayed {
  animation: float 3s ease-in-out infinite;
  animation-delay: 1.5s;
}

/* Hide elements before animation */
.animation-element {
  opacity: 0;
}

/* Skill tag hover effect */
.skill-tag {
  transition: all 0.3s ease;
}

.skill-tag:hover {
  transform: translateY(-3px) !important;
}

/* Image hover effect */
.relative:hover img {
  transform: scale(1.05) !important;
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>