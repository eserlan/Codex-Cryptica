import {
  isHere,
  type AdventurePerson,
  type Place,
  type StateFact,
} from "@codex/adventure-engine";
import {
  matchArtwork,
  type ArtworkAsset,
} from "@codex/adventure-artwork-engine";
import {
  describeVisiblePerson,
  type VisiblePersonEntity,
} from "./artwork-resolver";

export interface ArtworkNpcEntity extends VisiblePersonEntity {
  id: string;
  image?: string;
}

export interface ArtworkNpcSession {
  vaultId: string;
  currentPlaceId?: string;
  places?: readonly Place[];
  people?: readonly AdventurePerson[];
  visibleState?: {
    activeCharacters?: readonly StateFact[];
    knownFacts?: readonly StateFact[];
  };
}

export type NpcPortraitSelection =
  | {
      kind: "vault";
      name: string;
      image: string;
      alt: string;
      subjectKey: string;
    }
  | {
      kind: "catalogue";
      name: string;
      asset: ArtworkAsset;
      alt: string;
      aiLabel: string;
      credits: string;
      subjectKey: string;
    };

function factMentionsPerson(
  factText: string,
  person: Pick<AdventurePerson, "name" | "aliases">,
): boolean {
  const lower = factText.toLowerCase();
  const candidates = [person.name, ...person.aliases];
  return candidates.some((candidate) => {
    const trimmed = candidate.trim().toLowerCase();
    return trimmed.length > 0 && lower.includes(trimmed);
  });
}

function factMatchesPerson(fact: StateFact, person: AdventurePerson): boolean {
  if (person.linkedFactIds.includes(fact.id)) return true;
  if (fact.sourceRecordId && person.sourceRecordId === fact.sourceRecordId) {
    return true;
  }
  return factMentionsPerson(fact.text, person);
}

function findMatchingPerson(
  fact: StateFact,
  people: readonly AdventurePerson[],
): AdventurePerson | undefined {
  return (
    people.find((person) => person.linkedFactIds.includes(fact.id)) ??
    (fact.sourceRecordId
      ? people.find((person) => person.sourceRecordId === fact.sourceRecordId)
      : undefined) ??
    people.find((person) => factMentionsPerson(fact.text, person))
  );
}

function resolvePersonEntity(
  person: AdventurePerson,
  entities: Readonly<Record<string, ArtworkNpcEntity>>,
): { ok: true; entity?: ArtworkNpcEntity } | { ok: false } {
  if (!person.sourceRecordId) return { ok: true, entity: undefined };
  const entity = entities[person.sourceRecordId];
  if (entity && entity.id !== person.sourceRecordId) return { ok: false };
  return { ok: true, entity };
}

function collectPersonFacts(
  person: AdventurePerson,
  hereCharacters: readonly StateFact[],
  hereFacts: readonly StateFact[],
): string[] {
  const texts: string[] = [];
  for (const fact of hereCharacters) {
    if (factMatchesPerson(fact, person)) {
      texts.push(fact.text, ...(fact.cues ?? []));
    }
  }
  for (const fact of hereFacts) {
    if (factMatchesPerson(fact, person)) {
      texts.push(fact.text, ...(fact.cues ?? []));
    }
  }
  return texts;
}

function selectPersonPortrait(
  person: AdventurePerson,
  entity: ArtworkNpcEntity | undefined,
  facts: readonly string[],
  theme: string | undefined,
  catalogue: readonly ArtworkAsset[],
): NpcPortraitSelection | null {
  if (entity?.image) {
    return {
      kind: "vault",
      name: person.name,
      image: entity.image,
      alt: `Portrait of ${person.name}`,
      subjectKey: `entity:${entity.id}`,
    };
  }
  const cues = describeVisiblePerson(person, theme, { entity, facts });
  if (!cues) return null;
  const asset = matchArtwork(catalogue, cues);
  if (!asset) return null;
  return {
    kind: "catalogue",
    name: person.name,
    asset,
    alt: asset.alt || `Portrait of ${person.name}`,
    aiLabel: "AI illustration",
    credits: asset.provenance.attribution,
    subjectKey: `${cues.subject.kind}:${cues.subject.id}`,
  };
}

export function filterHereCharacters(
  session: Pick<
    ArtworkNpcSession,
    "currentPlaceId" | "places" | "visibleState"
  >,
): {
  placeScope: { currentPlaceId?: string; places?: Place[] };
  hereCharacters: readonly StateFact[];
} {
  const placeScope = {
    currentPlaceId: session.currentPlaceId,
    places: session.places ? [...session.places] : undefined,
  };
  const hereCharacters = (session.visibleState?.activeCharacters ?? []).filter(
    (fact) => isHere(fact, placeScope),
  );
  return { placeScope, hereCharacters };
}

function toNpcPerson(
  fact: StateFact,
  people: readonly AdventurePerson[],
): AdventurePerson {
  return (
    findMatchingPerson(fact, people) ?? {
      id: fact.id,
      name: fact.text.split(/[.,:—–-]/, 1)[0]?.trim() || fact.text,
      aliases: [],
      linkedFactIds: [fact.id],
      ...(fact.sourceRecordId ? { sourceRecordId: fact.sourceRecordId } : {}),
    }
  );
}

/** Resolve a portrait for the first active, player-visible NPC in the current scene. */
export function selectPresentNpcPortrait(
  session: ArtworkNpcSession | null,
  activeVaultId: string | null | undefined,
  entities: Readonly<Record<string, ArtworkNpcEntity>>,
  enabled: boolean,
  theme: string | undefined,
  catalogue: readonly ArtworkAsset[] = [],
): NpcPortraitSelection | null {
  if (!enabled || !session || session.vaultId !== activeVaultId) return null;
  const people = session.people ?? [];
  const { placeScope, hereCharacters } = filterHereCharacters(session);
  if (hereCharacters.length === 0) return null;
  const hereFacts = (session.visibleState?.knownFacts ?? []).filter((fact) =>
    isHere(fact, placeScope),
  );
  const seen = new Set<string>();
  for (const fact of hereCharacters) {
    const person = toNpcPerson(fact, people);
    if (seen.has(person.id)) continue;
    seen.add(person.id);
    const entityState = resolvePersonEntity(person, entities);
    if (!entityState.ok) continue;
    const facts = collectPersonFacts(person, hereCharacters, hereFacts);
    const portrait = selectPersonPortrait(
      person,
      entityState.entity,
      facts,
      theme,
      catalogue,
    );
    if (portrait) return portrait;
  }
  return null;
}
