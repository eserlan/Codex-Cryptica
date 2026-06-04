# Data Model: Progressive Worker-Backed Search Indexing

## SearchIndexJob

Represents a restore or rebuild operation for one vault.

**Fields**:

- `runId: string` - Unique identity for this indexing attempt.
- `vaultId: string` - Vault this job is allowed to mutate.
- `status: SearchIndexStatus` - Current lifecycle state.
- `indexedCount: number` - Count of records accepted by the active index.
- `totalCount: number | null` - Total expected records when known.
- `startedAt: number` - Epoch milliseconds when the job started.
- `updatedAt: number` - Epoch milliseconds for the latest progress change.
- `completedAt: number | null` - Epoch milliseconds when the job reached a terminal state.
- `error: string | null` - Plain diagnostic for failed states.
- `source: "snapshot" | "metadata" | "content" | "retry"` - What initiated the job.

**Validation rules**:

- `runId` must be unique for every restore or rebuild attempt.
- `vaultId` must match `SearchService.activeVaultId` before mutating the active worker index.
- `indexedCount` must never exceed `totalCount` when `totalCount` is known.
- Terminal jobs must have `completedAt`.

**State transitions**:

```text
idle -> restoring -> ready
idle -> restoring -> failed -> rebuilding -> partial -> ready
idle -> rebuilding -> partial -> ready
rebuilding -> cancelled
partial -> cancelled
rebuilding -> failed
partial -> failed
failed -> rebuilding
cancelled -> rebuilding
```

## SearchIndexProgress

User-facing status mirrored by the service/store.

**Fields**:

- `status: SearchIndexStatus`
- `vaultId: string | null`
- `runId: string | null`
- `indexedCount: number`
- `totalCount: number | null`
- `isPartial: boolean`
- `canRetry: boolean`
- `message: string`
- `error: string | null`

**Validation rules**:

- `isPartial` is true while results may be incomplete.
- `canRetry` is true only for `failed` or recoverable degraded states.
- `message` must be safe to show to users and avoid implementation jargon.

## SearchIndexStatus

Lifecycle states required by the spec.

```ts
type SearchIndexStatus =
  | "idle"
  | "restoring"
  | "rebuilding"
  | "partial"
  | "ready"
  | "cancelled"
  | "failed";
```

## IndexBatch

Bounded unit of search entries sent to the worker.

**Fields**:

- `runId: string`
- `vaultId: string`
- `entries: SearchEntry[]`
- `batchIndex: number`
- `batchSize: number`
- `totalCount: number | null`

**Validation rules**:

- `entries.length` must stay within the configured batch size.
- A batch must be ignored if its `runId` or `vaultId` no longer matches the active job.
- Empty batches must not emit successful progress.

## SavedIndexSnapshot

Per-vault persisted FlexSearch export.

**Fields**:

- `vaultId: string`
- `data: unknown`
- `updatedAt: number`
- `formatVersion: number`
- `docCount: number`

**Validation rules**:

- Snapshot `vaultId` must match the requested vault.
- Missing, corrupt, empty, or incompatible data must be treated as a recoverable restore miss.
- Snapshots are saved only after a successful ready state.

## Relationships

- One `SearchIndexJob` belongs to one vault.
- One active job may process many `IndexBatch` records.
- One vault may have one current `SavedIndexSnapshot`.
- `SearchIndexProgress` is derived from the active job and exposed to callers/UI.
