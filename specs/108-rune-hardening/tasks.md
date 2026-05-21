# Implementation Tasks: Svelte 5 Rune Hardening & Performance

**Feature**: Spec 108 - Svelte 5 Rune Hardening  
**Plan**: [plan.md](./plan.md)  
**Spec**: [spec.md](./spec.md)

## Phase 1: Setup

- [ ] T001 Initialize hardening branch and verify test baseline with `pnpm test`
- [ ] T002 Identify all `svelte/store` imports in `apps/web/src` for progress tracking

## Phase 2: Foundational

- [ ] T003 Convert `apps/web/src/lib/stores/debug.svelte.ts` to pure Runic class using constructor-based DI (remove `writable`)
- [ ] T004 [P] Convert `apps/web/src/lib/stores/guest.ts` to `guest.svelte.ts` with `$state` properties and constructor-based DI
- [ ] T005 [P] Create Runic utility for event bus subscriptions that auto-cleans up via `$effect` in `apps/web/src/lib/stores/vault/events.ts`

## Phase 3: User Story 1 - Smooth Application Performance [US1]

**Goal**: Eliminate auto-subscription overhead in high-traffic UI components.

**Independent Test**: Chrome Performance profile shows zero long tasks (>50ms) during rapid vault navigation.

- [ ] T006 [P] [US1] Refactor `apps/web/src/lib/components/GraphView.svelte` to use direct signal access instead of `$store`
- [ ] T007 [P] [US1] Refactor `apps/web/src/lib/components/MarkdownEditor.svelte` to use direct signal access
- [ ] T008 [P] [US1] Refactor `apps/web/src/lib/components/EntityDetailPanel.svelte` to use direct signal access
- [ ] T009 [US1] Verify interaction latency in `apps/web/src/lib/components/search/SearchModal.svelte` after removing auto-subscriptions

## Phase 4: User Story 2 - Data Integrity & Stability [US2]

**Goal**: Ensure async data consistency via snapshots.

**Independent Test**: AI-generated content correctly populates entities without "ghost" data from concurrent edits.

- [ ] T010 [P] [US2] Integrate `$state.snapshot` in `apps/web/src/lib/services/ai.ts` before dispatching prompt requests
- [ ] T011 [P] [US2] Integrate `$state.snapshot` in `apps/web/src/lib/services/search.ts` before worker transfers
- [ ] T012 [P] [US2] Integrate `$state.snapshot` in `apps/web/src/lib/services/node-merge.service.ts`
- [ ] T013 [US2] Add unit tests in `apps/web/src/lib/services/ai.test.ts` verifying snapshot integrity during async delays

## Phase 5: User Story 3 - Long-Term Session Reliability [US3]

**Goal**: Fix memory leaks and ensure proper resource cleanup.

**Independent Test**: Memory heap returns to baseline after 10 vault switches.

- [ ] T014 [P] [US3] Replace `onDestroy` with native `$effect` cleanup in `apps/web/src/lib/components/canvas/CanvasWorkspace.svelte`
- [ ] T015 [P] [US3] Replace `onDestroy` with native `$effect` cleanup in `apps/web/src/lib/components/graph/Minimap.svelte`
- [ ] T016 [P] [US3] Fix identified leak in `apps/web/src/lib/stores/search.svelte.ts` (vault-switched listener) using Runic lifecycle
- [ ] T017 [US3] Verify guest roster cleanup in `apps/web/src/lib/cloud-bridge/p2p/guest-service.ts` using Runic signals

## Phase 6: Polish & Cross-cutting

- [ ] T018 Global audit: Ensure zero `from "svelte/store"` remain in `apps/web/src`
- [ ] T019 Perform functional parity smoke tests against staging branch to verify zero behavioral regressions (FR-005)
- [ ] T020 Run final full-suite `pnpm test` and `pnpm run lint`
- [ ] T021 Update `docs/STYLE_GUIDE.md` if any new Runic patterns were established as standards

## Dependencies

1. Foundational tasks (T003-T005) MUST be completed before User Story phases.
2. Store conversions MUST precede component refactors that depend on them.
3. US1, US2, and US3 can be worked on in parallel once Foundational is complete.

## Implementation Strategy

1. **MVP**: Complete US1 (Performance) for the core navigation loop (Graph + Editor) to demonstrate immediate value.
2. **Incremental**: Harden async boundaries (US2) then cleanup lifecycles (US3).
3. **Safety**: Each task MUST be followed by its corresponding unit test verification.
