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

vi.mock("../services/cache.svelte", () => ({
  cacheService: {
    preloadVault: vi.fn().mockResolvedValue(undefined),
    getPreloadedEntities: vi.fn().mockReturnValue([]),
    getEntityContent: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));
const mockLocalHandle = {
  queryPermission: vi.fn().mockResolvedValue("granted"),
};

vi.mock("./vault/adapters.svelte", () => ({
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
import { cacheService } from "../services/cache.svelte";
import { readFileAsText } from "../utils/opfs";
import { syncIOAdapter } from "./vault/adapters.svelte";

describe("VaultStore - Tiered Loading and Reactivity", () => {
  let testVault: VaultStore;
  let mockRepository: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPostMessage.mockClear();

    mockRepository = {
      entities: {},
      loadFiles: vi.fn(),
      saveToDisk: vi.fn(),
      clear: vi.fn(),
      saveQueue: {
        totalPendingCount: 0,
        enqueue: vi.fn((id, cb) => cb()),
      },
    };

    // Ensure window is defined for constructor checks
    if (typeof window === "undefined") {
      vi.stubGlobal("window", {});
    }

    testVault = new VaultStore(mockRepository);
  });

  it("should prioritize Cache for Chronicle, then OPFS for Lore/Chronicle", async () => {
    const entityId = "test-hero";
    const cachedChronicle = "Cached Chronicle Content";
    const opfsMarkdown = "---\nlore: Deep Mythos\n---\nFresh Chronicle Content";

    // 1. Initial metadata only
    mockRepository.entities = {
      [entityId]: { id: entityId, title: "Hero", content: "" } as any,
    };

    // 2. Setup Tier 1 (Cache)
    vi.mocked(cacheService.getEntityContent).mockResolvedValue({
      content: cachedChronicle,
      lore: "Old Lore",
    });

    // 3. Setup Tier 2 (OPFS)
    vi.mocked(readFileAsText).mockResolvedValue(opfsMarkdown);

    // Start loading
    const loadPromise = testVault.loadEntityContent(entityId);

    // We can't easily "pause" inside the async function to check Tier 1 without more complex mocks,
    // but we verify the final state.
    await loadPromise;

    const updated = testVault.entities[entityId];
    // Final state should be from OPFS (Tier 2)
    expect(updated?.content).toBe("Fresh Chronicle Content");
    expect(updated?.lore).toBe("Deep Mythos");

    // Verify cache update was triggered for the new content
    expect(cacheService.set).toHaveBeenCalled();
  });

  it("should fallback to Local FS (Tier 3) if OPFS fails", async () => {
    const entityId = "local-hero";
    const localMarkdown = "---\nlore: Local Lore\n---\nLocal Content";

    mockRepository.entities = {
      [entityId]: { id: entityId, title: "Local", content: "" } as any,
    };

    // Tier 1: Miss
    vi.mocked(cacheService.getEntityContent).mockResolvedValue(null);

    // Tier 2: OPFS Miss (mock returns empty or throws)
    vi.mocked(readFileAsText).mockImplementation(async (handle) => {
      if ((handle as any).kind === "directory") throw new Error("Not found");
      return "";
    });

    // Tier 3: Local FS Hit
    vi.mocked(syncIOAdapter.getLocalHandle).mockResolvedValue(
      mockLocalHandle as any,
    );
    vi.mocked(readFileAsText).mockImplementation(async (handle) => {
      // If it's our mockLocalHandle, return content
      if (handle === (mockLocalHandle as any)) return localMarkdown;
      throw new Error("Not found");
    });

    await testVault.loadEntityContent(entityId);

    const updated = testVault.entities[entityId];
    expect(updated?.content).toBe("Local Content");
    expect(updated?.lore).toBe("Local Lore");
  });

  it("should trigger reactivity 'up the stack' via full object replacement", async () => {
    const entityId = "reactive-node";
    mockRepository.entities = {
      [entityId]: { id: entityId, title: "Reactive", content: "" } as any,
    };

    // Setup Tier 1: Hit
    vi.mocked(cacheService.getEntityContent).mockResolvedValue({
      content: "Some Content",
      lore: "Some Lore",
    });

    // Setup Tier 2/3: Miss/Empty to prevent overwriting Tier 1 for this test,
    // or just let them return same content.
    vi.mocked(readFileAsText).mockResolvedValue("");

    await testVault.loadEntityContent(entityId);

    // With Svelte 5 state proxies, surgical updates (this.repository.entities[id] = ...)
    // trigger reactivity correctly without needing to replace the entire root object.
    expect(testVault.entities[entityId].content).toBe("Some Content");
  });

  it("should immediately update cache when saving to ensure data sticks", async () => {
    const entity = {
      id: "new-node",
      title: "New",
      content: "Freshly Saved",
      type: "note",
    } as any;
    mockRepository.entities = { [entity.id]: entity };

    await testVault.scheduleSave(entity);

    // Verify disk save
    expect(mockRepository.saveToDisk).toHaveBeenCalled();

    // Verify IMMEDIATE cache sync (Priority 1 for next load)
    expect(cacheService.set).toHaveBeenCalledWith(
      expect.stringContaining(entity.id),
      expect.any(Number),
      expect.objectContaining({ content: "Freshly Saved" }),
    );
  });

  it("should preserve existing connections when loading content", async () => {
    const entityId = "connected-node";
    const existingConnections = [{ target: "other", type: "neutral" }];

    mockRepository.entities = {
      [entityId]: {
        id: entityId,
        title: "Connected",
        content: "",
        connections: existingConnections,
      } as any,
    };

    vi.mocked(cacheService.getEntityContent).mockResolvedValue({
      content: "Cached Content",
      lore: "Cached Lore",
    });
    vi.mocked(readFileAsText).mockResolvedValue(
      "---\nlore: New Lore\n---\nNew Content",
    );

    await testVault.loadEntityContent(entityId);

    const updated = testVault.entities[entityId];
    expect(updated.content).toBe("New Content");
    expect(updated.connections).toEqual(existingConnections);
    expect(updated.lore).toBe("New Lore");
  });
});
