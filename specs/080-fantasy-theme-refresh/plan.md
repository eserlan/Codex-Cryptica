# Implementation Plan: Fantasy Theme Refresh

**Branch**: `080-fantasy-theme-refresh` | **Date**: 2026-04-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/workspaces/Codex-Cryptica/specs/080-fantasy-theme-refresh/spec.md`

**Note**: This plan is aligned to the Speckit plan template and scoped to the current screenshot-driven refresh of the existing Classic/fantasy theme.

## Summary

Refresh the existing Classic/fantasy theme so the interface reads as a cohesive warm parchment experience. The first pass is driven by the user's explicit priorities: remove cyan and pink accents, replace multicolor icon rows with unified ink/brown icon states, and warm panel surfaces to match the parchment background. From there, the implementation will also tone down the dominant brown action surface and strengthen hierarchy in the entity view.

## Technical Context

**Language/Version**: TypeScript 5.x, Svelte 5  
**Primary Dependencies**: SvelteKit, Tailwind CSS 4, Playwright, workspace `schema` package  
**Storage**: Existing browser theme persistence only (`localStorage`, IndexedDB, OPFS via current theme flow); no new storage  
**Testing**: Playwright E2E in `apps/web/tests/themes.spec.ts`  
**Target Platform**: Modern desktop and mobile browsers  
**Project Type**: Web application monorepo  
**Performance Goals**: Preserve current theme-switch speed, avoid visible layout shifts, and keep the refresh CSS-driven where possible  
**Constraints**: Preserve non-fantasy themes, follow the existing shared theme system, maintain accessible contrast on parchment surfaces, avoid hardcoded one-off color logic spread across many components, and keep the implementation focused on the screenshot-identified surfaces first  
**Scale/Scope**: Shared theme tokens plus a focused set of fantasy-facing UI surfaces in `apps/web`, especially the title area, icon rows, panel shells, borders, primary brown action surface, and entity-view hierarchy

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: Shared visual tokens remain defined in the reusable schema/theme layer, with `apps/web` consuming those tokens through the existing theme store. [PASS]
2. **TDD**: Theme behavior changes will be covered with Playwright regression checks for the affected fantasy surfaces before or alongside implementation. [PASS]
3. **Simplicity & YAGNI**: This plan extends the current theme system instead of introducing a second styling mechanism. [PASS]
4. **Privacy & Client-Side Processing**: No new server-side behavior or data handling is introduced. [PASS]
5. **Clean Implementation**: Changes remain within the existing Svelte 5 and Tailwind 4 patterns already used by the repo. [PASS]
6. **User Documentation**: No new user-facing feature needs a help article; this is a refinement of an existing theme. [PASS]
7. **Dependency Injection**: No new services or stores are introduced. [PASS]
8. **Natural Language**: Any changed user-facing text must remain clear and plain. No jargon changes are planned. [PASS]

## Project Structure

### Documentation (this feature)

```text
specs/080-fantasy-theme-refresh/
├── spec.md                    # Feature specification
├── plan.md                    # This file
├── tasks.md                   # Implementation task list
└── checklists/
    └── requirements.md        # Specification quality checklist
```

### Source Code (repository root)

```text
apps/
└── web/
    ├── src/
    │   ├── app.css
    │   ├── lib/
    │   │   ├── components/
    │   │   │   ├── EntityDetailPanel.svelte
    │   │   │   ├── entity/
    │   │   │   │   └── EmbeddedEntityView.svelte
    │   │   │   ├── entity-detail/
    │   │   │   │   ├── DetailHeader.svelte
    │   │   │   │   ├── DetailStatusTab.svelte
    │   │   │   │   └── DetailTabs.svelte
    │   │   │   ├── explorer/
    │   │   │   │   └── EntityList.svelte
    │   │   │   └── layout/
    │   │   │       └── SidebarPanelHost.svelte
    │   │   └── stores/
    │   │       └── theme.svelte.ts
    │   └── tests/
    │       └── themes.spec.ts
packages/
└── schema/
    └── src/
        └── theme.ts
```

**Structure Decision**: Keep shared fantasy token decisions centralized in `packages/schema/src/theme.ts`, map them through the existing theme store and global CSS in `apps/web/src/lib/stores/theme.svelte.ts` and `apps/web/src/app.css`, and make targeted component updates only where the current fantasy presentation breaks cohesion. The first target set is the exact screenshot-driven problem areas: cold title/highlight colors, multicolor icons, panel warmth, border tone, the dominant brown action surface, and entity-view hierarchy.

## Complexity Tracking

N/A - No constitution violations identified.
