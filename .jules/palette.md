## 2025-02-14 - The Power of Native CSS Custom Properties

**Learning:** Svelte `bind:this` for setting CSS variables is often slower and more complex than using inline styles with CSS variables: `style="--brand-color: {activeColor}"`.
**Action:** Prefer native CSS custom properties via `style:` directives for reactive styling over complex `bind:this` logic or JS-in-CSS.

## 2025-03-04 - Editor Toolbar Toggle Buttons Accessibility

**Learning:** Found that TipTap editor toolbar buttons use visual classes (`.active`) to show toggle state but are missing `aria-pressed` attributes. This is a common pattern where visual state isn't communicated to screen readers for toggle buttons.
**Action:** Always add `aria-pressed` to format toggle buttons in rich text editors to ensure screen reader users know which formatting options are currently active.

## 2026-03-12 - Missing ARIA Labels on Icon-only Buttons

**Learning:** Icon-only buttons or buttons with sparse descriptions often miss `aria-label` attributes which makes them inaccessible for screen-readers. Examples include the delete button in the label settings and era editor, as well as apply/dismiss proposal buttons.
**Action:** When working on Svelte components or reviewing existing ones, ensure that `aria-label` is populated using context variables (e.g., `{era.name}`) to provide clear actions for screen readers.
