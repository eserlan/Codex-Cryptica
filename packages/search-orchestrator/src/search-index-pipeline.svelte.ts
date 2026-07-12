import type { SearchEntry } from "schema";
import type {
  SearchEngine,
  ProgressiveBatchResult,
} from "@codex/search-engine";
import type * as Comlink from "comlink";
import Dexie from "dexie";

type DebugLogger = {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};
import type {
  SearchProgressCoordinator,
  TimerApi,
} from "./search-progress-coordinator";
import { buildSearchAliases, buildSearchKeywords } from "./search-entry-fields";

const INDEX_BATCH_SIZE = 100;

function snapshotValue<T>(value: T): T {
  const state = (globalThis as any).$state;
  if (typeof state?.snapshot === "function") return state.snapshot(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

// Fields that FlexSearch indexes via mapToSearchEntry — exported so
// SearchIndexLifecycle can use the same set for BATCH_UPDATED filtering.
// Keep adjacent to mapToSearchEntry so they stay in sync.
export const BATCH_UPDATED_SEARCH_FIELDS = new Set([
  "title",
  "aliases",
  "content",
  "tags",
  "labels",
  "lore",
  "metadata",
]);

type PipelineApi = Pick<
  SearchEngine,
  "add" | "addBatch" | "addBatchProgressive" | "remove" | "clear"
>;

export interface SearchIndexPipelineDeps {
  db?: any;
  debug?: DebugLogger;
  timers?: TimerApi;
  coordinator: SearchProgressCoordinator;
  getApi: () => Promise<Comlink.Remote<PipelineApi> | PipelineApi>;
  isApiReady: () => boolean;
  onSaveRequired: (vaultId: string) => Promise<void>;
}

export class SearchIndexPipeline {
  private db: any;
  private debug: DebugLogger;
  private timers: TimerApi;
  private coordinator: SearchProgressCoordinator;
  private getApi: () => Promise<Comlink.Remote<PipelineApi> | PipelineApi>;
  private isApiReady: () => boolean;
  private onSaveRequired: (vaultId: string) => Promise<void>;
  private indexQueue: Promise<void> = Promise.resolve();
  needsFullContentSweep = false;

  constructor(deps: SearchIndexPipelineDeps) {
    this.db = deps.db;
    this.debug = deps.debug ?? (globalThis as any).__debugStore__ ?? console;
    this.timers = deps.timers ?? globalThis;
    this.coordinator = deps.coordinator;
    this.getApi = deps.getApi;
    this.isApiReady = deps.isApiReady;
    this.onSaveRequired = deps.onSaveRequired;
  }

  async index(entry: SearchEntry): Promise<void> {
    const api = await this.getApi();
    const cleanEntry = snapshotValue(entry);
    this.indexQueue = this.indexQueue
      .then(() => api.add(cleanEntry))
      .catch((err) => this.debug.warn("Index error", err));
    return this.indexQueue;
  }

  async indexEntity(entity: any): Promise<void> {
    return this.index(this.mapToSearchEntry(entity));
  }

  async remove(id: string): Promise<void> {
    const api = await this.getApi();
    this.indexQueue = this.indexQueue
      .then(() => api.remove(id))
      .catch((err) => this.debug.warn("Index remove error", err));
    return this.indexQueue;
  }

  async clear(): Promise<void> {
    const api = await this.getApi();
    this.coordinator.isDirty = false;
    return api.clear();
  }

  async indexBatch(
    entities: any[],
    context?: { runId: string; vaultId: string; totalCount: number | null },
  ) {
    const api = await this.getApi();

    const queued = this.indexQueue.then(async () => {
      for (let i = 0; i < entities.length; i += INDEX_BATCH_SIZE) {
        const chunkEntries: any[] = [];
        const end = Math.min(i + INDEX_BATCH_SIZE, entities.length);
        for (let j = i; j < end; j++) {
          chunkEntries.push(this.mapToSearchEntry(entities[j]));
        }
        const cleanChunkEntries = snapshotValue(chunkEntries);

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

  async rebuildFromEntities(
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
        await this.onSaveRequired(vaultId);
      }
    } catch (err) {
      this.coordinator.failIndexing(vaultId, runId, err);
    }
  }

  async indexContentInBackground(vaultId: string) {
    if (!this.isApiReady() || this.coordinator.activeVaultId !== vaultId)
      return;

    this.debug.log(`[SearchIndexPipeline] Starting background content sync...`);
    const start = performance.now();
    let indexedCount = 0;
    const runId =
      this.coordinator.activeRunId ?? this.coordinator.createRunId(vaultId);
    let totalCount: number | null;

    try {
      const db = this.getDb();
      const contentQuery = db.entityContent.where("vaultId").equals(vaultId);
      totalCount =
        typeof contentQuery.count === "function"
          ? await contentQuery.count()
          : null;

      this.coordinator.emitProgress({
        ...this.coordinator.getIndexProgress(),
        status: "partial",
        indexedCount: 0,
        totalCount,
        message: "Search is indexing note content.",
      });

      const metadatas = await db.graphEntities
        .where("vaultId")
        .equals(vaultId)
        .toArray();

      const metaMap = new Map(metadatas.map((m: any) => [m.id, m]));
      let lastSeenId = "";

      while (true) {
        if (this.coordinator.activeVaultId !== vaultId) {
          this.debug.log(
            `[SearchIndexPipeline] Background sync aborted (vault switched).`,
          );
          return;
        }

        const records = await db.entityContent
          .where("[vaultId+entityId]")
          .between([vaultId, lastSeenId], [vaultId, Dexie.maxKey], false, true)
          .limit(INDEX_BATCH_SIZE)
          .toArray();

        if (records.length === 0) break;

        const currentBatch = [];
        for (const record of records) {
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

        if (records.length < INDEX_BATCH_SIZE) break;
        lastSeenId = records[records.length - 1].entityId;

        // Stagger batches to let the main thread and IndexedDB breathe.
        await this.yieldToIdle();
      }

      this.debug.log(
        `[SearchIndexPipeline] Background sync complete. Indexed ${indexedCount} content records in ${(performance.now() - start).toFixed(2)}ms`,
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
        await this.onSaveRequired(vaultId);
      }
    } catch (err) {
      this.debug.warn(
        `[SearchIndexPipeline] Background content sync failed`,
        err,
      );
      this.coordinator.retryNeedsContentSweep = true;
      this.coordinator.failIndexing(vaultId, runId, err);
    }
  }

  async retryIndexing(): Promise<void> {
    if (!this.coordinator.activeVaultId) return;
    const vaultId = this.coordinator.activeVaultId;
    const retryContentSweep = this.coordinator.retryNeedsContentSweep;
    this.coordinator.retryNeedsContentSweep = false;
    const entities =
      this.coordinator.pendingRetryEntities.length > 0
        ? this.coordinator.pendingRetryEntities
        : await this.getDb()
            .graphEntities.where("vaultId")
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

  private mapToSearchEntry(entity: any): SearchEntry {
    const path = entity._path?.join("/") || `${entity.id}.md`;
    const keywords = buildSearchKeywords(entity);
    const aliases = buildSearchAliases(entity);

    return {
      id: entity.id,
      title: entity.title,
      aliases,
      content: entity.content || "",
      type: entity.type,
      path,
      keywords,
      updatedAt: Date.now(),
    };
  }

  private getDb(): any {
    const db = this.db ?? (globalThis as any).__entityDb__;
    if (!db) {
      throw new Error(
        "[SearchIndexPipeline] Entity database is not configured",
      );
    }
    return db;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => this.timers.setTimeout(resolve, ms));
  }

  private yieldToIdle(): Promise<void> {
    if (typeof globalThis.requestIdleCallback === "function") {
      return new Promise((resolve) => {
        globalThis.requestIdleCallback(() => resolve());
      });
    }
    const scheduler = (globalThis as any).scheduler;
    if (scheduler && typeof scheduler.postTask === "function") {
      return scheduler.postTask(() => {}, { priority: "background" });
    }
    return new Promise((resolve) => this.timers.setTimeout(resolve, 0));
  }
}
