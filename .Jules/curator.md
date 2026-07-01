## 2025-06-16 - SEOGeneratorLayout Markdown Rendering Extraction

**Learning:** Pure string transformation and mapping rules (like `replaceEmojisWithIcons`, `labelValueHtml`) are often mixed directly into the `script` tags of Svelte components because they close over reactive state (like `variant`). Extracting them early makes components lighter, more testable, and strictly separates view logic from string generation logic.
**Action:** When finding complex formatting or view-model prep logic in `.svelte` files, look to extract them to adjacent `.ts` helper files, converting closed-over state into explicit function arguments.

## 2025-06-16 - Markdown Formatter Extraction

**Learning:** Svelte UI component files (like `DetailStatusTab.svelte`) can bloat rapidly by keeping pure logic functions that don't depend on component scope, like formatting markdown sections (`upsertMarkdownSection`), within the `<script>` tag. Since they act on isolated strings, they should be immediately moved to utility modules.
**Action:** Always scan for generic pure text/formatting functions in overgrown Svelte scripts and extract them to `src/lib/utils/` to improve Svelte file readability and simplify tests.

## 2024-06-18 - Extract Pronoun Resolution Logic

**Learning:** AI service files (like `text-generation.service.svelte.ts`) can grow rapidly by accumulating pure text-processing logic (like NLP pronoun resolution) alongside stateful AI integration logic.
**Action:** When a pure text-processing helper function grows large (>100 lines) and relies on dynamic imports (`compromise`), it should be extracted to its own file (e.g., `resolve-pronouns.ts`) in the same directory to improve readability of the main service file without breaking testing conventions.

## 2025-06-22 - Extracted State-dependent Prompts

**Learning:** When extracting logic from a Svelte component that relies on reactive `$state` (e.g. `editLore` being updated while an async AI generation streams in), be careful not to create state closure traps. Passing the raw string value creates a snapshot.
**Action:** When extracting async generation functions from UI components, pass reactive state getters (`getEditLore: () => string`) rather than static snapshot variables (`editLore: string`) to preserve the component's original closure-updating behavior.

## 2025-06-28 - Extracted Presentational UI with Bounded State

**Learning:** Svelte UI component files (like `DetailStatusTab.svelte`, `ZenContent.svelte`, and `ZenSidebar.svelte`) often bloat by inlining presentational UI that manages its own distinct internal state (like creating a new entity connection). This violates the Single Responsibility Principle and causes widespread code duplication.
**Action:** When you encounter a repeated block of presentational UI that requires its own distinct internal state (e.g. `isConnecting`, `addConnectionError`, form fields) and lifecycle methods (`handleAddConnection`), extract it into a small presentational subcomponent. Let the parent only control whether the component is visible (e.g., `isAddingConnection`).

## 2025-05-24 - Extracting theme presets from the schema definition

**Learning:** When dealing with god files that contain both structural type definitions/Zod schemas and a massive amount of hardcoded reference data (like the 1,112 line `packages/schema/src/theme.ts` which exported 26+ huge static objects), extracting the pure data payload into a dedicated constants file (e.g. `theme-templates.ts`) makes the core schema far easier to read and test, without modifying any upstream runtime logic.

**Action:** Future agents should look for modules in `packages/schema/` or configuration directories where huge static object definitions bloat the file. Split the definitions into `-templates.ts` or `-constants.ts` and use `export * from "./..."` in index files to prevent widespread import refactoring.
