/**
 * Shared runtime seams and pure helpers used across workspace packages.
 *
 * Ambient dependency defaults resolve globals lazily at call time — never
 * captured at construction (the lesson from #1363).
 */
export { extractJsonObject } from "./extract-json-object";

export interface Clock {
  now(): number;
}

export interface IdGenerator {
  uuid(): string;
}

/** Production clock backed by `Date`. */
export const systemClock: Clock = {
  now: () => Date.now(),
};

/**
 * Production id generator backed by `crypto.randomUUID`, resolved lazily.
 * Falls back to a non-cryptographic id when `crypto.randomUUID` is
 * unavailable (older browsers, some SSR/worker contexts) so callers never
 * crash purely from missing an id.
 */
export const systemIdGenerator: IdGenerator = {
  uuid: () => {
    if (
      typeof globalThis.crypto !== "undefined" &&
      typeof globalThis.crypto.randomUUID === "function"
    ) {
      return globalThis.crypto.randomUUID();
    }
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  },
};
