# Implementation Plan: Offload AI Creation

**Branch**: `issue/688-offload-ai-creation` | **Date**: 2026-04-23 | **Spec**: `/specs/088-offload-ai-creation/spec.md`
**Input**: Feature specification from `/specs/088-offload-ai-creation/spec.md`

## Summary

The goal is to offload the heavy AI operations of the Lore Oracle (text generation, discovery, reconciliation) to a background Web Worker to ensure a stutter-free UI. The technical approach uses a **Hybrid Architecture**: **Comlink (RPC)** for commands like starting a chat, and **BroadcastChannel (Events)** for real-time notifications of discovered entities during a stream.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (Svelte 5 Runes)  
**Primary Dependencies**: Comlink, @google/generative-ai, @codex/oracle-engine  
**Storage**: IndexedDB (Chat History), OPFS (Vault Entities)  
**Testing**: Vitest, Playwright  
**Target Platform**: Browser (Web Workers required)
**Project Type**: Web Application  
**Performance Goals**: 60fps main thread responsiveness during AI generation  
**Constraints**: Must work offline (fallback), handle SSR, and ensure zero-latency discovery.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Worker-Safe Services**: All services in the worker must avoid browser globals. (Check: Refactored `capability-guard.ts`).
- **Idempotency**: Real-time events must not duplicate batch results. (Check: Implemented title-based unique merging).

## Project Structure

### Documentation (this feature)

```text
specs/088-offload-ai-creation/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task breakdown
```

### Source Code

```text
apps/web/src/lib/
├── workers/
│   └── oracle.worker.ts      # Background thread logic
├── cloud-bridge/
│   └── oracle-bridge.ts      # Main thread worker management
├── stores/
│   └── oracle.svelte.ts      # Updated to use worker proxy
packages/
├── oracle-engine/
│   └── src/
│       ├── chat-history.svelte.ts # Added addProposal
│       ├── oracle-executor.ts     # Added merging logic
│       └── types.ts               # Added event types
```

**Structure Decision**: Web application with shared package engine. The heavy logic is moved to `apps/web/src/lib/workers`.

## Complexity Tracking

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| Hybrid RPC/Event Model     | Real-time discovery| Pure RPC requires waiting for end of call; user needs incremental feedback. |
| Metadata Cloning           | Thread isolation   | Direct memory access (SharedArrayBuffer) is too complex for this data model. |
