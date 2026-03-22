import { describe, it, expect, vi, beforeEach } from "vitest";
import { OracleActionExecutor } from "./oracle-executor";

describe("OracleActionExecutor - Detailed", () => {
  let executor: OracleActionExecutor;
  let mockContext: any;
  let mockGenerator: any;

  beforeEach(() => {
    vi.stubGlobal("navigator", { onLine: true });

    mockGenerator = {
      identifyPrimaryEntity: vi
        .fn()
        .mockResolvedValue({ primaryEntityId: "e1", sourceIds: [] }),
      generateChatResponse: vi
        .fn()
        .mockResolvedValue({ primaryEntityId: "e1", sourceIds: ["e1"] }),
      generateEntityVisualization: vi.fn().mockResolvedValue(new Blob([])),
      generateMessageVisualization: vi.fn().mockResolvedValue(new Blob([])),
    };
    executor = new OracleActionExecutor(mockGenerator);
    mockContext = {
      chatHistory: {
        addMessage: vi.fn().mockImplementation(async (msg) => {
          mockContext.chatHistory.messages.push(msg);
        }),
        clearMessages: vi.fn().mockResolvedValue(undefined),
        setMessages: vi.fn(),
        messages: [],
      },
      uiStore: { liteMode: false },
      vault: {
        isGuest: false,
        createEntity: vi.fn().mockResolvedValue("new-id"),
        updateEntity: vi.fn().mockResolvedValue(undefined),
        addConnection: vi.fn().mockResolvedValue(true),
        removeConnection: vi.fn().mockResolvedValue(true),
        entities: {},
        inboundConnections: {},
      },
      searchService: {
        search: vi.fn(),
      },
      textGeneration: {
        generatePlotAnalysis: vi.fn(),
        expandQuery: vi.fn(),
        generateResponse: vi.fn(),
      },
      imageGeneration: {
        generateImage: vi.fn(),
        distillVisualPrompt: vi.fn(),
      },
      contextRetrieval: {
        retrieveContext: vi.fn(),
      },
      undoRedo: {
        pushUndoAction: vi.fn(),
      },
      graph: { requestFit: vi.fn() },
      tier: "advanced",
      modelName: "gemini-2.0-pro",
      effectiveApiKey: "fake-key",
      isDemoMode: false,
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("executeCreate", () => {
    it("should create an entity and notify history", async () => {
      await executor.execute(
        {
          type: "create",
          entityName: "Orc",
          entityType: "npc",
          isDrawing: false,
        },
        mockContext,
      );

      expect(mockContext.vault.createEntity).toHaveBeenCalledWith(
        "npc",
        "Orc",
        expect.any(Object),
      );
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "system",
          content: expect.stringContaining("Created node: **Orc**"),
        }),
      );
    });

    it("should handle guest user restrictions", async () => {
      mockContext.vault.isGuest = true;
      await executor.execute(
        {
          type: "create",
          entityName: "Orc",
          entityType: "npc",
          isDrawing: false,
        },
        mockContext,
      );

      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("Guest users cannot create nodes"),
        }),
      );
    });
  });

  describe("executeConnect", () => {
    it("should search for entities and create connection", async () => {
      mockContext.searchService.search
        .mockResolvedValueOnce([{ id: "a" }])
        .mockResolvedValueOnce([{ id: "b" }]);

      mockContext.vault.entities = {
        a: { id: "a", title: "Alpha" },
        b: { id: "b", title: "Beta" },
      };

      await executor.execute(
        {
          type: "connect",
          sourceName: "Alpha",
          label: "friends",
          targetName: "Beta",
        },
        mockContext,
      );

      expect(mockContext.vault.addConnection).toHaveBeenCalledWith(
        "a",
        "b",
        "related_to",
        "friends",
      );
      expect(mockContext.undoRedo.pushUndoAction).toHaveBeenCalled();
    });

    it("should report error if entity not found", async () => {
      mockContext.searchService.search.mockResolvedValue([]);

      await executor.execute(
        {
          type: "connect",
          sourceName: "Missing",
          label: "x",
          targetName: "Beta",
        },
        mockContext,
      );

      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("Could not find source entity"),
        }),
      );
    });
  });

  describe("executeHelp", () => {
    it("should show help message", async () => {
      await executor.execute({ type: "help" }, mockContext);
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "system",
          content: expect.stringContaining("Oracle Command Guide"),
        }),
      );
    });

    it("should show restricted help in lite mode", async () => {
      mockContext.uiStore.liteMode = true;
      await executor.execute({ type: "help" }, mockContext);
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("Restricted Mode Active"),
        }),
      );
    });
  });

  describe("executeRoll", () => {
    beforeEach(() => {
      mockContext.diceParser = { parse: vi.fn() };
      mockContext.diceEngine = { execute: vi.fn() };
      mockContext.diceHistory = { addResult: vi.fn() };
    });

    it("should execute a valid roll", async () => {
      mockContext.diceParser.parse.mockReturnValue({});
      mockContext.diceEngine.execute.mockReturnValue({ total: 10 });

      await executor.execute({ type: "roll", formula: "1d20" }, mockContext);

      expect(mockContext.diceHistory.addResult).toHaveBeenCalled();
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "roll" }),
      );
    });

    it("should handle roll errors", async () => {
      mockContext.diceParser.parse.mockImplementation(() => {
        throw new Error("Invalid formula");
      });

      await executor.execute({ type: "roll", formula: "abc" }, mockContext);

      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("Roll failed: Invalid formula"),
        }),
      );
    });

    it("should require a formula", async () => {
      await executor.execute({ type: "roll", formula: "" }, mockContext);
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("Please specify a roll formula"),
        }),
      );
    });
  });

  describe("executeMerge", () => {
    beforeEach(() => {
      mockContext.nodeMergeService = {
        proposeMerge: vi.fn(),
        executeMerge: vi.fn(),
      };
    });

    it("should merge two entities", async () => {
      mockContext.searchService.search
        .mockResolvedValueOnce([{ id: "s" }])
        .mockResolvedValueOnce([{ id: "t" }]);
      mockContext.vault.entities = {
        s: { id: "s", title: "Source" },
        t: { id: "t", title: "Target" },
      };
      mockContext.nodeMergeService.proposeMerge.mockResolvedValue({});

      await executor.execute(
        { type: "merge", sourceName: "S", targetName: "T" },
        mockContext,
      );

      expect(mockContext.nodeMergeService.executeMerge).toHaveBeenCalled();
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("Merged **Source** into **Target**"),
        }),
      );
    });

    it("should prevent merging into itself", async () => {
      mockContext.searchService.search.mockResolvedValue([{ id: "same" }]);

      await executor.execute(
        { type: "merge", sourceName: "A", targetName: "A" },
        mockContext,
      );

      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining(
            "Cannot merge an entity into itself",
          ),
        }),
      );
    });
  });

  describe("executePlot", () => {
    it("should generate plot analysis", async () => {
      mockContext.searchService.search.mockResolvedValue([{ id: "e1" }]);
      mockContext.vault.entities = {
        e1: {
          id: "e1",
          title: "Hero",
          connections: [{ target: "e2", label: "enemy" }],
        },
        e2: { id: "e2", title: "Villain" },
      };
      mockContext.vault.inboundConnections = {
        e1: [{ sourceId: "e3", connection: { type: "friend" } }],
      };
      mockContext.vault.entities.e3 = { id: "e3", title: "Sidekick" };

      mockContext.textGeneration.generatePlotAnalysis.mockResolvedValue(
        "Plot details",
      );

      await executor.execute({ type: "plot", query: "Hero" }, mockContext);

      expect(
        mockContext.textGeneration.generatePlotAnalysis,
      ).toHaveBeenCalled();
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Plot details",
          sources: expect.arrayContaining(["e1", "e2", "e3"]),
        }),
      );
    });

    it("should require AI key for plot", async () => {
      mockContext.effectiveApiKey = null;
      await executor.execute({ type: "plot", query: "Hero" }, mockContext);
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("requires an AI API key"),
        }),
      );
    });

    it("should disable plot in lite mode", async () => {
      mockContext.uiStore.liteMode = true;
      await executor.execute({ type: "plot", query: "Hero" }, mockContext);
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("disabled in Lite Mode"),
        }),
      );
    });
  });

  describe("executeConnectAI and executeMergeAI", () => {
    it("should handle missing key for connect-ai", async () => {
      mockContext.effectiveApiKey = null;
      await executor.execute({ type: "connect-ai", query: "q" }, mockContext);
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("requires an AI API key"),
        }),
      );
    });

    it("should handle missing key for merge-ai", async () => {
      mockContext.effectiveApiKey = null;
      await executor.execute({ type: "merge-ai", query: "q" }, mockContext);
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("requires an AI API key"),
        }),
      );
    });
  });

  describe("executeChat", () => {
    it("should handle offline mode", async () => {
      vi.stubGlobal("navigator", { onLine: false });

      await executor.execute(
        {
          type: "chat",
          query: "Hello",
          isAIIntent: true,
        },
        mockContext,
      );

      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("Oracle is currently offline"),
        }),
      );

      vi.unstubAllGlobals();
    });

    it("should handle disabled AI intent", async () => {
      await executor.execute(
        { type: "chat", query: "hi", isAIIntent: false },
        mockContext,
      );
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("features are disabled"),
        }),
      );
    });

    it("should handle image intent", async () => {
      mockContext.effectiveApiKey = "key";
      vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob-url") });

      await executor.execute(
        { type: "chat", query: "/draw orc", isAIIntent: true },
        mockContext,
      );

      expect(mockContext.chatHistory.setMessages).toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it("should handle text response", async () => {
      await executor.execute(
        { type: "chat", query: "tell me a story", isAIIntent: true },
        mockContext,
      );

      expect(mockContext.chatHistory.setMessages).toHaveBeenCalled();
    });
  });

  describe("drawing", () => {
    beforeEach(() => {
      vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "url") });
    });

    it("should draw entity in demo mode", async () => {
      mockContext.isDemoMode = true;
      mockContext.vault.entities = { e1: { title: "T" } };
      await executor.drawEntity("e1", mockContext);
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "image" }),
      );
    });

    it("should draw entity and save to vault", async () => {
      mockContext.isDemoMode = false;
      mockContext.vault.entities = { e1: { title: "T" } };
      mockContext.vault.saveImageToVault = vi
        .fn()
        .mockResolvedValue({ image: "i", thumbnail: "t" });

      await executor.drawEntity("e1", mockContext);
      expect(mockContext.vault.updateEntity).toHaveBeenCalled();
    });
    it("should draw message", async () => {
      mockContext.chatHistory.messages = [{ id: "m1", content: "c" }];
      await executor.drawMessage("m1", mockContext);
      expect(mockContext.chatHistory.setMessages).toHaveBeenCalled();
    });
  });

  describe("execute error", () => {
    it("should show error messages", async () => {
      await executor.execute({ type: "error", message: "Boom" }, mockContext);
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({ content: "❌ Boom" }),
      );
    });
  });
});
