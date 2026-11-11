import { describe, expect, it } from "vitest";
import {
  linkPlaceRecords,
  MAX_PLACE_ALIASES,
  matchPlace,
  normalizePlaceName,
  requiredGroundingSources,
  withAlias,
  type AdventureSession,
  type Place,
} from "../src";
import { session } from "./reducer-fixtures";

const place = (
  id: string,
  name: string,
  extra: Partial<Place> = {},
): Place => ({
  id,
  name,
  ...extra,
});

describe("normalizing place names", () => {
  it.each([
    ["Tiny Village", "tiny village"],
    ["  the   Tiny, Village! ", "tiny village"],
    ["The Mill", "mill"],
    ["Café du Nord", "cafe du nord"],
    ["Theatre Row", "theatre row"],
    ["   ", ""],
  ])("%j becomes %j", (input, expected) => {
    expect(normalizePlaceName(input)).toBe(expected);
  });
});

describe("matching a name to a known place", () => {
  const places = [
    place("p-high", "Tiny village"),
    place("p-low", "Lower village", { aliases: ["The village below"] }),
    place("p-nombe", "Nombe"),
  ];

  it("matches the same name ignoring case, punctuation and a leading 'the'", () => {
    expect(matchPlace(places, "the TINY village!")).toEqual({
      place: places[0],
      extended: false,
    });
  });

  it("matches a recorded alias", () => {
    expect(matchPlace(places, "village below")?.place.id).toBe("p-low");
  });

  it("matches a longer name that continues a known multi-word name", () => {
    expect(
      matchPlace(places, "Tiny village in the high slopes of Nombe"),
    ).toEqual({ place: places[0], extended: true });
  });

  it.each([
    ["a longer name that continues only a one-word name", "Nombe slopes"],
    ["a shorter name than the known one", "Tiny"],
    ["a name that only shares letters at the start", "Tiny villager's hut"],
    ["an empty name", "  "],
    ["a different place", "The mill"],
  ])("does not match %s", (_label, name) => {
    expect(matchPlace(places, name)).toBeUndefined();
  });

  it("prefers the place with the longest name that the new name continues", () => {
    const both = [place("a", "Tiny village"), place("b", "Tiny village east")];
    expect(matchPlace(both, "Tiny village east gate")).toEqual({
      place: both[1],
      extended: true,
    });
    expect(matchPlace(both, "Tiny village square")?.place.id).toBe("a");
  });

  it("matches nothing when two places are equally good continuations", () => {
    const ambiguous = [
      place("a", "Old town"),
      place("b", "Old town", { aliases: undefined }),
    ];
    expect(matchPlace(ambiguous, "Old town hall")).toBeUndefined();
  });
});

describe("remembering name variants", () => {
  it("adds a variant once and keeps the original name", () => {
    const base = place("p", "Tiny village");
    const next = withAlias(base, "Tiny village in the high slopes");
    expect(next.name).toBe("Tiny village");
    expect(next.aliases).toEqual(["Tiny village in the high slopes"]);
    expect(withAlias(next, "tiny VILLAGE in the high slopes")).toBe(next);
    expect(withAlias(next, "the Tiny village")).toBe(next);
  });

  it("stops at the alias limit and ignores an empty name", () => {
    let current = place("p", "Tiny village");
    for (let i = 0; i < MAX_PLACE_ALIASES + 3; i += 1) {
      current = withAlias(current, `Tiny village variant ${i}`);
    }
    expect(current.aliases).toHaveLength(MAX_PLACE_ALIASES);
    expect(withAlias(current, "  ")).toBe(current);
  });
});

describe("linking places to Vault records", () => {
  const records = [
    { id: "r-nombe", title: "Nombe", type: "location" },
    { id: "r-orra", title: "Orra", type: "character" },
    { id: "r-mill-1", title: "The Mill", type: "location" },
    { id: "r-mill-2", title: "Mill", type: "location" },
  ];

  it("links a place by exact title, ignoring case", () => {
    const result = linkPlaceRecords([place("p", "nombe")], records);
    expect(result?.[0]).toEqual({
      id: "p",
      name: "nombe",
      sourceRecordId: "r-nombe",
    });
  });

  it("links by a recorded alias too", () => {
    const result = linkPlaceRecords(
      [place("p", "The big marsh", { aliases: ["Nombe"] })],
      records,
    );
    expect(result?.[0]?.sourceRecordId).toBe("r-nombe");
  });

  it("leaves a place alone when nothing matches exactly", () => {
    expect(
      linkPlaceRecords([place("p", "Nombe slopes")], records),
    ).toBeUndefined();
  });

  it("ignores records that are not locations", () => {
    expect(linkPlaceRecords([place("p", "Orra")], records)).toBeUndefined();
  });

  it("does not guess between two records with the same normalised title", () => {
    expect(linkPlaceRecords([place("p", "Mill")], records)).toBeUndefined();
  });

  it("keeps a link whose record still exists", () => {
    const places = [place("p", "Home", { sourceRecordId: "r-nombe" })];
    expect(linkPlaceRecords(places, records)).toBeUndefined();
  });

  it("drops a link whose record is gone, and only that link", () => {
    const places = [
      place("a", "Gone", { sourceRecordId: "deleted" }),
      place("b", "Nombe", { sourceRecordId: "r-nombe" }),
    ];
    const result = linkPlaceRecords(places, records)!;
    expect(result[0]).not.toHaveProperty("sourceRecordId");
    expect(result[1]).toBe(places[1]);
  });

  it("does nothing for a session with no places", () => {
    expect(linkPlaceRecords(undefined, records)).toBeUndefined();
    expect(linkPlaceRecords([], records)).toBeUndefined();
  });
});

describe("the current place's record as an anchor", () => {
  const withPlaces = (current: string | undefined): AdventureSession => {
    const s = session();
    s.places = [
      place("a", "Nombe", { sourceRecordId: "r-nombe" }),
      place("b", "The mill", { sourceRecordId: "r-mill" }),
      place("c", "Somewhere"),
    ];
    s.currentPlaceId = current;
    return s;
  };
  const ids = (s: AdventureSession) =>
    requiredGroundingSources(s).map((source) => source.recordId);

  it("anchors only the place the player is in", () => {
    expect(ids(withPlaces("a"))).toEqual(["r-nombe"]);
    expect(ids(withPlaces("b"))).toEqual(["r-mill"]);
  });

  it("anchors nothing for an unlinked or unknown place", () => {
    expect(ids(withPlaces("c"))).toEqual([]);
    expect(ids(withPlaces(undefined))).toEqual([]);
  });

  it("does not repeat a record the world entry already anchors", () => {
    const s = withPlaces("a");
    s.worldEntry = {
      version: 1,
      location: { kind: "canonical", recordId: "r-nombe", name: "Nombe" },
      intent: "explore",
    };
    expect(ids(s)).toEqual(["r-nombe"]);
  });
});
