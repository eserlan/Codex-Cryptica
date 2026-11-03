# Implementation review: #4623

## Scope and result

General code review and the repository codex-review checks were applied to the final changes. No unresolved correctness findings remain. Source preparation is installed in AdventureRuntime before the existing direct/worker split; the background generator shares that preparation through a separate bounded request adapter. No new database, model pass, canonical write or public route was added.

## Findings fixed during review

| Finding                                                                            | Fix                                                                                                                                                                     | Discriminating evidence                                                                   |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Opening/action/roll callers could retrieve inconsistently or twice                 | Runtime-installed coordinator overwrites caller excerpts; callers no longer perform retrieval                                                                           | Grounding boundary tests plus manager opening/action retrieval call counts                |
| Background builder could inject present-day sampled lore or swallow lookup failure | Build the rumour request exclusively from prepared sources; ground before entering the optional generator fallback                                                      | Background source-delivery, failed-lookup and cancellation tests                          |
| Resetting provider history could lose roll action/stakes                           | Carry the persisted pending roll in prompt state; retrieval uses its originating action and preserves its supplied outcome                                              | Grounding roll-state test, manager failed-roll/retry test and pending-roll reload fixture |
| Late lookup/save results could cross session or Vault scope                        | Verify Vault ID, session ID, revision, read-only state and control around asynchronous preparation and persistence                                                      | Same-ID/different-Vault manager test; runtime lease-change and late-save tests            |
| A failed opening could disappear or become unrecoverable after reload              | Retain the same incomplete record on grounding failure; expose Retry opening independently of transient errors and block premature action submission                    | Opening same-record retry test and composer reload/read-only tests                        |
| Temporal reranking could hydrate a second unbounded candidate set                  | Keep final resolution within initially hydrated IDs; defer new candidates                                                                                               | Temporal reranking/body-read test and 10,000-record fixture                               |
| Future/hidden/undated context could be confused with player knowledge              | Preserve period labels, GM-only lore, hidden identities and uncertain relationship provenance; use GM context for retrieval without changing player preview projections | Context temporal/hidden opening/action cases and existing temporal preview regressions    |
| Newly introduced complexity/duplication                                            | Separate source search, budgeting, candidate selection and recovery responsibilities                                                                                    | Fallow new-only audit passes                                                              |

## Validation evidence

- `bun run test:changed`: affected root, web, adventure-engine and ai-engine tests pass. Additional focused temporal/preview, workflow, source-budget and boundary coverage tests pass.
- Web-scoped `bunx svelte-check --tsconfig ./tsconfig.json --threshold error`: zero errors; existing warnings remain.
- `bunx tsc --noEmit --project packages/ai-engine/tsconfig.json`: passes and traverses the imported adventure-engine contracts.
- `bun run lint:changed`: ESLint, formatting and changed-line UI checks pass. Content checks report no deterministic discovery errors.
- `bun run --cwd apps/web build`: completes, including the compiled-runes worker check. Eight unrelated marketing pages report skipped critical-CSS inlining; the build exits successfully.
- `bunx fallow audit --format json --quiet --explain --gate-marker agent`: passes. Its low-confidence `overflow-y-auto` warning points to an unchanged composer utility; the class exists in compiled Tailwind CSS and was verified rather than replaced.
- The 10,000-record fixture returned 14 sources with 14 unique bodies, 28 body reads and 3,347 serialized source characters; observed local lookup time was 22–33 ms.
- The grounding service has 94.91% statement and 83.78% branch coverage in the final scoped coverage run.

## Constitution and delivery checks

Library-first source contracts/policy remain in adventure-engine; app services retain Vault orchestration with constructor injection. Required source limits run before hydration; the existing prompt allocator remains authoritative. No new rune-bearing module enters a worker. Provider generation remains the responsibility of the existing large service, with only request-history reset added there. New UI uses native buttons and existing semantic tokens; changed-line checks cover the theme set. Help documents grounding and retry. No generated marketing assets or build-generated tracked content remain in the changes.

No live-model qualitative evaluation or remote staging walkthrough was performed. These deterministic checks establish source delivery, projection and commit safety; they do not guarantee model obedience or atomic Vault snapshot isolation. The optional automatic commit hooks were skipped during implementation; commits and PR preparation follow explicit user instruction.

## Final completion audit

All tasks T001–T019 are checked. The spec requirements map to evidence as follows:

- FR-001/FR-010: runtime source-delivery tests and the audited production call-site inventory; the evaluation harness is explicitly excluded from production play.
- FR-002: canonical/current-location anchor tests, graph relationship test, persisted pending-roll state, and the 30-action provisional-discovery/reload fixture.
- FR-003: temporal/hidden source tests, source precedence prompt, unchanged player preview/transcript projections and existing secrecy regressions.
- FR-004: candidate-cap and required-overflow tests, existing prompt allocator tests, temporal reranking bound and the 10,000-record fixture.
- FR-005/FR-006: safe typed failure tests, empty lookup, missing sources, cancellation, stale Vault/session scope, retained opening/retry, pending-roll retry and late-save tests.
- FR-007/FR-008: repeated fresh-lookup assertions, before/after asynchronous scope checks, direct/worker parity, provider-history reset and same-request response-repair tests.
- FR-009: source adapters use local Vault/search; safe error/projection tests, existing AI policy gates and read-only/disabled action tests.
- SC-001–SC-004: production-path coverage, 30-turn/30-action fixtures, retry assertions and the recorded large-Vault measurements above.

Architecture guards passed for all 16 changed production modules. Implementation validation completed before PR preparation. Generated build content was restored. All implementation review findings are fixed or, for the verified Tailwind class warning, disproven by the existing source and compiled CSS.
