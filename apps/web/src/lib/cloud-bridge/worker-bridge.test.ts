import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Svelte 5 Runes (Global)
vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.snapshot = (v: any) => v;
  (global as any).$derived = (v: any) => v;
  (global as any).$derived.by = vi.fn((fn) => fn());
  (global as any).$effect = (v: any) => v;
});

// Mock $app/environment BEFORE importing WorkerBridge
vi.mock("$app/environment", () => ({
  browser: true,
}));

import { WorkerBridge } from "./worker-bridge";
import { vaultRegistry } from "../stores/vault-registry.svelte";

// Mock SyncWorker import
vi.mock("$workers/sync?worker", () => ({
  default: class {
    postMessage = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    terminate = vi.fn();
  },
}));

// Mock dependencies
vi.mock("../stores/vault-registry.svelte", () => ({
  vaultRegistry: {
    availableVaults: [],
    activeVaultId: null,
    isInitialized: false,
    rootHandle: {},
    init: vi.fn(),
  },
}));

vi.mock("../stores/cloud-config", () => ({
  cloudConfig: {
    subscribe: vi.fn((run) => {
      run({ enabled: true, syncInterval: 1000 });
      return () => {};
    }),
  },
}));

describe("WorkerBridge", () => {
  let bridge: WorkerBridge;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    (global as any).Worker = class {
      postMessage = vi.fn();
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      terminate = vi.fn();
    };
    (global as any).gapi = {
      client: {
        getToken: () => ({ access_token: "mock-token" }),
      },
    };

    // Reset registry state
    (vaultRegistry as any).isInitialized = false;
    (vaultRegistry as any).activeVaultId = "vault-1";
    (vaultRegistry as any).availableVaults = [
      { id: "vault-1", gdriveSyncEnabled: true, gdriveFolderId: "folder-1" },
    ];
    // Default success behavior: init sets initialized to true
    (vaultRegistry as any).init.mockImplementation(async () => {
      (vaultRegistry as any).isInitialized = true;
    });

    bridge = new WorkerBridge();
  });

  it("should await registry initialization if not ready during startSync", async () => {
    // Setup: Registry NOT initialized
    (vaultRegistry as any).isInitialized = false;

    // Act
    await bridge.startSync();

    // Assert
    expect(vaultRegistry.init).toHaveBeenCalled();
    // Verify it proceeded to post message (meaning it waited successfully)
    const workerInstance = (bridge as any).worker;
    expect(workerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "INIT_SYNC",
        payload: expect.objectContaining({ vaultId: "vault-1" }),
      }),
    );
  });

  it("should proceed immediately if registry is already initialized", async () => {
    // Setup: Registry initialized
    (vaultRegistry as any).isInitialized = true;

    // Act
    await bridge.startSync();

    // Assert
    expect(vaultRegistry.init).not.toHaveBeenCalled();
    const workerInstance = (bridge as any).worker;
    expect(workerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "INIT_SYNC",
        payload: expect.objectContaining({ vaultId: "vault-1" }),
      }),
    );
  });

  it("should not start sync if registry initialization fails", async () => {
    // Setup: Registry NOT initialized and init fails internally
    (vaultRegistry as any).isInitialized = false;
    (vaultRegistry as any).init.mockImplementation(async () => {
      // Simulate internal failure: init completes but registry stays uninitialized
      (vaultRegistry as any).isInitialized = false;
    });

    // Act
    await bridge.startSync();

    // Assert
    expect(vaultRegistry.init).toHaveBeenCalled();
    const workerInstance = (bridge as any).worker;
    expect(workerInstance.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "INIT_SYNC" }),
    );
  });
});
