# Tasks: Optional Tales of the Valiant Mechanics in NPC, Creature, and Item Generators

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  
**Date**: 2026-10-15  
**Status**: Ready

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared schemas, types, and engine foundations.

- [x] T001 Define `TovQuickNpcMechanics`, `TovCreatureMechanics`, `TovMagicItemMechanics`, and `GeneratorMechanicsBundle` Zod schemas in `packages/generator-engine/src/tov-mechanics-schema.ts`
- [x] T002 Export ToV mechanics schemas and types from `packages/generator-engine/src/index.ts`
- [x] T003 [P] Extend `GeneratorOutput` and `GeneratedDraft` with optional `mechanics?: GeneratorMechanicsBundle`, `systemId?: string`, and `statSheet?: StatSheet` in `packages/generator-engine/src/campaign-generator-types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core parser, stat sheet mapper, and vault persistence pipeline.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Implement `parseTovMechanics` helper in `packages/generator-engine/src/tov-mechanics-parser.ts` to validate and extract structured ToV mechanics from LLM generation payloads
- [x] T005 [P] Create `mapTovMechanicsToStatSheet` in `packages/stat-sheet-engine/src/rules-sources/tov-generator-mapping.ts` to transform `TovQuickNpcMechanics`, `TovCharacterMechanics`, and `TovCreatureMechanics` into native `StatSheetData` matching `builtin-tov-npc`, `builtin-tov-character`, and `builtin-tov-monster`
- [x] T006 [P] Add unit tests for `mapTovMechanicsToStatSheet` in `packages/stat-sheet-engine/tests/tov-generator-mapping.test.ts` covering stat conversions, counter initializations, and roll formulas
- [x] T007 Update `CampaignGeneratorPersistenceService.createDraftEntity` in `packages/generator-engine/src/campaign-generator-service-persistence.ts` to persist `draft.statSheet` and `draft.systemId` into `vault.createEntity`

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Generate an NPC with Optional Tales of the Valiant Stat Block (Priority: P1) 🎯 MVP

**Goal**: Support generating Quick NPCs (CR-based) by default or full leveled characters, attaching `builtin-tov-npc` or `builtin-tov-character` upon save.

**Independent Test**: Run NPC generator with `gameSystem: "tales-of-the-valiant"`, verify that valid BFRD stats appear in the draft, and confirm saving attaches an interactive `builtin-tov-npc` sheet with working click-to-roll formulas.

### Tests for User Story 1 (REQUIRED for changed behaviour) ⚠️

- [x] T008 [P] [US1] Create unit tests for ToV NPC prompt generation and output mapping in `packages/generator-engine/tests/public-npc-tov.test.ts` covering both Quick NPC and Leveled Character branches

### Implementation for User Story 1

- [x] T009 [US1] Register `gameSystem` select option and dependent `npcDetail` option with `visibleWhen` on `npc` generator in `packages/generator-engine/src/campaign-generator-registry.ts`
- [x] T010 [US1] Update `npcPrompt` in `packages/generator-engine/src/campaign-generator-registry.ts` to inject ToV BFRD NPC prompt instructions when `gameSystem === "tales-of-the-valiant"`
- [x] T011 [US1] Update `mapOutputToDraft("npc")` in `packages/generator-engine/src/campaign-generator-registry.ts` to map parsed ToV mechanics into `draft.statSheet` (using `builtin-tov-npc` for Quick NPCs or `builtin-tov-character` for full leveled characters) and set `draft.systemId = "tales-of-the-valiant"`
- [x] T012 [US1] Update `apps/web/src/lib/components/generators/GeneratorDraftReview.svelte` to render a Mechanics tab/card displaying NPC combat stats, ability checks, and homebrew badges

**Checkpoint**: User Story 1 (MVP) is functional and independently verifiable.

---

## Phase 4: User Story 2 - Generate a Creature or Monster with BFRD Mechanics (Priority: P1)

**Goal**: Support generating BFRD creatures and monsters with CR, defenses, traits, and actions, attaching `builtin-tov-monster` upon save.

**Independent Test**: Generate a CR 3 creature under ToV mode, verify PB +2, valid attack formulas, and save to an entity attaching `builtin-tov-monster`.

### Tests for User Story 2 (REQUIRED for changed behaviour) ⚠️

- [x] T013 [P] [US2] Create unit tests for ToV creature prompt generation and output mapping in `packages/generator-engine/tests/public-creature-tov.test.ts` verifying mathematical consistency of CR, PB, AC, and HP formulas

### Implementation for User Story 2

- [x] T014 [US2] Register `gameSystem` select option on `creature` generator in `packages/generator-engine/src/campaign-generator-registry.ts`
- [x] T015 [US2] Update `creaturePrompt` in `packages/generator-engine/src/campaign-generator-registry.ts` to inject ToV BFRD creature instructions when `gameSystem === "tales-of-the-valiant"`
- [x] T016 [US2] Update `mapOutputToDraft("creature")` in `packages/generator-engine/src/campaign-generator-registry.ts` to map parsed `TovCreatureMechanics` to `builtin-tov-monster` stat sheet
- [x] T017 [US2] Enhance `apps/web/src/lib/components/generators/GeneratorDraftReview.svelte` to render creature action tables, multiattacks, Doom counters, and GM review flags

**Checkpoint**: User Stories 1 AND 2 are functional and independently testable.

---

## Phase 5: User Story 3 - Generate a Magic Item or Loot with ToV Properties (Priority: P2)

**Goal**: Support generating ToV magic items with rarity, attunement, action economy, charges, and DCs formatted into Markdown and metadata.

**Independent Test**: Generate a magic item with ToV mode enabled, verify BFRD rarity, attunement, and charges appear, and save to vault confirming structured `### Game Statistics` section in note markdown.

