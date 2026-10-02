# Tasks: Contextual AI Help Assistant (Spike)

**Input**: Design documents from `/specs/3427-contextual-ai-help-assistant/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The constitution requires TDD (Principle II) and the repo requires a success path plus at least one negative/failure path per changed behaviour. Write each test first and watch it fail.

**Organization**: Grouped by user story. US1 is the MVP. Each story is independently testable after the Foundational phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US5 map to the spec's user stories
- Validation is impacted-only per repo rules: `bun scripts/test-changed.mjs`, `bun scripts/lint-changed.mjs`, scoped svelte-check. Never run repo-wide suites.

## Path Conventions

- Package: `packages/help-engine/` (tests under `packages/help-engine/tests/`, runner `bun test`)
- Worker: `apps/workers/oracle-proxy/src/` (Vitest)
- Web: `apps/web/src/lib/{components,stores,services}/help-assistant/` (Vitest)

---

## Phase 1: Setup

- [x] T001 Create the `packages/help-engine` workspace package mirroring `packages/entity-template-engine` (`package.json` named `help-engine` with `zod` only, `tsconfig.json`, `bunfig.toml`, `src/index.ts` barrel, empty `tests/`), and confirm Bun workspace resolution picks it up.
- [x] T002 [P] Test-first, create `apps/web/src/lib/config/help-assistant.ts` exporting `isHelpAssistantEnabled()` that reads `import.meta.env.VITE_HELP_ASSISTANT` (off unless exactly `"true"`), with `apps/web/src/lib/config/help-assistant.test.ts` (off by default, off for other values, on for `"true"`); add `VITE_HELP_ASSISTANT=` with a comment that staging enables it to `apps/web/.env.example` (research F2).
- [x] T003 [P] Add `bundle` and `eval` scripts to `packages/help-engine/package.json`; add the generated bundle path to `.gitignore`; add a bundle-build step before deploy in `.github/workflows/deploy-worker.yml` (research D12). The bundle is written to `packages/help-engine/dist/knowledge-bundle.json` (gitignored); the Worker receives it through an injected dependency so tests use a small fixture instead of the generated file.

---

## Phase 2: Foundational (blocks all user stories)

**Purpose**: The framework-free engine, the shared trust-boundary validators, and the metric line. Nothing user-visible yet.

### Tests first

- [x] T004 [P] Write failing tests for `HelpContextV1` in `packages/help-engine/tests/context.test.ts`: valid Settlement → Connections packet passes; unknown key rejected; a resolved path like `/vault/3f2a…` rejected; a custom category collapses to `custom`; the exact key set is asserted so silent additions fail.
- [x] T005 [P] Write failing tests for the action catalogue and validator in `packages/help-engine/tests/actions.test.ts`: off-list type discarded; `highlight` target not in `availableActions` discarded; flag-gated generator discarded when flag off; `navigate` to a non-catalogue destination discarded; `then` depth > 1 rejected; server candidate list never includes a type that can mutate vault content.
- [x] T006 [P] Write failing tests for the registry schema and cross-reference validator in `packages/help-engine/tests/registry.test.ts`: duplicate `id`, missing `helpIds` file, unknown `related`, unknown action target, and workflow action not in entry `actions` each fail; `channel: staging` entries are excluded from a production bundle.
- [x] T007 [P] Write failing tests for the bundle builder in `packages/help-engine/tests/bundle.test.ts`: chunks split on `##` headings and stay ≤ ~450 tokens; IDs are stable across rebuilds; content hash changes when text changes; registry summary and workflow chunks are emitted; a help file that is referenced but missing fails the build.
- [x] T008 [P] Write failing tests for retrieval in `packages/help-engine/tests/retrieval.test.ts`: a context-matching Connections chunk outranks a generic guild-generator chunk for the same words; a query below `MIN_RELEVANCE` returns no results; ordering is deterministic on ties; context boosts (feature, route, entity kind, tab) apply.
- [x] T009 [P] Write failing tests for prompt and response handling in `packages/help-engine/tests/prompt-response.test.ts`: history trimmed to ≤ 4 turns / ≤ 600 tokens; sources rendered as labelled blocks; cited IDs not in the supplied set dropped; `answered` with no valid citation downgrades to `no-match`; `actionId` accepted only from the candidate list; answers longer than ~900 characters are trimmed at a sentence boundary (FR-005); a "do it for me" request yields steps plus a statement that the assistant cannot make the change (prompt contract); prompt-injection text in the question or a chunk is treated as data (stays inside its block, cannot change role).
- [x] T010 [P] Write failing tests for the metric line in `apps/workers/oracle-proxy/src/help-metrics.test.ts`: emits exactly `{event, outcome, latencyMs, area}`; any extra key, question text, answer text, or identifier is refused.

