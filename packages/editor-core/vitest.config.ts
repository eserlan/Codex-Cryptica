import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{js,ts}", "tests/**/*.{test,spec}.{js,ts}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 60,
        lines: 70,
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
