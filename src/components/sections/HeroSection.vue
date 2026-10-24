<template>
  <main
    ref="heroRef"
    class="flex-grow flex bg-background-light dark:bg-background-dark items-center justify-center relative px-4 sm:px-6 lg:px-8 py-12 lg:py-16 bg-grid-pattern overflow-hidden">
    <!-- Draggable Stickers -->
    <div
      v-for="(sticker, index) in stickers"
      :key="sticker.label"
      :ref="
        (el) => {
          if (el) stickerEls[index] = el;
        }
      "
      class="hero-sticker absolute z-30 hidden lg:block select-none touch-none font-display font-bold border-2 border-black dark:border-primary shadow-neo-sm px-3 py-1.5 text-xs sm:text-sm uppercase cursor-grab active:cursor-grabbing"
      :class="[sticker.class, sticker.position]"
      :style="{ '--r': sticker.rotate }">
      {{ sticker.label }}
    </div>

    <div
      class="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-14 items-center z-10">
      <!-- Left Column -->
      <div class="contents lg:flex lg:flex-col lg:col-span-7 lg:space-y-10">
        <!-- Greeting & Name -->
        <div class="flex flex-col space-y-6 text-center lg:text-left order-1">
          <div class="relative w-fit mx-auto lg:mx-0">
            <div
              class="absolute -top-6 -left-8 w-16 h-16 bg-primary border-4 border-black dark:border-primary rounded-full hidden lg:block animate-bounce shadow-neo -z-10"></div>
            <div
              ref="greetingRef"
              class="inline-block bg-black text-white dark:bg-white dark:text-black px-4 py-2 font-black font-display transform -rotate-2 w-fit border-2 border-transparent">
              👋 Hi there, I'm
            </div>
          </div>

          <h1
            class="text-5xl sm:text-7xl lg:text-8xl font-display font-bold leading-[0.95] tracking-tighter text-black dark:text-white drop-shadow-[4px_4px_0px_var(--color-secondary)] dark:drop-shadow-[6px_6px_0px_var(--color-primary)]"
            aria-label="Oka Sutarto Putra">
            <span
              v-for="(word, wIndex) in nameWords"
              :key="word"
              class="block overflow-hidden pb-1 whitespace-nowrap"
              aria-hidden="true">
              <span
                v-for="(char, cIndex) in word"
                :key="cIndex"
                class="hero-letter inline-block hover:text-primary dark:hover:text-secondary hover:-translate-y-2 hover:-rotate-6 transition-[color,transform] duration-150"
                :data-word="wIndex">
                {{ char }}
              </span>
            </span>
          </h1>
        </div>

        <!-- Badges, Description, CTAs, Socials -->
        <div
          ref="detailsRef"
          class="flex flex-col space-y-6 text-center lg:text-left order-3">
          <div
            class="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 text-xl font-bold">
            <span
              class="bg-secondary dark:bg-primary px-3 py-1 border-2 border-black dark:border-primary shadow-neo-sm text-black">
              &lt;Full Stack Developer /&gt;
            </span>
            <span
              class="bg-white dark:bg-surface-dark px-3 py-1 border-2 border-black dark:border-primary shadow-neo-sm text-black dark:text-white min-w-[13ch]">
              <span class="text-neo-magenta dark:text-primary">&gt;</span>
              {{ typedRole }}<span class="hero-caret">_</span>
            </span>
          </div>

          <p
            class="text-lg sm:text-xl max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed border-l-4 border-primary dark:border-secondary pl-6 dark:text-gray-100 text-left">
            Turning complex problems into elegant, brutalist code. Currently
            exploring the intersection of
            <strong
              class="bg-primary/60 dark:bg-secondary/60 px-1 box-decoration-clone"
              >AI, web, and mobile development</strong
            >
            to build the next generation of digital experiences.
          </p>

          <div
            class="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start pt-2">
            <a
              class="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-black transition-all duration-200 bg-primary dark:bg-secondary border-2 border-black dark:border-primary font-display focus:outline-none shadow-neo hover:shadow-none hover:translate-x-[5px] hover:translate-y-[5px]"
              href="#projects">
              <i
                class="fas fa-briefcase mr-3 group-hover:-rotate-12 transition-transform"></i>
              View My Work
            </a>
            <a
              class="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-black bg-white transition-all duration-200 border-2 border-black dark:border-primary dark:bg-primary font-display focus:outline-none shadow-neo hover:shadow-none hover:translate-x-[5px] hover:translate-y-[5px]"
              href="#contact">
              <i
                class="fas fa-paper-plane mr-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"></i>
              Get In Touch
            </a>
          </div>

          <div class="flex gap-4 justify-center lg:justify-start pt-4">
            <a
              v-for="social in socials"
              :key="social.icon"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="social.label"
              class="w-12 h-12 flex items-center justify-center border-2 border-black bg-white dark:bg-surface-dark dark:border-primary shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-primary dark:hover:bg-primary dark:hover:text-black transition-all group"
              :href="social.link">
              <i
                :class="[
                  'fab',
                  social.icon,
                  'text-xl group-hover:scale-110 transition-transform',
                ]"></i>
            </a>
          </div>
        </div>
      </div>

      <!-- Portrait -->
      <div
        class="lg:col-span-5 relative mt-0 lg:mt-0 order-2 lg:order-none"
        style="perspective: 900px">
        <div
          ref="portraitRef"
          class="group/portrait relative w-full aspect-square max-w-[280px] sm:max-w-xs lg:max-w-md mx-auto mt-10 mb-8 lg:my-0 will-change-transform"
          style="transform-style: preserve-3d">
          <div
            class="absolute inset-0 bg-secondary dark:bg-primary translate-x-4 translate-y-4 border-2 border-black dark:border-primary shadow-neo-sm"></div>

          <div
            class="absolute -bottom-10 -right-8 w-24 h-24 bg-transparent border-4 border-black dark:border-primary rotate-12 hidden lg:block shadow-neo -z-10"></div>

          <!-- Frame: halftone comic panel -->
          <div
            class="portrait-halftone absolute inset-0 bg-primary dark:bg-secondary border-2 border-black dark:border-primary overflow-hidden shadow-neo">
            <div
              class="absolute inset-0 flex items-center justify-center font-display font-bold text-[5.5rem] sm:text-[7rem] lg:text-[9rem] leading-none text-transparent select-none"
              style="-webkit-text-stroke: 2px rgba(0, 0, 0, 0.25)"
              aria-hidden="true">
              HI!
            </div>
          </div>

          <!-- Cutout photo popping out of the frame -->
          <div
            class="portrait-cutout absolute inset-x-0 bottom-0 h-[118%] flex justify-center pointer-events-none"
            style="transform: translateZ(50px)">
            <img
              ref="photoRef"
              alt="Oka Sutarto Putra"
              width="668"
              height="900"
              fetchpriority="high"
              class="h-full w-auto origin-bottom grayscale contrast-125 group-hover/portrait:grayscale-0 group-hover/portrait:contrast-100 [@media(hover:none)]:grayscale-0 [@media(hover:none)]:contrast-100 transition-[filter] duration-500"
              src="/images/oka-portrait.png" />
          </div>

          <div
            class="absolute -top-6 -right-6 bg-white dark:bg-surface-dark border-2 border-black dark:border-primary p-4 shadow-neo-sm rotate-3 z-20"
            style="transform: translateZ(70px) rotate(3deg)">
            <i class="fas fa-mobile-alt text-2xl text-black dark:text-primary"></i>
          </div>
          <div
            class="absolute -bottom-10 -left-6 bg-black text-white dark:text-black dark:bg-primary px-6 py-3 border-2 border-primary dark:border-primary shadow-neo font-display font-bold text-lg z-20"
            style="transform: translateZ(80px) rotate(-3deg)">
            3+ YEARS EXP.
          </div>
        </div>
      </div>
    </div>

    <!-- Drag hint -->
    <div
      class="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-black/60 dark:text-white/60 pointer-events-none hidden lg:block">
      psst, the stickers are draggable ✦
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";

