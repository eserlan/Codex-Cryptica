import {
  classifyAILanguageQuality,
  parseLanguageGenerationResult,
  parseLanguageResponse,
  validateLanguageInputFidelity,
  validateLanguageNameBans,
  type PublicGeneratorOutput,
} from "generator-engine";
import type { LanguageProfileInput } from "schema";

export interface LanguageOutputAssessment {
  output?: PublicGeneratorOutput;
  blockingIssues: string[];
  advisoryIssues: string[];
  issues: string[];
}

/**
 * Parses and quality-checks a raw AI language-generator reply against the
 * options it was generated from. Structural failures (unparseable JSON,
 * schema violations) surface as a single blocking issue instead of throwing,
 * so callers can decide whether to repair or fall back without a try/catch.
 */
export function assessLanguageOutput(
  raw: string,
  expected: LanguageProfileInput,
  bannedNames: readonly string[],
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
    return {
      blockingIssues,
      advisoryIssues: [],
      issues: blockingIssues,
    };
  }
}
