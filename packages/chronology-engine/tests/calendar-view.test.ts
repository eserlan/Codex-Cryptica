import { describe, expect, it } from "vitest";
import {
  DEFAULT_CALENDAR,
  buildAgendaSections,
  buildCalendarMonth,
  filterCalendarEntries,
  resolveCalendarCurrentDate,
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

  it("leading blank cells match firstWeekday offset for a known Gregorian month", () => {
    // June 2026 starts on a Monday. getTimelineValue({year:2026,month:6,day:1}) % 7
    // must equal 1 (Mon=1 in Sun-indexed week) for the grid to be correct.
    // If epochWeekday is wrong, the leading cell count will be wrong.
    const month = buildCalendarMonth([], 2026, 6, DEFAULT_CALENDAR, 3);

    const firstWeek = month.weeks[0].days;
    const leadingBlanks = firstWeek.filter((d) => !d.inCurrentMonth);
    // June 1 2026 is Monday: 1 leading blank (Sunday column)
    expect(leadingBlanks).toHaveLength(1);
    expect(firstWeek[0].inCurrentMonth).toBe(false);
    expect(firstWeek[1].inCurrentMonth).toBe(true);
    expect(firstWeek[1].date.day).toBe(1);
  });

  it("trailing cells fill out to a full week when month ends mid-week", () => {
    // June 2026 has 30 days; June 30 is a Tuesday, so 5 trailing cells needed
    const month = buildCalendarMonth([], 2026, 6, DEFAULT_CALENDAR, 3);

    const lastWeek = month.weeks[month.weeks.length - 1].days;
    const trailingBlanks = lastWeek.filter((d) => !d.inCurrentMonth);
    expect(trailingBlanks.length).toBeGreaterThan(0);
    trailingBlanks.forEach((cell) => {
      expect(cell.date.month).toBe(7); // July
    });
  });

  it("month starting on weekday 0 with day-count divisible by daysPerWeek still renders correctly", () => {
    // Synthetic 7-day-week calendar: 28-day month starting on weekday 0
    const syntheticCalendar = {
      ...DEFAULT_CALENDAR,
      useGregorian: false,
      months: [{ id: "m1", name: "Month One", days: 28 }],
      daysPerWeek: 7,
      epochWeekday: 0,
    };
    const month = buildCalendarMonth([], 1, 1, syntheticCalendar, 3);

    // 0 leading blanks, 28 cells, 0 trailing cells — exactly 4 complete rows
    const allDays = month.weeks.flatMap((w) => w.days);
    expect(allDays).toHaveLength(28);
    expect(allDays.filter((d) => d.inCurrentMonth)).toHaveLength(28);
    expect(allDays[0].date.day).toBe(1);
  });

  it("epochWeekday offset shifts the starting column by the declared amount", () => {
    // Epoch day 0 = year 0, month 1, day 1; declaring epochWeekday=3 means
    // that day falls in column 3. buildCalendarMonth for year=0, month=1
    // should therefore have 3 leading blank cells.
    const syntheticCalendar = {
      ...DEFAULT_CALENDAR,
      useGregorian: false,
      months: [
        { id: "m1", name: "Month One", days: 30 },
        { id: "m2", name: "Month Two", days: 30 },
      ],
      daysPerWeek: 7,
      epochWeekday: 3,
    };
    const month = buildCalendarMonth([], 0, 1, syntheticCalendar, 3);

    const firstWeek = month.weeks[0].days;
    const leadingBlanks = firstWeek.filter((d) => !d.inCurrentMonth);
    expect(leadingBlanks).toHaveLength(3);
    expect(firstWeek[3].inCurrentMonth).toBe(true);
    expect(firstWeek[3].date.day).toBe(1);
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

// T044: tests for resolveCalendarCurrentDate (FR-012)
describe("resolveCalendarCurrentDate", () => {
  it("resolves from an entity titled 'current date' with an exact date", () => {
    const entities = [
      {
        id: "entity-cd",
        title: "Current Date",
        exactDate: { year: 1490, month: 3, day: 15 },
        dateKind: "exact",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];
    const result = resolveCalendarCurrentDate(entities, { currentYear: null });
    expect(result.source).toBe("entity");
    expect(result.date).toEqual({ year: 1490, month: 3, day: 15 });
    expect(result.entityId).toBe("entity-cd");
  });

  it("resolves 'today' title as entity source", () => {
    const entities = [
      {
        id: "entity-today",
        title: "Today",
        exactDate: { year: 900, month: 1, day: 1 },
        dateKind: "exact",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];
    const result = resolveCalendarCurrentDate(entities, { currentYear: null });
    expect(result.source).toBe("entity");
    expect(result.date.year).toBe(900);
  });

  it("falls through to vaultSetting when no matching entity exists", () => {
    const result = resolveCalendarCurrentDate([], { currentYear: 1350 });
    expect(result.source).toBe("vaultSetting");
    expect(result.date.year).toBe(1350);
    expect(result.date.month).toBe(1);
    expect(result.date.day).toBeUndefined();
    expect(result.entityId).toBeNull();
  });

  it("falls through to realWorld when neither entity nor vaultSetting exists", () => {
    const result = resolveCalendarCurrentDate([], { currentYear: null });
    expect(result.source).toBe("realWorld");
    const now = new Date();
    expect(result.date.year).toBe(now.getFullYear());
    expect(result.date.month).toBe(now.getMonth() + 1);
    expect(result.date.day).toBe(now.getDate());
    expect(result.entityId).toBeNull();
  });

  it("picks the oldest entity when multiple titles match", () => {
    const entities = [
      {
        id: "newer",
        title: "Current Date",
        exactDate: { year: 500, month: 6, day: 1 },
        dateKind: "exact",
        createdAt: "2025-01-01T00:00:00Z",
      },
      {
        id: "oldest",
        title: "current date",
        exactDate: { year: 200, month: 2, day: 10 },
        dateKind: "exact",
        createdAt: "2020-01-01T00:00:00Z",
      },
    ];
    const result = resolveCalendarCurrentDate(entities, { currentYear: null });
    expect(result.entityId).toBe("oldest");
    expect(result.date.year).toBe(200);
  });

  it("ignores entity title matches that have no exact date", () => {
    const entities = [
      {
        id: "approx",
        title: "present day",
        exactDate: undefined,
        dateKind: "approximate",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];
    const result = resolveCalendarCurrentDate(entities, { currentYear: 1200 });
    expect(result.source).toBe("vaultSetting");
  });
});
