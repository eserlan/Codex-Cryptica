import { describe, it, expect } from "vitest";
import { join } from "path";
import {
  ENTRY_GRAPH_DENYLIST,
  analyzeEntryGraph,
  analyzeRouteEntryGraph,
  checkEntryGraph,
  collectStaticClosure,
  findViolations,
  GENERATOR_ROUTE_CHECKS,
  normalizeSource,
} from "./check-entry-graph.mjs";

const NODES = "src/.svelte-kit/generated/build/client-optimized";

/** A small build: start/app entries, root layout, (app) layout and page. */
function fixture({
  pageImports = ["_a.js"],
  extraFiles = {},
  extraRoutes = [],
} = {}) {
  const manifest = {
    [`${NODES}/app.js`]: {
      file: "_app/immutable/entry/app.js",
      src: `${NODES}/app.js`,
      isEntry: true,
      imports: ["_a.js"],
    },
    "start.js": {
      file: "_app/immutable/entry/start.js",
      src: "start.js",
      isEntry: true,
    },
    [`${NODES}/nodes/0.js`]: {
      file: "_app/immutable/nodes/0.js",
      src: `${NODES}/nodes/0.js`,
      isEntry: true,
    },
    [`${NODES}/nodes/2.js`]: {
      file: "_app/immutable/nodes/2.js",
      src: `${NODES}/nodes/2.js`,
      isEntry: true,
    },
    [`${NODES}/nodes/4.js`]: {
      file: "_app/immutable/nodes/4.js",
      src: `${NODES}/nodes/4.js`,
      isEntry: true,
      imports: pageImports,
    },
    [`${NODES}/nodes/3.js`]: {
      file: "_app/immutable/nodes/3.js",
      src: `${NODES}/nodes/3.js`,
      isEntry: true,
    },
    // A node for another route: must not be walked.
    [`${NODES}/nodes/9.js`]: {
      file: "_app/immutable/nodes/9.js",
      src: `${NODES}/nodes/9.js`,
      isEntry: true,
      imports: ["_other.js"],
    },
    "_a.js": { file: "_app/immutable/chunks/a.js" },
    "_b.js": { file: "_app/immutable/chunks/b.js" },
    "_other.js": { file: "_app/immutable/chunks/other.js" },
  };
  for (const { node, imports = ["_a.js"] } of extraRoutes) {
    manifest[`${NODES}/nodes/${node}.js`] = {
      file: `_app/immutable/nodes/${node}.js`,
      src: `${NODES}/nodes/${node}.js`,
      isEntry: true,
      imports,
    };
    extraFiles[`_app/immutable/nodes/${node}.js`] = "";
  }
  const files = {
    "_app/immutable/entry/app.js": `x={"/(app)":[4,[2]],"/other":[9],${extraRoutes.map(({ routePath, node }) => `${JSON.stringify(routePath)}:[${node},[3]]`).join(",")}}`,
    "_app/immutable/entry/start.js": "",
    "_app/immutable/nodes/0.js": "",
    "_app/immutable/nodes/2.js": "",
    "_app/immutable/nodes/4.js": "",
    "_app/immutable/nodes/3.js": "",
    "_app/immutable/nodes/9.js": "",
    "_app/immutable/chunks/a.js": "export {}",
    "_app/immutable/chunks/b.js": "export {}",
    "_app/immutable/chunks/other.js":
      'new Worker("workers/oracle.worker-AbC123.js")',
    ...extraFiles,
  };
  for (const file of Object.keys(files)) {
    if (!files[`${file}.map`] && file.endsWith(".js")) {
      files[`${file}.map`] = JSON.stringify({
        sources: [`../../../src/${file.split("/").pop()}.ts`],
      });
    }
  }
  return { manifest, files, readText: (file) => files[file] ?? null };
}

describe("normalizeSource", () => {
  it("drops leading ../ segments", () => {
    expect(normalizeSource("../../../src/a.ts")).toBe("src/a.ts");
  });
});

