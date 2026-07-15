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
        "Almos, full-body character concept art with readable silhouette";

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

    it("should generate an image via custom provider", async () => {
      const mockImageData = "Y3VzdG9tLWltYWdl"; // "custom-image" in base64
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [{ b64_json: mockImageData }],
          }),
      });

      const blob = await service.generateImage(
        "custom-key",
        "prompt",
        "model",
        {
          provider: "custom",
          baseUrl: "https://custom.example/v1/images/generations",
        },
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://custom.example/v1/images/generations",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer "),
          }),
        }),
      );
      expect(blob).toBeInstanceOf(Blob);
      expect(await blob.text()).toBe("custom-image");
    });

    it("uses an injected fetcher instead of the global fetch", async () => {
      const injected = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [{ b64_json: "Y3VzdG9t" }] }),
      });
      const isolated = new DefaultImageGenerationService(
        mockAiClientManager,
        injected as any,
      );

      const blob = await isolated.generateImage("k", "prompt", "model", {
        provider: "custom",
        baseUrl: "https://custom.example/v1/images/generations",
      });

      expect(injected).toHaveBeenCalledOnce();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(blob).toBeInstanceOf(Blob);
    });

    it("should fail fast when custom provider API key is missing", async () => {
      await expect(
        service.generateImage("", "prompt", "model", { provider: "custom" }),
      ).rejects.toThrow(
        "A custom image provider API key is required for image generation.",
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should throw on non-OK custom provider response", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: { message: "Invalid API key" },
          }),
      });

      await expect(
        service.generateImage("bad-key", "prompt", "model", {
          provider: "custom",
        }),
      ).rejects.toThrow("Generation failed. Please try again.");
    });

    it("should generate an image via direct Cloudflare Workers AI when account ID and token are provided", async () => {
      const mockImageData = "Y2xvdWRmbGFyZS1pbWFnZQ=="; // "cloudflare-image" in base64
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            result: { image: mockImageData },
          }),
      });

      const blob = await service.generateImage(
        "cf-token",
        "prompt",
        "@cf/black-forest-labs/flux-1-schnell",
        {
          provider: "cloudflare",
          cloudflareAccountId: "cf-account-id",
        },
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.cloudflare.com/client/v4/accounts/cf-account-id/ai/run/@cf/black-forest-labs/flux-1-schnell",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer cf-token",
          }),
          body: expect.any(FormData),
        }),
      );
      const body = (global.fetch as any).mock.calls[0][1].body as FormData;
      expect(body.get("prompt")).toBe("prompt");
      expect(body.get("width")).toBe("1024");
      expect(body.get("height")).toBe("1024");
      expect(blob).toBeInstanceOf(Blob);
      expect(await blob.text()).toBe("cloudflare-image");
    });

    it("should generate an image via proxy Cloudflare Workers AI when account ID is not provided", async () => {
      const mockImageData = "cHJveHktY2xvdWRmbGFyZS1pbWFnZQ=="; // "proxy-cloudflare-image" in base64
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            result: { image: mockImageData },
          }),
      });

      const blob = await service.generateImage(
        "",
        "prompt",
        "@cf/black-forest-labs/flux-1-schnell",
        {
          provider: "cloudflare",
        },
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://oracle-proxy.espen-erlandsen.workers.dev/v1/images/generations",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            model: "@cf/black-forest-labs/flux-1-schnell",
            prompt: "prompt",
          }),
        }),
      );
      expect(blob).toBeInstanceOf(Blob);
      expect(await blob.text()).toBe("proxy-cloudflare-image");
    });

    it("should preserve proxy Cloudflare daily image limit guidance", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Too Many Requests",
        json: () =>
          Promise.resolve({
            error: {
              message:
                "Daily image generation limit exceeded. Please try again tomorrow, or configure your own Cloudflare Account ID and API Token in settings.",
              code: "RATE_LIMIT_EXCEEDED",
            },
          }),
      });

      await expect(
        service.generateImage(
          "",
          "prompt",
          "@cf/black-forest-labs/flux-2-klein-4b",
          {
            provider: "cloudflare",
          },
        ),
      ).rejects.toThrow(
        "Daily image generation limit exceeded. Please try again tomorrow, or configure your own Cloudflare Account ID and API Token in settings.",
      );
    });

    it("should process a raw Cloudflare Workers AI image payload", async () => {
      const mockImageData = "ZGVidWctaW1hZ2U="; // "debug-image" in base64
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            result: {
              image: `data:image/png;base64,\n${mockImageData}\n`,
            },
          }),
      });

      const blob = await service.generateImage(
        "",
        "prompt",
        "@cf/black-forest-labs/flux-2-klein-4b",
        {
          provider: "cloudflare",
        },
      );

      expect(blob.type).toBe("image/png");
      expect(await blob.text()).toBe("debug-image");
    });

    it("should fail fast when Cloudflare account ID is provided but API token is missing", async () => {
      await expect(
        service.generateImage("", "prompt", "model", {
          provider: "cloudflare",
          cloudflareAccountId: "cf-account-id",
        }),
      ).rejects.toThrow(
        "A Cloudflare API token is required when a custom Cloudflare Account ID is configured.",
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
