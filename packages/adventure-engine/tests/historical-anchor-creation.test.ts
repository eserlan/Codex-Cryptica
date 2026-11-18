import { describe, expect, it } from "bun:test";
import { validateAndCreateHistoricalAnchor } from "../src/historical-anchor-creation";
import { computeHistoricalEventFingerprint } from "../src/historical-anchor-fingerprint";
import {
  calendar,
  eventSnapshot,
  startDate,
} from "./historical-anchor-fixtures";
import { now } from "./reducer-fixtures";

describe("historical anchor creation", () => {
  it("captures normalised evidence without changing the source", () => {
    const event = eventSnapshot({
      id: " evt-king-death ",
      title: " Death of King Aldous ",
      documentedFacts: [" Documented cause. "],
      openMechanisms: [" cause ", "cause"],
      relevantEntityRefs: [{ recordId: " actor ", displayName: " Aldous " }],
    });
    const before = structuredClone(event);
    const created = validateAndCreateHistoricalAnchor({
      event,
      startDate,
      calendar,
      now,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.reason);
    expect(created.anchor).toMatchObject({
      version: 1,
      policy: "preserve",
      eventRecordId: "evt-king-death",
      baseline: {
        title: "Death of King Aldous",
        contentFingerprint: computeHistoricalEventFingerprint(event, calendar),
        capturedAt: now,
        calendarRevision: 1,
        documentedFacts: [{ id: "anchor-fact-1", text: "Documented cause." }],
        openMechanisms: ["cause"],
        relevantEntityRefs: [{ recordId: "actor", displayName: "Aldous" }],
      },
      revealedFactIds: [],
      drift: { status: "clean", rebaseDecisionRequired: false },
    });
    expect(event).toEqual(before);
  });

  it("initialises progress from intervals and honours setup metadata for every policy", () => {
    for (const policy of ["preserve", "alternate", "discover"] as const) {
      const created = validateAndCreateHistoricalAnchor({
        event: eventSnapshot(),
        startDate: { ...startDate, day: 20 },
        calendar,
        policy,
        now,
        revision: 7,
        setupRefId: "custom-setup",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) throw new Error(created.reason);
      expect(created.anchor.policy).toBe(policy);
      expect(created.anchor.progress).toEqual({
        status: "approaching",
        updatedAtRevision: 7,
        updatedAt: now,
        causalRefs: [
          {
            kind: "setup",
            refId: "custom-setup",
            summary: "Historical anchor initialized.",
          },
        ],
      });
    }
    const reached = validateAndCreateHistoricalAnchor({
      event: eventSnapshot(),
      startDate: eventSnapshot().start_date,
      calendar,
      now,
    });
    expect(reached).toMatchObject({
      ok: true,
      anchor: { progress: { status: "reached" } },
    });
  });

  it("returns compatibility failures and retains schema rejection for invalid baseline state", () => {
    expect(
      validateAndCreateHistoricalAnchor({
        event: null,
        startDate,
        calendar,
        now,
      }),
    ).toMatchObject({ ok: false, code: "invalid-source-id" });
    expect(() =>
      validateAndCreateHistoricalAnchor({
        event: eventSnapshot({ title: " " }),
        startDate,
        calendar,
        now,
      }),
    ).toThrow();
  });
});
