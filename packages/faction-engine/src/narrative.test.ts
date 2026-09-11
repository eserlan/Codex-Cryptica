import { describe, expect, it } from "vitest";
import { BAND_ORDER } from "./bands";
import { buildTemplateNarrative } from "./narrative";
import type { FactionResolution, OutcomeBandId } from "./types";

function resolution(band: OutcomeBandId): FactionResolution {
  return {
    actingRole: "influence",
    actingFieldId: "fld_sway",
    actingLabel: "Political Reach",
    actingValue: 6,
    opposingValue: 5,
    oppositionSource: "baseline",
    oppositionDetail: "Held by no faction; vault baseline.",
    modifiers: [],
    roll: { formula: "1d10", total: 7, dice: [7] },
    total: 13,
    mechanicalBand: band,
    permittedBands: [band],
    finalBand: band,
    aiUsed: false,
  };
}

/**
 * This is the FR-021d fallback: the reason a turn can never be blocked by AI
 * being unavailable. It must be synchronous, total, and never throw.
 */
describe("buildTemplateNarrative", () => {
  it("produces non-empty prose for all five bands", () => {
    for (const band of BAND_ORDER) {
      const text = buildTemplateNarrative(
        resolution(band),
        "Black Eagles",
        "Mub Territory",
      );
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  it("names both the faction and the target in every band", () => {
    for (const band of BAND_ORDER) {
      const text = buildTemplateNarrative(
        resolution(band),
        "Black Eagles",
        "Mub Territory",
      );
      expect(text).toContain("Black Eagles");
      expect(text).toContain("Mub Territory");
    }
  });

  it("reads differently for each band", () => {
    const texts = BAND_ORDER.map((band) =>
      buildTemplateNarrative(resolution(band), "Black Eagles", "Mub Territory"),
    );
    expect(new Set(texts).size).toBe(BAND_ORDER.length);
  });

  it("is deterministic for identical input", () => {
    const first = buildTemplateNarrative(
      resolution("success"),
      "Black Eagles",
      "Mub Territory",
    );
    const second = buildTemplateNarrative(
      resolution("success"),
      "Black Eagles",
      "Mub Territory",
    );
    expect(first).toBe(second);
  });

  it("works with a null roll (no-randomness mode)", () => {
    const deterministic = { ...resolution("mixed"), roll: null };
    expect(() =>
      buildTemplateNarrative(deterministic, "Black Eagles", "Mub Territory"),
    ).not.toThrow();
  });

  it("does not throw on empty titles", () => {
    // Defensive: a deleted or half-created entity should degrade, not crash the
    // whole turn, since this function is the last line of defence when AI fails.
    expect(() =>
      buildTemplateNarrative(resolution("failure"), "", ""),
    ).not.toThrow();
  });

  it("avoids naming dice, bands, or other mechanics in user-facing prose", () => {
    // Constitution IX: the account is what the GM reads. The numbers already
    // have their own display in the resolution breakdown.
    for (const band of BAND_ORDER) {
      const text = buildTemplateNarrative(
        resolution(band),
        "Black Eagles",
        "Mub Territory",
      ).toLowerCase();
      expect(text).not.toContain("band");
      expect(text).not.toContain("d10");
      expect(text).not.toContain("roll");
    }
  });
});
