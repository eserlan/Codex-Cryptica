import { describe, expect, it } from "vitest";
import {
  TOV_LUCK_FIXTURE,
  TOV_LUCK_REFERENCE,
  TOV_CHARACTER_TEMPLATE_ID,
  TOV_NPC_TEMPLATE_ID,
  adjustTovLuck,
  isTovLuckField,
} from "../src";

describe("ToV Luck rules", () => {
  it("matches every BFRD fixture scenario", () => {
    for (const s of TOV_LUCK_FIXTURE.scenarios) {
      const delta = s.action === "spend_on_roll" ? -s.amount : s.amount;
      expect(adjustTovLuck(s.startingLuck, delta).value, s.name).toBe(
        s.expectedLuck,
      );
    }
  });

  it("states the BFRD rules: start at 0, gain on a miss or failed save, d4 overflow", () => {
    expect(TOV_LUCK_FIXTURE.startingLuck).toBe(0);
    expect(TOV_LUCK_REFERENCE.earn).toContain(
      "miss with an attack roll or fail a save",
    );
    expect(TOV_LUCK_REFERENCE.spend).toContain("spend 3 Luck");
    expect(TOV_LUCK_REFERENCE.overflow).toContain("roll a d4");
  });

  it("does not claim ability checks earn Luck or that a Long Rest resets it", () => {
    const text = Object.values(TOV_LUCK_REFERENCE).join(" ");
    expect(text).not.toMatch(/ability check/i);
    expect(text).not.toMatch(/completing a long rest/i);
    expect(TOV_LUCK_REFERENCE.overflow).toContain("no Long Rest reset");
  });

  it("reports cap and floor instead of hiding them", () => {
    expect(adjustTovLuck(5, 1)).toMatchObject({
      value: 5,
      clamped: true,
      reason: "Luck cannot go above 5. Roll 1d4 and set Luck to the result.",
    });
    expect(adjustTovLuck(1, -3)).toMatchObject({ value: 0, clamped: true });
  });

  it("honours an imported cap above the default", () => {
    expect(adjustTovLuck(5, 1, 7)).toEqual({ value: 6, clamped: false });
  });

  it("allows spending down an imported value above its cap", () => {
    expect(adjustTovLuck(7, -1, 5)).toEqual({ value: 6, clamped: false });
  });

  it("rejects zero and fractional changes", () => {
    expect(adjustTovLuck(2, 0)).toMatchObject({ value: 2, clamped: true });
    expect(adjustTovLuck(2, 0.5)).toMatchObject({ value: 2, clamped: true });
  });

  it("is reversible within bounds", () => {
    const up = adjustTovLuck(2, 1).value;
    expect(adjustTovLuck(up, -1).value).toBe(2);
  });

  it("identifies only ToV luck counters", () => {
    const luck = { id: "luck", type: "counter" } as const;
    expect(isTovLuckField(TOV_CHARACTER_TEMPLATE_ID, luck)).toBe(true);
    expect(isTovLuckField(TOV_NPC_TEMPLATE_ID, luck)).toBe(true);
    expect(isTovLuckField("builtin-mythras-character", luck)).toBe(false);
    expect(isTovLuckField(null, luck)).toBe(false);
    expect(
      isTovLuckField(TOV_CHARACTER_TEMPLATE_ID, { id: "lp", type: "counter" }),
    ).toBe(false);
    expect(
      isTovLuckField(TOV_CHARACTER_TEMPLATE_ID, { id: "luck", type: "number" }),
    ).toBe(false);
  });

  it("records the pinned source", () => {
    expect(TOV_LUCK_REFERENCE.source).toContain("BFRD");
    expect(TOV_LUCK_REFERENCE.source).toContain("CC-BY-4.0");
  });
});
