
## 2025-06-16 - SEOGeneratorLayout Markdown Rendering Extraction

**Learning:** Pure string transformation and mapping rules (like `replaceEmojisWithIcons`, `labelValueHtml`) are often mixed directly into the `script` tags of Svelte components because they close over reactive state (like `variant`). Extracting them early makes components lighter, more testable, and strictly separates view logic from string generation logic.
**Action:** When finding complex formatting or view-model prep logic in `.svelte` files, look to extract them to adjacent `.ts` helper files, converting closed-over state into explicit function arguments.
