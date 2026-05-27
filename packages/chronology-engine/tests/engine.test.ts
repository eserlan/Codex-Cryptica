import { describe, it, expect } from "vitest";
import {
  calendarEngine,
  DEFAULT_CALENDAR,
  parseDirectDateInput,
} from "../src/engine";
import type {
  WorldCalendar,
  DateSelection,
  CalendarSnapshot,
} from "../src/types";

describe("CalendarEngine", () => {
  const customCalendar: WorldCalendar = {
    useGregorian: false,
    months: [
      { id: "month1", name: "Alpha", days: 20 },
      { id: "month2", name: "Beta", days: 25 },
    ],
    daysPerWeek: 5,
  };

  describe("isValid", () => {
    it("should validate a simple Gregorian year", () => {
      expect(calendarEngine.isValid({ year: 2024 }, DEFAULT_CALENDAR)).toBe(
        true,
      );
    });

    it("should validate a valid Gregorian date", () => {
      expect(
        calendarEngine.isValid(
          { year: 2024, month: 1, day: 31 },
          DEFAULT_CALENDAR,
        ),
      ).toBe(true);
    });

    it("should reject an invalid Gregorian month", () => {
      expect(
        calendarEngine.isValid({ year: 2024, month: 13 }, DEFAULT_CALENDAR),
      ).toBe(false);
    });

    it("should reject an invalid Gregorian day", () => {
      expect(
        calendarEngine.isValid(
          { year: 2024, month: 2, day: 30 },
          DEFAULT_CALENDAR,
        ),
      ).toBe(false);
    });

    it("should validate a custom calendar date", () => {
      expect(
        calendarEngine.isValid(
          { year: 100, month: 2, day: 25 },
          customCalendar,
        ),
      ).toBe(true);
    });

    it("should reject an invalid day in custom calendar", () => {
      expect(
        calendarEngine.isValid(
          { year: 100, month: 1, day: 21 },
          customCalendar,
        ),
      ).toBe(false);
    });
  });

  describe("format", () => {
    it("should format a full Gregorian date", () => {
      const date = { year: 1240, month: 1, day: 12 };
      expect(calendarEngine.format(date, DEFAULT_CALENDAR)).toBe(
        "12 January 1240",
      );
    });

    it("should format a year-only date with epoch label", () => {
      const date = { year: 1240 };
      const config = { ...DEFAULT_CALENDAR, epochLabel: "AF" };
      expect(calendarEngine.format(date, config)).toBe("1240 AF");
    });

    it("should format a custom calendar date", () => {
      const date = { year: 10, month: 2, day: 5 };
      expect(calendarEngine.format(date, customCalendar)).toBe("5 Beta 10");
    });

    it("should use label if provided", () => {
      const date = { year: 10, label: "The Beginning" };
      expect(calendarEngine.format(date, customCalendar)).toBe("The Beginning");
    });
  });

  describe("getTimelineValue", () => {
    it("should calculate linear values for Gregorian dates", () => {
      const v1 = calendarEngine.getTimelineValue(
        { year: 0, month: 1, day: 1 },
        DEFAULT_CALENDAR,
      );
      const v2 = calendarEngine.getTimelineValue(
        { year: 0, month: 1, day: 2 },
        DEFAULT_CALENDAR,
      );
      expect(v2).toBe(v1 + 1);
    });

    it("should handle custom month lengths correctly", () => {
      // Month 1 has 20 days. Year has 45 days total.
      const v1 = calendarEngine.getTimelineValue(
        { year: 1, month: 1, day: 1 },
        customCalendar,
      );
      const v2 = calendarEngine.getTimelineValue(
        { year: 1, month: 2, day: 1 },
        customCalendar,
      );
      expect(v2 - v1).toBe(20);
    });

    it("should handle negative years for linear timeline", () => {
      const v1 = calendarEngine.getTimelineValue(
        { year: -1, month: 1, day: 1 },
        DEFAULT_CALENDAR,
      );
      const daysInYear = calendarEngine.getDaysInYear(DEFAULT_CALENDAR);
      expect(v1).toBe(-daysInYear);
    });
  });

  describe("parseDirectDateInput", () => {
    it("parses compact ddmmyyyy input", () => {
      expect(parseDirectDateInput("12011240", DEFAULT_CALENDAR)).toEqual({
        year: 1240,
        month: 1,
        day: 12,
      });
    });

    it("parses direct dates with a negative year", () => {
      expect(parseDirectDateInput("0101-500", DEFAULT_CALENDAR)).toEqual({
        year: -500,
        month: 1,
        day: 1,
      });
      expect(parseDirectDateInput("01/01/-500", DEFAULT_CALENDAR)).toEqual({
        year: -500,
        month: 1,
        day: 1,
      });
    });

    it("rejects direct dates outside the active calendar", () => {
      expect(parseDirectDateInput("30021000", DEFAULT_CALENDAR)).toBeNull();
      expect(parseDirectDateInput("2101100", customCalendar)).toBeNull();
    });
  });

  describe("DateSelection & CalendarSnapshot Support", () => {
    const snapshot: CalendarSnapshot = {
      revision: 2,
      config: {
        useGregorian: false,
        months: [
          { id: "m1", name: "Alpha", days: 10 },
          { id: "m2", name: "Beta", days: 15 },
        ],
        daysPerWeek: 5,
        anchors: [
          { id: "anc1", name: "Solstice", afterMonthId: "m1", afterDay: 10 },
        ],
      },
    };

    it("should validate a valid DateSelection using a CalendarSnapshot", () => {
      const selection: DateSelection = {
        precision: "day",
        year: 2026,
        unitId: "m1",
        day: 5,
        calendarRevision: 2,
      };
      expect(calendarEngine.isValid(selection, snapshot)).toBe(true);
    });

    it("should reject an invalid day overflow using a CalendarSnapshot", () => {
      const selection: DateSelection = {
        precision: "day",
        year: 2026,
        unitId: "m1",
        day: 12, // Alpha has only 10 days
        calendarRevision: 2,
      };
      expect(calendarEngine.isValid(selection, snapshot)).toBe(false);
    });

    it("should validate a valid IntercalaryAnchor", () => {
      const selection: DateSelection = {
        precision: "anchor",
        year: 2026,
        anchorId: "anc1",
        calendarRevision: 2,
      };
      expect(calendarEngine.isValid(selection, snapshot)).toBe(true);
    });

    it("should reject an invalid anchor", () => {
      const selection: DateSelection = {
        precision: "anchor",
        year: 2026,
        anchorId: "anc_nonexistent",
        calendarRevision: 2,
      };
      expect(calendarEngine.isValid(selection, snapshot)).toBe(false);
    });
  });

  describe("deriveWheelColumns", () => {
    const snapshot: CalendarSnapshot = {
      revision: 1,
      config: {
        useGregorian: false,
        months: [
          { id: "m1", name: "Alpha", days: 5 },
          { id: "m2", name: "Beta", days: 10 },
        ],
        daysPerWeek: 5,
        anchors: [
          { id: "anc1", name: "Midyear", afterMonthId: "m1", afterDay: 5 },
        ],
      },
    };

    it("should derive columns for a standard day selection", () => {
      const selection: DateSelection = {
        precision: "day",
        year: 100,
        unitId: "m2",
        day: 3,
        calendarRevision: 1,
      };
      const columns = calendarEngine.deriveWheelColumns(selection, snapshot);
      expect(columns.length).toBe(3); // year, unit, day
      expect(columns[0].id).toBe("year");
      expect(columns[1].id).toBe("unit");
      expect(columns[2].id).toBe("day");

      // Verify months options
      expect(columns[1].options.map((o) => o.id)).toEqual(["m1", "m2"]);
      expect(columns[1].selectedId).toBe("m2");

      // Verify days options for Beta (10 days)
      expect(columns[2].options.length).toBe(10);
      expect(columns[2].selectedId).toBe("3");
    });

    it("should derive columns for an anchor precision selection", () => {
      const selection: DateSelection = {
        precision: "anchor",
        year: 100,
        anchorId: "anc1",
        calendarRevision: 1,
      };
      const columns = calendarEngine.deriveWheelColumns(selection, snapshot);
      expect(columns.length).toBe(2); // year, anchor
      expect(columns[0].id).toBe("year");
      expect(columns[1].id).toBe("anchor");
      expect(columns[1].options.map((o) => o.id)).toEqual(["anc1"]);
      expect(columns[1].selectedId).toBe("anc1");
    });
  });

  describe("applyParentChange", () => {
    const snapshot: CalendarSnapshot = {
      revision: 1,
      config: {
        useGregorian: false,
        months: [
          { id: "m1", name: "Alpha", days: 12 },
          { id: "m2", name: "Beta", days: 6 },
        ],
        daysPerWeek: 5,
      },
    };

    it("should preserve day if it remains valid under the new unit", () => {
      const selection: DateSelection = {
        precision: "day",
        year: 100,
        unitId: "m1",
        day: 5,
        calendarRevision: 1,
      };
      const updated = calendarEngine.applyParentChange(
        selection,
        { unitId: "m2" },
        snapshot,
      );
      expect(updated.unitId).toBe("m2");
      expect(updated.day).toBe(5);
    });

    it("should cap day to maximum days of new unit if it overflows", () => {
      const selection: DateSelection = {
        precision: "day",
        year: 100,
        unitId: "m1",
        day: 10,
        calendarRevision: 1,
      };
      const updated = calendarEngine.applyParentChange(
        selection,
        { unitId: "m2" },
        snapshot,
      );
      expect(updated.unitId).toBe("m2");
      expect(updated.day).toBe(6); // capped to max day of Beta
    });
  });

  describe("getRepairState", () => {
    const newSnapshot: CalendarSnapshot = {
      revision: 2,
      config: {
        useGregorian: false,
        months: [{ id: "m2", name: "Beta", days: 10 }],
        daysPerWeek: 5,
      },
    };

    it("should return null if the selection is perfectly valid under current snapshot", () => {
      const selection: DateSelection = {
        precision: "day",
        year: 100,
        unitId: "m2",
        day: 5,
        calendarRevision: 2,
      };
      expect(calendarEngine.getRepairState(selection, newSnapshot)).toBeNull();
    });

    it("should identify missing-unit when the saved unit is deleted", () => {
      const selection: DateSelection = {
        precision: "day",
        year: 100,
        unitId: "m1", // exists in oldSnapshot but not newSnapshot
        day: 5,
        calendarRevision: 1,
      };
      const repair = calendarEngine.getRepairState(selection, newSnapshot);
      expect(repair).not.toBeNull();
      expect(repair?.reason).toBe("missing-unit");
      expect(repair?.suggestedSelection.unitId).toBe("m2"); // falls back to the first available month
      expect(repair?.suggestedSelection.day).toBe(5);
    });

    it("should identify day-overflow when the month shrinks", () => {
      const selection: DateSelection = {
        precision: "day",
        year: 100,
        unitId: "m2",
        day: 15, //Beta has 10 days
        calendarRevision: 2,
      };
      const repair = calendarEngine.getRepairState(selection, newSnapshot);
      expect(repair).not.toBeNull();
      expect(repair?.reason).toBe("day-overflow");
      expect(repair?.suggestedSelection.day).toBe(10); // capped to 10
    });

    it("should identify stale-revision when the revision is outdated but the date remains valid", () => {
      const selection: DateSelection = {
        precision: "day",
        year: 100,
        unitId: "m2",
        day: 5,
        calendarRevision: 1, // Snapshot has revision 2
      };
      const repair = calendarEngine.getRepairState(selection, newSnapshot);
      expect(repair).not.toBeNull();
      expect(repair?.reason).toBe("stale-revision");
      expect(repair?.suggestedSelection.calendarRevision).toBe(2);
    });
  });

  describe("Additional Coverage Tests", () => {
    const snapshot: CalendarSnapshot = {
      revision: 2,
      config: {
        useGregorian: false,
        months: [
          { id: "m1", name: "Alpha", days: 10 },
          { id: "m2", name: "Beta", days: 15 },
        ],
        daysPerWeek: 5,
        anchors: [
          { id: "anc1", name: "Solstice", afterMonthId: "m1", afterDay: 10 },
        ],
      },
    };

    it("should format an anchor precision date selection", () => {
      const date: DateSelection = {
        precision: "anchor",
        year: 2026,
        anchorId: "anc1",
        calendarRevision: 2,
      };
      expect(calendarEngine.format(date, snapshot)).toBe("Solstice 2026");
    });

    it("should get timeline value for unit precision", () => {
      const date: DateSelection = {
        precision: "unit",
        year: 100,
        unitId: "m2",
        calendarRevision: 2,
      };
      expect(calendarEngine.getTimelineValue(date, snapshot)).toBe(2510);
    });

    it("should get timeline value for day precision", () => {
      const date: DateSelection = {
        precision: "day",
        year: 100,
        unitId: "m2",
        day: 5,
        calendarRevision: 2,
      };
      expect(calendarEngine.getTimelineValue(date, snapshot)).toBe(2514);
    });

    it("should get timeline value for anchor precision", () => {
      const date: DateSelection = {
        precision: "anchor",
        year: 100,
        anchorId: "anc1",
        calendarRevision: 2,
      };
      expect(calendarEngine.getTimelineValue(date, snapshot)).toBe(2510);
    });

    it("should identify missing-anchor when the anchor is deleted", () => {
      const selection: DateSelection = {
        precision: "anchor",
        year: 100,
        anchorId: "nonexistent-anchor",
        calendarRevision: 2,
      };
      const repair = calendarEngine.getRepairState(selection, snapshot);
      expect(repair).not.toBeNull();
      expect(repair?.reason).toBe("missing-anchor");
      expect(repair?.suggestedSelection.anchorId).toBe("anc1");
    });

    it("should fallback to unit precision when missing-anchor has no anchors configured", () => {
      const snapshotNoAnchors: CalendarSnapshot = {
        revision: 2,
        config: {
          useGregorian: false,
          months: [{ id: "m1", name: "Alpha", days: 10 }],
          daysPerWeek: 5,
        },
      };
      const selection: DateSelection = {
        precision: "anchor",
        year: 100,
        anchorId: "nonexistent-anchor",
        calendarRevision: 2,
      };
      const repair = calendarEngine.getRepairState(
        selection,
        snapshotNoAnchors,
      );
      expect(repair).not.toBeNull();
      expect(repair?.reason).toBe("missing-anchor");
      expect(repair?.suggestedSelection.precision).toBe("unit");
      expect(repair?.suggestedSelection.unitId).toBe("m1");
    });

    it("should reject direct date input with non-integer values", () => {
      expect(parseDirectDateInput("12.5.01.2024", DEFAULT_CALENDAR)).toBeNull();
    });
  });

  describe("Invalid/Extreme Date Values Validation", () => {
    it("should reject non-integer / floating-point years, months, and days", () => {
      // Float year in DateSelection
      expect(
        calendarEngine.isValid(
          { precision: "year", year: 2024.5 },
          DEFAULT_CALENDAR,
        ),
      ).toBe(false);
      // Float year in legacy format
      expect(calendarEngine.isValid({ year: 2024.5 }, DEFAULT_CALENDAR)).toBe(
        false,
      );
      // Float month in legacy format
      expect(
        calendarEngine.isValid({ year: 2024, month: 1.5 }, DEFAULT_CALENDAR),
      ).toBe(false);
      // Float day in DateSelection
      expect(
        calendarEngine.isValid(
          { precision: "day", year: 2024, unitId: "january", day: 15.5 },
          DEFAULT_CALENDAR,
        ),
      ).toBe(false);
      // Float day in legacy format
      expect(
        calendarEngine.isValid(
          { year: 2024, month: 1, day: 15.5 },
          DEFAULT_CALENDAR,
        ),
      ).toBe(false);
    });

    it("should reject non-safe-integer/overflow years, months, and days", () => {
      const hugeNumber = Number.MAX_SAFE_INTEGER + 10;
      expect(
        calendarEngine.isValid({ year: hugeNumber }, DEFAULT_CALENDAR),
      ).toBe(false);
      expect(
        calendarEngine.isValid(
          { precision: "year", year: hugeNumber },
          DEFAULT_CALENDAR,
        ),
      ).toBe(false);
      expect(
        calendarEngine.isValid(
          { year: 2024, month: hugeNumber },
          DEFAULT_CALENDAR,
        ),
      ).toBe(false);
      expect(
        calendarEngine.isValid(
          { precision: "day", year: 2024, unitId: "january", day: hugeNumber },
          DEFAULT_CALENDAR,
        ),
      ).toBe(false);
    });

    it("should reject NaN, Infinity, and non-numeric year/month/day values", () => {
      expect(
        calendarEngine.isValid({ year: Number.NaN }, DEFAULT_CALENDAR),
      ).toBe(false);
      expect(
        calendarEngine.isValid(
          { year: Number.POSITIVE_INFINITY },
          DEFAULT_CALENDAR,
        ),
      ).toBe(false);
      expect(
        calendarEngine.isValid(
          { year: 2024, month: Number.NaN },
          DEFAULT_CALENDAR,
        ),
      ).toBe(false);
      expect(
        calendarEngine.isValid(
          { precision: "day", year: 2024, unitId: "january", day: Number.NaN },
          DEFAULT_CALENDAR,
        ),
      ).toBe(false);
    });

    it("should parseDirectDateInput with negative, float and extreme inputs correctly", () => {
      // Float parts should return null
      expect(parseDirectDateInput("12.5/01/2024", DEFAULT_CALENDAR)).toBeNull();
      expect(parseDirectDateInput("12/1.5/2024", DEFAULT_CALENDAR)).toBeNull();
      expect(parseDirectDateInput("12/01/2024.5", DEFAULT_CALENDAR)).toBeNull();

      // Extreme values should return null
      expect(
        parseDirectDateInput("12019999999999999999", DEFAULT_CALENDAR),
      ).toBeNull();
      expect(
        parseDirectDateInput("99999999999999990112", DEFAULT_CALENDAR),
      ).toBeNull();
    });
  });
});
