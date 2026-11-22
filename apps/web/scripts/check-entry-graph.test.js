import { describe, it, expect } from "vitest";
import { join } from "path";
import {
  ENTRY_GRAPH_DENYLIST,
  analyzeEntryGraph,
  checkEntryGraph,
  collectStaticClosure,
  findViolations,
  normalizeSource,
} from "./check-entry-graph.mjs";

const NODES = "src/.svelte-kit/generated/build/client-optimized";

/** A small build: start/app entries, root layout, (app) layout and page. */
function fixture({ pageImports = ["_a.js"], extraFiles = {} } = {}) {
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
  const files = {
    "_app/immutable/entry/app.js": 'x={"/(app)":[4,[2]],"/other":[9]}',
    "_app/immutable/entry/start.js": "",
    "_app/immutable/nodes/0.js": "",
    "_app/immutable/nodes/2.js": "",
    "_app/immutable/nodes/4.js": "",
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
  return { manifest, readText: (file) => files[file] ?? null };
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

  it("includes the denylisted workers, editor, search, P2P, and generator registry patterns (#5013)", () => {
    expect(ENTRY_GRAPH_DENYLIST).toEqual([
      "oracle.worker",
      "proposer.worker",
      "@tiptap/",
      "prosemirror-",
      "flexsearch",
      "node_modules/peerjs/",
      "campaign-generator-registry",
    ]);
  });
});

describe("checkEntryGraph", () => {
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
