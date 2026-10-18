import { describe, expect, it } from "vitest";
import { resolveGeneratorSection } from "./generator-categories";
import type { GeneratorId } from "generator-engine";
import { listGenerators } from "generator-engine";

describe("generator-categories", () => {
  it("resolves all known generators to a valid section", () => {
    const allGenerators = listGenerators();

    // Ensure every single registered generator resolves to a non-undefined section
    for (const gen of allGenerators) {
      const section = resolveGeneratorSection(gen);
      expect(section).toBeDefined();
    }
  });

  it("prioritises the explicit map over entity type fallback", () => {
    // Faction is 'faction' entity type, which defaults to 'people-factions'
    // But we map it explicitly
    expect(
      resolveGeneratorSection({ id: "faction", entityType: "faction" }),
    ).toBe("people-factions");
  });

  it("falls back to entity type when not explicitly mapped", () => {
    // A hypothetical or new event generator not in the explicit map
    expect(
      resolveGeneratorSection({
        id: "new-event" as GeneratorId,
        entityType: "event",
      }),
    ).toBe("adventures-encounters");

    // A hypothetical location generator
    expect(
      resolveGeneratorSection({
        id: "new-loc" as GeneratorId,
        entityType: "location",
      }),
    ).toBe("locations-worlds");
  });
});
