# Research: Markdown-Based Presentation Templates for Stat Sheets

## 1. Markdown parsing base

**Decision**: Extend the existing `marked` pipeline (`apps/web/src/lib/utils/markdown.ts`) with custom `marked` tokenizer/renderer extensions for the CC directive syntax, rather than adopting a new Markdown library (remark/unified) or hand-rolling a parser.

**Rationale**: `marked` is already the canonical Markdown engine for the main entity document, blog articles, and Oracle chat rendering. `marked.use({ extensions: [...] })` supports registering custom block-level tokenizers (for `:::stat-group ... :::` fenced directives) and inline tokenizers (for `{{stat.field ...}}` placeholders) without forking the library. Constitution Principle III (Simplicity & YAGNI) directs reuse of established libraries over custom solutions.

**Alternatives considered**:
- **remark/unified**: More powerful plugin/AST ecosystem, but introduces a second Markdown stack alongside `marked`/`tiptap-markdown` already in the repo — rejected for duplication (Constitution III).
- **Hand-rolled parser**: Full control over the AST shape, but reimplements solved problems (list/table/heading parsing) that `marked` already handles correctly — rejected.

## 2. Directive/placeholder syntax

**Decision**: Adopt the syntax already illustrated in issue #1992 as the concrete grammar:
- Field binding: `{{stat.<fieldId> [display="<mode>"] [label="<text>"]}}` — inline token.
- Layout grouping: fenced container `:::stat-group [columns=N] ... :::` (and a small closed set of sibling containers: `:::section`, `:::card`, `:::row`) — block token, parsed as a marked "fenced directive" extension (`:::name key=value` … `:::`), modeled on the CommonMark "generic directives" convention (already a common, well-understood pattern for Markdown extensions) since no prior art exists in this codebase (confirmed: no `:::` containers or custom `marked` extensions currently present).

**Rationale**: Reusing the syntax already given in the issue avoids re-litigating a bikeshed and keeps the spec's examples valid. The `:::name ... :::` fenced-directive convention is widely recognized (e.g. Pandoc, remark-directive) so authors/tools outside this repo can reason about it even though this repo has no prior directive syntax to match.

**Alternatives considered**:
- Custom `<StatGroup columns={2}>`-style pseudo-JSX: rejected — reads as executable syntax and risks confusion with the "no arbitrary HTML" rule.
- YAML frontmatter per section: rejected — doesn't compose with inline Markdown flow the way fenced directives do.

## 3. Parse → validate → render pipeline

**Decision**: Three-stage pipeline, all client-side:
1. **Parse**: `marked.lexer()` with the CC extensions produces a token stream including directive/placeholder tokens.
2. **Build & validate AST**: A new pure-TS pass (no `marked` renderer involved) walks the token stream and produces a `PresentationAst` of strictly-typed nodes (heading, paragraph, list, table, blockquote, hr, image, section/group/card containers, field-reference nodes). Any raw-HTML token type emitted by `marked` (`html`, inline `html`) is dropped, never passed through — this is the enforcement point for "no arbitrary HTML/CSS/JS", not `DOMPurify`. Field references are validated against the template's declared schema at this stage (existence + type/display-mode compatibility); unknown directive names become a typed `UnknownDirective` node (rendered later as a visible flagged placeholder per FR-011) instead of a parse error.
3. **Render**: A Svelte component walks `PresentationAst` and renders native Svelte elements/components per node type (one small component per node kind) bound reactively to the entity's live Stat Sheet data — not via `{@html}`. Because rendering never re-serializes to raw HTML from user content, `DOMPurify` is not needed on the template-authored text; it stays reserved for the free-text/notes field content mirrored from the existing Stat Sheet renderer, consistent with the existing `renderMarkdown` sanitize step.

