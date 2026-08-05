import { describe, it, expect, vi } from "vitest";
import { createResolver } from "./resolver";
import type {
  LlmModelDefinition,
  LlmRequest,
  OperationDefaults,
} from "./types";

function makeModel(
  overrides: Partial<LlmModelDefinition> = {},
): LlmModelDefinition {
  return {
    key: "model-a",
    provider: "gemini",
    modelId: "model-a-id",
    displayName: "Model A",
    capabilities: {
      structuredOutput: true,
      freeformGeneration: true,
      revision: false,
    },
    costTier: "low",
    pricing: { inputPer1kTokens: 0, outputPer1kTokens: 0 },
    availability: { public: true, authenticated: true, admin: true },
    enabled: true,
    ...overrides,
  };
}

const baseRequest: LlmRequest = {
  operation: "freeform-generation",
  messages: [{ role: "user", content: "hi" }],
};

describe("resolver: capability-required selection", () => {
  it("does not select a model lacking the required capability", async () => {
    const incapable = makeModel({
      key: "no-structured",
      capabilities: {
        structuredOutput: false,
        freeformGeneration: true,
        revision: false,
      },
    });
    const capable = makeModel({ key: "structured-ok" });
    const models: Record<string, LlmModelDefinition> = {
      "no-structured": incapable,
      "structured-ok": capable,
    };
    const defaults: OperationDefaults = {
      operation: "structured-generation",
      context: "public",
      defaultModelKey: "no-structured",
      fallbackModelKey: "structured-ok",
    };
    const adaptorCall = vi.fn(async (_req, model: LlmModelDefinition) => ({
      ok: true as const,
      response: { content: "ok", modelKey: model.key },
    }));

    const resolver = createResolver({
      getModel: (k) => models[k],
      getOperationDefaults: () => defaults,
      adaptors: { gemini: adaptorCall },
    });

    const outcome = await resolver.resolve(
      { ...baseRequest, operation: "structured-generation" },
      "public",
    );

    expect(outcome.outcome).toBe("fallback");
    expect(outcome.modelKey).toBe("structured-ok");
  });
});

describe("resolver: context-default selection", () => {
  it("selects the configured default when no override is given", async () => {
    const model = makeModel();
    const defaults: OperationDefaults = {
      operation: "freeform-generation",
      context: "public",
      defaultModelKey: "model-a",
      fallbackModelKey: "model-a",
    };
    const adaptorCall = vi.fn(async (_req, m: LlmModelDefinition) => ({
      ok: true as const,
      response: { content: "ok", modelKey: m.key },
    }));

    const resolver = createResolver({
      getModel: (k) => (k === "model-a" ? model : undefined),
      getOperationDefaults: () => defaults,
      adaptors: { gemini: adaptorCall },
    });

    const outcome = await resolver.resolve(baseRequest, "public");
    expect(outcome.outcome).toBe("success");
    expect(outcome.modelKey).toBe("model-a");
  });
});

describe("resolver: explicit override with fallthrough", () => {
  it("uses the override when viable", async () => {
    const override = makeModel({ key: "override-model" });
    const fallbackDefault = makeModel({ key: "default-model" });
    const models: Record<string, LlmModelDefinition> = {
      "override-model": override,
      "default-model": fallbackDefault,
    };
    const defaults: OperationDefaults = {
      operation: "freeform-generation",
      context: "public",
      defaultModelKey: "default-model",
      fallbackModelKey: "default-model",
    };
    const adaptorCall = vi.fn(async (_req, m: LlmModelDefinition) => ({
      ok: true as const,
      response: { content: "ok", modelKey: m.key },
    }));

    const resolver = createResolver({
      getModel: (k) => models[k],
      getOperationDefaults: () => defaults,
      adaptors: { gemini: adaptorCall },
    });

    const outcome = await resolver.resolve(
      { ...baseRequest, modelKeyOverride: "override-model" },
      "public",
    );
    expect(outcome.modelKey).toBe("override-model");
  });

  it("falls through to defaults when the override is unavailable/unknown", async () => {
    const fallbackDefault = makeModel({ key: "default-model" });
    const models: Record<string, LlmModelDefinition> = {
      "default-model": fallbackDefault,
    };
    const defaults: OperationDefaults = {
      operation: "freeform-generation",
      context: "public",
      defaultModelKey: "default-model",
      fallbackModelKey: "default-model",
    };
    const adaptorCall = vi.fn(async (_req, m: LlmModelDefinition) => ({
      ok: true as const,
      response: { content: "ok", modelKey: m.key },
    }));

    const resolver = createResolver({
      getModel: (k) => models[k],
      getOperationDefaults: () => defaults,
      adaptors: { gemini: adaptorCall },
    });

    const outcome = await resolver.resolve(
      { ...baseRequest, modelKeyOverride: "unknown-model" },
      "public",
    );
    expect(outcome.modelKey).toBe("default-model");
  });
});

