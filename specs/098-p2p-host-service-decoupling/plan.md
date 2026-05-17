# Implementation Plan: P2P Host Service Decoupling

**Branch**: `098-p2p-host-service-decoupling` | **Date**: 2026-05-17 | **Spec**: `/specs/098-p2p-host-service-decoupling/spec.md`

## Summary

This refactor transforms the 918-line `P2PHostService` monolith into a layered architecture. We will separate the network transport from the application logic, implement a message dispatcher for the P2P protocol, and extract domain-specific handlers for VTT actions, Vault synchronization, and file serving.

## Technical Context

**Language/Version**: TypeScript 5.9.x
**Primary Dependencies**: `PeerJS`, Svelte 5 (Runes), `@codex/events`
**Target Platform**: Web (P2P Bridge)
**Architecture**: Layered Bridge (Transport -> Dispatcher -> Handlers)
**Constraints**: MUST preserve PeerJS protocol compatibility and OPFS file streaming logic.

## Constitution Check

- **Library-First**: 🟢 Pass. Decoupling logic from the Svelte store into pure TS handlers.
- **Svelte 5 Reactivity**: 🟢 Pass. Using `$state` snapshots for message payloads.
- **Dependency Injection**: 🟢 Pass. Constructors will receive Transport and Handlers.
- **Agent Operational Protocol**: 🟢 Pass. Strict surgical changes and verification per task.

## Project Structure

### Documentation

```text
specs/098-p2p-host-service-decoupling/
├── plan.md
├── spec.md
└── tasks.md
```

### Source Code

```text
apps/web/src/lib/cloud-bridge/p2p/
├── transport/                  # NEW: Network Layer
│   ├── transport-interface.ts  # The P2PTransport interface
│   └── peerjs-transport.ts     # PeerJS implementation
├── dispatcher/                 # NEW: Routing Layer
│   └── p2p-dispatcher.ts       # Message routing logic
├── handlers/                   # NEW: Action Layer
│   ├── base-handler.ts         # Common handler logic
│   ├── vtt-handler.ts          # Map/Token logic
│   ├── vault-handler.ts        # Sync/Vault logic
│   └── file-handler.ts         # File server logic
├── p2p-protocol.ts             # Message types (Existing)
└── host-service.svelte.ts      # The thin coordinator facade
```

## Complexity Tracking

| Violation             | Why Needed                          | Simpler Alternative Rejected Because                                           |
| --------------------- | ----------------------------------- | ------------------------------------------------------------------------------ |
| Layered Architecture  | To resolve the 900-line God Object. | Keeping it in one file makes maintenance of multiplayer features too risky.    |
| Interface Abstraction | To decouple PeerJS from logic.      | Direct coupling makes unit testing VTT logic impossible without network mocks. |
