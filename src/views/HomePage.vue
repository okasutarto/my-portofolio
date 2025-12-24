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
import TheHero from '../components/TheHero.vue';
import AboutSection from '../components/AboutSection.vue';
import ExperienceSection from '../components/ExperienceSection.vue';
import TestimonialsSection from '../components/TestimonialsSection.vue';
import ProjectsSection from '../components/ProjectsSection.vue';
import ContactSection from '../components/ContactSection.vue';
</script>
