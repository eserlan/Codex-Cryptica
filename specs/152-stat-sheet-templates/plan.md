# Implementation Plan: Markdown-Based Presentation Templates for Stat Sheets

**Branch**: `152-stat-sheet-templates` | **Date**: 2026-08-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/152-stat-sheet-templates/spec.md`

## Summary

Add a presentation layer on top of the existing Stat Sheet feature (#149): users author reusable layouts in an extended, allowlisted Markdown syntax (field bindings + a small set of layout directives), which is parsed into a validated AST and rendered as native Svelte components bound to an entity's live Stat Sheet data — never as raw HTML. V1 scopes one template to exactly one schema, with a schema-level default template and an optional per-entity override; invalid/missing templates always fall back to the existing standard `StatSheetView.svelte` renderer. Built on the existing `marked`-based Markdown pipeline and the `@codex/stat-sheet-engine` versioned-package pattern rather than new parsing/packaging infrastructure.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (repo-pinned; see `lint:types:fast`/tsgo), Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: `marked` (extended with custom tokenizer extensions for directives/field placeholders — reused, not replaced), `DOMPurify` (reused for the existing notes/long-text display mode only, not the directive pipeline itself), `zod` (schema/package validation, matching `packages/schema` and `@codex/stat-sheet-engine`), existing `stat-sheet-engine` versioned-package pattern, Iconify, Tailwind 4
**Storage**: Browser-local only (Constitution V). New IndexedDB object store `stat_sheet_presentation_templates` (same pattern as existing `stat_sheet_templates`, `apps/web/src/lib/utils/idb.ts`, `DB_VERSION` bump). Schema-level default presentation stored on the existing `StatSheetTemplateSchema` record; per-entity override stored in the entity's existing OPFS-backed frontmatter `statSheet` block. No server-side storage.
**Testing**: `vitest` (unit tests for parser/validator in the new package, per Constitution II TDD — write failing tests first), Svelte component tests via `vitest`/`@testing-library/svelte` (existing web app pattern), `playwright` for the User-Story quickstart flows if an e2e spec is warranted
**Target Platform**: Browser (SvelteKit web app), fully client-side, offline-capable per Constitution V
**Project Type**: Web application monorepo (Bun workspaces: `apps/web` + `packages/*`)
**Performance Goals**: Live preview re-render within ~150ms of an editor keystroke pause for a typical template (≤30 field references) so authoring feels responsive; matches SC-002's "under 5 minutes to author" success criterion
**Constraints**: No arbitrary HTML/CSS/JS/executable expressions ever reach the DOM from template source (hard security constraint, FR-004/FR-011); fully offline/client-side (Constitution V); responsive at desktop + mobile viewport widths (FR-018)
**Scale/Scope**: Single-vault, single-user scope per Constitution V — dozens of presentation templates per vault is the realistic ceiling, not a multi-tenant/high-QPS concern

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Assessment |
|---|---|
| I. Library-First | New parsing/validation logic lives in a package (extending `@codex/stat-sheet-engine` or a new sibling package — decided during implementation based on size), not inline in `apps/web`. `apps/web` stays a thin UI layer (editor, renderer components, stores) over it. **Pass.** |
| II. TDD | `contracts/presentation-engine-api.md` defines pure, headless functions (`parseTemplate`, `validateAst`, `isTemplateUsable`) specifically so they can be unit-tested Red-Green-Refactor before any Svelte UI exists. **Pass, must be enforced in tasks.md ordering.** |
| III. Simplicity & YAGNI | Reuses `marked` (extension API) instead of a new Markdown library; reuses `@codex/stat-sheet-engine`'s versioned-package pattern instead of a new one; explicitly rejects adding a code-editor dependency (research.md §6) in favor of a plain textarea + autocomplete. **Pass.** |
| IV. AI-First Extraction | Not applicable — this feature is user-authored presentation, not Oracle/Gemini extraction. |
| V. Privacy & Client-Side | All storage is IndexedDB/OPFS as today; no new server dependency for authoring/rendering (only export/import is a local file, no network call). **Pass.** |
| VI. Clean Implementation | Follows `@docs/STYLE_GUIDE.md` (Svelte 5 Runes, Tailwind 4 tokens); `lint`/`test` gates apply as usual. |
| VII. User Documentation | New `help-content.ts` entry required for the Presentation Template editor; `FeatureHint` recommended given the directive syntax is new to users — tracked as a task. |
| VIII. DI | New `PresentationTemplateStore` follows the existing `StatSheetTemplateStore` DI-singleton pattern (constructor injection, class + default singleton export). **Pass.** |
| IX. Natural Language | Editor diagnostics/flags (missing field, unknown directive) must use plain language, not internal node-kind names verbatim — a UX-copy task, not a gate blocker. |
| X. Coverage | New package/logic must hit the 70% "new code" goal on introduction; parser/validator being pure functions makes this straightforward. |
| XI. Karpathy Rules | This plan scopes strictly to spec.md's FRs; no speculative interactivity/cross-schema features are being built now (both explicitly deferred per Clarifications). |
| XII. Labels over Tags | No tagging/categorization surface introduced by this feature; N/A. |

**No violations requiring Complexity Tracking justification.**

## Project Structure

### Documentation (this feature)

```text
specs/152-stat-sheet-templates/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   ├── directive-syntax.md        # Markdown directive grammar contract
│   └── presentation-engine-api.md # Parser/validator/renderer library contract
└── tasks.md              # Phase 2 output (/speckit-tasks, not this command)
```

### Source Code (repository root)

```text
packages/
└── stat-sheet-engine/                    # existing package — extended, not replaced
    └── src/
        ├── presentation/
        │   ├── parse.ts                  # parseTemplate() — marked + CC extensions
        │   ├── ast.ts                    # PresentationAst node types (data-model.md)
        │   ├── validate.ts               # validateAst(), isTemplateUsable()
        │   ├── directives.ts             # allowlisted directive/display-mode definitions
        │   ├── package.ts                # PresentationTemplatePackage export/import envelope
        │   └── presentation.test.ts      # unit tests (parser, validator, package round-trip)
        └── index.ts                      # extended exports

apps/web/src/lib/
├── components/stats/
│   ├── presentation/
│   │   ├── PresentationRenderer.svelte       # AST → native Svelte tree (contracts/presentation-engine-api.md)
│   │   ├── nodes/                            # one small component per PresentationAst node kind
│   │   │   ├── HeadingNode.svelte
│   │   │   ├── TableNode.svelte
│   │   │   ├── GroupNode.svelte
│   │   │   ├── FieldReferenceNode.svelte     # reuses existing counter/checkbox/etc. controls
│   │   │   ├── MissingFieldNode.svelte
│   │   │   └── UnknownDirectiveNode.svelte
│   │   ├── PresentationTemplateEditor.svelte # source textarea + field autocomplete + live preview
│   │   └── PresentationTemplatePicker.svelte # per-schema default + per-entity override UI
│   └── StatSheetView.svelte                  # existing standard renderer — unchanged, remains the FR-010 fallback target
├── stores/
│   └── presentation-templates.svelte.ts      # new PresentationTemplateStore (DI singleton, mirrors stat-sheet-templates.svelte.ts)
└── utils/
    └── idb.ts                                # add `stat_sheet_presentation_templates` store, bump DB_VERSION

packages/schema/src/
└── stat-sheet.ts                             # add defaultPresentationTemplateId to StatSheetTemplateSchema;
                                                # add presentationTemplateId to the entity statSheet association schema

tests/ (apps/web)
├── unit/                                     # component-level tests for editor/renderer/picker
└── e2e/                                      # quickstart.md flows, Playwright
```

**Structure Decision**: Single monorepo, existing structure — extend `packages/stat-sheet-engine` (library-first parsing/validation/package logic, Constitution I) and `apps/web/src/lib/components/stats/` (thin UI layer), following the exact precedent set by #149/#150. No new top-level package unless the presentation engine code volume during implementation makes `stat-sheet-engine` unwieldy, in which case split to a new `packages/stat-sheet-presentation` package — same public contract either way, decided in Phase 2/implementation rather than upfront (YAGNI).

## Complexity Tracking

_No entries — no Constitution Check violations to justify._
