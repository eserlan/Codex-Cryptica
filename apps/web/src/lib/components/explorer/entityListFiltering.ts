import type { Entity } from "schema";
import type { SearchOptions, SearchResult } from "schema";
import { matchesEntityQuery } from "$lib/utils/entity-search-match";

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

export type EntityWithPreview = Entity & {
  contentPreview?: string;
  summary?: string;
};

export interface EntityMissingFields {
  summary: boolean;
  labels: boolean;
  connections: boolean;
  isIncomplete: boolean;
}

export type LabelFilterMode = "all" | "has_any" | "missing" | "has_none";
export type ConnectionsFilterMode = "all" | "zero" | "has_connections";
export type SummaryFilterMode = "all" | "has_summary" | "missing_summary";
export type DateFilterMode = "all" | "has_date" | "missing_date";

export interface TableColumnFilters {
  nameQuery?: string;
  typeValues?: Set<string>;
  labelMode?: LabelFilterMode;
  labelValues?: Set<string>;
  connectionsMode?: ConnectionsFilterMode;
  summaryMode?: SummaryFilterMode;
  createdMode?: DateFilterMode;
  modifiedMode?: DateFilterMode;
}

export interface ConnectionSummaryLike {
  inbound?: number;
  outbound?: number;
  total?: number;
}

export function evaluateEntityMissingFields(
  entity: EntityWithPreview,
  connectionSummary?: ConnectionSummaryLike,
): EntityMissingFields {
  const hasSummary = Boolean(
    entity.summary?.trim() ||
    entity.contentPreview?.trim() ||
    entity.content?.trim(),
  );
  const effectiveLabels: string[] = entity.labels?.length
    ? entity.labels
    : ((entity as { tags?: string[] }).tags ?? []);
  const hasLabels = effectiveLabels.length > 0;
  const total =
    connectionSummary?.total ??
    (connectionSummary?.inbound ?? 0) + (connectionSummary?.outbound ?? 0);
  const hasConnections = total > 0;

  const summaryMissing = !hasSummary;
  const labelsMissing = !hasLabels;
  const connectionsMissing = !hasConnections;

  return {
    summary: summaryMissing,
    labels: labelsMissing,
    connections: connectionsMissing,
    isIncomplete: summaryMissing || labelsMissing || connectionsMissing,
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
  /** Filter to incomplete entities (missing summary, labels, or connections). */
  showIncompleteOnly?: boolean;
  /** Column-level filters. */
  columnFilters?: TableColumnFilters;
  /** Connection counts for evaluating missing connections. */
  connectionCounts?: Record<string, ConnectionSummaryLike>;
}

export function filterEntities(
  allEntities: EntityWithPreview[],
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

  const colFilters = options.columnFilters;

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
    const effectiveLabels: string[] = e.labels?.length
      ? e.labels
      : ((e as { tags?: string[] }).tags ?? []);
    const matchesLabels =
      activeLabels.length === 0 ||
      activeLabels.every((f: string) => effectiveLabels.includes(f));
    if (!matchesLabels) continue;

    // Filter by specified label tokens (#label or @label). Legacy entities
    // without labels fall back to tags, matching the sidebar pill logic above.
    const matchesLabelTokens = labelTokens.every((l: string) =>
      effectiveLabels.some((label: string) => label.toLowerCase() === l),
    );
    if (!matchesLabelTokens) continue;

    // Missing-data / incomplete entity filter
    if (options.showIncompleteOnly) {
      const missing = evaluateEntityMissingFields(
        e,
        options.connectionCounts?.[e.id],
      );
      if (!missing.isIncomplete) continue;
    }

    // Column-level filters
    if (colFilters) {
      if (colFilters.nameQuery?.trim()) {
        const nameQ = colFilters.nameQuery.trim().toLowerCase();
        if (!e.title.toLowerCase().includes(nameQ)) {
          continue;
        }
      }

      if (colFilters.typeValues && colFilters.typeValues.size > 0) {
        if (!colFilters.typeValues.has(e.type)) {
          continue;
        }
      }

      if (
        colFilters.labelMode === "missing" ||
        colFilters.labelMode === "has_none"
      ) {
        if (effectiveLabels.length > 0) continue;
      } else if (colFilters.labelMode === "has_any") {
        if (effectiveLabels.length === 0) continue;
        if (
          colFilters.labelValues &&
          colFilters.labelValues.size > 0 &&
          !effectiveLabels.some((l: string) => colFilters.labelValues!.has(l))
        ) {
          continue;
        }
      }

      if (colFilters.connectionsMode === "zero") {
        const total =
          options.connectionCounts?.[e.id]?.total ??
          (options.connectionCounts?.[e.id]?.inbound ?? 0) +
            (options.connectionCounts?.[e.id]?.outbound ?? 0);
        if (total > 0) continue;
      } else if (colFilters.connectionsMode === "has_connections") {
        const total =
          options.connectionCounts?.[e.id]?.total ??
          (options.connectionCounts?.[e.id]?.inbound ?? 0) +
            (options.connectionCounts?.[e.id]?.outbound ?? 0);
        if (total === 0) continue;
      }

      if (colFilters.summaryMode === "missing_summary") {
        const hasSummary = Boolean(
          e.summary?.trim() || e.contentPreview?.trim() || e.content?.trim(),
        );
        if (hasSummary) continue;
      } else if (colFilters.summaryMode === "has_summary") {
        const hasSummary = Boolean(
          e.summary?.trim() || e.contentPreview?.trim() || e.content?.trim(),
        );
        if (!hasSummary) continue;
      }

      if (colFilters.createdMode === "has_date") {
        if (e.createdAt === undefined) continue;
      } else if (colFilters.createdMode === "missing_date") {
        if (e.createdAt !== undefined) continue;
      }

      if (colFilters.modifiedMode === "has_date") {
        const modified = e.modifiedAt ?? e.updatedAt ?? e.lastUpdated;
        if (modified === undefined) continue;
      } else if (colFilters.modifiedMode === "missing_date") {
        const modified = e.modifiedAt ?? e.updatedAt ?? e.lastUpdated;
        if (modified !== undefined) continue;
      }
    }

    // Match remaining raw text queries (no longer checking e.tags)
    const matchesText =
      !remainingTextQuery ||
      (options.textMatchIds
        ? options.textMatchIds.has(e.id)
        : options.textSearchUnavailable || options.textSearchPending
          ? matchesEntityQuery(e, remainingTextQuery) ||
            e.labels?.some((l: string) =>
              l.toLowerCase().includes(remainingTextQuery),
            )
          : matchesEntityQuery(e, remainingTextQuery) ||
            (e.contentPreview ?? e.content)
              .toLowerCase()
              .includes(remainingTextQuery) ||
            e.labels?.some((l: string) =>
              l.toLowerCase().includes(remainingTextQuery),
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
