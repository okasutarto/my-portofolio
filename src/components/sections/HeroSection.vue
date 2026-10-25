<template>
  <main
    ref="heroRef"
    :class="{ 'intro-paused': !introReady }"
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

        <!-- Live status: what Oka is up to, and the time in Pontianak -->
        <div class="hero-in status" :class="{ show: shown.status }">
          <span class="status-now">
            <i class="live-dot"></i>
            <span class="ticker">
              <span
                v-for="(status, i) in STATUSES"
                :key="status"
                :class="{ on: i === statusIndex, gone: i === prevStatus }"
                :aria-hidden="i !== statusIndex">
                {{ status }}
              </span>
            </span>
          </span>
          <span class="status-clock" :title="`Local time in Pontianak`">
            <i class="far fa-clock"></i>{{ clock.h }}<span class="colon">:</span>{{ clock.m }} WIB
          </span>
        </div>

        <!-- Headline: words land one by one, "complex" gets scribbled out, the code gets shipped -->
        <p
          class="headline font-body font-bold text-black dark:text-white mx-auto lg:mx-0"
          :class="{ show: shown.headline }"
          @animationstart="onHeadlineAnimation">
          <span class="w" style="--i: 0">Turning</span>{{ " " }}
          <span class="w scribbled" style="--i: 1"
            >complex<svg class="scribble" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M6 60 C 40 20, 70 85, 105 45 S 160 15, 190 60 S 250 85, 294 35 M 20 80 C 80 40, 140 90, 200 50 S 270 30, 290 70" />
            </svg>
            <span class="scribble-note" aria-hidden="true">not anymore</span></span
          >{{ " " }}
          <span class="w" style="--i: 2">problems</span>{{ " " }}
          <span class="w" style="--i: 3">into</span>{{ " " }}
          <span class="w code" style="--i: 4"
            ><span class="hl">elegant&nbsp;code.</span><i class="caret" aria-hidden="true"></i
            ><span class="code-tag" aria-hidden="true">&lt;/&gt; ship it</span></span
          >
        </p>

        <!-- Terminal: really takes commands (help, projects, sudo hire-oka, ...) -->
        <div
          class="hero-in terminal bg-[#111] dark:bg-[#0d0b09] max-w-[520px] mx-auto lg:mx-0 text-left border-2 border-black dark:border-[#f4ead5] shadow-[6px_6px_0_var(--color-secondary)]"
          :class="{ show: shown.terminal }"
          @click="focusTerminal">
          <div
            class="flex items-center gap-[7px] px-3 py-2 border-b-2 border-black dark:border-[#f4ead5] bg-white dark:bg-surface-dark text-black dark:text-white text-xs font-bold">
            <i class="term-dot bg-accent-pink"></i>
            <i class="term-dot bg-neo-yellow"></i>
            <i class="term-dot bg-secondary"></i>
            <span class="ml-2 opacity-70">oka@portfolio: ~</span>
            <span class="ml-auto opacity-55 font-semibold">try typing ↓</span>
          </div>
          <div ref="termBodyRef" class="terminal-body" role="log" aria-live="polite">
            <p v-for="(line, index) in termLines" :key="index">
              <span v-for="(seg, j) in line" :key="j" :class="seg.c">{{ seg.t }}</span>
            </p>
            <label class="term-input">
              <span class="text-primary">$</span>
              <input
                ref="termInputRef"
                v-model="termInput"
                type="text"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                aria-label="Terminal: type a command, for example help"
                @keydown="onTermKey" />
            </label>
          </div>
        </div>

        <!-- Buttons as keycaps -->
        <div
          class="hero-in flex flex-col sm:flex-row gap-5 justify-center lg:justify-start mt-9"
          :class="{ show: shown.ctas }">
          <a class="keycap" href="#projects" @click="sfx.key()">
            <small aria-hidden="true">↵</small>
            View my work
            <i class="fas fa-arrow-right"></i>
          </a>
          <a class="keycap keycap-light" href="#contact" @click="sfx.key()">
            <small aria-hidden="true">⌘K</small>
            Get in touch
            <i class="fas fa-paper-plane"></i>
          </a>
        </div>

        <div
          class="hero-in flex flex-wrap gap-3.5 items-center justify-center lg:justify-start mt-8"
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
            class="keycap keycap-sm"
            :href="social.link"
            @click="sfx.key()">
            <i :class="['fab', social.icon]"></i>
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
import { ref, reactive, inject, watch, nextTick, onMounted, onUnmounted } from "vue";
import { sfx } from "@/composables/useSfx";
import { projects } from "@/data/projects";

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

