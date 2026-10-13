import type {
  EntityLike,
  Mention,
  MentionSource,
  ResolvedMention,
} from "./types";

const WORD_CHAR = /[\p{L}\p{N}_]/u;

interface NameHit {
  entity: EntityLike;
  length: number;
}

/** Every visible entity whose title or alias matches `text` at `index`, word-bounded. */
function namesAt(
  text: string,
  index: number,
  source: MentionSource,
): NameHit[] {
  const hits: NameHit[] = [];
  const rest = text.slice(index).toLowerCase();
  for (const entity of source.listCandidates()) {
    if (!source.isVisible(entity)) continue;
    const names = [entity.title, ...(entity.aliases ?? [])];
    let best = 0;
    for (const name of names) {
      const lower = name.toLowerCase();
      if (!rest.startsWith(lower)) continue;
      const after = rest[lower.length];
      if (after !== undefined && WORD_CHAR.test(after)) continue;
      best = Math.max(best, lower.length);
    }
    if (best > 0) hits.push({ entity, length: best });
  }
  return hits;
}

/** Index of every `@` that starts a mention: at the start or after whitespace. */
function atPositions(text: string): number[] {
  const positions: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "@") continue;
    if (i === 0 || /\s/.test(text[i - 1])) positions.push(i);
  }
  return positions;
}

function overlapsTracked(
  start: number,
  end: number,
  tracked: Mention[],
): boolean {
  return tracked.some((m) => start < m.end && end > m.start);
}

function resolveTracked(
  mentions: Mention[],
  source: MentionSource,
): ResolvedMention[] {
  return mentions.map((mention) => {
    const entity = source.getEntity(mention.entityId);
    if (!entity || !source.isVisible(entity)) {
      return {
        status: "unavailable",
        displayName: mention.displayName,
        start: mention.start,
        end: mention.end,
      };
    }
    return {
      status: "resolved",
      entityId: entity.id,
      displayName: entity.title,
      entityType: entity.type ?? mention.entityType,
      start: mention.start,
      end: mention.end,
    };
  });
}

/** Resolves one untracked `@` at `at`. Returns null when there is nothing to report. */
function resolveUntrackedAt(
  text: string,
  at: number,
  tracked: Mention[],
  source: MentionSource,
): ResolvedMention | null {
  const nameStart = at + 1;
  const hits = namesAt(text, nameStart, source);

  if (hits.length === 0) {
    const word = /^[\p{L}\p{N}_'-]+/u.exec(text.slice(nameStart))?.[0] ?? "";
    const end = nameStart + word.length;
    if (!word || overlapsTracked(at, end, tracked)) return null;
    return { status: "unmatched", displayName: word, start: at, end };
  }

  const longest = Math.max(...hits.map((h) => h.length));
  const end = nameStart + longest;
  if (overlapsTracked(at, end, tracked)) return null;

  const best = hits.filter((h) => h.length === longest);
  if (best.length === 1) {
    return {
      status: "resolved",
      entityId: best[0].entity.id,
      displayName: best[0].entity.title,
      entityType: best[0].entity.type ?? "",
      start: at,
      end,
    };
  }
  return {
    status: "ambiguous",
    displayName: text.slice(nameStart, end),
    candidates: best.map((h) => h.entity.id),
    start: at,
    end,
  };
}

/**
 * Resolves every mention in the text, in text order. Tracked mentions resolve
 * by entity id. Other `@` text is matched by name only when exactly one visible
 * entity fits the longest matching name. Several candidates give `ambiguous`,
 * and no candidate gives `unmatched`. Nothing is attached without a unique match.
 */
export function resolve(
  text: string,
  mentions: Mention[],
  source: MentionSource,
): ResolvedMention[] {
  const untracked = atPositions(text).flatMap((at) => {
    const result = resolveUntrackedAt(text, at, mentions, source);
    return result ? [result] : [];
  });
  return [...resolveTracked(mentions, source), ...untracked].sort(
    (a, b) => (a.start ?? 0) - (b.start ?? 0),
  );
}

/** Unique, resolved entity ids in first-seen order. Used to pin context. */
export function collectPinnedIds(results: ResolvedMention[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const r of results) {
    if (r.status !== "resolved" || !r.entityId) continue;
    if (seen.has(r.entityId)) continue;
    seen.add(r.entityId);
    ids.push(r.entityId);
  }
  return ids;
}
