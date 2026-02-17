import { describe, it, expect } from "vitest";
import { calendarEngine, DEFAULT_CALENDAR } from "../src/engine";
import type { CampaignCalendar } from "../src/types";

describe("CalendarEngine", () => {
  const customCalendar: CampaignCalendar = {
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
  });
});
