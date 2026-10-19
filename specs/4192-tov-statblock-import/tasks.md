---
description: "Task list for importing a ToV stat block from pasted text"
---

# Tasks: Import a Tales of the Valiant Stat Block from Pasted Text

**Input**: Design documents from `specs/4192-tov-statblock-import/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Required (Constitution II). Every behaviour task is preceded by a failing test covering the success path and at least one negative path. No live AI in tests: the AI path is tested against recorded responses in `__fixtures__/`.

**Organization**: Grouped by user story (spec.md) so each story ships and is tested on its own.

**Paths**: `ENGINE` = `packages/stat-sheet-engine/src/stat-block-reader/`; `WEB` = `apps/web/src/lib/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: US1–US5 from spec.md

---

## Phase 1: Setup

**Purpose**: Wire the new engine folder and dependency.

- [ ] T001 Add `"dice-engine": "workspace:*"` to `dependencies` in `packages/stat-sheet-engine/package.json` and run `bun install`
- [ ] T002 Create `packages/stat-sheet-engine/src/stat-block-reader/index.ts` (empty barrel) and re-export it from `packages/stat-sheet-engine/src/index.ts`
- [ ] T003 [P] First check how many creatures the open BFRD (CC BY 4.0) release includes. Then create reference fixtures in `packages/stat-sheet-engine/src/stat-block-reader/__fixtures__/stat-blocks.ts`: **at least 10 positive ToV stat blocks** (SC-002) spread across clean text, PDF-damaged text (ligatures, split dice like `2d6 +\n2`) and Foundry Black Flag actor JSON, with at least 2 quick NPCs and 2 legendary creatures; plus 1 5e creature and 3 negatives (lore paragraph with no stat block, two creatures in one paste, a player character sheet). Each with its expected `values`. If the open BFRD doesn't have enough creatures, write the rest for this repo. Any accuracy run on GMs' own copies of commercial stat blocks lives in a gitignored `__fixtures__/local/` folder, never committed. **Content must be open BFRD material or written for this repo, never copied from commercial books (FR-024).** Base the creature on `TOV_CAVE_GOBLIN_FIXTURE` in `packages/stat-sheet-engine/src/rules-sources/fixtures/tov-creature.fixture.ts`
- [ ] T004 [P] Create recorded AI responses in `packages/stat-sheet-engine/src/stat-block-reader/__fixtures__/ai-responses.ts`, one per fixture in T003, in the shape of [contracts/ai-response.md](./contracts/ai-response.md). Include one with trailing garbage after the JSON, one with an invented AC not in the source, and one with a malformed damage formula

---

## Phase 2: Foundational (blocks every story)

**Purpose**: The read result model, no-default schema, local checks and conversion to ToV data. Every reader and the review UI depend on these.

### Tests first

- [ ] T005 [P] Write failing tests in `ENGINE/read-result-schema.test.ts`: a response missing `hp`, `languages` and `abilityScores.cha` parses with those keys **absent** (not 22 / "—" / 10, research R1); unknown text keys become `leftovers`; `outcome` other than `"ok"` parses with no values; a non-object input fails
- [ ] T006 [P] Write failing tests in `ENGINE/source.test.ts`: `prepareStatBlockSource` strips `_stats`, `ownership`, `prototypeToken`, `img` and `effects[].icon` from Foundry JSON and leaves plain text unchanged; `assertSourceLength` accepts exactly 12,000 chars and throws `StatBlockSourceTooLongError` at 12,001; empty or whitespace-only input throws
- [ ] T007 [P] Write failing tests in `ENGINE/local-checks.test.ts`: a damage formula `DiceParser` rejects gets a `check`/`malformed` note; in `copy` mode an `ac` whose digits are not in `source` gets `check`/`not-in-source`, and one whose digits are present gets no note; in `copy` mode an invented `languages: "Draconic"` and an invented trait name get `check`/`not-in-source`, while `"Common, Goblin"` matched against `COMMON,  goblin` and a trait name containing a `ﬁ` ligature in the source get no note (normalisation, research R2.4); long trait descriptions are never checked; ability score 31 and Luck 6 get `check`/`out-of-range`; in `convert-5e` mode a `doom` absent from the source with a `converted` note gets no extra note, but an `ac` absent from the source with no `converted` note gets `check`/`unmarked-change` (R2.5); checks only add notes, never remove the model's notes
- [ ] T008 [P] Write failing tests in `ENGINE/derive.test.ts`: CR `"5"` with no `proficiencyBonus` gives PB 3 with a `derived`/`from-cr` note; CR `"1/4"` gives PB 2; a stated PB is kept unchanged with no note; no CR leaves PB absent
- [ ] T009 [P] Write failing tests in `ENGINE/to-tov-data.test.ts`: a creature read result with `ac`, `hp` and `cr` converts to `TovCreatureData` that `mapTovMechanicsToStatSheet` turns into a `builtin-tov-monster` sheet; it throws when any of `ac`, `hp`, `cr` is missing (callers must check `canSaveReadResult` first); missing optional arrays become `[]`, never invented entries

