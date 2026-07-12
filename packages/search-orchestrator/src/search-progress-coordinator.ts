import type { SearchIndexProgress } from "@codex/search-engine";
export type DebugLogger = {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

export type TimerApi = Pick<
  typeof globalThis,
  "setTimeout" | "clearTimeout"
> & {
  now?: () => number;
};

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

export interface SearchProgressCoordinatorDeps {
  debug?: DebugLogger;
  timers?: TimerApi;
  windowRef?: Window;
  onScheduledSave: (vaultId: string) => Promise<void>;
}

export class SearchProgressCoordinator {
  isDirty = false;
  activeVaultId: string | null = null;
  pendingRetryEntities: any[] = [];
  retryNeedsContentSweep = false;

  private _activeRunId: string | null = null;
  private saveTimeout: any = null;
  private runCounter = 0;
  private progress: SearchIndexProgress = { ...READY_PROGRESS };
  private progressListeners = new Set<
    (progress: SearchIndexProgress) => void
  >();

  private debug: DebugLogger;
  private timers: TimerApi;
  private windowRef: Window | undefined;
  private onScheduledSave: (vaultId: string) => Promise<void>;

  constructor(deps: SearchProgressCoordinatorDeps) {
    this.debug = deps.debug ?? (globalThis as any).__debugStore__ ?? console;
    this.timers = deps.timers ?? globalThis;
    this.windowRef = deps.windowRef;
    this.onScheduledSave = deps.onScheduledSave;
  }

  get activeRunId(): string | null {
    return this._activeRunId;
  }

  emitProgress(progress: SearchIndexProgress): void {
    this.progress = { ...progress };
    for (const listener of this.progressListeners) {
      try {
        listener(this.getIndexProgress());
      } catch (err) {
        this.debug.warn(
          "[SearchProgressCoordinator] Progress listener failed",
          err,
        );
      }
    }
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

  createRunId(vaultId: string): string {
    this.runCounter += 1;
    const runId = `${vaultId}:${Date.now()}:${this.runCounter}`;
    this._activeRunId = runId;
    return runId;
  }

  isActiveRun(vaultId: string, runId: string): boolean {
    return this.activeVaultId === vaultId && this._activeRunId === runId;
  }

  async cancelIndexing(
    reason = "Indexing cancelled.",
    canRetry = true,
  ): Promise<void> {
    if (!this._activeRunId) return;
    this.emitProgress({
      status: "cancelled",
      vaultId: this.activeVaultId,
      runId: this._activeRunId,
      indexedCount: this.progress.indexedCount,
      totalCount: this.progress.totalCount,
      isPartial: false,
      canRetry,
      message: reason,
      error: null,
    });
    this._activeRunId = null;
  }

  failIndexing(vaultId: string, runId: string, err: unknown): void {
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

  scheduleAutoSave(): void {
    if (!this.windowRef || !this.activeVaultId) return;
    if (this.progress.isPartial || this.progress.status === "rebuilding")
      return;

    if (this.saveTimeout) this.timers.clearTimeout(this.saveTimeout);
    this.saveTimeout = this.timers.setTimeout(() => {
      if (this.isDirty && this.activeVaultId) {
        this.onScheduledSave(this.activeVaultId);
      }
    }, 2000);
  }
}
