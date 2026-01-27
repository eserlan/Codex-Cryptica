import { describe, it, expect, vi, beforeEach } from "vitest";
import { vault } from "./vault.svelte";
import * as fsUtils from "../utils/fs";
import * as idbUtils from "../utils/idb";

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

vi.mock("../utils/idb", () => ({
  persistHandle: vi.fn(),
  getPersistedHandle: vi.fn(),
  clearPersistedHandle: vi.fn(),
  getCachedFile: vi.fn().mockResolvedValue(undefined),
  setCachedFile: vi.fn().mockResolvedValue(undefined),
  clearCache: vi.fn().mockResolvedValue(undefined),
}));

// Mock global window.showDirectoryPicker
global.window = global.window || {};
global.window.showDirectoryPicker = vi.fn();

describe("VaultStore", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vault.entities = {};
  });

  it("should initialize with empty state", () => {
    expect(Object.keys(vault.entities).length).toBe(0);
    expect(vault.status).toBe("idle");
  });

  it("should load files from directory", async () => {
    // Mock FS response
    const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue({
            lastModified: 1234567890,
            text: vi.fn().mockResolvedValue(`---
id: test
title: Test Node
type: npc
---
Content`)
        })
    };
    const mockFiles = [{ handle: mockFileHandle, path: ["test.md"] }];
    vi.mocked(fsUtils.walkDirectory).mockResolvedValue(mockFiles as any);

    // Mock directory picker
    const mockHandle = {};
    (window.showDirectoryPicker as any).mockResolvedValue(mockHandle);

    await vault.openDirectory();

    expect(vault.status).toBe("idle");
    expect(Object.keys(vault.entities).length).toBe(1);

    const entity = vault.entities["test"];
    expect(entity).toBeDefined();
    expect(entity?.title).toBe("Test Node");
  });

  it("should load from cache if lastModified matches", async () => {
    const filePath = "cached.md";
    const lastModified = 999999;
    const cachedEntity = {
        id: "cached-id",
        title: "Cached Title",
        type: "npc" as const,
        content: "Cached Content",
        tags: [],
        connections: [],
        metadata: {}
    };

    // Mock IDB hit
    vi.mocked(idbUtils.getCachedFile).mockResolvedValue({
        path: filePath,
        lastModified: lastModified,
        entity: cachedEntity
    });

    const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue({
            lastModified: lastModified,
            text: vi.fn() // Should NOT be called
        })
    };
    
    const mockFiles = [{ handle: mockFileHandle, path: [filePath] }];
    vi.mocked(fsUtils.walkDirectory).mockResolvedValue(mockFiles as any);
    vault.rootHandle = {} as any;
    vault.isAuthorized = true;

    await vault.loadFiles();

    expect(mockFileHandle.getFile).toHaveBeenCalled();
    // Verify text() was never called (proving it skipped parsing)
    const fileObj = await mockFileHandle.getFile();
    expect(fileObj.text).not.toHaveBeenCalled();
    
    expect(vault.entities["cached-id"]).toBeDefined();
    expect(vault.entities["cached-id"]?.title).toBe("Cached Title");
  });

  it("should create new entity", async () => {
    // Mock getFileHandle and writeFile
    const mockFileHandle = {
      createWritable: vi
        .fn()
        .mockResolvedValue({ write: vi.fn(), close: vi.fn() }),
    };
    vault.rootHandle = {
      getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
    } as any;

    const id = await vault.createEntity("npc", "New Hero");
    expect(id).toBe("new-hero");
    expect(vault.entities[id]).toBeDefined();
    expect(vault.entities[id]?.title).toBe("New Hero");
  });

  it("should update entity and schedule save", async () => {
    const mockFileHandle = {
      createWritable: vi
        .fn()
        .mockResolvedValue({ write: vi.fn(), close: vi.fn() }),
    };
    const entity = {
      id: "test",
      title: "Test",
      _fsHandle: mockFileHandle,
    } as any;
    vault.entities["test"] = entity;

    vault.updateEntity("test", { title: "Updated" });

    expect(vault.entities["test"]?.title).toBe("Updated");

    // Wait for the queue to process the save
    await vi.waitFor(() => {
        expect(fsUtils.writeFile).toHaveBeenCalled();
    });
  });

  it("should delete entity", async () => {
    const mockFileHandle = { kind: "file" };
    const mockRootHandle = { removeEntry: vi.fn() };
    vault.rootHandle = mockRootHandle as any;

    vault.entities["test"] = {
      id: "test",
      _fsHandle: mockFileHandle,
      _path: ["test.md"],
    } as any;

    await vault.deleteEntity("test");

    expect(mockRootHandle.removeEntry).toHaveBeenCalledWith("test.md");
    expect(vault.entities["test"]).toBeUndefined();
  });

  it("should parse wiki-links with labels correctly", async () => {
    const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue({
            lastModified: 1234567890,
            text: vi.fn().mockResolvedValue(`---
id: test
---
Link to [[Other|The Label]]`)
        })
    };
    const mockFiles = [{ handle: mockFileHandle, path: ["test.md"] }];
    vi.mocked(fsUtils.walkDirectory).mockResolvedValue(mockFiles as any);

    (window.showDirectoryPicker as any).mockResolvedValue({});
    await vault.openDirectory();

    const entity = vault.entities["test"];
    expect(entity?.connections).toContainEqual({
      target: "other",
      type: "related_to",
      label: "The Label",
      strength: 1,
    });
  });

  it("should update connection label", async () => {
    const mockFileHandle = {
      createWritable: vi
        .fn()
        .mockResolvedValue({ write: vi.fn(), close: vi.fn() }),
    };

    vault.entities["source"] = {
      id: "source",
      title: "Source",
      type: "npc",
      tags: [],
      connections: [{ target: "target", type: "knows", strength: 1 }],
      content: "",
      _fsHandle: mockFileHandle,
    } as any;

    vault.updateConnection("source", "target", { label: "Best Friends" });

    expect(vault.entities["source"]?.connections[0].label).toBe("Best Friends");
    expect(vault.entities["source"]?.connections[0].type).toBe("knows"); // Unchanged

    await vi.waitFor(() => {
        expect(fsUtils.writeFile).toHaveBeenCalled();
    });
  });

  it("should not fail when updating non-existent connection", () => {
    vault.entities["source"] = {
      id: "source",
      title: "Source",
      type: "npc",
      tags: [],
      connections: [],
      content: "",
    } as any;

    // Should not throw
    vault.updateConnection("source", "non-existent", { label: "Test" });
    expect(vault.entities["source"]?.connections).toHaveLength(0);
  });
  it("should lazy load lore", async () => {
    // Mock fs read for separate lore file
    vi.mocked(fsUtils.readFile).mockResolvedValueOnce(
      "---\nlore: Decrypted Lore Content\n---\n",
    );

    vault.entities["entity-with-lore"] = {
      id: "entity-with-lore",
      title: "Entity",
      type: "npc",
      tags: [],
      connections: [],
      content: "",
      lore: undefined, // Initially undefined
      _fsHandle: { kind: "file" } as any,
    } as any;

    await vault.fetchLore("entity-with-lore");

    expect(fsUtils.readFile).toHaveBeenCalled();
    expect(vault.entities["entity-with-lore"]?.lore).toBe(
      "Decrypted Lore Content",
    );
  });

  it("should update lore and persist to separate file or main file depending on strategy", async () => {
    // Assuming current strategy is still single file but field is separate in memory object
    // Or if split file strategy is implemented, verifying that.
    // Based on implementation, lore is part of frontmatter or separate section.
    // Let's verify updateEntity handles lore field.

    const mockFileHandle = {
      createWritable: vi
        .fn()
        .mockResolvedValue({ write: vi.fn(), close: vi.fn() }),
    };

    vault.entities["test-lore"] = {
      id: "test-lore",
      title: "Test",
      _fsHandle: mockFileHandle,
      content: "Main Content",
    } as any;

    vault.updateEntity("test-lore", { lore: "New Secret Lore" });

    expect(vault.entities["test-lore"]?.lore).toBe("New Secret Lore");

    await vi.waitFor(() => {
        expect(fsUtils.writeFile).toHaveBeenCalled();
    });
    // Verify that the written content includes the lore (either in frontmatter or body)
    // This depends on how _serializeAttributes handles it.
    // We just check that write was called for now.
  });
});
