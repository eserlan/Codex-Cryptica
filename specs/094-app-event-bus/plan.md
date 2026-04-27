# Implementation Plan: Implement Generalized AppEventBus

**Branch**: `094-app-event-bus` | **Date**: 2026-04-27 | **Spec**: [specs/094-app-event-bus/spec.md](spec.md)
**Input**: Feature specification from `/specs/094-app-event-bus/spec.md`

## Summary

Implement a centralized, type-safe `AppEventBus` to unify fragmented event patterns (`VaultEventBus`, manual `BroadcastChannel` instances, and custom DOM events). This core system will facilitate decoupled store-to-store coordination and cross-tab state synchronization, improving architectural modularity and testability.

## Technical Context

**Language/Version**: TypeScript 6.x
**Primary Dependencies**: None (Browser Native APIs only)  
**Storage**: N/A (Transient/In-memory)  
**Testing**: Vitest  
**Target Platform**: Browser (Web)  
**Project Type**: Library / Core System  
**Performance Goals**: < 200ms system-wide reaction time; synchronous execution for same-tab listeners. Measurement methodology: Use `performance.now()` in a "Vault Switch" event lifecycle test to measure duration from emission to all store reset completions.
**Constraints**: Must be offline-capable (local-first); Must not leak memory (enforce unsubscriptions); Must support selective cross-tab broadcasting.  
**Scale/Scope**: System-wide event bus used by 10+ stores and services.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status  | Notes                                                                                                     |
| :----------------------------- | :------ | :-------------------------------------------------------------------------------------------------------- |
| **I. Library-First**           | ✅ PASS | Will be implemented as a shared package (or core lib) to be usable across the app and potential workers.  |
| **II. TDD**                    | ✅ PASS | Unit tests for the bus, cross-tab broadcaster, and domain bridge behavior required.                       |
| **III. Simplicity & YAGNI**    | ✅ PASS | No complex replay logic or persistent queues; focused on current unification needs.                       |
| **VIII. Dependency Injection** | ✅ PASS | Bus/event sinks will be injectable into services; domain packages must not import the singleton directly. |
| **X. Coverage Goals**          | ✅ PASS | Target 80% coverage for the core bus logic.                                                               |

## Project Structure

### Documentation (this feature)

```text
specs/094-app-event-bus/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
packages/
└── events/             # New package for the generalized bus
    ├── src/
    │   ├── index.ts    # Main exports
    │   ├── AppEventBus.ts
    │   ├── types.ts    # Current AppEvent union; future distributed registry helpers
    │   └── CrossTabBroadcaster.ts # BroadcastChannel wrapper
    └── tests/
        ├── AppEventBus.test.ts
        └── CrossTabBroadcaster.test.ts

apps/web/src/lib/
└── stores/
    └── vault/
        └── events.ts   # Bridge to AppEventBus until legacy VaultEventBus consumers migrate
```

**Structure Decision**: Implementing as a new package `packages/events` to follow the **Library-First** principle, as this is a core utility that should be independent of the web UI layer and potentially accessible to service workers.

## Follow-Up Architecture

`docs/ARCH_DISTRIBUTED_EVENTS.md` supersedes the centralized-union model as the preferred long-term direction. The current implementation may keep compatibility aliases, but the next phase should move event constants and payload ownership into domain packages using TypeScript module augmentation. That migration must preserve current runtime behavior: named listener semantics, VaultEventBus bridge parity, JSON cross-tab transport, and defensive remote-message handling.

## Distributed Registry Migration Plan

This section is the execution plan for T025. The goal is to move from the current centralized `AppEvent` union to a distributed, package-owned event registry without breaking existing runtime behavior.

### Current State

- `packages/events` owns a centralized `AppEvent` union and therefore owns payload types for Vault, Oracle, and UI events.
- `AppEventBus` dispatch is runtime-safe and supports exact event filters, domain wildcards, global wildcard listeners, named listener replacement, `reset()`, and listener error isolation.
- `CrossTabBroadcaster` uses JSON string transport over `BroadcastChannel`, validates remote envelopes, tags remote events, and supports `destroy()`.
- `apps/web/src/lib/stores/vault/events.ts` bridges legacy `VaultEventBus` events into `AppEventBus`, including lifecycle/indexing events.
- Consumers still use hardcoded event strings in several places.

### Target State

- `packages/events` owns only generic event infrastructure: metadata, registry helper types, bus implementation, cross-tab broadcasting, and runtime envelope validation.
- Each domain package owns its event constants, payload types, and registry augmentation.
- Consumers import event constants from the owning package instead of hardcoding event strings.
- `emit()` and `subscribe()` infer exact payload types for specific event constants.
- Domain wildcard subscriptions infer a union of that domain's events.
- Global wildcard subscriptions infer the full registered event union.
- Type-level tests prove invalid event names, invalid payloads, missing augmentations, and stale exports fail at compile time.
- The old centralized event union is removed only after all current domains are registered and consumers have migrated.

### Phase A: Type Contract And Test Harness

**Goal**: Introduce the distributed registry type surface without changing runtime behavior.

**Changes**:

