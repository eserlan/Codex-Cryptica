import { mergeProvisionalFacts } from "./provisional-facts";
import { systemIdGenerator } from "@codex/runtime";
import {
  detectHiddenLeakage,
  ensureScenarioSecrets,
  scenarioEventSecretId,
} from "./hidden-state";
import { applyScenarioTimePressures, applyTimeAdvance } from "./world-time";
import {
  MAX_SERIALIZED_STATE_CHARS,
  parseTurnProposal,
  validateStateBudget,
} from "./schemas";
import type { IdFactory } from "./reducer-ids";
import { error, updatedSession } from "./reducer-result";
import {
  hasImmutableScenarioRewrite,
  applySecretReveals,
} from "./scenario-secrets";
import {
  markRevealedScenarios,
  applyScenarioElaborations,
} from "./scenario-turns";
import { applyPlaces } from "./places";
import { materializeTurnState, type MaterializedTurnState } from "./turn-state";
import type {
  AdventureSession,
  AdventureTurnProposal,
  AdventureValidationError,
  CommitMetadata,
  CommittedAdventureTurn,
  Result,
  ScenarioItem,
  WorldTimeState,
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
  const placeStep = applyPlaces(
    candidate,
    session,
    proposal.moveTo,
    materialized.visiblePatch,
    createId,
  );
  if (!placeStep.ok) return error("conflicting-patch", placeStep.message);
  if (time.value) {
    const pressureResult = applyTurnWorldTimeAndPressures(
      candidate,
      proposal,
      time.value,
      meta.turnId,
      now,
    );
    if (!pressureResult.ok) {
      return error(
        "state-budget-exceeded",
        "A scenario event history has reached its limit.",
      );
    }
  }
  candidate.provisionalFacts = mergeProvisionalFacts(
    candidate.provisionalFacts,
    materialized,
  );
  const turn = createCommittedTurn(session, proposal, materialized, meta, now);
  candidate.turns = [...candidate.turns, turn];
  const newlyRevealedScenarioIds = new Set<string>();
  const scenarioError = markRevealedScenarios(
    candidate,
    proposal.revealScenarioIds,
    turn,
    createId,
    newlyRevealedScenarioIds,
  );
  if (scenarioError) return error("unknown-fact", scenarioError);
  const elaborationError = applyScenarioElaborations(
    candidate,
    proposal.elaborateScenarios,
    [...newlyRevealedScenarioIds],
    turn,
    createId,
  );
  if (elaborationError) return elaborationError;
  const result = updatedSession(candidate, now);
  candidate.lastPlayedAt = now;
  if (!validateStateBudget(candidate)) {
    return error(
      "state-budget-exceeded",
      `The compact adventure state exceeds ${MAX_SERIALIZED_STATE_CHARS} characters.`,
    );
  }
  return result;
}

function applyTurnWorldTimeAndPressures(
  candidate: AdventureSession,
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>,
  timeValue: WorldTimeState,
  turnId: string,
  now: string,
): { ok: true } | { ok: false } {
  if (candidate.scenarioCollection && proposal.timeAdvance?.developments) {
    for (const dev of proposal.timeAdvance.developments) {
      const target: ScenarioItem | undefined =
        candidate.scenarioCollection.items.find(
          (item) => item.id === dev.threadId && item.status === "open",
        );
      if (target) {
        const eventId = `${turnId.slice(0, 130)}:dev:${target.events.length + 1}`;
        const secretId = scenarioEventSecretId(eventId);
        target.events.push({
          id: eventId,
          kind: "consequence",
          visibility: "gm",
          text: dev.text.trim(),
          at: now,
          turnId,
        });
        target.secretBindings.eventIds[eventId] = secretId;
      }
    }
  }

  const elapsedMinutes = timeValue.elapsedMinutes;
  candidate.worldTime = timeValue;
  const triggered = applyScenarioTimePressures(
    candidate,
    elapsedMinutes,
    turnId,
    now,
  );
  if (!triggered.ok) return { ok: false };
  if (triggered.events.length > 0) {
    candidate.worldTime = {
      ...timeValue,
      events: [
        ...timeValue.events,
        ...triggered.events.map((item) => ({
          id: `${turnId.slice(0, 120)}:world:pressure:${item.scenarioIndex}`,
          turnId,
          atMinute: elapsedMinutes,
          threadId: item.scenarioId,
          text: `Scenario pressure consequence: ${item.text}`,
        })),
      ].slice(-80),
    };
  }
  return { ok: true };
}

function createCommittedTurn(
  session: AdventureSession,
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>,
  materialized: MaterializedTurnState,
  meta: CommitMetadata,
  now: string,
): CommittedAdventureTurn {
  return {
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
}
