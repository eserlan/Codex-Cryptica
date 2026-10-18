# Tasks: Solo Adventure Mode Foundation

**Input**: Design documents from `/specs/160-solo-adventure-mode/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required by the project constitution and feature success criteria. For every behavior slice, write the named test first, verify that it fails for the expected reason, then implement.

**Organization**: Tasks are grouped by user story so each story has a concrete independent test. Setup and Foundational phases contain only shared prerequisites.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after its phase prerequisites because it touches different files and does not depend on another incomplete task in the same group.
- **[Story]**: Maps the task to a user story from `spec.md`.
- Every task names its exact target path.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the standalone engine package and test fixtures without implementing feature behavior.

- [x] T001 Create the `@codex/adventure-engine` workspace package with the existing `zod` dependency, scripts, exports, and source/test directories in `packages/adventure-engine/package.json` and `packages/adventure-engine/src/index.ts`
- [x] T002 Add `@codex/adventure-engine` workspace dependencies to `packages/ai-engine/package.json` and `apps/web/package.json`, then refresh `bun.lock`
- [ ] T003 [P] Create deterministic session, proposal, source, clock, and ID fixture builders in `packages/adventure-engine/tests/fixtures.ts`
- [ ] T004 [P] Create shared app-side adventure test doubles for repository, generation, context, dice, and lease ports in `apps/web/src/lib/services/adventure/adventure-test-fixtures.ts`

**Checkpoint**: The empty engine package imports from the AI and web workspaces and all fixture modules type-check.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the versioned model and atomic transition/storage boundaries required by every user story.

**⚠️ CRITICAL**: No user-story implementation begins until this phase passes its focused tests.

- [x] T005 [P] Write failing schema tests for session versioning, exactly one player character, stable IDs, field/collection limits, the 32,000-character aggregate state ceiling, archive immutability, player-safe projections, and incompatible input in `packages/adventure-engine/tests/schemas.test.ts`
- [x] T006 [P] Write failing state-machine tests for valid transitions and rejected concurrent, archived, stale, and duplicate inputs in `packages/adventure-engine/tests/state-machine.test.ts`
- [x] T007 [P] Write failing reducer tests for immutable inputs, deterministic patches, preserved unrelated facts, contiguous turns, and atomic rejection in `packages/adventure-engine/tests/reducer.test.ts`
- [ ] T008 [P] Write failing repository contract tests for create/load/save, expected revision, serialized writes, failed-close rollback, vault/path validation, and safe list DTOs in `apps/web/src/lib/services/adventure/adventure-session-repository.test.ts`
- [x] T009 Define all persisted and ephemeral domain types, discriminated proposal/result types, safe error categories, and injected clock/ID interfaces in `packages/adventure-engine/src/types.ts`
- [x] T010 Write failing authority tests for atomic acquisition, monotonic fencing, renewal, expiry, verification immediately before save, stale-owner rejection, and release with an injected clock in `apps/web/src/lib/services/adventure/adventure-control-lease.test.ts`
- [x] T011 Implement the foundational `AdventureControlAuthority` over an atomic Dexie `appSettings` transaction with constructor DI and a production singleton in `apps/web/src/lib/services/adventure/adventure-control-lease.ts`
- [x] T012 Implement versioned Zod session, bounded patch/roll/source-reference/structured-proposal schemas, aggregate state-budget validation, and player-safe projections in `packages/adventure-engine/src/schemas.ts`
- [x] T013 Implement the explicit adventure lifecycle and submission guards in `packages/adventure-engine/src/state-machine.ts`
- [x] T014 Implement immutable collection patching, idempotency checks, revision sequencing, and candidate-session reduction in `packages/adventure-engine/src/reducer.ts`
- [x] T015 Implement and export the OPFS repository class and production singleton with `.codex/adventures/<sessionId>.json`, optimistic revisions, per-session write serialization, persist-before-publish semantics, and constructor DI in `apps/web/src/lib/services/adventure/adventure-session-repository.ts`
- [x] T016 Export the engine schemas, reducer, state machine, projections, types, and contracts from `packages/adventure-engine/src/index.ts`

**Checkpoint**: A complete candidate session can be validated, saved once, loaded, and projected safely without Svelte or AI dependencies.

---

## Phase 3: User Story 1 - Start and Play a Grounded Adventure (Priority: P1) 🎯

**Goal**: Start with one canonical or provisional player character, retain selected anchors, generate grounded GM turns, preserve player agency, and keep ordinary Oracle chat isolated.

**Independent Test**: Start in a populated vault with a premise and anchors, submit several actions, and verify grounded NPC/world consequences, actionable endings, provisional fallback material, player agency, and zero Adventure context in normal Oracle chat.

### Tests for User Story 1

- [ ] T017 [P] [US1] Write failing context-budget and prompt contract tests for the 96,000-character total and 16k/36k/24k/12k/8k section ceilings, complete non-truncated state, bounded excerpts, player agency, canonical precedence, and provisional labeling in `packages/adventure-engine/tests/prompt.test.ts`
- [x] T018 [P] [US1] Write failing structured-generation adapter tests for `operation`/`messages`/JSON Schema forwarding, absence of Interactions `input`/`previous_interaction_id`/`store` fields, cancellation, and provider errors in `packages/ai-engine/src/adventure-turn-generation.service.test.ts`
- [ ] T019 [P] [US1] Write failing canonical context tests for selected anchors, action-relevant retrieval, live Character resolution, empty-vault fallback, and unavailable records in `apps/web/src/lib/services/adventure/adventure-context-service.test.ts`
- [ ] T020 [P] [US1] Write failing manager tests for start/opening/action flows, one character, offline dispatch prevention with preserved input, ordinary failures, and no normal chat/discovery writes in `apps/web/src/lib/stores/oracle/tests/adventure-manager-start.test.ts`
- [ ] T021 [P] [US1] Write failing component tests for semantic start fields, visible labels, validation-after-interaction, canonical/provisional character choice, anchors, disclosure text, keyboard flow, and double-submit prevention in `apps/web/src/lib/components/oracle/adventure/AdventureStart.test.ts`
- [ ] T022 [P] [US1] Write failing normal/adventure/sequential-session isolation tests, including clearing normal history while Adventure remains active and ending Adventure while normal chat remains open, in `packages/oracle-engine/src/adventure-isolation.test.ts`

### Implementation for User Story 1

- [x] T023 [US1] Implement the 96,000-character deterministic prompt allocator, section ceilings, non-truncated complete-state rule, overflow diagnostics, and provider-neutral Adventure instructions in `packages/adventure-engine/src/context-budget.ts` and `packages/adventure-engine/src/prompt.ts`
- [x] T024 [P] [US1] Implement and export the DI-ready `AdventureTurnGenerationService` class and production singleton over the stateless `structured-generation` operation request with `messages` and schema validation, no Interactions fields, and redacted errors in `packages/ai-engine/src/adventure-turn-generation.service.ts`
- [x] T025 [P] [US1] Implement and export the live-anchor/action-relevant context service class and production singleton with constructor DI in `apps/web/src/lib/services/adventure/adventure-context-service.ts`
- [ ] T026 [US1] Change ordinary Oracle retained context to the explicit `oracle:<vaultId>:normal` key and preserve existing chat behavior in `packages/oracle-engine/src/oracle-generator.ts`
- [x] T027 [US1] Add a dedicated `generateAdventureTurn` worker API that bypasses normal chat history, proactive discovery, drafting, and automatic archival in `apps/web/src/lib/workers/oracle.worker.ts`
- [x] T028 [US1] Implement and export the `AdventureManager` class with start, opening, action, cancellation, offline/reconnect retry, vault-switch, foundational authority guards, `$state.raw`, `$derived`, constructor DI, and persist-before-publish orchestration in `apps/web/src/lib/stores/oracle/adventure-manager.svelte.ts`
- [x] T029 [US1] Construct and expose the production-default `AdventureManager` instance without adding domain logic to the Oracle facade in `apps/web/src/lib/stores/oracle.svelte.ts` and `apps/web/src/lib/stores/oracle/types.ts`
- [x] T030 [P] [US1] Implement the accessible start flow using native form controls, semantic theme tokens, Iconify utilities, clear validation, and the owner-hidden-state disclosure in `apps/web/src/lib/components/oracle/adventure/AdventureStart.svelte`
- [x] T031 [P] [US1] Implement the active play transcript, action form, busy/cancel/offline/reconnect-retry states, preserved draft, and actionable focus/status announcements in `apps/web/src/lib/components/oracle/adventure/AdventurePlay.svelte`
- [x] T032 [US1] Add Adventure entry and mode switching to the sidebar, window, and standalone Oracle surfaces in `apps/web/src/lib/components/oracle/OracleSidebarPanel.svelte`, `apps/web/src/lib/components/oracle/OracleWindow.svelte`, and `apps/web/src/routes/(app)/oracle/+page.svelte`
- [ ] T033 [US1] Add the populated-vault, provisional-character, player-agency, and normal-chat-isolation Playwright journey in `apps/web/tests/adventure-mode-start.spec.ts`

**Checkpoint**: User Story 1 starts and plays independently with an injected repository and real structured generation, while normal Oracle behavior remains isolated.

---

## Phase 4: User Story 2 - Maintain Coherent Visible and Hidden State (Priority: P1) 🎯

**Goal**: Keep compact visible continuity and separate owner-hidden GM state, reveal only named secrets, reject unsafe/invalid turns atomically, and keep inventions provisional.

**Independent Test**: Run the scripted 30-turn state/secret fixture and verify all visible facts persist until changed, no unrevealed canary reaches a player surface, interrupted or invalid turns change nothing, and provisional inventions never mutate vault canon.

### Tests for User Story 2

- [ ] T034 [P] [US2] Write failing hidden-state tests for explicit reveal IDs, unrelated-secret preservation, normalized leakage detection across every player-facing field, and redacted diagnostics in `packages/adventure-engine/tests/hidden-state.test.ts`
- [ ] T035 [P] [US2] Write failing 30-turn reducer fixtures for location, objective, clue, active-character, relationship, hidden-thread continuity, consolidation near the state ceiling, and atomic `state-budget-exceeded` rejection in `packages/adventure-engine/tests/continuity.test.ts`
- [ ] T036 [P] [US2] Write failing manager tests for interrupted, cancelled, offline, incomplete, invalid, canon-conflicting, authority-lost, save-lost, and successful commit paths in `apps/web/src/lib/stores/oracle/tests/adventure-manager-commit.test.ts`
- [ ] T037 [P] [US2] Write failing canonical/provisional boundary tests proving no entity create/update/connect/delete or discovery event occurs in `apps/web/src/lib/services/adventure/adventure-canon-boundary.test.ts`
- [ ] T038 [P] [US2] Write failing player-facing state component tests for safe fields, explicit reveals, failure recovery, and absence of hidden object data in `apps/web/src/lib/components/oracle/adventure/AdventureStateSummary.test.ts`

### Implementation for User Story 2

- [ ] T039 [US2] Implement hidden secret/thread transitions, explicit reveal handling, normalized canary scanning, and safe findings in `packages/adventure-engine/src/hidden-state.ts`
- [x] T040 [US2] Integrate hidden-state, canonical-conflict, narration/patch consistency, and provisional-fact validation into the atomic reducer in `packages/adventure-engine/src/reducer.ts`
- [x] T041 [US2] Extend prompt construction with a separately labelled GM-only block and player-safe transcript projection while excluding unrevealed secrets from all visible blocks in `packages/adventure-engine/src/prompt.ts`
- [ ] T042 [US2] Complete `AdventureManager` commit ordering so validation, foundational authority verification, revision check, repository save, and reactive publication are atomic and failures retain input plus the prior session in `apps/web/src/lib/stores/oracle/adventure-manager.svelte.ts`
- [x] T043 [US2] Implement the compact visible situation/objective/NPC/clue/relationship surface with keyed rendering and no hidden-state prop in `apps/web/src/lib/components/oracle/adventure/AdventureStateSummary.svelte`
- [ ] T044 [US2] Add deterministic 30-turn continuity, secret-canary, interruption, canon-conflict, and provisional-no-write acceptance fixtures in `apps/web/src/tests/ai/adventure-continuity.svelte.spec.ts`
- [ ] T045 [US2] Write failing pure agency/secrecy scorer tests and provider-runner contract tests, including per-provider result records and the 95% agency threshold, in `packages/adventure-engine/tests/evaluations/agency-and-secrecy.test.ts` and `apps/web/src/tests/ai/adventure-provider-evaluation.spec.ts`
- [x] T046 [US2] Implement and export deterministic agency/secrecy scorers in `packages/adventure-engine/src/evaluations.ts` and `packages/adventure-engine/src/index.ts`, plus a constructor-injected app-side runner class and production singleton that sends every dataset case through `AdventureTurnGenerationService` for each configured structured-output provider and records provider plus aggregate scores in `apps/web/src/lib/services/adventure/adventure-evaluation-runner.ts`

**Checkpoint**: User Stories 1 and 2 form the minimum safe MVP: a playable loop whose state, secrecy, canon boundary, and failed-turn behavior are independently verified.

---

## Phase 5: User Story 3 - Leave, Resume, and Archive Safely (Priority: P2)

**Goal**: Resume the latest durable state across reload/backup, enforce one effective active adventure and one controlling tab, archive safely, and preserve unreadable or conflicting records.

**Independent Test**: Play and leave, reload, restore a backup in a clean profile, continue the exact committed state, transfer control between two tabs without duplication, archive the session, and read its player transcript without modification.

### Tests for User Story 3

- [ ] T047 [P] [US3] Extend repository tests for archive listing, one-active selection, duplicate-active conflict preservation, corrupt/partial/newer files, missing sources, and 25-session ordering in `apps/web/src/lib/services/adventure/adventure-session-repository.test.ts`
- [ ] T048 [P] [US3] Write failing lifecycle-coordinator tests for heartbeat cadence, observer refresh notifications, page-hide release, expiry takeover, and delegation of every grant/renew/verify decision to the foundational authority in `apps/web/src/lib/services/adventure/adventure-control-coordinator.test.ts`
- [ ] T049 [P] [US3] Write failing resume/archive manager tests for refresh, pending mutation recovery, offline-readable sessions with preserved drafts, existing-active choices, duplicate-active recovery conflicts, unavailable references, unreadable records, archive immutability, and takeover reload in `apps/web/src/lib/stores/oracle/tests/adventure-manager-resume.test.ts`
- [ ] T050 [P] [US3] Write failing archive component tests proving safe list projections, read-only transcript access, unreadable-record messaging, and no resume/edit controls in `apps/web/src/lib/components/oracle/adventure/AdventureArchive.test.ts`
- [ ] T051 [P] [US3] Write failing transcript component tests proving only committed player actions, safe setup narration, and completed Oracle narration render in `apps/web/src/lib/components/oracle/adventure/AdventureTranscript.test.ts`

### Implementation for User Story 3

- [ ] T052 [US3] Complete repository enumeration, safe metadata projection, archive mutation, newest-valid effective-active selection, read-only `duplicate-active-conflict` recovery entries, corruption preservation, and performance-bounded parallel reads in `apps/web/src/lib/services/adventure/adventure-session-repository.ts`
- [x] T053 [US3] Implement and export the `AdventureControlCoordinator` class and production singleton with a 3-second heartbeat, `BroadcastChannel` observer notifications, page-hide best-effort release, expiry takeover orchestration, constructor DI, and no authority decisions outside `AdventureControlAuthority` in `apps/web/src/lib/services/adventure/adventure-control-coordinator.ts`
- [ ] T054 [US3] Add online and offline resume, preserved reconnect drafts, leave, end confirmation, archive, read-only observer, coordinator renewal, takeover, and current-vault source refresh flows to `apps/web/src/lib/stores/oracle/adventure-manager.svelte.ts`
- [ ] T055 [P] [US3] Implement the safe read-only transcript projection surface in `apps/web/src/lib/components/oracle/adventure/AdventureTranscript.svelte`
- [ ] T056 [P] [US3] Implement the archive list, unreadable/conflict entries, and transcript selection without rename/delete/resume controls in `apps/web/src/lib/components/oracle/adventure/AdventureArchive.svelte`
- [ ] T057 [US3] Add continue/end/archive/read-only/take-control states and clear non-color ownership messaging to `apps/web/src/lib/components/oracle/adventure/AdventurePlay.svelte`
- [ ] T058 [US3] Verify `.codex/adventures` is included without special cases in supported portable and Drive backup/restore paths, adding regression coverage in `apps/web/tests/adventure-mode-backup.spec.ts`
- [ ] T059 [US3] Add reload, offline read with draft preservation, pending-state restore, duplicate-active recovery, archive-read-only, corrupt-record preservation, and unavailable-anchor Playwright journeys in `apps/web/tests/adventure-mode-resume.spec.ts`
- [ ] T060 [US3] Add a two-page Playwright race covering first-owner read/write, observer refresh, release, expiry takeover, rapid retry, and rejected late former-owner response in `apps/web/tests/adventure-mode-tabs.spec.ts`
- [ ] T061 [US3] Add standard-profile restore assertions proving a representative 100-turn active session with 25 archived sessions becomes readable in under 2 seconds, plus bounded list/write measurements, in `apps/web/tests/performance/adventure-mode.spec.ts`

**Checkpoint**: An adventure is durable vault content, only one tab can mutate it, archived sessions are safe and read-only, and damaged/newer files are preserved.

---

## Phase 6: User Story 4 - Resolve Meaningful Uncertainty (Priority: P3)

**Goal**: Ask for rolls only when stakes matter, persist the pause, accept authoritative player outcomes or predeclared Codex dice, and use each outcome once.

**Independent Test**: Resolve a certain action directly, pause a risky action with uncertainty/stakes, reload while waiting, resolve once by reported outcome and once by Codex dice bands, then dismiss another roll without changing committed state.

### Tests for User Story 4

- [ ] T062 [P] [US4] Write failing roll-schema/reducer tests for mutually exclusive proposal shapes, predeclared expression/bands, pending-roll persistence, outcome recording before resolution, `ready-to-resolve` reload, failure/offline retry with the same result, rejection of replacement/dismissal/reroll after recording, committed-turn copy-and-clear, and use-once idempotency in `packages/adventure-engine/tests/rolls.test.ts`
- [ ] T063 [P] [US4] Write failing manager tests for direct resolution, reported narrative/numeric outcomes, dice execution, persisted band mapping, mismatched reports, reload and offline retry after outcome recording, dismissal before recording, changed approach, cancellation, and use-once retry in `apps/web/src/lib/stores/oracle/tests/adventure-manager-rolls.test.ts`
- [ ] T064 [P] [US4] Write failing accessible component tests for uncertainty, stakes, expression, bands, report/roll/withdraw controls, focus movement, and status announcements in `apps/web/src/lib/components/oracle/adventure/AdventureRollPrompt.test.ts`

### Implementation for User Story 4

- [ ] T065 [US4] Implement roll proposal validation, pending-roll creation/dismissal, durable supplied-outcome recording with `awaiting-outcome`/`ready-to-resolve` status, rejection of replacement or dismissal after recording, and use-once committed-turn copy-and-clear reduction in `packages/adventure-engine/src/reducer.ts` and `packages/adventure-engine/src/schemas.ts`
- [ ] T066 [US4] Add action-versus-roll and roll-resolution prompt phases that require uncertainty, meaningful stakes, predeclared bands, and authoritative supplied outcomes in `packages/adventure-engine/src/prompt.ts`
- [ ] T067 [US4] Integrate reported outcomes and injected `dice-engine` execution by persisting the authoritative result before generation, interpreting its band once, and retrying the same recorded result after failure or reconnect in `apps/web/src/lib/stores/oracle/adventure-manager.svelte.ts`
- [ ] T068 [US4] Implement the semantic pending-roll form with report, basic Codex roll, withdraw/change-approach controls only before outcome recording, and a locked recorded-result/reconnect state afterward in `apps/web/src/lib/components/oracle/adventure/AdventureRollPrompt.svelte`
- [ ] T069 [US4] Add roll pause/reload/report/Codex-dice/dismiss/use-once plus offline-after-outcome retry Playwright coverage in `apps/web/tests/adventure-mode-rolls.spec.ts`
- [ ] T070 [US4] Add certain-versus-risky and authoritative-outcome evaluation fixtures consumed by the configured-provider evaluation runner in `packages/adventure-engine/tests/evaluations/roll-behavior.test.ts`

**Checkpoint**: Meaningful uncertainty pauses safely, every result is supplied by the player or existing dice engine, and no roll or state change is duplicated.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Complete documentation, accessibility, privacy, provider compatibility, performance, and repository-wide verification.

- [ ] T071 [P] Write failing help-content tests for the Adventure guide, first-use hint, plain-language terminology, and “hidden but not encrypted” disclosure in `apps/web/src/lib/config/help-content.test.ts`
- [ ] T072 [P] Add an axe/keyboard/responsive journey covering start, play, pending roll, archive, errors, and read-only states in `apps/web/tests/adventure-mode-a11y.spec.ts`
- [ ] T073 [P] Add structured-output contract fixtures for every enabled provider adapter proving the provider-neutral `operation`/`messages`/schema request and absence of Interactions `input`/`previous_interaction_id`/`store` fields in `apps/workers/oracle-proxy/src/llm/adventure-structured-output.test.ts`
- [ ] T074 Add the Adventure Mode help article and `FeatureHint` configuration in `apps/web/src/lib/config/help-content.ts`, then render the hint from `apps/web/src/lib/components/oracle/adventure/AdventureStart.svelte`
- [ ] T075 Audit Adventure logs, events, errors, worker messages, and normal chat inputs for prompt/hidden/provisional data leakage and add redaction regressions in `apps/web/src/lib/stores/oracle/tests/adventure-privacy.test.ts`
- [ ] T076 Run the Svelte autofixer on every new or modified `.svelte` file and resolve findings in `apps/web/src/lib/components/oracle/adventure/`, `apps/web/src/lib/components/oracle/OracleSidebarPanel.svelte`, `apps/web/src/lib/components/oracle/OracleWindow.svelte`, and `apps/web/src/routes/(app)/oracle/+page.svelte`
- [ ] T077 Verify all new Adventure UI uses Svelte 5 runes, native semantic controls, keyed lists, Tailwind 4 semantic tokens, Iconify classes, visible focus, 48px coarse-pointer targets, and reduced-motion behavior in `apps/web/src/lib/components/oracle/adventure/`
- [ ] T078 Add explicit standard-profile performance assertions for reducer p95 below 50 ms, visible busy feedback within 16 ms, non-model turn start below 2 minutes, and 100-turn restore below 2 seconds in `packages/adventure-engine/tests/performance.test.ts` and `apps/web/tests/performance/adventure-mode.spec.ts`, then run the scripted 30-turn, hidden-canary, agency, roll, isolation, offline, backup, and two-tab suite documented in `specs/160-solo-adventure-mode/quickstart.md`
- [ ] T079 Run `bun run lint:types`, `bun run lint`, `bun run test`, `bun run test:coverage`, and `bun run build`; keep `packages/adventure-engine` at or above 70% coverage and record any justified exceptions in `specs/160-solo-adventure-mode/quickstart.md`
- [ ] T080 Complete the manual acceptance walkthrough and confirm every stop-ship condition is absent, recording verification results in `specs/160-solo-adventure-mode/quickstart.md`
- [x] T081 Add active-session Focus Mode with an optional browser fullscreen action, a collapsible utility rail, Escape-preserving Focus Mode behavior, user help, and focused success/failure component tests in `apps/web/src/lib/components/oracle/adventure/AdventureFocusPlay.svelte`, `apps/web/src/lib/components/oracle/adventure/adventure-fullscreen.ts`, and `apps/web/src/lib/config/help-content.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks every user story.
- **User Story 1 (Phase 3)**: Depends on Foundational.
- **User Story 2 (Phase 4)**: Depends on Foundational for engine/repository contracts and integrates with the US1 manager/generation path. US2 engine tests can begin alongside US1 UI work, but the safe MVP checkpoint requires both.
- **User Story 3 (Phase 5)**: Depends on the Foundational authority and repository. Recovery and lifecycle-coordinator work can proceed alongside US1/US2; resume/archive UI integration depends on the US1 manager and play surface.
- **User Story 4 (Phase 6)**: Depends on the Foundational reducer and US1 generation loop; final UI integration also depends on US2 atomic commit behavior.
- **Polish (Phase 7)**: Depends on all stories selected for release.

