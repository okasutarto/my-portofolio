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
  loader.style.setProperty("--bl-progress", progress);
  loader.querySelector(".bl-bar").setAttribute("aria-valuenow", percent);
  loader.querySelector(".bl-pct span").textContent = percent;
}

export function hideBootLoader() {
  closeGate?.();
  const loader = document.getElementById("boot-loader");
  if (!loader || loader.classList.contains("is-done")) return;
  loader.classList.add("is-done");
  setTimeout(() => loader.remove(), 600);
}

// Once the room is drawn the loader becomes the way in. Pressing Enter (or tapping) is the
// gesture browsers need before any sound plays, so the boot sound is heard from its first note.
// False when no loader is showing (the desk was reached from another page): enter right away.
export function showEnterGate(onEnter) {
  const loader = showingLoader();
  if (!loader) return false;
  // the bar fills the rest of the way before the screen says READY
  setBootProgress(1);
  setTimeout(() => {
    if (!closeGate) return;
    loader.classList.add("is-ready");
    loader.setAttribute("aria-label", "The desk is ready");
    loader.querySelector(".bl-enter").focus({ preventScroll: true });
  }, 450);
  // The keycap goes down, then the view dives into the little monitor's screen and comes out in
  // the room. The press itself already unlocked audio (see useSfx), so the room can start later.
  const enter = () => {
    closeGate();
    loader.classList.add("is-pressed");
    const stage = loader.querySelector(".bl-stage").getBoundingClientRect();
    const screen = loader.querySelector(".bl-screen").getBoundingClientRect();
    loader.style.setProperty("--bl-dive", `${screen.left + screen.width / 2 - stage.left}px ${screen.top + screen.height / 2 - stage.top}px`);
    setTimeout(() => loader.classList.add("is-entering"), 120);
    setTimeout(() => {
      onEnter();
      hideBootLoader();
    }, 560);
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