**Rationale**: Producing a typed AST (rather than sanitized HTML) is what makes FR-005 (validate field refs before treating a template as usable), FR-009 (surface missing/incompatible refs), and FR-011 (visible unknown-directive handling) implementable and testable as pure functions, independent of the DOM. Rendering via native Svelte components (not `{@html}`) is a stronger safety boundary than sanitizing HTML strings, and matches how `StatSheetView.svelte` already renders fields today (typed `{#if}` branches, not HTML injection).

**Alternatives considered**:
- Render straight to sanitized HTML string via `DOMPurify` (like the main document renderer): rejected as the primary mechanism — field binding needs to stay reactive to live entity data and needs structured validation, which an HTML-string pipeline doesn't give for free; note the notes/long-text display mode still borrows `renderMarkdown` for its own content since that's plain prose, not directive-bearing.

## 4. Storage model

**Decision**: New IndexedDB object store `stat_sheet_presentation_templates` (keyPath `id`, indexes `by-vault` and `by-schema-template-id`), following the exact pattern of the existing `stat_sheet_templates` store (`apps/web/src/lib/utils/idb.ts`, `DB_VERSION` bump) and its reactive wrapper `StatSheetTemplateStore` (`apps/web/src/lib/stores/stat-sheet-templates.svelte.ts`). A new `PresentationTemplateStore` follows the same DI-singleton pattern (Constitution VIII).

Schema-level default selection is a new field (`defaultPresentationTemplateId`) on the existing `StatSheetTemplateSchema` record (`packages/schema/src/stat-sheet.ts`) — the schema/template-type record is the natural owner of its own default. Per-entity override is a new optional field (`presentationTemplateId`) alongside the existing `statSheet` block in entity frontmatter, so it round-trips with the entity like the rest of its Stat Sheet association.

**Rationale**: Matches existing precedent exactly (issue #149's plan put the vault-owned stat-sheet-template registry in IndexedDB, not vault files, since templates are reusable definitions rather than entity content) and keeps entity frontmatter as the single source of truth for anything entity-specific (Constitution V, privacy/local-first).

**Alternatives considered**: Storing per-entity override in a separate IndexedDB table keyed by entity id — rejected as an unnecessary join; the entity's own frontmatter already carries its `statSheet` association and is simpler to keep in sync with (YAGNI).

## 5. Template package / import-export format

**Decision**: Reuse the `@codex/stat-sheet-engine` package's existing versioned-package pattern (`template-package.ts`, `migrations.ts`, `import.ts`, `PUBLIC_STAT_SHEET_PACKAGE_VERSION`) as the model for a new `PresentationTemplatePackage` envelope (Markdown source + directive/field metadata + declared schema id + a `formatVersion`), either as a new export from `@codex/stat-sheet-engine` or a small sibling package if the parser/AST logic grows large enough to warrant its own workspace package (Constitution I, library-first). Exact package boundary is decided in Phase 1 based on size, not upfront.

**Rationale**: This is the same "value-free, versioned, migratable" shape issue #1992 and the spec's FR-015/FR-019 already call for, and #150 (marketplace) already built and tested this pattern once — reusing it avoids a second bespoke package format.

## 6. Authoring UI

**Decision**: Plain textarea-based Markdown source editor (not a rich WYSIWYG) with a lightweight custom autocomplete popover for `{{stat.` field references, built directly in `apps/web` — no new editor dependency.

**Rationale**: The repo has two existing Markdown-adjacent editor stacks — `marked`+`DOMPurify` (render-only) and `tiptap`+`tiptap-markdown` (`MarkdownEditor.svelte`, WYSIWYG for prose) — but no source-level code editor (no CodeMirror/Monaco anywhere in the repo). Introducing one is a heavy new dependency for a first version; a textarea with a small field-picker/autocomplete affordance satisfies FR-006 (editor assistance) without it. This can be revisited later if authoring UX proves insufficient — noted as a non-blocking future improvement, not a V1 requirement.

**Alternatives considered**: Adopting CodeMirror for syntax highlighting — deferred; not required by any acceptance criterion and adds a new dependency contrary to Constitution III.
