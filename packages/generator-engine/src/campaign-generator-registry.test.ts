import { describe, it, expect } from "vitest";
import {
  getGenerator,
  getDefaultInstruction,
  isTitleBanned,
  isSupportedGenerator,
  listGenerators,
  resolveEntityType,
  GENERATOR_ENTITY_TYPE,
  SYSTEM_INSTRUCTION,
} from "./campaign-generator-registry";
import {
  type GeneratorRunRequest,
  type GeneratorVaultContext,
  UnsupportedGeneratorError,
} from "./campaign-generator-types";

function run(
  generatorId: GeneratorRunRequest["generatorId"],
  overrides: Partial<GeneratorRunRequest> = {},
): GeneratorRunRequest {
  return {
    generatorId,
    options: {},
    useAI: false,
    themeId: "workspace",
    ...overrides,
  };
}

describe("registry lookup", () => {
  it("returns a definition for every supported id", () => {
    for (const id of ["npc", "faction", "settlement", "magic-item"] as const) {
      expect(getGenerator(id).id).toBe(id);
    }
  });

  it("lists all generators in order", () => {
    expect(listGenerators().map((g) => g.id)).toEqual([
      "npc",
      "faction",
      "settlement",
      "magic-item",
      "event",
      "ship",
      "language",
      "news-sheet",
      "dungeon",
      "adventure",
      "world",
      "council-vote",
    ]);
  });

  it("maps the event generator to the event vault category", () => {
    expect(GENERATOR_ENTITY_TYPE.event).toBe("event");
    expect(getGenerator("event").entityType).toBe("event");
  });

  it("builds an event prompt and generates an event draft", () => {
    const prompt = getGenerator("event").buildPrompt(run("event"));
    expect(prompt).toContain("Generate a campaign event");
    const draft = getGenerator("event").generate(run("event"));
    expect(draft.title.length).toBeGreaterThan(0);
  });

  it("builds a system-aware prompt and maps worlds to locations", () => {
    const prompt = getGenerator("world").buildPrompt(
      run("world", {
        options: {
          worldTagOne: "Trade Hub",
          worldTagTwo: "Refugees",
        },
      }),
    );
    expect(prompt).toContain("Star-system context");
    expect(prompt).toContain("Trade Hub and Refugees");
    expect(prompt).toContain('"connections"');
    expect(prompt).toContain("Example (illustrative only");
    expect(prompt).toContain('leave "connections" as an empty array');
    expect(GENERATOR_ENTITY_TYPE.world).toBe("location");
    expect(getGenerator("world").generate(run("world")).lore).toContain(
      "## Adventure Hooks",
    );
  });

  it("throws a user-safe UnsupportedGeneratorError for unknown ids", () => {
    expect(() => getGenerator("dragon")).toThrow(UnsupportedGeneratorError);
    expect(() => getGenerator("dragon")).toThrow(/not available/);
  });

  it("provides a non-empty default instruction for every generator", () => {
    for (const id of ["npc", "faction", "settlement", "magic-item"] as const) {
      expect(getDefaultInstruction(id).trim().length).toBeGreaterThan(0);
      expect(getDefaultInstruction(id)).toBe(
        getGenerator(id).defaultInstruction,
      );
    }
  });

  it("isSupportedGenerator narrows known ids", () => {
    expect(isSupportedGenerator("npc")).toBe(true);
    expect(isSupportedGenerator("dragon")).toBe(false);
  });
});

