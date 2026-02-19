<template>
  <section
    id="contact"
    class="py-24 px-4 md:px-12 bg-background-light dark:bg-background-dark transition-colors duration-300 relative overflow-hidden bg-grid-pattern">
    <div class="max-w-7xl mx-auto relative z-10">
      <!-- Section Header -->
      <div class="text-center mb-20 relative">
        <h2
          ref="sectionTitle"
          class="text-4xl md:text-6xl font-display font-bold text-white dark:text-black uppercase tracking-tighter bg-black dark:bg-primary inline-block px-8 py-4 border-2 border-black dark:border-primary shadow-neo-sm transform rotate-[-1deg] opacity-0">
          Get In Touch
        </h2>
        <div
          class="mt-6 h-2 w-32 bg-primary mx-auto border-2 border-black dark:border-primary opacity-0 shadow-neo-sm"
          ref="titleUnderline"></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        <!-- Contact Information Area -->
        <div
          class="flex flex-col justify-center space-y-12"
          ref="contactInfoArea">
          <div class="space-y-6">
            <h3
              class="text-5xl md:text-7xl font-display font-bold text-black dark:text-white leading-none tracking-tighter drop-shadow-[4px_4px_0px_var(--color-primary)]">
              LET'S<br />CONNECT<span class="text-primary">.</span>
            </h3>
            <p
              class="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-surface-dark border-2 border-black dark:border-primary p-8 shadow-neo-sm transform rotate-1">
              I'm always interested in new projects and opportunities. Whether
              you have a question or just want to say hello, I'll try my best to
              get back to you!
            </p>
          </div>

          <!-- Contact Blocks -->
          <div class="space-y-6">
            <!-- Email -->
            <div
              class="group flex items-center p-4 bg-secondary border-2 border-black dark:border-primary shadow-neo-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
              <div
                class="flex-shrink-0 bg-black text-white p-4 flex items-center justify-center border-2 border-white">
                <span class="material-icons text-3xl">email</span>
              </div>
              <div class="ml-6">
                <p
                  class="text-[10px] font-bold uppercase tracking-[0.2em] text-black dark:text-white opacity-60 mb-0.5">
                  Email
                </p>
                <a
                  href="mailto:okasputra@gmail.com"
                  @click="posthog.capture('email_link_clicked')"
                  class="text-lg md:text-2xl font-bold text-black dark:text-white hover:underline decoration-4 underline-offset-4">
                  okasputra@gmail.com
                </a>
              </div>
            </div>

            <!-- Phone -->
            <div
              class="group flex items-center p-4 bg-primary border-2 border-black dark:border-primary shadow-neo-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
              <div
                class="flex-shrink-0 bg-black text-white p-4 flex items-center justify-center border-2 border-white">
                <span class="material-icons text-3xl">phone</span>
              </div>
              <div class="ml-6">
                <p
                  class="text-[10px] font-bold uppercase tracking-[0.2em] text-black dark:text-white opacity-60 mb-0.5">
                  Phone / WhatsApp
                </p>
                <p
                  class="text-lg md:text-2xl font-bold text-black dark:text-white">
                  +62 822 1641 8397
                </p>
              </div>
            </div>

            <!-- Location -->
            <div
              class="group flex items-center p-4 bg-neo-magenta dark:bg-[#3B82F6] border-2 border-black dark:border-primary shadow-neo-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
              <div
                class="flex-shrink-0 bg-black text-white p-4 flex items-center justify-center border-2 border-white">
                <span class="material-icons text-3xl">map</span>
              </div>
              <div class="ml-6">
                <p
                  class="text-[10px] font-bold uppercase tracking-[0.2em] text-black dark:text-white opacity-60 mb-0.5">
                  Location
                </p>
                <p
                  class="text-lg md:text-2xl font-bold text-black dark:text-black">
                  Pontianak, Indonesia
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Contact Form Area -->
        <div class="relative" ref="formArea">
          <!-- Decorative shape -->
          <div
            class="absolute -top-12 -right-12 w-36 h-36 bg-primary rounded-full border-2 border-black hidden xl:block z-0 animate-pulse shadow-neo-sm"></div>

          <div
            class="relative z-10 bg-white dark:bg-surface-dark border-2 border-black dark:border-primary p-8 md:p-10 shadow-neo-sm dark:shadow-neo">
            <div class="mb-8 border-b-2 border-black dark:border-primary pb-6">
              <h3
                class="text-3xl md:text-4xl font-display font-bold text-black dark:text-white uppercase tracking-tight">
                Send a Message
              </h3>
            </div>

            <form @submit.prevent="submitForm" class="space-y-8">
              <!-- Name -->
              <div class="space-y-3">
                <label
                  class="block text-base font-bold text-black dark:text-white uppercase tracking-wider"
                  for="name"
                  >Name</label
                >
                <input
                  id="name"
                  v-model="form.name"
                  type="text"
                  placeholder="YOUR FULL NAME"
                  class="w-full bg-gray-50 dark:bg-zinc-900 border-2 border-black dark:border-primary text-black dark:text-white p-4 font-bold placeholder-gray-400 focus:ring-0 focus:outline-none focus:border-primary dark:focus:border-primary focus:shadow-neo-sm transition-all"
                  :class="{ 'border-red-500': errors.name }" />
                <p
                  v-if="errors.name"
                  class="text-sm font-bold text-red-600 uppercase">
                  {{ errors.name }}
                </p>
              </div>

              <!-- Email -->
              <div class="space-y-3">
                <label
                  class="block text-base font-bold text-black dark:text-white uppercase tracking-wider"
                  for="email"
                  >Email</label
                >
                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  placeholder="EMAIL@EXAMPLE.COM"
                  class="w-full bg-gray-50 dark:bg-zinc-900 border-2 border-black dark:border-primary text-black dark:text-white p-4 font-bold placeholder-gray-400 focus:ring-0 focus:outline-none focus:border-secondary dark:focus:border-secondary focus:shadow-neo-sm transition-all"
                  :class="{ 'border-red-500': errors.email }" />
                <p
                  v-if="errors.email"
                  class="text-sm font-bold text-red-600 uppercase">
                  {{ errors.email }}
                </p>
              </div>

              <!-- Message -->
              <div class="space-y-3">
                <label
                  class="block text-base font-bold text-black dark:text-white uppercase tracking-wider"
                  for="message"
                  >Message</label
                >
                <textarea
                  id="message"
                  v-model="form.message"
                  rows="5"
                  placeholder="TELL ME ABOUT YOUR PROJECT..."
                  class="w-full bg-gray-50 dark:bg-zinc-900 border-2 border-black dark:border-primary text-black dark:text-white p-4 font-bold placeholder-gray-400 focus:ring-0 focus:outline-none focus:border-primary dark:focus:border-primary focus:shadow-neo-sm transition-all resize-none"
                  :class="{ 'border-red-500': errors.message }"></textarea>
                <p
                  v-if="errors.message"
                  class="text-sm font-bold text-red-600 uppercase">
                  {{ errors.message }}
                </p>
              </div>

              <!-- Submit Button -->
              <div class="pt-4">
                <button
                  type="submit"
                  :disabled="isSubmitting"
                  class="w-full bg-primary hover:bg-white dark:bg-primary dark:hover:bg-secondary text-black dark:text-black hover:text-black dark:hover:text-white font-bold text-xl md:text-2xl uppercase tracking-tight py-4 px-8 border-2 border-black dark:border-primary shadow-neo-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group">
                  <span
                    v-if="isSubmitting"
                    class="animate-spin material-icons text-2xl"
                    >refresh</span
                  >
                  <span>{{
                    isSubmitting ? "Sending..." : "Send Message"
                  }}</span>
                  <span
                    v-if="!isSubmitting"
                    class="material-icons text-3xl group-hover:translate-x-1 transition-transform"
                    >send</span
                  >
                </button>
              </div>

              <!-- Status Messages -->
              <transition name="fade">
                <div
                  v-if="submitStatus === 'success'"
                  class="bg-primary text-black border-4 border-black p-6 font-black text-xl text-center uppercase shadow-neo animate-bounce">
                  ✓ Message Sent Successfully!
                </div>
                <div
                  v-else-if="submitStatus === 'error'"
                  class="bg-red-500 text-white border-4 border-black p-6 font-black text-xl text-center uppercase shadow-neo">
                  × Something went wrong. Try again!
                </div>
              </transition>
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
import { usePostHog } from "@/composables/usePostHog";

