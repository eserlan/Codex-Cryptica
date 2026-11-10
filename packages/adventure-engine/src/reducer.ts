import { detectHiddenLeakage, ensureScenarioSecrets } from "./hidden-state";
import { applyTimeAdvance } from "./world-time";
import { systemIdGenerator } from "@codex/runtime";
import {
  MAX_SERIALIZED_STATE_CHARS,
  parseTurnProposal,
  validateStateBudget,
} from "./schemas";
import { existingIds, type IdFactory } from "./reducer-ids";
import {
  applyHiddenPatch,
  applyVisiblePatch,
  materializeHiddenPatch,
  materializeVisiblePatch,
} from "./state-patches";
export { applyVisiblePatch } from "./state-patches";
import { error, idAllocationError } from "./reducer-result";
import {
  hasImmutableScenarioRewrite,
  applySecretReveals,
} from "./scenario-secrets";
import {
  markRevealedScenarios,
  applyScenarioElaborations,
} from "./scenario-turns";
import { materializeProvisionalFacts } from "./provisional-facts";
import type {
  AdventureSession,
  AdventureTurnProposal,
  AdventureValidationError,
  CommitMetadata,
  CommittedAdventureTurn,
  HiddenStatePatch,
  PendingRoll,
  ProvisionalFact,
  Result,
  SuppliedRollOutcome,
  VisibleStatePatch,
} from "./types";

function completedTurnInputError(
  session: AdventureSession,
  inputId: string,
): ReturnType<typeof error> | null {
  if (session.status !== "active" || session.pendingRoll) {
    return error(
      "invalid-transition",
      "The session is not ready for a completed turn.",
    );
  }
  if (!inputId || session.turns.some((turn) => turn.inputId === inputId)) {
    return error("duplicate-input", "This action was already processed.");
  }
  return null;
}

function completedTurnProposalError(
  session: AdventureSession,
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>,
): ReturnType<typeof error> | null {
  if (hasImmutableScenarioRewrite(session, proposal)) {
    return error("conflicting-patch", "Scenario baseline truth is immutable.");
  }
  if (detectHiddenLeakage(session, proposal).length > 0) {
    return error(
      "hidden-leakage",
      "The response contains unrevealed GM information.",
    );
  }
  return null;
}

type MaterializedTurnState = {
  visibleState: AdventureSession["visibleState"];
  hiddenState: AdventureSession["hiddenState"];
  provisionalFacts: ProvisionalFact[];
  updatedProvisionalFacts: ProvisionalFact[];
  visiblePatch: VisibleStatePatch;
  hiddenPatch: HiddenStatePatch;
};

function materializeTurnState(
  session: AdventureSession,
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>,
  turnId: string,
  createId: IdFactory,
): MaterializedTurnState | { error: ReturnType<typeof error> } {
  const ids = existingIds(session);
  const visiblePatch = materializeVisiblePatch(
    proposal.visiblePatch,
    ids,
    createId,
  );
  if (!visiblePatch.ok) {
    return {
      error: idAllocationError(),
    };
  }
  const hiddenPatch = materializeHiddenPatch(
    proposal.hiddenPatch,
    ids,
    createId,
  );
  if (!hiddenPatch.ok) {
    return {
      error: idAllocationError(),
    };
  }
  const materializedFacts = materializeProvisionalFacts(
    session,
    proposal.provisionalFacts,
    turnId,
    ids,
    createId,
  );
  if ("error" in materializedFacts) return materializedFacts;
  const visibleState = applyVisiblePatch(
    session.visibleState,
    visiblePatch.value,
  );
  if (!visibleState.ok) {
    return { error: error("conflicting-patch", visibleState.errors) };
  }
  const hiddenState = applyHiddenPatch(session.hiddenState, hiddenPatch.value);
  if (!hiddenState.ok) {
    return { error: error("conflicting-patch", hiddenState.errors) };
  }
  return {
    visibleState: visibleState.value,
    hiddenState: hiddenState.value,
    provisionalFacts: materializedFacts.provisionalFacts,
    updatedProvisionalFacts: materializedFacts.updatedProvisionalFacts,
    visiblePatch: visiblePatch.value,
    hiddenPatch: hiddenPatch.value,
  };
}

