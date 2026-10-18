import { describe, expect, it } from "vitest";
import { applyReviewEdit, fieldState, switchReadResultKind } from "./review";
import type { ReadResult } from "./types";

function result(overrides: Partial<ReadResult> = {}): ReadResult {
  return {
    outcome: "ok",
    candidates: [],
    looksLike: "tov",
    kind: "creature",
    name: "Hill Brute",
    values: {
      cr: "3",
      ac: 13,
      hp: 45,
      abilityScores: { str: 18 },
      languages: "Giant",
      luck: undefined,
    } as ReadResult["values"],
    notes: [],
    leftovers: [],
    reader: "ai",
    corrected: [],
    ...overrides,
  };
}

describe("fieldState", () => {
  it("reports found, not found, check and derived values", () => {
    const r = result({
      notes: [
        { path: "ac", state: "check", reason: "not-in-source" },
        { path: "proficiencyBonus", state: "derived", reason: "from-cr" },
      ],
    });
    expect(fieldState(r, "hp")).toBe("found");
    expect(fieldState(r, "speed")).toBe("not-found");
    expect(fieldState(r, "ac")).toBe("check");
    expect(fieldState(r, "proficiencyBonus")).toBe("from-cr");
  });
});

describe("applyReviewEdit", () => {
  it("clears the note on an edited check value and marks it corrected", () => {
    const r = result({
      notes: [{ path: "ac", state: "check", reason: "not-in-source" }],
    });
    const edited = applyReviewEdit(r, "ac", 14);
    expect(edited.values).toMatchObject({ ac: 14 });
    expect(edited.notes.find((n) => n.path === "ac")).toBeUndefined();
    expect(fieldState(edited, "ac")).toBe("corrected");
  });

  it("makes a value not found again when the edit is cleared", () => {
    const edited = applyReviewEdit(result(), "hp", "");
    expect(fieldState(edited, "hp")).toBe("not-found");
    expect(edited.corrected).not.toContain("hp");
  });

  it("sets a nested ability score without disturbing its siblings", () => {
    const edited = applyReviewEdit(result(), "abilityScores.dex", 14);
    expect(edited.values).toMatchObject({
      abilityScores: { str: 18, dex: 14 },
    });
  });
});

describe("switchReadResultKind", () => {
  it("keeps shared values and moves the rest to leftovers", () => {
    const switched = switchReadResultKind(
      result({
        values: {
          cr: "3",
          ac: 13,
          hp: 45,
          languages: "Giant",
          traits: [{ name: "Brute Rage", description: "Rages." }],
        } as ReadResult["values"],
      }),
      "npc",
    );
    expect(switched.kind).toBe("npc");
    expect(switched.values).toMatchObject({ cr: "3", ac: 13, hp: 45 });
    expect(switched.values).not.toHaveProperty("languages");
    expect(switched.leftovers.map((l) => l.label)).toEqual(
      expect.arrayContaining(["Languages", "Traits"]),
    );
  });

  it("returns the same result when the kind does not change", () => {
    const r = result();
    expect(switchReadResultKind(r, "creature")).toBe(r);
  });
});
