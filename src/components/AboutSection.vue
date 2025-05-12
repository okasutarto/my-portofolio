<template>
  <section id="about" class="relative py-20 overflow-hidden">
    <div class="container mx-auto px-4 relative z-10">
      <!-- Background accent elements with parallax effect -->
      <div 
        ref="blob1" 
        class="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-100 to-transparent rounded-full filter blur-3xl opacity-20 -z-10 transition-transform duration-1000 ease-out"
        :style="{ transform: `translate3d(${blob1X}px, ${blob1Y}px, 0)` }"
      ></div>
      <div 
        ref="blob2" 
        class="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-primary-100 to-transparent rounded-full filter blur-3xl opacity-20 -z-10 transition-transform duration-1000 ease-out"
        :style="{ transform: `translate3d(${blob2X}px, ${blob2Y}px, 0)` }"
      ></div>
      
      <div class="flex flex-col lg:flex-row items-center gap-12 md:gap-16">
        <!-- Profile image with circular design -->
        <div class="lg:w-2/5 relative flex justify-center">
          <div 
            class="relative opacity-0" 
            ref="profileContainer"
            :class="{
              'animate-fade-in': isProfileVisible,
              'animate-fade-out': !isProfileVisible && profileContainer
            }"
            :style="{ transform: `translate3d(${profileX}px, ${profileY}px, 0) scale(${profileScale})` }"
          >
            <!-- Circular decorative background element with subtle rotation -->
            <div 
              class="absolute -top-4 -left-4 w-full h-full rounded-full bg-gradient-to-tr from-primary-100 to-secondary-100 dark:from-primary-900 dark:to-secondary-900 opacity-30 -z-10 scale-110 transition-transform duration-1000 ease-out"
              :style="{ transform: `rotate(${backgroundRotation}deg)` }"
            ></div>
            
            <!-- Circular image -->
            <div class="rounded-full overflow-hidden w-72 h-72 shadow-lg border-4 border-white dark:border-gray-800">
              <img 
                src="@/assets/profile-placeholder.jpg" 
                alt="Profile" 
                class="w-full h-full object-cover"
                :style="{ transform: `scale(${imageScale}) rotate(${imageRotation}deg)` }"
              >
            </div>
            
            <!-- Accent dot decorations with independent movement -->
            <div 
              class="absolute top-6 -right-4 w-6 h-6 bg-primary-400 dark:bg-primary-600 rounded-full transition-transform duration-700 ease-out"
              :style="{ transform: `translate3d(${dot1X}px, ${dot1Y}px, 0)` }"
            ></div>
            <div 
              class="absolute -bottom-2 left-10 w-4 h-4 bg-secondary-400 dark:bg-secondary-600 rounded-full transition-transform duration-700 ease-out"
              :style="{ transform: `translate3d(${dot2X}px, ${dot2Y}px, 0)` }"
            ></div>
          </div>
        </div>
        
        <!-- Content with hero-style animations -->
        <div 
          class="lg:w-3/5" 
          ref="contentSection"
          :style="{ transform: `translate3d(0, ${contentY}px, 0)` }"
        >
          <h2 
            class="text-4xl font-bold mb-6 text-gray-900 dark:text-gray-50 opacity-0"
            :class="{
              'animate-slide-in-right': isHeadingVisible,
              'animate-slide-out-right': !isHeadingVisible && headingRef
            }"
            ref="headingRef"
          >About Me</h2>
          <p 
            class="mb-6 text-lg text-gray-700 dark:text-gray-300 leading-relaxed opacity-0"
            :class="{
              'animate-slide-in-right animation-delay-200': isDescVisible,
              'animate-slide-out-right': !isDescVisible && descriptionRef
            }"
            ref="descriptionRef"
          >
            Hey there! Code craftsman here, wielding Vue, React, JavaScript, and cutting-edge web tech to build digital solutions that actually matter. Former industrial engineer turned developer, I bring fresh eyes to every project. Always tinkering with new tools and pushing my skills to the next level—because in tech, standing still means falling behind!
          </p>
          
          <div class="mt-8">
            <h3 
              class="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 opacity-0"
              :class="{
                'animate-slide-in-right animation-delay-400': isSkillsHeadingVisible,
                'animate-slide-out-right': !isSkillsHeadingVisible && skillsHeadingRef
              }"
              ref="skillsHeadingRef"
            >Skills</h3>
            <div 
              class="flex flex-wrap gap-3"
              :class="{
                'skills-visible': isSkillsVisible,
                'skills-hidden': !isSkillsVisible && skillsHeadingRef
              }"
            >
              <span 
                v-for="skill in skills" 
                :key="skill"
                class="skill-tag bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 border border-gray-200 dark:border-gray-700 hover:shadow-md"
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

