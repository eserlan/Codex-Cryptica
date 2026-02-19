# Tasks: Advanced Oracle Draw Button

**Issue Reference**: [eserlan/Codex-Arcana#191](https://github.com/eserlan/Codex-Cryptica/issues/191)
**Branch**: `050-oracle-draw-button`
**Spec**: [spec.md](./spec.md)

## Phase 1: Setup

- [x] T001 Update `ChatMessage` interface in `apps/web/src/lib/stores/oracle.svelte.ts` to include `isDrawing` and `hasDrawAction` flags
- [x] T002 Update `IDrawActions` contract in `specs/050-oracle-draw-button/contracts/draw-service.ts` to reflect any required signature adjustments for implementation
- [x] T002.1 [P] Update `AIService.retrieveContext` in `apps/web/src/lib/services/ai.ts` to return the title of the grounded Art Style entity

## Phase 2: Foundational (Business Logic)

**Goal**: Implement the core image generation and association logic in `OracleStore`.

- [x] T003 Implement `drawEntity(entityId: string)` in `apps/web/src/lib/stores/oracle.svelte.ts` using `AIService` and `VaultStore`
- [x] T004 Implement `drawMessage(messageId: string)` in `apps/web/src/lib/stores/oracle.svelte.ts` for inline chat generation
- [x] T005 [P] Create unit tests for `drawEntity` and `drawMessage` logic in `apps/web/src/lib/stores/oracle.test.ts` (mocking AI and Vault)

## Phase 3: User Story 1 - One-Click Visualization (Priority: P1)

**Goal**: Add the "Draw" button to Oracle chat responses for Advanced tier users.
**Independent Test**: Switch to Advanced tier, generate a lore response, and click "Draw" to verify inline image generation.

- [x] T006 [US1] Update `ChatMessage.svelte` to display the "Draw" button for assistant messages when `oracle.tier === 'advanced'`
- [x] T007 [US1] Implement loading state in `ChatMessage.svelte` while `isDrawing` is true
- [x] T008 [US1] Ensure `drawMessage` result correctly replaces the "Draw" button with the generated image in `ChatMessage.svelte`

## Phase 4: User Story 3 - Visualizing Existing Lore (Priority: P1)

**Goal**: Enable image generation for entities in the sidepanel and Zen mode.
**Independent Test**: Open an image-less entity, click "Draw" in the sidepanel, and verify the image is saved to the vault and displayed.

- [x] T009 [US3] Add "Draw" button to the empty state of `apps/web/src/lib/components/entity-detail/DetailImage.svelte` (Advanced tier only)
- [x] T010 [US3] Add "Draw" button to the sidebar of `apps/web/src/lib/components/modals/ZenModeModal.svelte` for entities without images
- [x] T011 [US3] Implement "Style Grounding Indicator" in `DetailImage.svelte` and `ZenModeModal.svelte` that displays the name of the vault's active Art Style guide during generation

## Phase 5: User Story 2 - Tier-Based UI Differentiation (Priority: P2)

**Goal**: Ensure Lite tier users do not see the "Draw" button.
**Independent Test**: Switch to Lite tier and confirm no "Draw" buttons are visible in chat, sidepanel, or Zen mode.

- [x] T012 [US2] Audit all "Draw" button visibility conditions to strictly check for `oracle.tier === 'advanced'`
- [x] T013 [US2] Implement E2E test in `apps/web/tests/draw-button.spec.ts` to verify tier-based visibility and generation flow

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T014 Update `apps/web/src/lib/config/help-content.ts` to include documentation for the Advanced Draw feature
- [x] T015 Ensure all image generation status messages use theme-aware jargon where appropriate
- [x] T016 Final verification of image persistence in `VaultStore` during Sidepanel/Zen mode triggers

---

## Dependencies

1. **Phase 2 (Business Logic)** must be completed before UI integration in **Phase 3 and Phase 4**.
2. **US1 and US3** are the primary drivers for MVP value.
3. **Phase 5 (Tier Verification)** ensures feature-gating integrity.

## Parallel Execution

- T005 (Unit Tests) can run in parallel with implementation.
- Phase 3 (Chat UI) and Phase 4 (Sidepanel UI) can be implemented in parallel once Phase 2 logic is stable.

## Implementation Strategy

1. **MVP**: Complete Phase 1, 2, and US1. This provides the core "Draw" functionality within the chat context.
2. **Expansion**: Complete US3 to support visualizing the existing library.
3. **Gating**: Complete US2 to finalize tier-based restrictions.
