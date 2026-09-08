# Tasks: Smart Multi-Format Copy

**Input**: Design documents from `/specs/2815-smart-copy/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/smart-copy.md`, `quickstart.md`

**Tests**: Included because the specification requires TDD and success/failure-path coverage.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the feature workspace and capture the current clipboard surface before implementation.

- [ ] T001 Confirm the active `2815-smart-copy` branch, feature pointer, and design artifacts in `.specify/feature.json` and `specs/2815-smart-copy/`
- [ ] T002 [P] Re-run the web-app clipboard inventory and reconcile any new call sites with the classification table in `specs/2815-smart-copy/research.md`

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish one tested, dependency-injected smart-copy primitive before any surface migration.

- [ ] T003 [P] Add failing `ClipboardService` tests for dual `text/plain`/`text/html` MIME payloads, exact Markdown preservation, supplied/generated HTML sanitisation, and injected clipboard-item construction in `apps/web/src/lib/services/ClipboardService.test.ts`
- [ ] T004 Add failing `ClipboardService` tests for missing rich-write capability, rejected rich writes, rejected plain fallback, total failure, and optional `image/png` preservation in `apps/web/src/lib/services/ClipboardService.test.ts`
- [ ] T005 Implement `SmartCopyContent`, narrow clipboard dependencies, feature detection, sanitisation, one-item multi-MIME writes, exact `writeText` fallback, and boolean outcomes in `apps/web/src/lib/services/ClipboardService.ts`
- [ ] T006 Route `copyHtmlAndText(...)` and `copyEntity(...)` through the shared primitive while preserving entity title/Chronicle/Deep Lore output and optional image preparation in `apps/web/src/lib/services/ClipboardService.ts`
- [ ] T007 Run the focused service tests and confirm the foundational smart-copy contract is independently green before surface work in `apps/web/src/lib/services/ClipboardService.test.ts`

**Checkpoint**: The shared service handles rich success, capability/permission fallback, total failure, sanitisation, and existing image compatibility.

## Phase 3: User Story 1 - Paste content naturally anywhere (Priority: P1) 🎯 MVP

**Goal**: Make public generator full-result and section Copy actions write canonical Markdown plus safe rich text through the shared service.

**Independent Test**: Copy a generated result and a single section using test data with headings, lists, emphasis, links, tables, and code; assert the Markdown passed to the service and the service’s HTML/plain MIME contract.

### Tests for User Story 1

- [ ] T008 [P] [US1] Add failing generator-copy helper tests for full-result ordering, optional summary/labels/lore, exact section trimming, and omission of duplicate historical summaries in `apps/web/src/lib/components/seo/generator-copy.test.ts`
- [ ] T009 [P] [US1] Extend generator layout tests to assert full and section Copy actions call the injected/shared smart-copy path while retaining existing analytics and feedback state in `apps/web/src/lib/components/seo/SEOGeneratorLayout.test.ts`

### Implementation for User Story 1

- [ ] T010 [US1] Extract canonical full-result, section, and historical Session Hub Markdown assembly into `apps/web/src/lib/components/seo/generator-copy.ts` without themed display HTML or interactive controls
- [ ] T011 [US1] Replace direct generator `navigator.clipboard.writeText(...)` calls with the shared copy service and extracted builder, preserving title, summary, labels, content, lore, section IDs, timers, and analytics in `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte`
- [ ] T012 [US1] Keep inline generator name copies explicitly plain while routing only document-like full-result and section content through smart copy in `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte`
- [ ] T013 [US1] Run generator helper and layout tests and verify current full-result and section Copy are independently usable in `apps/web/src/lib/components/seo/generator-copy.test.ts` and `apps/web/src/lib/components/seo/SEOGeneratorLayout.test.ts`

**Checkpoint**: The MVP generator Copy flow provides both representations without destination detection or changes to Save/refinement behaviour.

## Phase 4: User Story 2 - Copy despite limited clipboard support (Priority: P2)

**Goal**: Preserve reliable user feedback when rich clipboard writing is unsupported or denied.

**Independent Test**: Simulate rich write rejection and plain fallback success/failure from a Copy interaction; verify exact Markdown fallback, success feedback only after success, and non-destructive failure feedback.

### Tests for User Story 2

