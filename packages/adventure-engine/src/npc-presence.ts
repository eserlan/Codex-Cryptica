import { resolvePersonByReference } from "./people";
import type { AdventurePerson } from "./people-types";
import type { AdventureSession, StateFact, VisibleStatePatch } from "./types";

const COMPANION_REFUSAL_RE =
  /\b(?:refuses?\s+to\s+(?:come|follow|go|leave|accompany)|stays?\s+behind|remains?\s+behind|won't\s+(?:come|follow|leave)|will\s+not\s+(?:come|follow|leave)|declines?\s+to\s+(?:come|follow|join)|stays?\s+(?:at|in|by)\s+the)\b/i;

const COMPANION_TRAVEL_RE =
  /\b(?:accompan(?:y|ies|ied)|follows?\s+(?:you|along)|walks?\s+with\s+you|comes?\s+with\s+you|comes?\s+along|goes?\s+with\s+you|leads?\s+you|beside\s+you|at\s+your\s+side|with\s+you\s+(?:to|into|down|toward))\b/i;

export function extractNpcPresenceName(text: string): string {
  const base = text.split(/[,(—]|\s+-\s+/)[0] ?? text;
  return base.replace(/\s+/g, " ").trim();
}

function hasSourceConflict(
  a: Pick<StateFact, "sourceRecordId">,
  b: Pick<StateFact, "sourceRecordId">,
): boolean {
  return Boolean(
    a.sourceRecordId &&
    b.sourceRecordId &&
    a.sourceRecordId !== b.sourceRecordId,
  );
}

export function resolvePersonIdForFact(
  fact: Pick<StateFact, "text" | "sourceRecordId" | "personId">,
  people: readonly AdventurePerson[] | undefined,
): { personId?: string; ambiguous?: boolean } {
  if (!people?.length) return {};
  if (fact.personId && people.some((p) => p.id === fact.personId)) {
    return { personId: fact.personId };
  }
  if (fact.sourceRecordId) {
    const byRecord = people.find(
      (p) => p.sourceRecordId === fact.sourceRecordId,
    );
    if (byRecord) return { personId: byRecord.id };
  }
  const name = extractNpcPresenceName(fact.text);
  if (!name) return {};
  const resolved = resolvePersonByReference(people, name);
  if (resolved.reason === "ambiguous") return { ambiguous: true };
  if (resolved.person) {
    if (
      fact.sourceRecordId &&
      resolved.person.sourceRecordId &&
      fact.sourceRecordId !== resolved.person.sourceRecordId
    ) {
      return {};
    }
    return { personId: resolved.person.id };
  }
  return {};
}

function findMatchingActiveCharacter(
  candidate: Pick<StateFact, "text" | "sourceRecordId" | "personId">,
  existingActive: readonly StateFact[],
  people: readonly AdventurePerson[] | undefined,
): StateFact | undefined {
  if (candidate.sourceRecordId) {
    const byRecord = existingActive.filter(
      (e) => e.sourceRecordId === candidate.sourceRecordId,
    );
    if (byRecord.length === 1) return byRecord[0];
    if (byRecord.length > 1) return undefined;
  }

  const candPerson = resolvePersonIdForFact(candidate, people);
  if (candPerson.ambiguous) return undefined;

  if (candPerson.personId) {
    const byPerson = existingActive.filter((e) => {
      if (hasSourceConflict(candidate, e)) return false;
      const res = resolvePersonIdForFact(e, people);
      return !res.ambiguous && res.personId === candPerson.personId;
    });
    if (byPerson.length === 1) return byPerson[0];
    if (byPerson.length > 1) return undefined;
  }

  const normName = extractNpcPresenceName(candidate.text).toLowerCase();
  if (!normName) return undefined;
  const byName = existingActive.filter((e) => {
    if (hasSourceConflict(candidate, e)) return false;
    const ePerson = resolvePersonIdForFact(e, people);
    if (ePerson.ambiguous) return false;
    if (
      candPerson.personId &&
      ePerson.personId &&
      candPerson.personId !== ePerson.personId
    ) {
      return false;
    }
    return extractNpcPresenceName(e.text).toLowerCase() === normName;
  });
  return byName.length === 1 ? byName[0] : undefined;
}

function mergePresenceEntry(
  existing: StateFact,
  incoming: StateFact,
  resolvedPersonId?: string,
): StateFact {
  const cues = incoming.cues?.length
    ? incoming.cues
    : existing.cues?.length
      ? existing.cues
      : undefined;
  const sourceRecordId = incoming.sourceRecordId ?? existing.sourceRecordId;
  const personId = incoming.personId ?? existing.personId ?? resolvedPersonId;
  const text =
    incoming.text.trim().length >= existing.text.trim().length
      ? incoming.text
      : existing.text;
  return {
    ...existing,
    ...incoming,
    id: existing.id,
    text,
    ...(sourceRecordId ? { sourceRecordId } : {}),
    ...(personId ? { personId } : {}),
    ...(cues ? { cues: [...cues] } : {}),
  };
}

/**
 * Rewrites `activeCharacters.add` entries that unambiguously refer to an
 * existing `activeCharacters` record into `update` entries on the same ID,
 * preventing duplicate scene-presence clones when companions move or return.
 */
export function deduplicateActiveCharactersPatch(
  patch: VisibleStatePatch,
  existingActive: readonly StateFact[],
  people: readonly AdventurePerson[] | undefined,
): VisibleStatePatch {
  if (patch.activeCharacters.add.length === 0) return patch;

  const removed = new Set(patch.activeCharacters.removeIds);
  const updates = [...patch.activeCharacters.update];
  const updatedIds = new Set(updates.map((u) => u.id));
  const remainingExisting = existingActive.filter((e) => !removed.has(e.id));
  const nextAdd: StateFact[] = [];

  for (const added of patch.activeCharacters.add) {
    const personId = resolvePersonIdForFact(added, people).personId;
    const enrichedAdded = personId ? { ...added, personId } : added;

    const existingMatch = findMatchingActiveCharacter(
      enrichedAdded,
      remainingExisting,
      people,
    );
    if (existingMatch && !updatedIds.has(existingMatch.id)) {
      updates.push(mergePresenceEntry(existingMatch, enrichedAdded, personId));
      updatedIds.add(existingMatch.id);
      continue;
    }

    const sameTurnMatch = findMatchingActiveCharacter(
      enrichedAdded,
      nextAdd,
      people,
    );
    if (sameTurnMatch) {
      const idx = nextAdd.indexOf(sameTurnMatch);
      nextAdd[idx] = mergePresenceEntry(sameTurnMatch, enrichedAdded, personId);
      continue;
    }

    nextAdd.push(enrichedAdded);
  }

  return {
    ...patch,
    activeCharacters: {
      add: nextAdd,
      update: updates,
      removeIds: patch.activeCharacters.removeIds,
    },
  };
}

/**
 * Safe, idempotent reconciliation for sessions that already contain duplicate
 * `activeCharacters` entries for the same unambiguous person. Keeps the most
 * recent entry's location/text and never merges distinct `sourceRecordId`s or
 * ambiguous same-name characters.
 */
export function reconcileDuplicateActiveCharacters(
  activeCharacters: readonly StateFact[],
  people: readonly AdventurePerson[] | undefined,
): StateFact[] {
  if (activeCharacters.length <= 1) return [...activeCharacters];

  const keptReverse: StateFact[] = [];
  for (let i = activeCharacters.length - 1; i >= 0; i -= 1) {
    const entry = activeCharacters[i]!;
    const personId = resolvePersonIdForFact(entry, people).personId;
    const enriched =
      personId && !entry.personId ? { ...entry, personId } : entry;

    const newerMatch = findMatchingActiveCharacter(
      enriched,
      keptReverse,
      people,
    );
    if (newerMatch) {
      const idx = keptReverse.indexOf(newerMatch);
      // `newerMatch` is the later entry, so it stays primary for placeId/text,
      // while inheriting any missing cues/sourceRecordId/personId from `enriched`.
      keptReverse[idx] = mergePresenceEntry(
        {
          ...newerMatch,
          text:
            newerMatch.text.trim().length >= enriched.text.trim().length
              ? newerMatch.text
              : enriched.text,
        },
        newerMatch,
        enriched.personId ?? newerMatch.personId,
      );
      if (!keptReverse[idx]!.cues?.length && enriched.cues?.length) {
        keptReverse[idx] = { ...keptReverse[idx]!, cues: [...enriched.cues] };
      }
      if (!keptReverse[idx]!.sourceRecordId && enriched.sourceRecordId) {
        keptReverse[idx] = {
          ...keptReverse[idx]!,
          sourceRecordId: enriched.sourceRecordId,
        };
      }
      continue;
    }
    keptReverse.push(enriched);
  }

  return keptReverse.reverse();
}

/**
 * Identifies NPCs at `previousPlaceId` who explicitly accompanied the player on
 * a `moveTo` turn (and did not refuse or stay behind) even if the model omitted
 * them from `visiblePatch.activeCharacters`.
 */
export function detectCompanionTravelIds(
  previousActive: readonly StateFact[],
  playerAction: string,
  narration: string,
  previousPlaceId: string | undefined,
  touchedIds: ReadonlySet<string>,
): Set<string> {
  const traveling = new Set<string>();
  if (!previousPlaceId) return traveling;
  if (COMPANION_REFUSAL_RE.test(narration)) return traveling;
  const combined = `${playerAction}\n${narration}`;
  if (!COMPANION_TRAVEL_RE.test(combined)) return traveling;

  for (const npc of previousActive) {
    if (npc.placeId !== previousPlaceId || touchedIds.has(npc.id)) continue;
    const name = extractNpcPresenceName(npc.text);
    if (!name) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRe = new RegExp(`\\b${escaped}\\b`, "i");
    if (nameRe.test(narration)) {
      traveling.add(npc.id);
    }
  }
  return traveling;
}

export interface DuplicatePresenceFinding {
  personId: string;
  name: string;
  activeCharacterIds: string[];
  placeIds: Array<string | null>;
}

/**
 * GM-only integrity check finding multiple `visibleState.activeCharacters`
 * entries that resolve unambiguously to the same `AdventurePerson`.
 */
export function findDuplicateActiveCharacterPresence(
  session: Pick<AdventureSession, "visibleState" | "people">,
): DuplicatePresenceFinding[] {
  const people = session.people ?? [];
  if (
    people.length === 0 ||
    session.visibleState.activeCharacters.length <= 1
  ) {
    return [];
  }
  const byPerson = new Map<string, StateFact[]>();
  for (const entry of session.visibleState.activeCharacters) {
    const resolved = resolvePersonIdForFact(entry, people);
    if (resolved.ambiguous || !resolved.personId) continue;
    const list = byPerson.get(resolved.personId) ?? [];
    list.push(entry);
    byPerson.set(resolved.personId, list);
  }

  const findings: DuplicatePresenceFinding[] = [];
  for (const [personId, entries] of byPerson) {
    if (entries.length <= 1) continue;
    const person = people.find((p) => p.id === personId);
    findings.push({
      personId,
      name: person?.name ?? extractNpcPresenceName(entries[0]!.text),
      activeCharacterIds: entries.map((e) => e.id),
      placeIds: entries.map((e) => e.placeId ?? null),
    });
    if (findings.length >= 20) break;
  }
  return findings;
}
