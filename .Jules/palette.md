## 2024-03-24 - Async Loading States

**Learning:** Found inconsistent loading states across modals, including one using an emoji (`⏳`) instead of a proper icon, and missing `aria-busy` attributes for screen readers during async operations.
**Action:** Always add `aria-busy={isLoading}` to buttons triggering async actions, and use consistent SVG spinners (`icon-[lucide--loader-2]`) instead of emojis or text-only changes to provide clear, accessible feedback.

## 2024-04-11 - Hover-only Action Button Accessibility

**Learning:** Action buttons that only appear on parent hover (`opacity-0 group-hover:opacity-100`) create an accessibility trap for keyboard users because the buttons remain invisible (opacity 0) even when tabbed to, making them unusable for non-mouse users.
**Action:** Always pair `group-hover:opacity-100` with `focus-within:opacity-100` (on a wrapper) or `focus:opacity-100` (directly on the button) to ensure interactive elements are visible when they receive keyboard focus.

## 2026-04-13 - Modal Dialog Accessibility

**Learning:** Found several full-screen or prominent overlay components (like ShareModal, MergeNodesDialog, and ConfirmationModal) that lacked proper ARIA dialog roles, making them opaque to screen readers.
**Action:** Always wrap custom modal components with `role="dialog"`, `aria-modal="true"`, and explicitly link them to a title using `aria-labelledby` (with an `id` on the title element) to ensure screen readers correctly interpret them as focused dialogs.

## 2026-04-14 - Semantic Buttons for Image Overlays

**Learning:** Found instances where `<div>` elements with `onclick` handlers were used as interactive overlays on top of images (requiring `svelte-ignore` comments to bypass accessibility warnings). This practice breaks keyboard navigation and screen reader support.
**Action:** Always replace interactive `<div>` elements with semantic `<button type="button">` elements. When using these as full-cover overlays (e.g., `absolute inset-0`), include `w-full h-full`, keyboard focus ring classes (e.g., `focus:ring-2`, `focus:outline-none`, `focus:opacity-100`), and descriptive `aria-label`s to ensure full accessibility and usability.
