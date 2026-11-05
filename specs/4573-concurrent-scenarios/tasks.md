# Tasks: Concurrent Adventure situations (#4529)

## Phase 1 — Setup

- [x] T001 Audit all singular-state consumers, background/time-thread references and player projections; record the compatibility inventory in specs/4573-concurrent-scenarios/research.md and confirm #4628's merged staging foundation.

## Phase 2 — Foundation

- [x] T002 Write failing migration/budget fixtures in packages/adventure-engine/tests/scenario-migration.test.ts: v1/v2 ordinary/singular saves, preserved revealed IDs, legacy background/time references, repeated parse, near-ceiling migration metadata, mixed fields, future version and collisions. Assert the input object is unchanged.
- [x] T003 Implement v3 session migration and collection/item schemas in packages/adventure-engine/src/scenario-migration.ts, scenario-schemas.ts, schemas.ts and types.ts. Enforce “0–8 items”, “0–100 events per item”, “0–12 anchor references per item”, “160 characters per ID”, “600 per normal text field” and the existing “32,000 aggregate state characters”; retain existing secret/thread caps. Remove the old writable field and export the new contracts through index.ts.
- [x] T004 Write provenance tests in packages/generator-engine/src/rumour-play-selection.test.ts and apps/web/src/lib/components/generators/campaign-generation.svelte.test.ts: one batch across retry/cancel/restore, distinct same-title batches, legacy parsing and origin conflicts.
- [x] T005 Add stable origin metadata in packages/generator-engine/src/rumour-play-selection.ts and campaign-generator-types.ts, allocate/preserve batch identity in apps/web/src/lib/components/generators/campaign-generation.svelte.ts and pass it through CampaignGeneratorModal.svelte and stores/oracle/rumour-adventure-handoff.svelte.ts. Keep the six-rumour public output and save workflow compatible; do not dedupe by title.

## Phase 3 — US1: Several persistent situations

**Independent check**: Three situations coexist; adding/retrying one never archives the Adventure or changes another baseline.

- [x] T006 [US1] Write command/reducer tests in packages/adventure-engine/tests/scenario-collection.test.ts for independent status/events, same-origin no-op, conflicting truth/IDs, stale revisions, focus semantics, collection overflow and unchanged input on failure.
- [x] T007 [US1] Implement collection commands in packages/adventure-engine/src/scenario-collection.ts and adapt scenario-state.ts/reducer.ts consumers. Same import/event replay is already-applied without another revision; different payload under the same identity conflicts. Clearing focus does not abandon; terminal outcomes clear their focus and remain terminal.
- [x] T008 [US1] Add the injected scenario workflow in apps/web/src/lib/stores/oracle/adventure-scenarios.ts with delegation through adventure-runtime.ts and adventure-manager.svelte.ts. Add focused tests in stores/oracle/tests/adventure-scenarios.test.ts for active-session add, revision-checked save, retry, cancel, read-only and pending-roll refusal. State-only operations must work without AI or a network connection when writable.

## Phase 4 — US2: Discovery, attention and secrecy

**Independent check**: Two heard leads can be focused/ignored; one unheard situation and its count/IDs remain absent from player surfaces.

- [x] T009 [US2] Write secrecy/projection tests in packages/adventure-engine/tests/scenario-projection.test.ts and scenario-prompt.test.ts: unheard fields/counts, equal-text independent secrets, approved reveal without unlocking another scenario, invalid reveal IDs, hidden shared actors and 160-character ID inputs.
- [x] T010 [US2] Implement scoped secret bindings, collection-wide ID guards, immutable baseline protection and heard-only projections in packages/adventure-engine/src/hidden-state.ts, scenario-collection.ts, prompt.ts and session-tools.ts. Apply typed mark-heard updates with their completed turn; use the existing #4623 preparation boundary and budgets, not another model call or store.
- [x] T011 [US2] Extend apps/web/src/lib/stores/oracle/tests/adventure-background.test.ts and services/adventure/world-entry-background.test.ts with new structured batches, legacy no-reseed, immutable truth, failed opening/retry and atomic disclosure cases.
- [x] T012 [US2] Adapt apps/web/src/lib/services/adventure/world-entry-background.ts and stores/oracle/adventure-background.ts to create three structured unheard situations in the existing transaction. Preserve legacy threads/secrets/time IDs; never reverse-parse their prose. Extend adventure-grounding-service.test.ts to prove the new collection reaches prepared GM context with safe player projections.
- [x] T013 [US2] Write component tests for apps/web/src/lib/components/oracle/adventure/AdventureScenarioControls.svelte and AdventureRumourConflict.svelte: add/continue/cancel, focus/clear/resolve/abandon, keyboard labels, unknown targets, no unheard counts, pending roll and failed-save recovery.
- [x] T014 [US2] Implement those compact components in existing tools, extract the rumour-conflict block from AdventureSurface.svelte before expanding it, and wire CampaignGeneratorModal.svelte's handoff to the add workflow. Update apps/web/src/lib/content/help/adventure-mode.md. No scenario selection is required for play; no larger journal/dashboard or new FeatureHint overlay is needed.

## Phase 5 — US3: Resume and recover

**Independent check**: Migrated ordinary/singular/background sessions remain usable and all failed/cancelled mutations preserve committed state.

- [x] T015 [US3] Add repository/manager compatibility and failure cases in apps/web/src/lib/stores/oracle/tests/adventure-manager.test.ts and services/adventure/adventure-session-repository.test.ts: persisted v3 roundtrip, old reveals/time references, cancelled or stale saves, simultaneous imports, same-origin retry after reload and pending-roll preservation.
- [x] T016 [US3] Complete legacy adapters and safe error mapping in packages/adventure-engine/src/scenario-migration.ts and apps/web/src/lib/stores/oracle/adventure-scenarios.ts. Audit schemas.ts state/generation budget projections, event uniqueness, recap/copy and old singular consumers; no second writable representation or implicit save-on-load may remain. Provide a validated legacy read-only recovery/export result if migration metadata alone exceeds the state ceiling.

## Phase 6 — Regression and handoff

- [x] T017 Extend packages/adventure-engine/tests/emergent-30-turn.test.ts and apps/web/src/lib/services/adventure/adventure-grounding-continuity.test.ts with three scenarios, fifteen later turns, focus changes/revisit, a pending roll, heard/hidden transitions, resolution and reload. Assert one Adventure, distinct baseline truths and no duplicate events/unheard projection leaks.
- [x] T018 Run impacted lint/tests, affected workspace type checks, worker build where applicable, Fallow and codex-review; record outcomes and budget observations in specs/4573-concurrent-scenarios/quickstart.md. Verify the feature-only diff against origin/staging and the constitution gates before PR creation.

## Dependencies and parallel opportunities

T001 → T002–T005 → US1 (T006–T008) → US2 (T009–T014) → US3 (T015–T016) → T017–T018. Tests precede implementation. After contracts stabilise, provenance fixtures and engine migration fixtures can be authored independently; component fixtures can be drafted alongside background fixtures. Shared schema/reducer edits stay sequential.

## Delivery strategy

First prove one session with three independent, persisted situations. Then connect scoped disclosure/background and minimal controls, followed by migration/recovery regression. #4531 consumes the typed reveal/provenance seam for contextual opportunity ranking; it is not required to finish this state foundation.
