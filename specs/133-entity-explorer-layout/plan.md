# Implementation Plan: Entity Explorer Desktop Two-Column Layout

**Branch**: `133-entity-explorer-layout` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/133-entity-explorer-layout/spec.md`

## Summary

At viewport widths of 1280px and above, reuse the persisted open Entity Explorer
state to show a two-column workspace. Explorer selection will use the existing
embedded Zen reader/editor in the main column, while smaller viewports retain the
current full-screen Zen Mode modal. The implementation stays in `apps/web`, adds
only transient viewport eligibility state, and keeps the current route mounted
beneath the focused-entity workspace overlay.

## Technical Context

**Language/Version**: TypeScript 6.0.3 + Svelte 5 runes
**Primary Dependencies**: SvelteKit, Tailwind 4 semantic tokens, existing layout UI
store, Entity Explorer, `EmbeddedEntityView`, and `ZenView`
**Storage**: Existing browser-local sidebar-open and active-tool preferences; no new
persistence format. The focused entity and wide-viewport state remain transient.
**Testing**: Vitest, Svelte Testing Library, existing layout store and component tests
**Target Platform**: Browser-based SvelteKit app; desktop split layout at `xl`
(1280px) and existing behavior below that threshold
**Project Type**: SvelteKit web application
**Performance Goals**: Switching entities updates the focused reader without a page
reload; scrolling remains independent per pane; resizing around 1280px causes no
page-level horizontal overflow; each 1280px threshold crossing causes at most one
workspace mode transition; and at a 1440px viewport the primary reader/editor pane
retains at least 640px of usable width.
**Constraints**: Reuse the current Zen Mode visual and editing behavior; preserve the
current modal flow below 1280px; use Svelte 5 runes, Tailwind semantic tokens, and
Iconify only; keep all work client-side; do not add a pin control or storage key.
**Scale/Scope**: One app-shell workspace overlay, one existing store extension for
wide viewport eligibility, Explorer selection wiring, focused-reader empty state,
help copy, and focused tests.

## Constitution Check

_GATE: Passed before Phase 0 research. Re-checked after Phase 1 design._

1. **Library-First**: PASS. This is a presentation-layer integration using existing
   reusable Zen and navigation components; no new domain logic or workspace package
   is warranted.
2. **Test-Driven Development**: PASS. Add failing store, explorer-selection, and
   workspace-rendering tests before implementation, including below-threshold and
   close-state coverage.
3. **Simplicity & YAGNI**: PASS. Reuse `focusedEntityId`, `focusEntity`, and
   `EmbeddedEntityView`; do not introduce a second Zen renderer, new route, or pin
   preference.
4. **AI-First Extraction**: PASS. The feature does not add or change AI extraction.
5. **Privacy & Client-Side Processing**: PASS. Layout and entity viewing remain
   browser-local and use existing vault state.
6. **Clean Implementation**: PASS. Components use Svelte 5 runes, semantic Tailwind
   tokens, Iconify classes, accessible non-modal semantics, and focused style changes.
7. **User Documentation**: PASS. Update the Entity Explorer help article with the
   desktop workspace and smaller-screen behavior.
8. **Dependency Injection**: PASS. Extend the existing constructor-injected viewport
   port in `LayoutUIStore`; no new service or store is needed.
9. **Natural Language**: PASS. Use plain copy such as "Select an entity" and
   "Entity Explorer".
10. **Quality & Coverage Enforcement**: PASS. New store and UI paths are covered by
    unit/component tests without reducing coverage.
11. **Agent Operational Protocol**: PASS. The plan limits changes to the app shell,
    existing explorer flow, and documentation.
12. **Labels Over Tags**: PASS. No categorization terminology is added or changed.

## Project Structure

### Documentation (this feature)

```text
specs/133-entity-explorer-layout/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── entity-explorer-workspace.md
├── checklists/
│   └── requirements.md
└── tasks.md                  # Created by /speckit.tasks
```

### Source Code (repository root)

```text
apps/web/src/
├── routes/
│   └── (app)/
│       └── +layout.svelte                         # Workspace overlay host
├── lib/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── EntityExplorerWorkspace.svelte     # New focused-reader/empty state
│   │   │   └── EntityExplorerWorkspace.test.ts    # New component coverage
│   │   ├── explorer/
│   │   │   ├── EntityExplorer.svelte              # Desktop selection branch
│   │   │   └── EntityExplorer.test.ts             # New selection coverage
│   │   └── entity/
│   │       └── EmbeddedEntityView.svelte          # Reused Zen reader/editor
│   ├── config/
│   │   └── help-content.ts                        # Entity Explorer help update
│   └── stores/ui/
│       ├── layout-ui.svelte.ts                    # Wide viewport eligibility
│       └── layout-ui.test.ts                      # Store eligibility coverage
├── routes/
│   └── (app)/
│       └── layout.route.test.ts                   # App-shell workspace coverage
```

**Structure Decision**: Keep the feature in the SvelteKit app layer. The existing
`EmbeddedEntityView` already composes the non-modal `ZenView`, and the existing
layout store already owns sidebar state and an injectable viewport abstraction. A
small workspace component owns only the active-reader versus empty-state display;
the app layout hosts it above route content so underlying route instances stay alive.

## Complexity Tracking

No constitution violations.

## Phase Plan

### Phase 0: Research And Boundaries

- Confirm the existing `EmbeddedEntityView` and `focusEntity` flow remains the sole
  desktop reader/editor implementation.
- Define the 1280px viewport eligibility rule as a non-persisted extension to the
  existing constructor-injected layout viewport port.
- Preserve the current modal Zen Mode path whenever the workspace is ineligible.

### Phase 1: Layout State And Contracts

- Add a transient wide-viewport signal and a derived workspace-eligibility predicate
  to `LayoutUIStore` using `matchMedia("(min-width: 1280px)")`.
- Keep sidebar-open and active-tool persistence unchanged; eligibility requires an
  open Explorer, not merely an open sidebar.
- Document selection, close, resize, scroll, and accessibility behavior in the UI
  contract and data model.
- Add tests for eligibility at and below the threshold, active-tool changes, and
  viewport media-query changes, including a single-transition assertion per
  threshold crossing.

### Phase 2: Explorer And Workspace Integration

- Update `EntityExplorer` so selecting an entity in an eligible workspace invokes
  the existing focused-entity flow; otherwise retain `modalUIStore.openZenMode`.
- Add `EntityExplorerWorkspace.svelte` to render `EmbeddedEntityView` when focused
  and an accessible, stable empty state when no entity is selected.
- Host the workspace as an absolute, bounded overlay inside the app shell's main
  content area. Keep route children mounted underneath it and size the right pane so
  it preserves at least 640px of usable width at a 1440px viewport.
- Ensure the main pane can shrink (`min-w-0`) and clips only its own visual bounds;
  Explorer and Zen content retain their existing internal scroll containers.

### Phase 3: Responsive, Accessibility, And Help

- Remove the workspace overlay below 1280px or when the Explorer closes or another
  sidebar tool becomes active. Existing Explorer selection then opens full-screen
  Zen Mode unchanged.
- Keep the embedded Zen reader non-modal (`role="region"`) and retain its keyboard,
  tab, edit, and close behavior. Its close action clears the focused reader while
  the active Explorer leaves the workspace empty state visible.
- Update the Entity Explorer help article to explain the desktop side-by-side
  experience and the unchanged smaller-screen modal behavior.

### Phase 4: Verification

- Run focused store and component tests first, then the web workspace's typecheck,
  lint, and test suites.
- Manually verify the `xl` boundary, persisted Explorer state, independent scrolling,
  entity switching, close behavior, and no horizontal scrolling.

## Verification Plan

```bash
bun run --filter web test -- src/lib/stores/ui/layout-ui.test.ts
bun run --filter web test -- src/lib/components/explorer/EntityExplorer.test.ts
bun run --filter web test -- src/lib/components/layout/EntityExplorerWorkspace.test.ts
bun run --filter web lint:types
bun run --filter web lint
bun run --filter web test
```

Manual checks are defined in [quickstart.md](./quickstart.md).
