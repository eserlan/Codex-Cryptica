import type { LanguageProfileInput } from "schema";
import {
  classifyAILanguageQuality,
  parseLanguageGenerationResult,
  validateLanguageInputFidelity,
  validateLanguageNameBans,
} from "./language-profile";
import { parseLanguageResponse } from "./public-language";
import type { PublicGeneratorOutput } from "./public-generator-adapters";

export interface LanguageOutputAssessment {
  output?: PublicGeneratorOutput;
  blockingIssues: string[];
  advisoryIssues: string[];
  issues: string[];
}

/** Parses and quality-checks an AI language reply against its requested options. */
export function assessLanguageOutput(
  raw: string,
  expected: LanguageProfileInput,
  bannedNames: Iterable<string>,
): LanguageOutputAssessment {
  try {
    const output = parseLanguageResponse(raw);
    const result = parseLanguageGenerationResult({
      version: output.languageProfileVersion,
      title: output.title,
      summary: output.summary,
      labels: output.labels,
      profile: output.languageProfile,
    });
    const quality = classifyAILanguageQuality(result);
    const blockingIssues = [
      ...quality.blockingIssues,
      ...validateLanguageInputFidelity(result, expected).issues,
      ...validateLanguageNameBans(result, bannedNames).issues,
    ];
    const advisoryIssues = quality.advisoryIssues;
    return {
      output,
      blockingIssues,
      advisoryIssues,
      issues: [...blockingIssues, ...advisoryIssues],
    };
  } catch (error) {
    const blockingIssues = [
      error instanceof Error
        ? `Structural validation failed: ${error.message}`
        : "Structural validation failed.",
    ];
    return { blockingIssues, advisoryIssues: [], issues: blockingIssues };
  }
}
