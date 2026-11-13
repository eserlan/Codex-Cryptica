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

// fallow-ignore-next-line complexity -- Adventure artwork orchestration; branches are validation and fallback guards covered by feature tests.
function findExistingPerson(
  people: readonly AdventurePerson[],
  input: PersonResolutionInput,
): { person: AdventurePerson | null; reason?: "ambiguous" | "missing" } {
  if (input.sourceRecordId) {
    const byRecord = people.find(
      (p) => p.sourceRecordId === input.sourceRecordId,
    );
    if (byRecord) return { person: byRecord };
  }
  if (input.id) {
    const byId = people.find((p) => p.id === input.id);
    if (byId) return { person: byId };
  }
  if (input.factId) {
    const byFact = people.find((p) => p.linkedFactIds.includes(input.factId!));
    if (byFact) return { person: byFact };
  }
  if (input.alias) {
    const aliasTrimmed = trimName(input.alias);
    const matches = people.filter((p) => p.aliases.includes(aliasTrimmed));
    if (matches.length === 1) return { person: matches[0] };
    if (matches.length > 1) return { person: null, reason: "ambiguous" };
  }
  return { person: null };
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
