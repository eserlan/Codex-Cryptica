/**
 * Shared types for the LLM model registry / resolver / provider-adaptor
 * pipeline. See specs/153-llm-model-registry/data-model.md for the design.
 */

export type LlmOperation =
  | "structured-generation"
  | "freeform-generation"
  | "revision"
  | "classification"
  | "utility";

export type LlmProvider = "gemini" | "openai";

export type LlmContext = "public" | "authenticated" | "admin";

export interface ModelCapabilities {
  structuredOutput: boolean;
  freeformGeneration: boolean;
  revision: boolean;
  vision?: boolean;
  longContext?: boolean;
}

export interface ModelPricing {
  inputPer1kTokens: number;
  outputPer1kTokens: number;
}

export interface ModelAvailability {
  public: boolean;
  authenticated: boolean;
  admin: boolean;
}

export interface LlmModelDefinition {
  key: string;
  provider: LlmProvider;
  modelId: string;
  displayName: string;
  capabilities: ModelCapabilities;
  costTier: "low" | "medium" | "high";
  pricing: ModelPricing;
  availability: ModelAvailability;
  enabled: boolean;
  defaultParameters?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

export type ReasoningEffort = "minimal" | "low" | "medium" | "high";

export interface OperationDefaults {
  operation: LlmOperation;
  context: LlmContext;
  defaultModelKey: string;
  fallbackModelKey: string;
  /**
   * How much internal reasoning an OpenAI-family reasoning model (e.g. Luna)
   * should spend before responding. Only meaningful for reasoning-tier
   * models; adaptors for providers without the concept (Gemini) ignore it.
   * Operation-level, not model-level: the same model serves multiple
   * operations that warrant different depths (e.g. classification needs far
   * less deliberation than structured generation).
   */
  reasoningEffort?: ReasoningEffort;
}

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  operation: LlmOperation;
  messages: LlmMessage[];
  schema?: Record<string, unknown>;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  modelKeyOverride?: string;
  /** Caller-supplied override; the resolver fills this from the resolved
   * operation's default when the caller doesn't set one. */
  reasoningEffort?: ReasoningEffort;
}

export interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface LlmResponse {
  content: string | Record<string, unknown>;
  modelKey: string;
  usage?: LlmUsage;
  structuredOutputValid?: boolean;
}

/**
 * Result of a single provider-adaptor call attempt. Adaptors report
 * unavailability (timeout, transport error, structured-output validation
 * failure) as `{ ok: false }` rather than throwing, so the resolver can
 * treat every failure mode uniformly for retry/fallback purposes.
 */
export type LlmAdaptorResult =
  | { ok: true; response: LlmResponse }
  | { ok: false; reason: string; structuredOutputValidationFailed?: boolean };

export type LlmAdaptorFn = (
  request: LlmRequest,
  model: LlmModelDefinition,
) => Promise<LlmAdaptorResult>;

/**
 * Provider-neutral streaming event contract (#2423). A streaming adaptor
 * yields `started` once the upstream connection is live, zero or more
 * `delta` chunks as text arrives, then exactly one of `complete`/`error`.
 * Unlike `LlmAdaptorResult`, there is no retry/fallback around a stream —
 * once `delta` events have gone out, the caller has already shown partial
 * output, so retrying transparently isn't possible. Callers that need a
 * retry-on-invalid-output policy (e.g. structured-generation) must do so at
 * a higher level, by discarding the stream and starting a fresh attempt.
 */
export type GenerationEvent =
  | { type: "started" }
  | { type: "delta"; text: string }
  | { type: "complete"; text: string; usage?: LlmUsage }
  | { type: "error"; error: string };

export type LlmStreamingAdaptorFn = (
  request: LlmRequest,
  model: LlmModelDefinition,
  signal?: AbortSignal,
) => AsyncGenerator<GenerationEvent>;

/**
 * Non-content record of one request's handling. MUST NEVER hold prompt or
 * generated-content text — enforced by construction: no such field exists
 * on this type (FR-012/SC-006).
 */
export interface ResolutionLogEntry {
  modelKey: string;
  intendedModelKey?: string;
  // Absent when no model was ever resolved (e.g. no configured default for
  // the operation/context) — there is no real provider to attribute in
  // that case, and defaulting to one would fabricate observability data.
  provider?: LlmProvider;
  operation: LlmOperation;
  context: LlmContext;
  latencyMs: number;
  outcome: "success" | "fallback" | "failure";
  usage?: LlmUsage;
  estimatedCostUsd?: number;
  retryCount: number;
  fallbackReason?: string;
  structuredOutputValidationFailed?: boolean;
}
