<template>
  <!-- The front of a project's folder: what you read while it stands in the drawer -->
  <div class="file-cover">
    <div class="cover-main">
      <div class="cover-copy">
        <span class="type-sticker">{{ project.type }}</span>
        <h3 class="cover-title font-display" :class="titleSize">{{ project.title }}</h3>
        <p class="cover-desc">{{ project.description }}</p>
        <button v-if="!decorative" type="button" class="open-btn font-display" @click="$emit('open')">Open file →</button>
        <span v-else class="open-btn font-display" aria-hidden="true">Open file →</span>
      </div>
      <ClipSheet class="cover-clip" :api="project.caseFile?.api" />
    </div>
    <div class="cover-stats">
      <span v-for="metric in metrics" :key="metric.label" class="stat">
        <b class="font-display">{{ metric.value }}</b><span>{{ metric.label }}</span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import ClipSheet from "./ClipSheet.vue";

const props = defineProps({
  project: { type: Object, required: true },
  // The copy on the lifted file's cover is only for show
  decorative: { type: Boolean, default: false },
});
defineEmits(["open"]);

const metrics = computed(() => (props.project.results?.metrics || []).slice(0, 3));
// Lexend Mega is very wide: size the title by its longest word so it never overflows
const titleSize = computed(() => {
  const longest = Math.max(...props.project.title.split(/\s+/).map((w) => w.length));
  return longest <= 7 ? "t-big" : longest <= 10 ? "t-mid" : "t-small";
});
</script>

<style scoped>
.file-cover {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: 18px 20px var(--front-cover, 60px);
  color: #111;
  text-align: left;
}
.cover-main {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 18px;
}
.type-sticker {
  display: inline-block;
  padding: 3px 10px;
  background: #fff;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  font: 700 0.62rem "JetBrains Mono", monospace;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transform: rotate(-3deg);
}
.cover-title {
  margin: 12px 0 6px;
  font-weight: 800;
  line-height: 0.92;
  letter-spacing: -0.07em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}
.t-big { font-size: clamp(1.6rem, 4vw, 2.3rem); }
.t-mid { font-size: clamp(1.4rem, 3.4vw, 2rem); }
.t-small { font-size: clamp(1.2rem, 2.8vw, 1.7rem); }
.cover-desc {
  margin: 0 0 12px;
  max-width: 32ch;
  font-size: 0.86rem;
  font-weight: 500;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.open-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  background: #111;
  color: #fff;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 #fff, 4px 4px 0 3px #000;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  text-transform: uppercase;
  transition: transform 0.12s, box-shadow 0.12s;
}
button.open-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 #fff, 6px 6px 0 3px #000;
}
button.open-btn:active {
  transform: translate(3px, 3px);
  box-shadow: 1px 1px 0 #fff, 1px 1px 0 3px #000;
}
.cover-clip {
  width: 180px;
  height: 180px;
  margin-top: 6px;
  transform: rotate(3deg);
}
.cover-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}
.stat {
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding: 5px 9px;
  background: #fff;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
}
.stat:nth-child(2) { transform: rotate(-1.5deg); }
.stat:nth-child(3) { transform: rotate(1deg); }
.stat b {
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.06em;
}
.stat span {
  font: 700 0.54rem "JetBrains Mono", monospace;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Phones: no clipped sheet, one stat line */
@media (max-width: 639px) {
  .file-cover {
    padding: 14px 14px var(--front-cover, 50px);
  }
  .cover-main {
    grid-template-columns: 1fr;
  }
  .cover-clip {
    display: none;
  }
  .cover-desc {
    -webkit-line-clamp: 2;
    font-size: 0.8rem;
  }
  .stat:nth-child(3) {
    display: none;
  }
}
</style>
