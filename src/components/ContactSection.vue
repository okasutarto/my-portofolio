<template>
  <section id="contact" class="relative py-16 overflow-hidden">
    <div class="container mx-auto px-4 relative z-10">
      <h2 ref="sectionTitle" class="text-3xl font-bold mb-8 text-center dark:text-white opacity-0">Get In Touch</h2>
      
      <!-- Form status messages -->
      <div v-if="submitStatus === 'success'" class="max-w-2xl mx-auto mb-6 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded" role="alert">
        <p class="font-bold">Thank you!</p>
        <p>Your message has been sent successfully. I'll get back to you soon.</p>
      </div>
      
      <div v-if="submitStatus === 'error'" class="max-w-2xl mx-auto mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
        <p class="font-bold">Something went wrong</p>
        <p>Unable to send your message. Please try again later or contact me through other channels.</p>
      </div>
      
      <div class="max-w-2xl mx-auto">
        <form ref="contactForm" @submit.prevent="submitForm" class="space-y-4 opacity-0">
          <div ref="nameField" class="opacity-0">
            <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input 
              type="text" 
              id="name" 
              v-model="form.name" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2"
              :class="{'border-red-500': errors.name}"
            >
            <p v-if="errors.name" class="mt-1 text-sm text-red-500">{{ errors.name }}</p>
          </div>
          
          <div ref="emailField" class="opacity-0">
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input 
              type="email" 
              id="email" 
              v-model="form.email" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2"
              :class="{'border-red-500': errors.email}"
            >
            <p v-if="errors.email" class="mt-1 text-sm text-red-500">{{ errors.email }}</p>
          </div>
          
          <div ref="messageField" class="opacity-0">
            <label for="message" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
            <textarea 
              id="message" 
              v-model="form.message" 
              rows="4" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2"
              :class="{'border-red-500': errors.message}"
            ></textarea>
            <p v-if="errors.message" class="mt-1 text-sm text-red-500">{{ errors.message }}</p>
          </div>
          
          <div ref="submitButton" class="opacity-0">
            <button 
              type="submit" 
              class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:ring-offset-gray-800"
              :disabled="isSubmitting"
            >
              <span v-if="isSubmitting" class="mr-2">
                <!-- Loading spinner -->
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </span>
              <span v-else>Send Message</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Element refs
const sectionTitle = ref(null);
const contactForm = ref(null);
const nameField = ref(null);
const emailField = ref(null);
const messageField = ref(null);
const submitButton = ref(null);
const decorCircle1 = ref(null);
const decorCircle2 = ref(null);

// Form data
const form = reactive({
  name: '',
  email: '',
  message: ''
});

const errors = reactive({
  name: '',
  email: '',
  message: ''
});

const isSubmitting = ref(false);
const submitStatus = ref(null); // null, 'success', 'error'
const animations = reactive([]);

// Form validation
const validateForm = () => {
  let isValid = true;
  
  // Reset errors
  errors.name = '';
  errors.email = '';
  errors.message = '';

  // Name validation
  if (!form.name.trim()) {
    errors.name = 'Name is required';
    isValid = false;
  }

  // Email validation
  if (!form.email.trim()) {
    errors.email = 'Email is required';
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address';
    isValid = false;
  }

  // Message validation
  if (!form.message.trim()) {
    errors.message = 'Message is required';
    isValid = false;
  } else if (form.message.length < 10) {
    errors.message = 'Message must be at least 10 characters';
    isValid = false;
  }

  return isValid;
};

// Form submission
const submitForm = async () => {
  if (!validateForm()) {
    // Shake fields with errors
    Object.keys(errors).forEach(field => {
      if (errors[field]) {
        const fieldRef = field === 'name' ? nameField.value : 
                         field === 'email' ? emailField.value : 
                         field === 'message' ? messageField.value : null;
                         
        if (fieldRef) {
          gsap.to(fieldRef, {
            x: [-5, 5, -5, 5, 0],
            duration: 0.4,
            ease: 'power2.inOut'
          });
        }
      }
    });
    return;
  }

  // Animate button on click
  gsap.to(submitButton.value, {
    scale: 1.05,
    duration: 0.2,
    yoyo: true,
    repeat: 1,
    ease: 'back.out'
  });
  
  // Set loading state
  isSubmitting.value = true;
  submitStatus.value = null;
  
  try {
    // Send form data (example using fetch with Formspree)
    const response = await fetch('https://formspree.io/your_formspree_id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(form)
    });
    
    if (response.ok) {
      // Success handling
      submitStatus.value = 'success';
      // Reset form after submission
      form.name = '';
      form.email = '';
      form.message = '';
      
      // After 3 seconds, clear the success message
      setTimeout(() => {
        submitStatus.value = null;
      }, 3000);
    } else {
      // Error handling
      submitStatus.value = 'error';
    }
  } catch (error) {
    console.error('Form submission error:', error);
    submitStatus.value = 'error';
  } finally {
    isSubmitting.value = false;
  }
};

// Initialize animations
const initAnimations = () => {
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
          trigger: '#contact',
          start: 'top 60%',
          toggleActions: 'play none none reverse'
        }
      }
    )
  );
  
  // Form container reveal
  animations.push(
    gsap.fromTo(contactForm.value,
      { opacity: 0, y: 30 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.8,
        delay: 0.2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#contact',
          start: 'top 50%',
          toggleActions: 'play none none reverse'
        }
      }
    )
  );
  
  // Form fields staggered animation
  const formElements = [
    nameField.value,
    emailField.value,
    messageField.value,
    submitButton.value
  ];
  
  formElements.forEach((element, index) => {
    animations.push(
      gsap.fromTo(element,
        { opacity: 0, x: -30 },
        { 
          opacity: 1, 
          x: 0, 
          duration: 0.6,
          delay: 0.4 + (index * 0.15),
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '#contact',
            start: 'top 50%',
            toggleActions: 'play none none reverse'
          }
        }
      )
    );
  });
  
  // Decorative elements parallax
  if (decorCircle1.value) {
    animations.push(
      gsap.to(decorCircle1.value, {
        x: 40,
        y: 40,
        scrollTrigger: {
          trigger: '#contact',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.5
        }
      })
    );
  }
  
  if (decorCircle2.value) {
    animations.push(
      gsap.to(decorCircle2.value, {
        x: -30,
        y: -20,
        scrollTrigger: {
          trigger: '#contact',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        }
      })
    );
  }
  
  // Input field focus animation
  const inputFields = document.querySelectorAll('#contact input, #contact textarea');
  inputFields.forEach(field => {
    field.addEventListener('focus', () => {
      gsap.to(field, {
        scale: 1.02,
        duration: 0.3,
        ease: 'power1.out'
      });
    });
    
    field.addEventListener('blur', () => {
      gsap.to(field, {
        scale: 1,
        duration: 0.3,
        ease: 'power1.out'
      });
    });
  });
};

// Lifecycle hooks
onMounted(() => {
  initAnimations();
});

onBeforeUnmount(() => {
  // Clean up animations
  animations.forEach(animation => {
    if (animation.scrollTrigger) {
      animation.scrollTrigger.kill();
    }
  });
  
  ScrollTrigger.getAll().forEach(trigger => trigger.kill());
});
</script>

<style scoped>
/* Optimize for animations */
section {
  padding-top: 6rem;    /* 96px */
  padding-bottom: 6rem; /* 96px */
}

/* Form field focus effect */
input:focus, textarea:focus {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
  transition: all 0.2s ease;
}

/* Button hover animation */
button {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Input and textarea styling fixes for animation */
input, textarea {
  transform-origin: center;
  transition: transform 0.3s ease;
}
</style>
