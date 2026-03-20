import { describe, it, expect, beforeEach, vi } from "vitest";
import { DiceHistoryStore } from "./dice-history.svelte";
import { getDB } from "../utils/idb";
import type { RollResult } from "dice-engine";

// Helper to create a dummy RollResult
const createRollResult = (
  total: number,
  timestamp: number = Date.now(),
): RollResult =>
  ({
    total,
    timestamp,
    results: [{ type: "die", sides: 20, value: total, modifier: 0, count: 1 }],
  }) as any;

describe("DiceHistoryStore", () => {
  let store: DiceHistoryStore;

  beforeEach(async () => {
    // Clear the database before each test
    const db = await getDB();
    await db.clear("dice_history");

    // Create a new store instance for each test
    // We bypass the auto-init in constructor by being in a controlled environment
    store = new DiceHistoryStore();
  });

  it("should initialize with empty history", () => {
    expect(store.history).toEqual([]);
    expect(store.chatHistory).toEqual([]);
    expect(store.modalHistory).toEqual([]);
  });

  it("should add a result and persist it", async () => {
    const result = createRollResult(15);
    await store.addResult(result, "chat");

    expect(store.history).toHaveLength(1);
    expect(store.history[0].total).toBe(15);
    expect(store.history[0].context).toBe("chat");
    expect(store.chatHistory).toHaveLength(1);
    expect(store.modalHistory).toHaveLength(0);

    // Verify persistence
    const db = await getDB();
    const all = await db.getAll("dice_history");
    expect(all).toHaveLength(1);
    expect(all[0].total).toBe(15);
  });

  it("should separate chat and modal history", async () => {
    await store.addResult(createRollResult(10), "chat");
    await store.addResult(createRollResult(20), "modal");

    expect(store.history).toHaveLength(2);
    expect(store.chatHistory).toHaveLength(1);
    expect(store.chatHistory[0].total).toBe(10);
    expect(store.modalHistory).toHaveLength(1);
    expect(store.modalHistory[0].total).toBe(20);
  });

  it("should limit history to 100 items", async () => {
    // Add 105 items
    for (let i = 1; i <= 105; i++) {
      await store.addResult(createRollResult(i), "chat");
    }

    expect(store.history).toHaveLength(100);
    // Should contain items 6 to 105
    expect(store.history[0].total).toBe(6);
    expect(store.history[99].total).toBe(105);

    // Verify persistence also limited
    const db = await getDB();
    const all = await db.getAll("dice_history");
    expect(all).toHaveLength(100);
  });

  it("should clear all history", async () => {
    await store.addResult(createRollResult(10), "chat");
    await store.addResult(createRollResult(20), "modal");

    await store.clearHistory();

    expect(store.history).toHaveLength(0);

    const db = await getDB();
    const all = await db.getAll("dice_history");
    expect(all).toHaveLength(0);
  });

  it("should clear history for a specific context", async () => {
    await store.addResult(createRollResult(10), "chat");
    await store.addResult(createRollResult(20), "modal");

    await store.clearHistory("chat");

    expect(store.history).toHaveLength(1);
    expect(store.history[0].context).toBe("modal");
    expect(store.chatHistory).toHaveLength(0);
    expect(store.modalHistory).toHaveLength(1);

    const db = await getDB();
    const all = await db.getAll("dice_history");
    expect(all).toHaveLength(1);
    expect(all[0].context).toBe("modal");
  });

  it("should load history from DB on init", async () => {
    const db = await getDB();
    const ts = Date.now();
    await db.put("dice_history", {
      ...createRollResult(10, ts),
      id: "1",
      context: "chat",
    });
    await db.put("dice_history", {
      ...createRollResult(20, ts + 1000),
      id: "2",
      context: "modal",
    });

    const newStore = new DiceHistoryStore();
    await newStore.init(true);

    expect(newStore.history).toHaveLength(2);
    expect(newStore.history[0].total).toBe(10);
    expect(newStore.history[1].total).toBe(20);
  });

  it("should handle initialization error gracefully", async () => {
    const db = await getDB();
    vi.spyOn(db, "getAll").mockRejectedValueOnce(new Error("DB Error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const newStore = new DiceHistoryStore();
    await newStore.init(true);

    expect(newStore.history).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[DiceHistory] Failed to load history:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("should use fallback for ID generation if crypto.randomUUID is not available", async () => {
    const originalUUID = crypto.randomUUID;
    delete (crypto as any).randomUUID;

    const result = createRollResult(15);
    await store.addResult(result, "chat");

    expect(store.history).toHaveLength(1);
    expect(store.history[0].id).toBeDefined();
    expect(typeof store.history[0].id).toBe("string");

    // Restore
    crypto.randomUUID = originalUUID;
  });

  it("should not re-initialize if already started and force is false", async () => {
    const db = await getDB();
    const spy = vi.spyOn(db, "getAll");

    // First call (started in constructor, but let's call it manually too)
    await store.init();
    const callCount = spy.mock.calls.length;

    // Second call without force
    await store.init(false);
    expect(spy.mock.calls.length).toBe(callCount);
  });

  it("should not overwrite history from DB if history is already non-empty", async () => {
    // Fill history manually
    store.history = [{ ...createRollResult(50), id: "local", context: "chat" }];

    const db = await getDB();
    await db.put("dice_history", {
      ...createRollResult(10),
      id: "db",
      context: "chat",
    });

    await store.init(true);

    expect(store.history).toHaveLength(1);
    expect(store.history[0].id).toBe("local");
  });
});
