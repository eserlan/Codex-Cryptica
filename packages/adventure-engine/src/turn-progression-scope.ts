import { currentLocationContext } from "./contextual-rumours";
import { threadTopicWords } from "./dialogue-pacing";
import type {
  AdventureSession,
  CommittedAdventureTurn,
  ProvisionalFact,
  ScenarioEvent,
  ScenarioItem,
} from "./types";

export interface PursuedThreadScope {
  scenarioId: string;
  boundSecretIds: Set<string>;
  otherBoundSecretIds: Set<string>;
  otherScenarioIds: Set<string>;
  distinctTokens: Set<string>;
}

export interface PriorProgressionState {
  priorKnownFacts: Iterable<string>;
  priorNormalizedFacts: Pick<ReadonlySet<string>, "has">;
  priorVisitedLocations: Pick<ReadonlySet<string>, "has">;
  priorSituation: string | null | undefined;
  priorDispositions: Pick<ReadonlyMap<string, string>, "get">;
}

export const normalizeText = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, " ").trim();

/** Whether a scenario event is visible to the player directly or via a revealed secret. */
export function isPlayerVisibleScenarioEvent(
  scenario: ScenarioItem,
  event: ScenarioEvent,
): boolean {
  if (event.visibility === "player") return true;
  const secretId = Object.hasOwn(scenario.secretBindings.eventIds, event.id)
    ? scenario.secretBindings.eventIds[event.id]
    : undefined;
  return Boolean(secretId && scenario.revealedSecretIds.includes(secretId));
}

function scenarioBoundSecrets(scenario: ScenarioItem): Set<string> {
  return new Set([
    scenario.secretBindings.truth,
    ...(scenario.secretBindings.ifInvestigated
      ? [scenario.secretBindings.ifInvestigated]
      : []),
    ...Object.values(scenario.secretBindings.eventIds),
  ]);
}

function otherScenarioTokens(
  pursuedScenario: ScenarioItem,
  session: AdventureSession,
): Set<string> {
  const otherText = (session.scenarioCollection?.items ?? [])
    .filter((item) => item.id !== pursuedScenario.id)
    .map((item) =>
      [
        item.playerVisible.rumour,
        item.playerVisible.lead,
        item.playerVisible.source ?? "",
      ].join(" "),
    )
    .join(" ");
  return threadTopicWords(otherText);
}

