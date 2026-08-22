import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
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
  plugins: [svelte()],
  resolve: {
    alias: {
      "@codex/adventure-engine": resolve(
        __dirname,
        "../adventure-engine/src/index.ts",
      ),
      "@codex/oracle-engine": resolve(
        __dirname,
        "../oracle-engine/src/index.ts",
      ),
      "generator-engine": resolve(__dirname, "../generator-engine/src"),
      schema: resolve(__dirname, "../schema/src/index.ts"),
    },
  },
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
        "**/*.md",
      ],
    },
  },
});
