import { describe, it, expect, vi, beforeEach } from "vitest";
import { DefaultImageGenerationService } from "../../lib/services/ai/image-generation.service";
import { uiStore } from "../../lib/stores/ui.svelte";

describe("ImageGenerationService", () => {
  let mockModel: any;
  let mockClientManager: any;
  let service: DefaultImageGenerationService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockModel = {
      generateContent: vi.fn(),
    };

    mockClientManager = {
      getModel: vi.fn().mockReturnValue(mockModel),
    };

    service = new DefaultImageGenerationService(mockClientManager);
    (uiStore as any).liteMode = false;
  });

  describe("Lite Mode Gating", () => {
    it("should throw error in generateImage when Lite Mode is ON", async () => {
      (uiStore as any).liteMode = true;
      await expect(
        service.generateImage("key", "prompt", "model"),
      ).rejects.toThrow("AI features are disabled in Lite Mode.");
    });
  });

  describe("Distill Visual Prompt", () => {
    it("should call model to distill prompt", async () => {
      const mockText = vi.fn().mockReturnValue("Distilled Prompt");
      mockModel.generateContent.mockResolvedValueOnce({
        response: Promise.resolve({ text: mockText }),
      });

      const result = await service.distillVisualPrompt(
        "api-key",
        "query",
        "context",
        "model",
      );
      expect(result).toBe("Distilled Prompt");
      expect(mockModel.generateContent).toHaveBeenCalled();
    });

    it("should return query as is when no context is provided", async () => {
      const result = await service.distillVisualPrompt(
        "api-key",
        "query",
        "",
        "model",
      );
      expect(result).toBe("query");
    });
  });
});
