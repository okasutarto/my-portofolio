import { ref } from "vue";

const isDark = ref(false);

export function useTheme() {
  function toggleTheme() {
    isDark.value = !isDark.value;
    updateTheme();
    saveThemePreference();
  }

  function updateTheme() {
    if (isDark.value) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function saveThemePreference() {
    try {
      localStorage.setItem("theme", isDark.value ? "dark" : "light");
    } catch {
      // Blocked or full storage: the theme still lasts for this visit.
    }
  }

  function initTheme() {
    let savedTheme;
    try {
      savedTheme = localStorage.getItem("theme");
    } catch {
      // Blocked storage uses the default theme.
    }
    if (savedTheme) {
      isDark.value = savedTheme === "dark";
    } else {
      // Default to light mode if no preference is saved
      isDark.value = false;
    }
    updateTheme();
  }

  return {
    isDark,
    toggleTheme,
    initTheme,
  };
}
