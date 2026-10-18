# Implementation Plan: Import a ToV Stat Block from Pasted Text

**Branch**: `4192-tov-statblock-import` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/4192-tov-statblock-import/spec.md`

## Summary

A GM pastes a creature or quick-NPC stat block from any source. The text is read into a **read result**: values with no defaults, plus sparse notes marking each value as check this, converted or worked out from CR. By default an AI does the transcription, with a low temperature and copy-only rules. With AI off, the existing rule-based `importStatBlock()` does it. Local checks then verify dice formulas and ranges, and check that numbers and short text values actually appear in the source. The GM reviews and corrects. On save, the existing `mapTovMechanicsToStatSheet` builds the sheet, and a field-level merge writes only found or corrected values into an existing sheet. All logic lives in a new `stat-block-reader/` folder in `@codex/stat-sheet-engine`, behind an injected gateway. The web app adds one modal and three entry buttons.

The main design choice is in [research.md](./research.md) R1. The generator's ToV schema defaults every missing value (HP 22, scores 10…), so import cannot reuse it for reading without breaking "never invent".

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `@codex/stat-sheet-engine` (`mapTovMechanicsToStatSheet`, `importStatBlock`, `detectStatBlockSystem`, ToV templates, BFRD rules sources), `@codex/runtime` (`extractJsonObject`), `@codex/ai-engine` via the web app's `ProxyAIGeneratorGateway`, `discoveryPolicyStore.aiDisabled`, `systemProfileStore.isTalesOfTheValiant`, `vault.createEntity`/`updateEntity`, `modalUIStore`, `dice-engine` `DiceParser` (new internal workspace dependency of `stat-sheet-engine`), `zod`, Tailwind 4 semantic tokens, Iconify classes. No new third-party dependency.
**Storage**: None new. Saves through existing entity fields: `statSheet`, `labels` ("Converted from 5e"), `content` (opt-in original text). No IndexedDB, OPFS or schema change, so no migration.
**Testing**: Vitest (engine and component tests), recorded AI responses as fixtures (no live AI in CI), plus a manual eval script for SC-002–SC-004.
**Target Platform**: Browser (local-first web app).
**Project Type**: Monorepo web app with framework-free workspace packages.
**Performance Goals**: Review screen within 10 s of Read for a typical creature on the AI path; under 200 ms for the rule-based path; review edits respond instantly.
**Constraints**: Pasted text max 12,000 characters (R5); one-shot AI request, nothing stored server-side; works offline with the rule-based reader; field states shown by icon and text, not colour alone.
**Scale/Scope**: One creature per import; creature and quick NPC only (characters out of scope).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                   | Status | How                                                                                                                                                                                                         |
| --------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First            | PASS   | All reading, checking, mapping and merge logic is in `packages/stat-sheet-engine/src/stat-block-reader/`. The web app only holds the modal and the gateway adapter.                                         |
| II. TDD                     | PASS   | Engine guarantees are written as failing tests first (contract §Guarantees); end-to-end tests for `importStatBlock` are added before relying on it (R8).                                                    |
| III. Simplicity & YAGNI     | PASS   | Reuses the existing mapper, rule-based importer, detector, gateway and JSON extractor. No new package and no new dependency.                                                                                |
| IV. AI-First Extraction     | PASS   | AI is the main reader with structured, validated JSON output; the rule-based reader is the fallback.                                                                                                        |
| V. Privacy & Client-Side    | PASS   | No remote storage, so the opt-in remote storage exception is not invoked. The pasted text goes only to the existing AI proxy for one request, with a notice first (FR-022). Nothing is sent when AI is off. |
| VI. Clean Implementation    | PASS   | Style guide patterns; impacted-only lint, tests and type-check (quickstart).                                                                                                                                |
| VII. User Documentation     | PASS   | See User Help Check.                                                                                                                                                                                        |
| VIII. DI                    | PASS   | `StatBlockReaderGateway` is injected; the modal's controller takes the gateway, vault, policy and profile stores in its constructor, with defaults.                                                         |
| IX. Natural Language        | PASS   | Copy in [contracts/ui.md](./contracts/ui.md): "Import", "Copy as written", "check this", "not found".                                                                                                       |
| X. Coverage                 | PASS   | New engine folder targets ≥ 70%.                                                                                                                                                                            |
| XII. Labels over Tags       | PASS   | Conversion provenance is the label "Converted from 5e" (R10).                                                                                                                                               |
| XIII. Discovery Intent      | N/A    | No public discovery page.                                                                                                                                                                                   |
| XIV. Bounded Responsibility | PASS   | See below.                                                                                                                                                                                                  |

**Policy change (FR-023)**: `BFRD_MANIFEST.aiUsageGuardrails` in `packages/stat-sheet-engine/src/rules-sources/bfrd-manifest.ts` is reworded. AI may read text a user pastes, for their own use, in that one request. Codex Cryptica's own prompts, grounding, bundled content and public pages stay limited to open BFRD material. This is a licensing-sensitive wording change and needs the owner's review in the PR. Nothing else reads the field (checked).

### Discovery Intent Check

N/A. The feature adds no public, indexable page.

### Bounded Responsibility Check

- [x] Touched files over 500 lines (excluding tests and data-only modules):
  - `apps/web/src/lib/components/VaultControls.svelte` (674): one button in the new-entity form. Its responsibility (starting a new entity) is unchanged; the import UI lives elsewhere.
  - `apps/web/src/lib/stores/ui/modal-ui.svelte.ts` (559): one `statBlockImport` state plus open/close. It remains the global modal registry.
  - `packages/stat-sheet-engine/src/rules-sources/tov-generator-mapping.ts` (528): **not edited**. The reader calls its exported function.
  - `StatSheetEditor.svelte` (712): **not touched** (R12).
  - `apps/web/src/lib/config/help-content.ts` (866): one `FEATURE_HINTS` entry. It's a data-only catalogue, so it's exempt from the size trigger.
- [x] New behaviour goes into new files: `stat-block-reader/*` in the engine; `components/stats/import/*` in the app.
- [x] No splits planned, so no tests to move.

### User Help Check

- [x] New section **Import a stat block** in `apps/web/src/lib/content/help/stat-sheets.md`. It covers how to open the import, the two modes, the field states, the required fields, merging, AI off, and the privacy and notes warning.
- [x] Covers prerequisites (ToV vault) and limits (one creature, no characters, text only).
- [x] A `FEATURE_HINTS` entry (`apps/web/src/lib/config/help-content.ts`) on the Stats tab **Import** button, shown the first time a ToV vault has a creature entity with no stat sheet.

## Project Structure

### Documentation (this feature)

```text
specs/4192-tov-statblock-import/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── stat-block-reader.md
│   ├── ai-response.md
│   └── ui.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code

```text
packages/stat-sheet-engine/src/
├── stat-block-reader/                 # NEW
│   ├── index.ts                       # public exports (contract)
│   ├── types.ts                       # ImportRequest, ReadResult, FieldNote, MergePlan
│   ├── read-result-schema.ts          # Zod, no defaults (R1)
│   ├── source.ts                      # prepareStatBlockSource, length limit (R5)
│   ├── prompt.ts                      # copy / convert-5e instructions (ai-response contract)
│   ├── parse-response.ts              # JSON → ReadResult
│   ├── local-checks.ts                # dice, range, in-source checks (R2)
│   ├── derive.ts                      # PB from CR (R6)
│   ├── rules-adapter.ts               # StatBlockIR → ReadResult (R8)
│   ├── to-tov-data.ts                 # ReadResult → TovCreatureData / TovQuickNpcData
│   ├── merge.ts                       # source-path table, planStatSheetMerge, apply (R7)
│   ├── reader.ts                      # readStatBlockWithAi / WithRules
│   ├── __fixtures__/                  # reference stat blocks + recorded AI responses
│   └── *.test.ts
├── stat-block/index.test.ts           # NEW: end-to-end importStatBlock tests (R8)
├── rules-sources/bfrd-manifest.ts     # EDIT: aiUsageGuardrails wording (FR-023)
└── index.ts                           # EDIT: re-export stat-block-reader
packages/stat-sheet-engine/package.json # EDIT: + "dice-engine": "workspace:*"

packages/stat-sheet-engine/scripts/stat-block-reader-eval.ts   # NEW: manual accuracy run

apps/web/src/lib/
├── services/stat-block-import/
│   └── reader-gateway.ts              # NEW: ProxyAIGeneratorGateway → StatBlockReaderGateway
├── components/stats/import/           # NEW
│   ├── stat-block-import-controller.svelte.ts   # session state machine (DI)
│   ├── StatBlockImportModal.svelte
│   ├── StatBlockReview.svelte
│   ├── StatBlockFieldRow.svelte
│   └── *.test.ts
├── components/entity-detail/DetailStatsTab.svelte    # EDIT: Import button
├── components/VaultControls.svelte                   # EDIT: From stat block button
├── components/modals/MobileCreateEntitySheet.svelte  # EDIT: FROM STAT BLOCK button
├── components/modals/GlobalModalProvider.svelte      # EDIT: mount modal
├── stores/ui/modal-ui.svelte.ts                      # EDIT: open state
├── config/help-content.ts                             # EDIT: FEATURE_HINTS entry
└── content/help/stat-sheets.md                       # EDIT: help section
```

**Structure Decision**: Engine logic goes in a new folder of the existing `@codex/stat-sheet-engine`, next to `stat-block/` (rule-based import) and `rules-sources/` (ToV templates and mapper) that it depends on. App code goes in a new `components/stats/import/` folder plus a thin gateway adapter. Existing files only gain entry points.

## Complexity Tracking

No constitution violations to justify.

## Risks

| Risk                                                         | Mitigation                                                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Model invents values despite the prompt                      | The local in-source check (R2.2) flags them, and SC-003 is measured by the eval script.            |
| Rule-based fallback is poor on PDF text                      | Labelled "quick reader"; end-to-end tests added; no accuracy target this slice.                    |
| Guardrail rewording is a licensing call                      | Isolated commit; flagged for owner review in the PR.                                               |
| Reference fixtures accidentally include commercial book text | Fixtures are written from open BFRD content or invented for the repo; FR-024 is checked in review. |
