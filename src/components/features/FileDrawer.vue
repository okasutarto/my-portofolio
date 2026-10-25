<template>
  <div ref="trackRef" class="relative" :style="{ height: `${projects.length * 100 + 20}vh`, marginTop: `${-pullUp}px` }">
    <div ref="stageRef" class="stage" :style="{ '--nav-h': `${navH}px` }">
      <!-- Clicking anywhere around an open file puts it back -->
      <div v-if="openIndex !== -1" class="catcher" @click="closeFile"></div>

      <div ref="drawerRef" class="drawer">
        <div class="box"></div>
        <div ref="foldersRef" class="folders">
          <div
            v-for="(project, index) in projects"
            :key="project.id"
            :ref="(el) => el && (folderEls[index] = el)"
            class="folder"
            :class="{ shut: isShut(index), 'is-active': index === shownIndex }"
            :style="folderStyle(index)"
            :role="index === shownIndex ? 'button' : undefined"
            :tabindex="index === shownIndex ? 0 : undefined"
            :aria-label="index === shownIndex ? `Open ${project.title} file` : undefined"
            @click="handleFolderClick(index)"
            @keydown.enter.space.prevent="index === shownIndex && openFile(index)">
            <!-- A manila folder: the back and its tab are one piece, the front is cut lower -->
            <button
              type="button"
              class="tab"
              :style="{ left: tabLeft(index), '--c': colorOf(index) }"
              :aria-label="index === shownIndex ? `Open ${project.title}` : `Show ${project.title}`"
              @click.stop="handleFolderClick(index)">
              <span class="tab-label"><b class="font-display">{{ pad(index + 1) }}</b><span class="tab-name">{{ project.title }}</span></span>
            </button>
            <div class="back" :style="{ backgroundColor: colorOf(index) }"></div>
            <div class="papers" aria-hidden="true"><i></i><i></i><i></i></div>
            <div
              class="face"
              :style="{ backgroundColor: colorOf(index) }"
              :inert="index !== shownIndex || openIndex !== -1 || undefined"
              @click="openFile(index)">
              <FileCover :project="project" />
            </div>
          </div>
        </div>
        <div ref="frontRef" class="front">
          <span class="label font-display"><small>Drawer A</small>Projects {{ pad(1) }}–{{ pad(projects.length) }}</span>
          <span class="handle" aria-hidden="true"></span>
          <span class="label font-display hidden sm:inline-block"><small>Status</small>Shipped</span>
        </div>
      </div>

      <!-- The opened file, lifted out of the drawer -->
      <div
        v-if="openIndex !== -1"
        ref="fileRef"
        class="file"
        :class="{ opened: fileOpened }"
        :style="fileBox"
        role="dialog"
        :aria-label="`${openProject.title} case file`">
        <span class="tab" :style="{ left: tabLeft(openIndex), '--c': colorOf(openIndex) }">
          <span class="tab-label"><b class="font-display">{{ pad(openIndex + 1) }}</b><span class="tab-name">{{ openProject.title }}</span></span>
        </span>
        <div ref="boardRef" class="board" :style="{ backgroundColor: colorOf(openIndex) }"></div>
        <div class="leaves">
          <div v-for="page in PAGES.length" :key="page" ref="leafEls" class="leaf" :class="{ top: order[0] === page - 1 }">
            <FileSheet
              :project="openProject"
              :index="openIndex"
              :page="page - 1"
              :color="colorOf(openIndex)"
              :next-color="colorOf(openIndex + 1)" />
          </div>
        </div>
        <div class="sheet-nav font-display" role="navigation" aria-label="Sheet pagination">
          <button type="button" aria-label="Previous sheet" @click.stop="flip(-1)">‹</button>
          <span aria-live="polite">{{ order[0] + 1 }} / {{ PAGES.length }}</span>
          <button type="button" aria-label="Next sheet" @click.stop="flip(1)">›</button>
        </div>
        <div
          ref="coverRef"
          class="cover"
          :class="{ 'can-close': fileOpened }"
          role="button"
          :tabindex="fileOpened ? 0 : -1"
          :aria-label="fileOpened ? 'Close folder' : undefined"
          :title="fileOpened ? 'Click cover to close' : undefined"
          @click="onCoverClick"
          @keydown.enter.space.prevent="onCoverClick">
          <div class="cover-out" :style="{ backgroundColor: colorOf(openIndex) }">
            <FileCover :project="openProject" decorative />
          </div>
          <div class="cover-in" :style="{ backgroundColor: colorOf(openIndex) }">
            <span class="font-display">
              <small>Case file · Click to close ⤶</small>
              No. {{ pad(openIndex + 1) }} · {{ openProject.title }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { FOLDER_COLORS as COLORS } from "@/data/projectFiles";
import { ref, computed, watch, inject, nextTick, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { sfx } from "@/composables/useSfx";
import FileCover from "./files/FileCover.vue";
import FileSheet from "./files/FileSheet.vue";

const props = defineProps({
  projects: { type: Array, required: true },
});

const PAGES = ["Overview", "Challenge", "Features", "How it works", "Stack"];
const colorOf = (index) => COLORS[index % COLORS.length];
const pad = (n) => String(n).padStart(2, "0");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const route = useRoute();

const trackRef = ref(null);
const stageRef = ref(null);
const drawerRef = ref(null);
const foldersRef = ref(null);
const frontRef = ref(null);
const folderEls = [];
const n = computed(() => props.projects.length);

// ---------- the drawer follows the scroll ----------
// Position across the projects (0..n-1), held on each one for a moment
const progress = ref(0);
const shownIndex = computed(() => Math.round(progress.value));
const navH = ref(72);
const isPhone = ref(false);

// Folders further back sit higher and a bit smaller, so every tab peeks over the one in front.
// A folder you've flipped past is lifted out and refiled at the back (the stack wraps around).
const depthOf = (index) => (((index - progress.value) % n.value) + n.value) % n.value;
const isShut = (index) => {
  const d = depthOf(index);
  return d >= 1 && d <= n.value - 1;
};
const folderStyle = (index) => {
  const d = depthOf(index);
  const step = isPhone.value ? 26 : 42;
  const fh = foldersRef.value?.offsetHeight || 400;
  if (d > n.value - 1) {
    // Being refiled: up out of the drawer, carried back, dropped in behind the rest
    const f = n.value - d;
    const depth = f * (n.value - 1);
    const up = Math.sin(Math.PI * Math.min(f * 1.15, 1)) * fh * 0.95;
    return {
      transform: `translateY(${-depth * step - up - (1 - f) * 22}px) scale(${1 - depth * 0.04}) rotate(${Math.sin(Math.PI * f) * -4}deg)`,
      zIndex: f < 0.55 ? 300 : 0,
    };
  }
  const lift = Math.max(0, 1 - d) * 22; // the front folder is pulled up to be read
  return {
    transform: `translateY(${-d * step - lift}px) scale(${1 - d * 0.04})`,
    zIndex: 200 - Math.round(d * 10),
    visibility: openIndex.value === index ? "hidden" : "visible",
  };
};
// Tabs step across the top so they never hide each other
const tabLeft = (index) => `${2 + index * (76 / Math.max(n.value - 1, 1))}%`;

const smooth = (x) => x * x * (3 - 2 * x);
let frame = 0;
const onScroll = () => {
  if (frame || openIndex.value !== -1) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    if (!trackRef.value) return;
    const rect = trackRef.value.getBoundingClientRect();
    const raw = Math.min(Math.max(-rect.top / (rect.height - window.innerHeight), 0), 1) * (n.value - 1);
    const i = Math.floor(raw);
    const f = raw - i;
    const before = shownIndex.value;
    progress.value = Math.min(i + (f < 0.2 ? 0 : f > 0.8 ? 1 : smooth((f - 0.2) / 0.6)), n.value - 1);
    // The folder slides up out of the others, then knocks into place at the back
    if (shownIndex.value !== before) {
      sfx.slide();
      sfx.knock({ strength: 0.7, delay: 0.22 });
    }
  });
};

