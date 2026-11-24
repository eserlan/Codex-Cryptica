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
  it("omits visible entity names from unmapped telemetry cues", () => {
    const summary = summarizeArtworkCues(
      {
        vaultId: "v1",
        currentPlaceId: "p1",
        places: [
          { id: "p1", name: "Kettleford", cues: ["Kettleford", "salt garden"] },
        ],
        visibleState: {
          activeCharacters: [
            {
              id: "npc-1",
              text: "Mira Vale, a wary traveller.",
              cues: ["Mira Vale", "ledger-keeper"],
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
      [],
    );

    expect(summary?.place?.unmappedCues).toEqual(["salt garden"]);
    expect(summary?.npcs[0]?.unmappedCues).toEqual(["ledger-keeper"]);
  });

  it("omits a name cue embedded in a longer visible fact", () => {
    const summary = summarizeArtworkCues(
      {
        vaultId: "v1",
        visibleState: {
          activeCharacters: [
            {
              id: "npc-1",
              text: "Mira Vale is waiting by the old mill",
              cues: ["Mira Vale", "old mill", "ledger-keeper"],
              source: "provisional",
            },
          ],
        },
      },
      "v1",
      {},
      true,
      "fantasy",
      [],
    );

    expect(summary?.npcs[0]?.unmappedCues).toEqual(["ledger-keeper"]);
  });

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
      atmosphere: {
        cues: ["busy"],
        unmappedCues: [],
        match: null,
      },
      place: {
        name: "Kettleford",
        cues: ["village", "river", "busy"],
        unmappedCues: [],
        match: "loc-fantasy-river-01",
      },
      npcs: [
        {
          name: "Mill apprentice",
          cues: ["worker", "human"],
          unmappedCues: [],
          demographicCues: [],
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

  it("summarizes scene, atmosphere, and Creature/monster entries separately from NPCs", () => {
    const summary = summarizeArtworkCues(
      {
        vaultId: "v1",
        currentPlaceId: "p1",
        currentSituation: "Exploring dark ruins at night in the rain.",
        places: [
          {
            id: "p1",
            name: "Flooded Crypt",
            cues: ["ruins", "ominous", "night"],
          },
        ],
        visibleState: {
          activeCharacters: [
            {
              id: "m1",
              text: "Salt Stalker, a blind reef aberration.",
              source: "canonical",
              sourceRecordId: "ent-monster-1",
              cues: ["monster", "salt-stalker"],
            },
            {
              id: "c1",
              text: "Ivenna Surr, human scholar.",
              source: "provisional",
              cues: ["human", "scholar"],
            },
          ],
        },
      },
      "v1",
      {
        "ent-monster-1": { id: "ent-monster-1", type: "Creature" },
      },
      true,
      "fantasy",
      [locationAsset],
    );

    expect(summary?.atmosphere).toEqual({
      cues: ["ominous", "night", "rain"],
      unmappedCues: [],
      match: null,
    });
    expect(summary?.scene?.cues).toContain("ruins");
    expect(summary?.npcs.map((n) => n.name)).toEqual(["Ivenna Surr"]);
    expect(summary?.monsters).toEqual([
      {
        name: "Salt Stalker",
        cues: [],
        unmappedCues: ["monster"],
        match: null,
      },
    ]);
  });
});
