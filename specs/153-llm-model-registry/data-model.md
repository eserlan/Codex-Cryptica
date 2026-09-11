# Data Model: LLM Model Registry & Provider Resolver (oracle-proxy)

All types below live in `apps/workers/oracle-proxy/src/llm/types.ts` unless noted. This is Worker-internal, in-memory/config data — no database, no persistence (per spec: registry is static config; user selections are out of scope for this slice).

## Operation

```ts
type LlmOperation =
  | "structured-generation"
  | "freeform-generation"
  | "revision"
  | "classification"
  | "utility";
```

Enumerates the five request kinds the shared pipeline supports (spec FR-003). `"revision"` is defined here for completeness but has no caller yet in this slice (wiring generators/content-revision to the shared pipeline is explicitly out of scope — spec, Scope §4).

## ModelCapabilities

```ts
interface ModelCapabilities {
  structuredOutput: boolean;
  freeformGeneration: boolean;
  revision: boolean;
  vision?: boolean;
  longContext?: boolean;
}
```

Validation rule: a model MUST NOT be selected for an operation whose corresponding capability flag is `false`/absent (resolver enforcement, FR-004/FR-008).

## ModelPricing

```ts
interface ModelPricing {
  inputPer1kTokens: number; // USD
  outputPer1kTokens: number; // USD
}
```

Static, per research.md R5. Used only for `estimatedCostUsd` computation in observability logging (FR-011); never sent to or received from the client.

## ModelAvailability

```ts
interface ModelAvailability {
  public: boolean;
  authenticated: boolean;
  admin: boolean;
}
```

This slice always resolves in `"public"` context (spec Clarifications, #2050 deferred), so only `public` is exercised by the resolver today; `authenticated`/`admin` are modeled now so the registry format doesn't need a breaking change when #2050 lands.

## LlmModelDefinition (Model Registry Entry)

```ts
interface LlmModelDefinition {
  key: string; // internal model key, e.g. "gemini-flash-lite", "luna-fast"
  provider: "gemini" | "openai";
  modelId: string; // provider-specific API model identifier
  displayName: string;
  capabilities: ModelCapabilities;
  costTier: "low" | "medium" | "high"; // relative, for human-facing summaries later
  pricing: ModelPricing;
  availability: ModelAvailability;
  enabled: boolean;
  defaultParameters?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}
```

**Identity/uniqueness**: `key` MUST be unique across the registry (enforced by a registry-load-time check/test — duplicate keys are a configuration error, not a runtime resolver decision).

**Lifecycle**: No runtime state transitions — entries are redeployed via code change (`enabled`/`availability`/`pricing` are edited in source and shipped through the Worker's normal deploy, not toggled live). This keeps the registry auditable via git history, consistent with "no persistence" (spec FR-014 boundary).

## Registry configuration (per operation/context)

```ts
interface OperationDefaults {
  operation: LlmOperation;
  context: "public" | "authenticated" | "admin";
  defaultModelKey: string;
  fallbackModelKey: string;
}
```

A small static list (e.g. `[{operation: "structured-generation", context: "public", defaultModelKey: "gemini-flash-lite", fallbackModelKey: "luna-fast"}, ...]`) consumed by `resolver.ts`. This is the "configured public/authenticated default" and "configured fallback" referenced by FR-004/FR-008.

## LlmRequest

```ts
interface LlmRequest {
  operation: LlmOperation;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  schema?: Record<string, unknown>; // JSON Schema, required capability: structuredOutput
  temperature?: number;
  maxOutputTokens?: number;
  modelKeyOverride?: string; // optional explicit override; still subject to capability/enabled checks
}
```

Provider-neutral (FR-003). No credential, provider-URL, or provider-model-ID field exists on this type by construction — there is nowhere for a client to put one.

## LlmResponse

```ts
interface LlmResponse {
  content: string; // or structured object when schema was supplied and validated
  modelKey: string; // which registry entry actually served the request
  usage?: { promptTokens: number; completionTokens: number };
  structuredOutputValid?: boolean; // present only for structured-generation requests
}
```

Shaped identically regardless of provider (FR-013) — adaptors are responsible for normalizing into this shape.

## ResolutionLogEntry (Observability)

```ts
interface ResolutionLogEntry {
  modelKey: string; // model that actually served the request
  intendedModelKey?: string; // present only when different from modelKey (fallback occurred)
  provider: "gemini" | "openai";
  operation: LlmOperation;
  context: "public" | "authenticated" | "admin"; // always "public" this slice, see #2050
  latencyMs: number;
  outcome: "success" | "fallback" | "failure";
  usage?: { promptTokens: number; completionTokens: number };
  estimatedCostUsd?: number;
  retryCount: number; // 0, 1 (same-model retry), or reflects fallback attempt
  fallbackReason?: string;
  structuredOutputValidationFailed?: boolean;
}
```

**Invariant** (FR-012): this type MUST NEVER contain `messages`/`content`/prompt or generated text. Enforced by construction — no such field exists on the type, and a unit test asserts the JSON-serialized log entry never contains substrings from a test prompt/response fixture.

## Relationships

- `LlmRequest.operation` + resolved `context` → looked up in `OperationDefaults` → yields `defaultModelKey`/`fallbackModelKey`.
- `LlmRequest.modelKeyOverride` (if present) is tried first, subject to the same capability/enabled checks as the default; on failure, resolution proceeds exactly as if no override were given (falls through to `OperationDefaults`).
- `LlmModelDefinition.provider` selects which adaptor (`gemini-adaptor.ts` / `openai-adaptor.ts`) handles the call.
- Every resolved request produces exactly one `ResolutionLogEntry`, regardless of outcome (including the "no model available" failure case, FR-010).