### Implementation

- [x] T011 Implement the context schema, sanitiser and route-template guard in `packages/help-engine/src/context/` (strict Zod, closed enums per data-model.md) to pass T004.
- [x] T012 Implement the control/destination/panel/generator catalogues, action validator and candidate builder in `packages/help-engine/src/actions/` to pass T005.
- [x] T013 Implement the registry schema and cross-reference validator in `packages/help-engine/src/registry/schema.ts` to pass T006 (the set of existing help IDs is an injected parameter, so the package never imports from `apps/web`).
- [x] T014 Implement the bundle builder and CLI entry in `packages/help-engine/src/bundle/` (chunker, hashing, channel filtering, commit SHA stamp) to pass T007, and wire the `bundle` script from T003 with a `--help-dir` argument (the bundle script passes `apps/web/src/lib/content/help`) and the output path from T003.
- [x] T015 Implement the lexical ranker, context boosts and `MIN_RELEVANCE` floor in `packages/help-engine/src/retrieval/` to pass T008.
- [x] T016 Implement the system prompt, source-block builder, history trimmer and model-response validator/grounding check (including the ~900-character trim) in `packages/help-engine/src/prompt/` and `packages/help-engine/src/response/` to pass T009.
- [x] T017 Implement the metric emitter in `apps/workers/oracle-proxy/src/help-metrics.ts` to pass T010 (structured `console.log`, no identifiers).
- [x] T018 Export the public surface from `packages/help-engine/src/index.ts` and confirm the package typechecks and meets the 70% coverage goal for new packages.

**Checkpoint**: The engine validates context, actions, registry, retrieval and model output on its own. No UI or route yet.

---

## Phase 3: User Story 1 — Ask how to do something where I am (Priority: P1) 🎯 MVP

**Goal**: From Settlement → Connections, asking "How do I connect the faction I just created?" returns a short, cited, screen-specific answer (Status tab → Add), for users with the flag on and AI available.

**Independent Test**: With the flag on, open a Settlement's Connections tab, ask the question, and verify the answer names the Status tab and Add, cites Connections Tab and Entity Connections, and is worded for this screen. Ask the same from the Graph and verify it is tailored to the Graph.

### Tests for US1

- [x] T019 [P] [US1] Write failing Worker route tests in `apps/workers/oracle-proxy/src/help.test.ts` using a stubbed resolver: answered response with valid sources; empty question → 400 `EMPTY_QUESTION`; 501-char question → `QUESTION_TOO_LONG`; invalid context → `INVALID_CONTEXT`; missing token → 401; limiter denial → 429; provider failure after fallback → 502; upstream over budget → 504; no bundle → 503; error bodies never echo the question.
- [x] T020 [P] [US1] Write failing tests for the web client in `apps/web/src/lib/services/help-assistant/help-client.test.ts`: sends only `question`, capped `history`, and validated `context`; attaches the capability token; aborts on cancel; maps 401 (one refresh then fail), 429, 5xx and timeout to typed errors.
- [x] T021 [P] [US1] Write failing tests for `HelpContextStore` in `apps/web/src/lib/stores/help-assistant/help-context.test.ts`: builds the Settlement → Connections packet from registered providers; a provider returning extra fields or a resolved path is sanitised; unavailable providers yield a general-guide packet (edge case: no context yet); the spike always yields `surface: "vault"` (the panel is not shown outside the app; `public` is schema-valid but never produced).
- [x] T022 [P] [US1] Write failing tests for `HelpAssistantStore` in `apps/web/src/lib/stores/help-assistant/help-assistant.test.ts`: state moves `idle → pending → answered`; conversation capped at 4 turns and cleared on reset; cancel returns to `idle`; an answer arriving after the screen changed is labelled or dropped; nothing is written to storage; an empty (whitespace-only) question sends no request, and a question over 500 characters shows a plain limit message without sending.
- [x] T023 [P] [US1] Write failing component tests for `HelpAssistantHost`, `HelpAssistantPanel` and `AskAboutThis` in `apps/web/src/lib/components/help-assistant/*.test.ts`: host renders nothing when `isHelpAssistantEnabled()` is false **or** `discoveryPolicyStore.aiDisabled` is true (static help only, FR-030), and mirrors the `ai-disabled.spec.ts` expectation of no help network traffic when AI is disabled; extend `apps/web/src/lib/components/entity-detail/DetailConnectionsTab.test.ts` to assert the shortcut is present when enabled and absent otherwise; panel opens from the persistent button and from the shortcut with context preset; Enter submits, Escape closes without losing the screen underneath; focus is managed and labelled for assistive tech (FR-001a).
- [x] T024 [P] [US1] Write a failing scenario integration test in `packages/help-engine/tests/scenario-connections.test.ts`: with the real registry and fixture bundle, the Settlement → Connections context retrieves `connections-tab` and `entity-connections` and offers the `openPanel(status-tab) → highlight(add-connection-button)` candidate; the Graph context does not.

