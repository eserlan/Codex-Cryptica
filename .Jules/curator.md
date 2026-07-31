## 2025-02-14 - Extract Pure Transformation Functions

**Learning:** When a large Svelte or component controller file (`import-settings-controller.svelte.ts`) contains pure transformation functions (`mapThemeToGenre`) alongside stateful class/component logic, these functions can safely be extracted to sibling `.ts` files to reduce the god file's size and improve component scanability. Also if there are duplicate implementations of this pure function in test files (`ImportSettings.pack.test.ts`), they can be removed and all places updated to import from the newly created reusable file (`theme-mapper.ts`).
**Action:** Extract pure transformation functions into sibling `.ts` files and deduplicate them in tests.
