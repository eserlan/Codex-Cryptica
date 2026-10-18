/**
 * Small helpers shared by the staged generators (one-shot, dungeon, point
 * crawl). Each generator keeps its own control flow; these cover the parts
 * they all repeat: cancellation, asking the model with a bounded retry, and
 * running independent calls with a concurrency limit (#4134).
 */

import { parseFencedJson } from "./llm-response-utils";

export type JsonObject = Record<string, unknown>;

/** Throw the signal's reason (or an `AbortError`) once it has been aborted. */
export function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  throw (
    signal.reason ?? new DOMException("The operation was aborted", "AbortError")
  );
}

/** Whether `err` means the run was cancelled rather than that a call failed. */
export function isAbort(err: unknown, signal?: AbortSignal): boolean {
  return (
    !!signal?.aborted ||
    (err instanceof DOMException && err.name === "AbortError")
  );
}

/** The reply parsed as a JSON object, or `null` when it is not one. */
export function readJsonObject(reply: string): JsonObject | null {
  try {
    const parsed = parseFencedJson<unknown>(reply);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonObject)
      : null;
  } catch {
    return null;
  }
}

export interface AskOptions {
  signal?: AbortSignal;
  /** Total calls to make before giving up. Defaults to 1. */
  attempts?: number;
}

/**
 * Call the model until `read` accepts a reply, up to `attempts` times.
 * Resolves `null` when every attempt failed or was unreadable. Cancellation
 * always propagates and is never retried.
 */
export async function askModel<T>(
  send: () => Promise<string>,
  read: (reply: string) => T | null,
  { signal, attempts = 1 }: AskOptions = {},
): Promise<T | null> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    throwIfAborted(signal);
    try {
      const reply = await send();
      throwIfAborted(signal);
      const result = read(reply);
      if (result !== null) return result;
    } catch (err) {
      if (isAbort(err, signal)) throw err;
    }
  }
  return null;
}

/** {@link askModel} for a reply that should be a JSON object. */
export function askJson(
  send: () => Promise<string>,
  options?: AskOptions,
): Promise<JsonObject | null> {
  return askModel(send, readJsonObject, options);
}

/**
 * Run independent tasks with at most `limit` in flight, keeping results in
 * task order. Stops starting new tasks once the signal is aborted.
 */
export async function pool<T>(
  tasks: ReadonlyArray<() => Promise<T>>,
  limit: number,
  signal?: AbortSignal,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      throwIfAborted(signal);
      const i = next++;
      results[i] = await tasks[i]();
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(Math.max(limit, 1), tasks.length) }, worker),
  );
  return results;
}
