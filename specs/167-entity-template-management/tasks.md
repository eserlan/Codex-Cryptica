---
description: "Task list for Entity Template Management (167-entity-template-management)"
---

# Tasks: Entity Template Management

**Input**: Design documents from `/specs/167-entity-template-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/entity-template-engine.md, quickstart.md
**Issue**: https://github.com/eserlan/Codex-Cryptica/issues/3445

**Tests**: INCLUDED. The constitution (Principle II, TDD) and AGENTS.md require tests for changed behaviour, covering a success path and at least one negative, failure or cancellation path. Within each story, write the test tasks first and confirm they fail before implementing.

**Organization**: Grouped by user story so each can be implemented and tested independently. US1 (P1) browse + default · US2 (P1) duplicate + visual editor · US3 (P2) create from scratch · US4 (P2) import/export · US5 (P2) legacy files · US6 (P2) every creation path.

> **Design revision (after first implementation):** the section model (titles, hints, ordering, `compileTemplate` / `parseMarkdownToSections`, live preview, drag/up-down reorder) was replaced by a plain markdown body edited in a text box. Tasks below that mention sections, compile, parse, reorder or a live preview (T004, T005, T009, T026, T029, and the section-specific parts of T006, T007, T025, T032, T038) were implemented and then superseded; the shipped behaviour is described by `spec.md`, `data-model.md` and `contracts/entity-template-engine.md`. See research R-001.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US6, mapped to spec.md
- All paths are relative to the repository root. `web/` below means `apps/web/src/lib/`.

## Guardrails (apply to every task)

- Svelte 5 Runes, Tailwind 4 semantic tokens (`text-theme-primary`), Iconify (`icon-[lucide--name]`, NEVER `lucide-svelte`). See `docs/STYLE_GUIDE.md`.
- Constructor-based DI for the store and repository: exported class plus singleton, mirroring `web/services/delve-dossier-service.ts`. Ids and time come from `runtime-deps`.
- Do not grow `SettingsModal.svelte` (583 lines), `VaultControls.svelte` (640), `RelatedEntityModal.svelte` (676), `CampaignGeneratorModal.svelte` (794), `app/init/app-init.ts` (942), `stores/vault.svelte.ts` (944), `config/help-content.ts` (809, data catalogue) or `stores/ui/modal-ui.svelte.ts` (559) beyond the one-line wiring named in the tasks. `modal-ui.svelte.ts` is NOT touched. New logic goes in the new modules (Constitution XIV).
- No template operation reads or writes entities. Templates are copied into an entity once, at creation (FR-017).
- No network calls anywhere in this feature.
- User copy is plain language: "template", "section", "hint", "default", "duplicate" (Constitution IX).
- Run only impacted validation (`bun run lint:changed`, `bun run test:changed`, scoped `svelte-check`); use `bun`, never `node`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the library package (Constitution I) and make it resolvable from `apps/web`.

- [x] T001 Create workspace package `packages/entity-template-engine/` with `package.json` (`name: "entity-template-engine"`, `type: module`, `main`/`types` → `./src/index.ts`, scripts `test`/`test:coverage`/`lint` copied from `packages/session-journal-engine/package.json`, dependency `zod` as used by `packages/schema/package.json`, same devDependencies), plus `tsconfig.json` and `bunfig.toml` copied from `packages/session-journal-engine/`, an empty `src/index.ts` and an empty `tests/` folder
- [x] T002 Add `"entity-template-engine": "workspace:*"` to dependencies in `apps/web/package.json` (alphabetical) and run `bun install` to link the workspace

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure engine, the disk repository, the built-in registry, the store and the service facade. No user-facing UI yet. After this phase the resolution order (FR-018) works end to end.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Engine (pure, tests first)

- [x] T003 [P] Write `packages/entity-template-engine/src/types.ts` per `data-model.md`: Zod schemas and types for `EntityTemplate`, `TemplateSection`, `TemplateDefaults`, `TemplatePackage`, `DraftTemplate`, `ValidationIssue`; section objects use passthrough so unknown extra fields are preserved (FR-024); export `TEMPLATE_FORMAT_VERSION = 1`
- [x] T004 [P] Write failing tests `packages/entity-template-engine/tests/compile.test.ts`: intro then sections emitted as `## Title` plus hint; no hint means heading only; single trailing newline; deterministic; empty `sections` with intro; a section with markdown in the hint is preserved verbatim
- [x] T005 [P] Write failing tests `packages/entity-template-engine/tests/parse.test.ts`: headings become sections with body as hint; text before the first heading becomes `intro`; empty string gives no sections; `parse(compile(t))` round-trips a compiled template; content with `###` sub-headings stays inside the parent section's hint (negative: not split into extra sections); the real built-in `character` and `faction` templates from `web/services/EntityTemplateConstants.ts` parse without throwing
- [x] T006 [P] Write failing tests `packages/entity-template-engine/tests/validate.test.ts`: blank or whitespace name, over-80-char name, missing entity type, zero sections, blank section title and over-120-char title each yield a plain-language issue; a valid draft yields `[]`
- [x] T007 [P] Write failing tests `packages/entity-template-engine/tests/package.test.ts`: export then import round-trips; import assigns no id; rejects non-object, wrong `kind`, unsupported `formatVersion` (message says to update the app) and an invalid template, never throws (negative); unknown extra section fields survive a round trip; export contains no default or source state
- [x] T008 [P] Write failing tests `packages/entity-template-engine/tests/resolve.test.ts` for FR-018: chosen default wins over a legacy file; legacy wins over theme built-in; theme built-in wins over generic; generic wins over blank; a dangling default id falls through (negative); an empty legacy file resolves to `""` and stops the chain; a built-in or legacy default returns its original markdown unchanged; a user default returns compiled markdown
- [x] T009 Implement `compile.ts`, `parse.ts`, `validate.ts`, `package.ts`, `resolve.ts` in `packages/entity-template-engine/src/` until T004–T008 pass, and re-export the public surface from `src/index.ts` (depends on T003–T008)

