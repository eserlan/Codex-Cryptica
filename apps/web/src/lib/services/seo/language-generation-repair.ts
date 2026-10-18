import {
  buildLanguageRepairPrompt,
  type PublicGeneratorOutput,
} from "generator-engine";
import { LANGUAGE_GENERATION_CONFIG } from "./generator-ai-transport";
import { assessLanguageOutput } from "./language-output-assessment";

type LanguageAssessment = ReturnType<typeof assessLanguageOutput>;
type LanguageProfileInput = Parameters<typeof assessLanguageOutput>[1];

interface LanguageGenerationRepairOptions {
  systemInstruction: string;
  userMessage: string;
  expected: LanguageProfileInput;
  bannedNames: readonly string[];
  runModel: (
    systemInstruction: string,
    userMessage: string,
    generationConfig: typeof LANGUAGE_GENERATION_CONFIG,
  ) => Promise<string>;
}

/** Runs the bounded validate-and-repair loop for AI generated languages. */
export async function runLanguageGenerationWithRepair({
  systemInstruction,
  userMessage,
  expected,
  bannedNames,
  runModel,
}: LanguageGenerationRepairOptions): Promise<PublicGeneratorOutput> {
  const assess = (raw: string): LanguageAssessment =>
    assessLanguageOutput(raw, expected, bannedNames);

  const initialRaw = await runModel(
    systemInstruction,
    userMessage,
    LANGUAGE_GENERATION_CONFIG,
  );
  const initial = assess(initialRaw);
  if (initial.output && initial.issues.length === 0) return initial.output;

  let candidateRaw = initialRaw;
  let candidate = initial;
  let lastAcceptableOutput =
    initial.output && initial.blockingIssues.length === 0
      ? initial.output
      : undefined;
  const repairBudget = initial.blockingIssues.length ? 2 : 1;
  for (
    let repairAttempt = 0;
    repairAttempt < repairBudget;
    repairAttempt += 1
  ) {
    try {
      const repairRaw = await runModel(
        systemInstruction,
        buildLanguageRepairPrompt(candidateRaw, candidate.issues, userMessage),
        LANGUAGE_GENERATION_CONFIG,
      );
      candidateRaw = repairRaw;
      candidate = assess(repairRaw);
      if (candidate.output && candidate.issues.length === 0) {
        return candidate.output;
      }
      if (candidate.output && candidate.blockingIssues.length === 0) {
        lastAcceptableOutput = candidate.output;
        break;
      }
    } catch {
      // Preserve the last parseable candidate for the remaining repair.
    }
  }
  if (lastAcceptableOutput) return lastAcceptableOutput;
  throw new Error(
    `AI language output failed validation: ${candidate.issues.join(" ")}`,
  );
}
