# Data Model: Current Vault File Import

## ImportedVaultArchive

Existing validated source model.

| Field       | Description                                                            |
| ----------- | ---------------------------------------------------------------------- |
| `vaultName` | Human-readable source vault name from the archive manifest.            |
| `files`     | Validated source files, each with a relative path and immutable bytes. |

## CurrentVaultImportPlan

Transient review model; it is never persisted.

| Field              | Description                                                               |
| ------------------ | ------------------------------------------------------------------------- |
| `sourceVaultName`  | Source name shown in the review prompt.                                   |
| `filesToAdd`       | Source files whose paths are absent in the current vault.                 |
| `conflictingPaths` | Source paths that already exist in the current vault and must be skipped. |

## State transitions

`idle` → `validating` → `ready for confirmation` → `writing` → `complete` or `failed`

Cancellation from `ready for confirmation` returns to `idle` without writes. Validation errors and all-conflict plans return to `idle` with a message.
