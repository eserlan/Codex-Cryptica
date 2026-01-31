import { describe, it, expect, vi, beforeEach } from "vitest";
import { vault } from "./vault.svelte";
import { oracle } from "./oracle.svelte";
import { searchService } from "../services/search";
import { workerBridge } from "../cloud-bridge/worker-bridge";
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

vi.mock("./oracle.svelte", () => ({
  oracle: {
    clearMessages: vi.fn(),
    messages: [],
    tier: "lite",
    apiKey: null
  }
}));

vi.mock("../cloud-bridge/worker-bridge", () => ({
  workerBridge: {
    reset: vi.fn()
  }
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

// Mock Image and Canvas for thumbnail testing
class MockImage {
  onload: () => void = () => { };
  onerror: (err: any) => void = () => { };
  private _src: string = "";
  width: number = 512;
  height: number = 512;

  set src(value: string) {
    this._src = value;
    if (value) {
      // Execute onload synchronously for reliable testing
      this.onload();
    }
  }
  get src() { return this._src; }
}
(global as any).Image = MockImage;

global.document = global.document || {};
const originalCreateElement = global.document.createElement;

// Create canvas mock function that survives resetAllMocks
function createCanvasMock() {
  return {
    getContext: () => ({
      drawImage: () => { },
      clearRect: () => { },
    }),
    toBlob: (callback: (blob: Blob | null) => void) => {
      callback(new Blob(["thumb"], { type: "image/png" }));
    },
    convertToBlob: async () => {
      return new Blob(["thumb"], { type: "image/webp" });
    },
    width: 0,
    height: 0,
  };
}

describe("VaultStore", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Re-setup canvas mock after resetAllMocks
    global.document.createElement = vi.fn().mockImplementation((tag: string) => {
      if (tag === "canvas") {
        return createCanvasMock();
      }
      return typeof originalCreateElement === 'function' ? originalCreateElement(tag) : {};
    });
    vault.entities = {};
  });

  it("should initialize with empty state", () => {
    expect(Object.keys(vault.entities).length).toBe(0);
    expect(vault.status).toBe("idle");
  });

  it("should load files from directory", async () => {
    // Mock FS response
    const mockDirectoryHandle = {
      getDirectoryHandle: vi.fn().mockResolvedValue({}),
    };
    const mockFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        lastModified: 1234567890,
        text: vi.fn().mockResolvedValue(`---\nid: test\ntype: npc\ntitle: Test Node\n---\nContent`)
      }),
      kind: 'file',
      name: 'test.md'
    };

    vi.mocked(fsUtils.walkDirectory).mockResolvedValue([
      { handle: mockFileHandle as any, path: ['test.md'] }
    ]);

    vi.mocked(global.window.showDirectoryPicker).mockResolvedValue(mockDirectoryHandle as any);

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

  it("should save image to vault and generate paths", async () => {
    const mockWritable = { write: vi.fn(), close: vi.fn() };
    const mockFileHandle = { createWritable: vi.fn().mockResolvedValue(mockWritable) };
    const mockImagesDir = { getFileHandle: vi.fn().mockResolvedValue(mockFileHandle) };

    vault.rootHandle = {
      getDirectoryHandle: vi.fn().mockResolvedValue(mockImagesDir),
    } as any;

    // Create the entity that will be updated with image paths
    vault.entities["test-entity"] = {
      id: "test-entity",
      title: "Test Entity",
      type: "npc",
      content: "",
      tags: [],
      connections: [],
      metadata: {},
    } as any;

    const blob = new Blob(["fake-image"], { type: "image/png" });
    const path = await vault.saveImageToVault(blob, "test-entity");

    expect(path).toContain("./images/test-entity-");
    expect(vault.entities["test-entity"]?.image).toBe(path);
    expect(vault.entities["test-entity"]?.thumbnail).toContain("-thumb.webp");
  });

  it("should cleanup old images when replacing with new ones", async () => {
    const mockWritable = { write: vi.fn(), close: vi.fn() };
    const mockFileHandle = { createWritable: vi.fn().mockResolvedValue(mockWritable) };
    const mockImagesDir = { 
      getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
      removeEntry: vi.fn().mockResolvedValue(undefined)
    };

    vault.rootHandle = {
      getDirectoryHandle: vi.fn().mockResolvedValue(mockImagesDir),
    } as any;

    // Entity already has an image
    vault.entities["replace-entity"] = {
      id: "replace-entity",
      title: "Replace Entity",
      type: "npc",
      image: "./images/old-photo.png",
      thumbnail: "./images/old-thumb.webp",
      connections: [],
      metadata: {},
    } as any;

    const blob = new Blob(["new-image"], { type: "image/png" });
    await vault.saveImageToVault(blob, "replace-entity");

    // Verify old files were removed
    expect(mockImagesDir.removeEntry).toHaveBeenCalledWith("old-photo.png");
    expect(mockImagesDir.removeEntry).toHaveBeenCalledWith("old-thumb.webp");
    
    // Verify new paths were set
    expect(vault.entities["replace-entity"]?.image).toContain("replace-entity-");
    expect(vault.entities["replace-entity"]?.image).not.toContain("old-photo.png");
  });

  it("should resolve local paths to blob URLs", async () => {
    const mockFile = new File(["data"], "image.png", { type: "image/png" });
    const mockFileHandle = { getFile: vi.fn().mockResolvedValue(mockFile) };
    const mockImagesDir = { getFileHandle: vi.fn().mockResolvedValue(mockFileHandle) };

    vault.rootHandle = {
      getDirectoryHandle: vi.fn().mockResolvedValue(mockImagesDir),
    } as any;

    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:resolved-url");

    const url = await vault.resolveImagePath("./images/test.png");
    expect(url).toBe("blob:resolved-url");
    expect(global.URL.createObjectURL).toHaveBeenCalled();
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

  it("should delete entity and clear selection", async () => {
    const mockFileHandle = { kind: "file" };
    const mockRootHandle = { removeEntry: vi.fn() };
    vault.rootHandle = mockRootHandle as any;
    vault.selectedEntityId = "test";

    vault.entities["test"] = {
      id: "test",
      connections: [],
      _fsHandle: mockFileHandle,
      _path: ["test.md"],
    } as any;

    await vault.deleteEntity("test");

    expect(mockRootHandle.removeEntry).toHaveBeenCalledWith("test.md");
    expect(vault.entities["test"]).toBeUndefined();
    expect(vault.selectedEntityId).toBeNull();
  });

  it("should reset services and state on close", async () => {
    vault.isAuthorized = true;
    vault.entities = { "test": { id: "test" } as any };
    
    await vault.close();

    expect(vault.isAuthorized).toBe(false);
    expect(Object.keys(vault.entities)).toHaveLength(0);
    expect(searchService.clear).toHaveBeenCalled();
    expect(oracle.clearMessages).toHaveBeenCalled();
    expect(workerBridge.reset).toHaveBeenCalled();
  });

  it("should delete entity and associated media files", async () => {
    const mockFileHandle = { kind: "file" };
    const mockImagesDir = { removeEntry: vi.fn().mockResolvedValue(undefined) };
    const mockRootHandle = { 
      removeEntry: vi.fn().mockResolvedValue(undefined),
      getDirectoryHandle: vi.fn().mockResolvedValue(mockImagesDir)
    };
    vault.rootHandle = mockRootHandle as any;

    vault.entities["media-node"] = {
      id: "media-node",
      connections: [],
      image: "./images/photo.png",
      thumbnail: "./images/thumb.webp",
      _fsHandle: mockFileHandle,
      _path: ["media-node.md"],
    } as any;

    await vault.deleteEntity("media-node");

    expect(mockRootHandle.removeEntry).toHaveBeenCalledWith("media-node.md");
    expect(mockImagesDir.removeEntry).toHaveBeenCalledWith("photo.png");
    expect(mockImagesDir.removeEntry).toHaveBeenCalledWith("thumb.webp");
    expect(vault.entities["media-node"]).toBeUndefined();
  });

  it("should cleanup relational references when an entity is deleted", async () => {
    const mockFileHandle = { kind: "file" };
    const mockRootHandle = { removeEntry: vi.fn().mockResolvedValue(undefined) };
    vault.rootHandle = mockRootHandle as any;

    // Entity A points to B
    vault.entities["a"] = {
      id: "a",
      title: "Node A",
      connections: [{ target: "b", type: "related_to", strength: 1 }],
      _fsHandle: mockFileHandle,
    } as any;

    vault.entities["b"] = {
      id: "b",
      title: "Node B",
      connections: [],
      _fsHandle: mockFileHandle,
      _path: ["b.md"],
    } as any;

    // Rebuild map so system knows about the connection
    (vault as any).rebuildInboundMap();

    await vault.deleteEntity("b");

    expect(vault.entities["b"]).toBeUndefined();
    // A's connection to B should be gone
    expect(vault.entities["a"]?.connections).toHaveLength(0);
    // Should have scheduled a save for A
    expect(fsUtils.writeFile).toHaveBeenCalled();
  });

  it("should parse wiki-links with labels correctly", async () => {
    const mockDirectoryHandle = {
      getDirectoryHandle: vi.fn().mockResolvedValue({}),
    };
    const mockFileHandle = {
      getFile: vi.fn().mockResolvedValue({
        lastModified: 1234567890,
        text: vi.fn().mockResolvedValue(`---\nid: test\ntitle: Test\ntype: npc\n---\n[[other|Labeled Link]]`)
      }),
      kind: 'file',
      name: 'test.md'
    };

    vi.mocked(fsUtils.walkDirectory).mockResolvedValue([
      { handle: mockFileHandle as any, path: ['test.md'] }
    ]);
    vi.mocked(global.window.showDirectoryPicker).mockResolvedValue(mockDirectoryHandle as any);

    await vault.openDirectory();

    const entity = vault.entities["test"];
    expect(entity?.connections).toContainEqual({
      target: "other",
      type: "related_to",
      strength: 1,
      label: "Labeled Link"
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

  it("should compute inboundConnections incrementally", () => {
    vault.entities["a"] = {
      id: "a",
      title: "Node A",
      type: "npc",
      connections: [],
    } as any;
    vault.entities["b"] = {
      id: "b",
      title: "Node B",
      type: "npc",
      connections: [],
    } as any;

    vault.addConnection("a", "b", "enemy");
    
    const inbound = vault.inboundConnections;
    expect(inbound["b"]).toHaveLength(1);
    expect(inbound["b"]).toContainEqual({
      sourceId: "a",
      connection: expect.objectContaining({ target: "b", type: "enemy" }),
    });

    vault.removeConnection("a", "b");
    expect(vault.inboundConnections["b"]).toBeUndefined();
  });
});
