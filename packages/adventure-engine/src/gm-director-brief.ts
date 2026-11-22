import type { PromptAdventurePackage } from "./context-budget";
import {
  candidateScenariosForLocation,
  currentLocationContext,
  matchesScenarioLocation,
  type LocationContext,
} from "./contextual-rumours";
import { dialogueLoopPacing, isInquiry, topicWords } from "./dialogue-pacing";
import { sceneStallPacing } from "./scene-pacing";
import type {
  ActorDisposition,
  ActorProgressStatus,
  AdventureSession,
  PackageProgress,
  PackageProgressStatus,
  Place,
  ScenarioElaborationStage,
  ScenarioEvent,
  ScenarioItem,
  SourceRecordReference,
} from "./types";

/** Hard upper bound for the serialized GM-only director brief. */
export const MAX_DIRECTOR_BRIEF_CHARS = 2_400;

export type DirectorActionKind =
  "investigate" | "intervene" | "travel" | "converse" | "wait" | "walk-away";

export type DirectorProvenance =
  "player-action" | "focused-scenario" | "recent-event" | "current-location";

export type DirectorConfidence = "high" | "medium" | "low";

export type DirectorScenePosture =
  | "opening"
  | "dialogue-loop"
  | "stalled-investigation"
  | "calm-conversation"
  | "progressing";

export interface DirectorPursuedScenario {
  scenarioId: string;
  provenance: DirectorProvenance;
  confidence: DirectorConfidence;
  stage: ScenarioElaborationStage;
  gmTruthRef: {
    secretId: string;
    truth: string;
    truthRevealed: boolean;
    ifInvestigatedSecretId?: string;
    ifInvestigated?: string;
  };
  established: {
    knownPlayerFacts: string[];
    latestConsequentialEvents: Array<{
      id: string;
      kind: ScenarioEvent["kind"];
      visibility: ScenarioEvent["visibility"];
      text: string;
    }>;
    actors: string[];
  };
  potential: {
    openUncertainties: string[];
    pressure?: {
      actor: string;
      goal: string;
      currentStance: string;
      trigger: string;
      expectedConsequence: string;
      triggeredAtMinute?: number;
    };
    nextDevelopmentKinds: string[];
  };
}

export interface DirectorPackageContext {
  sceneId?: string;
  activeRecordIds: string[];
  establishedActors: Array<{
    actorId: string;
    status: ActorProgressStatus;
    disposition: ActorDisposition;
    facts?: string[];
  }>;
  latestEvents: Array<{
    id: string;
    recordId: string;
    certainty: "claimed" | "confirmed";
    to: PackageProgressStatus;
    note: string;
  }>;
  openUncertainties: string[];
}

export interface GMDirectorBrief {
  advisory: true;
  mode: "active-pursuit" | "package-scene" | "open-world";
  scenePosture: DirectorScenePosture;
  currentPlace?: {
    id?: string;
    name: string;
    sourceRecordId?: string;
  };
  pursuedScenarios: DirectorPursuedScenario[];
  otherOpenHeardScenarioIds: string[];
  packageContext?: DirectorPackageContext;
  suggestedActionKinds: DirectorActionKind[];
}

export interface GMDirectorBriefInput {
  session: AdventureSession;
  phase: "opening" | "action" | "roll-resolution";
  playerAction?: string;
  adventurePackage?: PromptAdventurePackage;
  maxChars?: number;
}

const MAX_PURSUED_SCENARIOS = 2;
const MAX_OTHER_SCENARIO_IDS = 6;
const RECENT_EVENT_TURN_WINDOW = 3;
// Keep historical lookups on prompt generation bounded. Older scenario events
// still rank by their authored timestamps; package reveal state is summarised
// in packageProgress when available.
const DIRECTOR_HISTORY_LOOKBACK_TURNS = 256;

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

const DISENGAGEMENT_RE =
  /\b(?:decline(?:\s+to\s+investigate)?|ignore\s+(?:it|this|that|the\s+(?:lead|rumour|rumor|matter|sign|bell))|abandon|stop\s+investigating|never\s+mind|head\s+home|walk\s+away)\b/i;

