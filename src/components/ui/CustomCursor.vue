<template>
  <div class="custom-cursor-container" v-if="!isTouchDevice">
    <!-- Main cursor dot -->
    <div 
      ref="cursorDot"
      class="cursor-dot"
      :class="{ 'cursor-hover': isHovering, 'cursor-click': isClicking }"
    ></div>
    
    <!-- Cursor ring/outline -->
    <div 
      ref="cursorRing"
      class="cursor-ring"
      :class="{ 'cursor-hover': isHovering, 'cursor-click': isClicking }"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const cursorDot = ref(null);
const cursorRing = ref(null);
const isHovering = ref(false);
const isClicking = ref(false);
const isTouchDevice = ref(false);

// Cursor position with smooth follow
let mouseX = 0;
let mouseY = 0;
let dotX = 0;
let dotY = 0;
let ringX = 0;
let ringY = 0;
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
  // Dot follows cursor directly with slight smoothing
  dotX += (mouseX - dotX) * 0.5;
  dotY += (mouseY - dotY) * 0.5;
  
  // Ring follows with more delay for trailing effect
  ringX += (mouseX - ringX) * 0.15;
  ringY += (mouseY - ringY) * 0.15;
  
  if (cursorDot.value) {
    cursorDot.value.style.transform = `translate(${dotX}px, ${dotY}px)`;
  }
  
  if (cursorRing.value) {
    cursorRing.value.style.transform = `translate(${ringX}px, ${ringY}px)`;
  }
  
  animationId = requestAnimationFrame(animate);
};

const addInteractiveListeners = () => {
  // Add hover effect to interactive elements
  const interactiveElements = document.querySelectorAll(
    'a, button, input, textarea, [role="button"], .cursor-hover-target'
  );
  
  interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', onMouseEnterInteractive);
    el.addEventListener('mouseleave', onMouseLeaveInteractive);
  });
};

const removeInteractiveListeners = () => {
  const interactiveElements = document.querySelectorAll(
    'a, button, input, textarea, [role="button"], .cursor-hover-target'
  );
  
  interactiveElements.forEach(el => {
    el.removeEventListener('mouseenter', onMouseEnterInteractive);
    el.removeEventListener('mouseleave', onMouseLeaveInteractive);
  });
};

onMounted(() => {
  // Check if touch device
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  if (!isTouchDevice.value) {
    // Hide default cursor
    document.body.style.cursor = 'none';
    
    // Add event listeners
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    
    // Start animation loop
    animate();
    
    // Add interactive listeners with slight delay to ensure DOM is ready
    setTimeout(addInteractiveListeners, 100);
    
    // Re-add listeners on route change (for SPA)
    const observer = new MutationObserver(() => {
      addInteractiveListeners();
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }
});

onUnmounted(() => {
  if (!isTouchDevice.value) {
    document.body.style.cursor = 'auto';
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
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
  z-index: 9999;
  overflow: hidden;
}

.cursor-dot {
  position: fixed;
  top: -4px;
  left: -4px;
  width: 8px;
  height: 8px;
  background: var(--color-primary, #3b82f6);
  border-radius: 50%;
  pointer-events: none;
  z-index: 10001;
  transition: width 0.2s ease, height 0.2s ease, top 0.2s ease, left 0.2s ease, opacity 0.2s ease;
}

.cursor-ring {
  position: fixed;
  top: -20px;
  left: -20px;
  width: 40px;
  height: 40px;
  border: 2px solid rgba(59, 130, 246, 0.5);
  border-radius: 50%;
  pointer-events: none;
  z-index: 10000;
  transition: width 0.3s ease, height 0.3s ease, top 0.3s ease, left 0.3s ease, border-color 0.3s ease, background-color 0.3s ease;
}

/* Hover state */
.cursor-dot.cursor-hover {
  width: 12px;
  height: 12px;
  top: -6px;
  left: -6px;
  opacity: 0.8;
}

.cursor-ring.cursor-hover {
  width: 60px;
  height: 60px;
  top: -30px;
  left: -30px;
  border-color: rgba(139, 92, 246, 0.6);
  background-color: rgba(139, 92, 246, 0.1);
}

/* Click state */
.cursor-dot.cursor-click {
  width: 6px;
  height: 6px;
  top: -3px;
  left: -3px;
}

.cursor-ring.cursor-click {
  width: 30px;
  height: 30px;
  top: -15px;
  left: -15px;
  border-color: rgba(59, 130, 246, 0.8);
}

/* Dark mode adjustments */
:global(.dark) .cursor-ring {
  border-color: rgba(139, 92, 246, 0.5);
}

:global(.dark) .cursor-ring.cursor-hover {
  border-color: rgba(139, 92, 246, 0.7);
  background-color: rgba(139, 92, 246, 0.15);
}
</style>
