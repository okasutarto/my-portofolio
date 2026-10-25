<template>
  <div class="case-page min-h-screen">
    <!-- Project not found -->
    <div v-if="!shown" class="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div class="lost-file mb-8">
        <small>Case file</small>
        <b class="font-display">Not found</b>
        <span>This folder isn't in the cabinet.</span>
      </div>
      <router-link to="/#projects" class="next-file !inline-flex !mt-0 px-6">← Back to all projects</router-link>
    </div>

    <div v-else class="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-10">
      <!-- Previous / next file, visible without scrolling -->
      <nav class="file-nav" aria-label="Project files">
        <router-link :to="`/projects/${prevProject.id}`" class="file-link" @click="markDir(-1)">
          <span class="file-arrow" aria-hidden="true">←</span>
          <span class="min-w-0">
            <small>Prev · #{{ pad(projects.indexOf(prevProject) + 1) }}</small>
            <b>{{ prevProject.title }}</b>
          </span>
        </router-link>
        <p class="file-count" aria-live="polite">File {{ fileNo }} / {{ pad(projects.length) }}</p>
        <router-link :to="`/projects/${nextProject.id}`" class="file-link file-link-next" @click="markDir(1)">
          <span class="min-w-0">
            <small>Next · #{{ pad(projects.indexOf(nextProject) + 1) }}</small>
            <b>{{ nextProject.title }}</b>
          </span>
          <span class="file-arrow" aria-hidden="true">→</span>
        </router-link>
      </nav>

      <div ref="folderRef" class="folder">
        <!-- Section tabs, like folder dividers -->
        <div class="tabs" role="tablist" aria-label="Case file sections">
          <button
            v-for="t in TABS"
            :key="t.key"
            :ref="(el) => (tabEls[t.key] = el)"
            type="button"
            role="tab"
            class="tab"
            :class="{ on: tab === t.key }"
            :aria-selected="tab === t.key"
            :aria-controls="`case-panel`"
            @click="switchTab(t.key)">
            {{ t.label }}
          </button>
        </div>

        <div ref="bodyRef" class="folder-body">
          <!-- Front cover: swings open like a book -->
          <div ref="coverRef" class="cover" aria-hidden="true">
            <div class="cover-face cover-front">
              <div class="cover-label">
                <small>Project file · {{ fileNo }}</small>
                <b class="font-display">{{ shown.title }}</b>
                <small>{{ shown.type }} · {{ shown.year }}</small>
              </div>
              <div class="cover-stamp font-display">Top secret-ish</div>
            </div>
            <div class="cover-face cover-back"></div>
          </div>

          <!-- First visit with no click yet: wait closed so the opening can be heard -->
          <button v-if="waitingToOpen" type="button" class="open-hint font-display" @click="openFromWait">
            ▶ Click to open
          </button>

          <div ref="stackRef" class="sheet-stack">
            <div class="sheet-under"></div>
            <article ref="sheetRef" class="sheet">
              <header class="file-head">
                <div class="min-w-0">
                  <p class="file-no">Case file #{{ fileNo }} · {{ shown.type }}</p>
                  <h1 ref="titleRef" class="file-title font-display">{{ shown.title }}</h1>
                </div>
                <div ref="stampRef" class="stamp font-display">{{ stamp }}</div>
              </header>

              <dl class="form-row">
                <div v-for="[label, value] in fields" :key="label" class="field">
                  <dt>{{ label }}</dt>
                  <dd class="val">{{ value }}</dd>
                </div>
              </dl>

              <!-- Each tab mounts a different artifact here -->
              <div id="case-panel" ref="stageRef" class="stage" role="tabpanel" :aria-label="tabLabel">
                <!-- Overview: memo, polaroid of the app, sticky note -->
                <div v-if="tab === 'overview'" class="ov">
                  <div>
                    <h2 class="stage-h font-display">Overview</h2>
                    <p class="memo">
                      <template v-for="(part, i) in overviewParts" :key="i">
                        <span v-if="part.hl" class="hl">{{ part.text }}</span>
                        <template v-else>{{ part.text }}</template>
                      </template>
                    </p>
                    <div v-if="cf.quote" class="sticky-note">"{{ cf.quote }}"</div>
                  </div>
                  <div class="ov-side">
                    <figure class="polaroid">
                      <span class="clip" aria-hidden="true"></span>
                      <canvas ref="shotRef" width="600" height="760" :aria-label="`${shown.title} illustration`"></canvas>
                      <figcaption>{{ cf.caption || shown.title }}</figcaption>
                    </figure>
                    <div class="flex flex-wrap gap-3">
                      <a v-for="link in links" :key="link.href" :href="link.href" target="_blank" rel="noopener noreferrer" class="paper-btn" :class="link.class">
                        {{ link.label }}
                      </a>
                    </div>
                  </div>
                </div>

                <!-- Challenge: issue cards slapped on the desk -->
                <div v-else-if="tab === 'challenge'">
                  <h2 class="stage-h font-display">
                    The challenge <span class="marker">{{ issues.length }} issues found</span>
                  </h2>
                  <p class="lead">{{ shown.problem.description }}</p>
                  <div class="issues">
                    <div v-for="(issue, i) in issues" :key="i" class="issue" :style="{ '--r': `${TILTS[i % 3]}deg` }">
                      <span class="tape" aria-hidden="true"></span>
                      <small>Issue #{{ i + 1 }}</small>
                      <b class="font-display">{{ issue.title }}</b>
                      <p>{{ issue.text }}</p>
                      <span class="x font-display" aria-hidden="true">✕</span>
                    </div>
                  </div>
                </div>

                <!-- Solution: blueprint with the system's flows -->
                <div v-else-if="tab === 'solution'">
                  <h2 class="stage-h font-display">The solution</h2>
                  <p class="lead">{{ shown.solution.description }}</p>
                  <div class="blueprint">
                    <p class="bp-title">System blueprint · {{ shown.title }} · rev. 1</p>
                    <div v-for="(flow, r) in cf.flows || []" :key="flow.label" class="flow">
                      <p class="bp-label">{{ r + 1 }} · {{ flow.label }}</p>
                      <div class="flow-row" :data-row="r">
                        <template v-for="(node, i) in flow.nodes" :key="node">
                          <span v-if="i" class="flow-arrow" aria-hidden="true"></span>
                          <span class="flow-node" :class="{ 'ping-node': flow.ping === i }">
                            {{ node }}
                            <em v-if="flow.ping === i" class="bp-ping font-display">{{ flow.pingText }}</em>
                          </span>
                        </template>
                      </div>
                    </div>
                    <div v-if="cf.notes" class="bp-notes">
                      <span v-for="note in cf.notes" :key="note">✓ {{ note }}</span>
                    </div>
                  </div>
                </div>

                <!-- Features: printed receipt -->
                <div v-else-if="tab === 'features'" class="ft">
                  <div class="printer" aria-hidden="true"><span></span></div>
                  <div class="receipt">
                    <div class="rc-head">
                      <b class="font-display">{{ shown.title.toUpperCase() }}</b>
                      <span>FEATURE RECEIPT #00{{ fileNo }}</span>
                      <span>{{ shown.year }} · {{ shown.duration.toUpperCase() }}</span>
                    </div>
                    <div class="rc-line"></div>
                    <div v-for="feature in shown.features" :key="feature" class="rc-item">
                      <span>{{ feature }}</span><i aria-hidden="true"></i><em>✓</em>
                    </div>
                    <div class="rc-line"></div>
                    <div class="rc-total"><span>TOTAL</span><b>{{ shown.features.length }} ITEMS</b></div>
                    <div class="rc-tech">{{ shown.technologies.join(" · ") }}</div>
                    <div class="rc-bar" aria-hidden="true"></div>
                    <div class="rc-thanks">*** THANK YOU ***</div>
                  </div>
                </div>

                <!-- Results: taped score cards + what I learned -->
                <div v-else-if="tab === 'results'">
                  <h2 class="stage-h font-display">Results</h2>
                  <div class="scores">
                    <div
                      v-for="(score, i) in scores"
                      :key="score.label"
                      class="score"
                      :style="{ '--bg': SCORE_COLORS[i % 3], '--r': `${[-3, 2, -1.5][i % 3]}deg` }">
                      <span class="tape" aria-hidden="true"></span>
                      <b
                        class="font-display"
                        :class="{ wordy: score.word && score.word.length > 5 }"
                        :data-to="score.word ? null : score.to"
                        :data-decimals="score.decimals"
                        :data-suffix="score.suffix"
                        :data-word="score.word || null"
                        >{{ score.value }}</b
                      >
                      <span>{{ score.label }}</span>
                    </div>
                    <div class="verified font-display" aria-hidden="true">Verified ✓</div>
                  </div>
                  <div class="learned">
                    <small>What I learned</small>
                    <ul>
                      <li v-for="item in shown.learnings.slice(0, 3)" :key="item">{{ item }}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </article>
            <!-- Blank pages thumbed through when switching tabs -->
            <div class="rifle" aria-hidden="true"><i v-for="n in 5" :key="n"></i></div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { sfx, hush, audioReady } from "@/composables/useSfx";
