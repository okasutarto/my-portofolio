<template>
  <div class="main-layout relative h-auto min-h-screen pb-4">
    <!-- Single instance of AnimatedBackground that persists across all views -->
    <AnimatedBackground 
      :blobsVariant="currentBlobsVariant" 
      :blobsOpacity="currentBlobsOpacity" 
      :particleCount="currentParticleCount"
      :showWave="currentShowWave" 
    />
    
    <!-- Content slot -->
    <slot></slot>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AnimatedBackground from '../components/AnimatedBackground.vue';

export default {
  name: 'MainLayout',
  components: {
    AnimatedBackground
  },
  setup() {
    const route = useRoute();
    
    // Default values
    const currentBlobsVariant = ref('default');
    const currentBlobsOpacity = ref('1');
    const currentParticleCount = ref(20);
    const currentShowWave = ref(true);
    
    // Update background based on current route
    const updateBackgroundSettings = () => {
      // Set different background variants based on the current route
      switch(route.name) {
        case 'about':
          currentBlobsVariant.value = 'primary';
          currentBlobsOpacity.value = '0.6';
          currentParticleCount.value = 20;
          currentShowWave.value = false;
          break;
        case 'contact':
          currentBlobsVariant.value = 'secondary';
          currentBlobsOpacity.value = '0.6';
          currentParticleCount.value = 15;
          currentShowWave.value = true;
          break;
        case 'project-details':
          currentBlobsVariant.value = 'subtle';
          currentBlobsOpacity.value = '0.4';
          currentParticleCount.value = 12;
          currentShowWave.value = false;
          break;
        case 'not-found':
          currentBlobsVariant.value = 'subtle';
          currentBlobsOpacity.value = '0.5';
          currentParticleCount.value = 25;
          currentShowWave.value = true;
          break;
        default:
          currentBlobsVariant.value = 'default';
          currentBlobsOpacity.value = '1';
          currentParticleCount.value = 20;
          currentShowWave.value = true;
      }
    };
    
    // Watch for route changes
    watch(() => route.name, () => {
      updateBackgroundSettings();
    }, { immediate: true });
    
    return {
      currentBlobsVariant,
      currentBlobsOpacity,
      currentParticleCount,
      currentShowWave
    };
  }
}
</script>
