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

// Mock BroadcastChannel
const mockPostMessage = vi.fn();
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: any) => void) | null = null;
  constructor(name: string) {
    this.name = name;
  }
  postMessage(message: any) {
    mockPostMessage(message);
  }
  close() {}
}
vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);

import { VaultStore } from "./vault.svelte";

describe("VaultStore (OPFS)", () => {
  let testVault: VaultStore;
  let mockRepository: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPostMessage.mockClear();

    mockRepository = {
      entities: {},
      loadFiles: vi.fn(),
      scheduleSave: vi.fn(),
      clear: vi.fn(),
      saveQueue: { totalPendingCount: 0 },
    };

    // Ensure window is defined for constructor checks
    if (typeof window === "undefined") {
      vi.stubGlobal("window", {});
    }

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

  it("should broadcast a RELOAD_VAULT message when broadcastVaultUpdate is called", () => {
    testVault.broadcastVaultUpdate();
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "RELOAD_VAULT",
      vaultId: "test-vault",
    });
  });

  it("should reload files when receiving a RELOAD_VAULT message from BroadcastChannel", async () => {
    // The channel is initialized in the constructor and stored privately, but its onmessage handler is bound.
    // We can simulate receiving a message by finding the instance of MockBroadcastChannel and calling onmessage.
    const channelInstance = (testVault as any).channel as MockBroadcastChannel;
    expect(channelInstance).toBeDefined();

    if (channelInstance && channelInstance.onmessage) {
      // Mock the async getActiveVaultHandle to prevent the test from getting stuck
      const loadFilesSpy = vi
        .spyOn(testVault, "loadFiles")
        .mockResolvedValue(undefined);

      channelInstance.onmessage(
        new MessageEvent("message", {
          data: {
            type: "RELOAD_VAULT",
            vaultId: "test-vault",
          },
        }),
      );

      // Wait a tick for async handlers
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(loadFilesSpy).toHaveBeenCalled();
      loadFilesSpy.mockRestore();
    }
  });

  it("should NOT reload files if RELOAD_VAULT message is for a different vault", () => {
    const channelInstance = (testVault as any).channel as MockBroadcastChannel;

    if (channelInstance && channelInstance.onmessage) {
      channelInstance.onmessage(
        new MessageEvent("message", {
          data: {
            type: "RELOAD_VAULT",
            vaultId: "other-vault",
          },
        }),
      );
      expect(mockRepository.loadFiles).not.toHaveBeenCalled();
    }
  });
});
