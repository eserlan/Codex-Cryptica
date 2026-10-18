import { describe, expect, it } from "vitest";
import {
  TOV_DOOM_FIELD_ID,
  TOV_DOOM_REFERENCE,
  adjustTovDoom,
  isTovDoomField,
} from "../src/rules-sources/tov-doom";
import {
  TOV_MONSTER_TEMPLATE_ID,
  TOV_NPC_TEMPLATE_ID,
  TOV_CHARACTER_TEMPLATE_ID,
} from "../src/rules-sources/tov-templates";

describe("TOV_DOOM_REFERENCE", () => {
  it("describes Doom as an encounter-level resource and clarifies the sheet counter", () => {
    expect(TOV_DOOM_REFERENCE.summary).toBe(
      "The optional BFRD Doom rule gives the GM a CR-based resource at the start of an encounter. The GM can spend it to give a creature advantage on an attack, give a PC disadvantage on a save, or once per encounter refresh, recharge, or gain one additional use of a limited-use feature.",
    );
    expect(TOV_DOOM_REFERENCE.note).toBe(
      "The published rule is encounter-level and can affect creatures in that encounter. Codex Cryptica currently exposes a counter on an individual ToV monster stat sheet as a tracking choice.",
    );
    expect(TOV_DOOM_REFERENCE.allocationGuidance).toBe(
      "Use the per-creature Doom counter on a ToV monster sheet or VTT token to track points allocated to that creature from the encounter's Doom pool; this storage model does not change the encounter-level BFRD rule.",
    );
  });
});

describe("isTovDoomField", () => {
  it("matches only counter fields named doom on the ToV Monster template", () => {
    expect(
      isTovDoomField(TOV_MONSTER_TEMPLATE_ID, {
        id: TOV_DOOM_FIELD_ID,
        type: "counter",
      }),
    ).toBe(true);
  });

  it("does not match non-counter fields named doom", () => {
    expect(
      isTovDoomField(TOV_MONSTER_TEMPLATE_ID, {
        id: TOV_DOOM_FIELD_ID,
        type: "number",
      }),
    ).toBe(false);
  });

  it("does not match character or NPC templates", () => {
    expect(
      isTovDoomField(TOV_CHARACTER_TEMPLATE_ID, {
        id: TOV_DOOM_FIELD_ID,
        type: "counter",
      }),
    ).toBe(false);
    expect(
      isTovDoomField(TOV_NPC_TEMPLATE_ID, {
        id: TOV_DOOM_FIELD_ID,
        type: "counter",
      }),
    ).toBe(false);
  });

  it("does not match arbitrary templates or null", () => {
    expect(
      isTovDoomField("custom-monster", {
        id: TOV_DOOM_FIELD_ID,
        type: "counter",
      }),
    ).toBe(false);
    expect(
      isTovDoomField(null, {
        id: TOV_DOOM_FIELD_ID,
        type: "counter",
      }),
    ).toBe(false);
    expect(
      isTovDoomField(undefined, {
        id: TOV_DOOM_FIELD_ID,
        type: "counter",
      }),
    ).toBe(false);
  });
});

describe("adjustTovDoom", () => {
  it("increments within bounds", () => {
    const res = adjustTovDoom(3, 1, 10);
    expect(res).toEqual({ value: 4, clamped: false });
  });

  it("decrements within bounds", () => {
    const res = adjustTovDoom(3, -1, 10);
    expect(res).toEqual({ value: 2, clamped: false });
  });

  it("clamps at 0 and provides a reason", () => {
    const res = adjustTovDoom(0, -1, 10);
    expect(res.value).toBe(0);
    expect(res.clamped).toBe(true);
    expect(res.reason).toMatch(/cannot fall below 0/i);
  });

  it("clamps at maximum and provides a reason", () => {
    const res = adjustTovDoom(10, 1, 10);
    expect(res.value).toBe(10);
    expect(res.clamped).toBe(true);
    expect(res.reason).toMatch(/cannot exceed 10/i);
  });

  it("handles non-finite current values safely", () => {
    const res = adjustTovDoom(NaN, 1, 10);
    expect(res.value).toBe(0);
    expect(res.clamped).toBe(true);
  });

  it("defaults maximum to TOV_DOOM_REFERENCE.defaultMax (10)", () => {
    const res = adjustTovDoom(10, 2);
    expect(res.value).toBe(TOV_DOOM_REFERENCE.defaultMax);
    expect(res.clamped).toBe(true);
  });
});
