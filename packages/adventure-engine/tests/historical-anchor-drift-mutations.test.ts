import { describe, expect, it } from "bun:test";
import {
  recordHistoricalAnchorDrift,
  resolveHistoricalAnchorDrift,
} from "../src/historical-anchor-drift-mutations";
import {
  HISTORICAL_ANCHOR_TITLE_SECRET_ID,
  historicalAnchorDateSecretId,
  historicalAnchorEntitySecretId,
} from "../src/historical-anchor-types";
import { parseAdventureSession } from "../src/schemas";
import {
  anchorSession,
  calendar,
  eventSnapshot,
  overBudgetAnchorSession,
} from "./historical-anchor-fixtures";
import { now } from "./reducer-fixtures";

const later = "2026-11-11T12:00:00.000Z";

describe("historical anchor drift mutations", () => {
  it.each([
    {
      status: "vault-modified",
      event: eventSnapshot({ title: "Assassination" }),
      drift: {
        status: "vault-modified",
        rebaseDecisionRequired: true,
        detectedAt: later,
        currentFingerprint: expect.any(String),
        changes: ["title"],
      },
    },
    {
      status: "vault-missing",
      event: null,
      drift: {
        status: "vault-missing",
        rebaseDecisionRequired: true,
        detectedAt: later,
        changes: ["Vault event record is missing or no longer an event."],
      },
    },
    {
      status: "clean",
      event: eventSnapshot(),
      drift: {
        status: "clean",
        rebaseDecisionRequired: false,
        detectedAt: later,
        currentFingerprint: expect.any(String),
      },
    },
  ])(
    "records $status drift while retaining baseline and play time",
    ({ event, drift }) => {
      const anchored = anchorSession();
      const before = structuredClone(anchored);
      const result = recordHistoricalAnchorDrift(anchored, {
        expectedRevision: 0,
        currentEventSnapshot: event,
        calendar,
        now: later,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.message);
      expect(result.session).toMatchObject({
        revision: 1,
        updatedAt: later,
        lastPlayedAt: now,
      });
      expect(result.session.historicalAnchor?.drift).toEqual(drift);
      expect(result.session.historicalAnchor?.baseline).toEqual(
        anchored.historicalAnchor?.baseline,
      );
      expect(anchored).toEqual(before);
    },
  );

  it("keeps the baseline and drift details when confirming keep-baseline", () => {
    const anchored = anchorSession();
    anchored.historicalAnchor!.drift = {
      status: "vault-modified",
      rebaseDecisionRequired: true,
      changes: ["title"],
      detectedAt: now,
    };
    const before = structuredClone(anchored);
    const result = resolveHistoricalAnchorDrift(anchored, {
      expectedRevision: 0,
      decision: "keep-baseline",
      now: later,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.session).toMatchObject({
      revision: 1,
      updatedAt: later,
      lastPlayedAt: now,
    });
    expect(result.session.historicalAnchor).toEqual({
      ...anchored.historicalAnchor,
      drift: {
        ...anchored.historicalAnchor!.drift,
        rebaseDecisionRequired: false,
      },
    });
    expect(anchored).toEqual(before);
  });

  it("rebases evidence while retaining only unchanged reveals and preserving committed progress", () => {
    const relevantEntityRefs = [{ recordId: "actor", displayName: "Aldous" }];
    const anchored = anchorSession(
      {
        documentedFacts: [
          { id: "stable", text: "Unchanged fact." },
          { id: "changed", text: "Old fact." },
          { id: "removed", text: "Removed fact." },
        ],
        relevantEntityRefs,
      },
      "alternate",
    );
    const anchor = anchored.historicalAnchor!;
    const entityId = historicalAnchorEntitySecretId("actor", "name");
    const dateId = historicalAnchorDateSecretId("start", "year");
    anchor.revealedFactIds = [
      HISTORICAL_ANCHOR_TITLE_SECRET_ID,
      "stable",
      "changed",
      "removed",
      entityId,
      dateId,
      "unknown",
    ];
    anchor.progress.status = "diverged";
    anchor.progress.reason = "Committed divergence";
    const before = structuredClone(anchored);
    const result = resolveHistoricalAnchorDrift(anchored, {
      expectedRevision: 0,
      decision: "rebase",
      calendar,
      now: later,
      currentEventSnapshot: eventSnapshot({
        title: "Assassination",
        relevantEntityRefs,
        documentedFacts: [
          { id: "stable", text: "Unchanged fact." },
          { id: "changed", text: "New fact." },
        ],
      }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.session).toMatchObject({
      revision: 1,
      updatedAt: later,
      lastPlayedAt: now,
    });
    expect(result.session.historicalAnchor).toMatchObject({
      policy: "alternate",
      baseline: { title: "Assassination", capturedAt: later },
      revealedFactIds: ["stable", entityId, dateId],
      progress: anchor.progress,
      drift: { status: "clean", rebaseDecisionRequired: false },
    });
    expect(anchored).toEqual(before);
  });

  it("returns detailed incompatible-rebase failures and rejects stale writes before applying a decision", () => {
    const anchored = anchorSession();
    const before = structuredClone(anchored);
    const result = resolveHistoricalAnchorDrift(anchored, {
      expectedRevision: 0,
      decision: "rebase",
      currentEventSnapshot: null,
      calendar,
      now,
    });
    expect(result).toMatchObject({
      ok: false,
      reason: "incompatible-rebase",
      message: "Historical anchor requires an existing Vault event record.",
      validationFailure: {
        code: "invalid-source-id",
        fallbackAction: "play-in-era-without-anchor",
      },
    });
    expect(
      recordHistoricalAnchorDrift(anchored, {
        expectedRevision: 99,
        currentEventSnapshot: null,
        calendar,
        now,
      }),
    ).toMatchObject({ reason: "stale-revision" });
    expect(
      resolveHistoricalAnchorDrift(anchored, {
        expectedRevision: 99,
        decision: "keep-baseline",
        now,
      }),
    ).toMatchObject({ reason: "stale-revision" });
    expect(anchored).toEqual(before);
  });

  it("retains operation-specific failures when resulting session state exceeds the budget", () => {
    const anchored = overBudgetAnchorSession();
    const before = structuredClone(anchored);
    expect(() => parseAdventureSession(anchored)).toThrow(
      "state-budget-exceeded",
    );
    const attempts = [
      [
        recordHistoricalAnchorDrift(anchored, {
          expectedRevision: 0,
          currentEventSnapshot: eventSnapshot(),
          calendar,
          now,
        }),
        "Recording anchor drift exceeds the session state budget.",
      ],
      [
        resolveHistoricalAnchorDrift(anchored, {
          expectedRevision: 0,
          decision: "keep-baseline",
          now,
        }),
        "Resolving anchor drift exceeds the session state budget.",
      ],
      [
        resolveHistoricalAnchorDrift(anchored, {
          expectedRevision: 0,
          decision: "rebase",
          currentEventSnapshot: eventSnapshot(),
          calendar,
          now,
        }),
        "Rebasing the historical anchor exceeds the session state budget.",
      ],
    ] as const;
    for (const [result, message] of attempts)
      expect(result).toEqual({
        ok: false,
        reason: "state-budget-exceeded",
        message,
      });
    expect(anchored).toEqual(before);
  });
});
