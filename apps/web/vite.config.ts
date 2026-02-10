import { sveltekit } from "@sveltejs/kit/vite";
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
  plugins: [sveltekit() as any],
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version}+${gitHash}`),
  },
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
