# Implementation Plan: Entity Template Management

**Branch**: `167-entity-template-management` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/167-entity-template-management/spec.md` (GitHub issue #3445)

## Summary

Turn entity templates from a hidden "drop a `{type}.md` in a folder" feature into a managed vault setting. A new framework-free package, `packages/entity-template-engine`, owns the template model, the markdown compiler and parser, package import/export, and the pure resolution order. A vault-scoped `EntityTemplateStore` in `apps/web` loads built-in, legacy and user templates, persists user templates as JSON under `.codex/templates/`, and keeps the per-type defaults. The existing `EntityTemplateService` becomes a thin facade over it, so every creation path, including the related-entity dialog and the AI engine's sync resolver, sees vault templates. A new Entity Templates section in the Settings Templates tab provides list, preview, default, duplicate, delete, import and export, plus a visual section editor with live preview. Templates are copied into entities once at creation, so nothing existing is ever rewritten.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `schema` (Zod, `GENERIC_TEMPLATES`), `@codex/ai-engine` (`configureAIEngine`), `apps/web/src/lib/utils/opfs.ts` (`writeOpfsFile`, `deleteOpfsEntry`), `runtime-deps` (id generator and clock). New internal workspace package `packages/entity-template-engine`. **No new third-party dependency.**
**Storage**: Files in the vault's OPFS directory: `.codex/templates/{id}.json` (one per user template) and `.codex/templates/defaults.json` (per-type default ids). Legacy `.cc/templates/{type}.md` and `.codex/templates/{type}.md` are read from the vault directory and the linked folder, and never rewritten. No IndexedDB change.
**Testing**: Bun test in the new package; Vitest for the store, service, and Svelte components; existing `EntityTemplateService` tests must pass unchanged. Playwright is optional for one create-from-custom-default flow.
**Target Platform**: Browser (desktop and mobile), offline-capable, OPFS plus optional linked local folder.
**Project Type**: Monorepo web app with library packages.
**Performance Goals**: Template list loads with the vault without blocking entity creation. Live preview updates within 1 s at 50 sections (SC-007). Sync resolution is an in-memory lookup.
**Constraints**: Local-only (no network); the sync resolver must never do I/O; malformed files never block creation (FR-022); guest and read-only vaults get view-only; editing templates never touches entities (FR-017).
**Scale/Scope**: Tens of templates per vault, up to about 50 sections each. About 6 built-in-backed types plus custom categories.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                   | Status           | Notes                                                                                                                                                                                                                                |
| --------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Library-First            | PASS             | Model, compile, parse, package, resolve live in `packages/entity-template-engine`; web app is a thin store, disk I/O, and UI layer.                                                                                                  |
| II. TDD                     | PASS             | Package units, store, I/O and components each get failing tests first; success and failure paths (malformed file, invalid package, read-only) are covered.                                                                           |
| III. Simplicity & YAGNI     | PASS             | Sections only; no typed fields, no per-creation picker, no marketplace (#3548). Reuses `writeOpfsFile`, the `io.ts` pattern, the stat-sheet settings layout, and existing constants. No duplicated resolver: one order in one place. |
| IV. AI-First Extraction     | PASS             | The AI path now sees vault templates via the same resolver. No AI is used to manage templates.                                                                                                                                       |
| V. Privacy & Client-Side    | PASS             | All data stays in the vault; no network calls, no remote storage, so the opt-in remote exception is not invoked.                                                                                                                     |
| VI. Clean Implementation    | PASS             | Runes, Tailwind semantic tokens, `icon-[lucide--x]` icons. Validation is impacted-only per AGENTS.md.                                                                                                                                |
| VII. User Documentation     | PASS             | Update `content/help/default-templates.md`, register in `help-content.ts`, add a `FeatureHint` on the new section.                                                                                                                   |
| VIII. Dependency Injection  | PASS             | `EntityTemplateStore` and the disk repository take constructor deps (fs handle provider, id generator, clock, theme, session mode) and export class plus singleton.                                                                  |
| IX. Natural Language        | PASS             | Copy says "template", "section", "default", "hint", "duplicate", not "schema" or "blueprint".                                                                                                                                        |
| X. Coverage                 | PASS             | New package must meet the 70% goal on introduction; store at least the 50% floor.                                                                                                                                                    |
| XI. Agent Protocol          | PASS             | Surgical edits to callers; success criteria defined in quickstart.                                                                                                                                                                   |
| XII. Labels over Tags       | PASS             | Marketplace "genre tags" are out of scope here; if added later they are called labels.                                                                                                                                               |
| XIII. Discovery Intent      | N/A              | No public indexable page.                                                                                                                                                                                                            |
| XIV. Bounded Responsibility | PASS (see below) | Touched files over 500 lines are listed with a justification.                                                                                                                                                                        |

### Discovery Intent Check

N/A. No public, indexable discovery page is added or repositioned. The community marketplace is tracked in #3548 and will need its own check.

### Bounded Responsibility Check

Files touched that already exceed 500 lines (excluding tests and data-only modules):

| File                                                  | Lines | Why touched                                                                                                                                                                                   | Justification / extraction                                                                                                                                                                         |
| ----------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/settings/SettingsModal.svelte`            | 583   | Render the new section                                                                                                                                                                        | Shell for tabs. The Templates tab body is extracted into a new `TemplatesTab.svelte` that hosts both stat sheet and entity template settings, so the modal shrinks rather than grows.              |
| `components/VaultControls.svelte`                     | 640   | Swap the resolver call                                                                                                                                                                        | One-line call change inside the existing create-entity responsibility. No new behaviour.                                                                                                           |
| `components/entity-detail/RelatedEntityModal.svelte`  | 676   | Fix: uses the vault-aware resolver                                                                                                                                                            | Same as above: one call change, no new behaviour.                                                                                                                                                  |
| `components/generators/CampaignGeneratorModal.svelte` | 794   | Same resolver swap                                                                                                                                                                            | Same.                                                                                                                                                                                              |
| `app/init/app-init.ts`                                | 942   | Pass the store-backed sync resolver to `configureAIEngine`                                                                                                                                    | One-line wiring inside the existing "boot" responsibility.                                                                                                                                         |
| `stores/vault.svelte.ts`                              | 944   | Pass one extra dependency (`getActiveFolderHandle`) into the lifecycle manager, and one `await this.lifecycleManager.loadEntityTemplates(id)` next to the existing template loads in `init()` | One-line wiring inside its existing "compose vault services" responsibility. The template load itself lives in `stores/vault/lifecycle.ts` (288 lines), next to `statSheetTemplates.loadForVault`. |
| `config/help-content.ts`                              | 809   | Register a `FeatureHint` entry                                                                                                                                                                | Data-only catalogue (one entry, no behaviour): exempt under Principle XIV.4.                                                                                                                       |
| `stores/ui/modal-ui.svelte.ts`                        | 559   | **Not touched.**                                                                                                                                                                              | Editor open/close state stays local to the new settings component, so this facade is not widened.                                                                                                  |

