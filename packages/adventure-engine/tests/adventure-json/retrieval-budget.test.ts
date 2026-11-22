import { describe, expect, it } from "vitest";
import {
  addExcerpts,
  clampMaxCharacters,
  createExcerptAdmission,
  serialisedSize,
} from "../../src/adventure-json/retrieval-budget";
import type { AdventureJsonExcerpt } from "../../src/adventure-json/retrieval-types";

function excerpt(
  overrides: Partial<AdventureJsonExcerpt> = {},
): AdventureJsonExcerpt {
  return {
    id: "scene",
    kind: "scene",
    visibility: "player-visible",
    epistemicStatus: "explicit",
    text: "Body",
    ...overrides,
  };
}

describe("retrieval budget admission", () => {
  it("admits distinct companions, deduplicates excerpts, and selects only requested IDs", () => {
    const selection = createExcerptAdmission(1000);
    const scene = excerpt();
    const companion = excerpt({ visibility: "gm-only" });
    addExcerpts(selection, [scene, companion], true, true);
    addExcerpts(selection, scene, true);
    addExcerpts(selection, excerpt({ id: "premise", kind: "premise" }), false);
    expect(selection.excerpts).toEqual([
      scene,
      companion,
      excerpt({ id: "premise", kind: "premise" }),
    ]);
    expect([...selection.selectedIds]).toEqual(["scene"]);
    expect(selection.truncated).toBe(false);
  });

  it("stops at an oversized later record without trimming it or admitting successors", () => {
    const selection = createExcerptAdmission(300);
    addExcerpts(selection, excerpt(), true, true);
    addExcerpts(
      selection,
      excerpt({ id: "large", text: "x".repeat(1000) }),
      true,
    );
    addExcerpts(selection, excerpt({ id: "later" }), true);
    expect(selection.excerpts).toEqual([excerpt()]);
    expect(selection.truncated).toBe(true);
    expect(selection.stopped).toBe(true);
    expect(selection.invalidBudget).toBe(false);
  });

  it("trims focus text without splitting a surrogate pair and skips its companion", () => {
    const cap = serialisedSize([excerpt({ text: "a…" })]);
    const selection = createExcerptAdmission(cap);
    addExcerpts(
      selection,
      [excerpt({ text: "a😀body" }), excerpt({ visibility: "gm-only" })],
      true,
      true,
    );
    expect(selection.excerpts).toEqual([excerpt({ text: "a…" })]);
    expect(serialisedSize(selection.excerpts)).toBeLessThanOrEqual(cap);
  });

  it("drops optional focus metadata before rejecting a required envelope", () => {
    const selection = createExcerptAdmission(200);
    addExcerpts(
      selection,
      excerpt({ sourceRef: { chapter: "x".repeat(1000) } }),
      true,
      true,
    );
    expect(selection.excerpts[0]!.sourceRef).toBeUndefined();
    expect(selection.excerpts[0]!.text).toBe("Body");

    const invalid = createExcerptAdmission(10);
    addExcerpts(invalid, excerpt(), true, true);
    addExcerpts(invalid, excerpt(), true);
    expect(invalid.excerpts).toEqual([]);
    expect(invalid.invalidBudget).toBe(true);
  });

  it("bounds quotes and reports truncation when the rest fits", () => {
    const selection = createExcerptAdmission(1000);
    addExcerpts(
      selection,
      excerpt({
        visibility: "gm-only",
        sourceRef: { textQuote: "q".repeat(200) },
      }),
      true,
      true,
    );
    expect(selection.excerpts[0]!.sourceRef!.textQuote).toHaveLength(125);
    expect(selection.truncated).toBe(true);
    expect(selection.stopped).toBe(false);
  });

  it("clamps fractional, missing, invalid, and infinite budgets", () => {
    expect(clampMaxCharacters(undefined)).toBe(4000);
    expect(clampMaxCharacters(Infinity)).toBe(4000);
    expect(clampMaxCharacters(12.9)).toBe(12);
    for (const value of [NaN, -Infinity, -1, 0])
      expect(clampMaxCharacters(value)).toBe(0);
  });
});
