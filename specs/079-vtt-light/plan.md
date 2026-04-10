# Implementation Plan: Lightweight VTT Functionality

**Branch**: `079-vtt-light` | **Date**: 2026-04-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/079-vtt-light/spec.md`
**Status**: Implemented

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Lightweight VTT is implemented as a session overlay on top of the existing map system. It covers token placement/movement, turn order management, distance measurement, P2P-synchronized shared sessions, encounter snapshot save/load/delete, a dedicated VTT sidebar, an initiative pop-out window, and a host-only share control. Session state stays separate from persistent map data and uses the existing host/guest bridge for multiplayer sync.

## Technical Context

**Language/Version**: TypeScript (as project standard)
**Primary Dependencies**: Svelte 5 (UI), existing `map.svelte.ts` (base map), existing P2P host-service/client-adapter (sync)
**Storage**: In-memory session state; optional vault persistence via OPFS for encounter snapshots
**Testing**: Vitest (unit), Playwright (E2E for shared session flows)
**Target Platform**: Browser (web application)
**Project Type**: Web application feature (SvelteKit frontend)
**Performance Goals**: Smooth token drag at 60fps for ≤20 tokens; <1s sync latency for guest updates; coalesce rapid persistence and sync updates to avoid drag jank; compress large session snapshots at the transport boundary when supported
**Constraints**: Session state must not mutate persistent map data; host-authoritative model for P2P; token ownership controls movement permission only and does not control visibility; offline-capable for single-player use
**Scale/Scope**: ≤20 tokens per session, ≤8 connected peers, single map per session

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Gate                           | Status  | Notes                                                                                                                  |
| ------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| **I. Library-First**           | ✅ PASS | Session store, service, and helper logic live in reusable modules under `apps/web/src/lib/` and `packages/map-engine/` |
| **II. TDD**                    | ✅ PASS | Unit tests cover session store, token operations, initiative logic, sync, and persistence flows                        |
| **III. Simplicity & YAGNI**    | ✅ PASS | The existing map canvas is reused; VTT is an overlay/session layer, not a new engine                                   |
| **IV. AI-First Extraction**    | ⚠️ N/A  | Feature is UI/session management, not data extraction                                                                  |
| **V. Privacy & Client-Side**   | ✅ PASS | Session state stays local-first; P2P is peer-to-peer and transport-compressed when available                           |
| **VI. Clean Implementation**   | ✅ PASS | Svelte 5 runes, constructor DI, and minimal mutation patterns are used throughout                                      |
| **VII. User Documentation**    | ✅ PASS | Help content, sidebar/pop-out guidance, quickstart notes, and task documentation are present                           |
| **VIII. Dependency Injection** | ✅ PASS | Session store and P2P services accept dependencies via constructors                                                    |
| **IX. Natural Language**       | ✅ PASS | UI labels remain plain and task-specific                                                                               |
| **X. Quality & Coverage**      | ✅ PASS | Feature-specific tests cover the main VTT flows and persistence/sync edge cases                                        |

## Project Structure

### Documentation (this feature)

```text
specs/079-vtt-light/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── stores/
│   │   ├── map-session.svelte.ts       # Session state, initiative, measurement, sync
│   │   ├── map.svelte.ts               # Base map state and persistence
│   │   └── vault.svelte.ts             # Vault and OPFS persistence helpers
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapView.svelte           # Map canvas, token overlay, drag handling
│   │   │   ├── VTTControls.svelte       # Top-level VTT controls and host share entry
│   │   │   ├── vtt-ui.ts                # Shared VTT UI state helpers
│   │   │   └── vtt-mode-menu.svelte.ts  # Mode menu state helpers
│   │   └── vtt/
│   │       ├── InitiativePanel.svelte   # Docked initiative sidebar and pop-out
│   │       ├── TokenDetail.svelte       # Selected token info, ownership, removal
│   │       ├── EncounterManager.svelte  # Save/load/delete encounter UI
│   │       ├── GuestSessionBootstrap.svelte # Guest popout bootstrap and hydration
│   │       ├── GuestInfoOverlay.svelte   # Joined-players roster
│   │       └── VTTChat.svelte           # Shared chat panel for VTT sessions
│   ├── services/
│   │   └── vtt-session.ts               # Encounter snapshot persistence service
│   ├── utils/
│   │   └── vtt-helpers.ts               # Grid snapping, distance calc, hit-testing
│   └── config/
│       └── help-content.ts              # VTT help entries and feature guidance
├── types/
│   └── vtt.ts                          # Token, session, initiative, protocol types
packages/map-engine/src/
└── renderer.ts                          # Token and measurement rendering
packages/map-engine/tests/
└── renderer.test.ts                     # Rendering and transform coverage
apps/web/tests/
├── map.spec.ts                          # Map/VTT UI integration coverage
├── guest-mode.spec.ts                   # Guest/session integration coverage
└── p2p-image-sync.spec.ts               # Shared sync and transport coverage
```

**Structure Decision**: Single-project web application feature. The implementation lives in `apps/web/src/lib/` with shared token rendering logic in `packages/map-engine/`. VTT-specific types live in `apps/web/src/types/vtt.ts`. If the session layer grows beyond the web app scope, it can still be extracted later (per Library-First principle).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation        | Why Needed | Simpler Alternative Rejected Because |
| ---------------- | ---------- | ------------------------------------ |
| [None currently] | —          | —                                    |
