# Tasks: Lite Version (No AI Support)

## Summary

This document outlines the execution steps for implementing the global "Lite Mode" toggle. The implementation is organized to deliver a foundational setting first, followed by incremental UI/Logic restriction for each user story.

- **Total Tasks**: 18
- **Parallel Opportunities**: 7
- **Suggested MVP**: Phase 1 + Phase 2 + Phase 3 (US1)

## Implementation Strategy

We follow an incremental restriction strategy:

1. **Infrastructure**: Add the persistent `liteMode` setting.
2. **Hard Restriction**: Gate the AI service layer to ensure zero network traffic.
3. **UI Polish**: Conditionally hide or restrict AI entry points.
4. **Command Utility**: Refactor Oracle to support **Restricted Mode** commands.

## Phase 1: Setup

- [x] T001 Initialize feature directory documentation in `/specs/054-lite-no-ai/`
- [x] T002 Create E2E test skeleton for Lite Mode in `apps/web/tests/lite-mode.spec.ts`

## Phase 2: Foundational (Blocking)

- [x] T003 Add `liteMode` property to `uiStore` in `apps/web/src/lib/stores/ui.svelte.ts`
- [x] T004 Implement `toggleLiteMode` action with LocalStorage persistence in `apps/web/src/lib/stores/ui.svelte.ts`
- [x] T005 [P] Add Lite Mode toggle to Application Settings UI in `apps/web/src/lib/components/settings/SettingsModal.svelte`
- [x] T006 [P] Gate `AIService` initialization and methods behind `liteMode` check in `apps/web/src/lib/services/ai.ts`
- [x] T006a [P] Add unit tests for `AIService` gating logic in `apps/web/src/lib/services/ai.test.ts`

## Phase 3: [US1] [US3] [US4] Enable Lite Mode & Persistence

**Goal**: Core "AI-Off" functionality with UI removal and network silence.
**Independent Test**: Enable Lite Mode in settings, verify "Draw" buttons disappear, and devtools network shows no Gemini API calls.

- [x] T007 [US1] Conditionally hide image generation "Draw" buttons in `apps/web/src/lib/components/entity-detail/DetailImage.svelte`
- [x] T008 [P] [US1] Conditionally hide AI tag/category suggestions in `apps/web/src/lib/components/entity-detail/DetailStatusTab.svelte`
- [x] T008a [US1] Gate `proposerStore.analyzeCurrentEntity` logic behind `liteMode` check in `apps/web/src/lib/stores/proposer.svelte.ts`
- [x] T009 [P] [US1] Add "Lite Mode Active" status indicator to the Oracle window header when enabled in `apps/web/src/lib/components/oracle/OracleWindow.svelte`
- [x] T010 [US1] Implement E2E test verifying zero network calls to `generativelanguage.googleapis.com` in `apps/web/tests/lite-mode.spec.ts`

## Phase 4: [US2] Restricted Oracle Utility Commands

**Goal**: Restore functional slash commands in the Oracle without LLM dependency.
**Independent Test**: Type `/connect` in Lite Mode and verify it triggers the connection logic without AI network activity.

- [x] T011 [US2] Refactor `OracleStore.ask` to branch into `handleRestrictedCommand` when Lite Mode is active in `apps/web/src/lib/stores/oracle.svelte.ts`
- [x] T012 [P] [US2] Implement deterministic `/help` response for Restricted Mode in `apps/web/src/lib/stores/oracle.svelte.ts`
- [x] T013 [P] [US2] Implement deterministic rejection message for natural language input in Restricted Mode in `apps/web/src/lib/stores/oracle.svelte.ts`
- [x] T014 [US2] Verify `/connect` and `/merge` deterministic regex parsing works in Restricted Mode without AI fallback in `apps/web/src/lib/stores/oracle.svelte.ts`
- [x] T014a [US2] Create unit tests for `handleRestrictedCommand` regex patterns and command branching in `apps/web/src/lib/stores/oracle.test.ts`

## Phase 5: Polish & Documentation

- [x] T015 Add "Lite Mode" article to help content in `apps/web/src/lib/config/help-content.ts`

## Dependencies

- **US1** depends on **Phase 2** (Foundational)
- **US2** depends on **US1** (UI restriction logic)
- **US3** depends on **US1** (Privacy verification)
- **US4** depends on **Phase 2** (Persistence)

## Parallel Execution Examples

- **UI Customization**: T005, T007, T008, T009 can be implemented in parallel after T003 is complete.
- **Service Gating**: T006 and T011-T013 can be worked on independently.
