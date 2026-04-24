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
    ...(process.env.VITEST
      ? {
          __BUNDLED_DEV__: "true",
          __SERVER_FORWARD_CONSOLE__: "false",
          __HMR_PROTOCOL__: '"ws"',
          __HMR_HOSTNAME__: '"localhost"',
          __HMR_PORT__: "3000",
          __HMR_DIRECT_TARGET__: '"localhost"',
          __HMR_BASE__: '"/"',
          __HMR_TIMEOUT__: "30000",
          __HMR_ENABLE_OVERLAY__: "false",
        }
      : {}),
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
    pool: "threads",
    setupFiles: ["tests/setup.ts"],
    // @ts-expect-error environmentMatchGlobs is valid at runtime in vitest 4.x but missing from the bundled types
    environmentMatchGlobs: [
      ["src/lib/utils/**", "node"],
      ["src/lib/config/**", "node"],
      ["src/lib/seo/**", "node"],
      ["src/lib/content/**", "node"],
      ["src/lib/services/ai/prompts/**", "node"],
      ["src/lib/services/ai/capability-guard*", "node"],
      ["src/lib/services/ai/client-manager*", "node"],
      ["src/lib/services/ai/image-generation*", "node"],
      ["src/lib/services/ai/text-generation*", "node"],
      ["src/lib/services/node-merge*", "node"],
      ["src/lib/services/vtt-session*", "node"],
      ["src/lib/services/cache*", "node"],
      ["src/lib/stores/categories*", "node"],
      ["src/lib/stores/dice-history*", "node"],
      ["src/lib/stores/graph*", "node"],
      ["src/lib/stores/theme*", "node"],
      ["src/lib/stores/map-registry*", "node"],
      ["src/lib/stores/canvas-registry*", "node"],
      ["src/lib/stores/vault-batch*", "node"],
      ["src/lib/stores/vault/entities*", "node"],
      ["src/lib/stores/vault/entity-store*", "node"],
      ["src/lib/stores/vault/events*", "node"],
      ["src/lib/stores/vault/lifecycle*", "node"],
      ["src/lib/stores/vault/messenger*", "node"],
      ["src/lib/stores/vault/migration*", "node"],
      ["src/lib/stores/vault/registry*", "node"],
      ["src/lib/stores/vault/relationships*", "node"],
      ["src/lib/stores/vault/search-store*", "node"],
      ["src/lib/stores/vault/service-registry*", "node"],
      ["src/lib/stores/vault/sync-store*", "node"],
      ["src/lib/stores/vault/asset-store*", "node"],
      ["src/lib/stores/oracle-connections*", "node"],
      ["src/lib/stores/world*", "node"],
      ["src/lib/components/world/front-page/**", "node"],
      ["src/lib/components/entity-detail/detail-tabs*", "node"],
      ["src/lib/components/explorer/EntityListGrouping*", "node"],
      ["src/lib/components/layout/app-header-actions*", "node"],
      ["src/lib/components/map/map-fog-painter*", "node"],
      ["src/lib/components/map/map-page-actions*", "node"],
      ["src/lib/components/map/vtt-ui*", "node"],
      ["src/lib/components/oracle/chat-message*", "node"],
      ["src/lib/components/search/search-focus*", "node"],
      ["src/lib/components/zen/ZenContent*", "node"],
      ["src/lib/hooks/**", "node"],
      ["src/lib/workers/**", "node"],
      ["src/smoke*", "node"],
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        statements: 40,
        branches: 35,
        functions: 40,
        lines: 40,
      },
      exclude: [
        "**/node_modules/**",
        "**/tests/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        ".svelte-kit/**",
        "build/**",
        "dist/**",
        "**/*.md",
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
    exclude: [
      "graph-engine",
      "editor-core",
      "schema",
      "chronology-engine",
      "@codex/canvas-engine",
    ],
    include: ["@xyflow/svelte"],
  },
});
