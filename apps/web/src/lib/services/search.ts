import type { SearchEntry, SearchResult, SearchOptions } from "schema";
import * as Comlink from "comlink";
// We import the worker constructor using Vite's syntax
import SearchWorker from "../workers/search.worker?worker";
import type { SearchEngine } from "@codex/search-engine";
import { debugStore } from "../stores/debug.svelte";
import { entityDb } from "../utils/entity-db";
import { vaultEventBus } from "../stores/vault/events";

const INDEX_BATCH_SIZE = 50;

export class SearchService {
  private worker: Worker | null = null;
  private api: Comlink.Remote<SearchEngine> | null = null;
  private isDirty = false;
  private activeVaultId: string | null = null;
  private saveTimeout: any = null;
  private indexQueue: Promise<void> = Promise.resolve();
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;
  private needsFullContentSweep = false;

  constructor() {
    if (typeof window !== "undefined") {
      // Defer worker initialization until first use or vault event
      // Bridge logs from worker to main thread log service

      // Final emergency save on page reload/exit
      window.addEventListener("visibilitychange", () => {
        if (
          document.visibilityState === "hidden" &&
          this.isDirty &&
          this.activeVaultId
        ) {
          this.saveIndex(this.activeVaultId);
        }
      });

      // Subscribe to vault lifecycle events
      vaultEventBus.subscribe(async (event) => {
        // VALIDATION: All sync/load events MUST match the current active vault ID
        // to prevent cross-vault index contamination during rapid switches.
        if (
          "vaultId" in event &&
          event.vaultId !== this.activeVaultId &&
          event.type !== "VAULT_OPENING"
        ) {
          return;
        }

        switch (event.type) {
          case "VAULT_OPENING":
            this.activeVaultId = event.vaultId;
            // Context switch: Clear dirty flag if we are switching vaults
            this.isDirty = false;
            // IMPORTANT: Clear the existing index in memory so we don't merge vaults!
            await this.clear();
            break;

          case "CACHE_LOADED": {
            // 1. Try to restore index from disk
            const restored = await this.loadIndex(event.vaultId);

            // 2. If not restored, perform initial metadata indexing
            if (!restored) {
              debugStore.log(
                `[SearchService] Cold boot: Rebuilding index for ${event.vaultId}`,
              );
              await this.indexBatch(Object.values(event.entities));
              this.needsFullContentSweep = true;
              debugStore.log(`[SearchService] Metadata indexing complete.`);
            } else {
              this.needsFullContentSweep = false;
              debugStore.log(
                `[SearchService] Warm boot: Restored index for ${event.vaultId}`,
              );
            }
            break;
          }

          case "SYNC_CHUNK_READY": {
            const chunk = event.newOrChangedIds
              .map((id) => event.entities[id])
              .filter(Boolean);
            if (chunk.length > 0) {
              await this.indexBatch(chunk);
            }
            break;
          }

          case "SYNC_COMPLETE":
            // Trigger full content indexing sweep in background ONLY if cold boot
            if (this.needsFullContentSweep) {
              this.indexContentInBackground(event.vaultId);
              this.needsFullContentSweep = false;
            }
            break;

          case "ENTITY_UPDATED":
            if (
              event.patch.title !== undefined ||
              event.patch.content !== undefined ||
              event.patch.tags !== undefined ||
              event.patch.lore !== undefined
            ) {
              await this.index(this.mapToSearchEntry(event.entity));
            }
            break;

          case "ENTITY_DELETED":
            await this.remove(event.entityId);
            break;

          case "BATCH_CREATED":
            await this.indexBatch(event.entities);
            break;
        }
      }, "search-service");
    }
  }

