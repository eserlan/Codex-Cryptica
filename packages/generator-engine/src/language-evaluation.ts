import type { LanguageProfileInput } from "schema";
import {
  parseLanguageGenerationResult,
  validateAILanguageQuality,
  validateLanguageInputFidelity,
  validateLanguageNameBans,
} from "./language-profile";
import { LANGUAGE_PROMPT_VERSION } from "./public-language";

export const LANGUAGE_EVALUATION_CRITERIA = [
  "controlFidelity",
  "consistency",
  "grounding",
  "completeness",
  "presentationFidelity",
  "reusability",
  "nameSafety",
] as const;

export type LanguageEvaluationCriterion =
  (typeof LANGUAGE_EVALUATION_CRITERIA)[number];

export interface LanguageEvaluationCase {
  id: string;
  description: string;
  inputs: LanguageProfileInput;
  bannedNames: string[];
}

export const LANGUAGE_EVALUATION_CASES: readonly LanguageEvaluationCase[] = [
  {
    id: "harsh-compound-ritual",
    description: "Harsh ritual language grounded in a mountain cult.",
    inputs: {
      genre: "Classic Fantasy",
      tone: "Harsh & Consonant-heavy",
      role: "Sacred / Ritual Tongue",
      structure: "Compound Words",
      worldContext:
        "Volcanic monasteries use oath-names tied to peaks and forge saints.",
    },
    bannedNames: ["Vane", "Thran"],
  },
  {
    id: "lyrical-suffix-common",
    description: "Lyrical suffixing trade language for river cities.",
    inputs: {
      genre: "Classic Fantasy",
      tone: "Lyrical & Vowel-rich",
      role: "Common Speech",
      structure: "Suffix-heavy",
      worldContext:
        "River merchants, ferrymen, and flood temples share the language.",
    },
    bannedNames: ["Eldrin", "Kael"],
  },
  {
    id: "ancient-prefix-imperial",
    description: "Ancient imperial standard with office-bearing prefixes.",
    inputs: {
      genre: "Vampire / Gothic Noir",
      tone: "Ancient & Formal",
      role: "Imperial Standard",
      structure: "Prefix-heavy",
      worldContext:
        "An aristocratic court records bloodlines, offices, and church law.",
    },
    bannedNames: ["Draven", "Raven"],
  },
  {
    id: "technical-short-cant",
    description: "Clipped technical cant for a corporate network.",
    inputs: {
      genre: "Cyberpunk / Corporate",
      tone: "Clipped & Technical",
      role: "Thieves' Cant",
      structure: "Short & Monosyllabic",
      worldContext:
        "Courier cells hide route, credential, and surveillance terms in work slang.",
    },
    bannedNames: ["Nova", "Cipher"],
  },
  {
    id: "shadow-compound-dead",
    description: "Whispered dead language for derelict star shrines.",
    inputs: {
      genre: "Sci-Fi / Space Opera",
      tone: "Shadowy & Whispered",
      role: "Dead Language",
      structure: "Compound Words",
      worldContext:
        "Archaeologists recover it from vacuum monasteries and navigation relics.",
    },
    bannedNames: ["Nyx", "Void"],
  },
  {
    id: "custom-values",
    description: "Custom controls remain literal and materially visible.",
    inputs: {
      genre: "Solarpunk Oceanic Mystery",
      tone: "Percussive and breathy",
      role: "Tide-court diplomatic register",
      structure: "Paired roots with rank particles",
      worldContext:
        "Floating orchards negotiate water rights with migratory machine reefs.",
    },
    bannedNames: ["Maris", "Coral"],
  },
] as const;

export interface LanguageEvaluationRecord {
  caseId: string;
  sample: number;
  modelId: string;
  promptVersion: string;
  schemaVersion: 1;
  evaluatedAt: string;
  evaluator: string;
  inputs: LanguageProfileInput;
  rawResult: string;
  scores: Record<LanguageEvaluationCriterion, 0 | 1 | 2>;
  failureNotes?: string;
}

export interface LanguageEvaluationValidation {
  valid: boolean;
  issues: string[];
}

export function validateLanguageEvaluation(
  records: LanguageEvaluationRecord[],
): LanguageEvaluationValidation {
  const issues: string[] = [];
  for (const testCase of LANGUAGE_EVALUATION_CASES) {
    const samples = records.filter((record) => record.caseId === testCase.id);
    if (
      samples.length !== 3 ||
      new Set(samples.map((record) => record.sample)).size !== 3
    ) {
      issues.push(`${testCase.id} must contain exactly 3 distinct samples.`);
    }
  }

  for (const record of records) {
    const testCase = LANGUAGE_EVALUATION_CASES.find(
      (candidate) => candidate.id === record.caseId,
    );
    if (!testCase) {
      issues.push(`${record.caseId} is not a defined evaluation case.`);
      continue;
    }
    if (
      !record.modelId.trim() ||
      !record.promptVersion.trim() ||
      !record.evaluatedAt.trim() ||
      !record.evaluator.trim()
    ) {
      issues.push(
        `${record.caseId} sample ${record.sample} is missing metadata.`,
      );
    }
    if (
      record.promptVersion !== LANGUAGE_PROMPT_VERSION ||
      record.schemaVersion !== 1
    ) {
      issues.push(
        `${record.caseId} sample ${record.sample} uses unsupported prompt or schema metadata.`,
      );
    }
    if (JSON.stringify(record.inputs) !== JSON.stringify(testCase.inputs)) {
      issues.push(
        `${record.caseId} sample ${record.sample} does not record the exact case inputs.`,
      );
    }

    try {
      const result = parseLanguageGenerationResult(
        JSON.parse(record.rawResult),
      );
      const validationIssues = [
        ...validateAILanguageQuality(result).issues,
        ...validateLanguageInputFidelity(result, testCase.inputs).issues,
        ...validateLanguageNameBans(result, testCase.bannedNames).issues,
      ];
      if (validationIssues.length) {
        issues.push(
          `${record.caseId} sample ${record.sample} failed structural and AI-quality validation: ${validationIssues.join(" ")}`,
        );
      }
    } catch (error) {
      issues.push(
        `${record.caseId} sample ${record.sample} failed structural and AI-quality validation: ${error instanceof Error ? error.message : "invalid result"}`,
      );
    }

    const scores = LANGUAGE_EVALUATION_CRITERIA.map(
      (criterion) => record.scores[criterion],
    );
    if (
      scores.some((score) => !Number.isInteger(score) || score < 0 || score > 2)
    ) {
      issues.push(
        `${record.caseId} sample ${record.sample} has invalid scores.`,
      );
      continue;
    }
    if (scores.some((score) => score === 0)) {
      issues.push(`${record.caseId} sample ${record.sample} has a zero score.`);
    }
    const mean =
      scores.reduce<number>((total, score) => total + score, 0) / scores.length;
    if (mean < 1.5) {
      issues.push(
        `${record.caseId} sample ${record.sample} has mean score ${mean.toFixed(2)}; minimum is 1.50.`,
      );
    }
  }

  return { valid: issues.length === 0, issues };
}
