import { describe, it, expect } from "vitest";
import { buildEntityTimeline } from "./entity-timeline";
import { DEFAULT_CALENDAR } from "./engine";
import type { Entity, Connection } from "schema";

function conn(target: string): Connection {
  return { target, type: "related_to", strength: 1 };
}

function makeEntity(
  overrides: Partial<Entity> & { id: string; type: string; title: string },
): Entity {
  return {
    tags: [],
    labels: [],
    aliases: [],
    connections: [],
    content: "",
    status: "active",
    ...overrides,
  } as Entity;
}

const DATED_EVENT = makeEntity({
  id: "ev1",
  type: "event",
  title: "Battle of the Gate",
  date: {
    precision: "day",
    year: 100,
    unitId: "january",
    day: 5,
    calendarRevision: 1,
  },
  labels: ["Battle", "Major"],
  content: "A great battle occurred.",
  connections: [],
});

const SUBJECT = makeEntity({
  id: "sub1",
  type: "character",
  title: "Arden",
  connections: [conn("ev1")],
});

describe("buildEntityTimeline", () => {
  it("C-01 outgoing: subject has connection to event → event appears", () => {
    const result = buildEntityTimeline(
      SUBJECT,
      [SUBJECT, DATED_EVENT],
      DEFAULT_CALENDAR,
    );
    expect(result.isEmpty).toBe(false);
    expect(result.groups[0].rows[0].eventId).toBe("ev1");
  });

  it("C-01 incoming: event has connection to subject → event appears", () => {
    const subject = makeEntity({
      id: "sub2",
      type: "character",
      title: "Lyra",
      connections: [],
    });
    const event = makeEntity({
      id: "ev-incoming",
      type: "event",
      title: "The Siege",
      connections: [conn("sub2")],
      date: {
        precision: "day",
        year: 200,
        unitId: "january",
        day: 1,
        calendarRevision: 1,
      },
    });
    const result = buildEntityTimeline(
      subject,
      [subject, event],
      DEFAULT_CALENDAR,
    );
    expect(result.isEmpty).toBe(false);
    expect(result.groups[0].rows[0].eventId).toBe("ev-incoming");
  });

  it("C-02 one-hop: second-degree event NOT included", () => {
    const subject = makeEntity({
      id: "sub3",
      type: "character",
      title: "Mira",
      connections: [],
    });
    const ev1 = makeEntity({
      id: "ev-mid",
      type: "event",
      title: "Middle",
      connections: [conn("sub3")],
    });
    const ev2 = makeEntity({
      id: "ev-far",
      type: "event",
      title: "Far Event",
      connections: [conn("ev-mid")],
      date: {
        precision: "day",
        year: 300,
        unitId: "january",
        day: 1,
        calendarRevision: 1,
      },
    });
    const result = buildEntityTimeline(
      subject,
      [subject, ev1, ev2],
      DEFAULT_CALENDAR,
    );
    const ids = result.groups.flatMap((g: { rows: { eventId: string }[] }) =>
      g.rows.map((r: { eventId: string }) => r.eventId),
    );
    expect(ids).not.toContain("ev-far");
  });

  it("C-03 de-dupe: event linked both ways appears exactly once", () => {
    const subject = makeEntity({
      id: "sub4",
      type: "character",
      title: "Tal",
      connections: [conn("ev-both")],
    });
    const event = makeEntity({
      id: "ev-both",
      type: "event",
      title: "Double Link",
      connections: [conn("sub4")],
      date: {
        precision: "day",
        year: 50,
        unitId: "january",
        day: 1,
        calendarRevision: 1,
      },
    });
    const result = buildEntityTimeline(
      subject,
      [subject, event],
      DEFAULT_CALENDAR,
    );
    const ids = result.groups.flatMap((g: { rows: { eventId: string }[] }) =>
      g.rows.map((r: { eventId: string }) => r.eventId),
    );
    expect(ids.filter((id: string) => id === "ev-both").length).toBe(1);
  });

  it("C-04 sort: 3 dated events return in ascending sortKey order; tie-break by title", () => {
    const subject = makeEntity({
      id: "sub5",
      type: "character",
      title: "Zara",
      connections: [conn("ev-y300"), conn("ev-y100"), conn("ev-y200")],
    });
    const ev300 = makeEntity({
      id: "ev-y300",
      type: "event",
      title: "C Event",
      date: {
        precision: "day",
        year: 300,
        unitId: "january",
        day: 1,
        calendarRevision: 1,
      },
      connections: [],
    });
    const ev100 = makeEntity({
      id: "ev-y100",
      type: "event",
      title: "A Event",
      date: {
        precision: "day",
        year: 100,
        unitId: "january",
        day: 1,
        calendarRevision: 1,
      },
      connections: [],
    });
    const ev200 = makeEntity({
      id: "ev-y200",
      type: "event",
      title: "B Event",
      date: {
        precision: "day",
        year: 200,
        unitId: "january",
        day: 1,
        calendarRevision: 1,
      },
      connections: [],
    });
    const result = buildEntityTimeline(
      subject,
      [subject, ev300, ev100, ev200],
      DEFAULT_CALENDAR,
    );
    const titles = result.groups[0].rows.map((r: { title: string }) => r.title);
    expect(titles).toEqual(["A Event", "B Event", "C Event"]);
  });

  it("C-05 undated: event with no date → undated group, sortKey undefined, displayDateLabel 'Undated'", () => {
    const subject = makeEntity({
      id: "sub6",
      type: "character",
      title: "Solo",
      connections: [conn("ev-undated")],
    });
    const event = makeEntity({
      id: "ev-undated",
      type: "event",
      title: "Mysterious Event",
      connections: [],
    });
    const result = buildEntityTimeline(
      subject,
      [subject, event],
      DEFAULT_CALENDAR,
    );
    const undated = result.groups.find(
      (g: { kind: string }) => g.kind === "undated",
    );
    expect(undated).toBeDefined();
    expect(undated!.rows[0].sortKey).toBeUndefined();
    expect(undated!.rows[0].displayDateLabel).toBe("Undated");
  });

  it("C-06 empty: subject with no linked events → isEmpty true, groups empty", () => {
    const subject = makeEntity({
      id: "sub7",
      type: "character",
      title: "Lonely",
      connections: [],
    });
    const result = buildEntityTimeline(subject, [subject], DEFAULT_CALENDAR);
    expect(result.isEmpty).toBe(true);
    expect(result.groups.length).toBe(0);
  });

  it("C-07 no self in participants (excluded by id, not title)", () => {
    // Subject and a different entity share the same title to prove id-based exclusion
    const subject = makeEntity({
      id: "sub8",
      type: "character",
      title: "Shared Name",
      connections: [conn("ev-self")],
    });
    const doppelganger = makeEntity({
      id: "other2",
      type: "character",
      title: "Shared Name",
      connections: [],
    });
    const event = makeEntity({
      id: "ev-self",
      type: "event",
      title: "Self Event",
      connections: [conn("sub8"), conn("other1"), conn("other2")],
      date: {
        precision: "day",
        year: 10,
        unitId: "january",
        day: 1,
        calendarRevision: 1,
      },
    });
    const other = makeEntity({
      id: "other1",
      type: "character",
      title: "Other Person",
      connections: [],
    });
    const result = buildEntityTimeline(
      subject,
      [subject, event, other, doppelganger],
      DEFAULT_CALENDAR,
    );
    const row = result.groups[0].rows[0];
    // subject (sub8) excluded; doppelganger (other2, same title) still appears
    expect(row.participantTitles).toContain("Other Person");
    expect(row.participantTitles).toContain("Shared Name"); // doppelganger included
    expect(
      row.participantTitles.filter((t) => t === "Shared Name").length,
    ).toBe(1); // only one instance
  });

  it("C-08 purity: does not mutate input arrays", () => {
    const subject = makeEntity({
      id: "sub9",
      type: "character",
      title: "Pure",
      connections: [conn("ev-pure")],
    });
    const event = makeEntity({
      id: "ev-pure",
      type: "event",
      title: "Pure Event",
      connections: [],
      date: {
        precision: "day",
        year: 5,
        unitId: "january",
        day: 1,
        calendarRevision: 1,
      },
    });
    const allEntities = [subject, event];
    const subjectConnBefore = [...subject.connections];
    const allBefore = [...allEntities];
    buildEntityTimeline(subject, allEntities, DEFAULT_CALENDAR);
    expect(subject.connections).toEqual(subjectConnBefore);
    expect(allEntities).toEqual(allBefore);
  });

  it("C-09 range: event with start_date + end_date → isRange true", () => {
    const subject = makeEntity({
      id: "sub10",
      type: "character",
      title: "Range",
      connections: [conn("ev-range")],
    });
    const event = makeEntity({
      id: "ev-range",
      type: "event",
      title: "Range Event",
      connections: [],
      start_date: {
        precision: "day",
        year: 50,
        unitId: "january",
        day: 1,
        calendarRevision: 1,
      },
      end_date: {
        precision: "day",
        year: 60,
        unitId: "january",
        day: 1,
        calendarRevision: 1,
      },
    });
    const result = buildEntityTimeline(
      subject,
      [subject, event],
      DEFAULT_CALENDAR,
    );
    expect(result.groups[0].rows[0].isRange).toBe(true);
  });

  it("type filter: non-event entity linked to subject NOT included", () => {
    const subject = makeEntity({
      id: "sub11",
      type: "character",
      title: "Filter",
      connections: [conn("loc1")],
    });
    const location = makeEntity({
      id: "loc1",
      type: "location",
      title: "A Place",
      connections: [],
    });
    const result = buildEntityTimeline(
      subject,
      [subject, location],
      DEFAULT_CALENDAR,
    );
    expect(result.isEmpty).toBe(true);
  });

  it("eventCategory from labels: first label used; empty labels → undefined", () => {
    const subject = makeEntity({
      id: "sub12",
      type: "character",
      title: "Catty",
      connections: [conn("ev-labeled"), conn("ev-nocat")],
    });
    const evWithLabels = makeEntity({
      id: "ev-labeled",
      type: "event",
      title: "Labeled Event",
      labels: ["Battle", "Major"],
      connections: [],
      date: {
        precision: "day",
        year: 1,
        unitId: "january",
        day: 1,
        calendarRevision: 1,
      },
    });
    const evNoLabels = makeEntity({
      id: "ev-nocat",
      type: "event",
      title: "Unlabeled Event",
      labels: [],
      connections: [],
      date: {
        precision: "day",
        year: 2,
        unitId: "january",
        day: 1,
        calendarRevision: 1,
      },
    });
    const result = buildEntityTimeline(
      subject,
      [subject, evWithLabels, evNoLabels],
      DEFAULT_CALENDAR,
    );
    const rows = result.groups[0].rows;
    const labeled = rows.find(
      (r: { eventId: string }) => r.eventId === "ev-labeled",
    );
    const unlabeled = rows.find(
      (r: { eventId: string }) => r.eventId === "ev-nocat",
    );
    expect(labeled!.eventCategory).toBe("Battle");
    expect(unlabeled!.eventCategory).toBeUndefined();
  });

  it("C-12 long list: 200 directly linked events → returns all 200", () => {
    const connections: Connection[] = Array.from({ length: 200 }, (_, i) =>
      conn(`ev-bulk-${i}`),
    );
    const subject = makeEntity({
      id: "sub13",
      type: "character",
      title: "Busy",
      connections,
    });
    const events = Array.from({ length: 200 }, (_, i) =>
      makeEntity({
        id: `ev-bulk-${i}`,
        type: "event",
        title: `Event ${String(i).padStart(3, "0")}`,
        connections: [],
        date: {
          precision: "day",
          year: i + 1,
          unitId: "january",
          day: 1,
          calendarRevision: 1,
        },
      }),
    );
    const result = buildEntityTimeline(
      subject,
      [subject, ...events],
      DEFAULT_CALENDAR,
    );
    const total = (result.groups as { rows: unknown[] }[]).reduce(
      (s, g) => s + g.rows.length,
      0,
    );
    expect(total).toBe(200);
  });
});
