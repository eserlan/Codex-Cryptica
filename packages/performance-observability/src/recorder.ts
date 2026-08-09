import {
  CACHE_STATES,
  PERFORMANCE_ERROR_KINDS,
  PERFORMANCE_OPERATIONS,
  PERFORMANCE_OUTCOMES,
  PERFORMANCE_SCHEMA_VERSION,
  type PerformanceClock,
  type PerformanceDimensions,
  type PerformanceErrorKind,
  type PerformanceOperation,
  type PerformanceOperationHandle,
  type PerformanceOutcome,
  type PerformanceRecorderOptions,
  type PerformanceSampleV1,
  type PerformanceSink,
} from "./types";

const operationSet = new Set<string>(PERFORMANCE_OPERATIONS);
const outcomeSet = new Set<string>(PERFORMANCE_OUTCOMES);
const cacheStateSet = new Set<string>(CACHE_STATES);
const errorKindSet = new Set<string>(PERFORMANCE_ERROR_KINDS);

const dimensionKeys = new Set<keyof PerformanceDimensions>([
  "cacheState",
  "entityCount",
  "changedEntityCount",
  "indexedInputCount",
  "renderedNodeCount",
  "renderedEdgeCount",
  "addedNodeCount",
  "removedNodeCount",
  "addedEdgeCount",
  "removedEdgeCount",
  "resultCount",
  "domNodeCount",
  "longestAnimationFrameMs",
  "inputDelayMs",
  "processingDurationMs",
  "presentationDelayMs",
]);

const noopSink: PerformanceSink = { record: () => undefined };
const systemClock: PerformanceClock = {
  now: () =>
    typeof performance !== "undefined" ? performance.now() : Date.now(),
};

export class PerformanceContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PerformanceContractError";
  }
}

function assertFiniteNonNegative(value: unknown, name: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new PerformanceContractError(
      `${name} must be a finite non-negative number`,
    );
  }
}

function assertKnownString(
  value: unknown,
  values: Set<string>,
  name: string,
): void {
  if (typeof value !== "string" || !values.has(value)) {
    throw new PerformanceContractError(`${name} is not allowlisted`);
  }
}

/** Validates the privacy-safe v1 sample contract before a sink can receive it. */
export function assertValidPerformanceSample(
  sample: PerformanceSampleV1,
): void {
  if (sample.schemaVersion !== PERFORMANCE_SCHEMA_VERSION) {
    throw new PerformanceContractError("schemaVersion must be 1");
  }
  assertKnownString(sample.operation, operationSet, "operation");
  assertKnownString(sample.outcome, outcomeSet, "outcome");
  assertFiniteNonNegative(sample.durationMs, "durationMs");

  for (const key of Object.keys(sample)) {
    if (
      key !== "schemaVersion" &&
      key !== "operation" &&
      key !== "outcome" &&
      key !== "durationMs" &&
      key !== "errorKind" &&
      !dimensionKeys.has(key as keyof PerformanceDimensions)
    ) {
      throw new PerformanceContractError(
        `${key} is not an allowlisted performance field`,
      );
    }
  }

  for (const [key, value] of Object.entries(sample)) {
    if (value === undefined) continue;
    if (key === "cacheState") {
      assertKnownString(value, cacheStateSet, key);
      continue;
    }
    if (key === "errorKind") {
      assertKnownString(value, errorKindSet, key);
      continue;
    }
    if (dimensionKeys.has(key as keyof PerformanceDimensions)) {
      assertFiniteNonNegative(value, key);
    }
  }

  if (sample.outcome === "cancelled" && sample.errorKind !== "aborted") {
    throw new PerformanceContractError(
      "cancelled samples must use errorKind=aborted",
    );
  }
  if (sample.outcome === "stale" && sample.errorKind !== "stale_run") {
    throw new PerformanceContractError(
      "stale samples must use errorKind=stale_run",
    );
  }
  if (sample.outcome === "completed" && sample.errorKind !== undefined) {
    throw new PerformanceContractError(
      "completed samples cannot have an errorKind",
    );
  }
}

class NoopPerformanceOperationHandle implements PerformanceOperationHandle {
  complete(): void {}
  cancel(): void {}
  stale(): void {}
  fail(): void {}
}

const noopHandle = new NoopPerformanceOperationHandle();

class ActivePerformanceOperationHandle implements PerformanceOperationHandle {
  private terminal = false;

  constructor(
    private readonly operation: PerformanceOperation,
    private readonly startedAt: number,
    private readonly clock: PerformanceClock,
    private readonly sink: PerformanceSink,
  ) {}

  complete(dimensions?: () => PerformanceDimensions): void {
    this.finish("completed", undefined, dimensions);
  }

  cancel(dimensions?: () => PerformanceDimensions): void {
    this.finish("cancelled", "aborted", dimensions);
  }

  stale(dimensions?: () => PerformanceDimensions): void {
    this.finish("stale", "stale_run", dimensions);
  }

  fail(
    errorKind: PerformanceErrorKind = "unexpected",
    dimensions?: () => PerformanceDimensions,
  ): void {
    this.finish("failed", errorKind, dimensions);
  }

  private finish(
    outcome: PerformanceOutcome,
    errorKind: PerformanceErrorKind | undefined,
    getDimensions: (() => PerformanceDimensions) | undefined,
  ): void {
    if (this.terminal) return;
    this.terminal = true;

    const endedAt = this.clock.now();
    const dimensions = getDimensions?.() ?? {};
    const sample: PerformanceSampleV1 = {
      schemaVersion: PERFORMANCE_SCHEMA_VERSION,
      operation: this.operation,
      outcome,
      durationMs: Math.max(0, endedAt - this.startedAt),
      ...(errorKind ? { errorKind } : {}),
      ...dimensions,
    };
    assertValidPerformanceSample(sample);
    this.sink.record(sample);
  }
}

/**
 * A local-only, disabled-by-default operation recorder. The no-op path returns
 * one shared handle and never evaluates dimension factories.
 */
export class PerformanceRecorder {
  private readonly clock: PerformanceClock;
  private readonly isEnabled: () => boolean;
  private readonly sink: PerformanceSink;

  constructor(options: PerformanceRecorderOptions = {}) {
    this.clock = options.clock ?? systemClock;
    this.isEnabled = options.isEnabled ?? (() => false);
    this.sink = options.sink ?? noopSink;
  }

  start(operation: PerformanceOperation): PerformanceOperationHandle {
    if (!this.isEnabled()) return noopHandle;
    return new ActivePerformanceOperationHandle(
      operation,
      this.clock.now(),
      this.clock,
      this.sink,
    );
  }
}

export const performanceRecorder = new PerformanceRecorder();
