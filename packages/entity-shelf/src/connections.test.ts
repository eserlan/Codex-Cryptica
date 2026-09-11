import { describe, expect, it } from "vitest";
import { resolveReference } from "./connections";

const batch = [
  { entryId: "entry-1", sourceEntityId: "goblin", mintedId: "goblin-2" },
  {
    entryId: "entry-2",
    sourceEntityId: "goblin-king",
    mintedId: "goblin-king",
  },
];

const referencedTitles = {
  "goblin-king": { title: "Goblin King", aliases: ["The Gob"] },
  outsider: { title: "Shrine of Ash", aliases: [] },
};

describe("resolveReference", () => {
  it("reconnects an edge whose target came along in the same batch (US2-2, SC-003)", () => {
    expect(
      resolveReference({
        ref: "goblin-king",
        referencedTitles,
        batch,
        existing: [],
      }),
    ).toEqual({ resolvedId: "goblin-king" });
  });

  it("prefers the batch over a same-named entity already in the target vault", () => {
    // Importing a faction with its members should wire them to each other, not
    // to whatever happened to share a name in the destination.
    expect(
      resolveReference({
        ref: "goblin-king",
        referencedTitles,
        batch,
        existing: [{ id: "some-other", title: "Goblin King", aliases: [] }],
      }),
    ).toEqual({ resolvedId: "goblin-king" });
  });

  it("reconnects to an entity in the target vault matched by title (US2-3)", () => {
    expect(
      resolveReference({
        ref: "outsider",
        referencedTitles,
        batch: [],
        existing: [{ id: "shrine", title: "Shrine of Ash", aliases: [] }],
      }),
    ).toEqual({ resolvedId: "shrine" });
  });

  it("matches case-insensitively, consistently with collision detection (research R5)", () => {
    expect(
      resolveReference({
        ref: "outsider",
        referencedTitles,
        batch: [],
        existing: [{ id: "shrine", title: "  shrine of ash ", aliases: [] }],
      }),
    ).toEqual({ resolvedId: "shrine" });
  });

  it("reconnects via an alias on the destination entity", () => {
    expect(
      resolveReference({
        ref: "outsider",
        referencedTitles,
        batch: [],
        existing: [
          {
            id: "shrine",
            title: "The Ashen Shrine",
            aliases: ["Shrine of Ash"],
          },
        ],
      }),
    ).toEqual({ resolvedId: "shrine" });
  });

  it("reports not-found when nothing matches, rather than failing (FR-018)", () => {
    expect(
      resolveReference({
        ref: "outsider",
        referencedTitles,
        batch: [],
        existing: [{ id: "elsewhere", title: "Somewhere Else", aliases: [] }],
      }),
    ).toEqual({ resolvedId: null, reason: "not-found" });
  });

  it("declines to choose between two matching candidates (FR-018)", () => {
    // A dropped connection is recoverable; a wrongly attached one is not,
    // because the author has no reason to go looking for it.
    expect(
      resolveReference({
        ref: "outsider",
        referencedTitles,
        batch: [],
        existing: [
          { id: "shrine-a", title: "Shrine of Ash", aliases: [] },
          { id: "shrine-b", title: "shrine of ash", aliases: [] },
        ],
      }),
    ).toEqual({ resolvedId: null, reason: "ambiguous" });
  });

  it("reports not-found when the source vault never had the target either", () => {
    expect(
      resolveReference({
        ref: "never-existed",
        referencedTitles,
        batch: [],
        existing: [{ id: "shrine", title: "Shrine of Ash", aliases: [] }],
      }),
    ).toEqual({ resolvedId: null, reason: "not-found" });
  });
});
