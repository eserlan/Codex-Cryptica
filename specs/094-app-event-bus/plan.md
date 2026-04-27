# Implementation Plan: Implement Generalized AppEventBus

**Branch**: `094-app-event-bus` | **Date**: 2026-04-27 | **Spec**: [specs/094-app-event-bus/spec.md](spec.md)
**Input**: Feature specification from `/specs/094-app-event-bus/spec.md`

## Summary

Implement a centralized, type-safe `AppEventBus` to unify fragmented event patterns (`VaultEventBus`, manual `BroadcastChannel` instances, and custom DOM events). This core system will facilitate decoupled store-to-store coordination and cross-tab state synchronization, improving architectural modularity and testability.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: None (Browser Native APIs only)  
**Storage**: N/A (Transient/In-memory)  
**Testing**: Vitest  
**Target Platform**: Browser (Web)  
**Project Type**: Library / Core System  
**Performance Goals**: < 200ms system-wide reaction time; synchronous execution for same-tab listeners.  
**Constraints**: Must be offline-capable (local-first); Must not leak memory (enforce unsubscriptions); Must support selective cross-tab broadcasting.  
**Scale/Scope**: System-wide event bus used by 10+ stores and services.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status  | Notes                                                                                                    |
| :----------------------------- | :------ | :------------------------------------------------------------------------------------------------------- |
| **I. Library-First**           | ✅ PASS | Will be implemented as a shared package (or core lib) to be usable across the app and potential workers. |
| **II. TDD**                    | ✅ PASS | Unit tests for the bus and contract tests for domain events required.                                    |
| **III. Simplicity & YAGNI**    | ✅ PASS | No complex replay logic or persistent queues; focused on current unification needs.                      |
| **VIII. Dependency Injection** | ✅ PASS | Bus will be injectable into services; consumers will accept the bus instance in constructors.            |
| **X. Coverage Goals**          | ✅ PASS | Target 80% coverage for the core bus logic.                                                              |

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
    │   ├── types.ts    # AppEvent union and payload types
    │   └── CrossTabBroadcaster.ts # BroadcastChannel wrapper
    └── tests/
        └── AppEventBus.test.ts

apps/web/src/lib/
└── stores/
    └── vault/
        └── events.ts   # Will eventually be deprecated or bridge to AppEventBus
```

**Structure Decision**: Implementing as a new package `packages/events` to follow the **Library-First** principle, as this is a core utility that should be independent of the web UI layer and potentially accessible to service workers.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected.