const trackTop = () => {
  let top = 0;
  for (let el = trackRef.value; el; el = el.offsetParent) top += el.offsetTop;
  return top;
};
const positionOf = (index) => trackTop() + ((trackRef.value.offsetHeight - window.innerHeight) * index) / Math.max(n.value - 1, 1);
const goTo = (index) => {
  sfx.tick();
  window.scrollTo({ top: positionOf(index), behavior: reduced ? "auto" : "smooth" });
};
const handleFolderClick = (index) => {
  if (busy || openIndex.value !== -1) return;
  if (index === shownIndex.value) {
    openFile(index);
  } else {
    goTo(index);
  }
};

// On tall screens the drawer sits low in its (full-height) stage, which would leave a big gap
// under the section title; the track is pulled up so the back folder's tab starts just below it
const pullUp = ref(0);
const measure = () => {
  const nav = document.querySelector("nav");
  navH.value = nav ? nav.offsetHeight : 72;
  isPhone.value = window.innerWidth < 640;
  if (!stageRef.value || !foldersRef.value || openIndex.value !== -1) return;
  const fh = foldersRef.value.offsetHeight;
  const step = isPhone.value ? 26 : 42;
  const foldersTop = foldersRef.value.getBoundingClientRect().top - stageRef.value.getBoundingClientRect().top;
  const backTabTop = foldersTop + (n.value - 1) * (fh * 0.04 - step) - 34;
  pullUp.value = Math.max(0, Math.round(backTabTop - 32));
};

