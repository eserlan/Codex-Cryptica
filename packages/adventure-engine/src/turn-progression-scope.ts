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
  priorVisitedLocations: Set<string>;
  priorSituation: string | null | undefined;
  priorDispositions: Map<string, string>;
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

function initialPriorDispositions(
  session: AdventureSession,
  turn: CommittedAdventureTurn,
  lastTouched: LastTouchedSequenceIndex,
): Map<string, string> {
  return new Map(
    session.visibleState.relationships
      .filter((rel) =>
        isUntouchedBefore(lastTouched.relIds, rel.id, turn.sequence),
      )
      .map((rel) => [rel.subjectId, normalizeText(rel.disposition)] as const),
  );
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

function snapshotPriorProgressionState(
  session: AdventureSession,
  turn: CommittedAdventureTurn,
  lastTouched: LastTouchedSequenceIndex,
  priorFacts: readonly string[],
  priorFactCount: number,
  priorFactFirstIndex: ReadonlyMap<string, number>,
  priorLocations: ReadonlySet<string>,
  priorSituation: string | null | undefined,
  hasPriorSituation: boolean,
  priorDispositions: ReadonlyMap<string, string>,
): PriorProgressionState {
  const initialFacts = initialPriorFacts(session, turn, lastTouched);
  const initialNormalizedFacts = new Set(initialFacts.map(normalizeText));
  const locations = new Set(priorLocations);
  if (session.worldEntry?.location.name) {
    locations.add(normalizeText(session.worldEntry.location.name));
  }
  const currentLocation = session.visibleState.location;
  if (
    currentLocation &&
    isUntouchedBefore(lastTouched.locIds, currentLocation.id, turn.sequence)
  ) {
    locations.add(normalizeText(currentLocation.text));
  }
  return {
    priorKnownFacts: {
      *[Symbol.iterator]() {
        yield* initialFacts;
        for (let index = 0; index < priorFactCount; index += 1) {
          yield priorFacts[index]!;
        }
      },
    },
    priorNormalizedFacts: {
      has(value) {
        const firstIndex = priorFactFirstIndex.get(value);
        return (
          initialNormalizedFacts.has(value) ||
          (firstIndex !== undefined && firstIndex < priorFactCount)
        );
      },
    },
    priorVisitedLocations: locations,
    priorSituation: hasPriorSituation
      ? priorSituation
      : initialPriorSituation(session, turn, lastTouched),
    priorDispositions: new Map([
      ...initialPriorDispositions(session, turn, lastTouched),
      ...priorDispositions,
    ]),
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

export function buildPriorProgressionStateIndex(
  session: AdventureSession,
  targetTurnIds: ReadonlySet<string>,
): Map<string, PriorProgressionState> {
  const lastTouched = buildLastTouchedSequenceIndex(session);
  const results = new Map<string, PriorProgressionState>();
  const priorFacts: string[] = [];
  const priorFactFirstIndex = new Map<string, number>();
  const priorLocations = new Set<string>();
  const priorDispositions = new Map<string, string>();
  let priorSituation: string | null | undefined;
  let hasPriorSituation = false;
  for (const turn of session.turns) {
    if (targetTurnIds.has(turn.id)) {
      results.set(
        turn.id,
        snapshotPriorProgressionState(
          session,
          turn,
          lastTouched,
          priorFacts,
          priorFacts.length,
          priorFactFirstIndex,
          priorLocations,
          priorSituation,
          hasPriorSituation,
          priorDispositions,
        ),
      );
    }

    appendPriorFactHistory(turn, priorFacts, priorFactFirstIndex);
    if (turn.visiblePatch.location?.text)
      priorLocations.add(normalizeText(turn.visiblePatch.location.text));
    if (turn.visiblePatch.situation !== undefined) {
      hasPriorSituation = true;
      priorSituation = turn.visiblePatch.situation
        ? normalizeText(turn.visiblePatch.situation.text)
        : null;
    }
    for (const rel of [
      ...turn.visiblePatch.relationships.add,
      ...turn.visiblePatch.relationships.update,
    ]) {
      priorDispositions.set(rel.subjectId, normalizeText(rel.disposition));
    }
  }
  return results;
}
