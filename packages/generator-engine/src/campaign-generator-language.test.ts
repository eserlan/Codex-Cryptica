import { describe, it, expect } from "vitest";
import {
  LanguageGenerationError,
  assertValidLanguageFallback,
  languageGeneratorOutput,
  languageOptions,
  languageResultFromOutput,
} from "./campaign-generator-language";
import type { GeneratorRunRequest } from "./campaign-generator-types";
import { generateLanguageLocal } from "./public-language";

function publicOutput() {
  return generateLanguageLocal(
    {
      genre: "Classic Fantasy",
      tone: "Lyrical & Vowel-rich",
      role: "Common Speech",
      structure: "Compound Words",
    },
    () => 0.42,
  );
}

describe("languageOptions", () => {
  it("reads recognised option keys and falls back to defaults for the rest", () => {
    const request: GeneratorRunRequest = {
      generatorId: "language",
      options: { genre: "Cyberpunk", tone: "  " },
      useAI: false,
      themeId: "workspace",
    };
    expect(languageOptions(request)).toEqual({
      genre: "Cyberpunk",
      tone: "Lyrical & Vowel-rich",
      role: "Common Speech",
      structure: "Compound Words",
    });
  });
});

describe("languageResultFromOutput / languageGeneratorOutput", () => {
  it("carries the language profile fields through both projections", () => {
    const output = publicOutput();
    const result = languageResultFromOutput(output);
    expect(result.title).toBe(output.title);

    const generatorOutput = languageGeneratorOutput(output);
    expect(generatorOutput.title).toBe(output.title);
    expect(generatorOutput.languageProfileVersion).toBe(1);
    expect(generatorOutput.languageProfile).toBe(output.languageProfile);
  });
});

describe("assertValidLanguageFallback", () => {
  it("returns a parsed result for a complete, valid profile", () => {
    const output = publicOutput();
    const result = assertValidLanguageFallback({
      title: output.title,
      summary: output.summary ?? "",
      lore: output.lore,
      labels: output.labels,
      languageProfile: output.languageProfile,
      languageProfileVersion: output.languageProfileVersion,
    });
    expect(result.title).toBe(output.title);
  });

  it("throws LanguageGenerationError for an incomplete profile", () => {
    expect(() =>
      assertValidLanguageFallback({
        title: "Broken",
        summary: "Incomplete",
        lore: "",
        labels: ["language"],
      }),
    ).toThrow(LanguageGenerationError);
  });
});
