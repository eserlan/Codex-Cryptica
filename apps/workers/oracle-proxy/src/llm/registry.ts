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
      // Describes only the stateless operation-pipeline's "revision"
      // LlmOperation (unused today, no caller/default wired to it). Luna IS
      // used for entity revision via the separate Interactions path
      // (text-generation-revision.service.ts / handleInteraction in
      // index.ts), which never reads this flag — don't take `false` here as
      // "Luna can't do revision."
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
    // Back to Gemini as the primary (2026-08-11). Luna held this from
    // 2026-08-05 on output quality, but its latency is user-visible on the
    // public generator pages — a logged-out visitor watching a spinner — and
    // these are the app's largest prompts (the world generator's brief alone
    // is ~3.5k tokens), where Luna also costs 3.3x more per input token.
    // Luna is now the fallback, so this is a one-line revert if the quality
    // difference turns out to matter more than the wait.
    // reasoningEffort is retained for whenever Luna serves as fallback:
    // entity/NPC/faction drafting is constrained creative generation
    // following an already-detailed prompt (schema, naming rules,
    // banned-name list) — it needs enough depth to honor those constraints
    // coherently, not genuine multi-step reasoning.
    operation: "structured-generation",
    context: "public",
    defaultModelKey: "gemini-flash-lite",
    fallbackModelKey: "luna-fast",
    reasoningEffort: "low",
  },
  {
    // Back to Gemini as the primary (2026-08-11), same reasoning as above.
    // This is the operation the public generators actually use: the client
    // only sends "structured-generation" when it asks for a JSON mime type,
    // which today is the language generator alone.
    // reasoningEffort "low" applies when Luna serves as fallback: creative
    // synthesis and drafting stages are conversational, not deep reasoning.
    operation: "freeform-generation",
    context: "public",
    defaultModelKey: "gemini-flash-lite",
    fallbackModelKey: "luna-fast",
    reasoningEffort: "low",
  },
  {
    // Luna as the primary default (not just fallback) for classification —
    // demonstrates SC-003: enabled purely through registry config, no
    // resolver/adaptor/caller changes required.
    // reasoningEffort "minimal": pure categorization/confidence-scoring
    // against an already-supplied candidate list — no deduction happening.
    operation: "classification",
    context: "public",
    defaultModelKey: "luna-fast",
    fallbackModelKey: "gemini-flash-lite",
    reasoningEffort: "minimal",
  },
  {
    // Luna as the primary default (2026-08-07) — no caller uses this
    // operation today, but keep it consistent with the rest of the registry.
    // reasoningEffort "minimal": no live caller, so this just keeps cost/
    // latency low by default rather than expressing a real workload need.
    operation: "utility",
    context: "public",
    defaultModelKey: "luna-fast",
    fallbackModelKey: "gemini-flash-lite",
    reasoningEffort: "minimal",
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
