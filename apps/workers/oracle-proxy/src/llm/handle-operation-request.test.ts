import { describe, it, expect, vi, afterEach } from "vitest";
import {
  handleLlmOperationRequest,
  isLlmOperationRequest,
  handleLlmOperationStreamRequest,
  isLlmOperationStreamRequest,
} from "./handle-operation-request";

/** Reads every SSE `data:` line off a streamed Response body. */
async function readSseEvents(response: Response): Promise<unknown[]> {
  const text = await response.text();
  return text
    .split("\n\n")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.startsWith("data:"))
    .map((chunk) => JSON.parse(chunk.slice("data:".length).trim()));
}

function sseUpstream(chunks: unknown[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
        );
      }
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

const env = { GEMINI_API_KEY: "test-key", OPENAI_API_KEY: "test-openai-key" };
const corsHeaders = { "Access-Control-Allow-Origin": "*" };
const originalFetch = globalThis.fetch;
const originalConsoleLog = console.log;

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.log = originalConsoleLog;
});

function captureLogs() {
  const logs: string[] = [];
  console.log = (msg: string) => logs.push(msg);
  return logs;
}

describe("handleLlmOperationRequest", () => {
  it("isLlmOperationRequest identifies supported operations", () => {
    expect(isLlmOperationRequest({ operation: "freeform-generation" })).toBe(
      true,
    );
    expect(isLlmOperationRequest({ operation: "unknown-op" })).toBe(false);
    expect(isLlmOperationRequest(null)).toBe(false);
  });

  it("uses the injected `now` clock function to compute latencyMs in log entries", async () => {
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

    let callCount = 0;
    const mockNow = vi.fn(() => {
      callCount++;
      return callCount === 1 ? 100 : 250;
    });

    const response = await handleLlmOperationRequest(
      {
        operation: "freeform-generation",
        messages: [{ role: "user", content: "hi" }],
      },
      corsHeaders,
      env,
      mockNow,
    );

    expect(response.status).toBe(200);
    expect(mockNow).toHaveBeenCalledTimes(2);
    expect(logs.length).toBeGreaterThan(0);

    const logEntry = JSON.parse(logs[logs.length - 1]);
    expect(logEntry.latencyMs).toBe(150);
  });

  it("defaults to Date.now when `now` is omitted", async () => {
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

    const response = await handleLlmOperationRequest(
      {
        operation: "freeform-generation",
        messages: [{ role: "user", content: "hi" }],
      },
      corsHeaders,
      env,
    );

    expect(response.status).toBe(200);
    expect(logs.length).toBeGreaterThan(0);

    const logEntry = JSON.parse(logs[logs.length - 1]);
    expect(typeof logEntry.latencyMs).toBe("number");
    expect(logEntry.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe("handleLlmOperationStreamRequest", () => {
  it("isLlmOperationStreamRequest requires both a supported operation and stream:true", () => {
    expect(
      isLlmOperationStreamRequest({
        operation: "freeform-generation",
        stream: true,
      }),
    ).toBe(true);
    expect(
      isLlmOperationStreamRequest({ operation: "freeform-generation" }),
    ).toBe(false);
    expect(
      isLlmOperationStreamRequest({ operation: "unknown-op", stream: true }),
    ).toBe(false);
  });

  it("streams started/delta/complete SSE events from the resolved primary model (Luna/OpenAI)", async () => {
    globalThis.fetch = vi.fn(async () =>
      sseUpstream([
        { choices: [{ delta: { content: "Hello" } }] },
        { choices: [{ delta: { content: ", world" } }] },
      ]),
    ) as typeof fetch;

    const response = await handleLlmOperationStreamRequest(
      {
        operation: "freeform-generation",
        messages: [{ role: "user", content: "hi" }],
        stream: true,
      },
      corsHeaders,
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");

    const events = await readSseEvents(response);
    expect(events[0]).toEqual({ type: "started" });
    expect(events.slice(1, -1)).toEqual([
      { type: "delta", text: "Hello" },
      { type: "delta", text: ", world" },
    ]);
    expect(events.at(-1)).toEqual({
      type: "complete",
      text: "Hello, world",
      usage: undefined,
    });
  });

  it("returns a plain JSON 400 for an invalid body, same as the buffered handler", async () => {
    const response = await handleLlmOperationStreamRequest(
      { operation: "freeform-generation", stream: true },
      corsHeaders,
      env,
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("returns a plain JSON 503 when no default model is configured for the operation", async () => {
    const response = await handleLlmOperationStreamRequest(
      {
        operation: "revision",
        messages: [{ role: "user", content: "hi" }],
        stream: true,
      },
      corsHeaders,
      env,
    );
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error.code).toBe("LLM_NO_MODEL_AVAILABLE");
  });

  it("emits a single error SSE event when the upstream call fails mid-stream, without throwing", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("", { status: 500 }),
    ) as typeof fetch;

    const response = await handleLlmOperationStreamRequest(
      {
        operation: "freeform-generation",
        messages: [{ role: "user", content: "hi" }],
        stream: true,
      },
      corsHeaders,
      env,
    );

    expect(response.status).toBe(200);
    const events = await readSseEvents(response);
    expect(events).toEqual([{ type: "error", error: "upstream-status-500" }]);
  });
});
