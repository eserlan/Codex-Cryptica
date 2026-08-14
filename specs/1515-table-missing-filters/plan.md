# Implementation Plan: Missing-Data Visibility & Column-Level Filters for Entity Table

**Branch**: `1515-table-missing-filters` | **Date**: 2026-08-14 | **Spec**: [specs/1515-table-missing-filters/spec.md](file:///home/espen/proj/Codex-Cryptica-v2/specs/1515-table-missing-filters/spec.md)  
**Input**: Feature specification from `specs/1515-table-missing-filters/spec.md`

## Summary

Implement missing-data visibility ("Show incomplete only" toggle and gap highlighting) alongside column-level filtering for the Entity Table view (`/table`), transforming the table into a focused vault cleanup and auditing tool.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14  
**Primary Dependencies**: Svelte 5, Tailwind 4 semantic tokens, Lucide Iconify utility classes, `@codex/search-orchestrator`  
**Storage**: Transient client-side reactive state (persisted preset views deferred to #1518)  
**Testing**: Vitest (`bun test`), Playwright (`bun run test:e2e --reporter=list`)  
**Target Platform**: Modern Evergreen Browsers (Client-side / Web Worker)  
**Project Type**: Web Application UI & Filtering Utilities  
**Performance Goals**: < 16ms predicate filter re-calculation across 1,000 entities  
**Constraints**: Zero regressions to existing table sorting, pagination, and multi-row selection  
**Scale/Scope**: 1 route (`/table`), 3 components (`EntityTable`, `EntityTableRow`, `TableColumnFilterMenu`), 1 shared utility (`entityListFiltering.ts`)

## Constitution Check

- **I. Library-First**: Pure filter predicates and evaluation functions placed in reusable utility module (`entityListFiltering.ts`).
- **II. TDD**: Unit tests covering 100% of predicate conditions and combinatorial filter scenarios written before/alongside logic.
- **III. Simplicity & YAGNI**: Leverage native TypeScript arrays/Sets and Svelte 5 runes without heavy external table libraries.
- **V. Privacy & Client-Side**: All missing-data analysis and filtering occurs strictly in-memory client-side.
- **VI. Clean Implementation**: Svelte 5 Runes, Tailwind 4 theme tokens, Iconify utility classes, and explicit typing.
- **XII. Terminology Unification**: Exclusively use "Labels" (not "Tags") in all UI text and code symbols.

## Project Structure

### Documentation (this feature)

```text
specs/1515-table-missing-filters/
├── spec.md              # Feature specification
├── plan.md              # This plan
├── research.md          # Architectural research & decisions
├── data-model.md        # Data models and interfaces
├── quickstart.md        # Manual and automated testing guide
├── contracts/
│   └── ui-contract.md   # UI interactions & accessibility contract
└── tasks.md             # Implementation tasks
```

### Source Code

```text
apps/web/src/
├── lib/
│   ├── components/
│   │   ├── explorer/
│   │   │   ├── entityListFiltering.ts         # Add missing-data predicate & column filter logic
│   │   │   └── __tests__/
│   │   │       └── entityListFiltering.test.ts # Add tests for incomplete & column filters
│   │   └── table/
│   │       ├── EntityTable.svelte             # Add column filter affordances & incomplete styling bindings
│   │       ├── EntityTableRow.svelte          # Add highlighted empty-cell rendering in incomplete mode
│   │       └── TableColumnFilterMenu.svelte   # Per-column filter popover/dropdown
└── routes/
    └── (app)/
        └── table/
            └── +page.svelte                   # Wire up toolbar toggle, column filters state, and reset controls
```

## Complexity Tracking

No constitution violations or unjustified complexities.
