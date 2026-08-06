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

  describe("sendInteraction", () => {
    it("forwards generation config to the proxy interaction path", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: "interaction-1",
          text: "response",
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await manager.sendInteraction({
        model: "gemini-3.5-flash-lite",
        input: "Prompt",
        systemInstruction: "System",
        previousInteractionId: "previous-1",
        generationConfig: { responseMimeType: "application/json" },
      });

      const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);

      expect(body).toEqual(
        expect.objectContaining({
          model: "gemini-3.5-flash-lite",
          input: "Prompt",
          system_instruction: "System",
          previous_interaction_id: "previous-1",
          generationConfig: { responseMimeType: "application/json" },
        }),
      );
    });

    it("uses an injected fetcher instead of the global fetch", async () => {
      const injected = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: "i1", text: "ok" }),
      });
      const isolated = new DefaultAIClientManager(injected as any);

      const result = await isolated.sendInteraction({
        model: "m",
        input: "hi",
      });

      expect(injected).toHaveBeenCalledOnce();
      expect(fetch).not.toHaveBeenCalled();
      expect(result).toEqual({ id: "i1", text: "ok" });
    });
  });

  describe("createProxyModel", () => {
    it("should forward requests to proxy URL", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: "Test response",
          modelKey: "gemini-flash-lite",
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

      const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);
      expect(body.operation).toBe("freeform-generation");
      expect(body.messages).toEqual([
        { role: "user", content: "Test message" },
      ]);

      expect(result.response.text()).toBe("Test response");
    });

    it("maps responseMimeType application/json to the structured-generation operation", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ content: { ok: true } }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const model = await manager.getModel("", "gemini-1.5-pro");
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "Return JSON" }] }],
        generationConfig: { responseMimeType: "application/json" },
      });

      const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);
      expect(body.operation).toBe("structured-generation");

      // Structured content comes back as a parsed object server-side;
      // callers doing their own JSON.parse(text()) must still see a string.
      expect(result.response.text()).toBe('{"ok":true}');
    });

    it("forwards responseSchema as the request body's schema field", async () => {
      // Regression: without a schema, oracle-proxy has nothing to validate
      // the parsed response against, so structuredOutputValid defaults to
      // true even for a malformed/wrong-shaped response. Forwarding the
      // schema also lets OpenAI-family models return a JSON array at the
      // root (json_object mode can only return an object).
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ content: [] }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const schema = { type: "array", items: { type: "string" } };
      const model = await manager.getModel("", "gemini-1.5-pro");
      await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "Return JSON" }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema as any,
        },
      });

      const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);
      expect(body.schema).toEqual(schema);
    });

    it("logs the model the registry actually resolved, not just the legacy model-name hint", async () => {
      // Regression: a stale "gemini-3.5-flash-lite" model hint could read as
      // the model that served the request even when the registry actually
      // picked luna-fast — the resolved model must be logged explicitly.
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: { ok: true },
          modelKey: "luna-fast",
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const model = await manager.getModel("", "gemini-3.5-flash-lite");
      await model.generateContent("Test message");

      expect(logSpy).toHaveBeenCalledWith(
        "[OracleProxy] Resolved model: luna-fast",
      );
      logSpy.mockRestore();
    });

    it("forwards temperature, topP, and maxOutputTokens from generationConfig", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ content: "ok" }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const model = await manager.getModel("", "gemini-1.5-pro");
      await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        generationConfig: {
          temperature: 0.85,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
      });

      const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);
      expect(body.temperature).toBe(0.85);
      expect(body.topP).toBe(0.95);
      expect(body.maxOutputTokens).toBe(4096);
    });

    it("falls back to the legacy request shape for non-text response modalities", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: "b64", mimeType: "image/png" } }],
              },
            },
          ],
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const model = await manager.getModel("", "gemini-1.5-pro");
      const request: any = {
        contents: [{ role: "user", parts: [{ text: "draw a cat" }] }],
        generationConfig: { response_modalities: ["IMAGE"] },
      };
      await model.generateContent(request);

      const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);
      // Legacy shape, not the operation pipeline's messages/operation shape.
      expect(body.operation).toBeUndefined();
      expect(body.contents).toBeDefined();
    });

    it("should handle empty response structure gracefully", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({}), // Missing content
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
          content: "Response with system instruction",
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

      expect(body.messages[0]).toEqual({
        role: "system",
        content: "You are a helpful assistant",
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

  describe("startChat", () => {
    it("should include history in proxy sendMessageStream", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: "Coherent response",
        }),
      };

      (fetch as any).mockResolvedValue(mockResponse as any);

      const model = await manager.getModel("", "gemini-1.5-pro");
      const history = [
        { role: "user", parts: [{ text: "Hello" }] },
        { role: "model", parts: [{ text: "Hi there" }] },
      ];

      const chat = (model as any).startChat({ history });
      const result = await chat.sendMessageStream("What is my name?");

      const callArgs = (fetch as any).mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string);

      expect(body.messages).toHaveLength(3);
      expect(body.messages[0]).toEqual({ role: "user", content: "Hello" });
      expect(body.messages[1]).toEqual({
        role: "assistant",
        content: "Hi there",
      });
      expect(body.messages[2]).toEqual({
        role: "user",
        content: "What is my name?",
      });

      const streamResult = await result.stream.next();
      expect(streamResult.value.text()).toBe("Coherent response");
    });

    it("should accumulate prior turns across multiple sendMessageStream calls on the same session", async () => {
      const responses = ["First reply", "Second reply"];
      let call = 0;
      (fetch as any).mockImplementation(async () => ({
        ok: true,
        json: vi.fn().mockResolvedValue({ content: responses[call++] }),
      }));

      const model = await manager.getModel("", "gemini-1.5-pro");
      const chat = (model as any).startChat({ history: [] });

      await chat.sendMessageStream("First message");
      await chat.sendMessageStream("Second message");

      const secondCallBody = JSON.parse(
        ((fetch as any).mock.calls[1][1] as RequestInit).body as string,
      );

      // The second call must see the first user message AND the first
      // model reply, not just the freshly sent second message.
      expect(secondCallBody.messages).toHaveLength(3);
      expect(secondCallBody.messages[0]).toEqual({
        role: "user",
        content: "First message",
      });
      expect(secondCallBody.messages[1]).toEqual({
        role: "assistant",
        content: "First reply",
      });
      expect(secondCallBody.messages[2]).toEqual({
        role: "user",
        content: "Second message",
      });
    });
  });
});
