<template>
  <div>
    <TheHero />
    <AboutSection id="about" />
    <ExperienceSection id="experience" />
    <ProjectsSection id="projects" />
    <TestimonialsSection id="testimonials" />
    <ContactSection id="contact" />
  </div>
</template>

<script setup>
import TheHero from '../components/sections/TheHero.vue';
import AboutSection from '../components/sections/AboutSection.vue';
import ExperienceSection from '../components/sections/ExperienceSection.vue';
import TestimonialsSection from '../components/sections/TestimonialsSection.vue';
import ProjectsSection from '../components/sections/ProjectsSection.vue';
import ContactSection from '../components/sections/ContactSection.vue';
</script>