### Implementation

- [ ] T010 Define `ImportRequest`, `ReadResult`, `CreatureValues`, `NpcValues`, `FieldNote`, `MergePlan` and the error classes in `ENGINE/types.ts`, exactly as in [data-model.md](./data-model.md): `mode` is `"copy" | "convert-5e"`, default `"copy"`; `FieldNote.state` is `"check" | "converted" | "derived"`; `reason` is `"uncertain" | "malformed" | "not-in-source" | "out-of-range" | "unmarked-change" | "converted" | "from-cr"`; `outcome` is `"ok" | "no-stat-block" | "several" | "character"`
- [ ] T011 Implement the Zod schema in `ENGINE/read-result-schema.ts` with **no `.default()` anywhere**: every value leaf `.nullable().optional()`, `size` limited to `Tiny | Small | Medium | Large | Huge | Gargantuan` (an unknown size becomes a `check` note, not a parse failure). T005 passes
- [ ] T012 [P] Implement `STAT_BLOCK_SOURCE_LIMIT = 12_000`, `prepareStatBlockSource` and `assertSourceLength` in `ENGINE/source.ts`. T006 passes
- [ ] T013 [P] Implement the local checks in `ENGINE/local-checks.ts` using `DiceParser` from `dice-engine`: dice, ranges, numeric and short-text in-source checks with normalisation, and convert-mode unmarked changes (research R2.1–R2.5). T007 passes
- [ ] T014 [P] Implement the CR-to-proficiency-bonus derivation in `ENGINE/derive.ts` (research R6). T008 passes
- [ ] T015 Implement `toTovCreatureData` and `toTovQuickNpcData` in `ENGINE/to-tov-data.ts`, calling the existing exported `mapTovMechanicsToStatSheet` (do **not** edit `rules-sources/tov-generator-mapping.ts`). T009 passes
- [ ] T016 Implement `applyReviewEdit` and `fieldState(result, path)` (found / check / not found / converted / derived / corrected, per the state table in data-model.md) in `ENGINE/review.ts`, with tests in `ENGINE/review.test.ts`: editing a `check` value clears its note and marks it corrected; editing to empty makes it not found

**Checkpoint**: The read result model is tested. No reader yet.

---

## Phase 3: User Story 1 - Paste a ToV creature and get a filled stat sheet (P1) 🎯 MVP

**Goal**: From an entity's Stats tab, paste a ToV creature, review field states, and save a rollable Monster sheet, merging into an existing sheet.

**Independent test**: Quickstart scenarios 1–5 and 15.

### Tests first

