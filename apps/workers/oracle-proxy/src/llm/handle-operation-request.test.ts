import { describe, it, expect, vi, afterEach } from "vitest";
import {
  handleLlmOperationRequest,
  isLlmOperationRequest,
} from "./handle-operation-request";

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
