<template>
  <section id="about" class="sm:py-16 md:py-20 overflow-hidden flex items-center">
    <div class="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div class="flex flex-col lg:flex-row items-center gap-8 sm:gap-10 md:gap-12 lg:gap-16">
        <!-- Profile image with circular design -->
        <div class="w-full lg:w-2/5 relative flex justify-center">
          <div 
            class="relative" 
            ref="profileContainer"
          >
            <!-- Circular image -->
            <div class="rounded-full overflow-hidden w-64 sm:w-72 md:w-80 h-64 sm:h-72 md:h-80 shadow-lg">
              <img 
                ref="profileImage"
                src="@/assets/profile-placeholder.jpg" 
                alt="Profile" 
                class="w-full h-full object-cover transition-transform duration-700 ease-out"
              >
            </div>
          </div>
        </div>
        
        <!-- Content with hero-style animations -->
        <div 
          class="w-full lg:w-3/5 overflow-hidden" 
          ref="contentSection"
        >
          <h2 
            class="text-4xl font-bold mb-6 text-gray-900 dark:text-gray-50 animation-element"
            ref="headingRef"
          >About Me</h2>
          <p 
            class="mb-6 text-lg text-gray-700 dark:text-gray-300 leading-relaxed animation-element"
            ref="descriptionRef"
          >
            Hey there! Code craftsman here, wielding Vue, React, JavaScript, and cutting-edge web tech to build digital solutions that actually matter. Former industrial engineer turned developer, I bring fresh eyes to every project. Always tinkering with new tools and pushing my skills to the next level—because in tech, standing still means falling behind!
          </p>
          
          <div class="mt-8">
            <h3 
              class="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 animation-element"
              ref="skillsHeadingRef"
            >Skills</h3>
            <div class="flex flex-wrap gap-3">
              <span 
                v-for="(skill, index) in skills" 
                :key="skill"
                class="skill-tag bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 border border-gray-200 dark:border-gray-700 hover:shadow-md animation-element"
                :class="`skill-tag-${index}`"
                :ref="el => { if(el) skillElements[index] = el }"
              >{{ skill }}</span>
            </div>
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
    const headingRef = ref(null);
    const descriptionRef = ref(null);
    const skillsHeadingRef = ref(null);

    // Skills array for dynamic rendering
    const skills = reactive(['Vue', 'React', 'JavaScript', 'HTML/CSS', 'Tailwind CSS', 'Git']);
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
          { opacity: 0, x: -20 },
          { 
            opacity: 1, 
            x: 0, 
            duration: 0.5,
            delay: 0.5,
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
      
      // Heading animation
      animations.push(
        gsap.fromTo(headingRef.value,
          { opacity: 0, x: -20 },
          { 
            opacity: 1, 
            x: 0, 
            duration: 0.5,
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
          { opacity: 0, x: -20 },
          { 
            opacity: 1, 
            x: 0, 
            duration: 0.5,
            delay: 0.1,
            scrollTrigger: {
              trigger: descriptionRef.value,
              start: 'top 70%',
              toggleActions: 'play none none reverse'
            }
          }
        )
      );
      
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
              { opacity: 0, x: -20 },
              { 
                opacity: 1, 
                x: 0, 
                duration: 0.5,
                delay: 0.2 + (index * 0.1),
                scrollTrigger: {
                  trigger: element,
                  start: 'top 70%',
                  toggleActions: 'play none none reverse'
                }
              }
            )
          );
        }
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
      profileContainer,
      backgroundCircle,
      profileImage,
      contentSection,
      headingRef, 
      descriptionRef, 
      skillsHeadingRef,
      skills,
      skillElements
    };
  }
}
</script>

<style scoped>
section {
  padding-top: 6rem;    /* 96px */
  padding-bottom: 6rem; /* 96px */
}

@media (min-width: 640px) {
  section {
    padding-top: 4rem;    /* 64px */
    padding-bottom: 4rem; /* 64px */
  }
}

@media (min-width: 768px) {
  section {
    padding-top: 6rem;    /* 96px */
    padding-bottom: 6rem; /* 96px */
  }
}

/* Keep existing styles below */
/* Hide elements before animation */
.animation-element {
  opacity: 0;
}

/* Skill tag hover effect */
.skill-tag {
  transition: all 0.3s ease;
}

.skill-tag:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Image hover effect */
.relative:hover img {
  transform: scale(1.05) !important;
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>