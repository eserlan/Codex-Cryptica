import { describe, expect, it } from "vitest";
import { resolveVisionSourceTokens, visionRangeToPixels } from "./vtt-vision";
import type { Token } from "../../../types/vtt";

function createToken(overrides: Partial<Token> = {}): Token {
  return {
    id: "t1",
    entityId: null,
    name: "Token",
    x: 0,
    y: 0,
    width: 50,
    height: 50,
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

describe("resolveVisionSourceTokens", () => {
  const pcA = createToken({ id: "pc-a", isVisionSource: true });
  const pcB = createToken({ id: "pc-b", isVisionSource: true });
  const npc = createToken({ id: "npc", isVisionSource: false });

  it("party mode returns all vision-source tokens regardless of selection", () => {
    const tokens = [pcA, pcB, npc];
    expect(resolveVisionSourceTokens(tokens, "party", "npc")).toEqual([
      pcA,
      pcB,
    ]);
    expect(resolveVisionSourceTokens(tokens, "party", null)).toEqual([
      pcA,
      pcB,
    ]);
  });

  it("selected mode returns only the selected PC token", () => {
    const tokens = [pcA, pcB, npc];
    expect(resolveVisionSourceTokens(tokens, "selected", "pc-b")).toEqual([
      pcB,
    ]);
  });

  it("selected mode falls back to Party Vision when an NPC is selected", () => {
    const tokens = [pcA, pcB, npc];
    expect(resolveVisionSourceTokens(tokens, "selected", "npc")).toEqual([
      pcA,
      pcB,
    ]);
  });

  it("selected mode falls back to Party Vision when nothing is selected", () => {
    const tokens = [pcA, pcB, npc];
    expect(resolveVisionSourceTokens(tokens, "selected", null)).toEqual([
      pcA,
      pcB,
    ]);
  });

  it("selected mode falls back to Party Vision when the selection doesn't resolve to a live token", () => {
    const tokens = [pcA, pcB, npc];
    expect(
      resolveVisionSourceTokens(tokens, "selected", "missing-token"),
    ).toEqual([pcA, pcB]);
  });
});

describe("visionRangeToPixels", () => {
  it("converts 60' vision on a 5'-per-square grid to 12 grid squares in pixels", () => {
    expect(visionRangeToPixels(60, 5, 50)).toBe(600);
  });

  it("scales with grid square size in pixels, not just distance", () => {
    // Same 60' vision, but each square renders at 100px instead of 50px —
    // pixel radius should double even though the in-world distance is the same.
    expect(visionRangeToPixels(60, 5, 100)).toBe(1200);
  });

  it("falls back to treating the range as already-pixels when gridDistance is not positive", () => {
    expect(visionRangeToPixels(300, 0, 50)).toBe(300);
    expect(visionRangeToPixels(300, -1, 50)).toBe(300);
  });
});
