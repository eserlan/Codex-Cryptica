---
description: "Task list for the Biome Explorer (180-biome-explorer)"
---

# Tasks: Biome Explorer

**Input**: Design documents from `/specs/180-biome-explorer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (`biome-engine-api.md`, `ui-contract.md`), quickstart.md

**Tests**: REQUIRED for changed behaviour (Constitution II). Every story writes tests first, covering the success path and at least one failure, cancellation or negative path. Run **impacted-only** checks (AGENTS.md): `bun scripts/lint-changed.mjs`, `bun scripts/test-changed.mjs`, and `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`. Never run repo-wide suites.

**User Help (Constitution VII)**: The Help article is created in US1 and extended in US5 and US6, with a `FeatureHint` in US1.

**Organization**: Grouped by user story. Priorities: US1, US2, US4, US5 are P1; US3, US6 are P2; US7 is P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US7, mapping to spec.md

## Path Conventions

- Engine: `packages/biome-engine/src/` and `packages/biome-engine/tests/`
- Persisted shape: `packages/schema/src/`
- Web app: `apps/web/src/lib/…` and `apps/web/src/routes/(app)/biomes/`
- Help content: `apps/web/src/lib/content/help/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new package and wire it into the workspace.

- [x] T001 Create `packages/biome-engine/` (`package.json`, `tsconfig.json`, `bunfig.toml`, `src/index.ts`) by copying the layout of `packages/hex-crawl-engine/`; dependencies: `zod` and `schema` (`workspace:*`) only. No `map-engine`, `hex-crawl-engine` or generator dependency.
- [x] T002 Add `"biome-engine": "workspace:*"` to `apps/web/package.json` and run `bun install` so the workspace links.
- [x] T003 [P] Write a curation checklist at `specs/180-biome-explorer/checklists/catalogue-provenance.md` listing the 10 biomes (temperate woodland, boreal forest, grassland/steppe, hot desert, tundra, wetland, tropical rainforest, coastline, savanna, alpine/montane) with per-image fields (generated: tool, date, prompt, reviewer, review notes, alt text; licensed photo, if any: creator, source URL, licence, licence URL, alt text), the image tool's commercial-use terms and the date they were checked, and per-biome source citations. This is the content gate from quickstart §6.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Persisted shape, engine models, catalogue scaffolding and its integrity test. No user story can start before this is done.

**⚠️ CRITICAL**: Complete before any user story.

- [x] T004 [P] Write failing tests in `packages/schema/src/biome.test.ts`: an entity with a valid `biome` field parses; an entity without `biome` still parses (compatibility); malformed shapes are rejected (alteration with empty `description`, `referenceLinks` with a non-`https:` URL, more than 10 `referenceLinks`, `own` text over 4,000 characters, unknown `version`).
- [x] T005 Create `packages/schema/src/biome.ts` with `BiomeProfileSchema` per `data-model.md` (`version: 1`, `reference: ReferenceSnapshot | null`, `own`, `alterations`, `illustrationPrompt?`, `referenceLinks`) enforcing: `referenceLinks` "https only, max 10"; each `own` text field "max 4,000 characters"; `Alteration.description` required, `cause` optional. Export it from `packages/schema/src/index.ts` and add `biome: BiomeProfileSchema.optional()` to `EntitySchema` in `packages/schema/src/entity.ts` (depends on T004).
- [x] T006 [P] Write failing tests in `packages/biome-engine/tests/model.test.ts`: `Range` requires `low <= high` and a unit; `Statement` requires `basis` of `pattern | simplification | exception`; `ImageRef` is a union on `origin`: a `generated` image requires non-empty `alt`, `tool`, `prompt`, a `generatedAt` date and `kind: "illustration"`, and its `review` is optional but, when present, must have `reviewedBy`, `reviewedAt` and `notes`; a `licensed` image requires non-empty `alt`, `creator`, `sourceUrl`, `licenceUrl`, an allow-listed `licence` (`CC0-1.0`, `PD`, `CC-BY-4.0`, `CC-BY-SA-4.0`) and `kind`; for both, `url` must be an `https:` URL on the asset host and never a local path.
- [x] T007 Implement `packages/biome-engine/src/model.ts`: zod schemas and types `Range`, `Statement`, `ImageRef`, `Source`, `Conditions`, `FilterFacet`, `ReferenceBiome` (with `category: "climate-zone" | "landform-habitat"`) per `data-model.md`; re-export the profile types from `schema` (depends on T005, T006).
- [x] T008 [P] Write `packages/biome-engine/tests/catalogue-integrity.test.ts` (always-on **structural** checks) asserting the invariants from `contracts/biome-engine-api.md`: unique kebab-case ids; every `ImageRef` valid and its `url` matching `https://assets.codexcryptica.com/biomes/<biome-id>/<n>.webp`; the first image of every biome is `generated`; at least one image and one source per biome; every `sourceIds` entry resolves in `BIOME_SOURCES`; every `Statement` has a `basis`; every `Range` has `low <= high` and a unit; `high-elevation` biomes define `conditions.elevation`; no more than 12 biomes; a `review`, when present, is complete. It must pass on an empty catalogue and fail on any bad entry.
- [x] T009 Create `packages/biome-engine/src/catalogue/sources.ts` (`BIOME_SOURCES`, data only; seed with Köppen–Geiger (Beck et al. 2018), Olson et al. 2001 terrestrial ecoregions, the Whittaker diagram (cited as a simplification), FAO and IUCN habitat descriptions, Ramsar) and `packages/biome-engine/src/catalogue/index.ts` exporting `BIOME_CATALOGUE` (empty array for now) and `getBiome(id)` (depends on T007).
- [x] T010 [P] Write `packages/biome-engine/tests/dependency-direction.test.ts` that scans `packages/biome-engine/src/**` imports and fails if any import resolves to `map-engine`, `hex-crawl-engine`, `generator-engine`, Svelte or `apps/web` (R7, FR-031).
- [x] T011 Export the public API surface from `packages/biome-engine/src/index.ts` as it exists (catalogue, model types); later phases append their exports (depends on T009).

