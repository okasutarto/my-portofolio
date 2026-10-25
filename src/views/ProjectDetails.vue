<template>
  <div class="detail-page">
    <!-- Project not found -->
    <div v-if="!shown" class="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <span class="type-sticker">404</span>
      <h1 class="font-display font-bold uppercase text-4xl md:text-6xl tracking-tighter my-6">Project not found</h1>
      <router-link to="/#projects" class="keycap font-display">← Back to all projects</router-link>
    </div>

    <template v-else>
      <!-- Hero: the project's colour band, with the phone from the showcase -->
      <section class="d-hero" :style="{ backgroundColor: color }">
        <span class="band-num font-display" aria-hidden="true">{{ no }}</span>
        <div ref="heroRef" class="d-hero-inner">
          <div class="d-copy">
            <button class="back-btn font-display" @click="back">← Projects</button>
            <span class="type-sticker">{{ shown.type }} · {{ no }}</span>
            <h1 class="d-title font-display" :class="titleSize">{{ shown.title }}</h1>
            <p v-if="cf.quote" class="d-quote">“{{ capitalize(cf.quote) }}.”</p>
            <p class="d-desc">{{ shown.description }}</p>
            <div class="d-acts">
              <a v-for="link in links" :key="link.href" :href="link.href" target="_blank" rel="noopener noreferrer" class="keycap font-display" :class="link.class">
                {{ link.label }}
              </a>
              <span v-if="!links.length" class="type-sticker private">Private build · {{ stamp }}</span>
            </div>
          </div>
          <div ref="heroPhoneRef" class="phone-frame hero-phone" :style="{ visibility: phoneHidden ? 'hidden' : 'visible' }">
            <div class="phone-screen">
              <span class="phone-island"></span>
              <canvas ref="shotRef" width="600" height="1280"></canvas>
            </div>
          </div>
        </div>
      </section>

      <div class="d-body">
        <div class="d-wrap">
          <div class="facts sec">
            <div v-for="[label, value] in facts" :key="label">
              <small>{{ label }}</small>
              <b class="font-display">{{ value }}</b>
            </div>
          </div>

          <div class="big3 sec">
            <div v-for="metric in metrics" :key="metric.label" class="stat-sticker" :style="{ backgroundColor: color }">
              <b class="font-display" :class="{ wordy: String(metric.value).length > 5 }">{{ metric.value }}</b>
              <span>{{ metric.label }}</span>
            </div>
          </div>

          <section class="sec">
            <h2 class="font-display"><span class="no">01</span>Overview</h2>
            <p class="overview">{{ shown.overview }}</p>
          </section>

          <section class="sec">
            <h2 class="font-display"><span class="no">02</span>Challenge → Solution</h2>
            <div class="cs">
              <div class="panel">
                <h3 class="font-display" style="background: #fecaca">The Challenge</h3>
                <ul>
                  <li v-for="point in shown.problem.points" :key="point">{{ point }}</li>
                </ul>
              </div>
              <span class="cs-arrow font-display" aria-hidden="true">→</span>
              <div class="panel">
                <h3 class="font-display" style="background: #bbf7d0">The Solution</h3>
                <ul>
                  <li v-for="point in shown.solution.points" :key="point">{{ point }}</li>
                </ul>
              </div>
            </div>
          </section>

          <section class="sec">
            <h2 class="font-display"><span class="no">03</span>Features</h2>
            <div class="stickers">
              <span
                v-for="(feature, i) in shown.features"
                :key="feature"
                class="sticker"
                :style="{ backgroundColor: stickerColor(i), rotate: `${STICKER_TILTS[i % STICKER_TILTS.length]}deg` }">
                {{ feature }}
              </span>
            </div>
          </section>

          <section v-if="cf.flows" class="sec">
            <h2 class="font-display"><span class="no">04</span>How it works</h2>
            <div class="flows">
              <div v-for="flow in cf.flows" :key="flow.label">
                <small class="flow-label">{{ flow.label }}</small>
                <div class="flow">
                  <template v-for="(node, i) in flow.nodes" :key="node">
                    <span v-if="i" class="flow-arrow font-display" aria-hidden="true">→</span>
                    <span class="flow-node" :class="{ hot: i === flow.ping }">
                      {{ node }}<em v-if="i === flow.ping && flow.pingText"> · {{ flow.pingText }}</em>
                    </span>
                  </template>
                </div>
              </div>
            </div>
          </section>

          <section class="sec">
            <h2 class="font-display"><span class="no">{{ cf.flows ? "05" : "04" }}</span>Built with</h2>
            <div class="chips">
              <span v-for="tech in shown.technologies" :key="tech">{{ tech }}</span>
            </div>
          </section>

          <section v-if="shown.learnings?.length" class="sec">
            <h2 class="font-display"><span class="no">{{ cf.flows ? "06" : "05" }}</span>What I learned</h2>
            <ul class="learned">
              <li v-for="item in shown.learnings" :key="item">{{ item }}</li>
            </ul>
          </section>
        </div>
      </div>

      <!-- Up next: keep scrolling and the next project's band rises -->
      <section class="d-next" :style="{ backgroundColor: nextColor }" @click="goNext">
        <div>
          <small>Up next · {{ pad(nextIndex + 1) }}</small>
          <b class="font-display">{{ nextProject.title }}</b>
          <span>Keep scrolling ↓</span>
        </div>
        <i ref="sentinelRef" class="sentinel" aria-hidden="true"></i>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { sfx } from "@/composables/useSfx";
