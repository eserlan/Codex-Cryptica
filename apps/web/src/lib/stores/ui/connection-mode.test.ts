import { describe, it, expect, vi } from "vitest";

// Stub $state before importing the store
(global as any).$state = (v: any) => v;

import { ConnectionModeStore } from "./connection-mode.svelte";
import { UIPersistence } from "./persistence";

describe("ConnectionModeStore", () => {
  it("initializes with default values", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new ConnectionModeStore(persistence);

    expect(store.isConnecting).toBe(false);
    expect(store.lastConnectionLabel).toBe("");
    expect(store.recentConnectionLabels).toEqual([]);
  });

  it("toggles connect mode", () => {
    const store = new ConnectionModeStore();
    store.toggleConnectMode();
    expect(store.isConnecting).toBe(true);

    store.connectingNodeId = "123";
    store.toggleConnectMode();
    expect(store.isConnecting).toBe(false);
    expect(store.connectingNodeId).toBeNull();
  });

  it("updates last connection label and recent list", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new ConnectionModeStore(persistence);

    store.setLastConnectionLabel("friend");
    expect(store.lastConnectionLabel).toBe("friend");
    expect(store.recentConnectionLabels).toEqual(["friend"]);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_last_connection_label",
      "friend",
    );

    store.setLastConnectionLabel("enemy");
    expect(store.recentConnectionLabels).toEqual(["enemy", "friend"]);

    store.setLastConnectionLabel("friend");
    expect(store.recentConnectionLabels).toEqual(["friend", "enemy"]); // Re-ordered
  });

  it("handles abort signal", () => {
    const store = new ConnectionModeStore();
    const signal1 = store.abortSignal;
    expect(signal1).toBeInstanceOf(AbortSignal);
    expect(signal1.aborted).toBe(false);

    store.abortActiveOperations();
    expect(signal1.aborted).toBe(true);

    const signal2 = store.abortSignal;
    expect(signal2).not.toBe(signal1);
    expect(signal2.aborted).toBe(false);
  });
});
