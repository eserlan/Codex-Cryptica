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

export interface OperationDefaults {
  operation: LlmOperation;
  context: LlmContext;
  defaultModelKey: string;
  fallbackModelKey: string;
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
  maxOutputTokens?: number;
  modelKeyOverride?: string;
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
