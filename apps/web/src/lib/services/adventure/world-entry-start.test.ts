import { describe, expect, it } from "vitest";
import { DEFAULT_CALENDAR } from "chronology-engine";
import { createWorldEntryStart } from "./world-entry-start";
import { emptyWorldEntrySetup } from "./world-entry-setup";

const characters = [{ id: "pc-1", name: "Lira" }];
const locations = [{ id: "place-1", name: "Northbrook" }];

describe("createWorldEntryStart", () => {
  it("uses canonical IDs and preserves a year-only world date without assigning a quest", () => {
    const setup = {
      ...emptyWorldEntrySetup("vault-1"),
      characterId: "pc-1",
      locationId: "place-1",
      at: { year: 618, precision: "year" as const, calendarRevision: 1 },
    };
    const start = createWorldEntryStart(
      setup,
      characters,
      locations,
      DEFAULT_CALENDAR,
    );
    expect(start.title).toBe("Lira in Northbrook");
    expect(start.playerCharacter).toEqual({
      kind: "canonical",
      name: "Lira",
      recordId: "pc-1",
    });
    expect(start.sourceRecords.map((source) => source.recordId)).toEqual([
      "pc-1",
      "place-1",
    ]);
    expect(start.worldEntry.at).toEqual(setup.at);
    expect(start.worldEntry.intent).toBe("explore");
    expect(start.premise).toContain("explore freely");
    expect(start.premise).not.toContain("defeat");
  });

  it("supports an unscripted provisional start and optional specific scene", () => {
    const setup = {
      ...emptyWorldEntrySetup("vault-1"),
      provisionalCharacterName: "Traveller",
      provisionalLocationName: "Roadside Inn",
      scenePrompt: "Speak to the innkeeper.",
      intent: "scene" as const,
    };
    const start = createWorldEntryStart(setup, [], [], DEFAULT_CALENDAR);
    expect(start.sourceRecords).toEqual([]);
    expect(start.worldEntry).toEqual({
      version: 1,
      location: { kind: "provisional", name: "Roadside Inn" },
      intent: "scene",
      scenePrompt: "Speak to the innkeeper.",
    });
    expect(start.premise).toContain("World date is unspecified");
  });

  it("rejects stale canonical record IDs before creating a session", () => {
    const setup = {
      ...emptyWorldEntrySetup("vault-1"),
      characterId: "no-longer-in-vault",
      locationId: "place-1",
    };
    expect(() =>
      createWorldEntryStart(setup, characters, locations, DEFAULT_CALENDAR),
    ).toThrow("Choose a character from this Vault");
  });
});
