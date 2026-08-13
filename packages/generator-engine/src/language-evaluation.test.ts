import { describe, expect, it } from "vitest";
import {
  LANGUAGE_EVALUATION_CASES,
  LANGUAGE_EVALUATION_CRITERIA,
  LANGUAGE_IDENTITY_ROLE_CASE_IDS,
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
  const roleSuffix = `qa${inputs.role.toLowerCase().replace(/[^a-z]/g, "")}`;
  profile.culture = {
    speakers: "A culture named by the evaluation context",
    usage: "Used in the selected social role",
  };
  profile.lexicon = profile.lexicon.map((entry, index) => ({
    ...entry,
    id: `word-${index}`,
    partOfSpeech: index === 0 ? "noun" : "verb",
    syllables: [entry.word],
    demonstrates: index === 0 ? ["sound-shape"] : undefined,
  }));
  profile.phonology = {
    consonants: [...profile.lexicon.map((entry) => entry.word), roleSuffix],
    vowels: ["a"],
    phonotactics: ["Each evaluation source is one declared surface unit."],
    syllablePatterns: ["C"],
    rhythm: "A deliberate rhythm shaped by the selected tone",
  };
  profile.rules = [
    {
      id: "sound-shape",
      domain: "phonology",
      description: "Sources use one declared surface unit.",
    },
    {
      id: "role-suffix",
      domain: "morphology",
      description: "The role suffix follows a lexical root.",
    },
    {
      id: "name-pattern",
      domain: "naming",
      description: "Names combine a root and role suffix.",
    },
    {
      id: "root-order",
      domain: "grammar",
      description: "Subjects precede actions in declarative clauses.",
    },
    {
      id: "role-use",
      domain: "register",
      description: "The first phrase demonstrates the selected role.",
    },
  ];
  profile.morphology = {
    wordFormation: "Words demonstrate the selected structure.",
    suffixes: [
      {
        sourceId: "keeper-suffix",
        form: roleSuffix,
        meaning: "keeper",
      },
    ],
    morphemes: [
      {
        id: "keeper-suffix",
        form: roleSuffix,
        pronunciation: "kah",
        meaning: "keeper",
        kind: "suffix",
        syllables: [roleSuffix],
      },
    ],
  };
  profile.naming.personalNamePatterns = ["Root + role marker"];
  profile.naming.structuredPatterns = [
    {
      id: "person-root-role",
      use: "person",
      structure: profile.inputs.structure,
      slots: ["root", "role"],
    },
  ];
  profile.naming.examples = profile.lexicon.slice(0, 4).map((entry) => ({
    name: `${entry.word}${roleSuffix}`,
    pronunciation: `${entry.pronunciation} kah`,
    meaning: `${entry.meaning} keeper`,
    use: "person",
    patternId: "person-root-role",
    components: [
      {
        slot: "root",
        surface: entry.word,
        pronunciation: entry.pronunciation,
        meaning: entry.meaning,
        sourceId: entry.id!,
        syllables: entry.syllables,
      },
      {
        slot: "role",
        surface: roleSuffix,
        pronunciation: "kah",
        meaning: "keeper",
        sourceId: "keeper-suffix",
        syllables: [roleSuffix],
      },
    ],
    demonstrates: ["role-suffix", "name-pattern"],
  }));
  profile.grammar.examples = [0, 1, 2].map((index) => {
    const first = profile.lexicon[index];
    const second = profile.lexicon[index + 1];
    const translation = `${first.meaning} ${second.meaning}`;
    return {
      text: `${first.word} ${second.word}`,
      pronunciation: `${first.pronunciation} ${second.pronunciation}`,
      translation,
      literalTranslation: translation,
      construction: "declarative" as const,
      components: [first, second].map((entry, componentIndex) => ({
        slot: componentIndex === 0 ? "subject" : "action",
        surface: entry.word,
        pronunciation: entry.pronunciation,
        meaning: entry.meaning,
        sourceId: entry.id!,
        syllables: entry.syllables,
      })),
      demonstrates: index === 0 ? ["root-order", "role-use"] : ["root-order"],
    };
  });
  return JSON.stringify({
    version: 1,
    title: profile.naming.examples[0].name,
    summary: `A ${inputs.tone} language used as ${inputs.role}.`,
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
    promptVersion: "language-profile-v1.1-consistency",
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
    const identityCases = LANGUAGE_IDENTITY_ROLE_CASE_IDS.map((id) =>
      LANGUAGE_EVALUATION_CASES.find((testCase) => testCase.id === id)!,
    );
    expect(
      new Set(identityCases.map((testCase) => testCase.inputs.role)).size,
    ).toBe(3);
    expect(
      new Set(
        identityCases.map(({ inputs }) =>
          JSON.stringify({
            genre: inputs.genre,
            tone: inputs.tone,
            structure: inputs.structure,
            worldContext: inputs.worldContext,
          }),
        ),
      ).size,
    ).toBe(1);
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

  it("rejects invariant title and summary across the fixed role matrix", () => {
    const records = LANGUAGE_EVALUATION_CASES.flatMap((testCase) =>
      [1, 2, 3].map((sample) => record(testCase.id, sample)),
    );
    for (const caseId of LANGUAGE_IDENTITY_ROLE_CASE_IDS) {
      const item = records.find(
        (candidate) => candidate.caseId === caseId && candidate.sample === 1,
      )!;
      const result = JSON.parse(item.rawResult);
      result.title = "Same Tongue";
      result.summary = "The same summary for every role.";
      item.rawResult = JSON.stringify(result);
    }

    const validation = validateLanguageEvaluation(records);

    expect(
      validation.issues.some((issue) =>
        issue.includes("reuses a title or summary"),
      ),
    ).toBe(true);
  });
});