import { projects, getProjectById } from "@/data/projects";
import { drawScreen } from "@/components/features/phone/screens";
import { bandColor, createBand, createPhone, flyTo, handoff, clearHandoff } from "@/components/features/phone/handoff";

gsap.registerPlugin(ScrollTrigger);

const STICKER_TILTS = [-2, 1.5, -1, 2, -2.5, 1];

const route = useRoute();
const router = useRouter();
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// shallowRef keeps the raw object so it can still be found in `projects` by identity
const shown = shallowRef(getProjectById(route.params.id));
const index = computed(() => projects.indexOf(shown.value));
const nextIndex = computed(() => (index.value + 1) % projects.length);
const nextProject = computed(() => projects[nextIndex.value]);
const color = computed(() => bandColor(index.value));
const nextColor = computed(() => bandColor(nextIndex.value));

const pad = (n) => String(n).padStart(2, "0");
const no = computed(() => pad(index.value + 1));
const cf = computed(() => shown.value?.caseFile || {});
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const stamp = computed(() => (/ongoing/i.test(shown.value.duration) ? "In progress" : `Shipped ${shown.value.year}`));
const isLink = (href) => href && href !== "#";
const links = computed(() =>
  [
    isLink(shown.value.demoLink) && { label: "Open live ↗", href: shown.value.demoLink, class: "" },
    isLink(shown.value.codeLink) && { label: "Code ↗", href: shown.value.codeLink, class: "ghost" },
  ].filter(Boolean),
);
const facts = computed(() => [
  ["Year", shown.value.year],
  ["Built in", shown.value.duration],
  ["Role", shown.value.role],
  ["Client", cf.value.client || "Personal project"],
]);
const metrics = computed(() => (shown.value.results?.metrics || []).slice(0, 3));
const stickerColor = (i) => ["#fff", color.value, "#ffdd00", "#fff", nextColor.value, "#fff"][i % 6];
// Lexend Mega is very wide: size the title by its longest word so it never overflows
const titleSize = computed(() => {
  const longest = Math.max(...shown.value.title.split(/\s+/).map((w) => w.length));
  return longest <= 6 ? "text-big" : longest <= 9 ? "text-mid" : "text-small";
});

const heroRef = ref(null);
const heroPhoneRef = ref(null);
const shotRef = ref(null);
const sentinelRef = ref(null);
// Hidden while the showcase's phone is still flying in to take its place
const phoneHidden = ref(!!handoff.phone);

const drawShot = () => {
  if (shotRef.value && shown.value) drawScreen(shotRef.value.getContext("2d"), shown.value);
};
const setTitle = () => {
  if (shown.value) document.title = `${shown.value.title} | okasputra`;
};

