import { describe, it, expect } from "vitest";
import { InteractionExpiredError } from "@codex/ai-engine";
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
  it("uses the Interactions API when interaction options are provided", async () => {
    const client = {
      sendInteraction: async (params: unknown) => {
        expect(params).toEqual(
          expect.objectContaining({
            input: "delta request",
            previousInteractionId: "interaction-1",
            storeConversation: true,
            generationConfig: expect.objectContaining({
              responseMimeType: "application/json",
              maxOutputTokens: 2048,
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
});
