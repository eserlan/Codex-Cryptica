## 2024-03-03 - Tiptap Bubble Menu Selection Nuances

**Learning:** Tiptap's Bubble Menu extension (and Svelte 5's wrapping of it) only renders the floating toolbar into the DOM when valid, formattable text is actively selected. It remains completely detached from the DOM otherwise. When testing or designing micro-interactions for it, double-clicking empty blocks or attempting to trigger the menu programmatically via native DOM selection fails to mount the component.
**Action:** When creating tests or verifying a11y attributes on Bubble Menu buttons, always inject realistic text into the editor and simulate an explicit user mouse selection (drag/drop) over that text rather than relying on `focus()` or `dblclick()` on empty `.ProseMirror` nodes.

## 2025-03-04 - Editor Toolbar Toggle Buttons Accessibility

**Learning:** Found that TipTap editor toolbar buttons use visual classes (`.active`) to show toggle state but are missing `aria-pressed` attributes. This is a common pattern where visual state isn't communicated to screen readers for toggle buttons.
**Action:** Always add `aria-pressed` to format toggle buttons in rich text editors to ensure screen reader users know which formatting options are currently active.

## 2026-03-12 - Missing ARIA Labels on Icon-only Buttons

**Learning:** Icon-only buttons or buttons with sparse descriptions often miss `aria-label` attributes which makes them inaccessible for screen-readers. Examples include the delete button in the label settings and era editor, as well as apply/dismiss proposal buttons.
**Action:** When working on Svelte components or reviewing existing ones, ensure that `aria-label` is populated using context variables (e.g., `{era.name}`) to provide clear actions for screen readers.

## 2026-03-12 - Custom Context Menu Roles

**Learning:** Svelte context menus built with fixed `div`s sometimes default to `role="presentation"` or no role at all. However, screen readers rely on explicit semantic roles like `role="menu"` on the outer container and `role="menuitem"` or `role="menuitemcheckbox"` on child items to correctly interpret and navigate the list of actions.
**Action:** When creating or modifying custom context menus, dialogs, or dropdowns, ensure the root container uses `role="menu"` (with an `aria-label`) and that every interactive child element explicitly sets `role="menuitem"` or an appropriate equivalent.
