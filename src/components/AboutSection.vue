<template>
  <section id="about" class="relative py-20 overflow-hidden">
    <div class="container mx-auto px-4 relative z-10">
      <!-- Background accent elements for visual interest -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-100 to-transparent rounded-full filter blur-3xl opacity-20 -z-10"></div>
      <div class="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-primary-100 to-transparent rounded-full filter blur-3xl opacity-20 -z-10"></div>
      
      <div class="flex flex-col lg:flex-row items-center gap-12 md:gap-16">
        <!-- Profile image with circular design -->
        <div class="lg:w-2/5 relative flex justify-center">
          <div class="relative">
            <!-- Circular decorative background element -->
            <div class="absolute -top-4 -left-4 w-full h-full rounded-full bg-gradient-to-tr from-primary-100 to-secondary-100 dark:from-primary-900 dark:to-secondary-900 opacity-30 -z-10 scale-110"></div>
            
            <!-- Circular image with better size and subtle border -->
            <div class="rounded-full overflow-hidden w-72 h-72 shadow-lg border-4 border-white dark:border-gray-800">
              <img src="@/assets/profile-placeholder.jpg" alt="Profile" class="w-full h-full object-cover">
            </div>
            
            <!-- Accent dot decorations -->
            <div class="absolute top-6 -right-4 w-6 h-6 bg-primary-400 dark:bg-primary-600 rounded-full"></div>
            <div class="absolute -bottom-2 left-10 w-4 h-4 bg-secondary-400 dark:bg-secondary-600 rounded-full"></div>
          </div>
        </div>
        
        <!-- Content with better vertical rhythm -->
        <div class="lg:w-3/5">
          <h2 class="text-4xl font-bold mb-6 text-gray-900 dark:text-gray-50">About Me</h2>
          <p class="mb-6 text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
            Hey there! Code craftsman here, wielding Vue, React, JavaScript, and cutting-edge web tech to build digital solutions that actually matter. Former industrial engineer turned developer, I bring fresh eyes to every project. Always tinkering with new tools and pushing my skills to the next level—because in tech, standing still means falling behind!
          </p>
          
          <div class="mt-8">
            <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Skills</h3>
            <div class="flex flex-wrap gap-3">
              <span class="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 border border-gray-200 dark:border-gray-700 transition hover:shadow-md">Vue</span>
              <span class="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 border border-gray-200 dark:border-gray-700 transition hover:shadow-md">React</span>
              <span class="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 border border-gray-200 dark:border-gray-700 transition hover:shadow-md">JavaScript</span>
              <span class="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 border border-gray-200 dark:border-gray-700 transition hover:shadow-md">HTML/CSS</span>
              <span class="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 border border-gray-200 dark:border-gray-700 transition hover:shadow-md">Tailwind CSS</span>
              <span class="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 border border-gray-200 dark:border-gray-700 transition hover:shadow-md">Git</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
