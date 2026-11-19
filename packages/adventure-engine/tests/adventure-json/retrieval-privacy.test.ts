import { describe, expect, it } from "vitest";
import {
  adventureJsonGmOnlyText,
  adventureJsonHiddenRecordIds,
  adventureJsonRecordIds,
  createAdventureJsonHiddenIdMatcher,
} from "../../src/adventure-json/retrieval-privacy";
import { makePackage } from "./retrieval-fixtures";

describe("retrieval privacy inventory", () => {
  const pkg = makePackage({
    locations: [
      {
        id: "place",
        name: "Hall",
        summary: "",
        visibility: "player-visible",
        epistemicStatus: "explicit",
      },
    ],
    actors: [
      {
        id: "hidden-actor",
        name: "Spy",
        summary: "",
        visibility: "gm-only",
        epistemicStatus: "explicit",
        sourceRef: { textQuote: "Hidden quote" },
      },
    ],
    factions: [
      {
        id: "faction",
        name: "Society",
        summary: "",
        visibility: "gm-only",
        epistemicStatus: "explicit",
      },
    ],
    clues: [
      {
        id: "clue",
        text: "A public mark",
        reveals: "Spy",
        visibility: "player-visible",
        epistemicStatus: "explicit",
      },
    ],
    secrets: [
      {
        id: "secret",
        text: "Secret",
        visibility: "gm-only",
        epistemicStatus: "explicit",
      },
    ],
  });

  it("keeps record order and excludes public records from hidden IDs", () => {
    expect(adventureJsonRecordIds(pkg)).toEqual([
      "place",
      "hidden-actor",
      "faction",
      "clue",
      "secret",
    ]);
    expect(adventureJsonHiddenRecordIds(pkg)).toEqual([
      "hidden-actor",
      "faction",
      "secret",
    ]);
  });

  it("collects protected text once without public prose or empty strings", () => {
    expect(adventureJsonGmOnlyText(pkg)).toEqual([
      "Secret",
      "Spy",
      "Hidden quote",
      "Society",
    ]);
    expect(adventureJsonGmOnlyText(makePackage())).toEqual([]);
  });

  it("matches hidden IDs at boundaries while excluding ordinary short words", () => {
    const matches = createAdventureJsonHiddenIdMatcher([
      "hidden-actor",
      "a",
      "s2",
    ]);
    expect(matches("See (hidden-actor) and s2.")).toBe(true);
    expect(matches("A hidden-actorish statue by a gate.")).toBe(false);
    expect(createAdventureJsonHiddenIdMatcher([])("anything")).toBe(false);
  });
});
