# Feature Specification: LLM Model Registry & Provider Resolver (oracle-proxy)

**Feature Branch**: `153-llm-model-registry`
**Created**: 2026-08-05
**Status**: Draft
**Input**: User description: "Add a central LLM model registry and provider-adaptor/resolver layer to the existing oracle-proxy Cloudflare Worker, and add GPT-5.6 Luna as a supported model. This is the backend-plumbing slice of GitHub issue #2049 — the follow-up slice (user-facing tier selector, persistence, admin UI) is intentionally out of scope and will be a separate spec."

## Clarifications

### Session 2026-08-05

- Q: On a structured-output validation failure, does the resolver retry the same model once before falling back to a different model, or fall back immediately? → A: Retry the same model once on validation failure, then fall back to a different model if it fails again.
- Q: What provider call timeout threshold triggers "provider unreachable" fallback treatment? → A: 15 seconds.
- Q: How does the Worker determine "public vs. authenticated" context for resolution? → A: Initially assumed "reuse an existing auth signal," but no such signal exists today (generation requests carry no Authorization header or identity of any kind). Revised during planning: this slice treats every request as "public" context; real authenticated-context detection is deferred to a follow-up issue and the later UI/tier-selector slice.
- Q: Is rate limiting/throttling in scope for this slice? → A: Out of scope — existing Worker-level protections (if any) are unchanged; not addressed by this feature.
- Q: Where does "estimated cost" for observability logging come from? → A: Static per-model price table in the registry; Worker computes cost = tokens × configured rate.

## User Scenarios & Testing _(mandatory)_

<!--
  This feature has no end-user-facing UI. Its "users" are the systems and
  engineers that call the oracle-proxy Worker (generators, content services)
  and the operators who run it. User stories are framed accordingly.
-->

### User Story 1 - Existing callers keep working unmodified (Priority: P1)

Today, every generator and content workflow calls the oracle-proxy Worker and gets a response from Gemini, with the model name passed through or defaulted inline in the Worker. After this change ships, none of those existing callers should need to change anything: their requests keep being served, by the same effective model, with the same response shape, purely because the Worker now routes through a registry/resolver internally instead of hardcoding the provider call.

**Why this priority**: This is the safety constraint the whole feature depends on. If shipping the registry breaks any existing generator or content-revision call, the feature has failed regardless of how well the new capabilities work.

**Independent Test**: Deploy the Worker with the new registry/resolver in place but make no client-side changes. Replay the existing set of oracle-proxy request shapes (as used by generators today) and confirm responses are unchanged in shape and status code, and that latency stays within normal bounds.

**Acceptance Scenarios**:

1. **Given** a generator sends the same request shape it sends today (no new fields), **When** the Worker processes it, **Then** the response is served by the currently-configured default model and matches today's response shape exactly.
2. **Given** the Worker is redeployed with the registry/resolver enabled, **When** no configuration changes are made, **Then** the effective model and behavior for all existing call sites is identical to before the deploy.

---

### User Story 2 - A caller requests generation via a provider-neutral operation request and gets routed to the right model (Priority: P1)

An internal caller (a generator or content service) sends one provider-neutral request to the Worker, declaring what kind of operation it is (structured generation, freeform generation, revision, classification, or utility) instead of a concrete provider/model name. The Worker's resolver picks an appropriate model based on that operation, the request's capability needs, and the configured defaults, then calls the right provider adaptor and returns a normalized response. The caller never sees or needs to know provider-specific identifiers, URLs, or credentials.

Note: although both this story and Story 1 are P1, this story's routing branch is built on top of the request-dispatch branch Story 1 introduces (both stories remain independently _testable_ per their Acceptance Scenarios; only the build order is sequential — see tasks.md Dependencies).

**Why this priority**: This is the core value of the feature — it's what "removes hard-coded model selection" and is the foundation every later slice (UI tier selector, revision wiring, admin config) builds on.