gsap.registerPlugin(Draggable);

const socials = [
  { icon: "fa-github", label: "GitHub", link: "https://github.com/okasutarto" },
  {
    icon: "fa-linkedin-in",
    label: "LinkedIn",
    link: "https://linkedin.com/in/okasutarto",
  },
  {
    icon: "fa-instagram",
    label: "Instagram",
    link: "https://instagram.com/okasp.dev",
  },
  { icon: "fa-tiktok", label: "TikTok", link: "https://tiktok.com/@okasp.dev" },
];

const stickers = [
  {
    label: "Vue.js ♥",
    class: "bg-secondary text-black",
    position: "top-[10%] left-[46%]",
    rotate: "-8deg",
  },
  {
    label: "★ Now @Dusitek",
    class: "bg-neo-magenta text-white",
    position: "top-[8%] right-[6%]",
    rotate: "6deg",
  },
  {
    label: "AI ✦ Builder",
    class: "bg-primary text-black",
    position: "bottom-[10%] right-[38%]",
    rotate: "-5deg",
  },
  {
    label: "Flutter ✦",
    class: "bg-white dark:bg-surface-dark text-black dark:text-white",
    position: "bottom-[16%] left-[3%]",
    rotate: "9deg",
  },
];

const nameWords = ["OKA", "SUTARTO", "PUTRA"];
const roles = ["Mobile Engineer", "AI Enthusiast", "Problem Solver"];

