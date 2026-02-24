# Quickstart: Robust Local File Syncing

## Prerequisites

- Linked local folder (via `window.showDirectoryPicker`).
- Initialized OPFS vault.

## Integration Steps

1. **Initialize Registry**: Create the `sync_metadata` store in IndexedDB.
2. **Implement Walker**: Use `walkDirectory` (existing in `utils/fs.ts`) for both local and OPFS.
3. **Calculate Diff**: Implement the bidirectional logic using `data-model.md` transitions.
4. **Execute**: Use `FileSystemHandle` API to perform moves/deletes.
5. **Update UI**: Hook into `VaultStore` to show progress and summary.

## Testing

- Use the mock filesystem helpers in Vitest to simulate clock skew and conflicts.
- Playwright tests should verify the folder picker persistence.