describe("council-vote generator", () => {
  it("maps to the note vault category", () => {
    expect(GENERATOR_ENTITY_TYPE["council-vote"]).toBe("note");
    expect(getGenerator("council-vote").entityType).toBe("note");
  });

  it("builds a prompt that names the requested council size and covers the political-puzzle requirements", () => {
    const prompt = getGenerator("council-vote").buildPrompt(
      run("council-vote", { options: { councilSize: "7" } }),
    );
    expect(prompt).toContain("exactly 7 named council members");
    expect(prompt).toContain("initial voting stance");
    expect(prompt).toContain("at least two viable paths to victory");
    expect(prompt).toContain("costly best solution");
    expect(prompt).toContain("run a consistency pass");
    expect(prompt).toContain("mathematically correct for 7 seats");
    expect(prompt).toContain('"connections"');
    expect(prompt).toContain("Example (illustrative only");
  });

  it("defaults to a 5-seat council when no size is given", () => {
    const prompt = getGenerator("council-vote").buildPrompt(
      run("council-vote"),
    );
    expect(prompt).toContain("exactly 5 named council members");
  });

  it("generates a local fallback with one council member per requested seat", () => {
    const draft = getGenerator("council-vote").generate(
      run("council-vote", {
        options: {
          councilSize: "3",
          governingBodyType: "Senate",
          votingRule: "Unanimous",
        },
      }),
    );
    expect(draft.title.length).toBeGreaterThan(0);
    expect(draft.lore).toContain("## Council Members");
    expect(draft.lore.match(/^- \*\*/gm)?.length).toBe(3);
    expect(draft.lore).toContain("costly best solution");
    expect(draft.labels).toContain("Senate");
    expect(draft.labels).toContain("Unanimous");
  });

  it("reflects the requested scope and tone in the local fallback, not just AI prompts", () => {
    const draft = getGenerator("council-vote").generate(
      run("council-vote", {
        options: {
          scope: "Distributed Across Settlements/Regions",
          tone: "Farcical",
        },
      }),
    );
    expect(draft.lore).toContain("## Scope");
    expect(draft.lore).toContain("Distributed Across Settlements/Regions");
    expect(draft.summary).toContain("farcical");
    expect(draft.labels).toContain("Farcical");
  });

  it("only ever generates one of the supported council sizes, even for out-of-range input", () => {
    for (const size of ["2", "4", "10", "-1", "0"]) {
      const draft = getGenerator("council-vote").generate(
        run("council-vote", { options: { councilSize: size } }),
      );
      expect(draft.lore.match(/^- \*\*/gm)?.length).toBe(5);
    }
  });

  it("falls back to a valid council size when given garbage input", () => {
    const draft = getGenerator("council-vote").generate(
      run("council-vote", { options: { councilSize: "not-a-number" } }),
    );
    expect(draft.lore.match(/^- \*\*/gm)?.length).toBe(5);
  });
});

describe("draft mapping", () => {
  it("maps title, content, lore, and labels", () => {
    const gen = getGenerator("npc");
    const draft = gen.mapOutputToDraft(
      {
        title: "Kaeldar",
        summary: "A human guard.",
        lore: "Kaeldar is a human guard.",
        labels: ["Human", "Guard"],
      },
      run("npc"),
    );
    expect(draft.title).toBe("Kaeldar");
    expect(draft.summary).toBe("A human guard.");
    expect(draft.lore).toContain("Kaeldar");
    expect(draft.labels).toEqual(["Human", "Guard"]);
    expect(draft.sourceGeneratorId).toBe("npc");
  });

  it("preserves labels as labels (never tags)", () => {
    const gen = getGenerator("faction");
    const draft = gen.mapOutputToDraft(
      { title: "X", summary: "s", lore: "l", labels: ["Guild"] },
      run("faction"),
    );
    expect(draft).not.toHaveProperty("tags");
    expect(draft.labels).toContain("Guild");
  });

  it("marks templateApplied when an outline is present and applyTemplate is true", () => {
    const gen = getGenerator("npc");
    const draft = gen.mapOutputToDraft(
      { title: "X", summary: "s", lore: "l", labels: [] },
      run("npc", {
        vaultContext: {
          categoryLabels: [],
          applyTemplate: true,
          templateOutline: "## Overview\n## Secrets",
          neighbors: [],
          worldSample: [],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: [],
        },
      }),
    );
    expect(draft.templateApplied).toBe(true);
    expect(draft.templateOutline).toContain("## Overview");
  });

  it("preserves unmatched generated details instead of discarding them", () => {
    const gen = getGenerator("npc");
    const draft = gen.mapOutputToDraft(
      {
        title: "X",
        summary: "s",
        lore: "l",
        labels: [],
        unmappedDetails: "extra",
      },
      run("npc"),
    );
    expect(draft.unmappedDetails).toBe("extra");
  });
});

