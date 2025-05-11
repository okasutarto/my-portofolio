import { ref, onMounted, watch } from 'vue';

export function useDarkMode() {
  const isDarkMode = ref(false);
  
  // Function to toggle dark mode
  const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value;
    updateDarkMode();
  };
  
  // Function to set dark mode
  const setDarkMode = (value) => {
    isDarkMode.value = value;
    updateDarkMode();
  };
  
  // Update the DOM with current dark mode state
  const updateDarkMode = () => {
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };
  
  // Initialize dark mode based on local storage or system preference
  onMounted(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    
    if (savedDarkMode !== null) {
      isDarkMode.value = savedDarkMode === 'true';
    } else {
      isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    updateDarkMode();
    
    // Watch for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (localStorage.getItem('darkMode') === null) {
        setDarkMode(e.matches);
      }
    });
  });

  return {
    isDarkMode,
    toggleDarkMode,
    setDarkMode
  };
}
