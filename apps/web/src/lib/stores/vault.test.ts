// apps/web/src/lib/stores/vault.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Svelte 5 Runes
vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.snapshot = (v: any) => v;
  (global as any).$derived = (v: any) => v;
  (global as any).$derived.by = (v: any) => v;
  (global as any).$effect = (fn: () => void | (() => void)) => {
    const cleanup = fn();
    return typeof cleanup === "function" ? cleanup : () => {};
  };
  (global as any).__APP_VERSION__ = "0.0.0-test";

  (global as any).localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
});

import { vault } from "./vault.svelte";

vi.mock("./ui.svelte", () => ({
  uiStore: {
    isDemoMode: false,
    notify: vi.fn(),
  },
}));

vi.mock("$lib/stores/debug.svelte", () => ({
  debugStore: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("./theme.svelte", () => ({
  themeStore: {
    loadForVault: vi.fn(),
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
        clear: vi.fn(),
        put: vi.fn(),
      },
      done: Promise.resolve(),
    }),
  }),
  getPersistedHandle: vi.fn().mockResolvedValue(null),
  persistHandle: vi.fn(),
  clearPersistedHandle: vi.fn(),
}));

vi.mock("../utils/opfs", () => {
  const mockDir = {
    getDirectoryHandle: vi.fn().mockResolvedValue({
      getFileHandle: vi.fn().mockResolvedValue({
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue(`---
id: test
title: Test
---
`),
          lastModified: 1,
        }),
      }),
    }),
    values: vi.fn().mockImplementation(async function* () {
      yield {
        kind: "file",
        name: "test.md",
        getFile: () =>
          Promise.resolve({
            text: () =>
              Promise.resolve(`---
id: test
title: Test
---
`),
            lastModified: 1,
          }),
      };
    }),
    entries: vi.fn().mockImplementation(async function* () {
      yield [
        "test.md",
        {
          kind: "file",
          getFile: () =>
            Promise.resolve({
              text: () =>
                Promise.resolve(`---
id: test
title: Test
---
`),
              lastModified: 1,
            }),
        },
      ];
    }),
  };

  return {
    getOpfsRoot: vi.fn().mockResolvedValue(mockDir),
    getVaultDir: vi.fn().mockResolvedValue(mockDir),
    createVaultDir: vi.fn().mockResolvedValue(mockDir),
    deleteVaultDir: vi.fn().mockResolvedValue(undefined),
    getOrCreateDir: vi.fn().mockResolvedValue(mockDir),
    walkOpfsDirectory: vi.fn().mockResolvedValue([
      {
        handle: {
          getFile: vi.fn().mockResolvedValue({
            text: vi.fn().mockResolvedValue(`---
id: test
title: Test
---
`),
            lastModified: 1,
          }),
        },
        path: ["test.md"],
      },
    ]),
    writeOpfsFile: vi.fn(),
    readOpfsBlob: vi.fn(),
    deleteOpfsEntry: vi.fn(),
    readFileAsText: vi.fn().mockResolvedValue(`---
id: test
title: Test
---
`),
  };
});

vi.mock("../services/search", () => ({
  searchService: {
    clear: vi.fn(),
    index: vi.fn(),
  },
}));

vi.mock("../services/cache", () => ({
  cacheService: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn(),
  },
}));

vi.mock("./debug.svelte", () => ({
  debugStore: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("VaultStore (OPFS)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vault.entities = {};
  });

  it("should initialize and load files from OPFS", async () => {
    await vault.init();
    expect(Object.keys(vault.entities).length).toBe(1);
    expect(vault.entities["test"]?.title).toBe("Test");
  });

  it("should create a new entity in OPFS", async () => {
    await vault.createEntity("character", "New Character");
    expect(Object.keys(vault.entities).length).toBe(1);
    expect(vault.entities["new-character"]?.title).toBe("New Character");
  });
});
