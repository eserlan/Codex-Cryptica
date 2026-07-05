# Tasks: Language Generator

**Input**: Design documents from `/specs/141-language-generator/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Follow standard TDD patterns by creating test units first.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Add `"language"` to `GeneratorId` union type and `SUPPORTED_GENERATOR_IDS` array in [campaign-generator-types.ts](file:///home/espen/proj/remotecodexarcana/packages/generator-engine/src/campaign-generator-types.ts)
- [ ] T002 Map generator ID `"language"` to entity type `"note"` in `GENERATOR_ENTITY_TYPE` within [campaign-generator-registry.ts](file:///home/espen/proj/remotecodexarcana/packages/generator-engine/src/campaign-generator-registry.ts)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Create `public-language.ts` file containing configuration options, prompt blocks, and interface definitions in [public-language.ts](file:///home/espen/proj/remotecodexarcana/packages/generator-engine/src/public-language.ts)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Generate a campaign-ready fictional language profile (Priority: P1) 🎯 MVP

**Goal**: Establish base generation (AI prompt generation & local fallback generation) and register the generator definition.

**Independent Test**: Run unit tests for prompt building, fallback syllable combiner, and JSON parser outputs.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T004 [P] [US1] Create unit tests for prompt formatting and local syllable generation in [public-language.test.ts](file:///home/espen/proj/remotecodexarcana/packages/generator-engine/src/public-language.test.ts)

### Implementation for User Story 1

- [ ] T005 [US1] Implement `buildLanguagePrompt` to build raw AI prompts incorporating options and name constraints in [public-language.ts](file:///home/espen/proj/remotecodexarcana/packages/generator-engine/src/public-language.ts)
- [ ] T006 [US1] Implement `generateLanguageLocal` fallback engine using a lightweight genre-specific syllable combiner in [public-language.ts](file:///home/espen/proj/remotecodexarcana/packages/generator-engine/src/public-language.ts)
- [ ] T007 [US1] Implement `parseLanguageResponse` to parse structured JSON outputs in [public-language.ts](file:///home/espen/proj/remotecodexarcana/packages/generator-engine/src/public-language.ts)
- [ ] T008 [US1] Register `language` definition in `getGenerator` registry helper within [campaign-generator-registry.ts](file:///home/espen/proj/remotecodexarcana/packages/generator-engine/src/campaign-generator-registry.ts)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Save language draft to Campaign Vault (Priority: P1)

**Goal**: Review draft language outputs and persist them as standard Notes with YAML metadata `kind: "language"`.

**Independent Test**: Verify that saving a generated draft correctly creates a note file in the vault with the right metadata labels and frontmatter.

### Implementation for User Story 2

- [ ] T009 [P] [US2] Implement `adaptLanguage` mapper in [public-generator-adapters.ts](file:///home/espen/proj/remotecodexarcana/packages/generator-engine/src/public-generator-adapters.ts)
- [ ] T010 [US2] Update save draft and relationship linkage handlers to persist frontmatter `kind: "language"` in [CampaignGeneratorModal.svelte](file:///home/espen/proj/remotecodexarcana/apps/web/src/lib/components/generators/CampaignGeneratorModal.svelte)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Reuse language profile context in other generators (Priority: P2)

**Goal**: Provide context parameters in prompt engines to reference saved language entities and customize naming conventions.

**Independent Test**: Select a saved language in the NPC generator options, verify generated prompt contains the syllables and conventions of that language.

### Implementation for User Story 3

- [ ] T011 [US3] Implement search filter to scan for vault entities containing `kind: "language"` in [campaign-generator-service.ts](file:///home/espen/proj/remotecodexarcana/packages/generator-engine/src/campaign-generator-service.ts)
- [ ] T012 [US3] Update prompt builder in [public-npc.ts](file:///home/espen/proj/remotecodexarcana/packages/generator-engine/src/public-npc.ts) to inject the custom language naming conventions if selected by the user.

**Checkpoint**: User stories 1, 2, and 3 should now be functional

---

## Phase 6: User Story 4 - Public Marketing Tool Page (Priority: P2)

**Goal**: Create a web page at `/generators/language-generator` showcasing the public generator.

**Independent Test**: Load the marketing tool page, fill parameters, run using the guest AI proxy, and verify preview output.

### Implementation for User Story 4

- [ ] T013 [P] [US4] Configure SEO data and metadata options in [seo-pages.ts](file:///home/espen/proj/remotecodexarcana/apps/web/src/lib/config/seo-pages.ts)
- [ ] T014 [US4] Add public route mapping in [GeneratorSwitcherMenu.svelte](file:///home/espen/proj/remotecodexarcana/apps/web/src/lib/components/seo/GeneratorSwitcherMenu.svelte) and custom component controls.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T015 [P] Add user-facing help documentation in [help-content.ts](file:///home/espen/proj/remotecodexarcana/apps/web/src/lib/config/help-content.ts)
- [ ] T016 Run linting and test suite verification with `bun run lint` and `bun run test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete
