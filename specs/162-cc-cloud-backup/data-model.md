# Phase 1 Data Model: CC Cloud Backup

## CloudBackupManifest (server-side, R2 object)

Stored at `cloud-backup/{backupId}/manifest.json`. `{backupId}` is a server-generated UUID, opaque and unrelated to the ownership code.

| Field           | Type          | Notes                                                                                                                 |
| --------------- | ------------- | --------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion` | number        | `1`: single `bundle.json`. `2` _(#3354)_: sharded entities (below). The worker reads both; any full commit writes `2` |
| `backupId`      | string (UUID) | Matches the R2 key; never shown to end users                                                                          |
| `vaultTitle`    | string        | Plaintext, since it's the only field the admin lookup (Story 4) can match on                                          |
| `sizeBytes`     | number        | Reported in status UI (FR-008)                                                                                        |
| `createdAt`     | ISO datetime  | First backup                                                                                                          |
| `lastPushedAt`  | ISO datetime  | Updated on every push-on-save                                                                                         |
| `entityCount`   | number        | Optional, for status display richness                                                                                 |
| `shardCount`    | number        | _v2 only._ Fixed at `64`; stored so a later change never misreads existing shards                                     |

Stored as R2 object `customMetadata` (not in the JSON body, so lookups don't require downloading/parsing the body): `ownerCodeHash` (SHA-256 hex, per research.md §1).

The vault's actual content (entities, labels, notes, media) lives in sibling keys:

- `cloud-backup/{backupId}/bundle.json` — **v1**: entities/labels/notes, same export shape the local/Drive sync already produces. **v2**: the same shape minus `entities` (maps, canvases, asset manifest).
- `cloud-backup/{backupId}/index.json` — **v2** _(#3354)_: `{ entityHashes: { [entityId]: sha256 } }`, SHA-256 of each entity's canonical JSON. Kept out of the manifest because every authorised request reads the manifest. Served hashes-only by `GET /index` for the idle consistency check (FR-023).
- Index `tombstones` _(shared vault slice 3)_: when an entity has been removed, `index.json` also holds `tombstones: { [entityId]: { id, rev, deletedBy, deletedAt, title } }`. The key is written only when at least one tombstone exists, and `GET /index` never returns it. `rev` is the revision of the removing commit, `deletedBy` is `"owner"`, `deletedAt` is that commit's `lastPushedAt`, and `title` is the entity's title (`""` if it had none).
- `cloud-backup/{backupId}/entities/{shard}.json` — **v2** _(#3354)_: `{ [entityId]: Entity }` for every entity whose id hashes to that shard (`fnv1a(id) % shardCount`, zero-padded, e.g. `07.json`). Sharded rather than one object per entity so a restore costs 64 R2 reads, not one per entity, staying inside the Worker's subrequest limit.
- `cloud-backup/{backupId}/assets/{assetId}` — media, mirroring `published/{publishId}/assets/{assetId}`'s existing layout.

**Staged commits and the `objects` field** _(shared vault slice 2)_: each commit, delta or full, writes its shards, index and bundle under `cloud-backup/{backupId}/commits/<revision>-<id>/…` (same file names as above; `<id>` is a random UUID, because two racing commits share a revision). It then switches the manifest with an **etag-conditional** write (`onlyIf: etagMatches`). The stored manifest body carries a worker-only `objects` field, `{ bundle?, index?, shards?: { [shard]: key } }`, whose values are keys relative to the backup prefix (a staged key, or a legacy key such as `bundle.json`). It is never in `packages/schema` and never returned by any API response. Every reader resolves the bundle, index and shards through it, and a referenced object that is missing fails the read.

- **Trash** _(slice 3)_: the last content of a removed entity is kept in `commits/<tag>/trash/<shard>.json`, `{ [entityId]: entity }`, sharded like live entities and referenced by `objects.trash: { [shard]: key }`. A trash object holds exactly the ids that have a tombstone. A delta that deletes a live id writes its tombstone and trash content; deleting an id that is not live writes nothing; upserting a tombstoned id removes its tombstone and trash content in the same commit. A full commit carries the base's tombstones and trash forward except for ids it includes as live, and writes none of its own. Nothing is purged yet, but trash has its own cap, `CLOUD_BACKUP_LIMITS.maxTrashBytes` (50 MB), separate from the vault ceiling: when a delta would exceed it, the content of the oldest tombstones (lowest `rev`) is dropped first. The tombstone records stay, so a tombstone may have no trash content.
- **`feedHorizon`** _(slice 3)_: optional manifest field, the oldest revision the change feed can vouch for. The first delta on a manifest without one sets it to the base revision; a delta never changes an existing value. Every full commit sets it to its own revision, because a full upload can drop entities without tombstones.
- **Legacy fallback**: a manifest with no `objects` (written before this change, or a fresh one) reads `bundle.json`, `index.json` and the shards found by listing `entities/`. Its first commit builds its base `objects` from those keys and keeps untouched legacy shards referenced in place.
- **Loser**: a commit that loses the switch answers 409 `diverged` with the winner's `revision` and `lastPushedAt`, deletes only what it staged, and prunes nothing.
- **Cleanup**: after a winning switch from manifest B to revision N, the worker deletes best-effort every staged object with tag revision ≤ N and every legacy `bundle.json`/`index.json`/`entities/*` object that neither the new manifest nor B references. That is one generation of grace for in-flight readers; tags with revision > N are never touched. Errors are ignored.
- **Size**: `sizeBytes` and the vault ceiling count only referenced objects plus `assets/`, never staged orphans or the grace generation. Trash objects are excluded, so deleting an entity never raises `sizeBytes` beyond the few bytes the tombstone adds to the index.

**Validation rules**:

- `vaultTitle` MUST be non-empty (used by Story 4 lookup; an empty title would make every vault ambiguous).
- `ownerCodeHash` MUST be present before any bundle/asset write is accepted (no anonymous writes).

**State transitions**: `enabled → pushed (n times, full or delta) → disabled (manifest kept) → deleted (manifest + bundle + shards + assets removed)`. There is no "restoring" state server-side — restore is a pure read (GET) from the client's perspective; the manifest itself never reflects "currently being restored by someone."

## LocalCloudBackupRecord (client-side, IndexedDB)

Per vault, mirrors the shape of the existing `PublishRegistry` (`packages/schema/src/publishing.ts`) used by the guest-vault-r2 feature, and is what makes FR-020 (persist across reloads) possible.

| Field          | Type                             | Notes                                                                                                                                                                                                    |
| -------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vaultId`      | string                           | Local vault identifier, foreign key into the existing vault registry. On restore this points at the **newly created** vault (FR-006a), not the vault the user had open                                   |
| `backupId`     | string (UUID)                    | From the manifest, needed to address the R2 keys directly                                                                                                                                                |
| `ownerCode`    | string                           | The raw, unhashed credential — this is the one copy of it that exists outside the user's own memory/notes; losing this record without having copied the code elsewhere is unrecoverable (spec edge case) |
| `enabled`      | boolean                          | Reflects the user's current opt-in state; `false` after disable, record itself is not deleted (so re-enabling resumes rather than re-consenting)                                                         |
| `status`       | `"idle" \| "syncing" \| "error"` | Drives the Settings UI status indicator (FR-008)                                                                                                                                                         |
| `lastPushedAt` | ISO datetime \| null             | Mirrors the manifest's `lastPushedAt`, cached locally so status can render without a network round-trip                                                                                                  |
| `consentedAt`  | ISO datetime                     | When the consent screen was confirmed (FR-002/FR-003)                                                                                                                                                    |

## CloudBackupDirtyRow (client-side, IndexedDB) _(#3354)_

Object store `cloud_backup_dirty` (DB version 25), key `[vaultId, kind, id]`, index `by-vault`. One row per item changed since the last successful upload (FR-021, FR-022).

| Field     | Type                                       | Notes                                                                                                 |
| --------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `vaultId` | string                                     | Local vault id                                                                                        |
| `kind`    | `"entity" \| "canvas" \| "maps" \| "full"` | `maps` has id `*` (maps persist as one file). `full` (id `*`) marks that the next upload must be full |
| `id`      | string                                     | Item id                                                                                               |
| `version` | string                                     | Unique stamp per write (`crypto.randomUUID()`)                                                        |
| `deleted` | boolean                                    | Tombstone: send as a delete, not an upsert                                                            |

**Rules**:

- Rows are written only while the vault's backup is enabled, or while its first backup is being built (so an edit during `enable` is not lost).
- A durable write with no change description records a `full` row rather than guessing.
- An upload snapshots the rows before building. After a successful commit or delta, each row is deleted **only if it still holds the stamp that was sent**, so an edit made mid-upload stays pending.
- Disabling backup clears the vault's rows. Re-enabling uploads in full, so no marker is needed.

## CloudBackupBaseRow (client-side, IndexedDB) _(shared vault, slice 4)_

Object store `cloud_backup_base` (DB version 27, additive, no data migration), key `[vaultId, id]`, index `by-vault`. One row per entity, holding the content it had when it was last pushed successfully. It is the base for a three-way merge; nothing reads it yet.

| Field     | Type    | Notes                                                       |
| --------- | ------- | ----------------------------------------------------------- |
| `vaultId` | string  | Local vault id                                              |
| `id`      | string  | Entity id                                                   |
| `entity`  | unknown | Deep plain-JSON copy of the entity as sent in the push body |

**Rules**:

- Written only after a push succeeds and was not aborted. A delta push writes each upsert and drops the row for each deleted id. A full snapshot push replaces the vault's rows with exactly the entities sent.
- Failed, conflicting, cancelled and empty pushes write nothing. If recording fails, the push still succeeds and a warning is logged.
- Disabling backup clears the vault's rows.

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