// ---------- entrance: everything is slapped on like stickers ----------
let triggers = [];
const killTriggers = () => {
  triggers.forEach((t) => t.kill());
  triggers = [];
};
const intro = () => {
  killTriggers();
  if (reduced || !heroRef.value) return;
  const hero = heroRef.value.querySelectorAll(".d-copy > *");
  gsap.fromTo(
    hero,
    { y: 28, scale: 1.06, opacity: 0 },
    { y: 0, scale: 1, opacity: 1, duration: 0.5, stagger: 0.07, ease: "back.out(2)", clearProps: "transform,opacity" },
  );
  [0.1, 0.24, 0.38].forEach((delay) => sfx.slap({ delay }));
  // Body blocks land as they scroll into view
  document.querySelectorAll(".d-body .sec").forEach((sec) => {
    gsap.set(sec, { y: 40, opacity: 0 });
    triggers.push(
      ScrollTrigger.create({
        trigger: sec,
        start: "top 88%",
        once: true,
        onEnter: () => {
          gsap.to(sec, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.8)", clearProps: "transform,opacity" });
          sfx.slap();
        },
      }),
    );
  });
};

// ---------- arriving from the showcase: the phone flies into the header ----------
const arrive = async () => {
  await nextTick();
  const { phone } = handoff;
  if (phone && heroPhoneRef.value) {
    await gsap.to(phone, { ...flyTo(phone, heroPhoneRef.value.getBoundingClientRect()), duration: 0.55, ease: "power3.inOut" });
    sfx.thud({ strength: 0.5 });
  }
  phoneHidden.value = false;
  // The band is the same colour as this header, so it can just go
  clearHandoff();
  intro();
};

// ---------- back to the showcase: band covers the page, the phone heads for the centre ----------
let leaving = false;
const back = async () => {
  if (leaving) return;
  leaving = true;
  clearHandoff();
  handoff.returnTo = index.value;
  if (reduced) {
    router.push("/");
    return;
  }
  const rect = heroPhoneRef.value.getBoundingClientRect();
  handoff.phone = createPhone(shown.value, rect);
  phoneHidden.value = true;
  handoff.band = createBand(color.value);
  sfx.whoosh({ duration: 0.5 });
  await gsap.fromTo(handoff.band, { yPercent: 100 }, { yPercent: 0, duration: 0.5, ease: "power3.inOut" });
  // Roughly where the showcase phone sits, so the last hop there is short
  const centre = {
    left: (window.innerWidth - rect.width) / 2,
    top: Math.max(80, (window.innerHeight - rect.height) / 2 + 30),
    width: rect.width,
  };
  await gsap.to(handoff.phone, { ...flyTo(handoff.phone, centre), duration: 0.4, ease: "power2.inOut" });
  router.push("/");
};

// ---------- next project: its band rises from the bottom and becomes the new header ----------
const goNext = async () => {
  if (leaving) return;
  leaving = true;
  const path = `/projects/${nextProject.value.id}`;
  if (reduced) {
    router.push(path);
    return;
  }
  clearHandoff();
  handoff.band = createBand(nextColor.value);
  sfx.whoosh({ duration: 0.6 });
  await gsap.fromTo(handoff.band, { yPercent: 100 }, { yPercent: 0, duration: 0.65, ease: "power3.inOut" });
  router.push(path);
};

const onKey = (e) => e.key === "Escape" && back();

let nextObserver = null;
const watchNext = () => {
  if (nextObserver) nextObserver.disconnect();
  if (!sentinelRef.value) return;
  nextObserver = new IntersectionObserver(([entry]) => entry.isIntersecting && goNext());
  nextObserver.observe(sentinelRef.value);
};

watch(
  () => route.params.id,
  async (id) => {
    if (!id) return;
    shown.value = getProjectById(id);
    leaving = false;
    window.scrollTo({ top: 0, behavior: "instant" });
    setTitle();
    await nextTick();
    drawShot();
    watchNext();
    clearHandoff();
    intro();
  },
);

