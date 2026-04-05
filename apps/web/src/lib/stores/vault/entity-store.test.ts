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
  });
});
