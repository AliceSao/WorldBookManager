import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  base: "/api/plugins/wb-manager/ui/",
  build: {
    outDir: "../server/ST-WBM-Server/web/dist",
    emptyOutDir: true,
  },
});
