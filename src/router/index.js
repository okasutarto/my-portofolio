import { createRouter, createWebHistory, START_LOCATION } from "vue-router";

// Let the router own scroll restoration, including the explicit return to a project.
window.history.scrollRestoration = "manual";


const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/HomePage.vue"),
    meta: { title: "Oka Sutarto Putra" },
  },
  {
    // Projects open as files inside the Projects drawer; old links land there with the file open
    path: "/projects/:id",
    name: "project-details",
    redirect: (to) => ({ path: "/", hash: "#projects", query: { file: to.params.id } }),
  },
  {
    path: "/desk",
    name: "desk",
    component: () => import("../views/DeskPage.vue"),
    meta: { title: "The Desk | okasputra", immersive: true },
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
    // The drawer scrolls to (and opens) the linked file itself
    if (to.path === "/" && to.query.file) return false;
    if (to.path === "/" && from === START_LOCATION) return { top: 0, behavior: "instant" };
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
