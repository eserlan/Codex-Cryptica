import {
  parseLanguageGenerationResult,
  validateFallbackLanguageQuality,
  validateLanguageNameBans,
} from "./language-profile";
import type { LanguageGeneratorOptions } from "./public-language";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import type { GeneratorOutput, GeneratorRunRequest } from "./campaign-generator-types";
import type { LanguageGenerationResultV1 } from "schema";

export const LANGUAGE_GENERATION_CONFIG = {
  temperature: 0.35,
  topP: 0.8,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
} as const;

/** User-readable error raised when neither AI nor local language output is safe. */
export class LanguageGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LanguageGenerationError";
  }
}

export function languageResultFromOutput(
  output: PublicGeneratorOutput,
): LanguageGenerationResultV1 {
  return parseLanguageGenerationResult({
    version: output.languageProfileVersion,
    title: output.title,
    summary: output.summary,
    labels: output.labels,
    profile: output.languageProfile,
  });
}

export function languageGeneratorOutput(
  output: PublicGeneratorOutput,
): GeneratorOutput {
  return {
    title: output.title,
    summary: output.summary ?? "",
    content: output.content,
    lore: output.lore,
    labels: output.labels,
    languageProfile: output.languageProfile,
    languageProfileVersion: output.languageProfileVersion,
  };
}

export function languageOptions(
  request: GeneratorRunRequest,
): LanguageGeneratorOptions {
  const option = (key: string, fallback: string): string => {
    const value = request.options[key];
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    return trimmed ? trimmed : fallback;
  };
  return {
    genre: option("genre", "Classic Fantasy"),
    tone: option("tone", "Lyrical & Vowel-rich"),
    role: option("role", "Common Speech"),
    structure: option("structure", "Compound Words"),
  };
}

export function assertValidLanguageFallback(
  output: GeneratorOutput,
  bannedNames: Iterable<string> = [],
): LanguageGenerationResultV1 {
  try {
    const result = parseLanguageGenerationResult({
      version: output.languageProfileVersion,
      title: output.title,
      summary: output.summary,
      labels: output.labels,
      profile: output.languageProfile,
    });
    const issues = [
      ...validateFallbackLanguageQuality(result).issues,
      ...validateLanguageNameBans(result, bannedNames).issues,
    ];
    if (issues.length) {
      throw new LanguageGenerationError(
        `The local language generator could not produce a safe, complete profile: ${issues.join(" ")}`,
      );
    }
    return result;
  } catch (error) {
    if (error instanceof LanguageGenerationError) throw error;
    throw new LanguageGenerationError(
      "The local language generator could not produce a valid profile. Please try again.",
    );
  }
}