### Tests for User Story 3 (REQUIRED for changed behaviour) ⚠️

- [x] T018 [P] [US3] Create unit tests for ToV magic item prompt and save formatting in `packages/generator-engine/tests/public-magic-item-tov.test.ts`

### Implementation for User Story 3

- [x] T019 [US3] Register `gameSystem` select option on `magic-item` and `minor-magic-item` generators in `packages/generator-engine/src/campaign-generator-registry.ts`
- [x] T020 [US3] Update `magicItemPrompt` and `minorMagicItemPrompt` in `packages/generator-engine/src/campaign-generator-registry.ts` to inject ToV magic item instructions when `gameSystem === "tales-of-the-valiant"`
- [x] T021 [US3] Update `buildGeneratorSavePayload` in `apps/web/src/lib/components/seo/generator-save.ts` to format `TovMagicItemMechanics` into a dedicated `### Game Statistics (Tales of the Valiant)` markdown section and entity metadata

**Checkpoint**: User Stories 1, 2, and 3 are functional.

---

## Phase 6: User Story 4 - Vault-Level Profile Inheritance with Transparent Override (Priority: P2)

**Goal**: In-app generators pre-select ToV if active vault profile is ToV; public pages default to neutral with clipboard and handoff support.

**Independent Test**: Open NPC generator inside a ToV-configured vault and verify ToV is pre-selected; open public `/generators/npc` and verify neutral is default with functional ToV generation and clipboard copy.

### Tests for User Story 4 (REQUIRED for changed behaviour) ⚠️

- [x] T022 [P] [US4] Create unit tests in `apps/web/src/lib/components/generators/GeneratorConfigForm.test.ts` verifying default `gameSystem` resolves to vault system profile if set, or neutral otherwise

### Implementation for User Story 4

- [x] T023 [US4] Update `GeneratorConfigForm.svelte` in `apps/web/src/lib/components/generators/GeneratorConfigForm.svelte` to initialize `gameSystem` default from `systemProfileStore.vaultSystemId`
- [x] T024 [US4] Update `apps/web/src/lib/components/seo/GeneratorOutputCard.svelte` to render structured ToV mechanics preview on public SEO generator pages
- [x] T025 [US4] Update public clipboard formatter in `apps/web/src/lib/components/seo/generator-copy.ts` and guest handoff payload in `apps/web/src/lib/components/seo/generator-save-flow.ts` to include ToV mechanics

**Checkpoint**: All user stories are complete and integrated.

---

## Phase 7: Polish & User Documentation (Constitution VII)

**Purpose**: Documentation, offline notices, and quality verification.

- [x] T026 [P] Add user help documentation in `apps/web/src/lib/content/help/tales-of-the-valiant-generators.md` explaining how to generate ToV characters, monsters, and items
- [x] T027 Register the new help article in `apps/web/src/lib/config/help-content.ts`
- [x] T028 [P] Add unit test and UI notice in `apps/web/src/lib/components/generators/GeneratorConfigForm.svelte` ensuring that offline / AI-disabled mode falls back to neutral with an informational notice
- [ ] T029 Execute full manual validation suite per `specs/3948-tov-generator-mechanics/quickstart.md`
- [ ] T030 Validate quality gates: `bun run lint:changed`, `bun run test:changed`, and scoped type-checking (`bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories.
- **User Stories (Phase 3–6)**: Depend on Phase 2 completion.
  - US1 (NPC) and US2 (Creature) are P1 MVP priorities and can be developed in parallel or sequentially.
  - US3 (Magic Items) and US4 (Vault Inheritance & Public) depend on foundational mappers.
- **Polish (Phase 7)**: Depends on all user stories being complete.

### Parallel Opportunities

- T003 (types extension), T005 (stat sheet mapper), T006 (mapper tests) can run in parallel.
- T008 (US1 tests) and T013 (US2 tests) can be written concurrently.
- T018 (US3 tests) and T022 (US4 tests) can be written concurrently.
- T026 (documentation) and T028 (offline fallback check) can run in parallel during polish.
