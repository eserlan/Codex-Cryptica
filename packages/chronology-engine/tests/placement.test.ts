import { describe, expect, it } from "vitest";
import { buildIntent, detectConflict, getBeginMeaning } from "../src";

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
