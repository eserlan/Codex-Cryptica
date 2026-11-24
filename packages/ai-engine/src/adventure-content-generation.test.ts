import { describe, expect, it, vi } from "vitest";
import { buildAdventurePrompt } from "@codex/adventure-engine";
import { AdventureContentGeneration } from "./adventure-content-generation";
import { AdventureInteractionContext } from "./adventure-interaction-context";
import {
  session,
  completeResponse,
} from "./adventure-generation.test-fixtures";

const request = {
  session,
  phase: "action" as const,
  anchors: [],
  relevant: [],
};
const prompt = buildAdventurePrompt(request);

describe("adventure stateless content generation", () => {
  it("uses the selected model, direct key, schema, and overriding cancellation signal", async () => {
    const signal = new AbortController().signal;
    const generateContent = vi.fn(async () => ({
      response: { text: () => completeResponse },
    }));
    const getModel = vi.fn(async () => ({ generateContent }));
    const generator = new AdventureContentGeneration(
      { getModel },
      new AdventureInteractionContext(),
    );
    await expect(
      generator.buffered(
        { ...request, signal: AbortSignal.abort() },
        prompt,
        "instruction",
        { apiKey: "direct-key", modelName: "custom", signal },
      ),
    ).resolves.toMatchObject({ kind: "complete" });
    expect(getModel).toHaveBeenCalledWith(
      "direct-key",
      "custom",
      "instruction",
    );
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        generationConfig: expect.objectContaining({
          responseMimeType: "application/json",
        }),
      }),
      { signal },
    );
  });

  it("returns null without clearing context when streaming is unavailable", async () => {
    const context = new AdventureInteractionContext();
    const retained = context.get(session.id);
    const generator = new AdventureContentGeneration(
      {
        async getModel() {
          return {
            async generateContent() {
              throw new Error("unused");
            },
          };
        },
      },
      context,
    );
    expect(
      await generator.stream(request, prompt, "instruction", {}),
    ).toBeNull();
    expect(context.get(session.id)).toBe(retained);
  });

  it("buffers narration until the complete proposal is validated and clears retained context", async () => {
    const context = new AdventureInteractionContext();
    const retained = context.get(session.id);
    const previews: string[] = [];
    const generator = new AdventureContentGeneration(
      {
        async getModel() {
          return {
            async generateContent() {
              throw new Error("unused");
            },
            async *generateContentStream(input: unknown) {
              expect(input).toMatchObject({
                contents: [
                  { role: "user", parts: [{ text: prompt.serialized }] },
                ],
              });
              yield { type: "complete" as const, text: completeResponse };
            },
          };
        },
      },
      context,
    );
    await expect(
      generator.stream(
        { ...request, onNarration: (text) => previews.push(text) },
        prompt,
        "instruction",
        {},
      ),
    ).resolves.toMatchObject({ kind: "complete" });
    expect(previews).toEqual([]);
    expect(context.get(session.id)).not.toBe(retained);
  });

  it.each(["invalid", "cancelled", "provider-failed"])(
    "rejects %s buffered output",
    async (reason) => {
      const controller = new AbortController();
      const generator = new AdventureContentGeneration(
        {
          async getModel() {
            return {
              async generateContent() {
                if (reason === "provider-failed") throw new Error(reason);
                if (reason === "cancelled") controller.abort();
                return {
                  response: {
                    text: () =>
                      reason === "invalid" ? "invalid" : completeResponse,
                  },
                };
              },
            };
          },
        },
        new AdventureInteractionContext(),
      );
      await expect(
        generator.buffered(request, prompt, "instruction", {
          signal: controller.signal,
        }),
      ).rejects.toThrow();
    },
  );

  it("checks cancellation before requesting a buffered model and propagates stream failures", async () => {
    const getModel = vi.fn(async () => ({
      async generateContent() {
        throw new Error("unused");
      },
      async *generateContentStream() {
        yield { type: "error" as const, error: "stream-failed" };
      },
    }));
    const generator = new AdventureContentGeneration(
      { getModel },
      new AdventureInteractionContext(),
    );
    await expect(
      generator.buffered(request, prompt, "instruction", {
        signal: AbortSignal.abort(),
      }),
    ).rejects.toThrow("Cancelled");
    expect(getModel).not.toHaveBeenCalled();
    await expect(
      generator.stream(request, prompt, "instruction", {}),
    ).rejects.toThrow("stream-failed");
  });

  it("streams progressive narration when hiddenPatch precedes narration and suppresses same-turn leaks", async () => {
    const parsed = JSON.parse(completeResponse);
    const ordered = JSON.stringify({
      kind: parsed.kind,
      hiddenPatch: parsed.hiddenPatch,
      revealSecretIds: parsed.revealSecretIds,
      narration: "A lantern flickers in the mist.",
      visiblePatch: parsed.visiblePatch,
      provisionalFacts: parsed.provisionalFacts,
      sourceRecordIds: parsed.sourceRecordIds,
    });
    const cut = ordered.indexOf("in the mist.");
    const previews: string[] = [];
    const generator = new AdventureContentGeneration(
      {
        async getModel() {
          return {
            async generateContent() {
              throw new Error("unused");
            },
            async *generateContentStream() {
              yield { type: "delta" as const, text: ordered.slice(0, cut) };
              yield { type: "delta" as const, text: ordered.slice(cut) };
              yield { type: "complete" as const, text: ordered };
            },
          };
        },
      },
      new AdventureInteractionContext(),
    );
    await expect(
      generator.stream(
        { ...request, onNarration: (text) => previews.push(text) },
        prompt,
        "instruction",
        {},
      ),
    ).resolves.toMatchObject({
      kind: "complete",
      narration: "A lantern flickers in the mist.",
    });
    expect(previews).toEqual([
      "A lantern flickers ",
      "A lantern flickers in the mist.",
    ]);
  });
});
