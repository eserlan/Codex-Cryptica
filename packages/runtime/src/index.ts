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
 * Falls back to a non-cryptographic UUID v4 when `crypto.randomUUID` is
 * unavailable (older browsers, some SSR/worker contexts) so callers never
 * crash purely from missing an id and keep the `uuid()` output shape.
 */
export const systemIdGenerator: IdGenerator = {
  uuid: () => {
    if (
      typeof globalThis.crypto !== "undefined" &&
      typeof globalThis.crypto.randomUUID === "function"
    ) {
      return globalThis.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  },
};
