import { describe, it, expect, vi } from "vitest";
import {
  callOpenAi,
  forwardInteractionToOpenAi,
  extractOpenAiResponseText,
  streamOpenAi,
} from "./openai-adaptor";
import type { GenerationEvent, LlmModelDefinition, LlmRequest } from "../types";

/** Builds a `Response` whose body streams the given SSE `data:` payloads. */
function sseResponse(chunks: unknown[], status = 200): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
        );
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, { status });
}

async function collect(
  gen: AsyncGenerator<GenerationEvent>,
): Promise<GenerationEvent[]> {
  const events: GenerationEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

const env = { OPENAI_API_KEY: "test-openai-key" };

const model: LlmModelDefinition = {
  key: "luna-fast",
  provider: "openai",
  modelId: "gpt-5.6-luna",
  displayName: "GPT-5.6 Luna",
  capabilities: {
    structuredOutput: true,
    freeformGeneration: true,
    revision: false,
  },
  costTier: "low",
  pricing: { inputPer1kTokens: 0, outputPer1kTokens: 0 },
  availability: { public: true, authenticated: true, admin: true },
  enabled: true,
};

const request: LlmRequest = {
  operation: "freeform-generation",
  messages: [
    { role: "system", content: "Be terse." },
    { role: "user", content: "hello" },
  ],
};

describe("callOpenAi", () => {
  it("shapes the request with messages, model id, and auth header", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: "hi" } }] }),
          { status: 200 },
        ),
    );

    await callOpenAi(request, model, env, fetcher as unknown as typeof fetch);

    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toContain("chat/completions");
    expect((init.headers as any).Authorization).toBe("Bearer test-openai-key");
    const sent = JSON.parse(init.body as string);
    expect(sent.model).toBe("gpt-5.6-luna");
    expect(sent.messages).toEqual([
      { role: "system", content: "Be terse." },
      { role: "user", content: "hello" },
    ]);
  });

  it("forwards topP to top_p", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: "hi" } }] }),
          { status: 200 },
        ),
    );

    await callOpenAi(
      { ...request, topP: 0.8 },
      model,
      env,
      fetcher as unknown as typeof fetch,
    );

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.top_p).toBe(0.8);
  });

  it("sends maxOutputTokens as max_completion_tokens, never max_tokens", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: "hi" } }] }),
          { status: 200 },
        ),
    );

    await callOpenAi(
      { ...request, maxOutputTokens: 512 },
      model,
      env,
      fetcher as unknown as typeof fetch,
    );

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.max_completion_tokens).toBe(512);
    expect(sent.max_tokens).toBeUndefined();
  });

  it("never forwards temperature (GPT-5.6-family rejects it)", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: "hi" } }] }),
          { status: 200 },
        ),
    );

    await callOpenAi(
      { ...request, temperature: 0.85 },
      model,
      env,
      fetcher as unknown as typeof fetch,
    );

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.temperature).toBeUndefined();
  });

  it("forwards reasoningEffort as reasoning_effort when set", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: "hi" } }] }),
          { status: 200 },
        ),
    );

    await callOpenAi(
      { ...request, reasoningEffort: "minimal" },
      model,
      env,
      fetcher as unknown as typeof fetch,
    );

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.reasoning_effort).toBe("minimal");
  });

  it("omits reasoning_effort entirely when unset", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: "hi" } }] }),
          { status: 200 },
        ),
    );

    await callOpenAi(request, model, env, fetcher as unknown as typeof fetch);

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.reasoning_effort).toBeUndefined();
  });

  it("sends response_format for structured-generation requests", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"ok":true}' } }],
          }),
          { status: 200 },
        ),
    );

    const result = await callOpenAi(
      {
        ...request,
        operation: "structured-generation",
        schema: { type: "object" },
      },
      model,
      env,
      fetcher as unknown as typeof fetch,
    );

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.response_format.type).toBe("json_schema");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.content).toEqual({ ok: true });
      expect(result.response.structuredOutputValid).toBe(true);
    }
  });

  it("uses schema-less json_object mode for structured-generation without a schema", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"label":"lore"}' } }],
          }),
          { status: 200 },
        ),
    );

    const result = await callOpenAi(
      { ...request, operation: "structured-generation" },
      model,
      env,
      fetcher as unknown as typeof fetch,
    );

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.response_format).toEqual({ type: "json_object" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.content).toEqual({ label: "lore" });
      expect(result.response.structuredOutputValid).toBe(true);
    }
  });

  it("uses JSON mode for schemas with an unsupported root oneOf", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"kind":"complete"}' } }],
          }),
          { status: 200 },
        ),
    );

    const result = await callOpenAi(
      {
        ...request,
        operation: "structured-generation",
        schema: {
          oneOf: [
            {
              type: "object",
              properties: { kind: { enum: ["complete"] } },
            },
            {
              type: "object",
              properties: { kind: { enum: ["roll-required"] } },
            },
          ],
        },
      },
      model,
      env,
      fetcher as unknown as typeof fetch,
    );

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.response_format).toEqual({ type: "json_object" });
    expect(
      sent.messages.some((message: { content: string }) =>
        message.content.toLowerCase().includes("json"),
      ),
    ).toBe(true);
    expect(result.ok).toBe(true);
  });

  it("also enables JSON mode when a schema is present on a non-structured-generation operation", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"label":"lore"}' } }],
          }),
          { status: 200 },
        ),
    );

    const result = await callOpenAi(
      { ...request, operation: "classification", schema: { type: "object" } },
      model,
      env,
      fetcher as unknown as typeof fetch,
    );

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.response_format.type).toBe("json_schema");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.response.structuredOutputValid).toBe(true);
  });

  it("normalizes usage from prompt_tokens/completion_tokens", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "hi" } }],
            usage: { prompt_tokens: 10, completion_tokens: 4 },
          }),
          { status: 200 },
        ),
    );

    const result = await callOpenAi(
      request,
      model,
      env,
      fetcher as unknown as typeof fetch,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 4,
      });
    }
  });

  it("reports a timeout as an unavailable outcome, not an unhandled rejection", async () => {
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
    const resultPromise = callOpenAi(request, model, env, realFetcher);
    await vi.advanceTimersByTimeAsync(60_001);
    const result = await resultPromise;
    vi.useRealTimers();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("timeout");
  });

  it("still classifies the abort as a timeout when it rejects with a non-Error (e.g. DOMException-like) abort reason", async () => {
    const realFetcher = (async (_url: any, init: any) => {
      return new Promise<Response>((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          reject({ name: "AbortError", message: "The operation was aborted" });
        });
      });
    }) as unknown as typeof fetch;

    vi.useFakeTimers();
    const resultPromise = callOpenAi(request, model, env, realFetcher);
    await vi.advanceTimersByTimeAsync(60_001);
    const result = await resultPromise;
    vi.useRealTimers();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("timeout");
  });

  it("reports structured-output validation failure without throwing", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: "not json" } }] }),
          { status: 200 },
        ),
    );

    const result = await callOpenAi(
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
    if (!result.ok) expect(result.structuredOutputValidationFailed).toBe(true);
  });

  it("reports a validation failure when the parsed JSON does not match the requested schema", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            // Valid JSON, but missing the schema's required "ok" property.
            choices: [{ message: { content: '{"unexpected":true}' } }],
          }),
          { status: 200 },
        ),
    );

    const result = await callOpenAi(
      {
        ...request,
        operation: "structured-generation",
        schema: {
          type: "object",
          required: ["ok"],
          properties: { ok: { type: "boolean" } },
        },
      },
      model,
      env,
      fetcher as unknown as typeof fetch,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.structuredOutputValidationFailed).toBe(true);
      expect(result.reason).toBe("structured-output-schema-mismatch");
    }
  });

  it("fails clearly when the API key is missing rather than sending an unauthenticated request", async () => {
    const fetcher = vi.fn();
    const result = await callOpenAi(
      request,
      model,
      {},
      fetcher as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("extractOpenAiResponseText", () => {
  it("joins output_text blocks from message-typed output items", () => {
    const text = extractOpenAiResponseText({
      output: [
        { type: "reasoning", content: [] },
        {
          type: "message",
          role: "assistant",
          content: [
            { type: "output_text", text: "Hello" },
            { type: "output_text", text: ", world." },
          ],
        },
      ],
    });
    expect(text).toBe("Hello, world.");
  });

  it("returns an empty string for a missing/malformed output array", () => {
    expect(extractOpenAiResponseText({})).toBe("");
    expect(extractOpenAiResponseText({ output: null })).toBe("");
  });
});

describe("forwardInteractionToOpenAi", () => {
  it("translates previous_interaction_id into previous_response_id and posts to /v1/responses", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "resp_1", output: [] }), {
          status: 200,
        }),
    );

    const result = await forwardInteractionToOpenAi(
      {
        input: "continue the scene",
        previous_interaction_id: "resp_0",
        system_instruction: "Be a helpful oracle.",
      },
      "gpt-5.6-luna",
      env,
      fetcher as unknown as typeof fetch,
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);

    const [calledUrl, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(String(calledUrl)).toContain("/v1/responses");
    const sent = JSON.parse(init.body as string);
    expect(sent.model).toBe("gpt-5.6-luna");
    expect(sent.input).toBe("continue the scene");
    expect(sent.previous_response_id).toBe("resp_0");
    expect(sent.instructions).toBe("Be a helpful oracle.");
    expect(sent.store).toBe(true);
  });

  it("sends a low reasoning effort (no per-operation registry hook on this path)", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "resp_1", output: [] }), {
          status: 200,
        }),
    );

    await forwardInteractionToOpenAi(
      { input: "hi" },
      "gpt-5.6-luna",
      env,
      fetcher as unknown as typeof fetch,
    );

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.reasoning).toEqual({ effort: "low" });
  });

  it("fails clearly when the API key is missing rather than sending an unauthenticated request", async () => {
    const fetcher = vi.fn();
    const result = await forwardInteractionToOpenAi(
      { input: "hi" },
      "gpt-5.6-luna",
      {},
      fetcher as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('requests json_object mode and guarantees "json" appears in the input when responseMimeType is application/json', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "resp_1", output: [] }), {
          status: 200,
        }),
    );

    await forwardInteractionToOpenAi(
      {
        input: "generate a settlement",
        system_instruction: "Be a helpful oracle.",
        generationConfig: { responseMimeType: "application/json" },
      },
      "gpt-5.6-luna",
      env,
      fetcher as unknown as typeof fetch,
    );

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.text).toEqual({ format: { type: "json_object" } });
    expect(sent.instructions).toBe(
      "Be a helpful oracle.\n\nRespond with valid JSON.",
    );
    expect(sent.input).toBe(
      "Respond with valid JSON.\n\ngenerate a settlement",
    );
  });

  it("still guarantees the json instruction when no system instruction was provided", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "resp_1", output: [] }), {
          status: 200,
        }),
    );

    await forwardInteractionToOpenAi(
      {
        input: "generate a settlement",
        generationConfig: { responseMimeType: "application/json" },
      },
      "gpt-5.6-luna",
      env,
      fetcher as unknown as typeof fetch,
    );

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.instructions).toBe("Respond with valid JSON.");
  });

  it("reports a transport error without throwing", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("network down");
    });
    const result = await forwardInteractionToOpenAi(
      { input: "hi" },
      "gpt-5.6-luna",
      env,
      fetcher as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
    expect(result.transportError).toBe(true);
  });
});

