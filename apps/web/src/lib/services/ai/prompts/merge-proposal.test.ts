import { describe, it, expect } from "vitest";
import { buildMergeProposalPrompt } from "./merge-proposal";

describe("buildMergeProposalPrompt", () => {
  it("should incorporate target and source context into the prompt", () => {
    const result = buildMergeProposalPrompt("TargetRecord", "SourceRecord");
    expect(result).toContain("TargetRecord");
    expect(result).toContain("SourceRecord");
    expect(result).toContain("master archivist");
  });
});
