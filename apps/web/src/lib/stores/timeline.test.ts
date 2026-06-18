import { describe, expect, it } from "vitest";
import { DEFAULT_CALENDAR } from "chronology-engine";
import type { LocalEntity } from "./vault/types";
import { TimelineStore } from "./timeline.svelte";

function createStore() {
  const entities: Record<string, LocalEntity> = {
    "faction-1": {
      id: "faction-1",
      title: "Iron Throne",
      type: "faction",
      labels: [],
      aliases: [],
      tags: [],
      connections: [],
      content: "",
      status: "active",
    },
    "region-1": {
      id: "region-1",
      title: "Ash Coast",
      type: "location",
      labels: [],
      aliases: [],
      tags: [],
      connections: [],
      content: "",
      status: "active",
    },
    "event-1": {
      id: "event-1",
      title: "Coronation",
      type: "event",
      labels: ["Royal", "War"],
      aliases: [],
      tags: [],
      connections: [
        { target: "faction-1", type: "related_to", strength: 1 },
        { target: "region-1", type: "located_in", strength: 1 },
      ],
      content: "",
      date: { year: 2026, month: 6, day: 18 },
      status: "active",
    },
    "event-2": {
      id: "event-2",
      title: "Border Skirmish",
      type: "event",
      labels: ["war"],
      aliases: [],
      tags: [],
      connections: [{ target: "faction-1", type: "enemy", strength: 1 }],
      content: "",
      date: {
        precision: "day",
        year: 2026,
        unitId: "june",
        day: 20,
        calendarRevision: 1,
      },
      status: "active",
    },
    "event-3": {
      id: "event-3",
      title: "Rumored Prophecy",
      type: "event",
      labels: ["mystery"],
      aliases: [],
      tags: [],
      connections: [],
      content: "",
      date: { precision: "year", year: 2027, calendarRevision: 1 },
      status: "active",
    },
    "event-4": {
      id: "event-4",
      title: "Fallen Banner",
      type: "event",
      labels: ["royal"],
      aliases: [],
      tags: [],
      connections: [],
      content: "",
      start_date: { year: 2028, month: 1, day: 2 },
      end_date: { year: 2028, month: 1, day: 9 },
      status: "active",
    },
    "event-5": {
      id: "event-5",
      title: "Alpha Accord",
      type: "event",
      labels: ["royal"],
      aliases: [],
      tags: [],
      connections: [],
      content: "",
      date: { year: 2026, month: 6, day: 18 },
      status: "active",
    },
    "event-6": {
      id: "event-6",
      title: "Undated Relic",
      type: "event",
      labels: [],
      aliases: [],
      tags: [],
      connections: [],
      content: "",
      status: "active",
    },
    "event-7": {
      id: "event-7",
      title: "Forgotten Oath",
      type: "event",
      aliases: [],
      tags: [],
      content: "",
      status: "active",
    } as unknown as LocalEntity,
  };

  const store = new TimelineStore({
    vault: {
      activeVaultId: "vault-1",
      entities,
      allEntities: Object.values(entities),
      status: "idle",
    },
    graph: {
      eras: [{ id: "era-1", name: "Age of Crowns", start_year: 2020 }],
    },
    calendarStore: {
      config: { ...DEFAULT_CALENDAR, revision: 1 },
    },
  });

  return { store, entities };
}

