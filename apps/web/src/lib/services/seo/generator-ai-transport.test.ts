import { describe, it, expect, vi, beforeEach } from "vitest";
import { aiClientManager } from "@codex/ai-engine";
import * as publicSessionBootstrap from "#lib/services/ai/public-session-bootstrap.js";
import { GeneratorAITransport, toSeoOutput } from "./generator-ai-transport";

describe("toSeoOutput", () => {
  it("carries fields through and casts the type onto the SEO union", () => {
    const result = toSeoOutput({
      type: "npc",
      title: "Tomasa",
      summary: "A frontier guide",
      content: "Bio",
      lore: "Secrets",
      labels: ["npc"],
    } as any);

    expect(result).toEqual({
      type: "npc",
      title: "Tomasa",
      summary: "A frontier guide",
      content: "Bio",
      lore: "Secrets",
      labels: ["npc"],
    });
  });
});

describe("GeneratorAITransport", () => {
  let clientManager: { getModel: ReturnType<typeof vi.fn> };
  let transport: GeneratorAITransport;

  beforeEach(() => {
    clientManager = { getModel: vi.fn() };
    transport = new GeneratorAITransport(clientManager as any);
  });

  it("loads the default AI client only when a model request starts", async () => {
    const loadClientManager = vi.fn().mockResolvedValue({
      getModel: vi.fn().mockResolvedValue({
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => " ready " },
        }),
      }),
    });
    const lazyTransport = new GeneratorAITransport(
      undefined,
      loadClientManager,
    );

    expect(loadClientManager).not.toHaveBeenCalled();
    await expect(lazyTransport.runModel("system", "user")).resolves.toBe(
      "ready",
    );
    expect(loadClientManager).toHaveBeenCalledOnce();
  });

  it("surfaces a failed default client load to the existing caller error path", async () => {
    const loadClientManager = vi
      .fn()
      .mockRejectedValue(new Error("AI client unavailable"));
    const lazyTransport = new GeneratorAITransport(
      undefined,
      loadClientManager,
    );

    await expect(lazyTransport.runModel("system", "user")).rejects.toThrow(
      "AI client unavailable",
    );
    expect(loadClientManager).toHaveBeenCalledOnce();
  });

  describe("runModel", () => {
    it("returns the trimmed non-streaming response text", async () => {
      clientManager.getModel.mockResolvedValue({
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => "  hello world  " },
        }),
      });

      const text = await transport.runModel("system", "user message");

      expect(text).toBe("hello world");
      expect(clientManager.getModel).toHaveBeenCalledWith(
        "",
        "gemini-3.5-flash-lite",
        "system",
      );
    });

    it("passes the abort signal in the SDK request options for one-shot calls", async () => {
      const signal = new AbortController().signal;
      const generateContent = vi.fn().mockResolvedValue({
        response: { text: () => "response" },
      });
      clientManager.getModel.mockResolvedValue({ generateContent });

      await transport.runModel("system", "user", undefined, true, signal);

      expect(generateContent).toHaveBeenCalledWith("user", { signal });
    });

    it("does not start a model request when the signal aborts during setup", async () => {
      const controller = new AbortController();
      const generateContent = vi.fn();
      clientManager.getModel.mockImplementation(async () => {
        controller.abort();
        return { generateContent };
      });

      await expect(
        transport.runModel(
          "system",
          "user",
          undefined,
          true,
          controller.signal,
        ),
      ).rejects.toMatchObject({ name: "AbortError" });
      expect(generateContent).not.toHaveBeenCalled();
    });

    it("can keep the first pass silent while streaming the editorial pass", async () => {
      const generateContent = vi.fn().mockResolvedValue({
        response: { text: () => '{"title":"first"}' },
      });
      const generateContentStream = vi.fn(async function* () {
        yield { type: "delta", text: '{"title":"re' };
        yield { type: "delta", text: 'viewed"}' };
        yield { type: "complete", text: '{"title":"reviewed"}' };
      });
      clientManager.getModel.mockResolvedValue({
        generateContent,
        generateContentStream,
      });
      const previews: string[] = [];
      await transport.generateWithPreview(
        async () => {
          await transport.runModel(
            "writer",
            "initial prompt",
            undefined,
            false,
          );
          return transport.runModel("editor", "review prompt", undefined, true);
        },
        (preview) => previews.push(preview),
      );
      expect(generateContent).toHaveBeenCalledTimes(1);
      expect(generateContentStream).toHaveBeenCalledTimes(1);
      expect(previews).toEqual(['{"title":"re', '{"title":"reviewed"}']);
    });

    it("streams deltas into the preview callback registered via generateWithPreview", async () => {
      clientManager.getModel.mockResolvedValue({
        generateContentStream: async function* () {
          yield { type: "delta", text: "foo" };
          yield { type: "delta", text: "bar" };
          yield { type: "complete", text: "foobar" };
        },
      });

      const previews: string[] = [];
      const text = await transport.generateWithPreview(
        () => transport.runModel("system", "user message"),
        (t) => previews.push(t),
      );

      expect(text).toBe("foobar");
      expect(previews).toEqual(["foo", "foobar"]);
    });

    it("passes the abort signal directly to the streaming model", async () => {
      const signal = new AbortController().signal;
      const generateContentStream = vi.fn(async function* () {
        yield { type: "complete" as const, text: "response" };
      });
      clientManager.getModel.mockResolvedValue({ generateContentStream });

      await transport.generateWithPreview(
        () => transport.runModel("system", "user", undefined, true, signal),
        vi.fn(),
      );

      expect(generateContentStream).toHaveBeenCalledWith("user", signal);
    });

    it("runs ensureSession before getModel in runModel and propagates session errors", async () => {
      const order: string[] = [];
      const ensureSession = vi.fn(async () => {
        order.push("ensureSession");
      });
      clientManager.getModel.mockImplementation(async () => {
        order.push("getModel");
        return {
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "ok" },
          }),
        };
      });

      const scopedTransport = new GeneratorAITransport(undefined, async () => {
        await ensureSession();
        return clientManager;
      });
      await scopedTransport.runModel("sys", "usr");

      expect(order).toEqual(["ensureSession", "getModel"]);

      const failingTransport = new GeneratorAITransport(undefined, async () => {
        throw new Error("session unavailable");
      });
      await expect(failingTransport.runModel("sys", "usr")).rejects.toThrow(
        "session unavailable",
      );
    });

    it("lazily invokes ensurePublicAiSession before aiClientManager.getModel when using default constructor", async () => {
      const order: string[] = [];
      const ensureSpy = vi
        .spyOn(publicSessionBootstrap, "ensurePublicAiSession")
        .mockImplementation(() => {
          order.push("ensurePublicAiSession");
          return null;
        });
      const getModelSpy = vi
        .spyOn(aiClientManager, "getModel")
        .mockImplementation(async () => {
          order.push("getModel");
          return {
            generateContent: vi.fn().mockResolvedValue({
              response: { text: () => "default ok" },
            }),
          } as any;
        });

      try {
        const defaultTransport = new GeneratorAITransport();
        const result = await defaultTransport.runModel("sys", "usr");

        expect(result).toBe("default ok");
        expect(order).toEqual(["ensurePublicAiSession", "getModel"]);
      } finally {
        ensureSpy.mockRestore();
        getModelSpy.mockRestore();
      }
    });

    it("aborts before ensureSession when signal is already aborted and during ensureSession without calling getModel", async () => {
      const preController = new AbortController();
      preController.abort();
      const preEnsureSession = vi.fn();
      const preTransport = new GeneratorAITransport(undefined, async () => {
        preEnsureSession();
        return clientManager;
      });

      await expect(
        preTransport.runModel(
          "sys",
          "usr",
          undefined,
          true,
          preController.signal,
        ),
      ).rejects.toMatchObject({ name: "AbortError" });
      expect(preEnsureSession).not.toHaveBeenCalled();
      expect(clientManager.getModel).not.toHaveBeenCalled();

      const midController = new AbortController();
      const midTransport = new GeneratorAITransport(undefined, async () => {
        midController.abort();
        return clientManager;
      });

      await expect(
        midTransport.runModel(
          "sys",
          "usr",
          undefined,
          true,
          midController.signal,
        ),
      ).rejects.toMatchObject({ name: "AbortError" });
      expect(clientManager.getModel).not.toHaveBeenCalled();
    });
  });

  describe("startChat", () => {
    it("runs ensureSession before getModel in startChat", async () => {
      const order: string[] = [];
      const startChat = vi.fn().mockReturnValue({ sendMessageStream: vi.fn() });
      const ensureSession = vi.fn(async () => {
        order.push("ensureSession");
      });
      clientManager.getModel.mockImplementation(async () => {
        order.push("getModel");
        return { startChat };
      });

      const scopedTransport = new GeneratorAITransport(undefined, async () => {
        await ensureSession();
        return clientManager;
      });
      await scopedTransport.startChat("sys");

      expect(order).toEqual(["ensureSession", "getModel"]);
      expect(startChat).toHaveBeenCalledWith({ history: [] });
    });
  });

  describe("runWithAIFallback", () => {
    it("returns the AI attempt's output when it succeeds", async () => {
      const result = await transport.runWithAIFallback(
        true,
        async () => ({ type: "npc", title: "AI Result" }) as any,
        () => ({ type: "npc", title: "Local Result" }) as any,
      );

      expect(result).toMatchObject({ title: "AI Result" });
    });

    it("falls back to local output and stamps aiFallback when the AI attempt throws", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await transport.runWithAIFallback(
        true,
        async () => {
          throw new Error("network down");
        },
        () => ({ type: "npc", title: "Local Result" }) as any,
      );

      expect(result).toMatchObject({
        title: "Local Result",
        aiFallback: true,
      });

      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it("propagates cancellation without generating a local fallback", async () => {
      const local = vi.fn(
        () => ({ type: "npc", title: "Local Result" }) as any,
      );
      const aiAttempt = async () => {
        throw new DOMException("The operation was aborted", "AbortError");
      };

      await expect(
        transport.runWithAIFallback(true, aiAttempt, local),
      ).rejects.toMatchObject({ name: "AbortError" });
      expect(local).not.toHaveBeenCalled();
    });

    it("propagates the signal reason when cancellation uses a regular Error", async () => {
      const controller = new AbortController();
      const cancellation = new Error("cancelled");
      const local = vi.fn(
        () => ({ type: "npc", title: "Local Result" }) as any,
      );
      const aiAttempt = async () => {
        controller.abort(cancellation);
        throw cancellation;
      };

      await expect(
        transport.runWithAIFallback(true, aiAttempt, local, controller.signal),
      ).rejects.toBe(cancellation);
      expect(local).not.toHaveBeenCalled();
    });

    it("skips the AI attempt entirely when useAI is false", async () => {
      const aiAttempt = vi.fn();
      const result = await transport.runWithAIFallback(
        false,
        aiAttempt,
        () => ({ type: "npc", title: "Local Result" }) as any,
      );

      expect(aiAttempt).not.toHaveBeenCalled();
      expect(result).toMatchObject({ title: "Local Result" });
      expect(result.aiFallback).toBeUndefined();
    });
  });
});
