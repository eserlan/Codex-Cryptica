import { describe, it, expect } from "vitest";
import {
  buildVisualCanonResolutionPrompt,
  buildVisualPromptGenerationPrompt,
} from "./visual-distillation";

describe("visual-distillation prompts", () => {
  describe("buildVisualCanonResolutionPrompt", () => {
    it("should build resolution prompt with context and query", () => {
      const result = buildVisualCanonResolutionPrompt("cat", "dark world");
      expect(result).toContain("cat");
      expect(result).toContain("dark world");
      expect(result).toContain("Visual Canon Interpreter");
    });
  });

  describe("buildVisualPromptGenerationPrompt", () => {
    it("should build generation prompt with canon summary and query", () => {
      const result = buildVisualPromptGenerationPrompt("CanonSummary", "cat");
      expect(result).toContain("cat");
      expect(result).toContain("CanonSummary");
      expect(result).toContain("Visual Prompt Architect");
    });
  });
});
