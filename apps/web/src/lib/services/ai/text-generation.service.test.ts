import { describe, it, expect, vi, beforeEach } from "vitest";
import { DefaultTextGenerationService } from "./text-generation.service.svelte";
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
vi.mock("./prompts/entity-reconciliation", () => ({
  buildEntityReconciliationPrompt: vi.fn(
    (entity, incoming, _related, categories) =>
      `reconcile:${entity.title}:${incoming.chronicle}:${incoming.lore}:${categories?.map((c: any) => c.id).join(",") || ""}`,
  ),
}));

describe("DefaultTextGenerationService", () => {
  let service: DefaultTextGenerationService;
  let mockAiClientManager: any;
  let mockContextRetrievalService: any;
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

    mockContextRetrievalService = {
      getConsolidatedContext: vi.fn().mockReturnValue("consolidated"),
    };

    service = new DefaultTextGenerationService(
      mockAiClientManager,
      mockContextRetrievalService as any,
    );
  });

  describe("expandQuery", () => {
    it("should call model to expand query", async () => {
      const result = await service.expandQuery("key", "him?", [
        { role: "user", content: "Valerius" },
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

    it("should return original query if AI is disabled", async () => {
      vi.mocked(capabilityGuard.isAIEnabled).mockReturnValue(false);

      const result = await service.expandQuery("key", "him?", []);
      expect(result).toBe("him?");
    });

    it("should return original query on error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockModel.generateContent.mockRejectedValue(new Error("AI error"));

      const result = await service.expandQuery("key", "Original query", []);

      expect(result).toBe("Original query");
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
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

  describe("reconcileEntityUpdate", () => {
    it("should reconcile an existing entity into updated content and lore", async () => {
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: vi
            .fn()
            .mockReturnValue(
              '{"content":"Updated chronicle","lore":"Updated lore"}',
            ),
        },
      });

      const result = await service.reconcileEntityUpdate!(
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
        "reconcile:Thay:New chronicle:New lore:",
      );
    });

    it("should throw when reconciliation fails", async () => {
      mockModel.generateContent.mockRejectedValue(new Error("Network fail"));

      await expect(
        service.reconcileEntityUpdate!(
          "key",
          "model",
          { title: "Thay", type: "location", content: "", lore: "" },
          { chronicle: "New chronicle", lore: "New lore" },
          [],
        ),
      ).rejects.toThrow("Entity reconciliation failed: Network fail");
    });

    it("should return a valid category from the reconciliation response", async () => {
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: vi
            .fn()
            .mockReturnValue(
              '{"content":"Updated chronicle","lore":"Updated lore","categoryId":"item"}',
            ),
        },
      });

      const result = await service.reconcileEntityUpdate!(
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
        "reconcile:The Glass Key:A crystalline archive key.:It opens sealed memory vaults.:note,item",
      );
    });

    it("should ignore reconciliation categories outside the allowed list", async () => {
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: vi
            .fn()
            .mockReturnValue(
              '{"content":"Updated chronicle","lore":"Updated lore","categoryId":"vehicle"}',
            ),
        },
      });

      const result = await service.reconcileEntityUpdate!(
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
        service.reconcileEntityUpdate!(
          "key",
          "model",
          { title: "T", type: "npc", content: "", lore: "" },
          { chronicle: "", lore: "" },
          [],
        ),
      ).rejects.toThrow("Entity reconciliation failed: Direct throw");
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
  });
});
