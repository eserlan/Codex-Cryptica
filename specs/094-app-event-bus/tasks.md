# Tasks: Implement Generalized AppEventBus

## Phase 1: Setup

- [x] T001 Create directory structure for `packages/events` (src, tests)
- [x] T002 Initialize `package.json` for `packages/events` with workspace dependencies
- [x] T003 Configure `tsconfig.json` for `packages/events`
- [x] T004 Configure `vitest.config.ts` for `packages/events`

## Phase 2: Foundational

- [x] T005 [P] Define `AppEvent`, `EventDomain`, and payload union types in `packages/events/src/types.ts`
- [x] T006 Implement core `AppEventBus` class with subscription and emission logic in `packages/events/src/AppEventBus.ts`
- [x] T007 [P] Implement `CrossTabBroadcaster` with JSON `BroadcastChannel` transport, malformed-message rejection, and remote loop prevention in `packages/events/src/CrossTabBroadcaster.ts`
- [x] T008 Export public API from `packages/events/src/index.ts`

## Phase 3: [US1] Unified System Coordination

**Story Goal**: As a developer, I want a single, type-safe mechanism to coordinate actions between decoupled systems.
**Independent Test**: Emit a test event from one system and verify receipt in another with correct payload.

- [x] T009 [P] [US1] Implement domain wildcard filtering (e.g., `VAULT:*`) in `packages/events/src/AppEventBus.ts`
- [x] T010 [US1] Implement named listener protection to prevent duplicate registrations in `packages/events/src/AppEventBus.ts`
- [x] T011 [P] [US1] Create unit tests for `AppEventBus` in `packages/events/tests/AppEventBus.test.ts`
- [ ] T012 [US1] Verify FR-007 (transient state) by simulating a page reload/bus re-init in tests
- [x] T013 [US1] Register `AppEventBus` as a singleton in `apps/web/src/lib/app/init/app-init.ts`
- [x] T014 [US1] Verify `reset()` preserves named listeners and old unsubscribe closures cannot delete newer named replacements
- [ ] T015 [US1] Implement optional listener debouncing for high-frequency events (FR-008)

## Phase 4: [US2] Automated Side-Effect Decoupling

**Story Goal**: As a system architect, I want heavy side effects (like search indexing) to react to state changes via events.
**Independent Test**: Update an entity and verify search indexer is triggered via event.

- [x] T016 [US2] Modify `apps/web/src/lib/stores/vault/events.ts` to bridge existing `VaultEventBus` calls to `AppEventBus`, including lifecycle/indexing events (`VAULT_OPENING`, `CACHE_LOADED`, `SYNC_CHUNK_READY`, `SYNC_COMPLETE`)
- [x] T017 [US2] Refactor `SearchService` to subscribe to vault lifecycle and entity events on `AppEventBus` in `apps/web/src/lib/services/search.ts`
- [x] T018 [US2] [P] Verify side-effect decoupling with search service tests in `apps/web/src/tests/search.test.ts`

## Phase 5: [US3] Cross-Window/Tab Synchronization

**Story Goal**: As a user with multiple tabs open, I want my actions in one tab to be reflected in all other open tabs.
**Independent Test**: Perform an action in Tab A and verify state update in Tab B.

- [x] T019 [US3] Emit `ORACLE:UNDO_PERFORMED` with `metadata.sync: true` from the Oracle store
- [x] T020 [US3] Update `OracleStore` to emit `ORACLE:UNDO_PERFORMED` via `AppEventBus` in `apps/web/src/lib/stores/oracle.svelte.ts`
- [x] T021 [US3] Update `ChatMessage` to listen for `ORACLE:UNDO_PERFORMED` via `AppEventBus` in `apps/web/src/lib/components/oracle/ChatMessage.svelte`
- [x] T022 [US3] Add unit coverage for `CrossTabBroadcaster` JSON transport, loop prevention, malformed message rejection, and destroy cleanup
- [ ] T023 [US3] [P] Create automated browser integration test for cross-tab sync in `apps/web/tests/e2e/cross-tab-sync.test.ts`

## Phase 6: Polish & Cross-Cutting

- [x] T024 Run `pnpm run lint` across the workspace and fix any issues
- [x] T025 Run `pnpm test` across all affected packages (`events`, `web`)
- [x] T026 Document `AppEventBus` usage in `docs/ARCHITECTURE_EVENTS.md` (Update with implementation details)
- [ ] T027 Audit store imports in `apps/web/src/lib/stores/` to verify at least 20% reduction in direct dependencies (SC-001)
- [x] T028 Update Speckit artifacts for the distributed registry follow-up described in `docs/ARCH_DISTRIBUTED_EVENTS.md`
- [x] T029 Implement distributed event registry migration with type-level tests before removing the centralized `AppEvent` union

## Phase 7: [T029-A] Distributed Registry Type Contract

**Story Goal**: Make `packages/events` define a generic registry contract without importing domain packages.
**Independent Test**: Type-level tests can register fake events through module augmentation and prove exact payload inference.

- [x] T030 [P] Add test-only module augmentation fixtures for `AppEventRegistry` in `packages/events/tests`
- [x] T031 [P] Add type-level tests for valid registered events, invalid event names, malformed payloads, exact payload extraction, and domain extraction
- [x] T032 Add `AppEventRegistry`, `AppEventDefinition`, `AppEventType`, `AppEventOf`, `RegisteredAppEvent`, `AppEventDomain`, and domain helper types in `packages/events/src/types.ts`
- [x] T033 Add an internal runtime event envelope type so `packages/events` works when `AppEventRegistry` is empty
- [x] T034 Preserve compatibility aliases for current `AppEvent` consumers during migration

## Phase 8: [T029-B] Generic AppEventBus API

