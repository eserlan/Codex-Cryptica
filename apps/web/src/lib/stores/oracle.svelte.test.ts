import { describe, it, expect, vi, beforeEach } from "vitest";
import { OracleStore } from "./oracle.svelte";
import { vault as mockVault } from "./vault.svelte";
import { textGenerationService, contextRetrievalService } from "../services/ai";
import { oracleBridge } from "../cloud-bridge/oracle-bridge";
import * as Comlink from "comlink";
import { notificationStore } from "$lib/stores/ui/notification.svelte";

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

const mockUiStore = {
  confirm: vi.fn().mockResolvedValue(true),
  aiDisabled: false,
  isDemoMode: false,
  entityDiscoveryMode: "suggest",
  connectionDiscoveryMode: "suggest",
  oracleAutomationPolicy: {
    entityDiscovery: "suggest",
    connectionDiscovery: "suggest",
  },
};

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
    lite: "gemini-3.1-flash-lite",
    advanced: "gemini-3-flash-preview",
  },
}));

vi.mock("../services/search.svelte", () => ({
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
  let mockSessionActivity: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    (mockVault as any).isGuest = false;
    (mockUiStore as any).aiDisabled = false;
    (mockUiStore as any).isDemoMode = false;
    (mockUiStore as any).entityDiscoveryMode = "suggest";
    (mockUiStore as any).connectionDiscoveryMode = "suggest";
    (mockUiStore as any).oracleAutomationPolicy = {
      entityDiscovery: "suggest",
      connectionDiscovery: "suggest",
    };
    notificationStore.confirm = vi.fn().mockResolvedValue(true);

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
      destroy: vi.fn(),
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
      prepareEntityPrompt: vi.fn().mockResolvedValue({ prompt: "prompt" }),
      prepareMessagePrompt: vi.fn().mockResolvedValue({ prompt: "prompt" }),
      generateEntityFromPrompt: vi.fn(),
      generateMessageFromPrompt: vi.fn(),
    };

    const mockDiceHistory = {
      init: vi.fn(),
    };

    mockSessionActivity = {
      addEvent: vi.fn(),
      clear: vi.fn(),
    };

    oracle = new OracleStore({
      vault: mockVault as any,
      discoveryPolicyStore: mockUiStore as any,
      sessionModeStore: mockUiStore as any,
      diceHistory: mockDiceHistory as any,
      textGeneration: textGenerationService as any,
      contextRetrieval: contextRetrievalService as any,
      sessionActivity: mockSessionActivity as any,
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
      mockVault.entities["entity-1"] = {
        id: "entity-1",
        title: "Entity One",
      } as any;
      mockExecutor.prepareEntityPrompt = vi
        .fn()
        .mockResolvedValue({ prompt: "prompt" });
      await oracle.drawEntity("entity-1");
      expect(mockExecutor.prepareEntityPrompt).toHaveBeenCalledWith(
        "entity-1",
        expect.any(Object),
      );
    });

    it("should track visualizing state for an entity draw", async () => {
      let resolveDraw!: () => void;
      mockVault.entities["entity-1"] = {
        id: "entity-1",
        title: "Entity One",
      } as any;
      mockExecutor.prepareEntityPrompt = vi.fn(
        () =>
          new Promise<{ prompt: string }>((resolve) => {
            resolveDraw = () => resolve({ prompt: "prompt" });
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
      mockExecutor.prepareMessagePrompt = vi
        .fn()
        .mockResolvedValue({ prompt: "prompt" });
      await oracle.drawMessage("msg-1");
      expect(mockExecutor.prepareMessagePrompt).toHaveBeenCalledWith(
        "msg-1",
        expect.any(Object),
      );
    });

    it("should clear key and messages", async () => {
      await oracle.clearKey();
      expect(mockSettings.clearKey).toHaveBeenCalled();
    });

    it("should clear messages", async () => {
      await oracle.clearMessages();
      expect(notificationStore.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Clear History",
          isDangerous: true,
        }),
      );
      expect(mockChatHistory.clear).toHaveBeenCalled();
      expect(mockSessionActivity.clear).toHaveBeenCalled();
    });

    it("should not clear messages when confirmation is cancelled", async () => {
      vi.mocked(notificationStore.confirm).mockResolvedValue(false);

      await oracle.clearMessages();

      expect(notificationStore.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Clear History",
          isDangerous: true,
        }),
      );
      expect(mockChatHistory.clear).not.toHaveBeenCalled();
      expect(mockSessionActivity.clear).not.toHaveBeenCalled();
    });

    it("should pass related entity context into revision updates", async () => {
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
      (oracle as any).textGeneration.reviseEntityUpdate = vi
        .fn()
        .mockResolvedValue({
          content: "Updated chronicle",
          lore: "Updated lore",
        });

      await oracle.reviseDiscoveryProposal({
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
        (oracle as any).textGeneration.reviseEntityUpdate,
      ).toHaveBeenCalledWith(
        "test-key",
        "test-model",
        mockVault.entities.entity,
        {
          chronicle: "New chronicle",
          lore: "New lore mentioning Szass Tam",
        },
        [
          {
            id: "ally",
            title: "Szass Tam",
            type: "npc",
            relation: "rules",
            summary: "Lich-regent",
          },
        ],
        expect.any(Array),
        expect.objectContaining({
          source: "discovery",
          instructions: undefined,
          priority: "incoming-first",
          interactionsEnabled: true,
        }),
      );
    });

    it("should fall back to a local append update when AI is disabled", async () => {
      (mockUiStore as any).aiDisabled = true;
      (oracle as any).textGeneration.reviseEntityUpdate = vi.fn();
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

      const result = await oracle.reviseDiscoveryProposal({
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
        (oracle as any).textGeneration.reviseEntityUpdate,
      ).not.toHaveBeenCalled();

      (mockUiStore as any).aiDisabled = false;
    });

    it("should expose searchService through the oracle execution context", () => {
      const context = oracle.getExecutionContext();

      expect(context.searchService).toBeDefined();
      expect(typeof context.searchService.search).toBe("function");
    });

    it("should expose generatePlotAnalysis through the textGeneration context", () => {
      const context = oracle.getExecutionContext();

      expect(context.textGeneration).toBeDefined();
      expect(typeof context.textGeneration.generatePlotAnalysis).toBe(
        "function",
      );
    });

    it("should expose oracle automation policy through the execution context", () => {
      (mockUiStore as any).oracleAutomationPolicy = {
        entityDiscovery: "suggest",
        connectionDiscovery: "suggest",
      };

      const context = oracle.getExecutionContext();

      expect(context.automationPolicy).toEqual({
        entityDiscovery: "suggest",
        connectionDiscovery: "suggest",
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
        discoveryPolicyStore: mockUiStore as any,
        sessionModeStore: mockUiStore as any,
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
      expect(typeof context.chatHistory.removeMessage).toBe("function");

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

    it("does not auto-apply discovery connections for legacy auto-apply mode", async () => {
      (mockUiStore as any).connectionDiscoveryMode = "auto-apply";

      const count = await oracle.handleDiscoveryConnectionsForEntity("entity");

      expect(count).toBe(0);
      expect(mockAnalyzeAndApplyEntityById).not.toHaveBeenCalled();
      expect(mockAnalyzeEntityById).toHaveBeenCalledWith(
        "entity",
        false,
        undefined,
      );
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
        oracle.reviseDiscoveryProposal({ title: "No ID" } as any),
      ).rejects.toThrow(
        "Discovery proposal does not target an existing record.",
      );
    });

    it("should throw error if entity not found in vault", async () => {
      (mockVault as any).entities = {};
      await expect(
        oracle.reviseDiscoveryProposal({
          entityId: "missing",
          title: "Missing",
        } as any),
      ).rejects.toThrow("Entity missing was not found.");
    });

    it("should fall back to local update if revision fails", async () => {
      (mockVault as any).entities = {
        e1: { id: "e1", title: "E1", content: "C", lore: "L" },
      };
      (oracle as any).textGeneration.reviseEntityUpdate = vi
        .fn()
        .mockRejectedValue(new Error("Fail"));

      const result = await oracle.reviseDiscoveryProposal({
        entityId: "e1",
        title: "E1",
        draft: { chronicle: "new", lore: "more" },
      } as any);

      expect(result.content).toBe("C");
      expect(result.lore).toBe("L\n\nmore");
    });

    it("should bypass AI revision for guest users in reviseDiscoveryProposal", async () => {
      (mockVault as any).isGuest = true;
      (mockVault as any).entities = {
        e1: { id: "e1", title: "E1", content: "C", lore: "L" },
      };
      (oracle as any).textGeneration.reviseEntityUpdate = vi.fn();

      const result = await oracle.reviseDiscoveryProposal({
        entityId: "e1",
        title: "E1",
        draft: { chronicle: "new", lore: "more" },
      } as any);

      expect(result.content).toBe("C");
      expect(result.lore).toBe("L\n\nmore");
      expect(
        (oracle as any).textGeneration.reviseEntityUpdate,
      ).not.toHaveBeenCalled();
    });

    describe("reviseSmartApply", () => {
      beforeEach(() => {
        (mockVault as any).entities = {
          target: {
            id: "target",
            title: "Zariel",
            type: "npc",
            content: "Old chronicle",
            lore: "Old lore",
            connections: [],
          },
        };
      });

      it("calls reviseEntityUpdate with snapshotted args and returns selective fields", async () => {
        (oracle as any).textGeneration.reviseEntityUpdate = vi
          .fn()
          .mockResolvedValue({
            content: "Merged chronicle",
            lore: "Merged lore",
          });

        const result = await oracle.reviseSmartApply("target", {
          chronicle: "New chronicle",
          lore: "New lore",
        });

        expect(
          (oracle as any).textGeneration.reviseEntityUpdate,
        ).toHaveBeenCalledWith(
          "test-key",
          "test-model",
          expect.objectContaining({ id: "target" }),
          { chronicle: "New chronicle", lore: "New lore" },
          expect.any(Array),
          expect.any(Array),
          expect.objectContaining({
            source: "smart-apply",
            instructions: undefined,
            priority: "incoming-first",
          }),
        );
        expect(result).toEqual({
          content: "Merged chronicle",
          lore: "Merged lore",
          categoryId: undefined,
        });
      });

      it("returns full revised result even when only chronicle is incoming", async () => {
        (oracle as any).textGeneration.reviseEntityUpdate = vi
          .fn()
          .mockResolvedValue({
            content: "Merged chronicle",
            lore: "Enriched lore",
          });

        const result = await oracle.reviseSmartApply("target", {
          chronicle: "New chronicle",
        });

        expect(result.content).toBe("Merged chronicle");
        expect(result.lore).toBe("Enriched lore");
      });

      it("falls back to existing content when AI returns empty strings", async () => {
        (oracle as any).textGeneration.reviseEntityUpdate = vi
          .fn()
          .mockResolvedValue({ content: "", lore: "" });

        const result = await oracle.reviseSmartApply("target", {
          chronicle: "New chronicle",
          lore: "New lore",
        });

        expect(result.content).toBe("Old chronicle");
        expect(result.lore).toBe("Old lore");
      });

      it("falls back to local append when AI is disabled", async () => {
        (mockUiStore as any).aiDisabled = true;
        (oracle as any).textGeneration.reviseEntityUpdate = vi.fn();

        const result = await oracle.reviseSmartApply("target", {
          chronicle: "Appended",
          lore: "New lore",
        });

        expect(result).toEqual({
          content: "Old chronicle\n\nAppended",
          lore: "Old lore\n\nNew lore",
        });
        expect(
          (oracle as any).textGeneration.reviseEntityUpdate,
        ).not.toHaveBeenCalled();
      });

      it("falls back to local append when in guest mode", async () => {
        (mockVault as any).isGuest = true;
        (oracle as any).textGeneration.reviseEntityUpdate = vi.fn();

        const result = await oracle.reviseSmartApply("target", {
          chronicle: "Guest Appended",
          lore: "Guest Lore",
        });

        expect(result).toEqual({
          content: "Old chronicle\n\nGuest Appended",
          lore: "Old lore\n\nGuest Lore",
        });
        expect(
          (oracle as any).textGeneration.reviseEntityUpdate,
        ).not.toHaveBeenCalled();
      });

      it("falls back to local append when reviseEntityUpdate throws", async () => {
        (oracle as any).textGeneration.reviseEntityUpdate = vi
          .fn()
          .mockRejectedValue(new Error("AI error"));

        const result = await oracle.reviseSmartApply("target", {
          lore: "Extra lore",
        });

        expect(result).toEqual({ lore: "Old lore\n\nExtra lore" });
      });

      it("throws when entity is not found", async () => {
        (mockVault as any).entities = {};
        await expect(
          oracle.reviseSmartApply("missing", { chronicle: "x" }),
        ).rejects.toThrow("Entity missing not found.");
      });
    });

    describe("reviseNewEntityDraft", () => {
      it("should bypass AI revision and use raw draft for guest users", async () => {
        (mockVault as any).isGuest = true;
        const result = await oracle.reviseNewEntityDraft("New Subject", "npc", {
          chronicle: "guest chronicle",
          lore: "guest lore",
        });

        expect(
          (oracle as any).textGeneration.reviseEntityUpdate,
        ).not.toHaveBeenCalled();
        expect(result).toEqual({
          content: "guest chronicle",
          lore: "guest lore",
        });
      });
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
      expect(mockChatHistory.destroy).toHaveBeenCalled();
    });

    it("should ignore unhandled worker event types", () => {
      const mockEvent = { type: "UNKNOWN_EVENT" };
      // Should not throw or do anything
      expect(() => (oracle as any).handleWorkerEvent(mockEvent)).not.toThrow();
    });
  });
});
