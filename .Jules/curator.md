## 2025-02-14 - Extract Pure Transformation Functions

**Learning:** When a large Svelte or component controller file (`import-settings-controller.svelte.ts`) contains pure transformation functions (`mapThemeToGenre`) alongside stateful class/component logic, these functions can safely be extracted to sibling `.ts` files to reduce the god file's size and improve component scanability. Also if there are duplicate implementations of this pure function in test files (`ImportSettings.pack.test.ts`), they can be removed and all places updated to import from the newly created reusable file (`theme-mapper.ts`).
**Action:** Extract pure transformation functions into sibling `.ts` files and deduplicate them in tests.

## 2024-05-18 - Svelte 5 hook state extraction pattern

**Learning:** When extracting encapsulated state and functions from a Svelte 5 component into a separate module (like `createDrawingLogic`), state bound by `$state` must be exposed using property getters (e.g., `get isDrawingMode() { return isDrawingMode; }`) on the returned object to preserve reactive read access within the component's template. Using simple destructuring or exposing primitive variables directly breaks Svelte 5's reactivity model across module boundaries.

**Action:** Future agents extracting logic from Svelte 5 `.svelte` files into `.svelte.ts` files must follow the pattern of internal `$state` variables combined with a returned object that exposes them via getters.
