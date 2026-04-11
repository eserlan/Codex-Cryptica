import {
  FRONTPAGE_CONTEXT_MAX_CHARS,
  FRONTPAGE_ENTITY_SNIPPET_MAX_CHARS,
} from "./front-page-constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FrontpageEntityLike {
  title?: string;
  content?: string;
  chronicle?: string;
  tags?: string[];
  labels?: string[];
  lastModified?: number;
  id?: string;
}

export interface RecentActivityLike {
  id: string;
  title?: string;
  tags?: string[];
  labels?: string[];
  lastModified?: number;
}

// ---------------------------------------------------------------------------
// Pinning
// ---------------------------------------------------------------------------

/**
 * Single source of truth for whether an entity should be pinned to the top
 * of the recent-activity list.  Matches both `tags` and `labels` arrays
 * against the "frontpage" keyword (case-insensitive, trimmed).
 */
export function isFrontpageEntity(entity: {
  tags?: string[];
  labels?: string[];
}): boolean {
  const check = (arr: string[] | undefined) => {
    if (!arr) return false;
    for (const item of arr) {
      if (item?.trim().toLowerCase() === "frontpage") return true;
    }
    return false;
  };
  return check(entity.tags) || check(entity.labels);
}

/**
 * Partition recent activities into pinned (frontpage-tagged/labeled) and
 * unpinned groups, sort each group by lastModified descending, then return
 * the combined array sliced to `limit`.
 */
export function partitionAndSortRecentActivity<T extends RecentActivityLike>(
  activities: T[],
  limit: number,
): T[] {
  const pinned: T[] = [];
  const unpinned: T[] = [];

  for (const activity of activities) {
    if (isFrontpageEntity(activity)) {
      pinned.push(activity);
    } else {
      unpinned.push(activity);
    }
  }

  pinned.sort((a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0));
  unpinned.sort((a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0));

  return [...pinned, ...unpinned].slice(0, limit);
}

// ---------------------------------------------------------------------------
// Briefing source resolution
// ---------------------------------------------------------------------------

/**
 * Determine the authoritative briefing text given the available sources.
 * Priority: metadata.description → frontPageEntity.chronicle → frontPageEntity.content.
 * Returns an empty string when no source is available.
 */
export function resolveBriefingSource(
  metadata: { description?: string },
  frontPageEntity: { chronicle?: string; content?: string } | null | undefined,
): string {
  if (metadata.description?.trim()) return metadata.description.trim();
  if (frontPageEntity?.chronicle?.trim())
    return frontPageEntity.chronicle.trim();
  if (frontPageEntity?.content?.trim()) return frontPageEntity.content.trim();
  return "";
}

// ---------------------------------------------------------------------------
// Context assembly for frontpage entities
// ---------------------------------------------------------------------------

/**
 * Build a context string from frontpage-tagged entities, respecting the
 * character budget defined in constants.  Each entity gets a header and a
 * truncated snippet.  Omitted entities are noted with a suffix.
 *
 * Callers are responsible for loading entity content before calling this
 * function (via vault.loadEntityContent or equivalent).
 */
export function buildFrontpageEntityContext(
  entities: FrontpageEntityLike[],
): string {
  if (entities.length === 0) return "";

  const sections: string[] = [];
  let currentLength = 0;
  let omittedCount = 0;

  for (const entity of entities) {
    if (!entity.title) continue;

    const content = (
      entity.chronicle?.trim() ||
      entity.content?.trim() ||
      ""
    ).trim();
    if (!content) continue;

    const header = `--- FRONTPAGE ENTITY: ${entity.title} ---\n`;
    const remainingBudget = FRONTPAGE_CONTEXT_MAX_CHARS - currentLength;
    if (remainingBudget <= header.length + 40) {
      omittedCount += 1;
      continue;
    }

    const bodyBudget = Math.min(
      FRONTPAGE_ENTITY_SNIPPET_MAX_CHARS,
      remainingBudget - header.length,
    );
    let body = content;
    if (body.length > bodyBudget) {
      body =
        body.slice(0, Math.max(0, bodyBudget - 16)).trimEnd() +
        "... [truncated]";
    }

    const snippet = `${header}${body}`;
    sections.push(snippet);
    currentLength += snippet.length + 2;
  }

  const joined = sections.join("\n\n");
  if (!omittedCount) return joined;

  const suffix = `\n\n[${omittedCount} additional frontpage ${
    omittedCount === 1 ? "entity" : "entities"
  } omitted for brevity.]`;
  return `${joined}${suffix}`;
}
