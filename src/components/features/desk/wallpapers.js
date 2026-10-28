// Toon reinterpretations of five macOS desktop pictures; loaded only when needed.
export const WALLPAPERS = [
  { id: "big-sur", name: "Big Sur", color: "#4caaa0" },
  { id: "catalina", name: "Catalina", color: "#728baf" },
  { id: "mojave", name: "Mojave", color: "#dba46f" },
  { id: "monterey", name: "Monterey", color: "#a57bd4" },
  { id: "sonoma", name: "Sonoma", color: "#7ca16c" },
];
export function createWallpapers() {
  let selection = { id: "big-sur" };
  try {
    const saved = JSON.parse(localStorage.getItem("desk-wallpaper"));
    if (WALLPAPERS.some((item) => item.id === saved?.id)) selection = { id: saved.id };
  } catch { /* Storage is optional. */ }
  const images = new Map();
  let dirty = false;
  function image(id, mode) {
    const key = `${id}-${mode}`;
    if (!images.has(key)) {
      const img = new Image();
      images.set(key, img);
      img.onload = img.onerror = () => { dirty = true; };
      img.src = `${process.env.BASE_URL}wallpapers/${key}.webp?v=toon-v2`;
    }
    const img = images.get(key);
    return img.complete && img.naturalWidth ? img : null;
  }
  return {
    get selection() { return selection; },
    get dirty() { return dirty; },
    clean() { dirty = false; },
    image,
    select(id) {
      if (!WALLPAPERS.some((item) => item.id === id)) return;
      selection = { id };
      dirty = true;
      try { localStorage.setItem("desk-wallpaper", JSON.stringify(selection)); } catch { /* Storage is optional. */ }
    },
  };
}
