import { candidateScenariosForLocation } from "./contextual-rumours";
import { playerScenarioEventTurnIds } from "./scenario-collection";
import type {
  AdventureSession,
  CommittedAdventureTurn,
  ScenarioItem,
} from "./types";

/** Committed turns without player-observable scenario progress before a background sign is due. */
export const WORLD_ENTRY_QUIET_TURN_LIMIT = 1;

export interface WorldEntryPacing {
  /** Trailing committed turns without player-observable scenario progress. */
  quietTurns: number;
  /** The world has been still long enough that the GM should surface one small sign. */
  signDue: boolean;
  /** Open, unheard candidate scenario IDs matching the current location. */
  eligibleScenarioIds: string[];
  /** Open, already-heard scenario IDs relevant to the current location. */
  activeLeadIds: string[];
}

export interface WorldEntryDiscoveryMetrics {
  /** 1-based turn number of the first player-observable scenario sign/discovery, or null. */
  timeToFirstSign: number | null;
  /** 1-based turn number of the first actionable lead (heard scenario with concrete lead or actionable-clue stage), or null. */
  timeToFirstActionableLead: number | null;
}

function hasActionableDiscoveryOnTurn(
  item: ScenarioItem,
  turnId: string,
): boolean {
  const playerEvents = item.events.filter(
    (event) => event.visibility === "player",
  );
  const eventIndex = playerEvents.findIndex((event) => event.turnId === turnId);
  const stageIsActionable =
    item.stage === "actionable-clue" || item.stage === "revelation-crisis";

  if (!stageIsActionable) return false;
  if (
    item.events.some(
      (event) => event.turnId === turnId && event.kind === "stage-change",
    )
  ) {
    return true;
  }
  if (eventIndex === 0) return item.origin.kind === "manual";
  return eventIndex > 0 && playerEvents[eventIndex]?.kind === "discovery";
}

function hadPlayerSeedActivity(
  turn: CommittedAdventureTurn,
  session: AdventureSession,
  playerTurnIds: ReadonlySet<string>,
): boolean {
  if (playerTurnIds.has(turn.id)) return true;
  if (turn.revealedSecretIds.length > 0) return true;
  if (
    session.provisionalFacts.some(
      (f) =>
        f.introducedOnTurnId === turn.id &&
        f.visibility === "player-visible" &&
        Boolean(f.scenarioId),
    )
  ) {
    return true;
  }
  if (!session.scenarioCollection) {
    const threads = turn.hiddenPatch.gmThreads;
    return (
      threads.add.some((t) => t.status === "revealed") ||
      threads.update.some((t) => t.status === "revealed")
    );
  }
  return false;
}

/**
 * Deterministic pacing for World Entry: counts quiet turns from committed
 * history instead of leaving the model to guess how long the world was still.
 * Returns undefined for adventures that are not World Entry, have no hidden
 * legacy threads to surface, or have no open unheard seeds for the active locale.
 */
export function worldEntryPacing(
  session: AdventureSession,
): WorldEntryPacing | undefined {
  if (!session.worldEntry) return undefined;
  const hasHiddenThread = session.hiddenState.gmThreads.some(
    (thread) => thread.status === "hidden",
  );
  const candidates = candidateScenariosForLocation(session);
  const eligibleScenarioIds = candidates
    .filter((item) => item.status === "open" && item.knowledge === "unheard")
    .map((item) => item.id);
  const activeLeadIds = candidates
    .filter((item) => item.status === "open" && item.knowledge === "heard")
    .map((item) => item.id);

  if (!hasHiddenThread && eligibleScenarioIds.length === 0) return undefined;

  const playerTurnIds = playerScenarioEventTurnIds(session);
  let quietTurns = 0;
  for (let i = session.turns.length - 1; i >= 0; i -= 1) {
    if (hadPlayerSeedActivity(session.turns[i]!, session, playerTurnIds)) {
      break;
    }
    quietTurns += 1;
    if (quietTurns >= WORLD_ENTRY_QUIET_TURN_LIMIT) break;
  }
  return {
    quietTurns,
    signDue: quietTurns >= WORLD_ENTRY_QUIET_TURN_LIMIT,
    eligibleScenarioIds,
    activeLeadIds,
  };
}

/**
 * Computes time-to-first-sign and time-to-first-actionable-lead metrics
 * across committed turns for playtest and regression evaluation.
 */
export function worldEntryDiscoveryMetrics(
  session: AdventureSession,
): WorldEntryDiscoveryMetrics {
  if (!session.worldEntry) {
    return { timeToFirstSign: null, timeToFirstActionableLead: null };
  }

  const playerTurnIds = playerScenarioEventTurnIds(session);
  const scenarioSecretIds = new Set(
    (session.scenarioCollection?.items ?? []).flatMap((item) => [
      item.secretBindings.truth,
      ...(item.secretBindings.ifInvestigated
        ? [item.secretBindings.ifInvestigated]
        : []),
      ...Object.values(item.secretBindings.eventIds),
    ]),
  );
  let timeToFirstSign: number | null = null;
  let timeToFirstActionableLead: number | null = null;

  for (let i = 0; i < session.turns.length; i += 1) {
    const turn = session.turns[i]!;
    const turnNumber = i + 1;

    const hasSign =
      playerTurnIds.has(turn.id) ||
      turn.revealedSecretIds.some((id) => scenarioSecretIds.has(id)) ||
      session.provisionalFacts.some(
        (f) =>
          f.introducedOnTurnId === turn.id &&
          f.visibility === "player-visible" &&
          Boolean(f.scenarioId),
      ) ||
      (!session.scenarioCollection &&
        (turn.hiddenPatch.gmThreads.add.some((t) => t.status === "revealed") ||
          turn.hiddenPatch.gmThreads.update.some(
            (t) => t.status === "revealed",
          )));

    if (hasSign && timeToFirstSign === null) {
      timeToFirstSign = turnNumber;
    }

    const hasActionableLead =
      session.scenarioCollection?.items.some((item) => {
        return hasActionableDiscoveryOnTurn(item, turn.id);
      }) ||
      session.provisionalFacts.some(
        (f) =>
          f.introducedOnTurnId === turn.id &&
          f.visibility === "player-visible" &&
          f.kind === "clue" &&
          Boolean(f.scenarioId),
      );

    if (hasActionableLead && timeToFirstActionableLead === null) {
      timeToFirstActionableLead = turnNumber;
    }
  }

  return { timeToFirstSign, timeToFirstActionableLead };
}
