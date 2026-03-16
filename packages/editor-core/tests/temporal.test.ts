import { describe, it, expect } from "vitest";
import { validateTemporal, validateTemporalRange } from "../src/validation/temporal";

describe("Temporal Validation", () => {
  describe("validateTemporal", () => {
    it("returns null for a valid year only", () => {
      expect(validateTemporal({ year: 2023 })).toBeNull();
    });

    it("returns null for a valid year and month", () => {
      expect(validateTemporal({ year: 2023, month: 5 })).toBeNull();
    });

    it("returns null for a valid year, month, and day", () => {
      expect(validateTemporal({ year: 2023, month: 5, day: 15 })).toBeNull();
    });

    it("returns an error if year is missing", () => {
      // @ts-expect-error Testing invalid input
      expect(validateTemporal({})).toBe("Year is required for chronological placement.");
      // @ts-expect-error Testing invalid input
      expect(validateTemporal({ year: undefined })).toBe("Year is required for chronological placement.");
      // @ts-expect-error Testing invalid input
      expect(validateTemporal({ year: null })).toBe("Year is required for chronological placement.");
    });

    it("returns an error if year is not a valid number", () => {
      // @ts-expect-error Testing invalid input
      expect(validateTemporal({ year: "2023" })).toBe("Year must be a valid number.");
      expect(validateTemporal({ year: NaN })).toBe("Year must be a valid number.");
    });

    it("returns an error if month is out of bounds", () => {
      expect(validateTemporal({ year: 2023, month: 0 })).toBe("Month must be between 1 and 12.");
      expect(validateTemporal({ year: 2023, month: 13 })).toBe("Month must be between 1 and 12.");
    });

    it("returns an error if day is out of bounds", () => {
      expect(validateTemporal({ year: 2023, month: 5, day: 0 })).toBe("Day must be between 1 and 31.");
      expect(validateTemporal({ year: 2023, month: 5, day: 32 })).toBe("Day must be between 1 and 31.");
    });
  });

  describe("validateTemporalRange", () => {
    it("returns null if start or end is missing", () => {
      expect(validateTemporalRange()).toBeNull();
      expect(validateTemporalRange({ year: 2023 })).toBeNull();
      expect(validateTemporalRange(undefined, { year: 2023 })).toBeNull();
    });

    it("returns an error if start date is invalid", () => {
      // @ts-expect-error Testing invalid input
      expect(validateTemporalRange({ year: undefined }, { year: 2023 })).toBe("Start date error: Year is required for chronological placement.");
    });

    it("returns an error if end date is invalid", () => {
      // @ts-expect-error Testing invalid input
      expect(validateTemporalRange({ year: 2023 }, { year: undefined })).toBe("End date error: Year is required for chronological placement.");
    });

    it("returns null for a valid range with years only", () => {
      expect(validateTemporalRange({ year: 2023 }, { year: 2024 })).toBeNull();
    });

    it("returns null for a valid range with years, months, and days", () => {
      expect(validateTemporalRange({ year: 2023, month: 5, day: 15 }, { year: 2024, month: 1, day: 1 })).toBeNull();
    });

    it("returns an error if start year is after end year", () => {
      expect(validateTemporalRange({ year: 2024 }, { year: 2023 })).toBe("Start year cannot be after end year.");
    });

    it("returns an error if start month is after end month in the same year", () => {
      expect(validateTemporalRange({ year: 2023, month: 6 }, { year: 2023, month: 5 })).toBe("Start month cannot be after end month.");
    });

    it("returns an error if start day is after end day in the same year and month", () => {
      expect(validateTemporalRange({ year: 2023, month: 5, day: 16 }, { year: 2023, month: 5, day: 15 })).toBe("Start day cannot be after end day.");
    });

    it("handles missing start/end months correctly when years are the same", () => {
      // End month missing (defaults to 1), start month is 2
      expect(validateTemporalRange({ year: 2023, month: 2 }, { year: 2023 })).toBe("Start month cannot be after end month.");
      // Start month missing (defaults to 1), end month is 2
      expect(validateTemporalRange({ year: 2023 }, { year: 2023, month: 2 })).toBeNull();
      // Start and end month missing (defaults to 1 for both), days default to 1, start day is 2
      expect(validateTemporalRange({ year: 2023, day: 2 }, { year: 2023 })).toBe("Start day cannot be after end day.");
    });
  });
});
