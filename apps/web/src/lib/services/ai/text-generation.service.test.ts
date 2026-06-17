import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DefaultTextGenerationService,
  resolvePronounsLocally,
} from "./text-generation.service.svelte";
import { TIER_MODES } from "schema";
import * as capabilityGuard from "./capability-guard";

// Mock AI capability guard
vi.mock("./capability-guard", () => ({
  isAIEnabled: vi.fn(() => true),
  assertAIEnabled: vi.fn(),
}));

// Mock prompt builders
vi.mock("./prompts/query-expansion", () => ({
  buildQueryExpansionPrompt: vi.fn(
    (context, query) => `expanded:${context}:${query}`,
  ),
}));
vi.mock("./prompts/system-instructions", () => ({
  buildSystemInstruction: vi.fn(
    (demo, categories) => `system:${demo}:${categories?.join(",") || ""}`,
  ),
}));
vi.mock("./prompts/merge-proposal", () => ({
  buildMergeProposalPrompt: vi.fn((t, s) => `merge:${t}:${s}`),
}));
vi.mock("./prompts/plot-analysis", () => ({
  buildPlotCanonResolutionPrompt: vi.fn((s, c, q) => `plot-res:${s}:${c}:${q}`),
  buildPlotGenerationPrompt: vi.fn((c, q) => `plot-gen:${c}:${q}`),
}));
vi.mock("./prompts/entity-creation", () => ({
  buildCreationLoreSynthesisPrompt: vi.fn((q, c) => `creation-syn:${q}:${c}`),
  buildStructuredDraftingPrompt: vi.fn(
    (s, q, c) => `creation-draft:${s}:${q}:${c}`,
  ),
}));
vi.mock("./prompts/context-distillation", () => ({
  buildContextDistillationPrompt: vi.fn((context) => `distill:${context}`),
}));
vi.mock("./prompts/entity-revision", () => ({
  buildEntityRevisionSystemInstruction: vi.fn(() => "SYSTEM_INSTRUCTION"),
  buildEntityRevisionPromptCore: vi.fn(
    (entity, incoming, categories, options) =>
      `core:${entity.title}:${incoming.chronicle}:${incoming.lore}:${categories?.map((c: any) => c.id).join(",") || ""}:${options?.instructions || ""}:${options?.priority || ""}`,
  ),
  buildEntityRevisionUserPrompt: vi.fn(
    (entity, incoming, _related, categories, options) =>
      `revise:${entity.title}:${incoming.chronicle}:${incoming.lore}:${categories?.map((c: any) => c.id).join(",") || ""}:${options?.instructions || ""}:${options?.priority || ""}`,
  ),
}));
vi.mock("./prompts/related-entity-generation", () => ({
  buildRelatedEntityGenerationPrompt: vi.fn(
    (source, target, rel, custom, connected, categories, template) =>
      `related:${source.title}:${target}:${rel}:${custom}:${connected.length}:${categories.length}:${template}`,
  ),
}));

