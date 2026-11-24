import { describe, expect, it } from "bun:test";
import { harvestSnapshot } from "./harvest-adventure-cues";

describe("harvestSnapshot", () => {
  it("extracts privacy-safe location and NPC cue tuples without names", () => {
    const items = harvestSnapshot({
      state: {
        places: [
          {
            id: "p1",
            name: "Twelve-Reed Court",
            cues: ["salt garden", "coast", "exterior", "ominous", "day"],
          },
        ],
        visibleState: {
          activeCharacters: [
            {
              id: "c1",
              text: "Ivenna Surr, a woman and meticulous keeper of tide ledgers.",
              cues: ["human", "scholar", "ledger-keeper", "tide ledgers"],
            },
          ],
        },
      },
    });

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      type: "location",
      genre: "fantasy",
      knownCues: ["coast", "day", "exterior", "ominous"],
      unmappedCues: ["salt garden"],
    });
    expect(items[1]).toMatchObject({
      type: "atmosphere",
      genre: "fantasy",
      knownCues: ["day", "ominous"],
    });
    expect(items[2]).toMatchObject({
      type: "npc",
      genre: "fantasy",
      knownCues: ["human", "scholar"],
      unmappedCues: ["ledger-keeper", "tide ledgers"],
      demographicCues: ["female"],
    });
    expect(JSON.stringify(items)).not.toContain("Ivenna");
    expect(JSON.stringify(items)).not.toContain("Twelve-Reed");
  });

  it("classifies monster/creature entries separately from NPCs", () => {
    const items = harvestSnapshot({
      state: {
        places: [],
        visibleState: {
          activeCharacters: [
            {
              id: "m1",
              text: "Salt Stalker",
              cues: ["monster", "salt-stalker"],
            },
          ],
        },
      },
    });
    expect(items).toEqual([
      {
        type: "monster",
        genre: "fantasy",
        knownCues: [],
        unmappedCues: ["monster", "salt-stalker"],
        demographicCues: [],
        matchedAssetId: null,
      },
    ]);
  });

  it("skips empty places and characters cleanly", () => {
    expect(
      harvestSnapshot({
        state: {
          places: [{ id: "p2", name: "Xyzzy", cues: [] }],
          visibleState: { activeCharacters: [] },
        },
      }),
    ).toEqual([]);
  });
});
