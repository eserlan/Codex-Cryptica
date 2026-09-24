# Phase 1 Data Model: CC Cloud Backup

## CloudBackupManifest (server-side, R2 object)

Stored at `cloud-backup/{backupId}/manifest.json`. `{backupId}` is a server-generated UUID, opaque and unrelated to the ownership code.

| Field           | Type          | Notes                                                                                                                         |
| --------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion` | number        | `1`: single `bundle.json`. `2` _(#3354)_: sharded entities (below). The worker reads both; any full commit writes `2`         |
| `backupId`      | string (UUID) | Matches the R2 key; never shown to end users                                                                                  |
| `vaultTitle`    | string        | Plaintext, since it's the only field the admin lookup (Story 4) can match on                                                  |
| `sizeBytes`     | number        | Reported in status UI (FR-008)                                                                                                |
| `createdAt`     | ISO datetime  | First backup                                                                                                                  |
| `lastPushedAt`  | ISO datetime  | Updated on every push-on-save                                                                                                 |
| `entityCount`   | number        | Optional, for status display richness                                                                                         |
| `shardCount`    | number        | _v2 only._ Fixed at `64`; stored so a later change never misreads existing shards                                             |
| `entityHashes`  | object        | _v2 only._ `{ [entityId]: contentHash }` — SHA-256 of the entity's canonical JSON. Drives the idle consistency check (FR-023) |

Stored as R2 object `customMetadata` (not in the JSON body, so lookups don't require downloading/parsing the body): `ownerCodeHash` (SHA-256 hex, per research.md §1).

The vault's actual content (entities, labels, notes, media) lives in sibling keys:

- `cloud-backup/{backupId}/bundle.json` — **v1**: entities/labels/notes, same export shape the local/Drive sync already produces. **v2**: the same shape minus `entities` (maps, canvases, asset manifest).
- `cloud-backup/{backupId}/entities/{shard}.json` — **v2** _(#3354)_: `{ [entityId]: Entity }` for every entity whose id hashes to that shard (`fnv1a(id) % shardCount`, zero-padded, e.g. `07.json`). Sharded rather than one object per entity so a restore costs 64 R2 reads, not one per entity, staying inside the Worker's subrequest limit.
- `cloud-backup/{backupId}/assets/{assetId}` — media, mirroring `published/{publishId}/assets/{assetId}`'s existing layout.

**Validation rules**:

- `vaultTitle` MUST be non-empty (used by Story 4 lookup; an empty title would make every vault ambiguous).
- `ownerCodeHash` MUST be present before any bundle/asset write is accepted (no anonymous writes).

**State transitions**: `enabled → pushed (n times, full or delta) → disabled (manifest kept) → deleted (manifest + bundle + shards + assets removed)`. There is no "restoring" state server-side — restore is a pure read (GET) from the client's perspective; the manifest itself never reflects "currently being restored by someone."

## LocalCloudBackupRecord (client-side, IndexedDB)

Per vault, mirrors the shape of the existing `PublishRegistry` (`packages/schema/src/publishing.ts`) used by the guest-vault-r2 feature, and is what makes FR-020 (persist across reloads) possible.

| Field           | Type                             | Notes                                                                                                                                                                                                    |
| --------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vaultId`       | string                           | Local vault identifier, foreign key into the existing vault registry. On restore this points at the **newly created** vault (FR-006a), not the vault the user had open                                   |
| `backupId`      | string (UUID)                    | From the manifest, needed to address the R2 keys directly                                                                                                                                                |
| `ownerCode`     | string                           | The raw, unhashed credential — this is the one copy of it that exists outside the user's own memory/notes; losing this record without having copied the code elsewhere is unrecoverable (spec edge case) |
| `enabled`       | boolean                          | Reflects the user's current opt-in state; `false` after disable, record itself is not deleted (so re-enabling resumes rather than re-consenting)                                                         |
| `status`        | `"idle" \| "syncing" \| "error"` | Drives the Settings UI status indicator (FR-008)                                                                                                                                                         |
| `lastPushedAt`  | ISO datetime \| null             | Mirrors the manifest's `lastPushedAt`, cached locally so status can render without a network round-trip                                                                                                  |
| `consentedAt`   | ISO datetime                     | When the consent screen was confirmed (FR-002/FR-003)                                                                                                                                                    |
| `needsFullPush` | boolean                          | _(#3354)_ Set by the bulk-change, re-enable and conflict paths of FR-023; cleared by a successful full upload                                                                                            |

## CloudBackupDirtyEntry (client-side, IndexedDB) _(#3354)_

New object store `cloudBackupDirty`, key `[vaultId, kind, id]`. One row per changed item since the last successful upload (FR-021, FR-022).

| Field     | Type                            | Notes                                                |
| --------- | ------------------------------- | ---------------------------------------------------- |
| `vaultId` | string                          | Local vault id                                       |
| `kind`    | `"entity" \| "map" \| "canvas"` | What changed                                         |
| `id`      | string                          | Item id                                              |
| `version` | number                          | Monotonic per vault; bumped on every recorded change |
| `deleted` | boolean                         | Tombstone: send as a delete, not an upsert           |

**Rules**: rows are written only while the vault's backup is enabled. An upload snapshots the rows it sends; after a successful commit each row is deleted **only if its `version` still matches the snapshot**, so an edit made mid-upload stays pending. Disabling backup clears the vault's rows and sets `needsFullPush`, since changes made while off are not tracked.

## ConsentRecord

Not necessarily a separate stored entity — folded into `LocalCloudBackupRecord.consentedAt` above, since there is exactly one meaningful consent event per vault (first enable) and no partial/tiered consent in this spec. Called out separately in spec.md's Key Entities because it's a distinct _concept_ stakeholders reason about, even though it isn't a distinct table.

## SupportLookupResult (ephemeral, not persisted)

The response shape for the admin lookup endpoint (`POST /api/cloud-backup/admin/lookup`). Never written to storage — it's a projection over `CloudBackupManifest` fields, returned only when exactly one manifest's `vaultTitle` matches the query.

| Field          | Type                    | Notes                                                                                                                       |
| -------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `matched`      | boolean                 | `false` for zero or multiple matches (FR-015, FR-016)                                                                       |
| `vaultTitle`   | string \| omitted       | Only present when `matched`                                                                                                 |
| `sizeBytes`    | number \| omitted       |                                                                                                                             |
| `lastPushedAt` | ISO datetime \| omitted |                                                                                                                             |
| `backupId`     | string \| omitted       | Needed internally so support can call the re-issue-code action next; not necessarily rendered to the support agent verbatim |

**Relationships**: `LocalCloudBackupRecord` (1) ↔ (1) `CloudBackupManifest`, linked by `backupId`. `SupportLookupResult` is derived read-only from `CloudBackupManifest`, never the reverse.
