import { describe, it, expect } from "vitest";
import {
  buildEnhancePrompt,
  buildVisualDistillationPrompt,
} from "./visual-distillation";

describe("visual-distillation prompts", () => {
  describe("buildEnhancePrompt", () => {
    it("should build prompt with context", () => {
      const result = buildEnhancePrompt("cat", "dark world");
      expect(result).toContain("cat");
      expect(result).toContain("dark world");
      expect(result).toContain("GLOBAL ART STYLE");
    });

    it("should return query if context is missing", () => {
      expect(buildEnhancePrompt("cat", "")).toBe("cat");
    });
  });

  describe("buildVisualDistillationPrompt", () => {
    it("should build distillation prompt", () => {
      const result = buildVisualDistillationPrompt("cat", "dark world");
      expect(result).toContain("cat");
      expect(result).toContain("dark world");
      expect(result).toContain("Extract the distilled visual prompt");
    });
  });
});
