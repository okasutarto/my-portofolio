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
              Versatile Fullstack Developer with 3+ years of experience delivering end-to-end digital solutions across the complete software development lifecycle. Expert in building high-performance user interfaces with Vue.js, React, and Angular while architecting secure, scalable backends using Node.js and SQL/NoSQL databases.
            </p>
            <a 
              href="/OkaSutartoCV.pdf" 
              download="OkaSutartoCV.pdf"
              class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download My CV
            </a>
          </div>
        </div>

        <div class="mb-8">
          <h3 class="text-xl font-semibold mb-4 border-b pb-2 dark:text-white dark:border-gray-700">Experiences</h3>
          
          <!-- Frontend Engineer -->
          <div class="mb-6">
            <div class="flex flex-col md:flex-row md:justify-between md:items-start mb-2">
              <h4 class="font-medium dark:text-white">Frontend Engineer</h4>
              <span class="text-sm text-gray-500 dark:text-gray-400">July 2023 – December 2025</span>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm mb-2">Jublia PTE LTD - SaaS and B2B Company for Event Organizer Industry - Remote (Full-time)</p>
            <div class="mb-2">
              <span class="text-xs font-medium text-blue-600 dark:text-blue-400">Tech Stack: </span>
              <span class="text-xs text-gray-600 dark:text-gray-400">Vue, Angular, Typescript, Bootstrap5, Unlayer, Vuex, HTML, CSS</span>
            </div>
            <ul class="list-disc ml-5 space-y-1 text-sm dark:text-gray-300">
              <li>Lead frontend development for a global B2B event networking platform, ensuring high performance for major international conferences.</li>
              <li>Developed integrated communication modules and enhanced UI/UX performance, directly resulting in a 40% improvement in user engagement.</li>
              <li>Proactively expanded technical contribution by taking ownership of Angular-based projects, successfully delivering features outside of core Vue.js responsibilities.</li>
              <li>Architected scalable frontend solutions and maintained 95%+ code coverage, driving critical technical decisions for codebase architecture.</li>
              <li>Mentored junior developers to foster coding best practices and team growth.</li>
            </ul>
          </div>

          <!-- Backend Developer -->
          <div class="mb-6">
            <div class="flex flex-col md:flex-row md:justify-between md:items-start mb-2">
              <h4 class="font-medium dark:text-white">Backend Developer</h4>
              <span class="text-sm text-gray-500 dark:text-gray-400">March 2023 – July 2023</span>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm mb-2">Null Reborn - Software House - Remote (Part-time)</p>
            <div class="mb-2">
              <span class="text-xs font-medium text-blue-600 dark:text-blue-400">Tech Stack: </span>
              <span class="text-xs text-gray-600 dark:text-gray-400">Node.js, Express, MySQL, Sequelize ORM, JWT, Postgresql, Rest APIs, Axios</span>
            </div>
            <ul class="list-disc ml-5 space-y-1 text-sm dark:text-gray-300">
              <li>Lead designed, Architected and implemented secure RESTful APIs for applications, achieving 99.9% uptime.</li>
              <li>Optimized database performance, reducing query response times by 60% through efficient indexing and query refactoring.</li>
              <li>Built robust authentication systems with role-based access control (RBAC) to ensure strict security compliance.</li>
              <li>Collaborated with frontend teams to ensure seamless API integration and efficient data flow.</li>
            </ul>
          </div>

          <!-- Junior Frontend Developer -->
          <div class="mb-6">
            <div class="flex flex-col md:flex-row md:justify-between md:items-start mb-2">
              <h4 class="font-medium dark:text-white">Junior Frontend Developer</h4>
              <span class="text-sm text-gray-500 dark:text-gray-400">September 2022 – August 2023</span>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm mb-2">PT Geekseat Indonesia - Software House - Remote</p>
            <div class="mb-2">
              <span class="text-xs font-medium text-blue-600 dark:text-blue-400">Tech Stack: </span>
              <span class="text-xs text-gray-600 dark:text-gray-400">HTML, CSS, React.js, Vue.js, Tailwind, Kendo UI</span>
            </div>
            <ul class="list-disc ml-5 space-y-1 text-sm dark:text-gray-300">
              <li>Develop responsive web applications for an Australian-based software company using React.js and Vue.js.</li>
              <li>Integrated real-time data systems via API connections, significantly improving application interactivity.</li>
              <li>Collaborate within an Agile Scrum environment, working closely with UI/UX designers to ensure pixel-perfect implementation.</li>
            </ul>
          </div>
        </div>

        <div class="mb-8">
          <h3 class="text-xl font-semibold mb-4 border-b pb-2 dark:text-white dark:border-gray-700">Languages</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <ul class="list-disc ml-5 space-y-1 dark:text-gray-300">
                <li><strong>English :</strong> Professional Working Proficiency</li>
                <li><strong>Bahasa Indonesia :</strong> Native</li>
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
