import type { EntityLike, MentionSource, MentionSuggestion } from "./types";

const DESCRIPTOR_MAX = 80;

function firstLine(text: string | undefined): string | undefined {
  const line = text
    ?.split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return undefined;
  return line.length > DESCRIPTOR_MAX
    ? `${line.slice(0, DESCRIPTOR_MAX - 1)}…`
    : line;
}

function descriptorFor(entity: EntityLike): string | undefined {
  return entity.summary?.trim() || firstLine(entity.content);
}

interface Scored {
  entity: EntityLike;
  score: number;
  matchedAlias?: string;
}

/** Scores how well an entity matches a lower-cased query. 0 means no match. */
function score(entity: EntityLike, query: string): Scored | null {
  const title = entity.title.toLowerCase();
  if (title === query) return { entity, score: 4 };
  if (title.startsWith(query)) return { entity, score: 3 };
  if (title.split(/\s+/).some((word) => word.startsWith(query))) {
    return { entity, score: 2 };
  }

  for (const alias of entity.aliases ?? []) {
    const lower = alias.toLowerCase();
    if (lower.startsWith(query)) {
      return { entity, score: 2.5, matchedAlias: alias };
    }
  }

  if (title.includes(query)) return { entity, score: 1 };
  return null;
}

/**
 * Ranks visible Vault entities for an `@` query. Hidden entities are removed
 * before ranking, so they can never be suggested. Searches the title and aliases
 * in memory, the same data the Explorer uses.
 */
export function suggest(
  query: string,
  source: MentionSource,
  searchHits: string[] = [],
  limit = 8,
): MentionSuggestion[] {
  const needle = query.trim().toLowerCase();
  const scored: Scored[] = [];
  const matched = new Set<string>();
  for (const entity of source.listCandidates()) {
    if (!source.isVisible(entity)) continue;
    // An empty query offers the first visible entities, so typing "@" alone
    // shows what can be picked.
    const match = needle ? score(entity, needle) : { entity, score: 0 };
    if (match) {
      scored.push(match);
      matched.add(entity.id);
    }
  }

  // Full-text hits from the caller's search. They rank below title and alias
  // matches, and are checked against visibility like everything else.
  for (const id of searchHits) {
    if (matched.has(id)) continue;
    const entity = source.getEntity(id);
    if (!entity || !source.isVisible(entity)) continue;
    matched.add(id);
    scored.push({ entity, score: 0.5 });
  }

  scored.sort(
    (a, b) => b.score - a.score || a.entity.title.localeCompare(b.entity.title),
  );

  const top = scored.slice(0, limit);
  const titleCounts = new Map<string, number>();
  for (const { entity } of top) {
    const key = entity.title.toLowerCase();
    titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
  }

  return top.map(({ entity, matchedAlias }) => {
    const suggestion: MentionSuggestion = {
      entityId: entity.id,
      title: entity.title,
      entityType: entity.type ?? "",
      descriptor: descriptorFor(entity),
    };
    if (matchedAlias) suggestion.matchedAlias = matchedAlias;
    if ((titleCounts.get(entity.title.toLowerCase()) ?? 0) > 1) {
      suggestion.disambiguator = descriptorFor(entity) ?? entity.type;
    }
    return suggestion;
  });
}
