# Data Model: Vault Front Page

## Entity: VaultMetadata (Dexie Table)

New table added to `CodexEntityDb` (`EntityDb`) in version 4.

| Field        | Type              | Description                        |
| ------------ | ----------------- | ---------------------------------- |
| id           | string            | Vault identifier (Primary Key)     |
| description  | string (optional) | Short campaign summary / tagline   |
| coverImage   | string (optional) | Path to local file or external URL |
| lastModified | number            | Timestamp of metadata update       |

## Entity: CampaignSettings (Derived UI State)

UI-level state derived from Dexie tables.

| Field             | Type          | Source                                                              |
| ----------------- | ------------- | ------------------------------------------------------------------- |
| activeDescription | string        | `vaultMetadata.description` OR content of `frontpage`-tagged entity |
| activeCoverImage  | string        | `vaultMetadata.coverImage`                                          |
| recentEntities    | GraphEntity[] | Query from `graphEntities` table sorted by `lastModified`           |

## Frontpage Tag Resolution (Dexie Query)

1.  **Search**: `entityDb.graphEntities.where('tags').equals('frontpage').toArray()`
2.  **Sort**: If multiple results, sort by `lastModified` descending.
3.  **Select**: Use the first result's content (lazy-loaded via `loadEntityContent`).
4.  **Fallback**: If no tagged entity, use `vaultMetadata.description`.

## Image Reference Formats

- **Local**: `opfs://[vaultId]/.assets/cover.png`
- **URL**: `https://...`
- **Internal**: `asset://[path]` (if using existing asset manager)
