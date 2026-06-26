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
## 2025-06-26 - Generator Page Content Slug Extraction

**Learning:** Large Svelte page component files (like `GeneratorPageContent.svelte`) often embed large routing-level configuration constants (like `GENERATOR_SLUGS_WITH_THEME`) and simple mapping helpers that don't depend on Svelte state. Since these are used by other routing modules (for types like `ValidSlug`), they should be extracted to their own domain-specific service files.
**Action:** When finding complex routing slug constants and their dependent helpers in root page components, extract them to a dedicated typescript file (e.g., `generator-slugs.ts`) in the appropriate feature directory (`services/seo`) to make the UI component easier to scan and the logic independently testable.