**Story Goal**: Make bus calls type-aware while preserving existing runtime behavior.
**Independent Test**: `subscribe()` and `emit()` infer exact types from registered event constants while existing runtime tests still pass.

- [x] T035 Add typed `emit<Type extends AppEventType>(event: AppEventOf<Type>)` overloads
- [x] T036 Add typed `subscribe()` overloads for exact event filters and arrays of exact event filters
- [x] T037 Add typed `subscribe()` overloads for domain wildcards, wildcard arrays, and global wildcard
- [x] T038 Add type-level tests for exact event callback payload inference
- [x] T039 Add type-level tests for domain wildcard union inference and invalid wildcard rejection
- [x] T040 Re-run and keep green existing runtime tests for named listeners, reset, unsubscribe, listener errors, and dispatch ordering

## Phase 10: [T029-C] Vault Domain Registration

**Story Goal**: Move Vault event ownership into `vault-engine` while preserving the bridge and search behavior.
**Independent Test**: Search lifecycle tests and bridge parity tests pass with Vault events registered from `@codex/vault-engine`.

- [x] T041 Create `packages/vault-engine/src/events.ts` with `VAULT_EVENTS` constants
- [x] T042 Define Vault AppEvent payload types in `packages/vault-engine/src/events.ts` or nearby domain-owned types
- [x] T043 Register Vault events through `declare module "@codex/events"` using the distributed registry contract
- [x] T044 Export Vault events from `packages/vault-engine/src/index.ts`
- [x] T045 Add type-level tests proving `VAULT_EVENTS.ENTITY_UPDATED` narrows payload correctly from a consumer import
- [x] T046 Update `apps/web/src/lib/stores/vault/events.ts` bridge to use `VAULT_EVENTS` constants
- [x] T047 Replace hardcoded Vault event strings in `SearchService` and relevant web consumers with `VAULT_EVENTS`
- [x] T048 Add or update bridge parity tests for `VAULT_OPENING`, `CACHE_LOADED`, `ENTITY_UPDATED`, `VAULT_SWITCHED`, `ENTITY_DELETED`, `BATCH_CREATED`, `BATCH_UPDATED`, `SYNC_COMPLETE`, and `SYNC_CHUNK_READY`

## Phase 11: [T029-D] Oracle And UI Registration

**Story Goal**: Move remaining first-party event definitions out of the central events package.
**Independent Test**: Oracle undo and UI event consumers compile against exported constants and maintain runtime behavior.

- [x] T049 Create Oracle event constants and registry augmentation in the owning package/module
- [x] T050 Replace hardcoded `ORACLE:UNDO_PERFORMED` usages with exported Oracle event constants
- [x] T051 Preserve `metadata.sync: true` cross-tab behavior for Oracle undo
- [x] T052 Create UI event constants and registry augmentation for current UI events
- [x] T053 Replace hardcoded UI event strings with exported UI event constants where used
- [x] T054 Add type-level tests proving Oracle and UI augmentations are visible from app consumers

## Phase 12: [T029-E] Registration Visibility

**Story Goal**: Ensure module augmentations are reliably visible in the web app and package tests.
**Independent Test**: Removing a required registration import makes the visibility test fail.

- [x] T055 Audit workspace package names used for event modules (`@codex/*` vs unscoped names)
- [x] T056 Add `apps/web/src/lib/app/event-registrations.ts` only if normal imports do not expose all augmentations
- [x] T057 Import registration modules with value or side-effect imports, not `import type`
- [x] T058 Add a web-consumer type-level test that asserts all first-party event registry entries are visible
- [x] T059 Document any package-name normalization follow-up separately from event registry implementation

## Phase 13: [T029-F] Remove Centralized Union

**Story Goal**: Make the distributed registry the single source of truth.
**Independent Test**: `packages/events` no longer contains domain-owned payload unions and all consumers compile through registry-derived types.

- [x] T060 Remove domain-specific `VaultAppEvent`, `OracleAppEvent`, and `UIAppEvent` unions from `packages/events/src/types.ts`
- [x] T061 Replace compatibility aliases with registry-derived types
- [x] T062 Ensure `packages/events` has no runtime dependency on domain packages
- [x] T063 Audit hardcoded registered event strings and replace remaining call sites with exported constants where practical
- [x] T064 Run `rg "VAULT:|ORACLE:|UI:" packages/events/src` and confirm no domain-owned event literals remain

## Phase 14: [T029-G] Retire Legacy VaultEventBus

**Story Goal**: Remove the bridge only after all runtime consumers have migrated.
**Independent Test**: No runtime code imports or subscribes to `VaultEventBus`, and vault/search/sync tests pass.

- [x] T065 Audit direct `vaultEventBus` and `VaultEventBus` runtime usage across `apps` and `packages`
- [ ] T066 Migrate remaining `vaultEventBus.subscribe` consumers to `appEventBus.subscribe(VAULT_EVENTS.*)`
- [ ] T067 Migrate remaining `vaultEventBus.emit` producers to injected event sinks or `appEventBus` at app boundaries
- [ ] T068 Delete `VaultEventBus` and bridge code after the audit is clean
- [ ] T069 Remove legacy VaultEventBus tests or replace them with AppEventBus/domain-event tests

## Phase 15: Final Validation

- [x] T070 Run `pnpm -C packages/events test`
- [x] T071 Run `pnpm -C packages/events lint`
- [x] T072 Run relevant web unit tests for search, vault events, Oracle undo, and app init
- [x] T073 Run `pnpm run lint` across the workspace
- [x] T074 Run `pnpm test` across affected workspaces
- [ ] T075 [P] Verify SC-004: System-wide reaction time < 200ms using `performance.now()` in a "Vault Switch" event lifecycle test
- [ ] T076 Verify final done definition from `specs/094-app-event-bus/plan.md`
