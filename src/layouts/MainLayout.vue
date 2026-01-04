<template>
  <div class="main-layout relative min-h-screen pb-4">
    <!-- Content slot -->
    <div class="relative z-10">
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MainLayout'
}
</script>