// ---------- opening a file right here ----------
const openIndex = ref(-1);
const openProject = computed(() => props.projects[openIndex.value]);
const fileRef = ref(null);
const boardRef = ref(null);
const coverRef = ref(null);
const leafEls = ref([]);
const fileOpened = ref(false);
const fileBox = ref({});
let busy = false;
let target = { x: 0, y: 0 };
let previousOverflow = "";
const EASE = "power3.inOut";

// While the file moves in or out of the drawer, the part below the drawer front's top edge is
// hidden, exactly as it is for the folders standing in the drawer
const hideBehindFront = () => {
  const file = fileRef.value;
  if (!file || !frontRef.value) return;
  const cut = file.getBoundingClientRect().bottom - frontRef.value.getBoundingClientRect().top;
  file.style.clipPath = cut > 0 ? `inset(-80px -80px ${cut}px -2000px)` : "";
};

// Sheets in the pile, top first; lower sheets sit a little askew so their edges show
const order = ref([0, 1, 2, 3, 4]);
const SKEW = [0, -0.9, 0.7, -0.5, 1];
const restOf = (depth) => ({ x: depth * 3, y: depth * 3, rotation: SKEW[depth] || 0, xPercent: 0, yPercent: 0 });
// Every sheet has to be read whole, without scrolling: a sheet whose content is taller than
// the file is scaled down (laid out wider by the same factor, so it rewraps into fewer lines)
const fitSheets = () => {
  leafEls.value.forEach((leaf) => {
    const sheet = leaf.firstElementChild;
    // natural height: let the sheet grow to its content for a moment
    Object.assign(sheet.style, { transform: "", width: "", height: "auto", bottom: "auto" });
    const scale = Math.min(1, leaf.clientHeight / sheet.offsetHeight);
    Object.assign(sheet.style, { height: "", bottom: "" });
    if (scale < 1) {
      Object.assign(sheet.style, { transformOrigin: "0 0", transform: `scale(${scale})`, width: `${100 / scale}%`, height: `${100 / scale}%` });
    }
  });
};
const layoutSheets = () => {
  order.value.forEach((page, depth) => {
    gsap.set(leafEls.value[page], { ...restOf(depth), zIndex: 10 - depth });
  });
};

