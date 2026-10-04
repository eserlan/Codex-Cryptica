import { describe, it, expect, vi } from "vitest";
import {
  buildNameCandidatesPrompt,
  parseNameCandidates,
  pickNameCandidate,
  shouldSuggestName,
  suggestName,
} from "./name-candidates";
import type { GeneratorRunRequest } from "./campaign-generator-types";

const examples = ["Mira", "Tolbert", "Zhao Lin", "Okonkwo"];

function req(
  overrides: Partial<GeneratorRunRequest> = {},
  ctx: Record<string, unknown> = {},
): GeneratorRunRequest {
  return {
    generatorId: "npc",
    options: {},
    useAI: true,
    themeId: "fantasy",
    vaultContext: {
      categoryLabels: [],
      neighbors: [],
      worldSample: [],
      existingTitles: ["Mira", "Tolbert"],
      nameExamples: examples,
      labelSuggestions: [],
      includedContext: [],
      applyTemplate: false,
      targetEntityType: "character",
      ...ctx,
    },
    ...overrides,
  } as GeneratorRunRequest;
}

const none = { words: [], prefixes: [], suffixes: [] };

describe("shouldSuggestName", () => {
  it("is true for a named generator with enough example names", () => {
    expect(shouldSuggestName(req())).toBe(true);
  });

  it("is false for generators whose title is not an invented name", () => {
    expect(shouldSuggestName(req({ generatorId: "rumour" }))).toBe(false);
    expect(shouldSuggestName(req({ generatorId: "dungeon" }))).toBe(false);
  });

  it("is false on refinement turns and when a Primary Language is selected", () => {
    expect(shouldSuggestName(req({ interaction: { input: "darker" } }))).toBe(
      false,
    );
    expect(
      shouldSuggestName(
        req({}, { selectedLanguage: { id: "l", title: "T", legacy: false } }),
      ),
    ).toBe(false);
  });

  it("is false without vault context or with too few example names", () => {
    expect(shouldSuggestName(req({ vaultContext: undefined }))).toBe(false);
    expect(shouldSuggestName(req({}, { nameExamples: ["Mira"] }))).toBe(false);
  });

  it("is false when the user already named the entity in their instructions", () => {
    expect(shouldSuggestName(req({ instructions: 'Call him "Bork"' }))).toBe(
      false,
    );
  });
});

describe("buildNameCandidatesPrompt", () => {
  it("includes the examples, the avoid-lists and the user's concept", () => {
    const prompt = buildNameCandidatesPrompt(
      req(
        { instructions: "a ruthless river smuggler" },
        {
          overusedNamePatterns: {
            words: ["darvold"],
            prefixes: ["kae"],
            suffixes: [],
          },
        },
      ),
    );
    expect(prompt).toContain("Mira, Tolbert, Zhao Lin, Okonkwo");
    expect(prompt).toContain("a ruthless river smuggler");
    expect(prompt).toContain("darvold");
    expect(prompt).toContain('"names"');
  });
});

describe("buildNameCandidatesPrompt culture", () => {
  it("passes along the culture's recorded naming conventions", () => {
    const prompt = buildNameCandidatesPrompt(
      req(
        {},
        {
          cultureNaming: {
            culture: "Stormber",
            guidance: ["Drawing inspiration from the Magyar people."],
          },
        },
      ),
    );
    expect(prompt).toContain("Stormber");
    expect(prompt).toContain("Drawing inspiration from the Magyar people.");
  });
});

describe("parseNameCandidates", () => {
  it("reads a JSON names array, including inside a code fence", () => {
    expect(parseNameCandidates('{"names":["Ana","Bo"]}')).toEqual([
      "Ana",
      "Bo",
    ]);
    expect(parseNameCandidates('```json\n{"names":["Ana"]}\n```')).toEqual([
      "Ana",
    ]);
  });

  it("drops non-strings, blanks and overlong entries", () => {
    expect(
      parseNameCandidates(
        JSON.stringify({ names: ["Ana", 4, "", "  ", "x ".repeat(40)] }),
      ),
    ).toEqual(["Ana"]);
  });

  it("returns an empty list for garbage or the wrong shape", () => {
    expect(parseNameCandidates("not json")).toEqual([]);
    expect(parseNameCandidates('{"other":1}')).toEqual([]);
    expect(parseNameCandidates("[]")).toEqual([]);
  });
});

describe("pickNameCandidate", () => {
  const ctx = { banned: new Set(["Vane"]), existing: ["Mira"], patterns: none };

  it("rejects banned, existing and pattern-matching names, then picks from the rest", () => {
    const picked = pickNameCandidate(
      ["Vane-Smithe", "mira", "Kaelmoor", "Yusra"],
      {
        ...ctx,
        patterns: { words: [], prefixes: ["kae"], suffixes: [] },
      },
      () => 0,
    );
    expect(picked).toBe("Yusra");
  });

  it("chooses among survivors using the injected rng", () => {
    const names = ["Ana", "Bo", "Cy"];
    expect(pickNameCandidate(names, ctx, () => 0)).toBe("Ana");
    expect(pickNameCandidate(names, ctx, () => 0.99)).toBe("Cy");
  });

  it("returns undefined when everything is filtered out", () => {
    expect(pickNameCandidate(["Vane", "Mira"], ctx, () => 0)).toBeUndefined();
    expect(pickNameCandidate([], ctx, () => 0)).toBeUndefined();
  });
});

describe("suggestName", () => {
  const ok = JSON.stringify({ names: ["Yusra", "Kellan", "Odalys"] });

  it("returns a filtered candidate from the gateway's JSON", async () => {
    const complete = vi.fn(async () => ok);
    const name = await suggestName({ complete }, req(), { rng: () => 0 });
    expect(name).toBe("Yusra");
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("returns undefined when the gateway throws", async () => {
    const complete = vi.fn(async () => {
      throw new Error("network");
    });
    expect(await suggestName({ complete }, req())).toBeUndefined();
  });

  it("returns undefined on unusable output", async () => {
    expect(
      await suggestName({ complete: async () => "sorry, no" }, req()),
    ).toBeUndefined();
  });

  it("gives up after the timeout instead of blocking generation", async () => {
    const complete = vi.fn(() => new Promise<string>(() => {}));
    const name = await suggestName({ complete }, req(), { timeoutMs: 20 });
    expect(name).toBeUndefined();
  });

  it("does not call the gateway when a name isn't wanted", async () => {
    const complete = vi.fn(async () => ok);
    await suggestName({ complete }, req({ generatorId: "rumour" }));
    expect(complete).not.toHaveBeenCalled();
  });
});
