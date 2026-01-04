<template>
  <section id="contact" class="relative py-8 md:py-12 overflow-hidden">
    <div class="container mx-auto px-4 relative z-10">
      <h2
        ref="sectionTitle"
        class="text-3xl font-bold mb-4 text-center dark:text-white opacity-0">
        Get In Touch
      </h2>
      <div
        class="h-1 w-20 bg-primary mx-auto rounded-full mb-12 opacity-0"
        ref="titleUnderline"></div>

      <div class="max-w-6xl mx-auto">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <!-- Contact Info -->
          <div class="space-y-8 opacity-0" ref="contactInfo">
            <div>
              <h3 class="text-2xl font-semibold mb-4 dark:text-white">
                Let's Connect
              </h3>
              <p class="text-gray-600 dark:text-gray-300 mb-6">
                I'm always interested in new projects and opportunities. Whether
                you have a question or just want to say hello, I'll try my best
                to get back to you!
              </p>
            </div>

            <div class="space-y-6">
              <div class="flex items-center">
                <div
                  class="bg-primary/10 dark:bg-primary/20 p-3 rounded-full mr-4 shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6 text-primary dark:text-primary-light"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 class="font-medium dark:text-white">Email</h3>
                  <a
                    href="mailto:okasputra@gmail.com"
                    class="text-primary hover:underline dark:text-primary-light"
                    >okasputra@gmail.com</a
                  >
                </div>
              </div>

              <div class="flex items-center">
                <div
                  class="bg-primary/10 dark:bg-primary/20 p-3 rounded-full mr-4 shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6 text-primary dark:text-primary-light"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h3 class="font-medium dark:text-white">Phone / WhatsApp</h3>
                  <a
                    href="tel:+6281234567890"
                    class="text-primary hover:underline dark:text-primary-light"
                    >+62 822 1641 8397</a
                  >
                </div>
              </div>

              <div class="flex items-center">
                <div
                  class="bg-primary/10 dark:bg-primary/20 p-3 rounded-full mr-4 shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6 text-primary dark:text-primary-light"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <h3 class="font-medium dark:text-white">Location</h3>
                  <p class="text-gray-600 dark:text-gray-300">
                    Pontianak, Indonesia
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Contact Form -->
          <div
            class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 opacity-0"
            ref="contactFormCard">
            <h3 class="text-xl font-semibold mb-6 dark:text-white">
              Send a Message
            </h3>
            <form
              ref="contactForm"
              @submit.prevent="submitForm"
              class="space-y-4">
              <div ref="nameField" class="opacity-0">
                <label
                  for="name"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >Name</label
                >
                <input
                  type="text"
                  id="name"
                  v-model="form.name"
                  class="mt-1 block w-full rounded-md border-gray-300 dark:border-0 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white p-3 border"
                  :class="{ 'border-red-500': errors.name }"
                  placeholder="Your Name" />
                <p v-if="errors.name" class="mt-1 text-sm text-red-500">
                  {{ errors.name }}
                </p>
              </div>

              <div ref="emailField" class="opacity-0">
                <label
                  for="email"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >Email</label
                >
                <input
                  type="email"
                  id="email"
                  v-model="form.email"
                  class="mt-1 block w-full rounded-md border-gray-300 dark:border-0 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white p-3 border"
                  :class="{ 'border-red-500': errors.email }"
                  placeholder="your.email@example.com" />
                <p v-if="errors.email" class="mt-1 text-sm text-red-500">
                  {{ errors.email }}
                </p>
              </div>

              <div ref="messageField" class="opacity-0">
                <label
                  for="message"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >Message</label
                >
                <textarea
                  id="message"
                  v-model="form.message"
                  rows="4"
                  class="mt-1 block w-full rounded-md border-gray-300 dark:border-0 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white p-3 border"
                  :class="{ 'border-red-500': errors.message }"
                  placeholder="How can I help you?"></textarea>
                <p v-if="errors.message" class="mt-1 text-sm text-red-500">
                  {{ errors.message }}
                </p>
              </div>

              <div ref="submitButton" class="opacity-0 pt-2">
                <button
                  type="submit"
                  class="w-full inline-flex justify-center py-3 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:ring-offset-gray-800 transition-all duration-300 transform hover:-translate-y-1"
                  :disabled="isSubmitting">
                  <span v-if="isSubmitting" class="flex items-center">
                    <svg
                      class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24">
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </span>
                  <span v-else>Send Message</span>
                </button>
              </div>

              <!-- Form status messages -->
              <div
                v-if="submitStatus === 'success'"
                class="max-w-2xl mx-auto bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded"
                role="alert">
                <p class="font-bold">Thank you!</p>
                <p>
                  Your message has been sent successfully. I'll get back to you
                  soon.
                </p>
              </div>

              <div
                v-else-if="submitStatus === 'error'"
                class="max-w-2xl mx-auto mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded"
                role="alert">
                <p class="font-bold">Something went wrong</p>
                <p>
                  Unable to send your message. Please try again later or contact
                  me through other channels.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from "vue";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import emailjs from "@emailjs/browser";
import { EMAILJS_CONFIG } from "@/config/emailjs";

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Element refs
const sectionTitle = ref(null);
const titleUnderline = ref(null);
const contactInfo = ref(null);
const contactFormCard = ref(null);
const contactForm = ref(null);
const nameField = ref(null);
const emailField = ref(null);
const messageField = ref(null);
const submitButton = ref(null);
const decorCircle1 = ref(null);
const decorCircle2 = ref(null);