  /**
   * Background task: indexes entity content for all entities that were
   * restored from cache and might be missing body text in the FlexSearch index.
   */
  private async indexContentInBackground(vaultId: string) {
    if (!this.api || this.activeVaultId !== vaultId) return;

    debugStore.log(`[SearchService] Starting background content sync...`);
    const start = performance.now();
    let indexedCount = 0;
    const batch: any[] = [];
    const BATCH_SIZE = INDEX_BATCH_SIZE;

    try {
      const records = await entityDb.entityContent
        .where("vaultId")
        .equals(vaultId)
        .toArray();

      for (const record of records) {
        // We need the full metadata to prevent FlexSearch from overwriting the document
        // with empty fields, as 'add/update' replaces the entire document.
        const metadata = await entityDb.graphEntities.get([
          vaultId,
          record.entityId,
        ]);

        if (metadata) {
          batch.push({
            ...metadata,
            content: record.content,
            lore: record.lore,
          });

          if (batch.length >= BATCH_SIZE) {
            const currentBatch = [...batch];
            batch.length = 0;
            await this.indexBatch(currentBatch);
            indexedCount += currentBatch.length;
          }
        }
      }

      if (batch.length > 0) {
        await this.indexBatch(batch);
        indexedCount += batch.length;
      }

      debugStore.log(
        `[SearchService] Background sync complete. Indexed ${indexedCount} content records in ${(performance.now() - start).toFixed(2)}ms`,
      );
    } catch (err) {
      debugStore.warn(`[SearchService] Background content sync failed`, err);
    }
  }

  private initWorker() {
    if (this.worker) return;

    this.worker = new SearchWorker();
    this.api = Comlink.wrap<SearchEngine>(this.worker);

    // Bridge logs from worker to main thread log service
    this.api.setLogger(
      Comlink.proxy(
        (level: "info" | "warn" | "error", msg: string, data?: any) => {
          const message = `[SearchEngine] ${msg}`;
          if (level === "error") {
            debugStore.error(message, data);
          } else if (level === "warn") {
            debugStore.warn(message, data);
          } else {
            debugStore.log(message, data);
          }
        },
      ),
    );

    // Event-based change tracking
    this.api.setChangeCallback(
      Comlink.proxy(() => {
        this.isDirty = true;
        this.scheduleAutoSave();
      }),
    );

    // Initialize immediately
    this.initPromise = this.api
      .initIndex()
      .then(() => {
        this.isInitialized = true;
      })
      .catch((err) => {
        debugStore.error("[SearchService] Worker initialization failed", err);
        throw err;
      });
  }

  private async ensureWorker(): Promise<Comlink.Remote<SearchEngine>> {
    if (typeof window === "undefined") {
      throw new Error(
        "[SearchService] Search worker cannot be initialized in SSR environment",
      );
    }

    if (!this.api) {
      this.initWorker();
    }

    if (this.initPromise) {
      await this.initPromise;
    }

    if (!this.api || !this.isInitialized) {
      throw new Error("[SearchService] Search worker failed to initialize");
    }

    return this.api;
  }

