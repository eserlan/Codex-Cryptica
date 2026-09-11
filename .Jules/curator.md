## 2025-02-15 - Extract Interfaces from God-File Config

**Learning:** When dealing with large configuration files (like `seo-pages.ts`) that mix massive object dictionaries with type definitions, the type interfaces (e.g., `SEOPageData`, `SEOImportPageData`) can be safely extracted to a dedicated `seo-types.ts` sibling file. This isolates the type definitions from the raw data and improves readability without altering runtime behavior. The original file can simply import and re-export the types to preserve backward compatibility across the codebase.
**Action:** Extract large or central type definitions out of data-heavy configuration files into dedicated sibling `*-types.ts` files, and re-export them from the original location to ensure safety.

## 2025-02-14 - Extract Pure Transformation Functions

**Learning:** When a large Svelte or component controller file (`import-settings-controller.svelte.ts`) contains pure transformation functions (`mapThemeToGenre`) alongside stateful class/component logic, these functions can safely be extracted to sibling `.ts` files to reduce the god file's size and improve component scanability. Also if there are duplicate implementations of this pure function in test files (`ImportSettings.pack.test.ts`), they can be removed and all places updated to import from the newly created reusable file (`theme-mapper.ts`).
**Action:** Extract pure transformation functions into sibling `.ts` files and deduplicate them in tests.

## 2024-05-18 - Extract Presentation Template Parser

**Learning:** When a large Svelte component (`PresentationTemplateEditor.svelte`) contains significant inline parsing and AST walking logic (`parseCardsFromSource`) that maps data to a visual builder, this pure parsing logic can be safely extracted to a sibling `.ts` file (`visual-card-parser.ts`) to dramatically reduce the god file's size and improve component scanability. State dependencies (like `schema.fields`) should be refactored into function parameters.
**Action:** Extract AST walking and parsing functions into sibling `.ts` files, passing any component state as explicit parameters.

## 2025-02-15 - Extract Exemplars from Generator Registry

**Learning:** The `campaign-generator-registry.ts` file contains a massive `EXEMPLARS` constant (large raw JSON string constants) that pollutes the business logic of the registry. This is a clear case for extraction to a dedicated `-constants.ts` file to improve readability of the core registry logic, adhering to the "God-File Config" pattern.
**Action:** Extract large constants like `EXEMPLARS` from `campaign-generator-registry.ts` to a separate file (e.g., `campaign-generator-exemplars.ts`) and import them.

## 2025-02-22 - Extracting types that are still used in the source file

**Learning:** When extracting types from a file into a separate file, if the original file still uses those types internally, you must explicitly import them (`import type { X } from './types';`) before re-exporting them (`export type { X };`). Using `export type { X } from './types';` alone will cause a TypeScript compilation error because it does not make the types available within the local file's scope.

**Action:** Ensure both an `import` and an `export` are used when extracting and re-exporting types that are still utilized in the original file.

## 2025-03-01 - Extract Visual Card Serializer

**Learning:** When a large Svelte component (`PresentationTemplateEditor.svelte`) contains significant string generation and formatting logic (`syncSourceFromVisualCards`) to serialize internal visual structures into a source string, this serialization logic can be cleanly extracted to a sibling `.ts` file (`visual-card-serializer.ts`). State dependencies (like `schema.fields` and `fieldDisplayOverrides`) should be refactored into function parameters, returning the final string which the component then assigns to its local state. This drastically improves the readability of the component, and also makes the serialization logic fully unit-testable.

**Action:** Extract large serialization or string-formatting functions into sibling `.ts` files, passing any component state as explicit parameters.

## 2025-02-28 - Extract Entity List Empty States

**Learning:** Extracted multiple EmptyState conditionals from `EntityList.svelte` (a massive ~900 line component mixing grouping, tree building, sorting, and UI) into dedicated `EntityEmptyState.svelte` and `EntitySearchEmptyState.svelte` presentational components. This reduces JSX verbosity, especially since the "create" intent handler involves fetching global modal states. It keeps the core explorer list rendering cleaner and makes empty state behavior easier to read at a glance.

**Action:** Look for heavy conditional `EmptyState` blocks inside large list components (like `EntityList` or `SourceWorkspace`), particularly those that handle conditional logic based on permissions (like `vault.isGuest`) or dispatch complex UI intents, and extract them into narrow-purpose subcomponents.

## 2026-09-05 - Extract Canvas Workspace Drawing State

**Learning:** Svelte 5 components with overly complex local view state handling multiple disparate interaction contexts (e.g., node interaction vs freehand drawing vs modal states) can cause god-files that are extremely large.

**Action:** Extract interaction-specific sub-features (like CanvasDrawing pointer state management) into custom `use-*` hooks, delegating access and updates to the `logic` store or exposing handlers which simplifies the parent component significantly without changing runtime behaviour.
