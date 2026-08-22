/**
 * Observability: builds the metadata-only `ResolutionLogEntry` for a
 * resolved request and computes estimated cost from registry pricing.
 * The type itself has no field capable of holding prompt/content text
 * (FR-012) — this module only ever assembles fields already defined on
 * `ResolutionLogEntry`, so it structurally cannot leak content.
 */

import type {
  LlmContext,
  LlmModelDefinition,
  LlmOperation,
  LlmUsage,
  ResolutionLogEntry,
} from "./types";
import type { ResolveOutcome } from "./resolver";

export function computeEstimatedCostUsd(
  usage: LlmUsage | undefined,
  pricing: LlmModelDefinition["pricing"] | undefined,
): number | undefined {
  if (!usage || !pricing) return undefined;
  return (
    (usage.promptTokens / 1000) * pricing.inputPer1kTokens +
    (usage.completionTokens / 1000) * pricing.outputPer1kTokens
  );
}

export function buildResolutionLogEntry(params: {
  outcome: ResolveOutcome;
  operation: LlmOperation;
  context: LlmContext;
  latencyMs: number;
  getModel: (key: string) => LlmModelDefinition | undefined;
}): ResolutionLogEntry {
  const { outcome, operation, context, latencyMs, getModel } = params;

  const servedModel = outcome.modelKey ? getModel(outcome.modelKey) : undefined;
  const usage = outcome.result.ok ? outcome.result.response.usage : undefined;

  const entry: ResolutionLogEntry = {
    modelKey: outcome.modelKey ?? outcome.intendedModelKey ?? "unresolved",
    operation,
    context,
    latencyMs,
    outcome: outcome.outcome,
    retryCount: outcome.retryCount,
  };

  // Only attribute a provider when a model was actually resolved — a total
  // failure (e.g. no configured default for this operation/context) never
  // touched a provider, so the field is omitted rather than guessed.
  if (servedModel) {
    entry.provider = servedModel.provider;
  }

  if (
    outcome.intendedModelKey &&
    outcome.intendedModelKey !== outcome.modelKey
  ) {
    entry.intendedModelKey = outcome.intendedModelKey;
  }
  if (outcome.fallbackReason) {
    entry.fallbackReason = outcome.fallbackReason;
  }
  if (outcome.structuredOutputValidationFailed) {
    entry.structuredOutputValidationFailed = true;
  }
  if (usage) {
    entry.usage = usage;
    const cost = computeEstimatedCostUsd(usage, servedModel?.pricing);
    if (cost !== undefined) {
      entry.estimatedCostUsd = cost;
    }
  }

  return entry;
}
