# Tasks: Settings Panel Refactoring

**Input**: Design documents from `/specs/016-settings-refactor/`
**Prerequisites**: plan.md, spec.md

## Phase 1: Setup & Store Updates

- [x] T001 Update `apps/web/src/stores/ui.svelte.ts` to include `activeSettingsTab` and refactor `toggleSettings`.
- [x] T002 Create `apps/web/src/lib/components/settings/SettingsModal.svelte` with basic tab layout.
- [x] T003 [P] Define `SettingsTab` type in `ui.svelte.ts`.

---

## Phase 2: User Story 1 - Access Tabbed Settings (P1)

**Goal**: Provide a functional tabbed modal triggered by a general settings icon.

- [x] T004 Replace the gear icon in `apps/web/src/routes/+layout.svelte` header to trigger `uiStore.toggleSettings()`.
- [x] T005 [P] Implement "Vault" tab in `SettingsModal.svelte` showing vault status and "Rebuild Index" button.
- [x] T006 [P] Implement "About" tab in `SettingsModal.svelte` with legal links.
- [x] T007 [P] Refactor `apps/web/src/lib/components/settings/CloudStatus.svelte` to support `embedMode`.
- [x] T008 Integrate `CloudStatus` into the "Sync" tab of `SettingsModal`.

---

## Phase 3: User Story 2 - Integrated Category Management (P2)

**Goal**: Move category management into the Settings Modal.

- [x] T009 Integrate `CategorySettings` into the "Schema" tab of `SettingsModal`.
- [x] T010 Deprecate and remove `apps/web/src/lib/components/settings/CategoryManagerModal.svelte`.
- [x] T011 Remove `CategoryManagerModal` mount from `apps/web/src/routes/+layout.svelte`.
- [x] T012 Update triggers (e.g., Cloud Sync dropdown button) to open `SettingsModal` on the "Schema" tab.

---

## Phase 4: User Story 3 - Consolidated Intelligence Config (P3)

**Goal**: Move AI settings into the Intelligence tab.

- [x] T013 Integrate `AISettings` into the "Intelligence" tab of `SettingsModal`.
- [x] T014 Remove `AISettings` from `CloudStatus.svelte` (since it's now in its own tab).

---

## Phase 5: Polish & Verification

- [x] T015 Ensure mobile responsiveness of the `SettingsModal` (collapse sidebar).
- [x] T016 Verify all tabs load correctly and preserve state during a session.
- [x] T017 [P] Add E2E test in `apps/web/tests/settings.spec.ts` for tab switching.
- [x] T018 Final check of `deployment-guide.md` to see if URLs need updating (unlikely).
- [x] T019 **Offline Functionality Verification** (Constitutional Requirement: Verify Settings UI and tabs function correctly without network).
