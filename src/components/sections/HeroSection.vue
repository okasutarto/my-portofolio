<template>
  <main
    ref="heroRef"
    class="flex-grow flex items-center justify-center relative px-4 sm:px-6 lg:px-8 py-12 lg:py-16 bg-grid-pattern overflow-hidden min-h-[calc(100vh-74px)]">
    <!-- three.js floating shapes, behind the content -->
    <div ref="stageRef" class="absolute inset-0 z-0 pointer-events-none"></div>

    <div
      class="relative z-10 max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-14 items-center">
      <!-- Left column -->
      <div class="lg:col-span-7 text-center lg:text-left order-2">
        <h1 class="sr-only">
          Oka Sutarto Putra, Full Stack Developer &amp; Mobile Engineer
        </h1>

        <span
          class="hero-in inline-flex items-center gap-2.5 bg-white dark:bg-surface-dark border-2 border-black dark:border-[#f4ead5] shadow-neo-sm px-3.5 py-1.5 font-bold text-sm md:text-base text-black dark:text-white"
          :class="{ show: shown.status }">
          <i class="live-dot"></i> Now: Mobile Engineer @ Dusitek
        </span>

        <p
          class="headline font-body font-bold text-black dark:text-white mx-auto lg:mx-0"
          :class="{ show: shown.headline }">
          <template v-for="(word, index) in headlineWords" :key="index">
            <span class="word"
              ><span :class="{ hl: word.highlight }">{{ word.text }}</span></span
            >{{ " " }}
          </template>
        </p>

        <!-- Terminal card -->
        <div
          class="hero-in terminal bg-[#111] dark:bg-[#0d0b09] max-w-[470px] mx-auto lg:mx-0 text-left border-2 border-black dark:border-[#f4ead5] shadow-[6px_6px_0_var(--color-secondary)]"
          :class="{ show: shown.terminal }"
          aria-label="Roles and current focus">
          <div
            class="flex items-center gap-[7px] px-3 py-2 border-b-2 border-black dark:border-[#f4ead5] bg-white dark:bg-surface-dark text-black dark:text-white text-xs font-bold">
            <i class="term-dot bg-accent-pink"></i>
            <i class="term-dot bg-neo-yellow"></i>
            <i class="term-dot bg-secondary"></i>
            <span class="ml-2 opacity-70">oka@portfolio: ~</span>
          </div>
          <div class="terminal-body">
            <template v-for="(line, index) in termLines" :key="index">
              <span :class="line.prompt ? 'text-primary' : 'text-secondary'">{{
                line.prompt ? "$" : ">"
              }}</span>
              {{ line.text
              }}<span v-if="line.caret" class="hero-caret">▌</span>{{ "\n" }}
            </template>
          </div>
        </div>

        <div
          class="hero-in flex flex-col sm:flex-row gap-5 justify-center lg:justify-start mt-8"
          :class="{ show: shown.ctas }">
          <a
            class="group inline-flex items-center justify-center gap-3 px-7 py-4 text-base font-bold text-black bg-primary border-2 border-black dark:border-[#f4ead5] font-display uppercase shadow-neo hover:shadow-none hover:translate-x-[5px] hover:translate-y-[5px] transition-all"
            href="#projects">
            View my work
            <i
              class="fas fa-arrow-right group-hover:translate-x-1 group-hover:-rotate-12 transition-transform"></i>
          </a>
          <a
            class="group inline-flex items-center justify-center gap-3 px-7 py-4 text-base font-bold text-black bg-white border-2 border-black dark:border-[#f4ead5] font-display uppercase shadow-neo hover:shadow-none hover:translate-x-[5px] hover:translate-y-[5px] transition-all"
            href="#contact">
            Get in touch
            <i
              class="fas fa-paper-plane group-hover:translate-x-1 group-hover:-rotate-12 transition-transform"></i>
          </a>
        </div>

        <div
          class="hero-in flex flex-wrap gap-3.5 items-center justify-center lg:justify-start mt-7"
          :class="{ show: shown.socials }">
          <span
            class="font-bold text-xs uppercase tracking-[0.15em] text-black/70 dark:text-white/70 mr-1"
            >Find me</span
          >
          <a
            v-for="social in socials"
            :key="social.icon"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="social.label"
            class="w-12 h-12 flex items-center justify-center border-2 border-black dark:border-[#f4ead5] bg-white dark:bg-surface-dark text-black dark:text-white shadow-neo-sm hover:translate-x-[3px] hover:translate-y-[3px] hover:-rotate-6 hover:shadow-none hover:bg-primary hover:text-black dark:hover:bg-primary dark:hover:text-black transition-all"
            :href="social.link">
            <i :class="['fab', social.icon, 'text-xl']"></i>
          </a>
        </div>
      </div>

      <!-- Portrait -->
      <div
        class="lg:col-span-5 relative order-1"
        style="perspective: 900px">
        <div
          ref="portraitRef"
          class="relative w-[78%] max-w-[330px] lg:w-full lg:max-w-md aspect-square mx-auto mt-16 mb-14 lg:my-0 will-change-transform"
          style="transform-style: preserve-3d">
          <div
            class="back-block absolute inset-0 bg-secondary border-2 border-black dark:border-[#f4ead5]"
            :class="{ show: shown.backBlock }"></div>

          <!-- Frame: halftone comic panel, slapped on like a sticker -->
          <div
            class="frame portrait-halftone absolute inset-0 bg-primary border-2 border-black dark:border-[#f4ead5] shadow-neo"
            :class="{ show: shown.frame }"></div>

          <!-- Clip only below the frame's bottom edge: the photo rises from inside the frame -->
          <div class="photo-clip absolute inset-0" style="transform: translateZ(40px)">
            <img
              alt="Oka Sutarto Putra"
              width="668"
              height="900"
              fetchpriority="high"
              class="photo portrait-cutout"
              :class="{ up: shown.photo }"
              src="/images/oka-portrait.png" />
          </div>

          <!-- Comic speech bubble -->
          <div
            class="bubble font-display font-bold text-sm md:text-base text-black dark:text-white bg-white dark:bg-surface-dark border-[3px] border-black dark:border-[#f4ead5] shadow-neo"
            :class="{ pop: shown.bubble }"
            aria-hidden="true">
            {{ bubbleText
            }}<span v-if="bubbleDone" class="wave">👋</span
            ><span v-else class="hero-caret">_</span>
          </div>

          <div
            class="years absolute -bottom-9 -left-6 bg-black text-white dark:bg-primary dark:text-black px-5 py-3 border-2 border-primary shadow-neo font-display font-bold text-base md:text-lg"
            :class="{ show: shown.years }">
            4+ YEARS EXP.
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from "vue";
import { sfx } from "@/composables/useSfx";

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

