# Contract: Presentation Template Engine (library API)

Internal library contract for the parse/validate/render pipeline (research.md §3). This is the "public API" a library-first package (Constitution I) exposes to `apps/web` — analogous to `@codex/stat-sheet-engine`'s existing exports.

## `parseTemplate(source: string, formatVersion: number): ParseResult`

- Runs the `marked` lexer with the CC extensions (directive-syntax.md) over `source`.
- Returns `{ ok: true, ast: RawAst }` on structurally parseable input, or `{ ok: false, errors: ParseError[] }` only for input the lexer cannot tokenize at all (e.g. catastrophic malformed input) — day-to-day issues like unknown directives or bad field refs are NOT parse errors; they become flagged AST nodes (see below).
- MUST NOT throw for any string input, including empty string, pure prose with no directives, or adversarial input (deeply nested fences, huge field lists) — bounded/contained per directive-syntax.md's parse-error containment rule.
- Pure function: no DOM access, no I/O — testable headlessly.

## `validateAst(ast: RawAst, schema: StatSheetTemplateSchema): PresentationAst`

- Resolves every `FieldReference` node against `schema.fields`; unresolved → `MissingField` (data-model.md).
- Resolves every directive node against the v1 allowlist (directive-syntax.md); unknown → `UnknownDirective`.
- Checks `display` mode compatibility against each resolved field's type; incompatible → falls back to that type's default mode and marks the node as flagged (for editor diagnostics only — rendering still succeeds).
- Always returns a usable `PresentationAst` — this function has no failure return; "invalid template" (FR-010 fallback trigger) is determined by the caller only from `parseTemplate` failing, or `schema` not being found at all for the template's `schemaTemplateId`.
- Pure function; deterministic given the same `(ast, schema)` input — required for editor live-preview and for unit testing FR-009/FR-011 behavior without rendering.

## `isTemplateUsable(template: PresentationTemplate, schema: StatSheetTemplateSchema | undefined): boolean`

- `false` when: `schema` is `undefined` (schema no longer exists), or `parseTemplate` returned `ok: false`.
- `true` otherwise, even if the resulting `PresentationAst` contains `MissingField`/`UnknownDirective` nodes — those render as in-place flags, they don't disqualify the template (FR-009 vs FR-010 distinction).
- This is the single decision point consuming code (the entity Stat Sheet view) calls to decide "render via `PresentationRenderer`" vs "fall back to `StatSheetView.svelte`" (FR-010).

## `<PresentationRenderer>` (Svelte component contract)

Props: `ast: PresentationAst`, `entity: Entity` (for live field values), `mode: "view" | "preview"`.

- Renders one native Svelte sub-component per `PresentationAst` node kind (no `{@html}` anywhere in this component tree — see research.md §3 for why this is the safety boundary, not `DOMPurify`).
- In `preview` mode, field values may come from representative/sample data instead of a real entity (per spec Assumptions); the component contract is identical either way — it only ever reads through the same field-value accessor.
- `FieldReference`/`MissingField`/`UnknownDirective` nodes reuse the existing field-control components from `StatSheetView.svelte`/`StatSheetEditor.svelte` where the display mode maps onto an existing control (e.g. counter, checkbox), so V1 interactivity (FR-014) is inherited for free rather than reimplemented.

## Compatibility with `@codex/stat-sheet-engine`

`PresentationTemplatePackage` import/export (data-model.md) reuses that package's existing `validate`/`migrate` entry points' shape (same envelope pattern: `formatVersion`, structural validation, explicit rejection reasons) so the marketplace/publishing flow (#1981/#1984) can eventually treat both template kinds uniformly.
