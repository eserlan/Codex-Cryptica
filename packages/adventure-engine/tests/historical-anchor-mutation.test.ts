import { describe, expect, it } from "bun:test";
import { checkSessionEditable } from "../src/historical-anchor-mutation";
import { anchorSession } from "./historical-anchor-fixtures";
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
});
