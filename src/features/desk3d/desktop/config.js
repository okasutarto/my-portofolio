
export const SCREEN_W = 640;
export const SCREEN_H = 384;
const MENU_H = 20;
const TITLE_H = 20;
const ICON = 32;
const ICON_GAP = 10;
const DOCK_H = 46;
const DOCK_Y = SCREEN_H - DOCK_H - 6;
const GREEN = "#1fdf64";

// Every app: those with a window open on the screen; the others fly the camera to their prop
const APPS = {
  launchpad: { id: "launchpad", label: "Launchpad" },
  files: { id: "files", label: "Projects", focus: "projects" },
  terminal: { id: "terminal", label: "Terminal" },
  spotifree: { id: "spotifree", label: "Spotifree" },
  code: { id: "code", label: "VS Kode" },
  wallpaper: { id: "wallpaper", label: "Wallpaper" },
  snake: { id: "snake", label: "Snake" },
  notes: { id: "notes", label: "About me", focus: "about" },
  mail: { id: "mail", label: "Mail", focus: "contact" },
  messages: { id: "messages", label: "AI Chat", focus: "chat" },
};
// Kept in the dock, Snake included: it's the desktop's own game, apart from the console
const DOCK_KEPT = ["launchpad", "files", "terminal", "spotifree", "code", "snake", "wallpaper", "notes", "mail", "messages"];
const LAUNCHPAD_APPS = ["terminal", "spotifree", "code", "snake", "files", "notes", "mail", "messages"];
// The visitor's own order, if they've dragged the icons about
const readDockOrder = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("dock-order"));
    if (Array.isArray(saved) && saved.length && new Set(saved).size === saved.length && saved.every((id) => DOCK_KEPT.includes(id))) return [...saved, ...DOCK_KEPT.filter((id) => !saved.includes(id))];
  } catch {
    // Nothing saved, or no storage: the default order
  }
  return [...DOCK_KEPT];
};
function dockLayout(ids) {
  const w = ids.length * (ICON + ICON_GAP) + ICON_GAP;
  const x = (SCREEN_W - w) / 2;
  return { x, w, center: (i) => x + ICON_GAP + i * (ICON + ICON_GAP) + ICON / 2 };
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeOut = (t) => 1 - (1 - t) ** 3;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export { MENU_H, TITLE_H, ICON, ICON_GAP, DOCK_H, DOCK_Y, GREEN, APPS, LAUNCHPAD_APPS, readDockOrder, dockLayout, clamp01, lerp, easeInOut, easeOut, fmt };
