import { describe, expect, it } from "vitest";
import { DEFAULT_CALENDAR } from "chronology-engine";
import {
  emptyWorldEntrySetup,
  validateWorldEntrySetup,
  worldEntryCharacter,
  worldEntryLocationName,
  visibleWorldEntryChoices,
  worldEntryTitle,
} from "./world-entry-setup";

const characters = [{ id: "pc-1", name: "Lira" }];
const locations = [{ id: "loc-1", name: "Szélvészvár" }];

describe("World Entry setup", () => {
  it("keeps setup local to its Vault and requires a character and a place", () => {
    const draft = emptyWorldEntrySetup("vault-1");
    expect(draft.vaultId).toBe("vault-1");
    expect(
      validateWorldEntrySetup(draft, characters, locations, DEFAULT_CALENDAR),
    ).toHaveLength(2);
  });

  it("turns canonical choices into a stable character and place reference", () => {
    const draft = {
      ...emptyWorldEntrySetup("vault-1"),
      characterId: "pc-1",
      locationId: "loc-1",
      intent: "explore" as const,
    };
    expect(
      validateWorldEntrySetup(draft, characters, locations, DEFAULT_CALENDAR),
    ).toEqual([]);
    expect(worldEntryCharacter(draft, characters)).toEqual({
      kind: "canonical",
      recordId: "pc-1",
      name: "Lira",
    });
    expect(worldEntryLocationName(draft, locations)).toBe("Szélvészvár");
    expect(worldEntryTitle(draft, characters, locations)).toBe(
      "Lira in Szélvészvár",
    );
  });

  it("supports a provisional character and place with no Vault entities", () => {
    const draft = {
      ...emptyWorldEntrySetup("vault-1"),
      provisionalCharacterName: "Wayfarer",
      provisionalLocationName: "Roadside Inn",
    };
    expect(validateWorldEntrySetup(draft, [], [], DEFAULT_CALENDAR)).toEqual(
      [],
    );
    expect(worldEntryCharacter(draft, [])).toEqual({
      kind: "provisional",
      name: "Wayfarer",
      description: "Wayfarer",
    });
  });

  it("rejects stale Vault IDs, impossible dates and unspecified specific scenes", () => {
    const draft = {
      ...emptyWorldEntrySetup("vault-1"),
      characterId: "missing",
      locationId: "missing",
      at: { year: Number.NaN },
      intent: "scene" as const,
    };
    expect(
      validateWorldEntrySetup(draft, characters, locations, DEFAULT_CALENDAR),
    ).toHaveLength(4);
  });

  it("does not invent precision when a player chooses a year", () => {
    const draft = {
      ...emptyWorldEntrySetup("vault-1"),
      characterId: "pc-1",
      locationId: "loc-1",
      at: { year: 618, precision: "year" as const },
    };
    expect(
      validateWorldEntrySetup(draft, characters, locations, DEFAULT_CALENDAR),
    ).toEqual([]);
    expect(draft.at).toEqual({ year: 618, precision: "year" });
  });

  it("keeps the current selection visible when the picker is truncated", () => {
    const rows = Array.from({ length: 200 }, (_, i) => ({
      id: "c-" + i,
      name: "Character " + i,
    }));
    // Selected through search: far beyond the first 80 rows.
    const cleared = visibleWorldEntryChoices(rows, "c-150", "");
    expect(cleared).toHaveLength(80);
    expect(cleared[0]?.id).toBe("c-150");
    const searched = visibleWorldEntryChoices(rows, "c-150", "Character 2");
    expect(searched[0]?.id).toBe("c-150");
    expect(
      searched.slice(1).every((row) => row.name.includes("Character 2")),
    ).toBe(true);
    expect(new Set(cleared.map((row) => row.id)).size).toBe(80);
  });

  it("lists matches only when nothing is selected", () => {
    const rows = [
      { id: "a", name: "Alder" },
      { id: "b", name: "Birch" },
    ];
    expect(visibleWorldEntryChoices(rows, "", "bir")).toEqual([
      { id: "b", name: "Birch" },
    ]);
    expect(visibleWorldEntryChoices(rows, "gone", "")).toEqual(rows);
  });
});