### Repository, built-ins, store

- [x] T010 [P] Write failing tests `web/stores/entity-templates/entity-template-repository.test.ts` using in-memory directory handle fakes (see the mocks in `web/services/EntityTemplateService.svelte.test.ts`): `saveTemplate` writes `.codex/templates/{id}.json`; `saveDefaults` writes `defaults.json`; `deleteTemplate` removes only that file; `loadAll` returns user templates, defaults and legacy `.md` files from `.cc/templates` and `.codex/templates` in both the vault directory and the linked folder, matching `{type}.md` case-insensitively; legacy precedence is the linked folder first, otherwise the vault directory, never merged (research R-013), and `.cc/templates` before `.codex/templates` within the chosen location; an empty legacy file is returned as valid; a malformed JSON file is skipped and reported in `warnings` while the others still load (negative); a missing `.codex` directory returns empty results without throwing
- [x] T011 [P] Write failing tests `web/stores/entity-templates/builtin-templates.test.ts`: one built-in per entity type with id `builtin:{type}`; content is the theme-aware markdown for the given theme and falls back to the generic template; a type with no built-in returns none; built-ins are never marked editable
- [x] T012 Implement `web/stores/entity-templates/entity-template-repository.ts` (thin load/save/delete functions on handles, using `writeOpfsFile` and `deleteOpfsEntry` from `web/utils/opfs.ts`, following `web/stores/vault/io.ts`) until T010 passes (depends on T009, T010)
- [x] T013 Implement `web/stores/entity-templates/builtin-templates.ts` deriving built-ins from `web/services/EntityTemplateConstants.ts` (`resolveTemplateSync`), read-only, until T011 passes (depends on T011)
- [x] T014 [P] Write failing tests `web/stores/entity-templates/entity-template-store.test.ts` with injected fakes: `loadForVault` lists built-in, legacy and user templates and exposes `warnings`; a vault switch drops the previous snapshot; `resolveSync` follows FR-018 and fall back to `resolveTemplateSync` before any vault has loaded; `canEdit` is false when `isReadOnly()` is true and every mutating method then refuses without touching the repository (negative); a failed repository write leaves the list unchanged and calls `notify` (negative); no method reads or writes entities (assert the store has no entity dependency); malformed files never prevent `resolveSync` from returning content; `effectiveDefaultFor(type)` returns the chosen default, else the legacy file, else the built-in, exactly one per type
- [x] T015 Implement `web/stores/entity-templates/entity-template-store.svelte.ts` (Svelte 5 `$state`, constructor deps per `contracts/entity-template-engine.md`; export class and singleton; read-only surface only in this phase: `loadForVault`, `list`, `warnings`, `canEdit`, `defaultFor`, `effectiveDefaultFor`, `previewMarkdown`, `resolveSync`); default deps: `isReadOnly` = `sessionModeStore.isGuestMode` or no writable vault handle, `notify` = `notificationStore`, ids from `runtime-deps` `systemIdGenerator`) until the read-side of T014 passes (depends on T012, T013, T014)
- [x] T016 Load templates with the vault: in `web/stores/vault/lifecycle.ts`, next to `statSheetTemplates.loadForVault(id)`, call `entityTemplateStore.loadForVault(id, { vault: await this.deps.getActiveVaultHandle(), folder: await this.deps.getActiveFolderHandle?.() })`; add the optional `getActiveFolderHandle` dependency to `VaultLifecycleDependencies` and pass `() => this.getActiveFolderHandle()` at the single construction site in `web/stores/vault.svelte.ts` (one line, the only edit to that file). Guest mode skips the load and stays on built-ins. Extend `web/stores/vault/lifecycle.test.ts`: the load is called on switch with both handles; it is skipped in guest mode (negative); a rejected load does not abort the switch (negative) (depends on T015)
- [x] T017 Make `EntityTemplateService` a facade: in `web/services/EntityTemplateService.svelte.ts` keep the `resolveTemplate(type, themeId?, dirHandle?)` and `extractSummary` signatures and delegate to the store; use the existing handle-based logic only while the store has not loaded. Existing tests in `web/services/EntityTemplateService.svelte.test.ts` MUST pass unchanged; add tests that a loaded store wins over the handle, and that an unloaded store keeps the old behaviour (depends on T015)

