# Import Progress Service Contract

## Interface: `IImportProgressService`

```typescript
export interface IImportProgressService {
  /**
   * Generates a SHA-256 hash for a file blob.
   */
  calculateHash(file: Blob): Promise<string>;

  /**
   * Retrieves or creates a registry record for a file hash.
   */
  getRegistry(hash: string, totalChunks: number): Promise<ImportRegistry>;

  /**
   * Marks a specific chunk index as completed for a file.
   */
  markChunkComplete(hash: string, index: number): Promise<void>;

  /**
   * Clears the registry for a specific hash (Restart feature).
   */
  clearProgress(hash: string): Promise<void>;

  /**
   * Purges old records to stay under the 10-file limit.
   */
  pruneRegistry(): Promise<void>;
}
```

## UI Events

- `import:started`: Fired when a file hash is resolved and queueing begins.
- `import:chunk-active`: Fired when a specific chunk starts processing.
- `import:chunk-complete`: Fired when a chunk is saved to the registry.
- `import:finished`: Fired when the entire queue for a hash is empty.
