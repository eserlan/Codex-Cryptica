# Data Model: Missing-Data Visibility & Column-Level Filters

**Feature**: `1515-table-missing-filters`  
**Date**: 2026-08-14

## Types & Interfaces

```typescript
import type { Entity } from "schema";
import type { ConnectionSummary } from "./entityTableSort";

/**
 * Filter mode for entity label column.
 */
export type LabelFilterMode = "all" | "has_any" | "missing" | "has_none";

/**
 * Filter mode for entity connections column.
 */
export type ConnectionsFilterMode = "all" | "zero" | "has_connections";

/**
 * Filter mode for entity summary column.
 */
export type SummaryFilterMode = "all" | "has_summary" | "missing_summary";

/**
 * Filter mode for entity date column (created/modified).
 */
export type DateFilterMode = "all" | "has_date" | "missing_date";

/**
 * Column-specific filter criteria for the Entity Table.
 */
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

/**
 * Extended FilterOptions used by filterEntities.
 */
export interface TableFilterOptions {
  searchQuery: string;
  typeFilters: Set<string>;
  labelFilters: Set<string>;
  allowedTypes: string[] | null;
  showDraftsOnly: boolean;
  pinnedIds?: Set<string>;
  textMatchIds?: Set<string> | null;
  showIncompleteOnly?: boolean;
  columnFilters?: TableColumnFilters;
  connectionCounts?: Record<string, ConnectionSummary>;
}

/**
 * Breakdown of which fields are missing on an entity.
 */
export interface EntityMissingFields {
  summary: boolean;
  labels: boolean;
  connections: boolean;
  isIncomplete: boolean;
}
```

## Validation & Business Rules

1. **Incomplete Entity Evaluation**:

   ```typescript
   export function evaluateEntityMissingFields(
     entity: Entity & { contentPreview?: string },
     connections?: ConnectionSummary,
   ): EntityMissingFields {
     const hasSummary = Boolean(
       entity.summary?.trim() || entity.contentPreview?.trim(),
     );
     const hasLabels = Array.isArray(entity.labels) && entity.labels.length > 0;
     const totalConnections =
       (connections?.incoming ?? 0) + (connections?.outgoing ?? 0);
     const hasConnections = totalConnections > 0;

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
   ```

2. **Composition Rule**:
   An entity matches the active filter set if and only if:
   `matchesSearch(e) AND matchesTypes(e) AND (!showIncompleteOnly || isIncomplete(e)) AND matchesColumnFilters(e)`
