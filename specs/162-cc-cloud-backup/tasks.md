# Tasks: CC Cloud Backup

**Feature**: `162-cc-cloud-backup` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Issue**: #2593

**Tests are included.** The plan's Constitution Check commits to TDD (Principle II) and to the 70% coverage goal for a new package (Principle X), so contract and unit tests are first-class tasks rather than optional.

**Format**: `- [ ] [ID] [P?] [Story?] Description with file path`
`[P]` = parallelisable (different files, no incomplete dependency).

---

## Phase 1: Setup

**Purpose**: Create the new workspace package and the shared types every later phase imports.

- [ ] T001 Create `packages/cloud-backup-sync/package.json` as `@codex/cloud-backup-sync`, mirroring `packages/gdrive-sync/package.json` (private, `type: module`, `main`/`types` → `./src/index.ts`, `test`/`test:coverage`/`lint` scripts, `schema: workspace:*` dependency, vitest devDependencies)
- [ ] T002 Create `packages/cloud-backup-sync/tsconfig.json` matching `packages/gdrive-sync`'s compiler options
- [ ] T003 Create `packages/cloud-backup-sync/src/index.ts` and `packages/cloud-backup-sync/src/runtime.ts` skeletons following `packages/gdrive-sync/src/runtime.ts`'s injected-dependency shape
- [ ] T004 [P] Add `CloudBackupManifestSchema`, `LocalCloudBackupRecordSchema` and `SupportLookupResultSchema` to `packages/schema/src/publishing.ts` per data-model.md, and export them from `packages/schema/src/index.ts`
- [ ] T005 [P] Add `CLOUD_BACKUP_ADMIN_TOKEN` to the secrets documented in `apps/workers/oracle-proxy/wrangler.toml`, plus a rate-limit entry for the enable/push routes alongside the existing ones
- [ ] T006 [P] Add schema tests in `packages/schema/src/publishing.test.ts` covering manifest validation rules from data-model.md (non-empty `vaultTitle`, required `ownerCodeHash`)

---

## Phase 2: Foundational

**Purpose**: The credential model and R2 key layout that every user story depends on. **No user story can start until this phase is done.**

**⚠️ Blocking**: T007–T011 gate all of Phase 3+.

- [ ] T007 Implement ownership-code generation and SHA-256 hashing helpers in `apps/workers/oracle-proxy/src/cloud-backup.ts` using `crypto.subtle` only (no `nodejs_compat`), per research.md §1
- [ ] T008 Implement the `authorize(request, manifest)` bearer-code helper in `apps/workers/oracle-proxy/src/cloud-backup.ts`, following `template-directory.ts`'s `ownerToken()`/`authorize()` pattern, returning an undifferentiated 401/404 shape per FR-014
- [ ] T009 Implement R2 key helpers for `cloud-backup/{backupId}/manifest.json`, `bundle.json` and `assets/{assetId}` in `apps/workers/oracle-proxy/src/cloud-backup.ts` per research.md §2
- [ ] T010 Create `apps/workers/oracle-proxy/src/__tests__/cloud-backup.test.ts` with the hand-rolled in-memory `R2Bucket` mock, copying the convention in `template-directory.performance.test.ts`
- [ ] T011 Write tests in `apps/workers/oracle-proxy/src/__tests__/cloud-backup.test.ts` for T007–T009: a correct code authorises, a wrong code fails, and a wrong code and a missing backup return byte-identical responses (FR-014)

---

## Phase 3: User Story 1 — Turn on cloud backup with informed consent (P1) 🎯 MVP

**Goal**: A vault owner can opt in through an unavoidable consent screen and get a first backup, with nothing transmitted before confirmation.

**Independent test**: Open Settings, start the enable flow, confirm the consent screen names what/where/how-to-exit, confirm declining sends nothing, confirm accepting produces a backup with a visible last-synced time.

### Contract tests

- [ ] T012 [P] [US1] Test `POST /api/cloud-backup/enable` returns 201 with `backupId`, a one-time `ownerCode` and a manifest, in `apps/workers/oracle-proxy/src/__tests__/cloud-backup.test.ts`
- [ ] T013 [P] [US1] Test enable rejects an invalid bundle shape with 400 and an oversized vault with 413, in `apps/workers/oracle-proxy/src/__tests__/cloud-backup.test.ts`
- [ ] T014 [P] [US1] Test `POST /api/cloud-backup/{backupId}/push` replaces the prior snapshot wholesale and updates `lastPushedAt`, in `apps/workers/oracle-proxy/src/__tests__/cloud-backup.test.ts`

