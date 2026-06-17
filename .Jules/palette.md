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

## 2026-04-23 - Icon Button Naming

**Learning:** Icon-only buttons that rely only on `title` are not announced reliably by screen readers, even when the hover tooltip looks correct for mouse users.
**Action:** Always add an explicit `aria-label` to icon-only buttons, even if they already have a `title`, so assistive technology gets a stable accessible name.

## 2024-05-18 - [Add aria-expanded to Submenu Triggers]

**Learning:** Found that custom context menus and submenus in interactive canvas areas (like MapView) often lack standard accessibility attributes (`aria-haspopup`, `aria-expanded`). This makes it difficult for screen reader users to know if a button opens a menu and whether it is currently open.
**Action:** Always add `aria-haspopup="menu"` and dynamically bind `aria-expanded={isOpen}` to buttons that toggle submenus or popups, especially in complex interactive components where standard HTML select/menu elements are not used.

## 2026-05-03 - ARIA roles on Modals

**Learning:** When creating or updating custom modal/dialog components (e.g., those using floating backdrops like `fixed inset-0`), strictly ensure screen reader accessibility by applying `role="dialog"`, `aria-modal="true"`, and an explicit `aria-label` or `aria-labelledby` directly to the main inner container element.
**Action:** Add ARIA dialog roles, aria-modal, and appropriate labels to VTTGridSettings, CategorySettings icon picker sub-modal, and ZenModeModal.

## 2026-05-07 - Focus vs Focus-Visible Accessibility

**Learning:** When making components keyboard accessible, using standard `focus:` styles often results in ugly outlines appearing for mouse users after they click a button. This discourages developers from adding focus states at all.
**Action:** Use Tailwind's `focus-visible:` utility classes (e.g., `focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none`) rather than standard `focus:` classes to guarantee clear focus rings for keyboard users without displaying them during mouse interactions.

## 2026-05-07 - Button Types in Svelte

**Learning:** Non-submit buttons in Svelte components can accidentally submit forms if they are ever wrapped in a `<form>` context and don't explicitly have a type.
**Action:** Always explicitly define `type="button"` on generic buttons to prevent unexpected form submission behavior.

## 2026-05-11 - Toggle Button State

**Learning:** Found custom toggle buttons (like the VTT mode switchers) that change visual state via classes but don't communicate their "pressed" status to screen readers, making it impossible for non-visual users to know which mode is active.
**Action:** Always add `aria-pressed={isActive}` to button elements that function as state toggles, ensuring their programmatic state matches their visual state.

## 2026-05-15 - DetailFooter Accessible Loading State

**Learning:** Found the Save button in `DetailFooter.svelte` was relying on an inaccessible text-only `animate-pulse` class ("SAVING...") without a visual spinner and lacking an `aria-busy` state, making the loading state less obvious and invisible to assistive technology.
**Action:** Replaced text-only pulse with the standard SVG spinner (`icon-[lucide--loader-2] animate-spin`) next to static "SAVING..." text, and explicitly bound `aria-busy={isSaving}` on the parent button.
## 2026-05-16 - Focus Visible for VTT Grid Settings
**Learning:** Interactive buttons within modals and menus often miss explicit keyboard focus indicators if they only use mouse-centric hover classes.
**Action:** Add Tailwind focus-visible utilities to ensure accessibility without degrading the mouse user experience.
## 2024-06-17 - Button Toggle State Accessibility\n\n**Learning:** Found custom toggle buttons (like the App Appearance theme switchers) that changed visual state via classes but didn't communicate their "pressed" status to screen readers, making it impossible for non-visual users to know which mode was active.\n**Action:** Always add `aria-pressed={isActive}` to button elements that function as state toggles, ensuring their programmatic state matches their visual state.\n
