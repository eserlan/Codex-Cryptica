# Tasks: ToV-Aware Encounter Assistance and Verified Doom Mechanics

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  
**Date**: 2026-10-15  
**Status**: Ready

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared schemas, types, and engine foundations.

- [x] T001 Define `TovEncounterCreatureSuggestionSchema` and `TovEncounterMechanicsSchema` in `packages/generator-engine/src/tov-mechanics-schema.ts`
- [x] T002 Extend `GeneratorMechanicsBundleSchema` with the `tov-encounter` variant in `packages/generator-engine/src/tov-mechanics-schema.ts`
- [x] T003 Export new types `TovEncounterMechanics` and `TovEncounterCreatureSuggestion` from `packages/generator-engine/src/index.ts`
- [x] T004 [P] Implement `isTovDoomField`, `adjustTovDoom`, and `TOV_DOOM_REFERENCE` in `packages/stat-sheet-engine/src/rules-sources/tov-doom.ts` and export from `packages/stat-sheet-engine/src/index.ts`
- [x] T005 [P] Add unit tests for `isTovDoomField` and `adjustTovDoom` in `packages/stat-sheet-engine/tests/tov-doom.test.ts` covering bounds (0 to max), clamping, and template matching

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core encounter options and prompt builder infrastructure.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Extend `EncounterGeneratorOptions` with optional `gameSystem`, `partySize`, and `partyLevel` in `packages/generator-engine/src/public-encounter.ts`
- [x] T007 Implement `buildTovEncounterPromptInstructions` in `packages/generator-engine/src/tov-mechanics-prompt.ts` with qualitative challenge assessment, BFRD CR distribution, adversary participant recommendations, and encounter-level BFRD Doom guidance (labelling custom creature-specific Doom abilities or alternate Doom economies as `[Homebrew]`)
- [x] T008 Update `parseEncounterResponse` in `packages/generator-engine/src/public-encounter.ts` to extract and validate `mechanics` via `parseTovMechanics`
- [x] T009 Register `gameSystem`, `partySize` (range 1–8, default 4), and `partyLevel` (range 1–20, default 3) options with `visibleWhen` in `packages/generator-engine/src/campaign-generator-registry.ts` under `REGISTRY.encounter`

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Encounter Assistance with Party Profile & Qualitative Guidance (Priority: P1) 🎯 MVP

**Goal**: Support party composition inputs (party size, level) in the Encounter Generator when ToV is active, generating qualitative challenge pacing, tactical advice, and source-backed vs homebrew caveats while preserving narrative situation and neutral behaviour 100%.

**Independent Test**: Generate an encounter with `gameSystem: "tales-of-the-valiant"` and 4 characters at Level 3. Confirm that narrative sections ("What the Players See", situation, stakes, environment, approaches, complication, outcomes) are intact and that `mechanics` contains qualitative difficulty, recommended CR range, and tactical advice. Verify that neutral mode (`gameSystem: "system-neutral"`) generates zero mechanical references.

### Tests for User Story 1 (REQUIRED for changed behaviour) ⚠️

- [x] T010 [P] [US1] Create unit tests for ToV encounter prompt injection and mechanics output parsing in `packages/generator-engine/tests/public-encounter-tov.test.ts` verifying party size and level injection, qualitative difficulty parsing, and neutral mode isolation

### Implementation for User Story 1

- [x] T011 [US1] Update `encounterOptions` and `buildCampaignEncounterPrompt` in `packages/generator-engine/src/campaign-generator-registry.ts` to pass `gameSystem`, `partySize`, and `partyLevel` and inject ToV prompt instructions when `gameSystem === "tales-of-the-valiant"`
- [x] T012 [US1] Update `GeneratorMechanicsPreview.svelte` in `apps/web/src/lib/components/generators/GeneratorMechanicsPreview.svelte` to render an Encounter Mechanics card (displaying qualitative difficulty, recommended CR distribution, tactical notes, and homebrew indicators)
- [x] T013 [US1] Update `buildGeneratorSavePayload` in `apps/web/src/lib/components/seo/generator-save.ts` to format `TovEncounterMechanics` into a Markdown block `### Game Mechanics & Challenge Guidance (Tales of the Valiant)` on save

**Checkpoint**: User Story 1 (MVP) is functional and independently verifiable.

---

## Phase 4: User Story 2 - BFRD Creature Participant Integration & Token Linkage (Priority: P1)

**Goal**: Ensure encounter participant adversaries link to valid ToV creature profiles (CR, role, and built-in template IDs) and can be instantiated as VTT tokens with interactive ToV stat sheets.

