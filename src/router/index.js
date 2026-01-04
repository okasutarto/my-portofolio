import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/HomePage.vue"),
    meta: { title: "Oka Sutarto Putra" },
  },
  {
    path: "/projects/:id",
    name: "project-details",
    component: () => import("../views/ProjectDetails.vue"),
    props: true,
    meta: { title: "Project Details | okasputra" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("../views/NotFound.vue"),
    meta: { title: "404 Not Found | okasputra" },
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    if (to.hash) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            el: to.hash,
            behavior: "smooth",
          });
        }, 100);
      });
    }
    return { top: 0 };
  },
});

// navigation guard to set document title
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || "Your Portfolio Name";
  next();
});

export default router;
