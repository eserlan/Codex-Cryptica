import { describe, expect, it } from "vitest";
import { DEFAULT_FACTION_TURN_SETTINGS } from "schema";
import { evaluateEligibility, toWorldDateStamp } from "./eligibility";
import type { FactionTurnState, ResolvedWorldDate } from "./types";

const CAL = { monthsPerYear: 12, revision: 1 };

function resolved(
  source: ResolvedWorldDate["source"],
  year: number,
  month = 1,
  day?: number,
): ResolvedWorldDate {
  return { source, date: { year, month, day }, entityId: null };
}

function state(over: Partial<FactionTurnState> = {}): FactionTurnState {
  return { enabled: true, statRoles: {}, history: [], ...over };
}

/**
 * The trap this whole test file exists for.
 *
 * `resolveCalendarCurrentDate()`'s third tier returns the *real-world* date. In
 * a campaign set in year 640 that silently becomes the present-day year, every
 * faction is eligible forever, and history gets stamped in the wrong millennium.
 */
describe("real-world date is not campaign time (FR-008a)", () => {
  it("yields no-world-date, not eligibility", () => {
    const result = evaluateEligibility(
      state(),
      resolved("realWorld", 2026, 8, 21),
      DEFAULT_FACTION_TURN_SETTINGS,
      CAL,
    );
    expect(result.state).toBe("no-world-date");
    expect(result.canAct).toBe(false);
  });

  it("does not offer the pacing override, which would stamp the wrong year", () => {
    const result = evaluateEligibility(
      state(),
      resolved("realWorld", 2026),
      DEFAULT_FACTION_TURN_SETTINGS,
      CAL,
    );
    expect(result.canOverride).toBe(false);
  });

  it("stays no-world-date even for a faction that has never acted", () => {
    // never-acted would otherwise be unconditionally eligible (FR-011); the
    // missing world date has to win over that rule.
    const result = evaluateEligibility(
      state({ lastTurnDate: undefined }),
      resolved("realWorld", 2026),
      DEFAULT_FACTION_TURN_SETTINGS,
      CAL,
    );
    expect(result.state).toBe("no-world-date");
  });

  it("explains itself in plain language", () => {
    const result = evaluateEligibility(
      state(),
      resolved("realWorld", 2026),
      DEFAULT_FACTION_TURN_SETTINGS,
      CAL,
    );
    expect(result.reason.toLowerCase()).toContain("current date");
  });

  it("treats a missing resolved date the same way", () => {
    const result = evaluateEligibility(
      state(),
      null,
      DEFAULT_FACTION_TURN_SETTINGS,
      CAL,
    );
    expect(result.state).toBe("no-world-date");
    expect(result.canOverride).toBe(false);
  });
});

describe("accepted world-date tiers", () => {
  it("accepts the marker-entity tier", () => {
    const result = evaluateEligibility(
      state(),
      resolved("entity", 640, 3, 12),
      DEFAULT_FACTION_TURN_SETTINGS,
      CAL,
    );
    expect(result.state).toBe("never-acted");
  });

  it("accepts the year-only vault-setting tier (FR-008)", () => {
    const result = evaluateEligibility(
      state(),
      resolved("vaultSetting", 640, 1, undefined),
      DEFAULT_FACTION_TURN_SETTINGS,
      CAL,
    );
    expect(result.state).toBe("never-acted");
    expect(result.canAct).toBe(true);
  });

  it("gates correctly on a year-only vault after a turn (FR-008)", () => {
    const last = toWorldDateStamp(resolved("vaultSetting", 640), 1);
    const tooSoon = evaluateEligibility(
      state({ lastTurnDate: last }),
      resolved("vaultSetting", 640),
      DEFAULT_FACTION_TURN_SETTINGS,
      CAL,
    );
    expect(tooSoon.state).toBe("too-soon");

    const later = evaluateEligibility(
      state({ lastTurnDate: last }),
      resolved("vaultSetting", 641),
      DEFAULT_FACTION_TURN_SETTINGS,
      CAL,
    );
    expect(later.state).toBe("eligible");
  });
});

