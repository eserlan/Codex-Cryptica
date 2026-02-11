import { describe, it, expect, vi, beforeEach } from "vitest";
import * as opfs from "../utils/opfs";

// Mock Svelte 5 Runes
vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.snapshot = (v: any) => v;
  (global as any).$derived = (v: any) => v;
  (global as any).$derived.by = (v: any) => v;
  (global as any).$effect = (v: any) => v;
});

// Mock dependencies
vi.mock("../utils/fs", () => ({
  walkDirectory: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("../services/search", () => ({
  searchService: {
    index: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    init: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock worker and bridge to prevent alias resolution issues
vi.mock("../cloud-bridge/worker-bridge", () => ({
  workerBridge: {
    reset: vi.fn(),
    send: vi.fn(),
  },
}));

vi.mock("./oracle.svelte", () => ({
  oracle: {
    clearMessages: vi.fn(),
    messages: [],
    tier: "lite",
    apiKey: null,
  },
}));

vi.mock("./graph.svelte", () => ({
  graph: {
    requestFit: vi.fn(),
  },
}));

// Mock global window and document for Image/Canvas
global.window = global.window || {};
global.document = global.document || { createElement: vi.fn() };

import { vault } from "./vault.svelte";

describe("VaultStore - Entity Creation", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    
    // Create a robust mock root
    const mockRoot: any = {
      kind: 'directory',
      name: 'root',
      getDirectoryHandle: vi.fn().mockImplementation(async () => mockRoot),
      getFileHandle: vi.fn().mockResolvedValue({
        kind: 'file',
        createWritable: vi.fn().mockResolvedValue({
          write: vi.fn(),
          close: vi.fn(),
        }),
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue(''),
          lastModified: Date.now(),
        }),
      }),
      values: vi.fn().mockReturnValue([]),
    };

    // Spy on getOpfsRoot
    vi.spyOn(opfs, 'getOpfsRoot').mockResolvedValue(mockRoot);

    await vault.init();
    vault.entities = {};
    (vault as any).inboundConnections = {};
  });

  it("should create a single entity", async () => {
    await vault.createEntity("character", "Hero A", { content: "Content A" });
    expect(Object.keys(vault.entities)).toHaveLength(1);
    expect(vault.entities["hero-a"]?.title).toBe("Hero A");
  });

  it("should skip duplicate entities during creation", async () => {
    await vault.createEntity("character", "Hero A", { content: "Content A" });
    await expect(vault.createEntity("character", "Hero A")).rejects.toThrow();
  });
});

