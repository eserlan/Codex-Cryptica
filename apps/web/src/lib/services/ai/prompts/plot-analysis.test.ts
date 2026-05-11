import { describe, it, expect } from "vitest";
import {
  buildPlotCanonResolutionPrompt,
  buildPlotGenerationPrompt,
} from "./plot-analysis";

describe("Plot Analysis Prompts", () => {
  describe("buildPlotCanonResolutionPrompt", () => {
    it("should incorporate all context and query into the resolution prompt", () => {
      const result = buildPlotCanonResolutionPrompt(
        "SubjectCtx",
        "ConnCtx",
        "UserQ",
      );
      expect(result).toContain("SubjectCtx");
      expect(result).toContain("ConnCtx");
      expect(result).toContain("UserQ");
      expect(result).toContain("Plot Canon Summary");
    });
  });

  describe("buildPlotGenerationPrompt", () => {
    it("should incorporate canon summary and user query into the generation prompt", () => {
      const result = buildPlotGenerationPrompt("CanonSummary", "UserQ");
      expect(result).toContain("CanonSummary");
      expect(result).toContain("UserQ");
      expect(result).toContain("## [Plot Title]");
      expect(result).toContain("Possible Outcomes:");
    });
  });
});
