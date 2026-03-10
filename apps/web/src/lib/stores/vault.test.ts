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

vi.mock("./vault-registry.svelte", () => ({
  vaultRegistry: {
    init: vi.fn().mockResolvedValue(undefined),
    rootHandle: { kind: "directory" } as any,
    activeVaultId: "test-vault",
    setActiveVault: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("./theme.svelte", () => ({
  themeStore: {
    loadForVault: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("./vault/io", () => ({
  loadVaultFiles: vi.fn().mockResolvedValue({ entities: {} }),
  loadMapsFromDisk: vi.fn().mockResolvedValue({}),
  loadCanvasesFromDisk: vi.fn().mockResolvedValue({}),
  saveEntityToDisk: vi.fn().mockResolvedValue(undefined),
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
  aiService: {
    analyze: vi.fn(),
    clearStyleCache: vi.fn(),
  },
}));

vi.mock("@codex/sync-engine", () => {
  return {
    SyncRegistry: class {
      init = vi.fn();
      getEntriesByVault = vi.fn().mockResolvedValue([]);
      getOpfsStatesByVault = vi.fn().mockResolvedValue([]);
      putEntry = vi.fn();
      putOpfsState = vi.fn();
      putOpfsStates = vi.fn();
      deleteEntry = vi.fn();
      deleteOpfsState = vi.fn();
    },
    LocalSyncService: class {
      sync = vi.fn().mockResolvedValue({
        updated: [],
        created: [],
        deleted: [],
        conflicts: [],
        failed: [],
      });
    },
    SyncService: vi.fn(),
    OpfsBackend: vi.fn(),
    FileSystemBackend: vi.fn(),
  };
});

vi.mock("../utils/opfs", () => ({
  getOpfsRoot: vi.fn(),
  getVaultDir: vi.fn(),
  writeOpfsFile: vi.fn(),
  readOpfsBlob: vi.fn(),
  deleteOpfsEntry: vi.fn(),
  walkOpfsDirectory: vi.fn().mockResolvedValue([]),
  getDirHandle: vi.fn(),
  isNotFoundError: vi.fn().mockReturnValue(false),
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

vi.mock("../../utils/markdown", () => ({
  sanitizeId: vi
    .fn()
    .mockImplementation((s) => s.toLowerCase().replace(/\s+/g, "-")),
  parseMarkdown: vi.fn().mockReturnValue({
    metadata: { title: "Test", id: "test" },
    content: "Content",
  }),
  stringifyEntity: vi.fn().mockReturnValue("--- title: Test --- content"),
}));

vi.mock("./debug.svelte", () => ({
  debugStore: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { loadVaultFiles } from "./vault/io";
import { vault } from "./vault.svelte";

describe("VaultStore (OPFS)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset singleton state
    vault.entities = {};
    (vault as any).isInitialized = false;
    (vault as any).status = "idle";
    (vault as any).errorMessage = null;
    (vault as any).syncService = null;
    (vault as any).services = null;
  });

  it("should initialize and load files from OPFS", async () => {
    const { getVaultDir } = await import("../utils/opfs");
    vi.mocked(getVaultDir).mockResolvedValue({ kind: "directory" } as any);

    vi.mocked(loadVaultFiles).mockResolvedValue({
      entities: {
        test: { id: "test", title: "Test", type: "note" } as any,
      },
    });

    await vault.init();

    expect(loadVaultFiles).toHaveBeenCalled();
    expect(Object.keys(vault.entities).length).toBe(1);
    expect(vault.entities["test"]?.title).toBe("Test");
  });

  it("should create a new entity in OPFS", async () => {
    await vault.createEntity("character", "New Character");
    expect(Object.keys(vault.entities)).toHaveLength(1);
    expect(vault.entities["new-character"]?.title).toBe("New Character");
  });

  it("should return early in syncToLocal if not initialized", async () => {
    // Manually ensure syncService is null (it's null by default in new instances)
    (vault as any).syncService = null;
    const result = await vault.syncToLocal();
    expect(result).toBeUndefined();
  });
});
