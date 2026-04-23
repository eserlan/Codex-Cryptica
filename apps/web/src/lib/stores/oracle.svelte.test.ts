import { describe, it, expect, vi, beforeEach } from "vitest";
import { OracleStore } from "./oracle.svelte";
import { vault as mockVault } from "./vault.svelte";
import { uiStore as mockUiStore } from "./ui.svelte";
import { textGenerationService, contextRetrievalService } from "../services/ai";
import { oracleBridge } from "../cloud-bridge/oracle-bridge";
import * as Comlink from "comlink";

vi.mock("comlink", () => ({
  proxy: vi.fn((x) => x),
  releaseProxy: Symbol("releaseProxy"),
}));

vi.mock("../cloud-bridge/oracle-bridge", () => ({
  oracleBridge: {
    isReady: false,
    textGeneration: {},
    draftingEngine: {},
  },
}));

const { mockAnalyzeEntityById, mockAnalyzeAndApplyEntityById } = vi.hoisted(
  () => ({
    mockAnalyzeEntityById: vi.fn().mockResolvedValue(0),
    mockAnalyzeAndApplyEntityById: vi.fn().mockResolvedValue(0),
  }),
);

// Mock dependencies
vi.mock("../utils/idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    transaction: vi.fn().mockReturnValue({
      store: {
        clear: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
      },
      done: Promise.resolve(),
    }),
  }),
}));

vi.mock("./graph.svelte", () => ({
  graph: {
    requestFit: vi.fn(),
  },
}));

vi.mock("./ui.svelte", () => ({
  uiStore: {
    confirm: vi.fn().mockResolvedValue(true),
    aiDisabled: false,
    isDemoMode: false,
    entityDiscoveryMode: "suggest",
    connectionDiscoveryMode: "suggest",
    oracleAutomationPolicy: {
      entityDiscovery: "suggest",
      connectionDiscovery: "suggest",
    },
  },
}));

