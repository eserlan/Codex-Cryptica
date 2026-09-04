import { describe, it, expect } from "vitest";
import {
  isTestFile,
  classifyArchitecture,
  isDataCatalogModule,
  analyzeContent,
  formatMarkdownSummary,
  runGodFileAnalysis,
  type AnalysisReport,
} from "./god-file-analysis.ts";

describe("god-file-analysis", () => {
  describe("isTestFile", () => {
    it("identifies test and spec extensions correctly", () => {
      expect(isTestFile("apps/web/src/lib/foo.test.ts")).toBe(true);
      expect(isTestFile("apps/web/src/lib/foo.test.js")).toBe(true);
      expect(isTestFile("apps/web/src/lib/foo.test.mjs")).toBe(true);
      expect(isTestFile("apps/web/src/lib/foo.spec.ts")).toBe(true);
      expect(isTestFile("apps/web/src/lib/foo.spec.js")).toBe(true);
    });

    it("identifies test directories correctly", () => {
      expect(isTestFile("apps/web/tests/e2e/login.ts")).toBe(true);
      expect(isTestFile("packages/schema/__tests__/helpers.ts")).toBe(true);
      expect(isTestFile("apps/web/src/test-utils/mock-vault.ts")).toBe(true);
    });

    it("returns false for regular application source files", () => {
      expect(isTestFile("apps/web/src/lib/components/Canvas.svelte")).toBe(
        false,
      );
      expect(isTestFile("apps/web/src/lib/stores/vault.svelte.ts")).toBe(false);
      expect(isTestFile("packages/map-engine/src/renderer.ts")).toBe(false);
    });
  });

  describe("classifyArchitecture", () => {
    it("classifies Svelte components as UI Component", () => {
      expect(
        classifyArchitecture("apps/web/src/lib/components/Modal.svelte", false),
      ).toBe("UI Component");
    });

    it("classifies store modules as Store (State)", () => {
      expect(
        classifyArchitecture("apps/web/src/lib/stores/vault.svelte.ts", false),
      ).toBe("Store (State)");
      expect(
        classifyArchitecture("apps/web/src/lib/entity-store.ts", false),
      ).toBe("Store (State)");
    });

    it("classifies services as Service", () => {
      expect(
        classifyArchitecture("apps/web/src/lib/services/ai.ts", false),
      ).toBe("Service");
      expect(
        classifyArchitecture("apps/web/src/lib/text-service.svelte.ts", false),
      ).toBe("Service");
    });

    it("classifies controllers as Controller", () => {
      expect(
        classifyArchitecture("apps/web/src/lib/controllers/graph.ts", false),
      ).toBe("Controller");
      expect(
        classifyArchitecture(
          "apps/web/src/lib/map-controller.svelte.ts",
          false,
        ),
      ).toBe("Controller");
    });

    it("classifies workers as Worker Router", () => {
      expect(
        classifyArchitecture("apps/workers/oracle-proxy/src/index.ts", false),
      ).toBe("Worker Router");
      expect(
        classifyArchitecture(
          "apps/web/src/lib/workers/oracle.worker.ts",
          false,
        ),
      ).toBe("Worker Router");
    });

    it("classifies engine packages as Engine Core", () => {
      expect(
        classifyArchitecture("packages/map-engine/src/renderer.ts", false),
      ).toBe("Engine Core");
      expect(
        classifyArchitecture(
          "packages/chronology-engine/src/timeline.ts",
          false,
        ),
      ).toBe("Engine Core");
    });

    it("classifies data catalogues", () => {
      expect(
        classifyArchitecture("packages/schema/src/silhouettes.ts", true),
      ).toBe("Data Catalog");
    });

    it("defaults to Utility / Module for general code", () => {
      expect(
        classifyArchitecture("apps/web/src/lib/utils/format.ts", false),
      ).toBe("Utility / Module");
    });
  });

  describe("isDataCatalogModule", () => {
    it("matches known data catalogue paths", () => {
      expect(
        isDataCatalogModule("packages/generator-engine/src/public-npc.ts", ""),
      ).toBe(true);
      expect(
        isDataCatalogModule("packages/schema/src/silhouettes.ts", ""),
      ).toBe(true);
      expect(
        isDataCatalogModule("packages/schema/src/theme-templates.ts", ""),
      ).toBe(true);
      expect(
        isDataCatalogModule("apps/web/src/lib/config/seo-pages.ts", ""),
      ).toBe(true);
    });

    it("never classifies Svelte components as data catalogues", () => {
      const mockSvelte = `<script>export const data = [];</script><div>Hello</div>`;
      expect(
        isDataCatalogModule(
          "apps/web/src/lib/components/BigView.svelte",
          mockSvelte,
        ),
      ).toBe(false);
    });

    it("identifies large files with minimal functions and constant exports as data", () => {
      const longConstantFile =
        "export const BIG_TABLE = [\n" + "  { id: 1 },\n".repeat(600) + "];\n";
      expect(
        isDataCatalogModule(
          "packages/schema/src/big-list.ts",
          longConstantFile,
        ),
      ).toBe(true);
    });

    it("rejects large files with substantial logic and functions", () => {
      const logicFile =
        "export function calculate() {}\n" +
        "export function parse() {}\n" +
        "export function update() {}\n" +
        "export function sync() {}\n" +
        "// some lines\n".repeat(600);
      expect(
        isDataCatalogModule("apps/web/src/lib/services/complex.ts", logicFile),
      ).toBe(false);
    });
  });

  describe("analyzeContent", () => {
    it("counts total lines and code lines, ignoring comments and blanks", () => {
      const content = `
// Single line comment
const a = 1;

/*
 Multi line
 comment
*/
function test() {
  return a;
}
<!-- HTML Comment -->
`;
      const result = analyzeContent(content);
      expect(result.totalLines).toBe(13);
      expect(result.codeLines).toBe(4); // const a = 1; function test() { return a; }
      expect(result.functionCount).toBe(1);
    });
  });

  describe("formatMarkdownSummary", () => {
    it("produces properly formatted markdown summary with tables and headers", () => {
      const mockReport: AnalysisReport = {
        timestamp: "2026-09-04T00:00:00.000Z",
        threshold: 500,
        criticalThreshold: 800,
        totalFilesScanned: 10,
        sourceFilesEvaluated: 8,
        dataCatalogsExcluded: 2,
        watchCount: 1,
        criticalCount: 1,
        topFiles: [
          {
            path: "/path/to/big.svelte",
            relativePath: "apps/web/src/components/Big.svelte",
            totalLines: 1200,
            codeLines: 1000,
            functionCount: 30,
            type: "UI Component",
            isDataCatalog: false,
            status: "CRITICAL",
          },
          {
            path: "/path/to/medium.ts",
            relativePath: "apps/web/src/stores/medium.ts",
            totalLines: 600,
            codeLines: 500,
            functionCount: 15,
            type: "Store (State)",
            isDataCatalog: false,
            status: "WATCH",
          },
        ],
        breakdownByType: {
          "UI Component": { count: 1, totalLines: 1200, overThreshold: 1 },
          "Store (State)": { count: 1, totalLines: 600, overThreshold: 1 },
          Service: { count: 0, totalLines: 0, overThreshold: 0 },
          Controller: { count: 0, totalLines: 0, overThreshold: 0 },
          "Worker Router": { count: 0, totalLines: 0, overThreshold: 0 },
          "Engine Core": { count: 0, totalLines: 0, overThreshold: 0 },
          "Utility / Module": { count: 0, totalLines: 0, overThreshold: 0 },
          "Data Catalog": { count: 0, totalLines: 0, overThreshold: 0 },
        },
      };

      const markdown = formatMarkdownSummary(mockReport);
      expect(markdown).toContain("# 🏛️ God File Analysis Report");
      expect(markdown).toContain(
        "Constitution Principle XIV (Bounded Responsibility)",
      );
      expect(markdown).toContain("🔴 CRITICAL");
      expect(markdown).toContain("🟡 WATCH");
      expect(markdown).toContain("apps/web/src/components/Big.svelte");
      expect(markdown).toContain("apps/web/src/stores/medium.ts");
    });
  });

  describe("runGodFileAnalysis", () => {
    it("executes across target directories and ranks files", async () => {
      // Run with custom high threshold and low topCount against actual codebase
      const report = await runGodFileAnalysis({
        threshold: 700,
        criticalThreshold: 1000,
        topCount: 5,
      });

      expect(report.sourceFilesEvaluated).toBeGreaterThan(500);
      expect(report.dataCatalogsExcluded).toBeGreaterThan(10);
      expect(report.topFiles.length).toBeLessThanOrEqual(5);
      // Top files must be sorted descending by totalLines
      for (let i = 0; i < report.topFiles.length - 1; i++) {
        expect(report.topFiles[i].totalLines).toBeGreaterThanOrEqual(
          report.topFiles[i + 1].totalLines,
        );
      }
    });
  });
});
