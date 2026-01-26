# Data Model: Fuzzy Search

## Entities

### SearchEntry
Represents the raw data extracted from a Note for indexing.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier (e.g., file path or UUID). |
| `title` | `string` | The note's title (high relevance). |
| `content` | `string` | The Markdown body text (lower relevance). |
| `path` | `string` | File path for display/navigation. |
| `updatedAt` | `number` | Timestamp for cache invalidation. |

### SearchResult
The standardized output from a search query.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Reference to the note. |
| `title` | `string` | Title of the note. |
| `excerpt` | `string` | Contextual snippet around the match (if content match). |
| `score` | `number` | Relevance score. |
| `matchType` | `'title' \| 'content'` | Indicates where the primary match occurred. |
| `highlights` | `Array<{start: number, length: number}>` | For UI highlighting. |

## Storage

- **In-Memory**: The active `FlexSearch` index lives in the Web Worker's heap.
- **Persistence (Optional)**: Can serialize the index to IndexedDB for faster startup, but for now, we will rebuild from OPFS/Cache on startup as per "Assumption: fit in memory".
