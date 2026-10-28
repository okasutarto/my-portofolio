import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  // VUE_APP_* names are kept from the Vue CLI days, so deployed env vars still apply
  const env = loadEnv(mode, process.cwd(), "VUE_APP_");
  return {
    plugins: [vue()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    // The code reads process.env rather than import.meta.env: the desk checks run source
    // sections as plain scripts in a VM, where import.meta is a syntax error
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode === "production" ? "production" : "development"),
      "process.env.BASE_URL": JSON.stringify("/"),
      "process.env.VUE_APP_API_URL": JSON.stringify(env.VUE_APP_API_URL || ""),
    },
    server: { port: 8080 },
  };
});
