import {
  COLLECTION_LIMIT,
  TOTAL_ARTWORK_CACHE_LIMIT,
} from "@codex/adventure-artwork-engine";

export interface CollectionFile {
  id: string;
  bytes: number;
}
export interface CollectionIndexState {
  version: 1;
  collections: Record<string, CollectionFile[]>;
  suppressed: string[];
}
interface Dependencies {
  /** The same cross-tab lock used by all cache writers and evictors. */
  lock<T>(action: () => Promise<T>): Promise<T>;
  read(): Promise<CollectionIndexState>;
  write(value: CollectionIndexState): Promise<void>;
  /** Actual verified stored bytes, or null when missing or invalid. */
  size(id: string): Promise<number | null>;
  /** Total actual public-cache bytes, including unprotected automatic files. */
  totalStoredBytes(): Promise<number>;
  remove(id: string): Promise<void>;
}
const safeId = (id: string) =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && id.length <= 100;

/** Tracks public collection membership; callers keep this index under the shared cache lock. */
export class CollectionIndex {
  constructor(private readonly deps: Dependencies) {}
  async install(
    id: string,
    files: readonly CollectionFile[],
    signal: AbortSignal,
  ): Promise<boolean> {
    if (!safeId(id) || signal.aborted || files.length === 0) return false;
    try {
      // fallow-ignore-next-line complexity -- Adventure artwork orchestration; branches are validation and fallback guards covered by feature tests.
      return await this.deps.lock(async () => {
        const state = await this.deps.read();
        if (state.version !== 1 || signal.aborted) return false;
        const unique = new Map<string, number>();
        for (const file of files) {
          if (
            !file.id ||
            !Number.isSafeInteger(file.bytes) ||
            file.bytes <= 0 ||
            unique.has(file.id)
          )
            return false;
          unique.set(file.id, file.bytes);
          if ((await this.deps.size(file.id)) !== file.bytes || signal.aborted)
            return false;
        }
        if (
          [...unique.values()].reduce((sum, bytes) => sum + bytes, 0) >
          COLLECTION_LIMIT
        )
          return false;
        const collections = {
          ...state.collections,
          [id]: files.map((file) => ({ ...file })),
        };
        const all = new Map<string, number>();
        for (const items of Object.values(collections))
          for (const item of items) {
            if (all.has(item.id) && all.get(item.id) !== item.bytes)
              return false;
            all.set(item.id, item.bytes);
          }
        const total = await this.deps.totalStoredBytes();
        if (
          !Number.isSafeInteger(total) ||
          total < 0 ||
          total > TOTAL_ARTWORK_CACHE_LIMIT ||
          [...all.values()].reduce((sum, bytes) => sum + bytes, 0) >
            TOTAL_ARTWORK_CACHE_LIMIT ||
          signal.aborted
        )
          return false;
        await this.deps.write({
          version: 1,
          collections,
          suppressed: state.suppressed.filter((value) => value !== id),
        });
        return true;
      });
    } catch {
      return false;
    }
  }
  async remove(id: string): Promise<boolean> {
    if (!safeId(id)) return false;
    try {
      return await this.deps.lock(async () => {
        const state = await this.deps.read();
        if (state.version !== 1) return false;
        const collections = { ...state.collections };
        const removed = collections[id] ?? [];
        delete collections[id];
        const retained = new Set(
          Object.values(collections).flatMap((files) =>
            files.map((file) => file.id),
          ),
        );
        await this.deps.write({
          version: 1,
          collections,
          suppressed: [...new Set([...state.suppressed, id])],
        });
        for (const file of removed)
          if (!retained.has(file.id)) await this.deps.remove(file.id);
        return true;
      });
    } catch {
      return false;
    }
  }
}
