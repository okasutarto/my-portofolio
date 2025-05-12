<template>
  <div class="about-page relative py-16 overflow-hidden">
    
    <div class="container mx-auto px-4 py-2 md:py-16 relative z-10">
      
      <div class="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md animate-fade-in">
        <div class="mb-8 flex flex-col md:flex-row items-center">
          <div class="md:w-1/3 mb-6 md:mb-0">
            <div class="rounded-full overflow-hidden w-48 h-48 mx-auto border-4 border-gray-200 dark:border-gray-700">
              <img src="@/assets/profile-placeholder.jpg" alt="Profile" class="w-full h-full object-cover">
            </div>
          </div>
          <div class="md:w-2/3 md:pl-8">
            <h2 class="text-2xl font-semibold mb-3 dark:text-white">Oka Sutarto Putra</h2>
            <p class="text-gray-600 dark:text-gray-300 mb-2">Fullstack Developer</p>
            <p class="mb-4 dark:text-gray-300">
              Tech wizard with 2+ years crafting digital experiences from pixel to server! I bring websites to life with React, Vue, and Node magic while turning complex challenges into elegant solutions. Whether I'm building slick UIs or optimizing backend performance, I thrive on collaboration and delivering results that make users smile.
            </p>
          </div>
        </div>

        <div class="mb-8">
          <h3 class="text-xl font-semibold mb-4 border-b pb-2 dark:text-white dark:border-gray-700">My Journey</h3>
          <p class="dark:text-gray-300">
            From industrial engineering graduate to coding enthusiast, I discovered my true calling in software development! After immersing myself in Hacktiv8's JavaScript bootcamp, I've rapidly climbed from junior developer to frontend engineer, crafting innovative solutions at Jublia. Along the way, I've built everything from event apps to e-commerce platforms, mastering both frontend flair and backend muscle. What drives me? A relentless curiosity to solve problems and transform ideas into digital experiences that users love.
          </p>
        </div>

        <div class="mb-8">
          <h3 class="text-xl font-semibold mb-4 border-b pb-2 dark:text-white dark:border-gray-700">Skills</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 class="font-medium mb-2 dark:text-white">Technical Skills</h4>
              <ul class="list-disc list-inside space-y-1 dark:text-gray-300">
                <li>JavaScript (ES6+)</li>
                <li>Vue</li>
                <li>React</li>
                <li>HTML5 & CSS3</li>
                <li>Tailwind CSS</li>
                <li>Git & GitHub</li>
              </ul>
            </div>
            <div>
              <h4 class="font-medium mb-2 dark:text-white">Soft Skills</h4>
              <ul class="list-disc list-inside space-y-1 dark:text-gray-300">
                <li>Problem Solving</li>
                <li>Communication</li>
                <li>Team Collaboration</li>
                <li>Time Management</li>
                <li>Adaptability</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-xl font-semibold mb-4 border-b pb-2 dark:text-white dark:border-gray-700">Education</h3>
          <div class="mb-4">
            <h4 class="font-medium dark:text-white">Bachelor of Science in Industrial Engineering</h4>
            <p class="text-gray-600 dark:text-gray-300">University of Telkom, 2010-2015</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AboutPage'
}
</script>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.8s ease-out forwards;
}
</style>
