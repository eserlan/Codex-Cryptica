## 2025-02-14 - Extract Pure Transformation Functions

**Learning:** When a large Svelte or component controller file (`import-settings-controller.svelte.ts`) contains pure transformation functions (`mapThemeToGenre`) alongside stateful class/component logic, these functions can safely be extracted to sibling `.ts` files to reduce the god file's size and improve component scanability. Also if there are duplicate implementations of this pure function in test files (`ImportSettings.pack.test.ts`), they can be removed and all places updated to import from the newly created reusable file (`theme-mapper.ts`).
**Action:** Extract pure transformation functions into sibling `.ts` files and deduplicate them in tests.

## 2024-05-18 - Extract Presentation Template Parser

**Learning:** When a large Svelte component (`PresentationTemplateEditor.svelte`) contains significant inline parsing and AST walking logic (`parseCardsFromSource`) that maps data to a visual builder, this pure parsing logic can be safely extracted to a sibling `.ts` file (`visual-card-parser.ts`) to dramatically reduce the god file's size and improve component scanability. State dependencies (like `schema.fields`) should be refactored into function parameters.
**Action:** Extract AST walking and parsing functions into sibling `.ts` files, passing any component state as explicit parameters.
