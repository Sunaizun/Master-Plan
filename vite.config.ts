import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Builds one IIFE bundle (app.js) + one stylesheet (app.css).
// scripts/assemble.mjs then inlines both into dist/masters-os.html,
// a single self-contained page that can be published as a claude.ai
// Artifact or opened directly in a browser.
export default defineConfig({
  plugins: [react()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: "dist/bundle",
    emptyOutDir: true,
    cssCodeSplit: false,
    minify: "esbuild",
    lib: {
      entry: "src/main.tsx",
      name: "MastersOS",
      formats: ["iife"],
      fileName: () => "app.js",
    },
    rollupOptions: { output: { assetFileNames: "app.[ext]" } },
  },
});
