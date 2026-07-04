import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { retryWithBackoff, waitUntil } from "./retry";

describe("retryWithBackoff", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns the first successful result without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await retryWithBackoff(fn, {
      attempts: 3,
      delayMs: () => 100,
    });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries thrown errors and rethrows the last one when exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("disk busy"));
    const promise = retryWithBackoff(fn, { attempts: 3, delayMs: () => 50 });
    const assertion = expect(promise).rejects.toThrow("disk busy");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("recovers when a later attempt succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("recovered");
    const promise = retryWithBackoff(fn, { attempts: 3, delayMs: () => 50 });
    await vi.runAllTimersAsync();
    expect(await promise).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on shouldRetry results and returns the final result as-is", async () => {
    const fn = vi
      .fn<() => Promise<{ status: number }>>()
      .mockResolvedValue({ status: 429 });
    const promise = retryWithBackoff(fn, {
      attempts: 3,
      delayMs: () => 10,
      shouldRetry: (r) => r.status === 429,
    });
    await vi.runAllTimersAsync();
    expect(await promise).toEqual({ status: 429 });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("propagates errors immediately when retryOnError is false", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("network down"));
    await expect(
      retryWithBackoff(fn, {
        attempts: 5,
        delayMs: () => 10,
        retryOnError: false,
      }),
    ).rejects.toThrow("network down");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("waitUntil", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("resolves true immediately when the predicate is already true", async () => {
    expect(await waitUntil(() => true, { timeoutMs: 1000 })).toBe(true);
  });

  it("polls until the predicate flips true", async () => {
    let ready = false;
    setTimeout(() => (ready = true), 250);
    const promise = waitUntil(() => ready, {
      intervalMs: 100,
      timeoutMs: 1000,
    });
    await vi.runAllTimersAsync();
    expect(await promise).toBe(true);
  });

  it("resolves false when the timeout elapses first", async () => {
    const promise = waitUntil(() => false, {
      intervalMs: 100,
      timeoutMs: 500,
    });
    await vi.runAllTimersAsync();
    expect(await promise).toBe(false);
  });
});
