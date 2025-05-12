import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomePage.vue'),
    meta: { title: 'Home | okasputra' }
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutPage.vue'),
    meta: { title: 'About | okasputra' }
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('../views/ContactPage.vue'),
    meta: { title: 'Contact | okasputra' }
  },
  {
    path: '/projects/:id',
    name: 'project-details',
    component: () => import('../views/ProjectDetails.vue'),
    props: true,
    meta: { title: 'Project Details | okasputra' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '404 Not Found | okasputra' }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

// navigation guard to set document title
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'Your Portfolio Name'
  next()
})

export default router