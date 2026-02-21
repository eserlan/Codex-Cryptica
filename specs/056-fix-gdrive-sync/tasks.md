# Tasks: Fix GDrive Sync

**Input**: `specs/056-fix-gdrive-sync/plan.md`

## Phase 1: Diagnosis & Fix

- [ ] T001 [P] Add detailed logging to `WorkerBridge.startSync` in `apps/web/src/lib/cloud-bridge/worker-bridge.ts` to log the exact state of `vaultRegistry.activeVaultId` and the retrieved `currentVault` object.
- [ ] T002 Implement `await vaultRegistry.init()` check in `WorkerBridge.startSync` to ensure the registry is ready before reading vault metadata.
- [ ] T003 Verify `GDriveSettings.svelte` correctly updates the `vaultRegistry` state immediately after toggling sync, ensuring the in-memory state matches IDB.

## Phase 2: Verification

- [ ] T004 Create a unit test in `apps/web/src/lib/cloud-bridge/worker-bridge.test.ts` that simulates an uninitialized registry and verifies `startSync` waits for initialization before proceeding.
