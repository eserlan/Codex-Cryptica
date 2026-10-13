/**
 * Follow-up focus resolution for the Lore Oracle (#4055).
 *
 * A follow-up such as "Give me four facts about her" carries no name, so it
 * must be read against the record the conversation is already about. The
 * focus is the stable entity id saved on the previous answer, not a name
 * guessed from free text, so a similarly named record cannot take its place.
 */

interface FocusEntityLike {
  id: string;
  title: string;
  type?: string;
  categoryId?: string;
  aliases?: string[];
}

type ReferentKind = "person" | "place" | "group" | "thing";

const PERSONAL = /\b(he|she|him|her|hers|his|himself|herself)\b/i;
const PLURAL = /\b(they|them|their|theirs|themselves)\b/i;
const NEUTER = /\b(it|its|itself)\b/i;
const NOUN_PHRASES: Array<{ pattern: RegExp; kind: ReferentKind | null }> = [
  {
    pattern:
      /\b(?:that|this|the same) (?:city|town|village|place|region|kingdom|realm|location|land|country)\b/i,
    kind: "place",
  },
  {
    pattern:
      /\b(?:that|this|the same) (?:faction|guild|group|order|organisation|organization|house|clan|cult)\b/i,
    kind: "group",
  },
  {
    pattern:
      /\b(?:that|this|the same) (?:item|weapon|artifact|artefact|object|relic)\b/i,
    kind: "thing",
  },
  {
    pattern: /\b(?:that|this|the same) (?:person|character|npc)\b/i,
    kind: "person",
  },
  { pattern: /\bthe entity\b/i, kind: null },
];

const KIND_KEYWORDS: Array<{ kind: ReferentKind; words: string[] }> = [
  {
    kind: "person",
    words: ["character", "npc", "person", "people", "deity", "god"],
  },
  {
    kind: "place",
    words: [
      "location",
      "place",
      "city",
      "region",
      "settlement",
      "realm",
      "dungeon",
      "building",
    ],
  },
  {
    kind: "group",
    words: ["faction", "organisation", "organization", "guild", "group"],
  },
  { kind: "thing", words: ["item", "object", "artifact", "artefact"] },
];

function entityKind(entity: FocusEntityLike): ReferentKind | null {
  const raw = `${entity.categoryId || ""} ${entity.type || ""}`.toLowerCase();
  for (const { kind, words } of KIND_KEYWORDS) {
    if (words.some((w) => raw.includes(w))) return kind;
  }
  return null;
}

/** The referent kinds a query's anaphora can point at, or null when it has none. */
function referencedKinds(query: string): Set<ReferentKind | null> | null {
  const kinds = new Set<ReferentKind | null>();
  for (const { pattern, kind } of NOUN_PHRASES) {
    if (pattern.test(query)) kinds.add(kind);
  }
  if (PERSONAL.test(query)) kinds.add("person");
  if (PLURAL.test(query)) {
    kinds.add("person");
    kinds.add("group");
  }
  if (NEUTER.test(query)) {
    kinds.add("place");
    kinds.add("group");
    kinds.add("thing");
  }
  return kinds.size > 0 ? kinds : null;
}

function namesOf(entity: FocusEntityLike): string[] {
  return [entity.title, ...(entity.aliases || [])]
    .map((n) => (n || "").trim().toLowerCase())
    .filter((n) => n.length > 2);
}

/** Whole-word match that also works for names like "Zöldmező". */
function mentions(queryLower: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
    "u",
  ).test(queryLower);
}

/**
 * Returns a standalone search query that names the focus entity, or null when
 * the query should not be tied to it: no anaphora, the pronoun cannot refer to
 * that kind of record, or the user names a different record.
 */
export function resolveFocusQuery(
  query: string,
  focus: FocusEntityLike,
  otherEntities: Iterable<FocusEntityLike>,
): string | null {
  const kinds = referencedKinds(query);
  if (!kinds) return null;

  const focusKind = entityKind(focus);
  // An unknown category never rules a referent out; a known one must fit.
  if (focusKind && !kinds.has(focusKind) && !kinds.has(null)) return null;

  const queryLower = query.toLowerCase();
  if (namesOf(focus).some((n) => mentions(queryLower, n))) return query;

  for (const other of otherEntities) {
    if (other.id === focus.id) continue;
    if (namesOf(other).some((n) => mentions(queryLower, n))) return null;
  }

  return `${query} (about ${focus.title})`;
}