### User Story Dependency Graph

```text
Setup -> Foundational -> US1 -----> US2 -----> Safe MVP
                        |           |
                        +---------->US4
                        |
                        +---------->US3

US1 + US2 + US3 + US4 -> Polish -> Phase 1 release
```

### Within Each User Story

- Write the listed tests first and verify their expected failure.
- Implement pure engine logic before browser adapters.
- Implement adapters before the reactive manager.
- Implement manager behavior before UI integration.
- Complete focused tests before Playwright/evaluation tasks.
- Do not expose candidate state until persistence succeeds.

### Parallel Opportunities

- T003 and T004 can run in parallel after the package skeleton exists.
- T005–T008 are independent failing-test tasks; T009 defines their types, T010 tests the authority contract, and T011–T016 implement the foundational contracts.
- US1 prompt, AI adapter, context adapter, UI tests, and isolation tests can be authored concurrently (T017–T022).
- US2 hidden-state, continuity, manager failure, canon-boundary, and component tests can be authored concurrently (T034–T038).
- US3 repository hardening, lifecycle-coordinator, manager, archive, and transcript tests can be authored concurrently (T047–T051); archive and transcript components can then be implemented concurrently (T055–T056).
- US4 engine, manager, and component tests can be authored concurrently (T062–T064).
- Help, accessibility, and provider-adapter tests can run concurrently (T071–T073).

