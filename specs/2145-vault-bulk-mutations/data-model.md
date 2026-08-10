# Data Model: #2145

## EntityDelta

An entity ID plus the previous and next values needed by index, relationship, search, and persistence consumers.

- `id: string`
- `before: LocalEntity | null`
- `after: LocalEntity | null`
- `patch?: Partial<LocalEntity>`
- `kind: "added" | "updated" | "deleted"`

## BatchMutationResult

- `succeededIds: string[]`
- `failed: { id: string; error: string }[]`
- `skippedIds: string[]`
- `cancelled: boolean`

## PendingSaveBatch

Internal persistence state keyed by captured vault ID and entity ID. Repeated edits replace an entity snapshot while preserving waiting resolvers. Explicit flush removes timers and enqueues each unique ID immediately. Vault changes invalidate the captured context before disk work begins; per-entity retries remain bounded by the existing policy.

## Relationship delta

Batch deletion produces deleted IDs, modified source IDs whose connections were removed, modified child IDs whose parent was cleared, and file/cache paths scheduled for removal. The delta is applied once to memory/indexes and persisted through the batch path.