const openFile = async (index) => {
  if (busy || openIndex.value !== -1) return;
  busy = true;
  const stageRect = stageRef.value.getBoundingClientRect();
  // the lifted file is the whole folder (back and tab included), at exactly its size
  const face = folderEls[index].getBoundingClientRect();
  previousOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden"; // the drawer stays on this file while it's open
  fileBox.value = { left: `${face.left - stageRect.left}px`, top: `${face.top - stageRect.top}px`, width: `${face.width}px`, height: `${face.height}px` };
  order.value = [0, 1, 2, 3, 4];
  openIndex.value = index;
  fileOpened.value = false;
  await nextTick();
  layoutSheets();
  addInputs();

  fitSheets();
  // Lifted to the middle, a little right of centre so the open cover fits on the left.
  // It keeps exactly the folder's size the whole way.
  const shift = Math.max(0, Math.min(face.width * 0.3, (stageRect.width - face.width) / 2 - 30));
  target = {
    x: (stageRect.width - face.width) / 2 + shift - (face.left - stageRect.left),
    y: navH.value + (stageRect.height - navH.value - face.height) / 2 + 10 - (face.top - stageRect.top),
  };
  if (reduced) {
    gsap.set(drawerRef.value, { y: "62vh" });
    gsap.set(fileRef.value, { x: target.x, y: target.y });
    gsap.set(coverRef.value, { rotationY: -180 });
    fileOpened.value = true;
    busy = false;
    return;
  }
  const tl = gsap.timeline({ onComplete: () => { fileOpened.value = true; busy = false; } });
  tl.to(drawerRef.value, { y: "62vh", duration: 0.7, ease: EASE }, 0)
    .to(fileRef.value, {
      keyframes: [{ x: target.x, y: target.y - 40, rotation: -1, duration: 0.5 }, { y: target.y, rotation: 0, duration: 0.2 }],
      ease: EASE,
      onUpdate: hideBehindFront,
      onComplete: () => (fileRef.value.style.clipPath = ""),
    }, 0)
    // The cover swings over to the left and lies flat
    .to(coverRef.value, { rotationY: -180, duration: 0.8, ease: "power2.inOut" }, 0.75);
  // pulled out of the drawer, the drawer rolls away, the cover is swung open and lands flat
  tl.call(() => sfx.slide({ duration: 0.4 }), null, 0)
    .call(() => sfx.drawer({ duration: 0.6 }), null, 0.05)
    .call(() => sfx.slide({ duration: 0.5, up: false }), null, 0.8)
    .call(() => sfx.flop(), null, 1.5);
};

const closeFile = async () => {
  if (busy || openIndex.value === -1) return;
  busy = true;
  fileOpened.value = false;
  const index = openIndex.value;
  const done = () => {
    gsap.set(drawerRef.value, { clearProps: "transform" });
    removeInputs();
    openIndex.value = -1;
    document.documentElement.style.overflow = previousOverflow;
    busy = false;
    nextTick(() => {
      if (!reduced) gsap.fromTo(folderEls[index].querySelector(".face"), { scaleY: 0.97 }, { scaleY: 1, duration: 0.3, ease: "back.out(3)", transformOrigin: "50% 100%", clearProps: "transform" });
    });
  };
  if (reduced) {
    done();
    return;
  }
  const tl = gsap.timeline({ onComplete: done });
  // Cover shuts first, then the file goes back down as the drawer comes back up
  tl.to(coverRef.value, { rotationY: 0, duration: 0.6, ease: "power2.inOut" }, 0)
    .to(drawerRef.value, { y: 0, duration: 0.72, ease: "power2.inOut" }, 0.6)
    .to(boardRef.value, { boxShadow: "0 0 0 #000", duration: 0.72, ease: "power2.inOut" }, 0.6)
    .to(fileRef.value, {
      keyframes: [{ x: target.x * 0.08, y: -18, duration: 0.58 }, { x: 0, y: 0, duration: 0.14 }],
      ease: "power2.inOut",
      onUpdate: hideBehindFront,
    }, 0.6);
  // the cover flops shut, the drawer rolls back in, the folder slides down into its slot
  tl.call(() => sfx.slide({ duration: 0.45 }), null, 0.05)
    .call(() => sfx.flop(), null, 0.56)
    .call(() => sfx.drawer({ duration: 0.7 }), null, 0.6)
    .call(() => sfx.slide({ duration: 0.45, up: false }), null, 0.8)
    .call(() => sfx.knock(), null, 1.32);
};

const onCoverClick = () => {
  if (!fileOpened.value || busy) return;
  closeFile();
};

// ---------- flipping through the sheets ----------
// Next: the top sheet slides out and is tucked under the pile. Back: the bottom one comes out on top.
let flipping = false;
const flip = (dir) => {
  if (flipping || !fileOpened.value) return;
  flipping = true;
  const page = dir > 0 ? order.value[0] : order.value[order.value.length - 1];
  const moving = leafEls.value[page];
  sfx.slide({ duration: 0.22 });
  gsap.to(moving, {
    xPercent: 62,
    yPercent: -6,
    rotation: 7,
    duration: 0.23,
    ease: "power2.in",
    onComplete: () => {
      order.value = dir > 0 ? [...order.value.slice(1), page] : [page, ...order.value.slice(0, -1)];
      order.value.forEach((p, depth) => {
        gsap.set(leafEls.value[p], { zIndex: 10 - depth });
        if (p !== page) gsap.to(leafEls.value[p], { ...restOf(depth), duration: 0.2 });
      });
      sfx.slide({ duration: 0.28, up: false, delay: 0.05 });
      gsap.to(moving, { ...restOf(order.value.indexOf(page)), duration: 0.32, ease: "back.out(1.4)", onComplete: () => (flipping = false) });
    },
  });
};

