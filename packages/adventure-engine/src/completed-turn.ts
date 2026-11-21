import { mergeProvisionalFacts } from "./provisional-facts";
import { systemIdGenerator } from "@codex/runtime";
import {
  classifyHiddenLeakageFinding,
  constrainHiddenSecretVisibility,
  detectHiddenLeakage,
  detectPackageLeakage,
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
import {
  applyPackageActorEvents,
  applyPackageProgressEvents,
  nullMap,
  planSceneProgress,
  type PackageProgressIndex,
} from "./package-progress";
import { applyPlaces } from "./places";
import { materializeTurnState, type MaterializedTurnState } from "./turn-state";
import type {
  ActorEventProposal,
  AdventureSession,
  AdventureTurnProposal,
  AdventureValidationError,
  CommitMetadata,
  CommittedAdventureTurn,
  PackageEventProposal,
  PackageProgress,
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
  meta: CommitMetadata,
): ReturnType<typeof error> | null {
  if (hasImmutableScenarioRewrite(session, proposal)) {
    return error("conflicting-patch", "Scenario baseline truth is immutable.");
  }
  const leakage =
    detectPackageLeakage(proposal, meta, session)[0] ??
    detectHiddenLeakage(session, proposal)[0];
  if (leakage) {
    return error(
      "hidden-leakage",
      "The response contains unrevealed GM information.",
      classifyHiddenLeakageFinding(leakage),
    );
  }
  return null;
}

/**
 * The clock after the turn's time advance. An advance the clock cannot take
 * (an unknown background thread, too long a step) leaves the clock alone and is
 * recorded in `dropped`; the turn stands.
 */
function resolveClock(
  session: AdventureSession,
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>,
  turnId: string,
  dropped: string[],
) {
  const requested = applyTimeAdvance(session, proposal.timeAdvance, turnId);
  if (requested.ok)
    return {
      time: requested,
      timeAdvance: proposal.timeAdvance,
      applied: true,
    };
  dropped.push(`timeAdvance: ${requested.reason}`);
  return {
    time: { ok: true as const, value: session.worldTime },
    timeAdvance: undefined,
    applied: false,
  };
}

function packageIndexFromMeta(
  meta: CommitMetadata,
): PackageProgressIndex | undefined {
  if (!meta.packageRecordKinds) return undefined;
  return {
    packageSceneIds: [...(meta.packageSceneIds ?? [])],
    packageRecordKinds: nullMap(Object.entries(meta.packageRecordKinds)),
    packageSceneBranches: nullMap(
      Object.entries(meta.packageSceneBranches ?? {}).map(
        ([id, targets]) => [id, [...targets]] as const,
      ),
    ),
    packageActorIds: [...(meta.packageActorIds ?? [])],
  };
}

/** A reported scene ID counts only when the session's package has that scene. */
function validSceneMove(
  candidate: AdventureSession,
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>,
  meta: CommitMetadata,
  dropped: string[],
): string | undefined {
  const sceneId = proposal.visiblePatch.packageSceneId;
  if (sceneId === undefined) return undefined;
  if (candidate.sourcePackage && meta.packageSceneIds?.includes(sceneId)) {
    return sceneId;
  }
  dropped.push(`packageSceneId: unknown scene ${sceneId.slice(0, 80)}`);
  return undefined;
}

/** Moves the scene and writes the scene-move events, then the proposed ones, in one pass. */
function applyLedgerProgress(
  before: PackageProgress,
  index: PackageProgressIndex,
  moveTo: string | undefined,
  proposed: readonly PackageEventProposal[],
  meta: CommitMetadata,
  dropped: string[],
): PackageProgress {
  const inputs = [...planSceneProgress(before, index, moveTo), ...proposed];
  const result = inputs.length
    ? applyPackageProgressEvents(before, inputs, { turnId: meta.turnId, index })
    : { progress: before, dropped: [] };
  dropped.push(...result.dropped);
  return { ...result.progress, sceneId: moveTo ?? before.sceneId };
}

function applyActorProgress(
  progress: PackageProgress,
  proposedActors: readonly ActorEventProposal[],
  index: PackageProgressIndex,
  meta: CommitMetadata,
  dropped: string[],
): PackageProgress {
  if (proposedActors.length === 0) return progress;
  const actorResult = applyPackageActorEvents(progress, proposedActors, {
    turnId: meta.turnId,
    index,
  });
  dropped.push(...actorResult.dropped);
  return actorResult.progress;
}

function dropMissingPackageProposals(
  proposed: readonly PackageEventProposal[],
  proposedActors: readonly ActorEventProposal[],
  dropped: string[],
): void {
  for (const event of proposed) {
    dropped.push(`packageEvents: no package ${event.recordId.slice(0, 80)}`);
  }
  for (const event of proposedActors) {
    dropped.push(`actorEvents: no package ${event.actorId.slice(0, 80)}`);
  }
}

function resolvePackageProgress(
  candidate: AdventureSession,
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>,
  meta: CommitMetadata,
  dropped: string[],
): void {
  const moveTo = validSceneMove(candidate, proposal, meta, dropped);
  const before = candidate.packageProgress;
  const index = packageIndexFromMeta(meta);
  const proposed = proposal.packageEvents ?? [];
  const proposedActors = proposal.actorEvents ?? [];
  if (before && candidate.sourcePackage && index) {
    const nextProgress = applyLedgerProgress(
      before,
      index,
      moveTo,
      proposed,
      meta,
      dropped,
    );
    candidate.packageProgress = applyActorProgress(
      nextProgress,
      proposedActors,
      index,
      meta,
      dropped,
    );
    return;
  }
  dropMissingPackageProposals(proposed, proposedActors, dropped);
  if (moveTo !== undefined) {
    candidate.packageProgress = { ...before, sceneId: moveTo };
  }
}

const MAX_DROPPED_REASONS = 24;

function boundDroppedReasons(dropped: readonly string[]): string[] {
  const packageEventDrops = dropped.filter((reason) =>
    reason.startsWith("packageEvents:"),
  );
  const otherDrops = dropped.filter(
    (reason) => !reason.startsWith("packageEvents:"),
  );
  const boundedPackageEventDrops =
    packageEventDrops.length > MAX_DROPPED_REASONS
      ? [
          ...packageEventDrops.slice(0, MAX_DROPPED_REASONS - 1),
          `packageEvents: +${packageEventDrops.length - (MAX_DROPPED_REASONS - 1)} more dropped`,
        ]
      : packageEventDrops;
  const remainingSlots = Math.max(
    0,
    MAX_DROPPED_REASONS - boundedPackageEventDrops.length,
  );
  return [...otherDrops.slice(0, remainingSlots), ...boundedPackageEventDrops];
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
  const parsedProposal = parseTurnProposal(proposalInput);
  if (parsedProposal.kind !== "complete") {
    return error(
      "invalid-schema",
      "A completed turn requires a complete proposal.",
    );
  }
  const proposal = constrainHiddenSecretVisibility(session, parsedProposal);
  const proposalError = completedTurnProposalError(session, proposal, meta);
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
    meta.packageSecretTexts,
  );
  if (revealError) return error(revealError.code, revealError.message);
  const dropped = [...materialized.dropped];
  const clock = resolveClock(session, proposal, meta.turnId, dropped);
  const { time, timeAdvance } = clock;
  resolvePackageProgress(candidate, proposal, meta, dropped);
  candidate.visibleState = materialized.visibleState;
  candidate.hiddenState = materialized.hiddenState;
  const placeStep = applyPlaces(
    candidate,
    session,
    proposal.moveTo,
    materialized.visiblePatch,
    createId,
    proposal.placeCues,
  );
  if (!placeStep.ok) return error("conflicting-patch", placeStep.message);
  if (time.value && clock.applied) {
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
  const turn = createCommittedTurn(
    session,
    proposal,
    materialized,
    meta,
    now,
    timeAdvance,
  );
  candidate.turns = [...candidate.turns, turn];
  const newlyRevealedScenarioIds = new Set<string>();
  const scenarioError = markRevealedScenarios(
    candidate,
    proposal.revealScenarioIds,
    turn,
    createId,
    dropped,
    newlyRevealedScenarioIds,
  );
  if (scenarioError) return error("unknown-fact", scenarioError);
  const elaborationError = applyScenarioElaborations(
    candidate,
    proposal.elaborateScenarios,
    [...newlyRevealedScenarioIds],
    turn,
    createId,
    dropped,
  );
  if (elaborationError) return elaborationError;
  if (dropped.length > 0) {
    turn.dropped = boundDroppedReasons(dropped);
  }
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
  timeAdvance: Extract<
    AdventureTurnProposal,
    { kind: "complete" }
  >["timeAdvance"],
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
    ...(timeAdvance
      ? {
          timeAdvance: {
            minutes: timeAdvance.minutes,
            cause: timeAdvance.cause,
          },
        }
      : {}),
    suggestedActions: proposal.suggestedActions,
  };
}
