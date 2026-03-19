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

  beforeEach(() => {
    vi.clearAllMocks();
    mockEntities = {};
    mockServices = {
      ai: { clearStyleCache: vi.fn() },
      search: { remove: vi.fn() },
    };

    manager = new VaultCrudManager(
      () => mockEntities,
      (e) => {
        mockEntities = e;
      },
      vi.fn().mockResolvedValue(undefined),
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
    vi.mocked(vaultEntities.removeConnection).mockReturnValue({
      entities: { s: { id: "s", connections: [] } as any },
      updatedSource: { id: "s" } as any,
    });
    const result = await manager.removeConnection("s", "t", "ref");
    expect(result).toBe(true);
  });

  it("should handle connection update", async () => {
    vi.mocked(vaultEntities.updateConnection).mockReturnValue({
      entities: {
        s: { id: "s", connections: [{ target: "t", type: "new" }] } as any,
      },
      updatedSource: { id: "s" } as any,
    });
    const result = await manager.updateConnection("s", "t", "old", "new");
    expect(result).toBe(true);
  });

  it("should handle bulk remove labels", async () => {
    vi.mocked(vaultEntities.bulkRemoveLabel).mockReturnValue({
      entities: { e1: { id: "e1", labels: [] } as any },
      modifiedIds: ["e1"],
    });
    const count = await manager.bulkRemoveLabel(["e1"], "L1");
    expect(count).toBe(1);
  });

  it("should handle remove label", async () => {
    vi.mocked(vaultEntities.removeLabel).mockReturnValue({
      entities: { e1: { id: "e1", labels: [] } as any },
      updated: { id: "e1" } as any,
    });
    const result = await manager.removeLabel("e1", "L1");
    expect(result).toBe(true);
  });

  it("should prevent deletion in guest mode", async () => {
    const guestManager = new VaultCrudManager(
      () => ({}),
      (_e) => {},
      vi.fn().mockResolvedValue(undefined),
      vi.fn(),
      () => "v1",
      () => true,
      () => ({}),
    );
    await expect(
      guestManager.deleteEntity("e1", {} as any, "v1"),
    ).rejects.toThrow("Cannot delete entities in Guest Mode");
  });

  it("should prevent deletion in demo mode", async () => {
    uiStore.isDemoMode = true;
    await manager.deleteEntity("e1", {} as any, "v1");
    expect(uiStore.notify).toHaveBeenCalledWith(
      expect.stringContaining("disabled in Demo Mode"),
      "info",
    );
    uiStore.isDemoMode = false;
  });

  it("should delete an entity and update search index", async () => {
    vi.mocked(vaultEntities.deleteEntity).mockResolvedValue({
      entities: {},
      deletedEntity: { id: "e1" } as any,
      modifiedIds: ["other"],
    });
    mockEntities["other"] = { id: "other", title: "Other" };

    await manager.deleteEntity("e1", {} as any, "v1");

    expect(mockServices.search.remove).toHaveBeenCalledWith("e1");
  });

  it("should handle connection operations", async () => {
    vi.mocked(vaultEntities.addConnection).mockReturnValue({
      entities: { s: { id: "s", connections: [{ target: "t" }] } as any },
      updatedSource: { id: "s" } as any,
    });

    const success = await manager.addConnection("s", "t", "ref");
    expect(success).toBe(true);
    expect(vaultEntities.addConnection).toHaveBeenCalled();
  });

  it("should handle label operations", async () => {
    vi.mocked(vaultEntities.addLabel).mockReturnValue({
      entities: { e1: { id: "e1", labels: ["L1"] } as any },
      updated: { id: "e1" } as any,
    });

    await manager.addLabel("e1", "L1");
    expect(vaultEntities.addLabel).toHaveBeenCalled();
  });

  it("should handle bulk label operations", async () => {
    vi.mocked(vaultEntities.bulkAddLabel).mockReturnValue({
      entities: { e1: { id: "e1", labels: ["L1"] } as any },
      modifiedIds: ["e1"],
    });

    const count = await manager.bulkAddLabel(["e1"], "L1");
    expect(count).toBe(1);
  });

  it("should batch create entities", async () => {
    vi.mocked(vaultEntities.batchCreateEntities).mockReturnValue({
      entities: { e1: {} as any },
      created: [{ id: "e1" } as any],
    });

    await manager.batchCreateEntities([
      { title: "E1", type: "npc", initialData: {} },
    ]);
    expect(vaultEntities.batchCreateEntities).toHaveBeenCalled();
  });
});
