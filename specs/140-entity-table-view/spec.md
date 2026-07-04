# Feature Specification: Entity Table / List View

**Feature Branch**: `140-entity-table-view`
**Created**: 2026-07-05
**Status**: Implemented (retroactive spec)
**Input**: Retroactive spec for the Entity Table / List View (epic #1508): document the feature as implemented so far — read-only entity table view (#1509/#1512), connection summary (#1520), row selection + bulk label actions (#1516/#1521), createdAt/modifiedAt columns — based on the actual code in the repo.

> **Note**: This spec was written after the initial implementation shipped, to give the Entity Table a durable source of truth as further slices land (e.g. selection model and context menu actions, #1627). It describes shipped behavior; future slices should extend this document.

## Overview

The Entity Table is a spreadsheet-like view where every entity in the open vault is a row and key attributes are columns. It exists for broad overview, comparison, gap-spotting, and maintenance across large vaults — a third mode of working alongside the two existing entity experiences:

- **Entity page**: inspect and edit one entity
- **Entity Explorer**: understand relationships and connections
- **Entity Table**: get a broad overview, compare entities, spot gaps, and quickly navigate large vaults

The view is read-heavy: it does not edit entity content inline. Maintenance actions operate on selections (currently: bulk label add/remove) and route through existing dialogs.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Browse the whole vault as a table (Priority: P1)

A user with a grown vault opens the Entity Table and sees every entity as a row with its name, type, connection counts, a content summary snippet, labels, and created/modified dates — enough to survey the vault at a glance without opening entities one by one.

**Why this priority**: This is the core value of the feature — the overview mode that the entity-centric views cannot provide. Everything else (filtering, sorting, selection) refines this table.

**Independent Test**: Open a vault with entities of several types and navigate to the table view; verify one row per entity with all seven columns populated (or an explicit "—" placeholder where data is missing).

**Acceptance Scenarios**:

1. **Given** an open vault with entities, **When** the user opens the Entity Table, **Then** every entity appears as a row showing name, type badge (with category icon and color), connection summary, content snippet, up to 3 label chips (with a "+N" overflow indicator), created date, and modified date.
2. **Given** an entity with no summary content, labels, or timestamps, **When** it is rendered, **Then** the empty cells show a "—" placeholder with an accessible label rather than blank space.
3. **Given** no vault is open, **When** the user visits the table view, **Then** an empty state explains that a vault must be opened first.
4. **Given** an open vault with zero entities, **When** the user visits the table view, **Then** an empty state explains that created entities will appear here as rows.
5. **Given** the vault is still loading, **When** the user visits the table view, **Then** a loading indicator is shown instead of an empty or partial table.

---

### User Story 2 - Narrow the table with search and filters (Priority: P2)

A user answering questions like "which characters are in this vault?" or "which entities carry this label?" narrows the table with a free-text search and toggleable type and label filters, and sees a live count of matching entities.

**Why this priority**: Overview only scales with filtering; without it the table is unusable beyond small vaults.

**Independent Test**: In a vault with mixed types and labels, use the search box, type pills, and row-level type/label chips; verify the row set and count update immediately and filters compose.

**Acceptance Scenarios**:

1. **Given** the table view, **When** the user types in the search box, **Then** rows are filtered live by name, content, or `#label` syntax, and the visible entity count updates.
2. **Given** type filter pills above the table (one per entity type present, with per-type counts), **When** the user toggles one or more pills, **Then** only entities of the selected types are shown; toggling again removes the filter.
3. **Given** a row's type badge or label chip, **When** the user clicks it, **Then** the corresponding type or label filter is applied without retyping it; active label filters appear as removable chips next to the type pills.
4. **Given** any combination of active filters, **When** the user clicks "Clear", **Then** search text and all type and label filters reset in one action.
5. **Given** filters that match nothing, **When** the result set is empty, **Then** an empty state offers a one-click "Clear filters" action.

---

### User Story 3 - Sort columns to compare and find gaps (Priority: P2)

A user looking for stale or unfinished entries sorts the table by any data column — name, type, connections, labels, created, modified — toggling direction by re-clicking the header. Entities missing the sorted value always sink to the bottom so cleanup gaps stay visible.

**Why this priority**: Sorting is what turns the table from a list into a comparison and maintenance tool (e.g. "least-connected entities", "not touched since spring").

**Independent Test**: Click each sortable header in a vault where some entities lack timestamps or labels; verify order, direction toggle, and missing-values-last behavior.

**Acceptance Scenarios**:

1. **Given** the table, **When** it first loads, **Then** rows are sorted by name ascending.
2. **Given** a sortable column header, **When** the user clicks it, **Then** the table sorts by that column ascending; clicking the same header again reverses direction, and the active column shows a direction indicator (also exposed to assistive technology).
3. **Given** a sort by created, modified, or labels, **When** some entities lack that value, **Then** those entities sort last regardless of direction, with ties broken by name.
4. **Given** the Summary column, **When** the user inspects its header, **Then** it is not sortable (it is a derived text snippet).

---

### User Story 4 - Select rows and apply bulk label actions (Priority: P3)

A user maintaining the vault selects one, several, or all visible rows via checkboxes and applies label changes (add/remove) to the whole selection through the existing bulk label dialog.

**Why this priority**: First management capability on top of the read-heavy table; delivers the "cleanup" part of the epic. Depends on P1/P2 being in place.

**Independent Test**: Select rows via row checkboxes and the select-all header checkbox, open the bulk label action, and verify label changes land on every selected entity.

**Acceptance Scenarios**:

1. **Given** visible rows, **When** the user toggles a row checkbox, **Then** the row is added to/removed from the selection and highlighted, and a selection toolbar shows the selected count.
2. **Given** the header checkbox, **When** the user clicks it, **Then** all currently visible (filtered) rows are selected; clicking again clears the selection. With a partial selection the header checkbox shows an indeterminate state.
3. **Given** a non-empty selection, **When** the user activates "Add / remove labels", **Then** the shared bulk label dialog opens for exactly the selected entities.
4. **Given** an active selection, **When** the user changes the search text or any type/label filter, **Then** the selection is cleared so actions never apply to rows the user can no longer see. Changing the sort order preserves the selection.
5. **Given** a non-empty selection, **When** the user clicks "Clear selection", **Then** all rows are deselected and the normal entity count reappears.

---

### User Story 5 - Open an entity from the table (Priority: P3)

A user who spots an interesting row opens the entity: clicking anywhere on the row (outside interactive cells) or its title link navigates to the entity's detail view. Modifier-clicks on the title open it in a new tab/window via normal browser behavior.

**Why this priority**: The table must feed back into the deep-dive views to close the loop; navigation is a convenience layer over P1.

**Independent Test**: Click a row body, the title link, and ctrl/cmd-click the title; verify in-app navigation and new-tab behavior respectively, in both host and guest sessions.

**Acceptance Scenarios**:

1. **Given** a row, **When** the user clicks its title link or the row background, **Then** the app navigates to that entity's detail view. Clicks on the checkbox, type badge, or label chips do not navigate.
2. **Given** a title link, **When** the user ctrl/cmd/shift-clicks or middle-clicks, **Then** the browser's native open-in-new-tab/window behavior is preserved.
3. **Given** a guest (shared read-only snapshot) session, **When** the user opens an entity from the table, **Then** the entity opens in the in-place detail (Zen) view and the URL deep-link reflects the opened entity, since guest snapshots have no per-entity route.

---

### Edge Cases

- Entities created before timestamps existed: modified falls back through legacy timestamp fields; entities with no resolvable timestamp show "—" and sort last.
- Entities using the legacy tags field instead of labels: tags are displayed and filterable as labels.
- Entities of a type with no registered category: shown with the raw type string, without icon/color, and still filterable.
- Connection counts include both directions: inbound references from other entities plus outbound links with a resolved target; rows with zero connections show just "0".
- More than 3 labels on an entity: first 3 are shown as chips plus a "+N" count.
- Long content: the summary snippet is clamped to two lines; the table scrolls horizontally on narrow viewports while column headers stay pinned during vertical scrolling.
- Select-all applies to the filtered row set only, never to entities hidden by active filters.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a vault-wide table view, reachable from primary navigation and in-app search, that renders every entity in the active vault as one row.
- **FR-002**: Each row MUST display: entity name, type (as a category badge with icon and color where a category is registered), connection summary (total plus inbound/outbound breakdown), a plain-text content snippet, up to three label chips with an overflow count, created date, and modified date; missing values MUST render as an explicit, accessibly-labeled placeholder.
- **FR-003**: The view MUST distinguish three non-table states: vault still loading, no vault open, and vault open but empty — each with a dedicated message.
- **FR-004**: Users MUST be able to filter rows by free-text search (matching name, content, and `#label` syntax), by entity type (toggleable pills showing per-type counts), and by label; all filters MUST compose and be clearable in a single action.
- **FR-005**: Type badges and label chips on rows MUST act as one-click filter shortcuts for their value.
- **FR-006**: The view MUST show a live count of entities matching the current filters.
- **FR-007**: Users MUST be able to sort by name, type, connections, labels, created, and modified; re-selecting the active column MUST toggle direction; a new column MUST default to ascending; default sort is name ascending.
- **FR-008**: Rows missing the sorted value MUST sort last regardless of direction, and all sorts MUST tie-break by name for stable output; the active sort column and direction MUST be indicated visually and via assistive-technology semantics.
- **FR-009**: Users MUST be able to select rows individually and via a select-all control scoped to the currently filtered rows; a partial selection MUST show an indeterminate select-all state; selected rows MUST be visually highlighted.
- **FR-010**: While rows are selected, the view MUST show the selection count, a bulk label add/remove action (reusing the shared bulk label dialog), and a clear-selection action.
- **FR-011**: Changing search or filter state MUST clear the selection; changing sort order MUST preserve it.
- **FR-012**: Clicking a row or its title MUST open the entity's detail view; interactive cells (checkbox, type badge, label chips) MUST NOT trigger navigation; modifier-clicks on the title MUST retain native browser new-tab/window behavior.
- **FR-013**: In guest (read-only shared snapshot) sessions, opening an entity from the table MUST open the in-place detail view and update the deep-link URL rather than navigating to a host-only entity route.
- **FR-014**: Legacy data MUST degrade gracefully: modified timestamps resolve through legacy fields, entities without labels fall back to tags, and unregistered types render as their raw identifier.

### Key Entities

- **Entity**: The vault record shown as a row — name (title), type, content (source of the summary snippet), labels (with legacy tags fallback), connections, created/modified timestamps (with legacy fallbacks).
- **Category**: Per-type presentation metadata (label, icon, color) used to render type badges and filter pills.
- **Connection Summary**: Derived per-entity counts — inbound references, outbound links with a resolved target, and their total — used for display and sorting.
- **Selection**: The transient set of chosen row entities; scoped to the visible filtered set and consumed by bulk actions.
- **Filter State**: Search text plus active type and label filters; determines visible rows and resets selection when changed.
- **Sort State**: Active column plus direction; determines row order without affecting the visible set or selection.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can answer "what entities of type X exist in this vault?" in under 10 seconds from opening the table, without opening any individual entity.
- **SC-002**: A user can locate the vault's least-connected or longest-untouched entities in at most 2 interactions (one sort click, optionally one direction toggle).
- **SC-003**: A user can apply a label change to 10+ entities in a single bulk operation instead of 10+ per-entity edits.
- **SC-004**: Entities with missing data (no dates, no labels, no summary) are visually identifiable in the table at a glance, and never silently excluded from any sort or filter result.
- **SC-005**: The table remains responsive (filter/sort feedback is immediate) on vaults with several hundred entities.
- **SC-006**: Bulk actions never affect an entity the user cannot currently see: 0 occurrences of an action applying to rows hidden by active filters.

## Assumptions

- The table is intentionally read-heavy: no inline cell editing is in scope for this spec. Management flows go through selections and existing dialogs.
- Selection is transient UI state; it is not persisted across navigation or reloads.
- The visible column set is fixed (no user-configurable columns yet); column layout adapts via horizontal scrolling on narrow viewports.
- Date display uses the viewer's locale conventions.

## Out of Scope (future slices under epic #1508)

- Click-to-select interaction model (single click selects, double click opens), range/toggle selection modifiers, and right-click context menus with bulk management actions — proposed in issue #1627.
- Bulk delete and bulk type change (with confirmation guardrails).
- Inline editing, configurable/orderable columns, saved views, and export.
