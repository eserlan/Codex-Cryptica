/**
 * Model resolver: capability → context-default → fallback selection
 * (FR-004/FR-008), plus the retry-then-fallback policy for structured-output
 * validation failures (FR-010a). Contains no provider-specific call logic —
 * it only ever calls the adaptor function injected for a model's provider
 * (FR-005). Dependencies (registry lookups, adaptor functions) are accepted
 * as constructor parameters for testability (Constitution Principle VIII).
 */

import type {
  LlmAdaptorFn,
  LlmAdaptorResult,
  LlmContext,
  LlmModelDefinition,
  LlmOperation,
  LlmProvider,
  LlmRequest,
  ModelCapabilities,
  OperationDefaults,
} from "./types";

export interface ResolverDeps {
  getModel: (key: string) => LlmModelDefinition | undefined;
  getOperationDefaults: (
    operation: LlmOperation,
    context: LlmContext,
  ) => OperationDefaults | undefined;
  adaptors: Partial<Record<LlmProvider, LlmAdaptorFn>>;
}

export interface ResolveOutcome {
  result: LlmAdaptorResult;
  modelKey?: string;
  intendedModelKey?: string;
  provider?: LlmProvider;
  retryCount: number;
  outcome: "success" | "fallback" | "failure";
  fallbackReason?: string;
  structuredOutputValidationFailed?: boolean;
}

/**
 * classification/utility operations have no dedicated capability flag in
 * the registry schema — they're treated as needing baseline freeform
 * generation, same as any other non-structured, non-revision text task.
 */
function capabilityForOperation(
  operation: LlmOperation,
): keyof ModelCapabilities {
  switch (operation) {
    case "structured-generation":
      return "structuredOutput";
    case "revision":
      return "revision";
    case "freeform-generation":
    case "classification":
    case "utility":
    default:
      return "freeformGeneration";
  }
}

function isViable(
  model: LlmModelDefinition | undefined,
  request: LlmRequest,
  context: LlmContext,
): model is LlmModelDefinition {
  if (!model || !model.enabled) return false;
  if (!model.availability[context]) return false;
  if (!model.capabilities[capabilityForOperation(request.operation)])
    return false;
  // A `schema` implies a structured-output requirement regardless of the
  // operation's own base capability (e.g. a schema-bearing "classification"
  // request still needs a model that can reliably produce structured
  // output) — both adaptors treat any `schema` presence as a structured
  // request, so the resolver must gate on it too.
  if (request.schema && !model.capabilities.structuredOutput) return false;
  return true;
}

export function createResolver(deps: ResolverDeps) {
  async function callModel(
    request: LlmRequest,
    model: LlmModelDefinition,
  ): Promise<LlmAdaptorResult> {
    const adaptor = deps.adaptors[model.provider];
    if (!adaptor) {
      return { ok: false, reason: `no-adaptor-for-provider-${model.provider}` };
    }
    return adaptor(request, model);
  }

  async function tryFallback(
    request: LlmRequest,
    context: LlmContext,
    defaults: OperationDefaults | undefined,
    intendedModelKey: string | undefined,
    reason: string,
    retryCount: number,
    structuredOutputValidationFailed: boolean,
    /**
     * True only when the primary was never actually callable (missing,
     * disabled, or incapable at selection time) — a registry/config gap.
     * False when the primary was called and a provider genuinely failed
     * (timeout, transport error, invalid output). In the false case, if no
     * fallback is viable either, the original failure `reason` is preserved
     * so the caller reports "provider unavailable" (502) rather than
     * masking a real provider failure as "no model configured" (503).
     */
    isCapabilityGap: boolean,
  ): Promise<ResolveOutcome> {
    const fallbackKey = defaults?.fallbackModelKey;
    const fallbackModel =
      fallbackKey && fallbackKey !== intendedModelKey
        ? deps.getModel(fallbackKey)
        : undefined;

    if (!isViable(fallbackModel, request, context)) {
      return {
        result: {
          ok: false,
          reason: isCapabilityGap ? "no-model-available" : reason,
        },
        intendedModelKey,
        retryCount,
        outcome: "failure",
        fallbackReason: reason,
        structuredOutputValidationFailed,
      };
    }

    const fallbackResult = await callModel(request, fallbackModel);
    if (fallbackResult.ok) {
      return {
        result: fallbackResult,
        modelKey: fallbackModel.key,
        intendedModelKey,
        provider: fallbackModel.provider,
        retryCount,
        outcome: "fallback",
        fallbackReason: reason,
      };
    }

    return {
      result: fallbackResult,
      intendedModelKey,
      retryCount,
      outcome: "failure",
      fallbackReason: reason,
      structuredOutputValidationFailed:
        fallbackResult.ok === false
          ? fallbackResult.structuredOutputValidationFailed
          : undefined,
    };
  }

  async function resolve(
    request: LlmRequest,
    context: LlmContext,
  ): Promise<ResolveOutcome> {
    const defaults = deps.getOperationDefaults(request.operation, context);

    let primaryKey: string | undefined;
    if (request.modelKeyOverride) {
      const overrideModel = deps.getModel(request.modelKeyOverride);
      if (isViable(overrideModel, request, context)) {
        primaryKey = request.modelKeyOverride;
      }
    }
    if (!primaryKey) {
      primaryKey = defaults?.defaultModelKey;
    }

    const primaryModel = primaryKey ? deps.getModel(primaryKey) : undefined;

    if (!isViable(primaryModel, request, context)) {
      if (!primaryKey) {
        // No override, and no configured default for this operation/context
        // at all (e.g. "revision" this slice, or an unwired context).
        return {
          result: { ok: false, reason: "no-model-available" },
          retryCount: 0,
          outcome: "failure",
        };
      }
      return tryFallback(
        request,
        context,
        defaults,
        primaryKey,
        "primary-unavailable-or-incapable",
        0,
        false,
        true,
      );
    }

    let result = await callModel(request, primaryModel);
    let retryCount = 0;

    if (!result.ok && result.structuredOutputValidationFailed) {
      result = await callModel(request, primaryModel);
      retryCount = 1;
    }

    if (result.ok) {
      return {
        result,
        modelKey: primaryModel.key,
        provider: primaryModel.provider,
        retryCount,
        outcome: "success",
      };
    }

    return tryFallback(
      request,
      context,
      defaults,
      primaryModel.key,
      result.reason,
      retryCount,
      !!result.structuredOutputValidationFailed,
      false,
    );
  }

  return { resolve };
}
