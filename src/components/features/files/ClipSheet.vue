<template>
  <!-- A sheet clipped to a file: a sketch of the site, or a printout of an API call -->
  <div class="clip-sheet" :class="{ json: !!api }">
    <span class="clip" aria-hidden="true"></span>
    <template v-if="api">
      <span class="method">{{ method }}</span> {{ path }}
      <span class="status">{{ api.status }}</span>
      <pre>{{ api.body }}</pre>
    </template>
    <template v-else>
      <i class="nav"></i>
      <i class="hero"></i>
      <i class="row"><span></span><span></span></i>
      <i class="cta"></i>
    </template>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  // { request: "POST /path", status, body } for backends; nothing for sites
  api: { type: Object, default: null },
});
const method = computed(() => props.api?.request.split(" ")[0]);
const path = computed(() => props.api?.request.split(" ").slice(1).join(" "));
</script>

<style scoped>
.clip-sheet {
  position: relative;
  padding: 14px;
  background: #fffdf5;
  border: 3px solid #000;
  box-shadow: 5px 5px 0 #000;
  color: #111;
}
.clip {
  position: absolute;
  top: -18px;
  left: 30px;
  width: 22px;
  height: 46px;
  border: 4px solid #555;
  border-bottom-color: transparent;
  border-radius: 12px;
  transform: rotate(-8deg);
}
.clip-sheet i {
  display: block;
  margin-bottom: 8px;
  background: #d9d9d9;
  border: 2px solid #000;
}
.clip-sheet .nav {
  height: 18px;
  background: #fff;
}
.clip-sheet .hero {
  height: 38%;
}
.clip-sheet .row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background: none;
  border: 0;
}
.clip-sheet .row span {
  height: 40px;
  background: #fff;
  border: 2px solid #000;
}
.clip-sheet .cta {
  width: 60%;
  height: 16px;
  background: #111;
}
.json {
  font: 400 0.62rem/1.55 "JetBrains Mono", monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.json pre {
  margin: 8px 0 0;
  font: inherit;
  color: #7c3aed;
  white-space: pre-wrap;
}
.method {
  padding: 0 4px;
  background: #111;
  color: #ffdd00;
  font-weight: 700;
}
.status {
  display: block;
  color: #16a34a;
  font-weight: 700;
}
</style>
