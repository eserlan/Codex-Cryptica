## 2026-11-25 - Public theme assertions

**Learning:** Public generator themes are applied through the document's `data-world-theme` bootstrap; visiting a page does not guarantee the persisted theme key is written.
**Action:** Assert the active document theme in public-route E2E tests instead of coupling them to localStorage.

## 2026-11-26 - Preserve visible wording in accessible names

**Learning:** An `aria-label` that replaces a control's visible label can fail `label-content-name-mismatch`, even when it describes the action.
**Action:** When adding action context, keep the visible wording, including responsive abbreviations, inside the accessible name.
