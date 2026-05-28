import { describe, it, expect, vi, beforeEach } from "vitest";
import { DefaultImageGenerationService } from "./image-generation.service";
import * as capabilityGuard from "./capability-guard";
import * as visualDistillation from "./prompts/visual-distillation";

describe("DefaultImageGenerationService", () => {
  let service: DefaultImageGenerationService;
  let mockAiClientManager: any;
  let mockModel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal(
      "atob",
      vi.fn((s) => Buffer.from(s, "base64").toString("binary")),
    );

    mockModel = {
      generateContent: vi.fn(),
    };

    mockAiClientManager = {
      getModel: vi.fn().mockReturnValue(mockModel),
    };

    service = new DefaultImageGenerationService(mockAiClientManager);

    // Default mocks for guards
    vi.spyOn(capabilityGuard, "isAIEnabled").mockReturnValue(true);
    vi.spyOn(capabilityGuard, "assertAIEnabled").mockImplementation(() => {});

    // Default mock for prompt builders
    vi.spyOn(
      visualDistillation,
      "buildVisualCanonResolutionPrompt",
    ).mockReturnValue("canon-res-prompt");
    vi.spyOn(
      visualDistillation,
      "buildVisualPromptGenerationPrompt",
    ).mockReturnValue("prompt-gen-prompt");
  });

  describe("distillVisualPrompt", () => {
    it("should return query early if AI is disabled", async () => {
      vi.spyOn(capabilityGuard, "isAIEnabled").mockReturnValue(false);
      const result = await service.distillVisualPrompt(
        "key",
        "query",
        "ctx",
        "model",
      );
      expect(result).toBe("query");
    });

    it("should return query early if context is missing", async () => {
      const result = await service.distillVisualPrompt(
        "key",
        "query",
        "",
        "model",
      );
      expect(result).toBe("query");
    });

    it("should preserve a resolved art direction query when context is missing", async () => {
      const resolvedPrompt =
        "Almos, full character concept art with readable silhouette";

      const result = await service.distillVisualPrompt(
        "key",
        resolvedPrompt,
        "",
        "model",
      );

      expect(result).toBe(resolvedPrompt);
    });

    it("should return distilled text on success", async () => {
      mockModel.generateContent
        .mockResolvedValueOnce({
          response: { text: () => "canon summary" },
        })
        .mockResolvedValueOnce({
          response: { text: () => " distilled result " },
        });

      const result = await service.distillVisualPrompt(
        "key",
        "query",
        "ctx",
        "model",
      );
      expect(result).toBe("distilled result");
      expect(mockAiClientManager.getModel).toHaveBeenCalledWith("key", "model");
    });

    it("should fallback to canon summary on error in stage 2", async () => {
      mockModel.generateContent
        .mockResolvedValueOnce({
          response: { text: () => "canon summary" },
        })
        .mockRejectedValueOnce(new Error("Gemini Error"));

      const result = await service.distillVisualPrompt(
        "key",
        "query",
        "ctx",
        "model",
      );
      expect(result).toBe("canon summary");
    });
  });

  describe("generateImage", () => {
    it("should throw if AI is disabled (via assert)", async () => {
      vi.spyOn(capabilityGuard, "assertAIEnabled").mockImplementation(() => {
        throw new Error("Disabled");
      });
      await expect(
        service.generateImage("key", "prompt", "model"),
      ).rejects.toThrow("Disabled");
    });

    it("should return a Blob on success", async () => {
      const mockImageData = "bW9jay1pbWFnZS1kYXRh"; // "mock-image-data" in base64
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [{ inlineData: { data: mockImageData } }],
                },
              },
            ],
          }),
      });

      const blob = await service.generateImage("key", "prompt", "model");
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("image/png");

      const text = await blob.text();
      expect(text).toBe("mock-image-data");
    });

    it("should handle safety policy blocks", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({
            error: { message: "Safety block triggered" },
          }),
      });

      await expect(
        service.generateImage("key", "prompt", "model"),
      ).rejects.toThrow(
        "The Oracle cannot visualize this request due to safety policies.",
      );
    });

    it("should handle generic API errors with a generic user-facing message", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Bad Request",
        json: () => Promise.resolve({ error: { message: "Invalid Params" } }),
      });

      await expect(
        service.generateImage("key", "prompt", "model"),
      ).rejects.toThrow("Generation failed. Please try again.");
    });

    it("should throw if AI returns text instead of image", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [{ text: "Refusal text" }],
                },
              },
            ],
          }),
      });

      await expect(
        service.generateImage("key", "prompt", "model"),
      ).rejects.toThrow(
        'AI returned text instead of an image: "Refusal text..."',
      );
    });

    it("should throw if no image data is returned", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [],
                },
              },
            ],
          }),
      });

      await expect(
        service.generateImage("key", "prompt", "model"),
      ).rejects.toThrow("No image data returned from AI");
    });
  });
});