### Worker implementation

- [ ] T015 [US1] Implement `handleEnableCloudBackup` in `apps/workers/oracle-proxy/src/cloud-backup.ts` — generate `backupId` and `ownerCode`, write manifest with `ownerCodeHash` in `customMetadata`, write bundle and assets
- [ ] T016 [US1] Implement `handlePushCloudBackup` in `apps/workers/oracle-proxy/src/cloud-backup.ts` — authorise, replace bundle and assets, update `lastPushedAt` and `sizeBytes`
- [ ] T017 [US1] Wire `/api/cloud-backup/enable` and `/api/cloud-backup/{backupId}/push` into the dispatcher in `apps/workers/oracle-proxy/src/index.ts`, reusing the existing CORS and rate-limit gate

### Package implementation

- [ ] T018 [P] [US1] Write unit tests for `enableCloudBackup` and `pushVaultToCloudBackup` against an injected mock `fetch` in `packages/cloud-backup-sync/src/cloud-backup-sync.test.ts`
- [ ] T019 [US1] Implement `enableCloudBackup` and `pushVaultToCloudBackup` in `packages/cloud-backup-sync/src/cloud-backup-sync.ts`, taking injected `baseUrl`/`fetch` per Principle VIII
- [ ] T020 [US1] Implement `LocalCloudBackupRecord` read/write against IndexedDB in `packages/cloud-backup-sync/src/cloud-backup-sync.ts`, so `enabled`, `ownerCode` and `consentedAt` survive reload (FR-020)

### Client wiring

- [ ] T021 [P] [US1] Write store tests in `apps/web/src/lib/stores/cloud-backup.svelte.test.ts` covering idle/syncing/error transitions and rehydration from IndexedDB
- [ ] T022 [US1] Implement the status store in `apps/web/src/lib/stores/cloud-backup.svelte.ts`, following `apps/web/src/lib/stores/drive.svelte.ts`'s shape
- [ ] T023 [US1] Implement the consent modal and enable action in `apps/web/src/lib/components/settings/CloudBackupSettings.svelte`, with copy naming stored data, storage location, the delete path, and both loss-of-code and support-lookup disclosures (FR-002)
- [ ] T024 [US1] Mount `CloudBackupSettings` next to `DriveSettings` in `apps/web/src/lib/components/settings/VaultSettings.svelte`
- [ ] T025 [US1] Register Cloud Backup as a push-on-save mirror target in `apps/web/src/lib/stores/vault/sync-store.svelte.ts`, alongside the existing Drive target, per research.md §3
- [ ] T026 [US1] Write a test in `apps/web/src/lib/stores/vault/sync-store.svelte.test.ts` proving a failed cloud push neither blocks nor rolls back the local save (FR-019)
- [ ] T027 [US1] Write a test asserting zero `/api/cloud-backup/*` calls occur while backup is disabled (SC-002), in `apps/web/src/lib/stores/cloud-backup.svelte.test.ts`

**Checkpoint**: A vault can be opted in and backed up, and stays backed up on every save.

---

## Phase 4: User Story 2 — Restore a vault from cloud backup (P2)

**Goal**: A user with an ownership code can rebuild a vault's entities, labels, notes and media from its backup.

**Independent test**: Back up a vault, clear the local copy, restore with the code, confirm the content matches.

### Contract tests

- [ ] T028 [P] [US2] Test `GET /api/cloud-backup/{backupId}/bundle` returns manifest plus bundle and does not mutate `lastPushedAt`, in `apps/workers/oracle-proxy/src/__tests__/cloud-backup.test.ts`
- [ ] T029 [P] [US2] Test `GET /api/cloud-backup/{backupId}/assets/{assetId}` streams media, in `apps/workers/oracle-proxy/src/__tests__/cloud-backup.test.ts`

### Worker implementation

- [ ] T030 [US2] Implement `handleGetCloudBackupBundle` and `handleGetCloudBackupAsset` in `apps/workers/oracle-proxy/src/cloud-backup.ts`, mirroring `handleGetAsset` in `publish.ts`
- [ ] T031 [US2] Wire the bundle and asset routes into `apps/workers/oracle-proxy/src/index.ts`

### Package + client