describe("pacing (FR-010 - FR-014)", () => {
  const last = toWorldDateStamp(resolved("entity", 640, 3, 12), 1);

  it("is always eligible when the faction has never acted (FR-011)", () => {
    const result = evaluateEligibility(
      state(),
      resolved("entity", 1, 1, 1),
      DEFAULT_FACTION_TURN_SETTINGS,
      CAL,
    );
    expect(result.state).toBe("never-acted");
    expect(result.canAct).toBe(true);
  });

  it("is too-soon inside the interval, and offers the override (FR-013)", () => {
    const result = evaluateEligibility(
      state({ lastTurnDate: last }),
      resolved("entity", 640, 6, 1),
      DEFAULT_FACTION_TURN_SETTINGS,
      CAL,
    );
    expect(result.state).toBe("too-soon");
    expect(result.canAct).toBe(false);
    expect(result.canOverride).toBe(true);
  });

  it("shows the last turn date and the next eligible date (FR-012)", () => {
    const result = evaluateEligibility(
      state({ lastTurnDate: last }),
      resolved("entity", 640, 6, 1),
      DEFAULT_FACTION_TURN_SETTINGS,
      CAL,
    );
    expect(result.lastTurnDate).toEqual(last);
    expect(result.nextEligibleDate?.year).toBe(641);
  });

  it("becomes eligible once the interval has passed", () => {
    const result = evaluateEligibility(
      state({ lastTurnDate: last }),
      resolved("entity", 641, 3, 12),
      DEFAULT_FACTION_TURN_SETTINGS,
      CAL,
    );
    expect(result.state).toBe("eligible");
    expect(result.canAct).toBe(true);
  });

  it("honours a month-based interval", () => {
    const settings = {
      ...DEFAULT_FACTION_TURN_SETTINGS,
      turnIntervalUnit: "month" as const,
      turnIntervalAmount: 3,
    };
    const tooSoon = evaluateEligibility(
      state({ lastTurnDate: last }),
      resolved("entity", 640, 4, 12),
      settings,
      CAL,
    );
    expect(tooSoon.state).toBe("too-soon");

    const ready = evaluateEligibility(
      state({ lastTurnDate: last }),
      resolved("entity", 640, 6, 12),
      settings,
      CAL,
    );
    expect(ready.state).toBe("eligible");
  });

  it("rolls a month interval over the year boundary", () => {
    const nov = toWorldDateStamp(resolved("entity", 640, 11, 1), 1);
    const settings = {
      ...DEFAULT_FACTION_TURN_SETTINGS,
      turnIntervalUnit: "month" as const,
      turnIntervalAmount: 3,
    };
    // Nov 640 + 3 months lands in Feb 641, crossing the year boundary. Checked
    // via too-soon because that is the state FR-012 requires the next-eligible
    // date to be shown in; when a faction is already eligible there is no
    // pending date to report.
    const januaryStillTooSoon = evaluateEligibility(
      state({ lastTurnDate: nov }),
      resolved("entity", 641, 1, 1),
      settings,
      CAL,
    );
    expect(januaryStillTooSoon.state).toBe("too-soon");
    expect(januaryStillTooSoon.nextEligibleDate).toMatchObject({
      year: 641,
      month: 2,
    });

    const february = evaluateEligibility(
      state({ lastTurnDate: nov }),
      resolved("entity", 641, 2, 1),
      settings,
      CAL,
    );
    expect(february.state).toBe("eligible");
  });

  it("reports clock-behind without an error or repair prompt (FR-014)", () => {
    const result = evaluateEligibility(
      state({ lastTurnDate: last }),
      resolved("entity", 600, 1, 1),
      DEFAULT_FACTION_TURN_SETTINGS,
      CAL,
    );
    expect(result.state).toBe("clock-behind");
    expect(result.canAct).toBe(false);
    // Still overridable — a GM who deliberately rewound their clock may know
    // exactly what they are doing.
    expect(result.canOverride).toBe(true);
  });

  it("never throws, whatever it is handed", () => {
    expect(() =>
      evaluateEligibility(
        undefined,
        resolved("entity", 640),
        DEFAULT_FACTION_TURN_SETTINGS,
        CAL,
      ),
    ).not.toThrow();
  });

  it("treats a faction with no turn state as never-acted", () => {
    const result = evaluateEligibility(
      undefined,
      resolved("entity", 640),
      DEFAULT_FACTION_TURN_SETTINGS,
      CAL,
    );
    expect(result.state).toBe("never-acted");
  });
});

describe("undone turns (FR-010)", () => {
  it("ignores an undone turn when deciding eligibility", () => {
    // The faction's only turn was reversed, so as far as pacing is concerned it
    // never acted.
    const undoneRecord = {
      id: "t1",
      worldDate: toWorldDateStamp(resolved("entity", 640, 3, 12), 1),
      committedAt: 1,
      action: "influence" as const,
      targetId: "loc",
      targetTitle: "Mub",
      resolution: {} as never,
      changes: [],
      inverse: [],
      narrative: "",
      narrativeSource: "template" as const,
      isOverride: false,
      undone: true,
    };
    const result = evaluateEligibility(
      state({ history: [undoneRecord], lastTurnDate: undefined }),
      resolved("entity", 640, 4, 1),
      DEFAULT_FACTION_TURN_SETTINGS,
      CAL,
    );
    expect(result.state).toBe("never-acted");
  });
});
