import { describe, it, expect, vi, beforeEach } from "vitest";
import { VaultCrudManager } from "./crud";
import * as vaultEntities from "./entities";
import { uiStore } from "../ui.svelte";

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

vi.mock("../ui.svelte", () => ({
  uiStore: {
    isDemoMode: false,
    notify: vi.fn(),
  },
}));

describe("VaultCrudManager", () => {
  let manager: VaultCrudManager;
  let mockEntities: any;
  let mockServices: any;

  let lastSavedEntity: any = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEntities = {};
    mockServices = {
      ai: { clearStyleCache: vi.fn() },
      search: { remove: vi.fn() },
    };
    lastSavedEntity = null;

    manager = new VaultCrudManager(
      () => mockEntities,
      (e) => {
        mockEntities = e;
      },
      async (entity) => {
        lastSavedEntity = entity;
      },
      vi.fn().mockResolvedValue({}),
      () => "v1",
      () => false,
      () => mockServices,
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );
  });

  it("should create an entity", async () => {
    const newEntity = { id: "e1", title: "New" };
    vi.mocked(vaultEntities.createEntity).mockReturnValue(newEntity as any);

    const id = await manager.createEntity("npc", "New");

    expect(id).toBe("e1");
    expect(mockEntities["e1"]).toBe(newEntity);
    expect(lastSavedEntity).toBe(newEntity);
  });

  it("should update an entity safely", async () => {
    mockEntities["e1"] = {
      id: "e1",
      title: "Old",
      content: "Existing",
      lore: "Lore",
    };
    vi.mocked(vaultEntities.updateEntity).mockReturnValue({
      entities: {
        e1: {
          id: "e1",
          title: "New",
          content: "Existing",
          lore: "Lore",
        } as any,
      },
      updated: {
        id: "e1",
        title: "New",
        content: "Existing",
        lore: "Lore",
      } as any,
    });

    // Try to overwrite content with undefined
    await manager.updateEntity("e1", { title: "New", content: undefined });

    const updated = mockEntities["e1"];
    expect(updated.title).toBe("New");
    expect(updated.content).toBe("Existing");
  });

  it("should clear style cache if title contains keywords", async () => {
    mockEntities["e1"] = { id: "e1", title: "Old" };
    vi.mocked(vaultEntities.updateEntity).mockReturnValue({
      entities: { e1: { id: "e1", title: "Modern Art Style" } as any },
      updated: { id: "e1", title: "Modern Art Style" } as any,
    });

    await manager.updateEntity("e1", { title: "Modern Art Style" });
    expect(mockServices.ai.clearStyleCache).toHaveBeenCalled();
  });

  it("should handle batch updates", async () => {
    mockEntities["e1"] = { id: "e1", title: "E1" };
    mockEntities["e2"] = { id: "e2", title: "E2" };

    const onBatchUpdate = vi.fn();
    (manager as any).onBatchUpdate = onBatchUpdate;

    await manager.batchUpdate({
      e1: { title: "Updated E1" },
      missing: { title: "Ignored" },
    });

    expect(mockEntities["e1"].title).toBe("Updated E1");
    expect(mockEntities["missing"]).toBeUndefined();
    expect(onBatchUpdate).toHaveBeenCalled();
  });

  it("should return false for empty batch update", async () => {
    const result = await manager.batchUpdate({});
    expect(result).toBe(false);
  });

  it("should invalidate URL cache on update", async () => {
    mockEntities["e1"] = { id: "e1", title: "E1" };
    const invalidateSpy = vi.fn();
    (manager as any).invalidateUrlCache = invalidateSpy;

    vi.mocked(vaultEntities.updateEntity).mockReturnValue({
      entities: { e1: { id: "e1", image: "img.png", title: "E1" } as any },
      updated: { id: "e1", image: "img.png", title: "E1" } as any,
    });

    await manager.updateEntity("e1", { image: "img.png" });
    expect(invalidateSpy).toHaveBeenCalledWith("img.png");
  });

  it("should handle connection removal", async () => {
    const scheduleSave = vi.fn().mockResolvedValue(undefined);
    (manager as any).scheduleSave = scheduleSave;

    vi.mocked(vaultEntities.removeConnection).mockReturnValue({
      entities: { s: { id: "s", connections: [] } as any },
      updatedSource: { id: "s" } as any,
    });
    const result = await manager.removeConnection("s", "t", "ref");
    expect(result).toBe(true);
    expect(scheduleSave).toHaveBeenCalledWith({ id: "s" });
  });

  it("should handle connection update", async () => {
    const scheduleSave = vi.fn().mockResolvedValue(undefined);
    (manager as any).scheduleSave = scheduleSave;

    vi.mocked(vaultEntities.updateConnection).mockReturnValue({
      entities: {
        s: { id: "s", connections: [{ target: "t", type: "new" }] } as any,
      },
      updatedSource: { id: "s" } as any,
    });
    const result = await manager.updateConnection("s", "t", "old", "new");
    expect(result).toBe(true);
    expect(scheduleSave).toHaveBeenCalledWith({ id: "s" });
  });

  it("should handle bulk remove labels", async () => {
    const scheduleSave = vi.fn().mockResolvedValue(undefined);
    (manager as any).scheduleSave = scheduleSave;

    mockEntities = { e1: { id: "e1", labels: ["L1"] } as any };
    vi.mocked(vaultEntities.bulkRemoveLabel).mockReturnValue({
      entities: { e1: { id: "e1", labels: [] } as any },
      modifiedIds: ["e1"],
    });
    const count = await manager.bulkRemoveLabel(["e1"], "L1");
    expect(count).toBe(1);
    expect(scheduleSave).toHaveBeenCalled();
  });

  it("should handle remove label", async () => {
    const scheduleSave = vi.fn().mockResolvedValue(undefined);
    (manager as any).scheduleSave = scheduleSave;

    vi.mocked(vaultEntities.removeLabel).mockReturnValue({
      entities: { e1: { id: "e1", labels: [] } as any },
      updated: { id: "e1" } as any,
    });
    const result = await manager.removeLabel("e1", "L1");
    expect(result).toBe(true);
    expect(scheduleSave).toHaveBeenCalledWith({ id: "e1" });
  });

  it("should delete an entity and update search index and modified nodes", async () => {
    const scheduleSave = vi.fn().mockResolvedValue(undefined);
    const onEntityUpdate = vi.fn();
    (manager as any).scheduleSave = scheduleSave;
    (manager as any).onEntityUpdate = onEntityUpdate;

    vi.mocked(vaultEntities.deleteEntity).mockResolvedValue({
      entities: { other: { id: "other" } as any },
      deletedEntity: { id: "e1" } as any,
      modifiedIds: ["other"],
    });
    mockEntities = { other: { id: "other", title: "Other" } as any };

    await manager.deleteEntity("e1", {} as any, "v1");

    expect(mockServices.search.remove).toHaveBeenCalledWith("e1");
    expect(scheduleSave).toHaveBeenCalledWith({ id: "other" });
    expect(onEntityUpdate).toHaveBeenCalledWith({ id: "other" });
  });

  it("should handle connection operations", async () => {
    const scheduleSave = vi.fn().mockResolvedValue(undefined);
    (manager as any).scheduleSave = scheduleSave;

    vi.mocked(vaultEntities.addConnection).mockReturnValue({
      entities: { s: { id: "s", connections: [{ target: "t" }] } as any },
      updatedSource: { id: "s" } as any,
    });

    const success = await manager.addConnection("s", "t", "ref");
    expect(success).toBe(true);
    expect(vaultEntities.addConnection).toHaveBeenCalled();
    expect(scheduleSave).toHaveBeenCalled();
  });

  it("should handle label operations", async () => {
    const scheduleSave = vi.fn().mockResolvedValue(undefined);
    (manager as any).scheduleSave = scheduleSave;

    vi.mocked(vaultEntities.addLabel).mockReturnValue({
      entities: { e1: { id: "e1", labels: ["L1"] } as any },
      updated: { id: "e1" } as any,
    });

    await manager.addLabel("e1", "L1");
    expect(vaultEntities.addLabel).toHaveBeenCalled();
    expect(scheduleSave).toHaveBeenCalled();
  });

  it("should handle bulk add label operations", async () => {
    const scheduleSave = vi.fn().mockResolvedValue(undefined);
    (manager as any).scheduleSave = scheduleSave;

    mockEntities = { e1: { id: "e1", labels: [] } as any };
    vi.mocked(vaultEntities.bulkAddLabel).mockReturnValue({
      entities: { e1: { id: "e1", labels: ["L1"] } as any },
      modifiedIds: ["e1"],
    });

    const count = await manager.bulkAddLabel(["e1"], "L1");
    expect(count).toBe(1);
    expect(scheduleSave).toHaveBeenCalled();
  });

  it("should handle batch updates with actual changes", async () => {
    mockEntities = { e1: { id: "e1", title: "E1" } as any };
    const applied = await manager.batchUpdate({ e1: { title: "New" } });
    expect(applied).toBe(true);
    expect(lastSavedEntity.title).toBe("New");
  });

  it("should batch create entities and save them", async () => {
    const createdEntity = { id: "e1", title: "E1" };
    vi.mocked(vaultEntities.batchCreateEntities).mockReturnValue({
      entities: { e1: createdEntity as any },
      created: [createdEntity as any],
    });

    await manager.batchCreateEntities([
      { title: "E1", type: "npc", initialData: {} },
    ]);
    expect(vaultEntities.batchCreateEntities).toHaveBeenCalled();
    expect(lastSavedEntity).toBe(createdEntity);
  });

  it("should invalidate URL cache in batchUpdate", async () => {
    const invalidateSpy = vi.fn();
    (manager as any).invalidateUrlCache = invalidateSpy;
    mockEntities = { e1: { id: "e1", title: "E1" } as any };

    await manager.batchUpdate({ e1: { image: "new-img.png" } });
    expect(invalidateSpy).toHaveBeenCalledWith("new-img.png");
  });

  it("should handle failure paths for connections and labels", async () => {
    vi.mocked(vaultEntities.addConnection).mockReturnValue({
      entities: {},
      updatedSource: null,
    });
    expect(await manager.addConnection("s", "t", "type")).toBe(false);

    vi.mocked(vaultEntities.updateConnection).mockReturnValue({
      entities: {},
      updatedSource: null,
    });
    expect(await manager.updateConnection("s", "t", "o", "n")).toBe(false);

    vi.mocked(vaultEntities.removeConnection).mockReturnValue({
      entities: {},
      updatedSource: null,
    });
    expect(await manager.removeConnection("s", "t", "type")).toBe(false);

    vi.mocked(vaultEntities.addLabel).mockReturnValue({
      entities: {},
      updated: null,
    });
    expect(await manager.addLabel("e1", "L1")).toBe(false);

    vi.mocked(vaultEntities.removeLabel).mockReturnValue({
      entities: {},
      updated: null,
    });
    expect(await manager.removeLabel("e1", "L1")).toBe(false);
  });

  it("should handle demo mode in deleteEntity", async () => {
    uiStore.isDemoMode = true;
    await manager.deleteEntity("e1", {} as any, "v1");
    expect(uiStore.notify).toHaveBeenCalled();
    uiStore.isDemoMode = false;
  });
});
