import { describe, it, expect } from "vitest";
import {
  selectDegodifyCandidate,
  buildDecompositionPrompt,
} from "./auto-degodify.ts";
import type { FileAnalysis } from "./god-file-analysis.ts";

describe("auto-degodify", () => {
  const sampleFiles: FileAnalysis[] = [
    {
      path: "/repo/packages/schema/src/silhouettes.ts",
      relativePath: "packages/schema/src/silhouettes.ts",
      totalLines: 2400,
      codeLines: 2300,
      functionCount: 0,
      type: "Data Catalog",
      isDataCatalog: true,
      status: "CRITICAL",
    },
    {
      path: "/repo/apps/web/src/components/Canvas.svelte",
      relativePath: "apps/web/src/components/Canvas.svelte",
      totalLines: 1800,
      codeLines: 1600,
      functionCount: 50,
      type: "UI Component",
      isDataCatalog: false,
      status: "CRITICAL",
    },
    {
      path: "/repo/apps/web/src/components/Editor.svelte",
      relativePath: "apps/web/src/components/Editor.svelte",
      totalLines: 1200,
      codeLines: 1000,
      functionCount: 30,
      type: "UI Component",
      isDataCatalog: false,
      status: "CRITICAL",
    },
    {
      path: "/repo/apps/web/src/stores/small.ts",
      relativePath: "apps/web/src/stores/small.ts",
      totalLines: 300,
      codeLines: 200,
      functionCount: 5,
      type: "Store (State)",
      isDataCatalog: false,
      status: "STABLE",
    },
  ];

  describe("selectDegodifyCandidate", () => {
    it("skips data catalogs and picks worst eligible god file", () => {
      const selection = selectDegodifyCandidate(sampleFiles, []);
      expect(selection.candidate).not.toBeNull();
      expect(selection.candidate?.relativePath).toBe(
        "apps/web/src/components/Canvas.svelte",
      );
    });

    it("skips files that have active branch or PR conflicts", () => {
      const active = ["curator/degod-canvas-svelte-12345"];
      const selection = selectDegodifyCandidate(sampleFiles, active);
      expect(selection.candidate?.relativePath).toBe(
        "apps/web/src/components/Editor.svelte",
      );
      expect(selection.skipped.length).toBe(1);
      expect(selection.skipped[0].reason).toContain("canvas.svelte");
    });

    it("returns null candidate when all critical/watch files are active or skipped", () => {
      const active = ["canvas.svelte", "editor.svelte"];
      const selection = selectDegodifyCandidate(sampleFiles, active);
      expect(selection.candidate).toBeNull();
    });
  });

  describe("buildDecompositionPrompt", () => {
    it("generates instructions with target file, branch, and quality gates", () => {
      const prompt = buildDecompositionPrompt(
        sampleFiles[1],
        "curator/degod-canvas-123",
        "staging",
      );

      expect(prompt).toContain(
        "TARGET FILE: apps/web/src/components/Canvas.svelte",
      );
      expect(prompt).toContain("curator/degod-canvas-123");
      expect(prompt).toContain("Constitution Principle XIV");
      expect(prompt).toContain("bun test");
      expect(prompt).toContain("bun run lint:types");
      expect(prompt).toContain("bun run lint");
      expect(prompt).toContain("--no-verify");
      expect(prompt).toContain("gh pr create --base staging");
    });
  });
});