export default {
  setup() {
    // Reactive data for parallax effects
    const blob1X = ref(0);
    const blob1Y = ref(0);
    const blob2X = ref(0);
    const blob2Y = ref(0);
    
    const profileX = ref(0);
    const profileY = ref(0);
    const profileScale = ref(1);
    const backgroundRotation = ref(0);
    const imageScale = ref(1);
    const imageRotation = ref(0);
    
    const dot1X = ref(0);
    const dot1Y = ref(0);
    const dot2X = ref(0);
    const dot2Y = ref(0);
    
    const contentY = ref(0);
    const headingX = ref(0);
    const subheadingX = ref(0);
    
    // Element refs
    const profileContainer = ref(null);
    const contentSection = ref(null);
    const blob1 = ref(null);
    const blob2 = ref(null);
    const headingRef = ref(null);
    const descriptionRef = ref(null);
    const skillsHeadingRef = ref(null);
    
    // Visibility state for scroll reveal - all start as false
    const isProfileVisible = ref(false);
    const isHeadingVisible = ref(false);
    const isDescVisible = ref(false);
    const isSkillsHeadingVisible = ref(false);
    const isSkillsVisible = ref(false);
    
    // Animation sequence control - to ensure sequential animations
    const profileAnimationComplete = ref(false);
    const headingAnimationComplete = ref(false);
    const descriptionAnimationComplete = ref(false);
    
    // Skills array for dynamic rendering
    const skills = reactive(['Vue', 'React', 'JavaScript', 'HTML/CSS', 'Tailwind CSS', 'Git']);
    
    // Track scroll position and direction
    const scrollY = ref(0);
    const prevScrollY = ref(0);
    const scrollingDown = ref(true);
    
    // Handle scroll event
    const handleScroll = () => {
      prevScrollY.value = scrollY.value;
      scrollY.value = window.scrollY;
      scrollingDown.value = scrollY.value > prevScrollY.value;
      
      // Get element position relative to viewport
      const calculateParallax = (element, strength = 0.1) => {
        if (!element.value) return 0;
        const rect = element.value.getBoundingClientRect();
        const centerPosition = rect.top + rect.height / 2;
        const viewportCenter = window.innerHeight / 2;
        const distanceFromCenter = centerPosition - viewportCenter;
        
        return distanceFromCenter * strength;
      };

      // Apply parallax effects based on scroll position
      const profileParallax = calculateParallax(profileContainer, 0.05);
      const contentParallax = calculateParallax(contentSection, 0.04);
      
      // Background blobs parallax (opposite directions)
      blob1X.value = scrollY.value * 0.03;
      blob1Y.value = scrollY.value * 0.02;
      blob2X.value = -scrollY.value * 0.04;
      blob2Y.value = -scrollY.value * 0.03;
      
      // Profile picture and elements
      profileY.value = -profileParallax;
      profileScale.value = 1 - Math.abs(profileParallax) * 0.0005;
      backgroundRotation.value = scrollY.value * 0.02;
      imageScale.value = 1 + Math.abs(profileParallax) * 0.0003;
      imageRotation.value = profileParallax * 0.02;
      
      // Moving dots with different speeds
      dot1X.value = Math.sin(scrollY.value / 300) * 8;
      dot1Y.value = Math.cos(scrollY.value / 400) * 5;
      dot2X.value = Math.cos(scrollY.value / 350) * 6;
      dot2Y.value = Math.sin(scrollY.value / 450) * 7;
      
      // Content section elements
      contentY.value = -contentParallax * 0.5;
      headingX.value = -scrollY.value * 0.04;
      subheadingX.value = -scrollY.value * 0.01;
      
      // Check each element's visibility based on scroll position
      checkElementVisibility();
    };
    
    // Check if an element is visible in the viewport
    const isElementInViewport = (element, threshold = 0.4) => {
      if (!element) return false;
      
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Element is considered visible when its top edge reaches the threshold point from the bottom
      return rect.top <= windowHeight * (1 - threshold);
    };
    
    // Check visibility of all elements and trigger animations sequentially
    const checkElementVisibility = () => {
      // For scrolling down - Show elements in sequence
      if (scrollingDown.value) {
        // Step 1: Check if profile should be visible (unchanged)
        if (!isProfileVisible.value && profileContainer.value && 
            isElementInViewport(profileContainer.value, 0.4)) {
          isProfileVisible.value = true;
          
          setTimeout(() => {
            profileAnimationComplete.value = true;
          }, 600);
        }
        
        // Step 2: Check if heading should be visible (unchanged)
        if (!isHeadingVisible.value && profileAnimationComplete.value && 
            headingRef.value && isElementInViewport(headingRef.value, 0.3)) {
          isHeadingVisible.value = true;
          
          setTimeout(() => {
            headingAnimationComplete.value = true;
          }, 600);
        }
        
        // Step 3: Check if description should be visible - Make it depend on heading
        if (!isDescVisible.value && headingAnimationComplete.value && 
            descriptionRef.value && isElementInViewport(descriptionRef.value, 0.35)) {
          isDescVisible.value = true;
          
          setTimeout(() => {
            descriptionAnimationComplete.value = true;
          }, 600);
        }
        
        // Step 4: Check if skills heading should be visible
        // Now depends on descriptionAnimationComplete instead of sequential timing
        if (!isSkillsHeadingVisible.value && descriptionAnimationComplete.value && 
            skillsHeadingRef.value && isElementInViewport(skillsHeadingRef.value, 0.3)) {
          isSkillsHeadingVisible.value = true;
          
          setTimeout(() => {
            isSkillsVisible.value = true;
          }, 300);
        }
      } 
      // For scrolling up - Hide elements with independent triggers
      else {
        // Step 1: Check if skills should be hidden (unchanged)
        if (isSkillsVisible.value && skillsHeadingRef.value && 
            !isElementInViewport(skillsHeadingRef.value, 0.5)) {
          isSkillsVisible.value = false;
          isSkillsHeadingVisible.value = false;
        }
        
        // Step 2: Check if description should be hidden - now independent
        if (isDescVisible.value && descriptionRef.value && 
            !isElementInViewport(descriptionRef.value, 0.4)) {
          isDescVisible.value = false;
          descriptionAnimationComplete.value = false;
        }
        
        // Step 3: Check if heading should be hidden (unchanged)
        if (isHeadingVisible.value && headingRef.value && 
            !isElementInViewport(headingRef.value, 0.5)) {
          isHeadingVisible.value = false;
          headingAnimationComplete.value = false;
          profileAnimationComplete.value = false;
        }
        
        // Step 4: Check if profile should be hidden (unchanged)
        if (isProfileVisible.value && profileContainer.value && 
            !isElementInViewport(profileContainer.value, 0.5)) {
          isProfileVisible.value = false;
          profileAnimationComplete.value = false;
        }
      }
    };
    
    // Add/remove scroll event listener
    onMounted(() => {
      window.addEventListener('scroll', handleScroll);
      // Initial calculation
      handleScroll();
    });
    
    onUnmounted(() => {
      window.removeEventListener('scroll', handleScroll);
    });
    
    return {
      // Blobs
      blob1X, blob1Y, blob2X, blob2Y, blob1, blob2,
      
      // Profile
      profileX, profileY, profileScale, backgroundRotation, 
      imageScale, imageRotation, profileContainer,
      
      // Dots
      dot1X, dot1Y, dot2X, dot2Y,
      
      // Content
      contentY, headingX, subheadingX, contentSection,
      headingRef, descriptionRef, skillsHeadingRef,
      
      // Visibility states for reveal animations
      isProfileVisible,
      isHeadingVisible,
      isDescVisible,
      isSkillsHeadingVisible,
      isSkillsVisible,
      
      // Skills
      skills
    };
  }
}
</script>

