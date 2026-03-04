## 2024-03-03 - Tiptap Bubble Menu Selection Nuances
**Learning:** Tiptap's Bubble Menu extension (and Svelte 5's wrapping of it) only renders the floating toolbar into the DOM when valid, formatable text is actively selected. It remains completely detached from the DOM otherwise. When testing or designing micro-interactions for it, double-clicking empty blocks or attempting to trigger the menu programmatically via native DOM selection fails to mount the component.
**Action:** When creating tests or verifying a11y attributes on Bubble Menu buttons, always inject realistic text into the editor and simulate an explicit user mouse selection (drag/drop) over that text rather than relying on `focus()` or `dblclick()` on empty `.ProseMirror` nodes.

## 2025-03-04 - Editor Toolbar Toggle Buttons Accessibility
**Learning:** Found that TipTap editor toolbar buttons use visual classes (`.active`) to show toggle state but are missing `aria-pressed` attributes. This is a common pattern where visual state isn't communicated to screen readers for toggle buttons.
**Action:** Always add `aria-pressed` to format toggle buttons in rich text editors to ensure screen reader users know which formatting options are currently active.
