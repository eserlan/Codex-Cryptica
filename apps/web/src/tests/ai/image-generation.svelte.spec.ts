import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("$app/environment", () => ({
  browser: true,
}));

// Mock Svelte 5 Runes
vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.snapshot = (v: any) => v;
  (global as any).$derived = (v: any) => v;
  (global as any).$derived.by = (v: any) => v;
  (global as any).$effect = (v: any) => v;
});

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
    (uiStore as any).aiDisabled = false;
    localStorage.clear();
  });

  describe("AI Disabled Gating", () => {
    it("should throw error in generateImage when AI Disabled is ON", async () => {
      localStorage.setItem("codex_ai_disabled", "true");
      await expect(
        service.generateImage("key", "prompt", "model"),
      ).rejects.toThrow("AI features are disabled.");
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
