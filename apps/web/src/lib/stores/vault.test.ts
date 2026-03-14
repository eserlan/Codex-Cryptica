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

import { VaultStore } from "./vault.svelte";

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
          );
          onProgress(
            { chunk2: { id: "chunk2", title: "Chunk 2" } as any },
            2,
            2,
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
});
