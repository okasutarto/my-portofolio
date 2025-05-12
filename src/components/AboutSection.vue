<template>
  <section id="about" class="relative py-20 overflow-hidden">
    <div class="container mx-auto px-4 relative z-10">
      <!-- Background accent elements with parallax effect -->
      <div 
        ref="blob1" 
        class="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-100 to-transparent rounded-full filter blur-3xl opacity-20 -z-10"
        :style="{ transform: `translate3d(${blob1X}px, ${blob1Y}px, 0)` }"
      ></div>
      <div 
        ref="blob2" 
        class="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-primary-100 to-transparent rounded-full filter blur-3xl opacity-20 -z-10"
        :style="{ transform: `translate3d(${blob2X}px, ${blob2Y}px, 0)` }"
      ></div>
      
      <div class="flex flex-col lg:flex-row items-center gap-12 md:gap-16">
        <!-- Profile image with circular design -->
        <div class="lg:w-2/5 relative flex justify-center">
          <div 
            class="relative" 
            ref="profileContainer"
            :class="getAnimationClass('profile')"
            :style="{ transform: `translate3d(${profileX}px, ${profileY}px, 0) scale(${profileScale})` }"
          >
            <!-- Circular decorative background element with subtle rotation -->
            <div 
              class="absolute -top-4 -left-4 w-full h-full rounded-full bg-gradient-to-tr from-primary-100 to-secondary-100 dark:from-primary-900 dark:to-secondary-900 opacity-30 -z-10 scale-110"
              :style="{ transform: `rotate(${backgroundRotation}deg)` }"
            ></div>
            
            <!-- Circular image -->
            <div class="rounded-full overflow-hidden w-72 h-72 shadow-lg border-4 border-white dark:border-gray-800">
              <img 
                src="@/assets/profile-placeholder.jpg" 
                alt="Profile" 
                class="w-full h-full object-cover transition-transform duration-700 ease-out"
                :style="{ transform: `scale(${imageScale}) rotate(${imageRotation}deg)` }"
              >
            </div>
            
            <!-- Accent dot decorations with independent movement -->
            <div 
              class="absolute top-6 -right-4 w-6 h-6 bg-primary-400 dark:bg-primary-600 rounded-full"
              :style="{ transform: `translate3d(${dot1X}px, ${dot1Y}px, 0)` }"
            ></div>
            <div 
              class="absolute -bottom-2 left-10 w-4 h-4 bg-secondary-400 dark:bg-secondary-600 rounded-full"
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
            class="text-4xl font-bold mb-6 text-gray-900 dark:text-gray-50"
            :class="getAnimationClass('heading')"
            ref="headingRef"
          >About Me</h2>
          <p 
            class="mb-6 text-lg text-gray-700 dark:text-gray-300 leading-relaxed"
            :class="getAnimationClass('description')"
            ref="descriptionRef"
          >
            Hey there! Code craftsman here, wielding Vue, React, JavaScript, and cutting-edge web tech to build digital solutions that actually matter. Former industrial engineer turned developer, I bring fresh eyes to every project. Always tinkering with new tools and pushing my skills to the next level—because in tech, standing still means falling behind!
          </p>
          
          <div class="mt-8">
            <h3 
              class="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200"
              :class="getAnimationClass('skillsHeading')"
              ref="skillsHeadingRef"
            >Skills</h3>
            <div class="flex flex-wrap gap-3">
              <span 
                v-for="(skill, index) in skills" 
                :key="skill"
                class="skill-tag bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 border border-gray-200 dark:border-gray-700 hover:shadow-md"
                :class="getSkillAnimationClass(index)"
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
    // Parallax effect data
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
    
    // Element refs
    const profileContainer = ref(null);
    const contentSection = ref(null);
    const blob1 = ref(null);
    const blob2 = ref(null);
    const headingRef = ref(null);
    const descriptionRef = ref(null);
    const skillsHeadingRef = ref(null);
    
    // Skills array for dynamic rendering
    const skills = reactive(['Vue', 'React', 'JavaScript', 'HTML/CSS', 'Tailwind CSS', 'Git']);
    
    // Scroll tracking
    const scrollY = ref(0);
    const prevScrollY = ref(0);
    const scrollingDown = ref(true);
    
    // Sequential animation state management
    // This tracks the visibility state of each element
    const animationState = reactive({
      profile: { visible: false, ready: false },
      heading: { visible: false, ready: false },
      description: { visible: false, ready: false },
      skillsHeading: { visible: false, ready: false },
      skills: { visible: false, ready: false }
    });
    
    // Track viewport position of elements
    const elementPositions = reactive({
      profile: 0,
      heading: 0,
      description: 0,
      skillsHeading: 0,
      skills: 0
    });
    
    // Handle scroll event - for parallax and tracking direction
    const handleScroll = () => {
      prevScrollY.value = scrollY.value;
      scrollY.value = window.scrollY;
      scrollingDown.value = scrollY.value > prevScrollY.value;
      
      // Update parallax effects
      updateParallaxEffects();
      
      // Update element positions relative to viewport
      updateElementPositions();
      
      // Manage sequential animations based on scroll direction
      updateSequentialAnimations();
    };
    
    // Update element positions
    const updateElementPositions = () => {
      if (profileContainer.value) {
        elementPositions.profile = getElementViewportPosition(profileContainer.value);
      }
      if (headingRef.value) {
        elementPositions.heading = getElementViewportPosition(headingRef.value);
      }
      if (descriptionRef.value) {
        elementPositions.description = getElementViewportPosition(descriptionRef.value);
      }
      if (skillsHeadingRef.value) {
        elementPositions.skillsHeading = getElementViewportPosition(skillsHeadingRef.value);
        elementPositions.skills = elementPositions.skillsHeading - 0.05; // Slightly below heading
      }
    };
    
    // Calculate element position in viewport (0 = top of viewport, 1 = bottom)
    const getElementViewportPosition = (element) => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      return (rect.top + rect.height / 2) / windowHeight;
    };
    
    // Check if element should be visible
    const isElementVisible = (position) => {
      return position > 0.15 && position < 0.85;
    };
    
    // Update sequential animations based on scroll direction
    const updateSequentialAnimations = () => {
      if (scrollingDown.value) {
        // When scrolling down, elements appear in sequence: profile → heading → desc → skillsHead → skills
        handleScrollDownAnimations();
      } else {
        // When scrolling up, elements appear in reverse: skills → skillsHead → desc → heading → profile
        handleScrollUpAnimations();
      }
    };
    
    // Handle animations when scrolling down
    const handleScrollDownAnimations = () => {
      // Profile appears first when scrolling down
      const profileVisible = isElementVisible(elementPositions.profile);
      animationState.profile.visible = profileVisible;
      
      // Only check heading when profile is visible and ready
      if (profileVisible) {
        setTimeout(() => { animationState.profile.ready = true; }, 50);
      } else {
        animationState.profile.ready = false;
        resetDependentAnimations('profile');
        return;
      }
      
      // If profile is ready, check heading
      if (animationState.profile.ready) {
        const headingVisible = isElementVisible(elementPositions.heading);
        animationState.heading.visible = headingVisible;
        
        if (headingVisible) {
          setTimeout(() => { animationState.heading.ready = true; }, 50);
        } else {
          animationState.heading.ready = false;
          resetDependentAnimations('heading');
          return;
        }
      }
      
      // If heading is ready, check description
      if (animationState.heading.ready) {
        const descriptionVisible = isElementVisible(elementPositions.description);
        animationState.description.visible = descriptionVisible;
        
        if (descriptionVisible) {
          setTimeout(() => { animationState.description.ready = true; }, 50);
        } else {
          animationState.description.ready = false;
          resetDependentAnimations('description');
          return;
        }
      }
      
      // If description is ready, check skills heading
      if (animationState.description.ready) {
        const skillsHeadingVisible = isElementVisible(elementPositions.skillsHeading);
        animationState.skillsHeading.visible = skillsHeadingVisible;
        
        if (skillsHeadingVisible) {
          setTimeout(() => { animationState.skillsHeading.ready = true; }, 50);
        } else {
          animationState.skillsHeading.ready = false;
          resetDependentAnimations('skillsHeading');
          return;
        }
      }
      
      // If skills heading is ready, show skills
      if (animationState.skillsHeading.ready) {
        const skillsVisible = isElementVisible(elementPositions.skills);
        animationState.skills.visible = skillsVisible;
        
        if (skillsVisible) {
          setTimeout(() => { animationState.skills.ready = true; }, 50);
        } else {
          animationState.skills.ready = false;
        }
      }
    };
    
    // Handle animations when scrolling up
    const handleScrollUpAnimations = () => {
      // Skills appear first when scrolling up
      const skillsVisible = isElementVisible(elementPositions.skills);
      animationState.skills.visible = skillsVisible;
      
      if (skillsVisible) {
        setTimeout(() => { animationState.skills.ready = true; }, 50);
      } else {
        animationState.skills.ready = false;
        resetDependentAnimationsReverse('skills');
        return;
      }
      
      // If skills are ready, check skills heading
      if (animationState.skills.ready) {
        const skillsHeadingVisible = isElementVisible(elementPositions.skillsHeading);
        animationState.skillsHeading.visible = skillsHeadingVisible;
        
        if (skillsHeadingVisible) {
          setTimeout(() => { animationState.skillsHeading.ready = true; }, 50);
        } else {
          animationState.skillsHeading.ready = false;
          resetDependentAnimationsReverse('skillsHeading');
          return;
        }
      }
      
      // If skills heading is ready, check description
      if (animationState.skillsHeading.ready) {
        const descriptionVisible = isElementVisible(elementPositions.description);
        animationState.description.visible = descriptionVisible;
        
        if (descriptionVisible) {
          setTimeout(() => { animationState.description.ready = true; }, 50);
        } else {
          animationState.description.ready = false;
          resetDependentAnimationsReverse('description');
          return;
        }
      }
      
      // If description is ready, check heading
      if (animationState.description.ready) {
        const headingVisible = isElementVisible(elementPositions.heading);
        animationState.heading.visible = headingVisible;
        
        if (headingVisible) {
          setTimeout(() => { animationState.heading.ready = true; }, 50);
        } else {
          animationState.heading.ready = false;
          resetDependentAnimationsReverse('heading');
          return;
        }
      }
      
      // If heading is ready, check profile
      if (animationState.heading.ready) {
        const profileVisible = isElementVisible(elementPositions.profile);
        animationState.profile.visible = profileVisible;
        
        if (profileVisible) {
          setTimeout(() => { animationState.profile.ready = true; }, 50);
        } else {
          animationState.profile.ready = false;
        }
      }
    };
    
    // Reset dependent animations when scrolling down
    const resetDependentAnimations = (element) => {
      const resetMap = {
        'profile': ['heading', 'description', 'skillsHeading', 'skills'],
        'heading': ['description', 'skillsHeading', 'skills'],
        'description': ['skillsHeading', 'skills'],
        'skillsHeading': ['skills']
      };
      
      if (resetMap[element]) {
        resetMap[element].forEach(key => {
          animationState[key].visible = false;
          animationState[key].ready = false;
        });
      }
    };
    
    // Reset dependent animations when scrolling up
    const resetDependentAnimationsReverse = (element) => {
      const resetMap = {
        'skills': ['skillsHeading', 'description', 'heading', 'profile'],
        'skillsHeading': ['description', 'heading', 'profile'],
        'description': ['heading', 'profile'],
        'heading': ['profile']
      };
      
      if (resetMap[element]) {
        resetMap[element].forEach(key => {
          animationState[key].visible = false;
          animationState[key].ready = false;
        });
      }
    };
    
    // Update parallax effects based on scroll position
    const updateParallaxEffects = () => {
      // Background blobs parallax (opposite directions)
      blob1X.value = scrollY.value * 0.03;
      blob1Y.value = scrollY.value * 0.02;
      blob2X.value = -scrollY.value * 0.04;
      blob2Y.value = -scrollY.value * 0.03;
      
      // Profile transformations
      const profileParallax = calculateParallax(profileContainer, 0.05);
      profileY.value = -profileParallax;
      profileScale.value = 1 - Math.abs(profileParallax) * 0.0005;
      backgroundRotation.value = scrollY.value * 0.02;
      imageScale.value = 1 + Math.abs(profileParallax) * 0.0003;
      imageRotation.value = profileParallax * 0.02;
      
      // Moving dots with different speeds and inertia
      dot1X.value = Math.sin(scrollY.value / 300) * 8;
      dot1Y.value = Math.cos(scrollY.value / 400) * 5;
      dot2X.value = Math.cos(scrollY.value / 350) * 6;
      dot2Y.value = Math.sin(scrollY.value / 450) * 7;
      
      // Content section parallax
      const contentParallax = calculateParallax(contentSection, 0.04);
      contentY.value = -contentParallax * 0.5;
    };
    
    // Calculate parallax effect value
    const calculateParallax = (elementRef, strength = 0.1) => {
      if (!elementRef.value) return 0;
      const rect = elementRef.value.getBoundingClientRect();
      const centerPosition = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const distanceFromCenter = centerPosition - viewportCenter;
      
      return distanceFromCenter * strength;
    };
    
    // Animation class getters based on element state
    const getAnimationClass = (elementKey) => {
      const state = animationState[elementKey];
      
      if (state.visible) {
        return 'animate-fade-in-slide-right';
      } else {
        return 'animate-fade-out-slide-left';
      }
    };
    
    // Skills animation class with staggered delays
    const getSkillAnimationClass = (index) => {
      if (animationState.skills.visible) {
        return `animate-fade-in-slide-right animation-delay-${index}`;
      } else {
        return `animate-fade-out-slide-left animation-delay-reverse-${index}`;
      }
    };
    
    // Set up and clean up event listeners
    onMounted(() => {
      window.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial calculation
    });
    
    onUnmounted(() => {
      window.removeEventListener('scroll', handleScroll);
    });
    
    return {
      // Parallax values
      blob1X, blob1Y, blob2X, blob2Y,
      profileX, profileY, profileScale, backgroundRotation, 
      imageScale, imageRotation,
      dot1X, dot1Y, dot2X, dot2Y,
      contentY,
      
      // Element refs
      profileContainer, contentSection,
      blob1, blob2,
      headingRef, descriptionRef, skillsHeadingRef,
      
      // Animation getters
      getAnimationClass,
      getSkillAnimationClass,
      
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

/* Base animation classes */
.animate-fade-in-slide-right {
  animation: fade-in-slide-right 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}

.animate-fade-out-slide-left {
  animation: fade-out-slide-left 0.5s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards;
  opacity: 0;
}

/* Animation keyframes */
@keyframes fade-in-slide-right {
  0% {
    opacity: 0;
    transform: translateX(-20px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fade-out-slide-left {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-20px);
  }
}

/* Animation delays for staggered effect in both directions */
.animation-delay-0 { animation-delay: 0s; }
.animation-delay-1 { animation-delay: 0.1s; }
.animation-delay-2 { animation-delay: 0.2s; }
.animation-delay-3 { animation-delay: 0.3s; }
.animation-delay-4 { animation-delay: 0.4s; }
.animation-delay-5 { animation-delay: 0.5s; }

/* Reverse delays for skills disappearing in reverse order */
.animation-delay-reverse-5 { animation-delay: 0s; }
.animation-delay-reverse-4 { animation-delay: 0.05s; }
.animation-delay-reverse-3 { animation-delay: 0.1s; }
.animation-delay-reverse-2 { animation-delay: 0.15s; }
.animation-delay-reverse-1 { animation-delay: 0.2s; }
.animation-delay-reverse-0 { animation-delay: 0.25s; }

/* Smooth transitions for parallax elements */
[ref="blob1"], [ref="blob2"] {
  transition: transform 0.6s ease-out;
}

/* Enhance interactive feel */
.skill-tag {
  transition: all 0.3s ease;
}

.skill-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Image scale effect on hover */
.relative:hover img {
  transform: scale(1.05) !important;
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>