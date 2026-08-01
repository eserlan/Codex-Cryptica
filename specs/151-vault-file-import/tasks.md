# Tasks: Import Vault Files into Current Vault

**Input**: Design documents from `/specs/1826-vault-file-import/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/current-vault-import.md

## Dependencies

- Foundation (T001–T003) blocks all user stories.
- US1 and US2 share the import plan and can complete together after foundation.
- US3 is covered by the validation behavior established in foundation and the UI error path.

## Phase 1: Setup

- [ ] T001 Confirm the portable backup and OPFS helper seams in `apps/web/src/lib/utils/vault-archive.ts` and `apps/web/src/lib/utils/opfs.ts`.
- [ ] T002 Add the current-vault import help guidance in `apps/web/src/lib/content/help/offline-sync.md`.

## Phase 2: Foundational Safety

- [ ] T003 Add failing safe-import-plan success, conflict, and invalid-input tests in `apps/web/src/lib/utils/vault-archive.test.ts`.
- [ ] T004 Implement archive-to-current-vault planning and non-overwriting writes in `apps/web/src/lib/utils/vault-archive.ts`.

## Phase 3: User Story 1 — Add a Backup to the Current Vault (P1)

**Goal**: Drag or select a portable backup, review it, and copy its new files into the active vault.

**Independent Test**: A valid archive adds its new files to the active vault after confirmation without switching vaults.

- [ ] T005 [P] [US1] Add a current-vault import control and drag-and-drop state tests in `apps/web/src/lib/components/settings/VaultBackupSettings.test.ts`.
- [ ] T006 [US1] Add drag-and-drop, file-picker, review, and completion behavior in `apps/web/src/lib/components/settings/VaultBackupSettings.svelte`.

## Phase 4: User Story 2 — Avoid Overwriting Existing Work (P1)

**Goal**: Make path conflicts visible and skip them without modifying target files.

**Independent Test**: A mixed archive adds only unique paths and reports skipped conflicts.

- [ ] T007 [US2] Add review-copy and completion-message coverage for conflict counts in `apps/web/src/lib/components/settings/VaultBackupSettings.test.ts`.
- [ ] T008 [US2] Present planned add/skip counts and disable confirmation when no new paths exist in `apps/web/src/lib/components/settings/VaultBackupSettings.svelte`.

## Phase 5: User Story 3 — Recover from Invalid or Failed Drops (P2)

**Goal**: Explain validation failures without changing the active vault.

**Independent Test**: An invalid archive produces an error and no write calls.

- [ ] T009 [US3] Add malformed-backup and cancellation coverage in `apps/web/src/lib/components/settings/VaultBackupSettings.test.ts`.
- [ ] T010 [US3] Present accessible validation and write-failure messages in `apps/web/src/lib/components/settings/VaultBackupSettings.svelte`.

## Phase 6: Polish & Validation

- [ ] T011 Run Svelte autofixer for `apps/web/src/lib/components/settings/VaultBackupSettings.svelte`.
- [ ] T012 Run affected tests, `bun --filter web lint:types`, `bun run lint`, and `bun run test`.

## Implementation Strategy

Implement the safe OPFS plan first, then the settings-surface flow. Do not add overwrite choices or content-aware merging in this feature.