import { projects, getProjectById } from "@/data/projects";
import { drawScreen } from "@/components/features/phone/screens";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "challenge", label: "Challenge" },
  { key: "solution", label: "Solution" },
  { key: "features", label: "Features" },
  { key: "results", label: "Results" },
];
const TILTS = [-4, 3, -2];
const SCORE_COLORS = ["#ffdd00", "#00e0c6", "#ffb4c8"];

const route = useRoute();
const router = useRouter();
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The project on the folder; it only changes mid-transition, after the old file is put away.
// shallowRef keeps the raw object so it can still be found in `projects` by identity.
const shown = shallowRef(getProjectById(route.params.id));
const tab = ref("overview");
const waitingToOpen = ref(false);

const pad = (n) => String(n).padStart(2, "0");
const cf = computed(() => shown.value?.caseFile || {});
const fileNo = computed(() => pad(projects.indexOf(shown.value) + 1));
const nextProject = computed(() => projects[(projects.indexOf(shown.value) + 1) % projects.length]);
const prevProject = computed(() => projects[(projects.indexOf(shown.value) - 1 + projects.length) % projects.length]);

// Which way the files should slide: set by the prev/next controls (the list wraps around,
// so index order alone would get #05 → #01 backwards); browser back/forward falls back to it
let navDir = 0;
const markDir = (dir) => (navDir = dir);
const tabLabel = computed(() => TABS.find((t) => t.key === tab.value).label);
const stamp = computed(() =>
  /ongoing/i.test(shown.value.duration) ? "In progress ⏳" : `Shipped ✓ ${shown.value.year}`,
);
const fields = computed(() => [
  ["Role", shown.value.role],
  ["Duration", shown.value.duration],
  ["Year", shown.value.year],
  ["Client", cf.value.client || "Personal project"],
]);
const isLink = (href) => href && href !== "#";
const links = computed(() =>
  [
    isLink(shown.value.demoLink) && { label: "Visit site ↗", href: shown.value.demoLink, class: "" },
    isLink(shown.value.codeLink) && { label: "View code ↗", href: shown.value.codeLink, class: "ghost" },
  ].filter(Boolean),
);

// Overview text with the highlighted phrase split out
const overviewParts = computed(() => {
  const text = shown.value.overview;
  const hl = cf.value.highlight;
  const i = hl ? text.indexOf(hl) : -1;
  if (i < 0) return [{ text }];
  return [{ text: text.slice(0, i) }, { text: hl, hl: true }, { text: text.slice(i + hl.length) }];
});

// Issue cards: hand-written titles when available, otherwise the raw problem points
const issues = computed(
  () => cf.value.issues || shown.value.problem.points.slice(0, 3).map((p, i) => ({ title: `Issue ${i + 1}`, text: p })),
);

// "80%" -> counts up to 80; "Real-time" -> flickers on as a word
const scores = computed(() =>
  (shown.value.results?.metrics || []).slice(0, 3).map(({ value, label }) => {
    const m = String(value).match(/^(\d+(?:\.\d+)?)(.*)$/);
    if (!m) return { value, label, word: value };
    return { value, label, to: Number(m[1]), suffix: m[2], decimals: (m[1].split(".")[1] || "").length };
  }),
);

// ---------- refs ----------
const folderRef = ref(null);
const bodyRef = ref(null);
const coverRef = ref(null);
const stackRef = ref(null);
const sheetRef = ref(null);
const titleRef = ref(null);
const stampRef = ref(null);
const stageRef = ref(null);
const shotRef = ref(null);
const tabEls = {};

// ---------- polaroid illustration (same canvas art as the Projects phone) ----------
const drawShot = () => {
  if (shotRef.value && shown.value) drawScreen(shotRef.value.getContext("2d"), shown.value);
};
watch(shotRef, drawShot);
// Vue reuses the same canvas when the project changes, so redraw for the new one too
watch(shown, () => nextTick(drawShot));
document.fonts?.ready.then(() => {
  drawShot();
  // Web fonts change the height of everything above the folder
  fitFolder();
});