const STATUSES = ["Now: Mobile Engineer @ Dusitek", "Shipping Flutter apps", "Open to a chat ☕", "Based in Pontianak, ID"];
const GREETING = "Hi there, I'm Oka! ";

const introReady = inject("introReady", ref(true));
const heroRef = ref(null);
const stageRef = ref(null);
const portraitRef = ref(null);
const termLines = ref([]);
const termInput = ref("");
const termBodyRef = ref(null);
const termInputRef = ref(null);
const statusIndex = ref(0);
const prevStatus = ref(-1);
const clock = reactive({ h: "--", m: "--" });
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

// ---------- status chip: rotating status line + Pontianak clock ----------
const pad = (n) => String(n).padStart(2, "0");
const tickClock = () => {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Pontianak" }));
  clock.h = pad(now.getHours());
  clock.m = pad(now.getMinutes());
};
const nextStatus = () => {
  prevStatus.value = statusIndex.value;
  statusIndex.value = (statusIndex.value + 1) % STATUSES.length;
};

// ---------- terminal: a tiny shell that takes real commands ----------
// Each line is a list of segments: { t: text, c: class }
const say = (...segs) => {
  termLines.value.push(segs.map((seg) => (typeof seg === "string" ? { t: seg } : seg)));
  nextTick(() => termBodyRef.value && (termBodyRef.value.scrollTop = termBodyRef.value.scrollHeight));
};
const out = (text) => say({ t: "> ", c: "text-secondary" }, text);
const note = (text) => say({ t: text, c: "dim" });
const goTo = (id) => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 700);

const COMMANDS = {
  help: () => {
    say({ t: "commands ", c: "text-secondary" }, "whoami · about · experience · skills · projects · contact · sudo hire-oka · clear");
  },
  whoami: () => out("Oka Sutarto Putra, Mobile Engineer @ Dusitek"),
  about: () => {
    out("4+ years building web & mobile. Flutter by day, Vue at heart.");
    note("→ scrolling to About…");
    goTo("about");
  },
  experience: () => {
    out("Dusitek · Jublia · and a few more stops along the way");
    note("→ scrolling to the timeline…");
    goTo("experience");
  },
  skills: () => out("Flutter · Dart · Vue · Node.js · PostgreSQL · OpenAI"),
  projects: () => {
    projects.forEach((p, i) => say({ t: `${pad(i + 1)} `, c: "text-secondary" }, p.title));
    note("→ scrolling to Projects…");
    goTo("projects");
  },
  contact: () => {
    out("okasputra@gmail.com");
    note("→ opening the postcard…");
    goTo("contact");
  },
  "sudo hire-oka": () => {
    note("[sudo] password for recruiter: ********");
    setTimeout(() => {
      say({ t: "ACCESS GRANTED ✓", c: "granted" });
      sfx.stamp();
    }, 450);
    setTimeout(() => {
      note("→ opening the postcard…");
      goTo("contact");
    }, 900);
  },
  clear: () => {
    termLines.value = [];
  },
};

const history = [];
let historyIndex = -1;
const runCommand = (raw) => {
  const cmd = raw.trim().toLowerCase().replace(/\s+/g, " ");
  say({ t: "$ ", c: "text-primary" }, raw);
  if (!cmd) return;
  history.unshift(cmd);
  historyIndex = -1;
  const command = COMMANDS[cmd];
  if (command) command();
  else {
    say({ t: `command not found: ${cmd}`, c: "err" }, { t: " · try 'help'", c: "dim" });
    sfx.buzz();
  }
};
const onTermKey = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sfx.key();
    runCommand(termInput.value);
    termInput.value = "";
  } else if (e.key === "ArrowUp" && history.length) {
    e.preventDefault();
    historyIndex = Math.min(historyIndex + 1, history.length - 1);
    termInput.value = history[historyIndex];
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    historyIndex = Math.max(historyIndex - 1, -1);
    termInput.value = historyIndex < 0 ? "" : history[historyIndex];
  } else if (e.key.length === 1 || e.key === "Backspace") {
    sfx.key();
  }
};
// Clicking anywhere on the terminal puts the cursor in the prompt (unless selecting text)
const focusTerminal = () => {
  if (!window.getSelection()?.toString()) termInputRef.value?.focus({ preventScroll: true });
};

