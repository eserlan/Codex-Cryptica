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
      primaryCues: [
        "elf",
        "traveller",
        "ranger",
        "woodland",
        "wizard",
        "dwarf",
        "guard",
      ],
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