describe("DefaultTextGenerationService", () => {
  let service: DefaultTextGenerationService;
  let mockAiClientManager: any;
  let mockModel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(capabilityGuard.isAIEnabled).mockReturnValue(true);

    mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: vi.fn().mockReturnValue("Generated content"),
        },
      }),
      startChat: vi.fn().mockReturnValue({
        sendMessageStream: vi.fn().mockResolvedValue({
          stream: (async function* () {
            yield { text: () => "chunk1" };
            yield { text: () => "chunk2" };
          })(),
        }),
      }),
    };

    mockAiClientManager = {
      getModel: vi.fn().mockReturnValue(mockModel),
    };

    service = new DefaultTextGenerationService(mockAiClientManager);
  });

  describe("expandQuery", () => {
    it("should call model to expand query when local resolution is insufficient", async () => {
      const result = await service.expandQuery("key", "him?", [
        { role: "user" as const, content: "and but or if" },
      ]);

      expect(result).toBe("Generated content");
      expect(mockAiClientManager.getModel).toHaveBeenCalledWith(
        "key",
        TIER_MODES.lite,
      );
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("expanded"),
      );
    });

    it("should bypass AI completely when local resolution succeeds", async () => {
      const result = await service.expandQuery("key", "Where does he live?", [
        { role: "user" as const, content: "Let's talk about **Sir Alden**." },
      ]);
      expect(result).toBe("Where does Sir Alden live?");
      expect(mockAiClientManager.getModel).not.toHaveBeenCalled();
    });

    it("should resolve query locally if AI is disabled", async () => {
      vi.mocked(capabilityGuard.isAIEnabled).mockReturnValue(false);

      const result = await service.expandQuery("key", "Where does he live?", [
        { role: "user" as const, content: "Let's talk about **Sir Alden**." },
      ]);
      expect(result).toBe("Where does Sir Alden live?");
    });

    it("should fall back to local resolver on AI error when local resolution is insufficient", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockModel.generateContent.mockRejectedValue(new Error("AI error"));

      const result = await service.expandQuery("key", "What is its name?", [
        { role: "user" as const, content: "and but or if" },
      ]);

      expect(result).toBe("What is its name?");
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should truncate long history content to keep payload small when falling back to AI", async () => {
      const veryLongContent = "and but or if ".repeat(300);
      await service.expandQuery("key", "him?", [
        { role: "user" as const, content: veryLongContent },
      ]);

      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("... [truncated for length]"),
      );
    });
  });

  describe("resolvePronounsLocally", () => {
    it("should resolve pronouns based on markdown bold entities", async () => {
      const history = [
        {
          role: "user" as const,
          content: "The legendary **Dulandir** is a vast place.",
        },
      ];
      const query = "Where is that place located?";
      const result = await resolvePronounsLocally(query, history);
      expect(result).toBe("Where is Dulandir located?");
    });

    it("should resolve possessives correctly", async () => {
      const history = [
        { role: "user" as const, content: "Here is **Sir Alden**." },
      ];
      const query = "What is his title?";
      const result = await resolvePronounsLocally(query, history);
      expect(result).toBe("What is Sir Alden's title?");
    });

    it("should fall back to proper nouns if no markdown bold", async () => {
      const history = [
        { role: "user" as const, content: "Let's talk about Valerius." },
      ];
      const query = "Where does he live?";
      const result = await resolvePronounsLocally(query, history);
      expect(result).toBe("Where does Valerius live?");
    });

    it("should return the original query if no history exists", async () => {
      const result = await resolvePronounsLocally("Where does he live?", []);
      expect(result).toBe("Where does he live?");
    });

    it("should prioritize subjects from the user's previous query over assistant bold matches", async () => {
      const history = [
        { role: "user" as const, content: "who is Kardos?" },
        {
          role: "assistant" as const,
          content:
            "While **Chief Grimgob** is nearby, Master Kardos is a powerful mage.",
        },
      ];
      const query = "What does he do?";
      const result = await resolvePronounsLocally(query, history);
      expect(result).toBe("What does Kardos do?");
    });

    it("should resolve lowercase names in user queries by falling back to general nouns", async () => {
      const history = [{ role: "user" as const, content: "who's kardos" }];
      const query = "what does he do?";
      const result = await resolvePronounsLocally(query, history);
      expect(result).toBe("what does kardos do?");
    });
  });

  describe("distillContext", () => {
    it("should distill a long context block", async () => {
      const result = await service.distillContext(
        "key",
        "Raw campaign context",
        "model",
      );

      expect(result).toBe("Generated content");
      expect(mockAiClientManager.getModel).toHaveBeenCalledWith("key", "model");
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        "distill:Raw campaign context",
      );
    });

    it("should return the original context if distillation fails", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockModel.generateContent.mockRejectedValue(new Error("AI error"));

      const result = await service.distillContext(
        "key",
        "Raw campaign context",
        "model",
      );

      expect(result).toBe("Raw campaign context");
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("generateMergeProposal", () => {
    it("should generate a merge proposal JSON", async () => {
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: vi
            .fn()
            .mockReturnValue('{"body": "Merged Body", "lore": "Merged Lore"}'),
        },
      });

      const result = await service.generateMergeProposal!(
        "key",
        "model",
        { title: "Target", type: "npc" },
        [{ title: "Source", type: "npc" }],
      );

      expect(result).toEqual({ body: "Merged Body", lore: "Merged Lore" });
      expect(mockModel.generateContent).toHaveBeenCalled();
    });
  });

  describe("generatePlotAnalysis", () => {
    it("should generate plot analysis with many connected entities (omitted suffix)", async () => {
      const subject = { title: "Subject", type: "npc" };
      const connections = Array(25).fill({
        entity: { title: "C", type: "npc" },
        connectionType: "link",
      });
      await service.generatePlotAnalysis(
        "key",
        "model",
        subject,
        connections,
        "Q",
      );

      expect(mockModel.generateContent).toHaveBeenCalled();
    });

    it("should generate plot analysis when no entities are connected", async () => {
      const subject = { title: "Subject", type: "npc" };
      await service.generatePlotAnalysis("key", "model", subject, [], "Q");
      expect(mockModel.generateContent).toHaveBeenCalled();
    });
  });

  describe("reviseEntityUpdate", () => {
    it("should revise an existing entity into updated content and lore", async () => {
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: vi
            .fn()
            .mockReturnValue(
              '{"content":"Updated chronicle","lore":"Updated lore"}',
            ),
        },
      });

      const result = await service.reviseEntityUpdate!(
        "key",
        "model",
        {
          title: "Thay",
          type: "location",
          content: "Old chronicle",
          lore: "Old lore",
        },
        {
          chronicle: "New chronicle",
          lore: "New lore",
        },
        [
          {
            id: "szass",
            title: "Szass Tam",
            type: "npc",
            relation: "rules",
            summary: "The lich-regent of Thay.",
          },
        ],
      );

      expect(result).toEqual({
        content: "Updated chronicle",
        lore: "Updated lore",
      });
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        "revise:Thay:New chronicle:New lore:::",
      );
    });

    it("should throw when revision fails", async () => {
      mockModel.generateContent.mockRejectedValue(new Error("Network fail"));

      await expect(
        service.reviseEntityUpdate!(
          "key",
          "model",
          { title: "Thay", type: "location", content: "", lore: "" },
          { chronicle: "New chronicle", lore: "New lore" },
          [],
        ),
      ).rejects.toThrow("Entity revision failed: Network fail");
    });

    it("should return a valid category from the revision response", async () => {
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: vi
            .fn()
            .mockReturnValue(
              '{"content":"Updated chronicle","lore":"Updated lore","categoryId":"item"}',
            ),
        },
      });

      const result = await service.reviseEntityUpdate!(
        "key",
        "model",
        {
          title: "The Glass Key",
          type: "note",
          content: "Old chronicle",
          lore: "Old lore",
        },
        {
          chronicle: "A crystalline archive key.",
          lore: "It opens sealed memory vaults.",
        },
        [],
        [
          { id: "note", label: "Note" },
          { id: "item", label: "Item" },
        ],
      );

      expect(result).toEqual({
        content: "Updated chronicle",
        lore: "Updated lore",
        categoryId: "item",
      });
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        "revise:The Glass Key:A crystalline archive key.:It opens sealed memory vaults.:note,item::",
      );
    });

    it("should pass revision instructions into the revision prompt", async () => {
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: vi
            .fn()
            .mockReturnValue(
              '{"content":"Corrected chronicle","lore":"Corrected lore"}',
            ),
        },
      });

      await service.reviseEntityUpdate!(
        "key",
        "model",
        {
          title: "The Glass Key",
          type: "note",
          content: "Old chronicle",
          lore: "Old lore",
        },
        {
          chronicle: "",
          lore: "",
        },
        [],
        [],
        {
          source: "revise",
          instructions: "Make it a living crystal.",
          priority: "instructions-first",
        },
      );

      expect(mockModel.generateContent).toHaveBeenCalledWith(
        "revise:The Glass Key::::Make it a living crystal.:instructions-first",
      );
    });

    it("should ignore revision categories outside the allowed list", async () => {
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: vi
            .fn()
            .mockReturnValue(
              '{"content":"Updated chronicle","lore":"Updated lore","categoryId":"vehicle"}',
            ),
        },
      });

      const result = await service.reviseEntityUpdate!(
        "key",
        "model",
        {
          title: "The Glass Key",
          type: "note",
          content: "",
          lore: "",
        },
        {
          chronicle: "A crystalline archive key.",
          lore: "It opens sealed memory vaults.",
        },
        [],
        [{ id: "item", label: "Item" }],
      );

      expect(result).toEqual({
        content: "Updated chronicle",
        lore: "Updated lore",
      });
    });
  });

  describe("generateResponse", () => {
    it("should stream response updates", async () => {
      const onUpdate = vi.fn();
      const history = [{ role: "user", content: "User message" }];

      await service.generateResponse(
        "key",
        "Query",
        history,
        "Context",
        "model",
        onUpdate,
      );

      expect(onUpdate).toHaveBeenCalledWith("chunk1");
      expect(onUpdate).toHaveBeenCalledWith("chunk1chunk2");
      expect(mockModel.startChat).toHaveBeenCalled();
    });

    it("should handle history role mapping and merging", async () => {
      const onUpdate = vi.fn();
      const history = [
        { role: "system", content: "Ignore me" },
        { role: "user", content: "User message 1" },
        { role: "user", content: "User message 2" },
        { role: "assistant", content: "Assistant message" },
      ];

      await service.generateResponse(
        "key",
        "Query",
        history,
        "Context",
        "model",
        onUpdate,
      );

      const chatOptions = vi.mocked(mockModel.startChat).mock.calls[0][0];
      expect(chatOptions.history).toHaveLength(2);
      expect(chatOptions.history[0].role).toBe("user");
      expect(chatOptions.history[0].parts[0].text).toContain("User message 2");
      expect(chatOptions.history[1].role).toBe("model");
    });

    it("should truncate long chat history messages to prevent token bloat", async () => {
      const onUpdate = vi.fn();
      const veryLongContent = "B".repeat(5000);
      const history = [
        { role: "user", content: veryLongContent },
        { role: "assistant", content: "Short reply" },
      ];

      await service.generateResponse(
        "key",
        "Query",
        history,
        "Context",
        "model",
        onUpdate,
      );

      const chatOptions = vi.mocked(mockModel.startChat).mock.calls[0][0];
      expect(chatOptions.history[0].parts[0].text).toBe(
        "B".repeat(4000) + "\n\n... [truncated for length]",
      );
    });
  });

  describe("generateStructuredEntity", () => {
    it("should orchestrate multi-stage creation", async () => {
      const onUpdate = vi.fn();
      mockModel.generateContent
        .mockResolvedValueOnce({
          response: { text: () => "Lore Synthesis Summary" },
        })
        .mockResolvedValueOnce({
          response: { text: () => "Structured Record" },
        });

      await service.generateStructuredEntity!(
        "key",
        "Create Valerius",
        "Vault Context",
        "model",
        onUpdate,
        ["npc", "location"],
      );

      expect(mockModel.generateContent).toHaveBeenCalledTimes(2);
      expect(onUpdate).toHaveBeenCalledWith("Structured Record");
    });
  });

  describe("context optimizations", () => {
    it("should handle history sliding window", async () => {
      const history = Array(20)
        .fill(null)
        .map((_, i) => ({
          role: i % 2 === 0 ? "user" : "assistant",
          content: `Message ${i}`,
        }));

      await service.generateResponse(
        "key",
        "Query",
        history,
        "Context",
        "model",
        vi.fn(),
      );

      const chatOptions = vi.mocked(mockModel.startChat).mock.calls[0][0];
      // Sliding window is 10.
      expect(chatOptions.history.length).toBeLessThanOrEqual(10);
    });

    it("should ensure prefix stability in final query", async () => {
      await service.generateResponse(
        "key",
        "Query",
        [],
        " Lore Context ",
        "model",
        vi.fn(),
      );

      const sendMessageStreamResult = await vi.mocked(mockModel.startChat).mock
        .results[0].value;
      const finalQuery = vi.mocked(sendMessageStreamResult.sendMessageStream)
        .mock.calls[0][0];

      expect(finalQuery).toContain("[VAULT LORE CONTEXT]");
      expect(finalQuery).toContain("Lore Context");
      expect(finalQuery).toContain("[USER QUERY]");
      // Ensure trimmed context
      expect(finalQuery).not.toContain(" Lore Context ");
    });
  });

  describe("failure cases", () => {
    it("should throw error if plot analysis fails", async () => {
      mockModel.generateContent.mockRejectedValue(new Error("Timeout"));

      await expect(
        service.generatePlotAnalysis("key", "model", {}, [], "Q"),
      ).rejects.toThrow("Plot analysis failed: Timeout");
    });

    it("should throw error if structured drafting fails", async () => {
      mockModel.generateContent.mockRejectedValue(new Error("Direct throw"));

      await expect(
        service.reviseEntityUpdate!(
          "key",
          "model",
          { title: "T", type: "npc", content: "", lore: "" },
          { chronicle: "", lore: "" },
          [],
        ),
      ).rejects.toThrow("Entity revision failed: Direct throw");
    });
  });

  describe("snapshot stability", () => {
    it("should snapshot history to prevent concurrent mutations from affecting prompt", async () => {
      const { createReactiveHistory } =
        await import("./text-generation-test-helper.svelte");
      const history = createReactiveHistory();

      const promise = service.expandQuery("key", "him?", history);

      // Mutate history immediately after initiating the call
      history[0].content = "Mutated";

      await promise;

      const { buildQueryExpansionPrompt } =
        await import("./prompts/query-expansion");
      expect(buildQueryExpansionPrompt).toHaveBeenCalledWith(
        expect.stringContaining("USER: Original"),
        "him?",
      );
    });

    it("should snapshot target and sources to prevent concurrent mutations in merge proposal", async () => {
      const { createReactiveTarget, createReactiveSources } =
        await import("./text-generation-test-helper.svelte");
      const target = createReactiveTarget();
      const sources = createReactiveSources();

      const promise = service.generateMergeProposal(
        "key",
        "model",
        target,
        sources,
      );

      target.title = "MutatedTarget";
      sources[0].title = "MutatedSource";

      await promise;

      const { buildMergeProposalPrompt } =
        await import("./prompts/merge-proposal");
      // Since context-retrieval.service is mocked to return "consolidated", we check the targetContext header formatting
      expect(buildMergeProposalPrompt).toHaveBeenCalledWith(
        expect.stringContaining("--- TARGET: OriginalTarget"),
        expect.stringContaining("--- SOURCE 1: OriginalSource"),
      );
    });

    it("should successfully generate a related entity from JSON response", async () => {
      const responsePayload = {
        name: "Grounded NPC",
        type: "NPC",
        summary: "A brief summary.",
        description: "Lore details.",
        labels: ["ally", "contact"],
        plotHook: "Find the key.",
        relationshipBack: "friendly",
      };

      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify(responsePayload),
        },
      });

      const result = await service.generateRelatedEntity(
        "api-key",
        "model-name",
        {
          title: "Source Entity",
          type: "Location",
          content: "Chr",
          lore: "Lr",
        },
        "NPC",
        "ally",
        "Custom instructions",
        [
          {
            title: "Neighbor",
            type: "NPC",
            relation: "enemy",
            content: "NContent",
          },
        ],
        [{ id: "NPC", label: "Non-Player Character" }],
        "Outline",
      );

      expect(result).toEqual({
        name: "Grounded NPC",
        type: "NPC",
        summary: "A brief summary.",
        description: "Lore details.",
        labels: ["ally", "contact"],
        plotHook: "Find the key.",
        relationshipBack: "friendly",
      });

      const { buildRelatedEntityGenerationPrompt } =
        await import("./prompts/related-entity-generation");
      expect(buildRelatedEntityGenerationPrompt).toHaveBeenCalledWith(
        {
          title: "Source Entity",
          type: "Location",
          content: "Chr",
          lore: "Lr",
        },
        "NPC",
        "ally",
        "Custom instructions",
        [
          {
            title: "Neighbor",
            type: "NPC",
            relation: "enemy",
            content: "NContent",
          },
        ],
        [{ id: "NPC", label: "Non-Player Character" }],
        "Outline",
      );
    });

    it("should respect guest mode options and omit lore details from source entity", async () => {
      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              name: "Grounded NPC",
              type: "NPC",
              summary: "A brief summary.",
              description: "Lore details.",
            }),
        },
      });

      await service.generateRelatedEntity(
        "api-key",
        "model-name",
        {
          title: "Source Entity",
          type: "Location",
          content: "Chr",
          lore: "Secret Lore",
        },
        "NPC",
        "ally",
        "",
        [],
        [],
        "",
        { isGuest: true },
      );

      const { buildRelatedEntityGenerationPrompt } =
        await import("./prompts/related-entity-generation");
      expect(buildRelatedEntityGenerationPrompt).toHaveBeenCalledWith(
        { title: "Source Entity", type: "Location", content: "Chr", lore: "" },
        "NPC",
        "ally",
        "",
        [],
        [],
        "",
      );
    });

    it("should throw an error when AI is disabled", async () => {
      vi.mocked(capabilityGuard.isAIEnabled).mockReturnValueOnce(false);
      await expect(
        service.generateRelatedEntity(
          "api-key",
          "model-name",
          { title: "Source Entity", type: "Location" },
          "NPC",
          "ally",
        ),
      ).rejects.toThrow("AI features are currently disabled.");
    });

    it("should use caller-provided AI enablement state over local fallback", async () => {
      vi.mocked(capabilityGuard.isAIEnabled).mockReturnValue(false);
      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              name: "Generated NPC",
              type: "NPC",
              summary: "Summary.",
              description: "Description.",
            }),
        },
      });

      const result = await service.generateRelatedEntity(
        "api-key",
        "model-name",
        { title: "Source Entity", type: "Location" },
        "NPC",
        "ally",
        "",
        [],
        [],
        "",
        { aiDisabled: false },
      );

      expect(result.name).toBe("Generated NPC");
      expect(capabilityGuard.isAIEnabled).not.toHaveBeenCalled();
      vi.mocked(capabilityGuard.isAIEnabled).mockReturnValue(true);
    });

    it("should throw an error when JSON parsing fails", async () => {
      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () => "invalid json",
        },
      });

      await expect(
        service.generateRelatedEntity(
          "api-key",
          "model-name",
          { title: "Source Entity", type: "Location" },
          "NPC",
          "ally",
        ),
      ).rejects.toThrow("Related entity generation failed");
    });
  });
});
