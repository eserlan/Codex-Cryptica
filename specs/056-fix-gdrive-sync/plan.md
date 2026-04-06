# Implementation Plan: Fix GDrive Sync

**Branch**: `056-fix-gdrive-sync` | **Date**: 2026-02-21
**Input**: GitHub Issue #219

## Summary

Fix the Google Drive synchronization failure where the active vault is incorrectly flagged as having GDrive sync disabled or missing a folder ID. This issue likely stems from race conditions in the `WorkerBridge` initialization or state synchronization between the main thread `vaultRegistry` and the worker.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ / Svelte 5
**Primary Dependencies**: `worker-bridge.ts`, `vault-registry.svelte.ts`, `idb.ts`
**Affected Logic**: `WorkerBridge.startSync` checks `vaultRegistry.activeVaultId` and `vaultRegistry.availableVaults`. If `vaultRegistry` hasn't fully hydrated or if the reactive `gdriveSyncEnabled` state isn't propagated in time, the check fails.

## Root Cause Analysis (Hypothesis)

1.  **State Latency**: `workerBridge.startSync()` might be called before `vaultRegistry` has completed its `init()` or `listVaults()` sequence.
2.  **Reactive Disconnect**: The `WorkerBridge` reads `vaultRegistry.activeVaultId` (a Svelte 5 `$state`) directly. If this is done outside of a reactive context (like an effect), it reads the snapshot at that moment. If the registry is still loading, it might read `null` or an outdated vault record.
3.  **Token Availability**: The issue log mentions "Sync aborted: active vault does not have GDrive sync enabled or missing folder ID", confirming that the token _was_ found (otherwise it would have failed earlier), but the vault metadata check failed.

## Proposed Solution

1.  **Wait for Registry**: Modify `WorkerBridge.startSync` to ensure `vaultRegistry.isInitialized` is true before proceeding.
2.  **Reactive Vault Lookup**: Ensure the vault record lookup uses the definitive source of truth from IndexedDB if the in-memory registry seems stale, or wait for the registry to emit a ready state.
3.  **Explicit Vault Pass**: Pass the `activeVault` object directly to `startSync` if possible, or force a registry refresh within `startSync` if the active vault seems missing/disabled but we expect it to work.

## Constitution Check

- **I. Library-First**: N/A (Bug fix).
- **II. TDD**: N/A (Hard to unit test race conditions in workers without complex mocking, will verify manually/E2E).
- **III. Simplicity**: PASSED.
- **V. Privacy**: PASSED.

## Project Structure

No structural changes. Modifying `apps/web/src/lib/cloud-bridge/worker-bridge.ts`.
