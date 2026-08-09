export const PERFORMANCE_SCHEMA_VERSION = 1 as const;
export const PERFORMANCE_BUDGET_SCHEMA_VERSION = 1 as const;

export const PERFORMANCE_OPERATIONS = [
  "vault_open_warm",
  "vault_open_cold",
  "vault_sync_chunk",
  "search_index_batch",
  "search_index_persist",
  "graph_focus_compute",
  "graph_sync_reconcile",
  "graph_sync_remove",
  "graph_sync_add",
  "graph_sync_patch_filter",
  "graph_sync_layout",
  "graph_sync_render_ready",
  "graph_select",
  "graph_focus_depth_change",
  "explorer_open",
  "explorer_filter",
  "table_open",
  "table_sort",
  "table_filter",
  "entity_save",
] as const;

export type PerformanceOperation = (typeof PERFORMANCE_OPERATIONS)[number];

export const PERFORMANCE_OUTCOMES = [
  "completed",
  "cancelled",
  "stale",
  "failed",
] as const;

export type PerformanceOutcome = (typeof PERFORMANCE_OUTCOMES)[number];

export const CACHE_STATES = [
  "warm",
  "cold",
  "partial",
  "not_applicable",
] as const;

export type CacheState = (typeof CACHE_STATES)[number];

export const PERFORMANCE_ERROR_KINDS = [
  "aborted",
  "stale_run",
  "timeout",
  "unexpected",
] as const;

export type PerformanceErrorKind = (typeof PERFORMANCE_ERROR_KINDS)[number];

export interface PerformanceDimensions {
  cacheState?: CacheState;
  entityCount?: number;
  changedEntityCount?: number;
  indexedInputCount?: number;
  renderedNodeCount?: number;
  renderedEdgeCount?: number;
  addedNodeCount?: number;
  removedNodeCount?: number;
  addedEdgeCount?: number;
  removedEdgeCount?: number;
  resultCount?: number;
  domNodeCount?: number;
  longestAnimationFrameMs?: number;
  inputDelayMs?: number;
  processingDurationMs?: number;
  presentationDelayMs?: number;
}

export interface PerformanceSampleV1 extends PerformanceDimensions {
  schemaVersion: typeof PERFORMANCE_SCHEMA_VERSION;
  operation: PerformanceOperation;
  outcome: PerformanceOutcome;
  durationMs: number;
  errorKind?: PerformanceErrorKind;
}

export interface PerformanceClock {
  now(): number;
}

export interface PerformanceSink {
  record(sample: PerformanceSampleV1): void;
}

export type LazyPerformanceDimensions = () => PerformanceDimensions;

export interface PerformanceOperationHandle {
  complete(dimensions?: LazyPerformanceDimensions): void;
  cancel(dimensions?: LazyPerformanceDimensions): void;
  stale(dimensions?: LazyPerformanceDimensions): void;
  fail(
    errorKind?: PerformanceErrorKind,
    dimensions?: LazyPerformanceDimensions,
  ): void;
}

export interface PerformanceRecorderOptions {
  clock?: PerformanceClock;
  isEnabled?: () => boolean;
  sink?: PerformanceSink;
}

export interface PerformanceSummaryV1 {
  operation: PerformanceOperation;
  count: number;
  medianMs: number;
  p90Ms: number;
  maxMs: number;
}

export interface PerformanceResultV1 {
  schemaVersion: typeof PERFORMANCE_SCHEMA_VERSION;
  samples: PerformanceSampleV1[];
  summaries: PerformanceSummaryV1[];
  outcomes: Record<PerformanceOutcome, number>;
}

export const PERFORMANCE_BUDGET_STATISTICS = [
  "medianMs",
  "p90Ms",
  "maxMs",
] as const;

export type PerformanceBudgetStatistic =
  (typeof PERFORMANCE_BUDGET_STATISTICS)[number];

export type PerformanceBudgetMode = "report-only" | "blocking";

/** A reviewed gate for one operation summary in the v1 result contract. */
export interface PerformanceBudgetEntryV1 {
  scenario: string;
  operation: PerformanceOperation;
  statistic: PerformanceBudgetStatistic;
  unit: "ms";
  blockingLimitMs: number;
  targetMs: number;
  sampleCount: number;
  warmupPolicy: string;
  baselineValueMs: number;
  baselineCommit: string;
  browserVersion: string;
  runnerImage: string;
  capturedAt: string;
  rationale: string;
  relatedIssues: number[];
}

export interface PerformanceBudgetManifestV1 {
  schemaVersion: typeof PERFORMANCE_BUDGET_SCHEMA_VERSION;
  mode: PerformanceBudgetMode;
  fixtureVersion: string;
  fixtureChecksum: string;
  entries: PerformanceBudgetEntryV1[];
}

export interface PerformanceBudgetCheckV1 {
  entry: PerformanceBudgetEntryV1;
  observedMs: number | undefined;
  status: "pass" | "report" | "fail" | "missing";
}
