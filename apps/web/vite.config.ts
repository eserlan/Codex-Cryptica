import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [sveltekit() as any],
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
    hmr: {
      host: "localhost",
    },
    fs: {
      // Allow serving files from the workspace root
      allow: [".."],
    },
  },
  optimizeDeps: {
    exclude: ["graph-engine", "editor-core", "schema"],
  },
});