onMounted(async () => {
  // The page should open at the top. ScrollTrigger (used on the home page) remembers the
  // old scroll position and restores it on its next refresh, so clear that memory too.
  ScrollTrigger.clearScrollMemory();
  window.scrollTo({ top: 0, behavior: "instant" });
  window.addEventListener("keydown", onKey);
  setTitle();
  drawShot();
  document.fonts?.ready.then(drawShot);
  if (!shown.value) {
    clearHandoff();
    return;
  }
  watchNext();
  if (handoff.band) arrive();
  else intro();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
  if (nextObserver) nextObserver.disconnect();
  killTriggers();
});
</script>

<style scoped>
.detail-page {
  color: #111;
}

/* ---------- shared bits ---------- */
.type-sticker {
  display: inline-block;
  padding: 3px 10px;
  border: 3px solid #000;
  background: #fff;
  box-shadow: 3px 3px 0 #000;
  font: 700 0.7rem "JetBrains Mono", monospace;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  rotate: -3deg;
  color: #111;
}
.keycap {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 13px 18px;
  background: #111;
  color: #fff;
  border: 3px solid #000;
  box-shadow: 5px 5px 0 #fff, 5px 5px 0 3px #000;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  transition: transform 0.12s, box-shadow 0.12s;
}
.keycap:hover {
  transform: translate(-2px, -2px);
  box-shadow: 7px 7px 0 #fff, 7px 7px 0 3px #000;
}
.keycap:active {
  transform: translate(4px, 4px);
  box-shadow: 1px 1px 0 #fff, 1px 1px 0 3px #000;
}
.keycap.ghost {
  background: #fff;
  color: #111;
}

/* ---------- hero ---------- */
.d-hero {
  position: relative;
  overflow: hidden;
  border-bottom: 5px solid #000;
  background-image: radial-gradient(rgba(0, 0, 0, 0.2) 1.2px, transparent 1.2px);
  background-size: 24px 24px;
}
.band-num {
  position: absolute;
  right: -2vw;
  bottom: -6vh;
  font-size: 34vh;
  line-height: 1;
  letter-spacing: -0.08em;
  color: transparent;
  -webkit-text-stroke: 4px rgba(0, 0, 0, 0.13);
  pointer-events: none;
}
.d-hero-inner {
  position: relative;
  max-width: 80rem;
  margin: 0 auto;
  padding: 28px 1.25rem 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}