---

## Parallel Example: User Story 1

```text
Task T017: Prompt and context-budget contract tests
Task T018: Structured-generation adapter tests
Task T019: Canonical context adapter tests
Task T020: AdventureManager start/action tests
Task T021: AdventureStart component tests
Task T022: Normal/adventure isolation tests
```

## Parallel Example: User Story 2

```text
Task T034: Hidden-state boundary tests
Task T035: Thirty-turn continuity fixtures
Task T036: Atomic failure/commit manager tests
Task T037: Canon/provisional boundary tests
Task T038: Visible state component tests
```

## Parallel Example: User Story 3

```text
Task T047: Repository recovery/archive tests
Task T048: Lease lifecycle-coordinator tests
Task T049: Resume/archive manager tests
Task T050: Archive component tests
Task T051: Transcript component tests
```

## Parallel Example: User Story 4

```text
Task T062: Roll schema/reducer tests
Task T063: Roll manager tests
Task T064: Roll component tests
```

---

## Implementation Strategy

### Safe MVP First (Both P1 Stories)

1. Complete Setup and Foundational.
2. Complete User Story 1 and validate grounded play plus conversation isolation.
3. Complete User Story 2 and validate atomic state, secrecy, canon, and failure behavior.
4. **STOP AND VALIDATE** the combined P1 checkpoint. Do not ship US1 alone because the hidden-state and atomic-commit guarantees are core safety boundaries.

