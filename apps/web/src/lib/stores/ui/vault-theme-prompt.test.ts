import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(global as any).$state = (value: unknown) => value;

import {
  VaultThemePromptStore,
  type VaultThemePromptPersistence,
} from "./vault-theme-prompt.svelte";

class MemoryPersistence implements VaultThemePromptPersistence {
  private store = new Map<string, string>();

  read<T>(key: string, parse: (raw: string) => T, fallback: T): T {
    const raw = this.store.get(key);
    if (raw === undefined) return fallback;
    return parse(raw);
  }

  write<T>(
    key: string,
    value: T,
    serialize: (value: T) => string = JSON.stringify,
  ) {
    this.store.set(key, serialize(value));
  }
}

describe("VaultThemePromptStore", () => {
  let persistence: MemoryPersistence;
  let store: VaultThemePromptStore;

  beforeEach(() => {
    vi.useFakeTimers();
    persistence = new MemoryPersistence();
    store = new VaultThemePromptStore(persistence, Date.now, 15_000);
  });

  afterEach(() => {
    store.stopTracking();
    vi.useRealTimers();
  });

  it("does not prompt before the vault has enough engagement", () => {
    store.startTracking("v1");
    expect(store.shouldAutoPrompt("v1", 0)).toBe(false);
    expect(store.shouldAutoPrompt("v1", 1)).toBe(false);
    expect(store.shouldAutoPrompt("v1", 4)).toBe(false);
    expect(store.shouldAutoPrompt("v1", 6)).toBe(false);
  });

  it("prompts immediately after seven entities even without fifteen minutes of activity", () => {
    store.startTracking("v1");
    expect(store.shouldAutoPrompt("v1", 7)).toBe(true);
  });

  it("does not prompt with fifteen minutes of activity if fewer than five entities exist", () => {
    store.startTracking("v1");

    vi.advanceTimersByTime(15 * 60 * 1000);

    expect(store.shouldAutoPrompt("v1", 4)).toBe(false);
  });

  it("prompts after fifteen minutes of tracked activity once the vault has at least five entities", () => {
    store.startTracking("v1");

    vi.advanceTimersByTime(15 * 60 * 1000);

    expect(store.shouldAutoPrompt("v1", 5)).toBe(true);
  });

  it("persists dismissal per vault and blocks future auto prompts", () => {
    store.startTracking("v1");
    store.markDismissed("v1");

    const reloaded = new VaultThemePromptStore(persistence, Date.now, 15_000);
    expect(reloaded.getRecord("v1").status).toBe("dismissed");
    expect(reloaded.shouldAutoPrompt("v1", 7)).toBe(false);
  });

  it("persists applied status per vault and blocks future auto prompts", () => {
    store.startTracking("v1");
    store.markApplied("v1");

    const reloaded = new VaultThemePromptStore(persistence, Date.now, 15_000);
    expect(reloaded.getRecord("v1").status).toBe("applied");
    expect(reloaded.shouldAutoPrompt("v1", 7)).toBe(false);
  });

  it("commits elapsed time when tracking is paused", () => {
    store.startTracking("v1");
    vi.advanceTimersByTime(2 * 60 * 1000);

    store.pauseTracking();

    expect(store.getRecord("v1").activeMs).toBe(2 * 60 * 1000);
  });
});
