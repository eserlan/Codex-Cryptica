import { describe, expect, it } from "bun:test";
import { validateHistoricalAnchorCompatibility } from "../src/historical-anchor-compatibility";
import { HISTORICAL_ANCHOR_FALLBACK_ACTION } from "../src/historical-anchor-types";
import {
  calendar,
  eventSnapshot,
  startDate,
} from "./historical-anchor-fixtures";

describe("historical anchor compatibility", () => {
  it("preserves partial precision and clones the accepted dates", () => {
    const event = eventSnapshot({
      start_date: { year: 620, precision: "year" },
      end_date: { year: 621, precision: "year" },
      approximate: true,
      dateLabel: " Winter ",
    });
    const start = { year: 617 };
    const result = validateHistoricalAnchorCompatibility({
      event,
      startDate: start,
      calendar,
    });
    expect(result).toEqual({
      ok: true,
      startDate: { year: 617 },
      eventInterval: {
        start: { year: 620, precision: "year" },
        end: { year: 621, precision: "year" },
        approximate: true,
        label: "Winter",
      },
      calendarRevision: 1,
    });
    if (!result.ok) throw new Error(result.reason);
    result.startDate.year = 1;
    result.eventInterval.start.year = 1;
    expect(start.year).toBe(617);
    expect(event.start_date?.year).toBe(620);
  });

  it("retains source and missing-date error precedence and fallback details", () => {
    for (const event of [
      null,
      undefined,
      eventSnapshot({ id: " " }),
      eventSnapshot({ type: "character" }),
    ]) {
      expect(
        validateHistoricalAnchorCompatibility({
          event,
          startDate: null,
          calendar,
        }),
      ).toEqual({
        ok: false,
        code: "invalid-source-id",
        reason: "Historical anchor requires an existing Vault event record.",
        fallbackAction: HISTORICAL_ANCHOR_FALLBACK_ACTION,
      });
    }
    expect(
      validateHistoricalAnchorCompatibility({
        event: eventSnapshot({ start_date: undefined }),
        startDate: null,
        calendar,
      }),
    ).toMatchObject({ code: "missing-event-date" });
    expect(
      validateHistoricalAnchorCompatibility({
        event: eventSnapshot(),
        startDate: null,
        calendar,
      }),
    ).toMatchObject({
      code: "invalid-date",
      reason: "A valid starting date is required.",
    });
  });

  it("rejects stale calendar revisions and invalid date bounds", () => {
    const variants = [
      {
        event: eventSnapshot({
          start_date: { year: 620, calendarRevision: 2 },
        }),
        startDate,
        code: "calendar-mismatch",
      },
      {
        event: eventSnapshot({ end_date: { year: 620, calendarRevision: 2 } }),
        startDate,
        code: "calendar-mismatch",
      },
      {
        event: eventSnapshot(),
        startDate: { ...startDate, calendarRevision: 2 },
        code: "calendar-mismatch",
      },
      {
        event: eventSnapshot(),
        startDate: { ...startDate, day: 99 },
        code: "invalid-date",
      },
      {
        event: eventSnapshot({ start_date: { ...startDate, day: 99 } }),
        startDate,
        code: "invalid-date",
      },
      {
        event: eventSnapshot({ end_date: { ...startDate, day: 99 } }),
        startDate,
        code: "invalid-date",
      },
      {
        event: eventSnapshot({ end_date: { year: 619 } }),
        startDate,
        code: "invalid-date-range",
      },
      {
        event: eventSnapshot(),
        startDate: { year: 621 },
        code: "start-after-event",
      },
    ];
    for (const { code, ...input } of variants) {
      expect(
        validateHistoricalAnchorCompatibility({ ...input, calendar }),
      ).toMatchObject({
        ok: false,
        code,
        fallbackAction: HISTORICAL_ANCHOR_FALLBACK_ACTION,
      });
    }
  });

  it("rejects overlapping approximate and unplaced-anchor boundaries", () => {
    expect(
      validateHistoricalAnchorCompatibility({
        event: eventSnapshot({ approximate: true }),
        startDate: { year: 620 },
        calendar,
      }),
    ).toMatchObject({ code: "ambiguous-comparison" });
    const withUnplaced = {
      ...calendar,
      anchors: [{ id: "omen", name: "Omen" }],
    };
    const unplaced = {
      year: 620,
      precision: "anchor" as const,
      anchorId: "omen",
    };
    expect(
      validateHistoricalAnchorCompatibility({
        event: eventSnapshot({ start_date: unplaced }),
        startDate,
        calendar: withUnplaced,
      }),
    ).toMatchObject({ code: "ambiguous-comparison" });
    expect(
      validateHistoricalAnchorCompatibility({
        event: eventSnapshot(),
        startDate: unplaced,
        calendar: withUnplaced,
      }),
    ).toMatchObject({ code: "ambiguous-comparison" });
    expect(
      validateHistoricalAnchorCompatibility({
        event: eventSnapshot(),
        startDate: eventSnapshot().start_date,
        calendar,
      }),
    ).toMatchObject({ ok: true });
  });
});
