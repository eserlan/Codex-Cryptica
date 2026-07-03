import { beforeEach, describe, expect, it, vi } from "vitest";
import { vaultEventBus } from "./events.svelte";
import { EntityStore } from "./entity-store.svelte";
import type { LocalEntity } from "./types";
import * as vaultEntities from "./entities";

vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.raw = (v: any) => v;
  (global as any).$derived = (v: any) => v;
  (global as any).$derived.by = vi.fn((fn) => fn());
});

vi.mock("./events.svelte", () => ({
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
  walkOpfsDirectory: vi.fn(),
  writeOpfsFile: vi.fn(),
  isNotFoundError: vi.fn(() => false),
  readOpfsBlob: vi.fn(),
  getDirHandle: vi.fn(),
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

import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
describe("EntityStore", () => {
  let repository: {
    entities: Record<string, LocalEntity>;
    saveQueue: any;
    enqueueSave: ReturnType<typeof vi.fn>;
    saveToDisk?: ReturnType<typeof vi.fn>;
    waitForAllSaves?: ReturnType<typeof vi.fn>;
  };
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
          aliases: [],
          connections: [],
        } as unknown as LocalEntity,
        place: {
          id: "place",
          title: "Place",
          content: "",
          lore: "",
          type: "location",
          status: "active",
          labels: ["important"],
          aliases: [],
          connections: [],
        } as unknown as LocalEntity,
      },
      saveQueue: {
        enqueue: vi.fn((_key, fn) => fn()),
      },
      enqueueSave: vi.fn(),
      saveToDisk: vi.fn().mockResolvedValue(undefined),
      waitForAllSaves: vi.fn().mockResolvedValue(undefined),
    };
    // Delegate enqueueSave → saveQueue.enqueue so existing assertions on saveQueue.enqueue still pass.
    repository.enqueueSave.mockImplementation((_key: any, fn: any) =>
      repository.saveQueue.enqueue(_key, fn),
    );

    store = new EntityStore({
      repository: repository as any,
      activeVaultId: () => "vault-1",
      isGuest: () => false,
      getGuestFile: vi.fn(),
      setStatus: vi.fn(),
      status: vi.fn().mockReturnValue("idle" as const),
      setErrorMessage: vi.fn(),
      getActiveVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
      getSpecificVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
      getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
      getServices: () => ({ ai: { clearStyleCache: vi.fn() } }),
      invalidateUrlCache: vi.fn(),
      updateEntityCount: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("derives the label index from repository entities", () => {
    expect(store.labelIndex).toEqual(["important"]);
    expect(store.allEntities).toHaveLength(2);
  });

  it("derives the label counts and excludes drafts from counts but keeps them in index", () => {
    repository.entities.draftPlace = {
      id: "draftPlace",
      title: "Draft Place",
      content: "",
      lore: "",
      type: "location",
      status: "draft",
      labels: ["important", "new-label"],
      aliases: [],
      connections: [],
    } as unknown as LocalEntity;

    repository.entities.activePlace = {
      id: "activePlace",
      title: "Active Place",
      content: "",
      lore: "",
      type: "location",
      status: "active",
      labels: ["new-label", "new-label"], // Duplicate labels on single entity
      aliases: [],
      connections: [],
    } as unknown as LocalEntity;

    const testStore = new EntityStore({
      repository: repository as any,
      activeVaultId: () => "vault-1",
      isGuest: () => false,
      getGuestFile: vi.fn(),
      setStatus: vi.fn(),
      status: vi.fn().mockReturnValue("idle" as const),
      setErrorMessage: vi.fn(),
      getActiveVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
      getSpecificVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
      getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
      getServices: () => ({ ai: { clearStyleCache: vi.fn() } }),
      invalidateUrlCache: vi.fn(),
      updateEntityCount: vi.fn().mockResolvedValue(undefined),
    });

    expect(testStore.labelIndex).toEqual(["important", "new-label"]);
    expect(testStore.labelCounts).toEqual({
      important: 1,
      "new-label": 1, // Correctly de-duplicated and counted as 1
    });
  });

  it("creates an entity and marks it as loaded and updates count", async () => {
    const newEntity = { id: "new-entity", title: "New Entity" };
    vi.mocked(vaultEntities.createEntity).mockReturnValue(newEntity as any);
    const updateEntityCount = vi.fn().mockResolvedValue(undefined);

    store = new EntityStore({
      repository: repository as any,
      activeVaultId: () => "vault-1",
      isGuest: () => false,
      setStatus: vi.fn(),
      status: vi.fn().mockReturnValue("idle" as const),
      setErrorMessage: vi.fn(),
      getActiveVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
      getSpecificVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
      getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
      getServices: () => ({}),
      updateEntityCount,
    });

    const id = await store.createEntity("note", "New Entity");

    expect(id).toBe("new-entity");
    expect(updateEntityCount).toHaveBeenCalledWith("vault-1", 3);
  });

  it("updates entity count after deletion", async () => {
    vi.mocked(vaultEntities.deleteEntity).mockResolvedValue({
      entities: { place: repository.entities.place },
      deletedEntity: repository.entities.hero,
      modifiedIds: [],
    });
    const updateEntityCount = vi.fn().mockResolvedValue(undefined);

    store = new EntityStore({
      repository: repository as any,
      activeVaultId: () => "vault-1",
      isGuest: () => false,
      setStatus: vi.fn(),
      status: vi.fn().mockReturnValue("idle" as const),
      setErrorMessage: vi.fn(),
      getActiveVaultHandle: vi.fn().mockResolvedValue({}),
      getSpecificVaultHandle: vi.fn().mockResolvedValue({}),
      getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
      getServices: () => ({}),
      updateEntityCount,
    });

    await store.deleteEntity("hero");

    expect(updateEntityCount).toHaveBeenCalledWith("vault-1", 1);
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
      hero: { labels: ["new-tag"] },
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
    expect(vaultEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CONNECTION_ADDED",
        sourceId: "hero",
        targetId: "place",
        connectionType: "ref",
      }),
    );
  });

  it("replaces graph-facing entity arrays for connection-only updates", async () => {
    const updatedSource = {
      ...repository.entities.hero,
      connections: [{ target: "place", type: "ref", strength: 1 }],
    };
    vi.mocked(vaultEntities.addConnection).mockReturnValue({
      entities: { ...repository.entities, hero: updatedSource },
      updatedSource,
    });

    const previousAllEntities = store.allEntities;
    const previousActiveEntities = store.allActiveEntities;

    const success = await store.addConnection("hero", "place", "ref");

    expect(success).toBe(true);
    expect(store.allEntities).not.toBe(previousAllEntities);
    expect(store.allActiveEntities).not.toBe(previousActiveEntities);
    expect(
      store.allEntities.find((entity) => entity.id === "hero")?.connections,
    ).toEqual([{ target: "place", type: "ref", strength: 1 }]);
  });

  it("does not advance graph structure for content-only updates", () => {
    const initialMap = { ...repository.entities };
    const heroUpdated = {
      ...initialMap.hero,
      content: "Only prose changed",
      updatedAt: Date.now(),
      modifiedAt: Date.now(),
    } as unknown as LocalEntity;
    const newMap = { ...initialMap, hero: heroUpdated };
    const previousGraphEntities = store.graphEntities;
    const previousVersion = store.graphStructureVersion;

    store.handleEntitiesUpdate(initialMap, newMap);

    expect(store.graphEntities).toBe(previousGraphEntities);
    expect(store.graphStructureVersion).toBe(previousVersion);
    expect(store.allEntities.find((entity) => entity.id === "hero")).toEqual(
      heroUpdated,
    );
  });

  it("keeps graphEntities independent from allEntities after rebuilds", () => {
    const rebuiltAllEntities = store.allEntities;
    const rebuiltGraphEntities = store.graphEntities;

    expect(rebuiltGraphEntities).not.toBe(rebuiltAllEntities);

    const newEntity = {
      id: "villain",
      title: "Villain",
      content: "",
      lore: "",
      type: "character",
      status: "active",
      labels: [],
      aliases: [],
      connections: [],
    } as unknown as LocalEntity;

    store.handleEntitiesUpdate(repository.entities, {
      ...repository.entities,
      villain: newEntity,
    });

    expect(
      store.allEntities.filter((entity) => entity.id === "villain"),
    ).toHaveLength(1);
    expect(
      store.graphEntities.filter((entity) => entity.id === "villain"),
    ).toHaveLength(1);
  });

  it("advances graph structure for graph-relevant updates", () => {
    const initialMap = { ...repository.entities };
    const heroUpdated = {
      ...initialMap.hero,
      metadata: { coordinates: { x: 10, y: 20 } },
      updatedAt: Date.now(),
      modifiedAt: Date.now(),
    } as unknown as LocalEntity;
    const newMap = { ...initialMap, hero: heroUpdated };
    const previousGraphEntities = store.graphEntities;
    const previousVersion = store.graphStructureVersion;

    store.handleEntitiesUpdate(initialMap, newMap);

    expect(store.graphEntities).not.toBe(previousGraphEntities);
    expect(store.graphStructureVersion).toBe(previousVersion + 1);
    expect(store.graphEntities.find((entity) => entity.id === "hero")).toEqual(
      heroUpdated,
    );
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
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
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
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage,
        getActiveVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
        getSpecificVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
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
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      await storeNoVault.scheduleSave(repository.entities.hero);

      expect(setStatus).not.toHaveBeenCalled();
    });

    it("should return immediately in demo mode", async () => {
      const setStatus = vi.fn();
      sessionModeStore.isDemoMode = true;

      const storeDemo = new EntityStore({
        repository: repository as any,
        activeVaultId: () => "vault-1",
        isGuest: () => false,
        setStatus,
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue({}),
        getSpecificVaultHandle: vi.fn().mockResolvedValue({}),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      await storeDemo.scheduleSave(repository.entities.hero);

      expect(setStatus).not.toHaveBeenCalled();

      sessionModeStore.isDemoMode = false;
    });

    it("should return early when entity does not exist in repository", async () => {
      const setStatus = vi.fn();
      const store = new EntityStore({
        repository: { ...repository, entities: {} } as any,
        activeVaultId: () => "vault-1",
        isGuest: () => false,
        setStatus,
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue({}),
        getSpecificVaultHandle: vi.fn().mockResolvedValue({}),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
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
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
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
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({
          ai: { clearStyleCache },
        }),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
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
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
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
        hero: { labels: ["tag"] },
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
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
        onBatchUpdate,
      });

      await storeWithCallback.batchUpdate({
        hero: { labels: ["new"] },
      });

      expect(onBatchUpdate).toHaveBeenCalledWith({
        hero: { labels: ["new"] },
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
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
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
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue({}),
        getSpecificVaultHandle: vi.fn().mockResolvedValue({}),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      await expect(guestStore.deleteEntity("hero")).rejects.toThrow(
        "Cannot delete entities in Guest Mode",
      );
    });

    it("should delete from memory in demo mode", async () => {
      sessionModeStore.isDemoMode = true;
      const onEntityDelete = vi.fn();
      const demoStore = new EntityStore({
        repository: repository as any,
        activeVaultId: () => "vault-1",
        isGuest: () => false,
        setStatus: vi.fn(),
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
        onEntityDelete,
      });

      await demoStore.deleteEntity("hero");

      expect(repository.entities.hero).toBeUndefined();
      expect(onEntityDelete).toHaveBeenCalledWith("hero");

      sessionModeStore.isDemoMode = false;
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
        {
          id: "e1",
          title: "Entity 1",
          status: "active",
        } as unknown as LocalEntity,
        {
          id: "e2",
          title: "Entity 2",
          status: "active",
        } as unknown as LocalEntity,
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
        newOne: { id: "newOne", status: "active" } as unknown as LocalEntity,
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
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue({}),
        getSpecificVaultHandle: vi.fn().mockResolvedValue({}),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
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
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
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
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
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
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
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
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue(undefined),
        getSpecificVaultHandle: vi.fn().mockResolvedValue(undefined),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
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

    it("should preserve in-memory metadata (like parent relationship) and not overwrite it with old data from disk", async () => {
      const markdownUtils = await import("../../utils/markdown");
      const opfsUtils = await import("../../utils/opfs");

      // In-memory has parent set
      repository.entities.hero = {
        ...repository.entities.hero,
        parent: "parent-node",
      };

      // Disk has older metadata (no parent) and the actual file content
      vi.mocked(opfsUtils.readFileAsText).mockResolvedValue(
        "Old content from disk",
      );
      vi.mocked(markdownUtils.parseMarkdown).mockReturnValue({
        metadata: {
          id: "hero",
          title: "Hero",
          type: "character",
          // no parent field on disk
        },
        content: "Hydrated content from disk",
      });

      await store.internalLoadContent("hero");

      // Verifies content is hydrated, but in-memory parent is preserved!
      expect(repository.entities.hero.content).toBe(
        "Hydrated content from disk",
      );
      expect(repository.entities.hero.parent).toBe("parent-node");
    });
  });

  describe("flushPendingSaves", () => {
    it("should clear timeouts and flush all pending saves concurrently", async () => {
      const repositoryMock = {
        entities: {
          "entity-1": { id: "entity-1", title: "E1" },
          "entity-2": { id: "entity-2", title: "E2" },
        } as unknown as Record<string, LocalEntity>,
        enqueueSave: vi.fn().mockImplementation((id, cb) => cb()),
        waitForAllSaves: vi.fn().mockResolvedValue(undefined),
      };

      const setStatus = vi.fn();
      const storeWithPending = new EntityStore({
        repository: repositoryMock as any,
        activeVaultId: () => "vault-1",
        isGuest: () => false,
        setStatus,
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
        getSpecificVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      // Schedule two saves (will be debounced)
      const save1 = storeWithPending.scheduleSave(
        repositoryMock.entities["entity-1"],
      );
      const save2 = storeWithPending.scheduleSave(
        repositoryMock.entities["entity-2"],
      );

      // Flush them immediately before their 400ms timer runs
      await storeWithPending.flushPendingSaves();

      // Check both enqueueSave were called
      expect(repositoryMock.enqueueSave).toHaveBeenCalledWith(
        "entity-1",
        expect.any(Function),
      );
      expect(repositoryMock.enqueueSave).toHaveBeenCalledWith(
        "entity-2",
        expect.any(Function),
      );
      // Check that waitForAllSaves was called at the end
      expect(repositoryMock.waitForAllSaves).toHaveBeenCalled();

      // The promises from scheduleSave should resolve
      await Promise.all([save1, save2]);
    });

    it("should propagate timeoutMs to waitForAllSaves", async () => {
      const repositoryMock = {
        entities: {
          "entity-1": { id: "entity-1", title: "E1" },
        } as unknown as Record<string, LocalEntity>,
        enqueueSave: vi.fn().mockImplementation((id, cb) => cb()),
        waitForAllSaves: vi.fn().mockResolvedValue(undefined),
      };

      const storeWithPending = new EntityStore({
        repository: repositoryMock as any,
        activeVaultId: () => "vault-1",
        isGuest: () => false,
        setStatus: vi.fn(),
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
        getSpecificVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      storeWithPending.scheduleSave(repositoryMock.entities["entity-1"]);
      await storeWithPending.flushPendingSaves(2000);

      expect(repositoryMock.waitForAllSaves).toHaveBeenCalledWith(2000);
    });

    it("should handle individual save rejections gracefully and still wait for other saves", async () => {
      const repositoryMock = {
        entities: {
          "entity-1": { id: "entity-1", title: "E1" },
          "entity-2": { id: "entity-2", title: "E2" },
        } as unknown as Record<string, LocalEntity>,
        enqueueSave: vi.fn().mockImplementation((id, cb) => {
          if (id === "entity-1") {
            return Promise.reject(new Error("Failure"));
          }
          return cb();
        }),
        waitForAllSaves: vi.fn().mockResolvedValue(undefined),
      };

      const storeWithPending = new EntityStore({
        repository: repositoryMock as any,
        activeVaultId: () => "vault-1",
        isGuest: () => false,
        setStatus: vi.fn(),
        status: vi.fn().mockReturnValue("idle" as const),
        setErrorMessage: vi.fn(),
        getActiveVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
        getSpecificVaultHandle: vi.fn().mockResolvedValue({ name: "vault-1" }),
        getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
        getServices: () => ({}),
        updateEntityCount: vi.fn().mockResolvedValue(undefined),
      });

      const save1 = storeWithPending.scheduleSave(
        repositoryMock.entities["entity-1"],
      );
      const save2 = storeWithPending.scheduleSave(
        repositoryMock.entities["entity-2"],
      );

      // Should not throw, should resolve successfully
      await storeWithPending.flushPendingSaves();

      expect(repositoryMock.enqueueSave).toHaveBeenCalledWith(
        "entity-1",
        expect.any(Function),
      );
      expect(repositoryMock.enqueueSave).toHaveBeenCalledWith(
        "entity-2",
        expect.any(Function),
      );
      expect(repositoryMock.waitForAllSaves).toHaveBeenCalled();

      // Ensure save promises are resolved/settled (either resolve or swallow error in scheduleSave)
      await Promise.all([save1, save2]);
    });
  });

  describe("Incremental Index Maintenance", () => {
    it("correctly de-duplicates labels and updates index / counts when entity is added", () => {
      const initialMap = { ...repository.entities };
      const newMap = {
        ...initialMap,
        newHero: {
          id: "newHero",
          title: "New Hero",
          content: "Keystroke tests",
          lore: "",
          type: "character",
          status: "active",
          labels: ["important", "important", "new-label"],
          aliases: ["Hero Jr", "Newbie"],
          connections: [],
        } as unknown as LocalEntity,
      };

      store.handleEntitiesUpdate(initialMap, newMap);

      expect(store.labelIndex).toEqual(["important", "new-label"]);
      // important was 1 (from place), newHero adds it once (de-duplicated). total = 2.
      expect(store.labelCounts["important"]).toBe(2);
      expect(store.labelCounts["new-label"]).toBe(1);

      // Verify title and alias index sorted by length
      const match = store.titleAndAliasIndex.find(
        (t) => t.entityId === "newHero" && t.isAlias,
      );
      expect(match).toBeDefined();
    });

    it("correctly handles label counting when a draft is updated to active", () => {
      const initialMap = { ...repository.entities };
      const draftEntity = {
        id: "hero",
        title: "Hero",
        content: "",
        lore: "",
        type: "character",
        status: "draft",
        labels: ["important", "another-label"],
        aliases: [],
        connections: [],
      } as unknown as LocalEntity;

      const activeEntity = {
        ...draftEntity,
        status: "active",
      } as unknown as LocalEntity;

      const map1 = { ...initialMap, hero: draftEntity };
      const map2 = { ...initialMap, hero: activeEntity };

      store.handleEntitiesUpdate(map1, map2);

      // hero had draft label 'important' and 'another-label'.
      // Now hero is active, so counts must increment.
      expect(store.labelCounts["important"]).toBe(2); // hero(1) + place(1)
      expect(store.labelCounts["another-label"]).toBe(1);
    });

    it("correctly decrements de-duplicated labels on deletion", () => {
      const initialMap = {
        hero: {
          id: "hero",
          title: "Hero",
          content: "",
          lore: "",
          type: "character",
          status: "active",
          labels: ["important", "important"],
          aliases: [],
          connections: [],
        } as unknown as LocalEntity,
      };

      const emptyMap: Record<string, LocalEntity> = {};

      repository.entities = { ...initialMap };
      store.handleEntitiesUpdate(initialMap, initialMap); // build initial
      expect(store.labelCounts["important"]).toBe(1);

      repository.entities = emptyMap;
      store.handleEntitiesUpdate(initialMap, emptyMap);
      expect(store.labelCounts["important"]).toBeUndefined();
    });

    it("executes rapid keystroke updates on the in-place O(N) search / update path", () => {
      const initialMap = { ...repository.entities };
      const heroUpdated = {
        ...initialMap.hero,
        content: "Draft character content typed rapid",
        updatedAt: Date.now(),
      } as unknown as LocalEntity;

      const newMap = { ...initialMap, hero: heroUpdated };

      // Ensure no indices change
      const prevLabelIndex = [...store.labelIndex];
      const prevLabelCounts = { ...store.labelCounts };

      store.handleEntitiesUpdate(initialMap, newMap);

      expect(store.labelIndex).toEqual(prevLabelIndex);
      expect(store.labelCounts).toEqual(prevLabelCounts);
      expect(store.allEntities.find((e) => e.id === "hero")?.content).toBe(
        "Draft character content typed rapid",
      );
    });
  });
});
