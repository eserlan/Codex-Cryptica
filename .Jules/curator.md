
## 2025-06-16 - SEOGeneratorLayout Markdown Rendering Extraction

**Learning:** Pure string transformation and mapping rules (like `replaceEmojisWithIcons`, `labelValueHtml`) are often mixed directly into the `script` tags of Svelte components because they close over reactive state (like `variant`). Extracting them early makes components lighter, more testable, and strictly separates view logic from string generation logic.
**Action:** When finding complex formatting or view-model prep logic in `.svelte` files, look to extract them to adjacent `.ts` helper files, converting closed-over state into explicit function arguments.
## 2025-06-16 - Markdown Formatter Extraction

**Learning:** Svelte UI component files (like `DetailStatusTab.svelte`) can bloat rapidly by keeping pure logic functions that don't depend on component scope, like formatting markdown sections (`upsertMarkdownSection`), within the `<script>` tag. Since they act on isolated strings, they should be immediately moved to utility modules.
**Action:** Always scan for generic pure text/formatting functions in overgrown Svelte scripts and extract them to `src/lib/utils/` to improve Svelte file readability and simplify tests.
