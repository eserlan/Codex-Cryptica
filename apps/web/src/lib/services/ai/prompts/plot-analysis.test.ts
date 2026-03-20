import { describe, it, expect } from "vitest";
import { buildPlotAnalysisPrompt } from "./plot-analysis";

describe("buildPlotAnalysisPrompt", () => {
  it("should incorporate all context and query into the prompt", () => {
    const result = buildPlotAnalysisPrompt("SubjectCtx", "ConnCtx", "UserQ");
    expect(result).toContain("SubjectCtx");
    expect(result).toContain("ConnCtx");
    expect(result).toContain("UserQ");
    expect(result).toContain("Rivals & Enemies");
    expect(result).toContain("Political Risks");
  });
});
