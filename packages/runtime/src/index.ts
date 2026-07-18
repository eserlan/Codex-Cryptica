/**
 * Shared seams for ambient runtime dependencies (time, id generation) so
 * services and stores can inject deterministic fakes in tests while
 * production keeps the real globals (Constitution VIII).
 *
 * Defaults resolve their global lazily at call time — never captured at
 * construction (the lesson from #1363).
 */
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

/** Production id generator backed by `crypto.randomUUID`, resolved lazily. */
export const systemIdGenerator: IdGenerator = {
  uuid: () => globalThis.crypto.randomUUID(),
};
