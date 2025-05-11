<template>
  <div class="project-details relative py-16 overflow-hidden">
    <div class="container mx-auto px-4 relative z-10">
      <div v-if="loading" class="text-center py-12">
        <p class="text-xl">Loading project details...</p>
      </div>
      
      <div v-else-if="project" class="max-w-4xl mx-auto">
        <div class="mb-8">
          <router-link to="/" class="inline-flex items-center text-blue-600 hover:text-blue-800">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            Back to Projects
          </router-link>
        </div>
        
        <h1 class="text-4xl font-bold mb-6">{{ project.title }}</h1>
        
        <div class="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <img :src="project.image" :alt="project.title" class="w-full h-auto">
        </div>
        
        <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div class="prose max-w-none">
            <h2 class="text-2xl font-semibold mb-4">Project Overview</h2>
            <p class="mb-4">{{ project.description }}</p>
            <p>{{ project.longDescription }}</p>
            
            <h3 class="text-xl font-semibold mt-6 mb-3">Features</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li v-for="(feature, index) in project.features" :key="index">{{ feature }}</li>
            </ul>
            
            <h3 class="text-xl font-semibold mt-6 mb-3">Technologies Used</h3>
            <div class="flex flex-wrap gap-2 mb-6">
              <span v-for="(tech, index) in project.technologies" :key="index"
                    class="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                {{ tech }}
              </span>
            </div>
            
            <h3 class="text-xl font-semibold mt-6 mb-3">Project Links</h3>
            <div class="flex space-x-4">
              <a :href="project.demoLink" target="_blank" 
                 class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                </svg>
                Live Demo
              </a>
              <a :href="project.codeLink" target="_blank" 
                 class="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                View Code
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-12">
        <p class="text-xl text-red-600">Project not found</p>
        <router-link to="/" class="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Back to Home
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProjectDetails',
  data() {
    return {
      loading: true,
      project: null
    }
  },
  created() {
    // In a real app, you would fetch the project data from an API
    // using the route param id (this.$route.params.id)
    // Here we're just simulating the data
    setTimeout(() => {
      this.project = {
        id: this.$route.params.id || 1,
        title: 'E-Commerce Website',
        image: 'https://via.placeholder.com/1200x600',
        description: 'A fully functional e-commerce platform with product listings, cart, and checkout.',
        longDescription: 'This is a complete e-commerce solution built with Vue.js and a backend API. It includes user authentication, product browsing, search functionality, shopping cart, payment processing, and order management.',
        features: [
          'User registration and authentication',
          'Product catalog with filtering and search',
          'Shopping cart functionality',
          'Checkout process with payment integration',
          'Order history and tracking',
          'Responsive design for all devices'
        ],
        technologies: ['Vue.js', 'Vuex', 'Tailwind CSS', 'Node.js', 'Express', 'MongoDB'],
        demoLink: 'https://example.com',
        codeLink: 'https://github.com/example/project'
      };
      this.loading = false;
    }, 500);
  }
}
</script>
