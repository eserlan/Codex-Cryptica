# Feature Specification: Missing-Data Visibility and Column-Level Filters for Entity Table

**Feature Branch**: `1515-table-missing-filters`  
**Created**: 2026-08-14  
**Status**: Draft  
**Input**: User request to plan issue #1515 ("Slice: Missing-data visibility + column-level filters")

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Spotting Incomplete Entities / Missing-Data Audit (Priority: P1)

A worldbuilder or GM managing a growing campaign vault wants to audit their notes for unfinished or sparse entities. When viewing the Entity Table at `/table`, they click a "Show incomplete only" filter toggle. The table immediately narrows the view to only entities missing one or more core tracked attributes (empty content/summary, zero labels, or zero connections), with empty field cells highlighted for rapid identification.

**Why this priority**: Directly solves the core vault hygiene problem ("find what's missing") and turns the Entity Table into an active vault maintenance tool.

**Independent Test**:
Can be fully tested by creating entities with missing fields and entities with complete fields in a vault, opening `/table`, toggling "Show incomplete only", and verifying only the incomplete entities are listed.

**Acceptance Scenarios**:

1. **Given** an active vault with 5 fully populated entities and 3 entities missing summary, labels, or connections, **When** the user activates the "Show incomplete only" toggle, **Then** the table displays only the 3 incomplete entities and updates the pagination count.
2. **Given** "Show incomplete only" is enabled, **When** empty cells are rendered, **Then** they display an empty marker with heightened visual clarity (e.g. distinct muted placeholder styling) so gaps are easy to scan.
3. **Given** "Show incomplete only" is enabled, **When** the user toggles it off, **Then** the full entity list is restored.

---

### User Story 2 - Column-Level Filtering and Multi-Criteria Composition (Priority: P1)

A user wants to narrow down entities by specific column criteria (e.g., filter to entities with or without labels, filter by category/type, filter by connection count threshold, or filter by specific text in the summary). They open column filter controls directly from table headers or a filter bar, apply one or more criteria, and see results compose with logical AND across all filters and global search.

**Why this priority**: Essential for querying dense vaults without needing a separate complex query language.

**Independent Test**:
Can be tested by applying a column filter (e.g., Tag: "villain" + Connections: 0) alongside a global search query, confirming that only entities matching all active constraints are displayed, and verifying that clicking "Clear all filters" resets the view.

**Acceptance Scenarios**:

1. **Given** an open Entity Table, **When** a user applies a column filter on Labels ("has label" or "missing labels"), **Then** only entities matching that criterion are shown.
2. **Given** one or more active column filters, **When** the user types in the global search bar, **Then** both the text search and column filters are composed together (AND match).
3. **Given** active column filters or an incomplete toggle, **When** the user clicks "Clear all filters", **Then** all column filters and the incomplete toggle are reset to their default states.

---

### User Story 3 - Per-Column Filter Reset and Visual Badges (Priority: P2)

When column filters are applied, the table header displays an active filter indicator/badge on each filtered column and provides a quick clear button per column.

**Why this priority**: Prevents user confusion about why certain rows are hidden and allows surgical adjustment of filters.

**Independent Test**:
Can be tested by filtering on the "Type" and "Labels" columns, verifying the presence of visual active indicators on those headers, clearing just the "Type" filter, and verifying that the "Labels" filter remains active.

**Acceptance Scenarios**:

1. **Given** a column filter is active on a column, **When** viewing that column header, **Then** an active filter indicator is visible.
2. **Given** an active filter on a specific column, **When** clearing that specific column's filter, **Then** only that column's filter is removed and other column filters remain active.

---

### Edge Cases

- **Empty Filter Match**: When combining filters results in 0 matching entities, show a clear "No entities match the selected filters" empty state with a "Reset filters" button.
- **Dynamic Vault Edits**: When an entity is updated in the background or in a modal (e.g. labels added), reactive derived states immediately re-evaluate the incomplete status and column filters.
- **Fast Filter Clearing**: Global "Clear all filters" button is only visible when at least one filter (search query, type filter, column filter, or incomplete toggle) is active.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a "Show incomplete only" toggle switch/button in the Entity Table toolbar.
- **FR-002**: System MUST define entity incompleteness as: entity having an empty summary/content body, having no labels/tags, or having 0 total connections (incoming + outgoing).
- **FR-003**: System MUST support column-level filtering for:
  - **Name / Title**: Substring match
  - **Type**: Multi-select type filter
  - **Connections**: Zero connections, 1+ connections
  - **Summary**: Has summary vs missing summary, text match
  - **Labels**: Has specific label, has no labels (untagged)
  - **Dates (Created/Modified)**: Has date vs missing date
- **FR-004**: System MUST combine all column filters, the incomplete toggle, type filters, and global search using logical AND composition.
- **FR-005**: System MUST display an active filter indicator on column headers that have an active filter.
- **FR-006**: System MUST provide a prominent "Clear all filters" control when any filter condition is active.
- **FR-007**: System MUST reset pagination to page 1 whenever any filter condition changes.
- **FR-008**: System MUST preserve keyboard accessibility and ARIA labels for all filter toggles and header menus.

### Key Entities

- **TableColumnFilters**:
  - `showIncompleteOnly: boolean`
  - `nameQuery?: string`
  - `typeFilter?: Set<string>`
  - `labelFilterMode?: 'all' | 'any' | 'missing' | 'has'`
  - `labelValues?: Set<string>`
  - `connectionsFilter?: 'all' | 'zero' | 'has_connections'`
  - `summaryFilter?: 'all' | 'has_summary' | 'missing_summary'`
- **IncompleteEntityStatus**:
  - Derived check assessing whether an entity has missing summary, missing labels, or 0 connections.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can isolate all incomplete entities with a single click of the "Show incomplete only" toggle in under 50ms for vaults with up to 1,000 entities.
- **SC-002**: Combining 3 or more column filters recalculates the filtered entity list reactively without UI lag or memory leak.
- **SC-003**: 100% test coverage for the filter predicate utilities, covering all field conditions and combinatorial combinations.
- **SC-004**: End-to-end integration test validating the "Show incomplete only" flow and "Clear all filters" flow.
