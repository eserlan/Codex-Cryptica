import { describe, it, expect, beforeEach, vi } from "vitest";
import { vault } from "../lib/stores/vault.svelte";

vi.mock("../lib/utils/idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }),
}));

describe("Sync Reminder Logic", () => {
  beforeEach(() => {
    vault.entities = {};
    vault.lastRemindedDirtyCount = 0;
    vault.hasSyncFolder = true; // Assume configured for most tests
  });

  it("should calculate dirtyEntitiesCount correctly", () => {
    vault.entities = {
      "1": { id: "1", title: "T1", synced: true } as any,
      "2": { id: "2", title: "T2", synced: false } as any,
      "3": { id: "3", title: "T3", synced: false } as any,
    };
    expect(vault.dirtyEntitiesCount).toBe(2);
  });

  it("should show reminder when threshold (5) is reached", () => {
    const dirtyEntities: any = {};
    for (let i = 1; i <= 5; i++) {
      dirtyEntities[i.toString()] = { id: i.toString(), synced: false };
    }
    vault.entities = dirtyEntities;

    expect(vault.dirtyEntitiesCount).toBe(5);
    expect(vault.shouldShowReminder).toBe(true);
  });

  it("should NOT show reminder when below threshold", () => {
    const dirtyEntities: any = {};
    for (let i = 1; i <= 4; i++) {
      dirtyEntities[i.toString()] = { id: i.toString(), synced: false };
    }
    vault.entities = dirtyEntities;

    expect(vault.dirtyEntitiesCount).toBe(4);
    expect(vault.shouldShowReminder).toBe(false);
  });

  it("should suppress reminder after dismissal until next threshold (+5)", () => {
    // 1. Reach first threshold
    const dirtyEntities: any = {};
    for (let i = 1; i <= 5; i++) {
      dirtyEntities[i.toString()] = { id: i.toString(), synced: false };
    }
    vault.entities = dirtyEntities;
    expect(vault.shouldShowReminder).toBe(true);

    // 2. Dismiss
    vault.dismissSyncReminder();
    expect(vault.lastRemindedDirtyCount).toBe(5);
    expect(vault.shouldShowReminder).toBe(false);

    // 3. Add more changes but stay below next threshold (+5)
    for (let i = 6; i <= 9; i++) {
      dirtyEntities[i.toString()] = { id: i.toString(), synced: false };
    }
    vault.entities = { ...dirtyEntities };
    expect(vault.dirtyEntitiesCount).toBe(9);
    expect(vault.shouldShowReminder).toBe(false);

    // 4. Reach next threshold (10)
    dirtyEntities["10"] = { id: "10", synced: false };
    vault.entities = { ...dirtyEntities };
    expect(vault.dirtyEntitiesCount).toBe(10);
    expect(vault.shouldShowReminder).toBe(true);
  });

  it("should reset state after sync", () => {
    // 1. Setup dirty state
    for (let i = 1; i <= 5; i++) {
      vault.entities[i] = { id: i.toString(), synced: false } as any;
    }
    vault.lastRemindedDirtyCount = 5;

    // 2. Perform reset (triggered by sync success)
    vault.resetSyncState();

    expect(vault.dirtyEntitiesCount).toBe(0);
    expect(vault.lastRemindedDirtyCount).toBe(0);
    expect(vault.shouldShowReminder).toBe(false);
    expect(vault.entities["1"].synced).toBe(true);
  });

  it("should NOT show reminder if sync folder is NOT configured", () => {
    vault.hasSyncFolder = false;
    for (let i = 1; i <= 5; i++) {
      vault.entities[i] = { id: i.toString(), synced: false } as any;
    }

    expect(vault.dirtyEntitiesCount).toBe(5);
    expect(vault.shouldShowReminder).toBe(false);
  });

  it("should suppress reminder when snoozed", () => {
    // 1. Trigger reminder
    for (let i = 1; i <= 5; i++) {
      vault.entities[i] = { id: i.toString(), synced: false } as any;
    }
    expect(vault.shouldShowReminder).toBe(true);

    // 2. Snooze
    vault.snoozeSyncReminder();
    expect(vault.snoozedUntil).toBeGreaterThan(Date.now());
    expect(vault.shouldShowReminder).toBe(false);

    // 3. Reset sync should clear snooze
    vault.resetSyncState();
    expect(vault.snoozedUntil).toBe(0);
  });
});
