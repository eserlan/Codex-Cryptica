import { describe, it, expect } from "vitest";
import {
  buildResolutionLogEntry,
  computeEstimatedCostUsd,
} from "./observability";
import type { LlmModelDefinition } from "./types";
import type { ResolveOutcome } from "./resolver";

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
  pricing: { inputPer1kTokens: 0.5, outputPer1kTokens: 1.5 },
  availability: { public: true, authenticated: true, admin: true },
  enabled: true,
};

describe("computeEstimatedCostUsd", () => {
  it("computes cost from token usage and pricing", () => {
    const cost = computeEstimatedCostUsd(
      { promptTokens: 1000, completionTokens: 500 },
      { inputPer1kTokens: 0.5, outputPer1kTokens: 1.5 },
    );
    expect(cost).toBeCloseTo(0.5 + 0.75);
  });

  it("returns undefined when usage or pricing is missing", () => {
    expect(
      computeEstimatedCostUsd(undefined, {
        inputPer1kTokens: 1,
        outputPer1kTokens: 1,
      }),
    ).toBeUndefined();
    expect(
      computeEstimatedCostUsd(
        { promptTokens: 1, completionTokens: 1 },
        undefined,
      ),
    ).toBeUndefined();
  });
});

describe("buildResolutionLogEntry", () => {
  it("includes usage and estimated cost when available", () => {
    const outcome: ResolveOutcome = {
      result: {
        ok: true,
        response: {
          content: "hi",
          modelKey: "gemini-flash-lite",
          usage: { promptTokens: 1000, completionTokens: 1000 },
        },
      },
      modelKey: "gemini-flash-lite",
      provider: "gemini",
      retryCount: 0,
      outcome: "success",
    };

    const entry = buildResolutionLogEntry({
      outcome,
      operation: "freeform-generation",
      context: "public",
      latencyMs: 42,
      getModel: () => model,
    });

    expect(entry.modelKey).toBe("gemini-flash-lite");
    expect(entry.provider).toBe("gemini");
    expect(entry.outcome).toBe("success");
    expect(entry.usage).toEqual({ promptTokens: 1000, completionTokens: 1000 });
    expect(entry.estimatedCostUsd).toBeCloseTo(0.5 + 1.5);
  });

  it("records intendedModelKey and fallbackReason on fallback", () => {
    const outcome: ResolveOutcome = {
      result: {
        ok: true,
        response: { content: "hi", modelKey: "fallback-model" },
      },
      modelKey: "fallback-model",
      intendedModelKey: "primary-model",
      provider: "gemini",
      retryCount: 0,
      outcome: "fallback",
      fallbackReason: "timeout",
    };

    const entry = buildResolutionLogEntry({
      outcome,
      operation: "freeform-generation",
      context: "public",
      latencyMs: 10,
      getModel: () => model,
    });

    expect(entry.intendedModelKey).toBe("primary-model");
    expect(entry.fallbackReason).toBe("timeout");
  });

  it("never includes a field capable of holding prompt/content text (no content leakage)", () => {
    const fixturePrompt = "SECRET-PROMPT-CONTENT-abc123";
    const fixtureResponse = "SECRET-RESPONSE-CONTENT-xyz789";

    const outcome: ResolveOutcome = {
      result: {
        ok: true,
        response: { content: fixtureResponse, modelKey: "gemini-flash-lite" },
      },
      modelKey: "gemini-flash-lite",
      provider: "gemini",
      retryCount: 0,
      outcome: "success",
    };

    const entry = buildResolutionLogEntry({
      outcome,
      operation: "freeform-generation",
      context: "public",
      latencyMs: 5,
      getModel: () => model,
    });

    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain(fixturePrompt);
    expect(serialized).not.toContain(fixtureResponse);
  });

  it("marks structuredOutputValidationFailed without including the invalid content", () => {
    const outcome: ResolveOutcome = {
      result: {
        ok: false,
        reason: "structured-output-invalid",
        structuredOutputValidationFailed: true,
      },
      intendedModelKey: "gemini-flash-lite",
      retryCount: 1,
      outcome: "failure",
      fallbackReason: "structured-output-invalid",
      structuredOutputValidationFailed: true,
    };

    const entry = buildResolutionLogEntry({
      outcome,
      operation: "structured-generation",
      context: "public",
      latencyMs: 8,
      getModel: () => undefined,
    });

    expect(entry.structuredOutputValidationFailed).toBe(true);
  });

  it("omits provider entirely when no model was ever resolved, rather than fabricating one", () => {
    const outcome: ResolveOutcome = {
      result: { ok: false, reason: "no-model-available" },
      retryCount: 0,
      outcome: "failure",
    };

    const entry = buildResolutionLogEntry({
      outcome,
      operation: "revision",
      context: "public",
      latencyMs: 1,
      getModel: () => undefined,
    });

    expect(entry.provider).toBeUndefined();
    expect("provider" in JSON.parse(JSON.stringify(entry))).toBe(false);
  });
});
