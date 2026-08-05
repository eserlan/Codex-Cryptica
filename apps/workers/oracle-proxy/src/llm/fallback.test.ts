import { describe, it, expect, vi, afterEach } from "vitest";
import { createResolver } from "./resolver";
import { getModel, getOperationDefaults, MODEL_REGISTRY } from "./registry";
import worker from "../index";
import type { LlmRequest } from "./types";

const baseRequest: LlmRequest = {
  operation: "freeform-generation",
  messages: [{ role: "user", content: "hi" }],
};

describe("US4 — predictable fallback against real registry data", () => {
  it("Scenario 1: disabling the primary model causes the resolver to select the configured fallback and still succeed", async () => {
    const primaryKey = getOperationDefaults(
      "freeform-generation",
      "public",
    )!.defaultModelKey;
    const primaryEntry = MODEL_REGISTRY.find((m) => m.key === primaryKey)!;
    const originalEnabled = primaryEntry.enabled;
    primaryEntry.enabled = false;

    try {
      const adaptorCall = vi.fn(async (_req: LlmRequest, model) => ({
        ok: true as const,
        response: { content: "ok", modelKey: model.key },
      }));
      const resolver = createResolver({
        getModel,
        getOperationDefaults,
        adaptors: { gemini: adaptorCall, openai: adaptorCall },
      });

      const outcome = await resolver.resolve(baseRequest, "public");
      expect(outcome.outcome).toBe("fallback");
      expect(outcome.result.ok).toBe(true);
      expect(outcome.modelKey).not.toBe(primaryKey);
    } finally {
      primaryEntry.enabled = originalEnabled;
    }
  });

  it("Scenario 2: a capability mismatch on the resolved model is never routed there, and instead resolves to a capability-satisfying model or a clear error", async () => {
    // revision has no capability-satisfying registry entry wired to a
    // default this slice, so it must resolve to the clear no-model error
    // rather than routing to a model that doesn't declare `revision`.
    const adaptorCall = vi.fn();
    const resolver = createResolver({
      getModel,
      getOperationDefaults,
      adaptors: { gemini: adaptorCall, openai: adaptorCall },
    });

    const outcome = await resolver.resolve(
      { ...baseRequest, operation: "revision" },
      "public",
    );
    expect(outcome.outcome).toBe("failure");
    expect(adaptorCall).not.toHaveBeenCalled();
  });
});

describe("US4 — fallback and failure are observable end-to-end", () => {
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

  it("Scenario 3: a fallback occurrence produces a ResolutionLogEntry recording intendedModelKey, modelKey, and fallbackReason", async () => {
    const primaryEntry = MODEL_REGISTRY.find(
      (m) => m.key === "gemini-flash-lite",
    )!;
    const originalEnabled = primaryEntry.enabled;
    primaryEntry.enabled = false;

    const logs: string[] = [];
    console.log = (msg: string) => logs.push(msg);

    try {
      globalThis.fetch = vi.fn(
        async () =>
          new Response(
            JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
            {
              status: 200,
            },
          ),
      ) as typeof fetch;

      const response = await worker.fetch(
        post({
          operation: "freeform-generation",
          messages: [{ role: "user", content: "hi" }],
        }),
        env,
        {} as ExecutionContext,
      );
      expect(response.status).toBe(200);

      const logEntry = JSON.parse(logs[logs.length - 1]);
      expect(logEntry.outcome).toBe("fallback");
      expect(logEntry.intendedModelKey).toBe("gemini-flash-lite");
      expect(logEntry.modelKey).toBe("luna-fast");
      expect(logEntry.fallbackReason).toBeTruthy();
    } finally {
      primaryEntry.enabled = originalEnabled;
    }
  });

  it("Scenario 4: no model available (primary or fallback) returns the documented LLM_NO_MODEL_AVAILABLE 503 shape, never a raw provider error", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await worker.fetch(
      post({
        operation: "revision",
        messages: [{ role: "user", content: "hi" }],
      }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("LLM_NO_MODEL_AVAILABLE");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("T030a: operation 'revision' resolves through the no-configured-default path, not an unhandled exception", async () => {
    globalThis.fetch = vi.fn() as typeof fetch;

    const response = await worker.fetch(
      post({
        operation: "revision",
        messages: [{ role: "user", content: "improve this paragraph" }],
      }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("LLM_NO_MODEL_AVAILABLE");
  });

  it("reports LLM_PROVIDER_UNAVAILABLE (502), not LLM_NO_MODEL_AVAILABLE (503), when a real primary and fallback both genuinely fail", async () => {
    // Both gemini-flash-lite and luna-fast are configured and viable for
    // freeform-generation — they just both fail at the transport level.
    // This must not be reported as "no model configured".
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as typeof fetch;

    const response = await worker.fetch(
      post({
        operation: "freeform-generation",
        messages: [{ role: "user", content: "hi" }],
      }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error.code).toBe("LLM_PROVIDER_UNAVAILABLE");
  });
});
