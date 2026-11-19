import { describe, expect, it } from "vitest";
import { selectExcerpts } from "../../src/adventure-json/retrieval-selection";
import { makePackage } from "./retrieval-fixtures";

const metadata = {
  visibility: "player-visible" as const,
  epistemicStatus: "explicit" as const,
};

describe("retrieval record selection", () => {
  const pkg = makePackage({
    scenes: [
      {
        ...metadata,
        id: "scene",
        title: "Arrival",
        summary: "",
        locationId: "hall",
      },
    ],
    locations: [
      { ...metadata, id: "hall", name: "Hall", summary: "" },
      { ...metadata, id: "tower", name: "Tower", summary: "" },
    ],
    encounters: [
      {
        ...metadata,
        id: "encounter",
        title: "Meeting",
        description: "",
        sceneId: "scene",
        actorIds: ["actor"],
        alternativeSolutions: [],
      },
      {
        ...metadata,
        id: "elsewhere",
        title: "Elsewhere",
        description: "",
        locationId: "tower",
        alternativeSolutions: [],
      },
    ],
    actors: [
      { ...metadata, id: "actor", name: "Guard", summary: "On watch" },
      {
        ...metadata,
        id: "other-actor",
        name: "Keeper",
        summary: "Keeps the tower",
        locationId: "tower",
      },
    ],
    clues: [
      {
        ...metadata,
        id: "clue",
        text: "Tracks",
        placedActorId: "actor",
        reveals: "A hidden door",
      },
      {
        ...metadata,
        id: "other-clue",
        text: "Far away",
        placedLocationId: "tower",
      },
    ],
    items: [
      {
        ...metadata,
        id: "item",
        name: "Key",
        summary: "A key",
        actorId: "actor",
      },
    ],
    rumours: [
      {
        ...metadata,
        id: "rumour",
        text: "A tale",
        truth: "unverified",
        sourceActorId: "actor",
      },
    ],
    secrets: [
      {
        id: "secret",
        text: "A secret",
        visibility: "gm-only",
        epistemicStatus: "explicit",
        relatedEntityIds: ["clue"],
      },
      {
        id: "unrelated-secret",
        text: "Far away",
        visibility: "gm-only",
        epistemicStatus: "explicit",
        relatedEntityIds: ["elsewhere"],
      },
    ],
  });

  it("admits linked tiers in priority order and does not select secrets as anchors", () => {
    const selection = selectExcerpts(pkg, {}, "scene", 4000);
    expect(selection.excerpts.map((e) => e.id)).toEqual([
      "scene",
      "premise",
      "hall",
      "encounter",
      "actor",
      "clue",
      "clue",
      "item",
      "rumour",
      "rumour",
      "secret",
    ]);
    expect(selection.selectedIds.has("secret")).toBe(false);
    expect(selection.excerpts.some((e) => e.id === "elsewhere")).toBe(false);
    expect(selection.truncated).toBe(false);
  });

  it("uses an explicit location and focused actors without changing scene priority", () => {
    const selection = selectExcerpts(
      pkg,
      { locationId: "tower", actorIds: ["actor"] },
      "scene",
      4000,
    );
    const ids = selection.excerpts.map((e) => e.id);
    expect(ids.slice(0, 5)).toEqual([
      "scene",
      "premise",
      "tower",
      "encounter",
      "elsewhere",
    ]);
    expect(ids).toContain("other-actor");
    expect(ids).toContain("other-clue");
    expect(ids).toContain("unrelated-secret");
  });

  it("does not inspect later tier text when the focus exhausts its budget", () => {
    const oversized = makePackage({
      ...pkg,
      scenes: [{ ...pkg.scenes[0]!, body: "x".repeat(10000) }],
      actors: [
        {
          ...metadata,
          id: "actor",
          summary: "On watch",
          get name(): never {
            throw new Error("Actor text was read");
          },
        },
      ],
    });
    const selection = selectExcerpts(oversized, {}, "scene", 300);
    expect(selection.excerpts.map((e) => e.id)).toEqual(["scene"]);
    expect(selection.truncated).toBe(true);
  });
});
