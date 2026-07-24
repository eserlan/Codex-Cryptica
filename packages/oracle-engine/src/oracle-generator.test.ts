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
        distillVisualSubject: vi.fn().mockResolvedValue("prompt"),
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

    // Art Direction v2 inverts the old flow: the model writes only the
    // subject, and category/theme/camera are composed around it afterwards.
    // These assert the composed output, not what was sent to the distiller.
    it("should apply category and theme defaults to entity visualization prompts", async () => {
      mockContext.vault.entities.e1 = {
        id: "e1",
        title: "Almos",
        type: "character",
        labels: [],
      };
      mockContext.uiStore.activeThemeId = "fantasy";

      const prepared = await generator.prepareEntityVisualizationPrompt(
        "e1",
        mockContext,
      );

      expect(prepared.prompt).toContain("full-body character concept art");
      expect(prepared.prompt).toContain("painterly oil rendering");
      expect(prepared.metadata.categoryId).toBe("character");
      expect(prepared.metadata.themeId).toBe("fantasy");
      expect(prepared.negativeTerms).toContain("stiff A-pose");
    });

    it("should ask the distiller for description only, not art direction", async () => {
      mockContext.vault.entities.e1 = {
        id: "e1",
        title: "Almos",
        type: "character",
        labels: [],
      };
      mockContext.uiStore.activeThemeId = "fantasy";

      await generator.generateEntityVisualization("e1", mockContext);

      const seed = (mockContext.imageGeneration.distillVisualSubject as any)
        .mock.calls[0][1];

      expect(seed).toContain("physically looks like");
      // Composition and medium are supplied deterministically afterwards; the
      // model must not be primed with them or it will emit them twice.
      expect(seed).not.toContain("full-body character concept art");
      expect(seed).not.toContain("painterly oil rendering");
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
      mockContext.uiStore.activeThemeId = "fantasy";

      const prepared = await generator.prepareEntityVisualizationPrompt(
        "e1",
        mockContext,
      );

      expect(prepared.prompt).toContain("ink wash portrait with a silver mask");
      expect(prepared.metadata.styleOverridden).toBe(true);
      // Vault direction replaces the shipped theme rather than stacking on it.
      expect(prepared.prompt).not.toContain("painterly oil rendering");
      // Category framing and negatives still apply.
      expect(prepared.prompt).toContain("full-body character concept art");
    });

    it("should ignore saved entity art direction when requested", async () => {
      mockContext.vault.entities.e1 = {
        id: "e1",
        title: "Almos",
        type: "character",
        labels: [],
        artDirection: "old saved prompt",
      };
      mockContext.uiStore.activeThemeId = "cyberpunk";

      const prepared = await generator.prepareEntityVisualizationPrompt(
        "e1",
        mockContext,
        { ignoreSavedArtDirection: true },
      );

      expect(prepared.prompt).toContain("dense signage");
      expect(prepared.prompt).not.toContain("old saved prompt");
      expect(prepared.metadata.styleOverridden).toBe(false);
    });

    it("should strip the entity name from the composed prompt", async () => {
      mockContext.vault.entities.e1 = {
        id: "e1",
        title: "Almos",
        type: "character",
        labels: [],
      };
      (
        mockContext.imageGeneration.distillVisualSubject as any
      ).mockResolvedValue("Almos, a scarred courier in a patched leather coat");

      const prepared = await generator.prepareEntityVisualizationPrompt(
        "e1",
        mockContext,
      );

      expect(prepared.prompt).not.toContain("Almos");
      expect(prepared.prompt).toContain("scarred courier");
      expect(prepared.metadata.removedNames).toContain("Almos");
    });

    it("should prioritize entity labels in entity visualization prompts", async () => {
      mockContext.vault.entities.e1.labels = ["necromancy", "regal", "undead"];

      await generator.generateEntityVisualization("e1", mockContext);

      expect(
        mockContext.imageGeneration.distillVisualSubject,
      ).toHaveBeenCalledWith(
        "key",
        expect.stringContaining("HIGH-PRIORITY VISUAL LABELS"),
        "ctx",
        "model",
        false,
      );
      expect(
        mockContext.imageGeneration.distillVisualSubject,
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
      const prepared = await generator.prepareMessageVisualizationPrompt(
        {
          content:
            "Draw the moon gate\n\n## Art Direction\nflat ink and gold leaf icon",
        } as any,
        mockContext,
      );

      expect(prepared.prompt).toContain("flat ink and gold leaf icon");
      expect(prepared.metadata.styleOverridden).toBe(true);
    });

    it("should use /draw category hints when no entity is linked", async () => {
      const prepared = await generator.prepareMessageVisualizationPrompt(
        { content: "/draw character Almos" } as any,
        mockContext,
      );

      expect(prepared.metadata.categoryId).toBe("character");
      expect(prepared.prompt).toContain("full-body character concept art");
    });

    it("should let linked entity metadata win over /draw category hints", async () => {
      mockContext.vault.entities.e1 = {
        id: "e1",
        title: "Almos",
        type: "location",
        labels: [],
      };

      const prepared = await generator.prepareMessageVisualizationPrompt(
        { content: "/draw character Almos", entityId: "e1" } as any,
        mockContext,
      );

      expect(prepared.metadata.categoryId).toBe("location");
      expect(prepared.prompt).toContain("establishing environment art");
    });

    it("should attach negatives to the provider that exposes a field", async () => {
      mockContext.imageProvider = "cloudflare";

      await generator.generateEntityVisualization("e1", mockContext);

      const options = (mockContext.imageGeneration.generateImage as any).mock
        .calls[0][3];
      expect(options.negativePrompt).toContain("watermark");
    });

    it("should inline negatives for a provider without a negative field", async () => {
      mockContext.imageProvider = "gemini";

      await generator.generateEntityVisualization("e1", mockContext);

      const [, prompt, , options] = (
        mockContext.imageGeneration.generateImage as any
      ).mock.calls[0];
      expect(prompt).toContain("Avoid:");
      expect(prompt).toContain("watermark");
      expect(options.negativePrompt).toBeUndefined();
    });

    it("should prioritize linked entity labels in message visualization prompts", async () => {
      mockContext.vault.entities.e1.labels = ["desert", "sorcery"];

      await generator.generateMessageVisualization(
        { content: "draw it", entityId: "e1" } as any,
        mockContext,
      );

      expect(
        mockContext.imageGeneration.distillVisualSubject,
      ).toHaveBeenCalledWith(
        "key",
        expect.stringContaining("- desert"),
        "ctx",
        "model",
        false,
      );
    });
  });
});