// Boot: "types" whoami at the prompt like someone at the keyboard, then hints that it's live
const bootTerminal = async () => {
  for (const ch of "whoami") {
    if (!alive) return;
    termInput.value += ch;
    sfx.key();
    await wait(70);
  }
  await wait(160);
  runCommand(termInput.value);
  termInput.value = "";
  await wait(350);
  say({ t: "psst… this terminal works. type ", c: "dim" }, { t: "help", c: "text-primary" }, { t: " ↵", c: "dim" });
};

// Follow CSS animation events so sound stays in sync with the actual word/marker timing.
const heroSound = (name, options) => {
  if (!alive || !introReady.value || !heroRef.value || reducedMotion) return;
  const rect = heroRef.value.getBoundingClientRect();
  if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
  sfx[name](options);
};
const onHeadlineAnimation = (event) => {
  const name = event.animationName;
  if (name.startsWith("word-in")) {
    const word = Number(event.target.style.getPropertyValue("--i")) || 0;
    heroSound("tick", { pitch: 0.7 + word * 0.1 });
  } else if (name.startsWith("scribble")) {
    heroSound("scribble", { duration: 0.8 });
  } else if (name.startsWith("highlight")) {
    heroSound("paper");
  } else if (name.startsWith("tag-in")) {
    heroSound("stamp");
  }
};

const introContent = async () => {
  shown.status = true;
  heroSound("pop", { pitch: 0.8 });
  await wait(150);
  shown.headline = true;
  await wait(900);
  shown.terminal = true;
  heroSound("key");
  bootTerminal();
  await wait(250);
  shown.ctas = true;
  heroSound("slap");
  await wait(150);
  shown.socials = true;
  heroSound("pop", { pitch: 1.15 });
};

