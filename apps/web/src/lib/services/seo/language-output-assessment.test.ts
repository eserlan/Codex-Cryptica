import { describe, it, expect } from "vitest";
import { generateLanguageLocal } from "generator-engine";
import { assessLanguageOutput } from "./language-output-assessment";

const expected = {
  genre: "Classic Fantasy",
  tone: "Lyrical & Vowel-rich",
  role: "Common Speech",
  structure: "Compound Words",
};

describe("assessLanguageOutput", () => {
  it("returns the parsed output with no issues for a valid, fidelity-matching reply", () => {
    const language = generateLanguageLocal(expected, () => 0.42);
    const raw = JSON.stringify({
      version: language.languageProfileVersion,
      title: language.title,
      summary: language.summary,
      labels: language.labels,
      profile: language.languageProfile,
    });

    const result = assessLanguageOutput(raw, expected, []);

    expect(result.output?.title).toBe(language.title);
    expect(result.blockingIssues).toEqual([]);
  });

  it("reports a blocking issue and no output for structurally invalid JSON", () => {
    const result = assessLanguageOutput("{}", expected, []);

    expect(result.output).toBeUndefined();
    expect(result.blockingIssues).toHaveLength(1);
    expect(result.blockingIssues[0]).toContain("Structural validation failed");
    expect(result.issues).toEqual(result.blockingIssues);
  });
});
