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

    it("should apply category and theme defaults to entity visualization prompts", async () => {
      mockContext.vault.entities.e1 = {
        id: "e1",
        title: "Almos",
        type: "character",
        labels: [],
      };
      mockContext.uiStore.activeThemeId = "fantasy";

      await generator.generateEntityVisualization("e1", mockContext);

      expect(
        mockContext.imageGeneration.distillVisualPrompt,
      ).toHaveBeenCalledWith(
        "key",
        expect.stringContaining("full character concept art"),
        "ctx",
        "model",
        false,
      );
    });

    it("should prefer entity art direction from normal content", async () => {
      mockContext.vault.entities.e1 = {
        id: "e1",
        title: "Almos",
        type: "character",
        labels: [],
        content:
          "Chronicle text\n\n## Art Direction\nink wash portrait with a silver mask\n\n## Notes\nOther text",
      };

      await generator.generateEntityVisualization("e1", mockContext);

      expect(
        mockContext.imageGeneration.distillVisualPrompt,
      ).toHaveBeenCalledWith(
        "key",
        expect.stringContaining("Almos. ink wash portrait"),
        "ctx",
        "model",
        false,
      );
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

    it("should apply chat art direction for unlinked message visualization", async () => {
      await generator.generateMessageVisualization(
        {
          content:
            "Draw the moon gate\n\n## Art Direction\nflat ink and gold leaf icon",
        } as any,
        mockContext,
      );

      expect(
        mockContext.imageGeneration.distillVisualPrompt,
      ).toHaveBeenCalledWith(
        "key",
        expect.stringContaining("Draw the moon gate. flat ink and gold leaf icon"),
        "ctx",
        "model",
        false,
      );
    });

    it("should use /draw category hints when no entity is linked", async () => {
      await generator.generateMessageVisualization(
        { content: "/draw character Almos" } as any,
        mockContext,
      );

      expect(
        mockContext.imageGeneration.distillVisualPrompt,
      ).toHaveBeenCalledWith(
        "key",
        expect.stringContaining("Almos, full character concept art"),
        "ctx",
        "model",
        false,
      );
    });

    it("should let linked entity metadata win over /draw category hints", async () => {
      mockContext.vault.entities.e1 = {
        id: "e1",
        title: "Almos",
        type: "location",
        labels: [],
      };

      await generator.generateMessageVisualization(
        { content: "/draw character Almos", entityId: "e1" } as any,
        mockContext,
      );

      expect(
        mockContext.imageGeneration.distillVisualPrompt,
      ).toHaveBeenCalledWith(
        "key",
        expect.stringContaining("Almos, establishing environment art"),
        "ctx",
        "model",
        false,
      );
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
      mockContext.uiStore.activeThemeId = "default";

      await generator.generateRegenerationResponse("e1", mockContext, vi.fn());

      // Connection context is passed as the 4th arg (context) to generateResponse, not in the prompt
      const connectionContext =
        mockContext.textGeneration.generateResponse.mock.calls[0][3];
      expect(connectionContext).toContain("Companion (npc)");
      expect(connectionContext).toContain("Loyal companion");
      expect(connectionContext).toContain("Aliases: Friend");
      expect(connectionContext).toContain("Tags: loyal");
      // lore of the connected entity must NOT be included
      expect(connectionContext).not.toContain(
        "Secret GM lore that should not leak",
      );
    });
  });
});