**Independent Test**: Send a request with an explicit `operation` and no model override to a test/staging deployment; verify the resolver selects a model with the required capability, the correct provider adaptor is invoked, and the returned response is in the common normalized shape regardless of which provider served it.

**Acceptance Scenarios**:

1. **Given** a request declares `operation: "structured-generation"` and a JSON schema, **When** the resolver selects a model, **Then** it only selects a model whose registry entry declares `structuredOutput: true`.
2. **Given** a request declares an operation with no explicit model override, **When** the resolver runs, **Then** it selects the configured default model for that operation/context (public vs. authenticated) from the registry.
3. **Given** two requests are served by two different providers (e.g., one by Gemini, one by an OpenAI-compatible provider), **When** their responses come back, **Then** both are shaped identically from the caller's perspective (same normalized response fields).
4. **Given** a request includes a provider-specific detail (API key, provider URL, provider model ID), **When** it is sent from a browser/client, **Then** the request is rejected or the detail is ignored — the client is never able to supply or observe provider-specific identifiers or credentials in the request or response.

---

### User Story 3 - GPT-5.6 Luna is available as a low-cost model through the shared pipeline (Priority: P2)

An engineer configures Luna in the model registry (provider, API model identifier, capabilities, cost tier) and it becomes selectable through the resolver like any other model — usable as a configured default or explicit override for operations whose capability requirements it satisfies.

**Why this priority**: This is the concrete, named deliverable from issue #2049 that motivated the whole effort, but it depends on Stories 1 and 2 existing first (the registry and resolver must exist before Luna can be "added" to them in a meaningful way).

**Independent Test**: Add a Luna entry to the registry, point a test operation's default at it, send a request, and verify the response was produced by Luna (verifiable via the observability/logging from Story 5) and matches the normalized response shape.

**Acceptance Scenarios**:

1. **Given** Luna is registered with `structuredOutput: true`, **When** a structured-generation request is routed to it, **Then** the Worker successfully returns valid structured output produced by Luna.
2. **Given** Luna's registry entry is disabled (`enabled: false`), **When** the resolver evaluates candidates, **Then** Luna is never selected, even if it would otherwise be the configured default.

---

### User Story 4 - An unavailable or under-capable model falls back predictably (Priority: P2)

If the model the resolver would normally pick is disabled, misconfigured, or lacks a capability the operation requires, the Worker falls back to a configured fallback model instead of failing the request outright or silently guessing, and this fallback is recorded so it can be noticed and investigated.

**Why this priority**: Without predictable fallback, a single misconfiguration (e.g., disabling a model, a provider outage) turns into user-facing failures across every caller that depended on it. This is what makes the registry safe to operate.

**Independent Test**: Disable the model that a given operation/context would normally resolve to, send a request for that operation, and confirm the request still succeeds via the configured fallback, with a log entry recording that a fallback occurred and why.

**Acceptance Scenarios**:

1. **Given** the primary model for an operation is disabled, **When** a request for that operation arrives, **Then** the resolver selects the configured fallback model instead and the request succeeds.
2. **Given** a request requires a capability (e.g., structured output) that the resolved model does not declare, **When** the resolver evaluates it, **Then** it does not route to that model and instead selects a model (primary or fallback) that does declare the capability, or fails with a clear error if none is configured.
3. **Given** a fallback occurs, **When** the request completes, **Then** a log entry exists recording the originally-intended model, the fallback model actually used, and the reason.
4. **Given** no model — primary or fallback — supports a required capability for an operation, **When** the request arrives, **Then** the Worker returns a clear, provider-neutral error rather than silently degrading behavior or exposing a provider-specific error.

---

### User Story 5 - An operator can see which models are actually being used (Priority: P3)

An operator (engineer/maintainer) can look at logs to see, for real traffic, which model and provider served each operation, whether it was public or authenticated, how long it took, roughly what it cost, and whether the request had to retry, fail, or fall back — without any prompt or generated content appearing in those logs.

**Why this priority**: This is what makes the registry/resolver actually useful for the stated follow-up goal ("run a blind comparison to decide where Luna should become the default") and for catching problems in production, but the pipeline is functional without it, so it's lower priority than correctness and safety.

