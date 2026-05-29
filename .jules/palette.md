## 2024-03-24 - Async Loading States

**Learning:** Found inconsistent loading states across modals, including one using an emoji (`⏳`) instead of a proper icon, and missing `aria-busy` attributes for screen readers during async operations.
**Action:** Always add `aria-busy={isLoading}` to buttons triggering async actions, and use consistent SVG spinners (`icon-[lucide--loader-2]`) instead of emojis or text-only changes to provide clear, accessible feedback.

## 2024-04-11 - Hover-only Action Button Accessibility

**Learning:** Action buttons that only appear on parent hover (`opacity-0 group-hover:opacity-100`) create an accessibility trap for keyboard users because the buttons remain invisible (opacity 0) even when tabbed to, making them unusable for non-mouse users.
**Action:** Always pair `group-hover:opacity-100` with `focus-within:opacity-100` (on a wrapper) or `focus:opacity-100` (directly on the button) to ensure interactive elements are visible when they receive keyboard focus.

## 2026-04-13 - Modal Dialog Accessibility

**Learning:** Icon-only buttons or buttons with sparse descriptions often miss `aria-label` attributes which makes them inaccessible for screen-readers. Examples include the delete button in the label settings and era editor, as well as apply/dismiss proposal buttons.
**Action:** When working on Svelte components or reviewing existing ones, ensure that `aria-label` is populated using context variables (e.g., `{era.name}`) to provide clear actions for screen readers.

## 2026-03-12 - Missing Focus Visible Styles on Icon-only Buttons

**Learning:** Icon-only buttons often miss `focus-visible:ring-2` or similar keyboard focus classes in Tailwind which makes them harder to locate for keyboard users.
**Action:** When working on Svelte components or reviewing existing ones, ensure that `focus-visible` classes are populated to provide clear focus indicators for keyboard navigation.
