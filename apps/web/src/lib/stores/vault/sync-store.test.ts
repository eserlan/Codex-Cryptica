import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockOpfs } from "../../../tests/mocks/storage";
import { cacheService } from "../../services/cache.svelte";
import { SyncStore } from "./sync-store.svelte";

vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.raw = (v: any) => v;
});

vi.mock("../../services/cache.svelte", () => ({
  cacheService: {
    preloadVault: vi.fn(),
    getPreloadedEntities: vi.fn(),
    getEntityContent: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock("./adapters.svelte", () => ({
  fileIOAdapter: {
    walkDirectory: vi.fn(),
  },
}));

describe("SyncStore", () => {
  let store: SyncStore;
  let repository: {
    entities: Record<string, any>;
    loadFiles: ReturnType<typeof vi.fn>;
    waitForAllSaves: ReturnType<typeof vi.fn>;
  };
  const opfsHandle = createMockOpfs();

  beforeEach(() => {
    vi.clearAllMocks();

    repository = {
      entities: {},
      loadFiles: vi.fn().mockResolvedValue(undefined),
      waitForAllSaves: vi.fn().mockResolvedValue(undefined),
    };

    store = new SyncStore({
      activeVaultId: () => "vault-1",
      repository: repository as any,
      getSyncCoordinator: vi.fn().mockResolvedValue(null),
      getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
      getActiveSyncHandle: vi.fn().mockResolvedValue(null),
      ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
      loadMaps: vi.fn().mockResolvedValue(undefined),
      loadCanvases: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("loads cached entities and skips the full filesystem sync when the cache is warm", async () => {
    vi.mocked(cacheService.preloadVault).mockResolvedValue(
      new Map([
        [
          "hero-1",
          {
            lastModified: Date.now(),
            entity: {
              id: "hero-1",
              title: "Cached Hero",
              content: "Cached Content",
              lore: "Cached Lore",
              type: "character",
              tags: [],
              labels: [],
              connections: [],
            },
          },
        ],
      ]),
    );

    await store.loadFiles(true);

    expect(repository.entities["hero-1"]).toMatchObject({
      id: "hero-1",
      title: "Cached Hero",
      content: "Cached Content",
      lore: "Cached Lore",
    });
    expect(repository.loadFiles).not.toHaveBeenCalled();
    expect((store as any).status).toBe("idle");
  });

  it("detects conflict files in the vault", async () => {
    const { fileIOAdapter } = await import("./adapters.svelte");
    vi.mocked(fileIOAdapter.walkDirectory).mockResolvedValue([
      {
        path: ["notes", "hero.conflict-1.md"],
        handle: { kind: "file", getFile: vi.fn() },
      } as any,
    ]);

    await store.checkForConflicts();

    expect((store as any).hasConflictFiles).toBe(true);
  });

  it("cleans up conflict files through the sync coordinator", async () => {
    const cleanupConflictFiles = vi.fn().mockResolvedValue(undefined);
    store = new SyncStore({
      activeVaultId: () => "vault-1",
      repository: repository as any,
      getSyncCoordinator: vi.fn().mockResolvedValue({
        cleanupConflictFiles,
      } as any),
      getActiveVaultHandle: vi.fn().mockResolvedValue(opfsHandle),
      getActiveSyncHandle: vi.fn().mockResolvedValue(null),
      ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
      loadMaps: vi.fn().mockResolvedValue(undefined),
      loadCanvases: vi.fn().mockResolvedValue(undefined),
    });

    await store.cleanupConflictFiles();

    expect(cleanupConflictFiles).toHaveBeenCalledWith(
      "vault-1",
      opfsHandle,
      expect.any(Function),
      expect.any(Function),
      undefined,
    );
  });
});
