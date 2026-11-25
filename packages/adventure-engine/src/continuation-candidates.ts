import { detectHiddenTextLeakage } from "./hidden-state";
import { fnv1a32 } from "./thread-outcomes";
import { isPlayerVisibleScenarioEvent } from "./turn-progression-scope";
import type {
  AdventureContinuationCandidate,
  AdventureContinuationSet,
  AdventureSession,
  ContinuationAnchorType,
  ThreadOutcome,
} from "./types";

export interface SelectContinuationOptions {
  sourceOutcomeId?: string;
  dismissedCandidateIds?: readonly string[];
  genreHint?: string;
}

interface UnresolvedNote {
  id: string;
  text: string;
  sourceIds: string[];
}

function stableCandidateId(
  anchorType: ContinuationAnchorType,
  key: string,
  outcomeScope: string,
): string {
  const raw = `cont:${anchorType}:${key}:${outcomeScope}`;
  if (raw.length <= 160) return raw;
  const digest = `${fnv1a32(raw, 0x811c9dc5)}${fnv1a32(raw, 0x9e3779b9)}`;
  return `cont:${anchorType}:${digest}`.slice(0, 160);
}

function isPlayerSafeText(session: AdventureSession, text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return detectHiddenTextLeakage(session, trimmed).length === 0;
}

