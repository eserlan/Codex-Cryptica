# Research: Add to Canvas in Context Menu

**Date**: 2026-03-27
**Feature**: 076-add-canvas-context-menu

## Technical Decisions

### Decision: Use Existing Context Menu Pattern

**Rationale**: The codebase already has context menu infrastructure in the graph view. We'll extend the existing `GraphContextMenu.svelte` component rather than creating a new pattern.

**Alternatives Considered**:

- Create new standalone context menu component → Rejected: duplicates existing functionality
- Use native browser context menu → Rejected: inconsistent with app UX, limited customization

---

### Decision: Canvas Selection via Submenu

**Rationale**: Submenu provides quick access to recent canvases (up to 5) with "Choose Canvas..." for full list. Matches existing UX patterns in the app.

**Alternatives Considered**:

- Modal dialog → Rejected: too heavy for simple action
- Toast with canvas selector → Rejected: discoverability issues

---

### Decision: Duplicate Detection in Canvas Store

**Rationale**: Canvas store already tracks entities. Adding duplicate detection at the store level ensures consistency across all entry points (not just context menu).

**Alternatives Considered**:

- UI-level duplicate check → Rejected: doesn't protect against other entry points
- Allow duplicates → Rejected: violates user expectation, clutters canvases

---

### Decision: Toast Notifications for Feedback

**Rationale**: App already uses toast notifications for user feedback. Consistent with existing patterns.

**Alternatives Considered**:

- Inline notification in graph → Rejected: graph is busy visual space
- Status bar message → Rejected: easily missed

---

## Existing Patterns to Follow

1. **Context Menu**: See `apps/web/src/lib/components/graph/GraphContextMenu.svelte`
2. **Toast Notifications**: See existing toast usage in app
3. **Canvas Store**: See `apps/web/src/lib/stores/canvas-registry.svelte.ts`
4. **Keyboard Navigation**: Follow existing context menu keyboard patterns

---

## No NEEDS CLARIFICATION Markers

All technical decisions resolved through codebase analysis and existing patterns.
