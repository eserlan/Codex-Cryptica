import { describe, expect, it } from "vitest";
import { resolveVisionSourceTokens } from "./vtt-vision";
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
