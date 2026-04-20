import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
        updateMessage: vi.fn().mockImplementation(async (id, updates) => {
          const index = mockContext.chatHistory.messages.findIndex(
            (msg: { id: string }) => msg.id === id,
          );
          if (index !== -1) {
            mockContext.chatHistory.messages[index] = {
              ...mockContext.chatHistory.messages[index],
              ...updates,
            };
          }
        }),
        clearMessages: vi.fn().mockResolvedValue(undefined),
        setMessages: vi.fn(),
        messages: [],
      },
      uiStore: { aiDisabled: false },
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
        reconcileEntityUpdate: vi.fn(),
      },
      imageGeneration: {
        generateImage: vi.fn(),
        distillVisualPrompt: vi.fn(),
      },
      proposeConnectionsForEntity: vi.fn().mockResolvedValue(undefined),
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
      mockContext.proposeConnectionsForEntity.mockResolvedValue(2);
      mockContext.chatHistory.messages = [
        {
          id: "m1",
          role: "assistant",
          content: "Orc serves the Red Hand and guards Blackstone Keep.",
        },
      ];

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
      expect(mockContext.proposeConnectionsForEntity).toHaveBeenCalledWith(
        "new-id",
        {
          apply: true,
          analysisText: "Orc serves the Red Hand and guards Blackstone Keep.",
        },
      );
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "system",
          content: expect.stringContaining(
            "Created node: **Orc** (NPC) and added 2 connections",
          ),
        }),
      );
    });

    it("should still pass fallback analysis text when recent chat does not mention the new entity", async () => {
      mockContext.proposeConnectionsForEntity.mockResolvedValue(0);
      mockContext.chatHistory.messages = [
        {
          id: "m1",
          role: "assistant",
          content: "The Red Hand is mobilizing across the valley.",
        },
      ];

      await executor.execute(
        {
          type: "create",
          entityName: "Orc",
          entityType: "npc",
          isDrawing: false,
        },
        mockContext,
      );

      expect(mockContext.proposeConnectionsForEntity).toHaveBeenCalledWith(
        "new-id",
        {
          apply: true,
          analysisText: "Orc\n\nThe Red Hand is mobilizing across the valley.",
        },
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

    it("should show restricted help when AI is disabled", async () => {
      mockContext.uiStore.aiDisabled = true;
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

    it("should allow plot without key (proxy mode)", async () => {
      mockContext.effectiveApiKey = null;
      // Setup mock to prevent the "Cannot read properties of undefined (reading '0')" error
      mockContext.searchService.search.mockResolvedValue([
        { id: "e1", title: "Hero" },
      ]);
      mockContext.vault.entities["e1"] = {
        id: "e1",
        title: "Hero",
        connections: [],
      };

      await executor.execute({ type: "plot", query: "Hero" }, mockContext);
      expect(
        mockContext.textGeneration.generatePlotAnalysis,
      ).toHaveBeenCalled();
    });

    it("should disable plot when AI is disabled", async () => {
      mockContext.uiStore.aiDisabled = true;
      await executor.execute({ type: "plot", query: "Hero" }, mockContext);
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("is powered by AI and is disabled"),
        }),
      );
    });
  });

  describe("executeConnectAI and executeMergeAI", () => {
    it("should allow connect-ai without key (proxy mode)", async () => {
      mockContext.effectiveApiKey = null;
      await executor.execute({ type: "connect-ai", query: "q" }, mockContext);
      expect(mockContext.chatHistory.addMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("requires an AI API key"),
        }),
      );
    });

    it("should allow merge-ai without key (proxy mode)", async () => {
      mockContext.effectiveApiKey = null;
      await executor.execute({ type: "merge-ai", query: "q" }, mockContext);
      expect(mockContext.chatHistory.addMessage).not.toHaveBeenCalledWith(
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
      mockGenerator.generateChatResponse.mockImplementation(
        async (
          _query: string,
          _context: any,
          onPartial: (partial: string) => void,
        ) => {
          onPartial("partial response");
          return { primaryEntityId: "e1", sourceIds: ["e1"] };
        },
      );

      await executor.execute(
        { type: "chat", query: "tell me a story", isAIIntent: true },
        mockContext,
      );

      expect(mockContext.chatHistory.updateMessage).toHaveBeenCalledWith(
        expect.any(String),
        { content: "partial response" },
        false,
      );
      expect(mockContext.chatHistory.messages.at(-1)?.content).toBe(
        "partial response",
      );
      expect(mockContext.chatHistory.setMessages).toHaveBeenCalled();
    });

    it("should reconcile existing entity updates during auto-archive", async () => {
      mockContext.uiStore.autoArchive = true;
      mockContext.vault.entities = {
        e1: {
          id: "e1",
          title: "Thay",
          type: "location",
          content: "Old chronicle",
          lore: "Old lore",
        },
      };
      mockContext.draftingEngine = {
        propose: vi.fn().mockResolvedValue([
          {
            entityId: "e1",
            title: "Thay",
            type: "location",
            draft: {
              chronicle: "New chronicle",
              lore: "New lore",
            },
            confidence: 0.95,
          },
        ]),
      };
      mockContext.textGeneration.reconcileEntityUpdate.mockResolvedValue({
        content: "Reconciled chronicle",
        lore: "Reconciled lore",
      });
      mockGenerator.generateChatResponse.mockResolvedValue({
        primaryEntityId: "e1",
        sourceIds: ["e1"],
      });

      await executor.execute(
        { type: "chat", query: "tell me of thay", isAIIntent: true },
        mockContext,
      );

      expect(
        mockContext.textGeneration.reconcileEntityUpdate,
      ).toHaveBeenCalledWith(
        "fake-key",
        "gemini-2.0-pro",
        mockContext.vault.entities.e1,
        {
          chronicle: "New chronicle",
          lore: "New lore",
        },
        [],
      );
      expect(mockContext.vault.updateEntity).toHaveBeenCalledWith("e1", {
        content: "Reconciled chronicle",
        lore: "Reconciled lore",
      });
      expect(mockContext.proposeConnectionsForEntity).toHaveBeenCalledWith(
        "e1",
      );
    });

    it("should seed connection proposals for newly auto-archived entities", async () => {
      mockContext.uiStore.autoArchive = true;
      mockContext.draftingEngine = {
        propose: vi.fn().mockResolvedValue([
          {
            title: "Valerius",
            type: "npc",
            draft: {
              chronicle: "A reclusive alchemist",
              lore: "Valerius works from a crystal tower.",
            },
            confidence: 0.92,
          },
        ]),
      };
      mockGenerator.generateChatResponse.mockResolvedValue({
        primaryEntityId: "e1",
        sourceIds: ["e1"],
      });

      await executor.execute(
        {
          type: "chat",
          query: "There is a reclusive alchemist named Valerius",
          isAIIntent: true,
        },
        mockContext,
      );

      expect(mockContext.vault.createEntity).toHaveBeenCalledWith(
        "npc",
        "Valerius",
        expect.objectContaining({
          content: "A reclusive alchemist",
          lore: "Valerius works from a crystal tower.",
          status: "draft",
        }),
      );
      expect(mockContext.proposeConnectionsForEntity).toHaveBeenCalledWith(
        "new-id",
      );
    });

    it("should await connection seeding for each auto-archived discovery", async () => {
      mockContext.uiStore.autoArchive = true;
      mockContext.vault.createEntity = vi
        .fn()
        .mockResolvedValueOnce("new-id-1")
        .mockResolvedValueOnce("new-id-2");
      mockContext.draftingEngine = {
        propose: vi.fn().mockResolvedValue([
          {
            title: "Valerius",
            type: "npc",
            draft: {
              chronicle: "A reclusive alchemist",
              lore: "Valerius works from a crystal tower.",
            },
            confidence: 0.92,
          },
          {
            title: "Azure Wastes",
            type: "location",
            draft: {
              chronicle: "A frozen frontier",
              lore: "The wastes stretch beyond the last watchtower.",
            },
            confidence: 0.9,
          },
        ]),
      };
      mockGenerator.generateChatResponse.mockResolvedValue({
        primaryEntityId: "e1",
        sourceIds: ["e1"],
      });

      await executor.execute(
        {
          type: "chat",
          query: "Valerius travels across the Azure Wastes",
          isAIIntent: true,
        },
        mockContext,
      );

      expect(mockContext.proposeConnectionsForEntity).toHaveBeenNthCalledWith(
        1,
        "new-id-1",
      );
      expect(mockContext.proposeConnectionsForEntity).toHaveBeenNthCalledWith(
        2,
        "new-id-2",
      );
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
