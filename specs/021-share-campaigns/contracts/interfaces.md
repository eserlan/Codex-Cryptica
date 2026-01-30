# Interface: Storage Adapter

To support "Guest Mode" (In-Memory) vs "Owner Mode" (Local-First/OPFS), we abstract the storage layer.

```typescript
export interface IStorageAdapter {
  /**
   * Initialize the storage system.
   */
  init(): Promise<void>;

  /**
   * Load the full campaign graph.
   */
  loadGraph(): Promise<SerializedGraph | null>;

  /**
   * Save the full campaign graph.
   * Throws error in Read-Only mode.
   */
  saveGraph(graph: SerializedGraph): Promise<void>;

  /**
   * Check if the adapter is read-only.
   */
  isReadOnly(): boolean;
}
```

# Interface: Cloud Share Provider

Abstracting the GDrive specific logic allows future providers (e.g., IPFS).

```typescript
export interface ICloudShareProvider {
  /**
   * Make the specific file public (anyone with link).
   * Returns the webContentLink or appropriate fetchable URL.
   */
  shareFilePublicly(fileId: string): Promise<string>;

  /**
   * Revoke public access.
   */
  revokeShare(fileId: string): Promise<void>;

  /**
   * Fetch a public file's content without OAuth (using API Key).
   */
  fetchPublicFile(fileId: string, apiKey: string): Promise<Blob>;
}
```
