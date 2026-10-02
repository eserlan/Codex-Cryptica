import { describe, expect, it, vi } from "vitest";
import { generateLanguageLocal } from "generator-engine";
import { runLanguageGenerationWithRepair } from "./language-generation-repair";

const options = {
  genre: "Classic Fantasy",
  tone: "Lyrical & Vowel-rich",
  role: "Common Speech",
  structure: "Compound Words",
};

function validLanguageResponse() {
  const output = generateLanguageLocal(options, () => 0.42);
  return JSON.stringify({
    version: output.languageProfileVersion,
    title: output.title,
    summary: output.summary,
    labels: output.labels,
    profile: output.languageProfile,
  });
}

function runModelMock(...responses: string[]) {
  const runModel = vi.fn();
  for (const response of responses) runModel.mockResolvedValueOnce(response);
  return runModel;
}

describe("runLanguageGenerationWithRepair", () => {
  it("returns a repaired valid response", async () => {
    const runModel = runModelMock("{}", validLanguageResponse());

    const result = await runLanguageGenerationWithRepair({
      systemInstruction: "system",
      userMessage: "make a language",
      expected: options,
      bannedNames: [],
      runModel,
    });

    expect(result.title).toBeDefined();
    expect(runModel).toHaveBeenCalledTimes(2);
    expect(runModel.mock.calls[1][1]).toContain(
      "Repair the following language-generator response",
    );
  });

  it("uses the last parseable candidate when a repair remains advisory", async () => {
    const runModel = runModelMock(validLanguageResponse(), "{}");

    const result = await runLanguageGenerationWithRepair({
      systemInstruction: "system",
      userMessage: "make a language",
      expected: options,
      bannedNames: [],
      runModel,
    });

    expect(result.title).toBeDefined();
    expect(runModel).toHaveBeenCalledTimes(2);
  });

  it("rejects output that remains structurally invalid after repairs", async () => {
    const runModel = runModelMock("{}", "{}", "{}");

    await expect(
      runLanguageGenerationWithRepair({
        systemInstruction: "system",
        userMessage: "make a language",
        expected: options,
        bannedNames: [],
        runModel,
      }),
    ).rejects.toThrow("AI language output failed validation");
    expect(runModel).toHaveBeenCalledTimes(3);
  });
});
