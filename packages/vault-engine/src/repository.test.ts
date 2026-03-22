import { describe, it, expect, vi, beforeEach } from "vitest";
import { VaultRepository } from "./repository.svelte";
import type { IFileIOAdapter } from "./repository.svelte";

describe("VaultRepository", () => {
  let repository: VaultRepository;
  let mockAdapter: ReturnType<typeof vi.mocked<IFileIOAdapter>>;

  beforeEach(() => {
    mockAdapter = {
      walkDirectory: vi.fn(),
      readFileAsText: vi.fn(),
      writeEntityFile: vi.fn().mockResolvedValue(undefined),
      getCachedEntity: vi.fn().mockResolvedValue(null),
      setCachedEntity: vi.fn().mockResolvedValue(undefined),
      parseMarkdown: vi.fn(),
    } as any;

    repository = new VaultRepository(mockAdapter);
  });

  it("should initialize empty entities", () => {
    expect(repository.entities).toEqual({});
  });

  it("should load files and populate entities", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    const mockFiles = [
      {
        path: ["test1.md"],
        handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 100 }) },
      },
      {
        path: ["test2.md"],
        handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 200 }) },
      },
    ];

    mockAdapter.walkDirectory.mockResolvedValue(mockFiles as any);
    mockAdapter.readFileAsText.mockResolvedValue("mock content");
    mockAdapter.parseMarkdown
      .mockReturnValueOnce({ id: "e1", title: "Entity 1" } as any)
      .mockReturnValueOnce({ id: "e2", title: "Entity 2" } as any);

    const onProgress = vi.fn();
    const result = await repository.loadFiles(
      "vault-1",
      mockHandle,
      onProgress,
    );

    expect(result).toHaveProperty("e1");
    expect(result).toHaveProperty("e2");
    expect(repository.entities).toEqual(result);
    expect(onProgress).toHaveBeenCalled();
  });

  it("should use cached entities if lastModified matches", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    const mockFiles = [
      {
        path: ["test1.md"],
        handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 100 }) },
      },
    ];

    mockAdapter.walkDirectory.mockResolvedValue(mockFiles as any);
    mockAdapter.getCachedEntity.mockResolvedValue({
      lastModified: 100,
      entity: { id: "e1", title: "Cached Entity" } as any,
    });

    await repository.loadFiles("vault-1", mockHandle);

    expect(mockAdapter.readFileAsText).not.toHaveBeenCalled();
    expect(repository.entities["e1"].title).toBe("Cached Entity");
  });

  it("should save entity to disk", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    const mockEntity = { id: "e1", title: "Test" } as any;

    await repository.saveToDisk(mockHandle, "vault-1", mockEntity, false);

    expect(mockAdapter.writeEntityFile).toHaveBeenCalledWith(
      mockHandle,
      "vault-1",
      mockEntity,
    );
  });

  it("should skip saving to disk if guest", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    const mockEntity = { id: "e1", title: "Test" } as any;

    await repository.saveToDisk(mockHandle, "vault-1", mockEntity, true);

    expect(mockAdapter.writeEntityFile).not.toHaveBeenCalled();
  });

  it("should queue scheduled saves", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    const mockEntity = { id: "e1", title: "Test" } as any;
    const onStatusChange = vi.fn();

    // Delay the write to simulate async queue
    mockAdapter.writeEntityFile.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10)),
    );

    const savePromise = repository.scheduleSave(
      mockHandle,
      "vault-1",
      mockEntity,
      false,
      onStatusChange,
    );

    expect(onStatusChange).toHaveBeenCalledWith("saving");
    expect(repository.pendingSaveCount).toBe(1);

    await savePromise;

    expect(onStatusChange).toHaveBeenCalledWith("idle");
    expect(repository.pendingSaveCount).toBe(0);
  });

  it("should handle save errors", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    const mockEntity = { id: "e1", title: "Test" } as any;
    const onStatusChange = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockAdapter.writeEntityFile.mockRejectedValue(new Error("Write failed"));

    await repository.scheduleSave(
      mockHandle,
      "vault-1",
      mockEntity,
      false,
      onStatusChange,
    );

    expect(onStatusChange).toHaveBeenCalledWith("error");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should remove entities that no longer exist on disk", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;

    // Setup initial entities with _path
    repository.entities = {
      e1: { id: "e1", title: "E1", _path: ["e1.md"] } as any,
      e2: { id: "e2", title: "E2", _path: ["e2.md"] } as any,
      local: { id: "local", title: "Local" } as any, // No _path, should be preserved
    };

    // New scan only finds e1
    const mockFiles = [
      {
        path: ["e1.md"],
        handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 100 }) },
      },
    ];

    mockAdapter.walkDirectory.mockResolvedValue(mockFiles as any);
    mockAdapter.getCachedEntity.mockResolvedValue({
      lastModified: 100,
      entity: { id: "e1", title: "E1" } as any,
    });

    await repository.loadFiles("vault-1", mockHandle);

    expect(repository.entities).toHaveProperty("e1");
    expect(repository.entities).not.toHaveProperty("e2");
    expect(repository.entities).toHaveProperty("local");
  });

  it("should handle parseMarkdown failures", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    const mockFiles = [
      {
        path: ["bad.md"],
        handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 100 }) },
      },
    ];

    mockAdapter.walkDirectory.mockResolvedValue(mockFiles as any);
    mockAdapter.readFileAsText.mockResolvedValue("bad content");
    mockAdapter.parseMarkdown.mockReturnValue(null);

    const result = await repository.loadFiles("vault-1", mockHandle);

    expect(result).toEqual({});
  });

  it("should support .markdown extension", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    const mockFiles = [
      {
        path: ["test.markdown"],
        handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 100 }) },
      },
    ];

    mockAdapter.walkDirectory.mockResolvedValue(mockFiles as any);
    mockAdapter.getCachedEntity.mockResolvedValue({
      lastModified: 100,
      entity: { id: "e1", title: "Markdown" } as any,
    });

    await repository.loadFiles("vault-1", mockHandle);
    expect(repository.entities).toHaveProperty("e1");
  });

  it("should not overwrite newer memory entities with older disk scan results", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;

    // Memory has a newer version
    repository.entities = {
      e1: { id: "e1", title: "New", updatedAt: 200 } as any,
    };

    // Disk scan finds an older version
    const mockFiles = [
      {
        path: ["e1.md"],
        handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 100 }) },
      },
    ];

    mockAdapter.walkDirectory.mockResolvedValue(mockFiles as any);
    mockAdapter.getCachedEntity.mockResolvedValue({
      lastModified: 100,
      entity: { id: "e1", title: "Old", updatedAt: 100 } as any,
    });

    await repository.loadFiles("vault-1", mockHandle);

    expect(repository.entities["e1"].title).toBe("New");
  });

  it("should merge content and lore correctly when they are empty in scan result", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;

    // Memory has content
    repository.entities = {
      e1: {
        id: "e1",
        title: "E1",
        content: "Existing Content",
        lore: "Existing Lore",
      } as any,
    };

    // Disk scan finds entity but with empty strings (cache hit style)
    const mockFiles = [
      {
        path: ["e1.md"],
        handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 100 }) },
      },
    ];

    mockAdapter.walkDirectory.mockResolvedValue(mockFiles as any);
    mockAdapter.getCachedEntity.mockResolvedValue({
      lastModified: 100,
      entity: { id: "e1", title: "E1", content: "", lore: "" } as any,
    });

    await repository.loadFiles("vault-1", mockHandle);

    expect(repository.entities["e1"].content).toBe("Existing Content");
    expect(repository.entities["e1"].lore).toBe("Existing Lore");
  });

  it("should overwrite content and lore when scan result has new values", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    repository.entities = {
      e1: {
        id: "e1",
        title: "E1",
        content: "Old Content",
        lore: "Old Lore",
      } as any,
    };

    const mockFiles = [
      {
        path: ["e1.md"],
        handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 100 }) },
      },
    ];

    mockAdapter.walkDirectory.mockResolvedValue(mockFiles as any);
    mockAdapter.getCachedEntity.mockResolvedValue({
      lastModified: 100,
      entity: {
        id: "e1",
        title: "E1",
        content: "New Content",
        lore: "New Lore",
      } as any,
    });

    await repository.loadFiles("vault-1", mockHandle);

    expect(repository.entities["e1"].content).toBe("New Content");
    expect(repository.entities["e1"].lore).toBe("New Lore");
  });

  it("should yield when total files exceed CHUNK_SIZE", async () => {
    const mockHandle = {} as FileSystemDirectoryHandle;
    // CHUNK_SIZE is 40
    const mockFiles = Array.from({ length: 45 }, (_, i) => ({
      path: [`test${i}.md`],
      handle: { getFile: vi.fn().mockResolvedValue({ lastModified: 100 }) },
    }));

    mockAdapter.walkDirectory.mockResolvedValue(mockFiles as any);
    mockAdapter.getCachedEntity.mockResolvedValue({
      lastModified: 100,
      entity: { id: "some-id", title: "title" } as any,
    });

    const start = Date.now();
    await repository.loadFiles("vault-1", mockHandle);
    const duration = Date.now() - start;

    // Should have waited at least 50ms due to setTimeout
    expect(duration).toBeGreaterThanOrEqual(45);
  });

  it("should clear entities", () => {
    repository.entities = { e1: {} as any };
    repository.clear();
    expect(repository.entities).toEqual({});
  });

  it("should wait for all saves", async () => {
    const waitSpy = vi.spyOn(repository.saveQueue, "waitForAll");
    await repository.waitForAllSaves();
    expect(waitSpy).toHaveBeenCalled();
  });
});
