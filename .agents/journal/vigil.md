## 2026-11-25 - Public theme assertions

**Learning:** Public generator themes are applied through the document's `data-world-theme` bootstrap; visiting a page does not guarantee the persisted theme key is written.
**Action:** Assert the active document theme in public-route E2E tests instead of coupling them to localStorage.