**Checkpoint**: The resolution order works end to end with built-ins, legacy files and stored user templates. No UI yet.

---

## Phase 3: User Story 1 - Browse templates and pick a default per entity type (Priority: P1) 🎯 MVP

**Goal**: Settings → Templates shows an Entity templates section listing all templates grouped by type, with preview and a per-type default that only affects new entities.

**Independent Test**: Open the section, set a non-default template as default for one type, create an entity of that type, and confirm the body starts with that template's sections while existing entities are unchanged.

### Tests for User Story 1 (write first, confirm they fail)

- [x] T018 [P] [US1] Write failing tests `web/stores/entity-templates/entity-template-store.defaults.test.ts`: `setDefault` persists to `defaults.json` and moves the Default marker; `effectiveDefaultFor` yields exactly one default per type both before any choice (legacy file if present, else built-in) and after; `setDefault` with an unknown template id or a template of another type is rejected (negative); `setDefault` is refused when `canEdit` is false (negative); changing a default never calls anything entity-related (SC-003)
- [x] T019 [P] [US1] Write failing component tests `web/components/settings/entity-templates/EntityTemplateSettings.test.ts`: renders one row per template with name, source label ("Built-in" / "Yours" / "Yours (file)" for legacy) and a Default marker driven by `effectiveDefaultFor`, with exactly one marked row per type even when nothing has been chosen; groups by entity type; Preview opens the compiled note; Set as default updates the marker; in read-only mode no mutating action is rendered and one explanation line is shown (negative); the list renders a visible warning when `warnings` is non-empty