- [ ] T017 [P] [US1] Write failing tests in `ENGINE/prompt.test.ts`: the `copy` system instruction contains the transcribe-only rules 1–7 from [contracts/ai-response.md](./contracts/ai-response.md); the pasted source appears only in `prompt`, never in `systemInstruction`; grounding text comes only from `rules-sources/tov-differences.ts`, `tov-doom.ts` and `tov-luck.ts`
- [ ] T018 [P] [US1] Write failing tests in `ENGINE/parse-response.test.ts` against T004: the clean response gives every expected value with no notes; the trailing-garbage response still parses (via `extractJsonObject` from `@codex/runtime`); the invented-AC response gets a `check`/`not-in-source` note; the malformed-damage response gets a `check`/`malformed` note; a response with no JSON object throws `StatBlockReadError`; `outcome: "several"` returns `candidates` and no values
- [ ] T019 [P] [US1] Write failing tests in `ENGINE/reader.test.ts`: `readStatBlockWithAi` calls the gateway once with `temperature: 0.1` and `responseMimeType: "application/json"`, and passes through the abort signal; a gateway error becomes `StatBlockReadError`; a gateway that doesn't answer within 30 s is aborted and gives `StatBlockReadError` with `reason: "timeout"` (fake timers, research R14); an over-limit source throws before any gateway call
- [ ] T020 [P] [US1] Write failing tests in `ENGINE/merge.test.ts` (research R7): with no existing sheet, `writes` holds every mapped field; with an existing Monster sheet, a not-found `languages` stays as-is; GM custom field ids outside the template are never in `writes`; `str_save` is written only when `abilityScores.str` and `proficiencyBonus` are found or derived; `overwrites` lists only non-empty values that differ; an existing NPC sheet gives `blocked: "template-mismatch"`; `canSaveReadResult` is false when `hp` is missing and true when the existing sheet already has an `hp` value (FR-015a)
- [ ] T021 [P] [US1] Write failing tests in `WEB/components/stats/import/stat-block-import-controller.test.ts` with an injected fake gateway, vault, policy store and profile store: paste → reading → reviewing; Cancel at review and at confirm calls no vault write (FR-016); confirm is shown only when `overwrites` is non-empty; Save is disabled until `ac`, `hp` and `cr` have values; Save calls `vault.updateEntity` with the merged `statSheet` via `applyDerivedModifiers`; every saved `dice` field and every dice cell in the `actions`/`bonus_actions`/`reactions` rows passes `DiceParser.parse` (FR-019); importing into an entity with a `builtin-tov-npc` sheet sends `kindHint: "npc"`; a gateway error keeps the pasted text and exposes Retry
- [ ] T022 [P] [US1] Write failing component tests in `WEB/components/stats/import/StatBlockReview.test.ts`: each state chip renders an icon **and** a text label (`found`, `check this`, `not found`, `converted`, `worked out from CR`); check rows show the source snippet; leftovers (e.g. "Lair Actions") are listed with their text and are never silently dropped (FR-015); the missing-required message names the missing fields; the privacy line from [contracts/ui.md](./contracts/ui.md) appears on the paste step
- [ ] T023 [P] [US1] Extend `WEB/components/entity-detail/DetailStatsTab.test.ts`: `stat-sheet-import` shows in a ToV vault, shows on an entity with a ToV template in a non-ToV vault, is hidden in a non-ToV vault with no ToV sheet, and is hidden for guests (FR-001, FR-002a)

### Implementation

