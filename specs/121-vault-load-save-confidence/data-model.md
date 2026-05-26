# Data Model: Vault Load/Save Confidence

This document outlines the updated reactive states, transitions, and schemas associated with the Vault Load/Save Confidence feature.

## SyncStore Status States

The `status` of `SyncStore` is modeled as a reactive string state with the following values:

```typescript
type VaultStatus =
  | "idle"
  | "loading"
  | "saving"
  | "saved"
  | "needs-permission"
  | "error";
```

### State Description

- **`"idle"`**: The vault is loaded, no operations are active, and the linked folder (if any) is fully up-to-date or requires no immediate user action.
- **`"loading"`**: The system is reading files from either the OPFS cache or the local directory handle.
- **`"saving"`**: The system is actively writing changes from the repository to the local directory handle.
- **`"saved"`**: A transient success state displayed for 3 seconds after a successful folder write.
- **`"needs-permission"`**: The vault has a linked folder directory handle, but read-write permission is currently denied or prompt-required.
- **`"error"`**: An actual error occurred during loading/saving (excluding standard permission requests).

### State Transitions

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> loading : loadFiles()
    idle --> saving : saveToFolder()
    idle --> needs-permission : loadFiles() [permission !== "granted"]
    needs-permission --> loading : Click "GRANT ACCESS" (Granted)
    needs-permission --> needs-permission : Click "GRANT ACCESS" (Denied)
    loading --> idle : Load complete
    loading --> error : Load failed
    saving --> saved : Save successful
    saving --> error : Save failed
    saved --> idle : 3-second timeout
    error --> idle : Clear / Retry
```

---

## Vault Settings Schema (IndexedDB)

The local folder handle is stored in the IndexedDB `settings` store:

- **Key**: `folderHandle_${vaultId}`
- **Value**: `FileSystemDirectoryHandle` (serialized as a native browser directory handle)
- **Dirty Check**:
  - `lastInternalChange`: Timestamp of the latest local edit made within the app.
  - `lastSavedToFolder`: Timestamp of the latest successful save-to-folder write.
  - `isDirty` (derived): `lastInternalChange > lastSavedToFolder`
