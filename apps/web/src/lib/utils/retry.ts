import { systemClock } from "$lib/utils/runtime-deps";
/**
 * Retry `fn` until it succeeds or `attempts` are exhausted.
 *
 * By default a thrown error triggers a retry (the last error is rethrown once
 * attempts run out). Pass `shouldRetry` to also retry on a *returned* value
 * (e.g. an HTTP 429 response); when the final attempt still matches
 * `shouldRetry`, that last result is returned as-is so the caller can handle
 * it. Set `retryOnError: false` to let thrown errors propagate immediately.
 */
export async function retryWithBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  options: {
    attempts: number;
    /** Delay before the next attempt; receives the just-finished attempt (0-based) and its result, if any. */
    delayMs: (attempt: number, result?: T) => number;
    shouldRetry?: (result: T) => boolean;
    retryOnError?: boolean;
    onRetry?: (attempt: number, delay: number, result?: T) => void;
  },
): Promise<T> {
  const {
    attempts,
    delayMs,
    shouldRetry,
    retryOnError = true,
    onRetry,
  } = options;
  if (!Number.isInteger(attempts) || attempts <= 0) {
    throw new RangeError(
      `attempts must be a positive integer, got ${attempts}`,
    );
  }
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const result = await fn(attempt);
      if (shouldRetry?.(result) && attempt < attempts - 1) {
        const delay = delayMs(attempt, result);
        onRetry?.(attempt, delay, result);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return result;
    } catch (error) {
      if (!retryOnError) throw error;
      lastError = error;
      if (attempt < attempts - 1) {
        const delay = delayMs(attempt);
        onRetry?.(attempt, delay);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Poll `predicate` every `intervalMs` until it returns true or `timeoutMs`
 * elapses. Resolves to whether the predicate became true.
 */
export async function waitUntil(
  predicate: () => boolean,
  { intervalMs = 100, timeoutMs }: { intervalMs?: number; timeoutMs: number },
): Promise<boolean> {
  const deadline = systemClock.now() + timeoutMs;
  while (!predicate()) {
    const remaining = deadline - systemClock.now();
    if (remaining <= 0) return false;
    // Cap the sleep to the remaining budget so a large interval can't
    // overshoot the deadline and report a late success.
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(intervalMs, remaining)),
    );
  }
  return true;
}
