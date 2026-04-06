# Developer Quickstart: Move Oracle to Left Sidebar

## New Components

- `apps/web/src/lib/components/layout/LeftSidebar.svelte`: The narrow vertical bar containing tool icons.
- `apps/web/src/lib/components/oracle/OracleSidebarPanel.svelte`: The content panel for the Oracle when used in the sidebar.

## Implementation Steps

1. **Update `UIStore`**: Add the new states and methods for sidebar management.
2. **Refactor `+layout.svelte`**:
   - Introduce a `flex flex-row` wrapper around the `main` tag and the new `LeftSidebar`.
3. **Migrate Oracle Toggle**:
   - Update the existing "Oracle Orb" logic to use the sidebar icon instead.
   - Ensure the keyboard shortcut still works.
4. **Remove Floating Logic**:
   - Clean up `OracleWindow.svelte` (or deprecate it if no longer needed for modal mode).

## Testing

- **Unit**: Verify `UIStore` state transitions for sidebar toggling.
- **E2E**:
  - Check that the Oracle panel opens on the left when the icon is clicked.
  - Verify that navigating from `/` to `/map` keeps the sidebar open.
  - Test mobile responsiveness by resizing the viewport.
