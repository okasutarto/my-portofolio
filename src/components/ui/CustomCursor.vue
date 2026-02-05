<template>
  <div class="custom-cursor-container" v-if="!isTouchDevice">
    <!-- Trail/Shadow Cursor (Cyan) -->
    <div
      ref="cursorShadow"
      class="cursor-shadow"
      :class="{ 'cursor-hover': isHovering, 'cursor-click': isClicking }">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M5 3L19 12L5 21V3Z"
          fill="#00e0c6"
          stroke="black"
          stroke-width="2"
          stroke-linejoin="miter" />
      </svg>
    </div>

    <!-- Main Cursor (Yellow) -->
    <div
      ref="cursorMain"
      class="cursor-main"
      :class="{ 'cursor-hover': isHovering, 'cursor-click': isClicking }">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M5 3L19 12L5 21V3Z"
          fill="#ffdd00"
          stroke="black"
          stroke-width="2"
          stroke-linejoin="miter" />
      </svg>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const cursorMain = ref(null);
const cursorShadow = ref(null);
const isHovering = ref(false);
const isClicking = ref(false);
const isTouchDevice = ref(false);

// Cursor position with smooth follow
let mouseX = 0;
let mouseY = 0;
let mainX = 0;
let mainY = 0;
let shadowX = 0;
let shadowY = 0;
let animationId = null;

const onMouseMove = (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
};

const onMouseDown = () => {
  isClicking.value = true;
};

const onMouseUp = () => {
  isClicking.value = false;
};

const onMouseEnterInteractive = () => {
  isHovering.value = true;
};

const onMouseLeaveInteractive = () => {
  isHovering.value = false;
};

// Smooth animation loop
const animate = () => {
  // Main cursor follows tightly
  mainX += (mouseX - mainX) * 0.4;
  mainY += (mouseY - mainY) * 0.4;

  // Shadow follows with more delay for trailing effect
  shadowX += (mouseX - shadowX) * 0.15;
  shadowY += (mouseY - shadowY) * 0.15;

  if (cursorMain.value) {
    cursorMain.value.style.transform = `translate(${mainX}px, ${mainY}px)`;
  }

  if (cursorShadow.value) {
    cursorShadow.value.style.transform = `translate(${shadowX}px, ${shadowY}px)`;
  }

  animationId = requestAnimationFrame(animate);
};

const addInteractiveListeners = () => {
  const interactiveElements = document.querySelectorAll(
    'a, button, input, textarea, [role="button"], .cursor-hover-target, .neo-card',
  );

  interactiveElements.forEach((el) => {
    el.addEventListener("mouseenter", onMouseEnterInteractive);
    el.addEventListener("mouseleave", onMouseLeaveInteractive);
  });
};

const removeInteractiveListeners = () => {
  const interactiveElements = document.querySelectorAll(
    'a, button, input, textarea, [role="button"], .cursor-hover-target, .neo-card',
  );

  interactiveElements.forEach((el) => {
    el.removeEventListener("mouseenter", onMouseEnterInteractive);
    el.removeEventListener("mouseleave", onMouseLeaveInteractive);
  });
};

onMounted(() => {
  // Check if touch device
  isTouchDevice.value =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (!isTouchDevice.value) {
    // Hide default cursor across entire body
    document.body.style.cursor = "none";

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    animate();

    // Add interactive listeners with mutation observer for SPA navigation
    addInteractiveListeners();
    const observer = new MutationObserver(() => {
      addInteractiveListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
});

onUnmounted(() => {
  if (!isTouchDevice.value) {
    document.body.style.cursor = "auto";
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mouseup", onMouseUp);
    removeInteractiveListeners();

    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  }
});
</script>

<style scoped>
.custom-cursor-container {
  pointer-events: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 99999; /* Ensure it's above everything */
}

.cursor-main,
.cursor-shadow {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  will-change: transform;
}

.cursor-shadow {
  z-index: 99998;
  opacity: 0.6;
}

.cursor-main {
  z-index: 99999;
}

/* Base scale */
svg {
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Hover state: Scale up and slight rotation */
.cursor-hover svg {
  transform: scale(1.5) rotate(15deg);
}

/* Click state: Scale down */
.cursor-click svg {
  transform: scale(0.8);
}

/* Dark mode adjustments (if needed, but Yellow/Cyan are already bold) */
:global(.dark) .cursor-shadow svg path {
  stroke: white;
}
</style>
