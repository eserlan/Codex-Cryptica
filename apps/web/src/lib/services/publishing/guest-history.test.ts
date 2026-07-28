import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getGuestHistory,
  addGuestHistory,
  removeGuestHistory,
  clearGuestHistory,
} from "./guest-history";
import type { StorageLike } from "$lib/utils/runtime-deps";

class MockStorage implements StorageLike {
  private data: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.data[key] || null;
  }
  setItem(key: string, value: string): void {
    this.data[key] = value;
  }
  removeItem(key: string): void {
    delete this.data[key];
  }
}

describe("GuestHistory Service", () => {
  let mockStorage: StorageLike;

  beforeEach(() => {
    mockStorage = new MockStorage();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return empty history when storage is empty", () => {
    expect(getGuestHistory(mockStorage)).toEqual([]);
  });

  it("should add a history entry correctly", () => {
    addGuestHistory("pub-1", "Test Vault 1", mockStorage);
    const history = getGuestHistory(mockStorage);
    expect(history).toHaveLength(1);
    expect(history[0].publishId).toBe("pub-1");
    expect(history[0].vaultTitle).toBe("Test Vault 1");
    expect(history[0].lastAccessed).toBeDefined();
  });

  it("should update lastAccessed when adding the same publishId again", () => {
    vi.setSystemTime(new Date("2026-06-22T22:00:00Z"));
    addGuestHistory("pub-1", "Original Title", mockStorage);
    const firstTime = getGuestHistory(mockStorage)[0].lastAccessed;

    vi.setSystemTime(new Date("2026-06-22T22:02:00Z"));
    addGuestHistory("pub-1", "Updated Title", mockStorage);
    const history = getGuestHistory(mockStorage);
    expect(history).toHaveLength(1);
    expect(history[0].vaultTitle).toBe("Updated Title");
    expect(history[0].lastAccessed).not.toBe(firstTime);
    expect(history[0].lastAccessed).toBe(
      new Date("2026-06-22T22:02:00Z").toISOString(),
    );
  });

  it("should sort entries by lastAccessed descending", () => {
    vi.setSystemTime(new Date("2026-06-22T22:00:00Z"));
    addGuestHistory("pub-1", "Vault 1", mockStorage);

    vi.setSystemTime(new Date("2026-06-22T22:01:00Z"));
    addGuestHistory("pub-2", "Vault 2", mockStorage);

    vi.setSystemTime(new Date("2026-06-22T22:02:00Z"));
    addGuestHistory("pub-3", "Vault 3", mockStorage);

    const history = getGuestHistory(mockStorage);
    expect(history).toHaveLength(3);
    expect(history[0].publishId).toBe("pub-3");
    expect(history[1].publishId).toBe("pub-2");
    expect(history[2].publishId).toBe("pub-1");
  });

  it("should cap history at 10 items", () => {
    const baseTime = new Date("2026-06-22T22:00:00Z").getTime();
    for (let i = 1; i <= 12; i++) {
      vi.setSystemTime(new Date(baseTime + i * 1000));
      addGuestHistory(`pub-${i}`, `Vault ${i}`, mockStorage);
    }
    const history = getGuestHistory(mockStorage);
    expect(history).toHaveLength(10);
    // The oldest entries (pub-1, pub-2) should be evicted because they have the oldest timestamps
    const ids = history.map((h) => h.publishId);
    expect(ids).not.toContain("pub-1");
    expect(ids).not.toContain("pub-2");
    expect(ids).toContain("pub-12");
    // Newest first, so pub-12 first, pub-3 last
    expect(history[0].publishId).toBe("pub-12");
    expect(history[9].publishId).toBe("pub-3");
  });

  it("should remove a specific entry", () => {
    addGuestHistory("pub-1", "Vault 1", mockStorage);
    addGuestHistory("pub-2", "Vault 2", mockStorage);
    removeGuestHistory("pub-1", mockStorage);
    const history = getGuestHistory(mockStorage);
    expect(history).toHaveLength(1);
    expect(history[0].publishId).toBe("pub-2");
  });

  it("should clear all history", () => {
    addGuestHistory("pub-1", "Vault 1", mockStorage);
    clearGuestHistory(mockStorage);
    expect(getGuestHistory(mockStorage)).toEqual([]);
  });

  it("should handle corrupted json in storage gracefully", () => {
    mockStorage.setItem("guest_history", "corrupted-non-json");
    expect(getGuestHistory(mockStorage)).toEqual([]);
  });
});