- [ ] T024 [US1] Implement `buildStatBlockReadPrompt` for `copy` mode in `ENGINE/prompt.ts`. T017 passes
- [ ] T025 [US1] Implement `parseStatBlockReadResponse` in `ENGINE/parse-response.ts`, chaining schema → derive (T014) → local checks (T013). T018 passes
- [ ] T026 [US1] Implement `StatBlockReaderGateway` and `readStatBlockWithAi`, with its 30 s timeout, in `ENGINE/reader.ts`. T019 passes
- [ ] T027 [US1] Implement the source-path table, `planStatSheetMerge`, `canSaveReadResult` and `applyStatSheetMerge` in `ENGINE/merge.ts`. T020 passes
- [ ] T028 [US1] Export the reader contract from `ENGINE/index.ts` as listed in [contracts/stat-block-reader.md](./contracts/stat-block-reader.md)
- [ ] T029 [US1] Implement `createStatBlockReaderGateway()` in `WEB/services/stat-block-import/reader-gateway.ts`, adapting `ProxyAIGeneratorGateway.complete()` with **no** `interaction` option (one-shot, nothing stored, research R4). Add `reader-gateway.test.ts` checking that no interaction is passed and the string result is returned
- [ ] T030 [US1] Implement `StatBlockImportController` in `WEB/components/stats/import/stat-block-import-controller.svelte.ts` with constructor DI (gateway, `vault`, `discoveryPolicyStore`, `systemProfileStore`, `notificationStore`) and default singletons; states `idle → reading → reviewing → confirming → saved | cancelled` per data-model.md; sets `kindHint` from the existing sheet's template. T021 passes
- [ ] T031 [P] [US1] Implement `StatBlockFieldRow.svelte` and `StatBlockReview.svelte`, including the leftovers list, in `WEB/components/stats/import/` (Svelte 5 runes, Tailwind 4 semantic tokens, Iconify classes, no `lucide-svelte`). T022 passes
- [ ] T032 [US1] Implement `StatBlockImportModal.svelte` in `WEB/components/stats/import/`: paste step (textarea, `.json` drop, mode radio with only Copy as written enabled in this story, privacy line, Read), reading step, review step, confirm step showing "field: old → new" with **Replace these values** / **Back**
- [ ] T033 [US1] Handle the non-review outcomes in `StatBlockImportModal.svelte`, with tests in `StatBlockImportModal.test.ts`: `no-stat-block` ("No stat block found"), `several` (pick one → re-read on that creature), `character` ("Character sheets aren't supported yet"), and the over-limit message "Paste just the stat block" (FR-005). Each one keeps the pasted text and writes nothing to the vault
- [ ] T034 [US1] Add `statBlockImport` open state with `openStatBlockImport({ entityId?: string })` / `closeStatBlockImport()` to `WEB/stores/ui/modal-ui.svelte.ts`, and include it in the existing "any modal open" check at line ~544. Add a test to the store's existing test file
- [ ] T035 [US1] Mount `StatBlockImportModal` in `WEB/components/modals/GlobalModalProvider.svelte`
- [ ] T036 [US1] Add the **Import** button (`data-testid="stat-sheet-import"`) to the header of `WEB/components/entity-detail/DetailStatsTab.svelte`, visible when `!readOnly && (systemProfileStore.isTalesOfTheValiant || templateId is a ToV template id)`. T023 passes
- [ ] T037 [US1] Add an **Import a stat block** section to `WEB/content/help/stat-sheets.md`: where the button is, Copy as written, what found / check this / not found / worked out from CR mean, that AC, HP and CR are required, how merging keeps unfound values and custom fields, the privacy note, and the limits (ToV vaults only, one creature, text only, no characters)

**Checkpoint**: US1 works on its own. This is the MVP.

---

## Phase 4: User Story 2 - Import a quick NPC (P1)

**Goal**: NPC stat blocks fill the ToV NPC sheet; the GM can switch sheet type; leftovers are listed.

**Independent test**: Quickstart scenario 6.

- [ ] T038 [P] [US2] Add failing tests to `ENGINE/parse-response.test.ts` and `ENGINE/to-tov-data.test.ts`: the NPC fixture parses as `kind: "npc"` with `NpcValues`; `toTovQuickNpcData` maps to a `builtin-tov-npc` sheet; the NPC `notes` long text is built only from found parts
- [ ] T039 [P] [US2] Add failing tests to `ENGINE/review.test.ts`: `switchReadResultKind(result, "creature" | "npc")` moves shared values (`ac`, `hp`, `cr`, `speed`, `abilityScores`) and lists values the target has no field for in `leftovers`, never dropping them (FR-008, FR-015)
- [ ] T040 [US2] Implement NPC handling in `ENGINE/read-result-schema.ts`, `ENGINE/to-tov-data.ts` and `ENGINE/merge.ts` (NPC source-path table, including `atk` ← `attackFormula`, `damage` ← `damageFormula`). T038 passes
- [ ] T041 [US2] Implement `switchReadResultKind` in `ENGINE/review.ts`. T039 passes
- [ ] T042 [US2] Add the Monster/NPC switch to `WEB/components/stats/import/StatBlockReview.svelte`, with component tests in `StatBlockReview.test.ts` showing that values the new sheet has no field for appear in the leftovers list (built in US1)
- [ ] T043 [US2] Add a line on NPC stat blocks and switching sheet type to the help section in `WEB/content/help/stat-sheets.md`

---

## Phase 5: User Story 3 - Create a new creature straight from a stat block (P2)

**Goal**: Start from the new-entity form, get a new entity named after the creature.

**Independent test**: Quickstart scenario 7.

