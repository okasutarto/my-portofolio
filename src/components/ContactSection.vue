<template>
  <section id="contact" class="relative py-16 overflow-hidden">
    <div class="container mx-auto px-4 relative z-10">
      <h2 class="text-3xl font-bold mb-8 text-center dark:text-white">Get In Touch</h2>
      <div class="max-w-2xl mx-auto">
        <form @submit.prevent="submitForm" class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input 
              type="text" 
              id="name" 
              v-model="form.name" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2"
            >
          </div>
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input 
              type="email" 
              id="email" 
              v-model="form.email" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2"
            >
          </div>
          <div>
            <label for="message" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
            <textarea 
              id="message" 
              v-model="form.message" 
              rows="4" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2"
            ></textarea>
          </div>
          <div>
            <button 
              type="submit" 
              class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:ring-offset-gray-800"
            >
              Send Message
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script>

export default {
  name: 'ContactSection',
  data() {
    return {
      form: {
        name: '',
        email: '',
        message: ''
      }
    }
  },
  methods: {
    submitForm() {
      // Reset form after submission
      this.form = { name: '', email: '', message: '' };
      // Show success message (in a real app)
      alert('Thank you for your message. I will get back to you soon!');
    }
  }
}
</script>
