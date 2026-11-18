import { describe, expect, it } from "bun:test";
import { inferOpenMechanisms } from "../src/historical-anchor-mechanisms";
import { eventSnapshot } from "./historical-anchor-fixtures";

const interval = { start: { year: 620 } };
const standardMechanisms = [
  "cause",
  "responsible-actor",
  "location",
  "exact-date",
  "consequences",
];

describe("historical anchor open mechanisms", () => {
  it("uses bounded explicit mechanisms, including an explicitly empty list", () => {
    const event = eventSnapshot({
      openMechanisms: [" cause ", "cause", " ", "x".repeat(200)],
    });
    expect(inferOpenMechanisms(event, interval, [], [])).toEqual([
      "cause",
      "x".repeat(160),
    ]);
    expect(
      inferOpenMechanisms(
        eventSnapshot({ openMechanisms: [] }),
        interval,
        [],
        [],
      ),
    ).toEqual([]);
    expect(
      inferOpenMechanisms(
        eventSnapshot({
          openMechanisms: Array.from(
            { length: 20 },
            (_, index) => `mechanism-${index}`,
          ),
        }),
        interval,
        [],
        [],
      ),
    ).toHaveLength(16);
  });

  it("leaves mechanisms open without evidence and recognises text and entity roles", () => {
    expect(inferOpenMechanisms(eventSnapshot(), interval, [], [])).toEqual(
      standardMechanisms,
    );
    expect(
      inferOpenMechanisms(
        eventSnapshot(),
        interval,
        [
          {
            id: "fact",
            text: "Because of a fever, the king died. This led to unrest.",
          },
        ],
        [
          { recordId: "actor", displayName: "Aldous", role: " Culprit " },
          { recordId: "place", displayName: "Keep", role: " PLACE " },
        ],
      ),
    ).toEqual(["exact-date"]);
    expect(
      inferOpenMechanisms(
        eventSnapshot(),
        interval,
        [
          {
            id: "fact",
            text: "The king was killed by an assassin at Castle Keep.",
          },
        ],
        [],
      ),
    ).toEqual(["cause", "exact-date", "consequences"]);
  });

  it("keeps the exact date open for approximate dates and ranges", () => {
    const day = { year: 620, month: 1, day: 1 };
    expect(
      inferOpenMechanisms(eventSnapshot(), { start: day }, [], []),
    ).not.toContain("exact-date");
    expect(
      inferOpenMechanisms(
        eventSnapshot(),
        { start: day, approximate: true },
        [],
        [],
      ),
    ).toContain("exact-date");
    expect(
      inferOpenMechanisms(eventSnapshot(), { start: day, end: day }, [], []),
    ).toContain("exact-date");
  });

  it("retains the standard fallback when all mechanisms have evidence", () => {
    expect(
      inferOpenMechanisms(
        eventSnapshot(),
        { start: { year: 620, precision: "day", unitId: "m1", day: 1 } },
        [
          {
            id: "fact",
            text: "Because of a plot by an assassin at Castle Keep, the death led to unrest.",
          },
        ],
        [],
      ),
    ).toEqual(standardMechanisms);
  });
});