**Independent Test**: Send a mix of requests (some succeeding normally, some triggering fallback, some with structured-output validation failures) and confirm each produces a log entry with the required metadata fields and no prompt/content text.

**Acceptance Scenarios**:

1. **Given** any request is processed, **When** it completes (success or failure), **Then** a log entry is recorded containing at minimum: selected model key, provider, operation type, public-vs-authenticated context, latency, and outcome (success/fallback/failure).
2. **Given** token usage or cost data is available from the provider response, **When** the log entry is written, **Then** it includes token usage and an estimated cost where available.
3. **Given** a structured-output response fails schema validation, **When** the log entry is written, **Then** it records the validation failure without including the invalid content itself.
4. **Given** any log entry is written, **When** it is inspected, **Then** it contains no prompt text or generated content.

---

### Edge Cases

- What happens when the registry has zero enabled models available for a required operation/capability combination in a given context (public vs. authenticated)? → The Worker MUST fail the request with a clear, provider-neutral error rather than silently picking an unsuitable model or hanging.
- What happens when a provider call times out (no response within 15 seconds) or the provider is unreachable? → Treated the same as "model unavailable" for resolver purposes: fall back per Story 4 if a fallback is configured, otherwise return a clear provider-neutral error; the failure and any retry must be observable per Story 5.
- What happens when a client explicitly requests a specific model key that exists in the registry but is disabled, or that doesn't exist at all? → Treated as "requested model unavailable": resolver falls back per Story 4's rules rather than blindly honoring an unavailable/unknown key.
- What happens when a provider returns a malformed or non-JSON response for a structured-generation request? → Treated as a structured-output validation failure (Story 5): the same model is retried once; if the retry also fails validation, the request is routed through the same fallback path as a capability mismatch, not surfaced as a raw provider error to the caller.
- What happens to requests already in flight or using the old inline request shape at the moment this ships? → Covered by Story 1: they must continue to work unchanged, since this slice does not require any client migration.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Worker MUST provide a single, central model registry defining, per model: an internal model key, provider, provider-specific API model identifier, display name, capability flags (structured output, freeform generation, revision, vision, long context), a relative cost tier, a static per-token (or per-1K-token) price rate used to compute estimated cost, an enabled/disabled state, availability flags for public / authenticated / admin contexts, and default request parameters.
- **FR-002**: The model registry MUST be the single place where provider-specific API model identifiers are defined; no generator, content-service, or other calling code may embed a concrete provider model identifier.
- **FR-003**: The Worker MUST accept a provider-neutral operation request shape (operation type — one of `structured-generation`, `freeform-generation`, `revision`, `classification`, `utility` — messages, optional schema, and optional temperature/max-output-token overrides) and MUST NOT require or accept provider-specific fields (provider URLs, provider credentials, provider-specific model identifiers) from the client. No client-identity or authentication signal is forwarded to the Worker as part of this slice; every request MUST be resolved in the "public" context. Real authenticated-vs-public detection is out of scope for this slice (tracked as a follow-up).
- **FR-004**: The Worker MUST include a model resolver, separate from provider communication code, that selects a model for a given request by evaluating, in order: (1) an explicit capability requirement from the operation/request, (2) the caller's context (public vs. authenticated) default, (3) a configured fallback.
- **FR-005**: The Worker MUST include provider adaptors — starting with the existing Gemini integration and a new OpenAI-compatible integration — each responsible only for translating the common request into that provider's call format and normalizing that provider's response into the common response shape. Adaptors MUST NOT contain model-selection/resolution logic, and the resolver MUST NOT contain provider-specific call logic.
- **FR-006**: The registry MUST support adding GPT-5.6 Luna as a selectable model via the OpenAI-compatible provider adaptor, configured like any other model (capabilities, cost tier, availability, enabled state).
- **FR-007**: The Worker MUST continue to serve all existing (pre-this-feature) request shapes with unchanged behavior and response shape, requiring no client-side changes, once the registry/resolver is deployed.
- **FR-008**: When the resolver's first-choice model is disabled, unavailable, or does not satisfy a required capability, the Worker MUST route the request to a configured fallback model instead of failing immediately or silently choosing an unsuitable model.
- **FR-009**: The Worker MUST NOT automatically invoke a second model to "improve," re-run, or double-check a first model's result as part of normal request handling.
- **FR-010**: When no model — primary or fallback — in the registry satisfies a request's required capability and availability context, the Worker MUST return a clear, provider-neutral error rather than exposing a raw provider error or degrading silently.
- **FR-010a**: On a structured-output validation failure, the Worker MUST retry the same model exactly once before treating it as a fallback trigger; if the retry also fails validation, the request MUST be routed through the same fallback path as a capability mismatch (FR-008).
- **FR-011**: For every processed request, the Worker MUST record a log entry containing at least: selected model key, provider, operation type, public-vs-authenticated context, latency, and outcome (success, fallback, or failure). When token usage is available, the Worker MUST compute and include an estimated cost as token usage × the resolved model's configured price rate (FR-001), rather than relying on providers to report cost directly.
- **FR-012**: Log entries MUST record retries, structured-output validation failures, and fallback occurrences (including which model was originally intended vs. actually used, and why), and MUST NOT contain prompt text or generated content.
- **FR-013**: The normalized response returned to callers MUST be shaped identically regardless of which provider actually served the request.
- **FR-014**: This feature MUST NOT introduce Cloudflare AI Gateway, a separate Worker/service for LLM routing, any client-facing model-selection UI, user preference persistence, an admin configuration UI, or new rate-limiting/throttling mechanisms — those remain explicitly out of scope for this slice. Existing Worker-level rate limiting or abuse protections, if any, are left unchanged.

