import type { HistoricalAnchorMutationResult } from "./historical-anchor-types";
import { parseAdventureSession } from "./schemas";
import type { AdventureSession } from "./types";

export function checkSessionEditable(
  session: AdventureSession,
  expectedRevision: number,
): (HistoricalAnchorMutationResult<AdventureSession> & { ok: false }) | null {
  if (!session.historicalAnchor) {
    return {
      ok: false,
      reason: "missing-historical-anchor",
      message: "Session has no historical anchor.",
    };
  }
  if (session.revision !== expectedRevision) {
    return {
      ok: false,
      reason: "stale-revision",
      message: "Session revision does not match expectedRevision.",
    };
  }
  if (session.status !== "active") {
    return {
      ok: false,
      reason: "read-only-session",
      message: "Archived sessions cannot be modified.",
    };
  }
  if (session.pendingRoll !== null) {
    return {
      ok: false,
      reason: "pending-roll",
      message:
        "Resolve the pending roll before modifying the historical anchor.",
    };
  }
  return null;
}

/** Finalises a cloned candidate; callers control whether play time advances. */
export function finalizeHistoricalAnchorMutation(
  next: AdventureSession,
  now: string,
  budgetMessage: string,
): HistoricalAnchorMutationResult<AdventureSession> {
  next.revision += 1;
  next.updatedAt = now;
  try {
    return { ok: true, session: parseAdventureSession(next) };
  } catch {
    return {
      ok: false,
      reason: "state-budget-exceeded",
      message: budgetMessage,
    };
  }
}
