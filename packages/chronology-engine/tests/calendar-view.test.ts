import { describe, expect, it } from "vitest";
import {
  DEFAULT_CALENDAR,
  buildAgendaSections,
  buildCalendarMonth,
  filterCalendarEntries,
  type CalendarEventEntry,
} from "../src";

function createEntry(
  overrides: Partial<CalendarEventEntry> = {},
): CalendarEventEntry {
  return {
    entityId: overrides.entityId ?? "entity-1",
    title: overrides.title ?? "Alpha",
    entityType: overrides.entityType ?? "event",
    dateKind: overrides.dateKind ?? "exact",
    date: overrides.date ?? { year: 2026, month: 6, day: 18 },
    exactDate: overrides.exactDate ?? { year: 2026, month: 6, day: 18 },
    displayDateLabel: overrides.displayDateLabel ?? "June 18, 2026",
    sortKey: overrides.sortKey ?? 1,
    relatedEntityIds: overrides.relatedEntityIds ?? [],
    labels: overrides.labels ?? [],
  };
}

describe("calendar-view helpers", () => {
  it("buckets exact-date entries into the correct day cell", () => {
    const month = buildCalendarMonth(
      [
        createEntry({
          entityId: "event-1",
          title: "Coronation",
          exactDate: { year: 2026, month: 6, day: 18 },
        }),
      ],
      2026,
      6,
      DEFAULT_CALENDAR,
      3,
    );

    const targetWeek = month.weeks.find((week) =>
      week.days.some((day) => day.date.day === 18 && day.inCurrentMonth),
    );
    const targetDay = targetWeek?.days.find(
      (day) => day.date.day === 18 && day.inCurrentMonth,
    );

    expect(targetDay?.entries).toHaveLength(1);
    expect(targetDay?.entries[0]?.title).toBe("Coronation");
  });

  it("excludes approximate and missing dates from month cells", () => {
    const month = buildCalendarMonth(
      [
        createEntry({
          entityId: "approx",
          title: "Approximate Treaty",
          dateKind: "approximate",
          exactDate: undefined,
          date: { precision: "year", year: 2026, calendarRevision: 1 },
          displayDateLabel: "2026",
        }),
        createEntry({
          entityId: "missing",
          title: "Lost Chronicle",
          dateKind: "missing",
          exactDate: undefined,
          date: null,
          displayDateLabel: "Undated",
        }),
      ],
      2026,
      6,
      DEFAULT_CALENDAR,
      3,
    );

    const currentMonthEntries = month.weeks.flatMap((week) =>
      week.days
        .filter((day) => day.inCurrentMonth)
        .flatMap((day) => day.entries),
    );

    expect(currentMonthEntries).toHaveLength(0);
  });

  it("applies AND semantics across filter criteria", () => {
    const entries = [
      createEntry({
        entityId: "event-1",
        entityType: "event",
        labels: ["war", "royal"],
        relatedEntityIds: ["faction-1", "region-1"],
      }),
      createEntry({
        entityId: "event-2",
        entityType: "event",
        labels: ["war"],
        relatedEntityIds: ["faction-1"],
      }),
    ];

    const filtered = filterCalendarEntries(entries, {
      entityType: "event",
      labelIds: ["war", "royal"],
      relatedEntityIds: ["faction-1"],
    });

    expect(filtered.map((entry) => entry.entityId)).toEqual(["event-1"]);
  });

  it("computes crowded-day overflow counts and preserves visible entries", () => {
    const month = buildCalendarMonth(
      [
        createEntry({ entityId: "event-1", title: "Alpha", sortKey: 1 }),
        createEntry({ entityId: "event-2", title: "Beta", sortKey: 1 }),
        createEntry({ entityId: "event-3", title: "Gamma", sortKey: 1 }),
        createEntry({ entityId: "event-4", title: "Delta", sortKey: 1 }),
      ],
      2026,
      6,
      DEFAULT_CALENDAR,
      2,
    );

    const targetDay = month.weeks
      .flatMap((week) => week.days)
      .find((day) => day.date.day === 18 && day.inCurrentMonth);

    expect(targetDay?.entries.map((entry) => entry.title)).toEqual([
      "Alpha",
      "Beta",
    ]);
    expect(targetDay?.hiddenEntries.map((entry) => entry.title)).toEqual([
      "Delta",
      "Gamma",
    ]);
    expect(targetDay?.overflowCount).toBe(2);
  });

  it("groups agenda sections chronologically and keeps undated entries separate", () => {
    const sections = buildAgendaSections(
      [
        createEntry({
          entityId: "event-2",
          title: "Second Event",
          exactDate: { year: 2026, month: 6, day: 20 },
          displayDateLabel: "June 20, 2026",
          sortKey: 20,
        }),
        createEntry({
          entityId: "event-1",
          title: "First Event",
          exactDate: { year: 2026, month: 6, day: 18 },
          displayDateLabel: "June 18, 2026",
          sortKey: 18,
        }),
        createEntry({
          entityId: "event-3",
          title: "Approximate Event",
          dateKind: "approximate",
          exactDate: undefined,
          date: { precision: "year", year: 2026, calendarRevision: 1 },
          displayDateLabel: "2026",
          sortKey: 26,
        }),
      ],
      DEFAULT_CALENDAR,
    );

    expect(sections.map((section) => section.label)).toEqual([
      "June 18, 2026",
      "June 20, 2026",
      "Undated/Approximate",
    ]);
    expect(sections[2]?.entries[0]?.title).toBe("Approximate Event");
  });
});
