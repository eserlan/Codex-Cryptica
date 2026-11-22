import { describe, expect, it } from "vitest";
import {
  adventureJsonGmOnlyText,
  adventureJsonHiddenRecordIds,
  adventureJsonRecordIds,
  authorisedPackageRevelationScope,
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

  it("derives authorised readAloud scene IDs only from committed active/reached scenes", () => {
    const scope = authorisedPackageRevelationScope({
      sceneId: "scene-entry",
      records: [
        { id: "scene-entry", kind: "scene", status: "active" },
        { id: "scene-past", kind: "scene", status: "resolved" },
        { id: "scene-altered", kind: "scene", status: "altered" },
        { id: "scene-avail", kind: "scene", status: "available" },
        { id: "scene-skip", kind: "scene", status: "skipped" },
        { id: "scene-unvisited", kind: "scene", status: "unvisited" },
        { id: "enc-1", kind: "encounter", status: "active" },
      ],
    });
    expect([...(scope.revealedReadAloudSceneIds ?? [])].sort()).toEqual([
      "scene-altered",
      "scene-entry",
      "scene-past",
    ]);
    expect([
      ...(authorisedPackageRevelationScope(undefined)
        .revealedReadAloudSceneIds ?? []),
    ]).toEqual([]);
  });

  it("omits readAloud only for authorised gm-only scenes while keeping body, title, unreached scenes, and secrets guarded", () => {
    const withScenes = makePackage({
      scenes: [
        {
          id: "scene-gm-entry",
          title: "Secret Cellar Title",
          summary: "Cellar GM summary",
          readAloud: [
            "Cold air rises from the cellar steps.",
            "Lantern light catches wet slate.",
          ],
          body: "GM trap note: the third step triggers a dart.",
          visibility: "gm-only",
          epistemicStatus: "explicit",
          sourceRef: { textQuote: "Hidden cellar source quote" },
        },
        {
          id: "scene-gm-unreached",
          title: "Inner Sanctum",
          summary: "Sanctum summary",
          readAloud: "Obsidian pillars surround the silent altar.",
          body: "Sanctum GM body",
          visibility: "gm-only",
          epistemicStatus: "explicit",
        },
      ],
      clues: [
        {
          id: "clue-1",
          text: "Muddy bootprints",
          reveals: "The steward fled through the cellar",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
      secrets: [
        {
          id: "secret-1",
          text: "The altar hides a false bottom",
          visibility: "gm-only",
          epistemicStatus: "explicit",
        },
      ],
    });

    const unrevealed = adventureJsonGmOnlyText(withScenes);
    expect(unrevealed).toContain("Cold air rises from the cellar steps.");
    expect(unrevealed).toContain("Lantern light catches wet slate.");

    const scope = authorisedPackageRevelationScope({
      sceneId: "scene-gm-entry",
    });
    const scoped = adventureJsonGmOnlyText(withScenes, scope);
    expect(scoped).not.toContain("Cold air rises from the cellar steps.");
    expect(scoped).not.toContain("Lantern light catches wet slate.");
    expect(scoped).toContain("Secret Cellar Title");
    expect(scoped).toContain("Cellar GM summary");
    expect(scoped).toContain("GM trap note: the third step triggers a dart.");
    expect(scoped).toContain("Hidden cellar source quote");
    expect(scoped).toContain("Obsidian pillars surround the silent altar.");
    expect(scoped).toContain("The altar hides a false bottom");
    expect(scoped).toContain("The steward fled through the cellar");
  });
});
