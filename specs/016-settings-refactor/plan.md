# Implementation Plan: Settings Panel Refactoring

**Branch**: `016-settings-refactor` | **Date**: 2026-01-29 | **Spec**: `/specs/016-settings-refactor/spec.md`

## Summary

Refactor the application settings UI from a "Cloud-first" dropdown to a unified, tabbed `SettingsModal`. This involves decoupling `CloudStatus` logic, integrating `CategoryManager` and `AISettings` into a single modal, and updating the `UIStore` to manage tab state.

## Technical Context

**Language/Version**: TypeScript 5.x, Svelte 5  
**Primary Dependencies**: Tailwind CSS, Svelte Transition  
**Storage**: N/A (UI-only state)  
**Testing**: Playwright (E2E)  
**Target Platform**: Web (Responsive)  
**Project Type**: SvelteKit Web App

## Constitution Check

- **Local-First**: PASS. Settings remain local.
- **Offline-Capable**: PASS. No external dependencies for the UI.

## Project Structure

### Documentation (this feature)

```text
specs/016-settings-refactor/
├── plan.md              # This file
├── research.md          # UI Architecture decisions
├── data-model.md        # UI state definitions
├── quickstart.md        # How to add new tabs
└── tasks.md             # Execution steps
```

### Source Code

```text
apps/web/src/
├── lib/components/settings/
│   ├── SettingsModal.svelte    # [NEW] Container
│   ├── CloudStatus.svelte      # [UPDATED] Refactored to be embeddable
│   ├── AISettings.svelte       # [REUSED]
│   └── CategorySettings.svelte # [REUSED]
├── stores/
│   └── ui.svelte.ts            # [UPDATED] Tab state
└── routes/
    └── +layout.svelte          # [UPDATED] Global modal mount
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      |            |                                      |
