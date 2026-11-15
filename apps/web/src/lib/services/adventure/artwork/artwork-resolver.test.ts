import { describe, expect, it } from "vitest";
import {
  describeVisiblePlace,
  describeVisiblePerson,
  artworkGenreForTheme,
} from "./artwork-resolver";
describe("visible artwork subject", () => {
  it("derives bounded catalogue cues from a visible place", () => {
    expect(
      describeVisiblePlace(
        { id: "p1", name: "Forest road", sourceRecordId: "r1" },
        "fantasy",
      ),
    ).toEqual({
      subject: { kind: "entity", id: "r1" },
      type: "location",
      genre: "fantasy",
      primaryCues: ["forest", "road"],
    });
  });
  it("reads explicit place.cues even when the place name has no catalogue cue words", () => {
    expect(
      describeVisiblePlace(
        { id: "p2", name: "Oslo", cues: ["city", "harbour"] },
        "fantasy",
      ),
    ).toEqual({
      subject: { kind: "place", id: "p2" },
      type: "location",
      genre: "fantasy",
      primaryCues: ["city", "harbour"],
    });
  });
  it("does not invent a subject or use unknown theme defaults", () => {
    expect(describeVisiblePlace(undefined, "fantasy")).toBeNull();
    expect(artworkGenreForTheme("workspace")).toBeUndefined();
    expect(artworkGenreForTheme("unknown")).toBeUndefined();
    expect(artworkGenreForTheme("scifi_light")).toBe("science-fiction");
  });

  it("extracts normalized NPC cues from visible person, aliases, entity metadata, and facts", () => {
    expect(
      describeVisiblePerson(
        {
          id: "npc-1",
          name: "Lyra",
          aliases: ["Elf Traveller"],
          sourceRecordId: "ent-1",
        },
        "fantasy",
        {
          entity: {
            id: "ent-1",
            type: "character",
            kind: "ranger",
            labels: ["woodland", "scout"],
            aliases: ["Grey Wizard"],
          },
          facts: ["Lyra is a dwarf-friend and seasoned guard."],
        },
      ),
    ).toEqual({
      subject: { kind: "entity", id: "ent-1" },
      type: "npc",
      genre: "fantasy",
      primaryCues: ["elf", "traveller", "ranger", "wizard", "dwarf", "guard"],
      settingCues: ["woodland"],
    });
  });

  it("normalizes role synonyms and partitions setting cues from person cues", () => {
    expect(
      describeVisiblePerson(
        { id: "n1", name: "Brother Tomas", aliases: ["Village Priest"] },
        "fantasy",
      ),
    ).toMatchObject({ primaryCues: ["cleric"], settingCues: ["village"] });

    expect(
      describeVisiblePerson(
        { id: "n2", name: "Alden", aliases: ["Reeve of Oakhaven"] },
        "fantasy",
        { facts: ["Alden is the village reeve."] },
      ),
    ).toMatchObject({ primaryCues: ["elder"], settingCues: ["village"] });

    expect(
      describeVisiblePerson(
        { id: "n3", name: "Vane", aliases: ["High Magistrate"] },
        "fantasy",
        { facts: ["Presides as city judge."] },
      ),
    ).toMatchObject({ primaryCues: ["official"], settingCues: ["city"] });

    expect(
      describeVisiblePerson(
        { id: "n4", name: "Pip", aliases: ["Street Child"] },
        "fantasy",
        { facts: ["A ragged beggar in the market."] },
      ),
    ).toMatchObject({ primaryCues: ["urchin"], settingCues: ["market"] });

    expect(
      describeVisiblePerson(
        { id: "n5", name: "Vex", aliases: ["Highwayman"] },
        "fantasy",
        { facts: ["An outlaw on the forest road."] },
      ),
    ).toMatchObject({
      primaryCues: ["bandit"],
      settingCues: ["forest", "road"],
    });

    expect(
      describeVisiblePerson(
        { id: "n6", name: "Mab", aliases: ["Swamp Seer"] },
        "fantasy",
        { facts: ["An oracle and fortune teller."] },
      ),
    ).toMatchObject({ primaryCues: ["witch"], settingCues: ["swamp"] });

    expect(
      describeVisiblePerson(
        { id: "n7", name: "Barnaby", aliases: ["Tavern Keeper"] },
        "fantasy",
        {
          facts: [
            "Barkeep and blacksmith's friend, or minstrel thief herbalist",
          ],
        },
      ),
    ).toMatchObject({
      primaryCues: ["innkeeper", "smith", "bard", "rogue", "healer"],
    });
  });

  it("returns null for missing person and empty cues for unknown descriptors", () => {
    expect(describeVisiblePerson(undefined, "fantasy")).toBeNull();
    expect(
      describeVisiblePerson(
        { id: "npc-2", name: "Xyzzy", aliases: ["Qux"] },
        "fantasy",
      ),
    ).toEqual({
      subject: { kind: "person", id: "npc-2" },
      type: "npc",
      genre: "fantasy",
      primaryCues: [],
    });
  });
});
