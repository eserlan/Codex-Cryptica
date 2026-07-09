import { describe, it, expect } from "vitest";
import { toDateSelection } from "./toDateSelection";
import type { CalendarConfig } from "chronology-engine";

describe("toDateSelection", () => {
  const mockConfig: CalendarConfig = {
    revision: 2,
    presentYear: 2024,
    months: [
      { id: "m1", name: "Month 1", days: 30 },
      { id: "m2", name: "Month 2", days: 30 },
    ],
  };

  it("should return present year if value and refVal are undefined", () => {
    const result = toDateSelection(undefined, undefined, mockConfig);
    expect(result).toEqual({
      precision: "year",
      year: 2024,
      calendarRevision: 2,
      label: undefined,
    });
  });

  it("should use refVal if val is undefined", () => {
    const result = toDateSelection(
      undefined,
      { year: 1000, precision: "year" },
      mockConfig
    );
    expect(result).toEqual({
      precision: "year",
      year: 1000,
      calendarRevision: 2,
      label: undefined,
    });
  });

  it("should return val if it has a precision", () => {
    const result = toDateSelection(
      { year: 2000, precision: "day", day: 1, unitId: "m1" },
      undefined,
      mockConfig
    );
    expect(result).toEqual({
      year: 2000,
      precision: "day",
      day: 1,
      unitId: "m1",
    });
  });

  it("should convert legacy TemporalMetadata to DateSelection", () => {
    const result = toDateSelection(
      { year: 2000, month: 2, day: 15, label: "Test" },
      undefined,
      mockConfig
    );
    expect(result).toEqual({
      precision: "day",
      year: 2000,
      unitId: "m2",
      day: 15,
      calendarRevision: 2,
      label: "Test",
    });
  });
});
