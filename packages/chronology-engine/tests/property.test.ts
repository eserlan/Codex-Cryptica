import { describe, it, expect } from "vitest";
import { calendarEngine } from "../src/engine";
import type {
  WorldCalendar,
  DateSelection,
  CalendarSnapshot,
} from "../src/types";

describe("Chronology-Engine Property-Based and Simulation Tests", () => {
  // Helper to generate a random custom calendar config
  function generateRandomCalendar(seed: number): WorldCalendar {
    const numMonths = Math.floor((seed % 15) + 3); // 3 to 17 months
    const daysPerWeek = Math.floor((seed % 6) + 4); // 4 to 9 days per week
    const months = Array.from({ length: numMonths }, (_, idx) => {
      const days = Math.floor(((seed + idx * 7) % 30) + 15); // 15 to 44 days per month
      return {
        id: `m_${idx}`,
        name: `Month ${idx + 1}`,
        days,
      };
    });

    return {
      useGregorian: false,
      months,
      daysPerWeek,
    };
  }

  describe("Monotonic Linear Timeline Value Progression", () => {
    it("should strictly monotonically increase for Gregorian calendars", () => {
      const gregorian = {
        useGregorian: true,
        months: [
          { id: "january", name: "January", days: 31 },
          { id: "february", name: "February", days: 28 },
          { id: "march", name: "March", days: 31 },
        ],
        daysPerWeek: 7,
      } as WorldCalendar;

      let prevValue = -Infinity;

      // Iterate through multiple years, months, and days and assert monotonic increase
      for (let y = -5; y <= 5; y++) {
        for (let mIdx = 0; mIdx < gregorian.months.length; mIdx++) {
          const month = gregorian.months[mIdx];
          for (let d = 1; d <= month.days; d++) {
            const selection: DateSelection = {
              precision: "day",
              year: y,
              unitId: month.id,
              day: d,
            };

            const value = calendarEngine.getTimelineValue(selection, gregorian);
            expect(value).toBeGreaterThan(prevValue);
            prevValue = value;
          }
        }
      }
    });

    it("should strictly monotonically increase for fuzzed custom calendars", () => {
      // Test 20 different randomly generated calendars
      for (let seed = 1; seed <= 20; seed++) {
        const customCal = generateRandomCalendar(seed);
        let prevValue = -Infinity;

        // Iterate through years, units, and days
        for (let y = -2; y <= 2; y++) {
          for (let mIdx = 0; mIdx < customCal.months.length; mIdx++) {
            const month = customCal.months[mIdx];
            for (let d = 1; d <= month.days; d++) {
              const selection: DateSelection = {
                precision: "day",
                year: y,
                unitId: month.id,
                day: d,
              };

              const value = calendarEngine.getTimelineValue(
                selection,
                customCal,
              );
              expect(value).toBeGreaterThan(prevValue);
              prevValue = value;
            }
          }
        }
      }
    });
  });

  describe("Week and Month Mutations Mid-Session", () => {
    it("should gracefully repair selections when month/unit configurations shrink or are deleted", () => {
      // Setup initial calendar snapshot
      const snapshotV1: CalendarSnapshot = {
        revision: 1,
        config: {
          useGregorian: false,
          months: [
            { id: "m1", name: "First", days: 30 },
            { id: "m2", name: "Second", days: 30 },
            { id: "m3", name: "Third", days: 30 },
          ],
          daysPerWeek: 7,
        },
      };

      // Valid day-precision selection on version 1
      const selection: DateSelection = {
        precision: "day",
        year: 2026,
        unitId: "m2",
        day: 25,
        calendarRevision: 1,
      };

      expect(calendarEngine.isValid(selection, snapshotV1)).toBe(true);

      // Mutate V2: Shrink "Second" month to 20 days (Day-Overflow)
      const snapshotV2: CalendarSnapshot = {
        revision: 2,
        config: {
          useGregorian: false,
          months: [
            { id: "m1", name: "First", days: 30 },
            { id: "m2", name: "Second", days: 20 }, // shrunk!
            { id: "m3", name: "Third", days: 30 },
          ],
          daysPerWeek: 7,
        },
      };

      // Check validation: V1 selection should now be invalid under V2 snapshot
      expect(calendarEngine.isValid(selection, snapshotV2)).toBe(false);

      // Verify getRepairState identifies day-overflow and caps day to new maximum of 20
      const repairState = calendarEngine.getRepairState(selection, snapshotV2);
      expect(repairState).not.toBeNull();
      expect(repairState?.reason).toBe("day-overflow");
      expect(repairState?.suggestedSelection.day).toBe(20);
      expect(repairState?.suggestedSelection.calendarRevision).toBe(2);

      // Mutate V3: Completely delete "Second" month (Missing-Unit)
      const snapshotV3: CalendarSnapshot = {
        revision: 3,
        config: {
          useGregorian: false,
          months: [
            { id: "m1", name: "First", days: 30 },
            { id: "m3", name: "Third", days: 30 },
          ],
          daysPerWeek: 7,
        },
      };

      // Verify getRepairState identifies missing-unit and falls back to first month
      const missingUnitRepair = calendarEngine.getRepairState(
        selection,
        snapshotV3,
      );
      expect(missingUnitRepair).not.toBeNull();
      expect(missingUnitRepair?.reason).toBe("missing-unit");
      expect(missingUnitRepair?.suggestedSelection.unitId).toBe("m1");
      // Day should be capped to fallback month days (First has 30 days, so 25 is preserved)
      expect(missingUnitRepair?.suggestedSelection.day).toBe(25);
      expect(missingUnitRepair?.suggestedSelection.calendarRevision).toBe(3);
    });
  });

  describe("Cache Isolation Across Hot Calendar Swaps", () => {
    it("should isolate getDaysInYear caching between distinct calendar configs", () => {
      const calA: WorldCalendar = {
        useGregorian: false,
        months: [
          { id: "m1", name: "A1", days: 10 },
          { id: "m2", name: "A2", days: 10 },
        ],
        daysPerWeek: 5,
      };

      const calB: WorldCalendar = {
        useGregorian: false,
        months: [
          { id: "m1", name: "B1", days: 15 },
          { id: "m2", name: "B2", days: 15 },
          { id: "m3", name: "B3", days: 15 },
        ],
        daysPerWeek: 6,
      };

      // Query days in year for both calendars repeatedly to verify correct caching behavior and isolation
      expect(calendarEngine.getDaysInYear(calA)).toBe(20);
      expect(calendarEngine.getDaysInYear(calB)).toBe(45);

      // Verify the cached results do not conflict or overwrite each other
      expect(calendarEngine.getDaysInYear(calA)).toBe(20);
      expect(calendarEngine.getDaysInYear(calB)).toBe(45);

      // Hot-swap/update calA config
      const calAUpdated: WorldCalendar = {
        ...calA,
        months: [
          { id: "m1", name: "A1", days: 12 },
          { id: "m2", name: "A2", days: 12 },
        ],
      };

      expect(calendarEngine.getDaysInYear(calAUpdated)).toBe(24);
      expect(calendarEngine.getDaysInYear(calB)).toBe(45);
    });
  });
});
