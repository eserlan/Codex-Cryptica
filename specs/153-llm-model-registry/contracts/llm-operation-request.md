# Contract: LLM Operation Request (oracle-proxy)

This describes the new provider-neutral request/response contract accepted by `apps/workers/oracle-proxy`'s existing POST endpoint (root path), additive alongside its two existing body shapes (Interactions API via `body.input`, and direct `generateContent` — both unchanged, see `research.md` R1).

## Discriminator

A request is routed through the new resolver/registry pipeline if and only if the JSON body has a top-level `operation` field matching one of the five known operation types. Requests without `operation` are handled exactly as they are today (no behavior change — FR-007).

## Request

```jsonc
POST / (oracle-proxy)
Content-Type: application/json

{
  "operation": "structured-generation", // | "freeform-generation" | "revision" | "classification" | "utility"
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "schema": { /* optional JSON Schema object. Enables JSON mode + response validation
                 on any operation, not just "structured-generation". A "structured-generation"
                 request with no schema still gets provider-native JSON mode (schema-less) —
                 the response is parsed as JSON but not validated against anything. */ },
  "temperature": 0.85,          // optional
  "maxOutputTokens": 4096,      // optional
  "modelKeyOverride": "luna-fast" // optional; still subject to capability/availability checks
}
```

**Rejected fields** (400 if present — never accepted from a client, per FR-003): `apiKey`, `provider`, `providerUrl`, `modelId`, or any field that would let a caller name a concrete provider-specific model identifier or credential directly. Only `modelKeyOverride` (an internal registry key, not a provider model ID) is accepted.

## Response — success

```jsonc
HTTP 200
Content-Type: application/json

{
  "content": "...",                 // string, or parsed structured object when schema was supplied
  "modelKey": "gemini-flash-lite",  // registry key that actually served the request
  "usage": { "promptTokens": 812, "completionTokens": 340 }, // when available
  "structuredOutputValid": true     // present only when the request wanted structured output
                                     // (operation "structured-generation", or any operation with a schema)
}
```

Identical shape regardless of which provider served the request (FR-013). No `provider`, `modelId`, or any provider-specific field appears in the response.

## Response — no model available (FR-010)

```jsonc
HTTP 503
Content-Type: application/json

{
  "error": {
    "code": "LLM_NO_MODEL_AVAILABLE",
    "message": "No enabled model satisfies the requested operation/capability in this context."
  }
}
```

## Response — provider/transport failure after retry+fallback exhausted

```jsonc
HTTP 502
Content-Type: application/json

{
  "error": {
    "code": "LLM_PROVIDER_UNAVAILABLE",
    "message": "The request could not be completed after retry and fallback."
  }
}
```

No raw provider error body, status text, or provider identifier is ever forwarded to the client (FR-010).

## Behavioral notes (traceable to spec acceptance scenarios)

- **Story 2, Scenario 1**: a `structured-generation` request without `schema` is accepted — the resolver still requires a `structuredOutput`-capable model, and the adaptor uses the provider's schema-less JSON mode (Gemini's `response_mime_type: "application/json"`, OpenAI's `response_format: { type: "json_object" }`) rather than rejecting the request.
- **Story 2, Scenario 4**: any of the rejected fields above present in the body → 400, request never reaches a provider.
- **Story 4, Scenario 1–2**: on primary-model unavailability/capability mismatch, the response is still a 200 from the fallback model — the caller cannot distinguish "primary succeeded" from "fallback succeeded" from the response body alone (that distinction lives only in the server-side `ResolutionLogEntry`, not in the client-visible response, since exposing it isn't required by any FR and keeps the response contract minimal).
- **Edge case — timeout**: a provider call exceeding 15s is treated as unavailable for that attempt (research.md R4); the client only ever sees the final 200/502/503 outcome, never a raw timeout error.
