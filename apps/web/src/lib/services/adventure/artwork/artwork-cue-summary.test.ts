import { describe, expect, it } from "vitest";
import type { ArtworkAsset } from "@codex/adventure-artwork-engine";
import { summarizeArtworkCues } from "./artwork-cue-summary";

const locationAsset = {
  id: "loc-fantasy-river-01",
  version: 1,
  type: "location",
  genres: ["fantasy"],
  primaryCues: ["river"],
  settingCues: [],
  moodCues: [],
  timeCues: [],
  excludes: [],
  alt: "River crossing",
  variants: { display: { sha256: "a".repeat(64) } },
  provenance: { attribution: "Artist" },
  review: { status: "approved" },
} as unknown as ArtworkAsset;

describe("summarizeArtworkCues", () => {
  it("reports place and NPC cues with their catalogue match or missing status", () => {
    const summary = summarizeArtworkCues(
      {
        vaultId: "v1",
        currentPlaceId: "p1",
        places: [
          {
            id: "p1",
            name: "Kettleford",
            sourceRecordId: "kettleford",
            cues: ["village", "river", "busy"],
          },
        ],
        visibleState: {
          activeCharacters: [
            {
              id: "npc-1",
              text: "Mill apprentice, a wary worker and human.",
              source: "provisional",
              placeId: "p1",
            },
          ],
        },
      },
      "v1",
      {},
      true,
      "fantasy",
      [locationAsset],
    );

    expect(summary).toEqual({
      genre: "fantasy",
      place: {
        name: "Kettleford",
        cues: ["village", "river", "busy"],
        match: "loc-fantasy-river-01",
      },
      npcs: [
        {
          name: "Mill apprentice",
          cues: ["worker", "human"],
          match: null,
        },
      ],
    });
  });

  it("returns null outside the active vault", () => {
    expect(
      summarizeArtworkCues(
        { vaultId: "v1", places: [] },
        "v2",
        {},
        true,
        "fantasy",
        [locationAsset],
      ),
    ).toBeNull();
  });

  it("passes the active theme to currentPlaceSelection when automatic is absent", () => {
    const neutralAsset = {
      ...locationAsset,
      id: "loc-neutral-river-01",
      genres: ["neutral"],
    } as unknown as ArtworkAsset;

    const summary = summarizeArtworkCues(
      {
        vaultId: "v1",
        currentPlaceId: "p1",
        places: [{ id: "p1", name: "Riverford", cues: ["river"] }],
      },
      "v1",
      {},
      true,
      "fantasy",
      [neutralAsset, locationAsset],
    );

    expect(summary?.place?.match).toBe("loc-fantasy-river-01");
  });
});