### Implementation for User Story 1

- [x] T020 [US1] Add `setDefault` and `clearDefaultFor` to `web/stores/entity-templates/entity-template-store.svelte.ts` until T018 passes (depends on T018)
- [x] T021 [P] [US1] Create `web/components/settings/entity-templates/EntityTemplatePreview.svelte` showing `previewMarkdown` rendered through the existing markdown renderer used by help content
- [x] T022 [US1] Create `web/components/settings/entity-templates/EntityTemplateSettings.svelte`: grouped list, badges, Default marker, Preview, Set as default, warning banner and read-only explanation, mirroring the layout of `web/components/settings/StatSheetTemplateSettings.svelte` without importing from it (depends on T019, T020, T021)
- [x] T023 [US1] Extract the Templates tab body from `web/components/settings/SettingsModal.svelte` into a new `web/components/settings/TemplatesTab.svelte` that renders `StatSheetTemplateSettings` and `EntityTemplateSettings` under clear headings; `SettingsModal.svelte` only renders `<TemplatesTab />` for that tab (net line count must go down). Update or add the `SettingsModal` test so the Templates tab still shows the stat sheet settings and now also the entity section (depends on T022)
- [x] T024 [US1] Add a `FeatureHint` for the new section and update the tab intro copy in `TemplatesTab.svelte`; register the hint following existing `FeatureHint` usage in `web/config/help-content.ts` and its test (depends on T023)

**Checkpoint**: User Story 1 is fully functional and demonstrable on its own. Built-ins and legacy files are listed and a default can be chosen.

---

## Phase 4: User Story 2 - Duplicate a built-in and edit it visually (Priority: P1)

**Goal**: Duplicate any template, edit its sections in a visual editor with live preview, and save it as a user template.

**Independent Test**: Duplicate a built-in, add, rename, remove and reorder sections, save, and confirm the saved template and the preview match the note a new entity would receive; existing entities are unchanged.

### Tests for User Story 2 (write first, confirm they fail)

- [x] T025 [P] [US2] Write failing tests `web/stores/entity-templates/entity-template-store.edit.test.ts`: `duplicate` of a built-in parses its markdown into sections and creates a user template with a new id; `update` persists and keeps the id; `remove` deletes the file and clears a chosen default for that type (falls back to the built-in); `update` and `remove` on a built-in or legacy template are rejected (negative); `update` with an invalid draft is rejected with the validation issues (negative); after `update`, `resolve` returns the new compiled markdown while a previously resolved string is untouched (copy semantics, FR-017)
- [x] T026 [P] [US2] Write failing component tests `web/components/settings/entity-templates/EntityTemplateEditor.test.ts`: add, rename, remove and reorder sections update the live preview immediately; Save is blocked with plain-language messages for empty name, zero sections and blank titles (negative); closing with unsaved changes asks to discard, and Cancel on that prompt keeps the editor open (cancellation path); a very long hint (10,000 characters) is accepted and previews; a 50-section template renders and updates within the SC-007 budget in a timing assertion with generous margin
- [x] T027 [P] [US2] Extend `EntityTemplateSettings.test.ts`: built-in rows offer only Preview, Duplicate and Set as default (no Edit, no Delete) (negative); user rows also offer Edit and Delete; Delete asks for confirmation and declining leaves the template in place (cancellation path)

### Implementation for User Story 2

- [x] T028 [US2] Add `duplicate`, `update` and `remove` to `web/stores/entity-templates/entity-template-store.svelte.ts` until T025 passes; writes go file-first, then update the in-memory list (depends on T025)
- [x] T029 [US2] Create `web/components/settings/entity-templates/EntityTemplateEditor.svelte`: name, entity type (from `categories` store), optional intro, orderable sections list with title and hint, add and remove, move up/down buttons (drag reorder is optional and may be deferred), live preview via `EntityTemplatePreview`, validation messages from `validateTemplate`, discard confirmation. Reordering must be keyboard-accessible via the up/down buttons (depends on T026, T028)
- [x] T030 [US2] Wire Duplicate, Edit and Delete into `EntityTemplateSettings.svelte` (the editor replaces the list inline inside the settings component, not `modal-ui.svelte.ts`) until T027 passes (depends on T027, T029)
- [x] T031 [US2] Add the single explicit SC-003 test, `web/stores/entity-templates/no-entity-mutation.test.ts`, that spies on the vault entity update path while editing, deleting and re-defaulting templates and asserts zero entity calls (SC-003) (depends on T028)

