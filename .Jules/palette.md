## 2024-03-24 - Async Loading States

**Learning:** Found inconsistent loading states across modals, including one using an emoji (`⏳`) instead of a proper icon, and missing `aria-busy` attributes for screen readers during async operations.
**Action:** Always add `aria-busy={isLoading}` to buttons triggering async actions, and use consistent SVG spinners (`icon-[lucide--loader-2]`) instead of emojis or text-only changes to provide clear, accessible feedback.

## 2024-04-11 - Hover-only Action Button Accessibility

**Learning:** Action buttons that only appear on parent hover (`opacity-0 group-hover:opacity-100`) create an accessibility trap for keyboard users because the buttons remain invisible (opacity 0) even when tabbed to, making them unusable for non-mouse users.
**Action:** Always pair `group-hover:opacity-100` with `focus-within:opacity-100` (on a wrapper) or `focus:opacity-100` (directly on the button) to ensure interactive elements are visible when they receive keyboard focus.

## 2026-04-13 - Modal Dialog Accessibility

**Learning:** Found several full-screen or prominent overlay components (like ShareModal, MergeNodesDialog, and ConfirmationModal) that lacked proper ARIA dialog roles, making them opaque to screen readers.
**Action:** Always wrap custom modal components with `role="dialog"`, `aria-modal="true"`, and explicitly link them to a title using `aria-labelledby` (with an `id` on the title element) to ensure screen readers correctly interpret them as focused dialogs.

## 2026-04-17 - Tablist Accessibility

**Learning:** Found custom tabbed interfaces (like in `BulkLabelDialog.svelte`) that were built with standard buttons but lacked proper ARIA tab roles, making them confusing for screen reader users who couldn't identify the grouped relationship or the selected state.
**Action:** Always wrap tab groups with `role="tablist"` and `aria-label`, assign `role="tab"` and `aria-selected` to the tab buttons, and link them to their content using `role="tabpanel"`, `id`, and `aria-labelledby` to ensure the structure is correctly announced as an interactive tab list.

## 2026-04-19 - Clickable Div Accessibility

**Learning:** Svelte `a11y_click_events_have_key_events` and `a11y_no_static_element_interactions` warnings on clickable `<div>` elements are best resolved by converting them to semantic `<button type="button">` elements.
**Action:** When creating clickable overlays (like map entries) with `group-hover:opacity-100`, use a `<button>`, add an `aria-label`, and include `focus:opacity-100` plus a strong visible focus style such as `focus-visible:ring-2 focus-visible:ring-offset-2` so keyboard users can navigate to and trigger them natively without `svelte-ignore` comments.