.d-copy {
  width: 100%;
}
.back-btn {
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  margin-bottom: 26px;
  padding: 8px 13px;
  background: #fff;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 #000;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  text-transform: uppercase;
}
.back-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 #000;
}
.d-title {
  margin: 18px 0 12px;
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: -0.08em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}
.text-big { font-size: clamp(2.6rem, 9vw, 5.6rem); }
.text-mid { font-size: clamp(2.2rem, 7vw, 4.6rem); }
.text-small { font-size: clamp(1.8rem, 5.5vw, 3.6rem); }
.d-quote {
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 700;
  font-style: italic;
}
.d-desc {
  margin: 0 0 28px;
  max-width: 46ch;
  font-weight: 500;
  line-height: 1.6;
}
.d-acts {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.hero-phone {
  --phone-w: 230px;
  flex: none;
}

/* ---------- body ---------- */
.d-body {
  background: #fffdf5;
}
.d-wrap {
  max-width: 80rem;
  margin: 0 auto;
  padding: 48px 1.25rem 70px;
  display: grid;
  gap: 52px;
}
.d-wrap h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 18px;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.06em;
}
.d-wrap h2 .no {
  padding: 3px 8px;
  background: #111;
  color: #ffdd00;
  font: 700 0.7rem "JetBrains Mono", monospace;
  letter-spacing: 0.08em;
}
.facts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  border: 3px solid #000;
  background: #fff;
  box-shadow: 6px 6px 0 #000;
}
.facts div {
  padding: 12px 16px;
  border-top: 3px solid #000;
  border-left: 3px solid #000;
}
.facts div:nth-child(-n + 2) {
  border-top: 0;
}
.facts div:nth-child(odd) {
  border-left: 0;
}
.facts small,
.flow-label {
  display: block;
  font: 700 0.62rem "JetBrains Mono", monospace;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  opacity: 0.6;
}
.facts b {
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.05em;
}
.big3 {
  display: grid;
  gap: 18px;
}
.stat-sticker {
  padding: 14px 18px;
  border: 3px solid #000;
  box-shadow: 6px 6px 0 #000;
}
.stat-sticker:nth-child(1) { rotate: 1.5deg; }
.stat-sticker:nth-child(2) { rotate: -1.5deg; }
.stat-sticker:nth-child(3) { rotate: 1deg; }
.stat-sticker b {
  display: block;
  font-size: 3rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.08em;
}
.stat-sticker b.wordy {
  font-size: 2.2rem;
}
.stat-sticker span {
  font: 700 0.7rem "JetBrains Mono", monospace;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.overview {
  max-width: 70ch;
  font-size: 1.05rem;
  line-height: 1.7;
}
.cs {
  display: grid;
  gap: 18px;
}
.cs-arrow {
  justify-self: center;
  rotate: 90deg;
  font-size: 2rem;
  font-weight: 800;
}
.panel {
  padding: 18px 20px;
  background: #fff;
  border: 3px solid #000;
  box-shadow: 6px 6px 0 #000;
}
.panel h3 {
  display: inline-block;
  margin: 0 0 10px;
  padding: 3px 10px;
  border: 2.5px solid #000;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: -0.05em;
  text-transform: uppercase;
}
.panel ul,
.learned {
  margin: 0;
  padding-left: 18px;
  list-style: square;
  line-height: 1.7;
}
.stickers {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.sticker {
  padding: 9px 15px;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 #000;
  font-weight: 700;
}
.flows {
  display: grid;
  gap: 22px;
}
.flow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}
.flow-node {
  padding: 9px 13px;
  background: #fff;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 #000;
  font-weight: 700;
}
.flow-node.hot {
  background: #22c55e;
  color: #fff;
}
.flow-node em {
  font-style: normal;
}
.flow-arrow {
  font-weight: 800;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chips span {
  padding: 5px 10px;
  background: #fff;
  border: 2.5px solid #000;
  font: 700 0.75rem "JetBrains Mono", monospace;
  text-transform: uppercase;
}

/* ---------- up next ---------- */
.d-next {
  position: relative;
  min-height: 70vh;
  display: grid;
  place-items: center;
  padding: 40px 1.25rem;
  text-align: center;
  border-top: 5px solid #000;
  cursor: pointer;
  background-image: radial-gradient(rgba(0, 0, 0, 0.2) 1.2px, transparent 1.2px);
  background-size: 24px 24px;
}
.d-next small {
  display: block;
  font: 700 0.8rem "JetBrains Mono", monospace;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}
.d-next b {
  display: block;
  margin: 10px 0;
  font-size: clamp(2.5rem, 8vw, 6rem);
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: -0.08em;
  text-transform: uppercase;
}
.d-next span {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.sentinel {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
}

@media (min-width: 768px) {
  .d-hero-inner {
    min-height: calc(100vh - 72px);
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 5vw;
    padding: 40px 3rem 60px;
  }
  .hero-phone {
    --phone-w: clamp(200px, calc((100vh - 220px) * 0.47 + 30px), 280px);
  }
  .d-wrap {
    padding: 64px 3rem 80px;
  }
  .d-wrap h2 {
    font-size: 1.7rem;
  }
  .facts {
    grid-template-columns: repeat(4, 1fr);
  }
  .facts div {
    border-top: 0;
  }
  .facts div:nth-child(odd) {
    border-left: 3px solid #000;
  }
  .facts div:first-child {
    border-left: 0;
  }
  .big3 {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  .stat-sticker b {
    font-size: 3.4rem;
  }
  .cs {
    grid-template-columns: 1fr auto 1fr;
  }
  .cs-arrow {
    align-self: center;
    rotate: 0deg;
  }
}
</style>