describe("buildPrompt template injection", () => {
  const ctxWithTemplate = (applyTemplate: boolean) => ({
    categoryLabels: [],
    applyTemplate,
    templateOutline: "## Overview\n## Secrets",
    neighbors: [],
    worldSample: [],
    existingTitles: [],
    labelSuggestions: [],
    includedContext: [],
  });

  it("includes the template outline in the prompt when applyTemplate is true", () => {
    for (const id of ["npc", "faction", "settlement", "magic-item"] as const) {
      const prompt = getGenerator(id).buildPrompt(
        run(id, { vaultContext: ctxWithTemplate(true) }),
      );
      expect(prompt).toContain(
        'Structure the "lore" field to follow this template',
      );
      expect(prompt).toContain("## Overview");
    }
  });

  it("omits the template block when applyTemplate is false", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", { vaultContext: ctxWithTemplate(false) }),
    );
    expect(prompt).not.toContain("## Overview");
  });

  it("omits the template block when no outline is supplied", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", {
        vaultContext: {
          categoryLabels: [],
          applyTemplate: true,
          neighbors: [],
          worldSample: [],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: [],
        },
      }),
    );
    expect(prompt).not.toContain("follow this template");
  });

  it("defers the generic lore checklist to the template when one is present", () => {
    const withTpl = getGenerator("npc").buildPrompt(
      run("npc", { vaultContext: ctxWithTemplate(true) }),
    );
    // generic checklist suppressed, template-fill guidance used instead
    expect(withTpl).not.toContain('The "lore" field should include:');
    expect(withTpl).toContain("Fill every section of the template above");

    const withoutTpl = getGenerator("npc").buildPrompt(
      run("npc", { vaultContext: ctxWithTemplate(false) }),
    );
    expect(withoutTpl).toContain('The "lore" field should include:');
  });
});

describe("buildPrompt quality + schema", () => {
  it("includes a connections field in the output schema", () => {
    const prompt = getGenerator("npc").buildPrompt(run("npc"));
    expect(prompt).toContain('"connections"');
    expect(prompt).toContain("EXACT title");
  });

  it("includes a few-shot exemplar for every generator", () => {
    for (const id of [
      "npc",
      "faction",
      "settlement",
      "magic-item",
      "event",
    ] as const) {
      const prompt = getGenerator(id).buildPrompt(run(id));
      expect(prompt).toContain("Example (illustrative only");
    }
  });

  it("carries the system instruction quality rubric", () => {
    expect(SYSTEM_INSTRUCTION).toMatch(/show through action/i);
    expect(SYSTEM_INSTRUCTION).toMatch(/avoid clich/i);
  });

  it("asks the model to ground in the world when context is present", () => {
    const grounded = getGenerator("npc").buildPrompt(
      run("npc", {
        vaultContext: {
          categoryLabels: [],
          applyTemplate: false,
          neighbors: [],
          worldSample: [
            {
              id: "w1",
              title: "Aranyvér",
              type: "faction",
              contentExcerpt: "x",
            },
          ],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: [],
        },
      }),
    );
    expect(grounded).toContain("weave in at least one entity");

    const empty = getGenerator("npc").buildPrompt(run("npc"));
    expect(empty).toContain('leave "connections" as an empty array');
  });
});

