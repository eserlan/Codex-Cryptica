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
    it("should return proxy model when no API key provided", () => {
      const model = manager.getModel("", "gemini-1.5-pro");
      
      expect(model).toBeDefined();
      expect(model.model).toBe("gemini-1.5-pro");
      expect(typeof model.generateContent).toBe("function");
    });

    it("should return direct client model when API key is provided", () => {
      const model = manager.getModel("test-api-key", "gemini-1.5-pro");
      
      expect(model).toBeDefined();
      expect(model.model).toBe("gemini-1.5-pro");
    });
  });

  describe("createProxyModel", () => {
    it("should forward requests to proxy URL", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{ text: "Test response" }]
            }
          }]
        })
      };
      
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const model = manager.getModel("", "gemini-1.5-pro");
      const result = await model.generateContent("Test message");
      
      expect(fetch).toHaveBeenCalledWith(
        "https://oracle-proxy.codexcryptica.workers.dev",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );
      
      expect(result.response.text()).toBe("Test response");
    });

    it("should throw error on invalid response structure", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{}] // Missing content.parts[0].text
        })
      };
      
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const model = manager.getModel("", "gemini-1.5-pro");
      
      await expect(model.generateContent("Test"))
        .rejects.toThrow("[OracleProxy] Invalid response: missing content in candidates");
    });

    it("should throw error on proxy request failure", async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: { message: "Service unavailable" }
        })
      };
      
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const model = manager.getModel("", "gemini-1.5-pro");
      
      await expect(model.generateContent("Test"))
        .rejects.toThrow("[OracleProxy] Request failed: Service unavailable");
    });

    it("should handle malformed proxy response gracefully", async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON"))
      };
      
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const model = manager.getModel("", "gemini-1.5-pro");
      
      await expect(model.generateContent("Test"))
        .rejects.toThrow("[OracleProxy] Request failed: Proxy request failed");
    });

    it("should include system instruction when provided", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{ text: "Response with system instruction" }]
            }
          }]
        })
      };
      
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const model = manager.getModel("", "gemini-1.5-pro", "You are a helpful assistant");
      await model.generateContent("Test");
      
      const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);
      
      expect(body.generationConfig).toEqual({
        systemInstruction: "You are a helpful assistant"
      });
    });

    it("should handle array of content blobs", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{ text: "Multi-part response" }]
            }
          }]
        })
      };
      
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const model = manager.getModel("", "gemini-1.5-pro");
      await model.generateContent([
        { text: "Text part" },
        { inlineData: { mimeType: "image/png", data: "base64data" } }
      ]);
      
      const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);
      
      expect(body.contents).toHaveLength(2);
      expect(body.contents[0].parts[0].text).toBe("Text part");
      expect(body.contents[1].parts[0].inlineData).toBeDefined();
    });
  });
});