describe("resolver: retry-once-then-fallback on structured-output validation failure", () => {
  it("retries the same model once, then falls back on a second failure", async () => {
    const primary = makeModel({ key: "primary" });
    const fallback = makeModel({ key: "fallback" });
    const models: Record<string, LlmModelDefinition> = { primary, fallback };
    const defaults: OperationDefaults = {
      operation: "structured-generation",
      context: "public",
      defaultModelKey: "primary",
      fallbackModelKey: "fallback",
    };
    const adaptorCall = vi.fn(async (_req, m: LlmModelDefinition) => {
      if (m.key === "primary") {
        return {
          ok: false as const,
          reason: "structured-output-invalid",
          structuredOutputValidationFailed: true,
        };
      }
      return {
        ok: true as const,
        response: { content: "ok", modelKey: m.key },
      };
    });

    const resolver = createResolver({
      getModel: (k) => models[k],
      getOperationDefaults: () => defaults,
      adaptors: { gemini: adaptorCall },
    });

    const outcome = await resolver.resolve(
      { ...baseRequest, operation: "structured-generation" },
      "public",
    );

    expect(outcome.retryCount).toBe(1);
    expect(outcome.outcome).toBe("fallback");
    expect(outcome.modelKey).toBe("fallback");
    // Called primary twice (initial + retry), then fallback once.
    expect(adaptorCall).toHaveBeenCalledTimes(3);
  });

  it("succeeds on the retry without falling back", async () => {
    const primary = makeModel({ key: "primary" });
    let calls = 0;
    const adaptorCall = vi.fn(async (_req, m: LlmModelDefinition) => {
      calls++;
      if (calls === 1) {
        return {
          ok: false as const,
          reason: "structured-output-invalid",
          structuredOutputValidationFailed: true,
        };
      }
      return {
        ok: true as const,
        response: { content: "ok", modelKey: m.key },
      };
    });

    const resolver = createResolver({
      getModel: () => primary,
      getOperationDefaults: () => ({
        operation: "structured-generation",
        context: "public",
        defaultModelKey: "primary",
        fallbackModelKey: "primary",
      }),
      adaptors: { gemini: adaptorCall },
    });

    const outcome = await resolver.resolve(
      { ...baseRequest, operation: "structured-generation" },
      "public",
    );
    expect(outcome.retryCount).toBe(1);
    expect(outcome.outcome).toBe("success");
    expect(adaptorCall).toHaveBeenCalledTimes(2);
  });
});

describe("resolver: timeout treated as unavailable", () => {
  it("falls back when the adaptor reports a timeout", async () => {
    const primary = makeModel({ key: "primary" });
    const fallback = makeModel({ key: "fallback" });
    const models: Record<string, LlmModelDefinition> = { primary, fallback };
    const adaptorCall = vi.fn(async (_req, m: LlmModelDefinition) => {
      if (m.key === "primary") return { ok: false as const, reason: "timeout" };
      return {
        ok: true as const,
        response: { content: "ok", modelKey: m.key },
      };
    });

    const resolver = createResolver({
      getModel: (k) => models[k],
      getOperationDefaults: () => ({
        operation: "freeform-generation",
        context: "public",
        defaultModelKey: "primary",
        fallbackModelKey: "fallback",
      }),
      adaptors: { gemini: adaptorCall },
    });

    const outcome = await resolver.resolve(baseRequest, "public");
    expect(outcome.outcome).toBe("fallback");
    expect(outcome.fallbackReason).toBe("timeout");
  });
});

describe("resolver: no model available", () => {
  it("returns a failure outcome when no default is configured for the operation/context", async () => {
    const resolver = createResolver({
      getModel: () => undefined,
      getOperationDefaults: () => undefined,
      adaptors: {},
    });

    const outcome = await resolver.resolve(
      { ...baseRequest, operation: "revision" },
      "public",
    );
    expect(outcome.outcome).toBe("failure");
    expect(outcome.result.ok).toBe(false);
    if (!outcome.result.ok) {
      expect(outcome.result.reason).toBe("no-model-available");
    }
  });

  it("returns a failure outcome when primary and fallback both fail", async () => {
    const primary = makeModel({ key: "primary" });
    const fallback = makeModel({ key: "fallback" });
    const models: Record<string, LlmModelDefinition> = { primary, fallback };
    const adaptorCall = vi.fn(async () => ({
      ok: false as const,
      reason: "transport-error",
    }));

    const resolver = createResolver({
      getModel: (k) => models[k],
      getOperationDefaults: () => ({
        operation: "freeform-generation",
        context: "public",
        defaultModelKey: "primary",
        fallbackModelKey: "fallback",
      }),
      adaptors: { gemini: adaptorCall },
    });

    const outcome = await resolver.resolve(baseRequest, "public");
    expect(outcome.outcome).toBe("failure");
  });
});