- [ ] T014 [P] [US2] Add failing generator Copy interaction tests for fallback success, fallback failure, feedback reset, and unchanged source content in `apps/web/src/lib/components/seo/SEOGeneratorLayout.test.ts`
- [ ] T015 [US2] Add failing generator Copy tests for total failure, unchanged source content, and error feedback in `apps/web/src/lib/components/seo/SEOGeneratorLayout.test.ts`

### Implementation for User Story 2

- [ ] T016 [US2] Thread the shared boolean copy outcome through generator handlers so Copied/error state reflects rich success, plain fallback success, or total failure in `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte`
- [ ] T017 [US2] Thread an injected copy service/callback through generator handlers so fallback handling is testable without browser globals in `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte`
- [ ] T018 [US2] Run focused generator fallback and feedback tests in `apps/web/src/lib/components/seo/SEOGeneratorLayout.test.ts`

**Checkpoint**: Unsupported or rejected rich writes still copy exact Markdown when possible and never mutate or close the source surface on failure.

## Phase 5: User Story 3 - Consistent copies across content surfaces (Priority: P3)

**Goal**: Add smart copy to historical Session Hub results and migrate the existing document-like read-modal path without duplicating clipboard policy.

**Independent Test**: Copy equivalent current and historical results and an entity read view; compare title/content/lore and verify both use the same service contract.

### Tests for User Story 3

- [ ] T019 [P] [US3] Add failing Entity Detail Modal tests for Copy rendering, rich-write rejection/plain fallback, total failure, “Copied!” reset, historical title/content/lore inclusion, and `session_hub_detail` analytics callback in `apps/web/src/lib/components/seo/EntityDetailModal.test.ts`
- [ ] T020 [P] [US3] Add failing Node Read Modal tests for service delegation, dual representations, and plain fallback in `apps/web/src/lib/components/modals/NodeReadModal.test.ts`
- [ ] T021 [P] [US3] Extend generator-copy tests to compare equivalent current and historical document Markdown without duplicate summaries in `apps/web/src/lib/components/seo/generator-copy.test.ts`

### Implementation for User Story 3

- [ ] T022 [US3] Add the injected async copy callback/service seam, accessible Copy action, and non-destructive success/error feedback to `apps/web/src/lib/components/seo/EntityDetailModal.svelte`, using the shared generator builder/service callback
- [ ] T023 [US3] Wire Session Hub detail Copy and `copy_target: "session_hub_detail"` analytics from `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte` while leaving refinement lineage out of scope
- [ ] T024 [US3] Replace the hand-built ClipboardItem write in `apps/web/src/lib/components/modals/NodeReadModal.svelte` with the shared smart-copy service and its fallback
- [ ] T025 [US3] Verify existing `copyEntity(...)`, Oracle `copyHtmlAndText(...)`, and character-chat export compatibility tests still pass in `apps/web/src/lib/services/ClipboardService.test.ts`, `apps/web/src/lib/components/oracle/chat-message-controller.test.ts`, and `apps/web/src/lib/services/character-chat-export.test.ts`

**Checkpoint**: Current, historical, entity, Oracle, and character-chat document copies share one policy and remain materially consistent.

## Phase 6: User Story 4 - Copy literal values exactly (Priority: P4)

**Goal**: Complete the intent audit and prove literal-value operations remain plain by design.

**Independent Test**: Exercise representative URL, secret/token, prompt, raw source, debug-log, transcript, and image-only actions; confirm exact plain semantics and no smart HTML wrapper.

### Tests and implementation for User Story 4

- [ ] T026 [P] [US4] Add or update representative literal-copy tests for URLs/SVG in `apps/web/src/lib/services/publishing/guest-link.test.ts` and `apps/web/src/routes/(marketing)/silhouettes/silhouettes.test.ts`, prompts in `apps/web/src/lib/components/modals/ImagePromptReviewModal.test.ts` and `apps/web/src/lib/components/entity-detail/DetailImage.test.ts`, secrets/tokens in `apps/web/src/lib/components/settings/CloudBackupSettings.test.ts` and `apps/web/src/lib/components/stats/community-template/TemplateOwnerRecovery.test.ts`, logs in `apps/web/src/lib/components/debug/DebugConsole.test.ts`, transcripts in `apps/web/src/lib/components/entity-detail/DetailSoundBite.test.ts`, and image-only copy in `apps/web/src/lib/components/seo/StarSystemDiagram.test.ts`
- [ ] T027 [US4] Record the final call-site classifications and documented exceptions in `specs/2815-smart-copy/research.md`, preserving direct plain writes and special image-only handling where appropriate
- [ ] T028 [US4] Add the “document content → smart copy; literal/token/link/source → plain copy” convention to `docs/STYLE_GUIDE.md`