// ---------- fit the folder to the screen (desktop) ----------
// On large screens the whole folder stays in view; long tab content scrolls inside the sheet
const FIT_QUERY = "(min-width: 900px) and (min-height: 600px)";
const fitFolder = () => {
  const body = bodyRef.value;
  if (!body) return;
  if (!window.matchMedia(FIT_QUERY).matches) {
    body.style.removeProperty("--fit-h");
    return;
  }
  // offsetTop ignores transforms; getBoundingClientRect would be thrown off by the
  // page-enter transition and the intro drop, which are running when this first measures
  let top = 0;
  for (let el = body; el; el = el.offsetParent) top += el.offsetTop;
  body.style.setProperty("--fit-h", `${Math.max(360, window.innerHeight - top - 24)}px`);
};
const resetStageScroll = () => stageRef.value && (stageRef.value.scrollTop = 0);

// ---------- animation helpers ----------
let busy = false;
let mainTl = null;
let enterTl = null;
const ghosts = () => stackRef.value.querySelectorAll(".rifle i");
const tilt = (el) => parseFloat(el.style.getPropertyValue("--r")) || 0;
const shake = (tl, at, strength = 1) =>
  tl.to(
    stackRef.value,
    { keyframes: { x: [-7 * strength, 6 * strength, -3 * strength, 0], y: [3, -2, 1, 0] }, duration: 0.32, clearProps: "transform" },
    at,
  );
// Schedule a sound on a timeline
const sound = (tl, time, play) => tl.call(play, null, time);
const thud = { keyframes: { scaleY: [0.95, 1.02, 1], scaleX: [1.03, 0.99, 1] }, transformOrigin: "50% 100%", duration: 0.3, clearProps: "transform" };

// Finish whatever is still animating before starting something new
// (silently, so fast-forwarding doesn't fire every sound at once)
const settle = () => {
  hush(() => [mainTl, enterTl].forEach((tl) => tl && tl.progress(1).kill()));
  mainTl = enterTl = null;
};