function actorCandidateLabels(session: AdventureSession): string[][] {
  return [
    ...session.sourceRecords
      .filter((r) => r.recordType === "character")
      .map((r) => [r.displayName]),
    ...session.visibleState.activeCharacters.map((c) => [
      c.text.split(/[,(\u2014-]/)[0]?.trim() ?? c.text,
    ]),
    ...(session.people ?? []).map((p) => [p.name, ...(p.aliases ?? [])]),
  ];
}

function collectActorStrings(
  pursuedScenario: ScenarioItem,
  session: AdventureSession,
): string[] {
  const names: string[] = [];
  if (pursuedScenario.playerVisible.source) {
    names.push(pursuedScenario.playerVisible.source);
  }
  const otherTokens = otherScenarioTokens(pursuedScenario, session);
  const isShared = (label: string) =>
    [...threadTopicWords(label)].some((token) => otherTokens.has(token));
  for (const labels of actorCandidateLabels(session)) {
    if (labels.some(isShared)) names.push(...labels);
  }
  return names;
}

function collectExcludedScopeTokens(
  pursuedScenario: ScenarioItem,
  session: AdventureSession,
): Set<string> {
  const parts = collectActorStrings(pursuedScenario, session);
  for (const item of session.scenarioCollection?.items ?? []) {
    if (item.knowledge === "heard" && item.playerVisible.source) {
      parts.push(item.playerVisible.source);
    }
  }
  const currentLoc = currentLocationContext(session);
  if (currentLoc?.name) parts.push(currentLoc.name);
  return threadTopicWords(parts.join(" "));
}

/** Build thread-scoping tokens from player-visible fields only (never gmOnly, shared actors, or ambient location). */
export function buildPursuedThreadScope(
  pursuedScenario: ScenarioItem,
  session: AdventureSession,
): PursuedThreadScope {
  const otherBoundSecretIds = new Set<string>();
  const otherScenarioIds = new Set<string>();
  for (const item of session.scenarioCollection?.items ?? []) {
    if (item.id === pursuedScenario.id) continue;
    otherScenarioIds.add(item.id);
    for (const secretId of scenarioBoundSecrets(item)) {
      otherBoundSecretIds.add(secretId);
    }
  }

  const visibleParts: string[] = [
    pursuedScenario.playerVisible.rumour,
    pursuedScenario.playerVisible.lead,
    ...pursuedScenario.events
      .filter((e) => isPlayerVisibleScenarioEvent(pursuedScenario, e))
      .map((e) => e.text),
    ...session.provisionalFacts
      .filter(
        (f) =>
          f.visibility === "player-visible" &&
          f.scenarioId === pursuedScenario.id,
      )
      .flatMap((f) => [f.name, f.summary]),
  ];

  const excluded = collectExcludedScopeTokens(pursuedScenario, session);
  const rawTokens = threadTopicWords(visibleParts.join(" "));
  const distinctTokens = new Set<string>();
  for (const token of rawTokens) {
    if (!excluded.has(token)) distinctTokens.add(token);
  }

  return {
    scenarioId: pursuedScenario.id,
    boundSecretIds: scenarioBoundSecrets(pursuedScenario),
    otherBoundSecretIds,
    otherScenarioIds,
    distinctTokens: distinctTokens.size > 0 ? distinctTokens : rawTokens,
  };
}

export function matchesPursuedTokens(
  text: string | undefined,
  scope: PursuedThreadScope,
): boolean {
  if (!text) return false;
  for (const word of threadTopicWords(text)) {
    if (scope.distinctTokens.has(word)) return true;
  }
  return false;
}

export function turnProvisionalFacts(
  turn: CommittedAdventureTurn,
  session: AdventureSession,
): ProvisionalFact[] {
  const ids = new Set(turn.provisionalFactIds);
  return session.provisionalFacts.filter(
    (f) => ids.has(f.id) || f.introducedOnTurnId === turn.id,
  );
}

/** True only for player-visible activity explicitly scoped to another scenario. */
export function hasOtherScenarioScopedActivity(
  turn: CommittedAdventureTurn,
  session: AdventureSession,
  scope: PursuedThreadScope,
): boolean {
  const hasOtherEvent = (session.scenarioCollection?.items ?? []).some(
    (item) =>
      item.id !== scope.scenarioId &&
      item.events.some(
        (e) => e.turnId === turn.id && isPlayerVisibleScenarioEvent(item, e),
      ),
  );
  if (hasOtherEvent) return true;
  if (turn.revealedSecretIds.some((id) => scope.otherBoundSecretIds.has(id))) {
    return true;
  }
  const hasOtherClockEvent = (session.worldTime?.events ?? []).some(
    (e) => e.turnId === turn.id && scope.otherScenarioIds.has(e.threadId),
  );
  if (hasOtherClockEvent) return true;
  return turnProvisionalFacts(turn, session).some(
    (fact) =>
      fact.visibility === "player-visible" &&
      fact.scenarioId !== undefined &&
      fact.scenarioId !== scope.scenarioId,
  );
}

function recordTurnTouchedIds(
  item: CommittedAdventureTurn,
  locIds: Set<string>,
  sitIds: Set<string>,
  relIds: Set<string>,
  factIds: Set<string>,
): void {
  if (item.visiblePatch.location?.id) locIds.add(item.visiblePatch.location.id);
  if (item.visiblePatch.situation?.id)
    sitIds.add(item.visiblePatch.situation.id);
  for (const added of item.visiblePatch.knownFacts.add) factIds.add(added.id);
  for (const rel of [
    ...item.visiblePatch.relationships.add,
    ...item.visiblePatch.relationships.update,
  ]) {
    relIds.add(rel.id);
  }
}

function collectTouchedIds(
  turns: readonly CommittedAdventureTurn[],
  minSequence: number,
  currentTurnId: string,
) {
  const locIds = new Set<string>();
  const sitIds = new Set<string>();
  const relIds = new Set<string>();
  const factIds = new Set<string>();
  for (const item of turns) {
    if (item.sequence >= minSequence || item.id === currentTurnId) {
      recordTurnTouchedIds(item, locIds, sitIds, relIds, factIds);
    }
  }
  return { locIds, sitIds, relIds, factIds };
}

function resolvePriorLocations(
  session: AdventureSession,
  priorTurns: readonly CommittedAdventureTurn[],
  touchedLocIds: ReadonlySet<string>,
): Set<string> {
  const visited = new Set<string>();
  if (session.worldEntry?.location.name) {
    visited.add(normalizeText(session.worldEntry.location.name));
  }
  const initLoc = session.visibleState.location;
  if (initLoc && !touchedLocIds.has(initLoc.id)) {
    visited.add(normalizeText(initLoc.text));
  }
  for (const item of priorTurns) {
    if (item.visiblePatch.location?.text) {
      visited.add(normalizeText(item.visiblePatch.location.text));
    }
  }
  return visited;
}

function resolvePriorSituation(
  session: AdventureSession,
  priorTurns: readonly CommittedAdventureTurn[],
  touchedSitIds: ReadonlySet<string>,
): string | null | undefined {
  for (let idx = priorTurns.length - 1; idx >= 0; idx -= 1) {
    const sit = priorTurns[idx]!.visiblePatch.situation;
    if (sit !== undefined) return sit ? normalizeText(sit.text) : null;
  }
  const initSit = session.visibleState.situation;
  return initSit && !touchedSitIds.has(initSit.id)
    ? normalizeText(initSit.text)
    : undefined;
}

function resolvePriorDispositions(
  session: AdventureSession,
  priorTurns: readonly CommittedAdventureTurn[],
  touchedRelIds: ReadonlySet<string>,
): Map<string, string> {
  const dispositions = new Map<string, string>();
  for (const rel of session.visibleState.relationships) {
    if (!touchedRelIds.has(rel.id)) {
      dispositions.set(rel.subjectId, normalizeText(rel.disposition));
    }
  }
  for (const item of priorTurns) {
    for (const rel of [
      ...item.visiblePatch.relationships.add,
      ...item.visiblePatch.relationships.update,
    ]) {
      dispositions.set(rel.subjectId, normalizeText(rel.disposition));
    }
  }
  return dispositions;
}

export function resolvePriorProgressionState(
  turn: CommittedAdventureTurn,
  session: AdventureSession,
  explicitPriorTurns?: readonly CommittedAdventureTurn[],
  explicitPriorFacts?: readonly ProvisionalFact[],
): PriorProgressionState {
  const turnIndex = session.turns.findIndex((item) => item.id === turn.id);
  const priorTurns =
    explicitPriorTurns ??
    (turnIndex >= 0
      ? session.turns.slice(0, turnIndex)
      : session.turns.filter((item) => item.sequence < turn.sequence));
  const touched = collectTouchedIds(session.turns, turn.sequence, turn.id);
  const priorProvisionalTexts = (explicitPriorFacts ?? [])
    .filter((f) => f.visibility === "player-visible")
    .map((f) => `${f.name} ${f.summary}`);
  const priorKnownFacts = [
    ...session.visibleState.knownFacts
      .filter((f) => !touched.factIds.has(f.id))
      .map((f) => f.text),
    ...priorTurns.flatMap((t) =>
      t.visiblePatch.knownFacts.add.map((f) => f.text),
    ),
    ...priorProvisionalTexts,
  ];
  return {
    priorKnownFacts,
    priorNormalizedFacts: new Set(priorKnownFacts.map(normalizeText)),
    priorVisitedLocations: resolvePriorLocations(
      session,
      priorTurns,
      touched.locIds,
    ),
    priorSituation: resolvePriorSituation(session, priorTurns, touched.sitIds),
    priorDispositions: resolvePriorDispositions(
      session,
      priorTurns,
      touched.relIds,
    ),
  };
}

/**
 * Builds prior-state snapshots for a bounded set of turns in one history pass.
 * Prompt-time pacing uses this to avoid rebuilding each candidate state from
 * the entire committed history.
 */
interface LastTouchedSequenceIndex {
  locIds: Map<string, number>;
  sitIds: Map<string, number>;
  relIds: Map<string, number>;
  factIds: Map<string, number>;
}

function buildLastTouchedSequenceIndex(
  session: AdventureSession,
): LastTouchedSequenceIndex {
  const index: LastTouchedSequenceIndex = {
    locIds: new Map(),
    sitIds: new Map(),
    relIds: new Map(),
    factIds: new Map(),
  };
  const record = (map: Map<string, number>, id: string, sequence: number) =>
    map.set(id, Math.max(map.get(id) ?? Number.NEGATIVE_INFINITY, sequence));
  for (const turn of session.turns) {
    const sequence = turn.sequence;
    if (turn.visiblePatch.location?.id)
      record(index.locIds, turn.visiblePatch.location.id, sequence);
    if (turn.visiblePatch.situation?.id)
      record(index.sitIds, turn.visiblePatch.situation.id, sequence);
    for (const fact of turn.visiblePatch.knownFacts.add)
      record(index.factIds, fact.id, sequence);
    for (const rel of [
      ...turn.visiblePatch.relationships.add,
      ...turn.visiblePatch.relationships.update,
    ]) {
      record(index.relIds, rel.id, sequence);
    }
  }
  return index;
}

function isUntouchedBefore(
  index: Map<string, number>,
  id: string,
  sequence: number,
): boolean {
  return (index.get(id) ?? -1) < sequence;
}

function initialPriorFacts(
  session: AdventureSession,
  turn: CommittedAdventureTurn,
  lastTouched: LastTouchedSequenceIndex,
): string[] {
  return session.visibleState.knownFacts
    .filter((fact) =>
      isUntouchedBefore(lastTouched.factIds, fact.id, turn.sequence),
    )
    .map((fact) => fact.text);
}

interface DispositionHistoryEntry {
  turnIndex: number;
  disposition: string;
}

interface InitialDispositionEntry {
  id: string;
  disposition: string;
}

function indexInitialDispositionsBySubject(
  session: AdventureSession,
): Map<string, InitialDispositionEntry[]> {
  const bySubject = new Map<string, InitialDispositionEntry[]>();
  for (const rel of session.visibleState.relationships) {
    let entries = bySubject.get(rel.subjectId);
    if (!entries) {
      entries = [];
      bySubject.set(rel.subjectId, entries);
    }
    entries.push({
      id: rel.id,
      disposition: normalizeText(rel.disposition),
    });
  }
  return bySubject;
}

function lookupInitialDisposition(
  entries: readonly InitialDispositionEntry[] | undefined,
  relLastTouched: Map<string, number>,
  sequence: number,
): string | undefined {
  if (!entries) return undefined;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i]!;
    if (isUntouchedBefore(relLastTouched, entry.id, sequence)) {
      return entry.disposition;
    }
  }
  return undefined;
}

