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
  operation: LlmOperation,
  context: LlmContext,
): model is LlmModelDefinition {
  if (!model || !model.enabled) return false;
  if (!model.availability[context]) return false;
  return !!model.capabilities[capabilityForOperation(operation)];
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
  ): Promise<ResolveOutcome> {
    const fallbackKey = defaults?.fallbackModelKey;
    const fallbackModel =
      fallbackKey && fallbackKey !== intendedModelKey
        ? deps.getModel(fallbackKey)
        : undefined;

    if (!isViable(fallbackModel, request.operation, context)) {
      return {
        result: { ok: false, reason: "no-model-available" },
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
      if (isViable(overrideModel, request.operation, context)) {
        primaryKey = request.modelKeyOverride;
      }
    }
    if (!primaryKey) {
      primaryKey = defaults?.defaultModelKey;
    }

    const primaryModel = primaryKey ? deps.getModel(primaryKey) : undefined;

    if (!isViable(primaryModel, request.operation, context)) {
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
    );
  }

  return { resolve };
}