const headlineWords = [
  { text: "Turning" },
  { text: "complex" },
  { text: "problems" },
  { text: "into" },
  { text: "elegant code.", highlight: true },
];

const roles = ["Full Stack Developer", "Mobile Engineer", "AI Enthusiast"];
const GREETING = "Hi there, I'm Oka! ";

const heroRef = ref(null);
const stageRef = ref(null);
const portraitRef = ref(null);
const termLines = ref([]);
const bubbleText = ref("");
const bubbleDone = ref(false);
const shown = reactive({
  status: false,
  headline: false,
  terminal: false,
  ctas: false,
  socials: false,
  backBlock: false,
  frame: false,
  photo: false,
  bubble: false,
  years: false,
});

let alive = true;
let heroScene = null;
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, reducedMotion ? 0 : ms));

const typeInto = async (setter, text, speed = 38, sound = true) => {
  for (let i = 1; i <= text.length && alive; i++) {
    setter(text.slice(0, i));
    if (sound && text[i - 1] !== " ") sfx.key();
    await wait(speed);
  }
};

// Terminal: types `whoami` and `focus --now`, then keeps cycling the role line
const runTerminal = async () => {
  const lines = termLines.value;
  lines.push({ prompt: true, text: "" });
  await typeInto((t) => (lines[0].text = t), "whoami");
  lines.push({ prompt: false, text: "", caret: true });
  await typeInto((t) => (lines[1].text = t), roles[0]);
  await wait(300);
  lines.push({ prompt: true, text: "" });
  await typeInto((t) => (lines[2].text = t), "focus --now");
  lines.push({ prompt: false, text: "AI · Web · Mobile" });

  let roleIndex = 0;
  while (alive && !reducedMotion) {
    await wait(2200);
    for (let n = lines[1].text.length; n >= 0 && alive; n--) {
      lines[1].text = lines[1].text.slice(0, n);
      await wait(22);
    }
    roleIndex = (roleIndex + 1) % roles.length;
    await typeInto((t) => (lines[1].text = t), roles[roleIndex], 60, false);
  }
};

