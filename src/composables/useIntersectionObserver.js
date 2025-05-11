import { ref, onMounted, onUnmounted } from 'vue';

export function useIntersectionObserver(options = {}) {
  const isIntersecting = ref(false);
  const element = ref(null);
  let observer = null;

  const observerOptions = {
    root: options.root || null,
    rootMargin: options.rootMargin || '0px',
    threshold: options.threshold || 0.1
  };

  onMounted(() => {
    if (!element.value) return;

    observer = new IntersectionObserver((entries) => {
      isIntersecting.value = entries[0].isIntersecting;
    }, observerOptions);

    observer.observe(element.value);
  });

  onUnmounted(() => {
    if (observer && element.value) {
      observer.unobserve(element.value);
    }
  });

  return { isIntersecting, element };
}
