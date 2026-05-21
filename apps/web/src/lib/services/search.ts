import type { SearchEntry, SearchResult, SearchOptions } from "schema";
import * as Comlink from "comlink";
// We import the worker constructor using Vite's syntax
import SearchWorker from "../workers/search.worker?worker";
import type {
  ProgressiveBatchResult,
  SearchEngine,
  SearchIndexProgress,
} from "@codex/search-engine";
import { debugStore } from "../stores/debug.svelte";
import { entityDb } from "../utils/entity-db";
import { appEventBus } from "@codex/events";
import { VAULT_EVENTS } from "@codex/vault-engine";

const INDEX_BATCH_SIZE = 100;
const READY_PROGRESS: SearchIndexProgress = {
  status: "idle",
  vaultId: null,
  runId: null,
  indexedCount: 0,
  totalCount: null,
  isPartial: false,
  canRetry: false,
  message: "Search is idle.",
  error: null,
};

type SearchApi = Pick<
  SearchEngine,
  | "setLogger"
  | "setChangeCallback"
  | "add"
  | "addBatch"
  | "addBatchProgressive"
  | "remove"
  | "searchOptimized"
  | "clear"
  | "exportIndex"
  | "importIndex"
>;

type TimerApi = Pick<typeof globalThis, "setTimeout" | "clearTimeout"> & {
  now?: () => number;
};

export interface SearchServiceDependencies {
  workerFactory?: () => Worker;
  api?: Comlink.Remote<SearchApi> | SearchApi;
  db?: typeof entityDb;
  eventBus?: typeof appEventBus;
  debug?: typeof debugStore;
  timers?: TimerApi;
  windowRef?: Window;
  documentRef?: Document;
}

export class SearchService {
  private worker: Worker | null = null;
  private api: Comlink.Remote<SearchApi> | SearchApi | null = null;
  private isDirty = false;
  private activeVaultId: string | null = null;
  private saveTimeout: any = null;
  private indexQueue: Promise<void> = Promise.resolve();
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;
  private needsFullContentSweep = false;
  private activeRunId: string | null = null;
  private progress: SearchIndexProgress = { ...READY_PROGRESS };
  private progressListeners = new Set<
    (progress: SearchIndexProgress) => void
  >();
  private pendingRetryEntities: any[] = [];
  private retryNeedsContentSweep = false;
  private runCounter = 0;

  private workerFactory: () => Worker;
  private db: typeof entityDb;
  private eventBus: typeof appEventBus;
  private debug: typeof debugStore;
  private timers: TimerApi;
  private windowRef: Window | undefined;
  private documentRef: Document | undefined;

