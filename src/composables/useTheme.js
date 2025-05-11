import { ref } from 'vue';

const isDark = ref(false);

export function useTheme() {
  function toggleTheme() {
    isDark.value = !isDark.value;
    updateTheme();
    saveThemePreference();
  }

  function updateTheme() {
    if (isDark.value) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function saveThemePreference() {
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      isDark.value = savedTheme === 'dark';
    } else {
      // Check user's system preference
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    updateTheme();
  }

  return {
    isDark,
    toggleTheme,
    initTheme
  };
}
