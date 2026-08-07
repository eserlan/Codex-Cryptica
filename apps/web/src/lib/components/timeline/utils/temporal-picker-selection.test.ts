import { describe, expect, it } from "vitest";
import {
  formatDirectDateInput,
  normalizedSelectionForSave,
  optionPatch,
  parsePickerDateInput,
  precisionPatch,
} from "./temporal-picker-selection";

const config = {
  useGregorian: false,
  months: [
    { id: "alpha", name: "Alpha", days: 10 },
    { id: "beta", name: "Beta", days: 20 },
  ],
  anchors: [
    { id: "solstice", name: "Solstice", afterMonthId: "alpha", afterDay: 10 },
  ],
  daysPerWeek: 7,
  revision: 4,
};

describe("temporal picker selection helpers", () => {
  it("parses a direct day entry using the configured month id", () => {
    expect(parsePickerDateInput("0502120", config)).toEqual({
      selection: {
        precision: "day",
        year: 120,
        unitId: "beta",
        day: 5,
        calendarRevision: 4,
      },
    });
  });

  it("rejects an invalid direct entry without returning a selection", () => {
    expect(parsePickerDateInput("not-a-date", config)).toEqual({
      error:
        "Use a year (such as 45 or -594), DDMMYYYY, DDMM-YYYY, or DD/MM/-YYYY.",
    });
  });

  it("adds required defaults when changing to day precision", () => {
    expect(
      precisionPatch(
        "day",
        { precision: "year", year: 12, calendarRevision: 4 },
        config,
      ),
    ).toEqual({ precision: "day", unitId: "alpha", day: 1 });
  });

  it("uses Gregorian months when adding a precision default", () => {
    expect(
      precisionPatch(
        "day",
        { precision: "year", year: 12, calendarRevision: 4 },
        { ...config, useGregorian: true },
      ),
    ).toEqual({ precision: "day", unitId: "january", day: 1 });
  });

  it("formats day selections and patches picker options", () => {
    expect(
      formatDirectDateInput(
        {
          precision: "day",
          year: 120,
          unitId: "beta",
          day: 5,
          calendarRevision: 4,
        },
        config,
      ),
    ).toBe("0502120");
    expect(optionPatch("year", "42")).toEqual({ year: 42 });
    expect(optionPatch("unit", "alpha")).toEqual({ unitId: "alpha" });
    expect(optionPatch("day", "3")).toEqual({ day: 3 });
    expect(optionPatch("anchor", "solstice")).toEqual({
      anchorId: "solstice",
    });
  });

  it("removes day-only fields when saving a year selection", () => {
    expect(
      normalizedSelectionForSave({
        precision: "year",
        year: 12,
        unitId: "alpha",
        day: 3,
        anchorId: "solstice",
        calendarRevision: 4,
      }),
    ).toEqual({ precision: "year", year: 12, calendarRevision: 4 });
  });
});
