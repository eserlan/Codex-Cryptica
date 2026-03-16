import { beforeEach, describe, expect, it, vi } from "vitest";

// Fix Worker is not defined
class MockWorker {
  constructor() {}
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}
vi.stubGlobal("Worker", MockWorker);

vi.mock("../workers/search.worker?worker", () => ({
  default: MockWorker,
}));

vi.mock("./vault-registry.svelte", () => {
  const mockDirHandle: any = {
    kind: "directory",
    getFileHandle: vi.fn().mockResolvedValue({
      getFile: vi.fn().mockResolvedValue({ text: () => "{}" }),
    }),
    entries: vi.fn().mockReturnValue({
      [Symbol.asyncIterator]() {
        return {
          next() {
            return Promise.resolve({ done: true });
          },
        };
      },
    }),
  };
  mockDirHandle.getDirectoryHandle = vi.fn().mockResolvedValue(mockDirHandle);

  return {
    vaultRegistry: {
      init: vi.fn().mockResolvedValue(undefined),
      rootHandle: mockDirHandle,
      activeVaultId: "test-vault",
      setActiveVault: vi.fn().mockResolvedValue(undefined),
      listVaults: vi.fn().mockResolvedValue([]),
      vaults: [],
    },
  };
});

vi.mock("./theme.svelte", () => ({
  themeStore: {
    loadForVault: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("./vault/migration", () => ({
  checkForMigration: vi.fn().mockResolvedValue({ required: false }),
  runMigration: vi.fn().mockResolvedValue(undefined),
  migrateStructure: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../services/search", () => ({
  searchService: {
    index: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../services/ai", () => ({
  contextRetrievalService: {
    clearStyleCache: vi.fn(),
    retrieveContext: vi.fn(),
  },
  textGenerationService: {
    generateResponse: vi.fn(),
  },
  imageGenerationService: {
    generateImage: vi.fn(),
  },
}));

vi.mock("../utils/idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    transaction: vi.fn().mockReturnValue({
      store: {
        index: vi.fn().mockReturnValue({
          openCursor: vi.fn().mockResolvedValue(null),
        }),
      },
      done: Promise.resolve(),
    }),
  }),
  getPersistedHandle: vi.fn().mockResolvedValue(null),
  clearPersistedHandle: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../services/cache", () => ({
  cacheService: {
    preloadVault: vi.fn().mockResolvedValue(undefined),
    getPreloadedEntities: vi.fn().mockReturnValue([]),
    getEntityContent: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("./vault/adapters", () => ({
  fileIOAdapter: {},
  syncIOAdapter: {
    getLocalHandle: vi.fn().mockResolvedValue(null),
  },
  syncNotifier: {},
  assetIOAdapter: {},
  imageProcessor: {},
  createSyncEngine: vi.fn(),
}));

vi.mock("../utils/opfs", () => ({
  readFileAsText: vi.fn(),
  writeOpfsFile: vi.fn(),
  walkOpfsDirectory: vi.fn(),
  getDirHandle: vi.fn(),
  getVaultDir: vi.fn().mockResolvedValue({}),
  isNotFoundError: vi.fn(),
  deleteOpfsEntry: vi.fn(),
}));

import { VaultStore } from "./vault.svelte";
import { cacheService } from "../services/cache";
import { readFileAsText } from "../utils/opfs";

describe("VaultStore (OPFS)", () => {
  let testVault: VaultStore;
  let mockRepository: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockRepository = {
      entities: {},
      loadFiles: vi.fn(),
      scheduleSave: vi.fn(),
      clear: vi.fn(),
      saveQueue: { totalPendingCount: 0 },
    };

    testVault = new VaultStore(mockRepository);
  });

  it("should initialize and load files from OPFS", async () => {
    mockRepository.loadFiles.mockImplementation(async () => {
      const entities = {
        test: { id: "test", title: "Test", type: "note" } as any,
      };
      mockRepository.entities = entities;
      return entities;
    });

    await testVault.init();

    expect(mockRepository.loadFiles).toHaveBeenCalled();
    expect(Object.keys(testVault.entities).length).toBe(1);
    expect(testVault.entities["test"]?.title).toBe("Test");
  });

  it("should support incremental loading via onProgress callback", async () => {
    mockRepository.loadFiles.mockImplementation(
      async (_vid: any, _handle: any, onProgress: any) => {
        if (onProgress) {
          onProgress(
            { chunk1: { id: "chunk1", title: "Chunk 1" } as any },
            1,
            2,
            {},
          );
          onProgress(
            { chunk2: { id: "chunk2", title: "Chunk 2" } as any },
            2,
            2,
            {},
          );
        }
        const entities = {
          chunk1: { id: "chunk1", title: "Chunk 1" } as any,
          chunk2: { id: "chunk2", title: "Chunk 2" } as any,
        };
        mockRepository.entities = entities;
        return entities;
      },
    );

    await testVault.init();

    expect(Object.keys(testVault.entities)).toHaveLength(2);
  });

  it("should create a new entity in OPFS", async () => {
    mockRepository.scheduleSave.mockResolvedValue(undefined);
    await testVault.createEntity("character", "New Character");
    expect(Object.keys(testVault.entities)).toHaveLength(1);
    expect(testVault.entities["new-character"]?.title).toBe("New Character");
  });

  it("should return early in syncToLocal if not initialized", async () => {
    testVault.syncCoordinator = null;
    const result = await testVault.syncToLocal();
    expect(result).toBeUndefined();
  });

  it("should load content via tiered strategy (Cache -> OPFS)", async () => {
    const entityId = "test-hero";
    const cachedChronicle = "Cached Chronicle Content";
    const opfsMarkdown = "---\nlore: Deep Mythos\n---\nFresh Chronicle Content";

    // Initial state: metadata only
    mockRepository.entities = {
      [entityId]: { id: entityId, title: "Hero", content: "" } as any,
    };

    // Tier 1: Cache hit
    vi.mocked(cacheService.getEntityContent).mockResolvedValue(cachedChronicle);

    // Tier 2: OPFS hit
    vi.mocked(readFileAsText).mockResolvedValue(opfsMarkdown);

    await testVault.loadEntityContent(entityId);

    // Verify Tier 1 applied immediately (though we await the whole function here)
    // Verify Tier 2 applied and combined lore
    const updated = testVault.entities[entityId];
    expect(updated?.content).toBe("Fresh Chronicle Content");
    expect(updated?.lore).toBe("Deep Mythos");

    // Verify cache was updated with fresh content
    expect(cacheService.set).toHaveBeenCalled();
  });
});
