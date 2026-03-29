## 2024-03-03 - Tiptap Bubble Menu Selection Nuances

**Learning:** Tiptap's Bubble Menu extension (and Svelte 5's wrapping of it) only renders the floating toolbar into the DOM when valid, formattable text is actively selected. It remains completely detached from the DOM otherwise. When testing or designing micro-interactions for it, double-clicking empty blocks or attempting to trigger the menu programmatically via native DOM selection fails to mount the component.
**Action:** When creating tests or verifying a11y attributes on Bubble Menu buttons, always inject realistic text into the editor and simulate an explicit user mouse selection (drag/drop) over that text rather than relying on `focus()` or `dblclick()` on empty `.ProseMirror` nodes.

## 2025-03-04 - Editor Toolbar Toggle Buttons Accessibility

**Learning:** Found that TipTap editor toolbar buttons use visual classes (`.active`) to show toggle state but are missing `aria-pressed` attributes. This is a common pattern where visual state isn't communicated to screen readers for toggle buttons.
**Action:** Always add `aria-pressed` to format toggle buttons in rich text editors to ensure screen reader users know which formatting options are currently active.

## 2026-03-12 - Missing ARIA Labels on Icon-only Buttons

**Learning:** Icon-only buttons or buttons with sparse descriptions often miss `aria-label` attributes which makes them inaccessible for screen-readers. Examples include the delete button in the label settings and era editor, as well as apply/dismiss proposal buttons.
**Action:** When working on Svelte components or reviewing existing ones, ensure that `aria-label` is populated using context variables (e.g., `{era.name}`) to provide clear actions for screen readers.

## 2026-03-27 - Timeline Keyboard Scrolling

**Learning:** Svelte's `a11y_no_noninteractive_tabindex` will flag scrollable `div` containers if given `tabindex="0"`. While generally a good rule, WCAG guidelines _require_ custom scrollable regions (overflow containers without natively focusable children) to be keyboard focusable so users can scroll them with arrow keys.
**Action:** When adding `tabindex="0"`, `role="region"`, and `aria-label` to custom scrollable containers, use `<!-- svelte-ignore a11y_no_noninteractive_tabindex -->` alongside `focus-visible` ring styles to ensure accessibility without breaking the build.