describe("buildPrompt cultural naming", () => {
  it("instructs the model to match the world's naming conventions", () => {
    const prompt = getGenerator("npc").buildPrompt(run("npc"));
    expect(prompt).toContain("naming conventions");
    expect(prompt).toContain("do not default to generic");
  });

  it("points to the example entities when world context is present", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", {
        vaultContext: {
          categoryLabels: [],
          applyTemplate: false,
          neighbors: [],
          worldSample: [
            {
              id: "w1",
              title: "Aranyvér",
              type: "character",
              contentExcerpt: "x",
            },
          ],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: [],
        },
      }),
    );
    expect(prompt).toContain(
      "Infer the naming style from the example entities",
    );
  });

  it("uses only an explicitly selected legacy language", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", {
        vaultContext: {
          categoryLabels: [],
          applyTemplate: false,
          neighbors: [],
          worldSample: [],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: [],
          selectedLanguage: {
            id: "l1",
            title: "Elvish",
            type: "note",
            contentExcerpt: "Glossary: stars = elen",
            legacy: true,
          },
        },
      }),
    );
    expect(prompt).toContain("Primary Language — Elvish:");
    expect(prompt).toContain("Legacy readable notes");
    expect(prompt).toContain("Elvish");
    expect(prompt).toContain("explicitly selected Primary Language");
  });

  it("renders populated structured language guidance without placeholders", () => {
    const prompt = getGenerator("settlement").buildPrompt(
      run("settlement", {
        vaultContext: {
          categoryLabels: [],
          applyTemplate: false,
          neighbors: [],
          worldSample: [],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: ["languages"],
          selectedLanguage: {
            id: "l1",
            title: "Lemari",
            type: "note",
            contentExcerpt: "",
            legacy: false,
            languageProfileVersion: 1,
            languageProfile: {
              inputs: {
                genre: "Fantasy",
                tone: "Lyrical",
                role: "Common Speech",
                structure: "Suffix-heavy",
              },
              phonology: {
                consonants: ["l", "m"],
                vowels: ["a", "e"],
                phonotactics: ["CV"],
              },
              naming: {
                placeNamePatterns: ["River root + -a"],
                examples: [
                  { name: "Lema", meaning: "river town", use: "place" },
                ],
              },
              lexicon: [
                { word: "lem", pronunciation: "LEHM", meaning: "river" },
              ],
              grammar: {
                examples: [
                  {
                    text: "Lem na",
                    pronunciation: "LEHM nah",
                    translation: "By the river",
                  },
                ],
              },
              register: { role: "Common Speech" },
              tableUseTips: ["Use open vowels."],
            },
          },
        },
      }),
    );

    expect(prompt).toContain("Place-name patterns: River root + -a");
    expect(prompt).toContain("lem = river");
    expect(prompt).not.toContain("Not specified");
    expect(prompt).toContain("must visibly follow the supplied rules");
  });

  it("injects no authoritative language guidance when none is selected", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", {
        vaultContext: {
          categoryLabels: [],
          applyTemplate: false,
          neighbors: [],
          worldSample: [],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: [],
        },
      }),
    );

    expect(prompt).not.toContain("Primary Language");
  });
});

describe("buildPrompt campaign date", () => {
  const baseCtx = (): GeneratorVaultContext => ({
    categoryLabels: [],
    applyTemplate: false,
    neighbors: [],
    worldSample: [],
    existingTitles: [],
    labelSuggestions: [],
    includedContext: [],
  });

  it("includes the current campaign date when provided", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", {
        vaultContext: { ...baseCtx(), themeName: "X", currentDate: "1247 AE" },
      }),
    );
    expect(prompt).toContain("Current campaign date: 1247 AE");
  });

  it("omits the date line when no campaign date is set", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", { vaultContext: baseCtx() }),
    );
    expect(prompt).not.toContain("Current campaign date");
  });
});

describe("buildPrompt source entity", () => {
  it("includes both the content and lore of the source entity for every generator", () => {
    for (const id of ["npc", "faction", "settlement", "magic-item"] as const) {
      const prompt = getGenerator(id).buildPrompt(
        run(id, {
          vaultContext: {
            categoryLabels: [],
            applyTemplate: false,
            neighbors: [],
            worldSample: [],
            existingTitles: [],
            labelSuggestions: [],
            includedContext: [],
            sourceEntity: {
              id: "s1",
              title: "Lord Aric",
              type: "character",
              contentExcerpt: "A grim border lord.",
              loreExcerpt:
                "Secretly bankrupt and beholden to a smuggling ring.",
            },
          },
        }),
      );
      expect(prompt).toContain("A grim border lord.");
      expect(prompt).toContain(
        "Lore: Secretly bankrupt and beholden to a smuggling ring.",
      );
    }
  });
});

