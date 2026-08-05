/**
 * Central model registry. See specs/153-llm-model-registry/contracts/model-registry.md.
 *
 * Provider-specific API model identifiers and pricing live here, and only
 * here — no generator, content service, or adaptor should hardcode a
 * concrete model id (FR-002).
 */

import type {
  LlmContext,
  LlmModelDefinition,
  LlmOperation,
  OperationDefaults,
} from "./types";

export const MODEL_REGISTRY: LlmModelDefinition[] = [
  {
    key: "gemini-flash-lite",
    provider: "gemini",
    // Today's existing hardcoded default (index.ts), now centralized.
    modelId: "gemini-3.5-flash-lite",
    displayName: "Gemini Flash Lite",
    capabilities: {
      structuredOutput: true,
      freeformGeneration: true,
      revision: true,
      longContext: true,
    },
    costTier: "low",
    // Placeholder — set from actual published Gemini pricing before this
    // model is relied on for real cost estimates.
    pricing: { inputPer1kTokens: 0, outputPer1kTokens: 0 },
    availability: { public: true, authenticated: true, admin: true },
    enabled: true,
    defaultParameters: { temperature: 0.85, maxOutputTokens: 4096 },
  },
  {
    key: "luna-fast",
    provider: "openai",
    // Exact API identifier per OpenAI's docs at integration time; verify
    // before relying on this in production (research.md R2).
    modelId: "gpt-5.6-luna",
    displayName: "GPT-5.6 Luna",
    capabilities: {
      structuredOutput: true,
      freeformGeneration: true,
      revision: false,
    },
    costTier: "low",
    // Placeholder — set from actual published OpenAI pricing before this
    // model is relied on for real cost estimates.
    pricing: { inputPer1kTokens: 0, outputPer1kTokens: 0 },
    availability: { public: true, authenticated: true, admin: true },
    enabled: true,
  },
];

export const OPERATION_DEFAULTS: OperationDefaults[] = [
  {
    operation: "structured-generation",
    context: "public",
    defaultModelKey: "gemini-flash-lite",
    fallbackModelKey: "luna-fast",
  },
  {
    operation: "freeform-generation",
    context: "public",
    defaultModelKey: "gemini-flash-lite",
    fallbackModelKey: "luna-fast",
  },
  {
    // Luna as the primary default (not just fallback) for classification —
    // demonstrates SC-003: enabled purely through registry config, no
    // resolver/adaptor/caller changes required.
    operation: "classification",
    context: "public",
    defaultModelKey: "luna-fast",
    fallbackModelKey: "gemini-flash-lite",
  },
  {
    operation: "utility",
    context: "public",
    defaultModelKey: "gemini-flash-lite",
    fallbackModelKey: "gemini-flash-lite",
  },
  // "revision" intentionally has no default yet — no caller uses it this
  // slice (spec Scope §4, out of scope).
];

export function getModel(key: string): LlmModelDefinition | undefined {
  return MODEL_REGISTRY.find((m) => m.key === key);
}

export function getOperationDefaults(
  operation: LlmOperation,
  context: LlmContext,
): OperationDefaults | undefined {
  return OPERATION_DEFAULTS.find(
    (d) => d.operation === operation && d.context === context,
  );
}
