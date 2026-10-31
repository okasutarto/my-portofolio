import { createRouter, createWebHistory, START_LOCATION } from "vue-router";
// The front page ships with the app bundle (three.js still loads on its own), so a fresh load
// goes straight to the desk's backdrop instead of a blank page while a chunk downloads
import DeskPage from "../features/desk3d/DeskPage.vue";

// Let the router own scroll restoration, including the explicit return to a project.
window.history.scrollRestoration = "manual";


const routes = [
  {
    // The 3D desk is the front page; the classic scrolling site lives at /2d
    path: "/",
    name: "desk",
    component: DeskPage,
    meta: { title: "The Desk | A 3D Portfolio", immersive: true },
  },
  {
    // Both classic pages share a lazy shell. Desk visits never load its UI or analytics SDK.
    path: "/",
    component: () => import("../features/portfolio2d/PortfolioLayout.vue"),
    children: [
      {
        path: "2d",
        name: "home",
        component: () => import("../features/portfolio2d/HomePage.vue"),
        meta: { title: "Oka Sutarto Putra | 2D" },
      },
      {
        path: ":pathMatch(.*)*",
        name: "not-found",
        component: () => import("../shared/components/NotFound.vue"),
        meta: { title: "404 Not Found | okasputra" },
      },
    ],
  },
  // Old link to the desk
  { path: "/desk", redirect: "/" },
  {
    // Projects open as files inside the Projects drawer; old links land there with the file open
    path: "/projects/:id",
    name: "project-details",
    redirect: (to) => ({ path: "/2d", hash: "#projects", query: { file: to.params.id } }),
  },

];

// Sections can still be laying out (fonts, the lazy page) when the route settles, so a
// hash target is waited for briefly rather than looked up once
const waitForElement = (id, timeout = 3000) =>
  new Promise((resolve) => {
    const started = performance.now();
    const look = () => {
      const el = document.getElementById(id);
      if (el || performance.now() - started > timeout) return resolve(el);
      requestAnimationFrame(look);
    };
    look();
  });

const scrollToHash = async (hash, behavior) => {
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // keep the raw id
  }
  const el = await waitForElement(id);
  if (!el) return { top: 0 };
  await document.fonts?.ready;
  return { el, behavior };
};

const isReload = () => performance.getEntriesByType?.("navigation")[0]?.type === "reload";

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // The drawer scrolls to (and opens) the linked file itself
    if (to.path === "/2d" && to.query.file) return false;
    if (from === START_LOCATION) {
      // Arriving from a link to /2d#contact lands on Contact. A reload starts at the top like a
      // plain /2d: the hash is only the last section picked in the navbar, not where you were.
      if (to.hash && !isReload()) return scrollToHash(to.hash, "instant");
      if (to.path === "/2d") return { top: 0, behavior: "instant" };
    }
    if (savedPosition) {
      return savedPosition;
    }
    if (to.hash) return scrollToHash(to.hash, "smooth");
    return { top: 0 };
  },
});

// navigation guard to set document title
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || "Your Portfolio Name";
  next();
});



export default router;
