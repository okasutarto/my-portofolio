<template>
  <footer class="bg-gray-800 text-white py-8 z-10">
    <div class="container mx-auto px-4">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <div class="mb-4 md:mb-0">
          <p>&copy; {{ new Date().getFullYear() }} Oka Sutarto Putra. All rights reserved.</p>
        </div>
        <div class="flex space-x-4">
          <a href="https://github.com/okasutarto" target="_blank" class="hover:text-gray-400">
            GitHub
          </a>
          <a href="https://linkedin.com/in/okasutarto" target="_blank" class="hover:text-gray-400">
            LinkedIn
          </a>
          <a href="mailto:your.email@example.com" class="hover:text-gray-400">
            Contact
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'TheFooter'
}
</script>
