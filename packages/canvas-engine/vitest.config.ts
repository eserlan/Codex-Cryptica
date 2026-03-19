import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  define: {
    __BUNDLED_DEV__: "true",
    __SERVER_FORWARD_CONSOLE__: "false",
    __HMR_PROTOCOL__: '"ws"',
    __HMR_HOSTNAME__: '"localhost"',
    __HMR_PORT__: "3000",
    __HMR_DIRECT_TARGET__: '"localhost"',
    __HMR_BASE__: '"/"',
    __HMR_TIMEOUT__: "30000",
    __HMR_ENABLE_OVERLAY__: "false",
  },
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
        "src/store.svelte.ts",
      ],
    },
  },
});
