# Research: Propose Entities

## Decisions & Alternatives

**Decision: Regex-based Parsing for Bold Extraction**

- **Rationale**: We need to quickly parse `**bold**` or `__bold__` text from Markdown without building a full AST, ignoring text already wrapped in a markdown link `[**text**](...)`. A regex is performant and sufficient for finding exact matches, mirroring how connections are proposed.
- **Alternatives considered**: Using `marked` AST. It is robust but might be overkill for a quick inline extraction pass, though we can use it if we want strict markdown conformance. We will stick to a focused regex or AST walker depending on existing `editor-core` utilities.

**Decision: Using Generative AI for Category Inference**

- **Rationale**: The user wants an "intelligent guess" for the category of the new entity based on the current page's context. The Oracle (Gemini) `text-generation.service` is well-suited for taking the entity title and source text and classifying it against the vault's available templates/categories.
- **Alternatives considered**: Simple keyword matching. This is too rigid and lacks the requested "best guess" capability.

**Decision: Passing Source Context to Template**

- **Rationale**: The new entity should be initialized with content from the current page. We will pass the source page's content as a prompt context to the Oracle generator when initializing the entity template.
- **Alternatives considered**: Passing only the sentence containing the bold word. This might lack broader context, but could be a fallback if the full page is too large.
