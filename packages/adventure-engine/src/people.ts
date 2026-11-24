import type {
  AdventurePerson,
  PersonResolutionInput,
  PersonResolutionResult,
} from "./people-types";

export const MAX_ADVENTURE_PEOPLE = 200;
export const MAX_PERSON_ALIASES = 8;
export const MAX_PERSON_NAME_LENGTH = 120;
export const MAX_PERSON_LINKED_FACTS = 32;

function trimName(value: string | undefined): string {
  return (value ?? "").trim().slice(0, MAX_PERSON_NAME_LENGTH);
}

function findPersonByAlias(
  people: readonly AdventurePerson[],
  alias: string | undefined,
): { person: AdventurePerson | null; reason?: "ambiguous" | "missing" } {
  if (!alias) return { person: null };
  const aliasTrimmed = trimName(alias);
  const matches = people.filter((p) => p.aliases.includes(aliasTrimmed));
  if (matches.length === 1) return { person: matches[0] };
  if (matches.length > 1) return { person: null, reason: "ambiguous" };
  return { person: null };
}

function findExistingPerson(
  people: readonly AdventurePerson[],
  input: PersonResolutionInput,
): { person: AdventurePerson | null; reason?: "ambiguous" | "missing" } {
  const matchers: Array<() => AdventurePerson | undefined> = [
    () =>
      input.sourceRecordId
        ? people.find((p) => p.sourceRecordId === input.sourceRecordId)
        : undefined,
    () => (input.id ? people.find((p) => p.id === input.id) : undefined),
    () =>
      input.factId
        ? people.find((p) => p.linkedFactIds.includes(input.factId!))
        : undefined,
  ];
  for (const match of matchers) {
    const person = match();
    if (person) return { person };
  }
  return findPersonByAlias(people, input.alias);
}

function attachFactLink(
  people: AdventurePerson[],
  person: AdventurePerson,
  factId: string | undefined,
): PersonResolutionResult {
  if (
    !factId ||
    person.linkedFactIds.includes(factId) ||
    person.linkedFactIds.length >= MAX_PERSON_LINKED_FACTS
  ) {
    return { people, person };
  }
  const updated = {
    ...person,
    linkedFactIds: [...person.linkedFactIds, factId],
  };
  return {
    people: people.map((p) => (p.id === person.id ? updated : p)),
    person: updated,
  };
}

export function registerOrResolvePerson(
  existing: readonly AdventurePerson[],
  input: PersonResolutionInput,
): PersonResolutionResult {
  const people = [...existing];
  if (input.kind !== "person" || input.visibility !== "player-visible") {
    return { people, person: null, reason: "hidden" };
  }

  const found = findExistingPerson(people, input);
  if (found.person) {
    return attachFactLink(people, found.person, input.factId);
  }
  if (found.reason) {
    return { people, person: null, reason: found.reason };
  }

  const nameTrimmed = trimName(input.name);
  if (!input.id) {
    const matches = nameTrimmed
      ? people.filter((p) => p.name === nameTrimmed)
      : [];
    return {
      people,
      person: null,
      reason: matches.length > 1 ? "ambiguous" : "missing",
    };
  }

  if (!nameTrimmed) {
    return { people, person: null, reason: "invalid" };
  }

  if (people.length >= MAX_ADVENTURE_PEOPLE) {
    return { people, person: null, reason: "capacity" };
  }

  const created: AdventurePerson = {
    id: input.id,
    name: nameTrimmed,
    aliases: [],
    linkedFactIds: input.factId ? [input.factId] : [],
    ...(input.sourceRecordId ? { sourceRecordId: input.sourceRecordId } : {}),
  };
  people.push(created);
  return { people, person: created };
}

export function addPersonAlias(
  people: readonly AdventurePerson[],
  personId: string,
  alias: string,
): AdventurePerson[] {
  const trimmed = trimName(alias);
  if (!trimmed) return [...people];
  return people.map((person) => {
    if (person.id !== personId) return person;
    if (
      person.aliases.includes(trimmed) ||
      person.aliases.length >= MAX_PERSON_ALIASES
    ) {
      return person;
    }
    return { ...person, aliases: [...person.aliases, trimmed] };
  });
}

