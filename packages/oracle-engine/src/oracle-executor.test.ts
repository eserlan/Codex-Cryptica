import { describe, it, expect, vi, beforeEach } from "vitest";
import { OracleActionExecutor } from "./oracle-executor";

describe("OracleActionExecutor - Detailed", () => {
  let executor: OracleActionExecutor;
  let mockContext: any;

  beforeEach(() => {
    executor = new OracleActionExecutor();
    mockContext = {
      chatHistory: {
        addMessage: vi.fn().mockResolvedValue(undefined),
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
      aiService: {
        generatePlotAnalysis: vi.fn(),
        expandQuery: vi.fn(),
        retrieveContext: vi.fn(),
        generateResponse: vi.fn(),
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

    it("should post user message and start assistant message", async () => {
      vi.stubGlobal("navigator", { onLine: true });
      mockContext.aiService.retrieveContext.mockResolvedValue({
        content: "ctx",
        sourceIds: [],
      });

      await executor.execute(
        {
          type: "chat",
          query: "Tell me about dragons",
          isAIIntent: true,
        },
        mockContext,
      );

      // 1. User Message
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "user",
          content: "Tell me about dragons",
        }),
      );

      // 2. Initial Assistant Message (Empty content for streaming)
      expect(mockContext.chatHistory.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "assistant",
          content: "",
        }),
      );
    });
  });
});
