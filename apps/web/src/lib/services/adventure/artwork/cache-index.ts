import {
  planCacheMutation,
  type CachedArtworkEntry,
} from "@codex/adventure-artwork-engine";

export interface ArtworkCacheIndexStorage {
  read(): Promise<CachedArtworkEntry[]>;
  write(entries: CachedArtworkEntry[]): Promise<void>;
  remove(id: string): Promise<void>;
  withLock?<T>(action: () => Promise<T>): Promise<T>;
}

/** Serialises index changes within this instance. The browser adapter must also lock across tabs. */
export class ArtworkCacheIndex {
  private queue: Promise<void> = Promise.resolve();
  constructor(
    private readonly storage: ArtworkCacheIndexStorage,
    private readonly now: () => number = Date.now,
  ) {}
  record(id: string, bytes: number): Promise<boolean> {
    const operation = this.queue.then(async () => {
      const run = async () => {
        try {
          const entries = await this.storage.read();
          const plan = planCacheMutation(entries, { id, bytes });
          if (!plan.ok) return false;
          for (const removed of plan.evict) await this.storage.remove(removed);
          const keep = entries.filter(
            (entry) => !plan.evict.includes(entry.id) && entry.id !== id,
          );
          const prior = entries.find((entry) => entry.id === id);
          await this.storage.write([
            ...keep,
            {
              id,
              bytes,
              lastUsed: this.now(),
              protected: prior?.protected ?? false,
            },
          ]);
          return true;
        } catch {
          return false;
        }
      };
      try {
        return this.storage.withLock
          ? await this.storage.withLock(run)
          : await run();
      } catch {
        return false;
      }
    });
    this.queue = operation.then(
      () => {},
      () => {},
    );
    return operation;
  }
}