### Incremental Delivery

1. Setup + Foundational establish the tested engine and durable commit seam.
2. US1 + US2 deliver the safe playable MVP.
3. US3 makes that MVP usable across sittings, backups, archives, and tabs.
4. US4 adds optional system-light uncertainty without changing the core loop.
5. Polish closes accessibility, help, privacy, provider, performance, and release gates.

### Parallel Team Strategy

After Foundational is complete:

- Track A: US1 generation/context/manager and play UI.
- Track B: US2 reducer/secrecy/canon evaluation.
- Track C: US3 persistence hardening and cross-tab lifecycle coordination over the foundational authority.
- Start US4 after the US1 generation and US2 reducer contracts stabilize.

---

## Notes

- `[P]` means no incomplete same-phase task writes the same target files.
- Tests precede implementation per the constitution's Red-Green-Refactor rule.
- Each behavior includes a success path and a meaningful failure, cancellation, or negative path.
- Keep `OracleStore` decomposed: Adventure domain behavior belongs in `AdventureManager`, never the facade.
- Adventure output must never invoke normal discovery, drafting, archive, or canonical entity mutation.
- Do not add Phase 2 archive management, canon write-back, a rules engine, multiplayer, or provider-retained Adventure threads.
- Commit only after a task or coherent Red-Green-Refactor group passes its focused checks.
