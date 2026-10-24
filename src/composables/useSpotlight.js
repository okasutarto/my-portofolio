import { onMounted, onUnmounted } from "vue";

// Feeds the cursor position into every `.bg-grid-pattern` element as --mx/--my
// (element-local px), which the dot-grid spotlight mask in index.css reads.
export function useSpotlight() {
  let frame = null;
  let pointer = null;

  function update() {
    frame = null;
    document.querySelectorAll(".bg-grid-pattern").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      el.style.setProperty("--mx", `${pointer.x - rect.left}px`);
      el.style.setProperty("--my", `${pointer.y - rect.top}px`);
    });
  }

  function onPointerMove(e) {
    if (e.pointerType !== "mouse") return;
    pointer = { x: e.clientX, y: e.clientY };
    if (frame === null) frame = requestAnimationFrame(update);
  }

  // Keep the spotlight under a still cursor while the page scrolls
  function onScroll() {
    if (pointer && frame === null) frame = requestAnimationFrame(update);
  }

  onMounted(() => {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
  });

  onUnmounted(() => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("scroll", onScroll);
    if (frame !== null) cancelAnimationFrame(frame);
  });
}