// Entrance choreography per artifact; `at` is an absolute time on `tl`
const ENTER = {
  overview(tl, at, root) {
    const polaroid = root.querySelector(".polaroid");
    tl.from(root.querySelectorAll(".stage-h, .memo"), { x: -18, opacity: 0, duration: 0.35, stagger: 0.08 }, at)
      .add(() => root.querySelectorAll(".hl").forEach((h) => h.classList.add("on")), at + 0.2)
      .from(polaroid, { y: -120, rotation: -28, opacity: 0, duration: 0.32, ease: "power2.in" }, at + 0.1)
      // Swings on the paper clip until it settles
      .to(polaroid, { keyframes: { rotation: [7, -8, 4, -5, -1, -2.5] }, duration: 1.2, ease: "power1.out" }, at + 0.42);
    sound(tl, at + 0.1, () => sfx.paper());
    sound(tl, at + 0.42, () => sfx.tick({ pitch: 0.6 }));
    sound(tl, at + 0.35, () => sfx.scribble({ duration: 0.5 }));
    const note = root.querySelector(".sticky-note");
    if (note) {
      tl.from(note, { scale: 1.5, rotation: 16, opacity: 0, duration: 0.45, ease: "back.out(2.5)" }, at + 0.5);
      sound(tl, at + 0.55, () => sfx.slap());
    }
    tl.from(root.querySelectorAll(".paper-btn"), { y: 20, opacity: 0, duration: 0.3, stagger: 0.08 }, at + 0.7);
  },
  challenge(tl, at, root) {
    tl.from(root.querySelectorAll(".stage-h, .lead"), { x: -18, opacity: 0, duration: 0.3, stagger: 0.06 }, at)
      .from(root.querySelector(".marker"), { scale: 0, rotation: -20, duration: 0.4, ease: "back.out(3)" }, at + 0.25);
    sound(tl, at + 0.25, () => sfx.scribble({ duration: 0.35 }));
    root.querySelectorAll(".issue").forEach((card, i) => {
      const t = at + 0.2 + i * 0.28;
      sound(tl, t + 0.3, () => sfx.slap());
      sound(tl, t + 0.56, () => sfx.stamp());
      // Slapped down on the desk, each one jolting the stack
      tl.fromTo(
        card,
        { y: -160, x: (i - 1) * 60, rotation: i % 2 ? 25 : -25, scale: 1.25, opacity: 0 },
        { y: 0, x: 0, rotation: tilt(card), scale: 1, opacity: 1, duration: 0.3, ease: "power3.in" },
        t,
      )
        .to(stackRef.value, { keyframes: { x: [-4 - i * 2, 3 + i, 0], y: [2, -1, 0] }, duration: 0.2, clearProps: "transform" }, t + 0.3)
        .fromTo(card.querySelector(".x"), { scale: 3, rotation: -40, opacity: 0 }, { scale: 1, rotation: -10, opacity: 1, duration: 0.2, ease: "power4.in" }, t + 0.38);
    });
  },
  solution(tl, at, root) {
    tl.from(root.querySelectorAll(".stage-h, .lead"), { x: -18, opacity: 0, duration: 0.3, stagger: 0.06 }, at)
      // Blueprint unrolls from the top, boxes pop in, arrows get drawn
      .fromTo(root.querySelector(".blueprint"), { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.5, ease: "power2.inOut", clearProps: "clipPath" }, at + 0.1)
      .from(root.querySelectorAll(".flow-node"), { scale: 0, duration: 0.3, stagger: 0.05, ease: "back.out(2.5)" }, at + 0.5)
      .from(root.querySelectorAll(".flow-arrow"), { scale: 0, duration: 0.25, stagger: 0.08, ease: "power2.out" }, at + 0.8)
      .from(root.querySelectorAll(".bp-notes span"), { y: 14, opacity: 0, stagger: 0.12, duration: 0.3 }, at + 1.3);
    sound(tl, at + 0.1, () => sfx.rustle({ duration: 0.5 }));
    root.querySelectorAll(".flow-node").forEach((_, i) => {
      if (i % 2 === 0) sound(tl, at + 0.55 + i * 0.05, () => sfx.pop({ pitch: 0.9 + i * 0.05 }));
    });
    // A packet of data hops along the first flow and lights up its key node
    const firstRow = root.querySelector('.flow-row[data-row="0"]');
    if (!firstRow) return;
    const nodes = [...firstRow.querySelectorAll(".flow-node")];
    const pingAt = nodes.findIndex((n) => n.classList.contains("ping-node"));
    const hops = pingAt >= 0 ? nodes.slice(0, pingAt) : nodes;
    hops.forEach((node, i) => {
      tl.fromTo(node, { backgroundColor: "#ffdd00", color: "#000" }, { backgroundColor: "rgba(255,255,255,0)", color: "#fff", duration: 0.35, ease: "power1.in", clearProps: "backgroundColor,color" }, at + 1.6 + i * 0.22);
      sound(tl, at + 1.6 + i * 0.22, () => sfx.tick({ pitch: 0.8 + i * 0.12 }));
    });
    if (pingAt < 0) return;
    const ping = nodes[pingAt];
    const t = at + 1.6 + hops.length * 0.22;
    tl.fromTo(ping, { backgroundColor: "rgba(37,211,102,0)" }, { backgroundColor: "#25d366", duration: 0.15, repeat: 3, yoyo: true, clearProps: "backgroundColor" }, t)
      .fromTo(ping.querySelector(".bp-ping"), { opacity: 0, y: 10, scale: 0.6 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(3)" }, t);
    sound(tl, t, () => sfx.ping());
  },
  features(tl, at, root) {
    // Printed out of the slot line by line, then each item gets ticked
    tl.fromTo(root.querySelector(".receipt"), { clipPath: "inset(0 0 100% 0)", y: -40 }, { clipPath: "inset(0 0 -20px 0)", y: 0, duration: 1.1, ease: "steps(18)", clearProps: "clipPath,transform" }, at)
      .fromTo(root.querySelector(".printer span"), { scaleX: 1 }, { keyframes: { scaleX: [1, 0.6, 1, 0.6, 1] }, duration: 1.1, ease: "none" }, at);
    sound(tl, at, () => sfx.printer({ duration: 1.1, steps: 18 }));
    root.querySelectorAll(".rc-item em").forEach((em, i) => {
      tl.fromTo(em, { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.25, ease: "back.out(3)" }, at + 1.1 + i * 0.09);
      sound(tl, at + 1.1 + i * 0.09, () => sfx.tick({ pitch: 1 + i * 0.06 }));
    });
    sound(tl, at + 1.9, () => sfx.pop({ pitch: 1.3 }));
    tl.fromTo(root.querySelector(".rc-total b"), { scale: 1.6, color: "#d6336c" }, { scale: 1, color: "#111", duration: 0.4, ease: "back.out(2)", clearProps: "color,transform" }, at + 1.9);
  },
  results(tl, at, root) {
    tl.from(root.querySelector(".stage-h"), { x: -18, opacity: 0, duration: 0.3 }, at);
    root.querySelectorAll(".score").forEach((card, i) => {
      const t = at + 0.1 + i * 0.2;
      tl.fromTo(card, { y: -220, rotation: i % 2 ? -20 : 20, opacity: 0 }, { y: 0, rotation: tilt(card), opacity: 1, duration: 0.55, ease: "bounce.out" }, t)
        .fromTo(card.querySelector(".tape"), { scaleX: 0 }, { scaleX: 1, duration: 0.2, ease: "power2.out" }, t + 0.45);
      sound(tl, t + 0.2, () => sfx.thud({ strength: 0.55 }));
      sound(tl, t + 0.45, () => sfx.paper());
    });
    // Counter ticks speed up and rise in pitch, like a scoreboard rolling
    [0, 0.08, 0.17, 0.27, 0.38, 0.5, 0.64, 0.8].forEach((d, i) => sound(tl, at + 0.7 + d, () => sfx.tick({ pitch: 0.7 + i * 0.08 })));
    // Numbers count up; words flicker on like a neon sign
    root.querySelectorAll("[data-to]").forEach((b) => {
      const to = Number(b.dataset.to);
      const decimals = Number(b.dataset.decimals || 0);
      const suffix = b.dataset.suffix || "";
      const state = { v: to === 0 ? 9 : 0 };
      tl.to(state, { v: to, duration: 1, ease: "power2.out", onUpdate: () => (b.textContent = state.v.toFixed(decimals) + suffix) }, at + 0.7);
    });
    root.querySelectorAll("[data-word]").forEach((b) => {
      tl.fromTo(b, { opacity: 0 }, { keyframes: { opacity: [0, 1, 0.2, 1, 0.4, 1] }, duration: 0.6, ease: "none" }, at + 0.9);
      [0, 0.2, 0.4].forEach((d) => sound(tl, at + 0.9 + d, () => sfx.blip()));
    });
    sound(tl, at + 1.2, () => sfx.paper());
    sound(tl, at + 1.93, () => sfx.stamp());
    tl.from(root.querySelector(".learned"), { y: 30, rotation: 3, opacity: 0, duration: 0.4, ease: "back.out(2)" }, at + 1.2)
      .fromTo(root.querySelector(".verified"), { scale: 3, rotation: -35, opacity: 0 }, { scale: 1, rotation: -9, opacity: 1, duration: 0.25, ease: "power4.in" }, at + 1.7);
    shake(tl, at + 1.95);
  },
};

const enter = (key, tl = gsap.timeline(), at = 0) => {
  ENTER[key](tl, at, stageRef.value);
  return tl;
};

// Cover swings open and the file gets filled in (folder already on the desk, cover closed)
const openFile = (tl) => {
  const vals = sheetRef.value.querySelectorAll(".val");
  const tCover = tl.duration() + 0.2;
  // The cover swings all the way over and stays open, lying flat to the left of the papers
  // (it may run off the edge of the screen; that's fine)
  tl.to(coverRef.value, { rotationY: -180, duration: 0.9, ease: "power2.inOut" }, tCover)
    .from(sheetRef.value, { y: 30, duration: 0.5, ease: "back.out(2)", clearProps: "transform" }, "-=0.5");
  sound(tl, tCover, () => sfx.rustle({ duration: 0.8 }));
  sound(tl, tCover + 0.86, () => sfx.slap());
  const tTitle = tl.duration() - 0.25;
  tl.fromTo(titleRef.value, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.5, ease: "steps(11)", clearProps: "clipPath" }, tTitle);
  sound(tl, tTitle, () => sfx.printer({ duration: 0.5, steps: 11 }));
  // Form values are "handwritten" left to right, one after another
  const tVals = tl.duration();
  tl.fromTo(vals, { clipPath: "inset(0 100% -30% 0)" }, { clipPath: "inset(0 0% -30% 0)", duration: 0.45, stagger: 0.2, ease: "power1.inOut", clearProps: "clipPath" }, tVals);
  vals.forEach((_, i) => sound(tl, tVals + i * 0.2, () => sfx.scribble({ duration: 0.4 })));
  const tStamp = tl.duration() - 0.3;
  tl.fromTo(stampRef.value, { scale: 3.2, rotation: -30, opacity: 0 }, { scale: 1, rotation: 8, opacity: 0.85, duration: 0.28, ease: "power4.in", clearProps: "transform,opacity" }, tStamp);
  sound(tl, tStamp + 0.26, () => sfx.stamp());
  shake(tl, ">");
  enter("overview", tl, tl.duration() - 1.2);
  return tl;
};

// First visit: the folder drops onto the desk, then opens
// Opened by any click or key once the folder is waiting (that gesture also unlocks audio)
const openFromWait = () => {
  if (!waitingToOpen.value) return;
  stopWaiting();
  mainTl = openFile(gsap.timeline());
};
const stopWaiting = () => {
  waitingToOpen.value = false;
  window.removeEventListener("click", openFromWait);
  window.removeEventListener("keydown", openFromWait);
};

const playIntro = () => {
  gsap.set(coverRef.value, { rotationY: 0, autoAlpha: 1 });
  const tl = (mainTl = gsap.timeline());
  tl.from(folderRef.value, { y: -180, rotation: -7, opacity: 0, duration: 0.5, ease: "power3.in", clearProps: "transform,opacity" }).to(folderRef.value, thud);
  sound(tl, 0.48, () => sfx.thud());
  // Browsers block audio until the visitor interacts. On a direct visit, land closed and
  // wait for a click so the opening isn't silent; coming from the site, just open.
  if (audioReady()) {
    openFile(tl);
    return;
  }
  tl.add(() => {
    waitingToOpen.value = true;
    // click (not pointerdown): it's the gesture Safari accepts for starting audio
    window.addEventListener("click", openFromWait);
    window.addEventListener("keydown", openFromWait);
  });
};

// ---------- tabs: thumb through the pages, land on the new artifact ----------
const switchTab = (key) => {
  if (key === tab.value || busy) return;
  if (reduced) {
    tab.value = key;
    return;
  }
  busy = true;
  settle();
  const order = TABS.map((t) => t.key);
  const dir = order.indexOf(key) > order.indexOf(tab.value) ? 1 : -1;
  const pages = ghosts();
  const tl = (mainTl = gsap.timeline());
  tl.fromTo(tabEls[key], { y: 0 }, { keyframes: { y: [-12, 0] }, duration: 0.35, ease: "power2.out", clearProps: "transform" }, 0)
    .to(bodyRef.value, { keyframes: { rotation: [0, -0.6 * dir, 0.3 * dir, 0] }, duration: 0.5, clearProps: "transform" }, 0)
    // Blank pages cover the sheet, then flip away one after another (up going forward, down going back)
    .set(pages, { opacity: 1, rotationX: 0, y: 0, transformOrigin: dir > 0 ? "50% 0%" : "50% 100%" }, 0)
    .add(async () => {
      tab.value = key;
      await nextTick();
      resetStageScroll();
      enterTl = enter(key, gsap.timeline({ delay: 0.4 }));
    }, 0.05)
    .to(pages, { rotationX: dir > 0 ? -100 : 100, y: dir > 0 ? -20 : 20, duration: 0.26, stagger: 0.07, ease: "power2.in" }, 0.05)
    .set(pages, { opacity: 0 }, ">")
    .fromTo(sheetRef.value, { y: 6 * dir, scale: 0.985 }, { y: 0, scale: 1, duration: 0.3, ease: "back.out(3)", clearProps: "transform" }, 0.45)
    .add(() => (busy = false), 0.6);
  sound(tl, 0, () => sfx.click());
  pages.forEach((_, i) => sound(tl, 0.12 + i * 0.07, () => sfx.paper()));
};

// ---------- next project: close the file, put it away, the next one slides in and opens ----------
const switchProject = (next) => {
  if (!next || next === shown.value) return;
  const dir = navDir || (projects.indexOf(next) > projects.indexOf(shown.value) ? 1 : -1);
  navDir = 0;
  if (reduced || !folderRef.value) {
    window.scrollTo(0, 0);
    shown.value = next;
    tab.value = "overview";
    return;
  }
  busy = true;
  settle();
  stopWaiting();
  // Bring the whole folder into view while the old file is put away
  window.scrollTo({ top: 0, behavior: "smooth" });
  const folder = folderRef.value;
  const tl = (mainTl = gsap.timeline());
  // The open cover swings back over and shuts on the current file
  tl.to(coverRef.value, { rotationY: 0, duration: 0.6, ease: "power2.inOut" }, 0.2)
    .to(folder, { keyframes: { scaleY: [0.98, 1] }, duration: 0.15, clearProps: "transform" }, 0.8)
    // Filed away, like going back into the cabinet
    .to(folder, { x: `${-115 * dir}vw`, y: 40, rotation: -10 * dir, duration: 0.55, ease: "power2.in" }, 1);
  sound(tl, 0.2, () => sfx.rustle({ duration: 0.6 }));
  sound(tl, 0.78, () => sfx.thud({ strength: 0.45 }));
  sound(tl, 1, () => sfx.whoosh({ duration: 0.55 }));
  tl.add(async () => {
      shown.value = next;
      tab.value = "overview";
      await nextTick();
      resetStageScroll();
      // The next file arrives from the other side, lands with a thud and opens
      const tl2 = (mainTl = gsap.timeline({ onComplete: () => (busy = false) }));
      tl2.fromTo(folder, { x: `${115 * dir}vw`, y: -30, rotation: 9 * dir }, { x: 0, y: 0, rotation: 0, duration: 0.65, ease: "power3.out" })
        .to(folder, thud);
      sound(tl2, 0, () => sfx.whoosh({ duration: 0.6, up: false }));
      sound(tl2, 0.62, () => sfx.thud());
      openFile(tl2);
    });
};

watch(
  () => route.params.id,
  (id) => {
    if (!id) return;
    const next = getProjectById(id);
    if (!shown.value || !next) {
      shown.value = next;
      tab.value = "overview";
      return;
    }
    switchProject(next);
  },
);

// ← / → flip between files (ignored while typing, e.g. in the chatbot)
const onKey = (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || busy || !shown.value) return;
  if (e.target.closest("input, textarea, select, [contenteditable='true']")) return;
  const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
  if (!dir) return;
  markDir(dir);
  router.push(`/projects/${(dir > 0 ? nextProject : prevProject).value.id}`);
};

