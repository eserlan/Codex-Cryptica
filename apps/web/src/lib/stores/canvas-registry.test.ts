import { beforeEach, describe, expect, it, vi } from "vitest";
import { canvasRegistry } from "./canvas-registry.svelte";
import { vaultRegistry } from "./vault-registry.svelte";
import * as vaultIO from "./vault/io";
import { getVaultDir } from "../utils/opfs";

vi.mock("./vault-registry.svelte", () => ({
  vaultRegistry: {
    rootHandle: { kind: "directory" },
    activeVaultId: "test-vault",
  },
}));

vi.mock("./ui.svelte", () => ({
  uiStore: {
    notify: vi.fn(),
    confirm: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("./vault/io", () => ({
  saveCanvasToDisk: vi.fn().mockResolvedValue(undefined),
  loadCanvasesFromDisk: vi.fn().mockResolvedValue({}),
  deleteCanvasFromDisk: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../utils/opfs", () => ({
  getVaultDir: vi
    .fn()
    .mockResolvedValue({ kind: "directory", name: "test-vault" }),
  walkOpfsDirectory: vi.fn().mockResolvedValue([]),
  deleteOpfsEntry: vi.fn().mockResolvedValue(undefined),
  writeOpfsFile: vi.fn().mockResolvedValue(undefined),
  readOpfsBlob: vi.fn().mockResolvedValue(new Blob()),
  getDirHandle: vi.fn().mockResolvedValue({ kind: "directory" }),
  isNotFoundError: vi.fn().mockReturnValue(false),
}));

// Mock confirm for deletion
vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));

describe("CanvasRegistryStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canvasRegistry.clear();
    canvasRegistry.init({
      enqueue: vi.fn((id, cb) => cb()),
    } as any);
  });

  it("should create a new canvas with proper metadata and slug", async () => {
    const name = "My New Workspace";
    const slug = await canvasRegistry.create(name);

    expect(slug).toBe("my-new-workspace");
    expect(canvasRegistry.allCanvases).toHaveLength(1);

    const canvas = canvasRegistry.allCanvases[0];
    expect(canvas.name).toBe(name);
    expect(canvas.slug).toBe(slug);
    expect(canvas.nodes).toEqual([]);
    expect(canvas.edges).toEqual([]);
    expect(canvas.id).toBeDefined();

    expect(vaultIO.saveCanvasToDisk).toHaveBeenCalled();
  });

  it("should generate unique slugs for name collisions", async () => {
    await canvasRegistry.create("Collision");
    const slug2 = await canvasRegistry.create("Collision");

    expect(slug2).toMatch(/^collision-[a-z0-9]{4}$/);
    expect(canvasRegistry.allCanvases).toHaveLength(2);
  });

  it("should persist name and slug changes during rename", async () => {
    const _originalSlug = await canvasRegistry.create("Original Name");
    const canvas = canvasRegistry.allCanvases[0];
    const id = canvas.id;

    const newSlug = await canvasRegistry.rename(id!, "Updated Name");

    expect(newSlug).toBe("updated-name");
    expect(canvasRegistry.canvases[id!].name).toBe("Updated Name");
    expect(canvasRegistry.canvases[id!].slug).toBe("updated-name");
    expect(vaultIO.saveCanvasToDisk).toHaveBeenCalledTimes(2);
  });

  it("should physically delete canvas file and remove from state", async () => {
    await canvasRegistry.create("To Delete");
    const canvas = canvasRegistry.allCanvases[0];
    const id = canvas.id;

    await canvasRegistry.delete(id!);

    expect(canvasRegistry.canvases[id!]).toBeUndefined();
    expect(canvasRegistry.allCanvases).toHaveLength(0);
    expect(vaultIO.deleteCanvasFromDisk).toHaveBeenCalled();
  });

  it("should handle creation with symbol-only names by falling back to ID", async () => {
    const slug = await canvasRegistry.create("!!!@#$%");
    expect(slug).toBeDefined();
    expect(slug?.length).toBeGreaterThan(0);
    expect(canvasRegistry.allCanvases[0].name).toBe("!!!@#$%");
  });

  it("should correctly load canvases from vault", async () => {
    const mockCanvases = {
      "id-1": {
        id: "id-1",
        name: "Loaded",
        slug: "loaded",
        nodes: [],
        edges: [],
      },
    };
    vi.mocked(vaultIO.loadCanvasesFromDisk).mockResolvedValue(mockCanvases);

    await canvasRegistry.loadFromVault("test-vault");

    expect(canvasRegistry.isLoaded).toBe(true);
    expect(canvasRegistry.canvases).toEqual(mockCanvases);
    expect(getVaultDir).toHaveBeenCalledWith(
      vaultRegistry.rootHandle,
      "test-vault",
    );
  });

  describe("addEntities", () => {
    beforeEach(async () => {
      await canvasRegistry.create("Test Canvas");
    });

    it("should add single entity to canvas", async () => {
      const canvasId = canvasRegistry.allCanvases[0].id!;
      const result = await canvasRegistry.addEntities(canvasId, ["entity-1"]);

      expect(result.added).toEqual(["entity-1"]);
      expect(result.skipped).toEqual([]);
      expect(result.errors).toEqual([]);

      const nodes = canvasRegistry.allCanvases[0].nodes;
      expect(nodes).toHaveLength(1);
      expect(nodes[0].entityId).toBe("entity-1");
      expect(nodes[0].position).toBeDefined();
    });

    it("should skip duplicate entities", async () => {
      const canvasId = canvasRegistry.allCanvases[0].id!;

      await canvasRegistry.addEntities(canvasId, ["entity-1"]);
      const result = await canvasRegistry.addEntities(canvasId, ["entity-1"]);

      expect(result.added).toEqual([]);
      expect(result.skipped).toEqual(["entity-1"]);
      expect(canvasRegistry.allCanvases[0].nodes).toHaveLength(1);
    });

    it("should handle mixed new and duplicate entities", async () => {
      const canvasId = canvasRegistry.allCanvases[0].id!;

      await canvasRegistry.addEntities(canvasId, ["entity-1"]);
      const result = await canvasRegistry.addEntities(canvasId, [
        "entity-1",
        "entity-2",
        "entity-3",
      ]);
      expect(result.added).toEqual(["entity-2", "entity-3"]);
      expect(result.skipped).toEqual(["entity-1"]);
      expect(canvasRegistry.allCanvases[0].nodes).toHaveLength(3);

      const nodes = canvasRegistry.allCanvases[0].nodes;
      expect(nodes.map((n) => n.entityId)).toEqual([
        "entity-1",
        "entity-2",
        "entity-3",
      ]);

      // Verify spread (entity-2 and entity-3 should have different positions)
      expect(nodes[1].position).not.toEqual(nodes[2].position);
      expect(nodes[1].position.x).toBe(400 + (1 % 3) * 250);
      expect(nodes[2].position.x).toBe(400 + (2 % 3) * 250);
    });
    it("should return error for non-existent canvas", async () => {
      const result = await canvasRegistry.addEntities("non-existent-id", [
        "entity-1",
      ]);

      expect(result.added).toEqual([]);
      expect(result.skipped).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe("Canvas not found");
    });

    it("should return empty result for empty entityIds array", async () => {
      const canvasId = canvasRegistry.allCanvases[0].id!;
      const result = await canvasRegistry.addEntities(canvasId, []);

      expect(result.added).toEqual([]);
      expect(result.skipped).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it("should report invalid entity IDs in errors", async () => {
      const canvasId = canvasRegistry.allCanvases[0].id!;
      const result = await canvasRegistry.addEntities(canvasId, [
        "valid-id",
        "",
        "   ",
      ]);

      expect(result.added).toEqual(["valid-id"]);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.map((e) => e.error)).toContain("Invalid entity ID");
    });

    it("should update lastModified timestamp", async () => {
      const canvasId = canvasRegistry.allCanvases[0].id!;
      const before = canvasRegistry.allCanvases[0].lastModified || 0;

      await new Promise((resolve) => setTimeout(resolve, 10));
      await canvasRegistry.addEntities(canvasId, ["entity-1"]);

      const after = canvasRegistry.allCanvases[0].lastModified || 0;
      expect(after).toBeGreaterThan(before);
    });
  });

  describe("createCanvas with entities", () => {
    it("should create canvas with entities", async () => {
      const result = await canvasRegistry.createCanvas([
        "entity-1",
        "entity-2",
      ]);

      expect(result).not.toBeNull();
      expect(result?.name).toBe("2 entities");
      const nodes = canvasRegistry.allCanvases[0].nodes;
      expect(nodes.map((n) => n.entityId)).toEqual(["entity-1", "entity-2"]);

      // Verify spread
      expect(nodes[0].position.x).toBe(400);
      expect(nodes[1].position.x).toBe(400 + 250);
    });

    it("should deduplicate entities in createCanvas", async () => {
      const result = await canvasRegistry.createCanvas([
        "entity-1",
        "entity-1",
        "entity-2",
      ]);

      expect(result).not.toBeNull();
      expect(
        canvasRegistry.allCanvases[0].nodes.map((n) => n.entityId),
      ).toEqual(["entity-1", "entity-2"]);
    });

    it("should use custom title if provided", async () => {
      const result = await canvasRegistry.createCanvas(
        ["entity-1"],
        "My Custom Canvas",
      );

      expect(result?.name).toBe("My Custom Canvas");
    });

    it("should return null for empty entityIds", async () => {
      const result = await canvasRegistry.createCanvas([]);
      expect(result).toBeNull();
    });

    it("should use singular 'entity' for single entity", async () => {
      const result = await canvasRegistry.createCanvas(["entity-1"]);
      expect(result?.name).toBe("1 entity");
    });
  });
});
