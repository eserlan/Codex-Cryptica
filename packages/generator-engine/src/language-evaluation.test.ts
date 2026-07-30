import { describe, expect, it } from "vitest";
import {
  LANGUAGE_EVALUATION_CASES,
  LANGUAGE_EVALUATION_CRITERIA,
  validateLanguageEvaluation,
  type LanguageEvaluationRecord,
} from "./language-evaluation";
import { languageConfig } from "./public-language";
import { generateLanguageLocal } from "./public-language";

function richRawResult(inputs: LanguageEvaluationRecord["inputs"]): string {
  const local = generateLanguageLocal(
    {
      genre: inputs.genre,
      tone: inputs.tone,
      role: inputs.role,
      structure: inputs.structure,
      context: inputs.worldContext,
    },
    () => 0.42,
  );
  const profile = structuredClone(local.languageProfile!);
  profile.culture = {
    speakers: "A culture named by the evaluation context",
    usage: "Used in the selected social role",
  };
  profile.phonology.rhythm = "A deliberate rhythm shaped by the selected tone";
  profile.morphology = {
    wordFormation: "Words demonstrate the selected structure.",
  };
  profile.naming.personalNamePatterns = ["Root + role marker"];
  profile.naming.examples.push({
    name: `Ala ${profile.naming.examples[0].name}`,
    meaning: "keeper",
    use: "title",
  });
  return JSON.stringify({
    version: 1,
    title: local.title,
    summary: local.summary,
    labels: local.labels,
    profile,
  });
}

function record(
  caseId: string,
  sample: number,
  score = 2,
): LanguageEvaluationRecord {
  const testCase = LANGUAGE_EVALUATION_CASES.find(
    (candidate) => candidate.id === caseId,
  )!;
  return {
    caseId,
    sample,
    modelId: "test-model",
    promptVersion: "language-profile-v1",
    schemaVersion: 1,
    evaluatedAt: "2026-07-29",
    evaluator: "human:test",
    inputs: testCase.inputs,
    rawResult: richRawResult(testCase.inputs),
    scores: Object.fromEntries(
      LANGUAGE_EVALUATION_CRITERIA.map((criterion) => [criterion, score]),
    ) as LanguageEvaluationRecord["scores"],
  };
}

describe("language AI evaluation harness", () => {
  it("covers every tone and structure plus custom contextual inputs", () => {
    const tones = new Set(
      LANGUAGE_EVALUATION_CASES.map((testCase) => testCase.inputs.tone),
    );
    const structures = new Set(
      LANGUAGE_EVALUATION_CASES.map((testCase) => testCase.inputs.structure),
    );

    for (const tone of languageConfig.tones) expect(tones.has(tone)).toBe(true);
    for (const structure of languageConfig.structures) {
      expect(structures.has(structure)).toBe(true);
    }
    expect(
      LANGUAGE_EVALUATION_CASES.some(
        (testCase) => testCase.inputs.worldContext,
      ),
    ).toBe(true);
    expect(
      LANGUAGE_EVALUATION_CASES.some((testCase) =>
        testCase.id.includes("custom"),
      ),
    ).toBe(true);
  });

  it("accepts exactly three passing scored samples per case", () => {
    const records = LANGUAGE_EVALUATION_CASES.flatMap((testCase) =>
      [1, 2, 3].map((sample) => record(testCase.id, sample)),
    );

    expect(validateLanguageEvaluation(records)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("rejects missing samples, zero criteria, invalid structure, and low means", () => {
    const records = LANGUAGE_EVALUATION_CASES.flatMap((testCase) =>
      [1, 2, 3].map((sample) => record(testCase.id, sample)),
    );
    records.pop();
    records[0].scores.controlFidelity = 0;
    records[1].rawResult = "{}";
    for (const criterion of LANGUAGE_EVALUATION_CRITERIA) {
      records[2].scores[criterion] = 1;
    }

    const result = validateLanguageEvaluation(records);

    expect(result.valid).toBe(false);
    for (const fragment of [
      "exactly 3",
      "zero score",
      "structural and AI-quality validation",
      "mean score",
    ]) {
      expect(result.issues.some((issue) => issue.includes(fragment))).toBe(
        true,
      );
    }
  });
});