const introPortrait = async () => {
  await wait(300);
  shown.backBlock = true;
  await wait(120);
  shown.frame = true;
  await wait(550);
  shown.photo = true;
  heroSound("whoosh", { duration: 0.45, up: false });
  await wait(850);
  // Oka says hi (the whole line at once), then the rest of the hero follows
  bubbleText.value = GREETING;
  bubbleDone.value = true;
  shown.bubble = true;
  heroSound("whoosh", { duration: 0.35 });
  await wait(450);
  shown.years = true;
  heroSound("stamp");
  await wait(200);
  introContent();
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

watch(introReady, async (ready) => {
  if (!ready || !alive || new URLSearchParams(location.search).has("file")) return;
  Object.keys(shown).forEach((key) => { shown[key] = false; });
  termLines.value = [];
  bubbleText.value = "";
  bubbleDone.value = false;
  await nextTick();
  await new Promise(requestAnimationFrame);
  if (alive) introPortrait();
});

let timers = [];
onMounted(() => {
  if (new URLSearchParams(location.search).has("file")) {
    // A link opens a project file further down: show the hero as it ends, without replaying
    // its intro and sounds off-screen.
    Object.keys(shown).forEach((key) => { shown[key] = true; });
    bubbleText.value = GREETING;
    bubbleDone.value = true;
    say({ t: "$ ", c: "text-primary" }, "whoami");
    out("Oka Sutarto Putra, Mobile Engineer @ Dusitek");
  } else if (introReady.value) {
    introPortrait();
  }
  // Otherwise the hero stays empty behind the sound dialog; the intro starts once it's answered
  tickClock();
  timers.push(setInterval(tickClock, 10000));
  if (!reducedMotion) timers.push(setInterval(nextStatus, 3200));

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
  timers.forEach(clearInterval);
  if (heroScene) heroScene.destroy();
  if (heroRef.value) {
    heroRef.value.removeEventListener("mousemove", onMouseMove);
    heroRef.value.removeEventListener("mouseleave", onMouseLeave);
  }
});
</script>

<style scoped>
/* Keep the real hero visible behind the overlay without consuming its intro. */
/* Nothing of the hero shows behind the sound dialog; its intro plays once that's answered */
.intro-paused .w, .intro-paused .scribble-note, .intro-paused .code-tag { animation: none !important; opacity: 0; }
.intro-paused .scribble path { animation: none !important; }
.intro-paused .code .hl { animation: none !important; }

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

/* ---------- Status chip ---------- */
.status {
  display: inline-flex;
  align-items: stretch;
  font-weight: 700;
  font-size: 0.95rem;
  color: #111;
  background: #fff;
  border: 2.5px solid #000;
  box-shadow: 4px 4px 0 var(--color-shadow);
}
:global(.dark .status) {
  color: #fff;
  background: var(--color-surface-dark, #241f1a);
  border-color: #f4ead5;
}
.status-now {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
}
/* All statuses share one grid cell, so the chip is always as wide as the longest */
.ticker {
  display: grid;
  perspective: 300px;
  text-align: left;
}
.ticker > span {
  grid-area: 1 / 1;
  white-space: nowrap;
  opacity: 0;
  transform: translateY(70%) rotateX(-70deg);
  transition:
    transform 0.45s cubic-bezier(0.34, 1.5, 0.64, 1),
    opacity 0.3s;
}
.ticker > span.gone {
  transform: translateY(-70%) rotateX(70deg);
}
.ticker > span.on {
  opacity: 1;
  transform: none;
}
.status-clock {
  display: none;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-left: 2.5px solid #000;
  background: #111;
  color: #fff;
  font: 700 0.85rem ui-monospace, "SF Mono", Menlo, monospace;
}
.status-clock i {
  color: var(--color-primary);
}
.status-clock .colon {
  animation: blink 1s steps(1) infinite;
}
@media (min-width: 640px) {
  .status-clock {
    display: flex;
  }
}

/* ---------- Headline ---------- */
.headline {
  font-size: clamp(2.1rem, 10vw, 3rem);
  line-height: 1.08;
  letter-spacing: -0.035em;
  margin: 26px auto 30px;
  max-width: 15ch;
}
@media (min-width: 1024px) {
  .headline {
    font-size: clamp(2.4rem, 4.6vw, 4.1rem);
    margin-inline: 0;
  }
}
/* Words land one after another like stickers */
.w {
  display: inline-block;
  opacity: 0;
  transform: translateY(40px) rotate(6deg) scale(0.9);
  transform-origin: 0 100%;
}
.headline.show .w {
  animation: word-in 0.55s cubic-bezier(0.34, 1.6, 0.64, 1) forwards;
  animation-delay: calc(var(--i) * 0.11s);
}
@keyframes word-in {
  to {
    opacity: 1;
    transform: none;
  }
}
/* "complex" gets scribbled out with a red marker, with a note above */
.scribbled {
  position: relative;
}
.scribble {
  position: absolute;
  left: -4%;
  top: 10%;
  width: 108%;
  height: 82%;
  overflow: visible;
  pointer-events: none;
}
.scribble path {
  fill: none;
  stroke: #ef4444;
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1200;
  stroke-dashoffset: 1200;
}
.headline.show .scribble path {
  animation: scribble 0.8s 1.2s ease-in-out forwards;
}
@keyframes scribble {
  to {
    stroke-dashoffset: 0;
  }
}
.scribble-note {
  position: absolute;
  left: 8%;
  top: -0.6em;
  font: 600 0.36em "Caveat", cursive;
  letter-spacing: 0;
  color: #ef4444;
  white-space: nowrap;
  opacity: 0;
  transform: rotate(-6deg) scale(0.4);
}
.headline.show .scribble-note {
  animation: note-in 0.4s 1.9s cubic-bezier(0.34, 1.8, 0.64, 1) forwards;
}
@keyframes note-in {
  to {
    opacity: 1;
    transform: rotate(-6deg) scale(1);
  }
}
/* "elegant code." gets highlighted, a blinking caret and a "ship it" tag */
.code {
  position: relative;
}
.code .hl {
  padding: 0 0.04em;
  background: linear-gradient(var(--color-primary), var(--color-primary)) no-repeat 0 88% / 0% 36%;
}
.headline.show .code .hl {
  animation: highlight 0.6s 1.7s cubic-bezier(0.6, 0, 0.2, 1) forwards;
}
@keyframes highlight {
  to {
    background-size: 100% 36%;
  }
}
.caret {
  display: inline-block;
  width: 0.08em;
  height: 0.82em;
  margin-left: 0.05em;
  vertical-align: -0.06em;
  background: currentColor;
  animation: blink 1s steps(1) infinite;
}
.code-tag {
  display: none;
  position: absolute;
  left: 100%;
  top: 0.3em;
  margin-left: 0.45em;
  white-space: nowrap;
  font: 700 0.22em ui-monospace, "SF Mono", Menlo, monospace;
  letter-spacing: 0;
  color: var(--color-secondary);
  background: #111;
  border: 2px solid #000;
  padding: 3px 8px;
  opacity: 0;
  transform: rotate(4deg) scale(0.3);
}
@media (min-width: 1024px) {
  .code-tag {
    display: block;
  }
}
.headline.show .code-tag {
  animation: tag-in 0.4s 2.3s cubic-bezier(0.34, 1.8, 0.64, 1) forwards;
}
@keyframes tag-in {
  to {
    opacity: 1;
    transform: rotate(4deg) scale(1);
  }
}

/* ---------- Terminal ---------- */
.terminal {
  color: #f4ead5;
  cursor: text;
}
.term-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 1.5px solid #000;
}
.terminal-body {
  height: 9.6em;
  overflow-y: auto;
  padding: 12px 16px;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 0.92rem;
  line-height: 1.6;
  scrollbar-width: thin;
  scrollbar-color: #444 transparent;
}
.terminal-body p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.dim {
  opacity: 0.55;
}
.err {
  color: #ff8a8a;
}
.granted {
  display: inline-block;
  margin: 4px 0;
  padding: 1px 10px;
  border: 2px solid #4ade80;
  color: #4ade80;
  font-weight: 700;
  transform: rotate(-3deg);
  animation: granted 0.35s cubic-bezier(0.5, 0, 0.75, 0) both;
}
@keyframes granted {
  from {
    opacity: 0;
    transform: rotate(-20deg) scale(2.6);
  }
}
.term-input {
  display: flex;
  gap: 8px;
}
.term-input input {
  flex: 1;
  min-width: 0;
  padding: 0;
  color: inherit;
  font: inherit;
  background: none;
  border: 0;
  outline: 0;
  caret-color: var(--color-primary);
}

/* ---------- Keycaps ---------- */
/* Buttons drawn as keyboard keys: a top face, a darker side below it and a hard shadow.
   Pressing pushes the cap down onto its side. */
.keycap {
  --cap: var(--color-primary);
  --side: #b89a00;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 28px 18px;
  font: 800 1rem "Lexend Mega", sans-serif;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  color: #111;
  background: var(--cap);
  border: 2.5px solid #000;
  border-radius: 12px;
  box-shadow:
    0 8px 0 -2.5px var(--side),
    0 8px 0 0 #000,
    6px 14px 0 0 #0003;
  transition:
    transform 0.08s,
    box-shadow 0.08s,
    background 0.15s;
  user-select: none;
}
/* Shine on the top face */
.keycap::before {
  content: "";
  position: absolute;
  inset: 5px 7px 9px;
  border-radius: 8px;
  background: linear-gradient(#ffffff55, #ffffff00 60%);
  pointer-events: none;
}
.keycap small {
  position: absolute;
  top: 5px;
  right: 10px;
  font: 700 0.6rem ui-monospace, "SF Mono", Menlo, monospace;
  letter-spacing: 0;
  opacity: 0.6;
}
.keycap:hover {
  transform: translateY(-2px);
  box-shadow:
    0 10px 0 -2.5px var(--side),
    0 10px 0 0 #000,
    6px 16px 0 0 #0003;
}
.keycap:active {
  transform: translateY(7px);
  box-shadow:
    0 1px 0 -2.5px var(--side),
    0 1px 0 0 #000,
    2px 4px 0 0 #0003;
}
.keycap-light {
  --cap: #fff;
  --side: #b9b4a6;
}
.keycap-sm {
  --cap: #fff;
  --side: #b9b4a6;
  width: 52px;
  height: 52px;
  padding: 0;
  font-size: 1.3rem;
  border-radius: 10px;
}
.keycap-sm:hover {
  --cap: var(--color-secondary);
  --side: #00968a;
}
.keycap i {
  position: relative;
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
  .ticker > span,
  .back-block,
  .frame,
  .years {
    transition: none !important;
  }
  .w,
  .scribble-note,
  .code-tag {
    opacity: 1;
    transform: none;
    animation: none !important;
  }
  .scribble path {
    stroke-dashoffset: 0;
    animation: none !important;
  }
  .code .hl {
    background-size: 100% 36%;
    animation: none !important;
  }
  .photo.up,
  .bubble.pop {
    animation-duration: 0s;
  }
}
</style>