let wheelLock = 0;
const onWheel = (e) => {
  e.preventDefault();
  if (Math.abs(e.deltaY) < 6 || performance.now() < wheelLock) return;
  wheelLock = performance.now() + 450;
  flip(e.deltaY > 0 ? 1 : -1);
};
let touchY = 0;
const onTouchStart = (e) => (touchY = e.touches[0].clientY);
const onTouchMove = (e) => e.preventDefault();
const onTouchEnd = (e) => {
  const dy = touchY - e.changedTouches[0].clientY;
  if (Math.abs(dy) > 40) flip(dy > 0 ? 1 : -1);
};
const onKey = (e) => {
  if (e.key === "Escape") closeFile();
  else if (e.key === "ArrowRight" || e.key === "ArrowDown") flip(1);
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") flip(-1);
  else return;
  e.preventDefault();
};
const addInputs = () => {
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("keydown", onKey);
};
const removeInputs = () => {
  window.removeEventListener("wheel", onWheel);
  window.removeEventListener("touchstart", onTouchStart);
  window.removeEventListener("touchmove", onTouchMove);
  window.removeEventListener("touchend", onTouchEnd);
  window.removeEventListener("keydown", onKey);
};

// /projects/:id links land here with ?file=id: go to that folder and open it
// The site opens with a "sound on?" dialog; the file opens once it has been answered
const introReady = inject("introReady", ref(true));
const openFromLink = async () => {
  const index = props.projects.findIndex((p) => p.id === route.query.file);
  if (index < 0) return;
  if (!introReady.value) {
    await new Promise((resolve) => {
      const stop = watch(introReady, (ready) => ready && (stop(), resolve()));
    });
  }
  await document.fonts?.ready;
  measure();
  window.scrollTo({ top: positionOf(index), behavior: "instant" });
  progress.value = index;
  setTimeout(() => openFile(index), 450);
};

const onResize = () => {
  measure();
  onScroll();
};

// ---------- first appearance: the drawer rolls up, then the folders drop into it ----------
// Uses the `translate` property (via CSS variables), so it never fights the scroll-driven
// transforms on the same elements.
gsap.registerPlugin(ScrollTrigger);
let intro = null;
const playIntro = () => {
  const tl = gsap.timeline();
  tl.to(drawerRef.value, { "--rise": "0px", duration: 0.7, ease: "power3.out" }, 0).call(() => sfx.drawer({ duration: 0.6 }), null, 0);
  // Back folders first, so the one in front lands last, on top
  const order = folderEls.map((el, index) => ({ el, depth: depthOf(index) })).sort((a, b) => b.depth - a.depth);
  order.forEach(({ el }, k) => {
    const at = 0.45 + k * 0.13;
    // Hidden while it waits above the drawer, shown the moment it starts to fall
    tl.set(el, { opacity: 1 }, at)
      .to(el, { "--drop": "0%", duration: 0.6, ease: "bounce.out" }, at)
      .call(() => sfx.flop({ strength: 0.45 }), null, at + 0.3);
  });
};

onMounted(() => {
  measure();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  if (route.query.file) openFromLink();
  else onScroll();
  if (!reduced && !route.query.file) {
    gsap.set(drawerRef.value, { "--rise": "180px" });
    gsap.set(folderEls, { "--drop": "-140%", opacity: 0 });
    // Wait for the drawer itself to come into view, not the section title above it
    intro = ScrollTrigger.create({ trigger: drawerRef.value, start: "top 80%", once: true, onEnter: playIntro });
  }
});

onUnmounted(() => {
  intro?.kill();
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onResize);
  removeInputs();
  cancelAnimationFrame(frame);
  if (openIndex.value !== -1) document.documentElement.style.overflow = previousOverflow;
});
</script>

