import { describe, expect, it } from "vitest";
import { checkHeistSecurityStage } from "./heist-staged-security";
import type { JsonObject } from "./staged-runtime";
import {
  RESOLVED_THEFT,
  VALID_STAGE_1,
  VALID_STAGE_2,
} from "./heist-staged.fixtures";

describe("checkHeistSecurityStage", () => {
  it("accepts valid security rings with multiple bypass approaches", () => {
    const check = checkHeistSecurityStage(
      VALID_STAGE_2,
      VALID_STAGE_1,
      RESOLVED_THEFT,
    );
    expect(check.hard).toEqual([]);
    expect(check.soft).toEqual([]);
  });

  it("flags missing rings as hard problems", () => {
    const check = checkHeistSecurityStage(
      { rings: {} },
      VALID_STAGE_1,
      RESOLVED_THEFT,
    );
    expect(check.hard).toContain("missing required security ring: Perimeter");
    expect(check.hard).toContain("missing required security ring: Access");
    expect(
      check.hard.some((h) => h.includes("missing required security ring")),
    ).toBe(true);
  });

  it("flags rings with fewer than two distinct bypass approaches", () => {
    const singleApproach = {
      rings: {
        perimeter: "Guard dogs bark at anyone nearby with no way through.",
        access:
          "A locked oak portcullis bars access to the hall. Pass by picking the lever lock, or by presenting stolen deacon keys.",
        inner:
          "The inner reliquary sanctum guards the Sunstone Chalice behind an altar cage. Pass by using the deacon's prayer phrase, or lifting the brass hinges.",
      },
    };
    const check = checkHeistSecurityStage(
      singleApproach,
      VALID_STAGE_1,
      RESOLVED_THEFT,
    );
    expect(check.hard).toContain(
      "Perimeter ring does not describe at least two distinct bypass approaches.",
    );
  });

  it("flags inner ring that fails to guard Stage 1 objective", () => {
    const wrongInner = {
      rings: {
        perimeter:
          "Patrols circle the courtyard. Pass by timing their sweep or wearing pilgrim vestments.",
        access:
          "A portcullis is locked. Pass by picking the lock or crawling through ducts.",
        inner:
          "A reinforced glass cage holds an ancient dragon skull. Pass by breaking the glass or using magic.",
      },
    };
    const check = checkHeistSecurityStage(
      wrongInner,
      VALID_STAGE_1,
      RESOLVED_THEFT,
    );
    expect(
      check.hard.some((h) => h.includes("must guard the objective or prize")),
    ).toBe(true);
  });

  it("flags unanchored clocks lacking step count or trigger as soft", () => {
    const unanchoredClock = {
      ...VALID_STAGE_2,
      rings: {
        ...((VALID_STAGE_2.rings as JsonObject) ?? {}),
        access:
          "A watch clock ticks in the hall. Pass by picking the lock or climbing through vents.",
      },
    };
    const check = checkHeistSecurityStage(
      unanchoredClock,
      VALID_STAGE_1,
      RESOLVED_THEFT,
    );
    expect(check.soft).toContain(
      "Security rings introduce a clock without specifying its step count or advance trigger.",
    );
  });
});