- Add `AppEventRegistry`, `AppEventDefinition`, `AppEventType`, `AppEventOf<Type>`, `RegisteredAppEvent`, `AppEventDomain`, and domain helper types in `packages/events/src/types.ts`.
- Add an internal runtime envelope type for bus implementation so `packages/events` does not depend on app-owned augmentations when the registry is empty.
- Keep compatibility aliases for the existing centralized union during migration.
- Add type-level tests for registry helpers using test-only module augmentation.

**Gate**:

- Type-level tests fail before the registry helpers exist and pass after implementation.
- Existing `packages/events` runtime tests remain green.
- No domain package imports are added to `packages/events`.

### Phase B: Generic Bus API

**Goal**: Make `emit()` and `subscribe()` type-aware while preserving runtime dispatch.

**Changes**:

- Add overloads for exact event filters, arrays of event filters, domain wildcard filters, arrays of wildcard filters, and global wildcard filters.
- Keep runtime matching case-insensitive as it is today.
- Preserve named listener, reset, unsubscribe, error isolation, and cross-tab behavior.
- Add tests proving exact payload inference, wildcard inference, invalid event rejection, and old unsubscribe safety.

**Gate**:

- `appEventBus.subscribe(VAULT_EVENTS.ENTITY_UPDATED, ...)` infers the exact payload after Vault is registered.
- Invalid filters such as `FOOBAR:*` fail in type-level tests.
- Existing runtime tests are unchanged or stronger.

### Phase C: Vault Domain Registration

**Goal**: Move Vault event ownership out of `packages/events` first because Vault has the largest bridge and search-indexing risk.

**Changes**:

- Create `packages/vault-engine/src/events.ts` with `VAULT_EVENTS`, payload types, and `declare module "@codex/events"` registry entries.
- Export the events module from `packages/vault-engine/src/index.ts`.
- Preserve bridge parity for `VAULT_OPENING`, `CACHE_LOADED`, `ENTITY_UPDATED`, `VAULT_SWITCHED`, `ENTITY_DELETED`, `BATCH_CREATED`, `BATCH_UPDATED`, `SYNC_COMPLETE`, and `SYNC_CHUNK_READY`.
- Replace hardcoded Vault event strings in web consumers with `VAULT_EVENTS` where practical.
- Keep the legacy `VaultEventBus` bridge until no direct subscribers remain.

**Gate**:

- Search lifecycle tests still pass.
- Vault bridge tests prove every legacy event that drives behavior emits an AppEvent equivalent.
- Type-level tests prove `VAULT_EVENTS.ENTITY_UPDATED` narrows payload correctly.

### Phase D: Oracle And UI Registration

**Goal**: Move remaining first-party event domains out of `packages/events`.

**Changes**:

- Create or update Oracle and UI event registration modules in their owning packages or web-owned event module when no package exists yet.
- Export constants such as `ORACLE_EVENTS.UNDO_PERFORMED` and `UI_EVENTS.SIDEBAR_TOGGLED`.
- Replace hardcoded Oracle/UI event strings in consumers.
- Preserve cross-tab behavior for `ORACLE:UNDO_PERFORMED`.

**Gate**:

- Oracle undo tests and cross-tab broadcaster tests pass.
- Type-level tests prove Oracle/UI augmentations are visible from the web app entrypoint.

### Phase E: Application Registration Visibility

**Goal**: Prevent silent missing augmentations.

**Changes**:

- Add `apps/web/src/lib/app/event-registrations.ts` only if normal value imports do not make all augmentations visible.
- Use side-effect imports, not `import type`, for required registration modules.
- Add a type-level consumer test proving all first-party domain events are visible from the app.
- Document any package-name mismatches separately instead of hiding them in event registration.

**Gate**:

- Removing an event registration import causes the visibility test to fail.
- App type-check sees all expected event constants and payloads.

### Phase F: Centralized Union Removal

**Goal**: Complete the migration and make distributed registration the only source of truth.

**Changes**:

- Remove domain-specific unions from `packages/events/src/types.ts`.
- Replace compatibility aliases with registry-derived types.
- Keep only generic runtime envelope types in `packages/events`.
- Remove any remaining hardcoded event strings from app/service code where constants exist.

**Gate**:

- No domain payload type remains in `packages/events`.
- `rg "VAULT:|ORACLE:|UI:" packages/events/src` finds no domain-owned event literals except generic tests or documentation.
- Full affected test suites pass.

### Phase G: Legacy Bridge Retirement

**Goal**: Remove `VaultEventBus` only when no consumers depend on it.

**Changes**:

- Audit direct `vaultEventBus.subscribe` and `vaultEventBus.emit` usage.
- Migrate remaining consumers to `appEventBus` and domain constants.
- Delete `VaultEventBus` and bridge code only after the audit is clean.

**Gate**:

- `rg "vaultEventBus|VaultEventBus" apps packages` returns no runtime consumers, excluding changelog/docs/tests for deleted behavior.
- Search, vault switch, import, sync, and graph smoke tests pass.

### Final Done Definition

The distributed registry migration is complete when all phase gates pass, the centralized union is removed, first-party domains register through their owning modules, and consumers use exported event constants instead of hardcoded event strings for registered events.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected.
