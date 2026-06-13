import { describe, it, expect } from "vitest";
import {
  getGenerator,
  isSupportedGenerator,
  listGenerators,
  resolveEntityType,
  GENERATOR_ENTITY_TYPE,
} from "./campaign-generator-registry";
import {
  type GeneratorRunRequest,
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

  it("lists all four generators in order", () => {
    expect(listGenerators().map((g) => g.id)).toEqual([
      "npc",
      "faction",
      "settlement",
      "magic-item",
    ]);
  });

  it("throws a user-safe UnsupportedGeneratorError for unknown ids", () => {
    expect(() => getGenerator("dragon")).toThrow(UnsupportedGeneratorError);
    expect(() => getGenerator("dragon")).toThrow(/not available/);
  });

  it("isSupportedGenerator narrows known ids", () => {
    expect(isSupportedGenerator("npc")).toBe(true);
    expect(isSupportedGenerator("dragon")).toBe(false);
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

describe("generator id -> vault category mapping (FR-041)", () => {
  it("maps each generator to its distinct vault category", () => {
    expect(GENERATOR_ENTITY_TYPE).toEqual({
      npc: "character",
      faction: "faction",
      settlement: "location",
      "magic-item": "item",
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