**Checkpoint**: `bun test` passes in `packages/schema` and `packages/biome-engine`. Foundation ready.

---

## Phase 3: User Story 1 - Browse and search real-world biomes (Priority: P1) 🎯 MVP

**Goal**: A user opens Biomes from the navigation, sees illustrated cards, searches and filters them, and opens a card to read climate, landscape, vegetation, wildlife, resources and hazards, with each image showing attribution, source, licence and alt text.

**Independent Test**: Open `/biomes`, search "desert", open the match, confirm picture, attribution and details; go offline and confirm text still works and images show labelled placeholders.

### Tests for User Story 1 ⚠️ (write first, ensure they fail)

- [x] T012 [P] [US1] Write `packages/biome-engine/tests/search.test.ts`: case- and diacritic-insensitive text match over name, summary and statement text; multiple filters combine with AND; empty query returns the full catalogue in order; regex characters and empty string never throw; `listFilterFacets` returns counts; a query with no matches returns an empty array.
- [x] T013 [P] [US1] Write `apps/web/src/lib/components/biomes/BiomeImage.test.ts`: a generated image renders `alt` and an "AI illustration" label with tool and date, and is never labelled a photograph (FR-008); a licensed image renders `alt`, creator, source link and licence; on image error shows a labelled placeholder containing the biome name (FR-009).
- [x] T014 [P] [US1] Write `apps/web/src/lib/components/biomes/BiomeLibrary.test.ts`: renders one card per biome; typing filters cards; filter chips narrow results; result count is announced in a polite live region; no matches shows an empty state with a working "Clear search" button.
- [x] T015 [P] [US1] Write `apps/web/src/lib/components/biomes/BiomeDetail.test.ts`: opening a biome shows climate, landscape, vegetation, wildlife niches, resources and hazards, each behind a disclosure with `aria-expanded`; `?biome=<id>` expands that biome; an unknown id shows a plain "not found" message and a link back.
- [x] T016 [P] [US1] Add a nav test case in `apps/web/src/lib/components/layout/nav-items.test.ts`: a "Biomes" item exists in the `view` group with overflow placement and href `${base}/biomes`.

### Implementation for User Story 1

