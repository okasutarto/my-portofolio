<template>
  <div class="not-found relative min-h-screen flex items-center justify-center py-12 px-4 overflow-hidden">
    <div class="max-w-md w-full text-center relative z-10">
      <div class="mb-6">
        <h1 class="text-9xl font-bold text-black dark:text-primary">404</h1>
        <h2 class="text-3xl font-semibold mt-4 mb-2 text-black dark:text-white">Page Not Found</h2>
        <p class="text-gray-700 dark:text-gray-300 mb-8">
          Sorry, the page you are looking for doesn't exist or has been moved.
        </p>
      </div>
      
      <div class="space-y-4">
        <router-link to="/" class="btn inline-block bg-primary text-black hover:shadow-neo focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background-light dark:focus-visible:ring-offset-background-dark">
          Go Home
        </router-link>
        <div>
          <button type="button" @click="goBack" class="inline-flex items-center font-bold text-black dark:text-primary underline underline-offset-4 hover:decoration-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            Go Back
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotFound',
  methods: {
    goBack() {
      this.$router.go(-1);
    }
  }
}
</script>