function clip(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars - 1)}…`;
}

function collectPlayerSafeFacts(session: AdventureSession) {
  const known = session.visibleState.knownFacts.map((f) => ({
    id: f.id,
    text: f.text.trim(),
    sourceRecordId: f.sourceRecordId,
    placeId: f.placeId,
  }));
  const provisional = session.provisionalFacts
    .filter((f) => f.visibility === "player-visible")
    .map((f) => ({
      id: f.id,
      kind: f.kind,
      text: `${f.name}: ${f.summary}`.trim(),
    }));
  return { known, provisional };
}

function appendOutcomeNotes(
  ownerId: string,
  outcome: ThreadOutcome | undefined,
  notes: UnresolvedNote[],
): void {
  if (!outcome) return;
  for (const note of outcome.unresolvedConsequences ?? []) {
    if (!note.trim()) continue;
    notes.push({
      id: `${ownerId}:${note.slice(0, 32)}`,
      text: note.trim(),
      sourceIds: outcome.supportingFactIds.slice(0, 4),
    });
  }
}

function collectUnresolvedNotes(session: AdventureSession): UnresolvedNote[] {
  const notes: UnresolvedNote[] = [];
  for (const thread of session.emergentThreads ?? []) {
    if (thread.status !== "open") {
      appendOutcomeNotes(thread.id, thread.outcome, notes);
    }
  }
  for (const scenario of session.scenarioCollection?.items ?? []) {
    if (scenario.knowledge !== "heard") continue;
    if (scenario.status !== "open") {
      appendOutcomeNotes(scenario.id, scenario.outcome, notes);
    }
    for (const event of scenario.events) {
      if (!isPlayerVisibleScenarioEvent(scenario, event)) continue;
      if (!event.text.trim()) continue;
      notes.push({
        id: event.id,
        text: event.text.trim(),
        sourceIds: [event.id],
      });
    }
  }
  return notes;
}

function findBestCharacterAnchor(
  session: AdventureSession,
  facts: ReturnType<typeof collectPlayerSafeFacts>,
) {
  const playerName = session.playerCharacter.name.trim().toLowerCase();
  const resolvedPersonIds = new Set(
    (session.emergentThreads ?? [])
      .filter((t) => t.status !== "open")
      .flatMap((t) => t.linkedPersonIds),
  );
  const candidates = (session.people ?? []).filter((person) => {
    const name = person.name.trim();
    if (!name || name.toLowerCase() === playerName) return false;
    return (
      resolvedPersonIds.has(person.id) ||
      person.linkedFactIds.length > 0 ||
      facts.known.some((f) => f.text.toLowerCase().includes(name.toLowerCase()))
    );
  });
  return candidates.find((p) => resolvedPersonIds.has(p.id)) ?? candidates[0];
}

function buildCharacterCandidate(
  session: AdventureSession,
  facts: ReturnType<typeof collectPlayerSafeFacts>,
  notes: readonly UnresolvedNote[],
  outcomeScope: string,
  options: SelectContinuationOptions,
): AdventureContinuationCandidate | null {
  const person = findBestCharacterAnchor(session, facts);
  if (!person) return null;

  const lower = person.name.toLowerCase();
  const relatedNote = notes.find((n) => n.text.toLowerCase().includes(lower));
  const relatedFact = facts.known.find((f) =>
    f.text.toLowerCase().includes(lower),
  );
  const premise = relatedNote
    ? clip(`Follow up on ${person.name}: ${relatedNote.text}`, 240)
    : relatedFact
      ? clip(`Revisit ${person.name} regarding: ${relatedFact.text}`, 240)
      : clip(
          `Revisit ${person.name} to see what remains unsettled after recent events.`,
          240,
        );
  const sourceRecordIds = [
    ...new Set([
      ...(person.sourceRecordId ? [person.sourceRecordId] : []),
      ...person.linkedFactIds.slice(0, 3),
      ...(relatedFact ? [relatedFact.id] : []),
      ...(relatedNote?.sourceIds ?? []),
    ]),
  ].slice(0, 6);
  if (sourceRecordIds.length === 0) sourceRecordIds.push(person.id);

  return {
    id: stableCandidateId("character", person.id, outcomeScope),
    ...(options.sourceOutcomeId
      ? { sourceOutcomeId: options.sourceOutcomeId }
      : {}),
    anchorType: "character",
    sourceRecordIds,
    playerSafeTitle: clip(`Follow up with ${person.name}`, 100),
    playerSafePremise: premise,
    uncertainty: `What ${person.name} knows or chooses next remains unconfirmed.`,
    sourceRevision: session.revision,
    ...(options.genreHint ? { genreHint: options.genreHint } : {}),
  };
}

function buildPlaceCandidate(
  session: AdventureSession,
  facts: ReturnType<typeof collectPlayerSafeFacts>,
  notes: ReturnType<typeof collectUnresolvedNotes>,
  outcomeScope: string,
  options: SelectContinuationOptions,
): AdventureContinuationCandidate | null {
  const resolvedPlaceIds = new Set(
    (session.emergentThreads ?? [])
      .filter((t) => t.status !== "open")
      .flatMap((t) => t.linkedPlaceIds),
  );
  const place = (session.places ?? []).find((p) => {
    const hasFact = facts.known.some(
      (f) =>
        f.placeId === p.id ||
        f.text.toLowerCase().includes(p.name.toLowerCase()),
    );
    const hasNote = notes.some((n) =>
      n.text.toLowerCase().includes(p.name.toLowerCase()),
    );
    return resolvedPlaceIds.has(p.id) || hasFact || hasNote;
  });
  if (!place) return null;

  const placeNote = notes.find((n) =>
    n.text.toLowerCase().includes(place.name.toLowerCase()),
  );
  const placeFact = facts.known.find(
    (f) =>
      f.placeId === place.id ||
      f.text.toLowerCase().includes(place.name.toLowerCase()),
  );
  const premise = placeNote
    ? clip(`Return to ${place.name}: ${placeNote.text}`, 240)
    : placeFact
      ? clip(`Revisit ${place.name}: ${placeFact.text}`, 240)
      : clip(`Return to ${place.name} to check what has changed since.`, 240);
  const sourceRecordIds = [
    ...new Set([
      ...(place.sourceRecordId ? [place.sourceRecordId] : [place.id]),
      ...(placeFact ? [placeFact.id] : []),
      ...(placeNote?.sourceIds ?? []),
    ]),
  ].slice(0, 6);

  return {
    id: stableCandidateId("place", place.id, outcomeScope),
    ...(options.sourceOutcomeId
      ? { sourceOutcomeId: options.sourceOutcomeId }
      : {}),
    anchorType: "place",
    sourceRecordIds,
    playerSafeTitle: clip(`Return to ${place.name}`, 100),
    playerSafePremise: premise,
    uncertainty: `Conditions around ${place.name} may have shifted since your last visit.`,
    sourceRevision: session.revision,
    ...(options.genreHint ? { genreHint: options.genreHint } : {}),
  };
}

function buildEventCandidate(
  session: AdventureSession,
  facts: ReturnType<typeof collectPlayerSafeFacts>,
  notes: ReturnType<typeof collectUnresolvedNotes>,
  usedTexts: readonly string[],
  outcomeScope: string,
  options: SelectContinuationOptions,
): AdventureContinuationCandidate | null {
  const usedLower = new Set(usedTexts.map((t) => t.toLowerCase()));
  const note = notes.find((n) => !usedLower.has(n.text.toLowerCase()));
  const eventFact = !note
    ? facts.provisional.find(
        (f) => f.kind === "event" && !usedLower.has(f.text.toLowerCase()),
      )
    : undefined;
  const text = note?.text ?? eventFact?.text;
  if (!text) return null;

  const sourceRecordIds = note
    ? note.sourceIds.length > 0
      ? note.sourceIds
      : [note.id]
    : [eventFact!.id];

  return {
    id: stableCandidateId("event", fnv1a32(text, 0x811c9dc5), outcomeScope),
    ...(options.sourceOutcomeId
      ? { sourceOutcomeId: options.sourceOutcomeId }
      : {}),
    anchorType: "event",
    sourceRecordIds: sourceRecordIds.slice(0, 6),
    playerSafeTitle: clip(text, 90),
    playerSafePremise: clip(
      `Explore the aftermath of this unresolved development: ${text}`,
      240,
    ),
    uncertainty:
      "How this situation unfolds—and who else becomes involved—remains open.",
    sourceRevision: session.revision,
    ...(options.genreHint ? { genreHint: options.genreHint } : {}),
  };
}

function passesSecrecyGuard(
  session: AdventureSession,
  candidate: AdventureContinuationCandidate,
): boolean {
  return (
    isPlayerSafeText(session, candidate.playerSafeTitle) &&
    isPlayerSafeText(session, candidate.playerSafePremise) &&
    isPlayerSafeText(session, candidate.uncertainty)
  );
}

/**
 * Deterministically selects up to 3 distinct, player-safe next-adventure
 * pitches grounded in established characters, places, and unresolved
 * consequences. Never mutates the session or exposes GM-only state.
 */
export function selectAdventureContinuationCandidates(
  session: AdventureSession,
  options: SelectContinuationOptions = {},
): AdventureContinuationSet {
  const outcomeScope = options.sourceOutcomeId ?? `rev-${session.revision}`;
  const dismissed = new Set(options.dismissedCandidateIds ?? []);
  const facts = collectPlayerSafeFacts(session);
  const notes = collectUnresolvedNotes(session);

  const charCandidate = buildCharacterCandidate(
    session,
    facts,
    notes,
    outcomeScope,
    options,
  );
  const placeCandidate = buildPlaceCandidate(
    session,
    facts,
    notes,
    outcomeScope,
    options,
  );
  const usedTexts = [
    charCandidate?.playerSafePremise ?? "",
    placeCandidate?.playerSafePremise ?? "",
  ].filter(Boolean);
  const eventCandidate = buildEventCandidate(
    session,
    facts,
    notes,
    usedTexts,
    outcomeScope,
    options,
  );

  const candidates = [charCandidate, placeCandidate, eventCandidate]
    .filter((c): c is AdventureContinuationCandidate => Boolean(c))
    .filter((c) => !dismissed.has(c.id) && passesSecrecyGuard(session, c))
    .slice(0, 3);

  // Each pitch must have evidence distinct from the earlier selected pitches.
  // Preserve anchor priority while declining a second framing of the same hook.
  const distinctCandidates: AdventureContinuationCandidate[] = [];
  const usedEvidence = new Set<string>();
  for (const candidate of candidates) {
    if (candidate.sourceRecordIds.some((id) => usedEvidence.has(id))) continue;
    distinctCandidates.push(candidate);
    for (const id of candidate.sourceRecordIds) usedEvidence.add(id);
  }

  return {
    candidates: distinctCandidates,
    freshOption: {
      title: "Start something unrelated",
      premise:
        "Begin a fresh adventure in this world or a new setting without carrying over prior leads.",
    },
    sourceRevision: session.revision,
    ...(options.sourceOutcomeId
      ? { sourceOutcomeId: options.sourceOutcomeId }
      : {}),
  };
}
