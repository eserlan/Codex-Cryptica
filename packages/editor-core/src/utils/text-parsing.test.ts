import { describe, it, expect } from "vitest";
import { extractProposals } from "./text-parsing";

describe("extractProposals", () => {
  it("should extract bold text as proposals", () => {
    const markdown = "This is **bold** and this is __also bold__.";
    const result = extractProposals(markdown);
    expect(result).toEqual(["bold", "also bold"]);
  });

  it("should ignore bold text inside markdown links", () => {
    const markdown =
      "This is [**linked bold**](http://test.com) and this is **[bold link](http://test.com)**.";
    const result = extractProposals(markdown);
    expect(result).toEqual([]);
  });

  it("should filter out existing entities", () => {
    const markdown = "We have **Existing** and **New** entities.";
    const existing = new Set(["Existing"]);
    const result = extractProposals(markdown, existing);
    expect(result).toEqual(["New"]);
  });

  it("should filter out existing entities case-insensitively", () => {
    const markdown = "We have **EXISTING** and **New** entities.";
    const existing = new Set(["existing"]);
    const result = extractProposals(markdown, existing);
    expect(result).toEqual(["New"]);
  });

  it("should return unique proposals", () => {
    const markdown = "Here is **duplicate** and again **duplicate**.";
    const result = extractProposals(markdown);
    expect(result).toEqual(["duplicate"]);
  });

  it("should handle empty markdown gracefully", () => {
    expect(extractProposals("")).toEqual([]);
    expect(extractProposals(undefined as any)).toEqual([]);
  });
});
