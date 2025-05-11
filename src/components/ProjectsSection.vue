<template>
  <section id="projects" class="relative py-16 overflow-hidden">
    <div class="container mx-auto px-4 relative z-10">
      <h2 class="text-3xl font-bold mb-8 text-center dark:text-white">My Projects</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="project in projects" :key="project.id" 
             class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden 
                    transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl 
                    focus-within:scale-105 focus-within:shadow-xl focus-within:ring-2 focus-within:ring-blue-500">
          <img :src="project.image" :alt="project.title" class="w-full h-48 object-cover">
          <div class="p-4">
            <h3 class="text-xl font-semibold mb-2 dark:text-white">{{ project.title }}</h3>
            <p class="text-gray-600 dark:text-gray-300 mb-4">{{ project.description }}</p>
            <div class="flex flex-wrap gap-2 mb-4">
              <span v-for="(tech, index) in project.technologies" :key="index" 
                    class="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs px-2 py-1 rounded">
                {{ tech }}
              </span>
            </div>
            <div class="flex space-x-2">
              <a :href="project.demoLink" target="_blank" 
                 class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200">
                Demo
              </a>
              <a :href="project.codeLink" target="_blank" 
                 class="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200">
                Code
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'ProjectsSection',
  data() {
    return {
      projects: [
        {
          id: 1,
          title: 'E-Commerce Website',
          description: 'A fully functional e-commerce platform with product listings, cart, and checkout.',
          image: 'https://picsum.photos/id/367/800/450', // Shopping/retail related image
          technologies: ['Vue.js', 'Vuex', 'Tailwind CSS'],
          demoLink: '#',
          codeLink: '#'
        },
        {
          id: 2,
          title: 'Weather App',
          description: 'Real-time weather information app that uses the OpenWeatherMap API.',
          image: 'https://picsum.photos/id/178/800/450', // Weather/clouds related image
          technologies: ['Vue.js', 'Axios', 'CSS'],
          demoLink: '#',
          codeLink: '#'
        },
        {
          id: 3,
          title: 'Task Manager',
          description: 'A productivity app for managing daily tasks with drag and drop functionality.',
          image: 'https://picsum.photos/id/20/800/450', // Productivity/desk related image
          technologies: ['Vue.js', 'Firebase', 'Tailwind CSS'],
          demoLink: '#',
          codeLink: '#'
        }
      ]
    }
  }
}
</script>