- [ ] T032 [P] [US2] Write unit tests for `restoreVaultFromCloudBackup`, including a mid-transfer failure leaving no partial write, in `packages/cloud-backup-sync/src/cloud-backup-sync.test.ts`
- [ ] T033 [US2] Implement `restoreVaultFromCloudBackup` in `packages/cloud-backup-sync/src/cloud-backup-sync.ts`, staging the download before touching local vault data so a failure leaves it uncorrupted (FR-011)
- [ ] T034 [US2] Add the restore flow to `apps/web/src/lib/components/settings/CloudBackupSettings.svelte` — code entry, overwrite confirmation before replacing local content (FR-007), and a clear error state on failure
- [ ] T035 [US2] Write a test asserting restore never fires automatically on vault open, load or switch (FR-006), in `apps/web/src/lib/stores/cloud-backup.svelte.test.ts`

**Checkpoint**: A vault can be recovered on a fresh device from its code alone.

---

## Phase 5: User Story 3 — See status and stay in control (P3)

**Goal**: The user can see real backup status and can disable and permanently delete their cloud data without contacting support.

**Independent test**: Enable, confirm status reflects reality, disable, delete, confirm restore is no longer possible.

### Contract tests

- [ ] T036 [P] [US3] Test `GET /api/cloud-backup/{backupId}/status` returns status, `lastPushedAt` and `sizeBytes`, in `apps/workers/oracle-proxy/src/__tests__/cloud-backup.test.ts`
- [ ] T037 [P] [US3] Test `DELETE /api/cloud-backup/{backupId}` removes manifest, bundle and every asset under the prefix, and that a later bundle fetch 404s, in `apps/workers/oracle-proxy/src/__tests__/cloud-backup.test.ts`

### Worker implementation

- [ ] T038 [US3] Implement `handleGetCloudBackupStatus` in `apps/workers/oracle-proxy/src/cloud-backup.ts`
- [ ] T039 [US3] Implement `handleDeleteCloudBackup` in `apps/workers/oracle-proxy/src/cloud-backup.ts` using the `list({prefix})` + bulk-delete pattern from `publish.ts`'s `handleDeleteVault`
- [ ] T040 [US3] Wire the status and delete routes into `apps/workers/oracle-proxy/src/index.ts`

### Package + client

- [ ] T041 [P] [US3] Write unit tests for `disableCloudBackup`, `deleteCloudBackup` and `getCloudBackupOwnershipCode` in `packages/cloud-backup-sync/src/cloud-backup-sync.test.ts`, including that disable is purely local and issues no request
- [ ] T042 [US3] Implement `disableCloudBackup` (local-only, preserves the record so re-enabling resumes without re-consent), `deleteCloudBackup` and `getCloudBackupOwnershipCode` in `packages/cloud-backup-sync/src/cloud-backup-sync.ts`
- [ ] T043 [US3] Add status display, disable, delete-with-confirmation, and view/copy ownership code to `apps/web/src/lib/components/settings/CloudBackupSettings.svelte` (FR-008, FR-009, FR-010, FR-013)
- [ ] T044 [US3] Write a test asserting a failed push surfaces an error state rather than a stale success (FR-011), in `apps/web/src/lib/stores/cloud-backup.svelte.test.ts`

**Checkpoint**: The full self-service trust loop works — on, visible, off, erased.

---

## Phase 6: User Story 4 — Support-assisted recovery (P4)

**Goal**: Support can locate one backup by title and re-issue its code, without ever seeing content or browsing other vaults.

**Independent test**: Back up a vault, discard the code, confirm support can find it by title and re-issue access — and that a zero-match, an ambiguous match, and any attempt to list all backups all return nothing.

### Contract tests

- [ ] T045 [P] [US4] Test `POST /api/cloud-backup/admin/lookup` returns metadata for exactly one title match, in `apps/workers/oracle-proxy/src/__tests__/cloud-backup.test.ts`
- [ ] T046 [P] [US4] Test lookup returns an identical `{ matched: false }` for zero matches and for two same-titled backups (FR-015, FR-016), in `apps/workers/oracle-proxy/src/__tests__/cloud-backup.test.ts`
- [ ] T047 [P] [US4] Test the admin routes reject a missing or wrong admin token, and that an owner code is not accepted in its place, in `apps/workers/oracle-proxy/src/__tests__/cloud-backup.test.ts`
- [ ] T048 [P] [US4] Test `POST /api/cloud-backup/admin/{backupId}/reissue-code` mints a new code and invalidates the old one, in `apps/workers/oracle-proxy/src/__tests__/cloud-backup.test.ts`

