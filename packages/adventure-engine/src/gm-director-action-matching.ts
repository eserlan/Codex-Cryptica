import type { LocationContext } from "./contextual-rumours";
import { threadTopicWords } from "./dialogue-pacing";
import type { DirectorConfidence } from "./gm-director-brief-contract";
import { isPlayerVisibleScenarioEvent } from "./turn-progression";
import type {
  AdventureSession,
  Place,
  ScenarioItem,
  SourceRecordReference,
} from "./types";

const DISENGAGEMENT_RE =
  /\b(?:decline(?:\s+to\s+investigate)?|ignore\s+(?:it|this|that|the\s+(?:lead|rumour|rumor|matter|sign|bell))|abandon|stop\s+investigating|never\s+mind|head\s+home|walk\s+away)\b/i;

export function isDisengagementAction(action: string | undefined): boolean {
  return Boolean(action && DISENGAGEMENT_RE.test(action));
}

function normalizePhrase(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
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
    tokens: threadTopicWords(parts.join(" ")),
    leadPhrase: normalizePhrase(scenario.playerVisible.lead),
    placePhrases: placeNames
      .map(normalizePhrase)
      .filter((phrase) => phrase.length >= 3),
  };
}

export interface ActionMatch {
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

export function collectActionMatches(
  openHeard: readonly ScenarioItem[],
  session: AdventureSession,
  effectiveAction: string | undefined,
  location: LocationContext | null,
  disengaged: boolean,
): Map<string, ActionMatch> {
  const matches = new Map<string, ActionMatch>();
  if (disengaged || !effectiveAction) return matches;

  const context: ActionMatchContext = {
    actionTokens: threadTopicWords(effectiveAction),
    normalizedAction: normalizePhrase(effectiveAction),
    currentLocTokens: location ? threadTopicWords(location.name) : new Set(),
    normalizedCurrentLoc: location ? normalizePhrase(location.name) : "",
    focusedId: session.scenarioCollection?.focusedScenarioId ?? null,
  };
  for (const item of openHeard) {
    const match = matchActionToScenario(item, session, context);
    if (match) matches.set(item.id, match);
  }
  return matches;
}
