# Tasks: SPEC-105: P2P Transport Integration

**Input**: Design documents from `/specs/105-p2p-transport-integration/`
**Prerequisites**: plan.md (required), spec.md (required)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Infrastructure Setup & Enhancements

- [x] **T001** `[P]` **[US1]** Extend `apps/web/src/lib/cloud-bridge/p2p/connection-manager.svelte.ts` to support wildcard (`*`) subscribers in its message callbacks.
- [x] **T002** `[P]` **[US1]** Add a test for wildcard subscribers in `apps/web/src/lib/cloud-bridge/p2p/tests/connection-manager.test.ts`.

---

## Phase 2: Guest Service Refactoring

- [x] **T003** **[US1]** Refactor `apps/web/src/lib/cloud-bridge/p2p/guest-service.ts` to receive `PeerJSConnectionManager` via constructor dependency injection.
- [x] **T004** **[US1]** Replace legacy client transport hooks inside `P2PGuestService` with connection manager calls, binding the data stream via the `*` wildcard event subscriber.
- [x] **T005** **[US1]** Expose the connection manager's reactive state structure from `P2PGuestService`.

---

## Phase 3: Host Service Refactoring

- [x] **T006** **[US1]** Refactor `apps/web/src/lib/cloud-bridge/p2p/host-service.svelte.ts` to receive `PeerJSConnectionManager` via constructor dependency injection.
- [x] **X007** **[US1]** Expose the connection manager's reactive state structure from `P2PHostService`.

---

## Phase 4: UI Components & Visual Badges

- [x] **T008** **[US2]** Create the `apps/web/src/lib/components/layout/P2PStatus.svelte` status badge component.
- [x] **T009** **[US2]** Embed `P2PStatus.svelte` in `apps/web/src/lib/components/layout/AppHeader.svelte` next to `DriveStatus`.

---

## Phase 5: Verification & Unit Tests

- [x] **T010** **[US1]** Update/write unit tests for the updated host service in `apps/web/src/lib/cloud-bridge/p2p/guest-service.test.ts` or `host-service.test.ts`.
- [x] **T011** **[US1]** Run the full Vitest suite (`pnpm test`) to ensure 100% pass rate and zero regressions.
