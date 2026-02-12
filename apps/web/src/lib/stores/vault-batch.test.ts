// apps/web/src/lib/stores/vault-batch.test.ts
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

describe("VaultStore - Entity Creation", () => {
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
    vault.entities = {};
  });

  it("should create a single entity", async () => {
    const id = await vault.createEntity("character", "Hero A", {
      content: "Content A",
    });
    expect(Object.keys(vault.entities)).toHaveLength(1);
    expect(vault.entities[id]?.title).toBe("Hero A");
  });

  it("should handle duplicate titles by generating unique IDs", async () => {
    await vault.createEntity("character", "Hero A", { content: "Content A" });
    const id2 = await vault.createEntity("character", "Hero A");
    expect(Object.keys(vault.entities)).toHaveLength(2);
    expect(id2).toBe("hero-a-1");
  });
});
