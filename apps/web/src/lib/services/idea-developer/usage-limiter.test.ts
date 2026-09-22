import { describe, expect, it } from "vitest";
import { MAX_CONVERSATION_TURNS } from "generator-engine";
import type { StorageLike } from "$lib/utils/runtime-deps";
import {
  IdeaDeveloperUsageLimiter,
  USAGE_COOLDOWN_MS,
  USAGE_MAX_PER_PERIOD,
  USAGE_PERIOD_MS,
  USAGE_STORAGE_KEY,
} from "./usage-limiter";

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
  };
}

function setup(start = 1_000_000) {
  const storage = memoryStorage();
  let now = start;
  const limiter = new IdeaDeveloperUsageLimiter(storage, {
    now: () => now,
  });
  return {
    storage,
    limiter,
    advance: (ms: number) => {
      now += ms;
    },
    now: () => now,
  };
}

describe("IdeaDeveloperUsageLimiter", () => {
  it("allows a first turn", () => {
    const { limiter } = setup();
    expect(limiter.check()).toEqual({ allowed: true });
  });

  it("refuses inside the cooldown and returns when to retry", () => {
    const { limiter, advance, now } = setup();
    limiter.record();
    advance(USAGE_COOLDOWN_MS - 1_000);
    const result = limiter.check();
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("cooldown");
      expect(result.retryAt).toBe(now() + 1_000);
    }
  });

  it("allows again once the cooldown has passed", () => {
    const { limiter, advance } = setup();
    limiter.record();
    advance(USAGE_COOLDOWN_MS);
    expect(limiter.check().allowed).toBe(true);
  });

  it("refuses over the per-period cap and says when the oldest turn expires", () => {
    const { limiter, advance, now } = setup();
    const first = now();
    for (let i = 0; i < USAGE_MAX_PER_PERIOD; i++) {
      limiter.record();
      advance(USAGE_COOLDOWN_MS);
    }
    const result = limiter.check();
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("period");
      expect(result.retryAt).toBe(first + USAGE_PERIOD_MS);
    }
  });

  it("prunes timestamps older than the period", () => {
    const { limiter, advance, storage } = setup();
    limiter.record();
    advance(USAGE_PERIOD_MS + 1);
    expect(limiter.check().allowed).toBe(true);
    limiter.record();
    const stored = JSON.parse(storage.data.get(USAGE_STORAGE_KEY)!);
    expect(stored.timestamps).toHaveLength(1);
  });

  it("counts every turn, including turns of one conversation", () => {
    const { limiter, advance } = setup();
    for (let i = 0; i < 3; i++) {
      expect(limiter.check().allowed).toBe(true);
      limiter.record();
      advance(USAGE_COOLDOWN_MS);
    }
    const stored = JSON.parse(
      (limiter as unknown as { storage: StorageLike }).storage.getItem(
        USAGE_STORAGE_KEY,
      )!,
    );
    expect(stored.timestamps).toHaveLength(3);
  });

  it("stores only version and timestamps", () => {
    const { limiter, storage } = setup();
    limiter.record();
    const stored = JSON.parse(storage.data.get(USAGE_STORAGE_KEY)!);
    expect(Object.keys(stored).sort()).toEqual(["timestamps", "version"]);
    expect(stored.timestamps.every((t: unknown) => typeof t === "number")).toBe(
      true,
    );
  });

  it("fails open when storage throws", () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
      length: 0,
      key: () => null,
    };
    const limiter = new IdeaDeveloperUsageLimiter(throwing, { now: () => 1 });
    expect(limiter.check()).toEqual({ allowed: true });
    expect(() => limiter.record()).not.toThrow();
  });

  it("ignores corrupt stored data", () => {
    const { limiter, storage } = setup();
    storage.data.set(USAGE_STORAGE_KEY, "{not json");
    expect(limiter.check().allowed).toBe(true);
  });

  it("lets at least two whole conversations through in an hour, so the limit is not met mid-conversation", () => {
    expect(USAGE_MAX_PER_PERIOD).toBeGreaterThanOrEqual(
      MAX_CONVERSATION_TURNS * 2,
    );
  });
});