  constructor(dependencies: SearchServiceDependencies = {}) {
    this.workerFactory =
      dependencies.workerFactory ?? (() => new SearchWorker());
    this.api = dependencies.api ?? null;
    this.db = dependencies.db ?? entityDb;
    this.eventBus = dependencies.eventBus ?? appEventBus;
    this.debug = dependencies.debug ?? debugStore;
    this.timers = dependencies.timers ?? globalThis;
    this.windowRef =
      dependencies.windowRef ??
      (typeof window !== "undefined" ? window : undefined);
    this.documentRef =
      dependencies.documentRef ??
      (typeof document !== "undefined" ? document : undefined);
    this.isInitialized = Boolean(this.api);

    if (this.windowRef) {
      // Defer worker initialization until first use or vault event
      // Bridge logs from worker to main thread log service

      // Final emergency save on page reload/exit
      this.windowRef.addEventListener("visibilitychange", () => {
        if (
          this.documentRef?.visibilityState === "hidden" &&
          this.isDirty &&
          this.activeVaultId
        ) {
          this.saveIndex(this.activeVaultId);
        }
      });

      // Subscribe to vault lifecycle events via AppEventBus
      this.eventBus.subscribe(
        "VAULT:*",
        async (event) => {
          // VALIDATION: All sync/load events MUST match the current active vault ID
          // to prevent cross-vault index contamination during rapid switches.
          // VAULT_OPENING and VAULT_SWITCHED are exempt — they drive the transition.
          const vaultId = event.metadata.vaultId;
          if (
            vaultId &&
            vaultId !== this.activeVaultId &&
            event.type !== VAULT_EVENTS.VAULT_OPENING &&
            event.type !== VAULT_EVENTS.VAULT_SWITCHED
          ) {
            return;
          }

          switch (event.type) {
            case VAULT_EVENTS.VAULT_OPENING:
              if (this.activeVaultId !== vaultId) {
                await this.cancelIndexing("Vault switched.", false);
                this.activeVaultId = vaultId!;
                this.isDirty = false;
                await this.clear();
              }
              break;

            case VAULT_EVENTS.CACHE_LOADED: {
              const restored = await this.loadIndex(vaultId!);
              if (!restored) {
                const entities = this.normalizeEntities(event.payload.entities);
                this.debug.log(
                  `[SearchService] Cold boot: Rebuilding index for ${vaultId}`,
                );
                await this.rebuildFromEntities(vaultId!, entities, "metadata", {
                  markReady: false,
                  saveOnReady: false,
                });
                this.needsFullContentSweep = true;
                this.debug.log(`[SearchService] Metadata indexing complete.`);
              } else {
                this.needsFullContentSweep = false;
                this.debug.log(
                  `[SearchService] Warm boot: Restored index for ${vaultId}`,
                );
              }
              break;
            }

            case VAULT_EVENTS.SYNC_CHUNK_READY: {
              const entities = this.normalizeEntities(event.payload.entities);
              if (entities.length > 0) {
                await this.indexBatch(entities);
              }
              break;
            }

            case VAULT_EVENTS.SYNC_COMPLETE:
              if (this.needsFullContentSweep) {
                this.timers.setTimeout(() => {
                  this.indexContentInBackground(vaultId!);
                }, 3000);
                this.needsFullContentSweep = false;
              }
              break;

            case VAULT_EVENTS.VAULT_SWITCHED:
              // Fallback: sync activeVaultId if VAULT_OPENING was missed
              if (this.activeVaultId !== event.payload.id) {
                await this.cancelIndexing("Vault switched.", false);
                this.activeVaultId = event.payload.id;
                this.isDirty = false;
                await this.clear();
              }
              break;

            case VAULT_EVENTS.ENTITY_UPDATED: {
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

            case VAULT_EVENTS.ENTITY_DELETED:
              await this.remove(event.payload.entityId);
              break;

            case VAULT_EVENTS.BATCH_CREATED:
              await this.indexBatch(
                this.normalizeEntities(event.payload.entities),
              );
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

    this.debug.log(`[SearchService] Starting background content sync...`);
    const start = performance.now();
    let indexedCount = 0;
    const BATCH_SIZE = INDEX_BATCH_SIZE;
    const runId = this.activeRunId ?? this.createRunId(vaultId);
    let totalCount: number | null;

    try {
      const contentQuery = this.db.entityContent
        .where("vaultId")
        .equals(vaultId);
      totalCount =
        typeof contentQuery.count === "function"
          ? await contentQuery.count()
          : null;

      // Reset progress counters for the content sweep stage to avoid flickering
      // with metadata counts and ensure totalCount matches the sweep scope.
      this.emitProgress({
        ...this.progress,
        status: "partial",
        indexedCount: 0,
        totalCount,
        message: "Search is indexing note content.",
      });

      const metadatas = await this.db.graphEntities
        .where("vaultId")
        .equals(vaultId)
        .toArray();

      const metaMap = new Map(metadatas.map((m) => [m.id, m]));

      let offset = 0;
      while (true) {
        if (this.activeVaultId !== vaultId) {
          this.debug.log(
            `[SearchService] Background sync aborted (vault switched).`,
          );
          return;
        }

        const records = await this.db.entityContent
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
          await this.indexBatch(currentBatch, { runId, vaultId, totalCount });
          indexedCount += currentBatch.length;
        }

        if (records.length < BATCH_SIZE) break;

        offset += records.length;

        // Stagger batches to let the main thread and IndexedDB breathe.
        // 500ms delay between chunks provides a smooth background sync
        // without choking UI interactivity.
        await this.delay(500);
      }

      this.debug.log(
        `[SearchService] Background sync complete. Indexed ${indexedCount} content records in ${(performance.now() - start).toFixed(2)}ms`,
      );
      if (this.isActiveRun(vaultId, runId)) {
        this.emitProgress({
          status: "ready",
          vaultId,
          runId,
          indexedCount,
          totalCount,
          isPartial: false,
          canRetry: false,
          message: "Search is ready.",
          error: null,
        });
        await this.saveIndex(vaultId);
      }
    } catch (err) {
      this.debug.warn(`[SearchService] Background content sync failed`, err);
      this.retryNeedsContentSweep = true;
      this.failIndexing(vaultId, runId, err);
    }
  }

  private initWorker() {
    if (this.worker) return;

    if (this.api) return;

    this.worker = this.workerFactory();
    this.api = Comlink.wrap<SearchApi>(this.worker);

    // Bridge logs from worker to main thread log service
    this.api.setLogger(
      Comlink.proxy(
        (level: "info" | "warn" | "error", msg: string, data?: any) => {
          const message = `[SearchEngine] ${msg}`;
          if (level === "error") {
            this.debug.error(message, data);
          } else if (level === "warn") {
            this.debug.warn(message, data);
          } else {
            this.debug.log(message, data);
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
    if (!this.windowRef && !this.api) {
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

    return this.api as Comlink.Remote<SearchEngine>;
  }

  private scheduleAutoSave() {
    if (!this.windowRef || !this.activeVaultId) return;
    if (this.progress.isPartial || this.progress.status === "rebuilding") {
      return;
    }

    if (this.saveTimeout) this.timers.clearTimeout(this.saveTimeout);
    this.saveTimeout = this.timers.setTimeout(() => {
      if (this.isDirty && this.activeVaultId) {
        this.saveIndex(this.activeVaultId);
      }
    }, 2000); // Debounce saves by 2 seconds
  }

  terminate() {
    if (this.api) {
      if (Comlink.releaseProxy in this.api) {
        this.api[Comlink.releaseProxy](); // Release the Comlink proxy
      }
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
      .catch((err) => this.debug.warn("Index error", err));
    return this.indexQueue;
  }

  async remove(id: string): Promise<void> {
    const api = await this.ensureWorker();
    this.indexQueue = this.indexQueue
      .then(() => api.remove(id))
      .catch((err) => this.debug.warn("Index remove error", err));
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
      const record = await this.db.searchIndex.get(vaultId);
      if (record && record.data) {
        const runId = this.createRunId(vaultId);
        this.emitProgress({
          status: "restoring",
          vaultId,
          runId,
          indexedCount: 0,
          totalCount: null,
          isPartial: true,
          canRetry: false,
          message: "Search is restoring.",
          error: null,
        });
        await api.importIndex(record.data);
        this.isDirty = false; // Reset dirty state after load
        this.emitProgress({
          status: "ready",
          vaultId,
          runId,
          indexedCount: 0,
          totalCount: null,
          isPartial: false,
          canRetry: false,
          message: "Search is ready.",
          error: null,
        });
        return true;
      }
    } catch (err: any) {
      this.debug.warn(
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
    if (this.progress.vaultId === vaultId && this.progress.isPartial) {
      this.debug.log(`[SearchService] Save skipped: Rebuild is still partial.`);
      return;
    }
    try {
      this.debug.log(
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
        await this.db.searchIndex.put({
          vaultId,
          data: rawData,
          updatedAt: Date.now(),
        });
        this.isDirty = false; // Reset dirty state after successful save
        this.debug.log(
          `[SearchService] Save finished: Persisted index for ${vaultId} (${keyCount} keys) in ${(performance.now() - start).toFixed(2)}ms`,
        );
      } else {
        this.debug.log(
          `[SearchService] Save skipped: Index is empty or export failed.`,
        );
      }
    } catch (err: any) {
      this.debug.warn(
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

  private normalizeEntities(entities: any): any[] {
    if (Array.isArray(entities)) return entities;
    if (entities && typeof entities === "object")
      return Object.values(entities);
    return [];
  }

  getIndexProgress(): SearchIndexProgress {
    return { ...this.progress };
  }

  subscribeIndexProgress(
    callback: (progress: SearchIndexProgress) => void,
  ): () => void {
    this.progressListeners.add(callback);
    callback(this.getIndexProgress());
    return () => this.progressListeners.delete(callback);
  }

  async retryIndexing(): Promise<void> {
    if (!this.activeVaultId) return;
    const vaultId = this.activeVaultId;
    const retryContentSweep = this.retryNeedsContentSweep;
    this.retryNeedsContentSweep = false;
    const entities =
      this.pendingRetryEntities.length > 0
        ? this.pendingRetryEntities
        : await this.db.graphEntities
            .where("vaultId")
            .equals(vaultId)
            .toArray();
    await this.rebuildFromEntities(vaultId, entities, "retry", {
      markReady: !retryContentSweep,
      saveOnReady: !retryContentSweep,
    });
    if (retryContentSweep && this.activeVaultId === vaultId) {
      await this.indexContentInBackground(vaultId);
    }
  }

  async cancelIndexing(
    reason = "Indexing cancelled.",
    canRetry = true,
  ): Promise<void> {
    if (!this.activeRunId) return;
    this.emitProgress({
      status: "cancelled",
      vaultId: this.activeVaultId,
      runId: this.activeRunId,
      indexedCount: this.progress.indexedCount,
      totalCount: this.progress.totalCount,
      isPartial: false,
      canRetry,
      message: reason,
      error: null,
    });
    this.activeRunId = null;
  }

  private emitProgress(progress: SearchIndexProgress) {
    this.progress = { ...progress };
    for (const listener of this.progressListeners) {
      try {
        listener(this.getIndexProgress());
      } catch (err) {
        this.debug.warn("[SearchService] Progress listener failed", err);
      }
    }
  }

  private createRunId(vaultId: string): string {
    this.runCounter += 1;
    const runId = `${vaultId}:${Date.now()}:${this.runCounter}`;
    this.activeRunId = runId;
    return runId;
  }

  private isActiveRun(vaultId: string, runId: string): boolean {
    return this.activeVaultId === vaultId && this.activeRunId === runId;
  }

  private failIndexing(vaultId: string, runId: string, err: unknown) {
    if (!this.isActiveRun(vaultId, runId)) return;
    const message = err instanceof Error ? err.message : "Unknown error";
    this.emitProgress({
      status: "failed",
      vaultId,
      runId,
      indexedCount: this.progress.indexedCount,
      totalCount: this.progress.totalCount,
      isPartial: true,
      canRetry: true,
      message: "Search may be incomplete. Retry indexing.",
      error: message,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => this.timers.setTimeout(resolve, ms));
  }

  private async rebuildFromEntities(
    vaultId: string,
    entities: any[],
    source: "metadata" | "retry",
    options: { markReady?: boolean; saveOnReady?: boolean } = {},
  ) {
    const api = await this.ensureWorker();
    const runId = this.createRunId(vaultId);
    const markReady = options.markReady ?? true;
    const saveOnReady = options.saveOnReady ?? true;
    this.pendingRetryEntities = entities;
    this.emitProgress({
      status: "rebuilding",
      vaultId,
      runId,
      indexedCount: 0,
      totalCount: entities.length,
      isPartial: true,
      canRetry: false,
      message:
        source === "retry"
          ? "Retrying search indexing."
          : "Search is indexing.",
      error: null,
    });

    try {
      await api.clear();
      await this.indexBatch(entities, {
        runId,
        vaultId,
        totalCount: entities.length,
      });
      if (!this.isActiveRun(vaultId, runId)) return;
      if (!markReady) {
        this.emitProgress({
          status: "partial",
          vaultId,
          runId,
          indexedCount: entities.length,
          totalCount: entities.length,
          isPartial: true,
          canRetry: false,
          message: "Search is still indexing full note content.",
          error: null,
        });
        return;
      }
      this.emitProgress({
        status: "ready",
        vaultId,
        runId,
        indexedCount: entities.length,
        totalCount: entities.length,
        isPartial: false,
        canRetry: false,
        message: "Search is ready.",
        error: null,
      });
      if (saveOnReady) {
        await this.saveIndex(vaultId);
      }
    } catch (err) {
      this.failIndexing(vaultId, runId, err);
    }
  }

  private async indexBatch(
    entities: any[],
    context?: { runId: string; vaultId: string; totalCount: number | null },
  ) {
    const api = await this.ensureWorker();

    // Serialize indexing jobs to prevent overlapping worker updates.
    const queued = this.indexQueue.then(async () => {
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
        if (context && !this.isActiveRun(context.vaultId, context.runId)) {
          return;
        }
        const result: ProgressiveBatchResult = context
          ? await api.addBatchProgressive(chunkEntries, {
              runId: context.runId,
              vaultId: context.vaultId,
              batchIndex: Math.floor(i / INDEX_BATCH_SIZE),
              indexedBefore: this.progress.indexedCount,
              totalCount: context.totalCount,
            })
          : {
              runId: "legacy",
              vaultId: this.activeVaultId ?? "legacy",
              acceptedCount: chunkEntries.length,
              failedIds: [],
            };

        if (!context) {
          await api.addBatch(chunkEntries);
        } else if (this.isActiveRun(result.vaultId, result.runId)) {
          const indexedCount =
            this.progress.indexedCount + result.acceptedCount;
          this.emitProgress({
            status: "partial",
            vaultId: result.vaultId,
            runId: result.runId,
            indexedCount,
            totalCount: context.totalCount,
            isPartial: true,
            canRetry: false,
            message:
              context.totalCount === null
                ? "Search is still indexing."
                : `Search is still indexing (${indexedCount}/${context.totalCount}).`,
            error:
              result.failedIds.length > 0
                ? `Failed to index ${result.failedIds.length} records.`
                : null,
          });
        }
        await this.delay(0);
      }
    });

    this.indexQueue = queued.catch((err) => {
      this.debug.warn("Index batch error", err);
    });

    return context ? queued : this.indexQueue;
  }
}

export const searchService = new SearchService();
