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

  describe("completeStream", () => {
    async function collect(
      gen: AsyncGenerator<import("generator-engine").GenerationEvent>,
    ) {
      const events: import("generator-engine").GenerationEvent[] = [];
      for await (const event of gen) events.push(event);
      return events;
    }

    it("re-emits delta events, interleaves field events as JSON completes, and parses the final buffer on complete", async () => {
      const chunks = [
        '{"name": "Ma',
        'w of the Uncounted", "summary": "A wagon-sized aberration"}',
      ];
      const generateContentStream = async function* () {
        for (const text of chunks) {
          yield { type: "delta", text };
        }
        yield { type: "complete", text: "" };
      };
      const client = {
        getModel: async () => ({ generateContentStream }),
      };
      const gateway = new ProxyAIGeneratorGateway(client as never);

      const events = await collect(gateway.completeStream("prompt", "system"));

      expect(events).toEqual([
        { type: "delta", text: chunks[0] },
        {
          type: "field",
          key: "name",
          value: "Maw of the Uncounted",
        },
        {
          type: "field",
          key: "summary",
          value: "A wagon-sized aberration",
        },
        { type: "delta", text: chunks[1] },
        {
          type: "complete",
          text: chunks.join(""),
          usage: undefined,
        },
      ]);
    });

    it("degrades to a single started/complete pair for an interaction-backed request", async () => {
      const client = {
        sendInteraction: async () => ({
          id: "interaction-1",
          text: '{"title":"A"} trailing',
        }),
      };
      const gateway = new ProxyAIGeneratorGateway(client as never);

      const events = await collect(
        gateway.completeStream("prompt", "system", {
          interaction: { input: "delta request" },
        }),
      );

      expect(events).toEqual([
        { type: "started" },
        {
          type: "complete",
          text: '{"title":"A"}',
          interactionId: "interaction-1",
        },
      ]);
    });

    it("forwards replayed:true when the interaction id had expired and was replayed (#2423)", async () => {
      const calls: unknown[] = [];
      const client = {
        sendInteraction: async (params: unknown) => {
          calls.push(params);
          if (calls.length === 1) throw new InteractionExpiredError("expired");
          return { id: "fresh", text: '{"title":"Replay"}' };
        },
      };
      const gateway = new ProxyAIGeneratorGateway(client as never);

      const events = await collect(
        gateway.completeStream("prompt", "system", {
          interaction: {
            input: "delta request",
            previousInteractionId: "stale",
            replayPrompt: "full replay",
          },
        }),
      );

      expect(calls).toHaveLength(2);
      expect(events).toEqual([
        { type: "started" },
        {
          type: "complete",
          text: '{"title":"Replay"}',
          interactionId: "fresh",
          replayed: true,
        },
      ]);
    });

    it("forwards options.signal into the interaction-backed sendInteraction call (#2423 cancel support)", async () => {
      const calls: unknown[] = [];
      const client = {
        sendInteraction: async (params: unknown) => {
          calls.push(params);
          return { id: "interaction-1", text: "{}" };
        },
      };
      const gateway = new ProxyAIGeneratorGateway(client as never);
      const controller = new AbortController();

      await collect(
        gateway.completeStream("prompt", "system", {
          interaction: { input: "delta request" },
          signal: controller.signal,
        }),
      );

      expect(calls).toEqual([
        expect.objectContaining({ signal: controller.signal }),
      ]);
    });

    it("yields an error event when the underlying stream call rejects", async () => {
      // eslint-disable-next-line require-yield
      const generateContentStream = async function* () {
        throw new Error("network down");
      };
      const client = {
        getModel: async () => ({ generateContentStream }),
      };
      const gateway = new ProxyAIGeneratorGateway(client as never);

      await expect(
        collect(gateway.completeStream("prompt", "system")),
      ).rejects.toThrow("network down");
    });
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

    describe("sendStream", () => {
      async function collect(
        gen: AsyncGenerator<import("generator-engine").GenerationEvent>,
      ) {
        const events: import("generator-engine").GenerationEvent[] = [];
        for await (const event of gen) events.push(event);
        return events;
      }

      it("re-emits delta events, interleaves field events, and yields one complete event per turn", async () => {
        const chunks = ['{"title": "Fo', 'undation"}'];
        const sendMessageStream = async () => ({
          stream: (async function* () {
            for (const text of chunks) yield { text: () => text };
          })(),
        });
        const client = {
          getModel: async () => ({ startChat: () => ({ sendMessageStream }) }),
        };
        const gateway = new ProxyAIGeneratorGateway(client as never);

        const chat = await gateway.startChat("system instruction");
        const events = await collect(chat.sendStream!("turn one"));

        expect(events).toEqual([
          { type: "started" },
          { type: "delta", text: chunks[0] },
          { type: "field", key: "title", value: "Foundation" },
          { type: "delta", text: chunks[1] },
          { type: "complete", text: chunks.join("") },
        ]);
      });

      it("scopes the field scanner to one turn — a second turn re-emits the same key", async () => {
        let call = 0;
        const replies = ['{"title": "A"}', '{"title": "B"}'];
        const sendMessageStream = async () => {
          const text = replies[call++];
          return {
            stream: (async function* () {
              yield { text: () => text };
            })(),
          };
        };
        const client = {
          getModel: async () => ({ startChat: () => ({ sendMessageStream }) }),
        };
        const gateway = new ProxyAIGeneratorGateway(client as never);

        const chat = await gateway.startChat("system instruction");
        const firstEvents = await collect(chat.sendStream!("turn one"));
        const secondEvents = await collect(chat.sendStream!("turn two"));

        expect(firstEvents).toContainEqual({
          type: "field",
          key: "title",
          value: "A",
        });
        expect(secondEvents).toContainEqual({
          type: "field",
          key: "title",
          value: "B",
        });
      });

      it("yields an error event without throwing when the underlying stream call rejects", async () => {
        const sendMessageStream = async () => {
          throw new Error("network down");
        };
        const client = {
          getModel: async () => ({ startChat: () => ({ sendMessageStream }) }),
        };
        const gateway = new ProxyAIGeneratorGateway(client as never);

        const chat = await gateway.startChat("system instruction");
        const events = await collect(chat.sendStream!("turn one"));

        expect(events).toEqual([
          { type: "started" },
          { type: "error", error: "network down" },
        ]);
      });

      it("forwards an AbortSignal into the underlying sendMessageStream call", async () => {
        const calls: unknown[] = [];
        const sendMessageStream = async (
          _query: string,
          signal?: AbortSignal,
        ) => {
          calls.push(signal);
          return { stream: (async function* () {})() };
        };
        const client = {
          getModel: async () => ({ startChat: () => ({ sendMessageStream }) }),
        };
        const gateway = new ProxyAIGeneratorGateway(client as never);
        const controller = new AbortController();

        const chat = await gateway.startChat("system instruction");
        await collect(chat.sendStream!("turn one", controller.signal));

        expect(calls).toEqual([controller.signal]);
      });
    });
  });
});
