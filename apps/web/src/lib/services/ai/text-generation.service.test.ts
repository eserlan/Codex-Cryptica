import { describe, it, expect, vi, beforeEach } from "vitest";
import { DefaultTextGenerationService } from "./text-generation.service";
import { TIER_MODES } from "schema";

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
  buildPlotAnalysisPrompt: vi.fn((s, c, q) => `plot:${s}:${c}:${q}`),
}));
vi.mock("./prompts/context-distillation", () => ({
  buildContextDistillationPrompt: vi.fn((context) => `distill:${context}`),
}));
vi.mock("./prompts/entity-reconciliation", () => ({
  buildEntityReconciliationPrompt: vi.fn(
    (entity, incoming) =>
      `reconcile:${entity.title}:${incoming.chronicle}:${incoming.lore}`,
  ),
}));

describe("DefaultTextGenerationService", () => {
  let service: DefaultTextGenerationService;
  let mockAiClientManager: any;
  let mockContextRetrievalService: any;
  let mockModel: any;

  beforeEach(() => {
    vi.restoreAllMocks();

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
      getConsolidatedContext: vi.fn().mockReturnValue("Consolidated context"),
    };

    service = new DefaultTextGenerationService(
      mockAiClientManager,
      mockContextRetrievalService,
    );
  });

  describe("expandQuery", () => {
    it("should expand a query", async () => {
      const history = [{ role: "user", content: "Hi" }];
      const result = await service.expandQuery("key", "What is lore?", history);

      expect(result).toBe("Generated content");
      expect(mockAiClientManager.getModel).toHaveBeenCalledWith(
        "key",
        TIER_MODES.lite,
      );
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("USER: Hi:What is lore?"),
      );
    });

    it("should return original query if expansion fails", async () => {
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

      const target = { title: "T", type: "npc" };
      const sources = [{ title: "S1", type: "npc" }];

      const result = await service.generateMergeProposal(
        "key",
        "model",
        target,
        sources,
      );

      expect(result).toEqual({ body: "Merged Body", lore: "Merged Lore" });
    });

    it("should return plain text if JSON match fails", async () => {
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: vi.fn().mockReturnValue("Just plain text"),
        },
      });

      const result = await service.generateMergeProposal(
        "key",
        "model",
        {},
        [],
      );
      expect(result).toEqual({ body: "Just plain text" });
    });
  });

  describe("generatePlotAnalysis", () => {
    it("should generate plot analysis with many connected entities (omitted suffix)", async () => {
      const subject = { title: "Subject", type: "npc" };
      const connected = Array.from({ length: 25 }, (_, i) => ({
        entity: { title: `C${i}`, type: "npc" },
        direction: "outbound",
        label: "label",
      }));

      await service.generatePlotAnalysis(
        "key",
        "model",
        subject,
        connected,
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
        "reconcile:Thay:New chronicle:New lore",
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

      expect(mockModel.startChat).toHaveBeenCalledWith({
        history: [
          {
            role: "user",
            parts: [{ text: "User message 1\n\nUser message 2" }],
          },
          { role: "model", parts: [{ text: "Assistant message" }] },
        ],
      });
    });

    it("should handle API rate limit error (429)", async () => {
      const onUpdate = vi.fn();
      mockModel.startChat.mockReturnValue({
        sendMessageStream: vi
          .fn()
          .mockRejectedValue(new Error("429 rate limit")),
      });

      await expect(
        service.generateResponse("key", "Q", [], "C", "m", onUpdate),
      ).rejects.toThrow("API rate limit exceeded");
    });

    it("should handle generic Gemini API error", async () => {
      const onUpdate = vi.fn();
      mockModel.startChat.mockReturnValue({
        sendMessageStream: vi
          .fn()
          .mockRejectedValue(new Error("Generic AI error")),
      });

      await expect(
        service.generateResponse("key", "Q", [], "C", "m", onUpdate),
      ).rejects.toThrow("Lore Oracle Error: Generic AI error");
    });

    it("should pass categories to buildSystemInstruction", async () => {
      const onUpdate = vi.fn();
      const categories = ["cat1", "cat2"];
      await service.generateResponse(
        "key",
        "Q",
        [],
        "C",
        "m",
        onUpdate,
        false,
        categories,
      );

      // Verify that the model was initialized with the instruction containing categories
      // aiClientManager.getModel is called with systemInstruction
      expect(mockAiClientManager.getModel).toHaveBeenCalledWith(
        "key",
        "m",
        "system:false:cat1,cat2",
      );
    });
  });

  describe("failure cases", () => {
    it("should throw error if merge generation fails", async () => {
      mockModel.generateContent.mockRejectedValue(new Error("Network fail"));
      await expect(
        service.generateMergeProposal("key", "model", {}, []),
      ).rejects.toThrow("Merge failed: Network fail");
    });

    it("should throw error if plot analysis fails", async () => {
      mockModel.generateContent.mockRejectedValue(new Error("Timeout"));
      await expect(
        service.generatePlotAnalysis("key", "model", {}, [], "Q"),
      ).rejects.toThrow("Plot analysis failed: Timeout");
    });
  });
});
