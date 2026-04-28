import { describe, it, expect, vi, beforeEach } from "vitest";
import { OracleGenerator } from "./oracle-generator";

describe("OracleGenerator", () => {
  let generator: OracleGenerator;
  let mockContext: any;

  beforeEach(() => {
    generator = new OracleGenerator();
    mockContext = {
      chatHistory: {
        messages: [],
        addMessage: vi.fn(),
      },
      effectiveApiKey: "key",
      textGeneration: {
        expandQuery: vi.fn().mockResolvedValue("expanded"),
        generateResponse: vi.fn(),
      },
      contextRetrieval: {
        retrieveContext: vi.fn().mockResolvedValue({
          primaryEntityId: "e1",
          sourceIds: ["e1"],
          content: "ctx",
        }),
      },
      imageGeneration: {
        distillVisualPrompt: vi.fn().mockResolvedValue("prompt"),
        generateImage: vi.fn().mockResolvedValue(new Blob([])),
      },
      vault: {
        entities: { e1: { id: "e1", title: "Entity 1", labels: [] } },
      },
      uiStore: {},
      categories: [],
      modelName: "model",
      isDemoMode: false,
    };
  });

  describe("identifyPrimaryEntity", () => {
    it("should proceed even if no api key (proxy mode)", async () => {
      mockContext.effectiveApiKey = null;
      const result = await generator.identifyPrimaryEntity(
        "query",
        mockContext,
      );
      expect(mockContext.contextRetrieval.retrieveContext).toHaveBeenCalled();
      expect(result.sourceIds).toContain("e1");
    });

    it("should expand query if messages > 2", async () => {
      mockContext.chatHistory.messages = [
        { role: "user", content: "m1" },
        { role: "assistant", content: "m2" },
        { role: "user", content: "m3" },
      ];
      await generator.identifyPrimaryEntity("q", mockContext);
      expect(mockContext.textGeneration.expandQuery).toHaveBeenCalled();
    });

    it("should find last focus entity", async () => {
      mockContext.chatHistory.messages = [
        { role: "assistant", content: "m1", entityId: "last-one" },
      ];
      await generator.identifyPrimaryEntity("q", mockContext);
      expect(mockContext.contextRetrieval.retrieveContext).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Set),
        expect.any(Object),
        "last-one",
        false,
      );
    });
  });

  describe("generateChatResponse", () => {
    it("should proceed even if no api key (proxy mode)", async () => {
      mockContext.effectiveApiKey = null;
      await generator.generateChatResponse("q", mockContext, vi.fn());
      expect(mockContext.textGeneration.generateResponse).toHaveBeenCalled();
    });

    it("should call generateResponse", async () => {
      await generator.generateChatResponse("q", mockContext, vi.fn());
      expect(mockContext.textGeneration.generateResponse).toHaveBeenCalled();
    });
  });

  describe("visualizations", () => {
    it("should generate entity visualization", async () => {
      const result = await generator.generateEntityVisualization(
        "e1",
        mockContext,
      );
      expect(result).toBeInstanceOf(Blob);
      expect(mockContext.imageGeneration.generateImage).toHaveBeenCalled();
    });

    it("should prioritize entity labels in entity visualization prompts", async () => {
      mockContext.vault.entities.e1.labels = ["necromancy", "regal", "undead"];

      await generator.generateEntityVisualization("e1", mockContext);

      expect(
        mockContext.imageGeneration.distillVisualPrompt,
      ).toHaveBeenCalledWith(
        "key",
        expect.stringContaining("HIGH-PRIORITY VISUAL LABELS"),
        "ctx",
        "model",
        false,
      );
      expect(
        mockContext.imageGeneration.distillVisualPrompt,
      ).toHaveBeenCalledWith(
        "key",
        expect.stringContaining("- necromancy"),
        "ctx",
        "model",
        false,
      );
    });

    it("should generate message visualization", async () => {
      const msg = { content: "hello", entityId: "e1" };
      const result = await generator.generateMessageVisualization(
        msg as any,
        mockContext,
      );
      expect(result).toBeInstanceOf(Blob);
    });

    it("should prioritize linked entity labels in message visualization prompts", async () => {
      mockContext.vault.entities.e1.labels = ["desert", "sorcery"];

      await generator.generateMessageVisualization(
        { content: "draw it", entityId: "e1" } as any,
        mockContext,
      );

      expect(
        mockContext.imageGeneration.distillVisualPrompt,
      ).toHaveBeenCalledWith(
        "key",
        expect.stringContaining("- desert"),
        "ctx",
        "model",
        false,
      );
    });
  });

  describe("generateRegenerationResponse", () => {
    it("should build correct prompt with existing content and theme", async () => {
      mockContext.vault.entities.e1 = {
        id: "e1",
        title: "Entity 1",
        type: "npc",
        content: "Old chronicle",
        lore: "Old lore",
        connections: [],
      };
      mockContext.vault.inboundConnections = {};
      mockContext.uiStore.activeTheme = { id: "fantasy" };

      await generator.generateRegenerationResponse("e1", mockContext, vi.fn());

      expect(mockContext.textGeneration.generateResponse).toHaveBeenCalledWith(
        "key",
        expect.stringContaining("Generate content for: **Entity 1** (npc)"),
        [],
        "", // empty connection context — no connections in this test
        "model",
        expect.any(Function),
        false,
        [],
        expect.objectContaining({
          existingEntities: expect.any(Array),
        }),
      );

      const prompt =
        mockContext.textGeneration.generateResponse.mock.calls[0][1];
      expect(prompt).toContain("EXISTING CONTENT TO PRESERVE AND EXPAND:");
      expect(prompt).toContain("Chronicle: Old chronicle");
      expect(prompt).toContain("Lore: Old lore");
      expect(prompt).toContain("THEME: fantasy");
      expect(prompt).toContain("**Chronicle:**");
      expect(prompt).toContain("**Lore:**");
    });

    it("should include slim connection context from outbound links", async () => {
      mockContext.vault.entities = {
        e1: {
          id: "e1",
          title: "Entity 1",
          type: "npc",
          content: "Hero",
          lore: "Protagonist backstory",
          connections: [{ target: "e2", label: "ally" }],
        },
        e2: {
          id: "e2",
          title: "Companion",
          type: "npc",
          content: "Loyal companion",
          lore: "Secret GM lore that should not leak",
          aliases: ["Friend"],
          tags: ["loyal"],
        },
      };
      mockContext.vault.inboundConnections = {};
      mockContext.uiStore.activeTheme = { id: "default" };

      await generator.generateRegenerationResponse("e1", mockContext, vi.fn());

      const prompt =
        mockContext.textGeneration.generateResponse.mock.calls[0][1];
      expect(prompt).toContain("Companion (npc)");
      expect(prompt).toContain("Loyal companion");
      expect(prompt).toContain("Aliases: Friend");
      expect(prompt).toContain("Tags: loyal");
      // lore of the connected entity must NOT be included in the context
      expect(prompt).not.toContain("Secret GM lore that should not leak");
    });
  });
});
