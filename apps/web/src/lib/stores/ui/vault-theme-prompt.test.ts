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
  let now = 0;
  let persistence: MemoryPersistence;
  let store: VaultThemePromptStore;

  beforeEach(() => {
    vi.useFakeTimers();
    now = 0;
    persistence = new MemoryPersistence();
    store = new VaultThemePromptStore(persistence, () => now, 15_000);
  });

  afterEach(() => {
    store.stopTracking();
    vi.useRealTimers();
  });

  it("does not prompt before the vault has enough engagement", () => {
    store.startTracking("v1");
    expect(store.shouldAutoPrompt("v1", 0)).toBe(false);
    expect(store.shouldAutoPrompt("v1", 1)).toBe(false);
  });

  it("prompts immediately after three entities even without five minutes of activity", () => {
    store.startTracking("v1");
    expect(store.shouldAutoPrompt("v1", 3)).toBe(true);
  });

  it("prompts after five minutes of tracked activity once the vault has content", () => {
    store.startTracking("v1");

    now = 5 * 60 * 1000;
    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(store.shouldAutoPrompt("v1", 1)).toBe(true);
  });

  it("persists dismissal per vault and blocks future auto prompts", () => {
    store.startTracking("v1");
    store.markDismissed("v1");

    const reloaded = new VaultThemePromptStore(persistence, () => now, 15_000);
    expect(reloaded.getRecord("v1").status).toBe("dismissed");
    expect(reloaded.shouldAutoPrompt("v1", 3)).toBe(false);
  });

  it("persists applied status per vault and blocks future auto prompts", () => {
    store.startTracking("v1");
    store.markApplied("v1");

    const reloaded = new VaultThemePromptStore(persistence, () => now, 15_000);
    expect(reloaded.getRecord("v1").status).toBe("applied");
    expect(reloaded.shouldAutoPrompt("v1", 3)).toBe(false);
  });

  it("commits elapsed time when tracking is paused", () => {
    store.startTracking("v1");
    now = 2 * 60 * 1000;

    store.pauseTracking();

    expect(store.getRecord("v1").activeMs).toBe(2 * 60 * 1000);
  });
});