**Checkpoint**: Every inventoried clipboard action has an explicit intent classification, with no blanket conversion of literal values.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature and prepare it for review.

- [ ] T029 [P] Update affected service/component test doubles and type-only seams for the final injected clipboard contract in `apps/web/src/lib/services/ClipboardService.test.ts`, `apps/web/src/lib/components/oracle/chat-message-controller.test.ts`, and `apps/web/src/lib/services/character-chat-export.test.ts`
- [ ] T030 [P] Review changed Svelte components for Svelte 5 runes, accessibility labels, semantic theme tokens, Iconify utility icons, and bounded responsibility in `apps/web/src/lib/components/seo/` and `apps/web/src/lib/components/modals/NodeReadModal.svelte`
- [ ] T031 Run the focused test matrix from `specs/2815-smart-copy/quickstart.md`
- [ ] T032 After focused tests pass, run the constitution-required repository gates `bun run test`, `bun run lint:types`, and `bun run lint`; do not run a separate pre-change baseline suite, per `AGENTS.md`, and record any failures and fixes before review
- [ ] T033 Run the `codex-review` specialist review and resolve confident findings before opening a ready-for-review PR

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No code dependencies; T002 should be repeated immediately before implementation if other branches land.
- **Foundational (Phase 2)**: T003–T004 establish failing tests; T005–T006 implement the shared contract; T007 blocks all surface work.
- **User Story 1 (Phase 3)**: Depends on T007; T008–T009 precede T010–T012; T013 is the MVP checkpoint.
- **User Story 2 (Phase 4)**: Depends on T013 and the shared service; T014–T015 precede T016–T017; T018 is the fallback checkpoint.
- **User Story 3 (Phase 5)**: Depends on T018 and the generator builder; T019–T021 precede T022–T024; T025 verifies compatibility.
- **User Story 4 (Phase 6)**: Depends on the migrated call-site inventory; T026–T028 can proceed after T025 and must complete before final review.
- **Polish (Phase 7)**: Depends on all desired stories; T031–T033 are final gates.

### User Story Dependencies

- **US1 (P1)**: Depends only on foundational smart-copy service; delivers the MVP independently.
- **US2 (P2)**: Depends on US1’s generator handlers for surface feedback, but its service fallback contract is foundational and independently testable.
- **US3 (P3)**: Depends on the generator builder from US1 and fallback seams from US2; adds historical/entity consistency.
- **US4 (P4)**: Can be audited in parallel after the foundational inventory, but final classification must include all migrations from US1–US3.

### Parallel Opportunities

- T008 and T009 can run in parallel in separate test files.
- T014 and T015 are both red-test slices in `SEOGeneratorLayout.test.ts` and should be completed sequentially to avoid file conflicts.
- T019, T020, and T021 can run in parallel in separate test/helper files.
- T026 and T028 can run in parallel once the final inventory is known.
- T029 and T030 can run in parallel after implementation stabilises.

## Parallel Example: User Story 1

```text
Task T008: generator-copy.test.ts red tests
Task T009: SEOGeneratorLayout.test.ts Copy interaction tests
```

After both tests exist and fail as expected, implement T010, then integrate T011/T012.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases.
2. Complete US1 tests, helper extraction, and generator integration.
3. Stop at T013 and validate current full-result and section Copy manually and through focused tests.
4. Deliver the generator MVP before adding Session Hub and broader audit migrations.

### Incremental Delivery

1. Shared service contract and compatibility wrappers.
2. Current generator full/section smart Copy (MVP).
3. Explicit fallback/feedback coverage.
4. Session Hub historical and entity read-modal adoption.
5. Literal-copy audit and developer guidance.
6. Full validation and specialist review.

### Notes

- Every task follows the required `- [ ] T### [P?] [US?] description with file path` format.
- No discovery-intent task is included because this feature changes existing interactions only.
- No task implements Session Hub refinement lineage from #2824.
