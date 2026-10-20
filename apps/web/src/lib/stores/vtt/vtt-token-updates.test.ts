import { describe, expect, it } from "vitest";
import { VTTTokenDefaults } from "./vtt-token-defaults";
import { VTTTokenGeometry } from "./vtt-token-geometry";
import {
  moveLinkedTokens,
  tokenGeometryChanged,
  tokenPositionChanged,
  updatedToken,
} from "./vtt-token-updates";

const defaults = new VTTTokenDefaults(
  { getMapStore: () => ({}), getActiveLayer: () => "token" },
  () => 0,
);
const geometry = new VTTTokenGeometry(() => ({ activeMap: null }));
const makeToken = () => defaults.getTokenDefaults({ name: "Hero", x: 0, y: 0 });

describe("token updates", () => {
  it("rounds movement and normalizes rotation without changing the source", () => {
    const source = makeToken();
    const result = updatedToken(
      source.id,
      source,
      { x: 12.345, rotation: 450 },
      { [source.id]: source },
      geometry,
    );
    expect(result).toMatchObject({ x: 12.35, y: 0, rotation: 90 });
    expect(source).toMatchObject({ x: 0, rotation: 0 });
  });

  it("does not snap metadata-only changes", () => {
    const source = { ...makeToken(), x: 37, width: 35 };
    const grid = new VTTTokenGeometry(() => ({
      activeMap: { dimensions: { width: 1000, height: 1000 } },
      showGrid: true,
      gridSize: 50,
      gridOffsetX: 0,
      gridOffsetY: 0,
    }));
    expect(
      updatedToken(source.id, source, { locked: true }, {}, grid),
    ).toMatchObject({ x: 37, width: 35, locked: true });
    expect(tokenGeometryChanged({ rotation: 90 })).toBe(false);
    expect(tokenGeometryChanged({ width: 25 })).toBe(true);
    expect(tokenPositionChanged({ x: 0 })).toBe(true);
  });

  it("moves direct child notes by the final rounded displacement", () => {
    const source = makeToken();
    const child = {
      ...makeToken(),
      id: "child",
      parentTokenId: source.id,
      x: 1.234,
      y: 2.345,
    };
    const grandchild = {
      ...makeToken(),
      id: "grandchild",
      parentTokenId: child.id,
    };
    const tokens = { [child.id]: child, [grandchild.id]: grandchild };
    moveLinkedTokens(
      tokens,
      source.id,
      source,
      { ...source, x: 10, y: -20 },
      { x: 10, y: -20 },
    );
    expect(tokens.child).toMatchObject({ x: 11.23, y: -17.65 });
    expect(tokens.grandchild).toBe(grandchild);
  });

  it("does not move children on size-only updates or an unchanged position", () => {
    const source = makeToken();
    const child = { ...makeToken(), id: "child", parentTokenId: source.id };
    const tokens = { child };
    moveLinkedTokens(
      tokens,
      source.id,
      source,
      { ...source, x: 10 },
      { width: 100 },
    );
    moveLinkedTokens(tokens, source.id, source, source, { x: 0 });
    expect(tokens.child).toBe(child);
  });

  it("magnetically aligns tiles but does not include the tile being moved", () => {
    const source = {
      ...makeToken(),
      id: "moving",
      kind: "tile" as const,
      x: 150,
      width: 150,
      height: 150,
    };
    const anchor = { ...source, id: "anchor", x: 0 };
    expect(
      updatedToken(
        source.id,
        source,
        { x: 156, y: -4 },
        { moving: source, anchor },
        geometry,
      ),
    ).toMatchObject({ x: 150, y: 0 });
  });
});
