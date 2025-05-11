<template>
  <div class="absolute inset-0 z-0 bg-gradient-to-br from-light to-gray-100 dark:from-dark-darker dark:to-dark overflow-hidden">
    <!-- Animated grid overlay -->
    <div class="absolute inset-0 grid-bg opacity-20 dark:opacity-15"></div>
    
    <!-- Animated gradient blobs -->
    <div 
      :class="['blob blob-1', blobsClasses.blob1]"
      :style="{ opacity: blobsOpacity }"
    ></div>
    <div 
      :class="['blob blob-2', blobsClasses.blob2]"
      :style="{ opacity: blobsOpacity }" 
    ></div>
    <div 
      :class="['blob blob-3', blobsClasses.blob3]"
      :style="{ opacity: blobsOpacity }"
    ></div>
    
    <!-- Flowing wave effect -->
    <div v-if="showWave" class="wave-container absolute bottom-0 left-0 w-full h-64 overflow-hidden">
      <div class="wave"></div>
      <div class="wave wave-2"></div>
    </div>
  </div>
</template>

<script>
import { onMounted, onBeforeUnmount, ref } from 'vue';

export default {
  props: {
    blobsVariant: {
      type: String,
      default: 'default',
      validator: (val) => ['default', 'primary', 'secondary', 'subtle'].includes(val)
    },
    blobsOpacity: {
      type: String,
      default: '1'
    },
    showWave: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    // Different blob color schemes for different sections
    const blobsClasses = ref({
      blob1: '',
      blob2: '',
      blob3: ''
    });

    onMounted(() => {
      // Set blob color variants
      switch(props.blobsVariant) {
        case 'primary':
          blobsClasses.value = {
            blob1: 'bg-gradient-to-r from-primary/25 to-primary/5 dark:from-primary/15 dark:to-transparent',
            blob2: 'bg-gradient-to-r from-blue-400/20 to-blue-400/5 dark:from-blue-400/10 dark:to-transparent',
            blob3: 'bg-gradient-to-r from-indigo-400/20 to-indigo-400/5 dark:from-indigo-400/10 dark:to-transparent'
          };
          break;
        case 'secondary':
          blobsClasses.value = {
            blob1: 'bg-gradient-to-r from-secondary/20 to-secondary/5 dark:from-secondary/10 dark:to-transparent',
            blob2: 'bg-gradient-to-r from-rose-400/20 to-rose-400/5 dark:from-rose-400/10 dark:to-transparent',
            blob3: 'bg-gradient-to-r from-orange-400/20 to-orange-400/5 dark:from-orange-400/10 dark:to-transparent'
          };
          break;
        case 'subtle':
          blobsClasses.value = {
            blob1: 'bg-gradient-to-r from-gray-300/20 to-gray-300/5 dark:from-gray-600/15 dark:to-transparent',
            blob2: 'bg-gradient-to-r from-gray-400/15 to-gray-400/5 dark:from-gray-500/10 dark:to-transparent',
            blob3: 'bg-gradient-to-r from-gray-200/20 to-gray-200/5 dark:from-gray-700/15 dark:to-transparent'
          };
          break;
        default:
          blobsClasses.value = {
            blob1: 'bg-gradient-to-r from-primary/20 to-primary/5 dark:from-primary/10 dark:to-transparent',
            blob2: 'bg-gradient-to-r from-secondary/20 to-secondary/5 dark:from-secondary/10 dark:to-transparent',
            blob3: 'bg-gradient-to-r from-yellow-400/20 to-yellow-400/5 dark:from-yellow-400/10 dark:to-transparent'
          };
          break;
      }

      // Add subtle parallax effect on mouse movement
      const handleMouseMove = (e) => {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;
        
        document.querySelectorAll('.blob').forEach((blob, index) => {
          const depth = (index + 1) * 15;
          const moveX = (mouseX - 0.5) * depth;
          const moveY = (mouseY - 0.5) * depth;
          blob.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
        });
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      
      // Clean up event listener on component unmount
      onBeforeUnmount(() => {
        document.removeEventListener('mousemove', handleMouseMove);
      });
    });

    return {
      blobsClasses
    };
  }
}
</script>

<style scoped>
/* Grid background */
.grid-bg {
  background-image: 
    linear-gradient(to right, rgba(99, 102, 241, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(99, 102, 241, 0.1) 1px, transparent 1px);
  background-size: 40px 40px;
  animation: grid-move 30s linear infinite;
}

@keyframes grid-move {
  0% { background-position: 0 0; }
  100% { background-position: 40px 40px; }
}

/* Blob animations */
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  transition: background 0.8s ease-in-out, opacity 0.8s ease-in-out, transform 0.5s ease-in-out;
}

.blob-1 {
  width: 500px;
  height: 500px;
  top: -100px;
  left: -100px;
  animation: blob-move-1 25s infinite alternate ease-in-out;
}

.blob-2 {
  width: 600px;
  height: 600px;
  bottom: -200px;
  right: -100px;
  animation: blob-move-2 30s infinite alternate ease-in-out;
}

.blob-3 {
  width: 350px;
  height: 350px;
  top: 40%;
  right: 15%;
  animation: blob-move-3 20s infinite alternate ease-in-out;
}

@keyframes blob-move-1 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(50px, 30px) scale(1.1); }
}

@keyframes blob-move-2 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(-70px, -50px) scale(1.08); }
}

@keyframes blob-move-3 {
  0% { transform: translate(0, 0) scale(1) rotate(0deg); }
  100% { transform: translate(-30px, 50px) scale(1.15) rotate(10deg); }
}

/* Wave animation */
.wave-container {
  opacity: 0.3;
  transition: opacity 0.5s ease-in-out;
}

.wave {
  position: absolute;
  bottom: -100px;
  width: 200%;
  height: 300px;
  background: linear-gradient(to bottom, transparent, rgba(99, 102, 241, 0.15));
  border-radius: 100%;
  left: -50%;
  animation: wave 15s linear infinite;
  transition: background 0.8s ease-in-out;
}

.wave-2 {
  animation-delay: -5s;
  opacity: 0.3;
  height: 280px;
}

@keyframes wave {
  0% { transform: translateX(0) translateY(0) rotate(0); }
  50% { transform: translateX(1%) translateY(5px) rotate(1deg); }
  100% { transform: translateX(0) translateY(0) rotate(0); }
}

/* Ensure background transitions are smooth */
.absolute {
  transition: background 1.2s ease-in-out;
}

/* Add a fade effect for the component itself */
.bg-gradient-to-br {
  position: fixed; /* Fix the background to viewport instead of relative to container */
  transition: background-color 1.5s ease-in-out, 
              background-image 1.5s ease-in-out,
              background-position 1.5s ease-in-out;
}

/* Ensure grid transitions smoothly */
.grid-bg {
  transition: opacity 1s ease-in-out;
}

/* Make sure blob transitions are very smooth */
.blob {
  transition: background 1.5s ease-in-out, 
              background-image 1.5s ease-in-out, 
              opacity 1.5s ease-in-out, 
              transform 1s ease-in-out;
}
</style>