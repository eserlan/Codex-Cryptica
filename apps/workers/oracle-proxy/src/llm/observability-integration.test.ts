import { describe, it, expect, vi, afterEach } from "vitest";
import worker from "../index";

const env = { GEMINI_API_KEY: "test-key", OPENAI_API_KEY: "test-openai-key" };
const originalFetch = globalThis.fetch;
const originalConsoleLog = console.log;

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.log = originalConsoleLog;
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

function captureLogs() {
  const logs: string[] = [];
  console.log = (msg: string) => logs.push(msg);
  return logs;
}

describe("US5 Scenario 1 — every processed request produces a ResolutionLogEntry with the required fields", () => {
  it("logs modelKey, provider, operation, context, latencyMs, and outcome on success", async () => {
    const logs = captureLogs();
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "ok" }] } }],
          }),
          { status: 200 },
        ),
    ) as typeof fetch;

    await worker.fetch(
      post({
        operation: "freeform-generation",
        messages: [{ role: "user", content: "hi" }],
      }),
      env,
      {} as ExecutionContext,
    );

    const entry = JSON.parse(logs[logs.length - 1]);
    expect(entry.modelKey).toBeTruthy();
    expect(entry.provider).toBeTruthy();
    expect(entry.operation).toBe("freeform-generation");
    expect(entry.context).toBe("public");
    expect(typeof entry.latencyMs).toBe("number");
    expect(entry.outcome).toBe("success");
  });

  it("logs an entry even for a failure outcome", async () => {
    const logs = captureLogs();
    globalThis.fetch = vi.fn() as typeof fetch;

    await worker.fetch(
      post({
        operation: "revision",
        messages: [{ role: "user", content: "hi" }],
      }),
      env,
      {} as ExecutionContext,
    );

    const entry = JSON.parse(logs[logs.length - 1]);
    expect(entry.outcome).toBe("failure");
    expect(entry.operation).toBe("revision");
    // No model was ever resolved for "revision" this slice, so there's no
    // real provider to attribute — must not fabricate one.
    expect(entry.provider).toBeUndefined();
  });
});

describe("US5 Scenario 2 — token usage and estimated cost are logged when available", () => {
  it("includes usage and estimatedCostUsd when the provider reports token counts", async () => {
    const logs = captureLogs();
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "ok" } }],
            usage: { prompt_tokens: 100, completion_tokens: 50 },
          }),
          { status: 200 },
        ),
    ) as typeof fetch;

    await worker.fetch(
      post({
        operation: "freeform-generation",
        messages: [{ role: "user", content: "hi" }],
        // Pinned: this scenario is about usage and cost being logged, not
        // about which model the operation currently routes to. The mocked
        // response below is OpenAI-shaped, so the model must be too.
        modelKeyOverride: "luna-fast",
      }),
      env,
      {} as ExecutionContext,
    );

    const entry = JSON.parse(logs[logs.length - 1]);
    expect(entry.usage).toEqual({ promptTokens: 100, completionTokens: 50 });
    // luna-fast's registry pricing: $1/$6 per 1M tokens -> 0.001/0.006 per 1k.
    // (100/1000)*0.001 + (50/1000)*0.006 = 0.0004.
    expect(entry.estimatedCostUsd).toBeCloseTo(0.0004);
  });
});

describe("US5 Scenario 3 — structured-output validation failures are logged without the invalid content", () => {
  it("marks structuredOutputValidationFailed and never includes the invalid text", async () => {
    const logs = captureLogs();
    const invalidText = "SECRET-INVALID-JSON-abc123";
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: invalidText }] } }],
          }),
          { status: 200 },
        ),
    ) as typeof fetch;

    await worker.fetch(
      post({
        operation: "structured-generation",
        messages: [{ role: "user", content: "hi" }],
        schema: { type: "object" },
      }),
      env,
      {} as ExecutionContext,
    );

    const entry = JSON.parse(logs[logs.length - 1]);
    expect(entry.structuredOutputValidationFailed).toBe(true);
    expect(logs.every((l) => !l.includes(invalidText))).toBe(true);
  });
});

describe("US5 Scenario 4 — no log entry ever contains prompt/response content, across mixed traffic", () => {
  it("runs a mixed batch of requests and finds no fixture content in any log line", async () => {
    const logs = captureLogs();
    const promptFixture = "USER-PROMPT-FIXTURE-qqq111";
    const responseFixture = "MODEL-RESPONSE-FIXTURE-zzz999";

    // Success
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: responseFixture }] } }],
          }),
          { status: 200 },
        ),
    ) as typeof fetch;
    await worker.fetch(
      post({
        operation: "freeform-generation",
        messages: [{ role: "user", content: promptFixture }],
      }),
      env,
      {} as ExecutionContext,
    );

    // Failure (no model available)
    globalThis.fetch = vi.fn() as typeof fetch;
    await worker.fetch(
      post({
        operation: "revision",
        messages: [{ role: "user", content: promptFixture }],
      }),
      env,
      {} as ExecutionContext,
    );

    // Structured-output validation failure
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "not json" }] } }],
          }),
          { status: 200 },
        ),
    ) as typeof fetch;
    await worker.fetch(
      post({
        operation: "structured-generation",
        messages: [{ role: "user", content: promptFixture }],
        schema: { type: "object" },
      }),
      env,
      {} as ExecutionContext,
    );

    expect(logs.length).toBeGreaterThanOrEqual(3);
    for (const line of logs) {
      expect(line).not.toContain(promptFixture);
      expect(line).not.toContain(responseFixture);
    }
  });
});
