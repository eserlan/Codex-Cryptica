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
});
