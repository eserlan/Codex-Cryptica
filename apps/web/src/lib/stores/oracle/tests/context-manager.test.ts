import { describe, it, expect, beforeEach, vi } from "vitest";
import { OracleContextManager } from "../context-manager.svelte";
import type { IOracleStore } from "../types";

describe("OracleContextManager", () => {
  let manager: OracleContextManager;
  let mockStore: any;

  beforeEach(() => {
    mockStore = {
      vault: {
        activeVaultId: "v1",
        entities: {},
        inboundConnections: {},
        defaultVisibility: "public",
        isGuest: false,
      },
      discoveryPolicyStore: {
        aiDisabled: false,
        oracleAutomationPolicy: {},
      },
      sessionModeStore: { isDemoMode: false },
      themeStore: { activeTheme: { id: "default" } },
      chatHistoryService: { messages: [] },
      contextRetrieval: { retrieveContext: vi.fn() },
      imageGeneration: { distillVisualPrompt: vi.fn() },
      textGeneration: { expandQuery: vi.fn() },
      searchService: { search: vi.fn() },
      diceParser: { parse: vi.fn() },
      diceEngine: { execute: vi.fn() },
      diceHistory: { addResult: vi.fn() },
      graph: { requestFit: vi.fn() },
      undoRedo: { pushUndoAction: vi.fn() },
      tier: "advanced",
      effectiveApiKey: "key",
      modelName: "model",
      categories: { list: [] },
      draftingEngine: {},
      sessionActivity: { addEvent: vi.fn() },
    };
    manager = new OracleContextManager(mockStore as IOracleStore);
  });

  it("should assemble execution context", () => {
    // This is a complex object, we'll just check some key properties
    const context = manager.getExecutionContext();
    expect(context.vaultId).toBe("v1");
    expect(context.tier).toBe("advanced");
  });
});
