// apps/web/src/lib/stores/vault-switch.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockOpfs, createMockIDB } from "../../tests/mocks/storage";
import * as opfsUtils from "../utils/opfs";
import * as idbUtils from "../utils/idb";

// Mock Svelte 5 Runes
vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.snapshot = (v: any) => v;
  (global as any).$derived = (v: any) => v;
  (global as any).$derived.by = vi.fn((fn) => fn());
  (global as any).$effect = (v: any) => v;
});

// Mock Services
vi.mock("../services/search", () => ({
  searchService: {
    index: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../services/ai", () => ({
  aiService: {
    clearStyleCache: vi.fn(),
  },
}));

import { vault } from "./vault.svelte";
import { vaultRegistry } from "./vault-registry.svelte";

describe("VaultStore Multi-Vault", () => {
  let mockOpfs: any;
  let mockIDB: any;

  beforeEach(async () => {
    vi.resetAllMocks();
    mockOpfs = createMockOpfs();
    mockIDB = createMockIDB();

    vi.spyOn(opfsUtils, "getOpfsRoot").mockResolvedValue(mockOpfs);
    vi.spyOn(idbUtils, "getDB").mockResolvedValue(mockIDB as any);

    // Force re-init
    (vault as any).isInitialized = false;
    (vaultRegistry as any).isInitialized = false;

    await vault.init();
  });

  it("should initialize with default vault if none active", async () => {
    expect(vault.activeVaultId).toBe("default");
    expect(vault.vaultName).toBe("Default Vault");
  });

  it("should switch vault", async () => {
    // 1. Create a second vault
    const newId = await vault.createVault("Campaign B");
    expect(vault.activeVaultId).toBe(newId);
    expect(vault.vaultName).toBe("Campaign B");

    // 2. Switch back to default
    await vault.switchVault("default");
    expect(vault.activeVaultId).toBe("default");
    expect(vault.vaultName).toBe("Default Vault");
  });
});
