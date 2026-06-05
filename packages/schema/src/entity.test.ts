import { describe, expect, it } from "vitest";
import { EntitySchema, TemporalAnchorSchema } from "./entity";

const date = { year: 605, label: "605 P.C." };

describe("TemporalAnchorSchema", () => {
  it("requires at least one temporal value", () => {
    expect(() =>
      TemporalAnchorSchema.parse({ id: "a1", type: "majorAppearance" }),
    ).toThrow();
  });

  it("requires a label for custom anchors", () => {
    expect(() =>
      TemporalAnchorSchema.parse({ id: "a1", type: "custom", date }),
    ).toThrow();

    expect(
      TemporalAnchorSchema.parse({
        id: "a1",
        type: "custom",
        label: "Prophecy",
        date,
      }).label,
    ).toBe("Prophecy");
  });

  it("rejects inverted ranges", () => {
    expect(() =>
      TemporalAnchorSchema.parse({
        id: "a1",
        type: "activePeriod",
        start_date: { year: 620 },
        end_date: { year: 610 },
      }),
    ).toThrow();
  });

  it("validates date-selection shapes", () => {
    expect(() =>
      TemporalAnchorSchema.parse({
        id: "a1",
        type: "born",
        date: { precision: "day", year: 605, calendarRevision: 1 },
      }),
    ).toThrow();

    expect(
      TemporalAnchorSchema.parse({
        id: "a1",
        type: "born",
        date: {
          precision: "day",
          year: 605,
          unitId: "firstmoon",
          day: 12,
          calendarRevision: 1,
        },
      }).date?.year,
    ).toBe(605);
  });
});

describe("EntitySchema temporal anchors", () => {
  it("preserves backwards compatibility when temporalAnchors is absent", () => {
    const entity = EntitySchema.parse({
      id: "event-1",
      type: "event",
      title: "Founding",
    });

    expect(entity.temporalAnchors).toBeUndefined();
    expect(entity.tags).toEqual([]);
    expect(entity.labels).toEqual([]);
  });

  it("accepts additional temporal anchors without requiring primary dates", () => {
    const entity = EntitySchema.parse({
      id: "char-1",
      type: "character",
      title: "Avel",
      temporalAnchors: [{ id: "born", type: "born", date }],
    });

    expect(entity.temporalAnchors).toHaveLength(1);
  });
});
