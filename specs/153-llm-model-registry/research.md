# Research: LLM Model Registry & Provider Resolver (oracle-proxy)

## R1: How does the new provider-neutral request coexist with the existing request shapes?

**Decision**: Dispatch on a new `operation` field at the top level of the JSON body, checked before the existing `body.input` (Interactions API) and default (`generateContent`) branches in `apps/workers/oracle-proxy/src/index.ts`'s root POST handler. If `operation` is present and is one of the five known operation types, route through `llm/resolver.ts`. Otherwise, fall through to the existing two branches completely unchanged.

**Rationale**: `index.ts`'s root handler already dispatches on body shape rather than URL path (`body.input !== undefined` → Interactions API; otherwise → `generateContent` forwarding, confirmed at `src/index.ts` lines ~526–650). Neither existing shape has an `operation` field, so this is a non-colliding, additive discriminator that requires zero changes to existing callers (`packages/ai-engine/src/client-manager.ts`), satisfying FR-007 (no client migration) without needing a new URL route.

**Alternatives considered**:

- New dedicated path (e.g. `/api/llm`): rejected as unnecessary — the file already dispatches on body shape at the root, and a new path would still need the same "leave old paths alone" guarantee, adding routing surface for no benefit.
- Content-negotiation via a header: rejected — adds a second signal to keep in sync with the body-shape convention already used here; a body field is simpler and consistent with existing style.

## R2: How does the OpenAI-compatible adaptor need to shape requests/responses, and does it cover Luna?

**Decision**: The OpenAI-compatible adaptor targets the standard `POST https://api.openai.com/v1/chat/completions`-style contract (`messages: [{role, content}]`, `response_format: {type: "json_schema", json_schema: {...}}` for structured output, `temperature`, `max_tokens`), normalizing the response's `choices[0].message.content` (plus `usage.prompt_tokens`/`completion_tokens`) into the shared `LlmResponse` shape. Luna is registered as an ordinary entry in this adaptor's provider (`provider: "openai"`, with its own `modelId` — e.g. `"gpt-5.6-luna"` or whatever exact API identifier OpenAI documents at integration time) with `capabilities.structuredOutput = true` if/when verified against the live API during implementation.

**Rationale**: The issue and spec both describe Luna as reachable "through the existing OpenAI model/provider integration" — i.e., one adaptor handles all OpenAI-family models, Luna included, differentiated only by `modelId` in its registry entry (FR-002, FR-006). This avoids a Luna-specific code path entirely; the adaptor is provider-specific, not model-specific, matching FR-005.

**Alternatives considered**:

- A separate Luna-specific adaptor: rejected — violates FR-005 (adaptors are per-provider, not per-model) and FR-002 (model identifiers belong in registry config, not adaptor code).
- Assuming Luna's exact structured-output support without verification: flagged as an implementation-time task (part of FR-006's acceptance test in Story 3) rather than a planning-time assumption — the registry entry's `structuredOutput` flag must be set based on actual verified behavior, not guessed.

## R3: How is the existing Gemini forwarding logic extracted into an adaptor without behavior drift?

**Decision**: Lift the existing snake_case field-mapping logic (`generation_config`, `system_instruction`, `speech_config`, safety settings — `src/index.ts` lines ~552–637) into `llm/adaptors/gemini-adaptor.ts` as-is, parameterized by the resolved model's `modelId` instead of the inline `body.model || "gemini-3.5-flash-lite"` default. The pre-existing `/` route handling (both the Interactions branch and the direct `generateContent` branch) keeps calling this logic exactly as it does today — i.e., the extraction is a refactor of _where_ the code lives, not a change to _what_ it does, so `index.test.ts`'s existing 23 tests keep passing unmodified.

**Rationale**: FR-005 requires provider adaptors to exist and to be the only place that knows a provider's wire format; the current Gemini logic already is that wire-format-translation code, just inline in `index.ts`. Moving it (not rewriting it) is the lowest-risk way to satisfy FR-005 while guaranteeing FR-007 (existing callers unaffected).

**Alternatives considered**:

- Writing a new, cleaner Gemini adaptor from scratch: rejected — reimplementing already-battle-tested field-mapping (with its documented edge cases like the `speech_config` empty-object 400 error) risks regressions the existing tests don't fully cover from a black-box perspective; a mechanical extraction is safer.

## R4: How is the retry-then-fallback policy (Q1, Q5 from clarification) implemented within a single Worker invocation?

**Decision**: `resolver.ts` owns a `resolve(request) → {model, attempt}` loop with a hard cap: (1) resolve primary model, call its adaptor; (2) on structured-output validation failure, call the _same_ adaptor/model exactly once more; (3) on a second failure (validation, timeout at 15s, or transport error), re-resolve against the fallback model and call once (no further retries on the fallback). This bounds every request to at most 3 upstream provider calls (primary + one same-model retry + one fallback call), keeping latency predictable within the Workers CPU/wall-time budget.

**Rationale**: Directly implements the clarified FR-010a (retry-then-fallback) and FR-008 (fallback on unavailability) without open-ended retry loops, which the spec explicitly disallows conflating with "silently run a second model to improve a result" (FR-009) — this retry is _error recovery_, not quality improvement, and is capped and logged (FR-012).

**Alternatives considered**:

- Exponential backoff with multiple retries: rejected as unnecessary complexity (YAGNI) for a proxy layer where the caller (generator/content service) already has its own retry/timeout handling; one bounded retry plus one fallback attempt is enough to smooth over transient glitches without risking cascading latency.

## R5: How is cost estimation (Q5: static per-model price table) represented and computed?

**Decision**: Each `Model Registry Entry` carries a `pricing: { inputPer1kTokens: number; outputPer1kTokens: number }` (USD) field. `observability.ts` computes `estimatedCostUsd = (promptTokens/1000) * pricing.inputPer1kTokens + (completionTokens/1000) * pricing.outputPer1kTokens` whenever the adaptor's normalized response includes token counts, and omits the cost field entirely when token counts aren't available (rather than guessing).

**Rationale**: Matches the clarified answer (static registry-configured rate × token usage) and keeps the registry entry format directly reusable for the `Key Entities` design in the spec (FR-001, FR-011).

**Alternatives considered**: See spec Clarifications — Option B (provider-reported cost only) was rejected by the user because not all providers return cost data, which would make estimation inconsistent across providers.

## R6: Where do secrets (`OPENAI_API_KEY` or similar) live?

**Decision**: A new Worker secret, `OPENAI_API_KEY`, set via `wrangler secret put` (mirroring the existing `GEMINI_API_KEY` pattern in `wrangler.toml`'s comments), read only inside `llm/adaptors/openai-adaptor.ts`. No change to the request/response contract exposed to clients — this is purely a Worker-side `env` binding addition, consistent with FR-003 (no provider credentials ever reach the client).

**Rationale**: Directly mirrors the existing `GEMINI_API_KEY` secret pattern already documented in `wrangler.toml` and `DEPLOYMENT.md`; no new secrets-management mechanism needed.

**Alternatives considered**: None material — this is the Worker's established convention.

## Summary

All "NEEDS CLARIFICATION" items from the Technical Context are resolved above. No unknowns remain blocking Phase 1 design.
