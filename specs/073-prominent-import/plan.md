# Implementation Plan: Prominent Import Feature

**Branch**: `073-prominent-import` | **Date**: 2026-03-14 | **Spec**: [specs/073-prominent-import/spec.md](spec.md)
**Input**: Feature specification from `/specs/073-prominent-import/spec.md`

## Summary

This feature makes the data import process more accessible and prominent. It adds a global "IMPORT" button to the `VaultControls` (top menu). The technical approach has shifted from a settings modal integration to a **Dedicated Archive Importer** that pops out in a new browser window, providing a focused environment for continuous data processing.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (Svelte 5 Runes)
**Primary Dependencies**: Svelte, Lucide-Svelte, Tailwind 4
**Storage**: OPFS (via Importer package)
**Testing**: Playwright (E2E)
**Target Platform**: Web (Prerendered/Static)
**Project Type**: web
**Performance Goals**: Instant UI transition to focused Popout Terminal
**Constraints**: Client-side only (Privacy principle); `window.open` compatibility
**Scale/Scope**: Dedicated standalone route with global navigation exclusion

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Library-First**: PASS (Reuses `@codex/importer`).
- **Privacy**: PASS (All local processing).
- **Simplicity**: PASS (Reuses existing `ImportSettings` component in a standalone route).
- **User Documentation**: PASS (Includes `FeatureHint` and dedicated route description).

## Project Structure

### Documentation (this feature)

```text
specs/073-prominent-import/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output
    └── ui-actions.md
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── VaultControls.svelte       # MODIFIED: Added global Import button
│   │   └── stores/
│   │       └── ui.svelte.ts               # MODIFIED: openImportWindow popout logic
│   └── routes/
│       ├── +layout.svelte                 # MODIFIED: Hide global menu for /import
└── import/
    └── +page.svelte               # NEW: Dedicated Archive Importer route
└── tests/
    └── import-prominence.spec.ts          # NEW: E2E verification for popout behavior
```

**Structure Decision**: Monorepo. The changes are primarily in the `web` app. The popout approach ensures that the import process does not block the main application thread or UI session.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected.
