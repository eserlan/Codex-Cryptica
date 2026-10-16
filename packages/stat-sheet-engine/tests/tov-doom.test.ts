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
