import { describe, expect, it } from "bun:test";
import { pinsInHex, selectNearestLocation } from "../src/proximity";

const pin = (
  id: string,
  entityId: string | undefined,
  hex: { q: number; r: number } | undefined,
) => ({
  id,
  mapId: "map-1",
  entityId,
  coordinates: { x: 0, y: 0 },
  hexCoordinates: hex,
  visuals: {},
});

describe("pinsInHex (T021)", () => {
  const exists = (id: string) => id !== "gone";

  it("returns only pins on the hex whose entity still exists", () => {
    const pins = [
      pin("p1", "a", { q: 1, r: 2 }),
      pin("p2", "b", { q: 3, r: 4 }),
      pin("p3", "c", { q: 1, r: 2 }),
    ];
    const found = pinsInHex(pins, { q: 1, r: 2 }, exists);
    expect(found.map((p) => p.id)).toEqual(["p1", "p3"]);
  });

  it("excludes pins whose entity no longer exists", () => {
    const pins = [
      pin("p1", "gone", { q: 1, r: 2 }),
      pin("p2", "kept", { q: 1, r: 2 }),
    ];
    const found = pinsInHex(pins, { q: 1, r: 2 }, exists);
    expect(found.map((p) => p.id)).toEqual(["p2"]);
  });

  it("returns an empty list for a hex with no pins", () => {
    const pins = [pin("p1", "a", { q: 9, r: 9 })];
    expect(pinsInHex(pins, { q: 1, r: 2 }, exists)).toEqual([]);
  });

  it("ignores pins without hexCoordinates", () => {
    const pins = [pin("p1", "a", undefined)];
    expect(pinsInHex(pins, { q: 0, r: 0 }, exists)).toEqual([]);
  });

  it("ignores pins with no entity link", () => {
    const pins = [pin("p1", undefined, { q: 1, r: 2 })];
    expect(pinsInHex(pins, { q: 1, r: 2 }, exists)).toEqual([]);
  });
});

describe("selectNearestLocation (T057)", () => {
  const loc = (entityId: string, title: string, q: number, r: number) => ({
    entityId,
    title,
    hex: { q, r },
  });
  const origin = { q: 0, r: 0 };

  it("returns the nearest location within the default distance of 2", () => {
    const result = selectNearestLocation(
      [loc("far", "Far", 2, 0), loc("near", "Near", 1, 0)],
      origin,
    );
    expect(result).toEqual({ entityId: "near", title: "Near", distance: 1 });
  });

  it("respects an explicit maxDistance", () => {
    const result = selectNearestLocation([loc("a", "A", 2, 0)], origin, 1);
    expect(result).toBeNull();
  });

  it("breaks distance ties by title, then by id", () => {
    const byTitle = selectNearestLocation(
      [loc("z", "Beta", 1, 0), loc("a", "Alpha", 0, 1)],
      origin,
    );
    expect(byTitle?.entityId).toBe("a");

    const byId = selectNearestLocation(
      [loc("z", "Same", 1, 0), loc("a", "Same", 0, 1)],
      origin,
    );
    expect(byId?.entityId).toBe("a");
  });

  it("returns null when nothing is within 2 hexes", () => {
    expect(selectNearestLocation([loc("far", "Far", 3, 0)], origin)).toBeNull();
  });

  it("returns null for an empty candidate list", () => {
    expect(selectNearestLocation([], origin)).toBeNull();
  });
});
