import { onMounted, onUnmounted } from "vue";

// Moves the dot-grid spotlight (see .page-dots in index.css) to the cursor.
// The dot layer is fixed to the viewport, so viewport coords are all it needs and
// scrolling never triggers an update.
export function useSpotlight() {
  let frame = null;
  let pointer = null;
  let layer = null;

  function update() {
    frame = null;
    if (!layer) layer = document.querySelector(".page-dots");
    if (!layer) return;
    layer.style.setProperty("--mx", pointer ? `${pointer.x}px` : "-999px");
    layer.style.setProperty("--my", pointer ? `${pointer.y}px` : "-999px");
  }

  function schedule() {
    if (frame === null) frame = requestAnimationFrame(update);
  }

  function onPointerMove(e) {
    if (e.pointerType !== "mouse") return;
    pointer = { x: e.clientX, y: e.clientY };
    schedule();
  }

  function onPointerLeave() {
    pointer = null;
    schedule();
  }

  onMounted(() => {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
  });

  onUnmounted(() => {
    window.removeEventListener("pointermove", onPointerMove);
    document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    if (frame !== null) cancelAnimationFrame(frame);
  });
}
