# Implementation Plan: Prominent Import Feature

**Branch**: `073-prominent-import` | **Date**: 2026-03-14 | **Spec**: [specs/073-prominent-import/spec.md](spec.md)
**Input**: Feature specification from `/specs/073-prominent-import/spec.md`

## Summary

This feature makes the data import process more accessible and prominent. It adds a global "IMPORT" button to the `VaultControls` (top menu) and implements an `EmptyVaultOverlay` to guide new users when their vault contains no entities. The technical approach leverages existing `ImportSettings.svelte` logic by deep-linking to the vault settings tab.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (Svelte 5 Runes)
**Primary Dependencies**: Svelte, Lucide-Svelte, Tailwind 4
**Storage**: OPFS (via Importer package)
**Testing**: Playwright (E2E)
**Target Platform**: Web (Prerendered/Static)
**Project Type**: web
**Performance Goals**: Instant UI transition to Settings Modal
**Constraints**: Client-side only (Privacy principle)
**Scale/Scope**: Small UI enhancement with significant onboarding impact

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Library-First**: PASS (Reuses `@codex/importer`).
- **Privacy**: PASS (All local processing).
- **Simplicity**: PASS (Reuses existing `SettingsModal` and `ImportSettings` components).
- **User Documentation**: PASS (Plan includes adding a `FeatureHint` for the new button).

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
│   │   │   ├── VaultControls.svelte       # MODIFIED: Added global Import button
│   │   │   └── vaults/
│   │   │       └── EmptyVaultOverlay.svelte # NEW: Onboarding guide for empty vaults
│   │   └── stores/
│   │       └── ui.svelte.ts               # MODIFIED: Support for deep-linking/scrolling to import
└── tests/
    └── import-prominence.spec.ts          # NEW: E2E verification
```

**Structure Decision**: Monorepo. The changes are primarily in the `web` app as it's a UI-focused feature. Reusing existing stores and components ensures consistency.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected.