**Checkpoint**: User Stories 1 and 2 both work independently. The core value of the issue is delivered.

---

## Phase 5: User Story 3 - Create a template from scratch (Priority: P2)

**Goal**: Start a new template by choosing a type and name, build sections, save, and use it.

**Independent Test**: Create a template for a custom category, add sections, save, set as default, and create an entity from it.

- [x] T032 [P] [US3] Write failing tests in `web/stores/entity-templates/entity-template-store.edit.test.ts`: `create` persists a valid draft with a generated id from the injected id generator; `create` with an invalid draft is rejected (negative); two templates with the same name for one type both exist and remain distinguishable; a template for a custom category is listed under that category, and still listed under its type after that category is removed from the categories store (edge case: nothing is lost)
- [x] T033 [P] [US3] Write failing component tests in `EntityTemplateSettings.test.ts` and `EntityTemplateEditor.test.ts`: "New template" opens an empty editor requiring name and type; saving adds the row; deleting the chosen default reverts the row marker to the built-in (depends on T030)
- [x] T034 [US3] Add `create` to the store and a "New template" header action in `EntityTemplateSettings.svelte`, opening the editor in create mode with no sections prefilled beyond one empty row, until T032 and T033 pass (depends on T030, T032, T033)

**Checkpoint**: User Story 3 works independently of import/export and legacy handling.

---

## Phase 6: User Story 4 - Import and export templates (Priority: P2)

**Goal**: Export any template to a versioned file and import one, with validation and no silent overwrite.

**Independent Test**: Export a user template, import it into another vault, and confirm identical sections; import an invalid file and confirm nothing changes.

- [x] T035 [P] [US4] Write failing tests `web/stores/entity-templates/entity-template-store.package.test.ts`: `exportPackage` returns a valid package for built-in, legacy and user templates; `importPackage` adds a new user template with a new id and never overwrites an existing one; an invalid or unsupported-version file returns an error result and leaves the list and disk untouched (negative); importing a same-named template keeps both, the imported one gets a distinguishable name such as "Name (imported)"; import is refused when `canEdit` is false (negative)
- [x] T036 [P] [US4] Write failing component tests in `EntityTemplateSettings.test.ts`: Export triggers a `.json` download named from the template; Import reads a chosen file, shows a plain-language error for a corrupt file and no row is added (negative); a successful import shows the new row
- [x] T037 [US4] Add `exportPackage` and `importPackage` to the store, and Export and Import actions to `EntityTemplateSettings.svelte` using `downloadText` from `web/utils/download.ts` and the existing file-input pattern, until T035 and T036 pass (depends on T034, T035, T036)

