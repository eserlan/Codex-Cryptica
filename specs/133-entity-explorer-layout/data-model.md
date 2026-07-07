# Data Model: Entity Explorer Desktop Two-Column Layout

This feature adds no persisted domain data. It derives a transient workspace mode
from existing layout state and reuses the existing focused-entity identifier.

## LayoutUIStore Viewport State

| Field                       | Type                               | Persistence            | Description                                                          | Validation                                         |
| --------------------------- | ---------------------------------- | ---------------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| `isWideViewport`            | `boolean`                          | None                   | Whether `matchMedia("(min-width: 1280px)")` matches.                 | Updated from the injected viewport media query.    |
| `leftSidebarOpen`           | `boolean`                          | Existing local storage | Whether a left sidebar is open.                                      | Existing behavior unchanged.                       |
| `activeSidebarTool`         | `"oracle" \| "explorer" \| "none"` | Existing local storage | The currently active left sidebar tool.                              | Existing behavior unchanged.                       |
| `isEntityExplorerWorkspace` | `boolean` derived                  | None                   | Whether the desktop Explorer workspace should overlay the main pane. | True only if wide, open, and tool is `"explorer"`. |

## Focused Entity State

| Field             | Type                                         | Persistence | Description                                              | Validation                                                 |
| ----------------- | -------------------------------------------- | ----------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| `focusedEntityId` | `string \| null`                             | None        | Existing identifier consumed by the embedded Zen reader. | Must refer to an entity in the active vault when non-null. |
| `mainViewMode`    | `"visualization" \| "focus" \| "guest-chat"` | None        | Existing main-content presentation state.                | Existing `focusEntity` transitions remain authoritative.   |

## Workspace Presentation

| State    | Eligibility                                                    | Main Pane                                                       | Explorer Selection                                  |
| -------- | -------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| Inactive | Viewport < 1280px, Explorer closed, or another tool active     | Existing route content                                          | Existing full-screen Zen Mode modal                 |
| Ready    | Viewport >= 1280px and Explorer open/active, no focused entity | Stable "Select an entity" empty state above the preserved route | Enters focused state                                |
| Focused  | Ready state plus a focused entity                              | `EmbeddedEntityView` using existing `ZenView`                   | Switches the embedded reader to the selected entity |

## State Transitions

1. Existing sidebar persistence restores `leftSidebarOpen` and `activeSidebarTool`.
2. The injected wide media query resolves `isWideViewport`.
3. When all eligibility inputs are true, the app shell displays the workspace overlay.
4. Selecting an Explorer item while eligible calls the existing focused-entity flow;
   `focusedEntityId` identifies the entity rendered by `EmbeddedEntityView`.
5. Selecting an Explorer item while ineligible keeps the current
   `modalUIStore.openZenMode` flow.
6. Closing the embedded Zen reader delegates to the existing focused-entity close
   flow. The still-eligible workspace then displays its empty state.
7. Closing the Explorer, selecting another sidebar tool, or crossing below 1280px
   removes the overlay and exposes the already-mounted route content.

## Invariants

- No new pin, workspace, or entity-focus preference is persisted.
- The workspace never activates for the Oracle or when the Explorer is closed.
- The desktop workspace uses the existing non-modal `ZenView` path; it must not set
  `modalUIStore.showZenMode`.
- The layout boundary and its children must allow flex shrinking and must not create
  page-level horizontal scrolling.
