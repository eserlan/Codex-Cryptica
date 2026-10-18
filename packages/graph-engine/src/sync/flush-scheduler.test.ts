import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_HOLD_MAX_MS,
  FIRST_FLUSH_DELAY_MS,
  FLUSH_INTERVAL_MS,
  FlushScheduler,
} from "./flush-scheduler";

describe("FlushScheduler", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const clock = () => {
    let t = 0;
    return { now: () => t, advance: (ms: number) => (t += ms) };
  };

  it("holds ready visuals until the pass flushes them in one go", () => {
    const flush = vi.fn();
    const scheduler = new FlushScheduler(flush);
    scheduler.schedule(1);
    scheduler.schedule(2);
    vi.advanceTimersByTime(DEFAULT_HOLD_MAX_MS - 1);
    expect(flush).not.toHaveBeenCalled();

    scheduler.cancel();
    scheduler.flushNow();
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("paints what is ready once the hold times out, then spaces later paints", () => {
    const flush = vi.fn();
    const c = clock();
    const scheduler = new FlushScheduler(flush, { holdMaxMs: 50, now: c.now });
    scheduler.schedule(1);
    vi.advanceTimersByTime(50 + FIRST_FLUSH_DELAY_MS);
    expect(flush).toHaveBeenCalledTimes(1);

    c.advance(10);
    scheduler.schedule(1);
    vi.advanceTimersByTime(FIRST_FLUSH_DELAY_MS);
    expect(flush).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(FLUSH_INTERVAL_MS);
    expect(flush).toHaveBeenCalledTimes(2);
  });

  it("paints immediately when a batch size is reached, without holding", () => {
    const flush = vi.fn();
    const scheduler = new FlushScheduler(flush, { batchSize: 2 });
    scheduler.schedule(1);
    expect(flush).not.toHaveBeenCalled();
    scheduler.schedule(2);
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("paints nothing after being cancelled (negative)", () => {
    const flush = vi.fn();
    const scheduler = new FlushScheduler(flush, { holdMaxMs: 10 });
    scheduler.schedule(1);
    scheduler.cancel();
    vi.advanceTimersByTime(DEFAULT_HOLD_MAX_MS + FLUSH_INTERVAL_MS);
    expect(flush).not.toHaveBeenCalled();
  });
});
