import { describe, expect, it } from "bun:test";
import { detectHistoricalAnchorDrift } from "../src/historical-anchor-drift";
import { computeHistoricalEventFingerprint } from "../src/historical-anchor-fingerprint";
import {
  anchorSession,
  calendar,
  eventSnapshot,
} from "./historical-anchor-fixtures";

describe("historical anchor drift detection", () => {
  it("recognises clean normalised evidence without changing the baseline", () => {
    const anchor = anchorSession().historicalAnchor!;
    const before = structuredClone(anchor);
    const event = eventSnapshot({
      id: " evt-king-death ",
      title: " Death of King Aldous ",
    });
    expect(detectHistoricalAnchorDrift(anchor, event, calendar)).toEqual({
      status: "clean",
      rebaseDecisionRequired: false,
      currentFingerprint: computeHistoricalEventFingerprint(event, calendar),
      changes: [],
    });
    expect(anchor).toEqual(before);
  });

  it("reports missing, replaced and non-event records without a fingerprint", () => {
    const anchor = anchorSession().historicalAnchor!;
    for (const event of [
      null,
      undefined,
      eventSnapshot({ id: "replacement" }),
      eventSnapshot({ type: "note" }),
    ]) {
      expect(detectHistoricalAnchorDrift(anchor, event, calendar)).toEqual({
        status: "vault-missing",
        rebaseDecisionRequired: true,
        changes: ["Vault event record is missing or no longer an event."],
      });
    }
  });

  it("reports changed evidence in the existing order", () => {
    const anchor = anchorSession().historicalAnchor!;
    const event = eventSnapshot({
      title: "Assassination",
      approximate: true,
      start_date: { year: 621 },
      end_date: { year: 622 },
      documentedFacts: ["New evidence."],
      relevantEntityRefs: [{ recordId: "actor", displayName: "Aldous" }],
    });
    expect(
      detectHistoricalAnchorDrift(anchor, event, { ...calendar, revision: 2 }),
    ).toMatchObject({
      status: "vault-modified",
      rebaseDecisionRequired: true,
      changes: [
        "title",
        "dates",
        "documentedFacts",
        "relevantEntityRefs",
        "calendarRevision",
      ],
    });
  });

  it("falls back to content for fingerprint changes outside named evidence fields", () => {
    const anchor = anchorSession({
      documentedFacts: ["Fixed fact."],
    }).historicalAnchor!;
    expect(
      detectHistoricalAnchorDrift(
        anchor,
        eventSnapshot({
          documentedFacts: ["Fixed fact."],
          lore: "Additional lore.",
        }),
        calendar,
      ),
    ).toMatchObject({ changes: ["content"] });
    expect(
      detectHistoricalAnchorDrift(
        anchor,
        eventSnapshot({
          documentedFacts: ["Fixed fact."],
          dateLabel: "Winter",
        }),
        calendar,
      ),
    ).toMatchObject({ changes: ["content"] });
  });
});
