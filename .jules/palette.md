## 2024-03-24 - Async Loading States

**Learning:** Found inconsistent loading states across modals, including one using an emoji (`⏳`) instead of a proper icon, and missing `aria-busy` attributes for screen readers during async operations.
**Action:** Always add `aria-busy={isLoading}` to buttons triggering async actions, and use consistent SVG spinners (`icon-[lucide--loader-2]`) instead of emojis or text-only changes to provide clear, accessible feedback.

## 2024-04-11 - Hover-only Action Button Accessibility

**Learning:** Action buttons that only appear on parent hover (`opacity-0 group-hover:opacity-100`) create an accessibility trap for keyboard users because the buttons remain invisible (opacity 0) even when tabbed to, making them unusable for non-mouse users.
**Action:** Always pair `group-hover:opacity-100` with `focus-within:opacity-100` (on a wrapper) or `focus:opacity-100` (directly on the button) to ensure interactive elements are visible when they receive keyboard focus.

## 2026-04-13 - Modal Dialog Accessibility

**Learning:** Icon-only buttons or buttons with sparse descriptions often miss `aria-label` attributes which makes them inaccessible for screen-readers. Examples include the delete button in the label settings and era editor, as well as apply/dismiss proposal buttons.
**Action:** When working on Svelte components or reviewing existing ones, ensure that `aria-label` is populated using context variables (e.g., `{era.name}`) to provide clear actions for screen readers.

## 2026-03-12 - Custom Context Menu Roles

**Learning:** Svelte context menus built with fixed `div`s sometimes default to `role="presentation"` or no role at all. However, screen readers rely on explicit semantic roles like `role="menu"` on the outer container and `role="menuitem"` or `role="menuitemcheckbox"` on child items to correctly interpret and navigate the list of actions.
**Action:** When creating or modifying custom context menus, dialogs, or dropdowns, ensure the root container uses `role="menu"` (with an `aria-label`) and that every interactive child element explicitly sets `role="menuitem"` or an appropriate equivalent.

## 2026-03-12 - Missing Focus Visible Styles on Icon-only Buttons

**Learning:** Icon-only buttons often miss `focus-visible:ring-2` or similar keyboard focus classes in Tailwind which makes them harder to locate for keyboard users.
**Action:** When working on Svelte components or reviewing existing ones, ensure that `focus-visible` classes are populated to provide clear focus indicators for keyboard navigation.

## 2026-06-04 - Floating Dialog Backdrop Accessibility

**Learning:** Found an `a11y_click_events_have_key_events` and `a11y_no_static_element_interactions` warning on a `div` used as a floating dialog backdrop in `QuickNoteScratchpad.svelte`. This pattern makes it difficult for keyboard users to interact with or understand the backdrop's function (closing the dialog).
**Action:** When implementing floating dialogs or modals with clickable background overlays, use a semantic `<button type="button">` with `aria-label="Close [Modal Name]"`, `w-full h-full`, and proper keyboard focus classes (like `focus-visible:ring-2 focus:outline-none focus-visible:ring-inset`) instead of ignoring the accessibility warnings on a `div`. Ensure this backdrop `<button>` is a sibling of the main modal `div` container, as HTML specs forbid nesting a modal block inside a button.

## 2024-06-13 - Hidden ARIA decorative icons inside buttons

**Learning:** Svelte components frequently include decorative icons (such as those from `icon-[lucide--*]`) inside buttons that already provide an `aria-label` or visible text. Without explicitly hiding them, screen readers may interpret or announce redundant text or confusing graphics.
**Action:** When adding or updating buttons with decorative icon spans (e.g. `<span class="icon-[lucide--...]"></span>`), always add `aria-hidden="true"` to the icon element so assistive technologies ignore the decoration and focus on the parent button's accessible name.

## 2026-06-12 - Semantic Modal Backdrops

**Learning:** Found multiple modals (`ConfirmationModal`, `ChangelogModal`, `ImagePromptReviewModal`) using `div` elements with `svelte-ignore` comments for backdrops. This anti-pattern prevents keyboard navigation and violates accessibility rules.
**Action:** Replaced the `div` backdrops with semantic `<button type="button">` elements. Ensured they have proper ARIA labels (e.g., `aria-label="Close dialog"`) and focus styling (`focus-visible:ring-2 focus:outline-none focus-visible:ring-inset`) to allow screen readers and keyboard users to correctly navigate and interact with the overlays.
