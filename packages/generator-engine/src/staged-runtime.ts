/**
 * Small helpers shared by the staged generators (one-shot, dungeon, point
 * crawl). Each generator keeps its own control flow; these cover the parts
 * they all repeat: cancellation, asking the model with a bounded retry,
 * checking a draft and retrying with the problems named, and running
 * independent calls with a concurrency limit (#4134).
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
      // Surface the signal's reason, not whatever the cancelled call threw.
      throwIfAborted(signal);
      if (isAbort(err)) throw err;
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

/** What a check found in a draft. */
export interface DraftCheck {
  /** Break the shape; the draft cannot be used. */
  hard: string[];
  /** Doubts worth another attempt; the draft is usable as it stands. */
  soft: string[];
}

/** What the next attempt is told about the last one. */
export interface DraftFeedback<T> {
  attempt: number;
  /** Empty on the first attempt. */
  problems: string[];
  /** The last readable draft, if any. */
  previous: T | null;
}

export interface CheckedDraft<T> {
  data: T;
  /** Soft problems the kept draft still has. */
  soft: string[];
  /** More than one call was needed. */
  retried: boolean;
}

export interface AskCheckedOptions extends AskOptions {
  /** The problem reported when a reply cannot be read or the call fails. */
  unreadable?: string;
}

/**
 * Ask for a draft, check it, and retry with the problems named until a draft
 * passes cleanly or the attempts run out (2 by default). The latest draft
 * with no hard problems is kept, so a failing retry falls back to it instead
 * of discarding the step. Resolves `null` when no draft was usable;
 * cancellation always propagates.
 */
export async function askChecked<T>(
  send: (feedback: DraftFeedback<T>) => Promise<string>,
  read: (reply: string) => T | null,
  check: (data: T) => DraftCheck,
  {
    signal,
    attempts = 2,
    unreadable = "the response was not a valid JSON object",
  }: AskCheckedOptions = {},
): Promise<CheckedDraft<T> | null> {
  let problems: string[] = [];
  let previous: T | null = null;
  let best: { data: T; soft: string[] } | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const data = await askModel(
      () => send({ attempt, problems, previous }),
      read,
      { signal },
    );
    const found =
      data === null ? { hard: [unreadable], soft: [] } : check(data);
    if (data !== null && found.hard.length === 0) {
      best = { data, soft: found.soft };
      if (found.soft.length === 0) return { ...best, retried: attempt > 0 };
    }
    problems = [...found.hard, ...found.soft];
    previous = data ?? previous;
  }
  return best ? { ...best, retried: attempts > 1 } : null;
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
