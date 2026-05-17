# Implementation Plan: Oracle Executor Decoupling

**Branch**: `refactor/oracle-executor-monolith` | **Date**: 2026-05-17 | **Spec**: `/specs/097-oracle-executor-decoupling/spec.md`

## Summary

This refactor transforms the 1,135-line `OracleActionExecutor` God Object into a modular, testable, and extensible Command Dispatcher. We will adopt a **Command + Event + DI** hybrid architecture, extracting command logic into specialized handlers, decoupling side effects via the `AppEventBus`, and ensuring all dependencies are provided via constructor injection.

## Technical Context

**Language/Version**: TypeScript 5.9.x  
**Primary Dependencies**: `@codex/events`, `@codex/oracle-engine`, Svelte 5 (Runes)  
**Storage**: OPFS (via Vault), IndexedDB (via Chat History)  
**Testing**: Vitest  
**Target Platform**: Web (Browser + Web Workers)
**Project Type**: Engine / Library  
**Performance Goals**: < 50ms command dispatch time (excluding AI latency)  
**Constraints**: MUST preserve guest-mode restrictions and Fog of War visibility.  
**Scale/Scope**: Refactoring ~1,100 lines of critical business logic across 10+ slash commands.

## Constitution Check

- **Svelte 5 Reactivity**: 🟢 Pass. Plan mandates `$state.snapshot` before passing context to async executors.
- **Dependency Injection**: 🟢 Pass. Plan mandates constructor-based DI for all specialized executors.
- **Icon Usage**: N/A (Engine only)
- **Mandatory Testing**: 🟢 Pass. Plan requires 100% logic coverage for all new handlers.
- **Package Type Safety**: 🟢 Pass. Interfaces defined in `schema` and engine-specific types.

## Project Structure

### Documentation (this feature)

```text
specs/097-oracle-executor-decoupling/
├── plan.md              # This file
├── spec.md              # High-level vision and user stories
├── data-model.md        # Interface and event definitions
└── tasks.md             # Phased implementation tasks
```

### Source Code (repository root)

```text
packages/oracle-engine/src/
├── executors/                 # Focused command handlers
│   ├── base-executor.ts       # Shared logic and DI base
│   ├── chat-executor.ts       # AI Orchestration
│   ├── create-executor.ts     # /create logic
│   ├── dice-executor.ts       # /roll logic
│   └── ...
├── events.ts                  # Event definitions
├── types.ts                   # Interface definitions (OracleCommandExecutor)
└── oracle-executor.ts         # The thin dispatcher (Composer)
```

**Structure Decision**: Adopting a modular "Executors" directory within the `oracle-engine` package to isolate command logic while keeping the public API (`OracleActionExecutor`) stable.

## Complexity Tracking

| Violation                 | Why Needed                                | Simpler Alternative Rejected Because                                                   |
| ------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| Command Pattern           | To solve the God Object monolith.         | Keeping it in one file makes maintenance impossible as AI commands grow in complexity. |
| Event-Driven Side Effects | To eliminate "Callback Bloat" in context. | Direct callbacks couple the engine too tightly to the UI/Web layer.                    |
