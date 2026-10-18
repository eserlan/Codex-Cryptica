/** Once holding has timed out, the first ready visuals are painted quickly. */
export const FIRST_FLUSH_DELAY_MS = 120;
/**
 * Later flushes are spaced this far apart. Every flush makes Cytoscape redraw
 * the whole graph, which on a vault of ~1,600 nodes takes over 100 ms, so
 * flushing every 120 ms kept the main thread redrawing back to back (87 redraws,
 * 10 s) where 500 ms spacing needed 6 redraws (1 s) for the same images.
 */
export const FLUSH_INTERVAL_MS = 500;
export const DEFAULT_HOLD_MAX_MS = 20_000;

export interface FlushSchedulerOptions {
  /** Paints immediately once this many visuals are waiting; disables holding. */
  batchSize?: number;
  /** How long ready visuals are held for one combined paint. */
  holdMaxMs?: number;
  now?: () => number;
}

/**
 * Decides when resolved visuals are painted. Showing images as they trickle in
 * costs a full graph redraw per batch, and those redraws keep the main thread
 * too busy to resolve the rest, so visuals are held for one combined paint at
 * the end of the pass. After `holdMaxMs` whatever is ready is painted in spaced
 * batches, so a few slow hosts cannot keep the graph bare.
 */
export class FlushScheduler {
  private flushTimer?: ReturnType<typeof setTimeout>;
  private holdTimer?: ReturnType<typeof setTimeout>;
  private holding: boolean;
  private lastFlushAt?: number;
  private readonly now: () => number;

  constructor(
    private readonly flush: () => void,
    private readonly options: FlushSchedulerOptions = {},
  ) {
    this.holding = !options.batchSize;
    this.now = options.now ?? (() => performance.now());
  }

  /** Called after each visual becomes ready, with how many are waiting. */
  schedule(waiting: number) {
    if (this.holding) {
      this.holdTimer ??= setTimeout(() => {
        this.holding = false;
        this.schedule(waiting);
      }, this.options.holdMaxMs ?? DEFAULT_HOLD_MAX_MS);
      return;
    }
    const { batchSize } = this.options;
    if (batchSize && waiting >= batchSize) {
      this.flushNow();
      return;
    }
    this.flushTimer ??= setTimeout(() => this.flushNow(), this.nextDelay());
  }

  /** Paints whatever is waiting now, for example when the pass ends. */
  flushNow() {
    this.clearFlushTimer();
    this.lastFlushAt = this.now();
    this.flush();
  }

  cancel() {
    this.clearFlushTimer();
    if (this.holdTimer !== undefined) clearTimeout(this.holdTimer);
    this.holdTimer = undefined;
  }

  private nextDelay(): number {
    if (this.lastFlushAt === undefined) return FIRST_FLUSH_DELAY_MS;
    const sinceLast = this.now() - this.lastFlushAt;
    return Math.max(FIRST_FLUSH_DELAY_MS, FLUSH_INTERVAL_MS - sinceLast);
  }

  private clearFlushTimer() {
    if (this.flushTimer !== undefined) clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
  }
}
