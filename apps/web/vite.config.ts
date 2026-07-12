import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execSync } from "node:child_process";
import { svelteTesting } from "@testing-library/svelte/vite";
import { visualizer } from "rollup-plugin-visualizer";

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
  // Ignore
}
if (process.env.VITE_USE_POLLING === "true") {
  usePolling = true;
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit() as any,
    svelteTesting(),
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
  ],
  resolve: {
    alias: {
      "dice-engine": resolve(__dirname, "../../packages/dice-engine/src"),
      "generator-engine": resolve(
        __dirname,
        "../../packages/generator-engine/src",
      ),
      "map-engine": resolve(__dirname, "../../packages/map-engine/src"),
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
    chunkSizeWarningLimit: 900,
    minify: "esbuild",
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("@tiptap/") ||
            id.includes("svelte-tiptap") ||
            id.includes("tiptap-markdown")
          )
            return "chunk-editor";
          if (id.includes("cytoscape")) return "chunk-graph";
          if (id.includes("peerjs") || id.includes("peerjs/"))
            return "chunk-p2p";
          if (id.includes("pdfjs-dist")) return "chunk-pdf";
        },
      },
    },
  },
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    environment: "jsdom",
    globals: true,
    pool: "forks",
    silent: true,
    setupFiles: ["tests/setup.ts"],
    environmentMatchGlobs: [
      ["src/lib/utils/**", "node"],
      ["src/lib/config/**", "node"],
      ["src/lib/seo/**", "node"],
      ["src/lib/content/**", "node"],
      ["../../packages/ai-engine/src/prompts/**", "node"],
      ["../../packages/ai-engine/src/capability-guard*", "node"],
      ["../../packages/ai-engine/src/client-manager*", "node"],
      ["../../packages/ai-engine/src/image-generation*", "node"],
      ["../../packages/ai-engine/src/text-generation*", "node"],
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
      ["src/lib/stores/vault/entity-*", "node"],
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
  } as any,
  ssr: {
    noExternal: [
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
