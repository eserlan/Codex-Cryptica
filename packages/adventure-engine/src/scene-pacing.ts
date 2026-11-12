import { scenarioEventTurnIds } from "./scenario-collection";
import type { AdventureSession, CommittedAdventureTurn } from "./types";

/** Quiet turns in a row before the GM is nudged to change the scene. */
export const SCENE_STALL_TURN_LIMIT = 4;

export interface SceneStallPacing {
  /** Trailing committed turns in which nothing in the world changed. */
  quietTurns: number;
  /** The scene has stood still long enough that the GM should change something. */
  stalled: boolean;
}

function patchHasChange(patch: {
  add: unknown[];
  update: unknown[];
  removeIds: unknown[];
}): boolean {
  return (
    patch.add.length > 0 ||
    patch.update.length > 0 ||
    patch.removeIds.length > 0
  );
}

/**
 * A turn is quiet when it changed no visible or hidden state, revealed nothing,
 * added no provisional fact, moved no time and resolved no roll. Talk and
 * scenery alone are quiet. `scenarioTurnIds` holds the turns that logged a
 * scenario event (a lead surfacing or a stage advancing), which can happen with
 * empty patches.
 */
export function isQuietTurn(
  turn: CommittedAdventureTurn,
  scenarioTurnIds: ReadonlySet<string> = new Set(),
): boolean {
  const visible = turn.visiblePatch;
  return !(
    scenarioTurnIds.has(turn.id) ||
    turn.resolvedRoll ||
    visible.location !== undefined ||
    visible.situation !== undefined ||
    patchHasChange(visible.objectives) ||
    patchHasChange(visible.activeCharacters) ||
    patchHasChange(visible.knownFacts) ||
    patchHasChange(visible.relationships) ||
    patchHasChange(turn.hiddenPatch.secrets) ||
    patchHasChange(turn.hiddenPatch.gmThreads) ||
    turn.revealedSecretIds.length > 0 ||
    turn.provisionalFactIds.length > 0 ||
    turn.timeAdvance
  );
}

/**
 * Deterministic stall detection from committed history. The model is told to
 * vary a stale scene but does not notice when it is stuck, so the engine counts.
 * `stalled` is true on every SCENE_STALL_TURN_LIMIT-th quiet turn (4, 8, ...), so
 * the nudge stays occasional instead of firing on every turn after the threshold.
 */
export function sceneStallPacing(
  session: AdventureSession,
): SceneStallPacing | undefined {
  if (session.pendingRoll || session.turns.length < SCENE_STALL_TURN_LIMIT)
    return undefined;
  const scenarioTurnIds = scenarioEventTurnIds(session);
  let quietTurns = 0;
  for (let i = session.turns.length - 1; i >= 0; i -= 1) {
    if (!isQuietTurn(session.turns[i]!, scenarioTurnIds)) break;
    quietTurns += 1;
  }
  return {
    quietTurns,
    stalled: quietTurns > 0 && quietTurns % SCENE_STALL_TURN_LIMIT === 0,
  };
}
