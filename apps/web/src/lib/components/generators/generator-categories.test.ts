import { describe, expect, it } from "vitest";
import {
  GENERATOR_SECTION_MAP,
  resolveGeneratorSection,
} from "./generator-categories";
import type { GeneratorId } from "generator-engine";
import { listGenerators } from "generator-engine";
import { GENERATOR_CATALOGUE } from "#lib/content/generator-catalogue.js";

describe("generator-categories", () => {
  it("files every registered generator under an explicit category", () => {
    for (const gen of listGenerators()) {
      expect(GENERATOR_SECTION_MAP[gen.id], gen.id).toBeDefined();
    }
  });

  it("places each generator in the same category as its public page", () => {
    const linked = GENERATOR_CATALOGUE.filter((entry) => entry.generatorId);
    expect(linked.length).toBeGreaterThan(0);

    for (const entry of linked) {
      const gen = listGenerators().find((g) => g.id === entry.generatorId);
      expect(gen, entry.slug).toBeDefined();
      expect(resolveGeneratorSection(gen!), entry.slug).toBe(entry.category);
    }
  });

  it("links each in-app generator to at most one public page", () => {
    const ids = GENERATOR_CATALOGUE.flatMap((entry) =>
      entry.generatorId ? [entry.generatorId] : [],
    );

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("places mystery and investigation in the adventures section", () => {
    expect(
      resolveGeneratorSection({
        id: "mystery-investigation",
        entityType: "note",
      }),
    ).toBe("adventures");
  });

  it("falls back to entity type when not explicitly mapped", () => {
    expect(
      resolveGeneratorSection({
        id: "new-event" as GeneratorId,
        entityType: "event",
      }),
    ).toBe("adventures");

    expect(
      resolveGeneratorSection({
        id: "new-loc" as GeneratorId,
        entityType: "location",
      }),
    ).toBe("places");

    expect(
      resolveGeneratorSection({
        id: "new-thing" as GeneratorId,
        entityType: "unknown",
      }),
    ).toBe("items");
  });
});
