import type { SearchEntry, SearchResult, SearchOptions } from "schema";
import * as Comlink from "comlink";
// We import the worker constructor using Vite's syntax
import SearchWorker from "../workers/search.worker?worker";
import type { SearchEngine } from "@codex/search-engine";
import { debugStore } from "../stores/debug.svelte";
import { entityDb } from "../utils/entity-db";
import { appEventBus } from "@codex/events";

const INDEX_BATCH_SIZE = 100;

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

      // Subscribe to vault lifecycle events via AppEventBus
      appEventBus.subscribe(
        "vault:*",
        async (event) => {
          // VALIDATION: All sync/load events MUST match the current active vault ID
          // to prevent cross-vault index contamination during rapid switches.
          // VAULT_OPENING and VAULT_SWITCHED are exempt — they drive the transition.
          const vaultId = event.metadata.vaultId;
          if (
            vaultId &&
            vaultId !== this.activeVaultId &&
            event.type !== "VAULT:VAULT_OPENING" &&
            event.type !== "VAULT:VAULT_SWITCHED"
          ) {
            return;
          }

          switch (event.type) {
            case "VAULT:VAULT_OPENING":
              if (this.activeVaultId !== vaultId) {
                this.activeVaultId = vaultId!;
                this.isDirty = false;
                await this.clear();
              }
              break;

            case "VAULT:CACHE_LOADED": {
              const restored = await this.loadIndex(vaultId!);
              if (!restored) {
                debugStore.log(
                  `[SearchService] Cold boot: Rebuilding index for ${vaultId}`,
                );
                await this.indexBatch(event.payload.entities);
                this.needsFullContentSweep = true;
                debugStore.log(`[SearchService] Metadata indexing complete.`);
              } else {
                this.needsFullContentSweep = false;
                debugStore.log(
                  `[SearchService] Warm boot: Restored index for ${vaultId}`,
                );
              }
              break;
            }

            case "VAULT:SYNC_CHUNK_READY": {
              const { entities } = event.payload;
              if (entities.length > 0) {
                await this.indexBatch(entities);
              }
              break;
            }

            case "VAULT:SYNC_COMPLETE":
              if (this.needsFullContentSweep) {
                setTimeout(() => {
                  this.indexContentInBackground(vaultId!);
                }, 3000);
                this.needsFullContentSweep = false;
              }
              break;

            case "VAULT:VAULT_SWITCHED":
              // Fallback: sync activeVaultId if VAULT_OPENING was missed
              if (this.activeVaultId !== event.payload.id) {
                this.activeVaultId = event.payload.id;
                this.isDirty = false;
                await this.clear();
              }
              break;

            case "VAULT:ENTITY_UPDATED": {
              const { patch, entity } = event.payload;
              if (
                patch.title !== undefined ||
                patch.aliases !== undefined ||
                patch.content !== undefined ||
                patch.tags !== undefined ||
                patch.lore !== undefined
              ) {
                await this.index(this.mapToSearchEntry(entity));
              }
              break;
            }

            case "VAULT:ENTITY_DELETED":
              await this.remove(event.payload.entityId);
              break;

            case "VAULT:BATCH_CREATED":
              await this.indexBatch(event.payload.entities);
              break;
          }
        },
        "search-service",
      );
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
    const BATCH_SIZE = INDEX_BATCH_SIZE;

    try {
      const metadatas = await entityDb.graphEntities
        .where("vaultId")
        .equals(vaultId)
        .toArray();

      const metaMap = new Map(metadatas.map((m) => [m.id, m]));

      let offset = 0;
      while (true) {
        if (this.activeVaultId !== vaultId) {
          debugStore.log(
            `[SearchService] Background sync aborted (vault switched).`,
          );
          return;
        }

        const records = await entityDb.entityContent
          .where("vaultId")
          .equals(vaultId)
          .offset(offset)
          .limit(BATCH_SIZE)
          .toArray();

        if (records.length === 0) break;

        const currentBatch = [];
        for (const record of records) {
          // We need the full metadata to prevent FlexSearch from overwriting the document
          // with empty fields, as 'add/update' replaces the entire document.
          const metadata = metaMap.get(record.entityId);

          if (metadata) {
            currentBatch.push({
              ...metadata,
              content: record.content,
              lore: record.lore,
            });
          }
        }

        if (currentBatch.length > 0) {
          await this.indexBatch(currentBatch);
          indexedCount += currentBatch.length;
        }

        if (records.length < BATCH_SIZE) break;

        offset += records.length;

        // Stagger batches to let the main thread and IndexedDB breathe.
        // 500ms delay between chunks provides a smooth background sync
        // without choking UI interactivity.
        await new Promise((resolve) => setTimeout(resolve, 500));
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

    // Initialize worker state (but defer FlexSearch init until clear/load)
    this.isInitialized = true;
    this.initPromise = Promise.resolve();
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
      const rawData = await api.exportIndex();

      const explicitKeyCount =
        typeof rawData?.keyCount === "number" ? rawData.keyCount : undefined;
      const segmentedKeyCount =
        rawData?.isSegmented &&
        rawData?.segments &&
        typeof rawData.segments === "object"
          ? Object.keys(rawData.segments).length
          : undefined;
      const encodedPayload =
        rawData?.isEncoded && rawData && typeof rawData === "object"
          ? "payload" in rawData
            ? (rawData as any).payload
            : "data" in rawData
              ? (rawData as any).data
              : undefined
          : undefined;
      const encodedKeyCount =
        rawData?.isEncoded &&
        encodedPayload &&
        typeof encodedPayload === "object"
          ? Array.isArray(encodedPayload)
            ? encodedPayload.length
            : Object.keys(encodedPayload).length
          : undefined;
      const keyCount =
        explicitKeyCount ??
        segmentedKeyCount ??
        encodedKeyCount ??
        Object.keys(rawData || {}).length;

      // Ensure we have actual index data (more than just docCount)
      if (rawData && keyCount > 1) {
        await entityDb.searchIndex.put({
          vaultId,
          data: rawData,
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
      aliases: (entity.aliases || []).join(" "),
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