const INVESTIGATIVE_RE =
  /\b(?:investigat\w*|clue|clues|lead|leads|rumour|rumours|rumor|rumors|gossip|local\s+news|news\b|mystery|suspect\w*|witness\w*|search\w*|inspect\w*|examin\w*|follow\s+up|look\s+into|check\s+out|what\s+happened|who\s+is\s+behind|missing|vanish\w*|disappear\w*|secret\w*|trail|tracks|evidence)\b/i;

const BRIEF_STOP_WORDS = new Set([
  "him",
  "his",
  "her",
  "hers",
  "herself",
  "himself",
  "themselves",
  "one",
  "two",
  "three",
  "some",
  "such",
  "other",
  "another",
  "more",
  "most",
  "much",
  "many",
  "very",
  "only",
  "even",
  "also",
  "onto",
  "over",
  "under",
]);

function briefTopicWords(value: string): Set<string> {
  const words = topicWords(value);
  for (const stop of BRIEF_STOP_WORDS) words.delete(stop);
  return words;
}

function clipText(value: string, limit: number): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= limit) return cleaned;
  return `${cleaned.slice(0, Math.max(0, limit - 1))}…`;
}

function normalizePhrase(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function isPlayerVisibleScenarioEvent(
  scenario: ScenarioItem,
  event: ScenarioEvent,
): boolean {
  if (event.visibility === "player") return true;
  const secretId = Object.hasOwn(scenario.secretBindings.eventIds, event.id)
    ? scenario.secretBindings.eventIds[event.id]
    : undefined;
  return Boolean(secretId && scenario.revealedSecretIds.includes(secretId));
}

function isLocationBoundScenario(scenario: ScenarioItem): boolean {
  return (
    Boolean(scenario.origin.batchTitle?.startsWith("Rumours in ")) ||
    Boolean(scenario.origin.sourceRecordId) ||
    scenario.anchorRefs.length > 0
  );
}

function placeNamesForRefs(
  places: readonly Place[],
  refIds: ReadonlySet<string>,
): string[] {
  return places
    .filter((place) => place.sourceRecordId && refIds.has(place.sourceRecordId))
    .flatMap((place) => [place.name, ...(place.aliases ?? [])]);
}

function sourceNamesForRefs(
  records: readonly SourceRecordReference[],
  refIds: ReadonlySet<string>,
  originSourceId: string | undefined,
): string[] {
  return records
    .filter(
      (record) =>
        refIds.has(record.recordId) &&
        (record.recordId === originSourceId ||
          record.recordType === "location"),
    )
    .map((record) => record.displayName);
}

function linkedPlaceAndSourceNames(
  scenario: ScenarioItem,
  session: AdventureSession,
): string[] {
  const refIds = new Set<string>([
    ...scenario.anchorRefs,
    ...(scenario.origin.sourceRecordId ? [scenario.origin.sourceRecordId] : []),
  ]);
  if (refIds.size === 0) return [];
  return [
    ...placeNamesForRefs(session.places ?? [], refIds),
    ...sourceNamesForRefs(
      session.sourceRecords,
      refIds,
      scenario.origin.sourceRecordId,
    ),
  ];
}

function playerVisibleScenarioText(
  scenario: ScenarioItem,
  session: AdventureSession,
): {
  tokens: Set<string>;
  leadPhrase: string;
  placePhrases: string[];
} {
  const eventTexts = scenario.events
    .filter((event) => isPlayerVisibleScenarioEvent(scenario, event))
    .map((event) => event.text);
  const factTexts = session.provisionalFacts
    .filter(
      (fact) =>
        fact.visibility === "player-visible" && fact.scenarioId === scenario.id,
    )
    .flatMap((fact) => [fact.name, fact.summary]);
  const placeNames = linkedPlaceAndSourceNames(scenario, session);
  const parts = [
    scenario.playerVisible.rumour,
    ...(scenario.playerVisible.source ? [scenario.playerVisible.source] : []),
    ...eventTexts,
    ...factTexts,
    scenario.playerVisible.lead,
    ...placeNames,
  ];

  return {
    tokens: briefTopicWords(parts.join(" ")),
    leadPhrase: normalizePhrase(scenario.playerVisible.lead),
    placePhrases: placeNames
      .map(normalizePhrase)
      .filter((phrase) => phrase.length >= 3),
  };
}

interface ActionMatch {
  hits: number;
  exactPhrase: boolean;
  confidence: DirectorConfidence;
}

interface ActionMatchContext {
  actionTokens: ReadonlySet<string>;
  normalizedAction: string;
  currentLocTokens: ReadonlySet<string>;
  normalizedCurrentLoc: string;
  focusedId: string | null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWholePhrase(
  normalizedAction: string,
  phrase: string,
): boolean {
  if (phrase.length < 3) return false;
  const pattern = new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${escapeRegExp(phrase)}(?:$|[^\\p{L}\\p{N}])`,
    "u",
  );
  return pattern.test(normalizedAction);
}

function countTokenHits(
  actionTokens: ReadonlySet<string>,
  scenarioTokens: ReadonlySet<string>,
  currentLocTokens: ReadonlySet<string>,
): number {
  let qualifyingHits = 0;
  for (const token of actionTokens) {
    if (!scenarioTokens.has(token)) continue;
    if (!currentLocTokens.has(token)) {
      qualifyingHits += 1;
    }
  }
  return qualifyingHits;
}

function matchesExactPhrase(
  normalizedAction: string,
  leadPhrase: string,
  placePhrases: readonly string[],
  normalizedCurrentLoc: string,
  allowCurrentLocLead: boolean,
): boolean {
  const leadAllowed =
    leadPhrase !== normalizedCurrentLoc || allowCurrentLocLead;
  if (leadAllowed && containsWholePhrase(normalizedAction, leadPhrase)) {
    return true;
  }
  return placePhrases.some(
    (phrase) =>
      phrase !== normalizedCurrentLoc &&
      containsWholePhrase(normalizedAction, phrase),
  );
}

function matchActionToScenario(
  scenario: ScenarioItem,
  session: AdventureSession,
  context: ActionMatchContext,
): ActionMatch | null {
  if (context.actionTokens.size === 0) return null;
  const { tokens, leadPhrase, placePhrases } = playerVisibleScenarioText(
    scenario,
    session,
  );
  const qualifyingHits = countTokenHits(
    context.actionTokens,
    tokens,
    context.currentLocTokens,
  );
  const exactPhrase = matchesExactPhrase(
    context.normalizedAction,
    leadPhrase,
    placePhrases,
    context.normalizedCurrentLoc,
    scenario.id === context.focusedId,
  );
  if (qualifyingHits === 0 && !exactPhrase) return null;

  return {
    hits: qualifyingHits,
    exactPhrase,
    confidence: qualifyingHits >= 2 || exactPhrase ? "high" : "medium",
  };
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

interface RankedCandidate {
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

function collectActionMatches(
  openHeard: readonly ScenarioItem[],
  session: AdventureSession,
  effectiveAction: string | undefined,
  location: LocationContext | null,
  disengaged: boolean,
): Map<string, ActionMatch> {
  const matches = new Map<string, ActionMatch>();
  if (disengaged || !effectiveAction) return matches;

  const context: ActionMatchContext = {
    actionTokens: briefTopicWords(effectiveAction),
    normalizedAction: normalizePhrase(effectiveAction),
    currentLocTokens: location ? briefTopicWords(location.name) : new Set(),
    normalizedCurrentLoc: location ? normalizePhrase(location.name) : "",
    focusedId: session.scenarioCollection?.focusedScenarioId ?? null,
  };
  for (const item of openHeard) {
    const match = matchActionToScenario(item, session, context);
    if (match) matches.set(item.id, match);
  }
  return matches;
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

function rankOpenHeardScenarios(
  openHeard: readonly ScenarioItem[],
  session: AdventureSession,
  effectiveAction: string | undefined,
  location: LocationContext | null,
): {
  pursued: RankedCandidate[];
  otherIds: string[];
} {
  if (openHeard.length === 0) return { pursued: [], otherIds: [] };

  const disengaged = Boolean(
    effectiveAction && DISENGAGEMENT_RE.test(effectiveAction),
  );
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

function collectScenarioActors(
  scenario: ScenarioItem,
  session: AdventureSession,
): string[] {
  const actors: string[] = [];
  const add = (name: string | undefined) => {
    const trimmed = name?.trim();
    if (!trimmed) return;
    const clipped = clipText(trimmed, 80);
    if (!actors.includes(clipped)) actors.push(clipped);
  };

  add(scenario.playerVisible.source);
  for (const record of session.sourceRecords) {
    const isOrigin = record.recordId === scenario.origin.sourceRecordId;
    const isActiveAnchor =
      scenario.anchorRefs.includes(record.recordId) &&
      session.visibleState.activeCharacters.some(
        (c) => c.sourceRecordId === record.recordId,
      );
    if (record.recordType === "character" && (isOrigin || isActiveAnchor)) {
      add(record.displayName);
    }
  }
  return actors.slice(0, 4);
}

function collectKnownPlayerFacts(
  scenario: ScenarioItem,
  session: AdventureSession,
): string[] {
  const facts: string[] = [];
  const push = (text: string) => {
    const clipped = clipText(text, 180);
    if (clipped && !facts.includes(clipped)) facts.push(clipped);
  };

  push(scenario.playerVisible.rumour);
  push(
    scenario.playerVisible.source
      ? `Lead: ${scenario.playerVisible.lead} (source: ${scenario.playerVisible.source})`
      : `Lead: ${scenario.playerVisible.lead}`,
  );
  for (const fact of session.provisionalFacts) {
    if (
      fact.visibility === "player-visible" &&
      fact.scenarioId === scenario.id
    ) {
      push(`${fact.name}: ${fact.summary}`);
    }
  }
  return facts.slice(0, 4);
}

const STAGE_UNCERTAINTY: Record<ScenarioElaborationStage, string> = {
  hearsay: "Still hearsay; concrete witness or physical clue is open.",
  "actionable-clue":
    "Actionable clue stage; core truth or confrontation awaits.",
  "revelation-crisis":
    "Revelation-crisis stage; resolution or aftermath remains open.",
};

function collectOpenUncertainties(
  scenario: ScenarioItem,
  truthRevealed: boolean,
): string[] {
  const items: string[] = [];
  if (!truthRevealed) {
    items.push(
      `Core truth (${scenario.secretBindings.truth}) not yet revealed in play.`,
    );
  }
  const invId = scenario.secretBindings.ifInvestigated;
  if (
    scenario.gmOnly.ifInvestigated &&
    invId &&
    !scenario.revealedSecretIds.includes(invId)
  ) {
    items.push(`Investigative detail (${invId}) remains unrevealed.`);
  }
  items.push(STAGE_UNCERTAINTY[scenario.stage]);
  if (scenario.pressure && scenario.pressure.triggeredAtMinute === undefined) {
    items.push(
      `Pending off-screen pressure (${clipText(scenario.pressure.actor, 60)}) untriggered.`,
    );
  }
  return items.slice(0, 3);
}

const NEXT_DEVELOPMENT_KINDS: Record<ScenarioElaborationStage, string[]> = {
  hearsay: [
    "surface-witness-or-clue",
    "verify-hearsay",
    "ordinary-life-or-ignore",
  ],
  "actionable-clue": [
    "follow-concrete-trail",
    "reveal-truth-on-discovery",
    "confront-or-test-claim",
  ],
  "revelation-crisis": [
    "resolve-dilemma",
    "play-out-consequence",
    "leave-aftermath-open",
  ],
};

function nextDevelopmentKindsFor(scenario: ScenarioItem): string[] {
  const kinds = [...NEXT_DEVELOPMENT_KINDS[scenario.stage]];
  if (scenario.pressure && scenario.pressure.triggeredAtMinute === undefined) {
    kinds.push("advance-offscreen-pressure-if-time-passes");
  }
  return kinds.slice(0, 4);
}

function buildPursuedScenario(
  candidate: RankedCandidate,
  session: AdventureSession,
): DirectorPursuedScenario {
  const { item } = candidate;
  const truthRevealed = item.revealedSecretIds.includes(
    item.secretBindings.truth,
  );
  const latestConsequentialEvents = item.events.slice(-3).map((event) => ({
    id: event.id,
    kind: event.kind,
    visibility: event.visibility,
    text: clipText(event.text, 180),
  }));

  return {
    scenarioId: item.id,
    provenance: candidate.provenance,
    confidence: candidate.confidence,
    stage: item.stage,
    gmTruthRef: {
      secretId: item.secretBindings.truth,
      truth: clipText(item.gmOnly.truth, 220),
      truthRevealed,
      ...(item.gmOnly.ifInvestigated && item.secretBindings.ifInvestigated
        ? {
            ifInvestigatedSecretId: item.secretBindings.ifInvestigated,
            ifInvestigated: clipText(item.gmOnly.ifInvestigated, 180),
          }
        : {}),
    },
    established: {
      knownPlayerFacts: collectKnownPlayerFacts(item, session),
      latestConsequentialEvents,
      actors: collectScenarioActors(item, session),
    },
    potential: {
      openUncertainties: collectOpenUncertainties(item, truthRevealed),
      ...(item.pressure
        ? {
            pressure: {
              actor: clipText(item.pressure.actor, 80),
              goal: clipText(item.pressure.goal, 140),
              currentStance: clipText(item.pressure.currentStance, 80),
              trigger: clipText(item.pressure.trigger, 140),
              expectedConsequence: clipText(
                item.pressure.expectedConsequence,
                160,
              ),
              ...(item.pressure.triggeredAtMinute !== undefined
                ? { triggeredAtMinute: item.pressure.triggeredAtMinute }
                : {}),
            },
          }
        : {}),
      nextDevelopmentKinds: nextDevelopmentKindsFor(item),
    },
  };
}

type PackageExcerpt = PromptAdventurePackage["playerSafe"][number];

function hasPackageExcerpts(pkg?: PromptAdventurePackage): boolean {
  return Boolean(pkg && (pkg.playerSafe.length > 0 || pkg.gmOnly.length > 0));
}

function supersededIdSet(
  events: ReadonlyArray<{ supersedes?: string }> | undefined,
): Set<string> {
  return new Set(
    (events ?? []).flatMap((event) =>
      event.supersedes ? [event.supersedes] : [],
    ),
  );
}

const CLOSED_PACKAGE_STATUSES = new Set<PackageProgressStatus>([
  "resolved",
  "altered",
  "skipped",
]);

function collectActivePackageRecordIds(
  progress: PackageProgress | undefined,
  allExcerpts: readonly PackageExcerpt[],
): string[] {
  const records = progress?.records ?? [];
  const closedIds = new Set(
    records
      .filter((r) => CLOSED_PACKAGE_STATUSES.has(r.status))
      .map((r) => r.id),
  );
  const byStatus = (status: "active" | "available") =>
    records.filter((r) => r.status === status).map((r) => r.id);
  const excerptIds = allExcerpts
    .filter(
      (e) =>
        e.kind !== "premise" && e.kind !== "system" && !closedIds.has(e.id),
    )
    .map((e) => e.id);

  return [
    ...new Set([
      ...byStatus("active"),
      ...byStatus("available"),
      ...excerptIds,
    ]),
  ].slice(0, 8);
}

function summarizeEstablishedActors(
  progress: PackageProgress | undefined,
  allExcerpts: readonly PackageExcerpt[],
): DirectorPackageContext["establishedActors"] {
  const pkgActorIds = new Set(
    allExcerpts.filter((e) => e.kind === "actor").map((e) => e.id),
  );
  return [...(progress?.actors ?? [])]
    .sort(
      (a, b) =>
        Number(pkgActorIds.has(b.actorId)) - Number(pkgActorIds.has(a.actorId)),
    )
    .slice(0, 4)
    .map((actor) => ({
      actorId: actor.actorId,
      status: actor.status,
      disposition: actor.disposition,
      ...(actor.facts.length > 0
        ? { facts: actor.facts.slice(-2).map((fact) => clipText(fact, 120)) }
        : {}),
    }));
}

function summarizeLatestPackageEvents(
  progress: PackageProgress | undefined,
): DirectorPackageContext["latestEvents"] {
  const superseded = supersededIdSet(progress?.events);
  return (progress?.events ?? [])
    .filter((event) => !superseded.has(event.id))
    .slice(-4)
    .map((event) => ({
      id: event.id,
      recordId: event.recordId,
      certainty: event.certainty,
      to: event.to,
      note: clipText(event.note, 120),
    }));
}

function collectClaimedFrom<
  T extends { id: string; certainty: string; supersedes?: string },
>(
  events: readonly T[] | undefined,
  format: (event: T) => string,
  push: (text: string) => void,
): void {
  if (!events?.length) return;
  const superseded = supersededIdSet(events);
  for (const event of events) {
    if (!superseded.has(event.id) && event.certainty === "claimed") {
      push(format(event));
    }
  }
}

function collectClaimedUncertainties(
  progress: PackageProgress | undefined,
  push: (text: string) => void,
): void {
  collectClaimedFrom(
    progress?.events,
    (event) => `Claimed (${event.recordId}): ${event.note}`,
    push,
  );
  collectClaimedFrom(
    progress?.actorEvents,
    (actorEvent) =>
      `Claimed actor note (${actorEvent.actorId}): ${actorEvent.note}`,
    push,
  );
}

function collectOpenEpistemicUncertainties(
  progress: PackageProgress | undefined,
  allExcerpts: readonly PackageExcerpt[],
  push: (text: string) => void,
): void {
  const resolved = new Set(
    (progress?.records ?? [])
      .filter((r) => r.status === "resolved" || r.status === "altered")
      .map((r) => r.id),
  );
  for (const excerpt of allExcerpts) {
    const open =
      excerpt.epistemicStatus === "ambiguous" ||
      excerpt.epistemicStatus === "unresolved";
    if (open && !resolved.has(excerpt.id)) {
      push(
        `${excerpt.epistemicStatus} ${excerpt.kind} (${excerpt.id}): keep open.`,
      );
    }
  }
}

function collectRevealedPackageSecretIds(
  session: AdventureSession,
  packageSecretIds: ReadonlySet<string>,
): Set<string> {
  const turnIds = new Set<string>();
  const summarizedIds = new Set([
    ...(session.packageProgress?.revealedSecretIds ?? []),
    ...session.hiddenState.secrets
      .filter((secret) => secret.status === "revealed")
      .map((secret) => secret.id),
    ...(session.packageProgress?.records ?? [])
      .filter(
        (record) =>
          record.kind === "secret" &&
          (record.status === "resolved" || record.status === "altered"),
      )
      .map((record) => record.id),
  ]);
  // packageProgress is the durable summary for current sessions. The bounded
  // turn lookup retains compatibility for package secrets missing from it.
  if ([...packageSecretIds].some((id) => !summarizedIds.has(id))) {
    for (const turn of session.turns.slice(-DIRECTOR_HISTORY_LOOKBACK_TURNS)) {
      for (const id of turn.revealedSecretIds) {
        if (packageSecretIds.has(id) && !summarizedIds.has(id)) turnIds.add(id);
      }
    }
  }
  return new Set([...summarizedIds, ...turnIds]);
}

function collectUnrevealedSecretUncertainties(
  session: AdventureSession,
  gmOnly: readonly PackageExcerpt[],
  push: (text: string) => void,
): void {
  const packageSecretIds = new Set(
    gmOnly
      .filter((excerpt) => excerpt.kind === "secret")
      .map((excerpt) => excerpt.id),
  );
  const revealed = collectRevealedPackageSecretIds(session, packageSecretIds);
  for (const excerpt of gmOnly) {
    if (excerpt.kind === "secret" && !revealed.has(excerpt.id)) {
      push(`Unrevealed secret (${excerpt.id}).`);
    }
  }
}

function collectPackageUncertainties(
  session: AdventureSession,
  allExcerpts: readonly PackageExcerpt[],
  pkg?: PromptAdventurePackage,
): string[] {
  const items: string[] = [];
  const push = (text: string) => {
    const clipped = clipText(text, 140);
    if (clipped && !items.includes(clipped)) items.push(clipped);
  };
  collectClaimedUncertainties(session.packageProgress, push);
  collectOpenEpistemicUncertainties(session.packageProgress, allExcerpts, push);
  collectUnrevealedSecretUncertainties(session, pkg?.gmOnly ?? [], push);
  return items.slice(0, 4);
}

function resolvePackageSceneId(
  progress: PackageProgress | undefined,
  allExcerpts: readonly PackageExcerpt[],
): string | undefined {
  return progress?.sceneId ?? allExcerpts.find((e) => e.kind === "scene")?.id;
}

function buildPackageContext(
  session: AdventureSession,
  pkg?: PromptAdventurePackage,
): DirectorPackageContext | undefined {
  if (!session.sourcePackage && !hasPackageExcerpts(pkg)) return undefined;

  const progress = session.packageProgress;
  const allExcerpts = pkg ? [...pkg.playerSafe, ...pkg.gmOnly] : [];
  const sceneId = resolvePackageSceneId(progress, allExcerpts);

  return {
    ...(sceneId ? { sceneId } : {}),
    activeRecordIds: collectActivePackageRecordIds(progress, allExcerpts),
    establishedActors: summarizeEstablishedActors(progress, allExcerpts),
    latestEvents: summarizeLatestPackageEvents(progress),
    openUncertainties: collectPackageUncertainties(session, allExcerpts, pkg),
  };
}

function resolveCurrentPlace(
  session: AdventureSession,
): GMDirectorBrief["currentPlace"] {
  const here = session.places?.find(
    (place) => place.id === session.currentPlaceId,
  );
  if (here) {
    return {
      id: here.id,
      name: clipText(here.name, 120),
      ...(here.sourceRecordId ? { sourceRecordId: here.sourceRecordId } : {}),
    };
  }
  const loc = currentLocationContext(session);
  if (!loc) return undefined;
  return {
    name: clipText(loc.name, 120),
    ...(loc.recordId ? { sourceRecordId: loc.recordId } : {}),
  };
}

function isInvestigationActive(
  session: AdventureSession,
  mode: GMDirectorBrief["mode"],
  effectiveAction: string | undefined,
  pursuedCount: number,
): boolean {
  if (effectiveAction && DISENGAGEMENT_RE.test(effectiveAction)) {
    return false;
  }
  if (
    pursuedCount > 0 ||
    mode === "package-scene" ||
    Boolean(session.visibleState.situation)
  ) {
    return true;
  }
  return Boolean(
    effectiveAction &&
    isInquiry(effectiveAction) &&
    session.turns.slice(-2).some((turn) => isInquiry(turn.playerAction)),
  );
}

function determineScenePosture(
  session: AdventureSession,
  phase: GMDirectorBriefInput["phase"],
  mode: GMDirectorBrief["mode"],
  effectiveAction: string | undefined,
  pursuedCount: number,
): DirectorScenePosture {
  const dialogueLoop = dialogueLoopPacing(session, effectiveAction);
  if (dialogueLoop?.recoveryDue) return "dialogue-loop";

  const stalled = sceneStallPacing(session);
  if (
    stalled?.stalled &&
    !dialogueLoop &&
    isInvestigationActive(session, mode, effectiveAction, pursuedCount)
  ) {
    return "stalled-investigation";
  }
  if (phase === "opening") return "opening";
  return mode === "open-world" ? "calm-conversation" : "progressing";
}

function activePursuitActionKinds(
  pursued: readonly RankedCandidate[],
): DirectorActionKind[] {
  const primary = pursued[0];
  if (primary && !primary.matchesLocation) {
    return ["travel", "investigate", "converse"];
  }
  if (primary?.item.stage === "revelation-crisis") {
    return ["intervene", "converse", "walk-away"];
  }
  return ["investigate", "converse", "walk-away"];
}

function determineSuggestedActionKinds(
  mode: GMDirectorBrief["mode"],
  posture: DirectorScenePosture,
  pursued: readonly RankedCandidate[],
): DirectorActionKind[] {
  if (posture === "dialogue-loop" || posture === "stalled-investigation") {
    return ["investigate", "travel", "walk-away"];
  }
  if (mode === "active-pursuit") return activePursuitActionKinds(pursued);
  if (mode === "package-scene") {
    return posture === "opening"
      ? ["converse", "investigate", "travel"]
      : ["investigate", "intervene", "travel"];
  }
  return posture === "opening"
    ? ["converse", "investigate", "travel"]
    : ["converse", "travel", "wait"];
}

const PURSUED_SHEDDERS: Array<(entry: DirectorPursuedScenario) => boolean> = [
  (e) => e.potential.nextDevelopmentKinds.pop() !== undefined,
  (e) => e.potential.openUncertainties.pop() !== undefined,
  (e) => e.established.latestConsequentialEvents.shift() !== undefined,
  (e) => e.established.knownPlayerFacts.pop() !== undefined,
  (e) => e.established.actors.pop() !== undefined,
  (e) => {
    if (!e.potential.pressure) return false;
    delete e.potential.pressure;
    return true;
  },
];

function shedPursuedDetails(brief: GMDirectorBrief): boolean {
  for (const shed of PURSUED_SHEDDERS) {
    for (let i = brief.pursuedScenarios.length - 1; i >= 0; i -= 1) {
      if (shed(brief.pursuedScenarios[i]!)) return true;
    }
  }
  return false;
}

const PACKAGE_SHEDDERS: Array<(pkg: DirectorPackageContext) => boolean> = [
  (p) => p.openUncertainties.pop() !== undefined,
  (p) => p.latestEvents.shift() !== undefined,
  (p) => p.establishedActors.pop() !== undefined,
  (p) => p.activeRecordIds.pop() !== undefined,
];

function shedPackageExtras(brief: GMDirectorBrief): boolean {
  const pkg = brief.packageContext;
  if (!pkg) return false;
  for (const shed of PACKAGE_SHEDDERS) {
    if (shed(pkg)) return true;
  }
  return false;
}

function shedSecondaryPursued(brief: GMDirectorBrief): boolean {
  if (brief.pursuedScenarios.length <= 1) return false;
  const removed = brief.pursuedScenarios.pop()!;
  brief.otherOpenHeardScenarioIds = [
    removed.scenarioId,
    ...brief.otherOpenHeardScenarioIds,
  ].slice(0, MAX_OTHER_SCENARIO_IDS);
  return true;
}

const BRIEF_SHEDDERS: Array<(brief: GMDirectorBrief) => boolean> = [
  shedSecondaryPursued,
  shedPursuedDetails,
  shedPackageExtras,
  (b) => b.otherOpenHeardScenarioIds.pop() !== undefined,
  (b) => {
    if (!b.currentPlace) return false;
    delete b.currentPlace;
    return true;
  },
];

function enforceBriefBudget(
  brief: GMDirectorBrief,
  limit: number,
): GMDirectorBrief | undefined {
  if (limit <= 0) return undefined;
  while (JSON.stringify(brief).length > limit) {
    const shed = BRIEF_SHEDDERS.some((step) => step(brief));
    if (!shed) return undefined;
  }
  return brief;
}

function resolveEffectiveAction(
  input: GMDirectorBriefInput,
): string | undefined {
  return (
    input.playerAction?.trim() ||
    (input.phase === "roll-resolution"
      ? input.session.pendingRoll?.playerAction?.trim()
      : undefined)
  );
}

/**
 * Pure, deterministic, budget-aware GM-only synthesis of active focus,
 * established facts vs. potential developments, and scene posture.
 */
export function buildGMDirectorBrief(
  input: GMDirectorBriefInput,
): GMDirectorBrief | undefined {
  const limit =
    input.maxChars === undefined
      ? MAX_DIRECTOR_BRIEF_CHARS
      : Math.min(MAX_DIRECTOR_BRIEF_CHARS, input.maxChars);
  if (!Number.isFinite(limit) || limit <= 0) return undefined;

  const effectiveAction = resolveEffectiveAction(input);
  const location = currentLocationContext(input.session);
  const openHeard = candidateScenariosForLocation(input.session).filter(
    (item) => item.status === "open" && item.knowledge === "heard",
  );
  const { pursued, otherIds } = rankOpenHeardScenarios(
    openHeard,
    input.session,
    effectiveAction,
    location,
  );
  const packageContext = buildPackageContext(
    input.session,
    input.adventurePackage,
  );
  const mode: GMDirectorBrief["mode"] =
    pursued.length > 0
      ? "active-pursuit"
      : packageContext
        ? "package-scene"
        : "open-world";
  const scenePosture = determineScenePosture(
    input.session,
    input.phase,
    mode,
    effectiveAction,
    pursued.length,
  );
  const currentPlace = resolveCurrentPlace(input.session);

  return enforceBriefBudget(
    {
      advisory: true,
      mode,
      scenePosture,
      ...(currentPlace ? { currentPlace } : {}),
      pursuedScenarios: pursued.map((entry) =>
        buildPursuedScenario(entry, input.session),
      ),
      otherOpenHeardScenarioIds: otherIds,
      ...(packageContext ? { packageContext } : {}),
      suggestedActionKinds: determineSuggestedActionKinds(
        mode,
        scenePosture,
        pursued,
      ),
    },
    limit,
  );
}