<style scoped>
/* Optimize for animations */
section {
  will-change: transform;
  backface-visibility: hidden;
}

/* Hero-style animations */
.animate-fade-in {
  animation: fade-in 1s ease forwards;
}

.animate-fade-out {
  animation: fade-out 0.6s ease forwards;
}

.animate-slide-up {
  animation: slide-up 0.8s ease forwards;
}

.animate-slide-down {
  animation: slide-down 0.6s ease forwards;
}

.animate-slide-in-right {
  animation: slide-in-right 0.8s ease forwards;
}

.animate-slide-out-right {
  animation: slide-out-right 0.6s ease forwards;
}

@keyframes fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes fade-out {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes slide-up {
  0% {
    opacity: 0;
    transform: translateY(30px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-down {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(30px);
  }
}

@keyframes slide-in-right {
  0% {
    opacity: 0;
    transform: translateX(-30px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slide-out-right {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-30px);
  }
}

/* Ensure images scale smoothly with spring effect */
img {
  transition: transform 0.9s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Add hover effect to profile container for interactive feel */
.relative:hover img {
  transform: scale(1.05);
}

/* Skills animation with staggered delay */
.skill-tag {
  opacity: 0;
  transform: translateX(-20px);
}

.skills-visible .skill-tag:nth-child(1) { animation: slide-in-right 0.6s ease forwards; }
.skills-visible .skill-tag:nth-child(2) { animation: slide-in-right 0.6s ease forwards 0.1s; }
.skills-visible .skill-tag:nth-child(3) { animation: slide-in-right 0.6s ease forwards 0.2s; }
.skills-visible .skill-tag:nth-child(4) { animation: slide-in-right 0.6s ease forwards 0.3s; }
.skills-visible .skill-tag:nth-child(5) { animation: slide-in-right 0.6s ease forwards 0.4s; }
.skills-visible .skill-tag:nth-child(6) { animation: slide-in-right 0.6s ease forwards 0.5s; }

/* Hide skills in reverse order */
.skills-hidden .skill-tag:nth-child(6) { animation: slide-out-right 0.4s ease forwards; }
.skills-hidden .skill-tag:nth-child(5) { animation: slide-out-right 0.4s ease forwards 0.1s; }
.skills-hidden .skill-tag:nth-child(4) { animation: slide-out-right 0.4s ease forwards 0.2s; }
.skills-hidden .skill-tag:nth-child(3) { animation: slide-out-right 0.4s ease forwards 0.3s; }
.skills-hidden .skill-tag:nth-child(2) { animation: slide-out-right 0.4s ease forwards 0.4s; }
.skills-hidden .skill-tag:nth-child(1) { animation: slide-out-right 0.4s ease forwards 0.5s; }
</style>