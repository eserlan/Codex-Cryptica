import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        statements: 80,
        branches: 55,
        functions: 80,
        lines: 80,
      },
      exclude: [
        "node_modules/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/*.config.ts",
        "src/index.ts",
        "**/*.md",
      ],
    },
  },
});
