import type { SearchResult, SearchOptions } from "schema";
import * as Comlink from "comlink";
import type { SearchEngine, SearchIndexProgress } from "@codex/search-engine";
type DebugLogger = {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

import { appEventBus } from "@codex/events";

import {
  SearchProgressCoordinator,
  type TimerApi,
} from "./search-progress-coordinator";
import { SearchIndexLifecycle } from "./search-index-lifecycle";
import { SearchIndexPersistence } from "./search-index-persistence";
import { SearchIndexPipeline } from "./search-index-pipeline.svelte";

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
  workerFactory?: () => Worker | Promise<Worker>;
  api?: Comlink.Remote<SearchApi> | SearchApi;
  /**
   * Comlink `wrap`/`proxy`/`releaseProxy`, injectable so tests can substitute
   * fakes. Real Comlink is used by default (resolved lazily, only when the
   * worker is actually initialized/terminated). Injecting these avoids relying
   * on module-level mocking of "comlink", which doesn't cross the package
   * boundary reliably (this service lives in its own workspace package).
   */
  wrap?: <T>(endpoint: Worker) => Comlink.Remote<T>;
  proxy?: <T>(value: T) => T;
  releaseProxy?: symbol;
  db?: any;
  eventBus?: any;
  debug?: DebugLogger;
  timers?: TimerApi;
  windowRef?: Window;
  documentRef?: Document;
}

export class SearchService {
  private worker: Worker | null = null;
  private api: Comlink.Remote<SearchApi> | SearchApi | null = null;
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  private workerFactory: () => Worker | Promise<Worker>;
  // Optional comlink overrides. Left undefined in production; real Comlink is
  // resolved lazily at the use sites so merely constructing a SearchService
  // never touches the "comlink" module (some tests mock it only partially).
  private comlinkWrapOverride?: <T>(endpoint: Worker) => Comlink.Remote<T>;
  private comlinkProxyOverride?: <T>(value: T) => T;
  private comlinkReleaseProxyOverride?: symbol;
  private debug: DebugLogger;
  private windowRef: Window | undefined;
  private coordinator: SearchProgressCoordinator;
  private pipeline: SearchIndexPipeline;
  private persistence: SearchIndexPersistence;

  constructor(dependencies: SearchServiceDependencies = {}) {
    this.workerFactory =
      dependencies.workerFactory ??
      (() => {
        const factory = (globalThis as any).__searchWorkerFactory__;
        if (typeof factory !== "function") {
          throw new Error(
            "[SearchService] Search worker factory is not configured",
          );
        }
        return factory();
      });
    this.api = dependencies.api ?? null;
    this.comlinkWrapOverride = dependencies.wrap;
    this.comlinkProxyOverride = dependencies.proxy;
    this.comlinkReleaseProxyOverride = dependencies.releaseProxy;
    this.debug =
      dependencies.debug ?? (globalThis as any).__debugStore__ ?? console;
    const timers = dependencies.timers ?? globalThis;
    this.windowRef =
      dependencies.windowRef ??
      (typeof window !== "undefined" ? window : undefined);
    const documentRef =
      dependencies.documentRef ??
      (typeof document !== "undefined" ? document : undefined);
    this.isInitialized = Boolean(this.api);

    this.coordinator = new SearchProgressCoordinator({
      debug: this.debug,
      timers,
      windowRef: this.windowRef,
      onScheduledSave: (vaultId) => this.persistence.saveIndex(vaultId),
    });

    this.persistence = new SearchIndexPersistence({
      db: dependencies.db,
      debug: this.debug,
      coordinator: this.coordinator,
      getApi: () => this.ensureWorker(),
    });

    this.pipeline = new SearchIndexPipeline({
      db: dependencies.db,
      debug: this.debug,
      timers,
      coordinator: this.coordinator,
      getApi: () => this.ensureWorker(),
      isApiReady: () => this.isInitialized,
      onSaveRequired: (vaultId) => this.persistence.saveIndex(vaultId),
    });

    new SearchIndexLifecycle({
      eventBus:
        dependencies.eventBus ??
        (globalThis as any).__appEventBus__ ??
        appEventBus,
      coordinator: this.coordinator,
      windowRef: this.windowRef,
      documentRef,
      callbacks: {
        onVaultSwitch: async (vaultId) => {
          void this.coordinator.cancelIndexing("Vault switched.", false);
          // Set activeVaultId synchronously before any yields (awaits) so that
          // incoming new-vault events (like CACHE_LOADED) are not filtered out by the stale-vault guard.
          this.coordinator.activeVaultId = vaultId;
          this.coordinator.isDirty = false;
          await this.pipeline.clear();
        },
        onCacheLoaded: async (vaultId, entities) => {
          const restored = await this.persistence.loadIndex(vaultId);
          if (!restored) {
            this.debug.log(
              `[SearchService] Cold boot: Rebuilding index for ${vaultId}`,
            );
            await this.pipeline.rebuildFromEntities(
              vaultId,
              entities,
              "metadata",
              { markReady: false, saveOnReady: false },
            );
            this.pipeline.needsFullContentSweep = true;
            this.debug.log(`[SearchService] Metadata indexing complete.`);
          } else {
            this.pipeline.needsFullContentSweep = false;
            this.debug.log(
              `[SearchService] Warm boot: Restored index for ${vaultId}`,
            );
          }
        },
        onSyncChunk: (entities) => this.pipeline.indexBatch(entities),
        onSyncComplete: async (vaultId) => {
          if (this.pipeline.needsFullContentSweep) {
            timers.setTimeout(() => {
              this.pipeline.indexContentInBackground(vaultId);
            }, 3000);
            this.pipeline.needsFullContentSweep = false;
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
            await this.pipeline.indexEntity(entity);
          }
        },
        onEntityDeleted: (entityId) => this.pipeline.remove(entityId),
        onBatchCreated: (entities) => this.pipeline.indexBatch(entities),
        onBatchUpdated: (entities) => this.pipeline.indexBatch(entities),
        onVisibilityHide: () => {
          if (this.coordinator.isDirty && this.coordinator.activeVaultId) {
            this.persistence.saveIndex(this.coordinator.activeVaultId);
          }
        },
      },
    });
  }

