<template>
  <section id="testimonials" class="py-16 md:py-20 overflow-hidden bg-gray-50 dark:bg-gray-900/50">
    <div class="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <h2 
        ref="sectionTitle"
        class="text-3xl md:text-4xl font-bold mb-4 text-center dark:text-white opacity-0"
      >
        What People Say
      </h2>
      <p 
        ref="sectionSubtitle"
        class="text-gray-700 dark:text-gray-300 text-center mb-12 max-w-2xl mx-auto opacity-0"
      >
        Recommendations from colleagues I've had the pleasure of working with
      </p>

      <!-- Testimonials Carousel -->
      <div class="relative">
        <!-- Navigation Buttons - Hidden on mobile, shown on tablet+ -->
        <button 
          @click="prevTestimonial"
          class="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 z-20 w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-lg items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Previous testimonial"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button 
          @click="nextTestimonial"
          class="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 z-20 w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-lg items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Next testimonial"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <!-- Cards Container -->
        <div 
          ref="carouselContainer"
          class="overflow-x-clip overflow-y-visible"
        >
          <div 
            class="flex transition-transform duration-500 ease-out"
            :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
          >
            <div 
              v-for="(testimonial, index) in testimonials" 
              :key="testimonial.id"
              class="w-full flex-shrink-0 px-4 pt-6"
            >
              <div 
                :ref="el => { if(el) testimonialCards[index] = el }"
                class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 max-w-3xl mx-auto relative"
              >
                <!-- Quote Icon -->
                <div class="absolute -top-4 left-8 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                  </svg>
                </div>

                <!-- Testimonial Content -->
                <div class="pt-4">
                  <p class="text-gray-600 dark:text-gray-300 leading-relaxed text-sm md:text-base mb-6 italic">
                    "{{ testimonial.text }}"
                  </p>

                  <!-- Author Info -->
                  <div class="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div 
                      class="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md"
                      :style="{ background: testimonial.avatarColor }"
                    >
                      {{ testimonial.initials }}
                    </div>
                    <div class="flex-1">
                      <h4 class="font-bold text-gray-900 dark:text-white">
                        {{ testimonial.name }}
                      </h4>
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        {{ testimonial.role }} at {{ testimonial.company }}
                      </p>
                      <a 
                        v-if="testimonial.linkedIn"
                        :href="testimonial.linkedIn" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                      >
                        <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                        View on LinkedIn
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Dots Indicator with mobile navigation -->
        <div class="flex justify-center items-center gap-3 mt-8">
          <!-- Mobile prev button -->
          <button 
            @click="prevTestimonial"
            class="md:hidden w-9 h-9 rounded-full bg-white dark:bg-gray-800 shadow-md flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white transition-all duration-300"
            aria-label="Previous testimonial"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <!-- Dots -->
          <div class="flex gap-2">
            <button 
              v-for="(_, index) in testimonials" 
              :key="index"
              @click="goToTestimonial(index)"
              class="w-2.5 h-2.5 rounded-full transition-all duration-300 focus:outline-none"
              :class="currentIndex === index 
                ? 'bg-primary w-8' 
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'"
              :aria-label="`Go to testimonial ${index + 1}`"
            ></button>
          </div>

          <!-- Mobile next button -->
          <button 
            @click="nextTestimonial"
            class="md:hidden w-9 h-9 rounded-full bg-white dark:bg-gray-800 shadow-md flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white transition-all duration-300"
            aria-label="Next testimonial"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default {
  name: 'TestimonialsSection',
  setup() {
    const sectionTitle = ref(null);
    const sectionSubtitle = ref(null);
    const carouselContainer = ref(null);
    const testimonialCards = reactive([]);
    const currentIndex = ref(0);
    const animations = [];
    let autoplayInterval = null;

    const testimonials = reactive([
      {
        id: 1,
        name: 'Rakish Frisky',
        initials: 'RF',
        role: 'Senior Frontend Engineer',
        company: 'Jublia',
        avatarColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        linkedIn: 'https://www.linkedin.com/in/rakishfrisky/',
        text: `Oka is one of our core team members and works with Vue 3 on a daily basis. He adapts quickly to new challenges and handles problems efficiently as they come up in our projects. One thing I really appreciate about him is his curiosity and eagerness to keep learning.
        I've worked closely with Oka since his first day on the team, and over time I've seen him grow into a truly product-minded engineer. If you're looking for someone with strong frontend skills, a solid product perspective, and a positive attitude that adds energy to the team, I would highly recommend Oka for the role.`
      },
      {
        id: 2,
        name: 'Irfan Abdurrahman',
        initials: 'IA',
        role: 'Engineering Manager',
        company: 'Jublia',
        avatarColor: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        linkedIn: 'https://www.linkedin.com/in/irafun/',
        text: `Oka is a highly initiative Frontend Engineer who consistently demonstrates strong curiosity and a genuine drive to learn. Although his primary scope is Vue-based development at Jublia, he proactively expands beyond his core responsibilities, taking on Angular work and contributing to our microfrontend efforts with a growth mindset and strong ownership.

        What sets Oka apart is how deliberately he invests in leveling up. He picks up new frameworks and patterns quickly, applies them pragmatically, and actively looks for ways to contribute where the team needs support. In addition, his interest in AI is particularly noteworthy: he has been able to translate AI tooling into real usability, both in professional projects and in personal experimentation, which reflects a forward-looking mindset and strong adaptability.

        I would confidently recommend Oka to any team looking for a front-end engineer who brings energy, initiative, and continuous learning; someone who will grow rapidly and raise the capability of the team around him.`
      }
    ]);

    const nextTestimonial = () => {
      currentIndex.value = (currentIndex.value + 1) % testimonials.length;
      resetAutoplay();
    };

    const prevTestimonial = () => {
      currentIndex.value = (currentIndex.value - 1 + testimonials.length) % testimonials.length;
      resetAutoplay();
    };

    const goToTestimonial = (index) => {
      currentIndex.value = index;
      resetAutoplay();
    };

    const startAutoplay = () => {
      autoplayInterval = setInterval(() => {
        currentIndex.value = (currentIndex.value + 1) % testimonials.length;
      }, 8000); // Change every 8 seconds
    };

    const resetAutoplay = () => {
      if (autoplayInterval) {
        clearInterval(autoplayInterval);
        startAutoplay();
      }
    };

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

      // Subtitle animation
      animations.push(
        gsap.fromTo(sectionSubtitle.value,
          { opacity: 0, y: -20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: 0.2,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sectionSubtitle.value,
              start: 'top 80%',
              toggleActions: 'play none none reverse'
            }
          }
        )
      );

      // Carousel container animation
      animations.push(
        gsap.fromTo(carouselContainer.value,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            delay: 0.3,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: carouselContainer.value,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          }
        )
      );

      // Start autoplay
      startAutoplay();
    });

    onUnmounted(() => {
      animations.forEach(animation => {
        if (animation.scrollTrigger) {
          animation.scrollTrigger.kill();
        }
        animation.kill();
      });

      if (autoplayInterval) {
        clearInterval(autoplayInterval);
      }
    });

    return {
      sectionTitle,
      sectionSubtitle,
      carouselContainer,
      testimonialCards,
      testimonials,
      currentIndex,
      nextTestimonial,
      prevTestimonial,
      goToTestimonial
    };
  }
};
</script>

<style scoped>
/* Smooth scrolling for carousel */
.transition-transform {
  will-change: transform;
}
</style>