`EntityTemplateConstants.ts` (812 lines) is a data-only catalogue and is exempt. It stays unchanged apart from being read by the built-in registry.

All new behaviour goes in new files: the package, `entity-template-store.svelte.ts`, `entity-template-repository.ts`, and the components under `components/settings/entity-templates/`.

## Project Structure

### Documentation (this feature)

```text
specs/167-entity-template-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── entity-template-engine.md
├── checklists/requirements.md
└── tasks.md              # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
packages/entity-template-engine/            # NEW, framework-free
├── package.json, tsconfig.json, bunfig.toml
├── src/
│   ├── types.ts            # EntityTemplate, TemplateSection, TemplateDefaults, Zod schemas
│   ├── compile.ts          # sections -> markdown
│   ├── parse.ts            # markdown -> sections (for duplicating built-in/legacy)
│   ├── package.ts          # export/import versioned Template Package + validation
│   ├── resolve.ts          # pure resolution order (FR-018)
│   ├── validate.ts         # editor validation rules (FR-011)
│   └── index.ts
└── tests/                  # compile, parse round-trip, package, resolve, validate

apps/web/src/lib/
├── services/
│   ├── EntityTemplateService.svelte.ts     # facade kept; delegates to store (signature preserved)
│   └── EntityTemplateConstants.ts          # unchanged (data)
├── stores/
│   ├── vault/lifecycle.ts                  # +1 call: entityTemplateStore.loadForVault
│   └── entity-templates/
│       ├── entity-template-repository.ts   # .codex/templates read/write/delete, legacy read
│       ├── builtin-templates.ts            # built-ins derived from constants via parse
│       ├── entity-template-store.svelte.ts # loadForVault, list, defaults, CRUD, resolveSync
│       └── *.test.ts
├── components/settings/
│   ├── TemplatesTab.svelte                 # NEW host: stat sheet + entity templates
│   └── entity-templates/
│       ├── EntityTemplateSettings.svelte   # list, defaults, actions
│       ├── EntityTemplateRow.svelte        # one row: badges + actions + preview
│       ├── EntityTemplateToolbar.svelte    # New / Import
│       ├── EntityTemplateNotices.svelte    # read-only note, warnings, import error
│       ├── EntityTemplateEditor.svelte     # visual section editor + live preview
│       ├── EntityTemplatePreview.svelte
│       └── *.test.ts
├── content/help/default-templates.md       # updated
└── config/help-content.ts                  # registration/hint update
```

**Structure Decision**: Library-first. Pure logic in the new `packages/entity-template-engine`; persistence, reactive state and UI in `apps/web`, following the `session-journal-engine` and `stores/vault/io.ts` precedents. No new database and no new object store.

## Phase 0 and Phase 1 outputs

- [research.md](./research.md): decisions and alternatives.
- [data-model.md](./data-model.md): entities, files on disk, state transitions.
- [contracts/entity-template-engine.md](./contracts/entity-template-engine.md): package API, package file format, store and service contracts.
- [quickstart.md](./quickstart.md): manual verification and the impacted-only validation commands.

## Post-design Constitution re-check

No new violations. The design keeps one resolver (Principle III), keeps the AI sync path I/O-free through an in-memory snapshot, and adds no dependency. The one open risk is whether `.codex/templates/` in the OPFS directory propagates to a linked local folder; it is recorded in research.md (R-005) with a verification task and a safe fallback, and does not change the plan's shape.

## Complexity Tracking

No constitution violations to justify.
