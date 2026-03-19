import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "package.json"), "utf8"),
);

let gitHash = "unknown";
try {
  gitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch (e) {
  console.warn("Could not get git hash for versioning", e);
}

export default defineConfig({
  plugins: [tailwindcss(), sveltekit() as any],
  resolve: {
    alias: {
      "dice-engine": resolve(__dirname, "../../packages/dice-engine/src"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version}+${gitHash}`),
  },
  worker: {
    format: "es",
  },
  build: {
    minify: "esbuild",
    target: "es2020",
  },
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    environment: "jsdom",
    globals: true,
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "**/node_modules/**",
        "**/tests/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        ".svelte-kit/**",
        "build/**",
        "dist/**",
      ],
    },
  },
  ssr: {
    noExternal: [
      "graph-engine",
      "editor-core",
      "schema",
      "chronology-engine",
      "dice-engine",
      "@codex/sync-engine",
      "@codex/oracle-engine",
      "@codex/proposer",
      "@codex/search-engine",
      "@codex/importer",
      "@codex/canvas-engine",
    ],
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
    hmr: {
      host: "localhost",
    },
    watch: {
      usePolling: true,
    },
    fs: {
      // Allow serving files from the workspace root and all packages
      allow: [resolve(__dirname, "../../")],
    },
  },
  optimizeDeps: {
    exclude: ["graph-engine", "editor-core", "schema", "chronology-engine"],
  },
});
