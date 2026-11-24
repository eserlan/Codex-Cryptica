import {
  matchesScenarioLocation,
  type LocationContext,
} from "./contextual-rumours";
import {
  collectActionMatches,
  isDisengagementAction,
  type ActionMatch,
} from "./gm-director-action-matching";
import {
  DIRECTOR_HISTORY_LOOKBACK_TURNS,
  MAX_OTHER_SCENARIO_IDS,
  type DirectorConfidence,
  type DirectorProvenance,
} from "./gm-director-brief-contract";
import type {
  AdventureSession,
  ScenarioElaborationStage,
  ScenarioItem,
} from "./types";

const MAX_PURSUED_SCENARIOS = 2;
const RECENT_EVENT_TURN_WINDOW = 3;

const STAGE_WEIGHT: Record<ScenarioElaborationStage, number> = {
  "revelation-crisis": 3,
  "actionable-clue": 2,
  hearsay: 1,
};

const PROVENANCE_TIER: Record<DirectorProvenance, number> = {
  "player-action": 4,
  "focused-scenario": 3,
  "recent-event": 2,
  "current-location": 1,
};

const CONFIDENCE_WEIGHT: Record<DirectorConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const INVESTIGATIVE_RE =
  /\b(?:investigat\w*|clue|clues|lead|leads|rumour|rumours|rumor|rumors|gossip|local\s+news|news\b|mystery|suspect\w*|witness\w*|search\w*|inspect\w*|examin\w*|follow\s+up|look\s+into|check\s+out|what\s+happened|who\s+is\s+behind|missing|vanish\w*|disappear\w*|secret\w*|trail|tracks|evidence)\b/i;

function isLocationBoundScenario(scenario: ScenarioItem): boolean {
  return (
    Boolean(scenario.origin.batchTitle?.startsWith("Rumours in ")) ||
    Boolean(scenario.origin.sourceRecordId) ||
    scenario.anchorRefs.length > 0
  );
}

function latestScenarioRecency(
  scenario: ScenarioItem,
  turnIndexById: ReadonlyMap<string, number>,
): { turnIndex: number; timestamp: number } {
  let bestTurnIndex = -1;
  let bestTimestamp = -1;
  for (const event of scenario.events) {
    const turnIndex = event.turnId
      ? (turnIndexById.get(event.turnId) ?? -1)
      : -1;
    const parsed = Date.parse(event.at);
    const timestamp = Number.isFinite(parsed) ? parsed : -1;
    if (turnIndex > bestTurnIndex) bestTurnIndex = turnIndex;
    if (timestamp > bestTimestamp) bestTimestamp = timestamp;
  }
  return { turnIndex: bestTurnIndex, timestamp: bestTimestamp };
}

export interface RankedCandidate {
  item: ScenarioItem;
  provenance: DirectorProvenance;
  confidence: DirectorConfidence;
  actionHits: number;
  exactPhrase: boolean;
  isFocused: boolean;
  hasRecentEvent: boolean;
  matchesLocation: boolean;
  recency: { turnIndex: number; timestamp: number };
}

interface RankingContext {
  focusedId: string | null;
  location: LocationContext | null;
  recentTurnIds: ReadonlySet<string>;
  turnIndexById: ReadonlyMap<string, number>;
  actionMatches: ReadonlyMap<string, ActionMatch>;
  suppressBackgroundFocus: boolean;
}

function resolveBackgroundProvenance(
  isFocused: boolean,
  staleLocationBound: boolean,
  hasRecentEvent: boolean,
  matchesLocation: boolean,
): { provenance: DirectorProvenance; confidence: DirectorConfidence } | null {
  if (isFocused && !staleLocationBound) {
    return { provenance: "focused-scenario", confidence: "medium" };
  }
  if (hasRecentEvent && !staleLocationBound) {
    return { provenance: "recent-event", confidence: "medium" };
  }
  if (matchesLocation) {
    return { provenance: "current-location", confidence: "low" };
  }
  return null;
}

function classifyScenarioCandidate(
  item: ScenarioItem,
  ctx: RankingContext,
): RankedCandidate | null {
  const matchesLocation = ctx.location
    ? matchesScenarioLocation(item, ctx.location)
    : false;
  const isFocused = item.id === ctx.focusedId;
  const staleLocationBound =
    ctx.location !== null && isLocationBoundScenario(item) && !matchesLocation;
  const staleFocused = isFocused && staleLocationBound;
  const hasRecentEvent = item.events.some(
    (event) =>
      event.turnId !== undefined && ctx.recentTurnIds.has(event.turnId),
  );
  const recency = latestScenarioRecency(item, ctx.turnIndexById);
  const actionMatch = ctx.actionMatches.get(item.id);

  if (actionMatch) {
    return {
      item,
      provenance: "player-action",
      confidence: actionMatch.confidence,
      actionHits: actionMatch.hits,
      exactPhrase: actionMatch.exactPhrase,
      isFocused: isFocused && !staleFocused,
      hasRecentEvent,
      matchesLocation,
      recency,
    };
  }
  if (ctx.suppressBackgroundFocus) return null;

  const background = resolveBackgroundProvenance(
    isFocused,
    staleLocationBound,
    hasRecentEvent,
    matchesLocation,
  );
  if (!background) return null;

  return {
    item,
    provenance: background.provenance,
    confidence: background.confidence,
    actionHits: 0,
    exactPhrase: false,
    isFocused: background.provenance === "focused-scenario",
    hasRecentEvent,
    matchesLocation,
    recency,
  };
}

