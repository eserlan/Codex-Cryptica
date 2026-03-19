import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{js,ts}", "tests/**/*.{test,spec}.{js,ts}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        statements: 65,
        branches: 50,
        functions: 60,
        lines: 65,
      },
      exclude: [
        "node_modules/**",
        "tests/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/*.config.ts",
        ".svelte-kit/**",
        "src/index.ts",
      ],
    },
  },
});
