import { describe, expect, it } from "vitest";
import { DEFAULT_CALENDAR } from "chronology-engine";
import {
  createWorldEntryStart,
  describeWorldEntryStartFailure,
  WorldEntrySetupError,
} from "./world-entry-start";
import {
  describeAdventureStartFailure,
  type AdventureStartFailure,
} from "./adventure-start-failure";
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

  it("accepts a reactive Proxy date and produces a cloneable start payload", () => {
    // Svelte $state wraps the selected date in a Proxy when navigating
    // from Set the Stage to the preview. Native structuredClone rejects it.
    const reactiveDate = new Proxy(
      { year: 618, precision: "year" as const, calendarRevision: 1 },
      {},
    );
    expect(() => structuredClone(reactiveDate)).toThrow();
    const setup = {
      ...emptyWorldEntrySetup("vault-1"),
      characterId: "pc-1",
      locationId: "place-1",
      at: reactiveDate,
    };
    const start = createWorldEntryStart(
      setup,
      characters,
      locations,
      DEFAULT_CALENDAR,
    );
    expect(start.worldEntry.at).toEqual({
      year: 618,
      precision: "year",
      calendarRevision: 1,
    });
    expect(structuredClone(start.worldEntry)).toEqual(start.worldEntry);
  });

  it("reports safe actionable errors without displaying unknown private messages", () => {
    expect(
      describeWorldEntryStartFailure(
        new DOMException("proxy failed", "DataCloneError"),
        "setup",
      ),
    ).toContain("selected world date");
    expect(
      describeWorldEntryStartFailure(
        new Error("private source content here"),
        "launch",
      ),
    ).not.toContain("private source content here");
    expect(
      describeWorldEntryStartFailure(
        new WorldEntrySetupError(["Choose a location from this Vault."]),
        "setup",
      ),
    ).toContain("Choose a location");
  });

  it("never passes through unknown text that merely looks like setup copy", () => {
    for (const stage of ["setup", "launch"] as const) {
      const shown = describeWorldEntryStartFailure(
        new Error("Choose a location: PRIVATE_VAULT_SENTINEL"),
        stage,
      );
      expect(shown).not.toContain("PRIVATE_VAULT_SENTINEL");
    }
    // Even genuine setup messages are not shown once the launch has begun.
    expect(
      describeWorldEntryStartFailure(
        new WorldEntrySetupError(["Choose a location from this Vault."]),
        "launch",
      ),
    ).not.toContain("Choose a location");
  });

  it("throws a typed setup error whose messages are the validator's copy", () => {
    try {
      createWorldEntryStart(
        emptyWorldEntrySetup("vault-1"),
        characters,
        locations,
        DEFAULT_CALENDAR,
      );
      expect.unreachable();
    } catch (cause) {
      expect(cause).toBeInstanceOf(WorldEntrySetupError);
      expect((cause as WorldEntrySetupError).messages.length).toBeGreaterThan(
        0,
      );
    }
  });

  it.each<AdventureStartFailure>([
    "offline",
    "opening-rejected",
    "opening-failed",
    "save-failed",
    "storage-full",
    "storage-permission",
    "control-lost",
    "cleanup-failed",
  ])("maps the %s opening failure to fixed copy", (failure) => {
    const copy = describeAdventureStartFailure(failure);
    expect(copy.length).toBeGreaterThan(20);
    expect(copy).not.toMatch(/undefined|Error:/);
  });

  it("gives storage-specific advice for storage failures", () => {
    expect(describeAdventureStartFailure("storage-full")).toContain(
      "storage is full",
    );
    expect(describeAdventureStartFailure("storage-permission")).toContain(
      "permissions",
    );
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