const heroRef = ref(null);
const greetingRef = ref(null);
const detailsRef = ref(null);
const portraitRef = ref(null);
const photoRef = ref(null);
const stickerEls = [];
const typedRole = ref("");

let draggables = [];
let typingTimer = null;
let ctx = null;

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Typewriter loop over the roles
const startTyping = () => {
  let roleIndex = 0;
  let charIndex = 0;
  let deleting = false;

  const tick = () => {
    const role = roles[roleIndex];
    charIndex += deleting ? -1 : 1;
    typedRole.value = role.slice(0, charIndex);

    let delay = deleting ? 40 : 90;
    if (!deleting && charIndex === role.length) {
      deleting = true;
      delay = 1800;
    } else if (deleting && charIndex === 0) {
      deleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      delay = 300;
    }
    typingTimer = setTimeout(tick, delay);
  };
  tick();
};

// Subtle 3D tilt that follows the cursor
const onMouseMove = (e) => {
  if (!portraitRef.value) return;
  const rect = heroRef.value.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  gsap.to(portraitRef.value, {
    rotateY: x * 14,
    rotateX: -y * 14,
    duration: 0.6,
    ease: "power2.out",
  });
};

const onMouseLeave = () => {
  gsap.to(portraitRef.value, { rotateY: 0, rotateX: 0, duration: 0.8 });
};

onMounted(() => {
  if (reducedMotion()) {
    typedRole.value = roles[0];
    gsap.set(stickerEls, { rotate: (i) => stickers[i].rotate });
  } else {
    startTyping();

    ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      tl.from(greetingRef.value, {
        y: 30,
        opacity: 0,
        rotate: -12,
        duration: 0.6,
      })
        .from(
          ".hero-letter",
          {
            yPercent: 110,
            rotate: 8,
            duration: 0.7,
            stagger: 0.035,
            clearProps: "transform",
          },
          "-=0.3",
        )
        .from(
          detailsRef.value.children,
          { y: 30, opacity: 0, duration: 0.6, stagger: 0.08 },
          "-=0.4",
        )
        .from(
          portraitRef.value,
          { scale: 0.8, opacity: 0, rotate: 6, duration: 0.8 },
          "-=0.9",
        )
        // Photo springs up out of the frame
        .from(
          photoRef.value,
          { yPercent: 35, scaleY: 0.85, duration: 0.7, ease: "back.out(2)" },
          "-=0.35",
        )
        .fromTo(
          stickerEls,
          { scale: 0, rotate: 0 },
          {
            scale: 1,
            rotate: (i) => stickers[i].rotate,
            duration: 0.5,
            stagger: 0.1,
            ease: "back.out(2.5)",
          },
          "-=0.4",
        );
    }, heroRef.value);

    heroRef.value.addEventListener("mousemove", onMouseMove);
    heroRef.value.addEventListener("mouseleave", onMouseLeave);
  }

  draggables = Draggable.create(stickerEls, {
    bounds: heroRef.value,
    inertia: false,
    onPress() {
      gsap.to(this.target, { scale: 1.12, rotate: 0, duration: 0.2 });
      this.target.style.zIndex = 40;
    },
    onRelease() {
      gsap.to(this.target, {
        scale: 1,
        rotate: gsap.utils.random(-10, 10),
        duration: 0.4,
        ease: "back.out(3)",
      });
      this.target.style.zIndex = "";
    },
  });
});

onUnmounted(() => {
  clearTimeout(typingTimer);
  draggables.forEach((d) => d.kill());
  if (ctx) ctx.revert();
  if (heroRef.value) {
    heroRef.value.removeEventListener("mousemove", onMouseMove);
    heroRef.value.removeEventListener("mouseleave", onMouseLeave);
  }
});
</script>

<style scoped>
.hero-sticker {
  transform: rotate(var(--r));
}

.portrait-halftone {
  background-image: radial-gradient(
    circle,
    rgba(0, 0, 0, 0.28) 1.6px,
    transparent 1.8px
  );
  background-size: 12px 12px;
}

/* Sticker-style cutout: thick black outline + hard offset shadow */
.portrait-cutout {
  filter: drop-shadow(3px 0 0 #000) drop-shadow(-3px 0 0 #000)
    drop-shadow(0 3px 0 #000) drop-shadow(0 -3px 0 #000)
    drop-shadow(8px 8px 0 var(--color-shadow));
}

.hero-caret {
  animation: blink 1s steps(1) infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
