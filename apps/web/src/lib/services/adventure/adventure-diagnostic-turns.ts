import type { AdventureSession } from "@codex/adventure-engine";
import {
  dialogueLoopPacing,
  investigativeProgressPacing,
  isQuietTurn,
  SCENE_STALL_TURN_LIMIT,
  scenarioEventTurnIds,
  sceneStallPacing,
} from "@codex/adventure-engine";

type CommittedTurn = AdventureSession["turns"][number];

function changeCount(patch: {
  add: unknown[];
  update: unknown[];
  removeIds: unknown[];
}): number {
  return patch.add.length + patch.update.length + patch.removeIds.length;
}

/**
 * Per-turn signals worked out from each turn's own patches, so older turns
 * (which are condensed and lose their patches) can still be scored:
 * `quiet` is a turn that changed nothing in the world, `locationChanged` is a
 * rewritten location line, and `stateChanges` counts visible state entries
 * added, updated or removed.
 */
function turnSignals(turn: CommittedTurn, scenarioTurnIds: Set<string>) {
  const visible = turn.visiblePatch;
  const stateChanges =
    changeCount(visible.objectives) +
    changeCount(visible.activeCharacters) +
    changeCount(visible.knownFacts) +
    changeCount(visible.relationships);
  // Defaults are left out to keep long sessions compact; see the readme.
  return {
    ...(isQuietTurn(turn, scenarioTurnIds) ? { quiet: true } : {}),
    ...(visible.location !== undefined ? { locationChanged: true } : {}),
    ...(stateChanges > 0 ? { stateChanges } : {}),
  };
}

export function diagnosticTurns(session: AdventureSession, cutoff: number) {
  const scenarioTurnIds = scenarioEventTurnIds(session);
  return session.turns.map((turn, index) => {
    const signals = turnSignals(turn, scenarioTurnIds);
    if (index >= cutoff) {
      return {
        detail: "full",
        ...turn,
        timeAdvance: turn.timeAdvance ?? null,
        signals,
      };
    }
    return {
      detail: "condensed",
      id: turn.id,
      sequence: turn.sequence,
      playerAction: turn.playerAction,
      narration: turn.narration,
      timeAdvance: turn.timeAdvance ?? null,
      committedAt: turn.committedAt,
      ...(turn.dropped ? { dropped: turn.dropped } : {}),
      ...(turn.generation ? { generation: turn.generation } : {}),
      signals,
    };
  });
}

/** Longest run of consecutive quiet turns, and how many runs reached the stall limit. */
function quietRuns(session: AdventureSession) {
  const scenarioTurnIds = scenarioEventTurnIds(session);
  let run = 0;
  let longest = 0;
  let stalls = 0;
  for (const turn of session.turns) {
    run = isQuietTurn(turn, scenarioTurnIds) ? run + 1 : 0;
    longest = Math.max(longest, run);
    if (run > 0 && run % SCENE_STALL_TURN_LIMIT === 0) stalls += 1;
  }
  return { longestQuietRun: longest, stalledScenes: stalls };
}

function dialogueSummary(session: AdventureSession) {
  const dialogue = dialogueLoopPacing(session);
  return {
    dialogueLoopTurns: dialogue ? dialogue.repeatedTurns : 0,
    dialogueRecoveryDue: dialogue ? dialogue.recoveryDue : false,
  };
}

function investigativeSummary(session: AdventureSession) {
  const inv = investigativeProgressPacing(session);
  return {
    investigativeStallTurns: inv ? inv.turnsWithoutAdvancement : 0,
    investigativeRecoveryDue: inv ? inv.recoveryDue : false,
    repeatedNonAnswerTurns: inv ? inv.repeatedNonAnswerTurns : 0,
  };
}

export function diagnosticTurnSummary(
  session: AdventureSession,
  cutoff: number,
  lastTurn: AdventureSession["turns"][number] | undefined,
) {
  const stall = sceneStallPacing(session);
  return {
    turnsTotal: session.turns.length,
    turnsFull: session.turns.length - cutoff,
    turnsCondensed: cutoff,
    pendingRoll: session.pendingRoll != null,
    quietTurns: stall ? stall.quietTurns : 0,
    ...dialogueSummary(session),
    ...investigativeSummary(session),
    ...quietRuns(session),
    droppedParts: session.turns.reduce(
      (total, turn) => total + (turn.dropped?.length ?? 0),
      0,
    ),
    lastPlayerAction: lastTurn?.playerAction ?? null,
  };
}
