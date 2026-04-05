# Implementation Plan: Lightweight VTT Functionality

**Branch**: `079-vtt-light` | **Date**: 2026-04-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/079-vtt-light/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a lightweight VTT session layer on top of the existing map system, introducing token placement/movement, turn order management, distance measurement, and P2P-synchronized shared sessions. Session state is kept separate from persistent map data, with optional save/load of encounter snapshots. Built as an overlay on the existing `MapView` component with a new `MapSession` store, leveraging the existing P2P host/guest infrastructure for multiplayer.

## Technical Context

**Language/Version**: TypeScript (as project standard)
**Primary Dependencies**: Svelte 5 (UI), existing `map.svelte.ts` (base map), existing P2P host-service/client-adapter (sync)
**Storage**: In-memory session state; optional vault persistence via OPFS for encounter snapshots
**Testing**: Vitest (unit), Playwright (E2E for shared session flows)
**Target Platform**: Browser (web application)
**Project Type**: Web application feature (SvelteKit frontend)
**Performance Goals**: Smooth token drag at 60fps for ≤20 tokens; <1s sync latency for guest updates
**Constraints**: Session state must not mutate persistent map data; host-authoritative model for P2P; offline-capable for single-player use
**Scale/Scope**: ≤20 tokens per session, ≤8 connected peers, single map per session

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Gate                           | Status  | Notes                                                                                                        |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------ |
| **I. Library-First**           | ✅ PASS | New `map-session` store as standalone module in `apps/web/src/lib/stores/`; extractable to package if reused |
| **II. TDD**                    | ✅ PASS | Unit tests for session store, token operations, initiative logic; E2E for shared session flows               |
| **III. Simplicity & YAGNI**    | ✅ PASS | Overlay approach reuses existing MapView; DOM/SVG overlay for tokens — no custom canvas engine               |
| **IV. AI-First Extraction**    | ⚠️ N/A  | Feature is UI/session management, not data extraction                                                        |
| **V. Privacy & Client-Side**   | ✅ PASS | All session state in browser; P2P is peer-to-peer (no server relay)                                          |
| **VI. Clean Implementation**   | ✅ PASS | Svelte 5 `$derived` for computed state; constructor DI; Tailwind 4 syntax                                    |
| **VII. User Documentation**    | ✅ PASS | Help content entries + FeatureHint for first-time VTT mode entry                                             |
| **VIII. Dependency Injection** | ✅ PASS | Session store accepts dependencies (map store, P2P service) via constructor                                  |
| **IX. Natural Language**       | ✅ PASS | UI labels: "Tokens", "Turn Order", "Measure" — clear and accessible                                          |
| **X. Quality & Coverage**      | ✅ PASS | Target 70%+ coverage for new session store and token logic                                                   |

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
│   │   ├── map-session.svelte.ts       # New: session state store
│   │   ├── map.svelte.ts               # Existing: extended with VTT mode flag
│   │   └── vault.svelte.ts             # Existing: encounter snapshot save/load
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapView.svelte           # Existing: token overlay + drag handling added
│   │   │   ├── TokenOverlay.svelte      # New: renders tokens on map
│   │   │   ├── MeasurementTool.svelte   # New: distance ruler overlay
│   │   │   ├── VTTControls.svelte       # New: VTT mode toggle, tool selection
│   │   │   └── TokenAddDialog.svelte    # New: token placement dialog
│   │   └── vtt/
│   │       ├── InitiativePanel.svelte   # New: turn order sidebar
│   │       ├── TokenDetail.svelte       # New: selected token info panel
│   │       └── EncounterManager.svelte  # New: save/load encounter UI
│   ├── services/
│   │   └── (VTT messages extend existing P2P host-service and guest-service)
│   ├── utils/
│   │   └── vtt-helpers.ts               # New: grid snapping, distance calc, hit-testing
│   └── config/
│       └── help-content.ts              # Updated: VTT help entries
├── types/
│   └── vtt.ts                          # New: Token, Session, Initiative types
tests/
├── unit/
│   ├── stores/map-session.test.ts       # Session store operations
│   ├── services/vtt-session.test.ts     # P2P sync protocol
│   ├── lib/vtt-helpers.test.ts          # Grid snapping, distance, hit-testing
│   └── renderer/render-tokens.test.ts   # Token rendering coordinate transforms
└── e2e/
    ├── vtt-token-drag.spec.ts           # Token drag interaction
    ├── vtt-session.spec.ts              # Shared session flow
    └── vtt-combat-round.spec.ts         # Full combat round flow
```

**Structure Decision**: Single-project web application feature. New store (`map-session.svelte.ts`), components, and service layer added within `apps/web/src/lib/`. Types in a dedicated `vtt.ts` module. If the session layer grows beyond the web app scope, it can be extracted to a `packages/vtt-session/` later (per Library-First principle).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation        | Why Needed | Simpler Alternative Rejected Because |
| ---------------- | ---------- | ------------------------------------ |
| [None currently] | —          | —                                    |
