import { detectHiddenLeakage } from "./hidden-state";
import { parseTurnProposal } from "./schemas";
import { applyCompletedTurn } from "./completed-turn";
import { error, updatedSession } from "./reducer-result";
import type {
  AdventureSession,
  AdventureTurnProposal,
  AdventureValidationError,
  CommitMetadata,
  PendingRoll,
  Result,
  SuppliedRollOutcome,
} from "./types";

export function applyRollRequest(
  session: AdventureSession,
  proposalInput: AdventureTurnProposal,
  meta: CommitMetadata,
): Result<AdventureSession, AdventureValidationError[]> {
  if (session.status !== "active" || session.pendingRoll) {
    return error(
      "invalid-transition",
      "The session already has a pending change.",
    );
  }
  const proposal = parseTurnProposal(proposalInput);
  if (proposal.kind !== "roll-required")
    return error("invalid-schema", "A roll is required.");
  // Roll copy is shown to the player, so it gets the same secrecy guard.
  if (detectHiddenLeakage(session, proposal).length > 0) {
    return error(
      "hidden-leakage",
      "The response contains unrevealed GM information.",
    );
  }
  const candidate = structuredClone(session);
  const pending: PendingRoll = {
    id: meta.turnId,
    inputId: meta.inputId,
    playerAction: meta.playerAction ?? "",
    setupNarration: proposal.setupNarration,
    uncertainty: proposal.uncertainty,
    stakes: proposal.stakes,
    dice: proposal.dice
      ? {
          expression: proposal.dice.expression,
          bands: proposal.dice.outcomeBands,
        }
      : undefined,
    resolutionStatus: "awaiting-outcome",
    createdAt: meta.now,
    suggestedActions: proposal.suggestedActions,
  };
  candidate.pendingRoll = pending;
  return updatedSession(candidate, meta.now);
}

export function recordPendingRollOutcome(
  session: AdventureSession,
  inputId: string,
  outcome: SuppliedRollOutcome,
  meta: CommitMetadata,
): Result<AdventureSession, AdventureValidationError[]> {
  if (!session.pendingRoll || session.pendingRoll.inputId !== inputId) {
    return error("invalid-roll", "No matching pending roll exists.");
  }
  if (session.pendingRoll.suppliedOutcome) {
    return error(
      "invalid-roll",
      "A result has already been recorded for this roll.",
    );
  }
  const candidate = structuredClone(session);
  candidate.pendingRoll = {
    ...candidate.pendingRoll!,
    suppliedOutcome: outcome,
    resolutionStatus: "ready-to-resolve",
    outcomeRecordedAt: meta.now,
  };
  return updatedSession(candidate, meta.now);
}

export function dismissPendingRoll(
  session: AdventureSession,
  inputId: string,
  meta: CommitMetadata,
): Result<AdventureSession, AdventureValidationError[]> {
  if (!session.pendingRoll || session.pendingRoll.inputId !== inputId) {
    return error("invalid-roll", "No matching pending roll exists.");
  }
  if (session.pendingRoll.suppliedOutcome) {
    return error("invalid-roll", "A recorded result cannot be dismissed.");
  }
  const candidate = structuredClone(session);
  candidate.pendingRoll = null;
  return updatedSession(candidate, meta.now);
}

export function resolveRecordedRoll(
  session: AdventureSession,
  proposalInput: AdventureTurnProposal,
  meta: CommitMetadata,
): Result<AdventureSession, AdventureValidationError[]> {
  if (!session.pendingRoll?.suppliedOutcome) {
    return error("invalid-roll", "No recorded result is ready for resolution.");
  }
  const pendingRoll = session.pendingRoll;
  const result = applyCompletedTurn(
    { ...session, pendingRoll: null },
    proposalInput,
    meta,
  );
  if (!result.ok) return result;
  const candidate = result.value;
  candidate.pendingRoll = null;
  const resolvedTurn = candidate.turns[candidate.turns.length - 1]!;
  resolvedTurn.rollOutcome = pendingRoll.suppliedOutcome;
  resolvedTurn.resolvedRoll = {
    expression: pendingRoll.dice?.expression,
    bands: pendingRoll.dice?.bands,
    outcome: pendingRoll.suppliedOutcome!,
  };
  return { ok: true, value: candidate };
}