vi.mock("./vault.svelte", () => ({
  vault: {
    activeVaultId: "test-vault",
    entities: {},
    inboundConnections: {},
    isGuest: false,
    createEntity: vi.fn().mockResolvedValue("new-id"),
    updateEntity: vi.fn().mockResolvedValue(undefined),
    addConnection: vi.fn().mockResolvedValue(true),
    removeConnection: vi.fn().mockResolvedValue(true),
    deleteEntity: vi.fn().mockResolvedValue(undefined),
    loadEntityContent: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("./proposer.svelte", () => ({
  proposerStore: {
    analyzeEntityById: mockAnalyzeEntityById,
    analyzeAndApplyEntityById: mockAnalyzeAndApplyEntityById,
  },
}));

vi.mock("../services/ai", () => ({
  contextRetrievalService: {
    getConsolidatedContext: vi.fn().mockReturnValue("mock context"),
    retrieveContext: vi.fn().mockResolvedValue({
      content: "mock context",
      primaryEntityId: "mock-id",
      sourceIds: ["source-1"],
    }),
    clearStyleCache: vi.fn(),
  },
  textGenerationService: {
    generateResponse: vi
      .fn()
      .mockImplementation((_k, _q, _h, _c, _m, onUpdate) => {
        onUpdate("mock response");
        return Promise.resolve();
      }),
    expandQuery: vi.fn().mockImplementation((_k, q) => Promise.resolve(q)),
    generatePlotAnalysis: vi.fn().mockResolvedValue("plot analysis"),
    generateMergeProposal: vi
      .fn()
      .mockResolvedValue({ body: "merge proposal" }),
  },
  imageGenerationService: {
    generateImage: vi.fn().mockResolvedValue(new Blob()),
    distillVisualPrompt: vi.fn().mockResolvedValue("visual prompt"),
  },
  TIER_MODES: {
    lite: "gemini-flash-lite-latest",
    advanced: "gemini-3-flash-preview",
  },
}));

vi.mock("../services/search", () => ({
  searchService: {
    search: vi.fn().mockResolvedValue([{ id: "e1", title: "Entity 1" }]),
  },
}));

// Mock URL.createObjectURL
if (typeof window !== "undefined") {
  window.URL.createObjectURL = vi.fn().mockReturnValue("mock-url");
}

describe("OracleStore", () => {
  let oracle: OracleStore;
  let mockChatHistory: any;
  let mockSettings: any;
  let mockUndoRedo: any;
  let mockExecutor: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (mockUiStore as any).aiDisabled = false;
    (mockUiStore as any).isDemoMode = false;
    (mockUiStore as any).entityDiscoveryMode = "suggest";
    (mockUiStore as any).connectionDiscoveryMode = "suggest";
    (mockUiStore as any).oracleAutomationPolicy = {
      entityDiscovery: "suggest",
      connectionDiscovery: "suggest",
    };

    mockChatHistory = {
      messages: [],
      addMessage: vi.fn().mockImplementation((m) => {
        mockChatHistory.messages.push(m);
        return Promise.resolve();
      }),
      setMessages: vi.fn().mockImplementation((ms) => {
        mockChatHistory.messages = ms;
      }),
      init: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockImplementation(() => {
        mockChatHistory.messages = [];
      }),
      clearMessages: vi.fn().mockImplementation(() => {
        mockChatHistory.messages = [];
      }),
      removeMessage: vi.fn(),
      startWizard: vi.fn(),
      updateMessage: vi.fn(),
      updateMessageEntity: vi.fn(),
      addTestImageMessage: vi.fn(),
      addProposal: vi.fn(),
    };

    mockSettings = {
      init: vi.fn().mockResolvedValue(undefined),
      apiKey: "test-key",
      tier: "advanced",
      isLoading: false,
      activeStyleTitle: null,
      effectiveApiKey: "test-key",
      isEnabled: true,
      modelName: "test-model",
      settings: {
        apiKey: "test-key",
        tier: "advanced",
        modelName: "test-model",
        connectionMode: "custom-key",
      },
      setLoading: vi.fn(),
      setTier: vi.fn(),
      setKey: vi.fn(),
      clearKey: vi.fn(),
      updateSettings: vi.fn(),
    };

    mockUndoRedo = {
      undoStack: [],
      redoStack: [],
      isUndoing: false,
      undo: vi.fn(),
      redo: vi.fn(),
      pushUndoAction: vi.fn(),
      clear: vi.fn(),
    };

    mockExecutor = {
      execute: vi.fn().mockImplementation(async (intent, context, onUpdate) => {
        if (intent.type === "chat") {
          const isImage =
            intent.query.includes("draw") || intent.query.includes("image");
          const assistantMsg = {
            id: "msg-id",
            role: "assistant",
            content: isImage
              ? `Generated visualization for: "${intent.query}"`
              : "mock response",
            type: isImage ? "image" : "text",
          };
          await mockChatHistory.addMessage({
            role: "user",
            content: intent.query,
          });
          await mockChatHistory.addMessage(assistantMsg);
          if (onUpdate) onUpdate("mock response");
        } else if (intent.type === "plot") {
          await mockChatHistory.addMessage({
            role: "assistant",
            content: "Generated visualization",
            type: "image",
          });
        }
      }),
      drawEntity: vi.fn(),
      drawMessage: vi.fn(),
    };

    const mockDiceHistory = {
      init: vi.fn(),
    };

    oracle = new OracleStore({
      vault: mockVault as any,
      uiStore: mockUiStore as any,
      diceHistory: mockDiceHistory as any,
      textGeneration: textGenerationService as any,
      contextRetrieval: contextRetrievalService as any,
    });

    // Inject mocks into private fields to align with internal services refactor
    (oracle as any).chatHistoryService = mockChatHistory;
    (oracle as any).settingsService = mockSettings;
    (oracle as any).undoRedo = mockUndoRedo;
    (oracle as any).executor = mockExecutor;
    (oracle as any).isInitialized = true;
  });

  it("should initialize with empty state", () => {
    expect(oracle.messages).toHaveLength(0);
    expect(oracle.isEnabled).toBe(true);
  });

  it("should load API key from database on init", async () => {
    (oracle as any).isInitialized = false;
    await oracle.init();
    expect(mockSettings.init).toHaveBeenCalled();
  });

  it("should ignore API key saving if same key", async () => {
    mockSettings.settings.apiKey = "same";
    await oracle.setKey("same");
    expect(mockSettings.updateSettings).not.toHaveBeenCalled();
  });

  it("should not send empty messages", async () => {
    await oracle.sendMessage("   ");
    expect(mockChatHistory.addMessage).not.toHaveBeenCalled();
  });

  it("should toggle open state", () => {
    expect(oracle.isOpen).toBe(false);
    oracle.toggle();
    expect(oracle.isOpen).toBe(true);
  });

  it("should detect image generation intent correctly", async () => {
    const imageQueries = ["/draw a dragon", "generate an image of a wizard"];

    for (const q of imageQueries) {
      await oracle.ask(q);
      const lastMsg = oracle.messages[oracle.messages.length - 1];
      expect(lastMsg.type).toBe("image");
    }
  });

  describe("Undo/Redo Logic", () => {
    it("should push undo actions to the stack", () => {
      oracle.pushUndoAction("Test Action", vi.fn());
      expect(mockUndoRedo.pushUndoAction).toHaveBeenCalled();
    });

    it("should handle undo and call undoRedo service", async () => {
      mockUndoRedo.undoStack = [{ description: "test action" }];
      await oracle.undo();
      expect(mockUndoRedo.undo).toHaveBeenCalled();
    });

    it("should handle redo and call undoRedo service", async () => {
      mockUndoRedo.redoStack = [{ description: "test redo" }];
      await oracle.redo();
      expect(mockUndoRedo.redo).toHaveBeenCalled();
    });
  });

  describe("Domain Operations", () => {
    it("should handle drawEntity", async () => {
      mockExecutor.drawEntity = vi.fn().mockResolvedValue(undefined);
      await oracle.drawEntity("entity-1");
      expect(mockExecutor.drawEntity).toHaveBeenCalledWith(
        "entity-1",
        expect.any(Object),
      );
    });

    it("should track visualizing state for an entity draw", async () => {
      let resolveDraw!: () => void;
      mockExecutor.drawEntity = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveDraw = resolve;
          }),
      );

      const drawPromise = oracle.drawEntity("entity-1");

      expect(oracle.visualizingEntityId).toBe("entity-1");
      expect(oracle.isVisualizingEntity("entity-1")).toBe(true);

      resolveDraw();
      await drawPromise;

      expect(oracle.visualizingEntityId).toBe(null);
      expect(oracle.isVisualizingEntity("entity-1")).toBe(false);
    });

    it("should handle drawMessage", async () => {
      mockExecutor.drawMessage = vi.fn().mockResolvedValue(undefined);
      await oracle.drawMessage("msg-1");
      expect(mockExecutor.drawMessage).toHaveBeenCalledWith(
        "msg-1",
        expect.any(Object),
      );
    });

    it("should clear key and messages", async () => {
      await oracle.clearKey();
      expect(mockSettings.updateSettings).toHaveBeenCalledWith({
        apiKey: undefined,
      });

      await oracle.clearMessages();
      expect(mockChatHistory.clear).toHaveBeenCalled();
    });

    it("should pass related entity context into reconciliation updates", async () => {
      (mockVault as any).entities = {
        entity: {
          id: "entity",
          title: "Red Wizards of Thay",
          type: "faction",
          content: "Old chronicle",
          lore: "Old lore",
          connections: [{ target: "ally", type: "rules" }],
        },
        ally: {
          id: "ally",
          title: "Szass Tam",
          type: "npc",
          content: "Lich-regent",
          lore: "Commands the faction",
        },
      };
      (oracle as any).textGeneration.reconcileEntityUpdate = vi
        .fn()
        .mockResolvedValue({
          content: "Updated chronicle",
          lore: "Updated lore",
        });

      await oracle.reconcileDiscoveryProposal({
        entityId: "entity",
        title: "Red Wizards of Thay",
        type: "faction",
        draft: {
          chronicle: "New chronicle",
          lore: "New lore mentioning Szass Tam",
        },
        confidence: 0.9,
      });

      expect(
        (oracle as any).textGeneration.reconcileEntityUpdate,
      ).toHaveBeenCalledWith(
        "test-key",
        "test-model",
        mockVault.entities.entity,
        {
          chronicle: "New chronicle",
          lore: "New lore mentioning Szass Tam",
        },
        [
          expect.objectContaining({
            title: "Szass Tam",
            type: "npc",
          }),
        ],
      );
    });

    it("should fall back to a local append update when AI is disabled", async () => {
      (mockUiStore as any).aiDisabled = true;
      (oracle as any).textGeneration.reconcileEntityUpdate = vi.fn();
      (mockVault as any).entities = {
        entity: {
          id: "entity",
          title: "Valindra Shadowmantle",
          type: "npc",
          content: "Existing chronicle",
          lore: "Existing lore",
          connections: [],
        },
      };

      const result = await oracle.reconcileDiscoveryProposal({
        entityId: "entity",
        title: "Valindra Shadowmantle",
        type: "npc",
        draft: {
          chronicle: "New chronicle",
          lore: "Fresh discovery lore",
        },
        confidence: 0.9,
      });

      expect(result).toEqual({
        content: "Existing chronicle",
        lore: "Existing lore\n\nFresh discovery lore",
      });
      expect(
        (oracle as any).textGeneration.reconcileEntityUpdate,
      ).not.toHaveBeenCalled();

      (mockUiStore as any).aiDisabled = false;
    });

    it("should expose searchService through the oracle execution context", () => {
      const context = oracle.getExecutionContext();

      expect(context.searchService).toBeDefined();
      expect(typeof context.searchService.search).toBe("function");
    });

    it("should expose oracle automation policy through the execution context", () => {
      (mockUiStore as any).oracleAutomationPolicy = {
        entityDiscovery: "auto-create",
        connectionDiscovery: "auto-apply",
      };

      const context = oracle.getExecutionContext();

      expect(context.automationPolicy).toEqual({
        entityDiscovery: "auto-create",
        connectionDiscovery: "auto-apply",
      });
    });

    it("should snapshot history before passing to textGeneration (structured clone safety)", async () => {
      const context = oracle.getExecutionContext();
      const history = [{ id: "1", role: "user", content: "test" }];
      const onUpdate = vi.fn();

      // We want to verify that the 'history' passed to generateResponse is NOT the same instance
      // if it was snapshotted (Svelte 5 behavior).
      // Since our test environment might not have real Svelte proxies, we check the call.

      await context.textGeneration.generateResponse(
        "key",
        "query",
        history,
        "ctx",
        "model",
        onUpdate,
      );

      const genCall = vi.mocked((oracle as any).textGeneration.generateResponse)
        .mock.calls[0];
      // Arg 2 is history
      expect(genCall[2]).not.toBe(history); // It should be a snapshot/clone
      expect(genCall[2]).toEqual(history);
    });

    it("should use Comlink.proxy for methods when oracleBridge is ready", () => {
      (oracleBridge as any).isReady = true;
      const _context = oracle.getExecutionContext();

      expect(Comlink.proxy).toHaveBeenCalled();
      // Reset for other tests
      (oracleBridge as any).isReady = false;
    });

    it("should handle missing methods in getExecutionContext (defensive wrapping)", () => {
      const bareOracle = new OracleStore({
        vault: { activeVaultId: "v1", entities: {} } as any,
        uiStore: mockUiStore as any,
        diceHistory: {} as any,
        searchService: {} as any,
        diceParser: {} as any,
        diceEngine: {} as any,
        chatHistoryService: mockChatHistory as any,
        contextRetrieval: {} as any, // Missing retrieveContext
      });

      const _context = bareOracle.getExecutionContext();
      expect(_context.vault.createEntity).toBeUndefined();
      expect(_context.searchService.search).toBeUndefined();
      expect(_context.diceParser.parse).toBeUndefined();
      expect(_context.contextRetrieval.retrieveContext).toBeUndefined();
    });

    it("should provide a complete OracleExecutionContext with all required methods", () => {
      const context = oracle.getExecutionContext();

      // Core properties
      expect(context.vaultId).toBeDefined();
      expect(context.modelName).toBeDefined();
      expect(context.tier).toBeDefined();

      // Vault methods
      expect(typeof context.vault.createEntity).toBe("function");
      expect(typeof context.vault.updateEntity).toBe("function");
      // loadEntityContent might be undefined in some mock setups, but we check if it's either function or undefined
      // but here we expect it to be a function because 'oracle' uses 'defaultVault' which has it.
      expect(typeof context.vault.loadEntityContent).toBe("function");

      // Chat history methods
      expect(typeof context.chatHistory.addMessage).toBe("function");
      expect(typeof context.chatHistory.setMessages).toBe("function");

      // Context retrieval methods (Regressed in previous version)
      expect(context.contextRetrieval).toBeDefined();
      expect(typeof context.contextRetrieval.retrieveContext).toBe("function");
      expect(typeof context.contextRetrieval.getConsolidatedContext).toBe(
        "function",
      );

      // Image generation methods
      expect(context.imageGeneration).toBeDefined();
      expect(typeof context.imageGeneration.distillVisualPrompt).toBe(
        "function",
      );
      expect(typeof context.imageGeneration.generateImage).toBe("function");

      // AI Services
      expect(typeof context.textGeneration.generateResponse).toBe("function");
      expect(typeof context.textGeneration.expandQuery).toBe("function");

      // Search
      expect(typeof context.searchService.search).toBe("function");
    });

    it("should start a wizard", async () => {
      await oracle.startWizard("connection");
      expect(mockChatHistory.startWizard).toHaveBeenCalledWith("connection");
    });

    it("should seed discovery connections when connection discovery is suggest", async () => {
      (mockUiStore as any).connectionDiscoveryMode = "suggest";

      await oracle.handleDiscoveryConnectionsForEntity("entity", "context");

      expect(mockAnalyzeEntityById).toHaveBeenCalledWith(
        "entity",
        false,
        "context",
      );
      expect(mockAnalyzeAndApplyEntityById).not.toHaveBeenCalled();
    });

    it("should apply discovery connections only when connection discovery is auto-apply", async () => {
      (mockUiStore as any).connectionDiscoveryMode = "auto-apply";
      mockAnalyzeAndApplyEntityById.mockResolvedValue(2);

      const count = await oracle.handleDiscoveryConnectionsForEntity("entity");

      expect(count).toBe(2);
      expect(mockAnalyzeAndApplyEntityById).toHaveBeenCalledWith(
        "entity",
        undefined,
      );
      expect(mockAnalyzeEntityById).not.toHaveBeenCalled();
    });

    it("should skip discovery connection analysis when connection discovery is off", async () => {
      (mockUiStore as any).connectionDiscoveryMode = "off";

      const count = await oracle.handleDiscoveryConnectionsForEntity("entity");

      expect(count).toBe(0);
      expect(mockAnalyzeEntityById).not.toHaveBeenCalled();
      expect(mockAnalyzeAndApplyEntityById).not.toHaveBeenCalled();
    });

    it("should toggle open and modal states", async () => {
      oracle.toggle();
      expect(oracle.isOpen).toBe(true);

      oracle.toggleModal();
      expect(oracle.isModal).toBe(true);
    });

    it("should init on toggle if opening", async () => {
      const initSpy = vi.spyOn(oracle, "init").mockResolvedValue(undefined);

      oracle.toggle();
      expect(oracle.isOpen).toBe(true);
      expect(initSpy).toHaveBeenCalled();
    });

    it("should delegate to chat history for wizard and message management", () => {
      oracle.removeMessage("id");
      expect(mockChatHistory.removeMessage).toHaveBeenCalledWith("id");

      oracle.startWizard("connection");
      expect(mockChatHistory.startWizard).toHaveBeenCalledWith("connection");

      oracle.updateMessageEntity("id", "ent");
      expect(mockChatHistory.updateMessage).toHaveBeenCalledWith("id", {
        entityId: "ent",
      });

      const blob = new Blob();
      oracle.addTestImageMessage("c", "u", blob, "e");
      expect(mockChatHistory.addTestImageMessage).toHaveBeenCalledWith(
        "c",
        "u",
        blob,
        "e",
      );
    });

    it("should throw error if proposal lacks entityId", async () => {
      await expect(
        oracle.reconcileDiscoveryProposal({ title: "No ID" } as any),
      ).rejects.toThrow(
        "Discovery proposal does not target an existing record.",
      );
    });

    it("should throw error if entity not found in vault", async () => {
      (mockVault as any).entities = {};
      await expect(
        oracle.reconcileDiscoveryProposal({
          entityId: "missing",
          title: "Missing",
        } as any),
      ).rejects.toThrow("Entity missing was not found.");
    });

    it("should fall back to local update if reconciliation fails", async () => {
      (mockVault as any).entities = {
        e1: { id: "e1", title: "E1", content: "C", lore: "L" },
      };
      (oracle as any).textGeneration.reconcileEntityUpdate = vi
        .fn()
        .mockRejectedValue(new Error("Fail"));

      const result = await oracle.reconcileDiscoveryProposal({
        entityId: "e1",
        title: "E1",
        draft: { chronicle: "new", lore: "more" },
      } as any);

      expect(result.content).toBe("C");
      expect(result.lore).toBe("L\n\nmore");
    });

    it("should reset the store", () => {
      oracle.reset();
      expect(mockChatHistory.setMessages).toHaveBeenCalledWith([]);
      // Note: reset behavior changed to only clear messages in the new refactor
    });

    it("should handle ORACLE_ENTITY_DISCOVERED worker event", () => {
      const mockEvent = {
        type: "ORACLE_ENTITY_DISCOVERED",
        requestId: "r1",
        payload: { title: "New Entity" },
      };

      (oracle as any).handleWorkerEvent(mockEvent);

      expect(mockChatHistory.addProposal).toHaveBeenCalledWith(
        "r1",
        mockEvent.payload,
      );
    });

    it("should ignore events from other vaults", () => {
      const mockEvent = {
        type: "ORACLE_ENTITY_DISCOVERED",
        vaultId: "other-vault",
        requestId: "r1",
        payload: { title: "New Entity" },
      };

      (oracle as any).handleWorkerEvent(mockEvent);

      expect(mockChatHistory.addProposal).not.toHaveBeenCalled();
    });

    it("should close event bus on destroy", () => {
      const mockBus = { close: vi.fn() };
      (oracle as any).eventBus = mockBus;

      oracle.destroy();

      expect(mockBus.close).toHaveBeenCalled();
      expect((oracle as any).eventBus).toBeNull();
    });

    it("should ignore unhandled worker event types", () => {
      const mockEvent = { type: "UNKNOWN_EVENT" };
      // Should not throw or do anything
      expect(() => (oracle as any).handleWorkerEvent(mockEvent)).not.toThrow();
    });
  });
});