### Key Entities _(include if feature involves data)_

- **Model Registry Entry**: Represents one configured LLM the Worker can route to. Attributes: internal model key, provider, provider-specific API model identifier, display name, capability flags (structured output, freeform generation, revision, vision, long context), relative cost tier, static per-token price rate (for cost estimation), enabled/disabled state, availability (public / authenticated / admin), default parameters (e.g. temperature, max output tokens).
- **LLM Request**: The provider-neutral request a caller sends to the Worker. Attributes: operation type, messages, optional JSON schema (for structured generation), optional temperature/max-output-token overrides, optional explicit model key override, caller context (public vs. authenticated).
- **LLM Response**: The provider-neutral response returned to the caller, normalized regardless of provider. Attributes: generated content/message(s), the model key that actually served the request, token usage (when available), and any structured-output validation status.
- **Resolution/Observability Log Entry**: A non-content record of one request's handling. Attributes: model key selected, provider, operation type, context (public/authenticated), latency, outcome (success/fallback/failure), token usage and estimated cost (when available), retry count, fallback details (intended vs. actual model, reason), structured-output validation failure flag.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of existing generator and content-service calls to the Worker continue to succeed with unchanged response shape after this feature ships, with no client-side code changes required.
- **SC-002**: A new operation-based request (using the provider-neutral shape) can be routed end-to-end — through the resolver and a provider adaptor — to a working model in under one engineering day of integration effort for a new caller, with zero provider-specific code written outside the adaptor layer.
- **SC-003**: GPT-5.6 Luna can be enabled as the default model for at least one operation type purely through registry configuration, with no code changes to any generator, content service, or provider adaptor.
- **SC-004**: When a configured model is disabled or a provider is unreachable (no response within 15 seconds), 100% of affected requests are either served via a configured fallback or fail with a clear, provider-neutral error — never with a raw provider error or a silent hang — and every such fallback/failure is observable in logs.
- **SC-005**: For a full day of representative traffic, an operator can determine, from logs alone (no prompt/content data), which models and providers handled which share of requests, by operation type and public/authenticated context, along with latency and estimated cost.
- **SC-006**: Zero prompt text or generated content appears in observability logs across a full day of representative traffic.