// Form data
const form = reactive({
  name: "",
  email: "",
  message: "",
});

const errors = reactive({
  name: "",
  email: "",
  message: "",
});

const isSubmitting = ref(false);
const submitStatus = ref(null); // null, 'success', 'error'
const animations = reactive([]);

// Form validation
const validateForm = () => {
  let isValid = true;

  // Reset errors
  errors.name = "";
  errors.email = "";
  errors.message = "";

  // Name validation
  if (!form.name.trim()) {
    errors.name = "Name is required";
    isValid = false;
  }

  // Email validation
  if (!form.email.trim()) {
    errors.email = "Email is required";
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Please enter a valid email address";
    isValid = false;
  }

  // Message validation
  if (!form.message.trim()) {
    errors.message = "Message is required";
    isValid = false;
  } else if (form.message.length < 10) {
    errors.message = "Message must be at least 10 characters";
    isValid = false;
  }

  return isValid;
};

// Form submission
const submitForm = async () => {
  if (!validateForm()) {
    // Shake fields with errors
    Object.keys(errors).forEach((field) => {
      if (errors[field]) {
        const fieldRef =
          field === "name"
            ? nameField.value
            : field === "email"
            ? emailField.value
            : field === "message"
            ? messageField.value
            : null;

        if (fieldRef) {
          gsap.to(fieldRef, {
            x: [-5, 5, -5, 5, 0],
            duration: 0.4,
            ease: "power2.inOut",
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
    ease: "back.out",
  });

  // Set loading state
  isSubmitting.value = true;
  submitStatus.value = null;

  try {
    // Prepare template parameters for EmailJS
    const templateParams = {
      name: form.name,
      email: form.email,
      subject: "Portfolio Contact Form",
      message: form.message,
      to_name: "Oka Sutarto Putra",
    };

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams,
      EMAILJS_CONFIG.PUBLIC_KEY
    );

    console.log("Email sent successfully:", response);

    // Success handling
    submitStatus.value = "success";
    // Reset form after submission
    form.name = "";
    form.email = "";
    form.message = "";

    // After 5 seconds, clear the success message
    setTimeout(() => {
      submitStatus.value = null;
    }, 5000);
  } catch (error) {
    console.error("EmailJS error:", error);
    submitStatus.value = "error";
  } finally {
    isSubmitting.value = false;
  }
};

// Initialize animations
const initAnimations = () => {
  // Section title animation
  // Section title and underline animation
  animations.push(
    gsap.to([sectionTitle.value, titleUnderline.value], {
      opacity: 1,
      y: 0,
      duration: 1,
      stagger: 0.2,
      ease: "power3.out",
      scrollTrigger: {
        trigger: "#contact",
        start: "top 60%",
        toggleActions: "play none none reverse",
      },
    })
  );

  // Initial set for underline
  if (titleUnderline.value) {
    gsap.set(titleUnderline.value, { y: 20 });
  }

  // Contact Info animation
  if (contactInfo.value) {
    animations.push(
      gsap.fromTo(
        contactInfo.value,
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          delay: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "#contact",
            start: "top 60%",
            toggleActions: "play none none reverse",
          },
        }
      )
    );
  }

  // Form container reveal
  if (contactFormCard.value) {
    animations.push(
      gsap.fromTo(
        contactFormCard.value,
        { opacity: 0, x: 30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          delay: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "#contact",
            start: "top 60%",
            toggleActions: "play none none reverse",
          },
        }
      )
    );
  }

  // Form content fade in
  animations.push(
    gsap.fromTo(
      contactForm.value,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.8,
        delay: 0.4,
        ease: "power2.out",
        scrollTrigger: {
          trigger: "#contact",
          start: "top 60%",
          toggleActions: "play none none reverse",
        },
      }
    )
  );

  // Form fields staggered animation
  const formElements = [
    nameField.value,
    emailField.value,
    messageField.value,
    submitButton.value,
  ];

  formElements.forEach((element, index) => {
    animations.push(
      gsap.fromTo(
        element,
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.6,
          delay: 0.4 + index * 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "#contact",
            start: "top 50%",
            toggleActions: "play none none reverse",
          },
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
          trigger: "#contact",
          start: "top bottom",
          end: "bottom top",
          scrub: 1.5,
        },
      })
    );
  }

  if (decorCircle2.value) {
    animations.push(
      gsap.to(decorCircle2.value, {
        x: -30,
        y: -20,
        scrollTrigger: {
          trigger: "#contact",
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      })
    );
  }

  // Input field focus animation
  const inputFields = document.querySelectorAll(
    "#contact input, #contact textarea"
  );
  inputFields.forEach((field) => {
    field.addEventListener("focus", () => {
      gsap.to(field, {
        scale: 1.02,
        duration: 0.3,
        ease: "power1.out",
      });
    });

    field.addEventListener("blur", () => {
      gsap.to(field, {
        scale: 1,
        duration: 0.3,
        ease: "power1.out",
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
  animations.forEach((animation) => {
    if (animation.scrollTrigger) {
      animation.scrollTrigger.kill();
    }
  });

  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
});
</script>

<style scoped>
/* Optimize for animations */
section {
  padding-top: 6rem; /* 96px */
  padding-bottom: 6rem; /* 96px */
}

/* Form field focus effect */
input:focus,
textarea:focus {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
  transition: all 0.2s ease;
}

/* Button hover animation */
button {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Input and textarea styling fixes for animation */
input,
textarea {
  transform-origin: center;
  transition: transform 0.3s ease;
}
</style>
