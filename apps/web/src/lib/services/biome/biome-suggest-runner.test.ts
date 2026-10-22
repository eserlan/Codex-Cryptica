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
});