describe("buildPrompt world grounding", () => {
  const ctxWithWorld = (worldSample: GeneratorVaultContext["worldSample"]) => ({
    categoryLabels: [],
    applyTemplate: false,
    neighbors: [],
    worldSample,
    existingTitles: [],
    labelSuggestions: [],
    includedContext: [],
  });

  it("injects existing world entities as positive grounding", () => {
    for (const id of ["npc", "faction", "settlement", "magic-item"] as const) {
      const prompt = getGenerator(id).buildPrompt(
        run(id, {
          vaultContext: ctxWithWorld([
            {
              id: "e1",
              title: "Ironhold Keep",
              type: "location",
              contentExcerpt: "A mountain fortress.",
            },
          ]),
        }),
      );
      expect(prompt).toContain("Existing entities in this world");
      expect(prompt).toContain("Ironhold Keep");
      expect(prompt).toContain("A mountain fortress.");
    }
  });

  it("omits the world block when no sample is present", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("npc", { vaultContext: ctxWithWorld([]) }),
    );
    expect(prompt).not.toContain("Existing entities in this world");
  });
});

describe("isTitleBanned", () => {
  const banned = ["Vane", "Archmage Elara Voss", "Dávid Farkas"];

  it("catches hyphenated/compound derivatives of a banned token", () => {
    expect(isTitleBanned("Vane-Smithe", banned)).toBe(true);
    expect(isTitleBanned("Lord Vane", banned)).toBe(true);
    expect(isTitleBanned("Vane", banned)).toBe(true);
  });

  it("does not flag substrings inside a larger word", () => {
    expect(isTitleBanned("Vanessa", banned)).toBe(false);
    expect(isTitleBanned("Vanguard", banned)).toBe(false);
  });

  it("matches multi-word and accented banned names", () => {
    expect(isTitleBanned("Archmage Elara Voss", banned)).toBe(true);
    expect(isTitleBanned("Dávid Farkas the Bold", banned)).toBe(true);
  });

  it("is case-insensitive and returns false for clean names", () => {
    expect(isTitleBanned("VANE-smithe", banned)).toBe(true);
    expect(isTitleBanned("Aric Thornfield", banned)).toBe(false);
  });
});

describe("generator id -> vault category mapping (FR-041)", () => {
  it("maps each generator to its distinct vault category", () => {
    expect(GENERATOR_ENTITY_TYPE).toEqual({
      npc: "character",
      faction: "faction",
      settlement: "location",
      "magic-item": "item",
      event: "event",
      ship: "location",
      language: "note",
      "news-sheet": "note",
      dungeon: "location",
      adventure: "note",
      world: "location",
      "council-vote": "note",
    });
  });

  it("draft entityType uses the mapped vault category, not the generator id", () => {
    expect(
      getGenerator("npc").mapOutputToDraft(
        { title: "X", summary: "", lore: "", labels: [] },
        run("npc"),
      ).entityType,
    ).toBe("character");
    expect(
      getGenerator("settlement").mapOutputToDraft(
        { title: "X", summary: "", lore: "", labels: [] },
        run("settlement"),
      ).entityType,
    ).toBe("location");
    expect(
      getGenerator("magic-item").mapOutputToDraft(
        { title: "X", summary: "", lore: "", labels: [] },
        run("magic-item"),
      ).entityType,
    ).toBe("item");
  });

  it("falls back to note when the mapped category is absent", () => {
    expect(resolveEntityType("npc", ["note", "place"])).toBe("note");
  });

  it("falls back to the first available category when note is absent", () => {
    expect(resolveEntityType("npc", ["place", "thing"])).toBe("place");
  });

  it("uses the mapped category when present in the campaign", () => {
    expect(resolveEntityType("settlement", ["character", "location"])).toBe(
      "location",
    );
  });
});
