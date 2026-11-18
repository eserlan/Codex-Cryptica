import {
  MAX_HISTORICAL_OPEN_MECHANISMS,
  type AdventureCalendarDate,
  type HistoricalAnchorDocumentedFact,
  type HistoricalAnchorEntityRef,
  type HistoricalDateInterval,
  type HistoricalEventSnapshot,
} from "./historical-anchor-types";

const STANDARD_OPEN_MECHANISMS = [
  "cause",
  "responsible-actor",
  "location",
  "exact-date",
  "consequences",
] as const;

function isExactDayDate(date: AdventureCalendarDate): boolean {
  if (date.precision === "day") return true;
  if (!date.precision && date.month !== undefined && date.day !== undefined) {
    return true;
  }
  return false;
}

export function inferOpenMechanisms(
  event: HistoricalEventSnapshot,
  eventInterval: HistoricalDateInterval,
  documentedFacts: HistoricalAnchorDocumentedFact[],
  entityRefs: HistoricalAnchorEntityRef[],
): string[] {
  if (event.openMechanisms)
    return normalizeOpenMechanisms(event.openMechanisms);

  const combinedText = documentedFacts
    .map((fact) => fact.text.toLocaleLowerCase())
    .join(" ");
  const roles = new Set(
    entityRefs
      .map((ref) => ref.role?.toLocaleLowerCase().trim())
      .filter((role): role is string => Boolean(role)),
  );
  const open = inferMechanismsFromEvidence(combinedText, roles, eventInterval);
  return open.length > 0 ? open : [...STANDARD_OPEN_MECHANISMS];
}

function normalizeOpenMechanisms(mechanisms: string[]): string[] {
  return [
    ...new Set(
      mechanisms.map((item) => item.trim().slice(0, 160)).filter(Boolean),
    ),
  ].slice(0, MAX_HISTORICAL_OPEN_MECHANISMS);
}

function inferMechanismsFromEvidence(
  text: string,
  roles: Set<string>,
  interval: HistoricalDateInterval,
): string[] {
  return [
    ...(!hasCauseEvidence(text) ? ["cause"] : []),
    ...(!hasResponsibleActorEvidence(text, roles) ? ["responsible-actor"] : []),
    ...(!hasLocationEvidence(text, roles) ? ["location"] : []),
    ...(needsExactDate(interval) ? ["exact-date"] : []),
    ...(!hasConsequenceEvidence(text) ? ["consequences"] : []),
  ];
}

function hasCauseEvidence(text: string): boolean {
  return /\b(because|caused by|due to|resulted from)\b/.test(text);
}

function hasResponsibleActorEvidence(
  text: string,
  roles: Set<string>,
): boolean {
  const knownRole = ["responsible-actor", "culprit", "perpetrator"].some(
    (role) => roles.has(role),
  );
  return knownRole || /\b(by|culprit|assassin|killer|perpetrator)\b/.test(text);
}

function hasLocationEvidence(text: string, roles: Set<string>): boolean {
  const knownRole = ["location", "place"].some((role) => roles.has(role));
  return knownRole || /\b(at|in the|inside|near)\s+[a-z]{3,}/.test(text);
}

function needsExactDate(interval: HistoricalDateInterval): boolean {
  return (
    interval.approximate === true ||
    interval.end !== undefined ||
    !isExactDayDate(interval.start)
  );
}

function hasConsequenceEvidence(text: string): boolean {
  return /\b(aftermath|consequence|resulted in|led to)\b/.test(text);
}
