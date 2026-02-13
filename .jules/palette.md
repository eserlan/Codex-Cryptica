## 2025-02-14 - Search Modal Accessibility

**Learning:** The application's search modal (and potentially other dropdowns) lacked standard ARIA roles for comboboxes. Implementing `role="combobox"`, `role="listbox"`, and `aria-activedescendant` significantly improves screen reader navigation.
**Action:** When creating or modifying dropdown components, always check for the combobox pattern and ensure `aria-activedescendant` is correctly managed. Empty states should use `role="status"` to be announced.