- [x] T017 [US1] Implement `packages/biome-engine/src/search.ts` (`searchBiomes`, `listFilterFacets`) and export it from `src/index.ts` (depends on T012).
- [x] T018 [P] [US1] Author the catalogue data module `packages/biome-engine/src/catalogue/temperate-woodland.ts` (summary ≤ 160 chars; conditions as ranges; statements each with `basis` and `sourceIds`; first image `generated` with its deterministic R2 `url` (`https://assets.codexcryptica.com/biomes/<biome-id>/1.webp`), `tool`, `prompt`, `generatedAt` and draft `alt` text written up front (the `review` block is added later by T035c), optional licensed photo; filters), following `specs/180-biome-explorer/checklists/catalogue-provenance.md`.
- [x] T019 [P] [US1] Author `packages/biome-engine/src/catalogue/boreal-forest.ts` (same requirements as T018).
- [x] T020 [P] [US1] Author `packages/biome-engine/src/catalogue/grassland-steppe.ts` (same requirements as T018).
- [x] T021 [P] [US1] Author `packages/biome-engine/src/catalogue/hot-desert.ts` (same requirements as T018).
- [x] T022 [P] [US1] Author `packages/biome-engine/src/catalogue/tundra.ts` (same requirements as T018).
- [x] T023 [P] [US1] Author `packages/biome-engine/src/catalogue/wetland.ts` (`category: "landform-habitat"`; climate rows that do not apply are left undefined, not invented).
- [x] T024 [P] [US1] Author `packages/biome-engine/src/catalogue/tropical-rainforest.ts` (same requirements as T018).
- [x] T025 [P] [US1] Author `packages/biome-engine/src/catalogue/coastline.ts` (`category: "landform-habitat"`; same rule as T023).
- [x] T026 [P] [US1] Author `packages/biome-engine/src/catalogue/savanna.ts` (same requirements as T018).
- [x] T027 [P] [US1] Author `packages/biome-engine/src/catalogue/alpine-montane.ts` (must define `conditions.elevation` and the `high-elevation` filter).
- [x] T028 [US1] Register all ten modules in `packages/biome-engine/src/catalogue/index.ts` in a stable order and confirm `catalogue-integrity.test.ts` (T008) passes against real data (depends on T018–T027).
- [x] T029 [P] [US1] Implement `apps/web/src/lib/components/biomes/BiomeImage.svelte` (image with `loading="lazy"`, "AI illustration" label with tool and date for generated images, credit and licence link for licensed ones, error fallback) using Iconify classes and Tailwind semantic tokens (depends on T013).
- [x] T030 [P] [US1] Implement `apps/web/src/lib/components/biomes/BiomeCard.svelte` (concise illustrated card as a real link/button with visible focus; image, name, one-line summary).
- [x] T031 [US1] Implement `apps/web/src/lib/components/biomes/BiomeLibrary.svelte` (search input, "Filters" chips, card grid as a list, live-region result count, empty state) using `searchBiomes` (depends on T014, T017, T030).
- [x] T032 [US1] Implement `apps/web/src/lib/components/biomes/BiomeDetail.svelte` (large `BiomeImage`s, summary, disclosure sections for climate, landscape, vegetation, wildlife, resources, hazards, and `related` links) (depends on T015, T029).
- [x] T033 [US1] Create the route `apps/web/src/routes/(app)/biomes/+page.ts` and `+page.svelte` (workspace shell with Library view and Details; reads `?biome=<id>`; works with no vault open) (depends on T031, T032).
- [x] T034 [US1] Add the "Biomes" entry to `apps/web/src/lib/components/layout/nav-items.ts` (`id: "biomes"`, `icon-[lucide--mountain-snow]`, `group: "view"`, `placement: "overflow"`, href `${base}/biomes`) (depends on T016).
- [x] T035a [US1] Add `packages/biome-engine/src/catalogue/images.ts` (data only) exporting `BIOME_ILLUSTRATION_STYLE` (one shared style phrase for realistic landscape illustrations: consistent palette, composition and lighting; no text, logos or people) and a `buildBiomeImagePrompt(biome)` helper that composes a prompt from the biome's own vegetation, landscape and light/weather statements, naming the typical plants, animals and landforms the text already gives. The helper must NOT use the "fantasy, illustration of" prefix (that is only for users' own fictional profiles, T091). Add a test `packages/biome-engine/tests/image-prompts.test.ts`: the prompt includes the shared style, names at least one plant and one landform from the biome, contains no "fantasy" prefix, and is deterministic.
- [ ] T035b [US1] Generate one main illustration per biome (ten) with the app's existing image-generation path (the Oracle image / art-direction pipeline), using the prompts from T035a, as a team task outside the app; record the model name as `tool` in each module. Check the tool's terms allow commercial use of its output and record the tool and terms date in `checklists/catalogue-provenance.md`. Do not commit the image files; keep them in a temporary directory outside the repo.
- [ ] T035c [US1] Human review of each generated image against its biome's statements: right plants, right animals, plausible landforms and light, no text, logos or stray people, consistent style with the other nine. Regenerate any failure. Finalise the `alt` text by hand and add the `review` (`reviewedBy`, `reviewedAt`, `notes`) in each `catalogue/<biome>.ts` module and in the provenance checklist.
- [ ] T035d [US1] Optionally add a licensed photograph as a second image for any biome where a faithful public-domain or CC-licensed one exists (creator, source URL, licence, licence URL and alt text recorded; photographs only, never a mislabelled illustration).
- [ ] T035e [US1] Upload the reviewed images (and any licensed photos) to R2 under `biomes/<biome-id>/` in the `codex-cryptica-statics` bucket, set the final `url` values in the T018–T027 modules, and **delete the temporary local image files** (AGENTS.md: no images in git). Confirm `git status` shows no image files and that `catalogue-integrity.test.ts` passes. Confirm each uploaded URL is reachable (for example a `curl -I` loop over the ten `biomes/<id>/1.webp` URLs).
- [x] T035f [US1] Write `packages/biome-engine/tests/catalogue-release.test.ts` (the release-gate tier): every `generated` image has a complete `review` and none is a placeholder; every biome has a `generated` first image. It is expected to fail until T035c is done, and is run in T101, not in the normal impacted test run (mark it with a clear `describe` name and a comment explaining why; exclude it from the default run only if the repo's test config supports that cleanly, otherwise keep it passing by gating on an env var `BIOME_RELEASE_GATE=1`).
- [x] T036 [P] [US1] Create the Help article `apps/web/src/lib/content/help/biome-explorer.md` (what you can do, where to find it, that images are credited and text works offline, and that it is not a climate simulator) with front matter matching `entity-reports.md`. The article must say where to find it (the Biomes entry in the navigation drawer) and that image accuracy can occasionally be off because most pictures are AI illustrations checked by a person.
- [x] T037 [US1] Register the help in `apps/web/src/lib/config/help-content.ts` (`FEATURE_HELP_ARTICLES.BIOME_EXPLORER: "biome-explorer"`, a `biome-explorer` `FeatureHint`) and add `"biome-explorer"` to the "Get unstuck" `hintIds` in `apps/web/src/lib/config/feature-groups.ts` (registry rows only; Principle XIV rule 4) (depends on T036).

**Checkpoint**: US1 works alone: browse, search, filter and read attributed biomes, online and offline.

---

## Phase 4: User Story 2 - Understand why: plausibility and sources (Priority: P1)

**Goal**: Each biome's conditions are shown as ranges, every statement is labelled as a common pattern, simplification or exception, sources are listed, and nothing looks like an authoritative classification or climate picker.

**Independent Test**: Open a biome and confirm that ranges, labelled statements and cited sources are visible, and that no classification table or climate picker exists.

### Tests for User Story 2 ⚠️

- [x] T038 [P] [US2] Write `apps/web/src/lib/components/biomes/BiomeStatement.test.ts`: each statement renders a text badge ("Common pattern", "Simplification", "Exception") that does not rely on colour alone and is exposed to screen readers; the statement's sources render as links to the sources list.
- [x] T039 [P] [US2] Extend `apps/web/src/lib/components/biomes/BiomeDetail.test.ts`: conditions render as ranges with units and notes (never a single bare number); a condition with no data reads "Not a fixed value"; the Sources section lists every cited source; the page contains no climate-picker control and no classification table.

### Implementation for User Story 2

- [x] T040 [P] [US2] Implement `apps/web/src/lib/components/biomes/BiomeStatement.svelte` (text with basis badge and source markers) (depends on T038).
- [x] T041 [US2] Update `apps/web/src/lib/components/biomes/BiomeDetail.svelte` to use `BiomeStatement` for all statement lists, render `conditions` with ranges (temperature, seasonality, precipitation, elevation, water availability, notes), add a "Why it looks like this" conditions section and a Sources section resolved from `BIOME_SOURCES` (depends on T032, T039, T040).
- [x] T042 [US2] Review every `catalogue/*.ts` module against FR-010–FR-013: remove any single-point value, make sure Whittaker/Köppen-style generalisations carry `basis: "simplification"`, and note known exceptions with `basis: "exception"`. Re-run `catalogue-integrity.test.ts`.

**Checkpoint**: US1 and US2 work together as a believable reference library.

---

## Phase 5: User Story 4 - Create a custom biome from a reference (Priority: P1)

**Goal**: From a reference (or blank) the user makes a draft, edits climate, terrain, vegetation, water and pressures, sees departures from the reference, and is stopped from saving without a name.

**Independent Test**: Start from Tundra, change vegetation and water, give it a name, and confirm the draft shows reference values and the user's changes side by side.

### Tests for User Story 4 ⚠️

- [x] T043 [P] [US4] Write `packages/biome-engine/tests/profile.test.ts`: `createProfileFromReference` snapshots the reference (including resolved sources) and leaves every `own` field empty; `createBlankProfile` has `reference: null`; `setOwnField` is immutable and never touches `reference`; `computeDepartures` marks only edited aspects as changed; fields over "max 4,000 characters" are rejected.
- [x] T044 [P] [US4] Write `packages/biome-engine/tests/validate.test.ts`: title is required, trimmed, "1–120 characters"; an empty or whitespace-only title returns an error; a title over 120 characters returns an error; a valid profile returns `{ ok: true, warnings: [] }`.
- [x] T045 [P] [US4] Write `apps/web/src/lib/stores/biome-explorer.draft.test.ts` (injected fakes): "Make my own" creates a draft with the reference retained; editing marks it `dirty`; `discardDraft()` on a dirty draft requires confirmation; starting from blank works; saving with no name blocks and shows the error (nothing written).
- [x] T046 [P] [US4] Write `apps/web/src/lib/components/biomes/BiomeProfileEditor.test.ts`: reference values appear read-only beside "My version" fields; edited fields show a "Changed from reference" cue in text; Save with an empty title shows an error and calls nothing; an unsaved-changes confirmation appears on discard. Also: a very long value in any "My version" field wraps inside the layout with no horizontal overflow.

### Implementation for User Story 4

- [x] T047 [US4] Implement `packages/biome-engine/src/profile.ts` (`createProfileFromReference`, `createBlankProfile`, `setOwnField`, `computeDepartures`) and export it (depends on T043).
- [x] T048 [US4] Implement `packages/biome-engine/src/validate.ts` (`validateForSave` with the title and length rules; alteration rules arrive in US6) and export it (depends on T044).
- [x] T049 [US4] Create `apps/web/src/lib/stores/biome-explorer.svelte.ts`: `BiomeExplorerStore` class with constructor injection (`vault`, `clipboard`, `storage`, `suggest?`, `isAiAllowed`, `now`, `newId`) per `contracts/ui-contract.md`, exporting the class and a default singleton; implement query/filter state, `view`, draft state (`startFromReference`, `startBlank`, `editOwn`, `discardDraft`, `dirty`) and the `last view` preference in `localStorage` inside try/catch (key `codex-biome-explorer-view`) (depends on T045, T047, T048).
- [x] T050 [US4] Implement `apps/web/src/lib/components/biomes/BiomeProfileEditor.svelte` (reference column, "My version" fields for climate, terrain, vegetation, water, pressures and notes, title field, Save/Discard buttons, departure cues in text) (depends on T046, T049).
- [x] T051 [US4] Wire "Make my own" and "Start from blank" into `BiomeDetail.svelte`, `BiomeLibrary.svelte` and the route shell `+page.svelte`, and add a `beforeNavigate` guard for unsaved drafts (depends on T049, T050).

**Checkpoint**: A draft can be created, edited and discarded. It cannot yet be saved.

---

## Phase 6: User Story 5 - Save, reopen, edit and export a biome profile (Priority: P1)

**Goal**: Save the profile to the vault as a structured Note, reopen and edit it, copy or export it as Markdown with reference and own content kept apart, and base a new biome on it.

**Independent Test**: Create and save a biome, reload, reopen it, edit a field, copy it as Markdown and confirm both the reference and the user's changes appear under separate headings.

### Tests for User Story 5 ⚠️

- [x] T052 [P] [US5] Write `packages/biome-engine/tests/markdown.test.ts`: headings appear in order `# {title}`, `## Reference`, `## My changes`, `## Sources` and only when non-empty; reference-derived text never appears under "My changes" and vice versa; a blank-start profile omits `Reference`; output is deterministic and contains no HTML. (Alterations and prompt sections are added in US6 and US7.)
- [x] T053 [P] [US5] Write `apps/web/src/lib/services/biome/biome-vault-gateway.test.ts` with a fake vault: `create` makes a Note with `kind: "biome"`, labels `["biome", <reference name>]`, `biome` set and `content` set to the rendered Markdown; `update` re-renders `content`; `load` returns `null` for a missing or schema-invalid `biome` field; `list` returns only `kind: "biome"` entities; `remove` deletes; duplicate titles do not overwrite each other. Also: a profile whose `reference.biomeId` is no longer in `BIOME_CATALOGUE` still loads, renders and exports from its own snapshot (FR-022); a newly created biome entity gets the default non-published visibility (FR-032).
- [x] T054 [P] [US5] Write `apps/web/src/lib/stores/biome-explorer.save.test.ts`: `save()` creates then updates (not duplicates); a vault write failure sets `saveState = "failed"`, **keeps the draft** and leaves `exportDraftMarkdown()` working (spec story 5, scenario 6); `duplicateProfile` makes a new draft and leaves the original untouched; delete requires confirmation; copy uses `ClipboardService` and falls back to returning the text when the clipboard is unavailable.
- [x] T055 [P] [US5] Write `apps/web/src/lib/components/biomes/BiomeProfileList.test.ts`: lists saved profiles with the reference name and saved date to tell same-named profiles apart; open, make a copy, export and delete (with a confirmation that traps focus and restores it); empty state; a profile whose `biome` field can't be read shows a plain explanation and a link to the plain Note.
- [x] T056 [P] [US5] Add tests to `packages/vault-engine/src/services/GuestExporter.test.ts`: a visible `kind: "biome"` entity is exported with its `biome` field **except `biome.referenceLinks`, which is removed** (FR-032); a hidden or draft biome entity is excluded; an entity without `biome` is unchanged.
- [x] T057 [P] [US5] Write `apps/web/src/routes/(app)/biomes/page.route.test.ts`: `?profile=<id>` opens the editor for a valid profile; a missing or non-biome id shows a "not found" message with a link back; the Library and Compare views still load with no vault open, while Save and My biomes explain that an open vault is needed. Also: navigating away from the route with a dirty draft shows the unsaved-changes confirmation, and cancelling it keeps the draft (FR-025).
- [x] T057a [P] [US5] Write `apps/web/src/lib/stores/biome-explorer.roundtrip.test.ts` with the fake gateway: create → save → load → edit → save → render Markdown, repeated 20 times in one test, asserting no field is lost or altered and the `reference` snapshot is byte-identical every time (SC-005).

### Implementation for User Story 5

- [x] T058 [US5] Implement `packages/biome-engine/src/markdown.ts` (`renderProfileMarkdown`, `renderReferenceMarkdown`) and export it (depends on T052).
- [x] T058a [US5] Update `packages/vault-engine/src/services/GuestExporter.ts` so every guest and published projection removes `biome.referenceLinks`, following how it already sanitises `statSheet` (small, targeted change; do not restructure the file) (depends on T056).
- [x] T059 [US5] Implement `apps/web/src/lib/services/biome/biome-vault-gateway.ts` (the `BiomeVaultGateway` interface and a web implementation using the existing public `vault.createEntity`/`updateEntity` and entity removal; parse with `BiomeProfileSchema`) per `contracts/ui-contract.md`. Do **not** modify `apps/web/src/lib/stores/vault.svelte.ts` (depends on T053, T058).
- [x] T060 [US5] Extend `apps/web/src/lib/stores/biome-explorer.svelte.ts` with `save`, `saveState`, `profiles`, `loadProfile`, `duplicateProfile`, `deleteProfile`, `copyMarkdown`, `downloadMarkdown` (Blob download) and `exportDraftMarkdown` (depends on T054, T059).
- [x] T061 [US5] Implement `apps/web/src/lib/components/biomes/BiomeProfileList.svelte` (My biomes) and add Copy/Download Markdown and "Make a copy" actions to the editor (depends on T055, T060).
- [x] T062 [US5] Update `+page.svelte` to add the My biomes view, the `?profile=<entityId>` deep link, polite live-region announcements for save success and failure, and the "needs an open vault" explanation (depends on T057, T061).
- [x] T063 [US5] Add a Library-side "Copy as Markdown" action on `BiomeDetail.svelte` using `renderReferenceMarkdown` (read-only; depends on T058).
- [x] T064 [US5] Extend `apps/web/src/lib/content/help/biome-explorer.md` with making your own, saving, reopening, copying/exporting and the note that profiles are edited in the Explorer (editing the Note body by hand is overwritten on the next save).
- [x] T065 [US5] Add a Playwright path `apps/web/tests/biome-explorer.spec.ts`: browse → make my own from Tundra → set a name → save → reload → reopen from My biomes → edit → copy Markdown → assert headings. Include a variant where the vault write is forced to fail and the draft survives.

**Checkpoint**: US1, US2, US4 and US5 together deliver the core MVP: browse, adapt, save, reuse, export.

---

## Phase 7: User Story 3 - Compare biomes side by side (Priority: P2)

**Goal**: Select two or three biomes and see aligned attributes; stays readable on phones.

**Independent Test**: Select two biomes, open Compare, confirm every attribute row shows both values in the same order, and that removing one prompts to add another.

### Tests for User Story 3 ⚠️

- [x] T066 [P] [US3] Write `packages/biome-engine/tests/compare.test.ts`: 2–3 ids give a matrix with rows in a fixed order (temperature, seasonality, precipitation, elevation, water availability, landscape, vegetation, wildlife, resources, hazards); fewer than 2 returns `{ ok: false, reason: "needs-two" }`; more than 3 returns `{ ok: false, reason: "too-many" }`; unknown ids are skipped and listed in `missing`; a missing value yields `{ kind: "not-applicable" }`.
- [x] T067 [P] [US3] Write `apps/web/src/lib/components/biomes/BiomeCompare.test.ts`: wide layout renders a `<table>` with column and row headers; narrow layout stacks per attribute with no horizontal overflow; removing a biome updates the view; one biome left shows a prompt to add another; "Doesn't apply" is shown instead of blanks.
- [x] T068 [P] [US3] Add compare-selection cases to `apps/web/src/lib/stores/biome-explorer.draft.test.ts`: add/remove/limit to three, selection survives switching views.

### Implementation for User Story 3

- [x] T069 [US3] Implement `packages/biome-engine/src/compare.ts` (`buildComparison`) and export it (depends on T066).
- [x] T070 [US3] Add compare state (`compareIds`, `toggleCompare`, `clearCompare`) to `apps/web/src/lib/stores/biome-explorer.svelte.ts` (depends on T068, T069).
- [x] T071 [US3] Implement `apps/web/src/lib/components/biomes/BiomeCompare.svelte` (semantic table on wide screens, stacked on narrow, using `BiomeStatement` for statements) (depends on T067, T070).
- [x] T072 [US3] Add "Add to compare" buttons (with pressed state and accessible names) to `BiomeCard.svelte` and `BiomeDetail.svelte`, and the Compare view and tray to `+page.svelte` (depends on T071).
- [x] T073 [US3] Extend `apps/web/src/lib/content/help/biome-explorer.md` with comparing biomes.

**Checkpoint**: Compare works independently of saving.

---

## Phase 8: User Story 6 - Fictional departures with explicit causes (Priority: P2)

**Goal**: Mark deliberate fantasy or science-fiction changes with a cause-and-effect note; they stay apart from real-world conditions in the editor, saved profile and Markdown; an optional AI action can suggest effects.

**Independent Test**: Add an alteration, confirm a missing cause gives a reminder but still saves, and confirm it appears in its own section in the saved profile and Markdown.

### Tests for User Story 6 ⚠️

- [x] T074 [P] [US6] Extend `packages/biome-engine/tests/profile.test.ts` with `addAlteration`, `updateAlteration`, `removeAlteration`: immutable; an alteration with an empty `description` is rejected; aspects are limited to `climate | terrain | vegetation | water | pressures | other`.
- [x] T075 [P] [US6] Extend `packages/biome-engine/tests/validate.test.ts`: an alteration with an empty `cause` returns `ok: true` with a `alteration-missing-cause` warning carrying the alteration id (never an error); an empty `description` is an error.
- [x] T076 [P] [US6] Extend `packages/biome-engine/tests/markdown.test.ts`: alterations render under their own `## Fictional alterations` heading with description, cause and effects, and never under `Reference` or `My changes`.
- [x] T077 [P] [US6] Write `packages/biome-engine/tests/suggest.test.ts` with a fake `SuggestRunner`: returns at most 3 validated suggestions; invalid JSON returns `invalid-response`; a runner error returns `runner-error`; an aborted signal returns `cancelled`; AI disallowed returns `disabled`; the engine never mutates the profile.
- [x] T078 [P] [US6] Write `apps/web/src/lib/components/biomes/BiomeAlterationList.test.ts`: adding an alteration flags it "Fictional" in text and asks for a cause; saving with an empty cause shows a reminder and still saves; "Suggest effects" is hidden or disabled with a plain explanation when AI is off; suggestions appear with Add and Dismiss and nothing changes until Add is pressed; the first-use AI notice shows once and is remembered.

### Implementation for User Story 6

- [x] T079 [US6] Add `addAlteration`, `updateAlteration`, `removeAlteration` to `packages/biome-engine/src/profile.ts` (depends on T074).
- [x] T080 [US6] Extend `packages/biome-engine/src/validate.ts` with the alteration rules and the non-blocking `alteration-missing-cause` warning (depends on T075).
- [x] T081 [US6] Extend `packages/biome-engine/src/markdown.ts` with the `## Fictional alterations` section (depends on T076).
- [x] T082 [US6] Implement `packages/biome-engine/src/suggest.ts` (`suggestEffects` with an injected `SuggestRunner`, zod-validated, JSON object extraction, max 3 suggestions) and export it (depends on T077).
- [x] T083 [P] [US6] Implement `apps/web/src/lib/services/biome/biome-suggest-runner.ts` adapting `aiClientManager` to `SuggestRunner`, and gate availability with the existing AI-disabled policy (`discoveryPolicyStore`); no key or AI disabled means the action is unavailable, not an error.
- [x] T084 [P] [US6] Add `BIOME_AI_NOTICE: "biome-ai-notice-seen"` to `HINT_KEYS` in `apps/web/src/lib/config/help-content.ts` (registry row only).
- [x] T085 [US6] Add alteration and suggestion state to `apps/web/src/lib/stores/biome-explorer.svelte.ts` (`addAlteration`, `acceptSuggestion` sets `aiAssisted`, `requestSuggestions` with cancellation, notice-seen read and write inside try/catch) and show save warnings next to the affected alteration (depends on T079, T080, T082, T083, T084).
- [x] T086 [US6] Implement `apps/web/src/lib/components/biomes/BiomeAlterationList.svelte` and mount it in `BiomeProfileEditor.svelte`; AI suggestions are announced in a polite live region (depends on T078, T085).
- [x] T087 [US6] Extend `apps/web/src/lib/content/help/biome-explorer.md` with fictional changes, cause-and-effect notes and the optional AI suggestions (what is sent, that nothing is applied until you press Add, and that everything works with AI off).

**Checkpoint**: Fictional changes are first-class and never blend into the real-world data.

---

## Phase 9: User Story 7 - Illustration prompt and reference image (Priority: P3)

**Goal**: Copy a ready-made illustration prompt that starts with "fantasy, illustration of", and attach an image or reference links to a profile.

**Independent Test**: Open a saved profile, copy the prompt and confirm its prefix and content; attach an image and a link and confirm they show on the profile.

### Tests for User Story 7 ⚠️

- [x] T088 [P] [US7] Write `packages/biome-engine/tests/prompt.test.ts`: output always begins with the exact text `fantasy, illustration of`; includes biome name, landscape, vegetation and each fictional alteration; is deterministic for the same input; is trimmed at a clause boundary to `maxLength` (default 600); a blank profile still yields a valid prompt starting with the prefix.
- [x] T089 [P] [US7] Extend `packages/biome-engine/tests/profile.test.ts` with `setReferenceLinks`: `https:` URLs only, "max 10"; non-https URLs are returned in `rejected` and not stored.
- [x] T090 [P] [US7] Write `apps/web/src/lib/components/biomes/BiomeProfileEditor.attachments.test.ts`: copying the prompt writes to the clipboard; when the clipboard is unavailable the prompt is shown selectable; adding a valid link shows it; an `http:` or malformed link shows a plain error; attaching an image shows it distinct from library images; an unsupported or oversize image shows a plain error and leaves the profile unchanged.

### Implementation for User Story 7

- [x] T091 [US7] Implement `packages/biome-engine/src/prompt.ts` (`buildIllustrationPrompt`) and export it (depends on T088).
- [x] T092 [US7] Add `setReferenceLinks` to `packages/biome-engine/src/profile.ts` and add the optional `## Illustration prompt` section to `markdown.ts` (depends on T089, T091).
- [x] T093 [US7] Read how `apps/web/src/lib/components/entity-detail/DetailImage.svelte` and `apps/web/src/lib/utils/image-processing.ts` attach an image to an entity, then expose the same path to the Explorer through the vault gateway (`biome-vault-gateway.ts`), without duplicating the upload, thumbnail or WebP logic (depends on T059).
- [x] T094 [US7] Add a prompt panel (copy, selectable fallback), an image attachment control and a reference-links list to `BiomeProfileEditor.svelte`; library images are never copied into the vault (depends on T090, T091, T092, T093).
- [x] T095 [US7] Extend `apps/web/src/lib/content/help/biome-explorer.md` with the illustration prompt and attachments (image generation is not built in).

**Checkpoint**: All seven stories are complete.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, offline and AI-off verification, boundaries and release gates.

- [x] T096 [P] Add an accessibility test `apps/web/src/lib/components/biomes/biomes-a11y.test.ts` (axe or the project's existing a11y approach): Library, Details, Compare, Editor and dialogs have no violations; keyboard-only operation of browse → compare → edit → save; focus is trapped and restored in dialogs (SC-006).
- [x] T097 [P] Extend `apps/web/tests/biome-explorer.spec.ts` with a phone-width check (360 px, no horizontal page scroll) and an offline plus AI-disabled variant (text works, image placeholders show, no AI action is offered) (SC-006, SC-007).
- [x] T098 [P] Confirm boundaries: `git diff --stat` shows no changes under `packages/hex-crawl-engine`, `packages/map-engine`, map stores or generators; `apps/web/src/lib/stores/vault.svelte.ts` and `EntityDetailPanel.svelte` are untouched; the impacted map, hex-crawl and generator tests pass unchanged (FR-031, SC-008).
- [x] T099 [P] Confirm there is no tracking: search the new files for analytics or event-capture calls and ensure none exist inside the Explorer (research R16).
- [x] T100 Run coverage for `packages/biome-engine` (`bun run test:coverage`) and confirm ≥ 70% line coverage; check the new store has ≥ 50% (Constitution X).
- [ ] T101 Run `BIOME_RELEASE_GATE=1 bun test packages/biome-engine/tests/catalogue-release.test.ts`, then run the content gate in `specs/180-biome-explorer/quickstart.md` §6 and tick every item in `checklists/catalogue-provenance.md` (every generated image reviewed and labelled, tool terms confirmed, any photo licences checked, images on R2, facts cited, no image files in git).
- [ ] T102 Run the `quickstart.md` manual walkthrough (§3–§5) and record any deviations. Also time two steps: finding and opening a biome that matches a stated quality should take under 30 seconds (SC-001), and going from opening the Explorer to a saved custom biome under 5 minutes (SC-002). SC-009 (the user study) is done outside the product and is not instrumented.
- [x] T103 Run the PR quality gate from AGENTS.md: `bun scripts/lint-changed.mjs`, `bun scripts/test-changed.mjs`, `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web` (and in each affected workspace via `bun scripts/affected-workspaces.mjs`), then `bunx fallow audit --format json --quiet --explain --gate-marker agent` before any commit or push, then the `codex-review` skill. `bun scripts/discovery-audit.mjs` is not needed because no public discovery page is added.
- [ ] T104 If this ships in a release, add a user-facing highlight to `apps/web/src/lib/content/changelog/releases.json` via the `write-release-entry` skill (user-facing wording only; no refactor notes).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: needs Setup; **blocks all stories**.
- **US1 (Phase 3)**: needs Foundational.
- **US2 (Phase 4)**: needs US1 (it enhances `BiomeDetail` and uses the catalogue).
- **US4 (Phase 5)**: needs US1 (cards and details to start from) and Foundational.
- **US5 (Phase 6)**: needs US4.
- **US3 (Phase 7)**: needs US1 and the store from US4 (T049); otherwise independent of saving.
- **US6 (Phase 8)**: needs US4 and US5 (editor, markdown, validate, store).
- **US7 (Phase 9)**: needs US5 (gateway, editor, markdown) and US6's `profile.ts` edits (same file; do sequentially).
- **Polish (Phase 10)**: needs all stories you ship.

### Story Dependency Graph

```text
Foundational ─▶ US1 ─▶ US2
                 │
                 ├────▶ US4 ─▶ US5 ─▶ US6 ─▶ US7
                 │       │
                 └───────┴──▶ US3 (after T049)
```

### Within Each Story

- Tests are written first and must fail before the implementation.
- Engine modules before store, store before components, components before route wiring.
- Tasks that edit the same file are not marked [P]: `profile.ts` (T047, T079, T092), `validate.ts` (T048, T080), `markdown.ts` (T058, T081, T092), `biome-explorer.svelte.ts` (T049, T060, T070, T085), `BiomeProfileEditor.svelte` (T050, T086, T094), `BiomeDetail.svelte` (T032, T041, T063, T072), `+page.svelte` (T033, T051, T062, T072), `biome-explorer.md` (T036, T064, T073, T087, T095).

### Parallel Opportunities

- Phase 3: the ten catalogue modules T018–T027 can be authored in parallel (one person or agent per biome), together with the test tasks T012–T016.
- After US1: US3 (T066–T068) and US4 (T043–T046) tests can be written in parallel.
- Within each story, all `[P]` test tasks can run together.

## Parallel Example: User Story 1

```bash
# Tests together:
Task: "T012 search.test.ts"           Task: "T013 BiomeImage.test.ts"
Task: "T014 BiomeLibrary.test.ts"     Task: "T015 BiomeDetail.test.ts"
Task: "T016 nav-items.test.ts case"

# Catalogue content together (one biome each):
Task: "T018 temperate-woodland.ts"    Task: "T019 boreal-forest.ts"
Task: "T020 grassland-steppe.ts"      Task: "T021 hot-desert.ts"
Task: "T022 tundra.ts"                Task: "T023 wetland.ts"
Task: "T024 tropical-rainforest.ts"   Task: "T025 coastline.ts"
Task: "T026 savanna.ts"               Task: "T027 alpine-montane.ts"
```

## Implementation Strategy

### MVP First

1. Phase 1 → Phase 2 (foundation).
2. Phase 3 (US1) and Phase 4 (US2) deliver the attributed, believable reference library, which is useful even if nothing else ships.
3. Phase 5 and Phase 6 (US4, US5) complete the P1 scope: make, save, reuse and export. This is the **minimum shippable feature** against the issue's acceptance criteria.
4. **Stop and validate** with quickstart §3–§4 before continuing.

### Incremental Delivery

1. US1 + US2 → demo the library.
2. US4 + US5 → custom biomes persisted in the vault (P1 complete).
3. US3 → comparison.
4. US6 → fictional alterations and the optional AI action. If a strictly AI-free first release is preferred, skip T077, T082–T084 and the suggestion parts of T078, T085–T087; nothing else depends on them.
5. US7 → prompt and attachments.

### Content Risk

T018–T027 (facts and citations) and T035a–T035e (AI illustration generation, review and upload) are content tasks and the longest-lead items. Generation is quick, but review and regeneration is where the time goes, so the prompts (T035a) can be started alongside Phase 2 and the biome text. Photographs (T035d) are optional and never block release.

## Notes

- [P] tasks touch different files and have no unfinished dependency.
- Each story is independently testable at its checkpoint.
- Commit per task or logical group, and run the Fallow gate before any commit or push (AGENTS.md).
- Never commit image assets; they belong in R2 only.