  private scheduleAutoSave() {
    if (typeof window === "undefined" || !this.activeVaultId) return;

    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      if (this.isDirty && this.activeVaultId) {
        this.saveIndex(this.activeVaultId);
      }
    }, 2000); // Debounce saves by 2 seconds
  }

  terminate() {
    if (this.api) {
      this.api[Comlink.releaseProxy](); // Release the Comlink proxy
      this.api = null;
    }
    this.worker?.terminate();
    this.worker = null;
    this.initPromise = null;
  }

  async init(_options: { phonetic?: boolean } = {}): Promise<void> {
    await this.ensureWorker();
  }

  async index(entry: SearchEntry): Promise<void> {
    const api = await this.ensureWorker();
    // Serialize all indexing operations
    this.indexQueue = this.indexQueue
      .then(() => api.add(entry))
      .catch((err) => debugStore.warn("Index error", err));
    return this.indexQueue;
  }

  async remove(id: string): Promise<void> {
    const api = await this.ensureWorker();
    this.indexQueue = this.indexQueue
      .then(() => api.remove(id))
      .catch((err) => debugStore.warn("Index remove error", err));
    return this.indexQueue;
  }

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    const api = await this.ensureWorker();
    const rawResult = await api.searchOptimized(query, options);

    // Handle Transferable (Encoded) result
    if (
      typeof rawResult === "object" &&
      rawResult !== null &&
      "isEncoded" in rawResult
    ) {
      const decoder = new TextDecoder();
      const decoded = decoder.decode(rawResult.data);
      return JSON.parse(decoded);
    }

    return rawResult as SearchResult[];
  }

  async clear(): Promise<void> {
    const api = await this.ensureWorker();
    this.isDirty = false;
    return api.clear();
  }

  /**
   * Attempts to load a persisted index for the given vault from IndexedDB.
   * Returns true if successful.
   */
  async loadIndex(vaultId: string): Promise<boolean> {
    const api = await this.ensureWorker();
    this.activeVaultId = vaultId;
    try {
      const record = await entityDb.searchIndex.get(vaultId);
      if (record && record.data) {
        await api.importIndex(record.data);
        this.isDirty = false; // Reset dirty state after load
        return true;
      }
    } catch (err: any) {
      debugStore.warn(
        `[SearchService] Failed to load index for ${vaultId}: ${err?.message || "Unknown error"}`,
        err,
      );
    }
    return false;
  }

  /**
   * Persists the current state of the search index to IndexedDB.
   */
  async saveIndex(vaultId: string): Promise<void> {
    const api = await this.ensureWorker();
    try {
      debugStore.log(
        `[SearchService] Save started: Exporting index for ${vaultId}...`,
      );
      const start = performance.now();
      const data = await api.exportIndex();

      // Ensure we have actual index data (more than just docCount)
      const keyCount = Object.keys(data).length;
      if (data && keyCount > 1) {
        await entityDb.searchIndex.put({
          vaultId,
          data,
          updatedAt: Date.now(),
        });
        this.isDirty = false; // Reset dirty state after successful save
        debugStore.log(
          `[SearchService] Save finished: Persisted index for ${vaultId} (${keyCount} keys) in ${(performance.now() - start).toFixed(2)}ms`,
        );
      } else {
        debugStore.log(
          `[SearchService] Save skipped: Index is empty or export failed.`,
        );
      }
    } catch (err: any) {
      debugStore.warn(
        `[SearchService] Failed to save index for ${vaultId}: ${err?.message || "Unknown error"}`,
        err,
      );
    }
  }

  private mapToSearchEntry(entity: any): SearchEntry {
    const path = entity._path?.join("/") || `${entity.id}.md`;
    const keywords = [
      ...(entity.tags || []),
      entity.lore || "",
      ...Object.values(entity.metadata || {}).flat(),
    ].join(" ");

    return {
      id: entity.id,
      title: entity.title,
      content: entity.content || "",
      type: entity.type,
      path,
      keywords,
      updatedAt: Date.now(),
    };
  }

  private async indexBatch(entities: any[]) {
    const api = await this.ensureWorker();

    // Serialize indexing jobs to prevent overlapping worker updates
    this.indexQueue = this.indexQueue
      .then(async () => {
        // ⚡ Bolt Optimization: Replace full array .map() with incremental imperative loop processing.
        // Avoids allocating a massive intermediate array for all entities during cold boot,
        // reducing peak memory and GC pressure.
        for (let i = 0; i < entities.length; i += INDEX_BATCH_SIZE) {
          const chunkEntries: any[] = [];
          const end = Math.min(i + INDEX_BATCH_SIZE, entities.length);
          for (let j = i; j < end; j++) {
            const entry = this.mapToSearchEntry(entities[j]);
            chunkEntries.push(entry);
          }
          await api.addBatch(chunkEntries);
        }
      })
      .catch((err) => debugStore.warn("Index batch error", err));

    return this.indexQueue;
  }
}

export const searchService = new SearchService();
