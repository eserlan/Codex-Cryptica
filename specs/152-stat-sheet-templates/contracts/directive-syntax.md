# Contract: Extended Markdown Directive Syntax (v1)

This is the authoring-facing contract: the allowlisted syntax a presentation template's `source` may contain. Anything outside this allowlist is either standard CommonMark (passed through) or stripped/flagged per the rules below — never executed.

## Standard Markdown (passthrough via `marked` lexer)

Headings (`#`…`######`), paragraphs, emphasis/strong, links (safe-scoped URIs only, same allowlist as `renderMarkdown`), lists (ordered/unordered), tables, blockquotes, thematic breaks (`---`), images (safe-scoped `src` only).

**Explicitly disallowed, always stripped**: raw HTML tags/blocks, `<script>`, inline event handlers, `javascript:`/`data:` URIs (beyond the existing safe-image allowlist), template/expression syntax (e.g. `${...}`, `{{#if}}`-style logic — only the flat field-placeholder form below is permitted).

## Field binding (inline)

```text
{{stat.<fieldId>}}
{{stat.<fieldId> display="<mode>"}}
{{stat.<fieldId> display="<mode>" label="<text>"}}
```

- `<fieldId>` — MUST match a field id on the template's declared schema. Unmatched → `MissingField` node (flagged, non-fatal).
- `display` — optional, one of the FR-013 modes valid for the field's type (`plain`, `prominent`, `current-max`, `counter`, `progress`, `checkbox`, `tag-list`, `table`, `notes`). Invalid/mismatched mode → falls back to the field type's default display mode, flagged in the editor.
- `label` — optional plain-text override, no nested directives/markup.

## Layout directives (fenced block)

```text
:::stat-group columns=2
{{stat.hp display="current-max" label="Hit Points"}}
{{stat.armour display="prominent"}}
:::
```

Allowlisted directive names (V1, closed set): `stat-group`, `section`, `card`, `row`.

- `columns=N` — integer attribute, valid on `stat-group` and `row`; N MUST be a positive integer. Layout MUST degrade responsively below N columns at narrow viewports (FR-018) — this is a rendering contract, not a syntax one.
- Directives may nest (e.g. a `section` containing a `stat-group`), to a reasonable depth; the parser MUST NOT infinite-loop or stack-overflow on malformed/unterminated fences — an unterminated `:::` block is a parse error for that block only (contained, not fatal to the whole template).
- Any directive name outside the allowlist → `UnknownDirective` node, rendered as a visible flagged placeholder (FR-011), never skipped silently and never executed.

## Versioning

Every template declares the `formatVersion` of this contract it was authored against (data-model.md). A future v2 of this contract MAY add new directive names or `display` modes; parsers MUST treat any directive/mode unknown to their own version as `UnknownDirective`/fallback-display rather than an error, so older app versions stay forward-compatible with newer template files.

## Non-goals (explicitly out of this contract)

No arbitrary HTML, no CSS, no JavaScript, no executable expressions, no user-defined directives, no cross-schema field mapping syntax (deferred per Clarifications), no interactive-action syntax (write actions are future scope per the spec's Future Interaction Model).
