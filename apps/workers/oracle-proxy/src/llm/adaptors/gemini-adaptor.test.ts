import { describe, it, expect, vi } from "vitest";
import {
  forwardToGemini,
  forwardInteractionToGemini,
  callGemini,
} from "./gemini-adaptor";
import type { LlmModelDefinition, LlmRequest } from "../types";

const env = { GEMINI_API_KEY: "test-key" };

describe("forwardToGemini (legacy generateContent parity)", () => {
  it("maps camelCase generation config to snake_case", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    );

    await forwardToGemini(
      {
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        generationConfig: { maxOutputTokens: 512, topP: 0.9, temperature: 0.7 },
      },
      env,
      fetcher as unknown as typeof fetch,
    );

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.generation_config).toEqual({
      max_output_tokens: 512,
      top_p: 0.9,
      temperature: 0.7,
    });
  });

  it("formats a string system_instruction into the parts shape", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    );

    await forwardToGemini(
      {
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        system_instruction: "Be terse.",
      },
      env,
      fetcher as unknown as typeof fetch,
    );

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.system_instruction).toEqual({ parts: [{ text: "Be terse." }] });
  });

  it("only writes speech_config when a concrete voice name is present", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    );

    await forwardToGemini(
      {
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        generationConfig: { speechConfig: { voiceConfig: {} } },
      },
      env,
      fetcher as unknown as typeof fetch,
    );

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.generation_config.speech_config).toBeUndefined();

    const fetcher2 = vi.fn(
      async () =>
        new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    );
    await forwardToGemini(
      {
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        generationConfig: {
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
        },
      },
      env,
      fetcher2 as unknown as typeof fetch,
    );
    const [, init2] = fetcher2.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const sent2 = JSON.parse(init2.body as string);
    expect(sent2.generation_config.speech_config).toEqual({
      voice_config: { prebuilt_voice_config: { voice_name: "Kore" } },
    });
  });

  it("propagates safety settings unchanged", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    );
    const safety_settings = [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    ];

    await forwardToGemini(
      { contents: [], safety_settings },
      env,
      fetcher as unknown as typeof fetch,
    );

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.safety_settings).toEqual(safety_settings);
  });

  it("reports a parse error when Gemini returns non-JSON", async () => {
    const fetcher = vi.fn(
      async () => new Response("not json", { status: 200 }),
    );

    const result = await forwardToGemini(
      { contents: [] },
      env,
      fetcher as unknown as typeof fetch,
    );

    expect(result.parseError).toBe(true);
  });
});

describe("forwardInteractionToGemini (legacy Interactions API parity)", () => {
  it("threads previous_interaction_id and a string system instruction", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "v1_x", steps: [] }), {
          status: 200,
        }),
    );

    await forwardInteractionToGemini(
      {
        input: "continue",
        previous_interaction_id: "v1_abc",
        system_instruction: { parts: [{ text: "Be terse." }] },
      },
      env,
      fetcher as unknown as typeof fetch,
    );

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.previous_interaction_id).toBe("v1_abc");
    expect(sent.system_instruction).toBe("Be terse.");
  });

  it("reports a transport error without throwing", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("network down");
    });

    const result = await forwardInteractionToGemini(
      { input: "hi" },
      env,
      fetcher as unknown as typeof fetch,
    );

    expect(result.ok).toBe(false);
    expect(result.transportError).toBe(true);
  });
});

describe("callGemini (new provider-neutral adaptor)", () => {
  const model: LlmModelDefinition = {
    key: "gemini-flash-lite",
    provider: "gemini",
    modelId: "gemini-3.5-flash-lite",
    displayName: "Gemini Flash Lite",
    capabilities: {
      structuredOutput: true,
      freeformGeneration: true,
      revision: true,
    },
    costTier: "low",
    pricing: { inputPer1kTokens: 0, outputPer1kTokens: 0 },
    availability: { public: true, authenticated: true, admin: true },
    enabled: true,
  };

  const request: LlmRequest = {
    operation: "freeform-generation",
    messages: [{ role: "user", content: "hello" }],
  };

  it("normalizes a successful response", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "hi there" }] } }],
            usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
          }),
          { status: 200 },
        ),
    );

    const result = await callGemini(
      request,
      model,
      env,
      fetcher as unknown as typeof fetch,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.content).toBe("hi there");
      expect(result.response.modelKey).toBe("gemini-flash-lite");
      expect(result.response.usage).toEqual({
        promptTokens: 5,
        completionTokens: 3,
      });
    }
  });

  it("reports a timeout as an unavailable outcome, not an unhandled rejection", async () => {
    // Simulate the abort wiring: fetch should reject with an AbortError once
    // the signal is aborted, as the real fetch implementation would.
    const realFetcher = (async (_url: any, init: any) => {
      return new Promise<Response>((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    }) as unknown as typeof fetch;

    vi.useFakeTimers();
    const resultPromise = callGemini(request, model, env, realFetcher);
    await vi.advanceTimersByTimeAsync(15_001);
    const result = await resultPromise;
    vi.useRealTimers();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("timeout");
    }
  });

  it("reports structured-output validation failure without throwing", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "not valid json" }] } }],
          }),
          { status: 200 },
        ),
    );

    const result = await callGemini(
      {
        ...request,
        operation: "structured-generation",
        schema: { type: "object" },
      },
      model,
      env,
      fetcher as unknown as typeof fetch,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.structuredOutputValidationFailed).toBe(true);
    }
  });
});