const introContent = async () => {
  shown.status = true;
  await wait(150);
  shown.headline = true;
  await wait(700);
  shown.terminal = true;
  runTerminal();
  await wait(250);
  shown.ctas = true;
  await wait(150);
  shown.socials = true;
};

const introPortrait = async () => {
  await wait(300);
  shown.backBlock = true;
  await wait(120);
  shown.frame = true;
  await wait(550);
  shown.photo = true;
  await wait(850);
  shown.bubble = true;
  sfx.pop();
  // The portrait gets the spotlight first; the rest of the hero follows once Oka says hi
  introContent();
  await wait(250);
  await typeInto((t) => (bubbleText.value = t), GREETING, 50);
  bubbleDone.value = true;
  shown.years = true;
};

// Portrait tilts toward the cursor
const onMouseMove = (e) => {
  const rect = heroRef.value.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  portraitRef.value.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
};
const onMouseLeave = () => {
  portraitRef.value.style.transform = "";
};

const supportsWebGL = () => {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch (e) {
    return false;
  }
};

const loadScene = async () => {
  // three.js comes in after the hero content has painted
  const { createHeroScene } = await import(
    /* webpackChunkName: "hero-scene" */ "@/components/features/hero/heroScene"
  );
  if (!alive || !stageRef.value) return;
  heroScene = createHeroScene({
    container: stageRef.value,
    hero: heroRef.value,
    reducedMotion,
  });
};

onMounted(() => {
  introPortrait();

  if (!reducedMotion) {
    heroRef.value.addEventListener("mousemove", onMouseMove);
    heroRef.value.addEventListener("mouseleave", onMouseLeave);
  }
  if (supportsWebGL()) {
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 300));
    idle(() => loadScene());
  }
});

onUnmounted(() => {
  alive = false;
  if (heroScene) heroScene.destroy();
  if (heroRef.value) {
    heroRef.value.removeEventListener("mousemove", onMouseMove);
    heroRef.value.removeEventListener("mouseleave", onMouseLeave);
  }
});
</script>

<style scoped>
/* ---------- Content intro ---------- */
.hero-in {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.5s,
    transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.hero-in.show {
  opacity: 1;
  transform: none;
}

.live-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  animation: ping 1.6s infinite;
}
@keyframes ping {
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6);
  }
  70%,
  100% {
    box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
  }
}

/* ---------- Headline ---------- */
.headline {
  font-size: clamp(2.1rem, 10vw, 3rem);
  line-height: 1.08;
  letter-spacing: -0.03em;
  margin: 24px auto 30px;
  max-width: 15ch;
}
@media (min-width: 1024px) {
  .headline {
    font-size: clamp(2.4rem, 4.6vw, 4.1rem);
    margin-inline: 0;
  }
}
/* Words slide up from a mask; clip only the bottom so the highlighter can overflow */
.word {
  display: inline-block;
  vertical-align: top;
  padding: 0 0.02em 0.08em;
  clip-path: inset(-60% -30% -0.25em -30%);
}
.word > span {
  display: inline-block;
  transform: translateY(135%);
  transition: transform 0.7s cubic-bezier(0.22, 1.2, 0.36, 1);
}
.headline.show .word > span {
  transform: none;
}
/* Highlighter stroke draws in from the left after the words land */
.word > .hl {
  padding: 0 0.04em;
  background: linear-gradient(var(--color-primary), var(--color-primary))
    no-repeat 0 88% / 0% 36%;
  transition:
    transform 0.7s cubic-bezier(0.22, 1.2, 0.36, 1),
    background-size 0.7s 1.1s cubic-bezier(0.6, 0, 0.2, 1);
}
.headline.show .word > .hl {
  background-size: 100% 36%;
}

