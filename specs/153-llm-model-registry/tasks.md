# Tasks: LLM Model Registry & Provider Resolver (oracle-proxy)

**Input**: Design documents from `/specs/153-llm-model-registry/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The project constitution (Principle II, TDD) requires unit tests for all new logic regardless of whether the spec explicitly requests them, and the constitution's Constitution Check gate in plan.md commits to this.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- All file paths are relative to the repository root

## Path Conventions

Single Cloudflare Worker: `apps/workers/oracle-proxy/src/`, new code under `apps/workers/oracle-proxy/src/llm/` (see plan.md Project Structure).

---

## Phase 1: Setup

**Purpose**: Establish the shared type vocabulary every other task depends on.

- [x] T001 Create `apps/workers/oracle-proxy/src/llm/types.ts` defining `LlmOperation`, `ModelCapabilities`, `ModelPricing`, `ModelAvailability`, `LlmModelDefinition`, `OperationDefaults`, `LlmRequest`, `LlmResponse`, and `ResolutionLogEntry` exactly per `data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core registry, resolver, adaptor-extraction, and observability infrastructure that every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Extract the existing Gemini `generateContent` forwarding logic (field-mapping for `generation_config`, `system_instruction`, `speech_config`, safety settings — `apps/workers/oracle-proxy/src/index.ts` lines ~552–637) into `apps/workers/oracle-proxy/src/llm/adaptors/gemini-adaptor.ts` as a `callGemini(request: LlmRequest, model: LlmModelDefinition, env: Env, fetcher?: typeof fetch): Promise<LlmResponse>` function, per research.md R3 — a mechanical move, not a rewrite. Accept `fetcher` as an injectable dependency (default `fetch`), mirroring `client-manager.ts`'s pattern, so it's mockable in tests. This adaptor owns enforcing the 15-second provider-call timeout itself (via `AbortController`) and reports a timeout as a normal "unavailable" outcome to its caller — the resolver never talks to providers directly (FR-005).
- [x] T003 [P] Create `apps/workers/oracle-proxy/src/llm/adaptors/gemini-adaptor.test.ts` verifying field-mapping parity (snake_case config mapping, `system_instruction` formatting, `speech_config` voice mapping, safety settings passthrough) matches the pre-extraction behavior covered by `index.test.ts`, plus a test that a call exceeding 15s is reported as an "unavailable" outcome rather than an unhandled rejection
- [x] T004 Update `apps/workers/oracle-proxy/src/index.ts`'s two existing branches (Interactions API via `body.input`, and direct `generateContent`) to call `gemini-adaptor.ts`'s `callGemini` instead of their inline fetch logic — no behavior change. Run `apps/workers/oracle-proxy/src/index.test.ts` (existing 23 tests) and confirm all pass unchanged after the extraction; fix any drift before proceeding (depends on: T002)
- [x] T006 [P] Create `apps/workers/oracle-proxy/src/llm/registry.ts` with `MODEL_REGISTRY` (initially one entry, `gemini-flash-lite`, mapped from today's hardcoded `"gemini-3.5-flash-lite"` default), `OPERATION_DEFAULTS` (all operations defaulting to `gemini-flash-lite` with itself as fallback), and `getModel()` / `getOperationDefaults()` lookups, per `contracts/model-registry.md` (depends on: T001)
- [x] T007 [P] Create `apps/workers/oracle-proxy/src/llm/registry.test.ts` covering the config-time invariants from `contracts/model-registry.md`: unique `key`s, no dangling `defaultModelKey`/`fallbackModelKey` references, and every `OPERATION_DEFAULTS` entry pointing only at capability-satisfying models (depends on: T006)
- [x] T008 Create `apps/workers/oracle-proxy/src/llm/resolver.ts` implementing the capability → context-default → fallback selection algorithm (FR-004/FR-008) and the retry-then-fallback policy for structured-output validation failures (FR-010a, research.md R4: same-model retry once, then fallback) by calling the injected adaptor function up to twice per resolution — the resolver itself never calls `fetch`/a provider directly (FR-005); it treats whatever "unavailable" outcome an adaptor reports (including the adaptor-owned 15s timeout from T002/T019) as a fallback trigger. Accept the registry and adaptor functions as constructor/parameter dependencies for testability (depends on: T001, T006)
- [x] T009 [P] Create `apps/workers/oracle-proxy/src/llm/resolver.test.ts` covering: capability-required selection, context-default selection (against mocked registry data), explicit override with fallthrough to defaults on failure, retry-once-then-fallback on structured-output validation failure, timeout-treated-as-unavailable, and the "no model available" error path (FR-010) (depends on: T008)
- [x] T010 Create `apps/workers/oracle-proxy/src/llm/observability.ts` implementing `ResolutionLogEntry` construction and `estimatedCostUsd` computation (`tokens × registry pricing rate`, research.md R5); the type MUST have no field capable of holding prompt/content text (FR-012) (depends on: T001, T006)
- [x] T011 [P] Create `apps/workers/oracle-proxy/src/llm/observability.test.ts`, including a test that serializes a log entry built from a fixture prompt/response and asserts none of the fixture's content substrings appear in the output (depends on: T010)

**Checkpoint**: Registry, resolver, and observability logic are unit-tested in isolation; the existing Gemini path is extracted into an adaptor with zero regressions. User story work can begin.

---

## Phase 3: User Story 1 - Existing callers keep working unmodified (Priority: P1) 🎯 MVP (part 1/2)

**Goal**: Requests without the new `operation` field are routed exactly as they are today, with zero client-visible change.

**Independent Test**: Deploy with the registry/resolver present but make no client changes; replay today's existing request shapes and confirm identical responses.

### Implementation for User Story 1

- [x] T012 [US1] Add the `operation`-field discriminator to `apps/workers/oracle-proxy/src/index.ts`'s root POST handler (research.md R1): when `body.operation` is absent, fall through to the existing two branches completely unchanged; when present, defer to a stub that will be completed in User Story 2 (depends on: T004)
- [x] T013 [P] [US1] Add regression tests to `apps/workers/oracle-proxy/src/index.test.ts` asserting requests without `operation` — both the `body.input` (Interactions) shape and the plain `contents` (`generateContent`) shape — produce identical status codes and response shapes to pre-feature behavior (depends on: T012)
- [x] T014 [P] [US1] Add a regression test to `apps/workers/oracle-proxy/src/index.test.ts` replaying the full pre-existing request-shape matrix end-to-end (Story 1 Acceptance Scenario 2) to confirm no client-visible change after the registry/resolver deploy (depends on: T012)

**Checkpoint**: Safe to deploy — existing callers are fully unaffected, even before User Story 2's pipeline goes live.

---

## Phase 4: User Story 2 - Provider-neutral operation routing (Priority: P1) 🎯 MVP (part 2/2)

**Goal**: A caller sends one provider-neutral operation request and gets routed, through the resolver and the correct provider adaptor, to a normalized response — without ever seeing provider-specific details.

**Independent Test**: Send a request with an explicit `operation` and no model override; verify capability-respecting selection, correct adaptor invocation, and a normalized response shape regardless of provider.

### Implementation for User Story 2

- [x] T015 [US2] Wire the `operation`-present branch in `apps/workers/oracle-proxy/src/index.ts` (stubbed in T012) to call `resolver.ts` → the resolved adaptor → `observability.ts` for logging, returning the normalized response per `contracts/llm-operation-request.md`. Emit the resulting `ResolutionLogEntry` with `console.log(JSON.stringify(entry))` so it's captured by Cloudflare Workers Logs/`wrangler tail` — this is the **only** thing ever logged for a request; never `console.log` the raw request body, `messages`, or response `content` anywhere in this branch (FR-012/SC-006 — metadata only, e.g. operation type, model key, latency, outcome; never the user's actual input or the model's output). The `context` passed into `resolver.ts` is hardcoded to `"public"` for every request in this slice (FR-003) — do not add any header/token inspection or other caller-identity detection here; real authenticated-context detection is deferred to #2050 (depends on: T008, T010, T012)
- [x] T016 [P] [US2] Create `apps/workers/oracle-proxy/src/llm/request-validation.ts`: reject request bodies containing `apiKey`, `provider`, `providerUrl`, or `modelId` with HTTP 400, and require `schema` when `operation === "structured-generation"` (depends on: T001)
- [x] T017 [P] [US2] Create `apps/workers/oracle-proxy/src/llm/request-validation.test.ts` covering the field-rejection rules and the required-schema rule (depends on: T016)
- [x] T018 [US2] Wire `request-validation.ts` into the `index.ts` operation branch, before resolution (depends on: T015, T016)
- [x] T019 [US2] Create `apps/workers/oracle-proxy/src/llm/adaptors/openai-adaptor.ts` implementing the OpenAI-compatible `chat/completions` call (`messages`, `response_format` for structured output, `temperature`, `max_tokens`) and response normalization into `LlmResponse`, reading `OPENAI_API_KEY` from `env` (research.md R2). Accept `fetcher` as an injectable dependency (default `fetch`), same as T002. This adaptor owns enforcing the 15-second provider-call timeout itself (via `AbortController`) and reports a timeout as an "unavailable" outcome to its caller, matching T002's Gemini adaptor (depends on: T001)
- [x] T020 [P] [US2] Create `apps/workers/oracle-proxy/src/llm/adaptors/openai-adaptor.test.ts` covering request shaping (including `response_format` for structured-generation) and response normalization (`content`, `usage`) against a mocked `fetch`, plus a test that a call exceeding 15s is reported as an "unavailable" outcome rather than an unhandled rejection (depends on: T019)
- [x] T021 [US2] Document the new `OPENAI_API_KEY` Worker secret in `apps/workers/oracle-proxy/wrangler.toml`'s comments and `.env.example`, mirroring the existing `GEMINI_API_KEY` documentation (research.md R6) — config/docs only, no code
- [x] T022 [US2] Add a `luna-fast` entry (`provider: "openai"`, via T019's adaptor) to `apps/workers/oracle-proxy/src/llm/registry.ts`'s `MODEL_REGISTRY`, and set it as the fallback for `structured-generation` and `freeform-generation` in `OPERATION_DEFAULTS`, per `contracts/model-registry.md` (depends on: T006, T019)
- [x] T023 [P] [US2] Create `apps/workers/oracle-proxy/src/llm/pipeline.test.ts` with end-to-end integration tests for: capability-required selection (Acceptance Scenario 1), context-default selection with no override (Scenario 2), identical normalized response shape across a Gemini-served and an OpenAI/Luna-served request (Scenario 3, using T022's entry), and rejected-field/credential handling (Scenario 4) (depends on: T015, T018, T022)
- [x] T023a [P] [US2] Add a test in `apps/workers/oracle-proxy/src/llm/pipeline.test.ts` (or `resolver.test.ts`) with a spy `fetcher` counting upstream provider calls per request: for a normal successful request, exactly one call is made; even across the retry-then-fallback path (FR-010a), no more than two upstream calls are ever made for a single client request, and the resolver never issues an additional "improve the result" call after a model already returned a usable response (FR-009) (depends on: T015)

**Checkpoint**: Provider-neutral routing is live end-to-end; both providers are reachable through one contract. **This completes the MVP** (Foundational + US1 + US2).

---

## Phase 5: User Story 3 - GPT-5.6 Luna available through the shared pipeline (Priority: P2)

**Goal**: Luna becomes usable as a configured default or explicit override purely through registry configuration.

**Independent Test**: Point an operation's default at Luna via config, send a request, verify (via observability logging) the response was produced by Luna.

### Implementation for User Story 3

- [x] T024 [US3] Repoint at least one operation's **primary** default (not just fallback) at `luna-fast` in `OPERATION_DEFAULTS` (`apps/workers/oracle-proxy/src/llm/registry.ts`) purely via config edit — no changes to resolver, adaptors, or callers (SC-003) (depends on: T022)
- [x] T025 [P] [US3] Add a test asserting a request for the operation repointed in T024 returns valid structured output actually produced by `luna-fast` (Acceptance Scenario 1) (depends on: T024)
- [x] T026 [P] [US3] Add a test asserting that setting `luna-fast.enabled = false` excludes it from selection even when configured as the default, and the resolver correctly falls back instead (Acceptance Scenario 2) (depends on: T024)

**Checkpoint**: Luna is a config-only-selectable default; disabling it degrades safely.

---

## Phase 6: User Story 4 - Predictable fallback on unavailable/under-capable models (Priority: P2)

**Goal**: A disabled, misconfigured, or under-capable model triggers a predictable, logged fallback instead of an outright failure or silent misroute.

**Independent Test**: Disable the model an operation would normally resolve to, send a request, confirm it still succeeds via the configured fallback with a log entry recording why.

### Implementation for User Story 4

- [x] T027 [P] [US4] Add a registry-backed test (using real `MODEL_REGISTRY` data, not mocks): disabling the primary model for an operation causes the resolver to select the configured fallback and the request still succeeds (Acceptance Scenario 1) (depends on: T022)
- [x] T028 [P] [US4] Add a registry-backed test: a request requiring a capability the resolved model doesn't declare is never routed there, and instead resolves to a capability-satisfying model (primary or fallback) or a clear error if none exists (Acceptance Scenario 2) (depends on: T022)
- [x] T029 [P] [US4] Add an integration test asserting a fallback occurrence produces a `ResolutionLogEntry` recording both the originally-intended model (`intendedModelKey`) and the model actually used (`modelKey`), plus `fallbackReason` (Acceptance Scenario 3) (depends on: T023)
- [x] T030 [US4] Add index.ts handling and an integration test: when no model (primary or fallback) satisfies a request's required capability/context, the Worker returns the documented `LLM_NO_MODEL_AVAILABLE` HTTP 503 shape (`contracts/llm-operation-request.md`), never a raw provider error (Acceptance Scenario 4) (depends on: T015)
- [x] T030a [P] [US4] Add a test asserting that `operation: "revision"` requests — which have no `OPERATION_DEFAULTS` entry in this slice (`revision` is a valid `LlmOperation` value but unwired, per spec Scope §4/contracts/model-registry.md) — resolve through the same "no configured default" path as T030's zero-model-available case, returning the documented `LLM_NO_MODEL_AVAILABLE` 503 shape rather than an unhandled exception or undefined lookup (depends on: T030)

**Checkpoint**: Fallback and total-unavailability behavior are fully verified and independently observable.

---

## Phase 7: User Story 5 - Operator observability (Priority: P3)

**Goal**: An operator can see, from logs alone, which model/provider handled which requests, with no prompt or content data ever present.

**Independent Test**: Send a mix of normal, fallback, and validation-failure requests; confirm each produces a correctly-shaped, content-free log entry.

### Implementation for User Story 5

- [x] T031 [P] [US5] Add an integration test asserting every processed request (success, fallback, or failure) produces a `ResolutionLogEntry` with at least `modelKey`, `provider`, `operation`, `context`, `latencyMs`, and `outcome` (Acceptance Scenario 1) (depends on: T023, T029, T030)
- [x] T032 [P] [US5] Add a test asserting that when token usage is available, the log entry includes `usage` and an `estimatedCostUsd` computed from the resolved model's registry pricing rate (Acceptance Scenario 2) (depends on: T010)
- [x] T033 [P] [US5] Add a test asserting a structured-output validation failure produces a log entry with `structuredOutputValidationFailed: true` and does not include the invalid content itself (Acceptance Scenario 3) (depends on: T010, T009)
- [x] T034 [P] [US5] Add a full-flow fixture test (extending T011's unit-level check) that runs a mixed batch of requests through the wired pipeline and asserts no emitted log entry contains any substring of the fixture prompts/responses used (Acceptance Scenario 4) (depends on: T023)
- [x] T034a Flip `[observability] enabled` from `false` to `true` in `apps/workers/oracle-proxy/wrangler.toml` — the master switch for Cloudflare's persisted Workers Logs; without it, `[observability.logs] enabled = true` alone only surfaces log lines through live `wrangler tail`, not the queryable historical Logs dashboard SC-005 depends on. Config-only change; not covered by a test (no CI/deploy check exercises actual Cloudflare log persistence, and per user instruction this is not verified via `wrangler` in this workflow)
- [x] T034b [P] [US5] Update `apps/workers/oracle-proxy/README.md`/`DEPLOYMENT.md`'s existing "View Logs" section (`wrangler tail`) to also document the Cloudflare dashboard → Workers & Pages → oracle-proxy → **Logs** tab for querying historical `ResolutionLogEntry` data (filter by `outcome`, `modelKey`, etc.), and explicitly note for operators that entries are metadata-only by design — no prompt/response content is ever logged, so the Logs tab is safe to share/screenshot without redaction

**Checkpoint**: Observability is sufficient to determine model/provider usage, cost, and failure patterns from logs alone, with zero content leakage, and those logs are actually visible/queryable in the Cloudflare dashboard, not just via live tail.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T035 [P] Update `apps/workers/oracle-proxy/DEPLOYMENT.md` and `README.md` documenting the new operation-request contract, the `src/llm/` registry location, and the `OPENAI_API_KEY` secret requirement
- [x] T036 Run `bunx vitest run` (all `apps/workers/oracle-proxy` tests) and repo-root `bun run lint:types` / `bun run lint`; fix any violations
- [x] T037 Verify `src/llm/**` meets the constitution's 70% coverage goal for new code (Principle X); add tests for any gaps
- [ ] T038 Manually run through `quickstart.md`'s four verification steps against `wrangler dev`: existing callers unaffected, new contract works, Luna reachable, fallback triggers correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (specifically T004); no dependency on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational (T008, T010) and on US1's T012 (the discriminator stub it completes) — the two P1 stories are sequenced (US1 first) because US2 wires into the branch US1 creates, but each has its own independently-testable checkpoint
- **User Story 3 (Phase 5)**: Depends on US2's T022 (the `luna-fast` registry entry)
- **User Story 4 (Phase 6)**: Depends on US2's T022/T023 (real registry data + pipeline tests to extend)
- **User Story 5 (Phase 7)**: Depends on US2/US4's integration tests (T023, T029, T030) and Foundational's T010
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### Parallel Opportunities

- Within Foundational: T002+T003 (Gemini adaptor extraction+tests), T006+T007 (registry+tests), T009 (resolver tests), T011 (observability tests) can proceed in parallel once their single dependency (T001, or T002/T006/T008/T010 respectively) lands
- Within US1: T013 and T014 are parallel once T012 lands
- Within US2: T016+T017 (request-validation), T019+T020 (OpenAI adaptor) are two parallel tracks; T021 (docs) is parallel to everything; T023a runs parallel to T023 once T015 lands
- Within US3: T025 and T026 are parallel once T024 lands
- Within US4: T027, T028, T029 are parallel once their dependencies land; T030a follows T030 directly (same file/topic, not parallel)
- Within US5: T031–T034 are all parallel once their dependencies land; T034a is a standalone config change (no dependency, already applied); T034b (docs) is parallel to everything

---

## Parallel Example: Foundational Phase

```bash
# After T001 (types.ts) lands, these four tracks can run in parallel:
Task: "Extract Gemini forwarding into src/llm/adaptors/gemini-adaptor.ts"          # T002
Task: "Create src/llm/registry.ts with MODEL_REGISTRY and OPERATION_DEFAULTS"      # T006
# (T008 resolver.ts depends on T006 landing first, so it follows shortly after)
```

---

## Implementation Strategy

### MVP First (Foundational + US1 + US2)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T011) — registry, resolver, adaptor extraction, observability, all unit-tested
3. Complete Phase 3: User Story 1 (T012–T014) — **STOP and VALIDATE**: confirm zero regression for existing callers
4. Complete Phase 4: User Story 2 (T015–T023) — **STOP and VALIDATE**: confirm end-to-end provider-neutral routing works
5. This is the deployable MVP: issue #2049's "backend plumbing" goal is met — Luna is technically reachable via `modelKeyOverride` even before US3 makes it a _default_.

### Incremental Delivery

1. Setup + Foundational → shared infrastructure ready, fully unit-tested in isolation
2. Add US1 → verify zero regression → safe to deploy
3. Add US2 → verify provider-neutral pipeline end-to-end → deploy (MVP complete)
4. Add US3 → Luna becomes a config-only default → deploy
5. Add US4 → fallback behavior hardened and observable → deploy
6. Add US5 → full observability coverage → deploy
7. Polish → docs, coverage, lint, manual quickstart pass

### Notes

- [P] tasks touch different files with no unmet dependencies
- Verify tests fail before implementing the corresponding logic (Red-Green-Refactor, Constitution Principle II)
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before continuing
