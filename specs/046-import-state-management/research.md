# Research: Import Progress Management

## Unknowns & Investigations

### 1. Web Crypto API Performance

- **Decision**: Use `crypto.subtle.digest('SHA-256', data)`.
- **Rationale**: Browser-native, high performance, and requires no external dependencies.
- **Alternatives considered**: `spark-md5` (too many dependencies), `js-sha256`.

### 2. Large File Hashing Strategy

- **Decision**: Read the file as an `ArrayBuffer` for hashing. For very large files (e.g., > 50MB), consider stream-based hashing if memory becomes an issue.
- **Rationale**: Simplicity for the 10MB target range. Stream-based hashing is more complex in the browser.

### 3. Registry Purging Logic (LRU)

- **Decision**: Each record in `import_registry` will have a `lastUsedAt` timestamp. When a new file is added and count > 10, the record with the oldest timestamp is deleted.
- **Rationale**: Simple and effective way to fulfill FR-007.

### 4. Segmented Progress UI Pattern

- **Decision**: Use a CSS-grid based bar where each cell represents a chunk.
- **Rationale**: Allows clear visualization of "Skipped" (Grey), "Active" (Pulse), and "Completed" (Primary) states as required by FR-005.

## Best Practices

### IndexedDB with `idb`

- Use transactions for registry updates.
- Ensure the database version is incremented if schema changes are needed.

### Svelte 5 Queue Management

- Use `$state` to manage the queue list.
- Use an async loop to process items one by one to ensure "Strict Queueing" (1A).
