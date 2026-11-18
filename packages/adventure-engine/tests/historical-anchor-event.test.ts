import { describe, expect, it } from "bun:test";
import {
  clampText,
  extractDocumentedFacts,
  extractEventRawDates,
  normalizeEntityRefs,
} from "../src/historical-anchor-event";
import { eventSnapshot } from "./historical-anchor-fixtures";

describe("historical event normalisation", () => {
  it("normalises explicit facts, skips empty and duplicate IDs, and bounds the list", () => {
    const event = eventSnapshot({
      documentedFacts: [
        "  ",
        { id: " known ", text: " A fact. " },
        { id: "known", text: "Duplicate." },
        " Fallback fact. ",
        { id: " ", text: "x".repeat(700) },
        ...Array.from({ length: 25 }, (_, index) => `Fact ${index}.`),
      ],
    });
    const before = structuredClone(event);
    const facts = extractDocumentedFacts(event);
    expect(facts).toHaveLength(20);
    expect(facts.slice(0, 3)).toEqual([
      { id: "known", text: "A fact." },
      { id: "anchor-fact-2", text: "Fallback fact." },
      { id: "anchor-fact-3", text: "x".repeat(600) },
    ]);
    expect(event).toEqual(before);
    expect(
      extractDocumentedFacts(eventSnapshot({ documentedFacts: [" "] })),
    ).toEqual([]);
  });

  it("derives sentences from content then lore, with title fallback and a shared scan budget", () => {
    expect(
      extractDocumentedFacts(
        eventSnapshot({
          content: " First. Second!\nThird? ",
          lore: "Fourth.",
          documentedFacts: [],
        }),
      ),
    ).toEqual([
      { id: "anchor-fact-1", text: "First." },
      { id: "anchor-fact-2", text: "Second!" },
      { id: "anchor-fact-3", text: "Third?" },
      { id: "anchor-fact-4", text: "Fourth." },
    ]);
    expect(
      extractDocumentedFacts(
        eventSnapshot({
          content: " ".repeat(64_000),
          lore: "Outside the scan budget.",
        }),
      ),
    ).toEqual([{ id: "anchor-fact-1", text: "Death of King Aldous" }]);
    expect(
      extractDocumentedFacts(eventSnapshot({ content: " ", title: " " })),
    ).toEqual([]);
    expect(
      extractDocumentedFacts(
        eventSnapshot({
          content: Array.from(
            { length: 30 },
            (_, index) => `Fact ${index}.`,
          ).join(" "),
        }),
      ),
    ).toHaveLength(20);
  });

  it("normalises entity references without admitting invalid or repeated records", () => {
    expect(normalizeEntityRefs(undefined)).toEqual([]);
    expect(normalizeEntityRefs([])).toEqual([]);
    expect(
      normalizeEntityRefs([
        { recordId: " ", displayName: "Nameless" },
        { recordId: "empty", displayName: " " },
        {
          recordId: " actor ",
          displayName: " Aldous ",
          role: " victim ",
          recordType: " character ",
        },
        { recordId: "actor", displayName: "Duplicate" },
        { recordId: "place", displayName: "Keep", role: " ", recordType: " " },
      ]),
    ).toEqual([
      {
        recordId: "actor",
        displayName: "Aldous",
        role: "victim",
        recordType: "character",
      },
      { recordId: "place", displayName: "Keep" },
    ]);
    expect(
      normalizeEntityRefs(
        Array.from({ length: 30 }, (_, index) => ({
          recordId: `record-${index}`,
          displayName: `Person ${index}`,
        })),
      ),
    ).toHaveLength(20);
    expect(clampText("  value  ", 3)).toBe("val");
  });

  it("prefers start_date, then legacy date, then end_date without adding precision", () => {
    const start = { year: 620 };
    const legacy = { year: 621 };
    const end = { year: 622 };
    expect(
      extractEventRawDates(
        eventSnapshot({ start_date: start, date: legacy, end_date: end }),
      ),
    ).toEqual({ rawStart: start, rawEnd: end });
    expect(
      extractEventRawDates(
        eventSnapshot({ start_date: undefined, date: legacy, end_date: end }),
      ),
    ).toEqual({ rawStart: legacy, rawEnd: end });
    expect(
      extractEventRawDates(
        eventSnapshot({ start_date: undefined, end_date: end }),
      ),
    ).toEqual({ rawStart: end, rawEnd: end });
    expect(
      extractEventRawDates(eventSnapshot({ start_date: undefined })),
    ).toEqual({});
  });
});
