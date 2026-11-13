import { describe, expect, it } from "vitest";
import type { AdventureSession } from "@codex/adventure-engine";
import type { ArtworkAsset } from "@codex/adventure-artwork-engine";
import { assignCommittedPlaceArtwork } from "./committed-place-artwork";

const asset = {
  id: "forest-1",
  version: 1,
  type: "location",
  genres: ["fantasy"],
  primaryCues: ["forest"],
  settingCues: [],
  moodCues: [],
  timeCues: [],
  excludes: [],
  review: { status: "approved" },
} as unknown as ArtworkAsset;
const session = (extra: object = {}) =>
  ({
    id: "s1",
    vaultId: "v1",
    revision: 1,
    currentPlaceId: "p1",
    places: [{ id: "p1", name: "Forest" }],
    turns: [{ id: "turn1" }],
    ...extra,
  }) as AdventureSession;

describe("committed place artwork", () => {
  it("adds a matching assignment to a committed transition without changing the candidate", () => {
    const previous = session({
      currentPlaceId: undefined,
      turns: [],
      revision: 0,
    });
    const next = session();
    const result = assignCommittedPlaceArtwork(
      previous,
      next,
      [asset],
      "fantasy",
      true,
    );
    expect(result.artwork).toEqual({
      version: 1,
      associations: [
        {
          subject: { kind: "place", id: "p1" },
          association: {
            version: 1,
            automatic: {
              assetId: "forest-1",
              catalogueVersion: 1,
              assignedOnTurnId: "turn1",
            },
          },
        },
      ],
    });
    expect(next.artwork).toBeUndefined();
  });
  it("never reranks on ordinary turns or when artwork is disabled", () => {
    const next = session();
    expect(
      assignCommittedPlaceArtwork(
        session({ revision: 0 }),
        next,
        [asset],
        "fantasy",
        true,
      ),
    ).toBe(next);
    expect(
      assignCommittedPlaceArtwork(
        session({ currentPlaceId: undefined }),
        next,
        [asset],
        "fantasy",
        false,
      ),
    ).toBe(next);
  });
  it("preserves unknown artwork and existing choices on a return", () => {
    const previous = session({ currentPlaceId: "p2" });
    for (const artwork of [
      { version: 2, data: "future" },
      {
        version: 1,
        associations: [
          {
            subject: { kind: "place", id: "p1" },
            association: { version: 1, override: { kind: "dismissed" } },
          },
        ],
      },
    ]) {
      const next = session({ artwork });
      expect(
        assignCommittedPlaceArtwork(previous, next, [asset], "fantasy", true),
      ).toBe(next);
    }
  });
  it("does not assign canonical places, uncommitted turns, or unsuitable matches", () => {
    const previous = session({ currentPlaceId: undefined, turns: [] });
    for (const next of [
      session({ places: [{ id: "p1", name: "Forest", sourceRecordId: "e1" }] }),
      session({ turns: [] }),
      session({ places: [{ id: "p1", name: "Castle" }] }),
    ]) {
      expect(
        assignCommittedPlaceArtwork(previous, next, [asset], "fantasy", true),
      ).toBe(next);
    }
  });
});