- [ ] T044 [P] [US3] Add failing tests to `stat-block-import-controller.test.ts`: with no `entityId`, Save calls `vault.createEntity(type, name, { statSheet })`, with `type` from `resolveEntityType` (`generator-engine`) using generator id `"creature"` for monsters and `"npc"` for quick NPCs and the vault's category ids, falling back to the first of `character` / `npc` / `creature` the vault has, else its default category (research R13); when an entity with the same title exists, the controller enters `name-clash` and offers open / import into / create separate; choosing "import into" switches to the merge path for that entity
- [ ] T045 [P] [US3] Add tests to the existing `VaultControls` and `MobileCreateEntitySheet` test files: `new-entity-from-stat-block` and `mobile-new-from-stat-block` show only in a ToV vault and call `modalUIStore.openStatBlockImport({})`
- [ ] T046 [US3] Implement the new-entity and name-clash paths in `stat-block-import-controller.svelte.ts` and the name-clash step in `StatBlockImportModal.svelte`. T044 passes
- [ ] T047 [US3] Add the **From stat block** button to the new-entity form in `WEB/components/VaultControls.svelte` (one button only; file is 674 lines, see plan XIV) and **FROM STAT BLOCK** next to GENERATE in `WEB/components/modals/MobileCreateEntitySheet.svelte`. T045 passes
- [ ] T048 [US3] Add the "Keep the original text in notes" opt-in (unticked by default, with the share warning "Notes are included when you share or publish this vault.") to `StatBlockReview.svelte`. On save, append an "Original stat block" fenced section and any leftovers to the entity `content` (FR-021, research R11). Add tests that nothing is written to `content` when unticked
- [ ] T049 [US3] Add the new-entity entry and the notes opt-in to the help section in `WEB/content/help/stat-sheets.md`

---

## Phase 6: User Story 4 - Convert a 5e stat block to ToV (P2)

**Goal**: An explicit Convert from 5e mode, with every changed value marked and the original shown.

**Independent test**: Quickstart scenarios 8–9.

- [ ] T050 [P] [US4] Add failing tests to `ENGINE/prompt.test.ts`: the `convert-5e` system instruction adds the conversion rules and the "a `converted` note for every added or changed value" rule from [contracts/ai-response.md](./contracts/ai-response.md), grounded only on open BFRD rules sources
- [ ] T051 [P] [US4] Add failing tests to `ENGINE/parse-response.test.ts` using a recorded convert response: added `doom` carries `converted` with `original: null`; a renamed trait carries `converted` with the 5e original; in `copy` mode, the 5e fixture gives `looksLike: "5e"`, and so does `detectStatBlockSystem` on the source (research R9)
- [ ] T052 [P] [US4] Add failing tests to `stat-block-import-controller.test.ts`: saving a convert-mode result adds the label `"Converted from 5e"` to the entity (FR-020, research R10, Constitution XII); copy mode adds no label; the 5e notice action switches mode to `convert-5e` and re-reads
- [ ] T053 [US4] Implement `convert-5e` in `ENGINE/prompt.ts` and the `looksLike` merge with `detectStatBlockSystem` in `ENGINE/parse-response.ts`. T050 and T051 pass
- [ ] T054 [US4] Enable the Convert from 5e radio and add the 5e notice ("This looks like a 5e stat block. Want to convert it to Tales of the Valiant instead?") in `StatBlockImportModal.svelte`/`StatBlockReview.svelte`. Show `converted` chips with the original under each row. Implement the label in the controller. T052 passes
- [ ] T055 [US4] Add Convert from 5e (what it does, that converted values are marked and should be checked, the label) to `WEB/content/help/stat-sheets.md`

---

## Phase 7: User Story 5 - Import without AI (P3)

**Goal**: The rule-based reader when AI is off or fails; nothing leaves the device.

**Independent test**: Quickstart scenarios 10–11.