<style scoped>
.stage {
  --fw: min(680px, calc(100vw - 110px));
  --fh: clamp(250px, calc(100svh - var(--nav-h) - 330px), 500px);
  --front-h: 100px;
  position: sticky;
  top: 0;
  height: 100svh;
  overflow: hidden;
  display: grid;
  /* centred under the navbar, with the back folders' tabs counted in, so no tall gap is left above */
  place-items: center;
  padding: calc(var(--nav-h) + 150px) 0 3vh;
  color: #111;
}
.catcher {
  position: absolute;
  inset: 0;
  z-index: 800;
}

/* ---------- the drawer ---------- */
.drawer {
  position: relative;
  translate: 0 var(--rise, 0px);
  width: calc(var(--fw) + 70px);
  height: calc(var(--fh) + 150px);
}
.box {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 64%;
  background: #2b2b2b;
  border: 4px solid #000;
  border-radius: 6px 6px 0 0;
  box-shadow: inset 0 18px 0 #1c1c1c;
}
.front {
  position: absolute;
  z-index: 400;
  left: -14px;
  right: -14px;
  bottom: 0;
  height: var(--front-h);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 36px;
  background: #ffdd00;
  border: 4px solid #000;
  box-shadow: 10px 10px 0 #000;
}
.label {
  padding: 7px 14px;
  background: #fffdf5;
  border: 3px solid #000;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  text-transform: uppercase;
}
.label small {
  display: block;
  font: 700 0.56rem "JetBrains Mono", monospace;
  letter-spacing: 0.1em;
  opacity: 0.6;
}
.handle {
  position: relative;
  width: 130px;
  height: 24px;
  background: #111;
  border: 4px solid #000;
  border-top: 0;
  border-radius: 0 0 16px 16px;
}
.handle::before {
  content: "";
  position: absolute;
  left: 14px;
  right: 14px;
  top: 6px;
  height: 4px;
  background: #ffdd00;
  border-radius: 2px;
  opacity: 0.6;
}

/* ---------- folders ---------- */
.folders {
  position: absolute;
  left: 35px;
  right: 35px;
  bottom: 54px;
  height: var(--fh);
  --front-cover: calc(var(--front-h) - 54px + 12px);
  --lip: 22px;
}
.folder {
  position: absolute;
  inset: 0;
  translate: 0 var(--drop, 0%);
  transform-origin: 50% 100%;
  will-change: transform;
}
.folder.is-active,
.folder.is-active .face {
  cursor: pointer;
}
/* The tab is cut from the back panel: a trapezoid outlined in black (an outer black shape with
   the colour inset inside it), running into the back panel with no seam */
.tab {
  --c: #fff;
  position: absolute;
  z-index: 2;
  top: -34px;
  height: 38px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  background: #000;
  clip-path: polygon(0 100%, 16px 0, calc(100% - 16px) 0, 100% 100%);
  color: #111;
}
.tab::before {
  content: "";
  position: absolute;
  inset: 3.5px 3.5px 0;
  background: var(--c);
  clip-path: polygon(0 100%, 14px 0, calc(100% - 14px) 0, 100% 100%);
}
/* a paper label on the tab */
.tab-label {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  background: #fffdf5;
  border: 2px solid #000;
  font: 700 0.62rem "JetBrains Mono", monospace;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}