onMounted(() => {
  // The file should open at the top. ScrollTrigger (used on the home page) remembers the
  // old scroll position and restores it on its next refresh, so clear that memory too.
  ScrollTrigger.clearScrollMemory();
  window.scrollTo(0, 0);
  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", fitFolder);
  // Measure before the intro moves the folder around
  fitFolder();
  if (!shown.value) return;
  if (reduced) {
    gsap.set(coverRef.value, { rotationY: -180 });
    return;
  }
  playIntro();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
  window.removeEventListener("resize", fitFolder);
  stopWaiting();
  settle();
});
</script>

<style scoped>
/* ---------- Folder ---------- */
.folder {
  position: relative;
  perspective: 1800px;
}
/* overflow-x also clips vertically, so leave headroom for tabs that lift */
.tabs {
  position: relative;
  z-index: 2;
  display: flex;
  gap: 4px;
  padding: 18px 0 0 18px;
  margin-top: -18px;
  overflow-x: auto;
  scrollbar-width: none;
}
.tabs::-webkit-scrollbar {
  display: none;
}
.tab {
  flex-shrink: 0;
  font: 700 0.78rem "Space Grotesk", sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #111;
  padding: 10px 18px 12px;
  background: #d9bf8a;
  border: 2.5px solid #000;
  border-bottom: 0;
  border-radius: 10px 10px 0 0;
  transform: translateY(6px);
  transition: transform 0.2s, background 0.2s;
}
.tab:hover {
  transform: translateY(2px);
}
.tab.on {
  background: #e8d3a7;
  transform: translateY(2.5px);
}
.tab:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}
.folder-body {
  position: relative;
  transform-style: preserve-3d;
  background: #e8d3a7;
  border: 2.5px solid #000;
  border-radius: 0 14px 14px 14px;
  box-shadow: 8px 8px 0 var(--color-shadow);
  padding: clamp(10px, 3vw, 30px);
}

