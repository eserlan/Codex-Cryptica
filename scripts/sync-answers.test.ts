import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  parseAnswerExport,
  generateIndexSource,
  syncAnswers,
  type AnswerExportInfo,
} from "./sync-answers";

describe("sync-answers", () => {
  describe("parseAnswerExport", () => {
    it("extracts export name and slug from valid answer page content", () => {
      const content = `
import type { AnswerConfigInput } from "../schema";

export const howToPlayRpg: AnswerConfigInput = {
  slug: "how-to-play-rpg",
  category: "getting-started",
  question: "How do you play an RPG?",
};
`;
      const parsed = parseAnswerExport("how-to-play-rpg.ts", content);
      expect(parsed).toEqual({
        fileName: "how-to-play-rpg.ts",
        exportName: "howToPlayRpg",
        slug: "how-to-play-rpg",
      });
    });

    it("returns null if export statement is missing", () => {
      const content = `const secret = 42;`;
      expect(parseAnswerExport("invalid.ts", content)).toBeNull();
    });

    it("returns null if slug is missing", () => {
      const content = `export const noSlug = { question: "Why?" };`;
      expect(parseAnswerExport("no-slug.ts", content)).toBeNull();
    });
  });

  describe("generateIndexSource", () => {
    it("generates deterministic, sorted TypeScript index source", () => {
      const entries: AnswerExportInfo[] = [
        {
          fileName: "zeta-answer.ts",
          exportName: "zetaAnswer",
          slug: "zeta-answer",
        },
        {
          fileName: "alpha-answer.ts",
          exportName: "alphaAnswer",
          slug: "alpha-answer",
        },
      ];

      const source = generateIndexSource(entries);

      expect(source).toContain('import { alphaAnswer } from "./alpha-answer";');
      expect(source).toContain('import { zetaAnswer } from "./zeta-answer";');
      // Alpha must come before Zeta
      const alphaIdx = source.indexOf("alphaAnswer");
      const zetaIdx = source.indexOf("zetaAnswer");
      expect(alphaIdx).toBeLessThan(zetaIdx);
      expect(source).toContain(
        "export const answers: Record<string, AnswerConfig>",
      );
    });
  });

  describe("syncAnswers file synchronization", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-answers-test-"));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("creates index.ts when missing and detects idempotence on second run", () => {
      const sampleFile = path.join(tempDir, "first-answer.ts");
      fs.writeFileSync(
        sampleFile,
        `export const firstAnswer: AnswerConfigInput = { slug: "first-answer" };`,
        "utf-8",
      );

      const indexPath = path.join(tempDir, "index.ts");

      // First run: should create index.ts
      const res1 = syncAnswers(tempDir, indexPath);
      expect(res1.changed).toBe(true);
      expect(res1.count).toBe(1);
      expect(fs.existsSync(indexPath)).toBe(true);

      const indexContent = fs.readFileSync(indexPath, "utf-8");
      expect(indexContent).toContain("firstAnswer");

      // Second run: should detect no change
      const res2 = syncAnswers(tempDir, indexPath);
      expect(res2.changed).toBe(false);
      expect(res2.count).toBe(1);
    });
  });
});
