import { describe, expect, it } from "vitest";
import { findTileAtPoint, findTileBeneath } from "./tile-beneath";
import type { Token } from "./vtt";

function makeToken(overrides: Partial<Token>): Token {
  return {
    id: "t",
    entityId: null,
    name: "",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    zIndex: 0,
    ownerPeerId: null,
    ownerGuestName: null,
    visibleTo: "all",
    color: "#fff",
    imageUrl: null,
    statusEffects: [],
    ...overrides,
  };
}

describe("findTileBeneath", () => {
  it("finds the tile under the token's centre", () => {
    const tile = makeToken({ id: "forest", kind: "tile", layer: "terrain" });
    const party = makeToken({
      id: "party",
      x: 30,
      y: 30,
      width: 40,
      height: 40,
    });

    expect(findTileBeneath(party, [tile, party])?.id).toBe("forest");
  });

  it("returns null when the token stands on bare map", () => {
    const tile = makeToken({ id: "forest", kind: "tile" });
    const party = makeToken({
      id: "party",
      x: 500,
      y: 500,
      width: 40,
      height: 40,
    });

    expect(findTileBeneath(party, [tile, party])).toBeNull();
  });

  it("picks the nearest-centred tile where neighbouring hex boxes overlap", () => {
    // Two hexes whose bounding boxes overlap between x=75 and x=100.
    const west = makeToken({ id: "west", kind: "tile", x: 0, y: 0 });
    const east = makeToken({ id: "east", kind: "tile", x: 75, y: 50 });
    // Centre (95, 95) lies in both boxes but sits nearer the east hex's centre.
    const party = makeToken({
      id: "party",
      x: 85,
      y: 85,
      width: 20,
      height: 20,
    });

    expect(findTileBeneath(party, [west, east, party])?.id).toBe("east");
  });

  it("breaks a tie in favour of the tile drawn on top", () => {
    const lower = makeToken({ id: "lower", kind: "tile", zIndex: 1 });
    const upper = makeToken({ id: "upper", kind: "tile", zIndex: 5 });
    const party = makeToken({
      id: "party",
      x: 40,
      y: 40,
      width: 20,
      height: 20,
    });

    expect(findTileBeneath(party, [upper, lower, party])?.id).toBe("upper");
    expect(findTileBeneath(party, [lower, upper, party])?.id).toBe("upper");
  });

  it("ignores tokens and notes that are not tiles", () => {
    const other = makeToken({ id: "goblin" });
    const note = makeToken({ id: "note", kind: "note" });
    const party = makeToken({
      id: "party",
      x: 40,
      y: 40,
      width: 20,
      height: 20,
    });

    expect(findTileBeneath(party, [other, note, party])).toBeNull();
  });

  it("does not look beneath a tile or a note", () => {
    const tile = makeToken({ id: "forest", kind: "tile" });
    const smallTile = makeToken({
      id: "ruin",
      kind: "tile",
      x: 40,
      y: 40,
      width: 20,
      height: 20,
    });
    const note = makeToken({
      id: "note",
      kind: "note",
      x: 40,
      y: 40,
      width: 20,
      height: 20,
    });

    expect(findTileBeneath(smallTile, [tile, smallTile])).toBeNull();
    expect(findTileBeneath(note, [tile, note])).toBeNull();
  });
});

describe("findTileAtPoint", () => {
  it("excludes the given id", () => {
    const tile = makeToken({ id: "forest", kind: "tile" });
    expect(findTileAtPoint({ x: 50, y: 50 }, [tile], "forest")).toBeNull();
  });

  it("includes the rotated tile area outside its unrotated bounds", () => {
    const tile = makeToken({
      id: "rotated",
      kind: "tile",
      width: 100,
      height: 50,
      rotation: 90,
    });

    expect(findTileAtPoint({ x: 50, y: 60 }, [tile])?.id).toBe("rotated");
  });

  it("excludes unrotated bounding-box corners outside a rotated tile", () => {
    const tile = makeToken({
      id: "rotated",
      kind: "tile",
      width: 100,
      height: 100,
      rotation: 45,
    });

    expect(findTileAtPoint({ x: 5, y: 5 }, [tile])).toBeNull();
  });
});
