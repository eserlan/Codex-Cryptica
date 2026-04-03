# Data Model: Vault Front Page

## Entity: VaultMetadata (Dexie Table)

New table added to `CodexEntityDb` (`EntityDb`) in version 4.

| Field        | Type              | Description                                  |
| ------------ | ----------------- | -------------------------------------------- |
| id           | string            | Vault identifier (Primary Key)               |
| name         | string (optional) | Human-readable vault title                   |
| tagline      | string (optional) | Short campaign strapline                     |
| description  | string (optional) | Short campaign summary / front page blurb    |
| coverImage   | string (optional) | Path to local file generated or imported art |
| lastModified | number            | Timestamp of metadata update                 |

## Entity: CampaignSettings (Derived UI State)

UI-level state derived from Dexie tables.

| Field            | Type          | Source                                                                |
| ---------------- | ------------- | --------------------------------------------------------------------- |
| activeTitle      | string        | `vaultMetadata.name` OR readable vault name                           |
| activeTagline    | string        | Saved tagline or generated theme-aware fallback                       |
| activeSummary    | string        | `vaultMetadata.description` OR content of `frontpage`-marked entity   |
| activeCoverImage | string        | `vaultMetadata.coverImage`                                            |
| recentEntities   | GraphEntity[] | Query from `graphEntities` table sorted by `lastModified`, pinned top |

## Frontpage Tag Resolution (Dexie Query)

1.  **Search**: `entityDb.graphEntities.where('tags').equals('frontpage').toArray()` and `entityDb.graphEntities.where('labels').equals('frontpage').toArray()`
2.  **Sort**: If multiple results, sort by `lastModified` descending.
3.  **Select**: Use the first result's content (lazy-loaded via `loadEntityContent`).
4.  **Fallback**: If no marked entity exists, use `vaultMetadata.description` and then the readable vault name.

## Image Reference Formats

- **Local**: `opfs://[vaultId]/.assets/cover.png`
- **Internal**: `asset://[path]` (if using existing asset manager)

## Front Page Rendering Notes

- The front page uses a hero-style cover image when available.
- Recent entities render with markdown excerpts, category icons, and relative times.
- `frontpage`-marked entities are pinned to the top of the relevant entities list.