describe("TimelineStore", () => {
  it("derives world-scoped calendar entries and agenda grouping", () => {
    const { store } = createStore();

    expect(store.calendarEntries.map((entry) => entry.entityId)).toContain(
      "event-1",
    );
    expect(store.agendaSections.map((section) => section.label)).toContain(
      "Undated/Approximate",
    );
  });

  it("supports active month navigation", () => {
    const { store } = createStore();

    store.activeYear = 2026;
    store.activeMonth = 12;
    store.nextMonth();
    expect(store.activeYear).toBe(2027);
    expect(store.activeMonth).toBe(1);

    store.previousMonth();
    expect(store.activeYear).toBe(2026);
    expect(store.activeMonth).toBe(12);
  });

  it("keeps same-day entries in stable title order when chronology is equal", () => {
    const { store } = createStore();

    store.activeYear = 2026;
    store.activeMonth = 6;

    const day18 = store.calendarMonthView.weeks
      .flatMap((week) => week.days)
      .find((day) => day.date.day === 18 && day.inCurrentMonth);

    expect(day18?.entries.map((entry) => entry.title)).toEqual([
      "Alpha Accord",
      "Coronation",
    ]);
  });

  it("filters with AND semantics across type, label, and related entity", () => {
    const { store } = createStore();

    store.filterType = "event";
    store.selectedLabel = "royal";
    store.selectedRelatedEntityId = "faction-1";

    expect(
      store.filteredCalendarEntries.map((entry) => entry.entityId),
    ).toEqual(["event-1"]);
  });

  it("keeps approximate dates out of the month grid and in the agenda", () => {
    const { store } = createStore();

    store.activeYear = 2027;
    store.activeMonth = 1;

    const januaryEntries = store.calendarMonthView.weeks.flatMap((week) =>
      week.days
        .filter((day) => day.inCurrentMonth)
        .flatMap((day) => day.entries),
    );

    expect(januaryEntries.map((entry) => entry.entityId)).not.toContain(
      "event-3",
    );
    expect(
      store.agendaSections
        .find((section) => section.label === "Undated/Approximate")
        ?.entries.map((entry) => entry.entityId),
    ).toContain("event-3");
  });

  it("uses start-date-only placement for multi-day entries", () => {
    const { store } = createStore();

    store.activeYear = 2028;
    store.activeMonth = 1;

    const januaryDays = store.calendarMonthView.weeks.flatMap((week) =>
      week.days.filter((day) => day.inCurrentMonth),
    );
    const startDay = januaryDays.find((day) => day.date.day === 2);
    const endDay = januaryDays.find((day) => day.date.day === 9);

    expect(startDay?.entries.map((entry) => entry.title)).toContain(
      "Fallen Banner",
    );
    expect(endDay?.entries.map((entry) => entry.title)).not.toContain(
      "Fallen Banner",
    );
  });

  it("includes undated entries only when requested", () => {
    const { store } = createStore();

    expect(store.calendarEntries.map((entry) => entry.entityId)).not.toContain(
      "event-6",
    );

    store.includeUndated = true;

    expect(store.calendarEntries.map((entry) => entry.entityId)).toContain(
      "event-6",
    );
  });

  it("tolerates undated entities without labels when filters are active", () => {
    const { store } = createStore();

    store.selectedLabel = "royal";
    store.includeUndated = true;

    expect(store.availableLabels).toContain("Royal");
    expect(
      store.filteredCalendarEntries.map((entry) => entry.entityId),
    ).not.toContain("event-7");
  });
});

describe("resolveExactDate edge cases (via calendarEntries)", () => {
  function makeStore(
    extraEntities: Record<string, import("./vault/types").LocalEntity>,
  ) {
    const store = new TimelineStore({
      vault: {
        activeVaultId: "vault-1",
        entities: extraEntities,
        allEntities: Object.values(extraEntities),
        status: "idle",
      },
      graph: { eras: [] },
      calendarStore: { config: { ...DEFAULT_CALENDAR, revision: 1 } },
    });
    return store;
  }

  it("treats a legacy date missing day as approximate, not exact", () => {
    const store = makeStore({
      "e-1": {
        id: "e-1",
        title: "Vague Entry",
        type: "event",
        labels: [],
        aliases: [],
        tags: [],
        connections: [],
        content: "",
        status: "active",
        date: { year: 2026, month: 6 } as any,
      },
    });

    const entry = store.calendarEntries.find((e) => e.entityId === "e-1");
    expect(entry?.dateKind).toBe("approximate");
    expect(entry?.exactDate).toBeUndefined();
  });

  it("treats a DateSelection with an unknown unitId as approximate, not exact", () => {
    const store = makeStore({
      "e-2": {
        id: "e-2",
        title: "Unknown Month Entry",
        type: "event",
        labels: [],
        aliases: [],
        tags: [],
        connections: [],
        content: "",
        status: "active",
        date: {
          precision: "day",
          year: 2026,
          unitId: "unknownmonth",
          day: 15,
          calendarRevision: 1,
        } as any,
      },
    });

    const entry = store.calendarEntries.find((e) => e.entityId === "e-2");
    expect(entry?.dateKind).toBe("approximate");
    expect(entry?.exactDate).toBeUndefined();
  });

  it("treats a DateSelection with year-only precision as approximate, not exact", () => {
    const store = makeStore({
      "e-3": {
        id: "e-3",
        title: "Year-only Entry",
        type: "event",
        labels: [],
        aliases: [],
        tags: [],
        connections: [],
        content: "",
        status: "active",
        date: { precision: "year", year: 2026, calendarRevision: 1 } as any,
      },
    });

    const entry = store.calendarEntries.find((e) => e.entityId === "e-3");
    expect(entry?.dateKind).toBe("approximate");
    expect(entry?.exactDate).toBeUndefined();
  });
});
