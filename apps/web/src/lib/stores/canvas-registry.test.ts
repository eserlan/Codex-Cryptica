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

    const newSlug = await canvasRegistry.rename(id, "Updated Name");

    expect(newSlug).toBe("updated-name");
    expect(canvasRegistry.canvases[id].name).toBe("Updated Name");
    expect(canvasRegistry.canvases[id].slug).toBe("updated-name");
    expect(vaultIO.saveCanvasToDisk).toHaveBeenCalledTimes(2);
  });

  it("should physically delete canvas file and remove from state", async () => {
    await canvasRegistry.create("To Delete");
    const canvas = canvasRegistry.allCanvases[0];
    const id = canvas.id;

    await canvasRegistry.delete(id);

    expect(canvasRegistry.canvases[id]).toBeUndefined();
    expect(canvasRegistry.allCanvases).toHaveLength(0);
    expect(vaultIO.deleteCanvasFromDisk).toHaveBeenCalled();
  });

  it("should handle creation with symbol-only names by falling back to ID", async () => {
    const slug = await canvasRegistry.create("!!!@#$%");
    expect(slug).toBeDefined();
    expect(slug!.length).toBeGreaterThan(0);
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
});
