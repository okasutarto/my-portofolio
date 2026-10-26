import { createRouter, createWebHistory, START_LOCATION } from "vue-router";
// The front page ships with the app bundle (three.js still loads on its own), so a fresh load
// goes straight to the desk's backdrop instead of a blank page while a chunk downloads
import DeskPage from "../views/DeskPage.vue";

// Let the router own scroll restoration, including the explicit return to a project.
window.history.scrollRestoration = "manual";


const routes = [
  {
    // The 3D desk is the front page; the classic scrolling site lives at /2d
    path: "/",
    name: "desk",
    component: DeskPage,
    meta: { title: "Oka Sutarto Putra | Full Stack Developer", immersive: true },
  },
  {
    path: "/2d",
    name: "home",
    component: () => import("../views/HomePage.vue"),
    meta: { title: "Oka Sutarto Putra | 2D" },
  },
  // Old link to the desk
  { path: "/desk", redirect: "/" },
  {
    // Projects open as files inside the Projects drawer; old links land there with the file open
    path: "/projects/:id",
    name: "project-details",
    redirect: (to) => ({ path: "/2d", hash: "#projects", query: { file: to.params.id } }),
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
    if (to.path === "/2d" && to.query.file) return false;
    if (to.path === "/2d" && from === START_LOCATION) return { top: 0, behavior: "instant" };
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
