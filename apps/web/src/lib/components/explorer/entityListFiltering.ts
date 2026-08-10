import type { Entity } from "schema";
import type { SearchOptions, SearchResult } from "schema";

export interface EntitySearchService {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

export interface ParsedEntitySearchQuery {
  labelTokens: string[];
  textQuery: string;
}

export interface EntityTextSearchResult {
  matchIds: Set<string>;
  error: Error | null;
}

export interface EntityTextSearchRunner {
  search(
    query: string,
    entityCount: number,
  ): Promise<EntityTextSearchResult | null>;
  cancel(): void;
}

export function parseEntitySearchQuery(query: string): ParsedEntitySearchQuery {
  const textTokens: string[] = [];
  const labelTokens: string[] = [];

  for (const token of query.trim().toLowerCase().split(/\s+/)) {
    if (!token) continue;
    if (token.startsWith("#") || token.startsWith("@")) {
      const label = token.slice(1);
      if (label) labelTokens.push(label);
    } else {
      textTokens.push(token);
    }
  }

  return {
    labelTokens,
    textQuery: textTokens.join(" "),
  };
}

/**
 * Search the text-bearing part of an Explorer/Table query in the worker.
 * Structured filters remain local because they depend on the current view's
 * type, label, and draft semantics.
 */
export async function searchEntityText(
  query: string,
  entityCount: number,
  searchService: EntitySearchService,
): Promise<EntityTextSearchResult> {
  const { textQuery } = parseEntitySearchQuery(query);
  if (!textQuery) return { matchIds: new Set(), error: null };

  try {
    const results = await searchService.search(textQuery, {
      limit: Math.max(entityCount, 1),
      includeDrafts: true,
    });
    return {
      matchIds: new Set(results.map((result) => result.id)),
      error: null,
    };
  } catch (error) {
    return {
      matchIds: new Set(),
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export function createEntityTextSearchRunner(
  searchService: EntitySearchService,
): EntityTextSearchRunner {
  let requestId = 0;

  return {
    async search(query, entityCount) {
      const currentRequestId = ++requestId;
      const result = await searchEntityText(query, entityCount, searchService);
      return currentRequestId === requestId ? result : null;
    },
    cancel() {
      requestId++;
    },
  };
}

export interface FilterOptions {
  searchQuery: string;
  typeFilters: Set<string>;
  labelFilters: Set<string>;
  allowedTypes: string[] | null;
  showDraftsOnly: boolean;
  /** IDs returned by the worker for the text-bearing query, when available. */
  textMatchIds?: ReadonlySet<string> | null;
  /** Worker failed; use metadata-only matching rather than a blocking content scan. */
  textSearchUnavailable?: boolean;
  /** Worker request is in flight; use metadata-only matching until it resolves. */
  textSearchPending?: boolean;
}

export function filterEntities(
  allEntities: Entity[],
  options: FilterOptions,
): Entity[] {
  const filtered: Entity[] = [];
  const query = options.searchQuery.trim().toLowerCase();
  const filterAllTypes = options.typeFilters.size === 0;
  const activeLabels = Array.from(options.labelFilters);
  const allowedTypeSet = options.allowedTypes
    ? new Set(options.allowedTypes)
    : null;

  const { labelTokens, textQuery: remainingTextQuery } =
    parseEntitySearchQuery(query);

  for (let i = 0; i < allEntities.length; i++) {
    const e = allEntities[i];

    if (allowedTypeSet && !allowedTypeSet.has(e.type)) {
      continue;
    }

    // Filter by draft status
    if (options.showDraftsOnly && e.status !== "draft") {
      continue;
    }
    if (!options.showDraftsOnly && e.status === "draft") {
      continue;
    }

    const matchesType = filterAllTypes || options.typeFilters.has(e.type);
    if (!matchesType) continue;

    // AND logic for sidebar label pills. Legacy entities without labels fall
    // back to tags, matching how label chips are rendered (Constitution XII).
    const effectiveLabels = e.labels?.length ? e.labels : (e.tags ?? []);
    const matchesLabels =
      activeLabels.length === 0 ||
      activeLabels.every((f) => effectiveLabels.includes(f));
    if (!matchesLabels) continue;

    // Filter by specified label tokens (#label or @label). Legacy entities
    // without labels fall back to tags, matching the sidebar pill logic above.
    const matchesLabelTokens = labelTokens.every((l) =>
      effectiveLabels.some((label) => label.toLowerCase() === l),
    );
    if (!matchesLabelTokens) continue;

    // Match remaining raw text queries (no longer checking e.tags)
    const matchesText =
      !remainingTextQuery ||
      (options.textMatchIds
        ? options.textMatchIds.has(e.id)
        : options.textSearchUnavailable || options.textSearchPending
          ? e.title.toLowerCase().includes(remainingTextQuery) ||
            e.labels?.some((l) =>
              l.toLowerCase().includes(remainingTextQuery),
            ) ||
            e.aliases?.some((a) => a.toLowerCase().includes(remainingTextQuery))
          : e.title.toLowerCase().includes(remainingTextQuery) ||
            e.content.toLowerCase().includes(remainingTextQuery) ||
            e.labels?.some((l) =>
              l.toLowerCase().includes(remainingTextQuery),
            ) ||
            e.aliases?.some((a) =>
              a.toLowerCase().includes(remainingTextQuery),
            ));

    if (matchesText) {
      filtered.push(e);
    }
  }

  return filtered.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
}

export function countEntityTypes(
  allEntities: Entity[],
  options: {
    allowedTypes: string[] | null;
    showDraftsOnly: boolean;
  },
): Map<string, number> {
  const allowedTypeSet = options.allowedTypes
    ? new Set(options.allowedTypes)
    : null;
  const counts = new Map<string, number>();
  for (let i = 0; i < allEntities.length; i++) {
    const e = allEntities[i];
    if (allowedTypeSet && !allowedTypeSet.has(e.type)) {
      continue;
    }
    if (options.showDraftsOnly && e.status !== "draft") {
      continue;
    }
    if (!options.showDraftsOnly && e.status === "draft") {
      continue;
    }
    counts.set(e.type, (counts.get(e.type) || 0) + 1);
  }
  return counts;
}