/* Cover: two faces; once open it lies flat to the left with its plain inside showing */
.cover {
  position: absolute;
  inset: -2.5px;
  z-index: 10;
  transform-origin: left center;
  transform-style: preserve-3d;
  pointer-events: none;
}
.cover-face {
  position: absolute;
  inset: 0;
  border: 2.5px solid #000;
  border-radius: 0 14px 14px 14px;
  backface-visibility: hidden;
}
/* Label (and the click-to-open hint below it) sit near the top so they stay on screen
   even when the folder is taller than the viewport */
.cover-front {
  --label-top: clamp(48px, 14vh, 140px);
  display: grid;
  justify-items: center;
  align-content: start;
  padding-top: var(--label-top);
  background: #dcc391 repeating-linear-gradient(90deg, #0000 0 40px, #00000008 40px 41px);
}
.cover-back {
  background: #cdb07a;
  transform: rotateY(180deg);
}
.cover-label {
  background: #fffdf5;
  border: 2.5px solid #000;
  padding: 18px 34px;
  text-align: center;
  color: #111;
  transform: rotate(-2deg);
  box-shadow: 4px 4px 0 #0004;
}
.cover-label small {
  display: block;
  font: 700 0.7rem "Space Grotesk", sans-serif;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.6;
}
.cover-label b {
  display: block;
  font-size: clamp(1.5rem, 5vw, 2.6rem);
  letter-spacing: -0.06em;
  text-transform: uppercase;
  margin: 6px 0;
}
.cover-stamp {
  position: absolute;
  right: 8%;
  bottom: 14%;
  font-size: 1rem;
  color: #d6336c;
  border: 3px solid #d6336c;
  padding: 6px 12px;
  transform: rotate(-12deg);
  text-transform: uppercase;
  letter-spacing: -0.03em;
  opacity: 0.8;
}

.open-hint {
  position: absolute;
  z-index: 11;
  left: 50%;
  top: calc(clamp(48px, 14vh, 140px) + 160px);
  transform: translateX(-50%) rotate(-3deg);
  font-size: 0.95rem;
  letter-spacing: -0.03em;
  text-transform: uppercase;
  color: #000;
  background: #ffdd00;
  border: 3px solid #000;
  box-shadow: 5px 5px 0 #000;
  padding: 12px 22px;
  animation: hint-pulse 1.4s ease-in-out infinite;
}
.open-hint:focus-visible {
  outline: 3px solid #000;
  outline-offset: 4px;
}
@keyframes hint-pulse {
  50% {
    transform: translateX(-50%) rotate(-3deg) scale(1.07);
  }
}

/* ---------- Sheet ---------- */
.sheet-stack {
  position: relative;
}
.sheet-under {
  position: absolute;
  inset: 0;
  background: #f6efdc;
  border: 2.5px solid #000;
  transform: rotate(-1.2deg) translate(6px, 6px);
}
.sheet {
  position: relative;
  color: #111;
  background: #fffdf5 repeating-linear-gradient(transparent 0 31px, #0000000f 31px 32px);
  background-position: 0 14px;
  border: 2.5px solid #000;
  padding: clamp(18px, 4vw, 40px);
}
.file-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}
.file-no {
  font: 700 0.72rem "Space Grotesk", sans-serif;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.6;
}
.file-title {
  font-size: clamp(2rem, 6vw, 3.2rem);
  line-height: 0.95;
  margin-top: 6px;
  letter-spacing: -0.05em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}
.stamp {
  font-size: 0.9rem;
  color: #d6336c;
  border: 3px solid #d6336c;
  padding: 6px 12px;
  transform: rotate(8deg);
  text-transform: uppercase;
  letter-spacing: -0.02em;
  opacity: 0.85;
  mix-blend-mode: multiply;
  white-space: nowrap;
}
.form-row {
  display: grid;
  /* Two columns even on a phone, four on desktop */
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 14px 16px;
  margin: 18px 0 22px;
}
.field dt {
  font: 700 0.62rem "Space Grotesk", sans-serif;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.55;
}
.val {
  font: 600 1.55rem/1.1 "Caveat", cursive;
  color: #1d4ed8;
  border-bottom: 1.5px solid #000;
  padding-bottom: 2px;
}
.stage {
  min-height: 380px;
}
.stage-h {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 1.25rem;
  letter-spacing: -0.05em;
  text-transform: uppercase;
  margin: 0 0 14px;
}
.lead {
  max-width: 70ch;
  font-weight: 500;
  line-height: 1.6;
  margin: 0 0 18px;
}

