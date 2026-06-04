# Architectural Guide: Oracle Store (Decomposed)

The `OracleStore` is the primary interface for AI-powered features in Codex-Cryptica. It has been decomposed from a 900+ line monolith into a thin facade with 6 specialized managers.

## 1. Directory Structure

```text
apps/web/src/lib/stores/
├── oracle.svelte.ts       # Thin Facade (Public API)
└── oracle/                # Internal Managers
    ├── types.ts           # Shared interfaces
    ├── ui-manager.svelte.ts
    ├── chat-manager.svelte.ts
    ├── context-manager.ts
    ├── action-manager.svelte.ts
    ├── settings-manager.svelte.ts
    └── revision-manager.svelte.ts
```

## 2. Manager Roles

| Manager      | Responsibility      | Key Methods/States                                |
| ------------ | ------------------- | ------------------------------------------------- |
| **UI**       | Visibility & status | `isOpen`, `isThinking`, `toggle()`, `open()`      |
| **Chat**     | History & Messaging | `messages`, `sendMessage()`, `clearMessages()`    |
| **Context**  | AI Context Assembly | `getExecutionContext()`                           |
| **Actions**  | AI Operations       | `undo()`, `drawEntity()`, `revise()`              |
| **Settings** | API Keys & Models   | `apiKey`, `modelName`, `updateSettings()`         |
| **Revision** | Draft Merging       | `reviseSmartApply()`, `reviseDiscoveryProposal()` |

For the full entity revision flow, see [Architectural Guide: Entity Revision Pipeline](./ARCH_ENTITY_REVISION_PIPELINE.md).

## 3. Communication Pattern

Managers receive a reference to the `IOracleStore` facade in their constructor. They access shared services and other managers through this facade.

**Circular Dependency Mitigation**:
The `IOracleStore` interface defined in `oracle/types.ts` is used by managers instead of importing the concrete `OracleStore` class.

## 4. Extension Guidelines

When adding new AI functionality:

1. **Identify the Scope**: Does it belong in UI, Chat, or Actions?
2. **Implement in Manager**: Add the logic to the appropriate specialized manager.
3. **Expose in Facade**: Add a delegation method to `OracleStore` if it needs to be part of the public API.
4. **Update Tests**: Add unit tests in `oracle/tests/` and verify regression in `oracle.svelte.test.ts`.
