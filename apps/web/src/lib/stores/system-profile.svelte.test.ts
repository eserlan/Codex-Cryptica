import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SystemProfileStore,
  type ISystemProfileStorage,
} from "./system-profile.svelte";
import { GameSystemRegistry, SYSTEM_NEUTRAL_ID, TOV_SYSTEM_ID } from "schema";

describe("SystemProfileStore (#3943)", () => {
  let mockStorage: ISystemProfileStorage;
  let cacheStore: Map<string, string>;
  let diskStore: Map<string, string>;
  let store: SystemProfileStore;
  let registry: GameSystemRegistry;

  beforeEach(() => {
    cacheStore = new Map();
    diskStore = new Map();

    mockStorage = {
      loadFromCache: vi.fn(
        async (vaultId: string) => cacheStore.get(vaultId) ?? null,
      ),
      saveToCache: vi.fn(async (vaultId: string, systemId: string | null) => {
        if (systemId && systemId !== SYSTEM_NEUTRAL_ID) {
          cacheStore.set(vaultId, systemId);
        } else {
          cacheStore.delete(vaultId);
        }
      }),
      loadFromDisk: vi.fn(
        async (vaultId: string) => diskStore.get(vaultId) ?? null,
      ),
      saveToDisk: vi.fn(async (vaultId: string, systemId: string | null) => {
        if (systemId && systemId !== SYSTEM_NEUTRAL_ID) {
          diskStore.set(vaultId, systemId);
        } else {
          diskStore.delete(vaultId);
        }
        return true;
      }),
    };

    registry = new GameSystemRegistry();
    store = new SystemProfileStore(registry, mockStorage);
  });

  it("defaults to system-neutral when uninitialized or no vault active", () => {
    expect(store.isNeutral).toBe(true);
    expect(store.isTalesOfTheValiant).toBe(false);
    expect(store.hasLuck).toBe(false);
    expect(store.hasDoom).toBe(false);
    expect(store.activeProfile.id).toBe(SYSTEM_NEUTRAL_ID);
  });

  it("initializes as neutral for fresh or existing vaults with no configured system", async () => {
    await store.init("vault-123");

    expect(store.activeVaultId).toBe("vault-123");
    expect(store.isNeutral).toBe(true);
    expect(store.isTalesOfTheValiant).toBe(false);
    expect(store.hasLuck).toBe(false);
    expect(mockStorage.loadFromCache).toHaveBeenCalledWith("vault-123");
  });

  it("initializes from cache when active profile is Tales of the Valiant", async () => {
    cacheStore.set("vault-tov", TOV_SYSTEM_ID);

    await store.init("vault-tov");

    expect(store.vaultSystemId).toBe(TOV_SYSTEM_ID);
    expect(store.isTalesOfTheValiant).toBe(true);
    expect(store.isNeutral).toBe(false);
    expect(store.hasLuck).toBe(true);
    expect(store.hasDoom).toBe(true);
    expect(store.activeProfile.label).toBe("Tales of the Valiant");
  });

  it("prefers the vault's disk config over a stale cache entry", async () => {
    cacheStore.set("vault-stale", TOV_SYSTEM_ID);
    diskStore.set("vault-stale", "custom-sci-fi-rules");

    await store.init("vault-stale");

    expect(store.vaultSystemId).toBe("custom-sci-fi-rules");
    expect(cacheStore.get("vault-stale")).toBe("custom-sci-fi-rules");
  });

  it("keeps the cached profile when the disk has no readable value", async () => {
    cacheStore.set("vault-cached", TOV_SYSTEM_ID);

    await store.init("vault-cached");

    expect(mockStorage.loadFromDisk).toHaveBeenCalledWith("vault-cached");
    expect(store.vaultSystemId).toBe(TOV_SYSTEM_ID);
    expect(cacheStore.get("vault-cached")).toBe(TOV_SYSTEM_ID);
  });

  it("falls back to disk when cache is empty, populating cache", async () => {
    diskStore.set("vault-disk", TOV_SYSTEM_ID);

    await store.init("vault-disk");

    expect(store.vaultSystemId).toBe(TOV_SYSTEM_ID);
    expect(store.isTalesOfTheValiant).toBe(true);
    expect(mockStorage.loadFromDisk).toHaveBeenCalledWith("vault-disk");
    expect(mockStorage.saveToCache).toHaveBeenCalledWith(
      "vault-disk",
      TOV_SYSTEM_ID,
    );
  });

  it("does not repopulate cache from an obsolete disk load after a reset", async () => {
    let resolveDiskRead!: (value: string | null) => void;
    const delayedStorage: ISystemProfileStorage = {
      ...mockStorage,
      loadFromDisk: vi.fn(
        () =>
          new Promise<string | null>((resolve) => {
            resolveDiskRead = resolve;
          }),
      ),
    };
    const delayedStore = new SystemProfileStore(registry, delayedStorage);
    const pendingInit = delayedStore.init("vault-a");
    await Promise.resolve();
    await Promise.resolve();

    const reset = delayedStore.setVaultSystemId(null);
    resolveDiskRead(TOV_SYSTEM_ID);
    await Promise.all([pendingInit, reset]);

    expect(delayedStore.vaultSystemId).toBeNull();
    expect(cacheStore.has("vault-a")).toBe(false);
    expect(delayedStorage.saveToCache).toHaveBeenCalledTimes(1);
    expect(delayedStorage.saveToCache).toHaveBeenCalledWith("vault-a", null);
  });

  it("keeps the newest vault profile when initialization completes out of order", async () => {
    let resolveVaultA!: (value: string | null) => void;
    const delayedStorage: ISystemProfileStorage = {
      ...mockStorage,
      loadFromCache: vi.fn((vaultId: string) =>
        vaultId === "vault-a"
          ? new Promise<string | null>((resolve) => {
              resolveVaultA = resolve;
            })
          : Promise.resolve(TOV_SYSTEM_ID),
      ),
    };
    const delayedStore = new SystemProfileStore(registry, delayedStorage);

    const olderInit = delayedStore.init("vault-a");
    await delayedStore.init("vault-b");
    resolveVaultA("custom-vault-a");
    await olderInit;

    expect(delayedStore.activeVaultId).toBe("vault-b");
    expect(delayedStore.vaultSystemId).toBe(TOV_SYSTEM_ID);
    expect(delayedStore.isLoading).toBe(false);
  });

  it("does not restore a profile after the active vault is cleared during initialization", async () => {
    let resolvePending!: (value: string | null) => void;
    const delayedStorage: ISystemProfileStorage = {
      ...mockStorage,
      loadFromCache: vi.fn(
        () =>
          new Promise<string | null>((resolve) => {
            resolvePending = resolve;
          }),
      ),
    };
    const delayedStore = new SystemProfileStore(registry, delayedStorage);

    const pendingInit = delayedStore.init("vault-a");
    await delayedStore.init(null);
    resolvePending(TOV_SYSTEM_ID);
    await pendingInit;

    expect(delayedStore.activeVaultId).toBeNull();
    expect(delayedStore.vaultSystemId).toBeNull();
    expect(delayedStore.isLoading).toBe(false);
  });

  it("allows opting into Tales of the Valiant at vault level and persists to cache and disk", async () => {
    await store.init("campaign-a");
    expect(store.isNeutral).toBe(true);

    await store.setVaultSystemId(TOV_SYSTEM_ID);

    expect(store.vaultSystemId).toBe(TOV_SYSTEM_ID);
    expect(store.isTalesOfTheValiant).toBe(true);
    expect(store.hasLuck).toBe(true);
    expect(cacheStore.get("campaign-a")).toBe(TOV_SYSTEM_ID);
    expect(diskStore.get("campaign-a")).toBe(TOV_SYSTEM_ID);
  });

  it("restores the previous profile and skips the cache when the disk save fails", async () => {
    cacheStore.set("campaign-fail", TOV_SYSTEM_ID);
    diskStore.set("campaign-fail", TOV_SYSTEM_ID);
    await store.init("campaign-fail");
    vi.mocked(mockStorage.saveToDisk).mockResolvedValueOnce(false);

    const saved = await store.setVaultSystemId(null);

    expect(saved).toBe(false);
    expect(store.vaultSystemId).toBe(TOV_SYSTEM_ID);
    expect(cacheStore.get("campaign-fail")).toBe(TOV_SYSTEM_ID);
    expect(diskStore.get("campaign-fail")).toBe(TOV_SYSTEM_ID);
  });

  it("allows cleanly reverting to system-neutral at any time", async () => {
    cacheStore.set("campaign-b", TOV_SYSTEM_ID);
    diskStore.set("campaign-b", TOV_SYSTEM_ID);

    await store.init("campaign-b");
    expect(store.isTalesOfTheValiant).toBe(true);

    // Revert back to neutral
    await store.setVaultSystemId(null);

    expect(store.vaultSystemId).toBeNull();
    expect(store.isNeutral).toBe(true);
    expect(store.isTalesOfTheValiant).toBe(false);
    expect(store.hasLuck).toBe(false);
    expect(cacheStore.has("campaign-b")).toBe(false);
    expect(diskStore.has("campaign-b")).toBe(false);
  });

  it("loads unknown custom system IDs gracefully without crashing or dropping ID", async () => {
    cacheStore.set("vault-custom", "custom-sci-fi-rules");

    await store.init("vault-custom");

    expect(store.vaultSystemId).toBe("custom-sci-fi-rules");
    expect(store.activeProfile.id).toBe("custom-sci-fi-rules");
    expect(store.activeProfile.label).toBe("custom-sci-fi-rules");
    expect(store.isNeutral).toBe(false);
    expect(store.isTalesOfTheValiant).toBe(false);
  });

  describe("Entity Resolution Precedence in store context", () => {
    it("resolves entity override over vault system", async () => {
      await store.init("vault-neutral");
      expect(store.isNeutral).toBe(true);

      const entityProfile = store.resolveEntitySystem({
        systemId: TOV_SYSTEM_ID,
      });
      expect(entityProfile.id).toBe(TOV_SYSTEM_ID);
      expect(entityProfile.capabilities.hasLuck).toBe(true);
    });

    it("resolves to vault system when entity has no systemId", async () => {
      await store.init("vault-tov");
      await store.setVaultSystemId(TOV_SYSTEM_ID);

      const entityProfile = store.resolveEntitySystem({ systemId: undefined });
      expect(entityProfile.id).toBe(TOV_SYSTEM_ID);
      expect(entityProfile.capabilities.hasLuck).toBe(true);
    });

    it("resolves to neutral when neither entity nor vault specifies a profile", async () => {
      await store.init("vault-plain");

      const entityProfile = store.resolveEntitySystem({});
      expect(entityProfile.id).toBe(SYSTEM_NEUTRAL_ID);
      expect(entityProfile.isDefault).toBe(true);
    });

    it("resolves system IDs through the entity and vault profile precedence", async () => {
      await store.init("vault-tov");
      await store.setVaultSystemId(TOV_SYSTEM_ID);

      expect(store.resolveSystemId()).toBe(TOV_SYSTEM_ID);
      expect(store.resolveSystemId({ systemId: "dnd5e" })).toBe("dnd5e");

      await store.setVaultSystemId(null);
      expect(store.resolveSystemId()).toBe(SYSTEM_NEUTRAL_ID);
    });
  });
});
