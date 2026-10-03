import { describe, it, expect } from "vitest";
import type { WorldCalendar, CalendarEra } from "../src/types";
import {
  resolveEraForYear,
  resolveYearFromEra,
  formatEraYear,
  parseEraDateString,
} from "../src/eras";
import { DEFAULT_CALENDAR } from "../src/engine";

describe("Calendar Eras - Chronology Engine", () => {
  const bfEra: CalendarEra = {
    id: "era-bf",
    name: "Before the Fall",
    label: "BF",
    startYear: -1,
    yearAtStart: 1,
    direction: "backward",
  };

  const afEra: CalendarEra = {
    id: "era-af",
    name: "After the Fall",
    label: "AF",
    startYear: 0,
    yearAtStart: 1,
    direction: "forward",
  };

  const twoEpochCalendar: WorldCalendar = {
    ...DEFAULT_CALENDAR,
    eras: [bfEra, afEra],
  };

  const multiAgeCalendar: WorldCalendar = {
    ...DEFAULT_CALENDAR,
    eras: [
      {
        id: "era-1",
        name: "First Age",
        label: "FA",
        startYear: 0,
        yearAtStart: 1,
        direction: "forward",
      },
      {
        id: "era-2",
        name: "Second Age",
        label: "SA",
        startYear: 742,
        yearAtStart: 1,
        direction: "forward",
      },
      {
        id: "era-3",
        name: "Third Age",
        label: "TA",
        startYear: 1052,
        yearAtStart: 1,
        direction: "forward",
      },
    ],
  };

  describe("resolveEraForYear", () => {
    it("returns null when no eras are configured on calendar", () => {
      const calWithoutEras: WorldCalendar = {
        ...DEFAULT_CALENDAR,
        epochLabel: "AF",
      };
      expect(resolveEraForYear(100, calWithoutEras)).toBeNull();
    });

    it("resolves forward single era correctly", () => {
      const result = resolveEraForYear(100, twoEpochCalendar);
      expect(result).not.toBeNull();
      expect(result?.era.id).toBe("era-af");
      expect(result?.eraYear).toBe(101);
      expect(result?.formattedYear).toBe("101 AF");
    });

    it("resolves start year of forward era (internal 0 -> 1 AF)", () => {
      const result = resolveEraForYear(0, twoEpochCalendar);
      expect(result?.era.id).toBe("era-af");
      expect(result?.eraYear).toBe(1);
      expect(result?.formattedYear).toBe("1 AF");
    });

    it("resolves backward era (internal -1 -> 1 BF)", () => {
      const result = resolveEraForYear(-1, twoEpochCalendar);
      expect(result?.era.id).toBe("era-bf");
      expect(result?.eraYear).toBe(1);
      expect(result?.formattedYear).toBe("1 BF");
    });

    it("resolves deep backward era (internal -311 -> 311 BF)", () => {
      const result = resolveEraForYear(-311, twoEpochCalendar);
      expect(result?.era.id).toBe("era-bf");
      expect(result?.eraYear).toBe(311);
      expect(result?.formattedYear).toBe("311 BF");
    });

    it("resolves sequential multi-age calendar spans correctly", () => {
      // First Age (years 0 to 741)
      const yr0 = resolveEraForYear(0, multiAgeCalendar);
      expect(yr0?.era.id).toBe("era-1");
      expect(yr0?.eraYear).toBe(1);

      const yr100 = resolveEraForYear(100, multiAgeCalendar);
      expect(yr100?.era.id).toBe("era-1");
      expect(yr100?.eraYear).toBe(101);

      // Second Age (starts at 742)
      const yr742 = resolveEraForYear(742, multiAgeCalendar);
      expect(yr742?.era.id).toBe("era-2");
      expect(yr742?.eraYear).toBe(1);

      const yr800 = resolveEraForYear(800, multiAgeCalendar);
      expect(yr800?.era.id).toBe("era-2");
      expect(yr800?.eraYear).toBe(59);

      // Third Age (starts at 1052)
      const yr1052 = resolveEraForYear(1052, multiAgeCalendar);
      expect(yr1052?.era.id).toBe("era-3");
      expect(yr1052?.eraYear).toBe(1);

      const yr1100 = resolveEraForYear(1100, multiAgeCalendar);
      expect(yr1100?.era.id).toBe("era-3");
      expect(yr1100?.eraYear).toBe(49);
    });

    it("uses era name when label is omitted", () => {
      const cal: WorldCalendar = {
        ...DEFAULT_CALENDAR,
        eras: [
          {
            id: "era-unlabeled",
            name: "Dynasty of Sun",
            startYear: 100,
            yearAtStart: 1,
          },
        ],
      };
      const res = resolveEraForYear(105, cal);
      expect(res?.formattedYear).toBe("6 Dynasty of Sun");
    });

    it("supports yearAtStart: 0 if explicitly configured", () => {
      const cal: WorldCalendar = {
        ...DEFAULT_CALENDAR,
        eras: [
          {
            id: "era-zero",
            name: "Star Reckoning",
            label: "SR",
            startYear: 2000,
            yearAtStart: 0,
          },
        ],
      };
      const res = resolveEraForYear(2000, cal);
      expect(res?.eraYear).toBe(0);
      expect(res?.formattedYear).toBe("0 SR");
    });
  });

  describe("resolveYearFromEra & Invertibility", () => {
    it("inverts forward era calculation deterministically", () => {
      expect(resolveYearFromEra(afEra, 1)).toBe(0);
      expect(resolveYearFromEra(afEra, 101)).toBe(100);
    });

    it("inverts backward era calculation deterministically", () => {
      expect(resolveYearFromEra(bfEra, 1)).toBe(-1);
      expect(resolveYearFromEra(bfEra, 2)).toBe(-2);
      expect(resolveYearFromEra(bfEra, 311)).toBe(-311);
    });

    it("guarantees bijective roundtrip for range of years", () => {
      for (let y = -500; y <= 500; y++) {
        const resolved = resolveEraForYear(y, twoEpochCalendar);
        expect(resolved).not.toBeNull();
        if (resolved) {
          const inverted = resolveYearFromEra(resolved.era, resolved.eraYear);
          expect(inverted).toBe(y);
        }
      }
    });
  });

  describe("formatEraYear", () => {
    it("formats year with era label when present", () => {
      expect(formatEraYear(0, twoEpochCalendar)).toBe("1 AF");
      expect(formatEraYear(-1, twoEpochCalendar)).toBe("1 BF");
    });

    it("returns null if no era matches", () => {
      const emptyCal: WorldCalendar = { ...DEFAULT_CALENDAR };
      expect(formatEraYear(2024, emptyCal)).toBeNull();
    });
  });

  describe("parseEraDateString", () => {
    it("parses year-only string with suffix label", () => {
      const res = parseEraDateString("311 BF", twoEpochCalendar);
      expect(res).not.toBeNull();
      expect(res?.internalYear).toBe(-311);
    });

    it("parses year-only string with prefix label case-insensitively", () => {
      const res = parseEraDateString("bf 1", twoEpochCalendar);
      expect(res).not.toBeNull();
      expect(res?.internalYear).toBe(-1);
    });

    it("parses full date string with era label", () => {
      const res = parseEraDateString("15/04/311 BF", twoEpochCalendar);
      expect(res).not.toBeNull();
      expect(res?.day).toBe(15);
      expect(res?.month).toBe(4);
      expect(res?.internalYear).toBe(-311);
    });

    it("parses date string with space separators and era", () => {
      const res = parseEraDateString("01 02 101 AF", twoEpochCalendar);
      expect(res).not.toBeNull();
      expect(res?.day).toBe(1);
      expect(res?.month).toBe(2);
      expect(res?.internalYear).toBe(100);
    });

    it("parses date string referencing full era name", () => {
      const res = parseEraDateString("50 Second Age", multiAgeCalendar);
      expect(res).not.toBeNull();
      // Second Age starts at 742 with yearAtStart 1, so year 50 is 742 + (50 - 1) = 791
      expect(res?.internalYear).toBe(791);
    });

    it("returns null for strings without matching era", () => {
      expect(parseEraDateString("2024", twoEpochCalendar)).toBeNull();
      expect(parseEraDateString("random text", twoEpochCalendar)).toBeNull();
    });
  });

  describe("Backward-Counting Eras & Epoch Transitions (US4)", () => {
    it("transitions across epoch boundary with zero gap and continuous ordering", () => {
      const yearMinus2 = resolveEraForYear(-2, twoEpochCalendar);
      const yearMinus1 = resolveEraForYear(-1, twoEpochCalendar);
      const year0 = resolveEraForYear(0, twoEpochCalendar);
      const year1 = resolveEraForYear(1, twoEpochCalendar);

      expect(yearMinus2?.formattedYear).toBe("2 BF");
      expect(yearMinus1?.formattedYear).toBe("1 BF");
      expect(year0?.formattedYear).toBe("1 AF");
      expect(year1?.formattedYear).toBe("2 AF");

      // Verify the underlying chronology remains strictly continuous
      expect(resolveYearFromEra(yearMinus2!.era, yearMinus2!.eraYear)).toBe(-2);
      expect(resolveYearFromEra(yearMinus1!.era, yearMinus1!.eraYear)).toBe(-1);
      expect(resolveYearFromEra(year0!.era, year0!.eraYear)).toBe(0);
      expect(resolveYearFromEra(year1!.era, year1!.eraYear)).toBe(1);
    });

    it("ensures negative internal years never display negative numbers to users when backward era applies", () => {
      for (let y = -1; y >= -1000; y--) {
        const res = resolveEraForYear(y, twoEpochCalendar);
        expect(res).not.toBeNull();
        expect(res!.eraYear).toBeGreaterThanOrEqual(1);
        expect(res!.formattedYear).not.toContain("-");
      }
    });

    it("respects explicit endYear bounds on backward eras", () => {
      const boundedCal: WorldCalendar = {
        ...DEFAULT_CALENDAR,
        eras: [
          {
            id: "bounded-bf",
            name: "Bounded BF",
            label: "BBF",
            startYear: -1,
            endYear: -100, // Only covers -1 to -100
            yearAtStart: 1,
            direction: "backward",
          },
        ],
      };

      expect(resolveEraForYear(-50, boundedCal)?.formattedYear).toBe("50 BBF");
      expect(resolveEraForYear(-100, boundedCal)?.formattedYear).toBe(
        "100 BBF",
      );
      // -101 is beyond the endYear boundary, so it should not match
      expect(resolveEraForYear(-101, boundedCal)).toBeNull();
    });
  });
});
