<template>
  <div>
    <HeroSection />
    <NeoMarquee />
    <AboutSection id="about" />
    <NeoMarquee variant="accent" text="4+ years ✦ Vue ✦ Flutter ✦ Node ✦ AI" />
    <ExperienceSection id="experience" />
    <NeoMarquee text="Selected work ✦ Case studies ✦ Shipped" />
    <ProjectsSection id="projects" />
    <NeoMarquee variant="accent" text="Let's build something ✦ Say hello" />
    <ContactSection id="contact" />
  </div>
</template>

<script setup>
import NeoMarquee from "../components/ui/NeoMarquee.vue";
import HeroSection from "../components/sections/HeroSection.vue";
import AboutSection from "../components/sections/AboutSection.vue";
import ExperienceSection from "../components/sections/ExperienceSection.vue";
import ProjectsSection from "../components/sections/ProjectsSection.vue";
import ContactSection from "../components/sections/ContactSection.vue";
</script>
