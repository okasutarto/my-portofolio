<template>
  <!-- One sheet in an opened file. Everything fits on the sheet; nothing scrolls. -->
  <div class="sheet">
    <h4 class="font-display">
      <span class="no">{{ pad(page + 1) }}</span>{{ TITLES[page] }}<small>No. {{ pad(index + 1) }} · {{ project.title }}</small>
    </h4>

    <!-- 01 Overview: the story, the file card, the numbers -->
    <template v-if="page === 0">
      <div class="ov fill">
        <div>
          <p class="lead">{{ project.overview }}</p>
          <span v-if="cf.quote" class="quote">“{{ capitalize(cf.quote) }}.”</span>
        </div>
        <div class="form">
          <div v-for="[label, value] in facts" :key="label">
            <small>{{ label }}</small><b>{{ value }}</b>
          </div>
          <span class="stamp font-display">{{ status }} ✓</span>
        </div>
      </div>
      <div class="bigs">
        <div v-for="metric in metrics" :key="metric.label" :style="{ backgroundColor: color }">
          <b class="font-display">{{ metric.value }}</b><span>{{ metric.label }}</span>
        </div>
      </div>
    </template>

    <!-- 02 Challenge → Solution, one row per problem -->
    <div v-else-if="page === 1" class="cs fill">
      <span class="head" style="background: #fecaca">The problem</span>
      <span class="sp"></span>
      <span class="head" style="background: #bbf7d0">What I built</span>
      <template v-for="(point, j) in problems" :key="point">
        <div class="card bad"><i>✕</i>{{ point }}</div>
        <span class="arr font-display">→</span>
        <div class="card good"><i>✓</i>{{ project.solution.points[j] }}</div>
      </template>
    </div>

    <!-- 03 Features, as a sheet of stickers -->
    <div v-else-if="page === 2" class="feat fill">
      <span
        v-for="(feature, j) in project.features.slice(0, 9)"
        :key="feature"
        class="font-display"
        :class="{ taped: j % 3 === 1 }"
        :style="{ backgroundColor: stickerColor(j), rotate: `${TILTS[j % TILTS.length]}deg` }">
        <small>{{ pad(j + 1) }}</small>{{ feature }}
      </span>
    </div>

    <!-- 04 How it works: the flows, plus the site sketch or an API printout -->
    <div v-else-if="page === 3" class="hw fill">
      <div class="flows">
        <div v-for="flow in cf.flows || []" :key="flow.label">
          <small>{{ flow.label }}</small>
          <div class="flow">
            <template v-for="(node, j) in flow.nodes" :key="node">
              <i v-if="j" aria-hidden="true">→</i>
              <span :class="{ hot: j === flow.ping }">{{ node }}<em v-if="j === flow.ping && flow.pingText"> · {{ flow.pingText }}</em></span>
            </template>
          </div>
        </div>
      </div>
      <ClipSheet class="hw-clip" :api="cf.api" />
    </div>

    <!-- 05 Stack & results -->
    <div v-else class="st fill">
      <div>
        <div class="chips">
          <span v-for="tech in project.technologies" :key="tech">{{ tech }}</span>
        </div>
        <div v-if="project.learnings?.length" class="learned">
          <small>What I learned</small>
          <ul>
            <li v-for="item in project.learnings.slice(0, 3)" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div class="links">
          <a v-for="link in links" :key="link.href" :href="link.href" target="_blank" rel="noopener noreferrer" class="link-btn font-display" :class="link.class">
            {{ link.label }}
          </a>
          <span v-if="!links.length" class="private">Private build · {{ status }}</span>
        </div>
      </div>
      <div class="vbigs">
        <div v-for="metric in metrics" :key="metric.label" :style="{ backgroundColor: color }">
          <b class="font-display">{{ metric.value }}</b><span>{{ metric.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { FILE_PAGES } from "@/data/projectFiles";
import { computed } from "vue";
import ClipSheet from "./ClipSheet.vue";

const props = defineProps({
  project: { type: Object, required: true },
  index: { type: Number, required: true },
  page: { type: Number, required: true },
  color: { type: String, required: true },
  nextColor: { type: String, required: true },
});

const TITLES = FILE_PAGES.map((page) => page.title);
const TILTS = [-2, 1.5, -1, 2, -2.5, 1];
const pad = (n) => String(n).padStart(2, "0");
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const isLink = (href) => href && href !== "#";

const cf = computed(() => props.project.caseFile || {});
const metrics = computed(() => (props.project.results?.metrics || []).slice(0, 3));
const problems = computed(() => props.project.problem.points.slice(0, 4));
const status = computed(() => (/ongoing/i.test(props.project.duration) ? "In progress" : "Shipped"));
const facts = computed(() => [
  ["Client", cf.value.client || "Personal project"],
  ["Type", props.project.type],
  ["Year", props.project.year],
  ["Built in", props.project.duration],
  ["Role", props.project.role],
]);
const links = computed(() =>
  [
    isLink(props.project.demoLink) && { label: "Open live ↗", href: props.project.demoLink, class: "" },
    isLink(props.project.codeLink) && { label: "Code ↗", href: props.project.codeLink, class: "ghost" },
  ].filter(Boolean),
);
const stickerColor = (j) => ["#fff", props.color, "#ffdd00", props.nextColor, "#fff", "#bfdbfe"][j % 6];
</script>

<style scoped>
.sheet {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  overflow: hidden;
  color: #111;
  text-align: left;
}
h4 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding-right: 95px;
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.06em;
}
.no {
  padding: 2px 7px;
  background: #111;
  color: #ffdd00;
  font: 700 0.62rem "JetBrains Mono", monospace;
  letter-spacing: 0.04em;
}
h4 small {
  display: none;
}
.fill {
  flex: 1;
  min-height: 0;
}

/* ---------- overview ---------- */
.ov {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 20px;
}
.lead {
  margin: 0 0 12px;
  font-size: 0.86rem;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 9;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.quote,
.private {
  display: inline-block;
  padding: 6px 10px;
  background: #ffdd00;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  font-size: 0.8rem;
  font-style: italic;
  font-weight: 700;
  transform: rotate(-1.5deg);
}
.form {
  position: relative;
  align-self: start;
  padding: 2px 14px;
  background: #fff;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 #000;
}
.form div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 2px dotted #0004;
  font-size: 0.78rem;
}
.form div:last-of-type {
  border-bottom: 0;
}
.form small,
.flows small,
.learned small {
  font: 700 0.56rem "JetBrains Mono", monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.55;
}
.form small {
  align-self: center;
}
.form b {
  text-align: right;
}
.stamp {
  position: absolute;
  right: -12px;
  bottom: -20px;
  padding: 3px 9px;
  background: #fffdf5cc;
  border: 3px solid #16a34a;
  color: #16a34a;
  font-size: 0.74rem;
  font-weight: 800;
  text-transform: uppercase;
  transform: rotate(-9deg);
}
.bigs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.bigs div,
.vbigs div {
  padding: 7px 11px;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 #000;
}
.bigs b,
.vbigs b {
  display: block;
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.07em;
}
.bigs span,
.vbigs span {
  font: 700 0.56rem "JetBrains Mono", monospace;
  text-transform: uppercase;
}

/* ---------- challenge -> solution ---------- */
.cs {
  display: grid;
  grid-template-columns: 1fr 30px 1fr;
  grid-auto-rows: auto;
  gap: 8px 6px;
  align-content: start;
}
.head {
  justify-self: start;
  padding: 2px 8px;
  border: 2.5px solid #000;
  font: 800 0.66rem "Lexend Mega", sans-serif;
  text-transform: uppercase;
}
.card {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  background: #fff;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  font-size: 0.76rem;
  font-weight: 500;
  line-height: 1.35;
}
.card i {
  flex: none;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border: 2.5px solid #000;
  font-style: normal;
  font-weight: 800;
}
.bad i { background: #fecaca; }
.good i { background: #bbf7d0; }
.arr {
  align-self: center;
  justify-self: center;
  font-size: 1.2rem;
  font-weight: 800;
}

/* ---------- features ---------- */
.feat {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 1fr;
  gap: 14px 12px;
  padding: 4px 6px 6px 0;
}
.feat span {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 8px 11px;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 #000;
  font-size: 0.86rem;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.05em;
}
.feat small {
  font: 700 0.56rem "JetBrains Mono", monospace;
  letter-spacing: 0;
  opacity: 0.6;
}
.feat .taped::before {
  content: "";
  position: absolute;
  top: -10px;
  left: 50%;
  width: 52px;
  height: 18px;
  margin-left: -26px;
  background: #ffffffb0;
  border: 1.5px solid #0002;
  transform: rotate(-4deg);
}

/* ---------- how it works ---------- */
.hw {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 18px;
}
.flows {
  display: grid;
  gap: 16px;
  align-content: start;
}
.flow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}
.flow span {
  padding: 6px 9px;
  background: #fff;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  font-size: 0.74rem;
  font-weight: 700;
}
.flow span.hot {
  background: #22c55e;
  color: #fff;
}
.flow em {
  font-style: normal;
}
.flow i {
  font-style: normal;
  font-weight: 800;
}
.hw-clip {
  align-self: start;
  min-height: 190px;
  margin-top: 8px;
  transform: rotate(-1.5deg);
}

/* ---------- stack & results ---------- */
.st {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 20px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.chips span {
  padding: 5px 10px;
  background: #fff;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  font: 700 0.68rem "JetBrains Mono", monospace;
  text-transform: uppercase;
}
.chips span:nth-child(3n + 1) {
  background: #ffdd00;
}
.learned {
  margin: 14px 0;
  padding: 8px 12px;
  border: 3px dashed #000;
}
.learned ul {
  margin: 4px 0 0;
  padding-left: 16px;
  font-size: 0.76rem;
  line-height: 1.5;
  list-style: square;
}
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.link-btn {
  padding: 9px 14px;
  background: #111;
  color: #fff;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 #fff, 4px 4px 0 3px #000;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
}
.link-btn.ghost {
  background: #fff;
  color: #111;
}
.link-btn:hover {
  transform: translate(-2px, -2px);
}
.private {
  background: #fff;
}
.vbigs {
  display: grid;
  gap: 12px;
  align-content: start;
}
.vbigs div:nth-child(2) { transform: rotate(-1.5deg); }
.vbigs div:nth-child(3) { transform: rotate(1deg); }

/* ---------- phones: single column, the extras go ---------- */
@media (max-width: 639px) {
  .sheet {
    padding: 12px 12px;
    gap: 8px;
  }
  h4 {
    font-size: 1rem;
  }
  h4 small,
  .quote,
  .hw-clip,
  .learned {
    display: none;
  }
  .ov,
  .st,
  .hw {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .lead {
    font-size: 0.72rem;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 6;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .form div {
    padding: 3px 0;
    font-size: 0.66rem;
  }
  .bigs {
    gap: 8px;
  }
  .bigs div {
    padding: 4px 6px;
  }
  .bigs span,
  .vbigs span {
    display: block;
    font-size: 0.46rem;
    line-height: 1.2;
  }
  .stamp {
    display: none;
  }
  .bigs b,
  .vbigs b {
    font-size: 1.1rem;
  }
  .cs {
    grid-template-columns: 1fr;
    gap: 5px;
  }
  .cs .head,
  .cs .sp,
  .arr,
  .card.bad {
    display: none;
  }
  .card {
    font-size: 0.7rem;
  }
  .feat {
    grid-template-columns: repeat(2, 1fr);
    gap: 9px;
  }
  .feat span {
    font-size: 0.7rem;
  }
  .vbigs {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