**Checkpoint**: User Story 4 works. The Template Package is marketplace-ready (FR-025, #3548).

---

## Phase 7: User Story 5 - Existing custom template files keep working (Priority: P2)

**Goal**: Legacy `{type}.md` files behave exactly as before and appear as user templates that can be duplicated.

**Independent Test**: With a legacy `character.md` in place, create a Character and confirm the body matches the file; confirm the list shows it and Duplicate makes it editable.

- [x] T038 [P] [US5] Write failing tests in `web/stores/entity-templates/entity-template-store.legacy.test.ts`: a legacy `character.md` from `.cc/templates` and from `.codex/templates` is listed with id `legacy:character`, source `legacy`, labelled "Yours (file)"; when both a linked-folder file and a vault-directory file exist only the folder one is used (research R-013); it is used for new characters when no default is chosen; an empty legacy file resolves to a blank note (FR-016); a chosen default beats the legacy file (FR-018); Duplicate of a legacy template creates an editable user template and leaves the file on disk untouched (negative: legacy files are never rewritten or deleted); Delete and Edit are not offered for legacy rows
- [x] T039 [US5] Implement the legacy listing and duplicate path in the store and hide Edit and Delete for legacy rows in `EntityTemplateSettings.svelte`, until T038 passes (depends on T037, T038)
- [x] T040 [US5] Add a regression test in `web/services/EntityTemplateService.svelte.test.ts` proving the exact strings returned for representative legacy inputs are identical before and after this feature (SC-004): run against the pre-change fixtures already in that file, plus an empty file case (depends on T017, T039)

**Checkpoint**: User Story 5 works. No existing vault regresses.

---

## Phase 8: User Story 6 - Templates apply everywhere entities are created (Priority: P2)

**Goal**: Every creation path, and the AI engine, uses the same vault-aware resolution.

**Independent Test**: Set a custom default for Character, then create a Character from each entry point and confirm the same structure each time.

- [x] T041 [P] [US6] Write failing tests `web/components/entity-detail/RelatedEntityModal.test.ts` (extend): with a custom default in the store, creating a related entity uses it (this was the bug: the modal called `resolveTemplate(targetType)` with no vault context); with no custom default it still uses the built-in (negative)
- [x] T042 [P] [US6] Write failing tests in `web/components/VaultControls.test.ts`, `web/components/modals/MobileCreateEntitySheet.test.ts` and the CampaignGeneratorModal test file: each uses the store-backed resolution and still honours "Start from default format" unchecked as blank (FR-020) (negative)
- [x] T043 [P] [US6] Write failing test in `web/app/init/` (existing app-init test file or a new `app-init.templates.test.ts`): `bootSystem` passes a template resolver to `configureAIEngine` that returns a vault template once the store has loaded and the built-in before it has loaded
- [x] T044 [US6] Wire the callers with minimal edits (one call each, no new behaviour): `web/components/VaultControls.svelte:133`, `web/components/modals/MobileCreateEntitySheet.svelte:77`, `web/components/generators/CampaignGeneratorModal.svelte:288,295` and `web/components/entity-detail/RelatedEntityModal.svelte:187` keep calling `entityTemplateService.resolveTemplate`, which now delegates to the store; drop the now-unneeded handle argument only where it is trivially removable. Make T041 and T042 pass (depends on T017, T041, T042)
- [x] T045 [US6] In `web/app/init/app-init.ts` replace `templateResolver: resolveTemplateSync` with `(type, themeId) => entityTemplateStore.resolveSync(type, themeId)` (one line plus import) until T043 passes (depends on T015, T043)
- [ ] T046 [US6] Add an end-to-end check in `apps/web/tests/` (Playwright, follow an existing settings or entity-creation spec for fixtures): set a custom default for one type, create an entity of that type and assert the body sections; skip if no comparable fixture exists and record why in the PR (depends on T044, T045)

**Checkpoint**: All six user stories are independently functional.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T047 [P] Update `web/content/help/default-templates.md`: document the Entity templates section, duplicate and edit, defaults, import and export, and that the legacy `.cc/templates` and `.codex/templates` files still work; keep the Vault-Level Override section accurate. Update `web/config/help-content.test.ts` if the article list or hints change
- [x] T048 [P] Verify linked-folder propagation of `.codex/templates/` (research R-005): with a linked local folder, save a template and check whether `.codex/templates/{id}.json` appears next to the vault files, using `.codex/canvases/` as the reference behaviour. Record the outcome in `specs/167-entity-template-management/research.md` R-005. If it does not propagate, add one sentence to the help article (T047) and note it in the PR
- [ ] T049 [P] Add a user-facing entry to `apps/web/src/lib/content/changelog/releases.json` at release time via the `write-release-entry` skill: high-impact wording only ("Manage entity templates from Settings"), no technical detail (per AGENTS.md)
- [x] T050 Coverage: run `cd packages/entity-template-engine && bun test --coverage` and confirm at least the 70% goal (Constitution X); add tests for uncovered branches if below
- [ ] T051 Run the quickstart manual verification in `specs/167-entity-template-management/quickstart.md` steps 1–11 and note any deviation in the PR description
- [x] T052 Impacted-only validation (never repo-wide): `bun run lint:changed`, `bun run test:changed`, `cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error`, and `bun scripts/affected-workspaces.mjs`; all must pass with 0 errors
- [x] T053 Confirm the Bounded Responsibility outcome from plan.md: `SettingsModal.svelte` line count is lower than 583, and the five other touched files over 500 lines each gained only the one-line wiring (`git diff --stat`); `modal-ui.svelte.ts` is untouched
- [ ] T054 Before commit or push run `bunx fallow audit --format json --quiet --explain --gate-marker agent` and fix any `fail` verdict; before opening the PR, pass the `codex-review` specialist review (PR Quality Gate in AGENTS.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: depends on Setup; **blocks all user stories**.
- **US1 (Phase 3)** depends on Foundational only. This is the MVP.
- **US2 (Phase 4)** depends on US1 (it extends the list component and store).
- **US3 (Phase 5)** depends on US2 (reuses the editor).
- **US4 (Phase 6)** depends on US3 only for shared component edits in `EntityTemplateSettings.svelte`; the store and package logic (T035) can start after Foundational.
- **US5 (Phase 7)**: store logic depends on Foundational; UI edits depend on US4 edits to the same component.
- **US6 (Phase 8)**: depends on T015 and T017 only, so it can run in parallel with US1–US5 by a second person.
- **Polish (Phase 9)**: after the stories you intend to ship.

### Within Each Phase

- Tests are written and confirmed failing before their implementation task.
- Store additions edit one file, `entity-template-store.svelte.ts`, so its tasks (T015, T020, T028, T034, T037, T039) run in sequence.
- Edits to `EntityTemplateSettings.svelte` (T022, T030, T034, T037, T039) also run in sequence.

### Parallel Opportunities

- Phase 2 engine tests T003–T008 are all different files: run together.
- T010 and T011 in parallel; T012 and T013 in parallel after them.
- T018 and T019, T025–T027, T032 and T033, T035 and T036 test pairs run in parallel.
- T041–T043 run in parallel.
- Polish tasks T047–T049 run in parallel.

### Parallel Example: Foundational engine tests

```bash
Task: "T004 compile tests in packages/entity-template-engine/tests/compile.test.ts"
Task: "T005 parse tests in packages/entity-template-engine/tests/parse.test.ts"
Task: "T006 validate tests in packages/entity-template-engine/tests/validate.test.ts"
Task: "T007 package tests in packages/entity-template-engine/tests/package.test.ts"
Task: "T008 resolve tests in packages/entity-template-engine/tests/resolve.test.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 and 2)

1. Phase 1 and Phase 2 (engine, repository, store, facade).
2. Phase 3 (US1): browse and choose defaults. **Stop and validate**: built-ins listed, default works, existing entities unchanged.
3. Phase 4 (US2): duplicate and visual editor. This delivers the heart of issue #3445.
4. Ship or demo here if needed. US6 (AI and related-entity callers) is small and worth landing in the same PR because it fixes real gaps.

### Incremental Delivery

Then US3 (create), US4 (import/export), US5 (legacy listing), US6 (all paths), and Polish. Each story adds value without breaking the previous ones. Typed fields, per-creation template picker and the marketplace (#3548) are follow-ups and out of scope.

## Notes

- 54 tasks: Setup 2, Foundational 15, US1 7, US2 7, US3 3, US4 3, US5 3, US6 6, Polish 8.
- Existing `EntityTemplateService` tests are the regression net: they must pass unchanged throughout.
- Commit after each task or logical group, subject to the Fallow gate and the pre-commit rules in AGENTS.md.
