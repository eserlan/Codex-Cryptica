import { describe, expect, it } from "bun:test";
import {
  canonicalJson,
  computeHistoricalEventFingerprint,
  computeHistoricalEventFingerprintWithFacts,
} from "../src/historical-anchor-fingerprint";
import { extractDocumentedFacts } from "../src/historical-anchor-event";
import { calendar, eventSnapshot } from "./historical-anchor-fixtures";

describe("historical event fingerprints", () => {
  it("keeps the existing digest with and without a calendar", () => {
    const event = eventSnapshot();
    expect(computeHistoricalEventFingerprint(event, calendar)).toBe(
      "ec5c654491972a187b72ec92f7b67214",
    );
    expect(computeHistoricalEventFingerprint(event)).toBe(
      "31241b0e8f85fd6a89a3c7a423845abe",
    );
    expect(
      computeHistoricalEventFingerprintWithFacts(
        event,
        calendar,
        extractDocumentedFacts(event),
      ),
    ).toBe(computeHistoricalEventFingerprint(event, calendar));
  });

  it("canonicalises nested key ordering and omits undefined object properties", () => {
    expect(
      canonicalJson({ z: [null, { b: 2, a: 1 }], a: true, ignored: undefined }),
    ).toBe('{"a":true,"z":[null,{"a":1,"b":2}]}');
    const event = eventSnapshot();
    const reordered = eventSnapshot({
      start_date: {
        calendarRevision: 1,
        day: 15,
        unitId: "m2",
        precision: "day",
        year: 620,
      },
    });
    expect(computeHistoricalEventFingerprint(reordered, calendar)).toBe(
      computeHistoricalEventFingerprint(event, calendar),
    );
  });

  it("changes when relevant evidence changes, preserving the explicit mechanism exclusion", () => {
    const event = eventSnapshot();
    const baseline = computeHistoricalEventFingerprint(event, calendar);
    const variants = [
      eventSnapshot({ title: "A different title" }),
      eventSnapshot({ documentedFacts: ["Changed fact."] }),
      eventSnapshot({
        relevantEntityRefs: [{ recordId: "actor", displayName: "Aldous" }],
      }),
      eventSnapshot({ dateLabel: "Winter" }),
      eventSnapshot({ approximate: true }),
      eventSnapshot({ end_date: { year: 621, precision: "year" } }),
      eventSnapshot({ content: "Changed content.", lore: "Lore." }),
    ];
    for (const variant of variants) {
      expect(computeHistoricalEventFingerprint(variant, calendar)).not.toBe(
        baseline,
      );
    }
    expect(
      computeHistoricalEventFingerprint(event, { ...calendar, revision: 2 }),
    ).not.toBe(baseline);
    expect(
      computeHistoricalEventFingerprint(
        eventSnapshot({ openMechanisms: ["new mechanism"] }),
        calendar,
      ),
    ).toBe(baseline);
    expect(
      computeHistoricalEventFingerprint(event, {
        ...calendar,
        revision: undefined,
      }),
    ).toBe(baseline);
  });

  it("retains legacy-date end semantics and bounded text inputs", () => {
    const legacy = eventSnapshot({
      start_date: undefined,
      date: { year: 620 },
    });
    expect(computeHistoricalEventFingerprint(legacy)).toBe(
      computeHistoricalEventFingerprint({ ...legacy, end_date: legacy.date }),
    );
    const long = eventSnapshot({
      content: "x".repeat(4_000),
      documentedFacts: ["Explicit fact."],
    });
    expect(computeHistoricalEventFingerprint(long)).toBe(
      computeHistoricalEventFingerprint({
        ...long,
        content: long.content + "ignored suffix",
      }),
    );
  });
});