.tab-label b {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.back {
  position: absolute;
  inset: 0;
  border: 3.5px solid #000;
  border-radius: 6px 10px 4px 4px;
}
/* the tops of the sheets inside, showing above the lower front */
.papers {
  position: absolute;
  left: 14px;
  right: 20px;
  top: 8px;
  height: 40px;
}
.papers i {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  background: #fffdf5;
  border: 2.5px solid #000;
}
.papers i:nth-child(2) {
  top: 5px;
  background: #f4ecd8;
  transform: rotate(0.8deg);
}
.papers i:nth-child(3) {
  top: 9px;
  left: 30%;
  right: 28%;
  background: #ffdd00;
  transform: rotate(-1.6deg);
}
.papers i:nth-child(1) {
  transform: rotate(-1deg);
}
/* the front panel: cut lower than the back, with a thumb notch in the middle of its top edge */
.face {
  position: absolute;
  inset: var(--lip) 0 0;
  overflow: hidden;
  border: 3.5px solid #000;
  border-radius: 4px 4px 4px 4px;
  -webkit-mask: radial-gradient(circle 24px at 50% -5px, transparent 23px, #000 24px);
  mask: radial-gradient(circle 24px at 50% -5px, transparent 23px, #000 24px);
}
/* Folders further back only show their tab and a strip of cover */
.folder.shut .face > *,
.folder.shut .papers {
  visibility: hidden;
}

/* ---------- an opened file ---------- */
.file {
  position: absolute;
  z-index: 900;
  perspective: 1800px;
  --front-cover: 20px;
  --lip: 22px;
}
.board {
  position: absolute;
  inset: 0;
  border: 3.5px solid #000;
  border-radius: 6px 10px 4px 4px;
  box-shadow: 10px 10px 0 #000;
}
.leaves {
  position: absolute;
  inset: 8px 22px 22px 10px;
}
.leaf {
  position: absolute;
  inset: 0;
  background: #fffdf5;
  border: 3px solid #000;
}
.leaf:nth-child(2) { background: #fbf7ea; }
.leaf:nth-child(3) { background: #fdfaf0; }
.leaf:nth-child(4) { background: #f9f4e4; }
.leaf:nth-child(5) { background: #fcf8ec; }
/* sits in the top-right corner of the paper / sheet */
.sheet-nav {
  position: absolute;
  z-index: 30;
  top: 14px;
  right: 28px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: #ffdd00;
  border: 2.5px solid #000;
  box-shadow: 2.5px 2.5px 0 #000;
  visibility: hidden;
  user-select: none;
}
.file.opened .sheet-nav {
  visibility: visible;
}
.sheet-nav > span {
  padding: 0 4px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  white-space: nowrap;
  color: #000;
}
.sheet-nav button {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  background: #fff;
  border: 2px solid #000;
  font: 800 0.88rem "Lexend Mega", sans-serif;
  color: #000;
  cursor: pointer;
  line-height: 1;
  transition: transform 0.1s, background-color 0.1s, color 0.1s;
}
.sheet-nav button:hover {
  background: #111;
  color: #ffdd00;
}
.sheet-nav button:active {
  transform: translate(1px, 1px);
}
/* The cover swings open to the left and lies flat */
.cover {
  position: absolute;
  z-index: 50;
  inset: var(--lip) 0 0;
  transform-origin: 0 50%;
  transform-style: preserve-3d;
}
.cover > div {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border: 3.5px solid #000;
  border-radius: 4px;
  -webkit-mask: radial-gradient(circle 24px at 50% -5px, transparent 23px, #000 24px);
  mask: radial-gradient(circle 24px at 50% -5px, transparent 23px, #000 24px);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.cover-in {
  display: grid;
  place-items: center;
  transform: rotateY(180deg);
  filter: brightness(1.08);
}
.cover-in span {
  padding: 10px 16px;
  background: #fffdf5;
  border: 3px solid #000;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  transform: rotate(-3deg);
}
.cover-in small {
  display: block;
  font: 700 0.58rem "JetBrains Mono", monospace;
  letter-spacing: 0.1em;
  opacity: 0.6;
}
.cover.can-close {
  cursor: pointer;
}
.cover.can-close .cover-in {
  cursor: pointer;
}
.cover.can-close:hover .cover-in span {
  transform: rotate(-3deg) translateY(-2px);
  box-shadow: 4px 4px 0 #000;
  background: #ffdd00;
}

/* ---------- phones ---------- */
@media (max-width: 639px) {
  .stage {
    --fw: calc(100vw - 56px);
    --fh: clamp(230px, calc(100svh - var(--nav-h) - 250px), 420px);
    --front-h: 80px;
  }
  .drawer {
    width: calc(var(--fw) + 28px);
    height: calc(var(--fh) + 120px);
  }
  .folders {
    left: 14px;
    right: 14px;
    bottom: 44px;
    --front-cover: calc(var(--front-h) - 44px + 10px);
  }
  .front {
    left: -8px;
    right: -8px;
    gap: 18px;
  }
  .handle {
    width: 90px;
  }
  .tab {
    padding: 0 18px;
  }
  .tab-name {
    display: none;
  }
  .sheet-nav {
    top: 10px;
    right: 18px;
    padding: 3px 5px;
    gap: 4px;
  }
  .sheet-nav > span {
    font-size: 0.68rem;
    padding: 0 2px;
  }
  .sheet-nav button {
    width: 22px;
    height: 22px;
    font-size: 0.78rem;
  }
}
</style>
