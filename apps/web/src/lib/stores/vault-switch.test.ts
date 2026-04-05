// apps/web/src/lib/stores/vault-switch.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockOpfs, createMockIDB } from "../../tests/mocks/storage";
import * as opfsUtils from "../utils/opfs";
import * as idbUtils from "../utils/idb";
import { vaultEventBus } from "./vault/events";

const {
  mockMapRegistry,
  mockCanvasRegistry,
  mockSearchService,
  sharedInternalState,
} = vi.hoisted(() => {
  const state = {
    maps: {} as any,
    canvases: {} as any,
  };

  return {
    sharedInternalState: state,
    mockMapRegistry: {
      get maps() {
        return state.maps;
      },
      set maps(v) {
        state.maps = v;
      },
      clear: vi.fn().mockImplementation(() => {
        state.maps = {};
      }),
      loadFromVault: vi.fn().mockResolvedValue(undefined),
      init: vi.fn(),
    },
    mockCanvasRegistry: {
      get canvases() {
        return state.canvases;
      },
      set canvases(v) {
        state.canvases = v;
      },
      clear: vi.fn().mockImplementation(() => {
        state.canvases = {};
      }),
      loadFromVault: vi.fn().mockResolvedValue(undefined),
      init: vi.fn(),
    },
    mockSearchService: {
      index: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      search: vi.fn().mockResolvedValue([]),
    },
  };
});

vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.snapshot = (v: any) => v;
  (global as any).$derived = (v: any) => v;
  (global as any).$derived.by = vi.fn((fn) => fn());
  (global as any).$effect = (v: any) => v;
});

// Mock Registries
vi.mock("./map-registry.svelte", () => ({
  mapRegistry: mockMapRegistry,
}));

vi.mock("./canvas-registry.svelte", () => ({
  canvasRegistry: mockCanvasRegistry,
}));

// Mock Services
vi.mock("../services/search", () => ({
  searchService: mockSearchService,
}));

vi.mock("../services/ai", () => ({
  contextRetrievalService: {
    clearStyleCache: vi.fn(),
    retrieveContext: vi.fn(),
  },
  textGenerationService: {
    expandQuery: vi.fn(),
  },
  imageGenerationService: {
    generateImage: vi.fn(),
  },
}));

import { vault } from "./vault.svelte";
import { vaultRegistry } from "./vault-registry.svelte";

describe("VaultStore Multi-Vault", () => {
  let mockOpfs: any;
  let _mockIDB: any;

  beforeEach(async () => {
    vi.resetAllMocks();
    vaultEventBus.reset();
    mockOpfs = createMockOpfs();
    _mockIDB = createMockIDB();

    vi.spyOn(opfsUtils, "getOpfsRoot").mockResolvedValue(mockOpfs);

    // Mock getDB to return our mockIDB and handle get requests for vaults
    vi.spyOn(idbUtils, "getDB").mockResolvedValue({
      get: vi.fn().mockImplementation((store, id) => {
        if (store === "vaults") {
          return Promise.resolve({
            id,
            name: id === "default" ? "Default Vault" : `Vault ${id}`,
          });
        }
        return Promise.resolve(undefined);
      }),
      getAll: vi.fn().mockImplementation((store) => {
        if (store === "vaults")
          return Promise.resolve([{ id: "default", name: "Default Vault" }]);
        return Promise.resolve([]);
      }),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      transaction: vi.fn().mockReturnValue({
        store: {
          index: vi.fn().mockReturnValue({
            openCursor: vi.fn().mockReturnValue(null),
          }),
        },
        done: Promise.resolve(),
      }),
    } as any);

    // Reset internal state
    (vault as any).isInitialized = false;
    (vaultRegistry as any).isInitialized = false;
    (vaultRegistry as any).availableVaults = [];
    (vaultRegistry as any).activeVaultId = null;
    const mockServices = {
      search: mockSearchService,
      ai: {
        clearStyleCache: vi.fn(),
        expandQuery: vi.fn().mockResolvedValue(""),
      },
    };
    vi.spyOn(vault.serviceRegistry, "ensureInitialized").mockResolvedValue(
      mockServices as any,
    );
    vi.spyOn(vault.serviceRegistry, "services", "get").mockReturnValue(
      mockServices as any,
    );

    sharedInternalState.maps = {};
    sharedInternalState.canvases = {};

    await vault.init();
  });

  it("should initialize with default vault if none active", async () => {
    expect(vault.activeVaultId).toBe("default");
    expect(vault.vaultName).toBe("Default Vault");
  });

  it("should switch vault", async () => {
    vi.spyOn(vaultRegistry, "createVault").mockResolvedValue("vault-b");

    const newId = await vault.createVault("Campaign B");
    expect(vault.activeVaultId).toBe(newId);

    await vault.switchVault("default");
    expect(vault.activeVaultId).toBe("default");
    expect(vault.vaultName).toBe("Default Vault");
  });

  it("should clear repository entities when switching vaults", async () => {
    (vault as any).repository.entities = {
      "entity-a1": { id: "entity-a1", title: "Entity from Vault A" },
      "entity-a2": { id: "entity-a2", title: "Entity from Vault A" },
    };

    await vault.switchVault("vault-b");

    expect(vault.entities["entity-a1"]).toBeUndefined();
    expect(vault.entities["entity-a2"]).toBeUndefined();
    expect(vault.allEntities.length).toBe(0);
  });

  it("should clear asset manager when switching vaults", async () => {
    (vault as any).assetManager.clear = vi.fn();

    await vault.switchVault("vault-b");
    expect((vault as any).assetManager.clear).toHaveBeenCalled();
  });

  it("should broadcast VAULT_OPENING event when switching vaults", async () => {
    // We can't easily subscribe and expect it to survive reset() inside loadFiles
    // unless we use a NAMED listener which survives reset(true)
    const eventSpy = vi.fn();
    const unsubscribe = vaultEventBus.subscribe(eventSpy, "test-listener");

    await vault.switchVault("vault-b");

    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "VAULT_OPENING",
        vaultId: "vault-b",
      }),
    );

    unsubscribe();
  });

  it("should dispatch vault-switched event when switching", async () => {
    const dispatchSpy = vi.spyOn(window as any, "dispatchEvent");

    await vault.switchVault("vault-b");

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "vault-switched",
        detail: expect.objectContaining({ id: "vault-b" }),
      }),
    );
  });

  it("should call repository.clear when switching vaults", async () => {
    const clearSpy = vi.spyOn((vault as any).repository, "clear");

    await vault.switchVault("vault-b");

    expect(clearSpy).toHaveBeenCalled();
  });

  it("should reset content-loaded tracking when switching vaults", async () => {
    (vault as any).entityStore._contentLoadedIds = new Set(["e1", "e2", "e3"]);
    (vault as any).entityStore._contentVerifiedIds = new Set(["e1", "e2"]);

    await vault.switchVault("vault-b");

    expect((vault as any).entityStore._contentLoadedIds.size).toBe(0);
    expect((vault as any).entityStore._contentVerifiedIds.size).toBe(0);
  });
});