**Independent Test**: Generate an encounter with ToV adversaries; inspect draft preview to verify suggested creature participants with CR, count, and roles; save to vault and confirm participants are inspectable with ToV stats.

### Tests for User Story 2 (REQUIRED for changed behaviour) ⚠️

- [x] T014 [P] [US2] Add unit tests in `packages/generator-engine/tests/public-encounter-tov.test.ts` verifying participant creature suggestions (name, CR, count, role, templateId) and homebrew flags

### Implementation for User Story 2

- [x] T015 [US2] Update `GeneratorMechanicsPreview.svelte` to render suggested creature participants in a structured table with CR badges, role, quantity, and homebrew status
- [x] T016 [US2] Update `mapOutputToDraft("encounter")` in `packages/generator-engine/src/campaign-generator-registry.ts` to attach `draft.mechanics` and metadata for participant creatures

**Checkpoint**: User Stories 1 AND 2 are functional and independently testable.

---

## Phase 5: User Story 3 - Verified Optional Doom Resource Guidance & Per-Creature Allocation Counter (Priority: P2)

**Goal**: Implement an interactive Doom Points counter on `builtin-tov-monster` stat sheets and VTT token controls to represent per-creature allocations from the optional BFRD encounter-level Doom pool, paired with inline rules reference copy clarifying that the per-creature counter does not alter the encounter-level BFRD rule.

**Independent Test**: Load a token with `builtin-tov-monster` and `doom` = 3 in `TokenQuickStats.svelte`; verify `TovDoomControl` appears with current points, spend/gain controls, and expandable reference copy explaining the encounter-level BFRD Doom rule and per-creature allocation tracking. Verify non-ToV / non-monster tokens show no Doom control.

### Tests for User Story 3 (REQUIRED for changed behaviour) ⚠️

- [x] T017 [P] [US3] Create unit tests in `apps/web/src/lib/components/stats/TovDoomControl.test.ts` verifying spend and gain interactions, min/max clamping (0–10), and aria-live announcements
- [x] T018 [P] [US3] Add unit tests in `apps/web/src/lib/components/vtt/TokenQuickStats.test.ts` verifying that `TovDoomControl` renders for tokens with `doom` counter fields and is hidden for non-ToV / non-Doom tokens

### Implementation for User Story 3

- [x] T019 [US3] Create Svelte 5 component `apps/web/src/lib/components/stats/TovDoomControl.svelte` with increment/decrement buttons, min/max display, and reactive `onChange`
- [x] T020 [US3] Integrate `TovDoomControl` into `apps/web/src/lib/components/stats/StatSheetView.svelte` for `isTovDoomField`
- [x] T021 [US3] Integrate `TovDoomControl` into `apps/web/src/lib/components/vtt/TokenQuickStats.svelte` to display and persist Doom adjustments on VTT tokens

**Checkpoint**: User Stories 1, 2, and 3 are functional.

---

## Phase 6: User Story 4 - Vault System Profile Inheritance & UI Review Controls (Priority: P2)

**Goal**: In-app Encounter Generator inherits `tales-of-the-valiant` from `systemProfileStore` when configured, showing party inputs automatically while defaulting to neutral on public pages.

**Independent Test**: Open Encounter Generator with ToV vault active: verify ToV pre-selected and party inputs visible. Open public `/generators/encounter`: verify neutral selected by default.

### Tests for User Story 4 (REQUIRED for changed behaviour) ⚠️

- [x] T022 [P] [US4] Add tests in `apps/web/src/lib/components/generators/GeneratorConfigForm.test.ts` verifying encounter generator default options under ToV vault profile vs neutral vault profile

### Implementation for User Story 4

- [x] T023 [US4] Verify and ensure `GeneratorConfigForm.svelte` passes default `partySize: 4` and `partyLevel: 3` when `tales-of-the-valiant` is selected
- [x] T024 [US4] Ensure `GeneratorOutputCard.svelte` renders the encounter mechanics preview card on public generator pages when ToV is selected

---

## Phase 7: Polish & Quality Gates

**Purpose**: Verification, documentation, and PR quality gates.

- [x] T025 Run `bun test packages/generator-engine/tests/public-encounter-tov.test.ts` and `bun test packages/stat-sheet-engine/tests/tov-doom.test.ts`
- [x] T026 Run `bun run test:changed` across all affected workspaces
- [x] T027 Run `bun run lint:changed` across all modified files
- [x] T028 Run scoped type check: `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` inside `apps/web`
- [x] T029 Run `codex-review` specialist review on all changed files
