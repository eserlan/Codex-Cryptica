import {
  buildIntent,
  detectConflict,
  getBeginMeaning,
  validateRange,
} from "../src";

describe("placement intent", () => {
  it("maps event primary placement to date writes without coordinates", () => {
    const intent = buildIntent(
      { id: "event-1", type: "event", title: "Founding" },
      { meaning: getBeginMeaning("event"), date: { year: 605 } },
    );

    expect(intent.target).toBe("primary");
    expect(intent.writes).toEqual({ date: { year: 605 } });
    expect(JSON.stringify(intent.writes)).not.toContain("coordinates");
  });

  it("maps non-primary placement to an anchor write", () => {
    const meaning = {
      id: "majorAppearance",
      label: "Major appearance",
      kind: "point" as const,
      target: "anchor" as const,
      anchorType: "majorAppearance",
    };
    const intent = buildIntent(
      {
        id: "char-1",
        type: "character",
        temporalAnchors: [{ id: "a1", type: "born", date: { year: 580 } }],
      },
      { meaning, date: { year: 621 } },
    );

    expect(intent.target).toBe("anchor");
    expect(intent.writes.temporalAnchors).toHaveLength(2);
    expect(intent.writes.temporalAnchors?.[0].date?.year).toBe(580);
  });

  it("supports span writes and detects calendar-equality conflicts", () => {
    const meaning = {
      id: "range",
      label: "Relevant period",
      kind: "span" as const,
      target: "start_date" as const,
    };
    const intent = buildIntent(
      { id: "note-1", type: "note" },
      { meaning, start_date: { year: 500 }, end_date: { year: 550 } },
    );

    expect(intent.writes).toEqual({
      start_date: { year: 500 },
      end_date: { year: 550 },
    });
    expect(
      detectConflict(
        { id: "e", type: "event", date: { year: 1 } },
        { id: "e", type: "event", date: { year: 2 } },
      ),
    ).toBe(true);
    expect(
      detectConflict(
        { id: "e", type: "event", date: { year: 1 } },
        { id: "e", type: "event", date: { year: 1 } },
      ),
    ).toBe(false);
  });

  it("builds create-event intents without moving the source entity", () => {
    const intent = buildIntent(
      { id: "char-1", type: "character", title: "Avel", date: { year: 580 } },
      {
        meaning: {
          id: "majorAppearance",
          label: "Major appearance",
          kind: "point",
          target: "anchor",
          anchorType: "majorAppearance",
        },
        date: { year: 621 },
        createEvent: true,
        eventTitle: "Avel - 621",
      },
    );

    expect(intent.writes).toEqual({});
    expect(intent.createEvent).toEqual({
      title: "Avel - 621",
      date: { year: 621 },
      anchorType: "majorAppearance",
      connectionType: "related_to",
    });
  });
});

describe("validateRange", () => {
  it("passes valid ranges and flags basic inverted year ranges", () => {
    expect(validateRange({ year: 500 }, { year: 600 }).valid).toBe(true);
    expect(validateRange({ year: 600 }, { year: 500 }).valid).toBe(false);
  });

  it("flags inverted month ranges within the same year", () => {
    expect(
      validateRange({ year: 600, month: 2 }, { year: 600, month: 5 }).valid,
    ).toBe(true);
    expect(
      validateRange({ year: 600, month: 5 }, { year: 600, month: 2 }).valid,
    ).toBe(false);
  });

  it("flags inverted day ranges within the same year and month", () => {
    expect(
      validateRange(
        { year: 600, month: 5, day: 10 },
        { year: 600, month: 5, day: 20 },
      ).valid,
    ).toBe(true);
    expect(
      validateRange(
        { year: 600, month: 5, day: 20 },
        { year: 600, month: 5, day: 10 },
      ).valid,
    ).toBe(false);
  });
});
