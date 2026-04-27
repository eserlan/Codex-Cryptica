# Tasks: Implement Generalized AppEventBus

## Phase 1: Setup

- [x] T001 Create directory structure for `packages/events` (src, tests)
- [x] T002 Initialize `package.json` for `packages/events` with workspace dependencies
- [x] T003 Configure `tsconfig.json` for `packages/events`
- [x] T004 Configure `vitest.config.ts` for `packages/events`

## Phase 2: Foundational

- [x] T005 [P] Define `AppEvent`, `EventDomain`, and payload union types in `packages/events/src/types.ts`
- [x] T006 Implement core `AppEventBus` class with subscription and emission logic in `packages/events/src/AppEventBus.ts`
- [x] T007 [P] Implement `CrossTabBroadcaster` with `BroadcastChannel` wrapper and loop prevention (ignoring same-origin remote events) in `packages/events/src/CrossTabBroadcaster.ts`
- [x] T008 Export public API from `packages/events/src/index.ts`

## Phase 3: [US1] Unified System Coordination

**Story Goal**: As a developer, I want a single, type-safe mechanism to coordinate actions between decoupled systems.
**Independent Test**: Emit a test event from one system and verify receipt in another with correct payload.

- [x] T009 [P] [US1] Implement domain wildcard filtering (e.g., `VAULT:*`) in `packages/events/src/AppEventBus.ts`
- [x] T010 [US1] Implement named listener protection to prevent duplicate registrations in `packages/events/src/AppEventBus.ts`
- [x] T011 [P] [US1] Create unit tests for `AppEventBus` in `packages/events/tests/AppEventBus.test.ts`
- [x] T012 [US1] Register `AppEventBus` as a singleton in `apps/web/src/lib/app/init/app-init.ts`

## Phase 4: [US2] Automated Side-Effect Decoupling

**Story Goal**: As a system architect, I want heavy side effects (like search indexing) to react to state changes via events.
**Independent Test**: Update an entity and verify search indexer is triggered via event.

- [x] T013 [US2] Modify `apps/web/src/lib/stores/vault/events.ts` to bridge existing `VaultEventBus` calls to `AppEventBus`
- [x] T014 [US2] Refactor `SearchService` to subscribe to `VAULT:ENTITY_UPDATED` on `AppEventBus` in `apps/web/src/lib/services/search.ts`
- [ ] T015 [US2] [P] Verify side-effect decoupling with an integration test in `apps/web/src/lib/services/search.test.ts`

## Phase 5: [US3] Cross-Window/Tab Synchronization

**Story Goal**: As a user with multiple tabs open, I want my actions in one tab to be reflected in all other open tabs.
**Independent Test**: Perform an action in Tab A and verify state update in Tab B.

- [x] T016 [US3] Mark `ORACLE:UNDO_PERFORMED` as `sync: true` in `packages/events/src/types.ts`
- [x] T017 [US3] Update `OracleStore` to emit `ORACLE:UNDO_PERFORMED` via `AppEventBus` in `apps/web/src/lib/stores/oracle.svelte.ts`
- [x] T018 [US3] Update `ChatMessage` to listen for `ORACLE:UNDO_PERFORMED` via `AppEventBus` in `apps/web/src/lib/components/oracle/ChatMessage.svelte`
- [ ] T019 [US3] [P] Create automated browser integration test for cross-tab sync in `apps/web/tests/e2e/cross-tab-sync.test.ts`

## Phase 6: Polish & Cross-Cutting

- [ ] T020 Run `npm run lint` across the workspace and fix any issues
- [ ] T021 Run `npm test` across all affected packages (`events`, `web`)
- [x] T022 Document `AppEventBus` usage in `docs/ARCHITECTURE_EVENTS.md` (Update with implementation details)
- [ ] T023 Audit store imports in `apps/web/src/lib/stores/` to verify at least 20% reduction in direct dependencies (SC-001)
