## 2026-11-25 - Public theme assertions

**Learning:** Public generator themes are applied through the document's `data-world-theme` bootstrap; visiting a page does not guarantee the persisted theme key is written.
**Action:** Assert the active document theme in public-route E2E tests instead of coupling them to localStorage.

## 2026-11-26 - Preserve visible wording in accessible names

**Learning:** An `aria-label` that replaces a control's visible label can fail `label-content-name-mismatch`, even when it describes the action.
**Action:** When adding action context, keep the visible wording, including responsive abbreviations, inside the accessible name.

## 2026-11-27 - Graph tests must dismiss the world page

**Learning:** `codex_skip_landing` and an idle vault can leave the front page covering the graph, which suspends Cytoscape rendering.
**Action:** Graph E2Es should wait for `waitForVaultReady`, call `dismissFrontPage`, then wait for the graph canvas before seeding entities.

## 2026-11-28 - Count expanded mobile hit areas

**Learning:** A mobile E2E scan based only on button bounds misses larger `::after` hit areas used to preserve compact layouts.
**Action:** Include computed pseudo-element extents when checking touch targets; use `touch-target` on controls without an expanded hit area.