/* ---------- Terminal ---------- */
.terminal {
  color: #f4ead5;
}
.term-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 1.5px solid #000;
}
.terminal-body {
  padding: 14px 18px;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 0.95rem;
  line-height: 1.75;
  white-space: pre-wrap;
  min-height: 7.4em;
}

/* ---------- Portrait ---------- */
.back-block {
  opacity: 0;
  transform: translate(0, 0);
  transition:
    transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.2s;
}
.back-block.show {
  opacity: 1;
  transform: translate(16px, 16px);
}
.frame {
  opacity: 0;
  transform: scale(0.3) rotate(-14deg);
  transition:
    transform 0.65s cubic-bezier(0.34, 1.7, 0.64, 1),
    opacity 0.2s;
}
.frame.show {
  opacity: 1;
  transform: none;
}
.portrait-halftone {
  background-image: radial-gradient(
    circle,
    rgba(0, 0, 0, 0.28) 1.6px,
    transparent 1.8px
  );
  background-size: 12px 12px;
}
.photo-clip {
  clip-path: inset(-40% -20% 0 -20%);
}
.photo {
  position: absolute;
  left: 50%;
  bottom: 0;
  height: 118%;
  width: auto;
  max-width: none;
  transform: translate(-50%, 102%);
}
.photo.up {
  animation: rise 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes rise {
  from {
    transform: translate(-50%, 102%);
  }
  to {
    transform: translate(-50%, 0);
  }
}
/* Sticker-style cutout: thick black outline + hard offset shadow */
.portrait-cutout {
  filter: drop-shadow(3px 0 0 #000) drop-shadow(-3px 0 0 #000)
    drop-shadow(0 3px 0 #000) drop-shadow(0 -3px 0 #000)
    drop-shadow(8px 8px 0 var(--color-shadow));
}

.bubble {
  position: absolute;
  left: -8%;
  top: -24%;
  z-index: 5;
  padding: 10px 16px;
  white-space: nowrap;
  min-width: 12.5ch;
  --tilt: -6deg;
  transform: translateZ(90px) scale(0) rotate(var(--tilt));
  transform-origin: 85% 110%;
}
/* Desktop: the portrait sits on the left edge, so the bubble talks out to the right */
@media (min-width: 1024px) {
  .bubble {
    left: auto;
    right: -4%;
    top: -19%;
    padding: 12px 18px;
    --tilt: 6deg;
    transform-origin: 15% 110%;
  }
}
.bubble::after {
  content: "";
  position: absolute;
  right: 22px;
  bottom: -19px;
  width: 26px;
  height: 26px;
  background: inherit;
  border-right: inherit;
  border-bottom: inherit;
  transform: skewX(-25deg) rotate(45deg);
}
@media (min-width: 1024px) {
  .bubble::after {
    right: auto;
    left: 22px;
    transform: skewX(25deg) rotate(45deg);
  }
}
.bubble.pop {
  animation: pop 0.5s cubic-bezier(0.34, 1.8, 0.64, 1) forwards;
}
@keyframes pop {
  to {
    transform: translateZ(90px) scale(1) rotate(var(--tilt));
  }
}
.wave {
  display: inline-block;
  transform-origin: 70% 70%;
  animation: wave 1.6s ease-in-out infinite;
}
@keyframes wave {
  0%,
  60%,
  100% {
    transform: rotate(0);
  }
  10%,
  30% {
    transform: rotate(16deg);
  }
  20%,
  40% {
    transform: rotate(-8deg);
  }
}

.years {
  transform: translateZ(70px) rotate(-3deg) scale(0);
  transition: transform 0.45s cubic-bezier(0.34, 1.9, 0.64, 1);
}
.years.show {
  transform: translateZ(70px) rotate(-3deg) scale(1);
}

.hero-caret {
  animation: blink 1s steps(1) infinite;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-in,
  .word > span,
  .hl,
  .back-block,
  .frame,
  .years {
    transition: none !important;
  }
  .photo.up,
  .bubble.pop {
    animation-duration: 0s;
  }
}
</style>
