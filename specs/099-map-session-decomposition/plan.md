# Implementation Plan: Map Session Store Decomposition

**Branch**: `099-map-session-decomposition` | **Date**: 2026-05-18 | **Spec**: [`spec.md`](./spec.md)
**Input**: Feature specification from `/specs/099-map-session-decomposition/spec.md`

## Summary

Refactor `apps/web/src/lib/stores/map-session.svelte.ts` from a broad VTT coordination store into a smaller compatibility facade. The refactor will extract active-map/session lifecycle orchestration and `EncounterSession` snapshot assembly/application into focused, constructor-injected collaborators, while allowing selected low-risk consumers to use cleaner manager APIs where that reduces coupling. Existing VTT gameplay, persistence, popout sync, saved snapshots, and P2P session behavior must remain compatible.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes  
**Primary Dependencies**: SvelteKit, Vitest, existing VTT managers under `apps/web/src/lib/stores/vtt/`, `VTTSessionService`, P2P host/guest services  
**Storage**: Browser `sessionStorage`/`localStorage` for VTT drafts/popouts, OPFS-backed encounter snapshot persistence via `VTTSessionService`  
**Testing**: Vitest unit tests, focused P2P-dependent tests, `svelte-check` via `pnpm --filter=web run lint:types`  
**Target Platform**: Web browser, with tests running in jsdom/non-browser-like contexts  
**Project Type**: SvelteKit web application with local-first client-side state stores  
**Performance Goals**: Preserve current debounced draft persistence and 250ms session snapshot broadcast behavior; no added synchronous work on token movement, turn advance, or remote snapshot handling  
**Constraints**: Preserve exported `mapSession` singleton compatibility, Svelte 5 rune state behavior, saved `EncounterSession` compatibility, P2P `SESSION_SNAPSHOT` compatibility, and constructor-based DI  
**Scale/Scope**: One high-risk store currently about 896 lines; target below 500 lines by extracting lifecycle and snapshot responsibilities plus selected low-risk consumer migrations

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Library-First**: Pass. This is web-store decomposition inside an existing app domain, not a new standalone engine. No new package is needed because behavior depends on Svelte rune store state and app-local VTT managers.
- **TDD**: Pass. Plan requires tests before/with extraction for lifecycle, snapshot compatibility, current map-session behavior, and P2P-dependent behavior.
- **Simplicity & YAGNI**: Pass. Scope is limited to lifecycle extraction, snapshot extraction, and selected low-risk consumer migration; full facade rewrite is deferred.
- **AI-First Extraction**: N/A. This feature does not change Oracle or AI ingestion behavior.
- **Privacy & Client-Side Processing**: Pass. All state remains local-first in browser storage/OPFS and client-side memory.
- **Clean Implementation**: Pass. Plan includes focused verification, type checking, and surgical module boundaries.
- **User Documentation**: N/A. No user-facing feature or workflow changes.
- **Dependency Injection**: Pass. New collaborators must use constructor-based dependency injection with production defaults supplied by `MapSessionStore`.
- **Natural Language**: Pass. No user-facing language changes expected.
- **Quality & Coverage Enforcement**: Pass. Existing and new tests must maintain or improve coverage for moved behavior.
- **Agent Operational Protocol**: Pass. Scope and validation gates are explicit.

## Project Structure

### Documentation (this feature)

```text
specs/099-map-session-decomposition/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── map-session-boundaries.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/web/src/lib/stores/
├── map-session.svelte.ts                 # Compatibility facade to slim down
├── map-session.test.ts                    # Existing API regression tests
└── vtt/
    ├── vtt-session-lifecycle-manager.svelte.ts      # New lifecycle coordinator
    ├── vtt-session-lifecycle-manager.test.ts        # New focused tests
    ├── vtt-session-snapshot-manager.ts              # New snapshot translator
    ├── vtt-session-snapshot-manager.test.ts         # New compatibility tests
    ├── vtt-chat-manager.svelte.ts
    ├── vtt-encounter-manager.svelte.ts
    ├── vtt-grid-manager.svelte.ts
    ├── vtt-initiative-manager.svelte.ts
    ├── vtt-measurement-manager.svelte.ts
    ├── vtt-media-manager.svelte.ts
    ├── vtt-network-manager.svelte.ts
    ├── vtt-persistence-manager.svelte.ts
    └── vtt-token-manager.svelte.ts

apps/web/src/lib/cloud-bridge/p2p/
├── host-service.svelte.ts                 # P2P-dependent compatibility tests
├── guest-service.ts                       # P2P-dependent compatibility tests
└── p2p.test.ts
```

**Structure Decision**: Keep the refactor inside `apps/web/src/lib/stores/vtt/` because the extracted collaborators coordinate existing rune-based managers and app-local VTT state. Do not create a new package for this feature; there is no reusable library boundary independent of Svelte store state.

## Complexity Tracking

No constitution violations are required.

## Phase 0: Research

Research decisions are captured in [`research.md`](./research.md). Key outcomes:

- Keep `MapSessionStore` as a compatibility facade while allowing selected low-risk consumer migrations.
- Extract lifecycle and snapshot responsibilities into two collaborators.
- Use automated tests and type checks as formal acceptance; manual browser host/guest testing remains optional supporting evidence.

## Phase 1: Design

Design artifacts:

- [`data-model.md`](./data-model.md): responsibility model, collaborator boundaries, state transitions, and compatibility rules.
- [`contracts/map-session-boundaries.md`](./contracts/map-session-boundaries.md): internal API and compatibility contracts for the facade, lifecycle coordinator, snapshot manager, and migrated consumers.
- [`quickstart.md`](./quickstart.md): verification and implementation workflow.

## Post-Design Constitution Check

- **Library-First**: Still pass. Design keeps code in the existing app-local VTT store area because extracted logic is not independently reusable outside Svelte state.
- **TDD**: Still pass. Design requires focused tests for lifecycle and snapshot managers before migration is considered complete.
- **Simplicity & YAGNI**: Still pass. Full decomposition and wholesale consumer migration are explicitly deferred.
- **Privacy & Client-Side Processing**: Still pass. Storage remains browser local storage/session storage and OPFS through existing services.
- **Dependency Injection**: Still pass. New collaborators expose dependency interfaces and are constructed by `MapSessionStore`.
- **Quality & Coverage Enforcement**: Still pass. Existing map-session tests, new manager tests, P2P-dependent tests, and type checking are required.
