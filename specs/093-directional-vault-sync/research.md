# Research: Directional Vault Synchronization

## Topic 1: Directional Filtering in `sync-engine`

- **Decision**: Update `SyncPlanner` to accept a `direction: 'push' | 'pull'` parameter.
- **Rationale**: The `DiffAlgorithm` already categorizes changes (`IMPORT_TO_OPFS`, `EXPORT_TO_FS`, etc.). By passing a direction flag, we can filter these actions at the planning stage, ensuring the executor only performs operations aligned with the user's intent.
- **Alternatives considered**: Creating separate `PushService` and `PullService`. Rejected because it duplicates scanning and diffing logic. Filtering the results of a unified diff is more efficient and maintainable.

## Topic 2: "Dirty" Tracking for OPFS

- **Decision**: Implement a `lastModified` timestamp at the Vault level (in `VaultRegistry` metadata) that updates whenever _any_ entity, map, or canvas is successfully written to OPFS.
- **Rationale**: Scanning thousands of files in OPFS to compare timestamps with the local folder is too slow for reactive UI state. A single "Master Timestamp" compared against a `lastSavedToFolder` timestamp provides a fast, constant-time `isDirty` derived state.
- **Alternatives considered**:
  - Full scan on every change: Rejected due to performance.
  - File-by-file dirty bits: Rejected as it doesn't easily summarize "Is the whole vault dirty?" for the primary Save button.

## Topic 3: Vault ID Guard in `EntityStore`

- **Decision**: Add an `activeVaultId` check inside the `_persistEntity` method, verified against the ID captured when the save was enqueued.
- **Rationale**: If a user switches vaults quickly, a debounced save for "Vault A" might fire while "Vault B" is active. Without this guard, the data could be written into the wrong OPFS directory.
- **Alternatives considered**: Canceling all pending saves on switch. Rejected because we _want_ the work in the old vault to be saved, just in the correct location. The guard ensures it goes to the right directory handle or is discarded if the handle is no longer available.

## Topic 4: Per-Vault Oracle Chat Persistence

- **Decision**: Scope `ChatHistoryService` keys by `vaultId`.
- **Rationale**: AI context is campaign-specific. Restoring a "Sci-Fi" chat context into a "High Fantasy" vault switch leads to confusing Oracle behavior.
- **Alternatives considered**: Global history only. Rejected as it breaks immersion and context-awareness.

## Topic 5: Safety Gate Implementation

- **Decision**: Use the existing `uiStore.confirm()` dialog system to trigger a hard-stop before any "Pull" (Load) operation if `isDirty` is true.
- **Rationale**: Leverages established UI patterns and ensures the user is aware of potential data loss before overwriting the internal archive.
