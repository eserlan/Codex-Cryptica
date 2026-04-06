# Data Model: Import Progress Management

## Entities

### ImportRegistry

Persistent record of a specific file's processing state.

| Field            | Type       | Description                                           |
| ---------------- | ---------- | ----------------------------------------------------- |
| hash             | `string`   | SHA-256 fingerprint of the file content (Primary Key) |
| fileName         | `string`   | Last known name of the file                           |
| totalChunks      | `number`   | Total segments the file was split into                |
| completedIndices | `number[]` | Array of chunk indices that have finished processing  |
| createdAt        | `number`   | Timestamp when first seen                             |
| lastUsedAt       | `number`   | Timestamp for LRU purging                             |

### ImportQueueItem

Transient state for an active or pending import.

| Field    | Type                                       | Description                       |
| -------- | ------------------------------------------ | --------------------------------- |
| id       | `string`                                   | Unique identifier for the session |
| hash     | `string`                                   | Reference to registry             |
| status   | `'pending' \| 'processing' \| 'completed'` | Current queue state               |
| progress | `number`                                   | 0-100 percentage                  |

## State Transitions

### Chunk Processing

1. **PENDING**: Chunk exists but not yet sent to Oracle.
2. **ACTIVE**: Chunk is currently being analyzed by Oracle.
3. **COMPLETED**: Valid JSON received and index added to `completedIndices`.
4. **SKIPPED**: Hash matched a record where this index was already in `completedIndices`.