function lookupPriorDisposition(
  history: readonly DispositionHistoryEntry[] | undefined,
  beforeTurnIndex: number,
): string | undefined {
  if (!history || history.length === 0) return undefined;
  let lo = 0;
  let hi = history.length - 1;
  let result: string | undefined;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const entry = history[mid]!;
    if (entry.turnIndex < beforeTurnIndex) {
      result = entry.disposition;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

function initialPriorSituation(
  session: AdventureSession,
  turn: CommittedAdventureTurn,
  lastTouched: LastTouchedSequenceIndex,
): string | undefined {
  const situation = session.visibleState.situation;
  return situation &&
    isUntouchedBefore(lastTouched.sitIds, situation.id, turn.sequence)
    ? normalizeText(situation.text)
    : undefined;
}

interface PriorProgressionHistory {
  priorFacts: readonly string[];
  priorFactFirstIndex: ReadonlyMap<string, number>;
  priorLocationFirstTurnIndex: ReadonlyMap<string, number>;
  dispositionHistoryBySubject: ReadonlyMap<
    string,
    readonly DispositionHistoryEntry[]
  >;
  initialDispositionsBySubject: ReadonlyMap<
    string,
    readonly InitialDispositionEntry[]
  >;
}

function snapshotPriorProgressionState(
  session: AdventureSession,
  turn: CommittedAdventureTurn,
  turnIndex: number,
  lastTouched: LastTouchedSequenceIndex,
  history: PriorProgressionHistory,
  priorFactCount: number,
  priorSituation: string | null | undefined,
  hasPriorSituation: boolean,
): PriorProgressionState {
  const initialFacts = initialPriorFacts(session, turn, lastTouched);
  const initialNormalizedFacts = new Set(initialFacts.map(normalizeText));
  const worldEntryLocation = session.worldEntry?.location.name
    ? normalizeText(session.worldEntry.location.name)
    : undefined;
  const currentLocation = session.visibleState.location;
  const initialLocation =
    currentLocation &&
    isUntouchedBefore(lastTouched.locIds, currentLocation.id, turn.sequence)
      ? normalizeText(currentLocation.text)
      : undefined;

  return {
    priorKnownFacts: {
      *[Symbol.iterator]() {
        yield* initialFacts;
        for (let index = 0; index < priorFactCount; index += 1) {
          yield history.priorFacts[index]!;
        }
      },
    },
    priorNormalizedFacts: {
      has(value) {
        const firstIndex = history.priorFactFirstIndex.get(value);
        return (
          initialNormalizedFacts.has(value) ||
          (firstIndex !== undefined && firstIndex < priorFactCount)
        );
      },
    },
    priorVisitedLocations: {
      has(value) {
        if (
          (worldEntryLocation !== undefined && value === worldEntryLocation) ||
          (initialLocation !== undefined && value === initialLocation)
        ) {
          return true;
        }
        const firstTurnIndex = history.priorLocationFirstTurnIndex.get(value);
        return firstTurnIndex !== undefined && firstTurnIndex < turnIndex;
      },
    },
    priorSituation: hasPriorSituation
      ? priorSituation
      : initialPriorSituation(session, turn, lastTouched),
    priorDispositions: {
      get(subjectId) {
        return (
          lookupPriorDisposition(
            history.dispositionHistoryBySubject.get(subjectId),
            turnIndex,
          ) ??
          lookupInitialDisposition(
            history.initialDispositionsBySubject.get(subjectId),
            lastTouched.relIds,
            turn.sequence,
          )
        );
      },
    },
  };
}

function appendPriorFactHistory(
  turn: CommittedAdventureTurn,
  priorFacts: string[],
  firstIndexByNormalizedFact: Map<string, number>,
): void {
  for (const fact of turn.visiblePatch.knownFacts.add) {
    const normalized = normalizeText(fact.text);
    if (!firstIndexByNormalizedFact.has(normalized)) {
      firstIndexByNormalizedFact.set(normalized, priorFacts.length);
    }
    priorFacts.push(fact.text);
  }
}

function appendPriorDispositionHistory(
  turn: CommittedAdventureTurn,
  turnIndex: number,
  dispositionHistoryBySubject: Map<string, DispositionHistoryEntry[]>,
): void {
  for (const rel of [
    ...turn.visiblePatch.relationships.add,
    ...turn.visiblePatch.relationships.update,
  ]) {
    const disposition = normalizeText(rel.disposition);
    let entries = dispositionHistoryBySubject.get(rel.subjectId);
    if (!entries) {
      entries = [];
      dispositionHistoryBySubject.set(rel.subjectId, entries);
    }
    const last = entries[entries.length - 1];
    if (last && last.turnIndex === turnIndex) {
      last.disposition = disposition;
    } else {
      entries.push({ turnIndex, disposition });
    }
  }
}

export function buildPriorProgressionStateIndex(
  session: AdventureSession,
  targetTurnIds: ReadonlySet<string>,
): Map<string, PriorProgressionState> {
  const lastTouched = buildLastTouchedSequenceIndex(session);
  const results = new Map<string, PriorProgressionState>();
  const priorFacts: string[] = [];
  const priorFactFirstIndex = new Map<string, number>();
  const priorLocationFirstTurnIndex = new Map<string, number>();
  const dispositionHistoryBySubject = new Map<
    string,
    DispositionHistoryEntry[]
  >();
  const history: PriorProgressionHistory = {
    priorFacts,
    priorFactFirstIndex,
    priorLocationFirstTurnIndex,
    dispositionHistoryBySubject,
    initialDispositionsBySubject: indexInitialDispositionsBySubject(session),
  };
  let priorSituation: string | null | undefined;
  let hasPriorSituation = false;
  for (let turnIndex = 0; turnIndex < session.turns.length; turnIndex += 1) {
    const turn = session.turns[turnIndex]!;
    if (targetTurnIds.has(turn.id)) {
      results.set(
        turn.id,
        snapshotPriorProgressionState(
          session,
          turn,
          turnIndex,
          lastTouched,
          history,
          priorFacts.length,
          priorSituation,
          hasPriorSituation,
        ),
      );
    }

    appendPriorFactHistory(turn, priorFacts, priorFactFirstIndex);
    if (turn.visiblePatch.location?.text) {
      const loc = normalizeText(turn.visiblePatch.location.text);
      if (!priorLocationFirstTurnIndex.has(loc)) {
        priorLocationFirstTurnIndex.set(loc, turnIndex);
      }
    }
    if (turn.visiblePatch.situation !== undefined) {
      hasPriorSituation = true;
      priorSituation = turn.visiblePatch.situation
        ? normalizeText(turn.visiblePatch.situation.text)
        : null;
    }
    appendPriorDispositionHistory(turn, turnIndex, dispositionHistoryBySubject);
  }
  return results;
}
