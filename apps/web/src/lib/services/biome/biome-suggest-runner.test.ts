import { describe, expect, it, vi } from "vitest";
import { createBiomeSuggestRunner } from "./biome-suggest-runner";

function setup(text = '{"suggestions":[]}') {
  const generateContent = vi.fn(
    async (_request: unknown, _options?: unknown) => ({
      response: { text: () => text },
    }),
  );
  const getModel = vi.fn(async () => ({ generateContent }));
  const runner = createBiomeSuggestRunner({
    aiClient: { getModel },
    settings: { effectiveApiKey: "key-1", modelName: "" },
  });
  return { runner, getModel, generateContent };
}

describe("createBiomeSuggestRunner", () => {
  it("sends the system and user text to the model and returns its text", async () => {
    const { runner, getModel, generateContent } = setup("hello");
    const out = await runner({ system: "SYS", user: "USR" });
    expect(out).toBe("hello");
    expect(getModel).toHaveBeenCalledWith(
      "key-1",
      "gemini-3.5-flash-lite",
      "SYS",
    );
    const request = generateContent.mock.calls[0][0] as {
      contents: { parts: { text: string }[] }[];
    };
    expect(request.contents[0].parts[0].text).toBe("USR");
  });

  it("passes the abort signal on", async () => {
    const { runner, generateContent } = setup();
    const controller = new AbortController();
    await runner({ system: "s", user: "u", signal: controller.signal });
    expect((generateContent.mock.calls[0] as unknown[])[1]).toEqual({
      signal: controller.signal,
    });
  });

  it("does not call the model when already cancelled", async () => {
    const { runner, getModel } = setup();
    const controller = new AbortController();
    controller.abort();
    await expect(
      runner({ system: "s", user: "u", signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(getModel).not.toHaveBeenCalled();
  });

  it("lets a model failure through so the engine can report it", async () => {
    const runner = createBiomeSuggestRunner({
      aiClient: {
        getModel: async () => {
          throw new Error("no key");
        },
      },
      settings: { effectiveApiKey: null, modelName: "m" },
    });
    await expect(runner({ system: "s", user: "u" })).rejects.toThrow("no key");
  });

  it("invokes ensureSession before getModel when no API key is configured, and skips it when an API key exists", async () => {
    const order: string[] = [];
    const ensureSession = vi.fn(async () => {
      order.push("ensureSession");
    });
    const getModel = vi.fn(async () => {
      order.push("getModel");
      return {
        generateContent: vi.fn(async () => ({
          response: { text: () => '{"suggestions":[]}' },
        })),
      };
    });

    const publicRunner = createBiomeSuggestRunner({
      aiClient: { getModel },
      settings: { effectiveApiKey: null, modelName: "" },
      ensureSession,
    });
    await publicRunner({ system: "SYS", user: "USR" });
    expect(order).toEqual(["ensureSession", "getModel"]);

    ensureSession.mockClear();
    const keyedRunner = createBiomeSuggestRunner({
      aiClient: { getModel },
      settings: { effectiveApiKey: "user-key", modelName: "" },
      ensureSession,
    });
    await keyedRunner({ system: "SYS", user: "USR" });
    expect(ensureSession).not.toHaveBeenCalled();
  });

  it("aborts without calling getModel if signal aborts during ensureSession and propagates ensureSession errors", async () => {
    const controller = new AbortController();
    const getModel = vi.fn();
    const abortingRunner = createBiomeSuggestRunner({
      aiClient: { getModel },
      settings: { effectiveApiKey: null, modelName: "" },
      ensureSession: async () => {
        controller.abort();
      },
    });

    await expect(
      abortingRunner({ system: "SYS", user: "USR", signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(getModel).not.toHaveBeenCalled();

    const failingRunner = createBiomeSuggestRunner({
      aiClient: { getModel },
      settings: { effectiveApiKey: null, modelName: "" },
      ensureSession: async () => {
        throw new Error("session failed");
      },
    });

    await expect(failingRunner({ system: "SYS", user: "USR" })).rejects.toThrow(
      "session failed",
    );
    expect(getModel).not.toHaveBeenCalled();
  });
});
