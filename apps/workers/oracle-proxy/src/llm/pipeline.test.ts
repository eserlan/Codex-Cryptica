import { describe, it, expect, vi, afterEach } from "vitest";
import worker from "../index";

const env = {
  GEMINI_API_KEY: "test-gemini-key",
  OPENAI_API_KEY: "test-openai-key",
};
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const post = (body: Record<string, unknown>) =>
  new Request("https://oracle-proxy.espen-erlandsen.workers.dev/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://codex-cryptica.com",
    },
    body: JSON.stringify(body),
  });

describe("LLM operation pipeline: end-to-end", () => {
  it("Scenario 1 — only selects a model whose registry entry declares structuredOutput for structured-generation", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
          }),
          { status: 200 },
        ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await worker.fetch(
      post({
        operation: "structured-generation",
        messages: [{ role: "user", content: "hi" }],
        schema: { type: "object" },
      }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.modelKey).toBe("gemini-flash-lite");
    expect(body.structuredOutputValid).toBe(true);
  });

  it("Scenario 2 — selects the configured default when no override is given", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "hi" }] } }],
          }),
          { status: 200 },
        ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await worker.fetch(
      post({
        operation: "freeform-generation",
        messages: [{ role: "user", content: "hi" }],
      }),
      env,
      {} as ExecutionContext,
    );

    const body = await response.json();
    expect(body.modelKey).toBe("gemini-flash-lite");
  });

  it("Scenario 3 — identical normalized response shape across a Gemini-served and an OpenAI/Luna-served request", async () => {
    const geminiFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "from gemini" }] } }],
          }),
          { status: 200 },
        ),
    );
    globalThis.fetch = geminiFetch as typeof fetch;
    const geminiResponse = await worker.fetch(
      post({
        operation: "freeform-generation",
        messages: [{ role: "user", content: "hi" }],
      }),
      env,
      {} as ExecutionContext,
    );
    const geminiBody = await geminiResponse.json();

    const openAiFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: "from luna" } }] }),
          { status: 200 },
        ),
    );
    globalThis.fetch = openAiFetch as typeof fetch;
    const lunaResponse = await worker.fetch(
      post({
        operation: "freeform-generation",
        messages: [{ role: "user", content: "hi" }],
        modelKeyOverride: "luna-fast",
      }),
      env,
      {} as ExecutionContext,
    );
    const lunaBody = await lunaResponse.json();

    expect(Object.keys(geminiBody).sort()).toEqual(
      Object.keys(lunaBody).sort(),
    );
    expect(geminiBody.modelKey).toBe("gemini-flash-lite");
    expect(lunaBody.modelKey).toBe("luna-fast");
    expect(geminiBody.content).toBe("from gemini");
    expect(lunaBody.content).toBe("from luna");
  });

  it("Scenario 4 — rejects a body containing a disallowed provider/credential field before touching a provider", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await worker.fetch(
      post({
        operation: "freeform-generation",
        messages: [{ role: "user", content: "hi" }],
        apiKey: "sk-should-not-be-accepted",
      }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("LLM_DISALLOWED_FIELD");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("LLM operation pipeline: bounded call count (FR-009 — no silent 'improve' pass)", () => {
  it("makes exactly one upstream call for a normal successful request", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "ok" }] } }],
          }),
          { status: 200 },
        ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await worker.fetch(
      post({
        operation: "freeform-generation",
        messages: [{ role: "user", content: "hi" }],
      }),
      env,
      {} as ExecutionContext,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never makes more than three upstream calls (primary + retry + fallback), even across the retry-then-fallback path", async () => {
    let calls = 0;
    const fetchMock = vi.fn(async (url: string) => {
      calls++;
      if (String(url).includes("generativelanguage")) {
        // Primary (Gemini) always returns invalid JSON for a structured
        // request, so it should be retried once, then the pipeline falls
        // back to the OpenAI-served default.
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "not valid json" }] } }],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }),
        { status: 200 },
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const response = await worker.fetch(
      post({
        operation: "structured-generation",
        messages: [{ role: "user", content: "hi" }],
        schema: { type: "object" },
      }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.modelKey).toBe("luna-fast");
    // 2 calls to the failing primary (initial + retry) + 1 to the fallback = 3.
    expect(calls).toBe(3);
    // Never a 4th call — no silent "improve the result" pass after a model
    // already returned a usable response.
    expect(calls).toBeLessThanOrEqual(3);
  });
});

describe("Story 3 — GPT-5.6 Luna available through the shared pipeline", () => {
  it("Scenario 1 — classification (Luna's primary default) returns valid structured output produced by Luna", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"label":"lore"}' } }],
          }),
          { status: 200 },
        ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await worker.fetch(
      post({
        operation: "classification",
        messages: [{ role: "user", content: "classify this" }],
        schema: { type: "object" },
      }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.modelKey).toBe("luna-fast");
    expect(body.structuredOutputValid).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain("chat/completions");
  });

  it("Scenario 2 — disabling luna-fast excludes it from selection even as the configured default, falling back correctly", async () => {
    const registry = await import("./registry");
    const lunaEntry = registry.MODEL_REGISTRY.find(
      (m) => m.key === "luna-fast",
    );
    expect(lunaEntry).toBeDefined();
    const originalEnabled = lunaEntry!.enabled;
    lunaEntry!.enabled = false;

    try {
      const fetchMock = vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              candidates: [
                { content: { parts: [{ text: '{"label":"lore"}' }] } },
              ],
            }),
            { status: 200 },
          ),
      );
      globalThis.fetch = fetchMock as typeof fetch;

      const response = await worker.fetch(
        post({
          operation: "classification",
          messages: [{ role: "user", content: "classify this" }],
          schema: { type: "object" },
        }),
        env,
        {} as ExecutionContext,
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      // Falls back to classification's configured fallback, gemini-flash-lite,
      // instead of ever selecting the disabled Luna entry.
      expect(body.modelKey).toBe("gemini-flash-lite");
      expect(String(fetchMock.mock.calls[0][0])).toContain(
        "generativelanguage",
      );
    } finally {
      lunaEntry!.enabled = originalEnabled;
    }
  });
});
