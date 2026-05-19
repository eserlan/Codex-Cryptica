# Implementation Plan: P2P Guest Service Decoupling

**Branch**: `100-guest-service-decoupling` | **Date**: 2026-05-18 | **Spec**: /specs/100-guest-service-decoupling/spec.md
**Input**: Feature specification from `/specs/100-guest-service-decoupling/spec.md`

## Summary

Refactor the monolithic `P2PGuestService` (~650 lines) into a modular architecture mirroring the host-side refactor from Spec 098. This includes extracting network transport into a `P2PClientTransport` interface, routing messages through a generalized `P2PDispatcher`, and partitioning message logic into focused, testable handlers (Vault, VTT, Session, etc.).

## Technical Context

**Language/Version**: TypeScript 6.0.3
**Primary Dependencies**: PeerJS, Svelte 5 (Runes), `@codex/events`
**Storage**: OPFS (Vault Files), IndexedDB (Registry), Object URLs (Map Assets)
**Testing**: Vitest
**Target Platform**: Browser (SvelteKit)
**Project Type**: Web Application (P2P Service Refactor)
**Performance Goals**: Inbound message dispatch ≤ 1ms per message.
**Constraints**: 16KB chunk size, 15s timeout, ≤ 200 lines in `guest-service.ts`.
**Scale/Scope**: ~650 lines refactored into 8+ focused components.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: Logic extracted from the thin Svelte service into standalone handlers and transport classes. [PASS]
2. **Test-Driven Development (TDD)**: Every new component (transport, dispatcher, handlers) will have corresponding unit tests targeting 90%+ coverage. [PASS]
3. **Simplicity & YAGNI**: Reusing existing PeerJS integration patterns; no extra abstractions beyond what's needed for decoupling. [PASS]
4. **Privacy & Client-Side Processing**: All refactoring remains local-first; P2P communication is client-to-client. [PASS]
5. **Dependency Injection (DI)**: Constructor-based DI used for the guest service, injecting transport, dispatcher, and handlers. [PASS]
6. **Quality & Coverage**: Target coverage for new logic extraction is ≥ 90% (exceeding the 70% floor). [PASS]
7. **Agent Operational Protocol**: Surgical changes per phase; think-first strategy applied. [PASS]

## Project Structure

### Documentation (this feature)

```text
specs/100-guest-service-decoupling/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/src/lib/cloud-bridge/p2p/
├── guest-service.ts            # Refactored to < 200 lines
├── transport/
│   ├── client-transport.ts     # NEW: P2PClientTransport interface
│   └── peerjs-client-transport.ts # NEW: PeerJS implementation
├── dispatcher/
│   └── p2p-dispatcher.ts       # UPDATED: Generalized for Guest/Host
├── handlers/
│   ├── base-handler.ts         # UPDATED: Generalized for Guest/Host
│   ├── guest-vault-handler.ts  # NEW: Vault-related messages
│   ├── guest-vtt-handler.ts    # NEW: real-time VTT messages
│   ├── guest-session-handler.ts# NEW: snapshots and session end
│   ├── guest-presence-handler.ts# NEW: join/leave/status
│   └── guest-chat-handler.ts   # NEW: chat messages
└── guest-file-client.ts        # NEW: file chunk reassembly
```

**Structure Decision**: Monorepo application-level refactor. Logic is partitioned into `transport/`, `dispatcher/`, and `handlers/` subdirectories within the existing P2P module to maintain symmetry with the host-side architecture.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No violations.
