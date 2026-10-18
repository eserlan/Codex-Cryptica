# Research: Missing-Data Visibility & Column-Level Filters for Entity Table

**Feature**: `1515-table-missing-filters`  
**Date**: 2026-08-14

## Research Findings & Architectural Decisions

### 1. Incomplete Entity Predicate Definition

- **Context**: Issue #1508 and #1515 require surfacing incomplete entities so users can easily spot gaps in their vault.
- **Decision**: Define an entity as incomplete if any of the following standard fields are empty:
  1. `summary` or content preview is empty / whitespace-only.
  2. `labels` array is empty or undefined.
  3. Total connection count (incoming + outgoing connections from `connectionCounts`) is 0.
  4. Entity has no custom metadata or type is unassigned.
- **Rationale**: These represent the minimum bar for a well-integrated entity in the vault graph.
- **Alternatives considered**:
  - Complex schema validation per category: Overkill for MVP; adds schema rigidity before user-configurable schemas exist.
  - Only checking summary: Leaves out disconnected orphans and untagged notes.

### 2. Filter Composition Architecture

- **Context**: We have existing text search (handled in web worker via `@codex/search-orchestrator`), category type filtering, and label filtering.
- **Decision**: Co-locate column filter predicates and the `isIncompleteEntity` helper in `$lib/components/explorer/entityListFiltering.ts` as pure functions. Extend `FilterOptions` with `showIncompleteOnly: boolean` and `columnFilters: TableColumnFilters`.
- **Rationale**: `entityListFiltering.ts` is already the single source of truth for entity predicate filtering across Explorer and Entity Table. Testing remains 100% pure unit tests in Vitest.
- **Alternatives considered**:
  - Filtering directly inside `EntityTable.svelte`: Couples filtering logic tightly to component rendering and makes unit testing difficult.
  - Adding a new external filtering library: Violates YAGNI; standard TypeScript predicates are fast, type-safe, and zero-overhead for 1,000+ entities.

### 3. Column Filter UI & Interaction Pattern

- **Context**: Users need clear controls to filter per column and toggle incomplete-only mode.
- **Decision**:
  1. Add a prominent "Incomplete only" toggle button in the table toolbar next to the Search input and Type chips.
  2. For column headers (Name, Type, Connections, Summary, Labels, Created, Modified), add a column filter popover / header menu when hovering or clicking the column filter button.
  3. Include a "Clear all filters" button in the filter toolbar that becomes visible whenever any active filter is applied.
- **Rationale**: Matches standard data table UX (like Notion / Airtable / VS Code tables) and adheres to `@docs/STYLE_GUIDE.md` using Svelte 5 runes and Tailwind 4 theme tokens.

### 4. Empty Cell Styling & Visual Highlighting

- **Context**: When "Show incomplete only" is toggled on, users want to scan missing fields immediately.
- **Decision**: In `EntityTableRow.svelte`, when `showIncompleteOnly` is active, empty cells rendering `—` will receive enhanced styling (`text-amber-500/80 dark:text-amber-400/80 font-mono text-xs px-1.5 py-0.5 rounded bg-amber-500/10` or a distinct badge) to make gaps visually pop.
- **Rationale**: High visibility without cluttering normal viewing mode.
