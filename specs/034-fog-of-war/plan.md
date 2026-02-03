# Implementation Plan: Fog of War

**Branch**: `034-fog-of-war` | **Date**: 2026-02-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/034-fog-of-war/spec.md`

## Summary

Implement a "Fog of War" system for shared worlds that allows content to be hidden or revealed based on tags (`hidden`, `revealed`) and a global "Default Visibility" setting. The system will include a "Shared Mode" UI toggle for World Builders to preview the player-facing experience, affecting both the Graph and Search results in real-time.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: Svelte 5, Cytoscape.js, FlexSearch, `idb`  
**Storage**: OPFS (Vault Files), IndexedDB (Metadata), LocalStorage (UI State)  
**Testing**: Vitest (Unit), Playwright (E2E)  
**Target Platform**: Modern Browsers (WASM/OPFS support required)
**Project Type**: Web Application (SvelteKit + Monorepo packages)  
**Performance Goals**: Mode switch < 300ms, Search filtering < 100ms  
**Constraints**: Offline-first, Client-side processing only  
**Scale/Scope**: Support up to 1000 nodes with real-time filtering

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Library-First**: Filtering logic will be integrated into `packages/graph-engine` and `packages/schema`.
- [x] **TDD**: Playwright tests will verify 0% leakage in Shared Mode. Vitest will cover tag logic.
- [x] **Simplicity & YAGNI**: Use Cytoscape's `filter()` or stylesheet selectors for visibility.
- [x] **Privacy & Client-Side**: All visibility logic runs in the browser; no data leaves the client.
- [x] **Clean Implementation**: Adhere to Svelte 5 `$derived` patterns for reactive filtering.

## Project Structure

### Documentation (this feature)

```text
specs/034-fog-of-war/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec validation
└── tasks.md             # Phase 2 output (future)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── lib/
│   │   ├── stores/
│   │   │   ├── ui.svelte.ts     # sharedMode state
│   │   │   ├── vault.svelte.ts  # defaultVisibility state & persistence
│   │   │   ├── graph.svelte.ts  # Reactive elements filtering integration
│   │   │   └── search.ts        # Search results filtering integration
│   │   └── components/
│   │       ├── VaultControls.svelte  # Shared Mode toggle icon
│   │       └── settings/
│   │           └── VaultSettings.svelte # Fog of War config
└── tests/
    └── fog-of-war.spec.ts  # Playwright E2E leakage tests

packages/
├── schema/
│   └── src/
│       └── visibility.ts    # NEW: Core visibility check logic (Library-First)
└── graph-engine/            # Filter integration
```

**Structure Decision**: Web Application + Library. Core visibility logic resides in `packages/schema` for reuse and testability. UI state and filtering integration remain in `apps/web`.

## Complexity Tracking

*No violations identified.*


> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
