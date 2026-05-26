# Reddit Post Draft: Entity Explorer Drag-and-Drop & Accessibility Refactor

**Subreddit:** r/codexcryptica  
**Date:** 2026-05-26

---

## Title Options

1. `Devlog: Rebuilding the Entity Explorer drag-and-drop UX and HTML semantics`
2. `Fixing deep hierarchy dragging: RAF guards, pointer-event overrides, and cleaner ARIA roles`
3. `I rewrote the Entity Explorer sidebar to support 8 nested levels and stable dragging`
4. `How I fixed browser drag-and-drop flicker and accessibility in a nested Svelte 5 tree`

---

## Body Draft

Hey everyone,

I spent the last couple of days refactoring the Entity Explorer sidebar. It’s the folder tree on the left of the workspace where you organize characters, locations, and campaign notes.

While it worked okay for simple vaults, it had some frustrating bugs when handling deep nesting, native dragging, and keyboard accessibility.

Here is what I changed:

### 🌲 Support for Deeper campaign folders

I increased the nesting depth limit from 5 levels to 8. This supports more complex campaign setups (e.g., World → Continent → Kingdom → City → District → Building → Room).

### 🫳 Stable Native Drag-and-Drop

Browser-native drag-and-drop in deep trees is notoriously finicky. I resolved a few major pain points:

- **Anti-Flicker:** When dragging an item over sibling folders, the hover indicators used to stutter and flicker. I added a global class during active drags that sets `pointer-events: none` on all child elements of non-dragged rows. This keeps the drag-over state completely smooth.
- **RAF Guard:** The browser would sometimes cancel a drag operation the moment it started because the dragging state toggled too fast. I wrapped this state update in a `requestAnimationFrame` and added a matching ID guard to verify the drag is still active when the frame runs.
- **Drop to Root:** Added a dedicated drop target at the top of the tree list to make it easy to move any nested entity back to the root level.
- **Reload Persistence:** Fixed a cache hydration bug that caused custom parent/child structures and visibility flags to get lost on a hard page reload.

### ♿ HTML Semantics & ARIA Cleanup

Originally, the outer container for each row was a focusable `div` with `role="button"`. Since this row contains other real buttons (like expand/collapse, add child, and delete), this created an invalid accessibility tree (interactive controls nested inside a composite "button").

I restructured the markup:

- The outer container is now a clean `role="listitem"`.
- The select action is mapped to an inner `<button type="button">` that wraps the entity's icon and title.
- This separates the selection region from the other control buttons, making keyboard navigation and screen readers behave correctly.

---

## Under the Hood (Svelte 5 notes)

Using Svelte 5 runes (`$state` and `$derived`) made it straightforward to propagate the active dragging states down the tree recursively. By computing `draggable={!!onDragStart}` at the tree renderer level, the child items can easily adjust their styling and cursors without needing to track drag capability independently.

**Question:** How deep do you usually nest your campaign folders? Do you prefer a flat structure, or do you organize down to specific rooms and items?

---

## Optional First Comment

You can look at the implementation details or the component markup on GitHub:

- [EntityList.svelte](https://github.com/eserlan/Codex-Cryptica/blob/staging/apps/web/src/lib/components/explorer/EntityList.svelte)
- [EntityListItem.svelte](https://github.com/eserlan/Codex-Cryptica/blob/staging/apps/web/src/lib/components/explorer/EntityListItem.svelte)
