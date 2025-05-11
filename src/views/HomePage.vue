<template>
  <div>
    <TheHero />
    <AboutSection id="about" />
    <ProjectsSection id="projects" />
    <ContactSection id="contact" />
  </div>
</template>

<script setup>
import TheHero from '../components/TheHero.vue';
import AboutSection from '../components/AboutSection.vue';
import ProjectsSection from '../components/ProjectsSection.vue';
import ContactSection from '../components/ContactSection.vue';
</script>