describe("collectStaticClosure", () => {
  it("follows imports but not dynamicImports", () => {
    const manifest = {
      a: { file: "a.js", imports: ["b"], dynamicImports: ["c"] },
      b: { file: "b.js" },
      c: { file: "c.js" },
    };
    expect([...collectStaticClosure(manifest, ["a"])].sort()).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("analyzeEntryGraph / findViolations", () => {
  it("passes a clean graph and lists modules without walking other routes", () => {
    const graph = analyzeEntryGraph(fixture());
    expect(findViolations(graph)).toEqual([]);
    expect(graph.modules.has("src/a.js.ts")).toBe(true);
    expect(graph.chunks).not.toContain("_app/immutable/chunks/other.js");
    expect(graph.workers.size).toBe(0);
  });

  it("fails a denylisted module reached by a static import and names module and chunk", () => {
    const f = fixture({
      pageImports: ["_a.js", "_b.js"],
      extraFiles: {
        "_app/immutable/chunks/b.js.map": JSON.stringify({
          sources: ["../../../src/lib/workers/oracle.worker.ts"],
        }),
      },
    });
    const violations = findViolations(analyzeEntryGraph(f));
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("src/lib/workers/oracle.worker.ts");
    expect(violations[0]).toContain("_app/immutable/chunks/b.js");
  });

  it("fails a worker file referenced from a statically reached chunk", () => {
    const f = fixture({
      extraFiles: {
        "_app/immutable/chunks/a.js":
          'new Worker(new URL("workers/proposer.worker-Zx9_y.js", import.meta.url))',
      },
    });
    const violations = findViolations(analyzeEntryGraph(f));
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("workers/proposer.worker-Zx9_y.js");
    expect(violations[0]).toContain("_app/immutable/chunks/a.js");
  });

  it("passes a denylisted module reachable only through dynamicImports", () => {
    const f = fixture();
    f.manifest["_a.js"].dynamicImports = ["_other.js"];
    expect(findViolations(analyzeEntryGraph(f))).toEqual([]);
  });

  it("still scans a chunk that has no source map for workers", () => {
    const f = fixture({
      extraFiles: {
        "_app/immutable/chunks/a.js":
          'new Worker("workers/oracle.worker-Zx9_y.js")',
      },
    });
    const read = f.readText;
    const graph = analyzeEntryGraph({
      manifest: f.manifest,
      readText: (file) => (file.endsWith("a.js.map") ? null : read(file)),
    });
    expect(findViolations(graph)).toHaveLength(1);
  });

  it("uses the denylist it is given", () => {
    const graph = analyzeEntryGraph(fixture());
    expect(findViolations(graph, ["src/a.js"])).toHaveLength(1);
  });

  it("keeps deferred Help, AI, graph, and Drive modules off the root entry", () => {
    expect(ENTRY_GRAPH_DENYLIST).toEqual([
      "oracle.worker",
      "proposer.worker",
      "@tiptap/",
      "prosemirror-",
      "flexsearch",
      "node_modules/peerjs/",
      "campaign-generator-registry",
      "src/lib/config/help-articles.ts",
      "packages/ai-engine/src/client-manager.ts",
      "packages/graph-engine/src/",
      "packages/adventure-engine/src/",
      "src/lib/stores/oracle/adventure-manager.svelte.ts",
      "layout.worker",
      "packages/gdrive-sync/src/",
      "cytoscape",
    ]);
  });

  it("rejects deferred root modules when they re-enter the static closure", () => {
    const modules = new Map([
      ["src/lib/config/help-articles.ts", ["help.js"]],
      ["packages/ai-engine/src/client-manager.ts", ["ai.js"]],
      ["packages/graph-engine/src/index.ts", ["graph.js"]],
      ["packages/adventure-engine/src/index.ts", ["adventure.js"]],
      ["src/lib/stores/oracle/adventure-manager.svelte.ts", ["oracle.js"]],
      ["packages/gdrive-sync/src/index.ts", ["drive.js"]],
      ["@tiptap/core/dist/index.js", ["editor.js"]],
      ["prosemirror-model/dist/index.js", ["editor.js"]],
      ["cytoscape/dist/cytoscape.esm.js", ["graph.js"]],
    ]);
    const graph = {
      modules,
      workers: new Map([["workers/layout.worker-abc.js", ["graph.js"]]]),
    };

    expect(findViolations(graph)).toHaveLength(10);
  });
});

describe("generator route entry graphs", () => {
  it("checks the four public generator routes", () => {
    expect(GENERATOR_ROUTE_CHECKS.map(({ route }) => route)).toEqual([
      "/(marketing)/generators/[slug=generator_slug]",
      "/(marketing)/generators/[theme=theme_hub]/[slug=generator_slug]",
      "/(marketing)/tools/session-prep-builder",
      "/(marketing)/tools/idea-developer",
    ]);
  });

  it("rejects heavy modules reached through a route's transitive static imports", () => {
    const routePath = "/(marketing)/tools/session-prep-builder";
    const f = fixture({
      extraRoutes: [{ routePath, node: 10, imports: ["_a.js"] }],
      extraFiles: {
        "_app/immutable/chunks/a.js.map": JSON.stringify({
          sources: [
            "../../../packages/generator-engine/src/campaign-generator-registry.ts",
          ],
        }),
      },
    });
    const graph = analyzeRouteEntryGraph({
      manifest: f.manifest,
      readText: f.readText,
      routePath,
    });
    expect(findViolations(graph, ["campaign-generator-registry"])).toHaveLength(
      1,
    );
  });

  it("allows heavy modules reachable only through a dynamic import", () => {
    const routePath = "/(marketing)/tools/idea-developer";
    const f = fixture({
      extraRoutes: [{ routePath, node: 11, imports: ["_a.js"] }],
      extraFiles: {
        "_app/immutable/chunks/b.js.map": JSON.stringify({
          sources: ["../../../packages/ai-engine/src/index.ts"],
        }),
      },
    });
    f.manifest["_a.js"].dynamicImports = ["_b.js"];
    const graph = analyzeRouteEntryGraph({
      manifest: f.manifest,
      readText: f.readText,
      routePath,
    });
    expect(findViolations(graph, ["packages/ai-engine/src/"])).toEqual([]);
  });
});

describe("checkEntryGraph", () => {
  it("uses the default root and public-route denylist for editor and graph leaks", () => {
    const publicRoutes = GENERATOR_ROUTE_CHECKS.map(({ route }, index) => ({
      routePath: route,
      node: 20 + index,
      imports: ["_editor-graph.js"],
    }));
    const f = fixture({ extraRoutes: publicRoutes });
    f.manifest["_editor-graph.js"] = {
      file: "_app/immutable/chunks/editor-graph.js",
    };
    f.files["_app/immutable/chunks/editor-graph.js"] = "export {}";
    f.files["_app/immutable/chunks/editor-graph.js.map"] = JSON.stringify({
      sources: [
        "../../node_modules/@tiptap/core/dist/index.js",
        "../../packages/graph-engine/src/index.ts",
      ],
    });

    const { errors } = checkEntryGraph({
      appDir: "/app",
      exists: () => true,
      read: (path) =>
        path.endsWith("manifest.json")
          ? JSON.stringify(f.manifest)
          : f.readText(path.replace("/app/build/", "")),
    });

    expect(errors).toHaveLength(publicRoutes.length * 2);
    expect(errors.every((message) => message.includes("/(marketing)/"))).toBe(
      true,
    );
    expect(errors.some((message) => message.includes("@tiptap/core"))).toBe(
      true,
    );
    expect(
      errors.some((message) => message.includes("packages/graph-engine/src/")),
    ).toBe(true);
  });

  it("reports a missing manifest as an error", () => {
    const { errors } = checkEntryGraph({
      appDir: "/nowhere",
      exists: () => false,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("manifest not found");
  });

  it("reports a missing build directory as an error", () => {
    const manifest = join(
      "/app",
      ".svelte-kit/output/client/.vite/manifest.json",
    );
    const { errors } = checkEntryGraph({
      appDir: "/app",
      exists: (p) => p === manifest,
    });
    expect(errors[0]).toContain("Build output not found");
  });

  it("returns violations and a report for a build", () => {
    const f = fixture();
    const { errors, report } = checkEntryGraph({
      appDir: "/app",
      denylist: ["src/a.js"],
      generatorRouteChecks: [],
      exists: () => true,
      read: (path) =>
        path.endsWith("manifest.json")
          ? JSON.stringify(f.manifest)
          : f.readText(path.replace("/app/build/", "")),
    });
    expect(errors).toHaveLength(1);
    expect(report).toContain("Chunks on the entry graph");
  });
});
