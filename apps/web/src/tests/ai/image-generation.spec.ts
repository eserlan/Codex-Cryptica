import { describe, it, expect, vi, beforeEach } from "vitest";
import { imageGenerationService } from "../../lib/services/ai/image-generation.service";
import { aiClientManager as _aiClientManager } from "../../lib/services/ai/client-manager";
import { uiStore } from "../../lib/stores/ui.svelte";

const mockModel = {
  generateContent: vi.fn(),
};

vi.mock("../../lib/services/ai/client-manager", () => ({
  aiClientManager: {
    getModel: vi.fn().mockReturnValue(mockModel),
  },
}));

vi.mock("../../lib/stores/ui.svelte", () => ({
  uiStore: {
    liteMode: false,
  },
}));

describe("ImageGenerationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (uiStore as any).liteMode = false;
  });

  describe("Lite Mode Gating", () => {
    it("should throw error in generateImage when Lite Mode is ON", async () => {
      (uiStore as any).liteMode = true;
      await expect(
        imageGenerationService.generateImage("key", "prompt", "model"),
      ).rejects.toThrow("AI features are disabled in Lite Mode.");
    });
  });

  describe("Distill Visual Prompt", () => {
    it("should call model to distill prompt", async () => {
      const mockText = vi.fn().mockReturnValue("Distilled Prompt");
      mockModel.generateContent.mockResolvedValueOnce({
        response: Promise.resolve({ text: mockText }),
      });

      const result = await imageGenerationService.distillVisualPrompt("api-key", "query", "context", "model");
      expect(result).toBe("Distilled Prompt");
      expect(mockModel.generateContent).toHaveBeenCalled();
    });

    it("should return query as is when no context is provided", async () => {
      const result = await imageGenerationService.distillVisualPrompt("api-key", "query", "", "model");
      expect(result).toBe("query");
    });
  });
});