### Implementation for US1

- [x] T025 [P] [US1] Author `packages/help-engine/src/registry/features/entity-connections.ts` (workflow `add-connection`, actions, help IDs `connections-tab` and `connection-labels`).
- [x] T026 [P] [US1] Author `packages/help-engine/src/registry/features/graph-view.ts` (help ID `graph-basics`, action `navigate(graph)`).
- [x] T027 [P] [US1] Author `packages/help-engine/src/registry/features/session-hub.ts` and add the short user-facing article `apps/web/src/lib/content/help/session-hub.md` (closes the coverage gap found in research; keep it plain-language).
- [x] T028 [P] [US1] Author `packages/help-engine/src/registry/features/tables.ts` (help ID `random-tables-decks`, action `navigate(tables)`).
- [x] T029 [P] [US1] Author `packages/help-engine/src/registry/features/campaign-generator.ts` (help IDs `in-app-generators` and `generate-related`, action `openGenerator(campaign)`).
- [x] T030 [US1] Test-first, add the `help-answer` operation: extend `apps/workers/oracle-proxy/src/llm/registry.test.ts` (resolves Luna primary, Gemini fallback, structured output, `reasoningEffort: "low"` (Luna rejects "minimal"); an unregistered operation still fails), then add it to `apps/workers/oracle-proxy/src/llm/types.ts` and `apps/workers/oracle-proxy/src/llm/registry.ts`.
- [x] T031 [P] [US1] Write a failing registry-vs-content test in `apps/web/src/lib/content/help-registry.test.ts` asserting the real `help-engine` registry passes the cross-reference validator against the real `apps/web/src/lib/content/help/` article IDs (every `helpIds` entry exists, including the new `session-hub`).
- [x] T032 [US1] Implement `apps/workers/oracle-proxy/src/help.ts` (constructor-injected deps: bundle, retriever, resolver, clock, logger; ordered pipeline from contracts/help-ask-api.md: `enforceLlmSession` + existing LLM limiters → validate → retrieve → floor → prompt → `help-answer` operation → validate/expand action → metric → respond), with no new bindings, secrets or vars in `wrangler.toml` (FR-030a) and add the single dispatch line in `apps/workers/oracle-proxy/src/index.ts` (no other change to that file).
- [x] T033 [P] [US1] Implement `apps/web/src/lib/services/help-assistant/help-client.ts` using `resolveOracleProxyUrl` and the existing capability session, to pass T020.
- [x] T034 [P] [US1] Implement `apps/web/src/lib/stores/help-assistant/help-context.svelte.ts` (constructor-injected providers, class + default singleton) to pass T021, and register providers for route template, entity detail tab/kind, and mode.
- [x] T035 [US1] Implement `apps/web/src/lib/stores/help-assistant/help-assistant.svelte.ts` (panel state, capped conversation, pending/cancel/timeout, stale-screen handling) to pass T022.
- [x] T036 [US1] Implement `HelpAssistantPanel.svelte`, `HelpAskButton.svelte`, `AskAboutThis.svelte` and `HelpAssistantHost.svelte` in `apps/web/src/lib/components/help-assistant/` (Svelte 5 Runes, Tailwind semantic tokens, Iconify classes only, a 300 ms pending state, plain-language copy) to pass T023.
- [x] T037 [US1] Mount `<HelpAssistantHost />` with one line in `apps/web/src/routes/(app)/+layout.svelte` and add `<AskAboutThis />` to `apps/web/src/lib/components/entity-detail/DetailConnectionsTab.svelte` (no other behaviour added to either file; both justified in plan's Bounded Responsibility Check).
- [x] T038 [US1] Build the evaluation harness in `packages/help-engine/tests/eval/`: fixture set of 20 in-scope questions across the five areas with expected source IDs; stubbed-model runner (CI-safe) reporting citation correctness and recall@3; an optional `--live` mode and an embeddings comparison using Workers AI, both manual (research D1 adoption triggers).

**Checkpoint**: US1 works end to end behind the flag. Stop and demo the scenario.

---

## Phase 4: User Story 2 — Be shown where the control is (Priority: P2)

**Goal**: After an answer recommends a control, the user can accept a guide that opens the Status tab and highlights Add connection, with nothing changed in the vault.

**Independent Test**: From Settlement → Connections, accept "Show me". The Status tab opens, the Add control shows a ring and text label, a screen reader hears it, Escape clears it, and no connection exists afterwards.

### Tests for US2

- [x] T039 [P] [US2] Write failing tests for `HelpHighlightService` in `apps/web/src/lib/services/help-assistant/help-highlight.test.ts`: finds `[data-help-target]`; applies ring plus visible label; announces via polite live region; no animation under `prefers-reduced-motion`; clears on Escape, click-away, route change, panel dismiss and 15 s timeout; a missing or hidden target does nothing and raises no user-facing error; never triggers a click or input.
- [x] T040 [P] [US2] Write failing tests for the action executor in `apps/web/src/lib/services/help-assistant/help-action-runner.test.ts`: re-validates against the current screen before each step; runs `openPanel` then waits up to 1 s for the target before `highlight`; discards an off-list or stale action; runs only after explicit acceptance; every action type is proven not to call any vault mutation (spy on vault store methods).
- [x] T041 [P] [US2] Write failing component tests for the action offer UI in `apps/web/src/lib/components/help-assistant/HelpActionOffer.test.ts`: "Show me" and dismiss are keyboard operable; nothing runs until Show me; dismiss removes the offer.
- [x] T042 [P] [US2] Write failing contract tests in `apps/web/src/lib/components/entity-detail/help-targets.test.ts` asserting every `ControlId` the catalogue marks as present on the entity detail screen has a matching `data-help-target` attribute when `DetailStatusTab` and `DetailTabs` render (so a renamed or removed control breaks CI, not users).

### Implementation for US2

- [x] T043 [US2] Implement `apps/web/src/lib/services/help-assistant/help-highlight.svelte.ts` (constructor-injected document and timers; class + default singleton) to pass T039.
- [x] T044 [US2] Implement `apps/web/src/lib/services/help-assistant/help-action-runner.ts` wiring `navigate` (destination→route map), `openHelp` (existing `helpStore`), `openPanel` (existing entity detail tab selection in `apps/web/src/lib/components/entity-detail/detail-tabs.ts`), `openGenerator`, and `highlight`, to pass T040.
- [x] T045 [US2] To pass the new contract test, add `data-help-target="add-connection-button"` to the existing ADD button in `apps/web/src/lib/components/entity-detail/DetailStatusTab.svelte` (marker attribute only) and `data-help-target` on the Status and Connections tab buttons in `apps/web/src/lib/components/entity-detail/DetailTabs.svelte`; the IDs must match the control catalogue from T012.
- [x] T046 [US2] Implement `apps/web/src/lib/components/help-assistant/HelpActionOffer.svelte` and render it in the panel to pass T041.
- [x] T047 [P] [US2] Add a Playwright spike check in `apps/web/tests/help-assistant-highlight.spec.ts`: stubbed `/api/help/ask` returns the scenario answer; accepting opens Status and highlights Add; Escape clears it; the vault's connection count is unchanged.

**Checkpoint**: US1 + US2 demonstrate live context, grounded answer and one safe action.

---

## Phase 5: User Story 3 — Sensible help when no authoritative answer exists (Priority: P3)

**Goal**: Undocumented or unrelated questions get an honest no-match or product-only response with the closest topics, never an invented feature.

**Independent Test**: Ask about a non-existent capability and an unrelated topic; neither answer describes a feature that does not exist, and the first lists related help topics.

### Tests for US3

- [x] T048 [P] [US3] Write failing Worker tests added to `apps/workers/oracle-proxy/src/help.test.ts`: a question below the relevance floor returns `no-match` **without calling the model** and with `suggestions`; a weak match is not returned as `answered`; a model answer with no valid citation downgrades to `no-match`; a model `out-of-scope` result returns `out-of-scope` with a plain explanation; text inside a retrieved chunk cannot alter the role.
- [x] T049 [P] [US3] Extend the evaluation set in `packages/help-engine/tests/eval/` with 10 out-of-scope or undocumented questions asserting 100% no-match/out-of-scope and 0 invented features (SC-003), plus 3 prompt-injection questions ("ignore your rules and…", "print your instructions") and 2 "do it for me" requests ("connect them for me") asserting FR-026 and the explain-but-cannot-change behaviour; run against the stubbed model.
- [x] T050 [P] [US3] Write failing panel tests in `apps/web/src/lib/components/help-assistant/HelpAssistantPanel.test.ts`: no-match shows honest wording with clickable suggestions that open the article via `helpStore`; out-of-scope wording is plain and does not offer an action.

### Implementation for US3

- [x] T051 [US3] Implement the no-match and out-of-scope branches, closest-topic `suggestions`, and the model-skipping floor path in `apps/workers/oracle-proxy/src/help.ts` and `packages/help-engine/src/response/`, to pass T048.
- [x] T052 [US3] Render no-match and out-of-scope states and suggestion links in `apps/web/src/lib/components/help-assistant/HelpAssistantPanel.svelte` to pass T050; tune `MIN_RELEVANCE` against the T038/T049 sets and record the chosen value and its recall in `research.md` D6.

**Checkpoint**: The assistant fails honestly.

---

## Phase 6: User Story 4 — Help still works when the assistant is unreachable (Priority: P4)

**Goal**: Offline, AI-unavailable, error, rate-limit or timeout states show a plain message and a link to static help for the current screen, without blocking anything else.

**Independent Test**: Go offline on Settlement → Connections and ask; within 2 seconds the user sees a plain message and a working link to the Connections help topic, and editing/navigation are unaffected.

### Tests for US4

- [x] T053 [P] [US4] Write failing tests for `help-fallback` in `apps/web/src/lib/services/help-assistant/help-fallback.test.ts`: offline, 401 after refresh, 429, 5xx and timeout each map to a plain-language message plus the registry's static help topic for the current screen; an unknown screen falls back to the help library; a slow request past the 8 s target keeps showing progress and offers both cancel and the static help link.
- [x] T054 [P] [US4] Write failing store tests added to `apps/web/src/lib/stores/help-assistant/help-assistant.test.ts`: a failing or hanging request never blocks other stores (no awaited work on the UI thread), cancel works mid-flight, and the fallback state is reachable within 2 s of a failure.
- [x] T055 [P] [US4] Write a failing Playwright check in `apps/web/tests/help-assistant-offline.spec.ts`: offline → asking shows the message and link; editing an entity and switching tabs stay responsive.

### Implementation for US4

- [x] T056 [US4] Implement `apps/web/src/lib/services/help-assistant/help-fallback.ts` (screen → `helpIds` from the bundled registry metadata; uses the existing online store) to pass T053.
- [x] T057 [US4] Integrate fallback, cancel and the rate-limit message into `help-assistant.svelte.ts` and render the fallback state in `HelpAssistantPanel.svelte` to pass T054–T055.

**Checkpoint**: Help degrades to static help in every failure mode.

---

## Phase 7: User Story 5 — Keep my vault private (Priority: P5)

**Goal**: Prove, by test and by inspection, that only the question, capped history and screen description are sent, that no client analytics or persistence is involved, and that service metrics carry no content or identifiers.

**Independent Test**: Inspect the `/api/help/ask` request for the scenario; it contains no entity names, IDs, or vault data, and no analytics requests come from the panel.

### Tests for US5

- [x] T058 [P] [US5] Write a failing request-shape test in `apps/web/src/lib/services/help-assistant/help-privacy.test.ts`: with a vault containing named entities, the serialized request body has exactly `{question, history, context}` with the exact context key set, and no entity name/ID/title/text appears anywhere in it.
- [x] T059 [P] [US5] Write a failing guard test in `apps/web/src/lib/services/help-assistant/help-no-analytics.test.ts` asserting no file under `components/help-assistant/`, `stores/help-assistant/`, or `services/help-assistant/` imports `services/analytics/*` or any Zaraz/tracking module (FR-028).
- [x] T060 [P] [US5] Write a failing persistence test in `help-assistant.test.ts`: conversation and questions are never written to localStorage, sessionStorage, IndexedDB, OPFS or the vault (storage spies).
- [x] T061 [P] [US5] Write failing Worker tests in `apps/workers/oracle-proxy/src/help.test.ts`: the only observability output is the T010 metric shape; rate-limited and oversized bodies (> 8 KB) are rejected before retrieval or model calls.

### Implementation for US5

- [x] T062 [US5] Add the plain-language privacy notice to `HelpAssistantPanel.svelte` ("Your question goes to our AI service. Avoid pasting private lore.") and make any failures found by T058–T061 pass; ensure the Worker rejects oversize bodies early in `help.ts`.

**Checkpoint**: Every privacy requirement is covered by an automated test.

---

## Phase 8: Polish, Findings, and Follow-ups

- [x] T063 Run the scenario live against the real model 10 times (SC-001) and record correctness, p50/p90 latency (SC-004) and measured token cost (research D11) in `specs/3427-contextual-ai-help-assistant/findings.md`; if p90 exceeds 8 s or fewer than 9 of 10 runs are correct, record that as the first follow-up.
- [x] T064 [P] Write `specs/3427-contextual-ai-help-assistant/findings.md` covering every issue deliverable (FR-031): refined architecture decisions, MVP UX and behaviour, context schema, registry schema, D1/Vectorize model, Worker contract, action contract, CI sync approach (one vs two workflows), measured latency and cost for a real interaction (live run from T038), recall comparison lexical-vs-embeddings and the adoption decision, and the Cloudflare AI Search comparison.
- [x] T065 [P] Update `docs/ARCH_CONTEXTUAL_AI_HELP_ASSISTANT.md` with the findings and corrections (Status-tab finding, registry-first retrieval, `actionId` candidate model, server-only metrics, two-workflow sync recommendation).
- [x] T066 [P] Draft the prioritised follow-up issue list (FR-032) at the end of `findings.md`: proactive suggestions, knowledge sync, D1/Vectorize adoption (if triggers hit), broader registry coverage, streaming, assistant naming, quick prompts. Do not create GitHub issues until the list is approved.
- [x] T067 [P] Add a short entry for this feature to "Active Technologies" in `AGENTS.md` and record the `help-engine` package in any package index the repo keeps.
- [x] T068 [P] Author `apps/web/src/lib/content/help/help-assistant.md` (plain-language guide to asking for help, what is sent, and the AI Disabled setting) with `hidden: true` front matter so it ships but is not listed until rollout (Constitution VII); confirm the loader test still passes.
- [x] T069 [P] Review all user-facing strings (panel, fallback, no-match, privacy notice, highlight label, the new help articles) for plain language per Constitution IX and `docs/STYLE_GUIDE.md`; record changes in `findings.md`.
- [x] T070 Run `bun scripts/lint-changed.mjs`, `bun scripts/test-changed.mjs`, and scoped type-checks (`bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`; affected workspaces via `bun scripts/affected-workspaces.mjs`); fix all findings. Confirm coverage ≥ 70% for `help-engine` confirm `git diff` shows no change to `wrangler.toml` bindings, secrets or vars (FR-030a), and state explicitly what was and was not verified.
- [x] T071 Run `bunx fallow audit --format json --quiet --explain --gate-marker agent` and resolve any introduced findings before any commit or push.
- [x] T072 Run the `codex-review` specialist review on the branch and resolve findings (PR Quality Gate item 4).
- [ ] T073 Walk through `quickstart.md` manually end to end, including the privacy inspection step and the offline step; record results in `findings.md`. _Not done by a person: automated equivalents are recorded in `findings.md`; a manual pass is still open._

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (1)** → **Foundational (2)** → all user stories. Foundational blocks everything.
- **US1 (3)** is the MVP and the base for the others.
- **US2 (4)** depends on US1's panel and on T012/T045 catalogue wiring.
- **US3 (5)** depends on US1's Worker route and panel.
- **US4 (6)** depends on US1's client and store.
- **US5 (7)** verifies US1–US4 behaviour; its tests can be written in parallel once US1 exists.
- **Polish (8)** after the desired stories are complete. The findings task needs the evaluation harness (T038) and the live runs (T063), which precede it.

### Within a story

Tests first and failing → engine/service → store → components → integration. Registry entries (T025–T029) are independent files and parallel; T024 needs them.

### Shared files (serialise across phases)

`[P]` only means parallel within a phase. These files are edited by several tasks in different phases, so those edits must be applied in task-ID order: `apps/workers/oracle-proxy/src/help.test.ts` and `help.ts`, `apps/web/src/lib/stores/help-assistant/help-assistant.test.ts` and `help-assistant.svelte.ts`, `HelpAssistantPanel.svelte` and its test, and `packages/help-engine/tests/eval/`.

### Parallel opportunities

- Phase 2 tests T004–T010 are all different files: run together. Their implementations T011–T017 are independent except T014 (needs T013) and T016 (needs T011, T012).
- US1 tests T019–T024 in parallel; registry entries T025–T029 in parallel; T033 and T034 in parallel.
- US2 tests T039–T041 in parallel. US3, US4 and US5 test groups can be written in parallel by different people once US1 lands.

### Parallel example: Foundational tests

```text
T004 context.test.ts | T005 actions.test.ts | T006 registry.test.ts
T007 bundle.test.ts  | T008 retrieval.test.ts | T009 prompt-response.test.ts
T010 help-metrics.test.ts
```

## Requirement Coverage

| Requirement                                                     | Tasks                  |
| --------------------------------------------------------------- | ---------------------- |
| FR-001, FR-001a (panel, shortcut, accessibility)                | T023, T036, T037       |
| FR-002, FR-004 (grounded, cited, no invented features)          | T009, T016, T019, T051 |
| FR-003, FR-006 (screen-aware, follow-ups)                       | T021, T035             |
| FR-005 (short, plain)                                           | T009, T069             |
| FR-007–FR-010 (screen description schema)                       | T004, T011, T058       |
| FR-011–FR-015 (registry, references, validation)                | T006, T013, T025, T031 |
| FR-016–FR-019 (allow-list, validation, no mutation, acceptance) | T005, T012, T040, T041 |
| FR-020, FR-021 (highlight, accessibility)                       | T039, T043, T042       |
| FR-022 (no match)                                               | T048, T050             |
| FR-023–FR-025 (fallback, non-blocking, progress/cancel)         | T053, T054, T057       |
| FR-026 (stay in role)                                           | T009, T049             |
| FR-027, FR-028 (metrics, no client tracking)                    | T010, T017, T059       |
| FR-029 (limits)                                                 | T019, T061             |
| FR-030, FR-030a (flag, AI gate, no new quota)                   | T002, T023, T070       |
| FR-031, FR-032 (findings, follow-ups)                           | T064, T066             |
| SC-001, SC-004 (answer quality, latency)                        | T063, T038             |
| SC-002, SC-003 (eval sets)                                      | T038, T049             |
| SC-005, SC-008 (fallback speed, no slowdown)                    | T053, T055             |
| SC-006, SC-007 (privacy, action safety)                         | T058, T040             |
| SC-009 (decidable findings)                                     | T064                   |

## Implementation Strategy

### MVP first (User Story 1)

1. Phases 1–2, then Phase 3. Stop at the US1 checkpoint and demo the Settlement → Connections scenario behind the flag.
2. This alone answers the issue's core question: does a grounded, screen-aware answer work?

### Incremental delivery

1. Add US2 (highlight) — the demonstration of a safe action.
2. Add US3 and US4 (honest failure and offline) — required before anyone outside the team uses it.
3. US5 tests can be added alongside each story but must be green before the spike is judged.
4. Polish: findings and follow-ups are the spike's real deliverable (SC-009).

### Decision gates inside the spike

- After T038: look at recall@3 and the lexical-vs-embeddings numbers. If lexical+context recall@3 < 0.85, raise D1/Vectorize adoption to the top of the follow-up list (research D1 triggers).
- After US1: check the live latency against the 8 s p90 target before investing in polish; if missed, record streaming as the first follow-up.

## Notes

- Commit only with tests for the affected behaviour, after the Fallow gate (T071). Create a PR only after T070–T072 pass.
- Do not create GitHub follow-up issues or change issue #3427's checklist without the user's approval (outward-facing).
- SC-010 (5-person usability check) is deliberately not evaluated in this spike; record it as deferred in `findings.md`.
- No image assets are created; nothing goes to R2.