/* Desktop: the folder is sized to the screen and long content scrolls inside the sheet */
@media (min-width: 900px) and (min-height: 600px) {
  .folder-body {
    display: flex;
    height: var(--fit-h, auto);
  }
  .sheet-stack {
    flex: 1;
    min-width: 0;
    min-height: 0;
  }
  .sheet {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 24px 32px 0;
  }
  .stage {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    /* room for card shadows and the paper-clip, plus space at the end of the scroll */
    padding: 4px 10px 28px 2px;
    margin-right: -10px;
    scrollbar-width: thin;
    scrollbar-color: #00000055 transparent;
    /* Fade at the bottom edge hints that the sheet scrolls */
    -webkit-mask-image: linear-gradient(#000 calc(100% - 36px), transparent);
    mask-image: linear-gradient(#000 calc(100% - 36px), transparent);
  }
  .polaroid {
    max-width: 250px;
  }
}

/* Blank pages for the tab rifle */
.rifle {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
  perspective: 1400px;
}
.rifle i {
  position: absolute;
  inset: 0;
  opacity: 0;
  border: 2.5px solid #000;
  background: #fffdf5 repeating-linear-gradient(transparent 0 31px, #0000000f 31px 32px);
  box-shadow: 0 6px 0 #0002;
}
.rifle i:nth-child(even) {
  background-color: #fbf6e6;
}

/* ---------- Overview ---------- */
.ov {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
}
@media (min-width: 860px) {
  .ov {
    grid-template-columns: 1.15fr 1fr;
  }
}
.memo {
  font-size: 1.02rem;
  line-height: 32px;
  margin: 0 0 18px;
}
.hl {
  background: linear-gradient(#ffdd0099, #ffdd0099) no-repeat 0 85% / 0% 45%;
}
.hl.on {
  background-size: 100% 45%;
  transition: background-size 0.6s ease 0.2s;
}
.sticky-note {
  display: inline-block;
  max-width: 420px;
  background: #fff59d;
  border: 2px solid #000;
  padding: 14px 16px;
  transform: rotate(2deg);
  transform-origin: top left;
  box-shadow: 4px 4px 0 #000;
  font: 600 1.3rem/1.15 "Caveat", cursive;
}
.ov-side {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 22px;
}
.polaroid {
  position: relative;
  width: 100%;
  max-width: 320px;
  margin: 18px 0 0;
  background: #fff;
  border: 2.5px solid #000;
  padding: 10px 10px 34px;
  transform: rotate(-2.5deg);
  transform-origin: 51px -10px;
  box-shadow: 5px 5px 0 #000;
}
.polaroid canvas {
  display: block;
  width: 100%;
  aspect-ratio: 600 / 760;
  border: 2px solid #000;
  background: #f4f1ea;
}
.polaroid figcaption {
  position: absolute;
  bottom: 6px;
  left: 0;
  right: 0;
  text-align: center;
  font: 600 1.15rem "Caveat", cursive;
}
.clip {
  position: absolute;
  top: -22px;
  left: 38px;
  width: 26px;
  height: 58px;
  border: 4px solid #8a8a8a;
  border-radius: 13px;
  border-bottom-color: transparent;
  transform: rotate(-6deg);
}
.paper-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font: 700 0.9rem "Space Grotesk", sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #000;
  padding: 12px 20px;
  background: #ffdd00;
  border: 2.5px solid #000;
  box-shadow: 4px 4px 0 #000;
  transition: transform 0.15s, box-shadow 0.15s;
}
.paper-btn.ghost {
  background: #fff;
}
.paper-btn:hover {
  transform: translate(4px, 4px);
  box-shadow: none;
}

/* ---------- Challenge ---------- */
.marker {
  font: 600 1.4rem "Caveat", cursive;
  color: #dc2626;
  text-transform: none;
  letter-spacing: 0;
  border: 2.5px solid #dc2626;
  border-radius: 50%;
  padding: 0 12px;
  transform: rotate(-4deg);
}
.issues {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 26px 22px;
  padding: 14px 4px 20px;
}
.issue {
  position: relative;
  background: #ffe4e6;
  border: 2.5px solid #000;
  box-shadow: 5px 5px 0 #000;
  padding: 26px 18px 18px;
  transform: rotate(var(--r));
}
.issue small {
  font: 700 0.65rem "Space Grotesk", sans-serif;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #b91c1c;
}
.issue b {
  display: block;
  font-size: 1.05rem;
  letter-spacing: -0.05em;
  text-transform: uppercase;
  margin: 6px 36px 8px 0;
}
.issue p {
  margin: 0;
  font-weight: 500;
  line-height: 1.5;
}
.issue .x {
  position: absolute;
  right: 10px;
  top: 6px;
  font-size: 2.2rem;
  color: #dc2626;
}
.tape {
  position: absolute;
  left: 50%;
  top: -12px;
  width: 90px;
  height: 24px;
  margin-left: -45px;
  background: #ffffffb3;
  border: 1.5px solid #0003;
  transform: rotate(-3deg);
  transform-origin: left center;
}

/* ---------- Solution blueprint ---------- */
.blueprint {
  color: #fff;
  background-color: #1d4ed8;
  background-image: linear-gradient(#ffffff1f 1px, transparent 1px), linear-gradient(90deg, #ffffff1f 1px, transparent 1px);
  background-size: 22px 22px;
  border: 2.5px solid #000;
  box-shadow: 6px 6px 0 #000;
  padding: 18px;
}
.bp-title {
  font: 700 0.72rem "Space Grotesk", sans-serif;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.85;
  border-bottom: 1.5px dashed #fff8;
  padding-bottom: 8px;
  margin-bottom: 14px;
}
.flow + .flow {
  margin-top: 22px;
}
.bp-label {
  font: 700 0.68rem "Space Grotesk", sans-serif;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.8;
  margin-bottom: 10px;
}
/* Desktop: a row with arrows; mobile: a column with arrows pointing down */
.flow-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.flow-node {
  position: relative;
  text-align: center;
  font-weight: 700;
  font-size: 0.85rem;
  padding: 12px 8px;
  border: 2.5px solid #fff;
}
.flow-arrow {
  align-self: center;
  width: 2.5px;
  height: 22px;
  background: #fff;
  position: relative;
  transform-origin: top center;
}
.flow-arrow::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -2px;
  border: 6px solid transparent;
  border-top: 8px solid #fff;
  border-bottom: 0;
  transform: translateX(-50%);
}
.bp-ping {
  position: absolute;
  right: -6px;
  top: -14px;
  font-size: 0.8rem;
  font-style: normal;
  color: #000;
  background: #ffdd00;
  border: 2px solid #000;
  padding: 1px 7px;
  transform: rotate(6deg);
  opacity: 0;
}
@media (min-width: 720px) {
  .flow-row {
    flex-direction: row;
    align-items: center;
  }
  .flow-node {
    flex: 1;
    min-width: 0;
    padding: 14px 6px;
  }
  .flow-arrow {
    width: 28px;
    height: 2.5px;
    flex-shrink: 0;
    transform-origin: left center;
  }
  .flow-arrow::after {
    left: auto;
    right: -2px;
    bottom: auto;
    top: 50%;
    border: 6px solid transparent;
    border-left: 8px solid #fff;
    border-right: 0;
    transform: translateY(-50%);
  }
}
.bp-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  margin-top: 18px;
  font-weight: 700;
  font-size: 0.9rem;
}

/* ---------- Features receipt ---------- */
.ft {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 10px;
}
.printer {
  position: relative;
  z-index: 2;
  width: min(380px, 94%);
  height: 26px;
  display: grid;
  place-items: center;
  background: #111;
  border: 2.5px solid #000;
  border-radius: 8px 8px 4px 4px;
}
.printer span {
  width: 82%;
  height: 6px;
  background: #444;
  border-radius: 3px;
}
.receipt {
  width: min(340px, 86%);
  margin-top: -4px;
  background: #fff;
  border: 2px solid #000;
  border-top: 0;
  padding: 20px 18px 26px;
  font: 500 0.85rem/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
  box-shadow: 5px 5px 0 #0003;
  /* Torn zig-zag bottom edge */
  -webkit-mask: linear-gradient(#000 0 0) top / 100% calc(100% - 10px) no-repeat,
    conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 16px 10px repeat-x;
  mask: linear-gradient(#000 0 0) top / 100% calc(100% - 10px) no-repeat,
    conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 16px 10px repeat-x;
}
.rc-head {
  display: flex;
  flex-direction: column;
  text-align: center;
}
.rc-head b {
  font-size: 1.05rem;
  letter-spacing: -0.04em;
}
.rc-line {
  border-top: 2px dashed #000;
  margin: 12px 0;
}
.rc-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.rc-item i {
  flex: 1;
  min-width: 12px;
  border-bottom: 2px dotted #0006;
  transform: translateY(-4px);
}
.rc-item em,
.rc-total b {
  display: inline-block;
  font-style: normal;
  font-weight: 800;
}
.rc-item em {
  color: #16a34a;
}
.rc-total {
  display: flex;
  justify-content: space-between;
  font-weight: 800;
  font-size: 1rem;
}
.rc-tech {
  margin-top: 10px;
  font-size: 0.72rem;
  text-align: center;
  opacity: 0.7;
}
.rc-bar {
  height: 40px;
  margin: 14px 0 8px;
  background: repeating-linear-gradient(90deg, #000 0 2px, transparent 2px 4px, #000 4px 7px, transparent 7px 9px, #000 9px 10px, transparent 10px 13px);
}
.rc-thanks {
  text-align: center;
  font-weight: 700;
}

/* ---------- Results ---------- */
.scores {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 26px 22px;
  padding: 14px 4px 10px;
}
.score {
  position: relative;
  background: var(--bg);
  border: 2.5px solid #000;
  box-shadow: 5px 5px 0 #000;
  padding: 26px 16px 18px;
  text-align: center;
  transform: rotate(var(--r));
}
.score b {
  display: block;
  font-size: clamp(2.4rem, 6vw, 3.4rem);
  letter-spacing: -0.07em;
  line-height: 1;
}
.score b.wordy {
  font-size: clamp(1.6rem, 4vw, 2.2rem);
}
.score > span:last-child {
  display: block;
  margin-top: 10px;
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.verified {
  position: absolute;
  right: 6px;
  bottom: -26px;
  font-size: 1rem;
  color: #16a34a;
  border: 3px solid #16a34a;
  padding: 4px 12px;
  transform: rotate(-9deg);
  text-transform: uppercase;
  letter-spacing: -0.03em;
  mix-blend-mode: multiply;
}
.learned {
  max-width: 560px;
  margin-top: 44px;
  background: #fff repeating-linear-gradient(transparent 0 27px, #3b82f633 27px 28px);
  border: 2px solid #000;
  padding: 14px 18px;
  transform: rotate(-1deg);
}
.learned small {
  font: 700 0.65rem "Space Grotesk", sans-serif;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.6;
}
.learned ul {
  margin: 4px 0 0;
  padding-left: 1.1em;
  list-style: "– ";
  font: 600 1.3rem/28px "Caveat", cursive;
  color: #1d4ed8;
}

/* ---------- Prev / next file ---------- */
.file-nav {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.file-link {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  max-width: 100%;
  justify-self: start;
  padding: 8px 14px;
  color: #111;
  background: #fffdf5;
  border: 2.5px solid #000;
  box-shadow: 4px 4px 0 var(--color-shadow);
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
}
.file-link-next {
  justify-self: end;
  text-align: right;
}
.file-link:hover {
  background: #ffdd00;
  transform: translate(3px, 3px);
  box-shadow: 1px 1px 0 var(--color-shadow);
}
.file-link small {
  display: block;
  font: 700 0.62rem "Space Grotesk", sans-serif;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.6;
}
.file-link b {
  display: block;
  font: 800 0.95rem "Lexend Mega", sans-serif;
  letter-spacing: -0.05em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-arrow {
  font: 800 1.3rem "Lexend Mega", sans-serif;
}
.file-count {
  font: 700 0.7rem "Space Grotesk", sans-serif;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.6;
}
:global(.dark .file-count) {
  color: #f4ead5;
}
@media (max-width: 639px) {
  .file-nav {
    grid-template-columns: 1fr 1fr;
  }
  .file-count {
    display: none;
  }
  .file-link {
    gap: 8px;
    padding: 7px 10px;
  }
  .file-link b {
    font-size: 0.78rem;
  }
}

/* ---------- Next file ---------- */
.next-file {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 40px;
  padding: 22px 26px;
  color: #111;
  background: #d9bf8a;
  border: 2.5px solid #000;
  border-radius: 12px;
  box-shadow: 6px 6px 0 var(--color-shadow);
  transition: transform 0.2s;
}
.next-file:hover {
  transform: translateY(-4px) rotate(-0.5deg);
}
.next-file small {
  font: 700 0.68rem "Space Grotesk", sans-serif;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.65;
}
.next-file b {
  display: block;
  font-size: clamp(1.4rem, 4vw, 2.2rem);
  letter-spacing: -0.05em;
  text-transform: uppercase;
}

/* Without motion, show what the animations would have revealed */
@media (prefers-reduced-motion: reduce) {
  .hl {
    background-size: 100% 45%;
  }
  .bp-ping {
    opacity: 1;
  }
}

/* ---------- Not found ---------- */
.lost-file {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #111;
  background: #e8d3a7;
  border: 2.5px solid #000;
  border-radius: 0 14px 14px 14px;
  box-shadow: 8px 8px 0 var(--color-shadow);
  padding: 36px 48px;
  transform: rotate(-1.5deg);
}
.lost-file small {
  font: 700 0.7rem "Space Grotesk", sans-serif;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.6;
}
.lost-file b {
  font-size: clamp(2rem, 7vw, 3.4rem);
  letter-spacing: -0.06em;
  text-transform: uppercase;
}
</style>
