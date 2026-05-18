# Implementation Plan: P2P Host Service Decoupling

**Branch**: `098-p2p-host-service-decoupling` | **Date**: 2026-05-17 | **Spec**: `/specs/098-p2p-host-service-decoupling/spec.md`

## Summary

Refactor the `P2PHostService` monolith by decoupling the network transport layer (PeerJS) from the application logic. Implement a layered architecture with a dedicated `P2PTransport` interface, a `P2PDispatcher` for protocol routing, and isolated action handlers for VTT, Vault, and File operations.

## Technical Context

**Language/Version**: TypeScript 5.9.x
**Primary Dependencies**: `PeerJS`, Svelte 5 (Runes), `@codex/events`
**Storage**: OPFS (Vault Files), IndexedDB (Registry)
**Testing**: Vitest
**Target Platform**: Web (Browser)
**Project Type**: Web Application / P2P Bridge
**Performance Goals**: Support 10 concurrent guests, < 200ms latency for VTT events.
**Constraints**: ArrayBuffer binary streaming for OPFS assets, Fire-and-forget protocol reliability.
**Scale/Scope**: Refactoring 918 lines of existing logic.

## Constitution Check

- **Library-First**: 🟢 Pass. Decoupling logic into pure TypeScript handlers.
- **TDD**: 🟢 Pass. Mandated unit tests for handlers and transport.
- **Simplicity & YAGNI**: 🟢 Pass. Using existing protocol instead of adding complexity.
- **Privacy**: 🟢 Pass. Processing remains fully client-side.
- **Dependency Injection**: 🟢 Pass. Using constructor-based DI for transport and stores.

## Project Structure

### Documentation (this feature)

```text
specs/098-p2p-host-service-decoupling/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/src/lib/cloud-bridge/p2p/
├── transport/
│   ├── transport-interface.ts
│   └── peerjs-transport.ts
├── dispatcher/
│   └── p2p-dispatcher.ts
├── handlers/
├── handlers/
│   ├── base-handler.ts         # Abstract base for action logic and DI
│   ├── vtt-handler.ts
│   ├── vault-handler.ts
│   └── file-handler.ts
├── p2p-protocol.ts
└── host-service.svelte.ts

**Structure Decision**: Adopting a layered directory structure within the P2P cloud-bridge to clearly separate concerns. The `BaseHandler` will serve as the architectural equivalent of the Oracle's `BaseExecutor`, providing shared utilities and enforced DI patterns.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| Command/Handler Pattern | To resolve the 900-line monolith. | Keeps the host service maintainable as more multiplayer features are added. |
| Transport Abstraction | To decouple PeerJS. | PeerJS event-driven API is difficult to test directly in logic. |
```
