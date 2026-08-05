# Contract: Model Registry (internal — not client-facing)

`apps/workers/oracle-proxy/src/llm/registry.ts` exports a static array of `LlmModelDefinition` (see `data-model.md`) plus a lookup API consumed only by `resolver.ts` and tests — this is not exposed over HTTP.

```ts
export const MODEL_REGISTRY: LlmModelDefinition[] = [
  {
    key: "gemini-flash-lite",
    provider: "gemini",
    modelId: "gemini-3.5-flash-lite", // today's existing hardcoded default, now centralized
    displayName: "Gemini Flash Lite",
    capabilities: {
      structuredOutput: true,
      freeformGeneration: true,
      revision: true,
      longContext: true,
    },
    costTier: "low",
    pricing: { inputPer1kTokens: 0, outputPer1kTokens: 0 }, // filled from actual published pricing at implementation time
    availability: { public: true, authenticated: true, admin: true },
    enabled: true,
    defaultParameters: { temperature: 0.85, maxOutputTokens: 4096 },
  },
  {
    key: "luna-fast",
    provider: "openai",
    modelId: "gpt-5.6-luna", // exact API identifier confirmed at implementation time (research.md R2)
    displayName: "GPT-5.6 Luna",
    capabilities: {
      structuredOutput: true,
      freeformGeneration: true,
      revision: false,
    },
    costTier: "low",
    pricing: { inputPer1kTokens: 0, outputPer1kTokens: 0 }, // filled from actual published pricing
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
    operation: "classification",
    context: "public",
    defaultModelKey: "luna-fast",
    fallbackModelKey: "gemini-flash-lite",
  },
  {
    operation: "utility",
    context: "public",
    defaultModelKey: "luna-fast",
    fallbackModelKey: "gemini-flash-lite",
  },
  // "revision" intentionally has no default yet — no caller uses it this slice (spec Scope §4 out of scope).
];

export function getModel(key: string): LlmModelDefinition | undefined;
export function getOperationDefaults(
  operation: LlmOperation,
  context: "public" | "authenticated" | "admin",
): OperationDefaults | undefined;
```

## Constraints validated by tests (`registry.test.ts`)

1. Every `key` in `MODEL_REGISTRY` is unique.
2. Every `defaultModelKey`/`fallbackModelKey` in `OPERATION_DEFAULTS` resolves to an entry in `MODEL_REGISTRY` (no dangling references).
3. Every `OPERATION_DEFAULTS` entry's `defaultModelKey` and `fallbackModelKey` point to models whose `capabilities` satisfy that operation (e.g. `structured-generation` defaults MUST point only at `structuredOutput: true` models) — a config-time guarantee that backs FR-004/FR-008's runtime behavior.
4. `luna-fast`'s registry entry is exactly the vehicle for spec Story 3 — enabling/disabling it and pointing an `OPERATION_DEFAULTS` entry at it MUST NOT require touching `resolver.ts`, any adaptor, or any caller (SC-003).
