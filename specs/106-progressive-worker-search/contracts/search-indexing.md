# Contract: Search Indexing

This contract describes the internal TypeScript interfaces between `@codex/search-engine`, `SearchService`, `SearchStore`, and search UI consumers.

## Types

```ts
export type SearchIndexStatus =
  | "idle"
  | "restoring"
  | "rebuilding"
  | "partial"
  | "ready"
  | "cancelled"
  | "failed";

export interface SearchIndexProgress {
  status: SearchIndexStatus;
  vaultId: string | null;
  runId: string | null;
  indexedCount: number;
  totalCount: number | null;
  isPartial: boolean;
  canRetry: boolean;
  message: string;
  error: string | null;
}

export interface ProgressiveBatchOptions {
  runId: string;
  vaultId: string;
  batchIndex: number;
  indexedBefore: number;
  totalCount: number | null;
}

export interface ProgressiveBatchResult {
  runId: string;
  vaultId: string;
  acceptedCount: number;
  failedIds: string[];
}
```

## Worker Package Contract

`packages/search-engine/src/index.ts` must continue to expose the existing `SearchEngine` API and add progress-safe batch behavior without breaking existing callers.

```ts
class SearchEngine {
  addBatch(docs: SearchEntry[]): Promise<void>;

  addBatchProgressive(
    docs: SearchEntry[],
    options: ProgressiveBatchOptions,
  ): Promise<ProgressiveBatchResult>;

  clear(): Promise<void>;
  exportIndex(): Promise<Record<string, unknown>>;
  importIndex(data: unknown): Promise<void>;
  searchOptimized(
    query: string,
    options?: SearchOptions,
  ): Promise<SearchResult[] | { data: Uint8Array; isEncoded: true }>;
}
```

**Rules**:

- Batch work runs inside the worker and never indexes on the main thread.
- `addBatchProgressive` returns failed IDs instead of throwing for individual document failures.
- Existing `addBatch` remains available for compatibility or delegates to the progressive implementation.
- Worker methods must not know or decide the active vault; they echo `runId` and `vaultId` so the service can validate late completions.

## SearchService Contract

`apps/web/src/lib/services/search.ts` owns vault lifecycle, persistence, cancellation, retry, and status.

```ts
class SearchService {
  getIndexProgress(): SearchIndexProgress;
  subscribeIndexProgress(
    callback: (progress: SearchIndexProgress) => void,
  ): () => void;
  retryIndexing(): Promise<void>;
  cancelIndexing(reason?: string): Promise<void>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}
```

**Rules**:

- Starting a restore or rebuild creates a new `runId`.
- `VAULT_OPENING` and `VAULT_SWITCHED` cancel the previous active run before the new vault mutates the index.
- Late worker results are ignored unless both `runId` and `vaultId` match the active job.
- Failed snapshot import moves to a recoverable rebuild path.
- Index snapshots are saved only when the active job reaches `ready`.

## SearchStore/UI Contract

`apps/web/src/lib/stores/search.svelte.ts` exposes progress to components.

```ts
class SearchStore {
  indexProgress: SearchIndexProgress;
  retryIndexing(): Promise<void>;
}
```

**Rules**:

- Search results may be shown while `indexProgress.isPartial` is true.
- UI must label incomplete results plainly.
- Retry is visible only when `indexProgress.canRetry` is true.
- UI must not show stale progress after a vault switch.

## Error Handling

- Corrupt saved snapshot: log diagnostic, set recoverable progress, start progressive rebuild.
- Worker failure: mark `failed`, keep existing safe results if any, expose retry.
- Vault switch during rebuild: mark old run `cancelled`, clear worker index, ignore late completions.
- Entity mutation during rebuild: apply with the active run guard or replay before marking `ready`.
