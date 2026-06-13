# Tasks: In-App RPG Generators

**Input**: Design documents from `/specs/130-in-app-rpg-generators/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/generator-workflow.md](./contracts/generator-workflow.md), [quickstart.md](./quickstart.md)

**Tests**: Required by project constitution. Write tests before implementation for each changed behavior, including success and failure/cancellation paths.

**Organization**: Tasks are grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or has no dependency on incomplete tasks
- **[Story]**: Maps to a user story from [spec.md](./spec.md)
- Every task includes concrete file paths

## Issue Mapping

- Master: [#1129](https://github.com/eserlan/Codex-Cryptica/issues/1129)
- Use the master issue as the single GitHub tracker. Phase issues were closed in favor of this Speckit task list.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare feature directories and establish baseline references.

- [ ] T001 Create generator package skeleton files in packages/generator-engine and feature directories in packages/generator-engine/src, apps/web/src/lib/components/generators, and apps/web/src/lib/services/generators
- [ ] T002 [P] Review existing generator engine baseline tests in apps/web/src/lib/services/seo/generator-engine.test.ts
- [ ] T003 [P] Review existing direct entity creation patterns in apps/web/src/lib/components/modals/MobileCreateEntitySheet.svelte
- [ ] T004 [P] Review existing related entity generation patterns in apps/web/src/lib/components/entity-detail/RelatedEntityModal.svelte

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core generator contract, service boundary, and modal state needed by all user stories.

**Critical**: No user story implementation should start until this phase is complete.

- [ ] T005 [P] Add failing registry contract tests for supported and unsupported generator ids in packages/generator-engine/src/campaign-generator-registry.test.ts
- [ ] T006 [P] Add failing draft mapping tests for title, entity type, content, lore, and labels in packages/generator-engine/src/campaign-generator-registry.test.ts
- [ ] T007 [P] Add failing generator service tests for generate-draft success and unsupported generator failure in packages/generator-engine/src/campaign-generator-service.test.ts
- [ ] T008 [P] Add failing modal UI store tests for open/close generator workflow state in apps/web/src/lib/stores/ui/modal-ui.svelte.test.ts
- [ ] T009 Define generator ids, option definitions, vault context packet, draft, run request, save request, and result types in packages/generator-engine/src/campaign-generator-types.ts
- [ ] T010 Implement campaign generator registry for NPC, Faction, Settlement, and Magic Item in packages/generator-engine/src/campaign-generator-registry.ts
- [ ] T011 Implement campaign generator service constructor DI and draft generation orchestration in packages/generator-engine/src/campaign-generator-service.ts
- [ ] T012 Export package public APIs and a default campaign generator service singleton in packages/generator-engine/src/index.ts and packages/generator-engine/src/campaign-generator-service.ts
- [ ] T013 Add generator workflow state and open/close methods to apps/web/src/lib/stores/ui/modal-ui.svelte.ts
- [ ] T014 Create a minimal lazy-loadable CampaignGeneratorModal stub in apps/web/src/lib/components/generators/CampaignGeneratorModal.svelte and wire it through apps/web/src/lib/components/modals/GlobalModalProvider.svelte
- [ ] T015 Run foundational package and store tests listed in specs/130-in-app-rpg-generators/quickstart.md

**Checkpoint**: Registry lookup, draft mapping, service orchestration, and modal state are test-covered and ready for UI stories.

---

## Phase 3: User Story 1 - Generate And Save A Campaign Entity (Priority: P1)

**Goal**: A Game Master can open the in-app generator, configure a supported generator, review/edit the draft, and save it directly into the active campaign.

**Independent Test**: Open a writable campaign, generate one supported entity, edit the draft, save it, and confirm the created entity contains reviewed title, type, content, lore, and labels.

### Tests for User Story 1

- [ ] T016 [P] [US1] Add failing service tests for successful draft save and saved entity result in packages/generator-engine/src/campaign-generator-service.test.ts
- [ ] T017 [P] [US1] Add failing service tests for save failure preserving draft state, guest/read-only/unavailable campaign blocked saves, and no localStorage transfer in packages/generator-engine/src/campaign-generator-service.test.ts
- [ ] T018 [P] [US1] Add failing component test for generator selection and configuration form rendering in apps/web/src/lib/components/generators/CampaignGeneratorModal.test.ts
- [ ] T019 [P] [US1] Add failing component test for draft review editing and explicit save in apps/web/src/lib/components/generators/CampaignGeneratorModal.test.ts
- [ ] T020 [P] [US1] Add failing component test for cancel/close leaving campaign data unchanged in apps/web/src/lib/components/generators/CampaignGeneratorModal.test.ts

### Implementation for User Story 1

- [ ] T021 [US1] Implement direct draft save through injected vault creation dependency in packages/generator-engine/src/campaign-generator-service.ts
- [ ] T022 [US1] Implement required field validation, user-safe save errors, and blocked-write handling in packages/generator-engine/src/campaign-generator-service.ts
- [ ] T023 [US1] Implement CampaignGeneratorModal shell with configure, generating, review, saving, and error stages in apps/web/src/lib/components/generators/CampaignGeneratorModal.svelte
- [ ] T024 [US1] Implement semantic generator option form with visible labels and native submit behavior in apps/web/src/lib/components/generators/GeneratorConfigForm.svelte
- [ ] T025 [US1] Implement editable draft review form for title, entity type, summary/content, lore, and labels in apps/web/src/lib/components/generators/GeneratorDraftReview.svelte
- [ ] T026 [US1] Connect CampaignGeneratorModal to campaignGeneratorService and modalUIStore in apps/web/src/lib/components/generators/CampaignGeneratorModal.svelte
- [ ] T027 [US1] Add a campaign workspace generator entry point near existing create actions in apps/web/src/lib/components/layout/VaultControls.svelte
- [ ] T028 [US1] Add a mobile generator entry point near mobile create actions in apps/web/src/lib/components/modals/MobileCreateEntitySheet.svelte
- [ ] T029 [US1] Ensure successful save selects or opens the new entity using existing vault selection behavior in apps/web/src/lib/components/generators/CampaignGeneratorModal.svelte
- [ ] T030 [US1] Run User Story 1 tests listed in specs/130-in-app-rpg-generators/quickstart.md

**Checkpoint**: User Story 1 is a complete MVP and can be demoed independently.

---

## Phase 4: User Story 2 - Generate Without AI When Needed (Priority: P2)

**Goal**: The in-app generators remain usable when AI is disabled, unavailable, or not allowed.

**Independent Test**: Disable AI features and generate each supported entity type, confirming reviewable drafts are produced without AI.

### Tests for User Story 2

- [ ] T031 [P] [US2] Add failing service tests proving NPC, Faction, Settlement, and Magic Item generate drafts with useAI false in packages/generator-engine/src/campaign-generator-service.test.ts
- [ ] T032 [P] [US2] Add failing service tests for AI-disabled policy forcing non-AI generation and AI context minimization excluding full vault contents and direct vault store access in packages/generator-engine/src/campaign-generator-service.test.ts
- [ ] T033 [P] [US2] Add failing component test for AI unavailable messaging without blocking non-AI generation in apps/web/src/lib/components/generators/CampaignGeneratorModal.test.ts

### Implementation for User Story 2

- [ ] T034 [US2] Add AI policy inputs, local fallback enforcement, and explicit minimal AI context packet consumption to packages/generator-engine/src/campaign-generator-service.ts
- [ ] T035 [US2] Add per-generator non-AI option defaults to packages/generator-engine/src/campaign-generator-registry.ts
- [ ] T036 [US2] Add AI-disabled and AI-unavailable explanatory UI copy to apps/web/src/lib/components/generators/GeneratorConfigForm.svelte
- [ ] T037 [US2] Ensure draft generation never mutates vault data before save in packages/generator-engine/src/campaign-generator-service.ts
- [ ] T038 [US2] Run User Story 2 tests listed in specs/130-in-app-rpg-generators/quickstart.md

**Checkpoint**: User Stories 1 and 2 work independently and preserve local-first behavior.

---

## Phase 5: User Story 3 - Use Campaign Theme And Context (Priority: P3)

**Goal**: Generator defaults reflect the active campaign theme and contextual launches can create a relationship back to the source entity.

**Independent Test**: Change active theme, confirm defaults change and remain editable, launch from a source entity, save a draft with relationship enabled, and confirm the relationship exists.

### Tests for User Story 3

- [ ] T039 [P] [US3] Add failing theme mapping tests for gothic/noir, cyberpunk, fantasy, and neutral fallback in packages/generator-engine/src/campaign-generator-theme.test.ts
- [ ] T040 [P] [US3] Add failing service test proving user-edited options override theme-derived defaults in packages/generator-engine/src/campaign-generator-service.test.ts
- [ ] T041 [P] [US3] Add failing service test for source relationship creation after successful entity save in packages/generator-engine/src/campaign-generator-service.test.ts
- [ ] T042 [P] [US3] Add failing tests for bounded vault context packet building, contextual launch from an existing entity, and existing Generate Related entry points opening the unified workflow in apps/web/src/lib/services/generators/generator-vault-context.test.ts, apps/web/src/lib/components/generators/CampaignGeneratorModal.test.ts, apps/web/src/lib/components/entity-detail/DetailStatusTab.test.ts, and apps/web/src/lib/components/zen/ZenContent.related.test.ts

### Implementation for User Story 3

- [ ] T043 [US3] Implement theme-to-generator default mapping in packages/generator-engine/src/campaign-generator-theme.ts
- [ ] T044 [US3] Apply theme defaults while preserving user overrides in packages/generator-engine/src/campaign-generator-service.ts
- [ ] T045 [US3] Add sourceEntityId, relationship label, launchMode, and included context summary handling to modal state in apps/web/src/lib/stores/ui/modal-ui.svelte.ts
- [ ] T046 [US3] Add optional source relationship save through injected vault connection dependency in packages/generator-engine/src/campaign-generator-service.ts
- [ ] T047 [US3] Implement bounded vault context packet builder with theme, category, template, source excerpt, capped neighbors, title hints, and label suggestions in apps/web/src/lib/services/generators/generator-vault-context.ts
- [ ] T048 [US3] Route the existing Generate Related action in apps/web/src/lib/components/entity-detail/DetailStatusTab.svelte and apps/web/src/lib/components/zen/ZenContent.svelte to the unified generator workflow with sourceEntityId context
- [ ] T049 [US3] Add relationship review controls and inspectable context controls to apps/web/src/lib/components/generators/GeneratorDraftReview.svelte and apps/web/src/lib/components/generators/GeneratorContextReview.svelte
- [ ] T050 [US3] Retire apps/web/src/lib/components/entity-detail/RelatedEntityModal.svelte or reduce it to a compatibility wrapper after unified contextual generation parity is covered
- [ ] T051 [US3] Run User Story 3 tests listed in specs/130-in-app-rpg-generators/quickstart.md

**Checkpoint**: User Stories 1, 2, and 3 work independently, with theme defaults and optional contextual relationships.

---

## Phase 6: User Story 4 - Keep Public Generators On The Shared Engine (Priority: P4)

**Goal**: Existing public generator pages keep their routes and public behavior while delegating supported generator logic to `packages/generator-engine`.

**Independent Test**: Run public NPC, Faction, Settlement, and Magic Item generator flows and confirm they complete through package-backed generation without route or SEO behavior regressions.

### Tests for User Story 4

- [ ] T052 [P] [US4] Add failing public adapter parity tests for NPC, Faction, Settlement, and Magic Item supported outputs in packages/generator-engine/src/public-generator-adapters.test.ts
- [ ] T053 [P] [US4] Add failing regression test proving public generator routes complete supported generation through package-backed adapters in apps/web/src/routes/(marketing)/generators/[slug]/generators.test.ts
- [ ] T054 [P] [US4] Add failing regression test preserving public generator route slugs and SEO/discovery metadata in apps/web/src/routes/(marketing)/generators/[slug]/generators.test.ts

### Implementation for User Story 4

- [ ] T055 [US4] Implement package-owned public generator adapters for existing public page inputs in packages/generator-engine/src/public-generator-adapters.ts
- [ ] T056 [US4] Update apps/web/src/lib/services/seo/generator-engine.ts to delegate supported NPC, Faction, Settlement, and Magic Item logic to packages/generator-engine
- [ ] T057 [US4] Update apps/web/src/routes/(marketing)/generators/[slug]/+page.svelte only as needed to consume package-backed generator results without route or layout changes
- [ ] T058 [US4] Preserve existing public page copy, route slugs, SEO metadata, and primary generation behavior in apps/web/src/routes/(marketing)/generators/[slug]/+page.svelte
- [ ] T059 [US4] Run public generator transition tests listed in specs/130-in-app-rpg-generators/quickstart.md

**Checkpoint**: Public generator pages and the in-app workflow share package-owned logic for supported generator behavior.

---

## Phase 7: User Story 5 - Understand And Discover The Workflow (Priority: P5)

**Goal**: Users can discover the generator workflow and understand review-before-save, privacy, and AI behavior.

**Independent Test**: Open help/guidance, follow the described steps, generate a draft, and save it without external instructions.

### Tests for User Story 5

- [ ] T060 [P] [US5] Add failing help content registration test for in-app generators in apps/web/src/lib/stores/help.test.ts
- [ ] T061 [P] [US5] Add failing feature hint config test for in-app generators in apps/web/src/lib/config/help-content.test.ts

### Implementation for User Story 5

- [ ] T062 [US5] Add in-app generator help article in apps/web/src/lib/content/help/in-app-generators.md
- [ ] T063 [US5] Register in-app generator help article and optional feature hint in apps/web/src/lib/config/help-content.ts
- [ ] T064 [US5] Add first-use FeatureHint placement near the generator entry point in apps/web/src/lib/components/layout/VaultControls.svelte
- [ ] T065 [US5] Run User Story 5 tests listed in specs/130-in-app-rpg-generators/quickstart.md

**Checkpoint**: Users have discoverable, plain-language guidance for the full workflow.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Regression checks, accessibility review, and release readiness across all stories.

- [ ] T066 [P] Verify public generator route tests still pass in apps/web/src/routes/(marketing)/generators/[slug]/generators.test.ts
- [ ] T067 [P] Verify existing Generate Related entry point tests pass or are migrated from apps/web/src/lib/components/entity-detail/RelatedEntityModal.test.ts to unified generator workflow coverage
- [ ] T068 [P] Verify generator engine regression tests still pass in apps/web/src/lib/services/seo/generator-engine.test.ts
- [ ] T069 [P] Run accessibility-focused keyboard and form review against apps/web/src/lib/components/generators/CampaignGeneratorModal.svelte
- [ ] T070 [P] Add user-facing changelog entry only if shipping the visible workflow in apps/web/src/lib/content/changelog/releases.json
- [ ] T071 Run full validation commands from specs/130-in-app-rpg-generators/quickstart.md
- [ ] T072 Update master issue progress notes from completed implementation tasks in specs/130-in-app-rpg-generators/tasks.md
- [ ] T073 Validate guided usability criteria SC-001 and SC-004 with a documented manual smoke result in specs/130-in-app-rpg-generators/quickstart.md
- [ ] T074 Validate modal-open and non-AI generation timing against plan performance goals or document justified deviation in specs/130-in-app-rpg-generators/quickstart.md
- [ ] T075 Validate SC-009 and SC-010 by confirming all existing Generate Related entry points open the unified generator workflow with source entity context, context categories are inspectable before AI generation, full vault contents are excluded, and no standalone related modal is required

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational and delivers the MVP.
- **US2 (Phase 4)**: Depends on Foundational; can run after or alongside US1 once service contracts are stable.
- **US3 (Phase 5)**: Depends on Foundational and benefits from US1 save/review implementation.
- **US4 (Phase 6)**: Depends on package contracts and can run after package registry/adapters stabilize.
- **US5 (Phase 7)**: Depends on visible entry points from US1 and can complete after UI labels stabilize.
- **Polish (Phase 8)**: Depends on all desired user stories.

### User Story Dependencies

- **US1 Generate And Save A Campaign Entity**: MVP; no dependency on other user stories after Foundational.
- **US2 Generate Without AI When Needed**: Depends on generator service contracts; does not require US3, US4, or US5.
- **US3 Use Campaign Theme And Context**: Depends on service contracts and direct save behavior from US1.
- **US4 Keep Public Generators On The Shared Engine**: Depends on package contracts and protects public generator behavior during transition.
- **US5 Understand And Discover The Workflow**: Depends on final user-facing entry points and copy.

### Within Each User Story

- Write tests first and confirm they fail before implementation.
- Implement shared types before registry/service logic.
- Implement registry/service logic before UI integration.
- Implement UI shell before entry points.
- Implement save behavior before relationship creation.
- Migrate public generator consumers only after package adapters are tested.
- Run story-specific tests before proceeding to the next priority story.

## Parallel Opportunities

- T002, T003, and T004 can run in parallel during setup.
- T005, T006, T007, and T008 can run in parallel because they target different test scopes.
- US1 component tests T018, T019, and T020 can run in parallel after modal test setup exists.
- US2 tests T031, T032, and T033 can run in parallel.
- US3 tests T039, T040, T041, and T042 can run in parallel.
- US4 tests T052, T053, and T054 can run in parallel.
- US5 tests T060 and T061 can run in parallel.
- Polish regression checks T066, T067, T068, T069, and T070 can run in parallel.

## Parallel Example: User Story 1

```text
Task: "Add failing component test for generator selection and configuration form rendering in apps/web/src/lib/components/generators/CampaignGeneratorModal.test.ts"
Task: "Add failing component test for draft review editing and explicit save in apps/web/src/lib/components/generators/CampaignGeneratorModal.test.ts"
Task: "Add failing component test for cancel/close leaving campaign data unchanged in apps/web/src/lib/components/generators/CampaignGeneratorModal.test.ts"
```

## Parallel Example: User Story 3

```text
Task: "Add failing theme mapping tests for gothic/noir, cyberpunk, fantasy, and neutral fallback in packages/generator-engine/src/campaign-generator-theme.test.ts"
Task: "Add failing service test proving user-edited options override theme-derived defaults in packages/generator-engine/src/campaign-generator-service.test.ts"
Task: "Add failing service test for source relationship creation after successful entity save in packages/generator-engine/src/campaign-generator-service.test.ts"
```

## Parallel Example: User Story 4

```text
Task: "Add failing public adapter parity tests for NPC, Faction, Settlement, and Magic Item supported outputs in packages/generator-engine/src/public-generator-adapters.test.ts"
Task: "Add failing regression test proving public generator routes complete supported generation through package-backed adapters in apps/web/src/routes/(marketing)/generators/[slug]/generators.test.ts"
Task: "Add failing regression test preserving public generator route slugs and SEO/discovery metadata in apps/web/src/routes/(marketing)/generators/[slug]/generators.test.ts"
```

## Implementation Strategy

### MVP First (US1)

1. Complete Setup and Foundational phases.
2. Complete US1 to support configure, generate, review, and direct save for supported generators.
3. Validate US1 independently with service and component tests.
4. Demo US1 before extending AI policy, theme/context, Generate Related migration, public-page migration, or docs.

### Incremental Delivery

1. US1: Native workflow and direct vault save.
2. US2: Robust non-AI behavior and policy messaging.
3. US3: Theme defaults, contextual relationships, and Generate Related migration.
4. US4: Public generator transition to shared package logic.
5. US5: Help content and first-use guidance.
6. Polish: related generation regressions, accessibility pass, public route regressions, and full validation.

### TDD Enforcement

- Each story includes explicit failing test tasks before implementation tasks.
- Do not mark a story checkpoint complete until both success and failure/cancellation paths pass.
- If a task changes behavior outside its story scope, add or update tests in the affected file before implementation.

## Notes

- Use Svelte 5 runes for all Svelte components and `.svelte.ts` stores.
- Use Tailwind 4 semantic tokens and Iconify utility classes only.
- Keep app chrome neutral; world-theme styling belongs inside campaign content surfaces.
- Keep generator contracts, registry, theme defaults, AI policy, draft mapping, public-page adapters, and save orchestration in `packages/generator-engine`.
- Treat existing Generate Related buttons as contextual entry points into the unified generator workflow, not as a separate long-term modal.
- Build vault context packets in the web app layer and pass only bounded plain data into `packages/generator-engine`.
- Do not introduce `localStorage` as a generator import bridge.
- Preserve public generator routes, SEO/discovery behavior, and primary public generation flows.
- Preserve "Labels" terminology in all user-facing text.
- Commit after each completed story or logical group.
