import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execSync } from "node:child_process";
import { svelteTesting } from "@testing-library/svelte/vite";
import { visualizer } from "rollup-plugin-visualizer";
import { PRERENDER_ENTRIES } from "./src/lib/config/prerender-entries";

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

let usePolling = false;
try {
  usePolling = readFileSync("/proc/version", "utf8")
    .toLowerCase()
    .includes("microsoft");
} catch {
  // Ignore non-Linux or inaccessible /proc/version
}
if (process.env.VITE_USE_POLLING === "true") {
  usePolling = true;
}

const NODE_TEST_PREFIXES = [
  "src/lib/utils/**",
  "src/lib/config/**",
  "src/lib/services/adventure/**",
  "../../functions/**",
  "src/lib/content/**",
  "../../packages/ai-engine/src/prompts/**",
  "../../packages/ai-engine/src/capability-guard*",
  "../../packages/ai-engine/src/text-generation*",
  "src/lib/services/node-merge*",
  "src/lib/services/vtt-session*",
  "src/lib/services/cache*",
  "src/lib/stores/categories*",
  "src/lib/stores/dice-history*",
  "src/lib/stores/canvas-registry*",
  "src/lib/stores/vault-batch*",
  "src/lib/stores/vault/entities*",
  "src/lib/stores/vault/entity-*",
  "src/lib/stores/vault/events*",
  "src/lib/stores/vault/lifecycle*",
  "src/lib/stores/vault/migration*",
  "src/lib/stores/vault/registry*",
  "src/lib/stores/vault/relationships*",
  "src/lib/stores/vault/search-store*",
  "src/lib/stores/vault/service-registry*",
  "src/lib/stores/vault/sync-store*",
  "src/lib/stores/vault/asset-store*",
  "src/lib/stores/oracle-connections*",
  "src/lib/stores/world*",
  "src/lib/components/world/front-page/**",
  "src/lib/components/entity-detail/detail-tabs*",
  "src/lib/components/explorer/EntityListGrouping*",
  "src/lib/components/layout/app-header-actions*",
  "src/lib/components/map/map-fog-painter*",
  "src/lib/components/map/map-page-actions*",
  "src/lib/components/map/vtt-ui*",
  "src/lib/components/oracle/chat-message*",
  "src/lib/components/search/search-focus*",
  "src/lib/components/zen/ZenContent*",
  "src/lib/workers/**",
  "src/smoke*",
];

const NODE_TEST_GLOBS = NODE_TEST_PREFIXES.map((pattern) =>
  pattern.endsWith("/**")
    ? `${pattern}/*.{test,spec}.{js,ts}`
    : `${pattern}.{test,spec}.{js,ts}`,
);

export default defineConfig({
  plugins: [
    ...(process.env.VITEST ? [] : [tailwindcss()]),
    sveltekit({
      // The app checks for service-worker updates on launch and tab return.
      version: { pollInterval: 0 },
      // We register and manage the ServiceWorker lifecycle deterministically via
      // app-init.ts (supporting vault session caching, cleanup, and dev bypass).
      // Disable SvelteKit's automatic inline registration to prevent duplicate racing
      // registrations and InvalidStateError exceptions on prerendered routes.
      serviceWorker: { register: false },

      // Using adapter-static to generate a fully static site suitable for Cloudflare Pages (no SSR, only prerendered assets).
      // Cloudflare Pages serves static files directly, and the fallback index.html supports SPA routing for the app shell.
      // See https://svelte.dev/docs/kit/adapters for more information about adapter-static and other deployment targets.
      adapter: adapter({ fallback: "index.html", strict: false }),

      prerender: {
        entries: [...PRERENDER_ENTRIES],
        handleUnseenRoutes: "ignore",
        // fallow-ignore-next-line complexity
        handleHttpError: ({ path, message }) => {
          // Ignore static assets/metadata files that return 404 during local crawling
          const isIgnored =
            path === "/app" ||
            path.startsWith("/app/") ||
            /\/(llms\.txt|favicon\.png|logo\.png|manifest\.webmanifest)$/.test(
              path,
            ) ||
            path.includes("/images/");
          if (isIgnored) {
            return;
          }

          throw new Error(message);
        },
      },
    }) as any,
    svelteTesting(),
    ...(process.env.VITEST
      ? []
      : [
          visualizer({
            emitFile: true,
            filename: "bundle-report.html",
            template: "treemap",
            gzipSize: true,
            brotliSize: true,
          }),
          visualizer({
            emitFile: true,
            filename: "bundle-stats.json",
            template: "raw-data",
            gzipSize: true,
            brotliSize: true,
          }),
        ]),
  ],
  resolve: {
    alias: {
      "@codex/adventure-engine": resolve(
        __dirname,
        "../../packages/adventure-engine/src/index.ts",
      ),
      "@codex/ai-engine/api-error-classifier": resolve(
        __dirname,
        "../../packages/ai-engine/src/api-error-classifier.ts",
      ),
      "@codex/ai-engine/config": resolve(
        __dirname,
        "../../packages/ai-engine/src/config.ts",
      ),
      "@codex/ai-engine/interaction-session": resolve(
        __dirname,
        "../../packages/ai-engine/src/interaction-session.ts",
      ),
      "@codex/ai-engine/client-manager": resolve(
        __dirname,
        "../../packages/ai-engine/src/client-manager.ts",
      ),
      "@codex/ai-engine/session-manager": resolve(
        __dirname,
        "../../packages/ai-engine/src/session-manager.ts",
      ),
      "@codex/ai-engine/text-generation-context": resolve(
        __dirname,
        "../../packages/ai-engine/src/text-generation-context.ts",
      ),
      "@codex/ai-engine": resolve(
        __dirname,
        "../../packages/ai-engine/src/index.ts",
      ),
      "@codex/audio-engine": resolve(
        __dirname,
        "../../packages/audio-engine/src/index.ts",
      ),
      "@codex/canvas-engine": resolve(
        __dirname,
        "../../packages/canvas-engine/src/index.ts",
      ),
      "@codex/content-packs": resolve(
        __dirname,
        "../../packages/content-packs/src/index.ts",
      ),
      "@codex/entity-shelf": resolve(
        __dirname,
        "../../packages/entity-shelf/src/index.ts",
      ),
      "@codex/events": resolve(__dirname, "../../packages/events/src/index.ts"),
      "@codex/family-engine": resolve(
        __dirname,
        "../../packages/family-engine/src/index.ts",
      ),
      "@codex/gdrive-sync": resolve(
        __dirname,
        "../../packages/gdrive-sync/src/index.ts",
      ),
      "@codex/importer": resolve(
        __dirname,
        "../../packages/importer/src/index.ts",
      ),
      "@codex/oracle-engine": resolve(
        __dirname,
        "../../packages/oracle-engine/src/index.ts",
      ),
      "@codex/performance-observability": resolve(
        __dirname,
        "../../packages/performance-observability/src/index.ts",
      ),
      "@codex/proposer": resolve(
        __dirname,
        "../../packages/proposer/src/index.ts",
      ),
      "@codex/runtime": resolve(
        __dirname,
        "../../packages/runtime/src/index.ts",
      ),
      "@codex/search-engine": resolve(
        __dirname,
        "../../packages/search-engine/src/index.ts",
      ),
      "@codex/search-orchestrator": resolve(
        __dirname,
        "../../packages/search-orchestrator/src/index.ts",
      ),
      "@codex/stat-sheet-engine": resolve(
        __dirname,
        "../../packages/stat-sheet-engine/src/index.ts",
      ),
      "@codex/sync-engine": resolve(
        __dirname,
        "../../packages/sync-engine/src/index.ts",
      ),
      "@codex/vault-engine": resolve(
        __dirname,
        "../../packages/vault-engine/src/index.ts",
      ),
      "chronology-engine": resolve(
        __dirname,
        "../../packages/chronology-engine/src",
      ),
      "dice-engine": resolve(__dirname, "../../packages/dice-engine/src"),
      "editor-core": resolve(__dirname, "../../packages/editor-core/src"),
      "generator-engine": resolve(
        __dirname,
        "../../packages/generator-engine/src",
      ),
      "graph-engine": resolve(__dirname, "../../packages/graph-engine/src"),
      "map-engine": resolve(__dirname, "../../packages/map-engine/src"),
      "random-source-engine": resolve(
        __dirname,
        "../../packages/random-source-engine/src",
      ),
      schema: resolve(__dirname, "../../packages/schema/src/index.ts"),
    },
    dedupe: ["svelte"],
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
    sourcemap: true,
    chunkSizeWarningLimit: 900,
    minify: "esbuild",
    target: "es2020",
    rollupOptions: {},
  },
  test: {
    globals: true,
    pool: "threads",
    fsModuleCache: true,
    // Leave half the cores free locally so a test run doesn't freeze the
    // machine; CI keeps vitest's default. VITEST_MAX_WORKERS overrides both.
    maxWorkers: process.env.CI ? undefined : "50%",
    silent: true,
    testTimeout: 15000,
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: NODE_TEST_GLOBS,
          setupFiles: ["tests/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: [
            "src/**/*.{test,spec}.{js,ts}",
            "scripts/**/*.{test,spec}.{js,ts}",
            // Cloudflare Pages Functions live at the repo root and aren't their own
            // workspace, so they ride along with the web app's test run (#2864).
            "../../functions/**/*.{test,spec}.{js,ts}",
          ],
          exclude: [...NODE_TEST_GLOBS, "**/node_modules/**", "**/.git/**"],
          setupFiles: ["tests/setup.ts"],
        },
      },
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
  } as any,
  ssr: {
    noExternal: [
      "cookie",
      "graph-engine",
      "map-engine",
      "editor-core",
      "schema",
      "chronology-engine",
      "dice-engine",
      "generator-engine",
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
      usePolling,
    },
    fs: {
      // Allow serving files from the workspace root and all packages
      allow: [resolve(__dirname, "../../")],
    },
  },
  optimizeDeps: {
    exclude: [
      "graph-engine",
      "map-engine",
      "editor-core",
      "schema",
      "chronology-engine",
      "generator-engine",
      "@codex/canvas-engine",
    ],
    include: ["@xyflow/svelte"],
  },
});
