## 2025-02-14 - Search Modal Accessibility

**Learning:** The application's search modal (and potentially other dropdowns) lacked standard ARIA roles for comboboxes. Implementing `role="combobox"`, `role="listbox"`, and `aria-activedescendant` significantly improves screen reader navigation.
**Action:** When creating or modifying dropdown components, always check for the combobox pattern and ensure `aria-activedescendant` is correctly managed. Empty states should use `role="status"` to be announced.

## 2026-02-25 - Zen Mode Lightbox Accessibility

**Learning:** Modal components like the image lightbox require explicit focus management and trapping to be fully accessible to keyboard and screen reader users. Standard ARIA roles (`role="dialog"`, `aria-modal="true"`) are necessary but insufficient without active state management.
**Action:** Implement focus traps in all modal-like components to prevent "tabbing out" into background content. Ensure focus is restored to the triggering element upon closure to maintain the user's navigational context.
