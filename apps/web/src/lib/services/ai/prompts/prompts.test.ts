import { describe, it, expect } from "vitest";
import { buildPlotAnalysisPrompt } from "./plot-analysis";
import { buildMergeProposalPrompt } from "./merge-proposal";
import { buildSystemInstruction } from "./system-instructions";
import { buildEnhancePrompt, buildVisualDistillationPrompt } from "./visual-distillation";

describe("AI Prompts", () => {
  describe("plot-analysis", () => {
    it("should build plot analysis prompt", () => {
      const result = buildPlotAnalysisPrompt("Subject", "Connections", "Query");
      expect(result).toContain("Subject");
      expect(result).toContain("Connections");
      expect(result).toContain("Query");
      expect(result).toContain("Rivals & Enemies");
    });
  });

  describe("merge-proposal", () => {
    it("should build merge proposal prompt", () => {
      const result = buildMergeProposalPrompt("Dest", "Source");
      expect(result).toContain("Dest");
      expect(result).toContain("Source");
      expect(result).toContain("master archivist");
    });
  });

  describe("system-instructions", () => {
    it("should build standard instructions", () => {
      const result = buildSystemInstruction(false);
      expect(result).toContain("Lore Oracle");
      expect(result).not.toContain("DEMO_MODE_ACTIVE");
    });

    it("should build demo instructions", () => {
      const result = buildSystemInstruction(true);
      expect(result).toContain("Lore Oracle");
      expect(result).toContain("DEMO_MODE_ACTIVE");
      expect(result).toContain("transient");
    });
  });

  describe("visual-distillation", () => {
    it("should build enhance prompt", () => {
      const result = buildEnhancePrompt("Draw a cat", "A dark world");
      expect(result).toContain("Draw a cat");
      expect(result).toContain("A dark world");
      expect(result).toContain("GLOBAL ART STYLE");
    });

    it("should return query early if context is missing in enhance", () => {
      const result = buildEnhancePrompt("Draw a cat", "");
      expect(result).toBe("Draw a cat");
    });

    it("should build visual distillation prompt", () => {
      const result = buildVisualDistillationPrompt("Draw a cat", "A dark world");
      expect(result).toContain("Draw a cat");
      expect(result).toContain("A dark world");
      expect(result).toContain("Extract the distilled visual prompt");
    });
  });
});
