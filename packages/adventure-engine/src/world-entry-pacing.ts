import type { AdventureSession, CommittedAdventureTurn } from "./types";

/** Committed turns without any seed activity before a background sign is due. */
export const WORLD_ENTRY_QUIET_TURN_LIMIT = 3;

export interface WorldEntryPacing {
  /** Trailing committed turns in which no hidden thread changed or secret was revealed. */
  quietTurns: number;
  /** The world has been still long enough that the GM should surface one small sign. */
  signDue: boolean;
}

function hadSeedActivity(turn: CommittedAdventureTurn): boolean {
  const threads = turn.hiddenPatch.gmThreads;
  return (
    threads.add.length > 0 ||
    threads.update.length > 0 ||
    threads.removeIds.length > 0 ||
    turn.revealedSecretIds.length > 0
  );
}

/**
 * Deterministic pacing for World Entry: counts quiet turns from committed
 * history instead of leaving the model to guess how long the world was still.
 * Returns undefined for adventures that are not World Entry or have no hidden
 * threads to surface.
 */
export function worldEntryPacing(
  session: AdventureSession,
): WorldEntryPacing | undefined {
  if (!session.worldEntry) return undefined;
  const hasHiddenThread = session.hiddenState.gmThreads.some(
    (thread) => thread.status === "hidden",
  );
  if (!hasHiddenThread) return undefined;
  let quietTurns = 0;
  for (let i = session.turns.length - 1; i >= 0; i -= 1) {
    if (hadSeedActivity(session.turns[i]!)) break;
    quietTurns += 1;
    if (quietTurns >= WORLD_ENTRY_QUIET_TURN_LIMIT) break;
  }
  return {
    quietTurns,
    signDue: quietTurns >= WORLD_ENTRY_QUIET_TURN_LIMIT,
  };
}
