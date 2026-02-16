import { describe, it, expect, vi, beforeEach } from "vitest";
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

    const systemMsg = oracle.messages.find((m) => m.role === "system");
    expect(systemMsg?.content).toContain("Connected **Eldrin** to **Tower**");
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
    expect(errorMsg?.content).toContain("Could not identify both entities");
  });
});
