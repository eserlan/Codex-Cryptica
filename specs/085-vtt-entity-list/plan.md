# Implementation Plan: VTT Entity List

**Branch**: `085-vtt-entity-list` | **Date**: 2026-04-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/085-vtt-entity-list/spec.md`

## Summary

The VTT Entity List feature enables users to browse and search their vault entities directly within the VTT sidebar and drag them onto the map canvas to create tokens. This streamlines encounter setup and gameplay by linking lore directly to the tactical interface.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: Svelte 5 (Runes), SvelteKit, `map-engine`  
**Storage**: `localStorage` (for UI state persistence), `idb` via Dexie (for entity data)  
**Testing**: Vitest (Unit/Integration), Playwright (E2E)  
**Target Platform**: Web (Chrome, Firefox, Safari)
**Project Type**: Web Application  
**Performance Goals**: <50ms UI response, <100ms entity filtering, real-time drag preview at 60fps  
**Constraints**: Client-side only, offline-capable  
**Scale/Scope**: Support vaults with thousands of entities

## Constitution Check

| Principle                | Check                                              | Result |
| ------------------------ | -------------------------------------------------- | ------ |
| I. Library-First         | Reuses `EntityList.svelte` and `map-engine`.       | PASS   |
| II. TDD                  | New tests for drag-and-drop and state persistence. | PASS   |
| III. Simplicity & YAGNI  | Extends existing `mapSession` and `uiStore`.       | PASS   |
| V. Privacy               | All data processed in-browser.                     | PASS   |
| VI. Clean Implementation | Using Svelte 5 runes and Tailwind 4.               | PASS   |
| VII. User Documentation  | New help article for VTT Entity List.              | PASS   |
| VIII. DI                 | `MapSessionStore` already uses DI.                 | PASS   |

## Project Structure

### Documentation (this feature)

```text
specs/085-vtt-entity-list/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Research findings
├── data-model.md        # Data model extensions
├── quickstart.md        # Testing guide
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code

```text
apps/web/src/
├── lib/
│   ├── components/
│   │   ├── explorer/
│   │   │   └── EntityList.svelte (reused)
│   │   └── map/
│   │       └── MapView.svelte (updated for drag preview)
│   ├── stores/
│   │   ├── map-session.svelte.ts (updated for drag state)
│   │   └── ui.svelte.ts (updated for persistence)
└── routes/
    └── (app)/
        └── map/
            └── +page.svelte (updated for sidebar integration and drop handling)
```

**Structure Decision**: Extending existing Svelte components and stores in `apps/web`.

## Complexity Tracking

No constitution violations.
