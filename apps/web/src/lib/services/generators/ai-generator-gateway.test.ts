import { describe, it, expect } from "vitest";
import {
  InteractionExpiredError,
  INTERACTION_MODEL_KEY,
  GENERATOR_INTERACTION_MODEL_KEY,
} from "@codex/ai-engine";
import {
  ProxyAIGeneratorGateway,
  extractJsonObject,
} from "./ai-generator-gateway";

describe("extractJsonObject", () => {
  it("returns a clean object unchanged", () => {
    const s = '{"title":"A","lore":"b"}';
    expect(JSON.parse(extractJsonObject(s))).toEqual({ title: "A", lore: "b" });
  });

  it("salvages an object with a degenerate trailing run of braces", () => {
    const s = '{"title":"A","lore":"b"}\n}\n}\n}\n}\n}';
    expect(JSON.parse(extractJsonObject(s))).toEqual({ title: "A", lore: "b" });
  });

  it("strips code fences", () => {
    const s = '```json\n{"title":"A"}\n```';
    expect(JSON.parse(extractJsonObject(s))).toEqual({ title: "A" });
  });

  it("ignores leading prose before the object", () => {
    const s = 'Here is your JSON:\n{"title":"A"}';
    expect(JSON.parse(extractJsonObject(s))).toEqual({ title: "A" });
  });

  it("does not get confused by braces inside string values", () => {
    const s = '{"lore":"a } b { c","title":"X"} trailing }}}';
    expect(JSON.parse(extractJsonObject(s))).toEqual({
      lore: "a } b { c",
      title: "X",
    });
  });

  it("handles escaped quotes inside strings", () => {
    const s = '{"lore":"she said \\"hi\\""}}}}';
    expect(JSON.parse(extractJsonObject(s))).toEqual({ lore: 'she said "hi"' });
  });
});

describe("ProxyAIGeneratorGateway", () => {
  it("routes generator interactions through the Luna conversation model", () => {
    expect(GENERATOR_INTERACTION_MODEL_KEY).toBe(INTERACTION_MODEL_KEY);
    expect(INTERACTION_MODEL_KEY).toBe("luna-fast");
  });

  it("uses the Interactions API when interaction options are provided", async () => {
    const client = {
      sendInteraction: async (params: unknown) => {
        expect(params).toEqual(
          expect.objectContaining({
            model: GENERATOR_INTERACTION_MODEL_KEY,
            input: "delta request",
            previousInteractionId: "interaction-1",
            storeConversation: true,
            generationConfig: expect.objectContaining({
              responseMimeType: "application/json",
              maxOutputTokens: 4096,
            }),
          }),
        );
        return { id: "interaction-2", text: '{"title":"A"} trailing' };
      },
      getModel: async () => {
        throw new Error("stateless path should not be used");
      },
    };
    const gateway = new ProxyAIGeneratorGateway(client as never);

    await expect(
      gateway.complete("full prompt", "system", {
        interaction: {
          input: "delta request",
          previousInteractionId: "interaction-1",
          store: true,
          replayPrompt: "full replay",
        },
      }),
    ).resolves.toEqual({
      text: '{"title":"A"}',
      interactionId: "interaction-2",
      usedInteraction: true,
    });
  });

  it("replays the full prompt once when the interaction id expired", async () => {
    const calls: unknown[] = [];
    const client = {
      sendInteraction: async (params: unknown) => {
        calls.push(params);
        if (calls.length === 1) {
          throw new InteractionExpiredError("expired");
        }
        return { id: "fresh", text: '{"title":"Replay"}' };
      },
      getModel: async () => {
        throw new Error("stateless path should not be used");
      },
    };
    const gateway = new ProxyAIGeneratorGateway(client as never);

    const result = await gateway.complete("full prompt", "system", {
      interaction: {
        input: "delta request",
        previousInteractionId: "stale",
        replayPrompt: "full replay",
      },
    });

    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual(
      expect.objectContaining({
        model: GENERATOR_INTERACTION_MODEL_KEY,
        input: "full replay",
        previousInteractionId: null,
        generationConfig: expect.objectContaining({
          responseMimeType: "application/json",
        }),
      }),
    );
    expect(result).toEqual({
      text: '{"title":"Replay"}',
      interactionId: "fresh",
      usedInteraction: true,
      replayed: true,
    });
  });

  it("applies per-request decoding overrides to stateless generation", async () => {
    const generateContent = async (request: unknown) => {
      expect(request).toEqual(
        expect.objectContaining({
          generationConfig: {
            temperature: 0.35,
            topP: 0.8,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      );
      return { response: { text: () => '{"title":"Stable"}' } };
    };
    const client = {
      getModel: async () => ({ generateContent }),
    };
    const gateway = new ProxyAIGeneratorGateway(client as never);

    await expect(
      gateway.complete("full prompt", "system", {
        generationConfig: {
          temperature: 0.35,
          topP: 0.8,
          maxOutputTokens: 8192,
        },
      }),
    ).resolves.toBe('{"title":"Stable"}');
  });

  describe("startChat", () => {
    it("opens one session and lets multiple turns share it, extracting JSON from each reply", async () => {
      const responses = [
        '{"title":"Foundation"} trailing garbage',
        '{"possiblePaths":"paths"}',
      ];
      let call = 0;
      const sendMessageStream = async (message: string) => {
        expect(message).toBeTruthy();
        const text = responses[call++];
        return {
          stream: (async function* () {
            yield { text: () => text };
          })(),
        };
      };
      const chatSession = { sendMessageStream };
      const client = {
        getModel: async () => ({
          startChat: () => chatSession,
        }),
      };
      const gateway = new ProxyAIGeneratorGateway(client as never);

      const chat = await gateway.startChat("system instruction");
      const first = await chat.send("foundation turn");
      const second = await chat.send("paths turn");

      expect(JSON.parse(first)).toEqual({ title: "Foundation" });
      expect(JSON.parse(second)).toEqual({ possiblePaths: "paths" });
    });
  });
});
