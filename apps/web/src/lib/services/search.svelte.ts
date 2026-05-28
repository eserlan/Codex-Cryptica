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
import { quickNoteStore } from "../stores/quicknote.svelte";
import {
  SearchProgressCoordinator,
  type TimerApi,
} from "./search-progress-coordinator";
import { SearchIndexLifecycle } from "./search-index-lifecycle";

const INDEX_BATCH_SIZE = 100;

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
  private indexQueue: Promise<void> = Promise.resolve();
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;
  private needsFullContentSweep = false;

  private workerFactory: () => Worker;
  private db: typeof entityDb;
  private debug: typeof debugStore;
  private timers: TimerApi;
  private windowRef: Window | undefined;
  private coordinator: SearchProgressCoordinator;

  constructor(dependencies: SearchServiceDependencies = {}) {
    this.workerFactory =
      dependencies.workerFactory ?? (() => new SearchWorker());
    this.api = dependencies.api ?? null;
    this.db = dependencies.db ?? entityDb;
    this.debug = dependencies.debug ?? debugStore;
    this.timers = dependencies.timers ?? globalThis;
    this.windowRef =
      dependencies.windowRef ??
      (typeof window !== "undefined" ? window : undefined);
    const documentRef =
      dependencies.documentRef ??
      (typeof document !== "undefined" ? document : undefined);
    this.isInitialized = Boolean(this.api);

    this.coordinator = new SearchProgressCoordinator({
      debug: this.debug,
      timers: this.timers,
      windowRef: this.windowRef,
      onScheduledSave: (vaultId) => this.saveIndex(vaultId),
    });

    new SearchIndexLifecycle({
      eventBus: dependencies.eventBus ?? appEventBus,
      coordinator: this.coordinator,
      windowRef: this.windowRef,
      documentRef,
      callbacks: {
        onVaultSwitch: async (vaultId) => {
          await this.coordinator.cancelIndexing("Vault switched.", false);
          this.coordinator.activeVaultId = vaultId;
          this.coordinator.isDirty = false;
          await this.clear();
        },
        onCacheLoaded: async (vaultId, entities) => {
          const restored = await this.loadIndex(vaultId);
          if (!restored) {
            this.debug.log(
              `[SearchService] Cold boot: Rebuilding index for ${vaultId}`,
            );
            await this.rebuildFromEntities(vaultId, entities, "metadata", {
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
        },
        onSyncChunk: async (entities) => {
          await this.indexBatch(entities);
        },
        onSyncComplete: async (vaultId) => {
          if (this.needsFullContentSweep) {
            this.timers.setTimeout(() => {
              this.indexContentInBackground(vaultId);
            }, 3000);
            this.needsFullContentSweep = false;
          }
        },
        onEntityUpdated: async (entity: any, patch: any) => {
          if (
            patch.title !== undefined ||
            patch.aliases !== undefined ||
            patch.content !== undefined ||
            patch.tags !== undefined ||
            patch.labels !== undefined ||
            patch.lore !== undefined
          ) {
            await this.index(this.mapToSearchEntry(entity));
          }
        },
        onEntityDeleted: async (entityId) => {
          await this.remove(entityId);
        },
        onBatchCreated: async (entities) => {
          await this.indexBatch(entities);
        },
        onBatchUpdated: async (entities) => {
          await this.indexBatch(entities);
        },
        onVisibilityHide: () => {
          if (this.coordinator.isDirty && this.coordinator.activeVaultId) {
            this.saveIndex(this.coordinator.activeVaultId);
          }
        },
      },
    });
  }

  /**
   * Background task: indexes entity content for all entities that were
   * restored from cache and might be missing body text in the FlexSearch index.
   */
  private async indexContentInBackground(vaultId: string) {
    if (!this.api || this.coordinator.activeVaultId !== vaultId) return;

    this.debug.log(`[SearchService] Starting background content sync...`);
    const start = performance.now();
    let indexedCount = 0;
    const BATCH_SIZE = INDEX_BATCH_SIZE;
    const runId =
      this.coordinator.activeRunId ?? this.coordinator.createRunId(vaultId);
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
      this.coordinator.emitProgress({
        ...this.coordinator.getIndexProgress(),
        status: "partial",
        indexedCount: 0,
        totalCount,
        message: "Search is indexing note content.",
      });

      const metadatas = await this.db.graphEntities
        .where("vaultId")
        .equals(vaultId)
        .toArray();

      const metaMap = new Map(metadatas.map((m: any) => [m.id, m]));

      let offset = 0;
      while (true) {
        if (this.coordinator.activeVaultId !== vaultId) {
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
      if (this.coordinator.isActiveRun(vaultId, runId)) {
        this.coordinator.emitProgress({
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
      this.coordinator.retryNeedsContentSweep = true;
      this.coordinator.failIndexing(vaultId, runId, err);
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
        this.coordinator.isDirty = true;
        this.coordinator.scheduleAutoSave();
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
    const cleanEntry = $state.snapshot(entry);
    // Serialize all indexing operations
    this.indexQueue = this.indexQueue
      .then(() => api.add(cleanEntry))
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

    let decodedResults: SearchResult[];
    // Handle Transferable (Encoded) result
    if (
      typeof rawResult === "object" &&
      rawResult !== null &&
      "isEncoded" in rawResult
    ) {
      const decoder = new TextDecoder();
      const decoded = decoder.decode(rawResult.data);
      decodedResults = JSON.parse(decoded);
    } else {
      decodedResults = rawResult as SearchResult[];
    }

    // Intercept and merge QuickNote search results locally
    const quickNotes = quickNoteStore.activeNotes;
    if (quickNotes && quickNotes.length > 0) {
      const normalizedQuery = query.toLowerCase();
      const matchingNotes = quickNotes.filter((note) =>
        note.content.toLowerCase().includes(normalizedQuery),
      );
      const quickNoteResults: SearchResult[] = matchingNotes.map((note) => {
        const trimmed = note.content.trim();
        const firstLine = trimmed ? trimmed.split("\n")[0] : "Untitled Note";
        const title =
          firstLine.length > 30
            ? firstLine.substring(0, 30) + "..."
            : firstLine || "Untitled Note";
        return {
          id: `quicknote-${note.id}`,
          title,
          path: `quicknote-${note.id}`,
          type: "quicknote",
          excerpt:
            note.content.substring(0, 100) +
            (note.content.length > 100 ? "..." : ""),
          score: 1.0,
          matchType: "content",
        };
      });
      decodedResults = [...quickNoteResults, ...decodedResults];
    }

    if (options.limit && decodedResults.length > options.limit) {
      decodedResults = decodedResults.slice(0, options.limit);
    }

    return decodedResults;
  }

  async clear(): Promise<void> {
    const api = await this.ensureWorker();
    this.coordinator.isDirty = false;
    return api.clear();
  }

  /**
   * Attempts to load a persisted index for the given vault from IndexedDB.
   * Returns true if successful.
   */
  async loadIndex(vaultId: string): Promise<boolean> {
    const api = await this.ensureWorker();
    this.coordinator.activeVaultId = vaultId;
    try {
      const record = await this.db.searchIndex.get(vaultId);
      if (record && record.data) {
        const runId = this.coordinator.createRunId(vaultId);
        this.coordinator.emitProgress({
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
        this.coordinator.isDirty = false;
        this.coordinator.emitProgress({
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
    const p = this.coordinator.getIndexProgress();
    if (p.vaultId === vaultId && p.isPartial) {
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
        this.coordinator.isDirty = false;
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
      ...(entity.labels || entity.tags || []),
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

  getIndexProgress(): SearchIndexProgress {
    return this.coordinator.getIndexProgress();
  }

  subscribeIndexProgress(
    callback: (progress: SearchIndexProgress) => void,
  ): () => void {
    return this.coordinator.subscribeIndexProgress(callback);
  }

  async retryIndexing(): Promise<void> {
    if (!this.coordinator.activeVaultId) return;
    const vaultId = this.coordinator.activeVaultId;
    const retryContentSweep = this.coordinator.retryNeedsContentSweep;
    this.coordinator.retryNeedsContentSweep = false;
    const entities =
      this.coordinator.pendingRetryEntities.length > 0
        ? this.coordinator.pendingRetryEntities
        : await this.db.graphEntities
            .where("vaultId")
            .equals(vaultId)
            .toArray();
    await this.rebuildFromEntities(vaultId, entities, "retry", {
      markReady: !retryContentSweep,
      saveOnReady: !retryContentSweep,
    });
    if (retryContentSweep && this.coordinator.activeVaultId === vaultId) {
      await this.indexContentInBackground(vaultId);
    }
  }

  async cancelIndexing(
    reason = "Indexing cancelled.",
    canRetry = true,
  ): Promise<void> {
    return this.coordinator.cancelIndexing(reason, canRetry);
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
    const runId = this.coordinator.createRunId(vaultId);
    const markReady = options.markReady ?? true;
    const saveOnReady = options.saveOnReady ?? true;
    this.coordinator.emitProgress({
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
      await this.clear();
      this.coordinator.pendingRetryEntities = entities;
      await this.indexBatch(entities, {
        runId,
        vaultId,
        totalCount: entities.length,
      });
      if (!this.coordinator.isActiveRun(vaultId, runId)) return;
      if (!markReady) {
        this.coordinator.emitProgress({
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
      this.coordinator.emitProgress({
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
      this.coordinator.failIndexing(vaultId, runId, err);
    }
  }

  private async indexBatch(
    entities: any[],
    context?: { runId: string; vaultId: string; totalCount: number | null },
  ) {
    const api = await this.ensureWorker();

    // Serialize indexing jobs to prevent overlapping worker updates.
    const queued = this.indexQueue.then(async () => {
      for (let i = 0; i < entities.length; i += INDEX_BATCH_SIZE) {
        const chunkEntries: any[] = [];
        const end = Math.min(i + INDEX_BATCH_SIZE, entities.length);
        for (let j = i; j < end; j++) {
          const entry = this.mapToSearchEntry(entities[j]);
          chunkEntries.push(entry);
        }
        const cleanChunkEntries = $state.snapshot(chunkEntries);

        if (context) {
          if (!this.coordinator.isActiveRun(context.vaultId, context.runId))
            return;
          const result: ProgressiveBatchResult = await api.addBatchProgressive(
            cleanChunkEntries,
            {
              runId: context.runId,
              vaultId: context.vaultId,
              batchIndex: Math.floor(i / INDEX_BATCH_SIZE),
              indexedBefore: this.coordinator.getIndexProgress().indexedCount,
              totalCount: context.totalCount,
            },
          );
          if (this.coordinator.isActiveRun(result.vaultId, result.runId)) {
            const indexedCount =
              this.coordinator.getIndexProgress().indexedCount +
              result.acceptedCount;
            this.coordinator.emitProgress({
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
        } else {
          // Non-progressive path: fire-and-forget batch with no progress tracking.
          await api.addBatch(cleanChunkEntries);
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
