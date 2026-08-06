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
    // $0.30 / 1M input tokens, $2.50 / 1M output tokens (standard paid tier).
    pricing: { inputPer1kTokens: 0.0003, outputPer1kTokens: 0.0025 },
    availability: { public: true, authenticated: true, admin: true },
    enabled: true,
    defaultParameters: { temperature: 0.85, maxOutputTokens: 4096 },
  },
  {
    key: "luna-fast",
    provider: "openai",
    // Confirmed against OpenAI's docs — do not use the "gpt-5.6" alias,
    // which routes to a different model (Sol) in the same family.
    modelId: "gpt-5.6-luna",
    displayName: "GPT-5.6 Luna",
    capabilities: {
      structuredOutput: true,
      freeformGeneration: true,
      revision: false,
    },
    costTier: "low",
    // $1 / 1M input tokens, $6 / 1M output tokens (standard short-context rate).
    pricing: { inputPer1kTokens: 0.001, outputPer1kTokens: 0.006 },
    availability: { public: true, authenticated: true, admin: true },
    enabled: true,
  },
];

export const OPERATION_DEFAULTS: OperationDefaults[] = [
  {
    // Luna as the primary default for structured-generation (2026-08-05,
    // verified live against real app traffic) — deliberate choice, not a
    // leftover from testing. Gemini is the fallback.
    operation: "structured-generation",
    context: "public",
    defaultModelKey: "luna-fast",
    fallbackModelKey: "gemini-flash-lite",
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