function buildRankingContext(
  session: AdventureSession,
  effectiveAction: string | undefined,
  location: LocationContext | null,
  actionMatches: ReadonlyMap<string, ActionMatch>,
  disengaged: boolean,
): RankingContext {
  const investigative = Boolean(
    effectiveAction && INVESTIGATIVE_RE.test(effectiveAction),
  );
  const historyStart = Math.max(
    0,
    session.turns.length - DIRECTOR_HISTORY_LOOKBACK_TURNS,
  );
  const turnIndexById = new Map<string, number>();
  for (let idx = historyStart; idx < session.turns.length; idx += 1) {
    turnIndexById.set(session.turns[idx]!.id, idx);
  }
  return {
    focusedId: session.scenarioCollection?.focusedScenarioId ?? null,
    location,
    recentTurnIds: new Set(
      session.turns.slice(-RECENT_EVENT_TURN_WINDOW).map((turn) => turn.id),
    ),
    turnIndexById,
    actionMatches,
    suppressBackgroundFocus:
      Boolean(effectiveAction) &&
      (disengaged || (actionMatches.size === 0 && !investigative)),
  };
}

function buildOtherOpenIds(
  ranked: readonly RankedCandidate[],
  pursued: readonly RankedCandidate[],
  unrankedIds: readonly string[],
): string[] {
  const pursuedIds = new Set(pursued.map((entry) => entry.item.id));
  return [
    ...ranked
      .filter((entry) => !pursuedIds.has(entry.item.id))
      .map((entry) => entry.item.id),
    ...unrankedIds,
  ].slice(0, MAX_OTHER_SCENARIO_IDS);
}

export function rankOpenHeardScenarios(
  openHeard: readonly ScenarioItem[],
  session: AdventureSession,
  effectiveAction: string | undefined,
  location: LocationContext | null,
): {
  pursued: RankedCandidate[];
  otherIds: string[];
} {
  if (openHeard.length === 0) return { pursued: [], otherIds: [] };

  const disengaged = isDisengagementAction(effectiveAction);
  const actionMatches = collectActionMatches(
    openHeard,
    session,
    effectiveAction,
    location,
    disengaged,
  );
  const ctx = buildRankingContext(
    session,
    effectiveAction,
    location,
    actionMatches,
    disengaged,
  );

  const ranked: RankedCandidate[] = [];
  const unrankedIds: string[] = [];
  for (const item of openHeard) {
    const candidate = classifyScenarioCandidate(item, ctx);
    if (candidate) ranked.push(candidate);
    else unrankedIds.push(item.id);
  }
  ranked.sort(compareCandidates);

  const pursued = selectPursuedCandidates(ranked);
  return { pursued, otherIds: buildOtherOpenIds(ranked, pursued, unrankedIds) };
}

function compareActionMatches(a: RankedCandidate, b: RankedCandidate): number {
  if (a.provenance !== "player-action" || b.provenance !== "player-action") {
    return 0;
  }
  return (
    CONFIDENCE_WEIGHT[b.confidence] - CONFIDENCE_WEIGHT[a.confidence] ||
    Number(b.exactPhrase) - Number(a.exactPhrase) ||
    b.actionHits - a.actionHits
  );
}

function compareRecency(a: RankedCandidate, b: RankedCandidate): number {
  return (
    b.recency.turnIndex - a.recency.turnIndex ||
    b.recency.timestamp - a.recency.timestamp
  );
}

function compareCandidateRank(a: RankedCandidate, b: RankedCandidate): number {
  return (
    PROVENANCE_TIER[b.provenance] - PROVENANCE_TIER[a.provenance] ||
    compareActionMatches(a, b) ||
    Number(b.isFocused) - Number(a.isFocused) ||
    STAGE_WEIGHT[b.item.stage] - STAGE_WEIGHT[a.item.stage] ||
    compareRecency(a, b) ||
    Number(b.matchesLocation) - Number(a.matchesLocation)
  );
}

function compareCandidates(a: RankedCandidate, b: RankedCandidate): number {
  return compareCandidateRank(a, b) || a.item.id.localeCompare(b.item.id);
}

function areDirectlyCoupled(a: ScenarioItem, b: ScenarioItem): boolean {
  return (
    a.events.some((event) => event.causedBy?.scenarioId === b.id) ||
    b.events.some((event) => event.causedBy?.scenarioId === a.id)
  );
}

function isTiedForPursuit(
  primary: RankedCandidate,
  second: RankedCandidate,
): boolean {
  return compareCandidateRank(primary, second) === 0;
}

function selectPursuedCandidates(
  ranked: readonly RankedCandidate[],
): RankedCandidate[] {
  const primary = ranked[0];
  if (!primary) return [];
  const second = ranked[1];
  if (!second) return [primary];

  return isTiedForPursuit(primary, second) ||
    areDirectlyCoupled(primary.item, second.item)
    ? [primary, second].slice(0, MAX_PURSUED_SCENARIOS)
    : [primary];
}
