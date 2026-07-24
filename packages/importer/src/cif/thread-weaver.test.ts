import { describe, it, expect } from "vitest";
import { CifManifestSchema } from "./package";
import {
  isThreadWeaverExport,
  convertThreadWeaverJsonToCif,
} from "./thread-weaver";

function minimalExport(overrides: Record<string, any> = {}) {
  return {
    twe_format: "thread-weaver-campaign",
    twe_version: 2,
    exportedAt: "2026-01-01T00:00:00.000Z",
    generator: { seed: "test-seed" },
    networkData: {
      settlements: [
        {
          id: "s1",
          name: "Greyhaven",
          type: "City",
          population: 5000,
          nation: "Aldoria",
          description: "A grey harbor town.",
        },
      ],
      factions: [
        {
          name: "The Iron Ledger",
          headquarters: "s1",
          structure_type: "guild",
          shortGoal: "Control the docks",
          longGoal: "Own the region",
        },
      ],
      characters: [
        {
          id: 1,
          name: "Mira",
          faction: "The Iron Ledger",
          role: "Enforcer",
          settlement: { id: "s1" },
        },
      ],
    },
    ...overrides,
  };
}

describe("isThreadWeaverExport", () => {
  it("recognizes an export with the explicit format marker", () => {
    expect(isThreadWeaverExport(minimalExport())).toBe(true);
  });

  it("recognizes an export without the marker via networkData shape", () => {
    const raw = minimalExport();
    delete (raw as any).twe_format;
    expect(isThreadWeaverExport(raw)).toBe(true);
  });

  it("rejects a real CIF package", () => {
    expect(
      isThreadWeaverExport({
        format: "codex-world-interchange",
        version: "1.0",
      }),
    ).toBe(false);
  });

  it("rejects unrelated JSON", () => {
    expect(isThreadWeaverExport({ hello: "world" })).toBe(false);
    expect(isThreadWeaverExport(null)).toBe(false);
    expect(isThreadWeaverExport("string")).toBe(false);
  });
});

describe("convertThreadWeaverJsonToCif", () => {
  it("produces a manifest that passes CifManifestSchema validation", () => {
    const cif = convertThreadWeaverJsonToCif(minimalExport());
    expect(() => CifManifestSchema.parse(cif)).not.toThrow();
  });

  it("maps settlements/factions/characters to lowercase kinds matching CIF_MAPPING_RULES", () => {
    const cif = convertThreadWeaverJsonToCif(minimalExport());
    const kinds = cif.entities.map((e: any) => e.kind);
    expect(kinds).toContain("location");
    expect(kinds).toContain("faction");
    expect(kinds).toContain("character");
  });

  it("links a character to their faction and settlement via relationships", () => {
    const cif = convertThreadWeaverJsonToCif(minimalExport());
    const relKinds = cif.relationships.map((r: any) => r.kind);
    expect(relKinds).toContain("member");
    expect(relKinds).toContain("located_in");
    expect(relKinds).toContain("headquarters");
  });

  it("falls back to defaults for missing optional fields without throwing", () => {
    const cif = convertThreadWeaverJsonToCif({
      networkData: { characters: [{ id: 1 }], factions: [], settlements: [] },
    });
    expect(cif.entities).toHaveLength(1);
    expect(cif.entities[0].kind).toBe("character");
  });
});
