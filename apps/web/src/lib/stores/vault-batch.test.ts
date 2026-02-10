import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Svelte 5 Runes
vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.snapshot = (v: any) => v;
  (global as any).$derived = (v: any) => v;
  (global as any).$derived.by = (v: any) => v;
  (global as any).$effect = (v: any) => v;
});

// Mock worker and bridge to prevent alias resolution issues
vi.mock("../cloud-bridge/worker-bridge", () => ({
  workerBridge: {
    reset: vi.fn(),
    send: vi.fn(),
  },
}));

vi.mock("./oracle.svelte", () => ({
  oracle: {
    clearMessages: vi.fn(),
    messages: [],
    tier: "lite",
    apiKey: null,
  },
}));

vi.mock("./graph.svelte", () => ({
  graph: {
    requestFit: vi.fn(),
  },
}));

import { vault } from "./vault.svelte";
import * as fsUtils from "../utils/fs";
import { searchService } from "../services/search";

// Mock dependencies
vi.mock("../utils/fs", () => ({
  walkDirectory: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("../services/search", () => ({
  searchService: {
    index: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    init: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock global window and document for Image/Canvas
global.window = global.window || {};
global.document = global.document || { createElement: vi.fn() };

describe("VaultStore - Batch Operations", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await vault.close();

    // Mock showDirectoryPicker for all tests
    global.window.showDirectoryPicker = vi.fn().mockResolvedValue({
      getDirectoryHandle: vi.fn().mockResolvedValue({}),
      requestPermission: vi.fn().mockResolvedValue("granted"),
      queryPermission: vi.fn().mockResolvedValue("granted"),
      name: "test-vault",
    } as any);
  });

  it("should create multiple entities in a single batch", async () => {
    const mockFileHandle = {
      createWritable: vi
        .fn()
        .mockResolvedValue({ write: vi.fn(), close: vi.fn() }),
    };
    // Ensure the mockRootHandle used by openDirectory can return this mockFileHandle
    global.window.showDirectoryPicker = vi.fn().mockResolvedValue({
      getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
    } as any);

    await vault.openDirectory();

    const entitiesData = [
      {
        type: "character" as const,
        title: "Hero A",
        initialData: { content: "Content A" },
      },
      {
        type: "location" as const,
        title: "Place B",
        initialData: { content: "Content B" },
      },
    ];

    const ids = await vault.batchCreateEntities(entitiesData);

    expect(ids).toEqual(["hero-a", "place-b"]);
    expect(Object.keys(vault.entities)).toHaveLength(2);
    expect(vault.entities["hero-a"]?.title).toBe("Hero A");
    expect(vault.entities["place-b"]?.title).toBe("Place B");

    // Verify file writes
    expect(fsUtils.writeFile).toHaveBeenCalledTimes(2);

    // Verify search indexing
    expect(searchService.index).toHaveBeenCalledTimes(2);
  });

  it("should skip duplicate entities during batch creation", async () => {
    const mockFileHandle = {
      createWritable: vi
        .fn()
        .mockResolvedValue({ write: vi.fn(), close: vi.fn() }),
    };
    global.window.showDirectoryPicker = vi.fn().mockResolvedValue({
      getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
    } as any);
    await vault.openDirectory();

    // Pre-existing entity
    vault.entities["existing"] = {
      id: "existing",
      title: "Existing",
      connections: [],
    } as any;

    const entitiesData = [
      { type: "character" as const, title: "Existing" },
      { type: "character" as const, title: "New One" },
    ];

    const ids = await vault.batchCreateEntities(entitiesData);

    expect(ids).toEqual(["new-one"]);
    expect(Object.keys(vault.entities)).toHaveLength(2); // existing + new-one
    expect(fsUtils.writeFile).toHaveBeenCalledTimes(1);
  });

  it("should rebuild inbound map after batch creation", async () => {
    const mockFileHandle = {
      createWritable: vi
        .fn()
        .mockResolvedValue({ write: vi.fn(), close: vi.fn() }),
    };
    global.window.showDirectoryPicker = vi.fn().mockResolvedValue({
      getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
    } as any);
    await vault.openDirectory();

    const entitiesData = [
      {
        type: "character" as const,
        title: "Source",
        initialData: {
          connections: [{ target: "target", type: "related_to", strength: 1 }],
        },
      },
      { type: "character" as const, title: "Target" },
    ];

    await vault.batchCreateEntities(entitiesData);

    expect(vault.inboundConnections["target"]).toBeDefined();
    expect(vault.inboundConnections["target"]).toHaveLength(1);
    expect(vault.inboundConnections["target"][0].sourceId).toBe("source");
  });
});
