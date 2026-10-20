---
description: "Task list for the Business / Enterprise Generator"
---

# Tasks: Business / Enterprise Generator

**Input**: Design documents from `/specs/180-business-enterprise-generator/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/business-api.md](./contracts/business-api.md), [quickstart.md](./quickstart.md)

**Tests**: Required for every behaviour change (Constitution II). Each test task covers the success path and at least one failure, cancellation or negative path, and is written before its implementation task.

**Paths**:

- `GE` = `packages/generator-engine/src`
- `WEB` = `apps/web/src`

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Add `"business"` to `GeneratorId` and to the generator id list, and add the `business?: BusinessDocument` field to both `GeneratorOutput` and `GeneratedDraft`, in `GE/campaign-generator-types.ts`.
- [ ] T002 [P] Add the step ids `"identity" | "connections" | "trouble"` to `StagedStepId` in `GE/staged-progress.ts`.
- [ ] T003 [P] Add `"business"` to `VALID_GENERATOR_SLUGS` in `WEB/params/generator_slug.ts`.

---

## Phase 2: Foundational (blocks every story)

- [ ] T004 [P] Write `GE/business-state.test.ts`.
  - `renderBusinessContent` and `renderBusinessLore` render every section in FR-003 order.
  - The management heading appears only when `management` is set.
  - An empty optional `clientele.excluded` is omitted, not rendered as blank.
- [ ] T005 Implement `GE/business-state.ts`:
  - the `BusinessDocument`, `BusinessPerson`, `BusinessDependency`, `BusinessRelationship`, `BusinessManagement` and `BusinessSectionId` types, exactly as in `contracts/business-api.md`;
  - `renderBusinessContent` and `renderBusinessLore`;
  - `businessToOutput(doc)`, which returns `PublicGeneratorOutput` with `type: "faction"`, `labels: ["business", genre]` and `business: doc`.
- [ ] T006 [P] Write `GE/business-tables.test.ts`.
  - `BUSINESS_TYPES` covers fantasy, sci-fi / space opera, cyberpunk, modern, horror, western and pirate, and includes every type #3627 lists for fantasy, sci-fi and cyberpunk.
  - No genre list is empty.
  - Every section table has at least 6 entries per genre group.
  - No table entry contains a price pattern.
- [ ] T007 Implement `GE/business-tables.ts` (data only). It holds:
  - `BUSINESS_TYPES` (the first entry in each list is the reset default);
  - per-genre tables for every section;
  - staff roles;
  - dependency kinds;
  - relationship kinds, each mapped to its FR-011 label;
  - reputation words;
  - the pressure, asset, secret, opportunity and complication pools;
  - the management pools.

  The secret pool must contain non-criminal secrets, tagged so legitimate businesses can draw only from those.

- [ ] T008 [P] Write `GE/business-checks.test.ts`. There is one passing case and one failing case for each code:
  - `missing`
  - `hook-unanchored` ("a hook that names no person, relationship name, dependency input, or asset/pressure/secret keyword")
  - `legit-secret-criminal`
  - `staff-count` ("tiny 0–1, small 1–2, established 2–3, regional and major 3–4")
  - `inventory-list` ("more than 6 list items, or a price pattern")
  - `management-mismatch`

  The test also checks that `repairBusiness` returns a document with 0 issues and changes only the failing sections.

- [ ] T009 Implement `checkBusiness` and `repairBusiness` in `GE/business-checks.ts`. A replacement hook must be built from this document's own pressure, dependency or a named person, so that it passes the anchor check. A generic table hook would not.

**Checkpoint**: The document, tables and checks exist, and the stories can start.

---

## Phase 3: User Story 1 - Generate a playable business (Priority: P1) 🎯 MVP

**Goal**: A complete business in every genre, from local tables or from AI with progress and per-stage fallback, on both surfaces.

**Independent Test**: Generate with AI off and on in three genres. Every section is present, the type fits the genre, and the hooks tie back to the business.

- [ ] T010 [P] [US1] Write `GE/business-local.test.ts`.
  - For every genre × every type in `BUSINESS_TYPES`, at three seeds each, `generateBusinessLocal` returns a document with `checkBusiness(doc).length === 0` and `fallbackSections` empty (SC-001).
  - `resolveBusinessOptions` uses the defaults scale `small`, legitimacy `legitimate`, wealth `modest`, tone `grounded`.
  - Switching to a genre whose list lacks the current type resets the type to that genre's first type, while a custom type is kept.
  - Campaign context is trimmed to the generator context limit.
  - A local generation completes well within the 200 ms budget (SC-003), as an average over 20 runs, with a generous CI margin.
- [ ] T011 [US1] Implement `resolveBusinessOptions` and `generateBusinessLocal` in `GE/business-local.ts`, building every section from `business-tables.ts` so the output passes the checks by construction.
- [ ] T012 [P] [US1] Write `GE/public-business.test.ts`:
  - each stage prompt includes the genre, type and options, and campaign context when present;
  - `parseBusinessStage` returns `null` for missing or unusable JSON and maps valid JSON onto the document sections;
  - the campaign adapter carries `business` through.
- [ ] T013 [US1] Implement `GE/public-business.ts`:
  - `businessConfig`, which holds the field definitions for the light inputs (FR-002), with only genre and type required;
  - the three stage prompts;
  - `parseBusinessStage`;
  - the public and campaign adapters.
- [ ] T014 [P] [US1] Write `GE/business-staged.test.ts`:
  - three `send` turns on one session report progress `identity → connections → trouble`, and the result has 0 issues;
  - a stage that returns unusable JSON twice falls back to local for that stage's sections only, and lists them in `fallbackSections`;
  - an AI hook with no anchor is repaired;
  - an abort rejects with an AbortError and doesn't fall back.
- [ ] T015 [US1] Implement `generateBusinessStaged` in `GE/business-staged.ts`, using `askChecked`, `StagedProgress`, the per-stage checks and `repairBusiness`.
- [ ] T016 [P] [US1] Extend `GE/campaign-generator-service.test.ts` (or add `GE/campaign-business-generation.test.ts`):
  - the in-app AI run with a mocked chat produces `draft.business`;
  - with AI policy disabled, local generation is used and no gateway call is made (FR-014);
  - `business` appears in an in-app generator category (`WEB/lib/components/generators/generator-categories.test.ts`).
- [ ] T017 [US1] Register the `business` definition (label, description, fields, `defaultEntityType: "faction"`) in `GE/campaign-generator-registry.ts`. Add `case "business"` in `GE/campaign-generator-service-ai.ts`, which calls `generateBusinessStaged` through `startChat`, falls back to local when there is no chat session, and calls `businessToOutput`. Add `"business"` to the non-simple list in `GE/campaign-generator-service-core.ts`, and add the business passthrough in `GE/campaign-generator-service-persistence.ts`. Export the public API from `GE/index.ts`. Add `business` to the right category (alongside settlement and faction) in `WEB/lib/components/generators/generator-categories.ts`, so it shows in the in-app generator hub (FR-001).
- [ ] T018 [P] [US1] Write `WEB/lib/components/seo/fields/BusinessFormFields.test.ts`. The type list follows the genre (cyberpunk shows a ripper clinic and no blacksmith), a custom type is accepted, and only genre and type are required.
- [ ] T019 [US1] Implement `WEB/lib/components/seo/fields/BusinessFormFields.svelte` and mount it in `WEB/lib/components/seo/GeneratorPageFormFields.svelte`.
- [ ] T020 [P] [US1] Extend `WEB/lib/services/seo/generator-engine.test.ts`:
  - `generateBusiness({ useAI: false })` returns a complete business;
  - an AI failure returns the local business with `aiFallback: true` and a note naming the fallback sections (FR-006);
  - `regenerateBusinessSection` on the facade delegates to the engine and passes `useAI` and the instruction (covers T029).
- [ ] T021 [US1] Wire the public engine. Add the business config in `WEB/lib/services/seo/generator-config.ts`, add `generateBusiness` (local or staged by `useAI`) in `WEB/lib/services/seo/generator-engine-specialized.ts`, and expose it through `WEB/lib/services/seo/generator-engine-core.ts`. Add a business idea in `WEB/lib/services/seo/random-idea.ts`, add an entry in `WEB/lib/seo/llms-generators.ts`, and add the generator to `WEB/lib/config/feature-groups.ts`.
- [ ] T022 [US1] Write `WEB/lib/components/seo/BusinessFallbackNote.test.ts` first: the note lists the fallback sections in plain words, and renders nothing when `fallbackSections` is empty. Then show the fallback-sections note in the public output card, and in the in-app draft review when `business.fallbackSections` isn't empty. Do this in `WEB/lib/components/seo/GeneratorPageContent.svelte` and `WEB/lib/components/generators/GeneratorDraftReview.svelte`, as a one-line mount of a small `BusinessFallbackNote.svelte`.
- [ ] T023 [US1] Write the help article `WEB/lib/content/help/business-generator.md` (what it makes, inputs, AI and offline behaviour, AI Disabled), and register it in `WEB/lib/config/help-content.ts`.

**Checkpoint**: The MVP works. A business can be generated on both surfaces and saved through the existing generic save as a single Faction.

---

## Phase 4: User Story 2 - Players own this business (Priority: P2)

**Goal**: With the toggle on, leadership becomes a manager, and a management section appears with no prices.

**Independent Test**: Generate the same type with the toggle off and on, and compare.

- [ ] T024 [P] [US2] Extend `GE/business-local.test.ts` and `GE/business-staged.test.ts`. With `playersOwn` on:
  - `leadership.role === "manager"`;
  - `management` has "strengths[2..3], liabilities[2..3], upgrades[>=1], obligations[>=1], successAttracts[>=1]";
  - no obligation matches a price pattern.

  With it off, there is no `management` and leadership is the owner. An AI reply that adds management while the toggle is off is caught by `management-mismatch` and repaired.

- [ ] T025 [US2] Implement the players-own branch in `GE/business-local.ts`, in the trouble-stage prompt and parse in `GE/public-business.ts`, and in the leadership prompt wording (a manager the party employs).
- [ ] T026 [US2] Add the **Players own this business** toggle to `BusinessFormFields.svelte`, with a test in `BusinessFormFields.test.ts`. Update `business-generator.md` with the players-own section.

---

## Phase 5: User Story 3 - Refine one part without losing the rest (Priority: P2)

**Goal**: Regenerate one section, optionally with a steer, on both surfaces. A renamed person is replaced elsewhere.

**Independent Test**: Regenerate the pressure with a steer and only the pressure changes. Regenerate the owner and the hooks pick up the new name.

- [ ] T027 [P] [US3] Write `GE/business-regenerate.test.ts`:
  - for each `BusinessSectionId`, local regeneration changes only that section, and the result has 0 issues;
  - the AI path sends the instruction and section context;
  - an unusable AI reply falls back to local with a warning;
  - an abort leaves the document unchanged and rejects;
  - with `propagateRename`, the old name in a hook and the secret becomes the new name, whole words only, so "Mara" doesn't match "Maralyn", and all other wording is unchanged (SC-005).
- [ ] T028 [US3] Implement `regenerateBusinessSection` and `propagateRename` in `GE/business-regenerate.ts`, and export them from `GE/index.ts`.
- [ ] T029 [US3] Expose `regenerateBusinessSection` through `WEB/lib/services/seo/generator-engine-core.ts`, using the gateway's chat for AI. Its test is in T020; add the case there before this task if T020 is already done.
- [ ] T030 [P] [US3] Write `WEB/lib/components/seo/BusinessRefinePanel.test.ts`:
  - lists every section and each staff member;
  - runs one regeneration at a time;
  - shows "Everything else is unchanged" and, when relevant, "Renamed X to Y in other sections";
  - a newer generation arriving mid-request isn't overwritten;
  - a failure shows "Nothing was changed";
  - the steer box is hidden when AI is off.
- [ ] T031 [US3] Implement `WEB/lib/components/seo/BusinessRefinePanel.svelte`, following the `OneShotRefinePanel` pattern. Mount it in `WEB/lib/components/seo/GeneratorPageContent.svelte` and `WEB/lib/components/generators/GeneratorDraftReview.svelte` (both surfaces, per R5).
- [ ] T032 [US3] Add a "Refine one part" section to `business-generator.md`.

---

## Phase 6: User Story 4 - Save the business into the campaign (Priority: P2)

**Goal**: An in-app save creates a Faction plus the ticked Characters, links matched or new outside parties, offers the source link, and rolls back on failure. The public page hands off the business and its people.

**Independent Test**: Save with a matched competitor and an unmatched supplier, then check the entities and connections. Force a connection failure and check nothing remains.

- [ ] T033 [P] [US4] Write `GE/business-save.test.ts` for `buildBusinessSavePlan`:
  - one Faction draft;
  - every person ticked, owner linked `owned by` and staff linked `employs`;
  - with `playersOwn`, the manager is linked `employs` and there is no `owned by`;
  - a party whose trimmed, lower-case name is in `existingTitles` becomes `match` and ticked, otherwise `create` and unticked, with `entityType` from `partyKind`;
  - source label options: Location → `located in`, Character → `owned by`, Faction → `protected by` or `contracted by`;
  - a party that matches the source entity isn't offered twice;
  - a person whose name matches an existing title is flagged for the name-collision notice.

  Also test `buildBusinessImportDrafts`: the business plus ticked people with `relationships` set, and no outside parties (R7).

- [ ] T034 [US4] Implement `buildBusinessSavePlan` and `buildBusinessImportDrafts` in `GE/business-save.ts`, and export them from `GE/index.ts`.
- [ ] T035 [P] [US4] Write `WEB/lib/services/generators/business-vault-save.test.ts`:
  - creates the Faction, ticked Characters and ticked new parties, then connections from the business with the FR-011 labels;
  - matched parties get a connection only, and their entity is never updated;
  - unticked people and parties create nothing;
  - when `addConnection` or `createEntity` throws midway, `bulkDelete` is called with every id created in this save, and the error is rethrown;
  - a cancelled save writes nothing.
- [ ] T036 [US4] Implement `saveBusinessToVault` in `WEB/lib/services/generators/business-vault-save.ts`.
- [ ] T037 [P] [US4] Write `WEB/lib/components/generators/BusinessSaveStep.test.ts`:
  - people are listed ticked;
  - matched parties show "Link to existing" ticked;
  - new parties show "Create new" unticked;
  - the name-collision notice offers rename or keep;
  - the source link label picker shows the right options for the source type;
  - Save passes the user's choices through.
- [ ] T038 [US4] Implement `WEB/lib/components/generators/BusinessSaveStep.svelte`, mount it in `GeneratorDraftReview.svelte` for business drafts, and delegate the business save in `WEB/lib/components/generators/CampaignGeneratorModal.svelte` to `saveBusinessToVault`. Write the case in `CampaignGeneratorModal.test.ts` first: a business draft calls the business save, and a save failure shows the error and keeps the modal open. Do this in the same way as the existing point-crawl branch: select the business afterwards and open it in the editor.
- [ ] T039 [US4] Send the business through `buildBusinessImportDrafts` in the public save handoff in `WEB/lib/components/seo/generator-save-flow.ts`, with a test in its existing test file.
- [ ] T040 [P] [US4] Write `WEB/lib/components/entity-detail/GenerateBusinessButton.test.ts`. The button renders for Location, Character and Faction entities only, and calls `openGeneratorWorkflowForEntity(id, "business")`.
- [ ] T041 [US4] Implement `WEB/lib/components/entity-detail/GenerateBusinessButton.svelte` and mount it in `WEB/lib/components/entity-detail/DetailStatusTab.svelte`.
- [ ] T042 [US4] Pre-fill the genre, location and campaign context from the source entity and its close connections (FR-009) in the business field defaults. Use the existing contextual vault-context path in `CampaignGeneratorModal.svelte` / `WEB/lib/services/generators/generator-vault-context.ts`. Add a test in `generator-vault-context.test.ts`: a Location source fills `location`, and with no source nothing is pre-filled.
- [ ] T043 [US4] Add a "What saving creates" section to `business-generator.md` (Faction, Characters, matched and new parties, source link; the public page saves the business and its people only).

---

## Phase 7: User Story 5 - Find it from search and other tools (Priority: P3)

**Goal**: A public, indexable `/generators/business` that owns its intent and is reachable from hubs and the related answers.

**Independent Test**: Visit the page logged out and generate, then run the discovery audit with 0 errors.

- [ ] T044 [US5] Add `generator-business` to `WEB/lib/content/discovery/entries/generators.ts`. Use the canonical path, primary intent, aliases, user job, unique value, cluster `settlement-creation`, related intents and the `acknowledgedOverlap` with `generator-tavern`, exactly as in research R9.
- [ ] T045 [P] [US5] Add a `relatedTools` link to `/generators/business` in `WEB/lib/content/answers/pages/how-do-i-run-a-campaign-where-the-players-own-a-business.ts` and `WEB/lib/content/answers/pages/how-do-i-turn-economic-pressures-into-rpg-adventure-hooks.ts`.
- [ ] T046 [US5] Add the page's intro, its difference from the tavern and social hub generators, FAQs and metadata wherever the existing generator pages define them (`generator-page-meta.ts` or the generator config). For the social preview, use the existing generator OG fallback. If a dedicated card is wanted, put it on R2 per the image rule, never in git. Check that it is listed on `/generators`, the genre hubs and `/tools`, and update `WEB/lib/seo/robots-policy.test.ts` or the hub tests if they enumerate slugs.
- [ ] T047 [US5] Run `bun scripts/discovery-audit.mjs` and fix any error. Record any overlap warning that is a judgement call with `acknowledgedOverlap`.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T048 Add the business generator to `WEB/lib/content/help/in-app-generators.md`. Run `bun scripts/sync-help-generators.ts` to regenerate `packages/help-engine/src/registry/generators.generated.ts`, then update the help-engine fixtures and expected ids and the `docs/help-assistant-coverage.md` row, until the help-engine tests pass.
- [ ] T049 [P] Add one user-facing entry to `WEB/lib/content/changelog/releases.json` (the generator, players-own mode, saving with people and links).
- [ ] T050 Check bundle impact: the business tables load only on the business route or generator, not in the main app chunk. Check the save step and refine panel for colour contrast.
- [ ] T051 Run the gates:
  - `bun scripts/lint-changed.mjs`
  - `bun scripts/test-changed.mjs`
  - scoped `svelte-check` in `apps/web` (0 errors)
  - `bun scripts/discovery-audit.mjs`
  - `bunx fallow audit --format json --quiet --explain --gate-marker agent` (verdict `pass`)
  - coverage of `GE/business-*.ts` over 80% (`bun test --coverage src/business-` in `packages/generator-engine`), per Constitution X
- [ ] T052 Run the `codex-review` specialist review on the branch, and address verified findings.
- [x] T054 Review follow-up (FR-016 to FR-018): operations `model`/`size`/`position`; established-facts block for later stages; unintroduced-name check with one retry and `warnings`; relationship labels validated against `BUSINESS_ALLOWED_LABELS`; warnings recomputed after a section rewrite.
- [ ] T053 Run the browser walkthrough in `quickstart.md` sections 3 and 4. Check SC-004: with default inputs, opening the generator to a saved business on the graph takes under 1 minute and 4 clicks.

---

## Dependencies & Execution Order

- **Setup (T001–T003)** comes first. T002 and T003 can run in parallel.
- **Foundational (T004–T009)** blocks every story. Tests come before implementation: T004 before T005, T006 before T007, T008 before T009.
- **US1 (T010–T023)** is the MVP and depends only on the foundational phase. Tests come before implementation: T010 before T011, T012 before T013, T014 before T015, T016 before T017, T018 before T019, T020 before T021, and the T022 test first.
- **US2 (T024–T026)** depends on US1's local generation (T011) and stages (T015).
- **US3 (T027–T032)** depends on US1. It is independent of US2 and US4.
- **US4 (T033–T043)** depends on US1. T037 and T038 need T034. T038 needs T036.
- **US5 (T044–T047)** depends on US1's public page (T019, T021).
- **Polish (T048–T053)** comes after the stories that are in scope.

## Parallel Examples

- **Foundational**: T004, T006 and T008, the three test files, at the same time.
- **US1**: T010, T012, T014, T016, T018 and T020, which are separate test files.
- **US4**: T033, T035, T037 and T040 first, then T034 and T036 in parallel.

## Implementation Strategy

1. **MVP**: Setup, then Foundational, then US1. Stop and validate with quickstart sections 1 and 3 (steps 1 to 2).
2. Add US3 (refine) and US4 (save), the biggest value after the MVP.
3. Add US2 (players own), then US5 (discovery), then Polish.
4. Each story ends with its tests passing and a checkpoint.
