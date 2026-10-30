// The loader painted by index.html for the desk. Fades out once, then leaves the page.
let closeGate = null;

const showingLoader = () => {
  const loader = document.getElementById("boot-loader");
  return loader && !loader.hidden && !loader.classList.contains("is-done") ? loader : null;
};
export const bootLoaderShowing = () => !!showingLoader();

// Each stage of the desk's start (the page, the scene's code, the room built, the room timed;
// see DeskPage) moves the bar on. It only ever moves forward.
let progress = 0;
export function setBootProgress(fraction) {
  const loader = showingLoader();
  if (!loader || fraction <= progress) return;
  progress = Math.min(1, fraction);
  const percent = Math.round(progress * 100);
  const bar = loader.querySelector(".bl-bar");
  const filled = Math.round(progress * BAR_CHARS);
  bar.textContent = "#".repeat(filled) + "-".repeat(BAR_CHARS - filled);
  bar.setAttribute("aria-valuenow", percent);
  loader.querySelector(".bl-pct span").textContent = percent;
  // the log: a line comes on as the start reaches it, and is ok once the next one has
  const lines = [...loader.querySelectorAll(".bl-log li[data-at]")];
  lines.forEach((line, i) => {
    line.classList.toggle("is-on", progress >= +line.dataset.at);
    line.classList.toggle("is-ok", progress >= (lines[i + 1] ? +lines[i + 1].dataset.at : 1));
  });
}
const BAR_CHARS = 17;

export function hideBootLoader() {
  closeGate?.();
  const loader = document.getElementById("boot-loader");
  if (!loader || loader.classList.contains("is-done")) return;
  loader.classList.add("is-done");
  setTimeout(() => loader.remove(), 600);
}

// Once the room is ready the loader becomes the way in. Pressing Enter (or tapping) is the
// gesture browsers need before any sound plays, so the boot sound is heard from its first note.
// The room waits behind it in the dark, its monitor showing what this screen shows: `screen`
// is where the terminal window on that monitor sits on the page, and this one moves onto it as the dark
// lifts, so the visitor is looking at the room's own terminal (`onLanded` puts that window up,
// under this one, as it arrives). Without it the loader just clears.
// False when no loader is showing (the desk was reached from another page): enter right away.
export function showEnterGate(onEnter, screen = null, onLanded = null) {
  const loader = showingLoader();
  if (!loader) return false;
  // the bar fills the rest of the way, then the screen says ready and hands over
  setBootProgress(1);
  setTimeout(() => {
    if (!closeGate) return;
    if (screen) {
      const flip = loader.querySelector(".bl-flip");
      const from = loader.querySelector(".bl-win").getBoundingClientRect();
      const dx = screen.left + screen.width / 2 - (from.left + from.width / 2);
      const dy = screen.top + screen.height / 2 - (from.top + from.height / 2);
      flip.style.transform = `translate(${dx}px, ${dy}px) scale(${screen.width / from.width}, ${screen.height / from.height})`;
      // landed (the move takes .9s): the monitor's own window comes up under this one as it fades
      setTimeout(() => onLanded?.(), 850);
    }
    loader.classList.add("is-ready");
    loader.setAttribute("aria-label", "The desk is ready");
    loader.querySelector(".bl-enter").focus({ preventScroll: true });
  }, 450);
  // The press itself unlocks audio (see useSfx); the room takes it from there (the lamp, the
  // camera drawing back), so the loader only has to clear
  const enter = () => {
    closeGate();
    onEnter();
    hideBootLoader();
  };
  // The room behind is live, so no key may reach it before the visitor is in
  const onKey = (e) => {
    e.stopImmediatePropagation();
    if (e.key !== "Enter" || e.repeat) return;
    e.preventDefault();
    enter();
  };
  window.addEventListener("keydown", onKey, true);
  loader.addEventListener("click", enter);
  closeGate = () => {
    closeGate = null;
    window.removeEventListener("keydown", onKey, true);
    loader.removeEventListener("click", enter);
  };
  return true;
}
