import { beforeEach, describe, expect, it, vi } from "vitest";
import { vaultEventBus } from "./events";
import { EntityStore } from "./entity-store.svelte";
import type { LocalEntity } from "./types";
import * as vaultEntities from "./entities";

vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.raw = (v: any) => v;
  (global as any).$derived = (v: any) => v;
  (global as any).$derived.by = vi.fn((fn) => fn());
});

vi.mock("./events", () => ({
  vaultEventBus: {
    emit: vi.fn(),
    reset: vi.fn(),
    subscribe: vi.fn(),
  },
}));

vi.mock("./entities", () => ({
  createEntity: vi.fn(),
  updateEntity: vi.fn(),
  deleteEntity: vi.fn(),
  addConnection: vi.fn(),
  updateConnection: vi.fn(),
  removeConnection: vi.fn(),
  addLabel: vi.fn(),
  bulkAddLabel: vi.fn(),
  bulkRemoveLabel: vi.fn(),
  removeLabel: vi.fn(),
  batchCreateEntities: vi.fn(),
}));

vi.mock("../../utils/opfs", () => ({
  readFileAsText: vi.fn(),
  deleteOpfsEntry: vi.fn(),
}));

vi.mock("../../utils/markdown", () => ({
  parseMarkdown: vi.fn(),
  sanitizeId: vi.fn((s) => s.toLowerCase().replace(/\s+/g, "-")),
}));

