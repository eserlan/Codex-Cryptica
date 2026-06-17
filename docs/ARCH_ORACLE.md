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

## Server-Side Conversation State (Gemini Interactions API)

Oracle chat can run through the Gemini **Interactions API** so prior turns and
already-sent lore are retained server-side instead of re-uploaded each turn. See
[ADR 018](adr/018-oracle-server-side-conversation-state.md) and
[the plan](plan-oracle-interactions-api.md).

- **On by default for the proxy path**; the custom-key direct path stays
  stateless (user keys never transit the worker). The flag (`interactionSessions.enabled`)
  is read on the main thread and forwarded into the worker via `generateResponse`
  options (the worker has its own module scope).
- `retrieveContext` emits per-record `entries` (`{ id, snippet, hash }`); hash is
  `entityContentHash(entity.content)` — the always-hydrated short field only.
  The pure `LoreDeltaTracker` + `buildInteractionInput` live in
  `@codex/oracle-engine`; `InteractionSessionManager` (DI class in
  `interaction-session.ts`, keyed per `conversationId`) holds session state and
  sends only new/changed lore, naming unchanged records in a relevance hint.
- The worker (`oracle-proxy`) routes requests carrying `input` to
  `/v1beta/interactions`, threading `previous_interaction_id`, and returns
  `{ id, text }`. An expired id → `409 INTERACTION_NOT_FOUND`, which the client
  recovers from by resetting and replaying full history + lore once.
- State is in-memory; local chat history remains the source of truth.