  private async initWorker() {
    if (this.worker || this.api) return;

    const workerInstance = await this.workerFactory();
    this.worker = workerInstance;

    const wrap = this.comlinkWrapOverride ?? Comlink.wrap;
    const proxy =
      this.comlinkProxyOverride ?? (Comlink.proxy as <T>(value: T) => T);
    this.api = wrap<SearchApi>(this.worker);

    await this.api.setLogger(
      proxy((level: "info" | "warn" | "error", msg: string, data?: any) => {
        const message = `[SearchEngine] ${msg}`;
        if (level === "error") this.debug.error(message, data);
        else if (level === "warn") this.debug.warn(message, data);
        else this.debug.log(message, data);
      }),
    );

    await this.api.setChangeCallback(
      proxy(() => {
        this.coordinator.isDirty = true;
        this.coordinator.scheduleAutoSave();
      }),
    );

    this.isInitialized = true;
  }

  private async ensureWorker(): Promise<Comlink.Remote<SearchEngine>> {
    if (!this.windowRef && !this.api) {
      throw new Error(
        "[SearchService] Search worker cannot be initialized in SSR environment",
      );
    }
    if (!this.api && !this.initPromise) {
      this.initPromise = this.initWorker();
    }
    if (this.initPromise) await this.initPromise;
    if (!this.api || !this.isInitialized) {
      throw new Error("[SearchService] Search worker failed to initialize");
    }
    return this.api as Comlink.Remote<SearchEngine>;
  }

  terminate() {
    if (this.api) {
      const releaseProxy =
        this.comlinkReleaseProxyOverride ?? Comlink.releaseProxy;
      const release = (this.api as Record<symbol, unknown>)[releaseProxy];
      if (typeof release === "function") release();
      this.api = null;
    }
    this.worker?.terminate();
    this.worker = null;
    this.initPromise = null;
  }

  async init(_options: { phonetic?: boolean } = {}): Promise<void> {
    await this.ensureWorker();
  }

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    const api = await this.ensureWorker();
    const rawResult = await api.searchOptimized(query, options);

    let results: SearchResult[];
    if (
      typeof rawResult === "object" &&
      rawResult !== null &&
      "isEncoded" in rawResult
    ) {
      results = JSON.parse(new TextDecoder().decode(rawResult.data));
    } else {
      results = rawResult as SearchResult[];
    }

    const quickNotes = (globalThis as any).__quickNoteStore__?.activeNotes;
    if (quickNotes?.length > 0) {
      const q = query.toLowerCase();
      const noteResults: SearchResult[] = quickNotes
        .filter((n: any) => n.content.toLowerCase().includes(q))
        .map((note: any) => {
          const first = note.content.trim().split("\n")[0] || "Untitled Note";
          return {
            id: `quicknote-${note.id}`,
            title: first.length > 30 ? first.substring(0, 30) + "..." : first,
            path: `quicknote-${note.id}`,
            type: "quicknote",
            excerpt:
              note.content.substring(0, 100) +
              (note.content.length > 100 ? "..." : ""),
            score: 1.0,
            matchType: "content",
          };
        });
      results = [...noteResults, ...results];
    }

    if (options.limit && results.length > options.limit) {
      results = results.slice(0, options.limit);
    }
    return results;
  }

  // --- Public API forwarded to pipeline ---
  index = (entry: Parameters<SearchIndexPipeline["index"]>[0]) =>
    this.pipeline.index(entry);
  remove = (id: string) => this.pipeline.remove(id);
  clear = () => this.pipeline.clear();
  retryIndexing = () => this.pipeline.retryIndexing();
  // Exposed for tests that call this via (service as any)
  private indexContentInBackground = (vaultId: string) =>
    this.pipeline.indexContentInBackground(vaultId);

  // --- Public API forwarded to persistence ---
  loadIndex = (vaultId: string) => this.persistence.loadIndex(vaultId);
  saveIndex = (vaultId: string) => this.persistence.saveIndex(vaultId);

  // --- Public API forwarded to coordinator ---
  cancelIndexing = (reason?: string, canRetry?: boolean) =>
    this.coordinator.cancelIndexing(reason, canRetry);
  getIndexProgress = (): SearchIndexProgress =>
    this.coordinator.getIndexProgress();
  subscribeIndexProgress = (
    callback: (progress: SearchIndexProgress) => void,
  ) => this.coordinator.subscribeIndexProgress(callback);
}

export const searchService = new SearchService();
