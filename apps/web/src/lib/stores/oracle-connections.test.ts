import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Svelte 5 Runes
vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.snapshot = (v: any) => v;
  (global as any).$derived = (v: any) => v;
  (global as any).$derived.by = (v: any) => v;
  (global as any).$effect = (v: any) => v;
});

import { oracle } from "./oracle.svelte";
import { aiService } from "../services/ai";
import { vault } from "./vault.svelte";

// Mock AI Service
vi.mock("../services/ai", () => ({
  aiService: {
    parseConnectionIntent: vi.fn(),
    retrieveContext: vi.fn(),
    expandQuery: vi.fn(),
  },
  TIER_MODES: { lite: "lite", advanced: "advanced" },
}));

// Mock Vault
vi.mock("./vault.svelte", () => ({
  vault: {
    entities: {
      eldrin: { id: "eldrin", title: "Eldrin" },
      tower: { id: "tower", title: "Tower" },
    },
    addConnection: vi.fn().mockReturnValue(true),
    removeConnection: vi.fn(),
  },
}));

// Mock Graph
vi.mock("./graph.svelte", () => ({
  graph: {
    requestFit: vi.fn(),
  },
}));

// Mock UI
vi.mock("./ui.svelte", () => ({
  uiStore: {
    liteMode: false,
  },
}));

// Mock IDB
vi.mock("../utils/idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn().mockReturnValue({
      store: {
        clear: vi.fn().mockResolvedValue(undefined),
        add: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
      },
      done: Promise.resolve(),
    }),
  }),
  DB_NAME: "test-db",
  DB_VERSION: 1,
}));

// Mock Search Service
vi.mock("../services/search", () => ({
  searchService: {
    search: vi.fn().mockImplementation(async (q) => {
      if (q.toLowerCase().includes("eldrin")) return [{ id: "eldrin" }];
      if (q.toLowerCase().includes("tower")) return [{ id: "tower" }];
      return [];
    }),
  },
}));

describe("OracleStore - /connect parsing", () => {
  beforeEach(() => {
    oracle.messages = [];
    vi.clearAllMocks();
    (oracle as any).apiKey = "test-key";
  });

  it("should handle direct /connect command", async () => {
    (aiService.parseConnectionIntent as any).mockResolvedValue({
      sourceName: "Eldrin",
      targetName: "Tower",
      label: "master of",
      type: "friendly",
    });

    await oracle.ask("/connect Eldrin is the master of Tower");

    const assistantMsg = oracle.messages.find((m) => m.role === "assistant");
    expect(assistantMsg?.content).toContain(
      "Connected **Eldrin** to **Tower**",
    );
    expect(vault.addConnection).toHaveBeenCalledWith(
      "eldrin",
      "tower",
      "friendly",
      "master of",
    );
  });

  it("should show error if entities cannot be resolved", async () => {
    (aiService.parseConnectionIntent as any).mockResolvedValue({
      sourceName: "Unknown",
      targetName: "Tower",
    });

    await oracle.ask("/connect Unknown to Tower");

    const errorMsg = oracle.messages.find((m) => m.role === "system");
    expect(errorMsg?.content).toContain(
      'Could not find source entity: "Unknown"',
    );
  });
});