- [ ] T056 [P] [US5] Add end-to-end tests in `packages/stat-sheet-engine/src/stat-block/index.test.ts` for `importStatBlock` with `systemHint: "tales-of-the-valiant"` (research R8). Characterisation tests (expected to pass at once) record what it reads today from the clean text, PDF-damaged text and Foundry JSON fixtures in T003. Failing tests cover the negatives: the lore paragraph and empty input must not throw and must yield no values. This closes the existing coverage gap
- [ ] T057 [P] [US5] Write failing tests in `ENGINE/rules-adapter.test.ts`: `readStatBlockWithRules` maps `StatBlockIR` to a `ReadResult` with `reader: "rules"`; present values are found, missing values are absent (IR defaults such as `identity.category: "npc"` are **not** reported as found); dice that `DiceParser` rejects become `check`; it makes no gateway call
- [ ] T058 [P] [US5] Add failing tests to `stat-block-import-controller.test.ts`: with `aiDisabled = true` the gateway is never called, the result has `reader: "rules"`, and `convert-5e` is unavailable; after an AI error, "Use quick reader" re-reads with rules and keeps the pasted text (FR-012, FR-013)
- [ ] T059 [US5] Implement `readStatBlockWithRules` in `ENGINE/rules-adapter.ts` and export it from `ENGINE/index.ts`. T056 and T057 pass
- [ ] T060 [US5] Implement the AI-off and error-fallback paths in the controller. Show the quick-reader notice ("AI is off, so a quick reader was used. Some fields may need filling in by hand.") and hide Convert from 5e when AI is off. T058 passes
- [ ] T061 [US5] Add the AI-off behaviour to `WEB/content/help/stat-sheets.md`

---

## Phase 8: Polish and cross-cutting

- [ ] T062 Reword `aiUsageGuardrails` in `packages/stat-sheet-engine/src/rules-sources/bfrd-manifest.ts` (FR-023): AI may read text a user pastes, for their own use, in that one request, and it is not stored or reused. Codex Cryptica's own prompts, grounding, bundled content and public pages stay limited to open BFRD material under CC BY 4.0. **Its own commit, flagged for owner review in the PR.** Confirm `RulesSourceManifestSchema.parse` still passes
- [ ] T063 [P] Add a `FEATURE_HINTS` entry `stat-block-import` in `WEB/config/help-content.ts` and attach it to the Stats tab Import button. It shows for a creature entity with no stat sheet in a ToV vault
- [ ] T064 [P] Add `packages/stat-sheet-engine/scripts/stat-block-reader-eval.ts`: a manual run of `readStatBlockWithAi` over the T003 fixtures that prints field accuracy, the invented-value count and the unmarked-conversion count (SC-002–SC-004). Not in CI; document the usage in quickstart.md
- [ ] T065 Verify ≥ 70% coverage for `ENGINE/` (`cd packages/stat-sheet-engine && bunx vitest run --coverage src/stat-block-reader`)
- [ ] T066 Run the impacted-only gates: `bun scripts/lint-changed.mjs`, `bun scripts/test-changed.mjs`, `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`, and type-check `packages/stat-sheet-engine`
- [ ] T067 Walk through the [quickstart.md](./quickstart.md) manual scenarios 1–15 in a ToV vault, and run the eval script once with AI
- [ ] T068 Run `bunx fallow audit --format json --quiet --explain --gate-marker agent` and fix any new findings before committing

---

## Dependencies and order

```text
Setup (T001–T004)
  └─ Foundational (T005–T016)
       └─ US1 (T017–T037)  ← MVP
            ├─ US2 (T038–T043)
            ├─ US3 (T044–T049)
            ├─ US4 (T050–T055)
            └─ US5 (T056–T061)   (T056 can start right after Setup)
                 └─ Polish (T062–T068)  (T062 can land any time)
```

- US2–US5 each need US1's controller, modal and merge, but not each other. They can be built in any order or in parallel.
- Inside each phase, tests come before the implementation they cover.
- T056 (end-to-end tests for the existing `importStatBlock`) only needs the T003 fixtures, and is worth doing early because it measures the fallback's real quality.

## Parallel examples

- **Foundational tests**: T005, T006, T007, T008, T009 together (separate files).
- **Foundational implementation**: T012, T013, T014 together once T010 and T011 are in.
- **US1 tests**: T017–T023 together.
- **US1 UI vs engine**: T031 (review components) alongside T024–T027 (engine).
- **After US1**: one person on US2 + US4 (engine-heavy), another on US3 + US5 (app-heavy).

## Implementation strategy

1. **MVP = Setup + Foundational + US1.** It covers pasting a ToV creature into an entity, reviewing it, merging and saving. Ship behind nothing extra; it's only visible in ToV vaults.
2. **Then US2 (NPCs).** Same P1 priority and small.
3. **Then US5 (AI off)** if AI-off users matter for the release. Otherwise do **US3 / US4** first.
4. Land T062 (the guardrail wording) as its own reviewed commit before the first release that includes the AI path.
