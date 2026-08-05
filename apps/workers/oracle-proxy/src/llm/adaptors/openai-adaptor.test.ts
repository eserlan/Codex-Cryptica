import { describe, it, expect, vi } from "vitest";
import { callOpenAi } from "./openai-adaptor";
import type { LlmModelDefinition, LlmRequest } from "../types";

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
    await vi.advanceTimersByTimeAsync(15_001);
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
