# Tasks: Connection Proposal Limit Check

**Input**: Design documents from `/specs/111-proposal-limit-check/`
**Prerequisites**: plan.md (required), spec.md (required)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the branch structure.

- [x] T001 Verify feature branch `111-proposal-limit-check` is active.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None, no new database schemas or services are needed. We use the existing `proposerStore` and `DetailProposals` component.

- [x] T002 Ensure project builds and existing test suite is fully functional.

## Phase 3: User Story 1 - Auto-proposal Suppression (Priority: P1) 🎯 MVP

**Goal**: Suppress automatic background proposer analysis when viewing an entity if the active entity has > 4 total connections (outbound + inbound).

**Independent Test**: Load an entity with more than 4 total connections. Verify that no automatic proposer timeout triggers.

### Tests for User Story 1

- [x] T003 [P] [US1] Write unit tests in `apps/web/src/lib/components/entity-detail/proposals/DetailProposals.test.ts` to assert that auto-proposing is skipped when total connection count (outbound + inbound) > 4.

### Implementation for User Story 1

- [x] T004 [US1] Modify `apps/web/src/lib/components/entity-detail/proposals/DetailProposals.svelte` to check total connection count (outbound + inbound) and only trigger auto-proposer if count <= 4.
- [x] T005 [US1] Load entity proposals reactively in an effect in `DetailProposals.svelte` when `activeEntityId` changes.
- [x] T014 [US1] Prevent auto-proposer execution if connection count drops below 5 mid-session (non-reactive suppression).

---

## Phase 4: User Story 2 - Manual Scan Trigger (Priority: P1)

**Goal**: Render a manual "Look for Connection Proposals" button in the standard Detail view and Zen mode when auto-proposing is suppressed.

**Independent Test**: Click the manual button for an entity with > 4 total connections, verify analysis triggers and updates proposals.

### Tests for User Story 2

- [x] T006 [P] [US2] Write unit tests in `DetailProposals.test.ts` to verify manual button renders, shows loading/disabled state when analyzing, and triggers proposer store analysis.

### Implementation for User Story 2

- [x] T007 [US2] Render manual button at the bottom of the active proposals list in `DetailProposals.svelte` when total connection count > 4.
- [x] T008 [US2] Connect manual button click to `proposerStore.analyzeEntityById` with appropriate arguments and bind disabled/loading state to `proposerStore.isEntityAnalyzing`.
- [x] T015 [US2] Trigger standard toast error notification on manual API scan failure, and verify with unit tests.

---

## Phase 5: User Story 3 - State Synchronization (Priority: P2)

**Goal**: Keep all global/local proposal lists and caches synchronized on all store mutations.

**Independent Test**: Run unit tests in `proposer.svelte.test.ts` to assert global proposal reload.

### Tests for User Story 3

- [x] T009 [P] [US3] Add unit tests in `apps/web/src/lib/stores/proposer.svelte.test.ts` to verify `VAULT_SWITCHED` event and mutation methods trigger global proposals reload.

### Implementation for User Story 3

- [x] T010 [US3] Subscribe to `VAULT_SWITCHED` in `proposerStore`'s constructor.
- [x] T011 [US3] Add `await this.loadGlobalProposals()` to all state-changing operations in `proposer.svelte.ts`.

---

## Phase 6: Polish & Verification

**Purpose**: Cleanup, linting, and final validation.

- [x] T012 Run full test suite using `bun run test --run` to ensure all tests pass.
- [x] T013 Run lint checks with `bun run lint` to verify clean code styling.