### Worker implementation

- [ ] T049 [US4] Implement `handleCloudBackupAdminLookup` in `apps/workers/oracle-proxy/src/cloud-backup.ts` — admin-token gate, bounded `list({ prefix: "cloud-backup/" })` scan reading `customMetadata`, exactly-one-match rule per research.md §5
- [ ] T050 [US4] Implement `handleCloudBackupReissueCode` in `apps/workers/oracle-proxy/src/cloud-backup.ts`, replacing `ownerCodeHash` so only one code is ever valid
- [ ] T051 [US4] Wire the two admin routes into `apps/workers/oracle-proxy/src/index.ts` with no pagination or list parameter on either (FR-016)
- [ ] T052 [US4] Document the support runbook — how to run a lookup, verify identity, and relay a re-issued code — in `specs/162-cc-cloud-backup/quickstart.md`

**Checkpoint**: The lost-code safety net works and cannot be turned into a browsing tool.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T053 [P] Add a Cloud Backup entry and a first-use `FeatureHint` to `apps/web/src/lib/config/help-content.ts` (Constitution VII, called out as REQUIRED in the plan)
- [ ] T054 [P] Verify `packages/cloud-backup-sync` meets the 70% coverage goal for a new package via `bun run --filter @codex/cloud-backup-sync test:coverage` (Constitution X)
- [ ] T055 [P] Review every user-facing string in `CloudBackupSettings.svelte` for plain language — "Cloud Backup", "ownership code", never "R2", "bucket", "token" or "manifest" (Constitution IX)
- [ ] T056 Manually walk the privacy gates from quickstart.md: with backup off, confirm zero `/api/cloud-backup/*` requests in the Network tab across normal editing, browsing and generating (SC-002)
- [ ] T057 Manually verify the oversized-vault path returns a clear user-facing message rather than a silent partial or failed backup (spec edge case), exercising the 413 branch in `apps/workers/oracle-proxy/src/cloud-backup.ts` and its handling in `apps/web/src/lib/components/settings/CloudBackupSettings.svelte`
- [ ] T058 Run `bun run lint` and `bun run lint:types` from `apps/web` to zero errors, plus the suites in `packages/cloud-backup-sync/` and `apps/workers/oracle-proxy/src/__tests__/` (Constitution VI and the AGENTS.md PR gate)

---

## Dependencies

```
Setup (T001–T006)
   ↓
Foundational (T007–T011)   ← blocks everything below
   ↓
US1 (T012–T027)  ← MVP
   ↓
US2 (T028–T035)  ← needs a backup to exist to restore
   ↓
US3 (T036–T044)  ← needs a backup to report on and delete
   ↓
US4 (T045–T052)  ← needs a backup to look up
   ↓
Polish (T053–T058)
```

**Story independence**: US2, US3 and US4 each depend on US1 only for _test data_ (a backup must exist), not for code. Once Foundational is done, their worker routes and package functions can be built in parallel by separate people; only their manual test paths need a backup present.

**Hard sequencing inside a story**: contract tests → worker handler → route wiring → package function → client wiring. Package unit tests marked `[P]` can be written while the worker side is in progress, since they run against a mock `fetch`.

## Parallel opportunities

- **Setup**: T004, T005, T006 are independent files.
- **US1**: T012–T014 (contract tests) in parallel; T018 and T021 can be written alongside the worker work.
- **US2/US3/US4**: all contract tests within a story are parallel — same file, but independent cases; split by author if the file is co-edited.
- **Polish**: T053, T054, T055 touch different files.

## Implementation strategy

**MVP is Phase 1 → 2 → 3 (US1).** That delivers the feature's reason to exist: consent-gated opt-in, a real first backup, and push-on-save. It is shippable alone — a user whose device dies still has their vault in the cloud, even before restore exists.

Ship US2 next; backup without restore is only half a promise. US3 is the trust layer and should not lag far behind, since FR-009/FR-010 are the commitments the consent screen makes. US4 is a genuine fallback path and can follow later without blocking release.

**Do not start any story before Phase 2 is complete** — the ownership-code and key-layout decisions are load-bearing for every route, and reworking them later would touch every handler.

## Format validation

All 58 tasks carry a checkbox, sequential ID, story label where required (US1–US4 phases only; Setup, Foundational and Polish carry none), `[P]` only where the files are genuinely independent, and an explicit file path.