gsap.registerPlugin(ScrollTrigger);

const { posthog } = usePostHog();

// Refs
const sectionTitle = ref(null);
const titleUnderline = ref(null);
const contactInfoArea = ref(null);
const formArea = ref(null);

const animations = [];

// Form State
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
const submitStatus = ref(null);

// Validation
const validateForm = () => {
  let isValid = true;
  errors.name = !form.name.trim() ? "Name is required" : "";
  errors.email = !form.email.trim()
    ? "Email is required"
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ? "Invalid email"
    : "";
  errors.message = !form.message.trim()
    ? "Message is required"
    : form.message.length < 10
    ? "Too short (min 10 chars)"
    : "";

  if (errors.name || errors.email || errors.message) isValid = false;
  return isValid;
};

// Submission
const submitForm = async () => {
  if (!validateForm()) return;

  isSubmitting.value = true;
  submitStatus.value = null;

  try {
    const templateParams = {
      name: form.name,
      email: form.email,
      subject: "Portfolio Contact Form",
      message: form.message,
      to_name: "Oka Sutarto Putra",
    };

    await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams,
      EMAILJS_CONFIG.PUBLIC_KEY,
    );

    submitStatus.value = "success";
    posthog.capture("contact_form_sent");

    // Reset
    form.name = "";
    form.email = "";
    form.message = "";

    setTimeout(() => {
      submitStatus.value = null;
    }, 5000);
  } catch (error) {
    console.error("EmailJS Error:", error);
    submitStatus.value = "error";
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  // Title reveal
  animations.push(
    gsap.to(sectionTitle.value, {
      opacity: 1,
      y: 0,
      rotate: -1,
      duration: 1,
      ease: "back.out(1.7)",
      scrollTrigger: {
        trigger: sectionTitle.value,
        start: "top 85%",
        toggleActions: "play none none reverse",
      },
    }),
  );

  animations.push(
    gsap.to(titleUnderline.value, {
      opacity: 1,
      width: "192px",
      duration: 1,
      delay: 0.3,
      ease: "power2.out",
      scrollTrigger: {
        trigger: sectionTitle.value,
        start: "top 85%",
      },
    }),
  );

  // Content reveal
  animations.push(
    gsap.from(contactInfoArea.value, {
      x: -50,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: contactInfoArea.value,
        start: "top 80%",
      },
    }),
  );

  animations.push(
    gsap.from(formArea.value, {
      x: 50,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: formArea.value,
        start: "top 80%",
      },
    }),
  );
});

onBeforeUnmount(() => {
  animations.forEach((a) => a.kill());
  ScrollTrigger.getAll().forEach((t) => t.kill());
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Material Icons vertically centered fix */
.material-icons {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