vi.mock("../../services/cache.svelte", () => ({
  cacheService: {
    getEntityContent: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("../debug.svelte", () => ({
  debugStore: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../ui.svelte", () => ({
  uiStore: {
    isDemoMode: false,
    notify: vi.fn(),
  },
}));

import { uiStore } from "../ui.svelte";

describe("EntityStore", () => {
  let repository: { entities: Record<string, LocalEntity>; saveQueue: any };
  let store: EntityStore;

  beforeEach(() => {
    vi.clearAllMocks();
    vaultEventBus.reset(false);

    repository = {
      entities: {
        hero: {
          id: "hero",
          title: "Hero",
          content: "",
          lore: "",
          type: "character",
          status: "active",
          labels: [],
          tags: [],
          connections: [],
        } as LocalEntity,
        place: {
          id: "place",
          title: "Place",
          content: "",
          lore: "",
          type: "location",
          status: "active",
          labels: ["important"],
          tags: [],
          connections: [],
        } as LocalEntity,
      },
      saveQueue: {
        enqueue: vi.fn((_key, fn) => fn()),
      },
    };

    store = new EntityStore({
      repository: repository as any,
      activeVaultId: () => "vault-1",
      isGuest: () => false,
      getGuestFile: vi.fn(),
      setStatus: vi.fn(),
      setErrorMessage: vi.fn(),
      getActiveVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
      getSpecificVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
      getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
      getServices: () => ({ ai: { clearStyleCache: vi.fn() } }),
      invalidateUrlCache: vi.fn(),
    });
  });

  it("derives the label index from repository entities", () => {
    expect(store.labelIndex).toEqual(["important"]);
    expect(store.allEntities).toHaveLength(2);
  });

  it("creates an entity and marks it as loaded", async () => {
    const newEntity = { id: "new-entity", title: "New Entity" };
    vi.mocked(vaultEntities.createEntity).mockReturnValue(newEntity as any);

    const id = await store.createEntity("note", "New Entity");

    expect(id).toBe("new-entity");
    expect(repository.entities["new-entity"]).toBe(newEntity);
    expect(store.isContentLoaded("new-entity")).toBe(true);
    expect(repository.saveQueue.enqueue).toHaveBeenCalled();
  });

  it("updates an entity and marks it as loaded if content-related fields change", async () => {
    const updatedEntity = {
      ...repository.entities.hero,
      title: "Updated Hero",
    };
    vi.mocked(vaultEntities.updateEntity).mockReturnValue({
      entities: { ...repository.entities, hero: updatedEntity },
      updated: updatedEntity,
    });

    const success = await store.updateEntity("hero", { title: "Updated Hero" });

    expect(success).toBe(true);
    expect(store.isContentLoaded("hero")).toBe(true);
    expect(repository.saveQueue.enqueue).toHaveBeenCalled();
  });

  it("handles batch updates", async () => {
    const success = await store.batchUpdate({
      hero: { tags: ["new-tag"] },
    });

    expect(success).toBe(true);
    expect(store.isContentLoaded("hero")).toBe(true);
    expect(repository.saveQueue.enqueue).toHaveBeenCalled();
  });

  it("deletes an entity", async () => {
    vi.mocked(vaultEntities.deleteEntity).mockResolvedValue({
      entities: { place: repository.entities.place },
      deletedEntity: repository.entities.hero,
      modifiedIds: [],
    });

    await store.deleteEntity("hero");

    expect(repository.entities.hero).toBeUndefined();
    expect(repository.entities.place).toBeDefined();
    expect(repository.saveQueue.enqueue).toHaveBeenCalled();
    expect(vaultEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ENTITY_DELETED",
        entityId: "hero",
      }),
    );
  });

  it("handles connection operations", async () => {
    const updatedSource = {
      ...repository.entities.hero,
      connections: [{ target: "place", type: "ref", strength: 1 }],
    };
    vi.mocked(vaultEntities.addConnection).mockReturnValue({
      entities: { ...repository.entities, hero: updatedSource },
      updatedSource,
    });

    const success = await store.addConnection("hero", "place", "ref");
    expect(success).toBe(true);
    expect(repository.saveQueue.enqueue).toHaveBeenCalled();
  });

  it("handles label operations", async () => {
    const updatedHero = { ...repository.entities.hero, labels: ["heroic"] };
    vi.mocked(vaultEntities.addLabel).mockReturnValue({
      entities: { ...repository.entities, hero: updatedHero },
      updated: updatedHero,
    });

    const success = await store.addLabel("hero", "heroic");
    expect(success).toBe(true);
    expect(repository.saveQueue.enqueue).toHaveBeenCalled();
  });

  describe("scheduleSave", () => {
    it("should reset status to idle when vault handle is missing", async () => {
      const setStatus = vi.fn();
      const storeWithNoHandle = new EntityStore({
        repository: repository as any,
        activeVaultId: () => "vault-1",
        isGuest: () => false,
        setStatus,
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
      });

      await storeWithNoHandle.scheduleSave(repository.entities.hero);

      // Status should be set to "saving" first, then reset to "idle"
      expect(setStatus).toHaveBeenCalledWith("saving");
      expect(setStatus).toHaveBeenCalledWith("idle");
    });

    it("should set status to error on save failure", async () => {
      const setStatus = vi.fn();
      const setErrorMessage = vi.fn();
      repository.saveQueue.enqueue = vi.fn((_key, fn) => {
        return fn();
      });

      const storeWithSaveError = new EntityStore({
        repository: {
          ...repository,
          saveToDisk: vi.fn().mockRejectedValue(new Error("Disk error")),
        } as any,
        activeVaultId: () => "vault-1",
        isGuest: () => false,
        setStatus,
        setErrorMessage,
        getActiveVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
        getSpecificVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
      });

      vi.mocked(vaultEntities.updateEntity).mockReturnValue({
        entities: { ...repository.entities, hero: repository.entities.hero },
        updated: repository.entities.hero,
      });

      // Trigger a save that will fail
      await storeWithSaveError.scheduleSave(repository.entities.hero);

      expect(setStatus).toHaveBeenCalledWith("saving");
      // The error path should set status to "error"
      expect(setStatus).toHaveBeenCalledWith("error");
    });

    it("should return immediately when no active vault id", async () => {
      const setStatus = vi.fn();
      const storeNoVault = new EntityStore({
        repository: repository as any,
        activeVaultId: () => null,
        isGuest: () => false,
        setStatus,
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
      });

      await storeNoVault.scheduleSave(repository.entities.hero);

      expect(setStatus).not.toHaveBeenCalled();
    });

    it("should return immediately in demo mode", async () => {
      const setStatus = vi.fn();
      uiStore.isDemoMode = true;

      const storeDemo = new EntityStore({
        repository: repository as any,
        activeVaultId: () => "vault-1",
        isGuest: () => false,
        setStatus,
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue({}),
        getSpecificVaultHandle: vi.fn().mockResolvedValue({}),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
      });

      await storeDemo.scheduleSave(repository.entities.hero);

      expect(setStatus).not.toHaveBeenCalled();

      uiStore.isDemoMode = false;
    });

    it("should return early when entity does not exist in repository", async () => {
      const setStatus = vi.fn();
      const store = new EntityStore({
        repository: { ...repository, entities: {} } as any,
        activeVaultId: () => "vault-1",
        isGuest: () => false,
        setStatus,
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue({}),
        getSpecificVaultHandle: vi.fn().mockResolvedValue({}),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
      });

      await store.scheduleSave({ id: "nonexistent" } as LocalEntity);

      expect(setStatus).not.toHaveBeenCalledWith("saving");
    });

    it("should call onEntityUpdate callback", async () => {
      const onEntityUpdate = vi.fn();
      const storeWithCallback = new EntityStore({
        repository: repository as any,
        activeVaultId: () => "vault-1",
        isGuest: () => false,
        setStatus: vi.fn(),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        onEntityUpdate,
      });

      await storeWithCallback.scheduleSave(repository.entities.hero);

      expect(onEntityUpdate).toHaveBeenCalledWith(repository.entities.hero);
    });
  });

  describe("updateEntity", () => {
    it("should return false when entity does not exist", async () => {
      const result = await store.updateEntity("nonexistent", { title: "New" });
      expect(result).toBe(false);
    });

    it("should return false when updateEntity helper reports no changes", async () => {
      vi.mocked(vaultEntities.updateEntity).mockReturnValue({
        entities: repository.entities,
        updated: undefined as any,
      });

      const result = await store.updateEntity("hero", { title: "Hero" });
      expect(result).toBe(false);
    });

    it("should clear AI cache for style-related titles", async () => {
      const clearStyleCache = vi.fn();
      const storeWithAI = new EntityStore({
        repository: repository as any,
        activeVaultId: () => "vault-1",
        isGuest: () => false,
        setStatus: vi.fn(),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({
          ai: { clearStyleCache },
        }),
      });

      const updatedEntity = {
        ...repository.entities.hero,
        title: "New art style",
      };
      vi.mocked(vaultEntities.updateEntity).mockReturnValue({
        entities: { ...repository.entities, hero: updatedEntity },
        updated: updatedEntity,
      });

      await storeWithAI.updateEntity("hero", { title: "New art style" });

      expect(clearStyleCache).toHaveBeenCalled();
    });

    it("should call invalidateUrlCache when image is updated", async () => {
      const invalidateUrlCache = vi.fn();
      const storeWithUrl = new EntityStore({
        repository: repository as any,
        activeVaultId: () => "vault-1",
        isGuest: () => false,
        setStatus: vi.fn(),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        invalidateUrlCache,
      });

      const updatedEntity = {
        ...repository.entities.hero,
        image: "/path/to/image.png",
      };
      vi.mocked(vaultEntities.updateEntity).mockReturnValue({
        entities: { ...repository.entities, hero: updatedEntity },
        updated: updatedEntity,
      });

      await storeWithUrl.updateEntity("hero", { image: "/path/to/image.png" });

      expect(invalidateUrlCache).toHaveBeenCalledWith("/path/to/image.png");
    });
  });

  describe("batchUpdate", () => {
    it("should return false when there are no changes", async () => {
      const result = await store.batchUpdate({
        nonexistent: { title: "X" },
      });
      expect(result).toBe(false);
    });

    it("should skip entities not in the current set", async () => {
      const result = await store.batchUpdate({
        nonexistent: { title: "X" },
        hero: { tags: ["tag"] },
      });
      expect(result).toBe(true);
    });

    it("should call onBatchUpdate callback with applied updates", async () => {
      const onBatchUpdate = vi.fn();
      const storeWithCallback = new EntityStore({
        repository: repository as any,
        activeVaultId: () => "vault-1",
        isGuest: () => false,
        setStatus: vi.fn(),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        onBatchUpdate,
      });

      await storeWithCallback.batchUpdate({
        hero: { tags: ["new"] },
      });

      expect(onBatchUpdate).toHaveBeenCalledWith({
        hero: { tags: ["new"] },
      });
    });

    it("should preserve existing metadata when batch updates patch coordinates", async () => {
      repository.entities.hero.metadata = {
        region: ["north"],
        coordinates: { x: 1, y: 2 },
      } as any;

      await store.batchUpdate({
        hero: { metadata: { coordinates: { x: 10, y: 20 } } },
      });

      expect(store.entities.hero.metadata).toEqual({
        region: ["north"],
        coordinates: { x: 10, y: 20 },
      });
      expect(vaultEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "BATCH_UPDATED",
          patches: {
            hero: { metadata: { coordinates: { x: 10, y: 20 } } },
          },
        }),
      );
    });

    it("should call invalidateUrlCache for updated images", async () => {
      const invalidateUrlCache = vi.fn();
      const storeWithUrl = new EntityStore({
        repository: repository as any,
        activeVaultId: () => "vault-1",
        isGuest: () => false,
        setStatus: vi.fn(),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        invalidateUrlCache,
      });

      await storeWithUrl.batchUpdate({
        hero: { image: "/img.png" },
      });

      expect(invalidateUrlCache).toHaveBeenCalledWith("/img.png");
    });
  });

  describe("deleteEntity", () => {
    it("should throw in guest mode", async () => {
      const guestStore = new EntityStore({
        repository: repository as any,
        activeVaultId: () => "vault-1",
        isGuest: () => true,
        setStatus: vi.fn(),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue({}),
        getSpecificVaultHandle: vi.fn().mockResolvedValue({}),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
      });

      await expect(guestStore.deleteEntity("hero")).rejects.toThrow(
        "Cannot delete entities in Guest Mode",
      );
    });

    it("should delete from memory in demo mode", async () => {
      uiStore.isDemoMode = true;
      const onEntityDelete = vi.fn();
      const demoStore = new EntityStore({
        repository: repository as any,
        activeVaultId: () => "vault-1",
        isGuest: () => false,
        setStatus: vi.fn(),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        onEntityDelete,
      });

      await demoStore.deleteEntity("hero");

      expect(repository.entities.hero).toBeUndefined();
      expect(onEntityDelete).toHaveBeenCalledWith("hero");

      uiStore.isDemoMode = false;
    });

    it("should save modified entities after deletion", async () => {
      vi.mocked(vaultEntities.deleteEntity).mockResolvedValue({
        entities: { place: repository.entities.place },
        deletedEntity: repository.entities.hero,
        modifiedIds: ["place"],
      });

      await store.deleteEntity("hero");

      // Should schedule save for the modified entity
      expect(repository.saveQueue.enqueue).toHaveBeenCalled();
    });
  });

  describe("connection operations", () => {
    it("should handle updateConnection", async () => {
      const updatedSource = {
        ...repository.entities.hero,
        connections: [{ target: "place", type: "ref", strength: 1 }],
      };
      vi.mocked(vaultEntities.updateConnection).mockReturnValue({
        entities: { ...repository.entities, hero: updatedSource },
        updatedSource,
      });

      const success = await store.updateConnection(
        "hero",
        "place",
        "old",
        "ref",
      );
      expect(success).toBe(true);
      expect(repository.saveQueue.enqueue).toHaveBeenCalled();
    });

    it("should handle removeConnection", async () => {
      const updatedSource = {
        ...repository.entities.hero,
        connections: [],
      };
      vi.mocked(vaultEntities.removeConnection).mockReturnValue({
        entities: { ...repository.entities, hero: updatedSource },
        updatedSource,
      });

      const success = await store.removeConnection("hero", "place", "ref");
      expect(success).toBe(true);
      expect(repository.saveQueue.enqueue).toHaveBeenCalled();
    });

    it("should return false when updateConnection has no updatedSource", async () => {
      vi.mocked(vaultEntities.updateConnection).mockReturnValue({
        entities: repository.entities,
        updatedSource: undefined as any,
      });

      const success = await store.updateConnection(
        "hero",
        "place",
        "old",
        "new",
      );
      expect(success).toBe(false);
    });

    it("should return false when removeConnection has no updatedSource", async () => {
      vi.mocked(vaultEntities.removeConnection).mockReturnValue({
        entities: repository.entities,
        updatedSource: undefined as any,
      });

      const success = await store.removeConnection("hero", "place", "ref");
      expect(success).toBe(false);
    });
  });

  describe("label operations", () => {
    it("should handle removeLabel", async () => {
      const updatedHero = { ...repository.entities.hero, labels: [] };
      vi.mocked(vaultEntities.removeLabel).mockReturnValue({
        entities: { ...repository.entities, hero: updatedHero },
        updated: updatedHero,
      });

      const success = await store.removeLabel("hero", "heroic");
      expect(success).toBe(true);
      expect(repository.saveQueue.enqueue).toHaveBeenCalled();
    });

    it("should return false when removeLabel has no updated entity", async () => {
      vi.mocked(vaultEntities.removeLabel).mockReturnValue({
        entities: repository.entities,
        updated: undefined as any,
      });

      const success = await store.removeLabel("hero", "nonexistent");
      expect(success).toBe(false);
    });

    it("should handle bulkAddLabel", async () => {
      const modifiedEntity = {
        ...repository.entities.hero,
        labels: ["heroic"],
      };
      vi.mocked(vaultEntities.bulkAddLabel).mockReturnValue({
        entities: { ...repository.entities, hero: modifiedEntity },
        modifiedIds: ["hero"],
      });

      const count = await store.bulkAddLabel(["hero"], "heroic");
      expect(count).toBe(1);
      expect(repository.saveQueue.enqueue).toHaveBeenCalled();
    });

    it("should handle bulkRemoveLabel", async () => {
      const modifiedEntity = { ...repository.entities.hero, labels: [] };
      vi.mocked(vaultEntities.bulkRemoveLabel).mockReturnValue({
        entities: { ...repository.entities, hero: modifiedEntity },
        modifiedIds: ["hero"],
      });

      const count = await store.bulkRemoveLabel(["hero"], "heroic");
      expect(count).toBe(1);
      expect(repository.saveQueue.enqueue).toHaveBeenCalled();
    });

    it("should return 0 when bulkAddLabel has no modified ids", async () => {
      vi.mocked(vaultEntities.bulkAddLabel).mockReturnValue({
        entities: repository.entities,
        modifiedIds: [],
      });

      const count = await store.bulkAddLabel(["hero"], "nonexistent");
      expect(count).toBe(0);
    });

    it("should return 0 when bulkRemoveLabel has no modified ids", async () => {
      vi.mocked(vaultEntities.bulkRemoveLabel).mockReturnValue({
        entities: repository.entities,
        modifiedIds: [],
      });

      const count = await store.bulkRemoveLabel(["hero"], "nonexistent");
      expect(count).toBe(0);
    });
  });

  describe("batchCreateEntities", () => {
    it("should create multiple entities and save them", async () => {
      const created = [
        { id: "e1", title: "Entity 1", status: "active" } as LocalEntity,
        { id: "e2", title: "Entity 2", status: "active" } as LocalEntity,
      ];
      vi.mocked(vaultEntities.batchCreateEntities).mockReturnValue({
        entities: { ...repository.entities, e1: created[0], e2: created[1] },
        created,
      });

      await store.batchCreateEntities([
        { type: "note" as const, title: "Entity 1" },
        { type: "note" as const, title: "Entity 2" },
      ] as any);

      expect(repository.entities.e1).toBeDefined();
      expect(repository.entities.e2).toBeDefined();
      expect(store.isContentLoaded("e1")).toBe(true);
      expect(store.isContentLoaded("e2")).toBe(true);
      expect(repository.saveQueue.enqueue).toHaveBeenCalledTimes(2);
      expect(vaultEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "BATCH_CREATED",
          entities: created,
        }),
      );
    });
  });

  describe("content loading", () => {
    it("should track VAULT_OPENING events by clearing content sets", () => {
      const subscribeMock = vi
        .mocked(vaultEventBus.subscribe)
        .mock.calls.find((c) => c[1] === "entity-store-content-tracker")?.[0];
      expect(subscribeMock).toBeDefined();

      // Mark some content as loaded
      store.markContentLoaded("hero");
      expect(store.isContentLoaded("hero")).toBe(true);

      // Simulate VAULT_OPENING event
      subscribeMock!({
        type: "VAULT_OPENING",
        vaultId: "vault-1",
      });

      expect(store.isContentLoaded("hero")).toBe(false);
    });

    it("should track SYNC_CHUNK_READY events by marking content as loaded", () => {
      const subscribeMock = vi
        .mocked(vaultEventBus.subscribe)
        .mock.calls.find((c) => c[1] === "entity-store-content-tracker")?.[0];
      expect(subscribeMock).toBeDefined();

      // Simulate SYNC_CHUNK_READY event
      subscribeMock!({
        type: "SYNC_CHUNK_READY",
        vaultId: "vault-1",
        entities: {
          hero: { ...repository.entities.hero, content: "loaded" },
        },
        newOrChangedIds: ["hero"],
      });

      expect(store.isContentLoaded("hero")).toBe(true);
      expect(store.isContentVerified("hero")).toBe(true);
    });

    it("should only mark content as loaded when entity has content in SYNC_CHUNK_READY", () => {
      const subscribeMock = vi
        .mocked(vaultEventBus.subscribe)
        .mock.calls.find((c) => c[1] === "entity-store-content-tracker")?.[0];
      expect(subscribeMock).toBeDefined();

      // Simulate SYNC_CHUNK_READY with entity that has no content
      subscribeMock!({
        type: "SYNC_CHUNK_READY",
        vaultId: "vault-1",
        entities: {
          hero: { ...repository.entities.hero, content: "" },
        },
        newOrChangedIds: ["hero"],
      });

      expect(store.isContentLoaded("hero")).toBe(false);
    });
  });

  describe("entities getter/setter", () => {
    it("should get entities from repository", () => {
      expect(store.entities).toBe(repository.entities);
    });

    it("should set entities on repository", () => {
      const newEntities = {
        newOne: { id: "newOne", status: "active" } as LocalEntity,
      };
      store.entities = newEntities;
      expect(repository.entities).toBe(newEntities);
    });
  });

  describe("inboundConnections", () => {
    it("should derive inbound connections from entities", () => {
      // vaultRelationships.rebuildInboundMap is mocked, so we just verify the derived state exists
      expect(store.inboundConnections).toBeDefined();
    });
  });

  describe("loadEntityContent", () => {
    it("should return early when id is empty", async () => {
      await store.loadEntityContent("");
      // Should not throw or call any cache/FS methods
    });

    it("should return early when activeVaultId is null", async () => {
      const storeNoVault = new EntityStore({
        repository: repository as any,
        activeVaultId: () => null,
        isGuest: () => false,
        getGuestFile: vi.fn(),
        setStatus: vi.fn(),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue({}),
        getSpecificVaultHandle: vi.fn().mockResolvedValue({}),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
      });

      await storeNoVault.loadEntityContent("hero");
    });

    it("fetches guest chronicle content from the host when no local vault is available", async () => {
      const getGuestFile = vi.fn().mockResolvedValue(
        new Blob(["---\nlore: Hidden host notes\n---\nShared chronicle body"], {
          type: "text/markdown",
        }),
      );
      vi.mocked(
        (await import("../../utils/markdown")).parseMarkdown,
      ).mockReturnValue({
        metadata: { lore: "Hidden host notes" },
        content: "Shared chronicle body",
      } as any);

      const guestStore = new EntityStore({
        repository: repository as any,
        activeVaultId: () => null,
        isGuest: () => true,
        getGuestFile,
        setStatus: vi.fn(),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
      });

      await guestStore.loadEntityContent("hero");

      expect(getGuestFile).toHaveBeenCalledWith("hero.md");
      expect(repository.entities.hero.content).toBe("Shared chronicle body");
      expect(repository.entities.hero.lore).toBe("");
      expect(guestStore.isContentLoaded("hero")).toBe(true);
    });

    it("retries guest host fetch when the entity was verified earlier but still has no content", async () => {
      const getGuestFile = vi.fn().mockResolvedValue(
        new Blob(["---\n---\nRetried chronicle"], {
          type: "text/markdown",
        }),
      );
      vi.mocked(
        (await import("../../utils/markdown")).parseMarkdown,
      ).mockReturnValue({
        metadata: {},
        content: "Retried chronicle",
      } as any);

      const guestStore = new EntityStore({
        repository: repository as any,
        activeVaultId: () => null,
        isGuest: () => true,
        getGuestFile,
        setStatus: vi.fn(),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
      });

      guestStore.markContentLoaded("hero");
      repository.entities.hero = {
        ...repository.entities.hero,
        content: "",
      };

      await guestStore.loadEntityContent("hero");

      expect(getGuestFile).toHaveBeenCalledWith("hero.md");
      expect(repository.entities.hero.content).toContain("Retried chronicle");
    });

    it("uses the guest host-fetch path even when a local activeVaultId is still present", async () => {
      const getGuestFile = vi.fn().mockResolvedValue(
        new Blob(["---\n---\nGuest chronicle"], {
          type: "text/markdown",
        }),
      );
      vi.mocked(
        (await import("../../utils/markdown")).parseMarkdown,
      ).mockReturnValue({
        metadata: {},
        content: "Guest chronicle",
      } as any);

      const guestStore = new EntityStore({
        repository: repository as any,
        activeVaultId: () => "default-vault",
        isGuest: () => true,
        getGuestFile,
        setStatus: vi.fn(),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
      });

      await guestStore.loadEntityContent("hero");

      expect(getGuestFile).toHaveBeenCalledWith("hero.md");
      expect(repository.entities.hero.content).toContain("Guest chronicle");
    });

    it("should return early when entity is already verified", async () => {
      store.markContentLoaded("hero");
      const { cacheService: cacheMock } =
        await import("../../services/cache.svelte");

      await store.loadEntityContent("hero");

      expect(cacheMock.getEntityContent).not.toHaveBeenCalled();
    });

    it("should return early when entity does not exist", async () => {
      await store.loadEntityContent("nonexistent");
    });

    it("preserves hydrated guest content when a guest batch patch sends empty content", async () => {
      const guestStore = new EntityStore({
        repository: repository as any,
        activeVaultId: () => null,
        isGuest: () => true,
        getGuestFile: vi.fn(),
        setStatus: vi.fn(),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveSyncHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
      });

      repository.entities.hero = {
        ...repository.entities.hero,
        content: "Hydrated chronicle",
      };

      await guestStore.batchUpdate({
        hero: {
          title: "Updated Hero",
          content: "",
        },
      });

      expect(repository.entities.hero.title).toBe("Updated Hero");
      expect(repository.entities.hero.content).toBe("Hydrated chronicle");
    });
  });

  describe("internalLoadContent", () => {
    it("should return early when entity does not exist", async () => {
      await store.internalLoadContent("nonexistent");
      // Should not throw
    });
  });
});
