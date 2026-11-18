import { describe, expect, it } from "bun:test";
import {
  deriveHistoricalAnchorProgress,
  transitionHistoricalAnchorProgress,
} from "../src/historical-anchor-progress";
import { anchorSession, calendar } from "./historical-anchor-fixtures";
import { now, session } from "./reducer-fixtures";

const later = "2026-11-11T12:00:00.000Z";

describe("historical anchor progress", () => {
  it("uses elapsed fictional time and inclusive approach thresholds", () => {
    const anchored = anchorSession();
    expect(deriveHistoricalAnchorProgress(anchored, calendar)).toBe("upcoming");
    anchored.worldTime = { version: 1, elapsedMinutes: 14 * 1440, events: [] };
    expect(deriveHistoricalAnchorProgress(anchored, calendar)).toBe(
      "approaching",
    );
    expect(
      deriveHistoricalAnchorProgress(anchored, calendar, {
        approachingThresholdDays: 29,
      }),
    ).toBe("upcoming");
    anchored.worldTime.elapsedMinutes = 44 * 1440;
    expect(deriveHistoricalAnchorProgress(anchored, calendar)).toBe("reached");
    anchored.worldTime.elapsedMinutes = 1;
    expect(
      deriveHistoricalAnchorProgress(anchored, calendar, {
        approachingThresholdDays: 43,
      }),
    ).toBe("approaching");
  });

  it("retains divergence and returns unresolved for missing anchors or invalid dates and time", () => {
    const anchored = anchorSession();
    expect(deriveHistoricalAnchorProgress(session(), calendar)).toBe(
      "unresolved",
    );
    expect(
      deriveHistoricalAnchorProgress(anchored, { ...calendar, revision: 2 }),
    ).toBe("unresolved");
    anchored.worldTime = { version: 1, elapsedMinutes: -1, events: [] };
    expect(deriveHistoricalAnchorProgress(anchored, calendar)).toBe(
      "unresolved",
    );
    anchored.historicalAnchor!.progress.status = "diverged";
    expect(
      deriveHistoricalAnchorProgress(anchored, { ...calendar, revision: 2 }),
    ).toBe("diverged");
  });

  it("commits bounded causal references and updates play time without changing the baseline", () => {
    const anchored = anchorSession();
    const before = structuredClone(anchored);
    const causalRefs = Array.from({ length: 45 }, (_, index) => ({
      kind: "world-time" as const,
      refId: `time-${index}`,
    }));
    const result = transitionHistoricalAnchorProgress(anchored, {
      expectedRevision: 0,
      status: "approaching",
      causalRefs,
      reason: "  Approaching the event.  ",
      now: later,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.session).toMatchObject({
      revision: 1,
      updatedAt: later,
      lastPlayedAt: later,
    });
    expect(result.session.historicalAnchor?.progress).toEqual({
      status: "approaching",
      updatedAtRevision: 1,
      updatedAt: later,
      causalRefs: causalRefs.slice(-40),
      reason: "Approaching the event.",
    });
    expect(result.session.historicalAnchor?.baseline).toEqual(
      anchored.historicalAnchor?.baseline,
    );
    expect(anchored).toEqual(before);
  });

  it("uses policy-specific divergence reasons, honours explicit reasons and clears old reasons", () => {
    for (const [policy, reason] of [
      [
        "preserve",
        "Canon divergence: committed play contradicted a fixed baseline constraint.",
      ],
      [
        "alternate",
        "Alternate timeline: committed play diverged from the anchored event baseline.",
      ],
    ] as const) {
      const anchored = anchorSession({}, policy);
      const causalRefs = [{ kind: "turn" as const, refId: "turn-1" }];
      expect(
        transitionHistoricalAnchorProgress(anchored, {
          expectedRevision: 0,
          status: "diverged",
          causalRefs,
          now,
        }),
      ).toMatchObject({
        ok: true,
        session: { historicalAnchor: { progress: { reason } } },
      });
      const custom = transitionHistoricalAnchorProgress(anchored, {
        expectedRevision: 0,
        status: "diverged",
        causalRefs,
        reason: "x".repeat(700),
        now,
      });
      expect(custom).toMatchObject({
        ok: true,
        session: {
          historicalAnchor: { progress: { reason: "x".repeat(600) } },
        },
      });
      anchored.historicalAnchor!.progress.reason = "Previous reason";
      const cleared = transitionHistoricalAnchorProgress(anchored, {
        expectedRevision: 0,
        status: "reached",
        causalRefs,
        reason: " ",
        now,
      });
      if (!cleared.ok) throw new Error(cleared.message);
      expect(cleared.session.historicalAnchor?.progress).not.toHaveProperty(
        "reason",
      );
    }
  });

  it("rejects missing causality and invalid resulting state without modifying the session", () => {
    const anchored = anchorSession();
    const before = structuredClone(anchored);
    expect(
      transitionHistoricalAnchorProgress(anchored, {
        expectedRevision: 0,
        status: "reached",
        causalRefs: [],
        now,
      }),
    ).toMatchObject({ ok: false, reason: "missing-causal-ref" });
    expect(
      transitionHistoricalAnchorProgress(anchored, {
        expectedRevision: 0,
        status: "reached",
        causalRefs: [{ kind: "turn", refId: " " }],
        now,
      }),
    ).toEqual({
      ok: false,
      reason: "state-budget-exceeded",
      message:
        "Updating historical anchor progress exceeds the session state budget.",
    });
    expect(anchored).toEqual(before);
  });
});
