# Tasks: Entity Zen Mode

**Branch**: `027-node-read-mode`
**GitHub Issue**: [issue #49](https://github.com/eserlan/Codex-Cryptica/issues/49)
**Spec**: [spec.md](./spec.md)

## Phase 1: Setup

- [x] T001 Create `apps/web/src/lib/stores/ui.svelte.ts` with `readModeNodeId` state and toggle actions
- [x] T002 Update `apps/web/src/routes/+layout.svelte` to mount `EntityReadModal`

## Phase 2: Foundational

- [x] T003 Create `apps/web/src/lib/components/modals/EntityReadModal.svelte` basic shell
- [x] T004 [P] Update `apps/web/src/lib/components/EntityDetailPanel.svelte` to add "Zen Mode" button

## Phase 3: Zen Mode UI (Layout & Tabs)

**Goal**: Establish the spacious, tabbed layout defined in FR-002, FR-003, FR-004.

- [x] T005 [US1] Implement Tab Navigation (Status & Data, Lore & Archives, Inventory) in `EntityReadModal`
- [x] T006 [US1] Implement **Left Column Layout**: Image display, Connections list, and Metadata
- [x] T007 [US1] Implement **Main Column Layout**: Temporal Data header and Chronicle (Markdown) body

## Phase 4: Editing Capabilities

**Goal**: Enable "Deep Work" by allowing full editing within the modal (FR-005).

- [x] T008 [US2] Implement "Edit Mode" toggle state in `EntityReadModal`
- [x] T009 [US2] Integrate `MarkdownEditor` for Content and Lore fields (editable when toggle is active)
- [x] T010 [US2] Integrate `TemporalEditor` for Date/Start/End fields
- [x] T011 [US2] Implement `saveChanges` logic calling `vault.updateEntity`

## Phase 5: Navigation & Interactions

- [x] T012 [US1] Implement navigation logic: clicking a connection updates `ui.readModeNodeId`
- [x] T013 [US3] Implement `copyToClipboard` function with button in header

## Phase 6: Safety & Polish

**Goal**: Prevent data loss and ensure UX quality (FR-007, FR-009).

- [x] T014 [US2] Implement "Unsaved Changes" warning on Close, Navigation, or Escape key
- [x] T015 [P] Implement `Escape` key listener to close modal (if safe)
- [x] T016 Add Lightbox support for entity images within the modal

## Phase 7: Verification

- [x] T017 Update E2E test `apps/web/tests/node-read-mode.spec.ts` to verify Editing, Saving, and Safety prompts

- [x] T018 [CRITICAL] **Offline Functionality Verification**: Ensure Zen Mode opens and edits save without network
