import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/styles/index.css'
import { titleReveal } from './directives/titleReveal'

createApp(App).use(router).directive('title-reveal', titleReveal).mount('#app')
