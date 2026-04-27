import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @google/generative-ai with proper class structure
vi.mock("@google/generative-ai", () => {
  class MockGoogleGenerativeAI {
    constructor(_apiKey: string) {}

    getGenerativeModel() {
      return {
        model: "gemini-1.5-pro",
        generateContent: vi.fn(),
      };
    }
  }

  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
  };
});

import { DefaultAIClientManager } from "./client-manager";

describe("DefaultAIClientManager", () => {
  let manager: DefaultAIClientManager;

  beforeEach(() => {
    manager = new DefaultAIClientManager();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("getModel", () => {
    it("should return proxy model when no API key provided", async () => {
      const model = await manager.getModel("", "gemini-1.5-pro");

      expect(model).toBeDefined();
      expect(model.model).toBe("gemini-1.5-pro");
      expect(typeof model.generateContent).toBe("function");
    });

    it("should return direct client model when API key is provided", async () => {
      const model = await manager.getModel("test-api-key", "gemini-1.5-pro");

      expect(model).toBeDefined();
      expect(model.model).toBe("gemini-1.5-pro");
    });
  });

  describe("createProxyModel", () => {
    it("should forward requests to proxy URL", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "Test response" }],
              },
            },
          ],
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const model = await manager.getModel("", "gemini-1.5-pro");
      const result = await model.generateContent("Test message");

      expect(fetch).toHaveBeenCalledWith(
        "https://oracle-proxy.espen-erlandsen.workers.dev",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );

      expect(result.response.text()).toBe("Test response");
    });

    it("should handle empty response structure gracefully", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{}], // Missing content.parts[0].text
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const model = await manager.getModel("", "gemini-1.5-pro");
      const result = await model.generateContent("Test");

      expect(result.response.text()).toBe("");
      expect(result.response.candidates).toHaveLength(1);
    });

    it("should throw error on proxy request failure", async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: { message: "Service unavailable" },
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const model = await manager.getModel("", "gemini-1.5-pro");

      await expect(model.generateContent("Test")).rejects.toThrow(
        "[OracleProxy] Request failed: Service unavailable",
      );
    });

    it("should handle malformed proxy response gracefully", async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const model = await manager.getModel("", "gemini-1.5-pro");

      await expect(model.generateContent("Test")).rejects.toThrow(
        "[OracleProxy] Request failed: Proxy request failed",
      );
    });

    it("should include system instruction when provided", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "Response with system instruction" }],
              },
            },
          ],
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const model = await manager.getModel(
        "",
        "gemini-1.5-pro",
        "You are a helpful assistant",
      );
      await model.generateContent("Test");

      const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);

      expect(body.system_instruction).toEqual({
        parts: [{ text: "You are a helpful assistant" }],
      });
    });

    it("should handle array of content blobs as multiple parts", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "Multi-part response" }],
              },
            },
          ],
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const model = await manager.getModel("", "gemini-1.5-pro");
      await model.generateContent([
        { text: "Text part" },
        { inlineData: { mimeType: "image/png", data: "base64data" } },
      ]);

      const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);

      // Now it's a single role:user content with multiple parts
      expect(body.contents).toHaveLength(1);
      expect(body.contents[0].parts).toHaveLength(2);
      expect(body.contents[0].parts[0].text).toBe("Text part");
      expect(body.contents[0].parts[1].inlineData).toBeDefined();
    });

    it("should preserve object-shaped requests without Svelte runes", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "Object request response" }],
              },
            },
          ],
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const request: any = {
        contents: [
          {
            role: "user",
            parts: [{ text: "Prompt text" }],
          },
        ],
        generationConfig: {
          response_modalities: ["IMAGE"],
        },
      };

      const model = await manager.getModel("", "gemini-1.5-pro");
      await model.generateContent(request);

      const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);

      expect(body.contents).toEqual(request.contents);
      expect(body.generationConfig).toEqual(request.generationConfig);
    });

    it("should fall back when structuredClone cannot clone the request", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "Proxy fallback response" }],
              },
            },
          ],
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);
      vi.stubGlobal(
        "structuredClone",
        vi.fn(() => {
          throw new DOMException("Cannot clone proxy", "DataCloneError");
        }),
      );

      const request: any = new Proxy(
        {
          contents: [
            {
              role: "user",
              parts: [{ text: "Proxy prompt" }],
            },
          ],
          generationConfig: {
            response_modalities: ["IMAGE"],
          },
        },
        {},
      );

      const model = await manager.getModel("", "gemini-1.5-pro");
      await model.generateContent(request);

      const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);

      expect(body.contents).toEqual(request.contents);
      expect(body.generationConfig).toEqual(request.generationConfig);
    });
  });
});
