import { describe, expect, it, vi } from "vitest";
import { systemClock, systemIdGenerator, type Clock } from "../src/index";

describe("systemClock", () => {
  it("returns the current epoch milliseconds", () => {
    const before = Date.now();
    const value = systemClock.now();
    const after = Date.now();
    expect(value).toBeGreaterThanOrEqual(before);
    expect(value).toBeLessThanOrEqual(after);
  });

  it("resolves Date.now lazily at call time, not at module load", () => {
    const spy = vi.spyOn(Date, "now").mockReturnValue(42);
    try {
      expect(systemClock.now()).toBe(42);
    } finally {
      spy.mockRestore();
    }
  });

  it("is assignable to the Clock interface", () => {
    const fake: Clock = { now: () => 1000 };
    expect(fake.now()).toBe(1000);
  });
});

describe("systemIdGenerator", () => {
  it("produces a uuid via the global crypto", () => {
    const id = systemIdGenerator.uuid();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("falls back to a generated id when crypto.randomUUID is unavailable", () => {
    const original = globalThis.crypto.randomUUID;
    // @ts-expect-error - simulating an environment without randomUUID
    delete globalThis.crypto.randomUUID;
    try {
      const id = systemIdGenerator.uuid();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    } finally {
      globalThis.crypto.randomUUID = original;
    }
  });
});
