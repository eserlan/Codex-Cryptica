import { describe, expect, it } from "bun:test";
import {
  checkSessionEditable,
  finalizeHistoricalAnchorMutation,
} from "../src/historical-anchor-mutation";
import {
  anchorSession,
  overBudgetAnchorSession,
} from "./historical-anchor-fixtures";
import { now, session } from "./reducer-fixtures";

describe("historical anchor mutation checks", () => {
  it("accepts an active anchored session at its current revision without mutation", () => {
    const anchored = anchorSession();
    const before = structuredClone(anchored);
    expect(checkSessionEditable(anchored, 0)).toBeNull();
    expect(anchored).toEqual(before);
  });

  it("checks missing anchors before stale revisions and read-only state", () => {
    expect(
      checkSessionEditable({ ...session(), status: "archived" }, 99),
    ).toEqual({
      ok: false,
      reason: "missing-historical-anchor",
      message: "Session has no historical anchor.",
    });
    expect(
      checkSessionEditable({ ...anchorSession(), status: "archived" }, 99),
    ).toEqual({
      ok: false,
      reason: "stale-revision",
      message: "Session revision does not match expectedRevision.",
    });
  });

  it("rejects archived sessions and pending rolls", () => {
    const anchored = anchorSession();
    expect(
      checkSessionEditable({ ...anchored, status: "archived" }, 0),
    ).toMatchObject({ reason: "read-only-session" });
    anchored.pendingRoll = {
      id: "roll-1",
      inputId: "input-1",
      playerAction: "Walk",
      uncertainty: "Can they arrive?",
      stakes: "Time lost",
      resolutionStatus: "awaiting-outcome",
      createdAt: now,
    };
    expect(checkSessionEditable(anchored, 0)).toMatchObject({
      reason: "pending-roll",
    });
  });

  it("finalises a candidate with one revision increment and leaves play time to the caller", () => {
    const candidate = anchorSession();
    const later = "2026-11-11T12:00:00.000Z";
    const result = finalizeHistoricalAnchorMutation(
      candidate,
      later,
      "Budget failure",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.session).toMatchObject({
      revision: 1,
      updatedAt: later,
      lastPlayedAt: now,
    });
    result.session.historicalAnchor!.baseline.title =
      "Independent parsed state";
    expect(candidate.historicalAnchor?.baseline.title).toBe(
      "Death of King Aldous",
    );
  });

  it("returns the caller's failure message when schema or budget validation fails", () => {
    expect(
      finalizeHistoricalAnchorMutation(
        overBudgetAnchorSession(),
        now,
        "Budget failure",
      ),
    ).toEqual({
      ok: false,
      reason: "state-budget-exceeded",
      message: "Budget failure",
    });
    expect(
      finalizeHistoricalAnchorMutation(
        anchorSession(),
        "invalid timestamp",
        "Invalid state",
      ),
    ).toEqual({
      ok: false,
      reason: "state-budget-exceeded",
      message: "Invalid state",
    });
  });
});