export function applyCompletedTurn(
  sessionInput: AdventureSession,
  proposalInput: AdventureTurnProposal,
  meta: CommitMetadata,
  now = meta.now,
  createId: IdFactory = () => systemIdGenerator.uuid(),
): Result<AdventureSession, AdventureValidationError[]> {
  // Scenario GM text must be registered so it can be guarded and revealed.
  const session = ensureScenarioSecrets(sessionInput);
  const inputError = completedTurnInputError(session, meta.inputId);
  if (inputError) return inputError;
  const proposal = parseTurnProposal(proposalInput);
  if (proposal.kind !== "complete") {
    return error(
      "invalid-schema",
      "A completed turn requires a complete proposal.",
    );
  }
  const proposalError = completedTurnProposalError(session, proposal);
  if (proposalError) return proposalError;
  const materialized = materializeTurnState(
    session,
    proposal,
    meta.turnId,
    createId,
  );
  if ("error" in materialized) return materialized.error;
  const candidate = structuredClone(session);
  const revealError = applySecretReveals(
    candidate,
    materialized.hiddenState.secrets,
    proposal.revealSecretIds,
    meta.turnId,
  );
  if (revealError) return error("unknown-secret", revealError);
  const time = applyTimeAdvance(session, proposal.timeAdvance, meta.turnId);
  if (!time.ok) return error("invalid-transition", time.reason);
  candidate.visibleState = materialized.visibleState;
  candidate.hiddenState = materialized.hiddenState;
  if (time.value) candidate.worldTime = time.value;
  const updatedIds = new Set(
    materialized.updatedProvisionalFacts.map((fact) => fact.id),
  );
  candidate.provisionalFacts = [
    ...candidate.provisionalFacts.map((fact) =>
      updatedIds.has(fact.id)
        ? materialized.updatedProvisionalFacts.find((u) => u.id === fact.id)!
        : fact,
    ),
    ...materialized.provisionalFacts,
  ];
  const turn: CommittedAdventureTurn = {
    id: meta.turnId,
    sequence: session.turns.length,
    inputId: meta.inputId,
    playerAction: meta.playerAction ?? "",
    narration: proposal.narration,
    visiblePatch: materialized.visiblePatch,
    hiddenPatch: materialized.hiddenPatch,
    revealedSecretIds: proposal.revealSecretIds,
    sourceRecordIds: proposal.sourceRecordIds,
    provisionalFactIds: [
      ...materialized.provisionalFacts.map((fact) => fact.id),
      ...materialized.updatedProvisionalFacts.map((fact) => fact.id),
    ],
    committedAt: now,
    ...(proposal.timeAdvance
      ? {
          timeAdvance: {
            minutes: proposal.timeAdvance.minutes,
            cause: proposal.timeAdvance.cause,
          },
        }
      : {}),
    suggestedActions: proposal.suggestedActions,
  };
  candidate.turns = [...candidate.turns, turn];
  const scenarioError = markRevealedScenarios(
    candidate,
    proposal.revealScenarioIds,
    turn,
    createId,
  );
  if (scenarioError) return error("unknown-fact", scenarioError);
  const elaborationError = applyScenarioElaborations(
    candidate,
    proposal.elaborateScenarios,
    proposal.revealScenarioIds,
    turn,
    createId,
  );
  if (elaborationError) return elaborationError;
  candidate.revision += 1;
  candidate.updatedAt = now;
  candidate.lastPlayedAt = now;
  if (!validateStateBudget(candidate)) {
    return error(
      "state-budget-exceeded",
      `The compact adventure state exceeds ${MAX_SERIALIZED_STATE_CHARS} characters.`,
    );
  }
  return { ok: true, value: candidate };
}

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
  candidate.revision += 1;
  candidate.updatedAt = meta.now;
  return { ok: true, value: candidate };
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
  candidate.revision += 1;
  candidate.updatedAt = meta.now;
  return { ok: true, value: candidate };
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
  candidate.revision += 1;
  candidate.updatedAt = meta.now;
  return { ok: true, value: candidate };
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

export function createPlayerTranscript(session: AdventureSession) {
  return {
    sessionId: session.id,
    title: session.title,
    turns: session.turns.map((turn) => ({
      sequence: turn.sequence,
      playerAction: turn.playerAction,
      narration: turn.narration,
      committedAt: turn.committedAt,
    })),
  };
}
