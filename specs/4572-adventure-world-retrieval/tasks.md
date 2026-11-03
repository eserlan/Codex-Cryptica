# Tasks: World-grounded Adventure interactions (#4623)

## Phase 1 — Setup

- [x] T001 Verify the production entry-point inventory against current code and update specs/4572-adventure-world-retrieval/contracts/grounding.md, including background generation and worker/repair paths.
- [x] T002 Run architecture guards for planned source files with bunx fallow and record any boundary constraints in specs/4572-adventure-world-retrieval/research.md.

## Phase 2 — Foundation

- [x] T003 Write failing pure-policy tests in packages/adventure-engine/src/grounding.test.ts for source deduplication, priority, successful empty results, a 24-record hydration cap and required-anchor overflow; cover interaction with the existing context-budget.ts allocator.
- [x] T004 Implement plain purpose/envelope/outcome types and candidate limits in packages/adventure-engine/src/grounding.ts, reuse packages/adventure-engine/src/context-budget.ts for final allocation, and export through packages/adventure-engine/src/index.ts; no persisted schema change.

## Phase 3 — US1: Every response consults the world

**Independent test:** Canonical settlement/NPC facts and provisional discoveries reach opening/action/roll/background provider requests through direct and worker routes.

- [x] T005 [US1] Add failing positive and bypass-negative boundary tests in apps/web/src/lib/services/adventure/adventure-grounding-service.test.ts; assert injected transports cannot run before preparation succeeds.
- [x] T006 [US1] Add failing purpose retrieval tests in apps/web/src/lib/services/adventure/adventure-context-service.test.ts covering relationships, available scenario/provisional knowledge, required missing anchors and bounded body loading.
- [x] T007 [US1] Implement purpose-aware lookup in apps/web/src/lib/services/adventure/adventure-context-service.ts and DI coordinator in apps/web/src/lib/services/adventure/adventure-grounding-service.ts; resolve afresh per interaction and use existing engine policy.
- [x] T008 [US1] Wire coordinator around injected/default transport at apps/web/src/lib/stores/oracle/adventure-runtime.ts around the injected/default transport from adventure-dependencies.ts and adventure-generation.svelte.ts; migrate adventure-opening.ts and adventure-actions.ts to intent inputs and remove duplicate retrieval.
- [x] T009 [US1] Add failing original-action/unchanged-roll tests in apps/web/src/lib/stores/oracle/tests/adventure-manager.test.ts, then migrate apps/web/src/lib/stores/oracle/adventure-rolls.ts to shared retrieval using persisted roll origin/outcome.
- [x] T010 [US1] Add background context delivery and failed-preparation tests in apps/web/src/lib/stores/oracle/tests/adventure-background.test.ts (create if absent), then adapt adventure-background.ts and AdventureSurface.svelte background generator registration to shared context; audit campaign request building for unprojected duplicate context. Grounding failure blocks dispatch; optional rumour-generation failure after successful grounding retains the local fallback.
- [x] T011 [US1] Extend apps/web/src/lib/stores/oracle/tests/adventure-generation.test.ts to inspect direct/worker payload parity and cancellation before dispatch, using stubbed providers and no live AI.

## Phase 4 — US2: Correct knowledge and time

**Independent test:** Secret motives and future succession retain classifications; changed context never reuses stale provider knowledge.

- [x] T012 [P] [US2] Add temporal/disclosure/contradiction and canonical-precedence cases in apps/web/src/lib/services/adventure/adventure-context-service.test.ts across opening/action/roll/background purposes.
- [x] T013 [US2] Apply existing temporal/disclosure projection consistently in apps/web/src/lib/services/adventure/adventure-context-service.ts and packages/adventure-engine/src/prompt.ts; retain uncertainty and keep player projection separate.
- [x] T014 [US2] Add failing retained-interaction invalidation and repair-snapshot tests in packages/ai-engine/src/adventure-turn-generation.service.test.ts, then clear retained interaction before each new interaction in adventure-turn-generation.service.ts; preserve existing provider responsibility and extracted coverage.

## Phase 5 — US3: Recovery without state loss

**Independent test:** Failed/cancelled/stale retrieval invokes no provider, retains drafts and supplied rolls, and retry commits at most once.

- [x] T015 [US3] Add failure/cancellation/stale-session/retry tests in apps/web/src/lib/services/adventure/adventure-grounding-service.test.ts and apps/web/src/lib/stores/oracle/tests/adventure-manager.test.ts, including successful-empty versus storage failure and AI-disabled/read-only inspection.
- [x] T016 [US3] Implement safe outcome/error mapping and post-await freshness/abort checks in apps/web/src/lib/services/adventure/adventure-grounding-service.ts and apps/web/src/lib/stores/oracle/adventure-runtime.ts using existing authority/commit lifecycle; preserve drafts, no rerolls or speculative writes.
- [x] T017 [US3] Update apps/web/src/lib/content/help/adventure-mode.md with existing-world grounding, provisional uncertainty and recoverable lookup retry instructions.

## Phase 6 — Cross-cutting validation

- [x] T018 Add a deterministic 10,000-record retrieval and bounded-body-read fixture in apps/web/src/lib/services/adventure/adventure-context-service.test.ts; record safe latency/count evidence in specs/4572-adventure-world-retrieval/quickstart.md. Extend the existing 30-turn fixture with revisit, roll and reload checks; find its actual path before editing. Assert deterministic projections separately from adversarial model-output evaluation.
- [x] T019 Validate contracts/grounding.md inventory against every production play AI dispatch; run impacted lint/tests, affected-workspace typechecks, Fallow and codex-review per specs/4572-adventure-world-retrieval/quickstart.md before PR handoff.

## Dependencies and parallel opportunities

T001–T004 → US1 (T005–T011) → US2 (T012–T014) → US3 (T015–T017) → T018–T019. Tests precede the implementation they verify. T012 can be authored alongside T014 after US1 stabilises because they touch separate test files; T017 can proceed alongside recovery work. Avoid parallel edits to shared context/coordinator files.

## Implementation strategy

MVP: mandatory preparation for all existing calls, including background and dice resolution. Complete disclosure/temporal parity, retained-context safety and recoverability before shipping. Future AI features consume the contract; this task list does not implement rumours, multi-scenario play, entity materialisation, caching or simulation.

## Implementation evidence

The runtime owns the shared coordinator so it can verify Vault/session/revision and control before dispatch and save. Background requests use adventure-background-request.ts instead of the general campaign builder, preventing unprojected present-day samples. Grounding failures preserve an incomplete opening with a retry action; optional generation failure after successful grounding retains local fallback. Typed safe failure codes distinguish lookup, unavailable source and budget.

Tests: src/grounding.test.ts (engine); adventure-grounding-service.test.ts and adventure-context-service.test.ts (local preparation); adventure-background.test.ts (separate AI path); adventure-generation.test.ts (direct/worker parity); adventure-grounding-continuity.test.ts plus packages/adventure-engine/tests/emergent-30-turn.test.ts (sustained play). See quickstart.md for measured evidence and validation.