describe("streamOpenAi", () => {
  it("yields started, delta chunks, then complete with the joined text", async () => {
    const fetcher = vi.fn(async () =>
      sseResponse([
        { choices: [{ delta: { content: "Hello" } }] },
        { choices: [{ delta: { content: ", world" } }] },
        {
          choices: [{ delta: {} }],
          usage: { prompt_tokens: 5, completion_tokens: 3 },
        },
      ]),
    );

    const events = await collect(
      streamOpenAi(request, model, env, fetcher as unknown as typeof fetch),
    );

    expect(events[0]).toEqual({ type: "started" });
    expect(events.slice(1, -1)).toEqual([
      { type: "delta", text: "Hello" },
      { type: "delta", text: ", world" },
    ]);
    expect(events.at(-1)).toEqual({
      type: "complete",
      text: "Hello, world",
      usage: { promptTokens: 5, completionTokens: 3 },
    });
  });

  it("sets stream:true and stream_options on the request body", async () => {
    const fetcher = vi.fn(async () => sseResponse([]));
    await collect(
      streamOpenAi(request, model, env, fetcher as unknown as typeof fetch),
    );
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.stream).toBe(true);
    expect(sent.stream_options).toEqual({ include_usage: true });
  });

  it("yields an error event without throwing on a transport failure", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("network down");
    });
    const events = await collect(
      streamOpenAi(request, model, env, fetcher as unknown as typeof fetch),
    );
    expect(events).toEqual([{ type: "error", error: "transport-error" }]);
  });

  it("yields an error event on a non-OK upstream status", async () => {
    const fetcher = vi.fn(async () => new Response("", { status: 500 }));
    const events = await collect(
      streamOpenAi(request, model, env, fetcher as unknown as typeof fetch),
    );
    expect(events).toEqual([{ type: "error", error: "upstream-status-500" }]);
  });

  it("yields an error event when the API key is missing", async () => {
    const events = await collect(
      streamOpenAi(request, model, {}, vi.fn() as unknown as typeof fetch),
    );
    expect(events).toEqual([
      { type: "error", error: "missing-openai-api-key" },
    ]);
  });

  it("skips a malformed chunk instead of aborting the stream", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode("data: {not json}\n\n"));
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ choices: [{ delta: { content: "ok" } }] })}\n\n`,
          ),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    const fetcher = vi.fn(async () => new Response(stream, { status: 200 }));

    const events = await collect(
      streamOpenAi(request, model, env, fetcher as unknown as typeof fetch),
    );

    expect(events).toEqual([
      { type: "started" },
      { type: "delta", text: "ok" },
      { type: "complete", text: "ok", usage: undefined },
    ]);
  });
});
