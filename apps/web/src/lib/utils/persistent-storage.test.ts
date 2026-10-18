import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestPersistentStorage } from "./persistent-storage";

vi.mock("$lib/stores/debug.svelte", () => ({
  debugStore: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const withStorage = (storage: unknown) => {
  Object.defineProperty(globalThis, "navigator", {
    value: { storage },
    configurable: true,
    writable: true,
  });
};

describe("requestPersistentStorage", () => {
  const original = globalThis.navigator;

  beforeEach(() => vi.clearAllMocks());

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      value: original,
      configurable: true,
      writable: true,
    });
  });

  it("requests persistence when it has not been granted yet", async () => {
    const persist = vi.fn().mockResolvedValue(true);
    withStorage({ persist, persisted: vi.fn().mockResolvedValue(false) });

    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("does not ask again when storage is already persistent", async () => {
    const persist = vi.fn();
    withStorage({ persist, persisted: vi.fn().mockResolvedValue(true) });

    await expect(requestPersistentStorage()).resolves.toBe(true);
    // Re-asking is wasteful and re-prompts in some browsers.
    expect(persist).not.toHaveBeenCalled();
  });

  it("reports a refusal without throwing", async () => {
    withStorage({
      persist: vi.fn().mockResolvedValue(false),
      persisted: vi.fn().mockResolvedValue(false),
    });

    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it("survives a browser with no Storage API", async () => {
    withStorage(undefined);

    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it("never lets a throwing Storage API break startup", async () => {
    withStorage({
      persist: vi.fn().mockRejectedValue(new Error("denied")),
      persisted: vi.fn().mockResolvedValue(false),
    });

    await expect(requestPersistentStorage()).resolves.toBe(false);
  });
});
