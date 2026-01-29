# Data Model: Path-Aware Sync

**Feature**: Path-Aware Binary Sync Remediation (013-sync-remediation)

## Metadata Schema (IndexedDB)

No changes are strictly required to the `SyncMetadata` schema, but we will ensure the `filePath` reflects the full relative path from the vault root.

```typescript
interface SyncMetadata {
  filePath: string;      // e.g., "images/hero.png" (Full relative path)
  remoteId: string;      // GDrive File ID
  localModified: number; // Timestamp
  remoteModified: string;// ISO Timestamp from GDrive
  syncStatus: "SYNCED" | "PENDING" | "ERROR";
}
```

## Google Drive Application Properties

We will use the `appProperties` field in the GDrive File object to store our custom metadata.

| Key | Value Example | Description |
| :--- | :--- | :--- |
| `vault_path` | `images/eldrin.png` | The relative path within the user's local vault. |
| `checksum` | `[optional]` | Potential future use for hash-based diffing. |

## MIME Type Mapping

| Extension | MIME Type |
| :--- | :--- |
| `.md` | `text/markdown` |
| `.png` | `image/png` |
| `.jpg` / `.jpeg` | `image/jpeg` |
| `.json` | `application/json` |
| Other | `application/octet-stream` |