export function removePersonFactLink(
  people: readonly AdventurePerson[],
  factId: string,
): AdventurePerson[] {
  return people.map((person) =>
    person.linkedFactIds.includes(factId)
      ? {
          ...person,
          linkedFactIds: person.linkedFactIds.filter((id) => id !== factId),
        }
      : person,
  );
}

export function linkPersonToCanonical(
  people: readonly AdventurePerson[],
  personId: string,
  sourceRecordId: string,
): AdventurePerson[] {
  if (!sourceRecordId.trim()) return [...people];
  return people.map((person) =>
    person.id === personId ? { ...person, sourceRecordId } : person,
  );
}

const HONORIFIC_PREFIXES = new Set([
  "envoy",
  "lady",
  "lord",
  "sir",
  "dame",
  "captain",
  "dr",
  "doctor",
  "master",
  "elder",
  "chief",
  "commander",
  "warden",
  "magistrate",
  "archivist",
]);

function normalizeReferenceTokens(value: string): string[] {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function stripLeadingHonorific(tokens: string[]): string[] {
  if (tokens.length > 1 && HONORIFIC_PREFIXES.has(tokens[0]!)) {
    return tokens.slice(1);
  }
  return tokens;
}

/**
 * Derives bounded partial-name aliases (without honorifics, plus first/last
 * tokens) from a composite NPC name so partial references resolve consistently.
 */
export function derivePersonAliases(
  name: string,
  extraAliases: readonly string[] = [],
): string[] {
  const trimmed = trimName(name);
  if (!trimmed) return [];
  const candidates = new Set<string>();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const withoutTitle = stripLeadingHonorific(words.map((w) => w.toLowerCase()));
  if (words.length > 1 && withoutTitle.length < words.length) {
    candidates.add(words.slice(1).join(" "));
  }
  if (withoutTitle.length >= 2) {
    const startIdx = words.length - withoutTitle.length;
    for (const part of words.slice(startIdx)) {
      if (part.length >= 2) candidates.add(part);
    }
  }
  for (const extra of extraAliases) {
    const t = trimName(extra);
    if (t && t.toLowerCase() !== trimmed.toLowerCase()) candidates.add(t);
  }
  candidates.delete(trimmed);
  return [...candidates].slice(0, MAX_PERSON_ALIASES);
}

function personMatchesTokens(
  person: AdventurePerson,
  queryTokens: string[],
): boolean {
  const personTokens = new Set([
    ...normalizeReferenceTokens(person.name),
    ...person.aliases.flatMap(normalizeReferenceTokens),
  ]);
  return queryTokens.every((token) => personTokens.has(token));
}

/**
 * Resolves a partial name, title-omitted name, or reordered composite name
 * against existing session people. Returns `ambiguous` when multiple distinct
 * people match, never auto-merging them.
 */
export function resolvePersonByReference(
  people: readonly AdventurePerson[],
  reference: string,
): { person: AdventurePerson | null; reason?: "ambiguous" | "missing" } {
  const norm = trimName(reference).toLowerCase();
  if (!norm) return { person: null, reason: "missing" };

  const fullNameMatches = people.filter(
    (p) => p.name.trim().toLowerCase() === norm,
  );
  if (fullNameMatches.length === 1) return { person: fullNameMatches[0]! };
  if (fullNameMatches.length > 1) return { person: null, reason: "ambiguous" };

  const queryTokens = stripLeadingHonorific(
    normalizeReferenceTokens(reference),
  );
  if (queryTokens.length === 0) return { person: null, reason: "missing" };

  const tokenMatches = people.filter((p) =>
    personMatchesTokens(p, queryTokens),
  );
  if (tokenMatches.length === 1) return { person: tokenMatches[0]! };
  if (tokenMatches.length > 1) return { person: null, reason: "ambiguous" };

  const exactAliasMatches = people.filter((p) =>
    p.aliases.some((alias) => alias.trim().toLowerCase() === norm),
  );
  if (exactAliasMatches.length === 1) return { person: exactAliasMatches[0]! };
  if (exactAliasMatches.length > 1) {
    return { person: null, reason: "ambiguous" };
  }
  return { person: null, reason: "missing" };
}

/**
 * Registers or links a player-visible `person` provisional fact into
 * `session.people`, enriching aliases without creating duplicates for partial
 * names or titles.
 */
export function syncPersonFromFact(
  existing: readonly AdventurePerson[],
  input: {
    name: string;
    factId: string;
    aliases?: readonly string[];
    sourceRecordId?: string;
    visibility: "player-visible" | "gm-only";
  },
  createPersonId: () => string,
): PersonResolutionResult {
  if (input.visibility !== "player-visible") {
    return { people: [...existing], person: null, reason: "hidden" };
  }
  const resolved = resolvePersonByReference(existing, input.name);
  if (resolved.reason === "ambiguous") {
    return { people: [...existing], person: null, reason: "ambiguous" };
  }
  if (resolved.person) {
    let people = attachFactLink(
      [...existing],
      resolved.person,
      input.factId,
    ).people;
    for (const alias of derivePersonAliases(input.name, input.aliases)) {
      people = addPersonAlias(people, resolved.person.id, alias);
    }
    if (input.name.trim() !== resolved.person.name) {
      people = addPersonAlias(people, resolved.person.id, input.name);
    }
    return {
      people,
      person: people.find((p) => p.id === resolved.person!.id) ?? null,
    };
  }

  const created = registerOrResolvePerson(existing, {
    id: createPersonId(),
    name: input.name,
    factId: input.factId,
    sourceRecordId: input.sourceRecordId,
    kind: "person",
    visibility: input.visibility,
  });
  if (!created.person) return created;
  let people = created.people;
  for (const alias of derivePersonAliases(input.name, input.aliases)) {
    people = addPersonAlias(people, created.person.id, alias);
  }
  return {
    people,
    person: people.find((p) => p.id === created.person!.id) ?? created.person,
  };
}

function mergeAliases(
  primary: AdventurePerson,
  duplicate: AdventurePerson,
): string[] {
  const merged = [...primary.aliases];
  const primaryLower = primary.name.toLowerCase();
  for (const candidate of [duplicate.name, ...duplicate.aliases]) {
    if (merged.length >= MAX_PERSON_ALIASES) break;
    const t = trimName(candidate);
    const lower = t.toLowerCase();
    if (
      t &&
      lower !== primaryLower &&
      !merged.some((a) => a.toLowerCase() === lower)
    ) {
      merged.push(t);
    }
  }
  return merged;
}

function mergeFactLinks(
  primaryLinks: readonly string[],
  duplicateLinks: readonly string[],
): string[] {
  const merged = [...primaryLinks];
  for (const factId of duplicateLinks) {
    if (merged.length >= MAX_PERSON_LINKED_FACTS) break;
    if (!merged.includes(factId)) merged.push(factId);
  }
  return merged;
}

/**
 * Safely merges a duplicate `AdventurePerson` into `primaryId`, preserving
 * aliases and fact links while refusing to merge distinct canonical records.
 */
export function mergeDuplicatePeople(
  existing: readonly AdventurePerson[],
  primaryId: string,
  duplicateId: string,
): { people: AdventurePerson[]; merged: boolean } {
  if (primaryId === duplicateId) {
    return { people: [...existing], merged: false };
  }
  const primary = existing.find((p) => p.id === primaryId);
  const duplicate = existing.find((p) => p.id === duplicateId);
  if (!primary || !duplicate) return { people: [...existing], merged: false };
  const conflict =
    primary.sourceRecordId &&
    duplicate.sourceRecordId &&
    primary.sourceRecordId !== duplicate.sourceRecordId;
  if (conflict) return { people: [...existing], merged: false };

  const sourceRecordId = primary.sourceRecordId ?? duplicate.sourceRecordId;
  const updatedPrimary: AdventurePerson = {
    ...primary,
    aliases: mergeAliases(primary, duplicate),
    linkedFactIds: mergeFactLinks(
      primary.linkedFactIds,
      duplicate.linkedFactIds,
    ),
    ...(sourceRecordId ? { sourceRecordId } : {}),
  };
  return {
    people: existing
      .filter((p) => p.id !== duplicateId)
      .map((p) => (p.id === primaryId ? updatedPrimary : p)),
    merged: true,
  };
}
