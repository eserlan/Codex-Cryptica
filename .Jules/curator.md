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

## 2024-10-24 - Extracting pure presentational logic from page components

**Learning:** Svelte routing components (`+page.svelte`) can easily become bloated with large, complex inline SVG graphics or mock data panels that are purely presentational and only used once.
**Action:** Extract these isolated UI blocks into dedicated components within feature-specific directories (e.g., `lib/components/welcome/`) to drastically reduce the footprint of the routing files and improve scanability, even if the component is only used in one place.

## 2025-02-24 - Extracting DateSelection Logic from TemporalPicker.svelte

**Learning:** Svelte files containing pure logic (like converting raw date values to `DateSelection`) mixed with state and UI (`TemporalPicker.svelte`) can be made cleaner and testable by extracting the pure mapping logic into a separate `-utils` file (e.g., `utils/toDateSelection.ts`). This function only requires a config object to remove dependencies from Svelte's global stores.

**Action:** Look for Svelte components containing complex data structure conversions or data normalizations. Extract these pure helper functions into sibling `utils/` or `-helpers` files, passing down only the required plain dependencies (like config objects) rather than relying on reactive closure scope. Add Vitest coverage for the extracted logic.
## 2025-07-07 - Extracting configuration constants from massive files

**Learning:** When dealing with god files that contain both logic/interfaces and a massive amount of hardcoded configuration/reference data (like the 1,100+ line `settlementConfig` in `public-settlement.ts`), extracting the pure data payload into a dedicated constants file (e.g. `public-settlement-constants.ts`) makes the core file far easier to read and scan, without modifying any upstream runtime logic.
**Action:** Future agents should look for modules where huge static object definitions bloat the file. Split the definitions into `-constants.ts` and use `import` then `export` in the original file to prevent widespread import refactoring and maintain the public API.
## 2024-05-24 - Extract configuration blobs from generator engine files

**Learning:** Large modules that are composed of both functional logic (like prompt generators and local fallbacks) and huge static data objects (like lists of naming conventions, text descriptions for every genre, etc) make it hard to navigate. By extracting the pure static data into `<module>-constants.ts`, the original file shrinks significantly, is much easier to read, and the behavior remains identical since imports/exports can be structured to present the exact same API.
**Action:** When working on large files in `@codex/generator-engine` or similar packages that combine functions with huge data arrays/objects, prefer extracting the data objects to a sibling `-constants.ts` file, and keep the main file focused on logic. Ensure to keep exports aligned.
## 2026-07-14 - Extract Content Groups from God-Files

**Learning:** When marketing or configuration files like `seo-pages.ts` grow large because they combine disparate content (solutions, features, comparisons), extracting distinct record objects (like `comparisons`) into sibling files following the same naming convention significantly reduces file size and improves navigation without needing architectural changes.

**Action:** Favor grouping large static content records by their domain (e.g., `seo-comparisons.ts`) rather than dumping all page metadata into one god file.
